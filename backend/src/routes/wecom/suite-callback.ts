/**
 * 企微服务商应用回调处理路由
 *
 * 接收企微服务器推送的suite_ticket、授权变更等事件
 * 回调URL: /api/v1/wecom/suite/callback
 */
import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { AppDataSource } from '../../config/database';
import { WecomSuiteConfig } from '../../entities/WecomSuiteConfig';
import { WecomSuiteCallbackLog } from '../../entities/WecomSuiteCallbackLog';
import { WecomSuiteAuthLink } from '../../entities/WecomSuiteAuthLink';
import { WecomConfig } from '../../entities/WecomConfig';
import { log } from '../../config/logger';
import axios from 'axios';
import { authenticateToken as authMW, requireAdmin as adminMW } from '../../middleware/auth';

const router = Router();
const WECOM_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

// 惰性确保 wecom_configs 表有新增列（避免 Unknown column 错误）
let wecomConfigColumnsChecked = false;
async function ensureWecomConfigColumns() {
  if (wecomConfigColumnsChecked) return;
  wecomConfigColumnsChecked = true;
  try {
    const cols = await AppDataSource.query(`SHOW COLUMNS FROM wecom_configs LIKE 'payment_secret'`);
    if (cols.length === 0) {
      await AppDataSource.query(`ALTER TABLE wecom_configs ADD COLUMN payment_secret VARCHAR(255) NULL COMMENT '对外收款Secret'`);
      log.info('[SuiteCallback] Added payment_secret column to wecom_configs');
    }
    const cols2 = await AppDataSource.query(`SHOW COLUMNS FROM wecom_configs LIKE 'payment_settings'`);
    if (cols2.length === 0) {
      await AppDataSource.query(`ALTER TABLE wecom_configs ADD COLUMN payment_settings TEXT NULL COMMENT '对外收款设置(JSON)'`);
      log.info('[SuiteCallback] Added payment_settings column to wecom_configs');
    }
  } catch (e: any) {
    log.warn('[SuiteCallback] ensureWecomConfigColumns error:', e.message);
    wecomConfigColumnsChecked = false; // 下次重试
  }
}

// Suite access token 缓存
let suiteTokenCache: { token: string; expireTime: number } | null = null;

/**
 * 清除suite token缓存（供外部调用，如手动刷新）
 * 同时联动清除 WecomTokenService 中由 suite_token 派生出的 corp_token 缓存
 * （否则只清本地 suite 缓存，下游 corp_access_token 仍是旧值，问题依旧）
 */
export function clearSuiteTokenCache(): void {
  suiteTokenCache = null;
  try {
    // 异步导入避免循环依赖
    import('../../services/wecom/WecomTokenService').then(({ WecomTokenService }) => {
      WecomTokenService.clearCache();
      log.info('[SuiteCallback] WecomTokenService 全量缓存已联动清除');
    }).catch(() => { /* 忽略 */ });
  } catch { /* 忽略 */ }
}

/** 从XML中提取字段 */
function extractXml(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]><\\/${tag}>`, 's');
  const m = xml.match(re);
  if (m) return m[1];
  const re2 = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 's');
  const m2 = xml.match(re2);
  return m2 ? m2[1] : '';
}

/** AES解密企微回调消息 */
function decryptMsg(encodingAesKey: string, encryptedMsg: string): string {
  const aesKey = Buffer.from(encodingAesKey + '=', 'base64');
  const iv = aesKey.slice(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  decipher.setAutoPadding(false);
  let decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedMsg, 'base64')),
    decipher.final()
  ]);
  const pad = decrypted[decrypted.length - 1];
  decrypted = decrypted.slice(0, decrypted.length - pad);
  const msgLen = decrypted.readUInt32BE(16);
  return decrypted.slice(20, 20 + msgLen).toString('utf8');
}

/** 验证签名 */
function verifySignature(token: string, timestamp: string, nonce: string, encrypt: string, signature: string): boolean {
  const arr = [token, timestamp, nonce, encrypt].sort();
  const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');
  return sha1 === signature;
}

/** 获取Suite配置(单例) */
async function getSuiteConfigRow(): Promise<WecomSuiteConfig | null> {
  try {
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    return await repo.findOne({ where: {}, order: { id: 'ASC' } });
  } catch {
    return null;
  }
}

/** 记录回调日志 */
async function logCallback(infoType: string, suiteId: string, authCorpId: string, detail: string, status: string, errorMessage?: string) {
  try {
    const repo = AppDataSource.getRepository(WecomSuiteCallbackLog);
    await repo.save(repo.create({ infoType, suiteId, authCorpId, detail, status, errorMessage }));
  } catch (e: any) {
    log.error('[SuiteCallback] Failed to save log:', e.message);
  }
}

/** 尝试从 system_config 表获取 suite_ticket（备用来源） */
async function getTicketFromSystemConfig(suiteId: string): Promise<string | null> {
  try {
    const rows = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'wecom_suite_config' LIMIT 1`
    );
    if (rows?.[0]?.config_value) {
      const cfg = typeof rows[0].config_value === 'string' ? JSON.parse(rows[0].config_value) : rows[0].config_value;
      if (cfg.suite_ticket && (!suiteId || cfg.suite_id === suiteId || !cfg.suite_id)) {
        return cfg.suite_ticket;
      }
    }
  } catch { /* ignore */ }
  return null;
}

/** 获取suite_access_token（含40085多级重试：DB重读 → 延迟重读 → system_config回退） */
export async function getSuiteAccessToken(suiteConfig: WecomSuiteConfig): Promise<string> {
  if (suiteTokenCache && suiteTokenCache.expireTime > Date.now()) {
    return suiteTokenCache.token;
  }
  if (!suiteConfig.suiteId || !suiteConfig.suiteSecret || !suiteConfig.suiteTicket) {
    throw new Error('Suite配置不完整: 缺少suiteId/suiteSecret/suiteTicket');
  }

  const ticketPreview = (t: string) => t ? t.substring(0, 12) + '...' : '(empty)';

  // ★ 关键防御：传入的字段都做 trim，避免不可见字符导致 40085
  const sid = (suiteConfig.suiteId || '').trim();
  const ssec = (suiteConfig.suiteSecret || '').trim();
  const stkt = (suiteConfig.suiteTicket || '').replace(/[\s\r\n\t]+/g, '').trim();

  // 第一次尝试：用传入的 suiteConfig.suiteTicket
  log.info(`[SuiteCallback] getSuiteAccessToken: 尝试ticket length=${stkt.length} preview=${ticketPreview(stkt)} suiteSecretLen=${ssec.length} suiteId=${sid}`);
  const res = await axios.post(`${WECOM_API_BASE}/service/get_suite_token`, {
    suite_id: sid,
    suite_secret: ssec,
    suite_ticket: stkt
  });

  if (res.data.errcode === 40085) {
    // 40085 = invalid suite ticket，立即清除缓存
    suiteTokenCache = null;
    log.warn(`[SuiteCallback] 40085 invalid suite_ticket (${ticketPreview(suiteConfig.suiteTicket)}), 开始多级重试...`);

    const cleanT = (t: string) => (t || '').replace(/[\s\r\n\t]+/g, '').trim();

    // 重试1：从 wecom_suite_configs 重读最新 ticket
    const freshConfig = await getSuiteConfigRow();
    const freshTicketClean = cleanT(freshConfig?.suiteTicket || '');
    if (freshTicketClean && freshTicketClean !== stkt) {
      log.info(`[SuiteCallback] 重试1: 从DB发现更新的ticket=${ticketPreview(freshTicketClean)}`);
      const retryRes = await axios.post(`${WECOM_API_BASE}/service/get_suite_token`, {
        suite_id: sid, suite_secret: ssec, suite_ticket: freshTicketClean
      });
      if (!retryRes.data.errcode || retryRes.data.errcode === 0) {
        suiteConfig.suiteTicket = freshTicketClean;
        suiteTokenCache = { token: retryRes.data.suite_access_token, expireTime: Date.now() + (retryRes.data.expires_in - 300) * 1000 };
        return suiteTokenCache.token;
      }
      log.warn(`[SuiteCallback] 重试1失败: ${retryRes.data.errmsg} (errcode=${retryRes.data.errcode})`);
    }

    // 重试2：延迟500ms后再读DB（等待并发的 handleSuiteTicket 完成写入）
    await new Promise(r => setTimeout(r, 500));
    const delayedConfig = await getSuiteConfigRow();
    const delayedTicketClean = cleanT(delayedConfig?.suiteTicket || '');
    if (delayedTicketClean && delayedTicketClean !== stkt && delayedTicketClean !== freshTicketClean) {
      log.info(`[SuiteCallback] 重试2(延迟): 从DB发现更新的ticket=${ticketPreview(delayedTicketClean)}`);
      const retryRes = await axios.post(`${WECOM_API_BASE}/service/get_suite_token`, {
        suite_id: sid, suite_secret: ssec, suite_ticket: delayedTicketClean
      });
      if (!retryRes.data.errcode || retryRes.data.errcode === 0) {
        suiteConfig.suiteTicket = delayedTicketClean;
        suiteTokenCache = { token: retryRes.data.suite_access_token, expireTime: Date.now() + (retryRes.data.expires_in - 300) * 1000 };
        return suiteTokenCache.token;
      }
      log.warn(`[SuiteCallback] 重试2失败: ${retryRes.data.errmsg} (errcode=${retryRes.data.errcode})`);
    }

    // 重试3：从 system_config 表获取 ticket（callback.ts 可能更新了这里）
    const sysTicket = cleanT(await getTicketFromSystemConfig(sid) || '');
    if (sysTicket && sysTicket !== stkt && sysTicket !== freshTicketClean && sysTicket !== delayedTicketClean) {
      log.info(`[SuiteCallback] 重试3: 从system_config发现不同ticket=${ticketPreview(sysTicket)}`);
      const retryRes = await axios.post(`${WECOM_API_BASE}/service/get_suite_token`, {
        suite_id: sid, suite_secret: ssec, suite_ticket: sysTicket
      });
      if (!retryRes.data.errcode || retryRes.data.errcode === 0) {
        // 同步回 wecom_suite_configs
        try {
          await AppDataSource.query('UPDATE wecom_suite_configs SET suite_ticket = ?, suite_ticket_updated_at = NOW() WHERE id = ?', [sysTicket, suiteConfig.id || 1]);
        } catch { /* ignore */ }
        suiteConfig.suiteTicket = sysTicket;
        suiteTokenCache = { token: retryRes.data.suite_access_token, expireTime: Date.now() + (retryRes.data.expires_in - 300) * 1000 };
        return suiteTokenCache.token;
      }
      log.warn(`[SuiteCallback] 重试3失败: ${retryRes.data.errmsg}`);
    }

    // 所有重试失败
    const ticketAge = suiteConfig.suiteTicketUpdatedAt
      ? `(最近ticket更新: ${new Date(suiteConfig.suiteTicketUpdatedAt).toLocaleString('zh-CN')}, 距今${Math.round((Date.now() - new Date(suiteConfig.suiteTicketUpdatedAt).getTime()) / 60000)}分钟)`
      : '(ticket更新时间未知)';
    // ★ 当 ticket 是新鲜的(<10分钟) 但企微仍报 40085 → 高度怀疑 Suite Secret 错误或 ticket/secret 不匹配
    const ticketAgeMin = suiteConfig.suiteTicketUpdatedAt
      ? Math.round((Date.now() - new Date(suiteConfig.suiteTicketUpdatedAt).getTime()) / 60000)
      : 999;
    let extraHint = '';
    if (ticketAgeMin <= 10) {
      extraHint = ` ⚠️ ticket刚刚更新(${ticketAgeMin}分钟前)却仍被拒绝，强烈怀疑 SuiteSecret 错误或与 SuiteId 不匹配。请到「应用配置」Tab 检查并重新粘贴 SuiteSecret（SecretLen=${ssec.length}, TicketLen=${stkt.length}），确认无多余空格/换行后保存。`;
    }
    log.error(`[SuiteCallback] 40085 终态失败. ticketAgeMin=${ticketAgeMin} ticketLen=${stkt.length} secretLen=${ssec.length} suiteId=${sid}`);
    throw new Error(`获取suite_access_token失败: ${res.data.errmsg} (${res.data.errcode}) ${ticketAge}。请确认回调URL正常接收企微推送，或在企微服务商后台手动刷新suite_ticket。${extraHint}`);
  }

  if (res.data.errcode && res.data.errcode !== 0) {
    throw new Error(`获取suite_access_token失败: ${res.data.errmsg} (${res.data.errcode})`);
  }
  suiteTokenCache = {
    token: res.data.suite_access_token,
    expireTime: Date.now() + (res.data.expires_in - 300) * 1000
  };
  return suiteTokenCache.token;
}

/** 获取预授权码 */
export async function getPreAuthCode(suiteConfig: WecomSuiteConfig): Promise<string> {
  const token = await getSuiteAccessToken(suiteConfig);
  const res = await axios.get(`${WECOM_API_BASE}/service/get_pre_auth_code`, {
    params: { suite_access_token: token }
  });
  if (res.data.errcode && res.data.errcode !== 0) {
    throw new Error(`获取预授权码失败: ${res.data.errmsg} (${res.data.errcode})`);
  }
  return res.data.pre_auth_code;
}

/** 获取永久授权码 */
async function getPermanentCode(suiteConfig: WecomSuiteConfig, authCode: string): Promise<any> {
  const token = await getSuiteAccessToken(suiteConfig);
  const res = await axios.post(`${WECOM_API_BASE}/service/get_permanent_code?suite_access_token=${token}`, {
    auth_code: authCode
  });
  if (res.data.errcode && res.data.errcode !== 0) {
    throw new Error(`获取永久授权码失败: ${res.data.errmsg} (${res.data.errcode})`);
  }
  return res.data;
}

// ==================== GET: 回调URL验证 ====================
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { msg_signature, timestamp, nonce, echostr } = req.query;
    log.info('[SuiteCallback] Verify request');

    if (!msg_signature || !timestamp || !nonce || !echostr) {
      return res.status(400).send('Missing parameters');
    }

    const config = await getSuiteConfigRow();
    if (!config?.callbackToken || !config?.callbackEncodingAesKey) {
      log.warn('[SuiteCallback] No suite callback config found');
      return res.status(403).send('No config');
    }

    // 验证签名 — 优先使用 suite_config，降级尝试 wecom_configs
    let verifyAesKey = config.callbackEncodingAesKey;
    let verifySource = 'suite_config';

    if (!verifySignature(config.callbackToken, timestamp as string, nonce as string, echostr as string, msg_signature as string)) {
      log.warn(`[SuiteCallback] GET signature mismatch with suite_config Token (prefix=${config.callbackToken.substring(0, 8)}...). 尝试WecomConfig降级...`);
      let found = false;
      try {
        const wecomConfigRepo = AppDataSource.getRepository(WecomConfig);
        const wecomConfigs = await wecomConfigRepo.find({ where: { isEnabled: true } });
        for (const wc of wecomConfigs) {
          if (!wc.callbackToken || !wc.encodingAesKey) continue;
          if (verifySignature(wc.callbackToken, timestamp as string, nonce as string, echostr as string, msg_signature as string)) {
            verifyAesKey = wc.encodingAesKey;
            verifySource = `wecom_config(${wc.name || wc.id})`;
            found = true;
            log.info(`[SuiteCallback] ✅ GET signature matched via WecomConfig fallback: ${verifySource}`);
            break;
          }
        }
      } catch (e: any) {
        log.warn('[SuiteCallback] GET WecomConfig fallback error:', e.message);
      }
      if (!found) {
        log.warn('[SuiteCallback] ❌ GET signature mismatch - 所有已知Token均不匹配');
        return res.status(403).send('Signature mismatch');
      }
    }

    const msg = decryptMsg(verifyAesKey, echostr as string);
    log.info(`[SuiteCallback] Verify success via ${verifySource}`);
    return res.send(msg);
  } catch (error: any) {
    log.error('[SuiteCallback] Verify error:', error.message);
    return res.status(500).send('error');
  }
});

// ==================== POST: 接收回调事件 ====================
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { msg_signature, timestamp, nonce } = req.query;
    const body = req.body;

    const config = await getSuiteConfigRow();
    if (!config?.callbackToken || !config?.callbackEncodingAesKey) {
      return res.send('success');
    }

    // 提取加密消息
    let encryptMsg = '';
    if (typeof body === 'string') {
      const match = body.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/);
      if (match) encryptMsg = match[1];
    } else if (body?.xml?.Encrypt) {
      encryptMsg = Array.isArray(body.xml.Encrypt) ? body.xml.Encrypt[0] : body.xml.Encrypt;
    } else if (body?.Encrypt) {
      encryptMsg = body.Encrypt;
    }

    if (!encryptMsg) {
      log.warn('[SuiteCallback] No Encrypt field found');
      return res.send('success');
    }

    // 验证签名 — 优先使用 wecom_suite_configs 的 Token/AESKey
    let activeToken = config.callbackToken;
    let activeAesKey = config.callbackEncodingAesKey;
    let tokenSource = 'suite_config';

    if (!verifySignature(activeToken, timestamp as string, nonce as string, encryptMsg, msg_signature as string)) {
      // ★ 兼容处理：企微服务商后台「通用开发参数」和「应用回调配置」可能使用了不同的 Token/AESKey
      //   - 通用开发参数: 系统事件接收URL（接收 suite_ticket 自动推送）
      //   - 应用回调配置: 数据回调URL/指令回调URL（接收刷新Ticket等）
      //   如果两处的 Token 不同，自动推送的 suite_ticket 会因签名不匹配被丢弃。
      //   此处尝试从 wecom_configs 表查找匹配的 Token 作为降级。
      log.warn(`[SuiteCallback] POST signature mismatch with suite_config Token (prefix=${activeToken.substring(0, 8)}...). ` +
        `可能原因: 企微服务商后台「通用开发参数」的Token与管理后台存储的不一致。尝试WecomConfig降级匹配...`);

      let found = false;
      try {
        const wecomConfigRepo = AppDataSource.getRepository(WecomConfig);
        const wecomConfigs = await wecomConfigRepo.find({ where: { isEnabled: true } });
        for (const wc of wecomConfigs) {
          if (!wc.callbackToken || !wc.encodingAesKey) continue;
          if (verifySignature(wc.callbackToken, timestamp as string, nonce as string, encryptMsg, msg_signature as string)) {
            activeToken = wc.callbackToken;
            activeAesKey = wc.encodingAesKey;
            tokenSource = `wecom_config(${wc.name || wc.id})`;
            found = true;
            log.info(`[SuiteCallback] ✅ Signature matched via WecomConfig fallback: ${tokenSource}. ` +
              `⚠️ 请在企微服务商后台确保「通用开发参数」和「应用回调配置」使用相同的Token/EncodingAESKey，` +
              `并与管理后台「回调配置」Tab中的值保持一致。`);
            break;
          }
        }
      } catch (e: any) {
        log.warn('[SuiteCallback] WecomConfig fallback lookup error:', e.message);
      }

      if (!found) {
        log.warn(`[SuiteCallback] ❌ POST signature mismatch - 所有已知Token均不匹配。` +
          `请检查: 1. 企微服务商后台「通用开发参数」的Token/EncodingAESKey 是否与管理后台「回调配置」中的值一致; ` +
          `2. 「通用开发参数」和「应用回调配置」两处是否使用了相同的Token/EncodingAESKey。`);
        return res.send('success');
      }
    }

    // 解密 (使用匹配到的 Token/AESKey)
    const xmlContent = decryptMsg(activeAesKey, encryptMsg);
    if (tokenSource !== 'suite_config') {
      log.warn(`[SuiteCallback] ⚠️ Decrypted via ${tokenSource} (非suite_config主配置)! 这可能导致ticket解密错误!`);
    }
    const infoType = extractXml(xmlContent, 'InfoType');
    const suiteId = extractXml(xmlContent, 'SuiteId');
    const authCorpId = extractXml(xmlContent, 'AuthCorpId');
    const authCode = extractXml(xmlContent, 'AuthCode');

    log.info(`[SuiteCallback] Event: ${infoType}, SuiteId: ${suiteId}, AuthCorpId: ${authCorpId}, tokenSource: ${tokenSource}, aesKeyLen: ${activeAesKey?.length}`);

    // 确保 WecomConfig 表结构完整（避免 Unknown column 错误）
    if (infoType !== 'suite_ticket') {
      await ensureWecomConfigColumns();
    }

    // 分发事件处理
    try {
      switch (infoType) {
        case 'suite_ticket':
          await handleSuiteTicket(config, xmlContent);
          break;
        case 'create_auth':
          await handleCreateAuth(config, authCode, authCorpId);
          break;
        case 'cancel_auth':
          await handleCancelAuth(authCorpId);
          break;
        case 'change_auth':
          await handleChangeAuth(config, authCorpId);
          break;
        case 'reset_permanent_code':
          await handleResetPermanentCode(config, authCode, authCorpId);
          break;
        default:
          log.info(`[SuiteCallback] Unhandled InfoType: ${infoType}`);
      }
      await logCallback(infoType, suiteId, authCorpId, `事件处理成功`, 'success');
    } catch (e: any) {
      log.error(`[SuiteCallback] Handler error for ${infoType}:`, e.message);
      await logCallback(infoType, suiteId, authCorpId, e.message, 'failed', e.message);
    }

    return res.send('success');
  } catch (error: any) {
    log.error('[SuiteCallback] Error:', error.message);
    return res.send('success');
  }
});

// ==================== 事件处理函数 ====================

/** 处理suite_ticket推送 */
async function handleSuiteTicket(config: WecomSuiteConfig, xml: string) {
  const rawTicket = extractXml(xml, 'SuiteTicket');
  if (!rawTicket) throw new Error('SuiteTicket为空');

  // ★ 防御性处理：去除可能的前后空白/换行，避免企微API返回40085
  // （某些代理/反向代理或粘贴操作可能引入不可见字符）
  const ticket = rawTicket.replace(/[\s\r\n\t]+/g, '').trim();
  if (ticket !== rawTicket) {
    log.warn(`[SuiteCallback] SuiteTicket 存在不可见字符，已自动清理：原始长度=${rawTicket.length} 清理后长度=${ticket.length}`);
  }
  if (ticket.length < 50) {
    log.error(`[SuiteCallback] SuiteTicket 长度异常(${ticket.length})，可能解密错误。前20字符: ${ticket.substring(0, 20)}`);
  }

  const ticketPreview = ticket.substring(0, 12) + '...';
  log.info(`[SuiteCallback] handleSuiteTicket: 收到ticket length=${ticket.length} preview=${ticketPreview} suiteSecretLen=${config.suiteSecret?.length || 0}`);

  // ★ 关键修复：在存储前先验证 ticket 有效性，避免存储解密错误的无效 ticket
  if (config.suiteId && config.suiteSecret) {
    try {
      const verifyRes = await axios.post(`${WECOM_API_BASE}/service/get_suite_token`, {
        suite_id: (config.suiteId || '').trim(),
        suite_secret: (config.suiteSecret || '').trim(),
        suite_ticket: ticket
      });
      if (verifyRes.data.errcode && verifyRes.data.errcode !== 0) {
        log.error(`[SuiteCallback] ❌ 自动接收的ticket验证失败! errcode=${verifyRes.data.errcode} errmsg=${verifyRes.data.errmsg} ` +
          `ticketLen=${ticket.length} ticketPreview=${ticketPreview} ` +
          `suiteId=${config.suiteId} secretLen=${config.suiteSecret.length}. ` +
          `可能原因: 解密使用的EncodingAESKey与企微服务商后台「通用开发参数」中配置的不一致，导致解密出错误的ticket值。`);
        // 不存储无效的 ticket，保留之前有效的 ticket
        throw new Error(`自动接收的ticket验证失败(${verifyRes.data.errcode}): ${verifyRes.data.errmsg}。ticket未更新，请检查EncodingAESKey配置。`);
      }
      log.info(`[SuiteCallback] ✅ ticket验证通过，可正常换取suite_access_token`);
    } catch (e: any) {
      if (e.message?.includes('自动接收的ticket验证失败')) {
        throw e; // 重新抛出验证失败错误
      }
      // 网络错误等非验证失败的情况，仍然存储（避免因网络抖动丢失ticket）
      log.warn(`[SuiteCallback] ticket验证调用异常(非致命，仍存储): ${e.message}`);
    }
  }

  // 使用原子 SQL UPDATE 替代 ORM save()，避免并发请求互相覆盖（3个同时到达时只更新ticket字段）
  const needUpdateStatus = !!(config.suiteId && config.suiteSecret && config.appStatus !== 'online');
  if (needUpdateStatus) {
    await AppDataSource.query(
      `UPDATE wecom_suite_configs SET suite_ticket = ?, suite_ticket_updated_at = NOW(), updated_at = NOW(), app_status = ? WHERE id = ?`,
      [ticket, 'online', config.id]
    );
  } else {
    await AppDataSource.query(
      `UPDATE wecom_suite_configs SET suite_ticket = ?, suite_ticket_updated_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [ticket, config.id]
    );
  }

  // 同步更新内存中的 config 对象
  config.suiteTicket = ticket;
  config.suiteTicketUpdatedAt = new Date();
  if (needUpdateStatus) {
    config.appStatus = 'online';
    log.info('[SuiteCallback] appStatus auto-updated to online (suite_ticket received successfully)');
  }

  // 双向同步：也更新 system_config 表（callback.ts 的 auth-callback 读取该表）
  // ★ 同时同步 suite_id + suite_secret，避免 system_config 中存在旧/错 secret 导致40085
  try {
    const syncFields: string[] = ["'$.suite_ticket', ?"];
    const syncValues: any[] = [ticket];
    if (config.suiteId) { syncFields.push("'$.suite_id', ?"); syncValues.push(config.suiteId); }
    if (config.suiteSecret) { syncFields.push("'$.suite_secret', ?"); syncValues.push(config.suiteSecret); }
    await AppDataSource.query(
      `UPDATE system_config SET config_value = JSON_SET(config_value, ${syncFields.join(', ')}) WHERE config_key = 'wecom_suite_config'`,
      syncValues
    );
  } catch (e: any) {
    log.warn('[SuiteCallback] Sync suite data to system_config failed (non-fatal):', e.message);
  }

  // 清除token缓存（含 WecomTokenService 内的 suite/corp 双缓存），下次使用新ticket获取
  suiteTokenCache = null;
  try {
    const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
    WecomTokenService.clearCache();
  } catch { /* 忽略 */ }
  log.info(`[SuiteCallback] SuiteTicket updated: ${ticketPreview} for configId=${config.id} (all token caches cleared)`);
}

/**
 * 从最近的待处理授权链接中提取 tenantId
 * 支持 CRM 发起的授权（state='crm_auth_<tenantId>'）和 Admin 发起的授权（state='tenant_<tenantId>'）
 */
async function resolveTenantIdFromAuthLinks(suiteId: string): Promise<string | null> {
  try {
    const pendingLinks = await AppDataSource.query(
      `SELECT tenant_id, state FROM wecom_suite_auth_links
       WHERE suite_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 5`,
      [suiteId]
    );
    for (const link of (pendingLinks || [])) {
      // 优先使用直接存储的 tenant_id
      if (link.tenant_id) return link.tenant_id;
      // 从 state 参数中解析（CRM: crm_auth_<tenantId>, Admin: tenant_<tenantId>）
      const st = link.state || '';
      if (st.startsWith('crm_auth_') && st.length > 'crm_auth_'.length) {
        return st.substring('crm_auth_'.length);
      }
      if (st.startsWith('tenant_') && st.length > 'tenant_'.length) {
        return st.substring('tenant_'.length);
      }
    }
  } catch (e: any) {
    log.warn('[SuiteCallback] resolveTenantIdFromAuthLinks error:', e.message);
  }
  return null;
}

/** 处理企业授权(create_auth) */
async function handleCreateAuth(suiteConfig: WecomSuiteConfig, authCode: string, authCorpId: string) {
  if (!authCode) throw new Error('AuthCode为空');

  // 获取永久授权码
  const data = await getPermanentCode(suiteConfig, authCode);
  const corpId = data.auth_corp_info?.corpid || authCorpId;
  const corpName = data.auth_corp_info?.corp_name || '';
  const permanentCode = data.permanent_code || '';
  const authInfo = data.auth_info || {};
  const authUserInfo = data.auth_user_info || {};

  // 尝试从待处理的授权链接中获取 tenantId（解决 CRM 端看不到配置的根本问题）
  const resolvedTenantId = await resolveTenantIdFromAuthLinks(suiteConfig.suiteId);

  // 查找是否已存在该企业的配置
  const configRepo = AppDataSource.getRepository(WecomConfig);
  const existing = await configRepo.findOne({ where: { corpId } });

  if (existing) {
    // 更新已有配置
    existing.permanentCode = permanentCode;
    existing.authType = 'third_party';
    existing.authMode = 'third_party';
    existing.suiteId = suiteConfig.suiteId;
    existing.authCorpInfo = JSON.stringify(data.auth_corp_info || {});
    existing.authUserInfo = JSON.stringify(authUserInfo);
    existing.authScope = JSON.stringify(authInfo);
    existing.authCorpName = corpName;
    existing.authAdminUserId = authUserInfo.userid || '';
    existing.authTime = new Date();
    existing.isEnabled = true;
    existing.connectionStatus = 'connected';
    // 绑定 tenantId（优先保留已有的，否则使用从授权链接中解析的）
    if (!existing.tenantId && resolvedTenantId) {
      existing.tenantId = resolvedTenantId;
      log.info(`[SuiteCallback] Auto-bound tenantId=${resolvedTenantId} to existing config (corp: ${corpName})`);
    }
    await configRepo.save(existing);
    log.info(`[SuiteCallback] Updated auth for corp: ${corpName} (${corpId}), tenantId: ${existing.tenantId || '(none)'}`);
  } else {
    // 创建新配置
    const newConfig = configRepo.create({
      tenantId: resolvedTenantId || undefined,
      name: corpName || `企业${corpId}`,
      corpId,
      corpSecret: '', // 第三方模式不需要corpSecret
      authType: 'third_party',
      authMode: 'third_party',
      suiteId: suiteConfig.suiteId,
      permanentCode,
      authCorpInfo: JSON.stringify(data.auth_corp_info || {}),
      authUserInfo: JSON.stringify(authUserInfo),
      authScope: JSON.stringify(authInfo),
      authCorpName: corpName,
      authAdminUserId: authUserInfo.userid || '',
      authTime: new Date(),
      isEnabled: true,
      connectionStatus: 'connected',
    });
    await configRepo.save(newConfig);
    log.info(`[SuiteCallback] Created auth for corp: ${corpName} (${corpId}), tenantId: ${resolvedTenantId || '(none)'}`);
  }
}

/** 处理取消授权(cancel_auth) */
async function handleCancelAuth(authCorpId: string) {
  if (!authCorpId) return;
  const configRepo = AppDataSource.getRepository(WecomConfig);
  const config = await configRepo.findOne({ where: { corpId: authCorpId } });
  if (config) {
    config.isEnabled = false;
    config.connectionStatus = 'disconnected';
    config.permanentCode = '';
    config.lastError = `企业主动取消授权 (${new Date().toLocaleString('zh-CN')})`;
    await configRepo.save(config);
    log.info(`[SuiteCallback] Auth cancelled for corp: ${authCorpId}`);
  }
}

/** 处理授权变更(change_auth) */
async function handleChangeAuth(suiteConfig: WecomSuiteConfig, authCorpId: string) {
  // 重新获取授权信息
  try {
    const token = await getSuiteAccessToken(suiteConfig);
    const res = await axios.post(`${WECOM_API_BASE}/service/get_auth_info?suite_access_token=${token}`, {
      auth_corpid: authCorpId, suite_id: suiteConfig.suiteId
    });
    if (res.data.errcode === 0) {
      const configRepo = AppDataSource.getRepository(WecomConfig);
      const config = await configRepo.findOne({ where: { corpId: authCorpId } });
      if (config) {
        config.authCorpInfo = JSON.stringify(res.data.auth_corp_info || {});
        config.authScope = JSON.stringify(res.data.auth_info || {});
        await configRepo.save(config);
        log.info(`[SuiteCallback] Auth info updated for corp: ${authCorpId}`);
      }
    }
  } catch (e: any) {
    log.error(`[SuiteCallback] change_auth handler error:`, e.message);
  }
}

/** 处理重置永久授权码(reset_permanent_code) */
async function handleResetPermanentCode(suiteConfig: WecomSuiteConfig, authCode: string, authCorpId: string) {
  if (!authCode) throw new Error('AuthCode为空');
  const data = await getPermanentCode(suiteConfig, authCode);
  const configRepo = AppDataSource.getRepository(WecomConfig);
  const config = await configRepo.findOne({ where: { corpId: authCorpId } });
  if (config) {
    config.permanentCode = data.permanent_code || '';
    await configRepo.save(config);
    suiteTokenCache = null;
    log.info(`[SuiteCallback] Permanent code reset for corp: ${authCorpId}`);
  }
}

// ==================== 授权完成回调(企业扫码授权后重定向到此) ====================
router.get('/auth-callback', async (req: Request, res: Response) => {
  try {
    const { auth_code, state } = req.query;
    log.info(`[SuiteCallback] Auth callback received, state: ${state}, auth_code: ${(auth_code as string)?.substring(0, 10)}...`);

    let authCorpName = '';
    let authCorpId = '';
    if (auth_code) {
      const config = await getSuiteConfigRow();
      if (config) {
        try {
          await handleCreateAuth(config, auth_code as string, '');
          log.info('[SuiteCallback] Auth processed via redirect callback');

          // 查找刚授权的企业信息（用于更新auth link记录）
          try {
            // 从WecomConfig查最新授权记录获取企业信息
            const configRepo = AppDataSource.getRepository(WecomConfig);
            const latestAuth = await configRepo.findOne({
              where: { suiteId: config.suiteId, authType: 'third_party' },
              order: { authTime: 'DESC' }
            });
            if (latestAuth) {
              authCorpName = latestAuth.authCorpName || latestAuth.name || '';
              authCorpId = latestAuth.corpId || '';
            }
          } catch { /* ignore */ }

          // 更新最近的待扫码授权链接记录为已授权状态
          try {
            const linkRepo = AppDataSource.getRepository(WecomSuiteAuthLink);
            const stateStr = state as string || '';
            // 查找匹配state的最新待扫码链接
            const pendingLink = await linkRepo.findOne({
              where: { suiteId: config.suiteId, status: 'pending', state: stateStr },
              order: { createdAt: 'DESC' }
            });
            if (pendingLink) {
              pendingLink.status = 'authorized';
              pendingLink.authCorpId = authCorpId;
              pendingLink.authCorpName = authCorpName;
              pendingLink.authTime = new Date();
              await linkRepo.save(pendingLink);
              log.info(`[SuiteCallback] Auth link ${pendingLink.id} updated to authorized, corp: ${authCorpName}`);
            } else {
              // 如果没有精确匹配state的，更新最近一条pending的
              const anyPending = await linkRepo.findOne({
                where: { suiteId: config.suiteId, status: 'pending' },
                order: { createdAt: 'DESC' }
              });
              if (anyPending) {
                anyPending.status = 'authorized';
                anyPending.authCorpId = authCorpId;
                anyPending.authCorpName = authCorpName;
                anyPending.authTime = new Date();
                await linkRepo.save(anyPending);
                log.info(`[SuiteCallback] Auth link ${anyPending.id} updated to authorized (fallback), corp: ${authCorpName}`);
              }
            }
          } catch (linkErr: any) {
            log.warn('[SuiteCallback] Failed to update auth link status:', linkErr.message);
          }
        } catch (e: any) {
          log.error('[SuiteCallback] Auth callback process error:', e.message);
        }
      }
    }

    // 重定向到管理后台的授权管理页面
    const adminUrl = `${req.protocol}://${req.get('host')}`;
    res.redirect(`${adminUrl}/admin/#/wecom/suite-app?tab=auth&result=success`);
  } catch (error: any) {
    log.error('[SuiteCallback] Auth callback error:', error.message);
    res.redirect('/admin/#/wecom/suite-app?tab=auth&result=error');
  }
});

// ==================== 诊断与手动运维接口 ====================

/**
 * GET /wecom/suite/diagnostic
 * 返回当前 suite_ticket 的状态：是否存在、是否过期、距离上次推送多久、最近一次回调成功时间
 * 用户在侧边栏出现 40085 时点此接口能立刻看到原因。
 *
 * 不需要登录鉴权也能用（不返回敏感全 ticket，仅 preview）——便于服务商技术快速排查
 */
router.get('/diagnostic', async (_req: Request, res: Response) => {
  try {
    const config = await getSuiteConfigRow();
    if (!config) {
      return res.json({
        success: true,
        data: {
          configured: false,
          reason: '系统中未找到 wecom_suite_configs 配置记录，请先在「企微管理 → 服务商配置」中保存 SuiteId/SuiteSecret/EncodingAESKey/Token。'
        }
      });
    }

    const now = Date.now();
    const ticketUpdatedAtMs = config.suiteTicketUpdatedAt ? new Date(config.suiteTicketUpdatedAt).getTime() : 0;
    const ticketAgeMin = ticketUpdatedAtMs ? Math.round((now - ticketUpdatedAtMs) / 60000) : -1;
    const ticketStale = !ticketUpdatedAtMs || (now - ticketUpdatedAtMs) > 30 * 60 * 1000; // 30分钟未更新视为过期

    // 最近 callback 日志
    let recentCallback: any = null;
    let suiteTicketEventCount = 0;
    try {
      const logRows = await AppDataSource.query(
        `SELECT info_type, status, error_message, created_at FROM wecom_suite_callback_logs WHERE suite_id = ? ORDER BY id DESC LIMIT 1`,
        [config.suiteId]
      );
      if (logRows?.[0]) {
        recentCallback = {
          infoType: logRows[0].info_type,
          status: logRows[0].status,
          errorMessage: logRows[0].error_message,
          time: logRows[0].created_at
        };
      }
      const cnt = await AppDataSource.query(
        `SELECT COUNT(*) as c FROM wecom_suite_callback_logs WHERE suite_id = ? AND info_type = 'suite_ticket' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [config.suiteId]
      );
      suiteTicketEventCount = parseInt(cnt?.[0]?.c || '0', 10);
    } catch (e: any) {
      log.warn('[SuiteCallback] diagnostic read logs failed:', e.message);
    }

    // 推断回调健康度
    let callbackHealth: 'healthy' | 'stale' | 'never' = 'never';
    let recommendation = '';
    if (suiteTicketEventCount > 0) {
      callbackHealth = 'healthy';
      recommendation = '回调URL最近1小时内收到过推送，工作正常。';
    } else if (ticketUpdatedAtMs && ticketAgeMin <= 30) {
      callbackHealth = 'healthy';
      recommendation = `最近 ${ticketAgeMin} 分钟内有过 suite_ticket 推送。`;
    } else if (ticketUpdatedAtMs) {
      callbackHealth = 'stale';
      recommendation = [
        `回调URL已 ${ticketAgeMin} 分钟未收到 suite_ticket 推送（企微每10分钟推送一次，30分钟过期）。`,
        '请检查：',
        '1. 企微服务商后台「应用 → 数据回调」中事件接收URL是否正确（应为：' + (process.env.SUITE_CALLBACK_URL_HINT || '<你的对外域名>/api/wecom/suite/callback') + '）',
        '2. 你的服务器是否对企微IP段开放了入站访问',
        '3. EncodingAESKey 与 Token 是否与企微后台一致',
        '4. 紧急情况下，可在企微服务商后台手动触发回调URL测试，或使用本系统的「手动注入Ticket」接口'
      ].join('\n');
    } else {
      callbackHealth = 'never';
      recommendation = [
        '从未收到过 suite_ticket 推送！',
        '必须在企微服务商后台「应用 → 数据回调」中正确配置事件接收URL：',
        (process.env.SUITE_CALLBACK_URL_HINT || '<你的对外域名>/api/wecom/suite/callback'),
        '配置后等待 ~10 分钟，企微会主动推送 suite_ticket。如果仍然没有，请用本系统的「手动注入Ticket」临时救急。'
      ].join('\n');
    }

    res.json({
      success: true,
      data: {
        configured: true,
        suiteId: config.suiteId,
        suiteSecretConfigured: !!config.suiteSecret,
        callbackTokenConfigured: !!config.callbackToken,
        callbackEncodingAesKeyConfigured: !!config.callbackEncodingAesKey,
        ticketPresent: !!config.suiteTicket,
        ticketPreview: config.suiteTicket ? (config.suiteTicket.substring(0, 8) + '...' + config.suiteTicket.substring(config.suiteTicket.length - 4)) : '',
        ticketUpdatedAt: config.suiteTicketUpdatedAt,
        ticketAgeMinutes: ticketAgeMin,
        ticketStale,
        callbackHealth,
        suiteTicketEventCountLastHour: suiteTicketEventCount,
        recentCallback,
        callbackUrlExpected: process.env.SUITE_CALLBACK_URL_HINT || '<你的对外域名>/api/wecom/suite/callback',
        recommendation
      }
    });
  } catch (error: any) {
    log.error('[SuiteCallback] diagnostic error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /wecom/suite/manual-ticket
 * 紧急救急：管理员从企微服务商后台手动复制 suite_ticket 并注入系统
 * （服务商后台 → 应用 → 数据回调 → 调用日志中可看到推送的 suite_ticket）
 *
 * 仅作为回调URL故障期间的紧急 workaround，正常情况下应该靠企微自动推送。
 */
router.post('/manual-ticket', authMW, adminMW, async (req: Request, res: Response) => {
  try {
    const { suiteTicket, suiteId } = req.body || {};
    if (!suiteTicket || typeof suiteTicket !== 'string' || suiteTicket.length < 10) {
      return res.status(400).json({ success: false, message: 'suiteTicket 必填且长度需大于10' });
    }

    const config = await getSuiteConfigRow();
    if (!config) {
      return res.status(404).json({ success: false, message: '未找到 wecom_suite_configs 记录' });
    }
    if (suiteId && config.suiteId && suiteId !== config.suiteId) {
      return res.status(400).json({ success: false, message: `suiteId 不匹配（系统中: ${config.suiteId}）` });
    }

    // 先尝试用此 ticket 真实换取 suite_access_token，验证有效性
    try {
      const verifyRes = await axios.post(`${WECOM_API_BASE}/service/get_suite_token`, {
        suite_id: config.suiteId,
        suite_secret: config.suiteSecret,
        suite_ticket: suiteTicket
      });
      if (verifyRes.data.errcode && verifyRes.data.errcode !== 0) {
        return res.status(400).json({
          success: false,
          message: `Ticket 验证失败: ${verifyRes.data.errmsg} (${verifyRes.data.errcode})。请重新从企微服务商后台复制最新的 suite_ticket`
        });
      }
    } catch (e: any) {
      return res.status(500).json({ success: false, message: `调用企微API验证失败: ${e.message}` });
    }

    // 验证通过，保存
    await AppDataSource.query(
      `UPDATE wecom_suite_configs SET suite_ticket = ?, suite_ticket_updated_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [suiteTicket, config.id]
    );
    try {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = JSON_SET(config_value, '$.suite_ticket', ?) WHERE config_key = 'wecom_suite_config'`,
        [suiteTicket]
      );
    } catch { /* ignore */ }

    // 清除全部token缓存（包含 WecomTokenService 内的 suite/corp 双缓存）
    suiteTokenCache = null;
    try {
      const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
      WecomTokenService.clearCache();
    } catch { /* 忽略 */ }
    log.info(`[SuiteCallback] suite_ticket 手动注入成功，ticket=${suiteTicket.substring(0, 12)}... (all token caches cleared)`);

    res.json({ success: true, message: 'Ticket 注入成功并验证通过，全部Token缓存已清除。请在 30 分钟内修复回调URL以避免再次过期' });
  } catch (error: any) {
    log.error('[SuiteCallback] manual-ticket error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

