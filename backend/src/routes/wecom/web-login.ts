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
    res.json({
      success: true,
      data: {
        appId: config.webLoginAppId || config.suiteId,  // 优先用登录授权专用AppID
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

    // 获取 provider_access_token
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    if (!config?.providerCorpId || !config?.providerSecret) {
      return res.status(400).json({ success: false, message: '服务商配置不完整' });
    }

    const axios = (await import('axios')).default;

    // 1. 获取 provider_access_token
    const tokenRes = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_provider_token', {
      corpid: config.providerCorpId,
      provider_secret: config.providerSecret
    });

    if (!tokenRes.data?.provider_access_token) {
      log.error('[WecomWebLogin] 获取provider_token失败:', tokenRes.data);
      return res.status(500).json({ success: false, message: '获取服务商Token失败' });
    }

    const providerToken = tokenRes.data.provider_access_token;

    // 2. 用 auth_code 换取登录用户身份
    const loginRes = await axios.post(
      `https://qyapi.weixin.qq.com/cgi-bin/service/get_login_info?access_token=${providerToken}`,
      { auth_code: authCode }
    );

    if (loginRes.data?.errcode && loginRes.data.errcode !== 0) {
      log.error('[WecomWebLogin] get_login_info失败:', loginRes.data);
      return res.json({
        success: false,
        message: `获取用户身份失败: ${loginRes.data.errmsg} (${loginRes.data.errcode})`
      });
    }

    const { corp_info, user_info } = loginRes.data;
    log.info(`[WecomWebLogin] 登录成功: corpId=${corp_info?.corpid}, userId=${user_info?.open_userid || user_info?.userid}`);

    res.json({
      success: true,
      data: {
        corpId: corp_info?.corpid || '',
        corpName: corp_info?.corp_full_name || '',
        openUserId: user_info?.open_userid || '',
        userId: user_info?.userid || '',
        userName: user_info?.name || '',
        avatar: user_info?.avatar || ''
      }
    });
  } catch (error: any) {
    log.error('[WecomWebLogin] get-login-info error:', error.message);
    res.status(500).json({ success: false, message: '获取登录用户身份失败' });
  }
});

/**
 * 获取 agentConfig 签名（会话展示组件需要）
 * POST /api/v1/wecom/web-login/agent-config-sign
 *
 * 前端 ww.register 时需要 getAgentConfigSignature 回调
 * 此接口为其提供签名数据
 */
router.post('/web-login/agent-config-sign', async (req: Request, res: Response) => {
  try {
    const { corpId, url } = req.body;
    if (!corpId || !url) {
      return res.status(400).json({ success: false, message: '缺少 corpId 或 url' });
    }

    // 获取该企业的 corp_access_token（通过 permanent_code）
    const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');

    // 查找该 corpId 对应的 wecom_config
    const configRows = await AppDataSource.query(
      'SELECT id, agent_id FROM wecom_configs WHERE corp_id = ? AND is_enabled = 1 LIMIT 1',
      [corpId]
    );

    if (!configRows.length) {
      return res.status(404).json({ success: false, message: '未找到该企业的配置' });
    }

    const configId = configRows[0].id;
    const agentId = configRows[0].agent_id;

    if (!agentId) {
      return res.status(400).json({ success: false, message: '该企业未配置 agentId' });
    }

    // 获取 corp_access_token
    const accessToken = await WecomTokenService.getAccessTokenByConfigId(configId, 'corp');

    // 获取 jsapi_ticket（agent级别）
    const axios = (await import('axios')).default;
    const ticketRes = await axios.get(
      `https://qyapi.weixin.qq.com/cgi-bin/ticket/get?access_token=${accessToken}&type=agent_config`
    );

    if (ticketRes.data?.errcode && ticketRes.data.errcode !== 0) {
      log.error('[WecomWebLogin] 获取agent_ticket失败:', ticketRes.data);
      return res.status(500).json({ success: false, message: '获取签名票据失败' });
    }

    const ticket = ticketRes.data.ticket;
    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = crypto.randomBytes(8).toString('hex');

    // 生成签名
    const signStr = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash('sha1').update(signStr).digest('hex');

    res.json({
      success: true,
      data: {
        corpId,
        agentId,
        timestamp,
        nonceStr,
        signature
      }
    });
  } catch (error: any) {
    log.error('[WecomWebLogin] agent-config-sign error:', error.message);
    res.status(500).json({ success: false, message: '生成签名失败: ' + error.message });
  }
});

export default router;
