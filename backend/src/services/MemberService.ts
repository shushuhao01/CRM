/**
 * 会员中心服务
 * 处理会员登录、资料管理、账单查询等
 */
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { generateMemberToken } from '../middleware/memberAuth';
import { verificationCodeService } from './VerificationCodeService';
import { log } from '../config/logger';

export class MemberService {

  /**
   * 🔒 临时选择Token缓存（验证码登录+多租户时使用）
   * key: selectToken, value: { phone, tenantIds, expiresAt }
   */
  private selectTokenStore = new Map<string, { phone: string; tenantIds: string[]; expiresAt: number }>();

  /**
   * 生成临时选择Token（5分钟有效）
   */
  private generateSelectToken(phone: string, tenantIds: string[]): string {
    const token = uuidv4();
    this.selectTokenStore.set(token, {
      phone,
      tenantIds,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    // 清理过期token
    for (const [k, v] of this.selectTokenStore) {
      if (v.expiresAt < Date.now()) this.selectTokenStore.delete(k);
    }
    return token;
  }

  /**
   * 验证并消费临时选择Token
   */
  private verifySelectToken(token: string, phone: string, tenantId: string): boolean {
    const data = this.selectTokenStore.get(token);
    if (!data) return false;
    if (data.expiresAt < Date.now()) { this.selectTokenStore.delete(token); return false; }
    if (data.phone !== phone) return false;
    if (!data.tenantIds.includes(tenantId)) return false;
    this.selectTokenStore.delete(token);
    return true;
  }

  /**
   * 会员登录（密码方式）
   * 支持 tenantId 参数指定登录哪个租户（同手机号多租户隔离）
   */
  async loginByPassword(phone: string, password: string, ip?: string, userAgent?: string, tenantId?: string): Promise<{
    success: boolean; message: string; data?: any
  }> {
    try {
      // 🔒 多租户隔离：如果指定了tenantId，精确匹配；否则查全部
      let tenants;
      if (tenantId) {
        tenants = await AppDataSource.query(
          'SELECT id, code, name, phone, contact, email, password_hash, status FROM tenants WHERE phone = ? AND id = ?',
          [phone, tenantId]
        );
      } else {
        tenants = await AppDataSource.query(
          'SELECT id, code, name, phone, contact, email, password_hash, status FROM tenants WHERE phone = ?',
          [phone]
        );
      }

      if (tenants.length === 0) {
        await this.logLogin(null, 'password', 'failed', '账号不存在', ip, userAgent);
        return { success: false, message: '手机号未注册，请先注册' };
      }

      // 🔒 同手机号多租户：返回租户列表让前端选择
      if (tenants.length > 1 && !tenantId) {
        const activeTenants = tenants.filter((t: any) => t.status !== 'disabled' && t.status !== 'deleted');
        if (activeTenants.length === 0) {
          return { success: false, message: '该手机号关联的所有账号均已被禁用' };
        }
        // 对每个租户验证密码，收集匹配的
        const matchedTenants = [];
        for (const t of activeTenants) {
          if (t.password_hash) {
            const isMatch = await bcrypt.compare(password, t.password_hash);
            if (isMatch) {
              matchedTenants.push({
                id: t.id,
                code: t.code,
                name: t.name,
                contact: t.contact
              });
            }
          }
        }
        if (matchedTenants.length === 0) {
          await this.logLogin(null, 'password', 'failed', '密码错误(多租户)', ip, userAgent);
          return { success: false, message: '密码错误' };
        }
        if (matchedTenants.length === 1) {
          // 密码只匹配一个租户，直接登录
          const matched = activeTenants.find((t: any) => t.id === matchedTenants[0].id);
          return await this.completeLogin(matched, 'password', ip, userAgent);
        }
        // 密码匹配多个租户，返回列表让前端选
        return {
          success: false,
          message: '该手机号关联多个企业账号，请选择要登录的企业',
          data: { needSelectTenant: true, tenants: matchedTenants }
        };
      }

      const tenant = tenants[0];

      if (tenant.status === 'disabled' || tenant.status === 'deleted') {
        await this.logLogin(tenant.id, 'password', 'failed', '账号已禁用', ip, userAgent);
        return { success: false, message: '账号已被禁用，请联系客服' };
      }

      if (!tenant.password_hash) {
        return { success: false, message: '尚未设置密码，请使用验证码登录或先设置密码' };
      }

      const isMatch = await bcrypt.compare(password, tenant.password_hash);
      if (!isMatch) {
        await this.logLogin(tenant.id, 'password', 'failed', '密码错误', ip, userAgent);
        return { success: false, message: '密码错误' };
      }

      return await this.completeLogin(tenant, 'password', ip, userAgent);
    } catch (error: any) {
      log.error('[MemberService] 密码登录失败:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    }
  }

  /**
   * 会员登录（验证码方式）
   * 支持 tenantId 参数指定登录哪个租户（同手机号多租户隔离）
   */
  async loginByCode(phone: string, code: string, ip?: string, userAgent?: string, tenantId?: string): Promise<{
    success: boolean; message: string; data?: any
  }> {
    try {
      // 验证码校验
      const verifyResult = await verificationCodeService.verifyCode(phone, code);
      if (!verifyResult.valid) {
        return { success: false, message: verifyResult.message || '验证码错误或已过期' };
      }

      // 🔒 多租户隔离：如果指定了tenantId，精确匹配
      let tenants;
      if (tenantId) {
        tenants = await AppDataSource.query(
          'SELECT id, code, name, phone, contact, email, status FROM tenants WHERE phone = ? AND id = ?',
          [phone, tenantId]
        );
      } else {
        tenants = await AppDataSource.query(
          'SELECT id, code, name, phone, contact, email, status FROM tenants WHERE phone = ?',
          [phone]
        );
      }

      if (tenants.length === 0) {
        return { success: false, message: '手机号未注册，请先注册' };
      }

      // 🔒 同手机号多租户：返回列表让前端选择
      if (tenants.length > 1 && !tenantId) {
        const activeTenants = tenants.filter((t: any) => t.status !== 'disabled' && t.status !== 'deleted');
        if (activeTenants.length === 0) {
          return { success: false, message: '该手机号关联的所有账号均已被禁用' };
        }
        if (activeTenants.length === 1) {
          return await this.completeLogin(activeTenants[0], 'sms_code', ip, userAgent);
        }
        return {
          success: false,
          message: '该手机号关联多个企业账号，请选择要登录的企业',
          data: {
            needSelectTenant: true,
            tenants: activeTenants.map((t: any) => ({
              id: t.id, code: t.code, name: t.name, contact: t.contact
            })),
            // 验证码已消费，生成临时选择Token
            selectToken: this.generateSelectToken(phone, activeTenants.map((t: any) => t.id))
          }
        };
      }

      const tenant = tenants[0];

      if (tenant.status === 'disabled' || tenant.status === 'deleted') {
        await this.logLogin(tenant.id, 'sms_code', 'failed', '账号已禁用', ip, userAgent);
        return { success: false, message: '账号已被禁用，请联系客服' };
      }

      return await this.completeLogin(tenant, 'sms_code', ip, userAgent);
    } catch (error: any) {
      log.error('[MemberService] 验证码登录失败:', error);
      return { success: false, message: '登录失败，请稍后重试' };
    }
  }

  /**
   * 🔒 通过临时选择Token登录（验证码多租户选择后使用）
   */
  async loginBySelectToken(phone: string, selectToken: string, tenantId: string, ip?: string, userAgent?: string): Promise<{
    success: boolean; message: string; data?: any
  }> {
    try {
      if (!this.verifySelectToken(selectToken, phone, tenantId)) {
        return { success: false, message: '选择已过期，请重新登录' };
      }

      const tenants = await AppDataSource.query(
        'SELECT id, code, name, phone, contact, email, status FROM tenants WHERE id = ? AND phone = ?',
        [tenantId, phone]
      );

      if (tenants.length === 0) {
        return { success: false, message: '账号不存在' };
      }

      const tenant = tenants[0];
      if (tenant.status === 'disabled' || tenant.status === 'deleted') {
        return { success: false, message: '账号已被禁用' };
      }

      return await this.completeLogin(tenant, 'sms_code', ip, userAgent);
    } catch (error: any) {
      log.error('[MemberService] 选择Token登录失败:', error);
      return { success: false, message: '登录失败' };
    }
  }

  /**
   * 设置/重置密码（需先验证手机验证码）
   * 🔒 支持 tenantId 参数，确保只修改指定租户的密码
   */
  async setPassword(phone: string, code: string, newPassword: string, tenantId?: string): Promise<{
    success: boolean; message: string
  }> {
    try {
      // 验证码校验
      const verifyResult = await verificationCodeService.verifyCode(phone, code);
      if (!verifyResult.valid) {
        return { success: false, message: verifyResult.message || '验证码错误或已过期' };
      }

      let tenants;
      if (tenantId) {
        tenants = await AppDataSource.query(
          'SELECT id FROM tenants WHERE phone = ? AND id = ?', [phone, tenantId]
        );
      } else {
        tenants = await AppDataSource.query(
          'SELECT id FROM tenants WHERE phone = ?', [phone]
        );
      }
      if (tenants.length === 0) {
        return { success: false, message: '手机号未注册' };
      }

      // 密码强度校验
      if (newPassword.length < 6) {
        return { success: false, message: '密码至少6位' };
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      // 🔒 多租户隔离：如果有多个租户，只更新指定的或全部
      if (tenantId) {
        await AppDataSource.query(
          'UPDATE tenants SET password_hash = ? WHERE phone = ? AND id = ?',
          [passwordHash, phone, tenantId]
        );
      } else {
        // 未指定tenantId时，为该手机号下所有租户设置密码
        await AppDataSource.query(
          'UPDATE tenants SET password_hash = ? WHERE phone = ?',
          [passwordHash, phone]
        );
      }

      return { success: true, message: '密码设置成功' };
    } catch (error: any) {
      log.error('[MemberService] 设置密码失败:', error);
      return { success: false, message: '操作失败，请稍后重试' };
    }
  }

  /**
   * 公共登录完成方法（生成token、记录日志、更新登录时间）
   * 🔒 抽取公共逻辑，避免重复代码
   */
  private async completeLogin(tenant: any, loginType: 'password' | 'sms_code', ip?: string, userAgent?: string): Promise<{
    success: boolean; message: string; data?: any
  }> {
    // 更新登录时间
    await AppDataSource.query('UPDATE tenants SET last_login_at = NOW() WHERE id = ?', [tenant.id]);

    const token = generateMemberToken({
      tenantId: tenant.id,
      tenantCode: tenant.code,
      phone: tenant.phone
    });

    await this.logLogin(tenant.id, loginType, 'success', null, ip, userAgent);

    return {
      success: true,
      message: '登录成功',
      data: {
        token,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantCode: tenant.code,
        phone: this.maskPhone(tenant.phone),
        expiresIn: 7 * 24 * 3600
      }
    };
  }

  /**
   * 修改密码（已登录状态，需验证旧密码）
   */
  async changePassword(tenantId: string, oldPassword: string, newPassword: string): Promise<{
    success: boolean; message: string
  }> {
    try {
      const tenants = await AppDataSource.query(
        'SELECT password_hash FROM tenants WHERE id = ?', [tenantId]
      );
      if (tenants.length === 0) {
        return { success: false, message: '账号不存在' };
      }

      if (tenants[0].password_hash) {
        const isMatch = await bcrypt.compare(oldPassword, tenants[0].password_hash);
        if (!isMatch) {
          return { success: false, message: '原密码错误' };
        }
      }

      if (newPassword.length < 6) {
        return { success: false, message: '新密码至少6位' };
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await AppDataSource.query(
        'UPDATE tenants SET password_hash = ? WHERE id = ?',
        [passwordHash, tenantId]
      );

      return { success: true, message: '密码修改成功' };
    } catch (error: any) {
      log.error('[MemberService] 修改密码失败:', error);
      return { success: false, message: '操作失败' };
    }
  }

  /**
   * 确保会员资料查询所需的数据库字段存在（自动迁移）
   */
  private profileColumnsChecked = false;
  private async ensureProfileColumns(): Promise<void> {
    if (this.profileColumnsChecked) return;
    try {
      // tenants 表扩容和在线席位字段
      const tCols = await AppDataSource.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants'
         AND COLUMN_NAME IN ('extra_users','extra_storage_gb','extra_online_seats','user_limit_mode','max_online_seats','current_online_seats')`
      );
      const tExisting = tCols.map((c: any) => c.COLUMN_NAME);
      if (!tExisting.includes('extra_users'))
        await AppDataSource.query('ALTER TABLE tenants ADD COLUMN extra_users INT NOT NULL DEFAULT 0').catch(() => {});
      if (!tExisting.includes('extra_storage_gb'))
        await AppDataSource.query('ALTER TABLE tenants ADD COLUMN extra_storage_gb INT NOT NULL DEFAULT 0').catch(() => {});
      if (!tExisting.includes('user_limit_mode'))
        await AppDataSource.query("ALTER TABLE tenants ADD COLUMN user_limit_mode ENUM('total','online') DEFAULT 'total'").catch(() => {});
      if (!tExisting.includes('max_online_seats'))
        await AppDataSource.query('ALTER TABLE tenants ADD COLUMN max_online_seats INT DEFAULT 0').catch(() => {});
      if (!tExisting.includes('extra_online_seats'))
        await AppDataSource.query('ALTER TABLE tenants ADD COLUMN extra_online_seats INT DEFAULT 0').catch(() => {});
      if (!tExisting.includes('current_online_seats'))
        await AppDataSource.query('ALTER TABLE tenants ADD COLUMN current_online_seats INT DEFAULT 0').catch(() => {});

      // tenant_packages 表订阅和在线席位字段
      const pCols = await AppDataSource.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages'
         AND COLUMN_NAME IN ('subscription_enabled','subscription_channels','subscription_discount_rate','user_limit_mode','max_online_seats')`
      );
      const pExisting = pCols.map((c: any) => c.COLUMN_NAME);
      if (!pExisting.includes('subscription_enabled'))
        await AppDataSource.query('ALTER TABLE tenant_packages ADD COLUMN subscription_enabled TINYINT(1) DEFAULT 0').catch(() => {});
      if (!pExisting.includes('subscription_channels'))
        await AppDataSource.query("ALTER TABLE tenant_packages ADD COLUMN subscription_channels VARCHAR(50) DEFAULT 'all'").catch(() => {});
      if (!pExisting.includes('subscription_discount_rate'))
        await AppDataSource.query('ALTER TABLE tenant_packages ADD COLUMN subscription_discount_rate DECIMAL(5,2) DEFAULT 0').catch(() => {});
      if (!pExisting.includes('user_limit_mode'))
        await AppDataSource.query("ALTER TABLE tenant_packages ADD COLUMN user_limit_mode ENUM('total','online','both') DEFAULT 'total'").catch(() => {});
      if (!pExisting.includes('max_online_seats'))
        await AppDataSource.query('ALTER TABLE tenant_packages ADD COLUMN max_online_seats INT DEFAULT 0').catch(() => {});

      this.profileColumnsChecked = true;
      log.info('[MemberService] ✅ 会员资料所需字段已就绪');
    } catch (e) {
      log.warn('[MemberService] 字段检查跳过:', (e as any)?.message);
      this.profileColumnsChecked = true; // 避免反复重试
    }
  }

  /**
   * 获取会员资料（含套餐、授权、订阅、使用情况）
   */
  async getProfile(tenantId: string): Promise<any> {
    try {
      // 确保所需字段存在
      await this.ensureProfileColumns();

      // 租户基本信息（🔥 LEFT JOIN 加 COLLATE 修复字符集不一致导致查询失败）
      // 🔥 增加容错：如果扩展字段不存在，回退到基础查询
      let tenants: any[];
      try {
        tenants = await AppDataSource.query(
          `SELECT t.*, tp.name as package_name, tp.code as package_code, tp.type as package_type,
           tp.price as package_price, tp.max_users as pkg_max_users, tp.max_storage_gb as pkg_max_storage,
           tp.billing_cycle as package_billing_cycle, tp.features as package_features,
           tp.subscription_enabled, tp.subscription_channels, tp.subscription_discount_rate,
           tp.user_limit_mode as pkg_user_limit_mode, tp.max_online_seats as pkg_max_online_seats,
           COALESCE(t.extra_users, 0) as extra_users, COALESCE(t.extra_storage_gb, 0) as extra_storage_gb,
           COALESCE(t.extra_online_seats, 0) as extra_online_seats
           FROM tenants t
           LEFT JOIN tenant_packages tp ON t.package_id COLLATE utf8mb4_unicode_ci = tp.id COLLATE utf8mb4_unicode_ci
           WHERE t.id = ?`,
          [tenantId]
        );
      } catch (sqlErr) {
        log.warn('[MemberService] 扩展字段查询失败，回退基础查询:', (sqlErr as any)?.message);
        tenants = await AppDataSource.query(
          `SELECT t.*, tp.name as package_name, tp.code as package_code, tp.type as package_type,
           tp.price as package_price, tp.max_users as pkg_max_users, tp.max_storage_gb as pkg_max_storage,
           tp.billing_cycle as package_billing_cycle, tp.features as package_features
           FROM tenants t
           LEFT JOIN tenant_packages tp ON t.package_id COLLATE utf8mb4_unicode_ci = tp.id COLLATE utf8mb4_unicode_ci
           WHERE t.id = ?`,
          [tenantId]
        );
      }

      if (tenants.length === 0) return null;
      const tenant = tenants[0];

      // 计算到期天数与总天数
      let daysRemaining = 0;
      let totalDays = 365; // 默认年付
      let remainingPercent = 100;
      if (tenant.expire_date) {
        const now = new Date();
        const expire = new Date(tenant.expire_date);
        daysRemaining = Math.max(0, Math.ceil((expire.getTime() - now.getTime()) / (1000 * 3600 * 24)));
        // 估算总天数（根据套餐周期）
        if (tenant.package_billing_cycle === 'monthly') {
          totalDays = 30;
        } else if (tenant.package_billing_cycle === 'yearly' || tenant.package_billing_cycle === 'annual') {
          totalDays = 365;
        } else if (tenant.created_at && tenant.expire_date) {
          const created = new Date(tenant.created_at);
          totalDays = Math.max(1, Math.ceil((expire.getTime() - created.getTime()) / (1000 * 3600 * 24)));
        }
        remainingPercent = totalDays > 0 ? Math.round((daysRemaining / totalDays) * 100) : 0;
      }

      // 查询当前有效订阅
      let subscription = null;
      try {
        const subs = await AppDataSource.query(
          `SELECT * FROM subscriptions WHERE tenant_id = ? AND status IN ('active','paused') ORDER BY created_at DESC LIMIT 1`,
          [tenantId]
        );
        if (subs.length > 0) {
          const sub = subs[0];
          subscription = {
            id: sub.id,
            hasActive: sub.status === 'active',
            status: sub.status,
            channel: sub.channel,
            amount: Number(sub.amount),
            billingCycle: sub.billing_cycle,
            nextDeductDate: sub.next_deduct_date,
            lastDeductDate: sub.last_deduct_date,
            totalDeducted: Number(sub.total_deducted),
            deductCount: sub.deduct_count,
            signDate: sub.sign_date
          };
        }
      } catch {
        // subscriptions 表可能尚未创建
      }

      // 解析套餐features
      let packageFeatures: string[] = [];
      try {
        packageFeatures = tenant.package_features
          ? (typeof tenant.package_features === 'string' ? JSON.parse(tenant.package_features) : tenant.package_features)
          : [];
      } catch { /* ignore */ }

      // 查询真实用户数（从users表），至少为1（管理员/创建者）
      let actualUserCount = 1;
      try {
        const userCountResult = await AppDataSource.query(
          "SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ?",
          [tenantId]
        );
        const dbCount = Number(userCountResult[0]?.cnt || 0);
        actualUserCount = Math.max(1, dbCount); // 至少1个用户（管理员）
      } catch {
        actualUserCount = Math.max(1, Number(tenant.user_count) || 1);
      }

      // 查询真实存储使用量（从uploads表或文件系统统计）
      let actualStorageMb = Number(tenant.used_storage_mb) || 0;
      try {
        const storageResult = await AppDataSource.query(
          "SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM uploads WHERE tenant_id = ?",
          [tenantId]
        );
        const totalBytes = Number(storageResult[0]?.total_bytes || 0);
        if (totalBytes > 0) {
          actualStorageMb = totalBytes / (1024 * 1024); // 转换为MB
        }
      } catch {
        // uploads表可能不存在，使用tenants表的值
      }

      const baseMaxUsers = tenant.pkg_max_users || tenant.max_users || 0;
      const baseMaxStorageGb = tenant.pkg_max_storage || tenant.max_storage_gb || 0;
      const extraUsers = Number(tenant.extra_users) || 0;
      const extraStorageGb = Number(tenant.extra_storage_gb) || 0;
      const maxUsers = baseMaxUsers + extraUsers;
      const maxStorageGb = baseMaxStorageGb + extraStorageGb;

      const result: any = {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          contact: tenant.contact,
          phone: this.maskPhone(tenant.phone),
          fullPhone: tenant.phone,
          email: tenant.email,
          status: tenant.status,
          createdAt: tenant.created_at
        },
        package: tenant.package_name ? {
          id: tenant.package_id,
          name: tenant.package_name,
          code: tenant.package_code,
          type: tenant.package_type,
          price: Number(tenant.package_price),
          billingCycle: tenant.package_billing_cycle,
          maxUsers: tenant.pkg_max_users,
          maxStorageGb: tenant.pkg_max_storage,
          features: packageFeatures,
          subscriptionEnabled: Boolean(tenant.subscription_enabled),
          subscriptionChannels: tenant.subscription_channels || 'all',
          subscriptionDiscountRate: Number(tenant.subscription_discount_rate) || 0
        } : null,
        license: {
          key: tenant.license_key ? this.maskLicense(tenant.license_key) : null,
          status: tenant.license_status,
          expireDate: tenant.expire_date,
          daysRemaining,
          totalDays,
          remainingPercent,
          isExpired: daysRemaining <= 0 && tenant.license_status === 'active',
          isExpiringSoon: daysRemaining > 0 && remainingPercent < 20
        },
        subscription,
        usage: {
          userCount: actualUserCount,
          maxUsers: maxUsers,
          baseMaxUsers: baseMaxUsers,
          extraUsers: extraUsers,
          usedStorageMb: Math.round(actualStorageMb * 100) / 100,
          maxStorageGb: maxStorageGb,
          baseMaxStorageGb: baseMaxStorageGb,
          extraStorageGb: extraStorageGb,
          userUsagePercent: maxUsers > 0 ? Math.round((actualUserCount / maxUsers) * 100) : 0,
          storageUsagePercent: maxStorageGb > 0 ? Math.round((actualStorageMb / (maxStorageGb * 1024)) * 100) : 0,
          userLimitMode: tenant.user_limit_mode || tenant.pkg_user_limit_mode || 'total',
          maxOnlineSeats: (Number(tenant.max_online_seats) || Number(tenant.pkg_max_online_seats) || 0) + (Number(tenant.extra_online_seats) || 0),
          extraOnlineSeats: Number(tenant.extra_online_seats) || 0,
          onlineCount: 0,
          onlineSeatPercent: 0
        }
      };

      // 填充在线席位实时数据
      // 🔥 修复：使用 COUNT(DISTINCT user_id) 且不加活跃阈值，与 OnlineSeatService.getOnlineCount 保持一致
      // 登录即占席位，退出/踢出/浏览器关闭15分钟后才释放
      const usageLimitMode = result.usage.userLimitMode;
      if (usageLimitMode === 'online') {
        try {
          const onlineResult = await AppDataSource.query(
            "SELECT COUNT(DISTINCT user_id) as cnt FROM user_sessions WHERE tenant_id = ? AND status = 'active'",
            [tenantId]
          );
          const onlineCount = Number(onlineResult[0]?.cnt || 0);
          result.usage.onlineCount = onlineCount;
          const maxSeats = result.usage.maxOnlineSeats;
          result.usage.onlineSeatPercent = maxSeats > 0 ? Math.round((onlineCount / maxSeats) * 100) : 0;
        } catch {
          // user_sessions表可能不存在
        }
      }

      return result;
    } catch (error) {
      log.error('[MemberService] 获取资料失败:', error);
      return null;
    }
  }

  /**
   * 修改会员资料
   */
  async updateProfile(tenantId: string, data: {
    name?: string; contact?: string; email?: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      if (data.name) {
        updates.push('name = ?');
        params.push(data.name);
      }
      if (data.contact) {
        updates.push('contact = ?');
        params.push(data.contact);
      }
      if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email || null);
      }

      if (updates.length === 0) {
        return { success: false, message: '没有要修改的内容' };
      }

      updates.push('updated_at = NOW()');
      params.push(tenantId);

      await AppDataSource.query(
        `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return { success: true, message: '修改成功' };
    } catch (error: any) {
      log.error('[MemberService] 修改资料失败:', error);
      return { success: false, message: '修改失败' };
    }
  }

  /**
   * 查询账单记录
   */
  async getBills(tenantId: string, page: number = 1, pageSize: number = 10, filters?: {
    orderNo?: string; startDate?: string; endDate?: string
  }): Promise<{
    list: any[]; total: number; page: number; pageSize: number; totalSpent: number
  }> {
    try {
      const offset = (page - 1) * pageSize;

      // 构建动态搜索条件
      let extraWhere = '';
      const extraParams: any[] = [];
      if (filters?.orderNo) {
        extraWhere += ' AND order_no LIKE ?';
        extraParams.push(`%${filters.orderNo}%`);
      }
      if (filters?.startDate) {
        extraWhere += ' AND created_at >= ?';
        extraParams.push(filters.startDate + ' 00:00:00');
      }
      if (filters?.endDate) {
        extraWhere += ' AND created_at <= ?';
        extraParams.push(filters.endDate + ' 23:59:59');
      }

      // 从 payment_orders 查询支付记录
      const [bills, countResult, spentResult] = await Promise.all([
        AppDataSource.query(
          `SELECT id, order_no, package_id, package_name, amount, pay_type, billing_cycle, bonus_months,
           status, trade_no, created_at, paid_at, expire_time, qr_code, pay_url
           FROM payment_orders WHERE tenant_id = ?${extraWhere}
           ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          [tenantId, ...extraParams, pageSize, offset]
        ),
        AppDataSource.query(
          `SELECT COUNT(*) as total FROM payment_orders WHERE tenant_id = ?${extraWhere}`,
          [tenantId, ...extraParams]
        ),
        AppDataSource.query(
          "SELECT COALESCE(SUM(amount), 0) as total_spent FROM payment_orders WHERE tenant_id = ? AND status = 'paid'",
          [tenantId]
        )
      ]);

      // 追加订阅扣款记录
      let deductLogs: any[] = [];
      try {
        deductLogs = await AppDataSource.query(
          `SELECT sdl.id, sdl.amount, sdl.channel as pay_type, sdl.status, sdl.trade_no,
           sdl.deduct_date, sdl.period_number, sdl.billing_start, sdl.billing_end,
           sdl.created_at, sdl.error_msg,
           s.billing_cycle
           FROM subscription_deduct_logs sdl
           LEFT JOIN subscriptions s ON sdl.subscription_id = s.id
           WHERE sdl.tenant_id = ?
           ORDER BY sdl.created_at DESC LIMIT ?`,
          [tenantId, 50]
        );
      } catch {
        // 表可能不存在
      }

      // 合并并格式化
      const formattedBills = bills.map((b: any) => ({
        id: b.id,
        orderNo: b.order_no,
        type: 'payment',
        packageId: b.package_id,
        packageName: b.package_name,
        amount: Number(b.amount),
        payType: b.pay_type,
        billingCycle: b.billing_cycle,
        status: b.status,
        tradeNo: b.trade_no,
        createdAt: b.created_at,
        paidAt: b.paid_at,
        qrCode: b.status === 'pending' ? (b.qr_code || '') : '',
        payUrl: b.status === 'pending' ? (b.pay_url || '') : ''
      }));

      const formattedDeducts = deductLogs.map((d: any) => ({
        id: d.id,
        orderNo: `SUB-${d.period_number || '?'}`,
        type: 'subscription_deduct',
        packageName: `第${d.period_number || '?'}期订阅扣款`,
        amount: Number(d.amount),
        payType: d.pay_type,
        billingCycle: d.billing_cycle,
        status: d.status === 'success' ? 'paid' : d.status,
        tradeNo: d.trade_no,
        period: d.billing_start && d.billing_end ? `${d.billing_start} ~ ${d.billing_end}` : null,
        createdAt: d.created_at,
        paidAt: d.status === 'success' ? d.created_at : null,
        errorMsg: d.error_msg
      }));

      // 按时间倒序合并
      const allBills = [...formattedBills, ...formattedDeducts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, pageSize);

      const total = Number(countResult[0]?.total || 0) + deductLogs.length;
      const totalSpent = Number(spentResult[0]?.total_spent || 0);

      return { list: allBills, total, page, pageSize, totalSpent };
    } catch (error) {
      log.error('[MemberService] 查询账单失败:', error);
      return { list: [], total: 0, page, pageSize, totalSpent: 0 };
    }
  }

  /**
   * 获取授权信息（支持日志分页）
   */
  async getLicense(tenantId: string, logPage: number = 1, logPageSize: number = 10): Promise<any> {
    try {
      const tenants = await AppDataSource.query(
        `SELECT t.license_key, t.license_status, t.expire_date, t.code as tenant_code,
         tp.name as package_name, tp.code as package_code, tp.type as package_type
         FROM tenants t
         LEFT JOIN tenant_packages tp ON t.package_id COLLATE utf8mb4_unicode_ci = tp.id COLLATE utf8mb4_unicode_ci
         WHERE t.id = ?`,
        [tenantId]
      );

      if (tenants.length === 0) return null;
      const t = tenants[0];

      // 查询授权日志（分页）
      let licenseLogs: any[] = [];
      let logTotal = 0;
      const logOffset = (logPage - 1) * logPageSize;
      try {
        const [logs, countResult] = await Promise.all([
          AppDataSource.query(
            `SELECT action, result, message, created_at FROM tenant_license_logs
             WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [tenantId, logPageSize, logOffset]
          ),
          AppDataSource.query(
            `SELECT COUNT(*) as total FROM tenant_license_logs WHERE tenant_id = ?`,
            [tenantId]
          )
        ]);
        licenseLogs = logs;
        logTotal = Number(countResult[0]?.total || 0);
      } catch {
        // 表可能不存在
      }

      let daysRemaining = 0;
      if (t.expire_date) {
        const now = new Date();
        const expire = new Date(t.expire_date);
        daysRemaining = Math.max(0, Math.ceil((expire.getTime() - now.getTime()) / (1000 * 3600 * 24)));
      }

      return {
        licenseKey: t.license_key,
        status: t.license_status,
        expireDate: t.expire_date,
        daysRemaining,
        tenantCode: t.tenant_code,
        packageName: t.package_name,
        packageCode: t.package_code,
        packageType: t.package_type,
        logs: licenseLogs.map((l: any) => ({
          action: l.action,
          result: l.result,
          message: l.message,
          time: l.created_at
        })),
        logTotal,
        logPage,
        logPageSize
      };
    } catch (error) {
      log.error('[MemberService] 获取授权信息失败:', error);
      return null;
    }
  }

  /**
   * 手机号脱敏
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }

  /**
   * 授权码脱敏
   */
  private maskLicense(key: string): string {
    if (!key || key.length < 10) return key;
    return key.substring(0, 10) + '****' + key.substring(key.length - 4);
  }

  /**
   * 记录登录日志
   */
  private async logLogin(
    tenantId: string | null,
    loginType: 'password' | 'sms_code',
    result: 'success' | 'failed',
    failReason?: string | null,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await AppDataSource.query(
        `INSERT INTO member_login_logs (id, tenant_id, login_type, login_result, fail_reason, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), tenantId || '', loginType, result, failReason || null, ip || null, userAgent?.substring(0, 500) || null]
      );
    } catch {
      // 忽略日志写入失败
    }
  }
}

export const memberService = new MemberService();

