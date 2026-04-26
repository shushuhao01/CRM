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
import { WecomConfig } from '../../entities/WecomConfig';
import { log } from '../../config/logger';
import axios from 'axios';

const router = Router();
const WECOM_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

// Suite access token 缓存
let suiteTokenCache: { token: string; expireTime: number } | null = null;

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

/** 获取suite_access_token */
export async function getSuiteAccessToken(suiteConfig: WecomSuiteConfig): Promise<string> {
  if (suiteTokenCache && suiteTokenCache.expireTime > Date.now()) {
    return suiteTokenCache.token;
  }
  if (!suiteConfig.suiteId || !suiteConfig.suiteSecret || !suiteConfig.suiteTicket) {
    throw new Error('Suite配置不完整: 缺少suiteId/suiteSecret/suiteTicket');
  }
  const res = await axios.post(`${WECOM_API_BASE}/service/get_suite_token`, {
    suite_id: suiteConfig.suiteId,
    suite_secret: suiteConfig.suiteSecret,
    suite_ticket: suiteConfig.suiteTicket
  });
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

    if (!verifySignature(config.callbackToken, timestamp as string, nonce as string, echostr as string, msg_signature as string)) {
      log.warn('[SuiteCallback] Signature mismatch');
      return res.status(403).send('Signature mismatch');
    }

    const msg = decryptMsg(config.callbackEncodingAesKey, echostr as string);
    log.info('[SuiteCallback] Verify success');
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

    // 验证签名
    if (!verifySignature(config.callbackToken, timestamp as string, nonce as string, encryptMsg, msg_signature as string)) {
      log.warn('[SuiteCallback] POST signature mismatch');
      return res.send('success');
    }

    // 解密
    const xmlContent = decryptMsg(config.callbackEncodingAesKey, encryptMsg);
    const infoType = extractXml(xmlContent, 'InfoType');
    const suiteId = extractXml(xmlContent, 'SuiteId');
    const authCorpId = extractXml(xmlContent, 'AuthCorpId');
    const authCode = extractXml(xmlContent, 'AuthCode');

    log.info(`[SuiteCallback] Event: ${infoType}, SuiteId: ${suiteId}, AuthCorpId: ${authCorpId}`);

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
  const ticket = extractXml(xml, 'SuiteTicket');
  if (!ticket) throw new Error('SuiteTicket为空');

  const repo = AppDataSource.getRepository(WecomSuiteConfig);
  config.suiteTicket = ticket;
  config.suiteTicketUpdatedAt = new Date();
  await repo.save(config);

  // 清除token缓存，下次使用新ticket获取
  suiteTokenCache = null;
  log.info('[SuiteCallback] SuiteTicket updated');
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
    await configRepo.save(existing);
    log.info(`[SuiteCallback] Updated auth for corp: ${corpName} (${corpId})`);
  } else {
    // 创建新配置
    const newConfig = configRepo.create({
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
    log.info(`[SuiteCallback] Created auth for corp: ${corpName} (${corpId})`);
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
    const { auth_code, state, expires_in } = req.query;
    log.info(`[SuiteCallback] Auth callback received, state: ${state}, auth_code: ${(auth_code as string)?.substring(0, 10)}...`);

    if (auth_code) {
      const config = await getSuiteConfigRow();
      if (config) {
        try {
          await handleCreateAuth(config, auth_code as string, '');
          log.info('[SuiteCallback] Auth processed via redirect callback');
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

export default router;

