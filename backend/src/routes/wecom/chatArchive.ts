/**
 * 会话存档路由
 * 包含：授权状态、记录列表、同步、统计、会话视图、质检、标签、搜索、VAS购买
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomCustomer } from '../../entities/WecomCustomer';
import { WecomChatRecord } from '../../entities/WecomChatRecord';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParse } from './wecomHelpers';
import { WecomSuiteConfig } from '../../entities/WecomSuiteConfig';

const router = Router();

/** 获取服务商级别的全局RSA私钥（第三方模式用） */
async function getGlobalRsaPrivateKey(): Promise<string | null> {
  try {
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const suiteConfig = await repo.findOne({ where: {}, order: { id: 'ASC' } });
    return suiteConfig?.chatArchiveRsaPrivateKey || null;
  } catch {
    return null;
  }
}

// ==================== 会话存档状态 ====================

router.get('/chat-archive/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    if (tenantId) {
      try {
        const tenantRows = await AppDataSource.query(
          'SELECT wecom_chat_archive_auth FROM tenants WHERE id = ?', [tenantId]
        );
        const isAuthorized = !!(tenantRows[0]?.wecom_chat_archive_auth);
        if (!isAuthorized) {
          return res.json({ success: true, data: { authorized: false, enabled: false, message: '此功能为增值服务，请联系管理员开通' } });
        }
      } catch (authErr) {
        log.info('[Wecom] Chat archive auth check skipped:', (authErr as any).message?.substring(0, 60));
      }
    }

    const configRepo = getTenantRepo(WecomConfig);
    const configs = await configRepo.find({ where: { isEnabled: true } });
    const globalRsaKey = await getGlobalRsaPrivateKey();

    // 第三方模式：有permanent_code即可（RSA密钥由服务商平台统一管理）
    // 自建模式：需要每租户配置archiveSecret+privateKey
    const archiveConfigs = configs.filter(c => {
      if (c.authType === 'third_party' && c.permanentCode) {
        return true;
      }
      return c.chatArchiveSecret && c.chatArchivePrivateKey;
    });

    if (archiveConfigs.length === 0) {
      const isThirdParty = configs.some(c => c.authType === 'third_party');
      const message = isThirdParty
        ? '请先完成企业微信授权（扫码安装应用+上传确认函），授权通过后即可使用会话存档'
        : '未配置会话存档Secret和私钥，请在企微配置中设置';
      return res.json({ success: true, data: { authorized: true, enabled: false, message } });
    }

    res.json({ success: true, data: { authorized: true, enabled: true, configCount: archiveConfigs.length, configs: archiveConfigs.map(c => ({ id: c.id, name: c.name, corpId: c.corpId })) } });
  } catch (error: any) {
    log.error('[Wecom] Get chat archive status error:', error);
    res.status(500).json({ success: false, message: '获取会话存档状态失败' });
  }
});

// ==================== 会话记录 ====================

router.get('/chat-records', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, keyword, msgType, fromUserId, roomId, startDate, endDate, isSensitive, page = 1, pageSize = 20 } = req.query;
    const recordRepo = getTenantRepo(WecomChatRecord);
    const queryBuilder = recordRepo.createQueryBuilder('r');
    if (configId) queryBuilder.andWhere('r.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (msgType) queryBuilder.andWhere('r.msg_type = :msgType', { msgType });
    if (fromUserId) queryBuilder.andWhere('r.from_user_id = :fromUserId', { fromUserId });
    if (roomId) queryBuilder.andWhere('r.room_id = :roomId', { roomId });
    if (keyword) queryBuilder.andWhere('r.content LIKE :keyword', { keyword: `%${keyword}%` });
    if (startDate) queryBuilder.andWhere('r.msg_time >= :startTs', { startTs: new Date(startDate as string).getTime() });
    if (endDate) queryBuilder.andWhere('r.msg_time < :endTs', { endTs: new Date(endDate as string).getTime() + 86400000 });
    if (isSensitive === 'true' || isSensitive === '1') queryBuilder.andWhere('r.is_sensitive = :isSensitive', { isSensitive: true });
    if (isSensitive === 'false' || isSensitive === '0') queryBuilder.andWhere('(r.is_sensitive = :notSensitive OR r.is_sensitive IS NULL)', { notSensitive: false });
    const total = await queryBuilder.getCount();
    const records = await queryBuilder.orderBy('r.msg_time', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string)).getMany();
    const list = records.map(r => ({
      ...r,
      toUserIds: safeJsonParse(r.toUserIds, []),
      content: safeJsonParse(r.content, r.content),
      msgTimeFormatted: r.msgTime ? new Date(Number(r.msgTime)).toISOString() : null
    }));
    res.json({ success: true, data: { list, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    log.error('[Wecom] Get chat records error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取会话记录失败' });
  }
});

// ==================== 同步 ====================

router.post('/chat-records/sync', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    // 第三方模式不需要单独的chatArchiveSecret，通过permanent_code获取token
    if (config.authType !== 'third_party' && !config.chatArchiveSecret) {
      return res.status(400).json({ success: false, message: '未配置会话存档Secret' });
    }
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    const result = await WecomChatArchiveService.syncChatRecords(config, true);
    const globalRsaKey = await getGlobalRsaPrivateKey();
    const hasPrivateKey = !!(config.chatArchivePrivateKey || globalRsaKey);

    // 检查公钥是否已设置（使用TenantSettings）
    let pubKeyStatus = 'unknown';
    if (config.authType === 'third_party') {
      try {
        const { TenantSettings } = await import('../../entities/TenantSettings');
        const settingsRepo = AppDataSource.getRepository(TenantSettings);
        const pubKeySetting = await settingsRepo.findOne({
          where: { tenantId: config.tenantId, settingKey: `chat_pubkey_set_${config.id}` }
        });
        if (pubKeySetting) {
          const val = typeof pubKeySetting.settingValue === 'string' ? JSON.parse(pubKeySetting.settingValue) : pubKeySetting.settingValue;
          pubKeyStatus = val?.set === true ? 'set' : 'not_set';
        } else {
          pubKeyStatus = 'not_set';
        }
      } catch { pubKeyStatus = 'unknown'; }
    }

    res.json({
      success: true, message: result.message,
      data: {
        configId: result.configId, configName: result.configName,
        permitUsers: result.permitUsers, agreedUsers: result.agreedUsers,
        syncedRecords: result.syncedRecords, newConversations: result.newConversations,
        enrichedContacts: (result as any).enrichedContacts || 0,
        totalFetched: (result as any).totalFetched || 0,
        metaRecords: (result as any).metaRecords || 0,
        syncMsgStatus: (result as any).syncMsgStatus || 'unknown',
        syncMsgError: (result as any).syncMsgError || '',
        batchDetails: (result as any).batchDetails || '',
        errors: result.errors, sdkRequired: result.sdkRequired, mode: result.mode,
        hasPrivateKey, pubKeyStatus
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Sync chat records error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '同步会话存档失败' });
  }
});

// ==================== 诊断：直接测试sync_msg API ====================

router.post('/chat-records/diagnose', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在' });

    const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
    const { default: axios } = await import('axios');

    // Step1: 获取token
    const token = await WecomTokenService.getAccessToken(config, 'chat');
    const tokenInfo = { len: token.length, prefix: token.substring(0, 10) + '...' };

    // Step2: 查询当前保存的游标
    const { TenantSettings } = await import('../../entities/TenantSettings');
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const cursorSetting = await settingsRepo.findOne({
      where: { tenantId: config.tenantId, settingKey: `wecom_chat_archive_cursor_${config.id}` }
    });
    const savedCursor = cursorSetting?.settingValue ? JSON.parse(cursorSetting.settingValue)?.cursor || '' : '';

    // Step3: 第三方模式通过专区程序测试sync_msg
    let zoneCallResult: any = null;
    let directCallResult: any = null;
    let cursorTestResult: any = null;

    if (config.authType === 'third_party') {
      const { WecomSuiteConfig } = await import('../../entities/WecomSuiteConfig');
      const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
      const suiteConfig = await suiteRepo.findOne({ where: {}, order: { id: 'ASC' } });
      const zoneProgramId = suiteConfig?.zoneProgramId;
      const zoneSyncMsgAbilityId = suiteConfig?.zoneSyncMsgAbilityId || suiteConfig?.zoneAbilityId;
      const zoneGetMsgBodyAbilityId = (suiteConfig as any)?.zoneGetMsgBodyAbilityId || zoneSyncMsgAbilityId;

      if (zoneProgramId && zoneSyncMsgAbilityId) {
        try {
          const requestData = JSON.stringify({
            input: { func: 'sync_msg', func_req: { limit: 5 } }
          });
          const zoneResp = await axios.post(
            `https://qyapi.weixin.qq.com/cgi-bin/chatdata/sync_call_program?access_token=${token}`,
            { program_id: zoneProgramId, ability_id: zoneSyncMsgAbilityId, request_data: requestData }
          );
          const rawData = zoneResp.data;
          let parsedResponseData: any = null;
          if (rawData.errcode === 0 && rawData.response_data) {
            try { parsedResponseData = JSON.parse(rawData.response_data); } catch { parsedResponseData = rawData.response_data; }
          }
          // 解析第一条消息的完整结构（诊断密钥字段）+ 实时RSA解密测试
          let firstMsgStructure: any = null;
          const msgList = parsedResponseData?.msg_list || parsedResponseData?.output?.msg_list;
          if (Array.isArray(msgList) && msgList.length > 0) {
            const m = msgList[0];
            const encKey = m.service_encrypt_info?.encrypted_secret_key || '';
            firstMsgStructure = {
              msgid: m.msgid,
              raw_keys: Object.keys(m).join(','),
              has_service_encrypt_info: !!m.service_encrypt_info,
              service_encrypt_info_keys: m.service_encrypt_info ? Object.keys(m.service_encrypt_info).join(',') : '(无)',
              encrypted_secret_key_len: encKey.length,
              encrypted_secret_key_preview: encKey.slice(0, 40) + (encKey.length > 40 ? '...' : ''),
              sender: m.sender,
              msgtype: m.msgtype,
              send_time: m.send_time,
              rsa_decrypt_test: '未测试'
            };
            // 实时RSA解密测试（使用详细版本，返回每步错误）
            if (encKey) {
              const rsaPrivateKey = suiteConfig?.chatArchiveRsaPrivateKey;
              if (rsaPrivateKey) {
                try {
                  const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
                  const { result: decrypted, errors: rsaErrors } = WecomChatArchiveService.rsaDecryptDetailed(rsaPrivateKey, encKey);
                  if (decrypted) {
                    firstMsgStructure.rsa_decrypt_test = `成功! secretKey长度=${decrypted.length}, 预览=${decrypted.slice(0, 20)}...`;
                  } else {
                    firstMsgStructure.rsa_decrypt_test = '全部失败';
                  }
                  firstMsgStructure.rsa_decrypt_details = rsaErrors;
                } catch (rsaErr: any) {
                  firstMsgStructure.rsa_decrypt_test = `异常: ${rsaErr.message}`;
                }
                // 检测私钥格式细节
                const keyTrimmed = rsaPrivateKey.trim();
                const hasRealNewlines = keyTrimmed.includes('\n');
                const hasLiteralNewlines = keyTrimmed.includes('\\n');
                firstMsgStructure.private_key_format = keyTrimmed.startsWith('-----BEGIN') ? keyTrimmed.split(/[\r\n]/)[0] : '裸密钥体(无PEM头)';
                firstMsgStructure.private_key_len = keyTrimmed.length;
                firstMsgStructure.private_key_has_real_newlines = hasRealNewlines;
                firstMsgStructure.private_key_has_literal_backslash_n = hasLiteralNewlines;
                firstMsgStructure.private_key_first80 = keyTrimmed.slice(0, 80);
              } else {
                firstMsgStructure.rsa_decrypt_test = '无RSA私钥配置';
              }
            }
          }
          zoneCallResult = {
            platform_errcode: rawData.errcode,
            platform_errmsg: rawData.errmsg,
            response_data_len: rawData.response_data?.length || 0,
            parsed: parsedResponseData ? {
              errcode: parsedResponseData.errcode ?? parsedResponseData.output?.errcode,
              errmsg: parsedResponseData.errmsg ?? parsedResponseData.output?.errmsg,
              msg_list_count: (parsedResponseData.msg_list || parsedResponseData.output?.msg_list)?.length ?? 'null',
              has_more: parsedResponseData.has_more ?? parsedResponseData.output?.has_more,
              keys: Object.keys(parsedResponseData).join(','),
              first_100_chars: JSON.stringify(parsedResponseData).substring(0, 200)
            } : null,
            firstMsgStructure,
            ability_id_used: zoneSyncMsgAbilityId,
            get_msg_body_ability: zoneGetMsgBodyAbilityId
          };
        } catch (e: any) {
          zoneCallResult = { error: e.message, response: e.response?.data };
        }
      } else {
        zoneCallResult = { error: '未配置专区程序ID或能力ID', zoneProgramId, zoneSyncMsgAbilityId };
      }

      // ★ 额外测试：用保存的游标调用，检查是否能获取到最新消息
      let cursorTestResult: any = null;
      if (savedCursor && zoneProgramId && zoneSyncMsgAbilityId) {
        try {
          const cursorReqData = JSON.stringify({
            input: { func: 'sync_msg', func_req: { limit: 10, cursor: savedCursor } }
          });
          const cursorResp = await axios.post(
            `https://qyapi.weixin.qq.com/cgi-bin/chatdata/sync_call_program?access_token=${token}`,
            { program_id: zoneProgramId, ability_id: zoneSyncMsgAbilityId, request_data: cursorReqData }
          );
          const cursorRawData = cursorResp.data;
          if (cursorRawData.errcode === 0 && cursorRawData.response_data) {
            const parsed = JSON.parse(cursorRawData.response_data);
            const cMsgList = parsed?.msg_list || parsed?.output?.msg_list || [];
            cursorTestResult = {
              msg_count: cMsgList.length,
              has_more: parsed?.has_more ?? parsed?.output?.has_more,
              next_cursor: parsed?.next_cursor || parsed?.output?.next_cursor || '',
              first_msg_time: cMsgList[0]?.send_time ? new Date(cMsgList[0].send_time * 1000).toISOString() : null,
              last_msg_time: cMsgList.length > 0 ? new Date((cMsgList[cMsgList.length - 1]?.send_time || 0) * 1000).toISOString() : null,
              note: cMsgList.length === 0 ? '游标位置已是最新,无更多消息(这可能是新消息尚未入库延迟)' : `从游标位置可获取${cMsgList.length}条消息`
            };
          } else {
            cursorTestResult = { error: `errcode=${cursorRawData.errcode}: ${cursorRawData.errmsg}` };
          }
        } catch (e: any) {
          cursorTestResult = { error: e.message };
        }
      }

      // 直接调用（预期返回48002）
      try {
        const r = await axios.post(
          `https://qyapi.weixin.qq.com/cgi-bin/chatdata/sync_msg?access_token=${token}`,
          { limit: 5 }
        );
        directCallResult = { errcode: r.data.errcode, errmsg: r.data.errmsg, note: '第三方应用直接调用预期返回48002' };
      } catch (e: any) { directCallResult = { error: e.message }; }
    } else {
      // 自建模式直接调用
      try {
        const rawResponse = await axios.post(
          `https://qyapi.weixin.qq.com/cgi-bin/chatdata/sync_msg?access_token=${token}`,
          { limit: 10 }
        );
        directCallResult = {
          errcode: rawResponse.data.errcode,
          errmsg: rawResponse.data.errmsg,
          msg_list_count: rawResponse.data.msg_list?.length ?? null,
          has_more: rawResponse.data.has_more,
          first_msg: rawResponse.data.msg_list?.[0] ? {
            sender: rawResponse.data.msg_list[0].sender,
            send_time: rawResponse.data.msg_list[0].send_time,
            msgtype: rawResponse.data.msg_list[0].msgtype
          } : null
        };
      } catch (e: any) { directCallResult = { error: e.message }; }
    }

    // Step4: 检查DB中已有的记录数
    const dbCount = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type != 'meta'`, [configId]
    );
    const metaCount = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type = 'meta'`, [configId]
    );
    // ★ 正确统计 secretKey：排除空值 "secretKey":""
    const withKeyCount = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type != 'meta' AND content LIKE '%"secretKey":"%' AND content NOT LIKE '%"secretKey":""%'`, [configId]
    );
    const emptyKeyCount = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type != 'meta' AND content LIKE '%"secretKey":""%'`, [configId]
    );

    // 采样一条实际记录的 content 字段，方便诊断
    let sampleContent: any = null;
    try {
      const sampleRows = await AppDataSource.query(
        `SELECT msg_id, content, from_user_id, to_user_ids FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type != 'meta' ORDER BY msg_time DESC LIMIT 1`, [configId]
      );
      if (sampleRows?.[0]) {
        const row = sampleRows[0];
        sampleContent = {
          msg_id: row.msg_id,
          from_user_id: row.from_user_id,
          to_user_ids: row.to_user_ids,
          content_raw: (row.content || '').slice(0, 300),
          content_parsed: null
        };
        try {
          const parsed = JSON.parse(row.content);
          sampleContent.content_parsed = {
            hasSecretKey: 'secretKey' in parsed,
            secretKeyLength: (parsed.secretKey || '').length,
            secretKeyPreview: (parsed.secretKey || '').slice(0, 20) + (parsed.secretKey?.length > 20 ? '...' : ''),
            msgtype: parsed.msgtype,
            msgid: parsed.msgid
          };
        } catch { /* not JSON */ }
      }
    } catch { /* ignore */ }

    // 头像诊断
    let avatarDiag: any = {};
    try {
      const tid = config.tenantId || '';
      const staffAvatarCount = await AppDataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN wecom_avatar IS NOT NULL AND wecom_avatar != '' THEN 1 ELSE 0 END) as hasAvatar FROM wecom_user_bindings WHERE tenant_id = ?`,
        [tid]
      );
      const custAvatarCount = await AppDataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN avatar IS NOT NULL AND avatar != '' THEN 1 ELSE 0 END) as hasAvatar FROM wecom_customers WHERE wecom_config_id = ? AND tenant_id = ?`,
        [configId, tid]
      );
      const sampleCust = await AppDataSource.query(
        `SELECT external_user_id, name, avatar FROM wecom_customers WHERE wecom_config_id = ? AND tenant_id = ? ORDER BY id DESC LIMIT 3`,
        [configId, tid]
      );
      const sampleStaff = await AppDataSource.query(
        `SELECT wecom_user_id, wecom_user_name, wecom_avatar FROM wecom_user_bindings WHERE tenant_id = ? ORDER BY id DESC LIMIT 3`,
        [tid]
      );
      avatarDiag = {
        staff_total: parseInt(staffAvatarCount[0]?.total) || 0,
        staff_with_avatar: parseInt(staffAvatarCount[0]?.hasAvatar) || 0,
        customer_total: parseInt(custAvatarCount[0]?.total) || 0,
        customer_with_avatar: parseInt(custAvatarCount[0]?.hasAvatar) || 0,
        sample_customers: sampleCust.map((c: any) => ({ id: c.external_user_id?.substring(0, 16), name: c.name, avatar: c.avatar ? c.avatar.substring(0, 50) + '...' : '(空)' })),
        sample_staff: sampleStaff.map((s: any) => ({ id: s.wecom_user_id, name: s.wecom_user_name, avatar: s.wecom_avatar ? s.wecom_avatar.substring(0, 50) + '...' : '(空)' })),
      };
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: {
        config: { id: config.id, corpId: config.corpId, authType: config.authType, hasChatSecret: !!config.chatArchiveSecret },
        token: tokenInfo,
        savedCursor: savedCursor || '(无，将从头拉取)',
        dbRecordCount: parseInt(dbCount[0]?.cnt) || 0,
        dbMetaCount: parseInt(metaCount[0]?.cnt) || 0,
        dbWithSecretKey: parseInt(withKeyCount[0]?.cnt) || 0,
        dbEmptySecretKey: parseInt(emptyKeyCount[0]?.cnt) || 0,
        sampleContent,
        avatarDiag,
        zoneCall: zoneCallResult,
        cursorTest: cursorTestResult,
        directCall: directCallResult
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 统计 ====================

router.get('/chat-archive/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(configId as string), isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在' });
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    const stats = await WecomChatArchiveService.getArchiveStats(config, { startDate, endDate });
    const globalRsaKey = await getGlobalRsaPrivateKey();
    const hasSecret = config.authType === 'third_party' ? !!config.permanentCode : !!config.chatArchiveSecret;
    const hasPrivateKey = !!(config.chatArchivePrivateKey || globalRsaKey);
    res.json({ success: true, data: { ...stats, hasSecret, hasPrivateKey, mode: 'http_api' } });
  } catch (error: any) {
    log.error('[Wecom] Get chat archive stats error:', error.message);
    res.status(500).json({ success: false, message: '获取统计信息失败' });
  }
});

// ==================== 头像实时测试 ====================
router.post('/chat-archive/test-avatar', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '配置不存在' });

    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const results: any[] = [];

    // 测试1个员工
    const staffRow = await AppDataSource.query(
      `SELECT DISTINCT from_user_id AS uid FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type != 'meta' AND from_user_id NOT LIKE 'wm%' AND from_user_id NOT LIKE 'wo%' LIMIT 1`,
      [configId]
    );
    if (staffRow[0]?.uid) {
      try {
        const token = await WecomApiService.getAccessTokenByConfigId(configId, 'chat');
        const detail = await WecomApiService.getUserDetail(token, staffRow[0].uid);
        results.push({ type: 'staff', userId: staffRow[0].uid, name: detail?.name || '(null)', avatar: detail?.avatar || '(空)', thumb_avatar: detail?.thumb_avatar || '(空)', errcode: detail ? 0 : 'null_response' });
      } catch (e: any) {
        results.push({ type: 'staff', userId: staffRow[0].uid, error: e.message });
      }
    }

    // 测试1个客户
    const custRow = await AppDataSource.query(
      `SELECT DISTINCT from_user_id AS uid FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type != 'meta' AND (from_user_id LIKE 'wm%' OR from_user_id LIKE 'wo%') LIMIT 1`,
      [configId]
    );
    if (custRow[0]?.uid) {
      try {
        const extToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
        const detail = await WecomApiService.getExternalContactDetail(extToken, custRow[0].uid);
        const ext = detail?.external_contact;
        results.push({ type: 'customer', userId: custRow[0].uid.substring(0, 20), name: ext?.name || '(null)', avatar: ext?.avatar || '(空)', gender: ext?.gender, type_val: ext?.type });
      } catch (e: any) {
        results.push({ type: 'customer', userId: custRow[0].uid.substring(0, 20), error: e.message });
      }
    }

    // DB统计
    const dbStats = await AppDataSource.query(
      `SELECT (SELECT COUNT(*) FROM wecom_user_bindings WHERE tenant_id = ? AND wecom_avatar IS NOT NULL AND wecom_avatar != '') as staff_avatar,
              (SELECT COUNT(*) FROM wecom_user_bindings WHERE tenant_id = ?) as staff_total,
              (SELECT COUNT(*) FROM wecom_customers WHERE tenant_id = ? AND avatar IS NOT NULL AND avatar != '') as cust_avatar,
              (SELECT COUNT(*) FROM wecom_customers WHERE tenant_id = ?) as cust_total`,
      [tenantId, tenantId, tenantId, tenantId]
    );

    res.json({ success: true, data: { api_test: results, db: dbStats[0] || {} } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 会话列表与消息 ====================

router.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, userId, keyword, page, pageSize } = req.query;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    const result = await WecomChatArchiveService.getConversationList({
      tenantId, configId: configId ? parseInt(configId as string) : undefined,
      userId: userId as string, keyword: keyword as string,
      page: page ? parseInt(page as string) : 1, pageSize: pageSize ? parseInt(pageSize as string) : 50
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Wecom] 获取会话列表失败:', error.message);
    res.status(500).json({ success: false, message: '获取会话列表失败' });
  }
});

router.get('/conversations/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, fromUserId, toUserId, roomId, page, pageSize } = req.query;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    if (!fromUserId || !toUserId) return res.status(400).json({ success: false, message: '请指定发送方和接收方' });
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    const result = await WecomChatArchiveService.getConversationMessages({
      tenantId, configId: configId ? parseInt(configId as string) : undefined,
      fromUserId: fromUserId as string, toUserId: toUserId as string,
      roomId: roomId as string, page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 50
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Wecom] 获取会话消息失败:', error.message);
    res.status(500).json({ success: false, message: '获取会话消息失败' });
  }
});

/**
 * 获取消息密钥列表（供会话展示组件使用）
 * GET /api/v1/wecom/conversations/message-keys
 * 复用 getConversationMessages 的查询逻辑，返回 msgid + secretKey
 */
router.get('/conversations/message-keys', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, fromUserId, toUserId, roomId, pageSize = '200' } = req.query;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();

    const ps = Math.min(parseInt(pageSize as string) || 200, 500);

    // 构建与 getConversationMessages 完全相同的查询条件
    let where = "WHERE msg_type != 'meta'";
    const queryParams: any[] = [];

    if (tenantId) {
      where += ' AND tenant_id = ?';
      queryParams.push(tenantId);
    }
    if (configId) {
      const cid = parseInt(configId as string);
      if (!isNaN(cid)) {
        where += ' AND wecom_config_id = ?';
        queryParams.push(cid);
      }
    }
    if (roomId) {
      where += ' AND room_id = ?';
      queryParams.push(roomId);
    } else if (fromUserId && toUserId) {
      where += ' AND ((from_user_id = ? AND to_user_ids LIKE ?) OR (from_user_id = ? AND to_user_ids LIKE ?))';
      queryParams.push(fromUserId, `%${toUserId}%`, toUserId, `%${fromUserId}%`);
    } else if (fromUserId) {
      where += ' AND (from_user_id = ? OR to_user_ids LIKE ?)';
      queryParams.push(fromUserId, `%${fromUserId}%`);
    }

    const records = await AppDataSource.query(
      `SELECT msg_id, content, msg_time, from_user_id, from_user_name, msg_type, sender_type
       FROM wecom_chat_records ${where}
       ORDER BY msg_time ASC
       LIMIT ?`,
      [...queryParams, ps]
    );

    // 收集所有 from_user_id 用于批量查头像
    const staffIds = new Set<string>();
    const externalIds = new Set<string>();
    for (const r of records) {
      const fid = r.from_user_id || '';
      if (fid.startsWith('wm') || fid.startsWith('wo')) {
        externalIds.add(fid);
      } else if (fid) {
        staffIds.add(fid);
      }
    }

    // 批量查员工头像 (wecom_user_bindings)
    const avatarMap: Record<string, string> = {};
    if (staffIds.size > 0) {
      const placeholders = [...staffIds].map(() => '?').join(',');
      const staffRows = await AppDataSource.query(
        `SELECT wecom_user_id, wecom_avatar, wecom_user_name
         FROM wecom_user_bindings
         WHERE wecom_user_id IN (${placeholders}) AND tenant_id = ?
         LIMIT ${staffIds.size}`,
        [...staffIds, tenantId]
      );
      for (const s of staffRows) {
        if (s.wecom_avatar) avatarMap[s.wecom_user_id] = s.wecom_avatar;
        if (s.wecom_user_name) avatarMap[`name:${s.wecom_user_id}`] = s.wecom_user_name;
      }
    }

    // 批量查客户头像 (wecom_customers)
    if (externalIds.size > 0) {
      const placeholders = [...externalIds].map(() => '?').join(',');
      const custRows = await AppDataSource.query(
        `SELECT external_user_id, avatar, name, remark
         FROM wecom_customers
         WHERE external_user_id IN (${placeholders}) AND tenant_id = ?
         LIMIT ${externalIds.size}`,
        [...externalIds, tenantId]
      );
      for (const c of custRows) {
        if (c.avatar) avatarMap[c.external_user_id] = c.avatar;
        if (!avatarMap[`name:${c.external_user_id}`]) {
          avatarMap[`name:${c.external_user_id}`] = c.remark || c.name || '';
        }
      }
    }

    const list: Array<any> = [];
    for (const r of records) {
      try {
        const content = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
        const sk = content?.secretKey;
        if (sk && r.msg_id) {
          const fid = r.from_user_id || '';
          const isSelf = !fid.startsWith('wm') && !fid.startsWith('wo');
          const displayName = avatarMap[`name:${fid}`] || r.from_user_name || fid;
          list.push({
            msgid: r.msg_id,
            secretKey: sk,
            msgTime: r.msg_time,
            fromUserId: fid,
            fromUserName: displayName,
            msgType: r.msg_type || content?.msgtype || '',
            isSelf,
            avatar: avatarMap[fid] || '',
          });
        }
      } catch { /* skip */ }
    }

    const avatarCount = Object.keys(avatarMap).filter(k => !k.startsWith('name:')).length;
    const nameCount = Object.keys(avatarMap).filter(k => k.startsWith('name:')).length;
    const withAvatar = list.filter(m => m.avatar).length;
    const withName = list.filter(m => m.fromUserName && m.fromUserName !== m.fromUserId).length;
    const withTime = list.filter(m => m.msgTime).length;
    log.info(`[Wecom] message-keys: ${records.length}条, 有效=${list.length}条, 有名称=${withName}条(nameMap=${nameCount}), 有时间=${withTime}条, 有头像=${withAvatar}条`);
    if (list.length > 0) {
      const s = list[0];
      log.info(`[Wecom] message-keys sample[0]: fid=${s.fromUserId}, name="${s.fromUserName}", time=${s.msgTime}, type=${s.msgType}`);
    }

    res.json({
      success: true,
      data: { list, total: list.length }
    });
  } catch (error: any) {
    log.error('[Wecom] 获取消息密钥列表失败:', error.message);
    res.status(500).json({ success: false, message: '获取消息密钥列表失败' });
  }
});

// ==================== 质检 ====================

router.put('/chat-records/:id/audit', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const recordId = parseInt(req.params.id);
    const { isSensitive, auditRemark } = req.body;
    const recordRepo = getTenantRepo(WecomChatRecord);
    const record = await recordRepo.findOne({ where: { id: recordId } });
    if (!record) return res.status(404).json({ success: false, message: '会话记录不存在' });
    const currentUser = (req as any).currentUser;
    if (isSensitive !== undefined) record.isSensitive = isSensitive;
    if (auditRemark !== undefined) record.auditRemark = auditRemark;
    record.auditBy = currentUser?.name || 'admin';
    record.auditTime = new Date();
    await recordRepo.save(record);
    res.json({ success: true, message: '质检标记成功' });
  } catch (error: any) {
    log.error('[Wecom] Audit chat record error:', error);
    res.status(500).json({ success: false, message: '质检标记失败' });
  }
});

// ==================== 客户标签 ====================

router.get('/tags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const accessToken = await WecomApiService.getAccessTokenByConfigId(parseInt(configId as string), 'external');
    const tagGroups = await WecomApiService.getCorpTagList(accessToken);
    res.json({ success: true, data: tagGroups });
  } catch (error: any) {
    log.error('[Wecom] Get tags error:', error.message);
    res.status(500).json({ success: false, message: error.message || '获取标签失败' });
  }
});

router.post('/tags/sync-to-customers', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
    const tagGroups = await WecomApiService.getCorpTagList(accessToken);
    const tagMap: Record<string, string> = {};
    for (const group of tagGroups) {
      for (const tag of (group.tag || [])) { tagMap[tag.id] = tag.name; }
    }
    const customerRepo = getTenantRepo(WecomCustomer);
    const customers = await customerRepo.find({ where: { wecomConfigId: configId } });
    let updateCount = 0;
    for (const customer of customers) {
      if (!customer.tagIds) continue;
      try {
        const ids = JSON.parse(customer.tagIds);
        if (!Array.isArray(ids)) continue;
        const tagNames = ids.map((id: string) => tagMap[id] || id).filter(Boolean);
        const newTagNamesStr = JSON.stringify(tagNames);
        if (customer.tagNames !== newTagNamesStr) {
          customer.tagNames = newTagNamesStr;
          await customerRepo.save(customer);
          updateCount++;
        }
      } catch (_e) { /* skip */ }
    }
    res.json({ success: true, message: `标签同步完成，已更新 ${updateCount} 个客户`, data: { tagGroupCount: tagGroups.length, tagCount: Object.keys(tagMap).length, updateCount } });
  } catch (error: any) {
    log.error('[Wecom] Sync tags error:', error.message);
    res.status(500).json({ success: false, message: error.message || '同步标签失败' });
  }
});

// ==================== 全文搜索 ====================

router.get('/chat-records/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, keyword, fromUserId, msgType, startDate, endDate, page = 1, pageSize = 50 } = req.query;
    if (!keyword) return res.status(400).json({ success: false, message: '请输入搜索关键词' });
    const recordRepo = getTenantRepo(WecomChatRecord);
    const qb = recordRepo.createQueryBuilder('r');
    qb.andWhere('r.content LIKE :keyword', { keyword: `%${keyword}%` });
    if (configId) qb.andWhere('r.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (fromUserId) qb.andWhere('r.from_user_id = :fromUserId', { fromUserId });
    if (msgType) qb.andWhere('r.msg_type = :msgType', { msgType });
    if (startDate) qb.andWhere('r.msg_time >= :startTs', { startTs: new Date(startDate as string).getTime() });
    if (endDate) qb.andWhere('r.msg_time < :endTs', { endTs: new Date(endDate as string).getTime() + 86400000 });
    const total = await qb.getCount();
    const records = await qb.orderBy('r.msg_time', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string)).getMany();
    const kw = keyword as string;
    const list = records.map(r => {
      let contentPreview = '';
      try { const parsed = JSON.parse(r.content || '{}'); contentPreview = parsed.text || parsed.content || r.content || ''; }
      catch { contentPreview = r.content || ''; }
      const idx = contentPreview.indexOf(kw);
      if (idx >= 0) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(contentPreview.length, idx + kw.length + 50);
        contentPreview = (start > 0 ? '...' : '') + contentPreview.slice(start, end) + (end < contentPreview.length ? '...' : '');
      }
      return { id: r.id, msgId: r.msgId, msgType: r.msgType, fromUserId: r.fromUserId, fromUserName: r.fromUserName, roomId: r.roomId, msgTime: r.msgTime, msgTimeFormatted: r.msgTime ? new Date(Number(r.msgTime)).toISOString() : null, contentPreview, highlight: kw, isSensitive: r.isSensitive };
    });
    res.json({ success: true, data: { list, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    log.error('[Wecom] Search chat records error:', error.message);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

// ==================== VAS增值服务 ====================

router.get('/chat-archive/vas-pricing', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query("SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1").catch(() => []);
    const defaultConfig = { enabled: true, defaultPrice: 100, minPrice: 50, billingUnit: 'per_user_year', trialDays: 7, tierPricing: [{ min: 1, max: 10, price: 100 }, { min: 11, max: 50, price: 90 }, { min: 51, max: 100, price: 80 }, { min: 101, max: 999999, price: 70 }], description: '企微会话存档增值服务', wecomFeeNote: '企业微信会话存档接口为企微官方收费功能，需在企微管理后台自行开通。' };
    let config = defaultConfig;
    if (rows.length > 0) { try { const parsed = JSON.parse(rows[0].config_value); config = { ...defaultConfig, ...parsed.chatArchive }; } catch {} }
    res.json({ success: true, data: config });
  } catch (error: any) {
    log.error('[Wecom] Get VAS pricing error:', error.message);
    res.status(500).json({ success: false, message: '获取定价失败' });
  }
});

router.post('/chat-archive/purchase', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userCount, payType } = req.body;
    const currentUser = (req as any).currentUser;
    if (!userCount || userCount < 1) return res.status(400).json({ success: false, message: '请选择开通人数' });
    if (!payType || !['wechat', 'alipay', 'bank'].includes(payType)) return res.status(400).json({ success: false, message: '请选择支付方式' });
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    let tenantName = '';
    if (tenantId) { const tRows = await AppDataSource.query('SELECT name FROM tenants WHERE id = ?', [tenantId]); tenantName = tRows[0]?.name || ''; }
    const vasRows = await AppDataSource.query("SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1").catch(() => []);
    let tierPricing = [{ min: 1, max: 10, price: 100 }, { min: 11, max: 50, price: 90 }, { min: 51, max: 100, price: 80 }, { min: 101, max: 999999, price: 70 }];
    if (vasRows.length > 0) { try { const parsed = JSON.parse(vasRows[0].config_value); if (parsed.chatArchive?.tierPricing) tierPricing = parsed.chatArchive.tierPricing; } catch {} }
    let unitPrice = 100;
    for (const tier of tierPricing) { if (userCount >= tier.min && userCount <= tier.max) { unitPrice = tier.price; break; } }
    const totalAmount = userCount * unitPrice;
    const now = new Date();
    const dateStr = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
    const orderNo = `VAS${dateStr}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const orderId = uuidv4();
    let qrCode = '';
    let payUrl = '';
    try {
      const { paymentService } = await import('../../services/PaymentService');
      const payResult = await paymentService.createOrder({ packageId: 'vas_chat_archive', packageName: `会话存档增值服务 ${userCount}人/年`, amount: totalAmount, payType: payType as 'wechat' | 'alipay' | 'bank', tenantId: tenantId || undefined, tenantName, contactName: currentUser?.name || '', contactPhone: '', billingCycle: 'yearly' });
      if (payResult.success) { qrCode = payResult.qrCode || ''; payUrl = payResult.payUrl || ''; }
    } catch (payErr: any) {
      log.warn('[Wecom VAS] 支付服务调用失败:', payErr.message);
      qrCode = '';
      payUrl = '';
    }
    await AppDataSource.query(
      `INSERT INTO payment_orders (id, order_no, customer_type, tenant_id, tenant_name, package_id, package_name, amount, pay_type, status, qr_code, pay_url, contact_name, expire_time, remark, created_at, updated_at) VALUES (?, ?, 'tenant', ?, ?, 'vas_chat_archive', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orderId, orderNo, tenantId, tenantName, `会话存档增值服务 ${userCount}人/年`, totalAmount, payType, qrCode, payUrl, currentUser?.name || '', new Date(Date.now() + 30 * 60 * 1000), `企微会话存档VAS - ${userCount}人/年`]
    );
    res.json({ success: true, data: { orderId, orderNo, amount: totalAmount, userCount, unitPrice, qrCode, payUrl, payType, packageName: `会话存档增值服务 ${userCount}人/年` } });
  } catch (error: any) {
    log.error('[Wecom VAS] 创建订单失败:', error.message, error.stack);
    res.status(500).json({ success: false, message: '创建订单失败' });
  }
});

router.get('/chat-archive/order/:orderNo', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const rows = await AppDataSource.query(`SELECT id, order_no, amount, status, pay_type, paid_at, package_name FROM payment_orders WHERE order_no = ? AND tenant_id = ? LIMIT 1`, [orderNo, tenantId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '订单不存在' });
    const order = rows[0];

    // 🔑 兜底：订单仍为 pending 时，主动向支付渠道查询真实状态
    if (order.status === 'pending') {
      try {
        const { paymentService } = await import('../../services/PaymentService');
        if (order.pay_type === 'wechat') {
          const { wechatPayService } = await import('../../services/WechatPayService');
          const wxResult = await wechatPayService.queryOrder(orderNo);
          if (wxResult.success && wxResult.data?.trade_state === 'SUCCESS') {
            log.info(`[Wecom VAS] 主动查询发现微信订单 ${orderNo} 已支付，执行补偿更新`);
            await paymentService.updateOrderStatus(orderNo, 'paid', { tradeNo: wxResult.data.transaction_id, paidAt: new Date() });
            order.status = 'paid';
          }
        } else if (order.pay_type === 'alipay') {
          const { alipayService } = await import('../../services/AlipayService');
          const aliResult = await alipayService.queryOrder(orderNo);
          if (aliResult.success && (aliResult.data?.trade_status === 'TRADE_SUCCESS' || aliResult.data?.trade_status === 'TRADE_FINISHED')) {
            log.info(`[Wecom VAS] 主动查询发现支付宝订单 ${orderNo} 已支付，执行补偿更新`);
            await paymentService.updateOrderStatus(orderNo, 'paid', { tradeNo: aliResult.data.trade_no, paidAt: new Date() });
            order.status = 'paid';
          }
        }
      } catch (checkErr: any) {
        log.warn('[Wecom VAS] 主动查询支付状态失败（不影响正常流程）:', checkErr.message?.substring(0, 100));
      }
    }

    if (order.status === 'paid') {
      await AppDataSource.query('UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]).catch(() => {});
      await AppDataSource.query("UPDATE wecom_archive_settings SET status = 'active', expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE tenant_id = ?", [tenantId]).catch(() => {});
    }
    res.json({ success: true, data: { orderNo: order.order_no, status: order.status, amount: order.amount, payType: order.pay_type, paidAt: order.paid_at, packageName: order.package_name } });
  } catch (error: any) {
    log.error('[Wecom VAS] 查询订单状态失败', error.message);
    res.status(500).json({ success: false, message: '查询订单状态失败' });
  }
});

router.post('/chat-archive/simulate-pay/:orderNo', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: '生产环境不可使用模拟支付' });
    }
    const { orderNo } = req.params;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const rows = await AppDataSource.query(`SELECT id, status FROM payment_orders WHERE order_no = ? AND tenant_id = ? LIMIT 1`, [orderNo, tenantId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '订单不存在' });
    if (rows[0].status === 'paid') return res.json({ success: true, message: '订单已支付' });
    await AppDataSource.query(`UPDATE payment_orders SET status = 'paid', paid_at = NOW(), trade_no = ? WHERE order_no = ?`, [`SIM${Date.now()}`, orderNo]);
    await AppDataSource.query('UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]).catch(() => {});
    await AppDataSource.query("UPDATE wecom_archive_settings SET status = 'active', expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE tenant_id = ?", [tenantId]).catch(() => {});
    res.json({ success: true, message: '模拟支付成功，会话存档已激活' });
  } catch (error: any) {
    log.error('[Wecom VAS] 模拟支付失败:', error.message);
    res.status(500).json({ success: false, message: '模拟支付失败' });
  }
});

// ==================== 风险审计标记 ====================

import { WecomChatAuditMark } from '../../entities/WecomChatAuditMark';

router.get('/chat-archive/audit-marks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, riskType, status, operatorName, page = '1', pageSize = '20' } = req.query;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomChatAuditMark);
    const qb = repo.createQueryBuilder('m');
    if (tenantId) qb.andWhere('m.tenant_id = :tenantId', { tenantId });
    if (configId) qb.andWhere('m.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (riskType) qb.andWhere('m.risk_type = :riskType', { riskType });
    if (status) qb.andWhere('m.status = :status', { status });
    if (operatorName) qb.andWhere('m.operator_name LIKE :on', { on: `%${operatorName}%` });

    const total = await qb.getCount();
    const p = parseInt(page as string) || 1;
    const ps = parseInt(pageSize as string) || 20;
    const list = await qb.orderBy('m.created_at', 'DESC').skip((p - 1) * ps).take(ps).getMany();

    res.json({ success: true, data: { list, total, page: p, pageSize: ps } });
  } catch (error: any) {
    log.error('[Wecom] Get audit marks error:', error.message);
    res.status(500).json({ success: false, message: '获取审计记录失败' });
  }
});

router.post('/chat-archive/audit-marks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const user = (req as any).user || (req as any).currentUser;
    const { wecomConfigId, chatRecordId, fromUserId, toUserId, msgContent, msgType, msgTime, riskType, riskLevel, remark } = req.body;

    if (!wecomConfigId || !riskType) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const repo = AppDataSource.getRepository(WecomChatAuditMark);
    const mark = repo.create({
      tenantId, wecomConfigId, chatRecordId, fromUserId, toUserId,
      msgContent, msgType, msgTime,
      riskType, riskLevel: riskLevel || 'medium', remark: remark || '',
      status: 'pending',
      operatorId: user?.userId || String(user?.id || ''),
      operatorName: user?.name || user?.username || '审计员',
    });
    await repo.save(mark);
    res.json({ success: true, data: mark, message: '风险标记已创建' });
  } catch (error: any) {
    log.error('[Wecom] Create audit mark error:', error.message, error.stack);
    log.error('[Wecom] Create audit mark body:', JSON.stringify(req.body));
    res.status(500).json({ success: false, message: `创建风险标记失败: ${error.message}` });
  }
});

router.put('/chat-archive/audit-marks/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(WecomChatAuditMark);
    const mark = await repo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!mark) return res.status(404).json({ success: false, message: '审计记录不存在' });

    const user = (req as any).user || (req as any).currentUser;
    const { status, resolveRemark } = req.body;

    if (status) {
      mark.status = status;
      if (status === 'resolved' || status === 'dismissed') {
        mark.resolverId = user?.userId || String(user?.id || '');
        mark.resolverName = user?.name || user?.username || '';
        mark.resolveRemark = resolveRemark || '';
        mark.resolvedAt = new Date();
      }
    }
    if (req.body.remark !== undefined) mark.remark = req.body.remark;
    if (req.body.riskLevel !== undefined) mark.riskLevel = req.body.riskLevel;

    await repo.save(mark);
    res.json({ success: true, data: mark, message: '审计记录已更新' });
  } catch (error: any) {
    log.error('[Wecom] Update audit mark error:', error.message);
    res.status(500).json({ success: false, message: '更新审计记录失败' });
  }
});

router.get('/chat-archive/audit-marks/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomChatAuditMark);
    const qb = repo.createQueryBuilder('m');
    if (tenantId) qb.andWhere('m.tenant_id = :tenantId', { tenantId });
    if (configId) qb.andWhere('m.wecom_config_id = :configId', { configId: parseInt(configId as string) });

    const total = await qb.getCount();
    const pending = await qb.clone().andWhere('m.status = :s', { s: 'pending' }).getCount();
    const processing = await qb.clone().andWhere('m.status = :s', { s: 'processing' }).getCount();
    const resolved = await qb.clone().andWhere('m.status = :s', { s: 'resolved' }).getCount();

    res.json({ success: true, data: { total, pending, processing, resolved } });
  } catch (error: any) {
    log.error('[Wecom] Get audit stats error:', error.message);
    res.status(500).json({ success: false, message: '获取审计统计失败' });
  }
});

// ==================== 综合搜索 ====================
router.post('/chat-archive/global-search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, keyword, limit = 10 } = req.body;
    if (!keyword || !configId) {
      return res.json({ success: true, data: { members: [], customers: [], groups: [], messages: [] } });
    }
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const kw = `%${keyword}%`;
    const maxResults = Math.min(Number(limit) || 10, 20);

    log.info(`[Wecom] global-search: keyword="${keyword}", configId=${configId}, tenantId=${tenantId}`);

    // 1. 搜索存档成员 (从 archive_members + user_bindings 两个表查)
    const memberRows = await AppDataSource.query(
      `SELECT DISTINCT uid AS wecomUserId, uname AS name FROM (
         SELECT wecom_user_id AS uid, wecom_user_name AS uname
         FROM wecom_archive_members
         WHERE tenant_id = ? AND is_enabled = 1
           AND (wecom_user_name LIKE ? OR wecom_user_id LIKE ?)
         UNION
         SELECT wecom_user_id AS uid, wecom_user_name AS uname
         FROM wecom_user_bindings
         WHERE tenant_id = ?
           AND (wecom_user_name LIKE ? OR wecom_user_id LIKE ?)
       ) AS t
       LIMIT ?`,
      [tenantId, kw, kw, tenantId, kw, kw, maxResults]
    );

    // 2. 搜索客户（外部联系人）
    const customerRows = await AppDataSource.query(
      `SELECT id, external_user_id as externalUserId, name, avatar, remark, corp_name as corpName, follow_user_id as memberId
       FROM wecom_customers
       WHERE wecom_config_id = ? AND tenant_id = ?
         AND (name LIKE ? OR remark LIKE ? OR external_user_id LIKE ? OR corp_name LIKE ?)
       LIMIT ?`,
      [configId, tenantId, kw, kw, kw, kw, maxResults]
    );

    // 3. 搜索群聊（从 chat_records 中找到有 roomId 的记录）
    const groupRows = await AppDataSource.query(
      `SELECT DISTINCT room_id as roomId, from_user_id as memberId
       FROM wecom_chat_records
       WHERE wecom_config_id = ? AND tenant_id = ? AND room_id IS NOT NULL AND room_id != ''
         AND room_id LIKE ?
       LIMIT ?`,
      [configId, tenantId, kw, maxResults]
    );

    // 4. 搜索聊天记录 (按发送人名称/ID搜索，content是加密JSON无法搜明文)
    const msgRows = await AppDataSource.query(
      `SELECT id, from_user_id as fromUserId, from_user_name as fromUserName, content as contentRaw,
              msg_type as msgType, msg_time as msgTime, room_id as roomId, to_user_ids as toUserIds
       FROM wecom_chat_records
       WHERE wecom_config_id = ? AND tenant_id = ? AND msg_type != 'meta'
         AND (from_user_name LIKE ? OR from_user_id LIKE ?)
       ORDER BY msg_time DESC
       LIMIT ?`,
      [configId, tenantId, kw, kw, maxResults]
    );

    // 处理消息结果
    const messages = msgRows.map((row: any) => {
      let contentPreview = '';
      try {
        const parsed = JSON.parse(row.contentRaw);
        contentPreview = (parsed?.text?.content || parsed?.content || row.contentRaw || '').substring(0, 50);
      } catch {
        contentPreview = (row.contentRaw || '').substring(0, 50);
      }
      const toIds = safeJsonParse(row.toUserIds, []);
      const peerId = row.roomId || (Array.isArray(toIds) && toIds.length > 0 ? toIds[0] : '');
      let convType: 'customer' | 'staff' | 'group' = 'staff';
      if (row.roomId) convType = 'group';
      else if (peerId && (peerId.startsWith('wm') || peerId.startsWith('wo'))) convType = 'customer';

      return {
        id: row.id,
        fromUserId: row.fromUserId,
        fromUserName: row.fromUserName,
        contentPreview,
        sendTimeStr: row.msgTime ? new Date(Number(row.msgTime)).toLocaleString('zh-CN') : '',
        memberId: row.fromUserId?.startsWith('wm') || row.fromUserId?.startsWith('wo') ? peerId : row.fromUserId,
        peerId: row.fromUserId?.startsWith('wm') || row.fromUserId?.startsWith('wo') ? row.fromUserId : peerId,
        convType
      };
    });

    log.info(`[Wecom] global-search results: members=${(memberRows||[]).length}, customers=${(customerRows||[]).length}, groups=${(groupRows||[]).length}, messages=${messages.length}`);

    res.json({
      success: true,
      data: {
        members: memberRows || [],
        customers: customerRows || [],
        groups: groupRows.map((g: any) => ({ roomId: g.roomId, roomName: g.roomId, memberId: g.memberId })),
        messages
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Global search error:', error.message, error.stack?.split('\n')[1]);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

export default router;

