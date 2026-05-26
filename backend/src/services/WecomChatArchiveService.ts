/**
 * 企微会话存档服务
 *
 * 功能：
 * 1. 获取已开通会话存档的成员列表
 * 2. 检查会话同意情况
 * 3. 同步会话存档元数据 + HTTP API增强模式（生成会话元数据记录）
 * 4. RSA解密消息内容（需Finance SDK或HTTP API）
 *
 * 两种工作模式：
 * - HTTP API模式（默认）：通过HTTP API获取开通成员、外部联系人、同意状态等
 *   生成会话级元数据记录，使会话列表和聊天Tab可以展示会话关系和基本信息
 * - Finance SDK模式（需部署C++库）：拉取实际消息内容、解密消息体
 */
import * as crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { WecomConfig } from '../entities/WecomConfig';
import { WecomChatRecord } from '../entities/WecomChatRecord';
import { WecomCustomer } from '../entities/WecomCustomer';
import { WecomUserBinding } from '../entities/WecomUserBinding';
import WecomApiService from './WecomApiService';
import { log } from '../config/logger';

// 同步限流：记录每个配置的最后同步时间
const lastArchiveSyncMap: Map<number, number> = new Map();
const ARCHIVE_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5分钟

export interface SyncResult {
  configId: number;
  configName: string;
  permitUsers: number;
  agreedUsers: number;
  syncedRecords: number;
  newConversations: number;
  errors: number;
  message: string;
  sdkRequired: boolean;
  mode: 'http_api' | 'finance_sdk' | 'chatdata_zone';
}

export class WecomChatArchiveService {

  /**
   * 同步会话存档数据（主入口）- HTTP API 增强模式
   * 1. 获取开通成员列表
   * 2. 为每个开通成员获取外部联系人
   * 3. 检查同意状态
   * 4. 生成会话元数据记录（使聊天会话Tab可展示）
   */
  static async syncChatRecords(config: WecomConfig, force = false): Promise<SyncResult> {
    const configId = config.id;
    const result: SyncResult = {
      configId,
      configName: config.name,
      permitUsers: 0,
      agreedUsers: 0,
      syncedRecords: 0,
      newConversations: 0,
      errors: 0,
      message: '',
      sdkRequired: true,
      mode: 'http_api'
    };

    // 限流检查
    if (!force) {
      const lastSync = lastArchiveSyncMap.get(configId);
      if (lastSync && Date.now() - lastSync < ARCHIVE_SYNC_INTERVAL_MS) {
        const remainSec = Math.ceil((ARCHIVE_SYNC_INTERVAL_MS - (Date.now() - lastSync)) / 1000);
        result.message = `限流中，${remainSec}秒后可再次同步`;
        return result;
      }
    }

    // 验证配置：第三方模式通过permanent_code获取token，不需要单独的chatArchiveSecret
    if (config.authType !== 'third_party' && !config.chatArchiveSecret) {
      result.message = '未配置会话存档Secret';
      return result;
    }

    log.info(`[ChatArchive] 开始同步配置 ${config.name}(${configId}) - HTTP API增强模式`);
    lastArchiveSyncMap.set(configId, Date.now());

    try {
      // Step 1: 获取会话存档access_token
      log.info(`[ChatArchive] Step1: 获取会话存档Token, configId=${configId}, authType=${config.authType}`);
      const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'chat');
      log.info(`[ChatArchive] Step1完成: 获取到chatToken`);

      // Step 2: 获取开通成员列表（根据模式选择不同接口）
      let permitUserIds: string[] = [];
      if (config.authType === 'third_party') {
        // 第三方服务商模式：使用数据与智能专区接口
        log.info(`[ChatArchive] Step2: 第三方模式 - 调用专区 getChatDataAuthUserList...`);
        try {
          const authUsers = await WecomApiService.getChatDataAuthUserList(accessToken);
          permitUserIds = authUsers.map(u => u.userid);
          log.info(`[ChatArchive] Step2完成: 专区授权成员: ${permitUserIds.length} 人, IDs: ${permitUserIds.slice(0, 10).join(',')}`);
        } catch (step2Err: any) {
          log.warn(`[ChatArchive] Step2: getChatDataAuthUserList 失败: ${step2Err.message}`);
          // 回退：从本地 wecom_archive_members 表获取已知成员
          try {
            const localMembers = await AppDataSource.query(
              `SELECT wecom_user_id FROM wecom_archive_members WHERE tenant_id = ? AND is_enabled = 1`,
              [config.tenantId || '']
            );
            permitUserIds = localMembers.map((m: any) => m.wecom_user_id).filter(Boolean);
            if (permitUserIds.length > 0) {
              log.info(`[ChatArchive] Step2回退: 从本地获取 ${permitUserIds.length} 个存档成员`);
              result.message += ` ⚠️ 专区成员列表接口失败(${step2Err.message})，使用本地缓存的${permitUserIds.length}个成员继续同步。`;
            }
          } catch { /* ignore */ }
          if (permitUserIds.length === 0) {
            throw step2Err;
          }
        }
      } else {
        // 自建应用模式：使用传统 msgaudit 接口
        log.info(`[ChatArchive] Step2: 自建模式 - 调用 getPermitUserList...`);
        permitUserIds = await WecomApiService.getPermitUserList(accessToken);
        log.info(`[ChatArchive] Step2完成: 配置 ${config.name} 已开通会话存档成员: ${permitUserIds.length} 人, IDs: ${permitUserIds.slice(0, 10).join(',')}`);
      }
      result.permitUsers = permitUserIds.length;
      if (permitUserIds.length === 0) {
        result.message = '没有开通会话存档的成员';
        return result;
      }

      // Step 3: 保存开通成员信息到数据库
      await this.savePermitUsers(config, permitUserIds);

      // Step 4: HTTP API增强 - 获取每个开通成员的外部联系人并生成会话元数据
      // 需要使用 external contact secret 来获取外部联系人
      let externalAccessToken: string | null = null;
      try {
        log.info(`[ChatArchive] Step4: 获取外部联系人Token (external)...`);
        externalAccessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
        log.info(`[ChatArchive] Step4完成: 获取到externalToken`);
      } catch (e: any) {
        log.warn('[ChatArchive] Step4失败: 获取客户联系Token失败，跳过会话元数据生成:', e.message);
        // 第三方模式下，尝试用chat token作为external token（第三方模式token通用）
        if (config.authType === 'third_party') {
          log.info('[ChatArchive] 第三方模式: 尝试使用chatToken作为externalToken');
          externalAccessToken = accessToken;
        }
      }

      // ★ 第三方模式优化：优先拉取实际消息（快速，游标增量），然后轻量补充客户名称
      // 如果消息拉取失败（如48002 API forbidden），回退到元数据模式生成会话列表
      let syncMsgError = '';
      let syncMsgZeroRecords = false;
      if (config.authType === 'third_party') {
        // Step 4.5: 确保已向企微设置RSA公钥（未设置公钥时消息不会被存档）
        try {
          const { WecomSuiteConfig } = await import('../entities/WecomSuiteConfig');
          const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
          const suiteConfig = await suiteRepo.findOne({ where: {}, order: { id: 'ASC' } });
          const rsaPrivateKey = suiteConfig?.chatArchiveRsaPrivateKey;
          const rsaPublicKey = suiteConfig?.chatArchiveRsaPublicKey;

          if (rsaPublicKey) {
            const pubKeySettingKey = `chat_pubkey_set_${config.id}`;
            let alreadySet = false;
            const { TenantSettings } = await import('../entities/TenantSettings');
            const settingsRepo = AppDataSource.getRepository(TenantSettings);

            try {
              const existing = await settingsRepo.findOne({
                where: { tenantId: config.tenantId, settingKey: pubKeySettingKey }
              });
              if (existing && existing.settingValue) {
                try {
                  const val = JSON.parse(existing.settingValue);
                  alreadySet = val?.set === true;
                } catch {
                  alreadySet = existing.settingValue === 'true';
                }
              }
              log.info(`[ChatArchive] Step4.5: 公钥标记查询结果: alreadySet=${alreadySet}, existing=${!!existing}`);
            } catch (queryErr: any) {
              log.warn(`[ChatArchive] Step4.5: 查询公钥标记失败: ${queryErr.message}`);
            }

            if (!alreadySet) {
              log.info(`[ChatArchive] Step4.5: 首次同步，向企微设置RSA公钥...`);
              const pubKeyVer = 1;
              await WecomApiService.setChatDataPublicKey(accessToken, rsaPublicKey, pubKeyVer);

              try {
                const { v4: uuidv4 } = await import('uuid');
                const existing = await settingsRepo.findOne({
                  where: { tenantId: config.tenantId, settingKey: pubKeySettingKey }
                });
                if (existing) {
                  existing.settingValue = JSON.stringify({ set: true, setAt: new Date().toISOString(), configId: config.id });
                  existing.settingType = 'json';
                  await settingsRepo.save(existing);
                  log.info(`[ChatArchive] Step4.5: 更新已有标记记录成功`);
                } else {
                  const newSetting = new TenantSettings();
                  newSetting.id = uuidv4();
                  newSetting.tenantId = config.tenantId;
                  newSetting.settingKey = pubKeySettingKey;
                  newSetting.settingValue = JSON.stringify({ set: true, setAt: new Date().toISOString(), configId: config.id });
                  newSetting.settingType = 'json';
                  await settingsRepo.save(newSetting);
                  log.info(`[ChatArchive] Step4.5: 新建标记记录成功, id=${newSetting.id}`);
                }
              } catch (saveErr: any) {
                log.error(`[ChatArchive] Step4.5: 公钥已上传但标记保存失败！: ${saveErr.message}`, saveErr.stack);
              }
              result.message += ' ✅ 首次设置公钥成功，企微需要约5-10分钟开始存档新消息，之后再同步即可获取聊天记录。';
            } else {
              log.info(`[ChatArchive] Step4.5: 公钥已设置（跳过上传），继续拉取消息...`);
            }
          } else if (!rsaPrivateKey) {
            log.warn('[ChatArchive] Step4.5: 服务商未配置RSA密钥对');
            result.message += ' ⚠️ 平台未配置RSA密钥对，请管理员在后台配置后重试。';
          }
        } catch (e: any) {
          log.warn(`[ChatArchive] Step4.5: 设置公钥出错(非致命): ${e.message}`);
        }

        // Step 5: 拉取实际聊天消息（数据专区API，游标增量，快速）
        let syncMsgFailed = false;
        log.info(`[ChatArchive] Step5: 第三方模式 - 拉取实际聊天消息（游标增量）...`);
        try {
          const msgResult = await this.syncChatMessages(config, accessToken);
          result.syncedRecords += msgResult.savedCount;
          (result as any).totalFetched = msgResult.totalFetched;
          if (msgResult.savedCount > 0) {
            log.info(`[ChatArchive] Step5完成: 拉取 ${msgResult.totalFetched} 条, 新保存 ${msgResult.savedCount} 条`);
          } else if (msgResult.totalFetched > 0) {
            log.info(`[ChatArchive] Step5完成: 拉取 ${msgResult.totalFetched} 条(均已存在), 无新增`);
          } else {
            syncMsgZeroRecords = true;
            log.info(`[ChatArchive] Step5完成: API返回0条消息，将回退到外部联系人元数据模式`);
          }
        } catch (e: any) {
          syncMsgFailed = true;
          syncMsgError = e.message;
          log.error(`[ChatArchive] Step5失败: ${e.message}`, e.stack);
          result.errors++;
        }
        (result as any).syncMsgStatus = syncMsgFailed ? 'error' : (syncMsgZeroRecords ? 'empty' : 'ok');
        (result as any).syncMsgError = syncMsgError;

        // ★ Step 5.5: 回退机制 —— 当 sync_msg 失败或返回0条时，使用外部联系人生成会话元数据
        // 确保用户至少能看到存档成员的客户列表和群聊列表
        if ((syncMsgFailed || syncMsgZeroRecords) && externalAccessToken) {
          log.info(`[ChatArchive] Step5.5: sync_msg ${syncMsgFailed ? '失败' : '返回0条'}，回退到外部联系人元数据模式...`);
          try {
            const convResult = await this.syncConversationMetadata(config, externalAccessToken, accessToken, permitUserIds);
            result.newConversations = convResult.newConversations;
            result.agreedUsers = convResult.agreedCount;
            (result as any).metaRecords = convResult.syncedRecords;
            result.syncedRecords += convResult.syncedRecords;
            log.info(`[ChatArchive] Step5.5完成: newConversations=${convResult.newConversations}, agreedCount=${convResult.agreedCount}, syncedRecords=${convResult.syncedRecords}`);
            if (convResult.newConversations > 0) {
              result.message += ` 通过外部联系人模式新增${convResult.newConversations}条会话记录。`;
            }
          } catch (fallbackErr: any) {
            log.warn(`[ChatArchive] Step5.5: 外部联系人元数据回退也失败: ${fallbackErr.message}`);
          }
        }

        // Step 5.8: 通过专区API获取准确的会话同意状态
        try {
          const agreeCount = await this.syncAgreeStatusViaZone(config, accessToken);
          if (agreeCount > 0) {
            result.agreedUsers = agreeCount;
            log.info(`[ChatArchive] Step5.8完成: 获取到 ${agreeCount} 个客户的同意状态`);
          }
        } catch (e: any) {
          log.debug(`[ChatArchive] Step5.8: 获取同意状态失败(非致命，使用推断): ${e.message}`);
        }

        // Step 6: 轻量补充客户名称和头像（仅处理有消息但名称为空的联系人）
        if (externalAccessToken) {
          log.info(`[ChatArchive] Step6: 轻量补充客户名称和头像...`);
          try {
            const enrichCount = await this.enrichContactNames(config, externalAccessToken);
            (result as any).enrichedContacts = enrichCount;
            if (enrichCount > 0) {
              log.info(`[ChatArchive] Step6完成: 补充了 ${enrichCount} 个联系人名称/头像`);
            }
          } catch (e: any) {
            log.warn(`[ChatArchive] Step6: 补充客户名称出错(非致命): ${e.message}`);
          }
        }

        // Step 6.5: 补充存档成员（内部员工）的头像
        try {
          const memberAvatarCount = await this.enrichMemberAvatars(config, accessToken, permitUserIds);
          if (memberAvatarCount > 0) {
            log.info(`[ChatArchive] Step6.5完成: 补充了 ${memberAvatarCount} 个员工头像`);
          }
        } catch (e: any) {
          log.debug(`[ChatArchive] Step6.5: 补充员工头像出错(非致命): ${e.message}`);
        }
      } else {
        // 自建应用模式：保持原有的会话元数据同步逻辑
        if (externalAccessToken) {
          log.info(`[ChatArchive] Step5: 开始同步会话元数据, permitUsers=${permitUserIds.length}`);
          const convResult = await this.syncConversationMetadata(config, externalAccessToken, accessToken, permitUserIds);
          result.newConversations = convResult.newConversations;
          result.agreedUsers = convResult.agreedCount;
          result.syncedRecords = convResult.syncedRecords;
          log.info(`[ChatArchive] Step5完成: newConversations=${convResult.newConversations}, agreedCount=${convResult.agreedCount}, syncedRecords=${convResult.syncedRecords}`);
        } else {
          log.warn('[ChatArchive] 无externalToken，仅做同意状态抽样检查');
          result.agreedUsers = await this.checkAgreeStatus(accessToken, config, permitUserIds);
        }
      }

      // 组装结果消息
      const parts: string[] = [];
      parts.push(`${permitUserIds.length}个开通成员`);
      if (result.agreedUsers > 0) parts.push(`${result.agreedUsers}个已同意存档`);
      if (result.newConversations > 0) parts.push(`新增${result.newConversations}条会话记录`);
      if (result.syncedRecords > 0) parts.push(`更新${result.syncedRecords}条记录`);

      result.sdkRequired = config.authType !== 'third_party';
      result.mode = config.authType === 'third_party' ? 'chatdata_zone' : 'http_api';
      let baseMsg = config.authType === 'third_party'
        ? `专区模式同步完成：${parts.join('，')}。`
        : `HTTP API同步完成：${parts.join('，')}。实际消息内容拉取需部署Finance SDK。`;

      // 保留 Step5 的警告到 result.message
      if (syncMsgError) {
        baseMsg += ` ⚠️ sync_msg错误：${syncMsgError}`;
      } else if (syncMsgZeroRecords) {
        baseMsg += ' ⚠️ sync_msg返回0条消息（请点击"诊断"按钮查看详细原因）';
      }
      result.message = baseMsg;

      log.info(`[ChatArchive] 配置 ${config.name} 同步完成: ${result.message}`);
      return result;

    } catch (error: any) {
      result.errors++;
      result.message = `同步失败: ${error.message}`;
      log.error(`[ChatArchive] 配置 ${config.name} 同步失败:`, error.message);
      return result;
    }
  }

  /**
   * HTTP API增强：同步会话元数据
   * 遍历开通成员 → 获取外部联系人 → 检查同意状态 → 生成会话元数据记录
   */
  private static async syncConversationMetadata(
    config: WecomConfig,
    externalAccessToken: string,
    chatAccessToken: string,
    permitUserIds: string[]
  ): Promise<{ newConversations: number; agreedCount: number; syncedRecords: number }> {
    let newConversations = 0;
    let agreedCount = 0;
    let syncedRecords = 0;
    const chatRecordRepo = AppDataSource.getRepository(WecomChatRecord);

    // 获取用户姓名映射（从 WecomUserBinding 表）
    const userNameMap = await this.getUserNameMap(config);

    // 限制处理的成员数量（避免API速率限制）
    const maxUsers = Math.min(permitUserIds.length, 20);

    for (let i = 0; i < maxUsers; i++) {
      const userId = permitUserIds[i];
      try {
        // 获取该成员的外部联系人列表
        log.info(`[ChatArchive] 处理成员 ${i+1}/${maxUsers}: ${userId}`);
        const externalUserIds = await WecomApiService.getExternalContactList(externalAccessToken, userId)
          .catch((err) => {
            log.warn(`[ChatArchive] 获取成员 ${userId} 外部联系人失败: ${err.message}`);
            return [] as string[];
          });

        log.info(`[ChatArchive] 成员 ${userId} 外部联系人数量: ${externalUserIds.length}`);
        if (externalUserIds.length === 0) continue;

        // 检查该成员与外部联系人的同意状态（批量，与 limitedExternal 范围一致）
        const limitedExternal = externalUserIds.slice(0, 50);
        const sampleExternal = limitedExternal;
        const checkInfo = sampleExternal.map((extId: string) => ({
          userid: userId,
          exteranalopenid: extId
        }));

        const agreeMap: Map<string, boolean> = new Map();
        try {
          const agreeResult = await WecomApiService.checkSingleAgree(chatAccessToken, checkInfo);
          if (agreeResult.length > 0) {
            for (const item of agreeResult) {
              // 判断同意状态：agree_status 为 "Agree" 或 "Default_Agree" 表示已同意
              // status_change_time > 0 且无 agree_status 字段时也视为已同意（兼容旧版API返回）
              // 只有明确 "Disagree" 才标记为未同意
              const extId = item.exteranalopenid || item.userid_list?.[0] || '';
              if (!extId) continue;

              if (item.agree_status === 'Disagree') {
                agreeMap.set(extId, false);
              } else {
                // Agree / Default_Agree / 无明确状态但有时间戳 → 视为已同意
                agreeMap.set(extId, true);
                agreedCount++;
              }
            }
          } else if (config.authType === 'third_party') {
            // 第三方模式下接口返回空数组，不做默认标记（保持为null=未知）
            log.info(`[ChatArchive] 第三方模式: checkSingleAgree 返回空结果，${sampleExternal.length} 个客户同意状态未知`);
          }
        } catch (e: any) {
          log.warn(`[ChatArchive] 检查成员 ${userId} 同意状态失败:`, e.message);
          // 如果 checkSingleAgree 接口失败（第三方模式可能无权限），
          // 则通过检查是否有实际聊天记录来推断同意状态
          if (config.authType === 'third_party') {
            // 第三方模式下 checkSingleAgree 失败，不做默认标记
            log.info(`[ChatArchive] 第三方模式: checkSingleAgree 不可用，${sampleExternal.length} 个客户同意状态未知`);
          }
        }

        // 为每个外部联系人生成/更新会话元数据记录
        for (const extUserId of limitedExternal) {
          try {
            // 唯一标识：成员ID + 外部联系人ID 作为 msgId
            const metaMsgId = `meta_conv_${userId}_${extUserId}`;

            const existing = await chatRecordRepo.findOne({
              where: { corpId: config.corpId, msgId: metaMsgId }
            });

            if (existing) {
              // 已存在的记录，检查是否需要更新客户名称
              try {
                const existingContent = typeof existing.content === 'string' ? JSON.parse(existing.content) : existing.content;
                if (!existingContent?.customerName || existingContent.customerName === extUserId || existingContent.customerName.startsWith('wm')) {
                  // 名称是ID或以wm开头（企微外部联系人ID格式），需要更新
                  let updatedName = await this.getCustomerName(config, extUserId);
                  if (!updatedName || updatedName === extUserId) {
                    try {
                      const detailResp = await WecomApiService.getExternalContactDetail(externalAccessToken, extUserId);
                      if (detailResp?.external_contact) {
                        const extContact = detailResp.external_contact;
                        const extName = extContact.name || '';
                        const followInfo = (detailResp.follow_user || []).find((f: any) => f.userid === userId);
                        const remark = followInfo?.remark || '';
                        updatedName = remark ? `${remark}(${extName})` : extName || extUserId;
                        // 同时更新客户头像
                        if (extContact.avatar) {
                          try {
                            const customerRepo = AppDataSource.getRepository(WecomCustomer);
                            const existingCustomer = await customerRepo.findOne({ where: { wecomConfigId: config.id, externalUserId: extUserId } });
                            if (existingCustomer && !existingCustomer.avatar) {
                              existingCustomer.avatar = extContact.avatar;
                              await customerRepo.save(existingCustomer);
                            }
                          } catch { /* ignore */ }
                        }
                      }
                    } catch { /* ignore */ }
                  }
                  if (updatedName && updatedName !== extUserId) {
                    existingContent.customerName = updatedName;
                    existing.content = JSON.stringify(existingContent);
                    await chatRecordRepo.save(existing);
                  }
                }
              } catch { /* ignore parse error */ }
              syncedRecords++;
              continue;
            }

            // 获取外部联系人名称（优先本地WecomCustomer表，其次调用API获取）
            let customerName = await this.getCustomerName(config, extUserId);
            let needFetchDetail = !customerName || customerName === extUserId;

            // 即使有名称，也检查是否需要补充头像
            if (!needFetchDetail) {
              try {
                const customerRepo = AppDataSource.getRepository(WecomCustomer);
                const existingCustomer = await customerRepo.findOne({ where: { wecomConfigId: config.id, externalUserId: extUserId } });
                if (existingCustomer && !existingCustomer.avatar) {
                  needFetchDetail = true; // 需要获取详情来补充头像
                }
              } catch { /* ignore */ }
            }

            if (needFetchDetail) {
              // 本地没有名称，尝试从API获取外部联系人详情
              try {
                const detailResp = await WecomApiService.getExternalContactDetail(externalAccessToken, extUserId);
                if (detailResp?.external_contact) {
                  const extContact = detailResp.external_contact;
                  const extName = extContact.name || '';
                  // 查找当前成员对该客户的备注
                  const followInfo = (detailResp.follow_user || []).find((f: any) => f.userid === userId);
                  const remark = followInfo?.remark || '';
                  customerName = remark ? `${remark}(${extName})` : extName || extUserId;
                  // 同时更新本地 WecomCustomer 表
                  try {
                    const customerRepo = AppDataSource.getRepository(WecomCustomer);
                    const existingCustomer = await customerRepo.findOne({ where: { wecomConfigId: config.id, externalUserId: extUserId } });
                    if (existingCustomer) {
                      existingCustomer.name = customerName;
                      if (extContact.avatar) existingCustomer.avatar = extContact.avatar;
                      await customerRepo.save(existingCustomer);
                    } else {
                      await customerRepo.save(customerRepo.create({
                        tenantId: config.tenantId,
                        wecomConfigId: config.id,
                        externalUserId: extUserId,
                        name: customerName,
                        avatar: extContact.avatar || '',
                        type: extContact.type || 1
                      }));
                    }
                  } catch { /* ignore save error */ }
                }
              } catch (detailErr: any) {
                log.warn(`[ChatArchive] 获取外部联系人 ${extUserId} 详情失败: ${detailErr.message}`);
              }
            }
            // 使用 checkSingleAgree API 的实际返回结果
            const isAgreed = agreeMap.has(extUserId) ? !!agreeMap.get(extUserId) : false;

            // 创建会话元数据记录
            const metaRecord = chatRecordRepo.create({
              tenantId: config.tenantId,
              wecomConfigId: config.id,
              corpId: config.corpId,
              msgId: metaMsgId,
              msgType: 'meta',
              action: 'send',
              fromUserId: userId,
              fromUserName: userNameMap.get(userId) || userId,
              toUserIds: JSON.stringify([extUserId]),
              roomId: null,
              msgTime: Date.now(),
              content: JSON.stringify({
                type: 'conversation_meta',
                agreed: isAgreed,
                customerName: customerName || extUserId,
                summary: isAgreed
                  ? '已同意会话存档，消息内容需Finance SDK拉取'
                  : '尚未同意会话存档',
                syncMode: 'http_api',
                syncTime: new Date().toISOString()
              }),
              isSensitive: false
            });

            await chatRecordRepo.save(metaRecord);
            newConversations++;
          } catch (e: any) {
            log.warn(`[ChatArchive] 生成会话元数据 ${userId}->${extUserId} 失败:`, e.message);
          }
        }

        // 简单限速：每5个成员暂停500ms
        if ((i + 1) % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e: any) {
        log.warn(`[ChatArchive] 处理成员 ${userId} 外部联系人失败:`, e.message);
      }
    }

    return { newConversations, agreedCount, syncedRecords };
  }

  /**
   * 获取企微成员UserId → 姓名映射
   */
  private static async getUserNameMap(config: WecomConfig): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    try {
      const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
      const bindings = await bindingRepo.find({
        where: { wecomConfigId: config.id }
      });
      for (const b of bindings) {
        map.set(b.wecomUserId, b.wecomUserName || b.wecomUserId);
      }
    } catch (e: any) {
      log.warn('[ChatArchive] 获取成员姓名映射失败:', e.message);
    }
    return map;
  }

  /**
   * 获取外部联系人名称
   */
  private static async getCustomerName(config: WecomConfig, externalUserId: string): Promise<string | null> {
    try {
      const customerRepo = AppDataSource.getRepository(WecomCustomer);
      const customer = await customerRepo.findOne({
        where: { wecomConfigId: config.id, externalUserId }
      });
      return customer?.name || null;
    } catch {
      return null;
    }
  }

  /**
   * 保存开通会话存档的成员信息（同时更新 archive_settings 和 archive_members 表）
   */
  private static async savePermitUsers(config: WecomConfig, userIds: string[]): Promise<void> {
    const tenantId = config.tenantId || '';

    // 1. 更新 archive_settings 表（席位统计）
    try {
      await AppDataSource.query(
        `INSERT INTO wecom_archive_settings (tenant_id, max_users, used_users, status)
         VALUES (?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE used_users = ?, updated_at = NOW()`,
        [tenantId, userIds.length, userIds.length, userIds.length]
      ).catch((e: any) => {
        log.warn('[ChatArchive] 更新 archive_settings 失败（表可能不存在）:', e.message);
      });
    } catch (e: any) {
      log.warn('[ChatArchive] 保存开通成员信息失败:', e.message);
    }

    // 2. 同步到 wecom_archive_members 表（确保前端能显示存档成员列表）
    try {
      const userNameMap = await this.getUserNameMap(config);

      // 查询已有的 archive_members
      const existingMembers = await AppDataSource.query(
        `SELECT wecom_user_id FROM wecom_archive_members WHERE tenant_id = ?`,
        [tenantId]
      );
      const existingSet = new Set(existingMembers.map((m: any) => m.wecom_user_id));

      // 查询 CRM 用户绑定（用于关联 crmUserId）
      const bindingRows = await AppDataSource.query(
        `SELECT wecom_user_id, crm_user_id FROM wecom_user_bindings WHERE wecom_config_id = ? AND tenant_id = ?`,
        [config.id, tenantId]
      ).catch(() => []);
      const crmBindingMap = new Map<string, string>();
      for (const b of bindingRows) {
        if (b.crm_user_id) crmBindingMap.set(b.wecom_user_id, b.crm_user_id);
      }

      // 检查是否已有启用的成员（判断是否已配置生效范围）
      const enabledCountResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_archive_members WHERE tenant_id = ? AND is_enabled = 1`,
        [tenantId]
      ).catch(() => [{ cnt: 0 }]);
      const hasEnabledMembers = parseInt(enabledCountResult[0]?.cnt || '0') > 0;

      let addedCount = 0;
      for (const userId of userIds) {
        if (existingSet.has(userId)) continue;
        const userName = userNameMap.get(userId) || userId;
        const crmUserId = crmBindingMap.get(userId) || null;
        // 新成员默认不启用（需管理员在"生效范围"中手动启用）
        // 如果尚未配置过生效范围（无任何已启用成员），则自动启用以保持向后兼容
        const defaultEnabled = hasEnabledMembers ? 0 : 1;
        try {
          await AppDataSource.query(
            `INSERT INTO wecom_archive_members (tenant_id, wecom_user_id, wecom_user_name, crm_user_id, is_enabled, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE wecom_user_name = VALUES(wecom_user_name), updated_at = NOW()`,
            [tenantId, userId, userName, crmUserId, defaultEnabled]
          );
          addedCount++;
        } catch (insertErr: any) {
          log.warn(`[ChatArchive] 插入 archive_member ${userId} 失败:`, insertErr.message);
        }
      }
      if (addedCount > 0) {
        log.info(`[ChatArchive] 新增 ${addedCount} 个存档成员到 wecom_archive_members (默认${hasEnabledMembers ? '未启用' : '已启用'})`);
      }
    } catch (e: any) {
      log.warn('[ChatArchive] 同步 archive_members 失败:', e.message);
    }
  }

  /**
   * 检查会话同意状态（抽样检查，作为无外部联系人token时的降级方案）
   */
  private static async checkAgreeStatus(
    accessToken: string,
    config: WecomConfig,
    permitUserIds: string[]
  ): Promise<number> {
    let agreedCount = 0;

    try {
      const sampleUsers = permitUserIds.slice(0, 5);

      for (const userId of sampleUsers) {
        try {
          const externalUserIds = await WecomApiService.getExternalContactList(accessToken, userId).catch(() => []);

          if (externalUserIds.length === 0) continue;

          const sampleExternal = externalUserIds.slice(0, 3);
          const checkInfo = sampleExternal.map((extId: string) => ({
            userid: userId,
            exteranalopenid: extId
          }));

          const agreeResult = await WecomApiService.checkSingleAgree(accessToken, checkInfo).catch(() => []);

          for (const item of agreeResult) {
            if (item.status_change_time > 0) {
              agreedCount++;
            }
          }
        } catch (e: any) {
          log.warn(`[ChatArchive] 检查成员 ${userId} 同意状态失败:`, e.message);
        }
      }
    } catch (e: any) {
      log.warn('[ChatArchive] 检查同意状态出错:', e.message);
    }

    return agreedCount;
  }

  /**
   * 轻量级客户名称补充（第三方模式专用）
   * 只处理有实际消息记录但 wecom_customers 表中没有名称的外部联系人
   * 避免遍历全部外部联系人列表（可能上万），只补充缺失的
   */
  private static async enrichContactNames(config: WecomConfig, externalAccessToken: string): Promise<number> {
    let enriched = 0;
    const maxEnrich = 50;

    try {
      // 查找有消息记录但缺少名称或头像的外部联系人
      const needsEnrich = await AppDataSource.query(`
        SELECT DISTINCT ext_id FROM (
          SELECT from_user_id AS ext_id FROM wecom_chat_records
          WHERE wecom_config_id = ? AND msg_type != 'meta'
            AND (from_user_id LIKE 'wm%' OR from_user_id LIKE 'wo%')
          UNION
          SELECT JSON_UNQUOTE(JSON_EXTRACT(to_user_ids, '$[0]')) AS ext_id FROM wecom_chat_records
          WHERE wecom_config_id = ? AND msg_type != 'meta'
            AND (to_user_ids LIKE '%wm%' OR to_user_ids LIKE '%wo%')
        ) AS t
        WHERE ext_id IS NOT NULL AND ext_id != ''
          AND (
            ext_id NOT IN (
              SELECT external_user_id FROM wecom_customers
              WHERE wecom_config_id = ? AND name IS NOT NULL AND name != ''
                AND avatar IS NOT NULL AND avatar != ''
            )
          )
        LIMIT ?
      `, [config.id, config.id, config.id, maxEnrich]);

      if (!needsEnrich || needsEnrich.length === 0) return 0;

      log.info(`[ChatArchive] enrichContactNames: 需要补充 ${needsEnrich.length} 个联系人信息(名称/头像)`);

      const customerRepo = AppDataSource.getRepository(WecomCustomer);

      for (const row of needsEnrich) {
        const extId = row.ext_id;
        if (!extId) continue;
        try {
          const detailResp = await WecomApiService.getExternalContactDetail(externalAccessToken, extId);
          if (detailResp?.external_contact) {
            const ext = detailResp.external_contact;
            const followUser = (detailResp.follow_user || [])[0];
            const remark = followUser?.remark || '';
            const displayName = ext.name || '';
            const avatar = ext.avatar || '';
            const corpName = ext.corp_name || '';

            const existing = await customerRepo.findOne({ where: { wecomConfigId: config.id, externalUserId: extId } });
            if (existing) {
              // 补充缺失信息
              if (!existing.name || existing.name === extId) {
                existing.name = displayName;
              }
              if (remark && !existing.remark) {
                existing.remark = remark;
              }
              if (avatar && (!existing.avatar || existing.avatar === '')) {
                existing.avatar = avatar;
              }
              if (corpName && !existing.corpName) {
                existing.corpName = corpName;
              }
              await customerRepo.save(existing);
            } else {
              await customerRepo.save(customerRepo.create({
                tenantId: config.tenantId,
                wecomConfigId: config.id,
                corpId: config.corpId,
                externalUserId: extId,
                name: displayName,
                remark,
                avatar,
                corpName,
                type: ext.type || 1,
                gender: ext.gender || 0,
                followUserId: followUser?.userid || '',
                followUserName: followUser?.name || '',
                status: 'normal'
              }));
            }
            enriched++;
          }
        } catch (e: any) {
          log.warn(`[ChatArchive] enrichContactNames: 获取 ${extId} 详情失败: ${e.message}`);
        }
        if (enriched < needsEnrich.length - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    } catch (e: any) {
      log.warn(`[ChatArchive] enrichContactNames error:`, e.message);
    }

    return enriched;
  }

  /**
   * 补充存档成员（内部员工）的头像
   * 从企微通讯录API获取头像URL并存入 wecom_user_bindings 表
   */
  private static async enrichMemberAvatars(config: WecomConfig, accessToken: string, memberIds: string[]): Promise<number> {
    let enriched = 0;
    const maxEnrich = 30;

    try {
      // 找出没有头像的成员
      const noAvatarMembers = await AppDataSource.query(`
        SELECT am.wecom_user_id
        FROM wecom_archive_members am
        LEFT JOIN wecom_user_bindings ub ON am.wecom_user_id = ub.wecom_user_id
        WHERE am.tenant_id = ? AND am.is_enabled = 1
          AND (ub.wecom_avatar IS NULL OR ub.wecom_avatar = '' OR ub.id IS NULL)
        LIMIT ?
      `, [config.tenantId || '', maxEnrich]);

      if (!noAvatarMembers || noAvatarMembers.length === 0) return 0;

      log.info(`[ChatArchive] enrichMemberAvatars: 需要补充 ${noAvatarMembers.length} 个员工头像`);

      for (const row of noAvatarMembers) {
        const userId = row.wecom_user_id;
        if (!userId) continue;
        try {
          const userDetail = await WecomApiService.getUserDetail(accessToken, userId);
          if (userDetail) {
            const avatar = userDetail.avatar || userDetail.thumb_avatar || '';
            const userName = userDetail.name || '';

            if (avatar) {
              // 更新 wecom_user_bindings
              const existingBinding = await AppDataSource.query(
                `SELECT id FROM wecom_user_bindings WHERE wecom_user_id = ? AND tenant_id = ? LIMIT 1`,
                [userId, config.tenantId || '']
              );

              if (existingBinding.length > 0) {
                await AppDataSource.query(
                  `UPDATE wecom_user_bindings SET wecom_avatar = ?, updated_at = NOW() WHERE id = ?`,
                  [avatar, existingBinding[0].id]
                );
              } else {
                // 如果 binding 不存在，创建一条
                await AppDataSource.query(
                  `INSERT INTO wecom_user_bindings (tenant_id, wecom_config_id, corp_id, wecom_user_id, wecom_user_name, wecom_avatar, crm_user_id, is_enabled, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, '', 1, NOW(), NOW())
                   ON DUPLICATE KEY UPDATE wecom_avatar = VALUES(wecom_avatar), wecom_user_name = VALUES(wecom_user_name), updated_at = NOW()`,
                  [config.tenantId || '', config.id, config.corpId, userId, userName, avatar]
                );
              }
              enriched++;
            }
          }
        } catch (e: any) {
          log.debug(`[ChatArchive] enrichMemberAvatars: 获取 ${userId} 详情失败: ${e.message}`);
        }
        if (enriched < noAvatarMembers.length - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    } catch (e: any) {
      log.warn(`[ChatArchive] enrichMemberAvatars error:`, e.message);
    }

    return enriched;
  }

  /**
   * RSA解密消息内容
   * 使用配置中的RSA私钥解密企微加密的消息
   */
  static decryptMessage(encryptedContent: string, privateKeyPem: string): string {
    try {
      const buffer = Buffer.from(encryptedContent, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_PADDING
        },
        buffer
      );
      return decrypted.toString('utf8');
    } catch (error: any) {
      log.error('[ChatArchive] RSA解密失败:', error.message);
      throw new Error(`消息解密失败: ${error.message}`);
    }
  }

  /**
   * 保存聊天记录到数据库
   */
  static async saveChatRecords(
    config: WecomConfig,
    records: Array<{
      msgId: string;
      action: string;
      fromUserId: string;
      toUserIds: string[];
      roomId?: string;
      msgTime: number;
      msgType: string;
      content: any;
    }>
  ): Promise<number> {
    const chatRecordRepo = AppDataSource.getRepository(WecomChatRecord);
    let savedCount = 0;

    for (const record of records) {
      try {
        const exists = await chatRecordRepo.findOne({
          where: { corpId: config.corpId, msgId: record.msgId }
        });

        if (exists) continue;

        const chatRecord = chatRecordRepo.create({
          tenantId: config.tenantId,
          wecomConfigId: config.id,
          corpId: config.corpId,
          msgId: record.msgId,
          msgType: record.msgType,
          action: record.action,
          fromUserId: record.fromUserId,
          toUserIds: JSON.stringify(record.toUserIds),
          roomId: record.roomId || null,
          msgTime: record.msgTime,
          content: typeof record.content === 'string' ? record.content : JSON.stringify(record.content),
          isSensitive: false
        });

        await chatRecordRepo.save(chatRecord);
        savedCount++;
      } catch (e: any) {
        log.warn(`[ChatArchive] 保存消息 ${record.msgId} 失败:`, e.message);
      }
    }

    return savedCount;
  }

  /**
   * 获取会话列表（按对话分组）
   * 用于聊天界面的左侧会话列表
   */
  static async getConversationList(params: {
    tenantId?: string;
    configId?: number;
    userId?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: any[]; total: number }> {
    const { tenantId, configId, userId, keyword, page = 1, pageSize = 50 } = params;

    // ★ 排除 meta 记录，只显示有真实消息的会话
    let where = "WHERE cr.msg_type != 'meta'";
    const queryParams: any[] = [];

    if (tenantId) {
      where += ' AND cr.tenant_id = ?';
      queryParams.push(tenantId);
    }
    if (configId) {
      where += ' AND cr.wecom_config_id = ?';
      queryParams.push(configId);
    }
    if (userId) {
      const userIds = userId.split(',').map(s => s.trim()).filter(Boolean);
      if (userIds.length === 1) {
        where += ' AND (cr.from_user_id = ? OR cr.to_user_ids LIKE ?)';
        queryParams.push(userIds[0], `%${userIds[0]}%`);
      } else if (userIds.length > 1) {
        const placeholders = userIds.map(() => '?').join(',');
        const likeConditions = userIds.map(() => 'cr.to_user_ids LIKE ?').join(' OR ');
        where += ` AND (cr.from_user_id IN (${placeholders}) OR ${likeConditions})`;
        queryParams.push(...userIds, ...userIds.map(id => `%${id}%`));
      }
    }
    if (keyword) {
      where += ' AND cr.content LIKE ?';
      queryParams.push(`%${keyword}%`);
    }

    // 取出所有会话方向的记录，在应用层合并双向
    const listSql = `
      SELECT
        cr.from_user_id AS fromUserId,
        cr.from_user_name AS fromUserName,
        cr.to_user_ids AS toUserIds,
        cr.room_id AS roomId,
        MAX(cr.msg_time) AS lastMsgTime,
        COUNT(*) AS msgCount
      FROM wecom_chat_records cr
      ${where}
      GROUP BY cr.from_user_id, cr.to_user_ids, cr.room_id
      ORDER BY lastMsgTime DESC
      LIMIT 200
    `;

    try {
      const dirList = await AppDataSource.query(listSql, queryParams);

      // ★ 应用层合并双向会话：A→B 和 B→A 归并为一条
      const convMap = new Map<string, any>();
      for (const item of dirList) {
        const fromId = item.fromUserId || '';
        const toId = this.extractFirstToUser(item.toUserIds);
        const roomId = item.roomId || '';

        // 生成会话唯一键（双向归一）
        let convKey: string;
        if (roomId) {
          convKey = `room:${roomId}`;
        } else {
          const ids = [fromId, toId].sort();
          convKey = `${ids[0]}|${ids[1]}`;
        }

        if (convMap.has(convKey)) {
          const existing = convMap.get(convKey)!;
          existing.msgCount += parseInt(item.msgCount) || 0;
          if (item.lastMsgTime > existing.lastMsgTime) {
            existing.lastMsgTime = item.lastMsgTime;
            existing.fromUserId = item.fromUserId;
            existing.fromUserName = item.fromUserName;
            existing.toUserIds = item.toUserIds;
          }
        } else {
          convMap.set(convKey, {
            fromUserId: item.fromUserId,
            fromUserName: item.fromUserName,
            toUserIds: item.toUserIds,
            roomId: roomId || null,
            lastMsgTime: item.lastMsgTime,
            msgCount: parseInt(item.msgCount) || 0,
            convKey
          });
        }
      }

      // 排序并分页
      const merged = Array.from(convMap.values()).sort((a, b) => b.lastMsgTime - a.lastMsgTime);
      const total = merged.length;
      const offset = (page - 1) * pageSize;
      const paged = merged.slice(offset, offset + pageSize);

      // 获取每个会话的最新消息内容
      for (const conv of paged) {
        try {
          const fromId = conv.fromUserId;
          const toId = this.extractFirstToUser(conv.toUserIds);
          let lastMsgSql: string;
          let lastMsgParams: any[];
          if (conv.roomId) {
            lastMsgSql = `SELECT content, msg_type AS msgType FROM wecom_chat_records
              WHERE room_id = ? AND msg_type != 'meta' ${tenantId ? 'AND tenant_id = ?' : ''} ${configId ? 'AND wecom_config_id = ?' : ''}
              ORDER BY msg_time DESC LIMIT 1`;
            lastMsgParams = [conv.roomId];
          } else {
            lastMsgSql = `SELECT content, msg_type AS msgType FROM wecom_chat_records
              WHERE msg_type != 'meta'
              AND ((from_user_id = ? AND to_user_ids LIKE ?) OR (from_user_id = ? AND to_user_ids LIKE ?))
              ${tenantId ? 'AND tenant_id = ?' : ''} ${configId ? 'AND wecom_config_id = ?' : ''}
              ORDER BY msg_time DESC LIMIT 1`;
            lastMsgParams = [fromId, `%${toId}%`, toId, `%${fromId}%`];
          }
          if (tenantId) lastMsgParams.push(tenantId);
          if (configId) lastMsgParams.push(configId);
          const lastMsgRows = await AppDataSource.query(lastMsgSql, lastMsgParams);
          if (lastMsgRows.length > 0) {
            conv.lastContent = lastMsgRows[0].content;
            conv.lastMsgType = lastMsgRows[0].msgType;
          }
        } catch { /* ignore */ }
      }

      const rawList = paged;

      // 收集所有外部联系人ID，批量从 wecom_customers 表查找备注和昵称
      const externalUserIds = new Set<string>();
      for (const item of rawList) {
        try {
          const toIds = typeof item.toUserIds === 'string' ? JSON.parse(item.toUserIds) : item.toUserIds;
          if (Array.isArray(toIds)) {
            toIds.forEach((id: string) => { if (id) externalUserIds.add(id); });
          }
        } catch { /* ignore */ }
        // fromUserId 也可能是外部客户（客户发给员工的消息）
        if (item.fromUserId && item.fromUserId.startsWith('wm')) {
          externalUserIds.add(item.fromUserId);
        }
      }

      // 批量查询客户备注、昵称和头像
      const customerInfoMap = new Map<string, { remark: string; name: string; avatar: string; corpName: string }>();
      if (externalUserIds.size > 0) {
        try {
          let customerWhere = 'external_user_id IN (' + Array.from(externalUserIds).map(() => '?').join(',') + ')';
          const customerParams: any[] = Array.from(externalUserIds);
          if (tenantId) {
            customerWhere += ' AND tenant_id = ?';
            customerParams.push(tenantId);
          }
          if (configId) {
            customerWhere += ' AND wecom_config_id = ?';
            customerParams.push(configId);
          }
          const customers = await AppDataSource.query(
            `SELECT external_user_id, remark, name, avatar, corp_name FROM wecom_customers WHERE ${customerWhere}`,
            customerParams
          );
          for (const c of customers) {
            customerInfoMap.set(c.external_user_id, { remark: c.remark || '', name: c.name || '', avatar: c.avatar || '', corpName: c.corp_name || '' });
          }
        } catch (e: any) {
          log.warn('[ChatArchive] 批量查询客户名称失败:', e.message);
        }
      }

      // 收集所有员工ID，批量查询员工头像
      const memberUserIds = new Set<string>();
      for (const item of rawList) {
        if (item.fromUserId && !item.fromUserId.startsWith('wm') && !item.fromUserId.startsWith('wo')) {
          memberUserIds.add(item.fromUserId);
        }
        try {
          const toIds = typeof item.toUserIds === 'string' ? JSON.parse(item.toUserIds) : item.toUserIds;
          if (Array.isArray(toIds)) {
            toIds.forEach((id: string) => {
              if (id && !id.startsWith('wm') && !id.startsWith('wo')) memberUserIds.add(id);
            });
          }
        } catch { /* ignore */ }
      }

      const memberAvatarMap = new Map<string, string>();
      if (memberUserIds.size > 0) {
        try {
          let memberWhere = 'wecom_user_id IN (' + Array.from(memberUserIds).map(() => '?').join(',') + ')';
          const memberParams: any[] = Array.from(memberUserIds);
          if (tenantId) {
            memberWhere += ' AND tenant_id = ?';
            memberParams.push(tenantId);
          }
          const members = await AppDataSource.query(
            `SELECT wecom_user_id, wecom_avatar FROM wecom_user_bindings WHERE ${memberWhere}`,
            memberParams
          );
          for (const m of members) {
            if (m.wecom_avatar) memberAvatarMap.set(m.wecom_user_id, m.wecom_avatar);
          }
        } catch { /* ignore */ }
      }

      // 批量查询同意状态（从 meta 记录的 content 中提取 agreed 字段）
      const agreedStatusMap = new Map<string, boolean>();
      // 检查是否为第三方模式（第三方模式下 meta 的 agreed=false 不可靠）
      let isThirdPartyMode = false;
      if (configId) {
        try {
          const cfgRow = await AppDataSource.query(
            'SELECT auth_type FROM wecom_configs WHERE id = ? LIMIT 1', [configId]
          );
          isThirdPartyMode = cfgRow?.[0]?.auth_type === 'third_party';
        } catch { /* ignore */ }
      }
      if (externalUserIds.size > 0) {
        try {
          let metaWhere = "msg_type = 'meta' AND content LIKE '%conversation_meta%'";
          const metaParams: any[] = [];
          if (tenantId) {
            metaWhere += ' AND tenant_id = ?';
            metaParams.push(tenantId);
          }
          if (configId) {
            metaWhere += ' AND wecom_config_id = ?';
            metaParams.push(configId);
          }
          const metaRecords = await AppDataSource.query(
            `SELECT to_user_ids, content FROM wecom_chat_records WHERE ${metaWhere}`,
            metaParams
          );
          for (const meta of metaRecords) {
            try {
              const toIds = typeof meta.to_user_ids === 'string' ? JSON.parse(meta.to_user_ids) : meta.to_user_ids;
              const content = typeof meta.content === 'string' ? JSON.parse(meta.content) : meta.content;
              if (Array.isArray(toIds) && toIds.length > 0 && content?.agreed !== undefined) {
                // ★ 第三方模式下 meta 的 agreed=false 不可靠（syncConversationMetadata已不调用）
                // 只信任明确的 agreed=true；false 忽略，由消息判断逻辑决定
                if (isThirdPartyMode && !content.agreed) continue;
                agreedStatusMap.set(toIds[0], !!content.agreed);
              }
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }

        // ★ 补充判断：通过消息方向判断客户是否同意
        // 企微规则：客户未同意时，仍可拉取员工发出的消息（单边存档）
        // 只有客户发出的消息（from_user_id = 外部联系人ID）才能证明客户已同意
        try {
          const extIds = Array.from(externalUserIds).filter(id => !agreedStatusMap.has(id) || agreedStatusMap.get(id) === false);
          if (extIds.length > 0) {
            let msgWhere = "msg_type != 'meta'";
            const msgParams: any[] = [];
            if (tenantId) {
              msgWhere += ' AND tenant_id = ?';
              msgParams.push(tenantId);
            }
            if (configId) {
              msgWhere += ' AND wecom_config_id = ?';
              msgParams.push(configId);
            }
            // ★ 只查找外部联系人作为发送者的消息（客户发出=已同意）
            // 员工发给客户的消息（客户在to_user_ids中）不能证明客户同意
            const fromConditions = extIds.map(() => 'from_user_id = ?').join(' OR ');
            const msgRecords = await AppDataSource.query(
              `SELECT DISTINCT from_user_id FROM wecom_chat_records WHERE ${msgWhere} AND (${fromConditions}) LIMIT 200`,
              [...msgParams, ...extIds]
            );
            for (const rec of msgRecords) {
              const fromId = rec.from_user_id || '';
              if (fromId.startsWith('wm') || fromId.startsWith('wo')) {
                agreedStatusMap.set(fromId, true);
              }
            }
          }
        } catch { /* ignore */ }
      }

      // 后处理：用备注+昵称作为 customerName，附带头像
      const list = rawList.map((item: any) => {
        let customerName = '';
        let customerAvatar = '';
        let memberAvatar = '';

        // 确定外部联系人ID（客户ID）
        let externalId = '';
        let memberId = '';
        try {
          const toIds = typeof item.toUserIds === 'string' ? JSON.parse(item.toUserIds) : item.toUserIds;
          if (Array.isArray(toIds) && toIds.length > 0) {
            // 找到外部联系人ID（以 wm 开头的是外部客户）
            externalId = toIds.find((id: string) => id && (id.startsWith('wm') || id.startsWith('wo'))) || '';
            // 找到员工ID
            memberId = toIds.find((id: string) => id && !id.startsWith('wm') && !id.startsWith('wo')) || '';
          }
        } catch { /* ignore */ }

        // 如果 fromUserId 是外部客户（以 wm 开头），则它就是客户
        if (item.fromUserId && (item.fromUserId.startsWith('wm') || item.fromUserId.startsWith('wo'))) {
          if (!externalId) externalId = item.fromUserId;
          if (!memberId) {
            try {
              const toIds = typeof item.toUserIds === 'string' ? JSON.parse(item.toUserIds) : item.toUserIds;
              if (Array.isArray(toIds)) memberId = toIds[0] || '';
            } catch { /* ignore */ }
          }
        } else {
          // fromUserId 是员工
          if (!memberId) memberId = item.fromUserId;
          if (!externalId) {
            try {
              const toIds = typeof item.toUserIds === 'string' ? JSON.parse(item.toUserIds) : item.toUserIds;
              if (Array.isArray(toIds)) externalId = toIds.find((id: string) => id && (id.startsWith('wm') || id.startsWith('wo'))) || toIds[0] || '';
            } catch { /* ignore */ }
          }
        }

        // 从客户表中获取备注、昵称和头像
        if (externalId && customerInfoMap.has(externalId)) {
          const info = customerInfoMap.get(externalId)!;
          if (info.remark) {
            customerName = info.name ? `${info.remark}(${info.name})` : info.remark;
          } else {
            customerName = info.name || '';
          }
          customerAvatar = info.avatar || '';
        }

        // 获取员工头像
        if (memberId && memberAvatarMap.has(memberId)) {
          memberAvatar = memberAvatarMap.get(memberId) || '';
        }

        // 从 meta 记录 / 消息方向判断同意状态
        let agreed: boolean | null = null;
        if (externalId && agreedStatusMap.has(externalId)) {
          agreed = agreedStatusMap.get(externalId)!;
        }
        // ★ 有消息但 agreed 仍为 null/false：
        // - 客户未同意时，员工的单边消息仍会被存档（agreed 保持 false/null）
        // - 只有检测到客户发出的消息(from_user_id=外部ID)才置为 true（上面已处理）
        // - 第三方数据专区模式特殊：API 完全不返回未同意客户的消息，有消息=已同意
        if (agreed === null && item.msgCount > 0 && isThirdPartyMode) {
          agreed = true;
        }

        // 企业名称（企微联系人所属企业）
        let corpName = '';
        if (externalId && customerInfoMap.has(externalId)) {
          corpName = customerInfoMap.get(externalId)!.corpName || '';
        }

        return { ...item, customerName, customerAvatar, memberAvatar, agreed, corpName };
      });

      return { list, total };
    } catch (e: any) {
      log.error('[ChatArchive] 获取会话列表失败:', e.message);
      return { list: [], total: 0 };
    }
  }

  /**
   * 获取指定会话的消息列表（用于聊天气泡展示）
   */
  static async getConversationMessages(params: {
    tenantId?: string;
    configId?: number;
    fromUserId: string;
    toUserId: string;
    roomId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: any[]; total: number }> {
    const { tenantId, configId, fromUserId, toUserId, roomId, page = 1, pageSize = 50 } = params;
    const offset = (page - 1) * pageSize;

    let where = "WHERE msg_type != 'meta'";
    const queryParams: any[] = [];

    if (tenantId) {
      where += ' AND tenant_id = ?';
      queryParams.push(tenantId);
    }
    if (configId) {
      where += ' AND wecom_config_id = ?';
      queryParams.push(configId);
    }
    if (roomId) {
      where += ' AND room_id = ?';
      queryParams.push(roomId);
    } else {
      where += ' AND ((from_user_id = ? AND to_user_ids LIKE ?) OR (from_user_id = ? AND to_user_ids LIKE ?))';
      queryParams.push(fromUserId, `%${toUserId}%`, toUserId, `%${fromUserId}%`);
    }

    const countSql = `SELECT COUNT(*) as total FROM wecom_chat_records ${where}`;
    const listSql = `
      SELECT id, msg_id AS msgId, msg_type AS msgType, action,
             from_user_id AS fromUserId, from_user_name AS fromUserName,
             to_user_ids AS toUserIds, room_id AS roomId,
             msg_time AS msgTime, content, media_url AS mediaUrl,
             is_sensitive AS isSensitive, audit_remark AS auditRemark,
             sender_type AS senderType
      FROM wecom_chat_records ${where}
      ORDER BY msg_time ASC
      LIMIT ? OFFSET ?
    `;

    try {
      const countResult = await AppDataSource.query(countSql, queryParams);
      const total = countResult[0]?.total || 0;
      const list = await AppDataSource.query(listSql, [...queryParams, pageSize, offset]);

      return {
        list: list.map((row: any) => ({
          ...row,
          isSensitive: !!row.isSensitive,
          toUserIds: this.safeParseJson(row.toUserIds, []),
          content: this.safeParseJson(row.content, row.content)
        })),
        total
      };
    } catch (e: any) {
      log.error('[ChatArchive] 获取会话消息失败:', e.message);
      return { list: [], total: 0 };
    }
  }

  /**
   * 获取会话存档统计信息
   */
  static async getArchiveStats(config: WecomConfig): Promise<any> {
    try {
      const configId = config.id;

      // 基础计数
      const totalRecords = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type != 'meta'`, [configId]
      );
      const totalMsgs = parseInt(totalRecords[0]?.cnt) || 0;

      const convResult = await AppDataSource.query(
        `SELECT COUNT(DISTINCT CONCAT(from_user_id, '-', to_user_ids)) as cnt FROM wecom_chat_records WHERE wecom_config_id = ?`, [configId]
      );
      const conversationCount = parseInt(convResult[0]?.cnt) || 0;

      const agreedResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type = 'meta' AND content LIKE '%"agreed":true%'`, [configId]
      );
      const agreedConversations = parseInt(agreedResult[0]?.cnt) || 0;

      // 敏感消息数
      const sensitiveResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ? AND is_sensitive = 1`, [configId]
      );
      const sensitiveCount = parseInt(sensitiveResult[0]?.cnt) || 0;

      // 近7天趋势
      const trendRows = await AppDataSource.query(
        `SELECT DATE(FROM_UNIXTIME(msg_time/1000)) as dateLabel,
                COUNT(*) as msgCount,
                COUNT(DISTINCT CONCAT(from_user_id, '-', to_user_ids)) as convCount
         FROM wecom_chat_records
         WHERE wecom_config_id = ? AND msg_type != 'meta'
           AND msg_time >= UNIX_TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 7 DAY)) * 1000
         GROUP BY dateLabel ORDER BY dateLabel ASC`,
        [configId]
      ).catch(() => []);
      const trend = trendRows.map((r: any) => ({
        dateLabel: r.dateLabel ? new Date(r.dateLabel).toISOString().slice(5, 10) : '',
        msgCount: parseInt(r.msgCount) || 0,
        convCount: parseInt(r.convCount) || 0
      }));

      // 消息类型分布
      const typeRows = await AppDataSource.query(
        `SELECT msg_type as type, COUNT(*) as count FROM wecom_chat_records
         WHERE wecom_config_id = ? AND msg_type NOT IN ('meta', 'agree', 'disagree')
         GROUP BY msg_type ORDER BY count DESC`,
        [configId]
      ).catch(() => []);
      const typeDistribution = typeRows.map((r: any) => ({
        type: r.type, count: parseInt(r.count) || 0
      }));

      // 成员排行（按发送消息数）
      const memberRows = await AppDataSource.query(
        `SELECT from_user_id as userId, from_user_name as userName,
                COUNT(*) as msgCount,
                COUNT(DISTINCT CONCAT(from_user_id, '-', to_user_ids)) as convCount
         FROM wecom_chat_records
         WHERE wecom_config_id = ? AND msg_type != 'meta'
         GROUP BY from_user_id, from_user_name
         ORDER BY msgCount DESC LIMIT 20`,
        [configId]
      ).catch(() => []);
      const memberRanking = memberRows.map((r: any) => ({
        userName: r.userName || r.userId,
        userId: r.userId,
        msgCount: parseInt(r.msgCount) || 0,
        convCount: parseInt(r.convCount) || 0,
        avgResponse: 0,
        activePercent: 0
      }));

      const lastSync = lastArchiveSyncMap.get(configId);
      const lastSyncTime = lastSync ? new Date(lastSync).toISOString() : null;

      return {
        totalMsgs, conversationCount, agreedConversations, sensitiveCount,
        avgResponseTime: 0, msgTrend: 0, convTrend: 0, respTrend: 0,
        trend, typeDistribution, memberRanking, memberRankTotal: memberRanking.length,
        totalRecords: totalMsgs, totalConversations: conversationCount, lastSyncTime
      };
    } catch (e: any) {
      log.error('[ChatArchive] 获取统计信息失败:', e.message);
      return {
        totalMsgs: 0, conversationCount: 0, agreedConversations: 0, sensitiveCount: 0,
        avgResponseTime: 0, msgTrend: 0, convTrend: 0, respTrend: 0,
        trend: [], typeDistribution: [], memberRanking: [], memberRankTotal: 0,
        totalRecords: 0, totalConversations: 0, lastSyncTime: null
      };
    }
  }

  /**
   * 安全解析JSON
   */
  private static safeParseJson(str: any, fallback: any): any {
    if (!str || typeof str !== 'string') return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
  }

  private static extractFirstToUser(toUserIds: any): string {
    if (Array.isArray(toUserIds) && toUserIds.length > 0) return toUserIds[0];
    if (typeof toUserIds === 'string') {
      try {
        const parsed = JSON.parse(toUserIds);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch { /* ignore */ }
      return toUserIds;
    }
    return '';
  }

  // ==================== 第三方模式：专区接口拉取实际消息 ====================

  /** 存储每个配置的拉取游标（持久化到 TenantSettings） */
  private static async getSyncCursor(configId: number, tenantId?: string): Promise<string> {
    try {
      const key = `wecom_chat_archive_cursor_${configId}`;
      const result = await AppDataSource.query(
        `SELECT setting_value FROM tenant_settings WHERE tenant_id = ? AND setting_key = ? LIMIT 1`,
        [tenantId || '', key]
      );
      if (result.length > 0 && result[0].setting_value) {
        const val = JSON.parse(result[0].setting_value);
        return val?.cursor || '';
      }
      return '';
    } catch {
      return '';
    }
  }

  private static async saveSyncCursor(configId: number, cursor: string, tenantId?: string): Promise<void> {
    try {
      const key = `wecom_chat_archive_cursor_${configId}`;
      const value = JSON.stringify({ cursor, updatedAt: new Date().toISOString() });
      // Upsert
      const existing = await AppDataSource.query(
        `SELECT id FROM tenant_settings WHERE tenant_id = ? AND setting_key = ? LIMIT 1`,
        [tenantId || '', key]
      );
      if (existing.length > 0) {
        await AppDataSource.query(
          `UPDATE tenant_settings SET setting_value = ?, updated_at = NOW() WHERE id = ?`,
          [value, existing[0].id]
        );
      } else {
        const { v4: uuidv4 } = await import('uuid');
        await AppDataSource.query(
          `INSERT INTO tenant_settings (id, tenant_id, setting_key, setting_type, setting_value, created_at, updated_at)
           VALUES (?, ?, ?, 'json', ?, NOW(), NOW())`,
          [uuidv4(), tenantId || '', key, value]
        );
      }
    } catch (e: any) {
      log.warn('[ChatArchive] 保存同步游标失败:', e.message);
    }
  }

  /**
   * 【第三方模式】通过数据与智能专区接口拉取实际聊天消息
   * 调用 /chatdata/sync_msg 获取消息元数据 → RSA解密 encrypted_secret_key → 存储 msgid + secretKey
   *
   * 注意：根据企微专区安全机制，消息明文不能传出专区。
   * 前端通过「会话展示组件」(ww-open-message) 传入 msgid + secretKey 来渲染消息内容。
   * 后端只存储元数据（发送者、接收者、时间、消息类型）和解密后的 secretKey。
   */
  static async syncChatMessages(config: WecomConfig, chatAccessToken: string): Promise<{ savedCount: number; totalFetched: number }> {
    let savedCount = 0;
    let totalFetched = 0;

    // 获取RSA私钥和专区程序配置（服务商级别）
    const { WecomSuiteConfig } = await import('../entities/WecomSuiteConfig');
    const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
    const suiteConfig = await suiteRepo.findOne({ where: {}, order: { id: 'ASC' } });
    const rsaPrivateKey = suiteConfig?.chatArchiveRsaPrivateKey;
    const zoneProgramId = suiteConfig?.zoneProgramId;
    const zoneAbilityId = suiteConfig?.zoneAbilityId;
    // ★ 优先使用专门的 sync_msg 能力ID（如 invoke_sync_msg），否则回退到通用能力ID
    const zoneSyncMsgAbilityId = suiteConfig?.zoneSyncMsgAbilityId || zoneAbilityId;
    // ★ get_msg_body 使用独立能力ID（如 invoke_get_msg_body），否则回退到 sync_msg 的能力ID
    const zoneGetMsgBodyAbilityId = suiteConfig?.zoneGetMsgBodyAbilityId || zoneSyncMsgAbilityId;
    const useZoneProxy = !!(zoneProgramId && zoneSyncMsgAbilityId && config.authType === 'third_party');

    if (!rsaPrivateKey) {
      log.warn('[ChatArchive] syncChatMessages: 服务商未配置RSA私钥，无法解密消息。请平台管理员在「服务商应用管理」中配置RSA密钥对');
      throw new Error('平台尚未配置消息解密密钥，请联系平台管理员在管理后台配置（租户无需操作）');
    }

    if (config.authType === 'third_party' && !useZoneProxy) {
      log.warn('[ChatArchive] syncChatMessages: 第三方模式未配置专区程序ID，sync_msg需要通过专区程序调用。请在管理后台「服务商应用管理」中配置专区程序ID和能力ID');
    }

    log.info(`[ChatArchive] syncChatMessages: useZoneProxy=${useZoneProxy}, zoneProgramId=${zoneProgramId || '(无)'}, zoneAbilityId=${zoneAbilityId || '(无)'}, zoneSyncMsgAbilityId=${zoneSyncMsgAbilityId || '(无)'}`);

    // 获取上次拉取的游标位置
    let cursor = await this.getSyncCursor(config.id, config.tenantId);

    // ★ 如果有旧的未解密记录、空fromUserId、或缺少secretKey的记录，重置游标以触发修复
    if (cursor) {
      try {
        const badRecordCount = await AppDataSource.query(
          `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ? AND msg_type != 'meta' AND (
            content LIKE '%"type":"encrypted"%'
            OR from_user_id = '' OR from_user_id IS NULL
            OR content LIKE '%"secretKey":""%'
            OR content NOT LIKE '%"secretKey"%'
          )`,
          [config.id]
        );
        if (badRecordCount?.[0]?.cnt > 0) {
          log.info(`[ChatArchive] syncChatMessages: 发现 ${badRecordCount[0].cnt} 条需修复的记录（加密/空发送者/缺secretKey），重置游标`);
          cursor = '';
        }
      } catch { /* ignore */ }
    }

    log.info(`[ChatArchive] syncChatMessages: 开始拉取, configId=${config.id}, corpId=${config.corpId}, cursor=${cursor || '(首次/重置)'}, hasPrivateKey=${!!rsaPrivateKey}, keyLen=${rsaPrivateKey?.length}`);

    // 获取用户名称映射
    const userNameMap = await this.getUserNameMap(config);

    // 获取客户名称映射
    const customerNameMap = new Map<string, string>();
    try {
      const customers = await AppDataSource.query(
        `SELECT external_user_id, remark, name FROM wecom_customers WHERE wecom_config_id = ? AND tenant_id = ?`,
        [config.id, config.tenantId || '']
      );
      for (const c of customers) {
        const displayName = c.remark ? (c.name ? `${c.remark}(${c.name})` : c.remark) : (c.name || '');
        if (displayName) customerNameMap.set(c.external_user_id, displayName);
      }
    } catch { /* ignore */ }

    const chatRecordRepo = AppDataSource.getRepository(WecomChatRecord);
    let hasMore = true;
    let batchCount = 0;
    const maxBatches = 10; // 每次同步最多拉取10批（防止单次同步时间过长）

    while (hasMore && batchCount < maxBatches) {
      batchCount++;
      try {
        // 第三方模式通过专区程序代理调用，自建模式直接HTTP调用
        const result = useZoneProxy
          ? await WecomApiService.getChatMsgDataViaZone(chatAccessToken, zoneProgramId!, zoneSyncMsgAbilityId!, cursor, 200)
          : await WecomApiService.getChatMsgData(chatAccessToken, cursor, 200);
        const chatdata = result.chatdata;
        hasMore = result.has_more;
        cursor = result.next_cursor;
        totalFetched += chatdata.length;

        // 诊断日志：检查 encrypt_random_key 是否有效
        if (chatdata.length > 0) {
          const withKey = chatdata.filter((d: any) => d.encrypt_random_key && d.encrypt_random_key.length > 10).length;
          log.info(`[ChatArchive] 批次${batchCount}: ${chatdata.length}条消息, 其中${withKey}条有encrypt_random_key`);
          if (withKey === 0 && chatdata.length > 0) {
            const sample = chatdata[0];
            log.warn(`[ChatArchive] 首条消息无加密密钥! 字段列表: ${Object.keys(sample).join(',')}, encrypt_random_key="${sample.encrypt_random_key || '(空)'}", msgid=${sample.msgid}`);
          }
        }

        if (chatdata.length === 0) break;

        // 消息类型映射（数字→字符串）
        const msgTypeMap: Record<number, string> = {
          0: 'unknown', 1: 'text', 2: 'image', 3: 'emotion', 4: 'link',
          5: 'weapp', 6: 'voice', 7: 'video', 8: 'file', 9: 'card',
          10: 'chatrecord', 11: 'video_account', 12: 'calendar',
          13: 'redpacket', 14: 'location', 15: 'meeting', 16: 'todo',
          17: 'vote', 18: 'doc', 19: 'news', 20: 'mixed',
          21: 'audio_archive', 22: 'call', 23: 'wedisk_file',
          24: 'agree', 25: 'disagree', 26: 'group_solitaire',
          27: 'markdown', 28: 'note'
        };

        // 处理每条消息：RSA解密密钥 → 存储元数据 + secretKey（消息明文需通过前端会话展示组件查看）
        for (const item of chatdata) {
          try {
            // 从 sync_msg 返回的元数据中提取信息
            const msgData = item as any;
            const sender = msgData.sender || { type: 0, id: '' };
            const receiverList = msgData.receiver_list || [];
            const sendTime = msgData.send_time || Math.floor(Date.now() / 1000);
            const msgTypeNum = msgData.msgtype !== undefined ? Number(msgData.msgtype) : -1;
            const chatId = msgData.chatid || '';

            // 发送者信息
            const fromUserId = sender.id || '';
            const senderType = sender.type || 1; // 1=员工 2=外部联系人 3=机器人
            const isExternalSender = senderType === 2;

            // 获取发送者名称
            let fromUserName = '';
            if (isExternalSender) {
              fromUserName = customerNameMap.get(fromUserId) || fromUserId;
            } else {
              fromUserName = userNameMap.get(fromUserId) || fromUserId;
            }

            // 接收者列表
            const toUserIds = receiverList.map((r: any) => r.id).filter(Boolean);
            const receiverType = chatId ? 3 : (receiverList.some((r: any) => r.type === 2) ? 2 : 1);
            const msgTypeStr = msgTypeMap[msgTypeNum] || `type_${msgTypeNum}`;

            // RSA解密 encrypted_secret_key → 得到 secretKey
            let secretKey = '';
            if (item.encrypt_random_key) {
              secretKey = this.rsaDecrypt(rsaPrivateKey, item.encrypt_random_key) || '';
              if (!secretKey) {
                log.warn(`[ChatArchive] RSA解密失败, msgid=${item.msgid}, keyLen=${item.encrypt_random_key?.length}`);
              }
            } else {
              log.warn(`[ChatArchive] 消息无encrypt_random_key: msgid=${item.msgid}, 可用字段=${Object.keys(item).join(',')}`);
            }

            // 检查是否已存在（去重）
            const existing = await chatRecordRepo.findOne({
              where: { corpId: config.corpId, msgId: item.msgid }
            });
            if (existing) {
              let needUpdate = false;
              // 如果旧记录缺少发送者信息，补充
              if ((!existing.fromUserId || existing.fromUserId === '') && fromUserId) {
                existing.fromUserId = fromUserId;
                existing.fromUserName = fromUserName;
                existing.senderType = senderType;
                existing.receiverType = receiverType;
                if (chatId && !existing.roomId) existing.roomId = chatId;
                needUpdate = true;
              }
              // ★ 如果旧记录缺少 secretKey，用新解密的 secretKey 更新
              if (secretKey) {
                try {
                  const oldContent = typeof existing.content === 'string' ? JSON.parse(existing.content) : (existing.content || {});
                  if (!oldContent.secretKey) {
                    oldContent.secretKey = secretKey;
                    existing.content = JSON.stringify(oldContent);
                    needUpdate = true;
                  }
                } catch { /* JSON parse error, skip */ }
              }
              if (needUpdate) {
                await chatRecordRepo.save(existing);
                savedCount++;
              }
              continue;
            }

            // 根据消息类型生成可在普通浏览器中显示的内容描述
            const msgTypeDescMap: Record<string, string> = {
              text: '文本消息', image: '图片', emotion: '表情', link: '链接',
              weapp: '小程序', voice: '语音', video: '视频', file: '文件',
              card: '名片', chatrecord: '聊天记录', location: '位置',
              agree: '同意会话存档', disagree: '不同意会话存档', call: '音视频通话',
              redpacket: '红包', meeting: '快速会议', todo: '待办', vote: '投票',
              doc: '在线文档', mixed: '图文混合', note: '笔记'
            };

            // 存储格式：secretKey 用于前端会话展示组件，msgtype 用于普通浏览器显示
            const contentToStore = JSON.stringify({
              secretKey: secretKey || '',
              msgid: item.msgid,
              msgtype: msgTypeStr,
              msgTypeDesc: msgTypeDescMap[msgTypeStr] || msgTypeStr,
              publicKeyVer: item.publickey_ver || 1
            });

            const record = chatRecordRepo.create({
              tenantId: config.tenantId,
              wecomConfigId: config.id,
              corpId: config.corpId,
              msgId: item.msgid,
              msgType: msgTypeStr,
              action: 'send',
              fromUserId,
              fromUserName,
              toUserIds: JSON.stringify(toUserIds),
              roomId: chatId || null,
              msgTime: sendTime * 1000, // 转为毫秒时间戳
              content: contentToStore,
              mediaKey: null,
              isSensitive: false,
              senderType,
              receiverType
            });

            await chatRecordRepo.save(record);
            savedCount++;
          } catch (e: any) {
            log.warn(`[ChatArchive] 处理消息 ${item.msgid} 失败:`, e.message);
          }
        }

        // 保存游标位置（每批保存一次，支持断点续传）
        if (cursor) {
          await this.saveSyncCursor(config.id, cursor, config.tenantId);
        }

        // 批间延迟，避免API限流
        if (hasMore) {
          await new Promise(r => setTimeout(r, 300));
        }
      } catch (e: any) {
        log.error(`[ChatArchive] syncChatMessages batch ${batchCount} error:`, e.message);
        break;
      }
    }

    log.info(`[ChatArchive] syncChatMessages 完成: 共拉取 ${totalFetched} 条, 保存 ${savedCount} 条新消息`);
    return { savedCount, totalFetched };
  }

  /**
   * 通过专区程序 get_agree_status_single 获取客户同意会话存档的准确状态
   * 并更新到 chat_records 的 meta 记录中，供 getConversationList 读取
   */
  private static async syncAgreeStatusViaZone(config: WecomConfig, accessToken: string): Promise<number> {
    const { WecomSuiteConfig } = await import('../entities/WecomSuiteConfig');
    const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
    const suiteConfig = await suiteRepo.findOne({ where: {}, order: { id: 'ASC' } });
    const zoneProgramId = suiteConfig?.zoneProgramId;
    const zoneAbilityId = suiteConfig?.zoneSyncMsgAbilityId || suiteConfig?.zoneAbilityId;

    if (!zoneProgramId || !zoneAbilityId) return 0;

    // 获取所有需要检查同意状态的 内部成员 → 外部联系人 关系
    const pairs = await AppDataSource.query(
      `SELECT DISTINCT cr.from_user_id as staffId, 
              SUBSTRING_INDEX(REPLACE(REPLACE(cr.to_user_ids, '["', ''), '"]', ''), '","', 1) as extId
       FROM wecom_chat_records cr
       WHERE cr.wecom_config_id = ? AND cr.msg_type != 'meta' AND cr.room_id IS NULL
         AND cr.from_user_id NOT LIKE 'wm%' AND cr.from_user_id NOT LIKE 'wo%'
         AND cr.to_user_ids LIKE '%wm%'
       LIMIT 100`,
      [config.id]
    );

    if (pairs.length === 0) return 0;

    // 构建查询参数
    const items = pairs
      .filter((p: any) => p.staffId && p.extId && (p.extId.startsWith('wm') || p.extId.startsWith('wo')))
      .map((p: any) => ({ userid: p.staffId, external_userid: p.extId }));

    if (items.length === 0) return 0;

    log.info(`[ChatArchive] syncAgreeStatusViaZone: 查询 ${items.length} 个会话的同意状态`);

    try {
      const rawResult = await WecomApiService.syncCallProgram(
        accessToken, zoneProgramId, zoneAbilityId,
        'get_agree_status_single', { item: items.slice(0, 100) }
      );

      let result = rawResult;
      if (rawResult?.output) {
        result = typeof rawResult.output === 'string' ? JSON.parse(rawResult.output) : rawResult.output;
      }

      if (result.errcode && result.errcode !== 0) {
        log.warn(`[ChatArchive] get_agree_status_single 失败: ${result.errcode} ${result.errmsg}`);
        return 0;
      }

      const agreeInfo = result.agreeinfo || [];
      let agreedCount = 0;

      // 将同意状态存入数据库（更新现有 meta 记录或创建新的）
      const chatRecordRepo = AppDataSource.getRepository(WecomChatRecord);
      for (const info of agreeInfo) {
        const extId = info.external_userid;
        const agreed = info.agree_status === 'Agree';
        if (agreed) agreedCount++;

        // 查找该客户的 meta 记录
        const existingMeta = await chatRecordRepo.findOne({
          where: { corpId: config.corpId, msgType: 'meta', toUserIds: JSON.stringify([extId]) }
        });

        if (existingMeta) {
          try {
            const content = typeof existingMeta.content === 'string' ? JSON.parse(existingMeta.content) : (existingMeta.content || {});
            content.agreed = agreed;
            content.agreeStatusTime = info.status_change_time;
            content.agreeSource = 'zone_api';
            existingMeta.content = JSON.stringify(content);
            await chatRecordRepo.save(existingMeta);
          } catch { /* ignore */ }
        } else {
          // 创建新的 meta 记录
          const meta = chatRecordRepo.create({
            tenantId: config.tenantId,
            wecomConfigId: config.id,
            corpId: config.corpId,
            msgId: `agree_meta_${extId}_${Date.now()}`,
            msgType: 'meta',
            action: 'send',
            fromUserId: info.userid || '',
            fromUserName: '',
            toUserIds: JSON.stringify([extId]),
            roomId: null,
            msgTime: (info.status_change_time || Math.floor(Date.now() / 1000)) * 1000,
            content: JSON.stringify({
              type: 'conversation_meta',
              agreed,
              agreeStatusTime: info.status_change_time,
              agreeSource: 'zone_api'
            }),
            isSensitive: false
          });
          await chatRecordRepo.save(meta);
        }
      }

      log.info(`[ChatArchive] syncAgreeStatusViaZone: 获取 ${agreeInfo.length} 条记录, ${agreedCount} 个已同意`);
      return agreedCount;
    } catch (e: any) {
      log.warn(`[ChatArchive] syncAgreeStatusViaZone 异常: ${e.message}`);
      return 0;
    }
  }

  /**
   * RSA解密 encrypt_random_key
   * 企微使用 RSA/ECB/PKCS1Padding 加密，密文是 base64 编码
   */
  private static rsaDecrypt(privateKeyPem: string, encryptedBase64: string): string | null {
    try {
      // 确保私钥格式正确
      let key = privateKeyPem.trim();
      if (!key.startsWith('-----BEGIN')) {
        key = `-----BEGIN RSA PRIVATE KEY-----\n${key}\n-----END RSA PRIVATE KEY-----`;
      }

      const buffer = Buffer.from(encryptedBase64, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key,
          padding: crypto.constants.RSA_PKCS1_PADDING
        },
        buffer
      );
      return decrypted.toString('utf8');
    } catch (e: any) {
      log.warn('[ChatArchive] RSA解密失败:', e.message);
      return null;
    }
  }

  /**
   * AES解密 encrypt_chat_msg
   * 企微使用 AES-256-GCM 加密，密文格式：base64(nonce + ciphertext + tag)
   * 其中 nonce=12字节, tag=16字节（在密文末尾）
   */
  private static aesDecrypt(key: string, encryptedBase64: string): string | null {
    try {
      const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');

      // AES-256-GCM: nonce(12) + ciphertext + tag(16)
      const nonce = encryptedBuffer.subarray(0, 12);
      const tag = encryptedBuffer.subarray(encryptedBuffer.length - 16);
      const ciphertext = encryptedBuffer.subarray(12, encryptedBuffer.length - 16);

      // key 可能是 hex 编码或 base64 编码
      let keyBuffer: Buffer;
      if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
        keyBuffer = Buffer.from(key, 'hex');
      } else if (key.length === 44 && /^[A-Za-z0-9+/=]+$/.test(key)) {
        keyBuffer = Buffer.from(key, 'base64');
      } else {
        // 尝试直接作为 utf8
        keyBuffer = Buffer.from(key, 'utf8').subarray(0, 32);
      }

      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, nonce);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (e: any) {
      // 尝试 AES-256-CBC 模式（某些旧版本企微可能使用）
      try {
        return this.aesDecryptCBC(key, encryptedBase64);
      } catch {
        log.warn('[ChatArchive] AES解密失败(GCM+CBC均失败):', e.message);
        return null;
      }
    }
  }

  /**
   * AES-256-CBC 解密（备用模式）
   */
  private static aesDecryptCBC(key: string, encryptedBase64: string): string | null {
    try {
      const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');

      // CBC模式: IV(16) + ciphertext
      const iv = encryptedBuffer.subarray(0, 16);
      const ciphertext = encryptedBuffer.subarray(16);

      let keyBuffer: Buffer;
      if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
        keyBuffer = Buffer.from(key, 'hex');
      } else if (key.length === 44 && /^[A-Za-z0-9+/=]+$/.test(key)) {
        keyBuffer = Buffer.from(key, 'base64');
      } else {
        keyBuffer = Buffer.from(key, 'utf8').subarray(0, 32);
      }

      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
      decipher.setAutoPadding(true);

      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch {
      return null;
    }
  }
}



export default WecomChatArchiveService;
