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
        const authUsers = await WecomApiService.getChatDataAuthUserList(accessToken);
        permitUserIds = authUsers.map(u => u.userid);
        log.info(`[ChatArchive] Step2完成: 专区授权成员: ${permitUserIds.length} 人, IDs: ${permitUserIds.slice(0, 10).join(',')}`);
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

      if (externalAccessToken) {
        log.info(`[ChatArchive] Step5: 开始同步会话元数据, permitUsers=${permitUserIds.length}`);
        const convResult = await this.syncConversationMetadata(config, externalAccessToken, accessToken, permitUserIds);
        result.newConversations = convResult.newConversations;
        result.agreedUsers = convResult.agreedCount;
        result.syncedRecords = convResult.syncedRecords;
        log.info(`[ChatArchive] Step5完成: newConversations=${convResult.newConversations}, agreedCount=${convResult.agreedCount}, syncedRecords=${convResult.syncedRecords}`);
      } else {
        log.warn('[ChatArchive] 无externalToken，仅做同意状态抽样检查');
        // 仅做同意状态抽样检查
        result.agreedUsers = await this.checkAgreeStatus(accessToken, config, permitUserIds);
      }

      // Step 6: 第三方模式 - 通过专区接口拉取实际聊天消息
      if (config.authType === 'third_party') {
        log.info(`[ChatArchive] Step6: 第三方模式 - 开始拉取实际聊天消息...`);
        try {
          const msgResult = await this.syncChatMessages(config, accessToken);
          result.syncedRecords += msgResult.savedCount;
          if (msgResult.savedCount > 0) {
            log.info(`[ChatArchive] Step6完成: 拉取并保存 ${msgResult.savedCount} 条实际消息`);
          } else {
            log.info(`[ChatArchive] Step6完成: 无新消息`);
          }
        } catch (e: any) {
          log.warn(`[ChatArchive] Step6失败: 拉取实际消息出错: ${e.message}`);
          // 不影响整体同步结果
        }
      }

      // 组装结果消息
      const parts: string[] = [];
      parts.push(`${permitUserIds.length}个开通成员`);
      if (result.agreedUsers > 0) parts.push(`${result.agreedUsers}个已同意存档`);
      if (result.newConversations > 0) parts.push(`新增${result.newConversations}条会话记录`);
      if (result.syncedRecords > 0) parts.push(`更新${result.syncedRecords}条元数据`);

      result.sdkRequired = config.authType !== 'third_party';
      result.mode = config.authType === 'third_party' ? 'chatdata_zone' : 'http_api';
      result.message = config.authType === 'third_party'
        ? `专区模式同步完成：${parts.join('，')}。`
        : `HTTP API同步完成：${parts.join('，')}。实际消息内容拉取需部署Finance SDK。`;

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

        // 检查该成员与外部联系人的同意状态（批量，最多取20个）
        const sampleExternal = externalUserIds.slice(0, 20);
        const checkInfo = sampleExternal.map((extId: string) => ({
          userid: userId,
          exteranalopenid: extId
        }));

        const agreeMap: Map<string, boolean> = new Map();
        try {
          const agreeResult = await WecomApiService.checkSingleAgree(chatAccessToken, checkInfo);
          for (const item of agreeResult) {
            // 判断同意状态：agree_status 为 "Agree" 或 "Default_Agree" 表示已同意
            // status_change_time > 0 且无 agree_status 字段时也视为已同意（兼容旧版API返回）
            const isAgreed = item.agree_status === 'Agree' || item.agree_status === 'Default_Agree'
              || (!item.agree_status && item.status_change_time > 0);
            if (isAgreed) {
              const extId = item.exteranalopenid || item.userid_list?.[0] || '';
              if (extId) {
                agreeMap.set(extId, true);
                agreedCount++;
              }
            }
          }
        } catch (e: any) {
          log.warn(`[ChatArchive] 检查成员 ${userId} 同意状态失败:`, e.message);
          // 如果 checkSingleAgree 接口失败（第三方模式可能无权限），
          // 则通过检查是否有实际聊天记录来推断同意状态
          if (config.authType === 'third_party') {
            // 第三方模式下，如果能拉取到消息，说明客户已同意
            // 将所有外部联系人默认标记为已同意（后续通过实际消息验证）
            for (const extId of sampleExternal) {
              agreeMap.set(extId, true);
              agreedCount++;
            }
            log.info(`[ChatArchive] 第三方模式: checkSingleAgree 不可用，默认标记 ${sampleExternal.length} 个客户为已同意`);
          }
        }

        // 为每个外部联系人生成/更新会话元数据记录
        const limitedExternal = externalUserIds.slice(0, 50); // 每成员最多50个外部联系人
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
            const isAgreed = agreeMap.get(extUserId) || false;

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
   * 保存开通会话存档的成员信息
   */
  private static async savePermitUsers(config: WecomConfig, userIds: string[]): Promise<void> {
    try {
      const tenantId = config.tenantId || '';
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
    const offset = (page - 1) * pageSize;

    let where = "WHERE 1=1";
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
      // 支持多个userId（逗号分隔）
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

    const countSql = `
      SELECT COUNT(DISTINCT CONCAT(cr.from_user_id, '-', SUBSTRING_INDEX(REPLACE(REPLACE(cr.to_user_ids, '["', ''), '"]', ''), '","', 1))) as total
      FROM wecom_chat_records cr ${where}
    `;

    const listSql = `
      SELECT
        cr.from_user_id AS fromUserId,
        cr.from_user_name AS fromUserName,
        cr.to_user_ids AS toUserIds,
        cr.room_id AS roomId,
        MAX(cr.msg_time) AS lastMsgTime,
        COUNT(*) AS msgCount,
        (SELECT cr2.content FROM wecom_chat_records cr2
         WHERE cr2.from_user_id = cr.from_user_id AND cr2.to_user_ids = cr.to_user_ids AND cr2.wecom_config_id = cr.wecom_config_id
         ORDER BY cr2.msg_time DESC LIMIT 1) AS lastContent,
        (SELECT cr2.msg_type FROM wecom_chat_records cr2
         WHERE cr2.from_user_id = cr.from_user_id AND cr2.to_user_ids = cr.to_user_ids AND cr2.wecom_config_id = cr.wecom_config_id
         ORDER BY cr2.msg_time DESC LIMIT 1) AS lastMsgType
      FROM wecom_chat_records cr
      ${where}
      GROUP BY cr.from_user_id, cr.from_user_name, cr.to_user_ids, cr.room_id, cr.wecom_config_id
      ORDER BY lastMsgTime DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const countResult = await AppDataSource.query(countSql, queryParams);
      const total = countResult[0]?.total || 0;

      const rawList = await AppDataSource.query(listSql, [...queryParams, pageSize, offset]);

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
      const customerInfoMap = new Map<string, { remark: string; name: string; avatar: string }>();
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
            `SELECT external_user_id, remark, name, avatar FROM wecom_customers WHERE ${customerWhere}`,
            customerParams
          );
          for (const c of customers) {
            customerInfoMap.set(c.external_user_id, { remark: c.remark || '', name: c.name || '', avatar: c.avatar || '' });
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
                agreedStatusMap.set(toIds[0], !!content.agreed);
              }
            } catch { /* ignore */ }
          }
        } catch { /* ignore */ }

        // 补充判断：如果有实际消息记录（非meta），说明客户已同意存档
        // 企微规则：只有客户同意后才能拉取到消息
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
            // 查找有实际消息的外部联系人
            const likeConditions = extIds.map(() => 'from_user_id = ? OR to_user_ids LIKE ?').join(' OR ');
            const likeParams = extIds.flatMap(id => [id, `%${id}%`]);
            const msgRecords = await AppDataSource.query(
              `SELECT DISTINCT from_user_id, to_user_ids FROM wecom_chat_records WHERE ${msgWhere} AND (${likeConditions}) LIMIT 200`,
              [...msgParams, ...likeParams]
            );
            for (const rec of msgRecords) {
              // 找到涉及的外部联系人ID
              const fromId = rec.from_user_id || '';
              if (fromId.startsWith('wm') || fromId.startsWith('wo')) {
                agreedStatusMap.set(fromId, true);
              }
              try {
                const toIds = typeof rec.to_user_ids === 'string' ? JSON.parse(rec.to_user_ids) : rec.to_user_ids;
                if (Array.isArray(toIds)) {
                  for (const id of toIds) {
                    if (id && (id.startsWith('wm') || id.startsWith('wo'))) {
                      agreedStatusMap.set(id, true);
                    }
                  }
                }
              } catch { /* ignore */ }
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

        // 从 meta 记录中获取同意状态
        let agreed: boolean | null = null;
        if (externalId && agreedStatusMap.has(externalId)) {
          agreed = agreedStatusMap.get(externalId)!;
        }

        return { ...item, customerName, customerAvatar, memberAvatar, agreed };
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
             is_sensitive AS isSensitive, audit_remark AS auditRemark
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
   * 调用 /chatdata/get_msg_data 获取加密消息 → RSA解密随机密钥 → AES解密消息体 → 存入数据库
   */
  static async syncChatMessages(config: WecomConfig, chatAccessToken: string): Promise<{ savedCount: number; totalFetched: number }> {
    let savedCount = 0;
    let totalFetched = 0;

    // 获取RSA私钥（服务商级别）
    const { WecomSuiteConfig } = await import('../entities/WecomSuiteConfig');
    const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
    const suiteConfig = await suiteRepo.findOne({ where: {}, order: { id: 'ASC' } });
    const rsaPrivateKey = suiteConfig?.chatArchiveRsaPrivateKey;

    if (!rsaPrivateKey) {
      log.warn('[ChatArchive] syncChatMessages: 服务商未配置RSA私钥，无法解密消息。请平台管理员在「服务商应用管理」中配置RSA密钥对');
      throw new Error('平台尚未配置消息解密密钥，请联系平台管理员在管理后台配置（租户无需操作）');
    }

    // 获取上次拉取的游标位置
    let cursor = await this.getSyncCursor(config.id, config.tenantId);
    log.info(`[ChatArchive] syncChatMessages: 开始拉取, configId=${config.id}, cursor=${cursor || '(首次)'}`);

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
        const result = await WecomApiService.getChatMsgData(chatAccessToken, cursor, 200);
        const chatdata = result.chatdata;
        hasMore = result.has_more;
        cursor = result.next_cursor;
        totalFetched += chatdata.length;

        if (chatdata.length === 0) break;

        // 解密并保存每条消息
        for (const item of chatdata) {
          try {
            // 检查是否已存在（去重）
            const existing = await chatRecordRepo.findOne({
              where: { corpId: config.corpId, msgId: item.msgid }
            });
            if (existing) continue;

            // RSA解密 encrypt_random_key → 得到 AES key
            const decryptedKey = this.rsaDecrypt(rsaPrivateKey, item.encrypt_random_key);
            if (!decryptedKey) {
              log.warn(`[ChatArchive] RSA解密失败, msgid=${item.msgid}`);
              continue;
            }

            // AES解密 encrypt_chat_msg → 得到明文消息JSON
            const plainText = this.aesDecrypt(decryptedKey, item.encrypt_chat_msg);
            if (!plainText) {
              log.warn(`[ChatArchive] AES解密失败, msgid=${item.msgid}`);
              continue;
            }

            // 解析消息JSON
            let msgData: any;
            try {
              msgData = JSON.parse(plainText);
            } catch {
              log.warn(`[ChatArchive] 消息JSON解析失败, msgid=${item.msgid}`);
              continue;
            }

            // 提取消息字段
            const msgType = msgData.msgtype || 'unknown';
            const action = msgData.action || 'send';
            const fromUserId = msgData.from || '';
            const toList = msgData.tolist || [];
            const roomId = msgData.roomid || null;
            const msgTime = msgData.msgtime || Date.now();

            // 提取消息内容（根据消息类型）
            let content = '';
            let mediaKey = '';
            if (msgType === 'text') {
              content = JSON.stringify({ text: msgData.text?.content || '' });
            } else if (msgType === 'image') {
              content = JSON.stringify({ image: msgData.image || {} });
              mediaKey = msgData.image?.md5sum || '';
            } else if (msgType === 'voice') {
              content = JSON.stringify({ voice: msgData.voice || {} });
              mediaKey = msgData.voice?.md5sum || '';
            } else if (msgType === 'video') {
              content = JSON.stringify({ video: msgData.video || {} });
              mediaKey = msgData.video?.md5sum || '';
            } else if (msgType === 'file') {
              content = JSON.stringify({ file: msgData.file || {} });
              mediaKey = msgData.file?.md5sum || '';
            } else if (msgType === 'link') {
              content = JSON.stringify({ link: msgData.link || {} });
            } else if (msgType === 'weapp') {
              content = JSON.stringify({ weapp: msgData.weapp || {} });
            } else if (msgType === 'chatrecord') {
              content = JSON.stringify({ chatrecord: msgData.chatrecord || {} });
            } else if (msgType === 'location') {
              content = JSON.stringify({ location: msgData.location || {} });
            } else if (msgType === 'emotion') {
              content = JSON.stringify({ emotion: msgData.emotion || {} });
            } else if (msgType === 'revoke') {
              content = JSON.stringify({ revoke: msgData.revoke || {} });
            } else if (msgType === 'agree' || msgType === 'disagree') {
              content = JSON.stringify({ agree: msgData.agree || msgData.disagree || {} });
            } else {
              // 其他类型，保存原始数据
              content = JSON.stringify(msgData[msgType] || msgData);
            }

            // 判断发送者类型：以 wm/wo 开头的是外部联系人（客户）
            const isExternalSender = fromUserId.startsWith('wm') || fromUserId.startsWith('wo');
            const senderType = isExternalSender ? 2 : 1; // 1=员工 2=客户

            // 获取发送者名称
            let fromUserName = '';
            if (isExternalSender) {
              fromUserName = customerNameMap.get(fromUserId) || fromUserId;
            } else {
              fromUserName = userNameMap.get(fromUserId) || fromUserId;
            }

            // 判断接收者类型
            const receiverType = roomId ? 3 : (toList.some((id: string) => id.startsWith('wm') || id.startsWith('wo')) ? 2 : 1);

            // 保存到数据库
            const record = chatRecordRepo.create({
              tenantId: config.tenantId,
              wecomConfigId: config.id,
              corpId: config.corpId,
              msgId: item.msgid,
              msgType,
              action,
              fromUserId,
              fromUserName,
              toUserIds: JSON.stringify(toList),
              roomId,
              msgTime,
              content,
              mediaKey: mediaKey || null,
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
          await new Promise(r => setTimeout(r, 200));
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
