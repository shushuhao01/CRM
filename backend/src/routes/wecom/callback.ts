/**
 * 企微回调处理路由 (V2.0)
 *
 * 处理企业微信服务器推送的回调验证和事件消息
 * V2.0增强: 事件处理器注册模式 + 第三方应用事件支持
 */
import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { AppDataSource } from '../../config/database';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomCustomer } from '../../entities/WecomCustomer';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';
import axios from 'axios';

const router = Router();

// ==================== 事件处理器注册表(V2.0) ====================

type EventHandler = (config: WecomConfig, msgContent: string, changeType?: string) => Promise<void>;

const eventHandlers: Map<string, EventHandler> = new Map();

/** 注册事件处理器 */
function registerHandler(eventType: string, handler: EventHandler): void {
  eventHandlers.set(eventType, handler);
}

// ==================== 回调验证(GET) ====================

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { msg_signature, timestamp, nonce, echostr } = req.query;
    log.info('[Wecom Callback] Verify request:', { msg_signature, timestamp, nonce, echostr: echostr?.toString().substring(0, 20) + '...' });

    if (!msg_signature || !timestamp || !nonce || !echostr) {
      return res.status(400).send('Missing parameters');
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const configs = await configRepo.find({ where: { isEnabled: true } });

    for (const config of configs) {
      if (!config.callbackToken || !config.encodingAesKey) continue;

      const token = config.callbackToken;
      const arr = [token, timestamp as string, nonce as string, echostr as string].sort();
      const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');

      if (sha1 === msg_signature) {
        try {
          const aesKey = Buffer.from(config.encodingAesKey + '=', 'base64');
          const iv = aesKey.slice(0, 16);
          const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
          decipher.setAutoPadding(false);
          let decrypted = Buffer.concat([decipher.update(Buffer.from(echostr as string, 'base64')), decipher.final()]);

          const pad = decrypted[decrypted.length - 1];
          decrypted = decrypted.slice(0, decrypted.length - pad);

          const msgLen = decrypted.readUInt32BE(16);
          const msg = decrypted.slice(20, 20 + msgLen).toString('utf8');

          log.info('[Wecom Callback] Verify success, echostr:', msg);
          return res.send(msg);
        } catch (e) {
          log.error('[Wecom Callback] Decrypt error:', e);
        }
      }
    }

    log.info('[Wecom Callback] Verify failed - no matching config');
    res.status(403).send('Verify failed');
  } catch (error: any) {
    log.error('[Wecom Callback] Error:', error);
    res.status(500).send('Server error');
  }
});

// ==================== 回调消息接收(POST) - V2.0事件分发 ====================

router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { msg_signature, timestamp, nonce } = req.query;
    const body = req.body;
    log.info('[Wecom Callback] Message received:', { msg_signature, timestamp, nonce });

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const configs = await configRepo.find({ where: { isEnabled: true } });

    for (const config of configs) {
      if (!config.callbackToken || !config.encodingAesKey) continue;

      try {
        let encryptMsg = '';
        if (typeof body === 'string') {
          const match = body.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/);
          if (match) encryptMsg = match[1];
        } else if (body?.xml?.Encrypt) {
          encryptMsg = Array.isArray(body.xml.Encrypt) ? body.xml.Encrypt[0] : body.xml.Encrypt;
        } else if (body?.Encrypt) {
          encryptMsg = body.Encrypt;
        }

        if (!encryptMsg) continue;

        const token = config.callbackToken;
        const arr = [token, timestamp as string, nonce as string, encryptMsg].sort();
        const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');

        if (sha1 !== msg_signature) continue;

        const aesKey = Buffer.from(config.encodingAesKey + '=', 'base64');
        const iv = aesKey.slice(0, 16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
        decipher.setAutoPadding(false);
        let decrypted = Buffer.concat([
          decipher.update(Buffer.from(encryptMsg, 'base64')),
          decipher.final()
        ]);

        const pad = decrypted[decrypted.length - 1];
        decrypted = decrypted.slice(0, decrypted.length - pad);

        const msgLen = decrypted.readUInt32BE(16);
        const msgContent = decrypted.slice(20, 20 + msgLen).toString('utf8');

        log.info('[Wecom Callback] Decrypted message for config:', config.name);

        // V2.0: 解析事件类型，使用注册的处理器分发
        const eventType = extractXmlField(msgContent, 'Event') || 'unknown';
        const changeType = extractXmlField(msgContent, 'ChangeType') || '';
        const infoType = extractXmlField(msgContent, 'InfoType') || '';

        // 第三方应用事件使用InfoType
        const dispatchKey = infoType || eventType;
        log.info('[Wecom Callback] Event:', dispatchKey, 'Change:', changeType);

        const handler = eventHandlers.get(dispatchKey);
        if (handler) {
          try {
            await handler(config, msgContent, changeType);
          } catch (err: any) {
            log.error(`[Wecom Callback] Handler error for ${dispatchKey}:`, err.message);
            return res.status(500).send('handler error');
          }
        } else {
          log.info('[Wecom Callback] No handler for event:', dispatchKey);
        }

        return res.send('success');
      } catch (e: any) {
        log.error('[Wecom Callback] Decrypt error for config:', config.name, e.message);
      }
    }

    log.warn('[Wecom Callback] No matching config found for signature verification');
    res.status(403).send('verification failed');
  } catch (error: any) {
    log.error('[Wecom Callback] Error:', error);
    res.status(500).send('server error');
  }
});

// ==================== XML解析工具 ====================

function extractXmlField(xml: string, field: string): string {
  const regex = new RegExp(`<${field}><!\\\[CDATA\\\[(.*?)\\\]\\\]></${field}>`);
  const match = xml.match(regex);
  return match ? match[1] : '';
}

// ==================== 注册事件处理器 ====================

// 1. 外部联系人变更
registerHandler('change_external_contact', async (config, msgContent, changeType) => {
  await handleExternalContactChange(config, changeType || '', msgContent);
});

// 2. 客户群变更
registerHandler('change_external_chat', async (config, msgContent, changeType) => {
  log.info('[Wecom Callback] External chat changed, changeType:', changeType);
  await handleExternalChatChange(config, changeType || '', msgContent);
});

// 3. 标签变更
registerHandler('change_external_tag', async (_config, msgContent) => {
  const tagId = extractXmlField(msgContent, 'Id');
  const tagChangeType = extractXmlField(msgContent, 'ChangeType');
  log.info(`[Wecom Callback] Tag change: ${tagChangeType}, tagId: ${tagId}`);
});

// 4. 会话存档通知
registerHandler('msgaudit_notify', async (config) => {
  log.info('[Wecom Callback] Chat archive notification');
  try {
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    await WecomChatArchiveService.syncChatRecords(config, false);
    log.info(`[Wecom Callback] Archive sync triggered for: ${config.name}`);
  } catch (e: any) {
    log.warn('[Wecom Callback] Archive auto-sync failed:', e.message);
  }
});

// 5. 第三方应用: 授权成功 (V2.0新增)
registerHandler('create_auth', async (config, msgContent) => {
  const authCode = extractXmlField(msgContent, 'AuthCode');
  const suiteId = extractXmlField(msgContent, 'SuiteId');
  if (authCode && suiteId) {
    try {
      const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
      await WecomTokenService.handleCreateAuth(suiteId, authCode, config.tenantId || undefined);
      log.info('[Wecom Callback] create_auth processed successfully');
    } catch (e: any) {
      log.error('[Wecom Callback] create_auth failed:', e.message);
    }
  }
});

// 6. 第三方应用: 取消授权 (V2.0新增)
registerHandler('cancel_auth', async (_config, msgContent) => {
  const corpId = extractXmlField(msgContent, 'AuthCorpId');
  if (corpId) {
    try {
      const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
      await WecomTokenService.handleCancelAuth(corpId);
      log.info('[Wecom Callback] cancel_auth processed for:', corpId);
    } catch (e: any) {
      log.error('[Wecom Callback] cancel_auth failed:', e.message);
    }
  }
});

// 7. 第三方应用: suite_ticket推送 (V2.0新增)
registerHandler('suite_ticket', async (_config, msgContent) => {
  const suiteTicket = extractXmlField(msgContent, 'SuiteTicket');
  const suiteId = extractXmlField(msgContent, 'SuiteId');
  if (suiteTicket && suiteId) {
    try {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = JSON_SET(config_value, '$.suite_ticket', ?) WHERE config_key = 'wecom_suite_config'`,
        [suiteTicket]
      );
      log.info('[Wecom Callback] suite_ticket updated for suiteId:', suiteId);
    } catch (e: any) {
      log.error('[Wecom Callback] suite_ticket update failed:', e.message);
    }
  }
});

// 8. 客服消息事件 (V2.0新增) — P0: WebSocket实时推送
registerHandler('kf_msg_or_event', async (config, msgContent) => {
  log.info('[Wecom Callback] Customer service event for config:', config.name);
  const token = extractXmlField(msgContent, 'Token');
  const openKfId = extractXmlField(msgContent, 'OpenKfId');

  if (token) {
    log.info('[Wecom Callback] KF sync token received, length:', token.length);
  }

  // P0: 通过WebSocket实时广播客服事件给前端
  try {
    const { webSocketService } = await import('../../services/WebSocketService');
    if (webSocketService.isInitialized()) {
      webSocketService.broadcast('wecom:kf_session_update', {
        type: 'kf_msg_or_event',
        configId: config.id,
        configName: config.name,
        openKfId: openKfId || '',
        syncToken: token ? token.substring(0, 10) + '...' : '',
        message: '客服会话有新消息'
      }, config.tenantId);
      log.info('[Wecom Callback] KF event broadcasted via WebSocket');
    }
  } catch (e: any) {
    log.warn('[Wecom Callback] WebSocket broadcast failed:', e.message);
  }
});

// 9. 获客助手事件 (V2.0新增)
registerHandler('customer_acquisition', async (config, msgContent) => {
  log.info('[Wecom Callback] Customer acquisition event for config:', config.name);
  const linkId = extractXmlField(msgContent, 'LinkId');
  if (linkId) {
    log.info('[Wecom Callback] Acquisition link event, linkId:', linkId);
    // 通过WebSocket通知前端刷新获客数据
    try {
      const { webSocketService } = await import('../../services/WebSocketService');
      if (webSocketService.isInitialized()) {
        webSocketService.broadcast('wecom:acquisition_update', {
          type: 'customer_acquisition',
          configId: config.id,
          linkId
        }, config.tenantId);
      }
    } catch (e: any) {
      log.warn('[Wecom Callback] Acquisition WebSocket broadcast failed:', e.message);
    }
  }
});

// ==================== 事件处理函数 ====================

async function handleExternalContactChange(config: WecomConfig, changeType: string, msgContent: string): Promise<void> {
  if (changeType === 'add_external_contact') {
    log.info('[Wecom Callback] New external contact added');
    const userId = extractXmlField(msgContent, 'UserID');
    const externalUserId = extractXmlField(msgContent, 'ExternalUserID');
    if (userId && externalUserId) {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
        const contactDetail = await WecomApiService.getExternalContactDetail(accessToken, externalUserId);
        if (contactDetail?.external_contact) {
          const ec = contactDetail.external_contact;
          const customerRepo = AppDataSource.getRepository(WecomCustomer);
          const existing = await customerRepo.findOne({
            where: { externalUserId: ec.external_userid, wecomConfigId: config.id }
          });
          if (!existing) {
            const followUserList = contactDetail.follow_user || [];
            const followUser = followUserList.find((f: any) => f.userid === userId) || followUserList[0];
            const customer = customerRepo.create({
              tenantId: config.tenantId,
              wecomConfigId: config.id,
              corpId: config.corpId,
              externalUserId: ec.external_userid,
              name: ec.name || '',
              avatar: ec.avatar || '',
              type: ec.type || 1,
              gender: ec.gender || 0,
              corpName: ec.corp_name || '',
              position: ec.position || '',
              followUserId: userId,
              followUsers: followUserList.length > 0 ? JSON.stringify(followUserList) : null,
              remark: followUser?.remark || '',
              description: followUser?.description || '',
              addWay: followUser?.add_way,
              tagIds: followUser?.tags ? JSON.stringify(followUser.tags.map((t: any) => t.tag_id)) : null,
              status: 'normal',
              addTime: followUser?.createtime ? new Date(followUser.createtime * 1000) : new Date()
            });
            await customerRepo.save(customer);
            log.info(`[Wecom Callback] Auto-synced new customer: ${ec.name || ec.external_userid}`);
          }
        }
      } catch (e: any) {
        log.warn('[Wecom Callback] Auto-sync new contact failed:', e.message);
      }
    }
  } else if (changeType === 'del_external_contact' || changeType === 'del_follow_user') {
    const extUserId = extractXmlField(msgContent, 'ExternalUserID');
    if (extUserId) {
      try {
        const customerRepo = AppDataSource.getRepository(WecomCustomer);
        await customerRepo.update(
          { externalUserId: extUserId, wecomConfigId: config.id },
          { status: 'deleted', deleteTime: new Date() as any }
        );
      } catch (e: any) {
        log.warn('[Wecom Callback] Mark contact deleted failed:', e.message);
      }
    }
  } else if (changeType === 'edit_external_contact') {
    const editExtUserId = extractXmlField(msgContent, 'ExternalUserID');
    const editUserId = extractXmlField(msgContent, 'UserID');
    if (editExtUserId) {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
        const contactDetail = await WecomApiService.getExternalContactDetail(accessToken, editExtUserId);
        if (contactDetail?.external_contact) {
          const ec = contactDetail.external_contact;
          const followUserList = contactDetail.follow_user || [];
          const followUser = followUserList.find((f: any) => f.userid === editUserId) || followUserList[0];
          const customerRepo = AppDataSource.getRepository(WecomCustomer);
          const existing = await customerRepo.findOne({
            where: { externalUserId: ec.external_userid, wecomConfigId: config.id }
          });
          if (existing) {
            existing.name = ec.name || existing.name;
            existing.avatar = ec.avatar || existing.avatar;
            existing.remark = followUser?.remark ?? existing.remark;
            existing.followUsers = followUserList.length > 0 ? JSON.stringify(followUserList) : existing.followUsers;
            await customerRepo.save(existing);
          }
        }
      } catch (e: any) {
        log.warn('[Wecom Callback] Edit contact sync failed:', e.message);
      }
    }
  }
}

async function handleExternalChatChange(config: WecomConfig, changeType: string, msgContent: string): Promise<void> {
  const chatId = extractXmlField(msgContent, 'ChatId');
  if (!chatId) return;
  log.info(`[Wecom Callback] Chat change: ${changeType}, chatId: ${chatId}`);

  if (changeType === 'create' || changeType === 'update') {
    try {
      const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
      const response = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/groupchat/get?access_token=${accessToken}`,
        { chat_id: chatId, need_name: 1 }
      );
      if (response.data.errcode === 0 && response.data.group_chat) {
        const gc = response.data.group_chat;
        const { WecomCustomerGroup } = await import('../../entities/WecomCustomerGroup');
        const groupRepo = AppDataSource.getRepository(WecomCustomerGroup);
        let group = await groupRepo.findOne({ where: { chatId, wecomConfigId: config.id } });
        if (group) {
          group.name = gc.name || group.name;
          group.ownerUserId = gc.owner || group.ownerUserId;
          group.memberCount = gc.member_list?.length || group.memberCount;
        } else {
          group = groupRepo.create({
            tenantId: config.tenantId,
            wecomConfigId: config.id,
            chatId,
            name: gc.name || '',
            ownerUserId: gc.owner || '',
            memberCount: gc.member_list?.length || 0,
            createTime: gc.create_time ? new Date(gc.create_time * 1000) : new Date(),
            status: 'normal'
          });
        }
        await groupRepo.save(group);
      }
    } catch (e: any) {
      log.warn('[Wecom Callback] Group sync failed:', e.message);
    }
  } else if (changeType === 'dismiss') {
    try {
      const { WecomCustomerGroup } = await import('../../entities/WecomCustomerGroup');
      const groupRepo = AppDataSource.getRepository(WecomCustomerGroup);
      await groupRepo.update({ chatId, wecomConfigId: config.id }, { status: 'dismissed' });
    } catch (e: any) {
      log.warn('[Wecom Callback] Group dismiss update failed:', e.message);
    }
  }
}

// ==================== 第三方应用授权 (V4.0) ====================

/**
 * 获取第三方应用授权URL
 * 前端调用此接口获取授权安装链接，生成二维码供管理员扫码
 */
router.get('/callback/auth-url', async (req: Request, res: Response) => {
  try {
    // 从system_config或wecom_suite_configs读取服务商应用配置
    let suiteId = '';
    let suiteSecret = '';
    let suiteTicket = '';

    try {
      // 优先从 system_config 表读取（旧版兼容）
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'wecom_suite_config' LIMIT 1`
      );
      if (result?.[0]?.config_value) {
        const config = typeof result[0].config_value === 'string'
          ? JSON.parse(result[0].config_value)
          : result[0].config_value;
        suiteId = config.suite_id || '';
        suiteSecret = config.suite_secret || '';
        suiteTicket = config.suite_ticket || '';
      }
    } catch (e) {
      log.warn('[Wecom Auth] Read system_config suite config error:', e);
    }

    // 如果 system_config 中没有，从管理后台的 wecom_suite_configs 表读取
    if (!suiteId || !suiteSecret) {
      try {
        const suiteRows = await AppDataSource.query(
          `SELECT suite_id, suite_secret, suite_ticket FROM wecom_suite_configs ORDER BY id ASC LIMIT 1`
        );
        if (suiteRows?.[0]) {
          suiteId = suiteRows[0].suite_id || '';
          suiteSecret = suiteRows[0].suite_secret || '';
          suiteTicket = suiteTicket || suiteRows[0].suite_ticket || '';
          if (suiteId && suiteSecret) {
            log.info('[Wecom Auth] Suite config loaded from wecom_suite_configs table');
          }
        }
      } catch (e) {
        log.warn('[Wecom Auth] Read wecom_suite_configs error:', e);
      }
    }

    if (!suiteId || !suiteSecret) {
      return res.json({
        success: true,
        data: {
          authUrl: null,
          suiteId: null,
          preAuthCode: null,
          message: '未配置服务商应用信息(SuiteID/SuiteSecret)，请在管理后台系统设置中配置'
        }
      });
    }

    if (!suiteTicket) {
      return res.json({
        success: true,
        data: {
          authUrl: null,
          suiteId,
          preAuthCode: null,
          message: '尚未收到suite_ticket推送，请确认回调URL已正确配置，企微服务器会每10分钟推送一次'
        }
      });
    }

    // 获取suite_access_token
    const tokenRes = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token', {
      suite_id: suiteId,
      suite_secret: suiteSecret,
      suite_ticket: suiteTicket
    });

    if (tokenRes.data.errcode && tokenRes.data.errcode !== 0) {
      log.error('[Wecom Auth] Get suite token failed:', tokenRes.data);
      return res.json({
        success: false,
        message: `获取suite_access_token失败: ${tokenRes.data.errmsg}`
      });
    }

    const suiteAccessToken = tokenRes.data.suite_access_token;

    // 获取预授权码
    const preAuthRes = await axios.post(
      `https://qyapi.weixin.qq.com/cgi-bin/service/get_pre_auth_code?suite_access_token=${suiteAccessToken}`,
      {}
    );

    if (preAuthRes.data.errcode && preAuthRes.data.errcode !== 0) {
      log.error('[Wecom Auth] Get pre_auth_code failed:', preAuthRes.data);
      return res.json({
        success: false,
        message: `获取预授权码失败: ${preAuthRes.data.errmsg}`
      });
    }

    const preAuthCode = preAuthRes.data.pre_auth_code;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/v1/wecom/callback/auth-callback`;
    const tenantId = (req.query.tenantId as string) || '';
    const statePayload = tenantId ? `crm_auth_${tenantId}` : 'crm_auth';
    const authUrl = `https://open.work.weixin.qq.com/3rdapp/install?suite_id=${suiteId}&pre_auth_code=${preAuthCode}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(statePayload)}`;

    log.info('[Wecom Auth] Generated auth URL for suiteId:', suiteId, 'tenantId:', tenantId || '(none)');

    res.json({
      success: true,
      data: {
        authUrl,
        suiteId,
        preAuthCode,
        redirectUri
      }
    });
  } catch (error: any) {
    log.error('[Wecom Auth] Generate auth URL error:', error.message);
    res.status(500).json({ success: false, message: '生成授权链接失败' });
  }
});

/**
 * 第三方应用授权回调 (企微服务器重定向到此URL)
 * 接收auth_code，换取永久授权码，自动创建WecomConfig
 */
router.get('/callback/auth-callback', async (req: Request, res: Response) => {
  try {
    const { auth_code, state } = req.query;
    log.info('[Wecom Auth] Auth callback received, auth_code:', auth_code?.toString()?.substring(0, 10) + '...', 'state:', state);

    if (!auth_code) {
      return res.redirect('/?error=missing_auth_code');
    }

    // 从 state 参数中提取 tenantId（格式: crm_auth_<tenantId>）
    const stateStr = String(state || '');
    const stateTenantId = stateStr.startsWith('crm_auth_') ? stateStr.substring('crm_auth_'.length) : '';

    // 读取服务商配置
    let suiteId = '', suiteSecret = '', suiteTicket = '';
    try {
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'wecom_suite_config' LIMIT 1`
      );
      if (result?.[0]?.config_value) {
        const config = typeof result[0].config_value === 'string'
          ? JSON.parse(result[0].config_value)
          : result[0].config_value;
        suiteId = config.suite_id || '';
        suiteSecret = config.suite_secret || '';
        suiteTicket = config.suite_ticket || '';
      }
    } catch (e) {
      log.error('[Wecom Auth] Read suite config error:', e);
      return res.redirect('/?error=config_read_failed');
    }

    // 获取suite_access_token
    const tokenRes = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token', {
      suite_id: suiteId,
      suite_secret: suiteSecret,
      suite_ticket: suiteTicket
    });

    if (tokenRes.data.errcode && tokenRes.data.errcode !== 0) {
      log.error('[Wecom Auth] Get suite token for callback failed:', tokenRes.data);
      return res.redirect('/?error=suite_token_failed');
    }

    const suiteAccessToken = tokenRes.data.suite_access_token;

    // 用auth_code换取永久授权码
    const permRes = await axios.post(
      `https://qyapi.weixin.qq.com/cgi-bin/service/get_permanent_code?suite_access_token=${suiteAccessToken}`,
      { auth_code: auth_code as string }
    );

    if (permRes.data.errcode && permRes.data.errcode !== 0) {
      log.error('[Wecom Auth] Get permanent code failed:', permRes.data);
      return res.redirect('/?error=permanent_code_failed');
    }

    const { permanent_code, auth_corp_info, auth_user_info, auth_info } = permRes.data;
    const corpId = auth_corp_info?.corpid;
    const corpName = auth_corp_info?.corp_name || '';

    log.info('[Wecom Auth] Authorization success for corp:', corpName, corpId);

    // 创建或更新WecomConfig
    const configRepo = AppDataSource.getRepository(WecomConfig);
    let config = await configRepo.findOne({ where: { corpId } });

    if (config) {
      config.permanentCode = permanent_code;
      config.authCorpInfo = JSON.stringify(auth_corp_info);
      config.authUserInfo = JSON.stringify(auth_user_info);
      config.authScope = auth_info ? JSON.stringify(auth_info) : null;
      config.authType = 'third_party';
      config.authMode = 'third_party';
      config.authCorpName = corpName;
      config.authTime = new Date();
      config.connectionStatus = 'connected';
      config.suiteId = suiteId;
      config.name = corpName || config.name;
      if (auth_user_info?.userid) {
        config.bindOperator = auth_user_info.name || auth_user_info.userid;
        config.authAdminUserId = auth_user_info.userid;
      }
      if (!config.tenantId && stateTenantId) {
        config.tenantId = stateTenantId;
        log.info(`[Wecom Auth] auth-callback: 从state参数补充tenantId=${stateTenantId}, corpId=${corpId}`);
      } else if (!config.tenantId) {
        log.warn(`[Wecom Auth] auth-callback: 更新已有WecomConfig但tenantId为空, corpId=${corpId}, configId=${config.id}`);
      }
    } else {
      // 优先使用state中传递的tenantId，否则尝试从已有记录(含禁用)中查找
      let tenantId: string | undefined = stateTenantId || undefined;
      if (!tenantId) {
        try {
          const rows = await AppDataSource.query(
            'SELECT tenant_id FROM wecom_configs WHERE corp_id = ? AND tenant_id IS NOT NULL AND tenant_id != ? LIMIT 1',
            [corpId, '']
          );
          tenantId = rows?.[0]?.tenant_id;
        } catch (_e) { /* ignore */ }
      }

      if (!tenantId) {
        log.warn(`[Wecom Auth] auth-callback: 新建WecomConfig未能确定tenantId, corpId=${corpId}, corpName=${corpName}`);
      }

      config = configRepo.create({
        tenantId,
        name: corpName || `企业${corpId?.substring(0, 6)}`,
        corpId: corpId,
        corpSecret: permanent_code,
        authType: 'third_party',
        authMode: 'third_party',
        permanentCode: permanent_code,
        suiteId: suiteId,
        authCorpInfo: JSON.stringify(auth_corp_info),
        authUserInfo: JSON.stringify(auth_user_info),
        authScope: auth_info ? JSON.stringify(auth_info) : null,
        authCorpName: corpName,
        authAdminUserId: auth_user_info?.userid || '',
        authTime: new Date(),
        bindOperator: auth_user_info?.name || auth_user_info?.userid || '管理员',
        bindTime: new Date(),
        connectionStatus: 'connected',
        isEnabled: true
      });
    }

    await configRepo.save(config);
    log.info('[Wecom Auth] Config saved for corp:', corpName, 'id:', config.id);

    // 重定向到前端企微配置页
    res.redirect('/wecom/config?auth=success&corp=' + encodeURIComponent(corpName));
  } catch (error: any) {
    log.error('[Wecom Auth] Auth callback error:', error.message, error.stack);
    res.redirect('/?error=auth_callback_failed');
  }
});

export default router;

