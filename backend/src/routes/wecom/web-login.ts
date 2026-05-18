/**
 * 企微 Web 登录授权路由
 *
 * 用于支持会话展示组件在普通浏览器中使用：
 * 1. 接收企微登录授权指令回调（URL验证 + 事件接收）
 * 2. 用 auth_code 换取登录用户身份
 * 3. 提供 agentConfig 签名（会话展示组件需要）
 *
 * 文档参考:
 * - Web登录组件: https://developer.work.weixin.qq.com/document/path/98171
 * - 获取登录用户身份: https://developer.work.weixin.qq.com/document/path/98179
 * - 会话展示组件: https://developer.work.weixin.qq.com/document/path/100049
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { WecomSuiteConfig } from '../../entities/WecomSuiteConfig';
import { WecomConfig } from '../../entities/WecomConfig';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';
import * as crypto from 'crypto';

const router = Router();

/**
 * 获取 Web 登录配置（供前端初始化登录组件用）
 * GET /api/v1/wecom/web-login/config
 * 无需登录（公开接口，前端在显示登录组件前调用）
 */
router.get('/web-login/config', async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const configs = await repo.find({ order: { id: 'ASC' }, take: 1 });
    const config = configs[0] || null;

    if (!config || !config.suiteId) {
      return res.json({
        success: true,
        data: {
          appId: '',
          redirectDomain: '',
          loginType: 'ServiceApp'
        },
        message: '服务商应用未配置'
      });
    }

    // 返回前端初始化登录组件所需的信息（不含敏感数据）
    // 登录组件的 appid 必须是「登录授权」页面的 SuiteID，不是应用的 Suite ID
    const loginAppId = config.webLoginAppId || '';
    if (!loginAppId) {
      return res.json({
        success: true,
        data: {
          appId: '',
          redirectDomain: '',
          loginType: 'ServiceApp'
        },
        message: '登录授权AppID未配置，请在管理后台「Web登录授权配置」中填写登录授权SuiteID'
      });
    }

    res.json({
      success: true,
      data: {
        appId: loginAppId,
        redirectDomain: config.webLoginRedirectDomain || (config as any).redirectDomain || '',
        loginType: 'ServiceApp'  // 第三方应用
      }
    });
  } catch (error: any) {
    log.error('[WecomWebLogin] Get config error:', error.message);
    res.status(500).json({ success: false, message: '获取登录配置失败' });
  }
});

/**
 * Web 登录指令回调 - GET（URL验证）
 * GET /api/v1/wecom/web-login/callback
 * 企微后台验证URL有效性时调用
 */
router.get('/web-login/callback', async (req: Request, res: Response) => {
  try {
    const { msg_signature, timestamp, nonce, echostr } = req.query;
    log.info(`[WecomWebLogin] URL verify request: msg_signature=${msg_signature}, timestamp=${timestamp}, nonce=${nonce}, echostr_len=${(echostr as string || '').length}`);

    if (!echostr) {
      log.warn('[WecomWebLogin] 无echostr参数，返回success');
      return res.send('success');
    }

    // 获取配置的 Token 和 EncodingAESKey
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    if (!config?.webLoginToken || !config?.webLoginEncodingAesKey) {
      log.error('[WecomWebLogin] Web登录Token/AESKey未配置，无法验证回调URL');
      return res.status(500).send('config missing');
    }

    const token = config.webLoginToken;
    const encodingAesKey = config.webLoginEncodingAesKey;

    log.info(`[WecomWebLogin] 使用Token: ${token.substring(0, 6)}..., AESKey长度: ${encodingAesKey.length}`);

    // 验证签名: SHA1(sort([token, timestamp, nonce, echostr]))
    const sortedArr = [token, timestamp as string, nonce as string, echostr as string].sort();
    const sha1 = crypto.createHash('sha1').update(sortedArr.join('')).digest('hex');

    if (sha1 !== msg_signature) {
      log.error(`[WecomWebLogin] 签名验证失败! 计算值=${sha1}, 期望值=${msg_signature}`);
      log.error(`[WecomWebLogin] 排序后数组: [${sortedArr.map(s => s.substring(0, 20) + '...').join(', ')}]`);
      return res.status(403).send('signature mismatch');
    }

    log.info('[WecomWebLogin] 签名验证通过，开始解密echostr');

    // 解密 echostr（AES-256-CBC解密）
    const aesKey = Buffer.from(encodingAesKey + '=', 'base64');
    const iv = aesKey.subarray(0, 16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    decipher.setAutoPadding(false);

    const encryptedBuffer = Buffer.from(echostr as string, 'base64');
    let decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

    // 去除PKCS7填充
    const padLen = decrypted[decrypted.length - 1];
    if (padLen < 1 || padLen > 32) {
      log.error(`[WecomWebLogin] PKCS7填充异常: padLen=${padLen}`);
      return res.status(500).send('decrypt error');
    }
    decrypted = decrypted.subarray(0, decrypted.length - padLen);

    // 提取明文（跳过16字节随机串 + 4字节消息长度）
    const msgLen = decrypted.readUInt32BE(16);
    const echoStrDecrypted = decrypted.subarray(20, 20 + msgLen).toString('utf8');

    log.info(`[WecomWebLogin] URL验证成功，返回明文(长度=${echoStrDecrypted.length}): ${echoStrDecrypted.substring(0, 20)}...`);
    res.send(echoStrDecrypted);
  } catch (error: any) {
    log.error('[WecomWebLogin] URL verify error:', error.message, error.stack);
    res.status(500).send('error');
  }
});

/**
 * Web 登录指令回调 - POST（接收登录指令事件）
 * POST /api/v1/wecom/web-login/callback
 * 企微推送 suite_ticket 或其他事件时调用
 */
router.post('/web-login/callback', async (req: Request, res: Response) => {
  try {
    const { msg_signature, timestamp, nonce } = req.query;
    const body = req.body;
    log.info(`[WecomWebLogin] POST回调: timestamp=${timestamp}, nonce=${nonce}, bodyType=${typeof body}`);

    // 获取配置
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    if (!config?.webLoginToken || !config?.webLoginEncodingAesKey) {
      log.warn('[WecomWebLogin] POST回调: Token/AESKey未配置');
      return res.send('success');
    }

    // 从XML body中提取 Encrypt 字段
    let encryptMsg = '';
    if (typeof body === 'string') {
      const match = body.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/s);
      if (match) encryptMsg = match[1];
      if (!encryptMsg) {
        const match2 = body.match(/<Encrypt>(.*?)<\/Encrypt>/s);
        if (match2) encryptMsg = match2[1];
      }
    } else if (body?.xml?.Encrypt) {
      encryptMsg = Array.isArray(body.xml.Encrypt) ? body.xml.Encrypt[0] : body.xml.Encrypt;
    } else if (body?.Encrypt) {
      encryptMsg = body.Encrypt;
    }

    if (!encryptMsg) {
      log.warn('[WecomWebLogin] POST回调: 未找到Encrypt字段');
      return res.send('success');
    }

    const token = config.webLoginToken;
    const encodingAesKey = config.webLoginEncodingAesKey;

    // 验证签名
    const sortedArr = [token, timestamp as string, nonce as string, encryptMsg].sort();
    const sha1 = crypto.createHash('sha1').update(sortedArr.join('')).digest('hex');

    if (sha1 !== msg_signature) {
      log.warn(`[WecomWebLogin] POST回调签名验证失败: 计算=${sha1}, 期望=${msg_signature}`);
      return res.send('success');
    }

    // 解密消息体
    const aesKey = Buffer.from(encodingAesKey + '=', 'base64');
    const iv = aesKey.subarray(0, 16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    decipher.setAutoPadding(false);

    let decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptMsg, 'base64')),
      decipher.final()
    ]);

    // 去除PKCS7填充
    const padLen = decrypted[decrypted.length - 1];
    decrypted = decrypted.subarray(0, decrypted.length - padLen);

    // 提取明文
    const msgLen = decrypted.readUInt32BE(16);
    const msgContent = decrypted.subarray(20, 20 + msgLen).toString('utf8');

    log.info(`[WecomWebLogin] POST回调解密成功: ${msgContent.substring(0, 300)}`);

    // 解析事件类型，处理 suite_ticket 推送
    const infoTypeMatch = msgContent.match(/<InfoType><!\[CDATA\[(.*?)\]\]><\/InfoType>/);
    const infoType = infoTypeMatch ? infoTypeMatch[1] : '';

    if (infoType === 'suite_ticket') {
      const ticketMatch = msgContent.match(/<SuiteTicket><!\[CDATA\[(.*?)\]\]><\/SuiteTicket>/);
      const suiteIdMatch = msgContent.match(/<SuiteId><!\[CDATA\[(.*?)\]\]><\/SuiteId>/);
      const ticket = ticketMatch ? ticketMatch[1] : '';
      const suiteId = suiteIdMatch ? suiteIdMatch[1] : '';

      if (ticket && suiteId) {
        log.info(`[WecomWebLogin] 收到suite_ticket推送: suiteId=${suiteId}, ticketLen=${ticket.length}`);

        // 验证 ticket 有效性：用它去获取 suite_access_token，成功才存储
        let ticketValid = false;
        try {
          const loginSecret = config.webLoginSecret;
          if (loginSecret && suiteId === (config.webLoginAppId || '')) {
            const axios = (await import('axios')).default;
            const cleanTicket = ticket.replace(/[\s\r\n\t]+/g, '').trim();
            const verifyRes = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token', {
              suite_id: suiteId,
              suite_secret: loginSecret,
              suite_ticket: cleanTicket
            }, { timeout: 8000 });

            if (verifyRes.data?.suite_access_token) {
              ticketValid = true;
              log.info(`[WecomWebLogin] ticket验证通过，suite_access_token获取成功`);
            } else {
              log.warn(`[WecomWebLogin] ticket验证失败: ${JSON.stringify(verifyRes.data)}`);
            }
          } else {
            // 没有 Secret 或 SuiteID 不匹配，直接存储（后续使用时再验证）
            ticketValid = true;
            log.info(`[WecomWebLogin] 无法验证ticket（Secret未配置或SuiteID不匹配），直接存储`);
          }
        } catch (e: any) {
          // 验证请求异常，仍然存储（避免网络抖动导致丢失）
          ticketValid = true;
          log.warn(`[WecomWebLogin] ticket验证请求异常，仍存储: ${e.message}`);
        }

        if (ticketValid) {
          try {
            const configKey = `suite_ticket_${suiteId}`;
            const existing = await AppDataSource.query(
              `SELECT id FROM system_config WHERE config_key = ? AND tenant_id IS NULL LIMIT 1`,
              [configKey]
            );
            if (existing.length > 0) {
              await AppDataSource.query(
                `UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ? AND tenant_id IS NULL`,
                [ticket, configKey]
              );
            } else {
              const { v4: uuidv4 } = await import('uuid');
              await AppDataSource.query(
                `INSERT INTO system_config (id, config_key, config_value, config_type, tenant_id, created_at, updated_at) VALUES (?, ?, ?, 'string', NULL, NOW(), NOW())`,
                [uuidv4(), configKey, ticket]
              );
            }
            log.info(`[WecomWebLogin] suite_ticket已存储: key=${configKey}, ticketLen=${ticket.length}`);
          } catch (e: any) {
            log.error(`[WecomWebLogin] 存储suite_ticket失败: ${e.message}`);
          }
        }
      }
    } else {
      log.info(`[WecomWebLogin] POST回调事件类型: ${infoType}`);
    }

    // 企微要求回调必须返回字符串 "success"
    res.send('success');
  } catch (error: any) {
    log.error('[WecomWebLogin] POST Callback error:', error.message, error.stack);
    res.send('success');
  }
});

/**
 * 用 auth_code 换取登录用户身份
 * POST /api/v1/wecom/web-login/get-login-info
 *
 * 前端企微扫码登录成功后，拿到 code，调用此接口换取用户身份
 * 返回 corpId + userId，用于后续 ww.register 初始化
 */
router.post('/web-login/get-login-info', async (req: Request, res: Response) => {
  try {
    const { authCode } = req.body;
    if (!authCode) {
      return res.status(400).json({ success: false, message: '缺少 authCode' });
    }

    log.info(`[WecomWebLogin] get-login-info: code=${authCode.substring(0, 10)}..., codeLen=${authCode.length}`);

    // 获取配置
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const configs = await repo.find({ order: { id: 'ASC' }, take: 1 });
    const config = configs[0] || null;

    if (!config?.providerCorpId || !config?.providerSecret) {
      return res.status(400).json({ success: false, message: '服务商配置不完整（需要CorpID和ProviderSecret）' });
    }

    const axios = (await import('axios')).default;
    const loginAppId = config.webLoginAppId;
    const loginSecret = config.webLoginSecret;

    // ========== 获取 suite_access_token ==========
    // 优先级：1. 登录授权专用ticket  2. 主应用ticket（同一服务商下可能通用）
    let suiteToken = '';
    let suiteTicket = '';

    // 来源1：从 system_config 查找登录授权专用 ticket
    if (loginAppId) {
      try {
        const ticketRows = await AppDataSource.query(
          "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
          [`suite_ticket_${loginAppId}`]
        );
        if (ticketRows.length > 0 && ticketRows[0].config_value) {
          suiteTicket = ticketRows[0].config_value;
          log.info(`[WecomWebLogin] 找到登录授权专用ticket: len=${suiteTicket.length}`);
        }
      } catch { /* ignore */ }
    }

    // 来源2：主应用的 suite_ticket
    if (!suiteTicket && config.suiteTicket) {
      suiteTicket = config.suiteTicket;
      log.info(`[WecomWebLogin] 使用主应用ticket: len=${suiteTicket.length}`);
    }

    // 来源3：从 system_config 查找主应用 ticket
    if (!suiteTicket && config.suiteId) {
      try {
        const ticketRows = await AppDataSource.query(
          "SELECT config_value FROM system_config WHERE config_key IN (?, ?) ORDER BY updated_at DESC LIMIT 1",
          [`suite_ticket_${config.suiteId}`, 'wecom_suite_ticket']
        );
        if (ticketRows.length > 0 && ticketRows[0].config_value) {
          suiteTicket = ticketRows[0].config_value;
          log.info(`[WecomWebLogin] 从system_config找到ticket: len=${suiteTicket.length}`);
        }
      } catch { /* ignore */ }
    }

    // 尝试获取 suite_access_token
    if (suiteTicket && loginAppId && loginSecret) {
      const cleanTicket = suiteTicket.replace(/[\s\r\n\t]+/g, '').trim();
      try {
        const suiteTokenRes = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token', {
          suite_id: loginAppId,
          suite_secret: loginSecret,
          suite_ticket: cleanTicket
        }, { timeout: 10000 });

        if (suiteTokenRes.data?.suite_access_token) {
          suiteToken = suiteTokenRes.data.suite_access_token;
          log.info(`[WecomWebLogin] 获取suite_access_token成功(登录授权SuiteID)`);
        } else {
          log.warn(`[WecomWebLogin] get_suite_token(登录授权)失败: ${JSON.stringify(suiteTokenRes.data)}`);
        }
      } catch (e: any) {
        log.warn(`[WecomWebLogin] get_suite_token(登录授权)异常: ${e.message}`);
      }
    }

    // 如果登录授权SuiteID获取失败，尝试用主应用的 suite_access_token
    if (!suiteToken && suiteTicket && config.suiteId && config.suiteSecret) {
      const cleanTicket = suiteTicket.replace(/[\s\r\n\t]+/g, '').trim();
      try {
        const suiteTokenRes = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token', {
          suite_id: config.suiteId,
          suite_secret: config.suiteSecret,
          suite_ticket: cleanTicket
        }, { timeout: 10000 });

        if (suiteTokenRes.data?.suite_access_token) {
          suiteToken = suiteTokenRes.data.suite_access_token;
          log.info(`[WecomWebLogin] 获取suite_access_token成功(主应用SuiteID)`);
        } else {
          log.warn(`[WecomWebLogin] get_suite_token(主应用)失败: ${JSON.stringify(suiteTokenRes.data)}`);
        }
      } catch (e: any) {
        log.warn(`[WecomWebLogin] get_suite_token(主应用)异常: ${e.message}`);
      }
    }

    // 也尝试通过已有的 WecomTokenService 获取
    if (!suiteToken && config.suiteId) {
      try {
        const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
        suiteToken = await WecomTokenService.getSuiteAccessToken(config.suiteId);
        if (suiteToken) {
          log.info(`[WecomWebLogin] 通过WecomTokenService获取suite_access_token成功`);
        }
      } catch (e: any) {
        log.warn(`[WecomWebLogin] WecomTokenService获取失败: ${e.message}`);
      }
    }

    // ========== 用 suite_access_token 调用 getuserinfo3rd ==========
    if (suiteToken) {
      try {
        const userRes = await axios.get(
          `https://qyapi.weixin.qq.com/cgi-bin/service/auth/getuserinfo3rd?suite_access_token=${suiteToken}&code=${encodeURIComponent(authCode)}`,
          { timeout: 10000 }
        );

        log.info(`[WecomWebLogin] getuserinfo3rd响应: ${JSON.stringify(userRes.data)}`);

        if (!userRes.data?.errcode || userRes.data.errcode === 0) {
          return res.json({
            success: true,
            data: {
              corpId: userRes.data.corpid || '',
              corpName: '',
              openUserId: userRes.data.open_userid || '',
              userId: userRes.data.userid || '',
              userName: '',
              avatar: ''
            }
          });
        }

        // 如果是 40029，说明 code 已过期或被消费
        if (userRes.data.errcode === 40029) {
          return res.json({
            success: false,
            message: `获取用户身份失败: ${userRes.data.errmsg} (${userRes.data.errcode})`
          });
        }

        log.warn(`[WecomWebLogin] getuserinfo3rd失败: errcode=${userRes.data.errcode}, errmsg=${userRes.data.errmsg}`);
      } catch (e: any) {
        log.error(`[WecomWebLogin] getuserinfo3rd请求异常: ${e.message}`);
      }
    } else {
      log.error('[WecomWebLogin] 无法获取suite_access_token，所有方式均失败');
      return res.json({
        success: false,
        message: '无法获取suite_access_token。请确保：1.登录授权回调URL已配置且能接收ticket推送 2.主应用suite_ticket有效'
      });
    }

    // 所有方式都失败
    res.json({
      success: false,
      message: '获取用户身份失败，请检查后端日志'
    });
  } catch (error: any) {
    log.error('[WecomWebLogin] get-login-info error:', error.message);
    res.status(500).json({ success: false, message: '获取登录用户身份失败: ' + error.message });
  }
});

/**
 * 获取 JS-SDK 签名（会话展示组件需要）
 * POST /api/v1/wecom/web-login/agent-config-sign
 *
 * 前端 ww.register 时需要 getConfigSignature 和 getAgentConfigSignature 两个回调
 * 此接口通过 type 参数区分：
 *   - type='config'       → 企业级 jsapi_ticket 签名（wx.config 用）
 *   - type='agent_config'  → 应用级 jsapi_ticket 签名（wx.agentConfig 用）
 * 默认 agent_config，保持向后兼容
 */
router.post('/web-login/agent-config-sign', async (req: Request, res: Response) => {
  try {
    const { corpId, url: rawUrl, type: signType } = req.body;
    const url = (rawUrl || '').split('#')[0].replace(/\s+$/, '');
    const type = signType || 'agent_config';

    if (!corpId || !url) {
      return res.status(400).json({ success: false, message: '缺少 corpId 或 url' });
    }
    if (!['config', 'agent_config'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type 参数无效，需为 config 或 agent_config' });
    }

    const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');

    // ★ 加载完整的 WecomConfig 实体（与侧边栏签名端点一致）
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { corpId, isEnabled: true } });

    if (!config) {
      return res.status(404).json({ success: false, message: `未找到corpId=${corpId}的企微配置` });
    }

    log.info(`[WecomWebLogin] /sign: configId=${config.id}, corpId=${config.corpId}, authType=${config.authType}, agentId=${config.agentId || '(空)'}, type=${type}`);

    // ★ 第三方应用：自动校验和修正 agentId（从企微API获取最新值）
    if (config.authType === 'third_party' && config.suiteId && config.permanentCode) {
      try {
        const suiteToken = await WecomTokenService.getSuiteAccessToken(config.suiteId);
        const axios = (await import('axios')).default;
        const authInfoRes = await axios.post(
          `https://qyapi.weixin.qq.com/cgi-bin/service/get_auth_info?suite_access_token=${suiteToken}`,
          { auth_corpid: config.corpId, permanent_code: config.permanentCode }
        );
        if (!authInfoRes.data?.errcode || authInfoRes.data.errcode === 0) {
          const agents = authInfoRes.data?.auth_info?.agent || [];
          const apiAgentId = agents[0]?.agentid;
          log.info(`[WecomWebLogin] /sign get_auth_info: agents数量=${agents.length}, apiAgentId=${apiAgentId || '(空)'}, DB agentId=${config.agentId || '(空)'}`);
          if (apiAgentId && String(apiAgentId) !== String(config.agentId || '')) {
            log.info(`[WecomWebLogin] /sign agentId需要更新: DB=${config.agentId || 'NULL'} → API=${apiAgentId}`);
            await AppDataSource.query(
              'UPDATE wecom_configs SET agent_id = ?, updated_at = NOW() WHERE id = ?',
              [apiAgentId, config.id]
            );
            config.agentId = apiAgentId;
          }
        } else {
          log.warn(`[WecomWebLogin] /sign get_auth_info失败: errcode=${authInfoRes.data?.errcode}, errmsg=${authInfoRes.data?.errmsg}`);
        }
      } catch (e: any) {
        log.warn(`[WecomWebLogin] /sign agentId校验跳过: ${e.message}`);
      }
    }

    if (!config.agentId) {
      return res.status(400).json({ success: false, message: '该企业未配置 agentId，请在CRM企微管理页面刷新授权信息' });
    }

    // ★ 使用 WecomTokenService 获取 access_token（与侧边栏一致，支持缓存和第三方模式）
    const accessToken = await WecomTokenService.getAccessToken(config);

    // ★ 使用 WecomApiService 获取 jsapi_ticket（带缓存，避免频繁调用API）
    let ticket: string;
    if (type === 'config') {
      ticket = await WecomApiService.getJsSdkTicket(accessToken);
    } else {
      ticket = await WecomApiService.getAgentJsSdkTicket(accessToken);
    }

    // 生成签名
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = crypto.randomBytes(8).toString('hex');
    const signature = WecomApiService.generateJsSdkSignature(ticket, nonceStr, timestamp, url);

    log.info(`[WecomWebLogin] /sign完成: type=${type}, corpId=${corpId}, agentId=${config.agentId}, url=${url.substring(0, 80)}, ticket前缀=${ticket.substring(0, 20)}, sig=${signature.substring(0, 16)}`);

    res.json({
      success: true,
      data: {
        corpId,
        agentId: config.agentId,
        timestamp,
        nonceStr,
        signature
      }
    });
  } catch (error: any) {
    log.error('[WecomWebLogin] agent-config-sign error:', error.message, error.stack?.substring(0, 300));
    res.status(500).json({ success: false, message: '生成签名失败: ' + error.message });
  }
});

export default router;
