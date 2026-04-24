/**
 * 在线席位服务
 * 核心服务，提供在线席位的计算、检查、管理功能
 *
 * "在线"定义：持有有效JWT且在最近2分钟内有API活动（心跳30秒）
 * 活跃阈值通过 ACTIVE_THRESHOLD_MINUTES 配置
 */
import { AppDataSource } from '../config/database';
import { UserSession } from '../entities/UserSession';
import { Tenant } from '../entities/Tenant';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { log } from '../config/logger';
import { sendSystemMessage } from './messageService';

/** 会话过期阈值：超过此时长无心跳则标记为 expired（仅用于清理关闭浏览器的僵尸会话）
 *  席位计数不使用此阈值，登录即占席位，退出/踢出/浏览器关闭才释放 */
const SESSION_EXPIRE_MINUTES = 15;

/** 内存缓存：批量更新活跃时间，减少DB写入 */
const activityCache: Map<string, { lastActiveAt: Date; dirty: boolean }> = new Map();
/** 批量写入间隔（毫秒）*/
const BATCH_FLUSH_INTERVAL = 15 * 1000; // 15秒，配合2分钟阈值

/** 内存缓存：已确认存在会话的token集合，避免每次请求都查DB */
const sessionExistsCache: Set<string> = new Set();

/** 🔥 内存缓存：已被踢出/过期的token集合，防止auth中间件自动重建被踢会话 */
const kickedTokensCache: Set<string> = new Set();

class OnlineSeatService {
  private flushTimer: NodeJS.Timeout | null = null;
  private tableEnsured = false;

  constructor() {
    // 启动定时批量写入
    this.startBatchFlush();
  }

  /**
   * 🔥 确保 user_sessions 表存在且列完整（首次使用时自动创建/补列）
   * 解决：schema.sql 创建的旧表可能缺少 device_info/logged_out_at/updated_at 等列，
   *       导致 INSERT/UPDATE 语句报 "Unknown column" 而静默失败，所有会话无法记录。
   */
  async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          tenant_id VARCHAR(36) NOT NULL,
          session_token VARCHAR(512) NOT NULL COMMENT 'JWT token标识(jti或token hash)',
          device_type VARCHAR(50) NULL COMMENT '设备类型: web/mobile/app',
          device_info VARCHAR(255) NULL COMMENT '设备信息(User-Agent)',
          ip_address VARCHAR(50) NULL COMMENT '登录IP',
          last_active_at DATETIME NOT NULL COMMENT '最后活跃时间',
          logged_out_at DATETIME NULL COMMENT '主动登出时间',
          status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '会话状态: active/expired/kicked/logged_out',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_sessions_user_id (user_id),
          INDEX idx_user_sessions_tenant_id (tenant_id),
          INDEX idx_user_sessions_session_token (session_token(191)),
          INDEX idx_user_sessions_last_active (last_active_at),
          INDEX idx_user_sessions_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户在线会话表'
      `);

      // 🔥 修复 id 列类型（旧 schema.sql 使用 BIGINT AUTO_INCREMENT，但 service 使用 UUID VARCHAR(36)）
      try {
        const idColInfo = await AppDataSource.query(
          `SELECT DATA_TYPE, COLUMN_TYPE, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions' AND COLUMN_NAME = 'id'`
        );
        if (idColInfo.length > 0 && idColInfo[0].DATA_TYPE === 'bigint') {
          log.info('[OnlineSeat] 检测到 id 列为 BIGINT，正在迁移为 VARCHAR(36)...');
          // 先清空旧的不兼容数据（BIGINT id 无法保留为 UUID 格式）
          await AppDataSource.query(`DELETE FROM user_sessions`);
          await AppDataSource.query(`ALTER TABLE user_sessions MODIFY COLUMN id VARCHAR(36) NOT NULL COMMENT '会话ID(UUID)'`);
          log.info('[OnlineSeat] ✅ id 列已从 BIGINT 迁移为 VARCHAR(36)');
        }
      } catch (idErr: any) {
        log.warn('[OnlineSeat] 修复 id 列类型失败:', idErr?.message?.substring(0, 100));
      }

      // 🔥 修复 session_token 列宽度（旧 schema 可能是 VARCHAR(64)，需要 VARCHAR(512)）
      try {
        const stColInfo = await AppDataSource.query(
          `SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions' AND COLUMN_NAME = 'session_token'`
        );
        if (stColInfo.length > 0 && Number(stColInfo[0].CHARACTER_MAXIMUM_LENGTH) < 512) {
          await AppDataSource.query(`ALTER TABLE user_sessions MODIFY COLUMN session_token VARCHAR(512) NOT NULL COMMENT 'JWT token标识(jti或token hash)'`);
          log.info('[OnlineSeat] ✅ session_token 列已扩展为 VARCHAR(512)');
        }
      } catch (stErr: any) {
        log.warn('[OnlineSeat] 修复 session_token 列宽度失败:', stErr?.message?.substring(0, 80));
      }

      // 🔥 修复表排序规则（确保与其他表一致为 utf8mb4_unicode_ci）
      try {
        const tableInfo = await AppDataSource.query(
          `SELECT TABLE_COLLATION FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions'`
        );
        if (tableInfo.length > 0 && tableInfo[0].TABLE_COLLATION !== 'utf8mb4_unicode_ci') {
          await AppDataSource.query(`ALTER TABLE user_sessions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
          log.info('[OnlineSeat] ✅ 表排序规则已修正为 utf8mb4_unicode_ci');
        }
      } catch (collErr: any) {
        log.warn('[OnlineSeat] 修复表排序规则失败:', collErr?.message?.substring(0, 80));
      }

      // 🔥 修复 device_type 列类型（旧 schema 可能是 ENUM，需要 VARCHAR 以支持 'web' 等值）
      try {
        const dtColInfo = await AppDataSource.query(
          `SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions' AND COLUMN_NAME = 'device_type'`
        );
        if (dtColInfo.length > 0 && dtColInfo[0].DATA_TYPE === 'enum') {
          await AppDataSource.query(`ALTER TABLE user_sessions MODIFY COLUMN device_type VARCHAR(50) NULL COMMENT '设备类型: web/mobile/app'`);
          log.info('[OnlineSeat] ✅ device_type 列已从 ENUM 改为 VARCHAR(50)');
        }
      } catch (dtErr: any) {
        log.warn('[OnlineSeat] 修复 device_type 列失败:', dtErr?.message?.substring(0, 80));
      }

      // 🔥 修复 status 列类型（旧 schema 可能是 ENUM，需要 VARCHAR 以支持 'logged_out' 等值）
      try {
        const stColInfo = await AppDataSource.query(
          `SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions' AND COLUMN_NAME = 'status'`
        );
        if (stColInfo.length > 0 && stColInfo[0].DATA_TYPE === 'enum') {
          await AppDataSource.query(`ALTER TABLE user_sessions MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '会话状态: active/expired/kicked/logged_out'`);
          log.info('[OnlineSeat] ✅ status 列已从 ENUM 改为 VARCHAR(20)');
        }
      } catch (statusErr: any) {
        log.warn('[OnlineSeat] 修复 status 列失败:', statusErr?.message?.substring(0, 80));
      }

      // 🔥 修复 expires_at 列约束（旧表可能是 NOT NULL 无默认值，导致 INSERT 缺字段报错）
      try {
        const eaColInfo = await AppDataSource.query(
          `SELECT IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions' AND COLUMN_NAME = 'expires_at'`
        );
        if (eaColInfo.length > 0 && eaColInfo[0].IS_NULLABLE === 'NO') {
          await AppDataSource.query(`ALTER TABLE user_sessions MODIFY COLUMN expires_at DATETIME NULL COMMENT 'Token过期时间（可选）'`);
          log.info('[OnlineSeat] ✅ expires_at 列已改为 NULLABLE');
        }
      } catch (eaErr: any) {
        log.warn('[OnlineSeat] 修复 expires_at 列失败:', eaErr?.message?.substring(0, 80));
      }

      // 🔥 自动补全可能缺失的列（schema.sql 旧版本创建的表可能缺列）
      const missingCols: Array<{ name: string; ddl: string }> = [
        { name: 'device_info', ddl: "ADD COLUMN `device_info` VARCHAR(255) NULL COMMENT '设备信息(User-Agent)' AFTER `device_type`" },
        { name: 'logged_out_at', ddl: "ADD COLUMN `logged_out_at` DATETIME NULL COMMENT '主动登出时间' AFTER `last_active_at`" },
        { name: 'updated_at', ddl: "ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'" },
      ];
      for (const col of missingCols) {
        try {
          const exists = await AppDataSource.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions' AND COLUMN_NAME = ?`,
            [col.name]
          );
          if (exists.length === 0) {
            await AppDataSource.query(`ALTER TABLE user_sessions ${col.ddl}`);
            log.info(`[OnlineSeat] ✅ 已补全 user_sessions.${col.name} 列`);
          }
        } catch (alterErr: any) {
          log.warn(`[OnlineSeat] 补全列 ${col.name} 失败:`, alterErr?.message?.substring(0, 80));
        }
      }

      this.tableEnsured = true;
      log.info('[OnlineSeat] user_sessions 表已就绪（列完整性已校验）');
    } catch (error: any) {
      log.error('[OnlineSeat] 确保user_sessions表失败:', error?.message);
    }
  }

  /**
   * 生成 session token（基于JWT token的hash）
   */
  generateSessionToken(jwtToken: string): string {
    return crypto.createHash('sha256').update(jwtToken).digest('hex').substring(0, 64);
  }

  /**
   * 创建用户会话（登录时调用）
   */
  async createSession(params: {
    userId: string;
    tenantId: string;
    sessionToken: string;
    deviceType?: string;
    deviceInfo?: string;
    ipAddress?: string;
  }): Promise<UserSession> {
    try {
      await this.ensureTable();
      const sessionId = uuidv4();
      // 🔥 使用 raw SQL 而非 TypeORM repository.save()，避免 entity/table schema 不匹配导致静默失败
      await AppDataSource.query(
        `INSERT INTO user_sessions (id, user_id, tenant_id, session_token, device_type, device_info, ip_address, last_active_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'active', NOW(), NOW())`,
        [sessionId, params.userId, params.tenantId, params.sessionToken, params.deviceType || 'web', params.deviceInfo?.substring(0, 255) || null, params.ipAddress || null]
      );
      sessionExistsCache.add(params.sessionToken);
      log.info(`[OnlineSeat] 创建会话成功: userId=${params.userId}, tenantId=${params.tenantId}, sessionId=${sessionId}`);
      return { id: sessionId, userId: params.userId, tenantId: params.tenantId, sessionToken: params.sessionToken, status: 'active', lastActiveAt: new Date() } as UserSession;
    } catch (error) {
      log.error('[OnlineSeat] 创建会话失败:', error);
      throw error;
    }
  }

  /**
   * 更新会话活跃时间（通过内存缓存批量写入）
   */
  updateActivity(sessionToken: string): void {
    activityCache.set(sessionToken, {
      lastActiveAt: new Date(),
      dirty: true
    });
  }

  /**
   * 🔥 检查会话token是否已被踢出（供auth中间件调用）
   * 优先查内存缓存，缓存未命中时查DB
   */
  async isSessionKicked(sessionToken: string): Promise<boolean> {
    // 内存缓存快速判断
    if (kickedTokensCache.has(sessionToken)) return true;
    try {
      const result = await AppDataSource.query(
        `SELECT status FROM user_sessions WHERE session_token = ? ORDER BY created_at DESC LIMIT 1`,
        [sessionToken]
      );
      if (result.length > 0 && (result[0].status === 'kicked' || result[0].status === 'expired' || result[0].status === 'logged_out')) {
        kickedTokensCache.add(sessionToken);
        return true;
      }
    } catch (_e) {
      // 查询失败时不阻塞（容错）
    }
    return false;
  }

  /**
   * 🔥 确保会话记录存在（auth中间件异步调用）
   * 如果DB中没有该sessionToken的活跃记录，则自动创建一条
   * 解决：已登录用户因表不存在/重启等原因丢失会话记录的问题
   * 🔥 修复：被踢出/过期的会话不再自动重建，避免踢人后立刻恢复在线
   */
  async ensureSessionExists(params: {
    sessionToken: string;
    userId: string;
    tenantId: string;
    deviceInfo?: string;
    ipAddress?: string;
  }): Promise<void> {
    // 🔥 内存缓存：已确认存在的session不再查DB
    if (sessionExistsCache.has(params.sessionToken)) return;

    // 🔥 已被踢出/过期的token，绝对不重建
    if (kickedTokensCache.has(params.sessionToken)) return;

    try {
      await this.ensureTable();

      // 🔥 先检查是否存在任何状态的记录（含kicked/expired/logged_out）
      const anyRecord = await AppDataSource.query(
        `SELECT id, status FROM user_sessions WHERE session_token = ? ORDER BY created_at DESC LIMIT 1`,
        [params.sessionToken]
      );

      if (anyRecord.length > 0) {
        if (anyRecord[0].status === 'active') {
          // 已有活跃会话，加入缓存
          sessionExistsCache.add(params.sessionToken);
          return;
        }
        // 🔥 会话已被踢出/过期/登出 → 不重建，加入已踢缓存
        kickedTokensCache.add(params.sessionToken);
        log.info(`[OnlineSeat] 会话已${anyRecord[0].status}，拒绝重建: token=${params.sessionToken.substring(0, 8)}...`);
        return;
      }

      // 🔥 完全没有记录（首次或服务器重启后）→ 检查席位后决定是否创建
      const seatCheck = await this.checkLoginAllowed(params.tenantId, params.userId);
      if (!seatCheck.allowed) {
        // 席位已满，不创建新会话
        kickedTokensCache.add(params.sessionToken);
        log.info(`[OnlineSeat] 席位已满，拒绝补建会话: userId=${params.userId}`);
        return;
      }

      await AppDataSource.query(
        `INSERT INTO user_sessions (id, user_id, tenant_id, session_token, device_type, device_info, ip_address, last_active_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'web', ?, ?, NOW(), 'active', NOW(), NOW())`,
        [uuidv4(), params.userId, params.tenantId, params.sessionToken, params.deviceInfo?.substring(0, 255) || null, params.ipAddress || null]
      );
      sessionExistsCache.add(params.sessionToken);
      log.info(`[OnlineSeat] 自动补建会话: userId=${params.userId}`);
    } catch (error: any) {
      // 可能是并发插入导致的重复key，忽略
      if (!error?.message?.includes('Duplicate')) {
        log.warn('[OnlineSeat] 确保会话存在失败:', error?.message);
      }
    }
  }

  /**
   * 获取会话状态（用于心跳检测是否被踢出）
   */
  async getSessionStatus(sessionToken: string): Promise<string> {
    try {
      await this.ensureTable();
      const result = await AppDataSource.query(
        `SELECT status FROM user_sessions WHERE session_token = ? LIMIT 1`,
        [sessionToken]
      );
      return result[0]?.status || 'not_found';
    } catch (error) {
      log.error('[OnlineSeat] 获取会话状态失败:', error);
      return 'active'; // 查询失败时默认活跃（容错）
    }
  }

  /**
   * 直接更新会话活跃时间（心跳API使用）
   */
  async updateActivityDirect(sessionToken: string): Promise<void> {
    try {
      await AppDataSource.query(
        `UPDATE user_sessions SET last_active_at = NOW(), updated_at = NOW() WHERE session_token = ? AND status = 'active'`,
        [sessionToken]
      );
      // 同时更新缓存
      activityCache.set(sessionToken, {
        lastActiveAt: new Date(),
        dirty: false
      });
    } catch (error) {
      log.error('[OnlineSeat] 更新活跃时间失败:', error);
    }
  }

  /**
   * 获取租户当前在线席位数
   */
  async getOnlineCount(tenantId: string): Promise<number> {
    try {
      await this.ensureTable();
      // 🔥 席位计数：统计所有 status='active' 的会话，不看 last_active_at
      // 登录即占席位，退出/踢出/会话过期才释放
      const result = await AppDataSource.query(
        `SELECT COUNT(DISTINCT user_id) as cnt FROM user_sessions
         WHERE tenant_id = ? AND status = 'active'`,
        [tenantId]
      );
      const cnt = Number(result[0]?.cnt || 0);
      log.info(`[OnlineSeat] getOnlineCount: tenantId=${tenantId}, count=${cnt}`);
      return cnt;
    } catch (error) {
      log.error('[OnlineSeat] 获取在线人数失败:', error);
      return 0;
    }
  }

  /**
   * 获取租户内所有在线用户ID集合（用于用户列表在线状态标记）
   */
  async getOnlineUserIds(tenantId: string): Promise<Set<string>> {
    try {
      await this.ensureTable();
      // 🔥 登录即在线，统计所有 status='active' 的用户
      const result = await AppDataSource.query(
        `SELECT DISTINCT user_id FROM user_sessions
         WHERE tenant_id = ? AND status = 'active'`,
        [tenantId]
      );
      return new Set(result.map((r: any) => r.user_id));
    } catch (error) {
      log.error('[OnlineSeat] 获取在线用户ID列表失败:', error);
      return new Set();
    }
  }

  /**
   * 获取租户的在线席位详情
   * 🔥 按 user_id 去重：每个在线用户只显示一条记录（最新活跃的那条）
   */
  async getOnlineSessions(tenantId: string, page: number = 1, pageSize: number = 10): Promise<{ sessions: any[]; total: number }> {
    try {
      await this.ensureTable();
      // 🔥 统计在线用户数（按user_id去重），而非会话总数
      const countResult = await AppDataSource.query(
        `SELECT COUNT(DISTINCT us.user_id) as cnt FROM user_sessions us
         WHERE us.tenant_id = ? AND us.status = 'active'`,
        [tenantId]
      );
      const total = Number(countResult[0]?.cnt || 0);

      const offset = (page - 1) * pageSize;
      // 🔥 每个用户只取最新活跃的一条会话记录
      const sessions = await AppDataSource.query(
        `SELECT latest.id, latest.user_id, latest.device_type, latest.device_info, latest.ip_address,
                latest.last_active_at, latest.created_at,
                u.username, u.real_name, d.name as department_name
         FROM (
           SELECT us.*,
                  ROW_NUMBER() OVER (PARTITION BY us.user_id ORDER BY us.last_active_at DESC) as rn
           FROM user_sessions us
           WHERE us.tenant_id = ? AND us.status = 'active'
         ) latest
         LEFT JOIN users u ON latest.user_id = u.id AND u.tenant_id = ?
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE latest.rn = 1
         ORDER BY latest.last_active_at DESC
         LIMIT ? OFFSET ?`,
        [tenantId, tenantId, pageSize, offset]
      );
      return { sessions, total };
    } catch (error) {
      log.error('[OnlineSeat] 获取在线会话列表失败:', error);
      return { sessions: [], total: 0 };
    }
  }

  /**
   * 检查是否可以登录（在线席位模式）
   * 返回 { allowed, onlineCount, maxSeats, message }
   */
  async checkLoginAllowed(tenantId: string, userId: string, userInfo?: { realName?: string; departmentName?: string }): Promise<{
    allowed: boolean;
    onlineCount: number;
    maxSeats: number;
    message?: string;
  }> {
    try {
      await this.ensureTable();
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

      if (!tenant) {
        return { allowed: false, onlineCount: 0, maxSeats: 0, message: '租户不存在' };
      }

      // 非在线席位模式，不限制（total模式不需要在线席位检查）
      if (tenant.userLimitMode !== 'online' && tenant.userLimitMode !== 'both') {
        return { allowed: true, onlineCount: 0, maxSeats: 0 };
      }

      const maxSeats = tenant.getEffectiveMaxOnlineSeats();
      if (maxSeats <= 0) {
        return { allowed: true, onlineCount: 0, maxSeats: 0 };
      }

      // 检查该用户是否已有活跃会话（同一用户不重复占用席位）
      const existingActive = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM user_sessions
         WHERE tenant_id = ? AND user_id = ? AND status = 'active'`,
        [tenantId, userId]
      );
      const userAlreadyOnline = Number(existingActive[0]?.cnt || 0) > 0;

      if (userAlreadyOnline) {
        // 用户已在线，允许新的会话（多标签页/多设备），不额外占用席位
        const onlineCount = await this.getOnlineCount(tenantId);
        return { allowed: true, onlineCount, maxSeats };
      }

      // 用户不在线，检查席位是否已满
      const onlineCount = await this.getOnlineCount(tenantId);

      if (onlineCount >= maxSeats) {
        // 🔥 席位满时异步通知管理员和超级管理员
        this.notifyAdminsOnSeatFull(tenantId, onlineCount, maxSeats, userInfo).catch(() => {});
        return {
          allowed: false,
          onlineCount,
          maxSeats,
          message: `在线席位已满（${onlineCount}/${maxSeats}），请稍后重试或联系管理员踢出闲置用户`
        };
      }

      return { allowed: true, onlineCount, maxSeats };
    } catch (error) {
      log.error('[OnlineSeat] 检查登录席位失败:', error);
      // 检查失败时默认允许（容错）
      return { allowed: true, onlineCount: 0, maxSeats: 0 };
    }
  }

  /**
   * 注销会话（登出时调用）
   * 🔥 登出后加入已踢缓存并同步租户在线数
   */
  async destroySession(sessionToken: string): Promise<void> {
    try {
      // 🔥 先获取tenantId用于同步在线数
      const sessionInfo = await AppDataSource.query(
        `SELECT tenant_id, user_id FROM user_sessions WHERE session_token = ? AND status = 'active' LIMIT 1`,
        [sessionToken]
      );
      await AppDataSource.query(
        `UPDATE user_sessions SET status = 'logged_out', logged_out_at = NOW(), updated_at = NOW()
         WHERE session_token = ? AND status = 'active'`,
        [sessionToken]
      );
      activityCache.delete(sessionToken);
      sessionExistsCache.delete(sessionToken);
      kickedTokensCache.add(sessionToken);
      log.info(`[OnlineSeat] 会话已注销: ${sessionToken.substring(0, 8)}...`);
      // 🔥 同步租户在线数
      if (sessionInfo.length > 0 && sessionInfo[0].tenant_id) {
        await this.syncTenantOnlineCount(sessionInfo[0].tenant_id);
      }
    } catch (error) {
      log.error('[OnlineSeat] 注销会话失败:', error);
    }
  }

  /**
   * 强制踢出用户会话（管理员操作）
   * 🔥 踢出后立即释放席位并同步在线数
   */
  async forceKickSession(sessionId: string, tenantId: string): Promise<boolean> {
    try {
      // 获取被踢出会话的token和user_id以清理缓存
      const sessions = await AppDataSource.query(
        `SELECT session_token, user_id FROM user_sessions WHERE id = ? AND tenant_id = ? AND status = 'active'`,
        [sessionId, tenantId]
      );
      const result = await AppDataSource.query(
        `UPDATE user_sessions SET status = 'kicked', logged_out_at = NOW(), updated_at = NOW()
         WHERE id = ? AND tenant_id = ? AND status = 'active'`,
        [sessionId, tenantId]
      );
      // 🔥 清理缓存 + 加入已踢缓存，防止auth中间件自动重建
      for (const s of sessions) {
        sessionExistsCache.delete(s.session_token);
        activityCache.delete(s.session_token);
        kickedTokensCache.add(s.session_token);
      }
      // 🔥 踢出该用户的所有其他活跃会话（确保彻底释放席位）
      if (sessions.length > 0) {
        const userId = sessions[0].user_id;
        const otherSessions = await AppDataSource.query(
          `SELECT session_token FROM user_sessions WHERE user_id = ? AND tenant_id = ? AND status = 'active'`,
          [userId, tenantId]
        );
        if (otherSessions.length > 0) {
          await AppDataSource.query(
            `UPDATE user_sessions SET status = 'kicked', logged_out_at = NOW(), updated_at = NOW()
             WHERE user_id = ? AND tenant_id = ? AND status = 'active'`,
            [userId, tenantId]
          );
          for (const os of otherSessions) {
            sessionExistsCache.delete(os.session_token);
            activityCache.delete(os.session_token);
            kickedTokensCache.add(os.session_token);
          }
        }
      }
      // 🔥 立即同步租户在线数
      await this.syncTenantOnlineCount(tenantId);
      return result.affectedRows > 0;
    } catch (error) {
      log.error('[OnlineSeat] 强制踢出会话失败:', error);
      return false;
    }
  }

  /**
   * 强制踢出用户的所有会话
   * 🔥 踢出后立即释放席位并同步在线数
   */
  async forceKickUser(userId: string, tenantId: string): Promise<number> {
    try {
      // 🔥 先获取所有活跃会话的token，加入已踢缓存
      const activeSessions = await AppDataSource.query(
        `SELECT session_token FROM user_sessions WHERE user_id = ? AND tenant_id = ? AND status = 'active'`,
        [userId, tenantId]
      );
      const result = await AppDataSource.query(
        `UPDATE user_sessions SET status = 'kicked', logged_out_at = NOW(), updated_at = NOW()
         WHERE user_id = ? AND tenant_id = ? AND status = 'active'`,
        [userId, tenantId]
      );
      // 🔥 清理缓存 + 加入已踢缓存
      for (const s of activeSessions) {
        sessionExistsCache.delete(s.session_token);
        activityCache.delete(s.session_token);
        kickedTokensCache.add(s.session_token);
      }
      // 🔥 立即同步租户在线数
      await this.syncTenantOnlineCount(tenantId);
      return result.affectedRows || 0;
    } catch (error) {
      log.error('[OnlineSeat] 强制踢出用户所有会话失败:', error);
      return 0;
    }
  }

  /**
   * 清理过期会话（定时任务调用）
   * 将超过活跃阈值的会话标记为 expired
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      await this.ensureTable();
      // 🔥 仅清理真正的僵尸会话（浏览器关闭后心跳停止超过 SESSION_EXPIRE_MINUTES）
      const result = await AppDataSource.query(
        `UPDATE user_sessions SET status = 'expired', updated_at = NOW()
         WHERE status = 'active'
         AND last_active_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [SESSION_EXPIRE_MINUTES]
      );
      const affected = result.affectedRows || 0;
      if (affected > 0) {
        log.info(`[OnlineSeat] 已清理 ${affected} 个过期会话`);
      }

      // 同步更新各租户的 current_online_seats
      await this.syncAllTenantOnlineCount();

      // 🔥 清理完过期会话后，检查并踢出超席位的用户
      await this.enforceExcessKick();

      return affected;
    } catch (error) {
      log.error('[OnlineSeat] 清理过期会话失败:', error);
      return 0;
    }
  }

  /**
   * 🔥 强制踢出超额在线用户（当在线数 > 席位上限时）
   * 保留最新活跃的用户，踢出最久不活跃的用户
   * 场景：管理员下调席位上限后、模式切换后
   */
  async enforceExcessKick(): Promise<number> {
    try {
      await this.ensureTable();
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const tenants = await tenantRepo.find({
        where: [
          { userLimitMode: 'online' as any },
          { userLimitMode: 'both' as any }
        ]
      });

      let totalKicked = 0;

      for (const tenant of tenants) {
        const maxSeats = tenant.getEffectiveMaxOnlineSeats();
        if (maxSeats <= 0) continue;

        const onlineCount = await this.getOnlineCount(tenant.id);
        if (onlineCount <= maxSeats) continue;

        // 需要踢出的人数
        const excessCount = onlineCount - maxSeats;
        log.info(`[OnlineSeat] 租户 ${tenant.id} 在线 ${onlineCount} 超过席位 ${maxSeats}，需踢出 ${excessCount} 人`);

        // 🔥 按用户维度获取最久不活跃的用户（每人取最新活跃时间）
        const leastActiveUsers = await AppDataSource.query(
          `SELECT user_id, MAX(last_active_at) as latest_active
           FROM user_sessions
           WHERE tenant_id = ? AND status = 'active'
           GROUP BY user_id
           ORDER BY latest_active ASC
           LIMIT ?`,
          [tenant.id, excessCount]
        );

        for (const row of leastActiveUsers) {
          const kicked = await this.forceKickUser(row.user_id, tenant.id);
          if (kicked > 0) {
            totalKicked++;
            log.info(`[OnlineSeat] 自动踢出超额用户: userId=${row.user_id}, lastActive=${row.latest_active}`);
          }
        }

        // 同步租户在线数
        await this.syncTenantOnlineCount(tenant.id);
      }

      if (totalKicked > 0) {
        log.info(`[OnlineSeat] 共自动踢出 ${totalKicked} 个超额在线用户`);
      }
      return totalKicked;
    } catch (error) {
      log.error('[OnlineSeat] 强制踢出超额用户失败:', error);
      return 0;
    }
  }

  /**
   * 同步指定租户的当前在线人数到 tenants 表（踢人/登出后立即调用）
   */
  async syncTenantOnlineCount(tenantId: string): Promise<void> {
    try {
      const count = await this.getOnlineCount(tenantId);
      await AppDataSource.query(
        `UPDATE tenants SET current_online_seats = ? WHERE id = ?`,
        [count, tenantId]
      );
      log.info(`[OnlineSeat] 已同步租户在线数: tenantId=${tenantId}, count=${count}`);
    } catch (error) {
      log.error('[OnlineSeat] 同步租户在线人数失败:', error);
    }
  }

  /**
   * 同步所有租户的当前在线人数到 tenants 表
   */
  async syncAllTenantOnlineCount(): Promise<void> {
    try {
      // 🔥 同步席位数：统计所有 status='active' 的会话（登录即占席位）
      await AppDataSource.query(
        `UPDATE tenants t SET t.current_online_seats = (
          SELECT COUNT(DISTINCT us.user_id) FROM user_sessions us
          WHERE us.tenant_id COLLATE utf8mb4_unicode_ci = t.id AND us.status = 'active'
        ) WHERE t.user_limit_mode IN ('online', 'both')`
      );
    } catch (error) {
      log.error('[OnlineSeat] 同步所有租户在线人数失败:', error);
    }
  }

  /**
   * 获取租户在线席位统计
   */
  async getTenantSeatStats(tenantId: string): Promise<{
    mode: string;
    maxSeats: number;
    onlineCount: number;
    maxUsers: number;
    currentUsers: number;
  }> {
    try {
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

      if (!tenant) {
        log.warn(`[OnlineSeat] getTenantSeatStats: 租户不存在 tenantId=${tenantId}`);
        return { mode: 'total', maxSeats: 0, onlineCount: 0, maxUsers: 0, currentUsers: 0 };
      }

      log.info(`[OnlineSeat] getTenantSeatStats: tenantId=${tenantId}, userLimitMode=${tenant.userLimitMode}, maxOnlineSeats=${tenant.maxOnlineSeats}`);

      const needOnlineCount = tenant.userLimitMode === 'online' || tenant.userLimitMode === 'both';
      const onlineCount = needOnlineCount
        ? await this.getOnlineCount(tenantId)
        : 0;
      log.info(`[OnlineSeat] getTenantSeatStats: needOnlineCount=${needOnlineCount}, onlineCount=${onlineCount}`);

      return {
        mode: tenant.userLimitMode,
        maxSeats: tenant.getEffectiveMaxOnlineSeats(),
        onlineCount,
        maxUsers: tenant.maxUsers,
        currentUsers: tenant.userCount
      };
    } catch (error) {
      log.error('[OnlineSeat] 获取席位统计失败:', error);
      return { mode: 'total', maxSeats: 0, onlineCount: 0, maxUsers: 0, currentUsers: 0 };
    }
  }

  /**
   * 启动批量写入定时器
   */
  private startBatchFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flushActivityCache().catch(err => {
        log.error('[OnlineSeat] 批量写入活跃时间失败:', err);
      });
    }, BATCH_FLUSH_INTERVAL);
    // 允许进程正常退出
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * 将缓存中的活跃时间批量写入数据库
   */
  private async flushActivityCache(): Promise<void> {
    const dirtyEntries: Array<{ token: string; time: Date }> = [];
    activityCache.forEach((val, key) => {
      if (val.dirty) {
        dirtyEntries.push({ token: key, time: val.lastActiveAt });
        val.dirty = false;
      }
    });

    if (dirtyEntries.length === 0) return;

    // 批量更新（CASE WHEN 方式，单次SQL）
    try {
      await this.ensureTable();
      const tokens = dirtyEntries.map(e => e.token);
      // 分批处理，每批最多100条
      for (let i = 0; i < tokens.length; i += 100) {
        const batch = dirtyEntries.slice(i, i + 100);
        const placeholders = batch.map(() => '?').join(',');
        await AppDataSource.query(
          `UPDATE user_sessions SET last_active_at = NOW(), updated_at = NOW()
           WHERE session_token IN (${placeholders}) AND status = 'active'`,
          batch.map(e => e.token)
        );
      }
    } catch (error) {
      log.error('[OnlineSeat] 批量写入活跃时间失败:', error);
    }

    // 清理已失效的缓存条目（超过2倍阈值未更新的）
    const expireTime = SESSION_EXPIRE_MINUTES * 2 * 60 * 1000;
    const now = Date.now();
    activityCache.forEach((val, key) => {
      if (now - val.lastActiveAt.getTime() > expireTime) {
        activityCache.delete(key);
      }
    });

    // 🔥 定期清理 kickedTokensCache 防止内存无限增长（超过5000条时清空，DB查询会自动重建）
    if (kickedTokensCache.size > 5000) {
      kickedTokensCache.clear();
      log.info('[OnlineSeat] kickedTokensCache 已清理（超过5000条）');
    }
  }

  /**
   * 🔥 在线席位满时通知管理员和超级管理员
   * 防抖：同一租户5分钟内只通知一次
   */
  private seatFullNotifyCache: Map<string, number> = new Map();

  private async notifyAdminsOnSeatFull(tenantId: string, onlineCount: number, maxSeats: number, userInfo?: { realName?: string; departmentName?: string }): Promise<void> {
    try {
      // 防抖：5分钟内不重复通知
      const lastNotify = this.seatFullNotifyCache.get(tenantId) || 0;
      if (Date.now() - lastNotify < 5 * 60 * 1000) return;
      this.seatFullNotifyCache.set(tenantId, Date.now());

      // 查询管理员和超级管理员（users 表使用 role 字段或 role_id 关联 roles 表）
      const admins = await AppDataSource.query(
        `SELECT u.id FROM users u
         LEFT JOIN roles r ON u.role_id = r.id AND r.tenant_id = u.tenant_id
         WHERE u.tenant_id = ? AND u.status = 'active'
         AND (u.role IN ('admin', 'super_admin') OR r.name IN ('admin', 'super_admin', '管理员', '超级管理员'))`,
        [tenantId]
      );

      if (admins.length === 0) return;

      const memberDesc = userInfo?.realName
        ? `${userInfo.departmentName || '未分配部门'} - ${userInfo.realName}`
        : '某成员';
      const title = '席位不足无法登录';
      const content = `${memberDesc} 因席位不足无法登录，请及时处理。当前在线 ${onlineCount} 人，席位上限 ${maxSeats} 个。请前往用户管理页面踢出闲置用户，或升级套餐扩充席位。`;

      for (const admin of admins) {
        await sendSystemMessage({
          type: 'online_seat_full',
          title,
          content,
          targetUserId: admin.id,
          priority: 'high',
          category: '系统告警',
          actionUrl: '/system/user'
        }).catch(e => log.warn('[OnlineSeat] 通知管理员失败:', (e as any)?.message));
      }

      log.info(`[OnlineSeat] 席位满通知已发送给 ${admins.length} 位管理员`);
    } catch (error) {
      log.error('[OnlineSeat] 通知管理员失败:', error);
    }
  }
}

export const onlineSeatService = new OnlineSeatService();
