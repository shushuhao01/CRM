/**
 * 扩容管理服务
 * 处理扩容价格配置CRUD、扩容订单创建、支付回调后更新租户限额
 */
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { log } from '../config/logger';

export class CapacityService {

  // ==================== 价格配置 CRUD（Admin端） ====================

  /**
   * 获取所有扩容价格配置
   */
  async getPriceConfigs(filters?: { type?: string; isActive?: boolean }): Promise<any[]> {
    try {
      let where = '1=1';
      const params: any[] = [];
      if (filters?.type) { where += ' AND type = ?'; params.push(filters.type); }
      if (filters?.isActive !== undefined) { where += ' AND is_active = ?'; params.push(filters.isActive ? 1 : 0); }

      const configs = await AppDataSource.query(
        `SELECT * FROM capacity_price_configs WHERE ${where} ORDER BY type, billing_cycle`,
        params
      );
      // 解析 discount_rules JSON
      return configs.map((c: any) => ({
        ...c,
        discount_rules: c.discount_rules ? (typeof c.discount_rules === 'string' ? JSON.parse(c.discount_rules) : c.discount_rules) : []
      }));
    } catch (error) {
      log.error('[CapacityService] 获取价格配置失败:', error);
      return [];
    }
  }

  /**
   * 创建或更新价格配置
   */
  async savePriceConfig(data: {
    id?: string;
    type: 'user' | 'storage' | 'online_seat';
    billing_cycle: 'monthly' | 'yearly' | 'permanent' | 'follow_package';
    unit_price: number;
    min_qty?: number;
    max_qty?: number;
    description?: string;
    is_active?: boolean;
    discount_rules?: Array<{ min_qty: number; discount_percent: number }>;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // 🔑 业务校验
      if (!data.type || !['user', 'storage', 'online_seat'].includes(data.type)) {
        return { success: false, message: '扩容类型无效' };
      }
      if (!data.unit_price || data.unit_price <= 0) {
        return { success: false, message: '单价必须大于0' };
      }
      const minQty = data.min_qty || 1;
      const maxQty = data.max_qty || 100;
      if (minQty > maxQty) {
        return { success: false, message: '最小购买量不能大于最大购买量' };
      }
      const discountRulesJson = data.discount_rules ? JSON.stringify(data.discount_rules) : null;
      if (data.id) {
        // 更新
        await AppDataSource.query(
          `UPDATE capacity_price_configs SET type=?, billing_cycle=?, unit_price=?, min_qty=?, max_qty=?, description=?, is_active=?, discount_rules=?, updated_at=NOW()
           WHERE id=?`,
          [data.type, data.billing_cycle, data.unit_price, data.min_qty || 1, data.max_qty || 100, data.description || '', data.is_active !== false ? 1 : 0, discountRulesJson, data.id]
        );
        return { success: true, message: '更新成功' };
      } else {
        // 创建
        const id = uuidv4();
        await AppDataSource.query(
          `INSERT INTO capacity_price_configs (id, type, billing_cycle, unit_price, min_qty, max_qty, description, is_active, discount_rules)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.type, data.billing_cycle, data.unit_price, data.min_qty || 1, data.max_qty || 100, data.description || '', data.is_active !== false ? 1 : 0, discountRulesJson]
        );
        return { success: true, message: '创建成功', data: { id } };
      }
    } catch (error) {
      log.error('[CapacityService] 保存价格配置失败:', error);
      return { success: false, message: '保存失败' };
    }
  }

  /**
   * 删除价格配置
   */
  async deletePriceConfig(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await AppDataSource.query('DELETE FROM capacity_price_configs WHERE id = ?', [id]);
      return { success: true, message: '删除成功' };
    } catch (error) {
      log.error('[CapacityService] 删除价格配置失败:', error);
      return { success: false, message: '删除失败' };
    }
  }

  // ==================== 会员端 API ====================

  /**
   * 获取可用的扩容价格列表（仅启用的）
   */
  async getActivePrices(): Promise<any[]> {
    return this.getPriceConfigs({ isActive: true });
  }

  /**
   * 获取租户的扩容额度
   */
  async getTenantCapacity(tenantId: string): Promise<{ extraUsers: number; extraStorageGb: number; extraOnlineSeats: number }> {
    try {
      const result = await AppDataSource.query(
        `SELECT COALESCE(extra_users, 0) as extra_users,
                COALESCE(extra_storage_gb, 0) as extra_storage_gb,
                COALESCE(extra_online_seats, 0) as extra_online_seats
         FROM tenants WHERE id = ?`,
        [tenantId]
      );
      if (result.length === 0) return { extraUsers: 0, extraStorageGb: 0, extraOnlineSeats: 0 };
      return {
        extraUsers: Number(result[0].extra_users) || 0,
        extraStorageGb: Number(result[0].extra_storage_gb) || 0,
        extraOnlineSeats: Number(result[0].extra_online_seats) || 0
      };
    } catch {
      return { extraUsers: 0, extraStorageGb: 0, extraOnlineSeats: 0 };
    }
  }

  /**
   * 创建扩容订单
   */
  /**
   * 🔥 计算折扣后的金额
   */
  private calculateDiscountAmount(unitPrice: number, quantity: number, discountRules?: any[]): { totalAmount: number; discountPercent: number } {
    if (!discountRules || !Array.isArray(discountRules) || discountRules.length === 0) {
      return { totalAmount: unitPrice * quantity, discountPercent: 0 };
    }
    // 按 min_qty 降序排列，找到第一个满足的折扣
    const sorted = [...discountRules].sort((a, b) => b.min_qty - a.min_qty);
    for (const rule of sorted) {
      if (quantity >= rule.min_qty && rule.discount_percent > 0) {
        const discount = rule.discount_percent;
        const totalAmount = unitPrice * quantity * (1 - discount / 100);
        return { totalAmount: Math.round(totalAmount * 100) / 100, discountPercent: discount };
      }
    }
    return { totalAmount: unitPrice * quantity, discountPercent: 0 };
  }

  /**
   * 创建扩容订单
   */
  async createOrder(tenantId: string, data: {
    type: 'user' | 'storage' | 'online_seat';
    quantity: number;
    priceConfigId: string;
    payType: 'wechat' | 'alipay';
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // 🔑 校验租户状态：必须是活跃且未过期的租户
      const tenantCheck = await AppDataSource.query(
        'SELECT status, license_status, expire_date FROM tenants WHERE id = ?',
        [tenantId]
      );
      if (tenantCheck.length === 0) return { success: false, message: '租户不存在' };
      const t = tenantCheck[0];
      if (t.status === 'suspended' || t.status === 'disabled' || t.status === 'deleted') {
        return { success: false, message: '当前账号状态异常，无法购买扩容' };
      }
      if (t.expire_date && new Date(t.expire_date) < new Date()) {
        return { success: false, message: '套餐已过期，请先续费后再购买扩容' };
      }

      // 查询价格配置
      const configs = await AppDataSource.query(
        'SELECT * FROM capacity_price_configs WHERE id = ? AND is_active = 1',
        [data.priceConfigId]
      );
      if (configs.length === 0) return { success: false, message: '价格配置不存在或已禁用' };
      const config = configs[0];

      // 🔑 校验扩容类型与价格配置类型一致
      if (data.type !== config.type) {
        return { success: false, message: '扩容类型与价格配置不匹配' };
      }

      if (data.quantity < config.min_qty || data.quantity > config.max_qty) {
        return { success: false, message: `购买数量需在 ${config.min_qty} ~ ${config.max_qty} 之间` };
      }

      // 🔥 折扣计算
      const discountRules = config.discount_rules ? (typeof config.discount_rules === 'string' ? JSON.parse(config.discount_rules) : config.discount_rules) : [];
      const { totalAmount, discountPercent } = this.calculateDiscountAmount(Number(config.unit_price), data.quantity, discountRules);
      const orderNo = 'CAP' + new Date().toISOString().replace(/[-T:\.Z]/g, '').substring(0, 14) + Math.random().toString(36).substring(2, 8).toUpperCase();

      // 🔥 计算有效期
      let expireDate: string | null = null;
      if (config.billing_cycle === 'monthly') {
        const d = new Date(); d.setMonth(d.getMonth() + 1);
        expireDate = d.toISOString().slice(0, 19).replace('T', ' ');
      } else if (config.billing_cycle === 'yearly') {
        const d = new Date(); d.setFullYear(d.getFullYear() + 1);
        expireDate = d.toISOString().slice(0, 19).replace('T', ' ');
      } else if (config.billing_cycle === 'follow_package') {
        // 跟随套餐到期日
        const tenantExpire = await AppDataSource.query('SELECT expire_date FROM tenants WHERE id = ?', [tenantId]);
        if (tenantExpire[0]?.expire_date) {
          expireDate = new Date(tenantExpire[0].expire_date).toISOString().slice(0, 19).replace('T', ' ');
        }
      }
      // permanent: expireDate = null (永久)
      const id = uuidv4();

      await AppDataSource.query(
        `INSERT INTO capacity_orders (id, order_no, tenant_id, type, quantity, unit_price, total_amount, billing_cycle, pay_type, status, discount_percent, expire_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [id, orderNo, tenantId, data.type, data.quantity, config.unit_price, totalAmount, config.billing_cycle, data.payType, discountPercent, expireDate]
      );

      // 同时在 payment_orders 创建关联订单（复用支付流程）
      const tenantInfo = await AppDataSource.query('SELECT name, phone, contact FROM tenants WHERE id = ?', [tenantId]);
      const tenant = tenantInfo[0] || {};
      const typeLabel = data.type === 'online_seat' ? '在线席位' : (data.type === 'user' ? '用户数' : '存储空间');
      const unitLabel = data.type === 'storage' ? 'GB' : (data.type === 'online_seat' ? '席位' : '人');
      const packageName = `扩容${typeLabel} x${data.quantity}${unitLabel}${discountPercent > 0 ? ` (${discountPercent}%折扣)` : ''}`;

      await AppDataSource.query(
        `INSERT INTO payment_orders (id, order_no, tenant_id, tenant_name, package_name, amount, pay_type, status, contact_name, contact_phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
        [uuidv4(), orderNo, tenantId, tenant.name || '', packageName, totalAmount, data.payType, tenant.contact || '', tenant.phone || '']
      );

      return {
        success: true,
        message: '订单创建成功',
        data: { id, orderNo, totalAmount, discountPercent, expireDate, type: data.type, quantity: data.quantity }
      };
    } catch (error) {
      log.error('[CapacityService] 创建扩容订单失败:', error);
      return { success: false, message: '创建订单失败' };
    }
  }

  /**
   * 获取租户的扩容订单列表
   */
  async getOrders(tenantId: string, page: number = 1, pageSize: number = 10): Promise<{ list: any[]; total: number }> {
    try {
      const offset = (page - 1) * pageSize;
      const [orders, countResult] = await Promise.all([
        AppDataSource.query(
          'SELECT * FROM capacity_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [tenantId, pageSize, offset]
        ),
        AppDataSource.query(
          'SELECT COUNT(*) as total FROM capacity_orders WHERE tenant_id = ?',
          [tenantId]
        )
      ]);
      return { list: orders, total: Number(countResult[0]?.total || 0) };
    } catch (error) {
      log.error('[CapacityService] 获取扩容订单失败:', error);
      return { list: [], total: 0 };
    }
  }

  /**
   * 通过 licenseId 查找关联租户的扩容订单（私有客户）
   */
  async getOrdersByLicenseId(licenseId: string, page: number = 1, pageSize: number = 10): Promise<{ list: any[]; total: number }> {
    try {
      // 通过 licenses 表关联 tenant_id
      const tenants = await AppDataSource.query(
        `SELECT DISTINCT t.id FROM tenants t
         INNER JOIN licenses l ON (l.customer_name = t.name OR l.id = ?)
         WHERE l.id = ? LIMIT 1`,
        [licenseId, licenseId]
      );
      if (tenants.length === 0) {
        // 尝试直接用 licenseId 匹配 tenant_id
        return this.getOrders(licenseId, page, pageSize);
      }
      return this.getOrders(tenants[0].id, page, pageSize);
    } catch {
      return { list: [], total: 0 };
    }
  }

  /**
   * 获取所有扩容订单（管理后台全局查看）
   */
  async getAllOrders(page: number = 1, pageSize: number = 10): Promise<{ list: any[]; total: number }> {
    try {
      const offset = (page - 1) * pageSize;
      const [orders, countResult] = await Promise.all([
        AppDataSource.query(
          `SELECT co.*, t.name as tenant_name, t.code as tenant_code
           FROM capacity_orders co
           LEFT JOIN tenants t ON co.tenant_id = t.id
           ORDER BY co.created_at DESC LIMIT ? OFFSET ?`,
          [pageSize, offset]
        ),
        AppDataSource.query('SELECT COUNT(*) as total FROM capacity_orders')
      ]);
      return { list: orders, total: Number(countResult[0]?.total || 0) };
    } catch (error) {
      log.error('[CapacityService] 获取全部扩容订单失败:', error);
      return { list: [], total: 0 };
    }
  }

  /**
   * 扩容订单支付成功 — 更新租户限额
   */
  async activateCapacity(orderNo: string): Promise<{ success: boolean; message: string }> {
    try {
      // 🔑 原子化：先CAS更新状态，再查订单详情，防止并发重复激活
      const updateResult = await AppDataSource.query(
        `UPDATE capacity_orders SET status = 'paid', paid_at = NOW() WHERE order_no = ? AND status = 'pending'`,
        [orderNo]
      );
      if (!updateResult?.affectedRows || updateResult.affectedRows === 0) {
        return { success: false, message: '订单不存在或已处理' };
      }

      const orders = await AppDataSource.query(
        'SELECT * FROM capacity_orders WHERE order_no = ?',
        [orderNo]
      );
      if (orders.length === 0) return { success: false, message: '订单不存在' };
      const order = orders[0];


      // 确保字段存在
      try {
        await AppDataSource.query(
          `SELECT extra_users FROM tenants WHERE id = ? LIMIT 1`, [order.tenant_id]
        );
      } catch {
        // 字段不存在，尝试添加
        try {
          await AppDataSource.query('ALTER TABLE tenants ADD COLUMN extra_users INT NOT NULL DEFAULT 0');
          await AppDataSource.query('ALTER TABLE tenants ADD COLUMN extra_storage_gb INT NOT NULL DEFAULT 0');
        } catch { /* 可能已存在 */ }
      }

      // 更新租户扩容额度
      if (order.type === 'user') {
        await AppDataSource.query(
          'UPDATE tenants SET extra_users = COALESCE(extra_users, 0) + ? WHERE id = ?',
          [order.quantity, order.tenant_id]
        );
        // 同步更新 max_users
        await AppDataSource.query(
          `UPDATE tenants t
           LEFT JOIN tenant_packages tp ON t.package_id = tp.id
           SET t.max_users = COALESCE(tp.max_users, t.max_users) + COALESCE(t.extra_users, 0)
           WHERE t.id = ?`,
          [order.tenant_id]
        );
      } else if (order.type === 'storage') {
        await AppDataSource.query(
          'UPDATE tenants SET extra_storage_gb = COALESCE(extra_storage_gb, 0) + ? WHERE id = ?',
          [order.quantity, order.tenant_id]
        );
        // 同步更新 max_storage_gb
        await AppDataSource.query(
          `UPDATE tenants t
           LEFT JOIN tenant_packages tp ON t.package_id = tp.id
           SET t.max_storage_gb = COALESCE(tp.max_storage_gb, t.max_storage_gb) + COALESCE(t.extra_storage_gb, 0)
           WHERE t.id = ?`,
          [order.tenant_id]
        );
      } else if (order.type === 'online_seat') {
        // 🔥 在线席位扩容
        await AppDataSource.query(
          'UPDATE tenants SET extra_online_seats = COALESCE(extra_online_seats, 0) + ? WHERE id = ?',
          [order.quantity, order.tenant_id]
        );
        log.info(`[CapacityService] 在线席位扩容: tenant=${order.tenant_id}, +${order.quantity}席位`);
      }

      log.info(`[CapacityService] 扩容成功: tenant=${order.tenant_id}, type=${order.type}, qty=${order.quantity}`);
      return { success: true, message: '扩容成功' };
    } catch (error) {
      log.error('[CapacityService] 激活扩容失败:', error);
      return { success: false, message: '扩容激活失败' };
    }
  }

  /**
   * 🔥 过期扩容回退 — 定时任务调用
   * 检查已过期的已付款扩容订单，将对应额度从租户中扣回
   */
  async expireCapacityOrders(): Promise<number> {
    try {
      // 查找已过期且状态为paid的订单
      const expiredOrders = await AppDataSource.query(
        `SELECT * FROM capacity_orders WHERE status = 'paid' AND expire_date IS NOT NULL AND expire_date < NOW()`
      );
      let count = 0;
      for (const order of expiredOrders) {
        try {
          if (order.type === 'user') {
            await AppDataSource.query(
              'UPDATE tenants SET extra_users = GREATEST(COALESCE(extra_users, 0) - ?, 0) WHERE id = ?',
              [order.quantity, order.tenant_id]
            );
            // 同步更新 max_users
            await AppDataSource.query(
              `UPDATE tenants t LEFT JOIN tenant_packages tp ON t.package_id = tp.id
               SET t.max_users = COALESCE(tp.max_users, 10) + COALESCE(t.extra_users, 0) WHERE t.id = ?`,
              [order.tenant_id]
            );
          } else if (order.type === 'storage') {
            await AppDataSource.query(
              'UPDATE tenants SET extra_storage_gb = GREATEST(COALESCE(extra_storage_gb, 0) - ?, 0) WHERE id = ?',
              [order.quantity, order.tenant_id]
            );
            await AppDataSource.query(
              `UPDATE tenants t LEFT JOIN tenant_packages tp ON t.package_id = tp.id
               SET t.max_storage_gb = COALESCE(tp.max_storage_gb, 5) + COALESCE(t.extra_storage_gb, 0) WHERE t.id = ?`,
              [order.tenant_id]
            );
          } else if (order.type === 'online_seat') {
            await AppDataSource.query(
              'UPDATE tenants SET extra_online_seats = GREATEST(COALESCE(extra_online_seats, 0) - ?, 0) WHERE id = ?',
              [order.quantity, order.tenant_id]
            );
          }
          // 标记为 expired
          await AppDataSource.query(
            `UPDATE capacity_orders SET status = 'expired' WHERE id = ?`,
            [order.id]
          );
          count++;
          log.info(`[CapacityService] 扩容到期回退: tenant=${order.tenant_id}, type=${order.type}, qty=${order.quantity}`);
        } catch (e) {
          log.error(`[CapacityService] 回退扩容订单失败: orderId=${order.id}`, e);
        }
      }
      return count;
    } catch (error) {
      log.error('[CapacityService] 过期扩容检查失败:', error);
      return 0;
    }
  }

  /**
   * 初始化表结构（应用启动时检查）
   */
  async ensureTables(): Promise<void> {
    try {
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS capacity_price_configs (
          id VARCHAR(36) PRIMARY KEY,
          type ENUM('user', 'storage', 'online_seat') NOT NULL,
          billing_cycle ENUM('monthly', 'yearly', 'permanent', 'follow_package') NOT NULL DEFAULT 'follow_package',
          unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
          min_qty INT NOT NULL DEFAULT 1,
          max_qty INT NOT NULL DEFAULT 100,
          description VARCHAR(255) DEFAULT '',
          discount_rules JSON DEFAULT NULL COMMENT '折扣规则：[{min_qty, discount_percent}]',
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_type_active (type, is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS capacity_orders (
          id VARCHAR(36) PRIMARY KEY,
          order_no VARCHAR(64) NOT NULL UNIQUE,
          tenant_id VARCHAR(36) NOT NULL,
          type ENUM('user', 'storage', 'online_seat') NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
          total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          discount_percent DECIMAL(5, 2) DEFAULT 0 COMMENT '折扣百分比',
          billing_cycle VARCHAR(20) NOT NULL DEFAULT 'follow_package',
          pay_type VARCHAR(20) DEFAULT NULL,
          status ENUM('pending', 'paid', 'closed', 'refunded', 'expired') NOT NULL DEFAULT 'pending',
          trade_no VARCHAR(128) DEFAULT NULL,
          paid_at DATETIME DEFAULT NULL,
          expire_date DATETIME DEFAULT NULL COMMENT '扩容到期日',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_tenant (tenant_id),
          INDEX idx_status (status),
          INDEX idx_expire (expire_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 安全迁移：为已有表扩展 type 枚举和新增字段
      try {
        await AppDataSource.query(
          `ALTER TABLE capacity_price_configs MODIFY COLUMN type ENUM('user', 'storage', 'online_seat') NOT NULL`
        );
      } catch { /* 忽略 */ }
      try {
        await AppDataSource.query(
          `ALTER TABLE capacity_price_configs MODIFY COLUMN billing_cycle ENUM('monthly', 'yearly', 'permanent', 'follow_package') NOT NULL DEFAULT 'follow_package'`
        );
      } catch { /* 忽略 */ }
      try {
        await AppDataSource.query(
          `ALTER TABLE capacity_orders MODIFY COLUMN type ENUM('user', 'storage', 'online_seat') NOT NULL`
        );
      } catch { /* 忽略 */ }
      try {
        await AppDataSource.query(
          `ALTER TABLE capacity_orders MODIFY COLUMN status ENUM('pending', 'paid', 'closed', 'refunded', 'expired') NOT NULL DEFAULT 'pending'`
        );
      } catch { /* 忽略 */ }

      // 安全添加新字段
      const addColumnSafe = async (table: string, col: string, def: string) => {
        try {
          const check = await AppDataSource.query(
            `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [table, col]
          );
          if (!Number(check[0]?.cnt)) {
            await AppDataSource.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
          }
        } catch { /* 忽略 */ }
      };

      await addColumnSafe('capacity_price_configs', 'discount_rules', "JSON DEFAULT NULL COMMENT '折扣规则'");
      await addColumnSafe('capacity_orders', 'discount_percent', "DECIMAL(5,2) DEFAULT 0 COMMENT '折扣百分比'");
      await addColumnSafe('capacity_orders', 'expire_date', "DATETIME DEFAULT NULL COMMENT '扩容到期日'");
      await addColumnSafe('tenants', 'extra_users', 'INT NOT NULL DEFAULT 0');
      await addColumnSafe('tenants', 'extra_storage_gb', 'INT NOT NULL DEFAULT 0');
      await addColumnSafe('tenants', 'extra_online_seats', "INT NOT NULL DEFAULT 0 COMMENT '额外增购的在线席位数'");
      await addColumnSafe('tenants', 'user_limit_mode', "ENUM('total', 'online') NOT NULL DEFAULT 'total' COMMENT '用户限制模式'");
      await addColumnSafe('tenants', 'max_online_seats', "INT NOT NULL DEFAULT 0 COMMENT '最大在线席位数'");

      log.info('[CapacityService] 扩容表结构检查完成');
    } catch (error) {
      log.error('[CapacityService] 初始化表结构失败:', error);
    }
  }
}

export const capacityService = new CapacityService();

