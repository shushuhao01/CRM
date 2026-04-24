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
  mode: 'http_api' | 'finance_sdk';
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

    // 验证配置
    if (!config.chatArchiveSecret) {
      result.message = '未配置会话存档Secret';
      return result;
    }

    log.info(`[ChatArchive] 开始同步配置 ${config.name}(${configId}) - HTTP API增强模式`);
    lastArchiveSyncMap.set(configId, Date.now());

    try {
      // Step 1: 获取会话存档access_token
      const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'chat');

      // Step 2: 获取开通成员列表
      const permitUserIds = await WecomApiService.getPermitUserList(accessToken);
      result.permitUsers = permitUserIds.length;
      log.info(`[ChatArchive] 配置 ${config.name} 已开通会话存档成员: ${permitUserIds.length} 人`);

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
        externalAccessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
      } catch (e: any) {
        log.warn('[ChatArchive] 获取客户联系Token失败，跳过会话元数据生成:', e.message);
      }

      if (externalAccessToken) {
        const convResult = await this.syncConversationMetadata(config, externalAccessToken, accessToken, permitUserIds);
        result.newConversations = convResult.newConversations;
        result.agreedUsers = convResult.agreedCount;
        result.syncedRecords = convResult.syncedRecords;
      } else {
        // 仅做同意状态抽样检查
        result.agreedUsers = await this.checkAgreeStatus(accessToken, config, permitUserIds);
      }

      // 组装结果消息
      const parts: string[] = [];
      parts.push(`${permitUserIds.length}个开通成员`);
      if (result.agreedUsers > 0) parts.push(`${result.agreedUsers}个已同意存档`);
      if (result.newConversations > 0) parts.push(`新增${result.newConversations}条会话记录`);
      if (result.syncedRecords > 0) parts.push(`更新${result.syncedRecords}条元数据`);

      result.sdkRequired = true;
      result.message = `HTTP API同步完成：${parts.join('，')}。实际消息内容拉取需部署Finance SDK。`;

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
        const externalUserIds = await WecomApiService.getExternalContactList(externalAccessToken, userId)
          .catch(() => [] as string[]);

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
            if (item.status_change_time > 0) {
              agreeMap.set(item.exteranalopenid || item.userid_list?.[0], true);
              agreedCount++;
            }
          }
        } catch (e: any) {
          log.warn(`[ChatArchive] 检查成员 ${userId} 同意状态失败:`, e.message);
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
              // 更新最后活跃时间
              syncedRecords++;
              continue;
            }

            // 获取外部联系人名称（从 WecomCustomer 表）
            const customerName = await this.getCustomerName(config, extUserId);
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

    let where = 'WHERE 1=1';
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
      where += ' AND (cr.from_user_id = ? OR cr.to_user_ids LIKE ?)';
      queryParams.push(userId, `%${userId}%`);
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
         WHERE cr2.from_user_id = cr.from_user_id AND cr2.wecom_config_id = cr.wecom_config_id
         ORDER BY cr2.msg_time DESC LIMIT 1) AS lastContent,
        (SELECT cr2.msg_type FROM wecom_chat_records cr2
         WHERE cr2.from_user_id = cr.from_user_id AND cr2.wecom_config_id = cr.wecom_config_id
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

      const list = await AppDataSource.query(listSql, [...queryParams, pageSize, offset]);

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

    let where = 'WHERE 1=1';
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
  static async getArchiveStats(config: WecomConfig): Promise<{
    totalConversations: number;
    totalRecords: number;
    agreedConversations: number;
    lastSyncTime: string | null;
  }> {
    try {
      const chatRecordRepo = AppDataSource.getRepository(WecomChatRecord);

      const totalRecords = await chatRecordRepo.count({
        where: { wecomConfigId: config.id }
      });

      // 统计不同会话数（去重 fromUserId+toUserIds 组合）
      const convResult = await AppDataSource.query(
        `SELECT COUNT(DISTINCT CONCAT(from_user_id, '-', to_user_ids)) as count
         FROM wecom_chat_records WHERE wecom_config_id = ?`,
        [config.id]
      );
      const totalConversations = convResult[0]?.count || 0;

      // 统计已同意的会话数
      const agreedResult = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM wecom_chat_records
         WHERE wecom_config_id = ? AND msg_type = 'meta' AND content LIKE '%"agreed":true%'`,
        [config.id]
      );
      const agreedConversations = agreedResult[0]?.count || 0;

      // 最后同步时间
      const lastSync = lastArchiveSyncMap.get(config.id);
      const lastSyncTime = lastSync ? new Date(lastSync).toISOString() : null;

      return { totalConversations, totalRecords, agreedConversations, lastSyncTime };
    } catch (e: any) {
      log.error('[ChatArchive] 获取统计信息失败:', e.message);
      return { totalConversations: 0, totalRecords: 0, agreedConversations: 0, lastSyncTime: null };
    }
  }

  /**
   * 安全解析JSON
   */
  private static safeParseJson(str: any, fallback: any): any {
    if (!str || typeof str !== 'string') return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
  }
}

export default WecomChatArchiveService;

