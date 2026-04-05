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
      return configs;
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
    type: 'user' | 'storage';
    billing_cycle: 'monthly' | 'yearly' | 'follow_package';
    unit_price: number;
    min_qty?: number;
    max_qty?: number;
    description?: string;
    is_active?: boolean;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // 🔑 业务校验
      if (!data.type || !['user', 'storage'].includes(data.type)) {
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
      if (data.id) {
        // 更新
        await AppDataSource.query(
          `UPDATE capacity_price_configs SET type=?, billing_cycle=?, unit_price=?, min_qty=?, max_qty=?, description=?, is_active=?, updated_at=NOW()
           WHERE id=?`,
          [data.type, data.billing_cycle, data.unit_price, data.min_qty || 1, data.max_qty || 100, data.description || '', data.is_active !== false ? 1 : 0, data.id]
        );
        return { success: true, message: '更新成功' };
      } else {
        // 创建
        const id = uuidv4();
        await AppDataSource.query(
          `INSERT INTO capacity_price_configs (id, type, billing_cycle, unit_price, min_qty, max_qty, description, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.type, data.billing_cycle, data.unit_price, data.min_qty || 1, data.max_qty || 100, data.description || '', data.is_active !== false ? 1 : 0]
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
  async getTenantCapacity(tenantId: string): Promise<{ extraUsers: number; extraStorageGb: number }> {
    try {
      // 先检查字段是否存在
      const cols = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'extra_users'`
      );
      if (!cols[0]?.cnt) {
        return { extraUsers: 0, extraStorageGb: 0 };
      }
      const result = await AppDataSource.query(
        'SELECT COALESCE(extra_users, 0) as extra_users, COALESCE(extra_storage_gb, 0) as extra_storage_gb FROM tenants WHERE id = ?',
        [tenantId]
      );
      if (result.length === 0) return { extraUsers: 0, extraStorageGb: 0 };
      return {
        extraUsers: Number(result[0].extra_users) || 0,
        extraStorageGb: Number(result[0].extra_storage_gb) || 0
      };
    } catch {
      return { extraUsers: 0, extraStorageGb: 0 };
    }
  }

  /**
   * 创建扩容订单
   */
  async createOrder(tenantId: string, data: {
    type: 'user' | 'storage';
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

      const totalAmount = Number(config.unit_price) * data.quantity;
      const orderNo = 'CAP' + new Date().toISOString().replace(/[-T:\.Z]/g, '').substring(0, 14) + Math.random().toString(36).substring(2, 8).toUpperCase();
      const id = uuidv4();

      await AppDataSource.query(
        `INSERT INTO capacity_orders (id, order_no, tenant_id, type, quantity, unit_price, total_amount, billing_cycle, pay_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [id, orderNo, tenantId, data.type, data.quantity, config.unit_price, totalAmount, config.billing_cycle, data.payType]
      );

      // 同时在 payment_orders 创建关联订单（复用支付流程）
      const tenantInfo = await AppDataSource.query('SELECT name, phone, contact FROM tenants WHERE id = ?', [tenantId]);
      const tenant = tenantInfo[0] || {};
      const packageName = data.type === 'user' ? `扩容用户数 x${data.quantity}` : `扩容存储空间 ${data.quantity}GB`;

      await AppDataSource.query(
        `INSERT INTO payment_orders (id, order_no, tenant_id, tenant_name, package_name, amount, pay_type, status, contact_name, contact_phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
        [uuidv4(), orderNo, tenantId, tenant.name || '', packageName, totalAmount, data.payType, tenant.contact || '', tenant.phone || '']
      );

      return {
        success: true,
        message: '订单创建成功',
        data: { id, orderNo, totalAmount, type: data.type, quantity: data.quantity }
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
      }

      log.info(`[CapacityService] 扩容成功: tenant=${order.tenant_id}, type=${order.type}, qty=${order.quantity}`);
      return { success: true, message: '扩容成功' };
    } catch (error) {
      log.error('[CapacityService] 激活扩容失败:', error);
      return { success: false, message: '扩容激活失败' };
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
          type ENUM('user', 'storage') NOT NULL,
          billing_cycle ENUM('monthly', 'yearly', 'follow_package') NOT NULL DEFAULT 'follow_package',
          unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
          min_qty INT NOT NULL DEFAULT 1,
          max_qty INT NOT NULL DEFAULT 100,
          description VARCHAR(255) DEFAULT '',
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
          type ENUM('user', 'storage') NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
          total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          billing_cycle VARCHAR(20) NOT NULL DEFAULT 'follow_package',
          pay_type VARCHAR(20) DEFAULT NULL,
          status ENUM('pending', 'paid', 'closed', 'refunded') NOT NULL DEFAULT 'pending',
          trade_no VARCHAR(128) DEFAULT NULL,
          paid_at DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_tenant (tenant_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 安全迁移：为已有表添加 'refunded' 枚举值（忽略已存在的情况）
      try {
        await AppDataSource.query(
          `ALTER TABLE capacity_orders MODIFY COLUMN status ENUM('pending', 'paid', 'closed', 'refunded') NOT NULL DEFAULT 'pending'`
        );
      } catch { /* 忽略 */ }

      // 安全添加 tenants 扩容字段
      try {
        const cols = await AppDataSource.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME IN ('extra_users', 'extra_storage_gb')`
        );
        const existing = cols.map((c: any) => c.COLUMN_NAME);
        if (!existing.includes('extra_users')) {
          await AppDataSource.query('ALTER TABLE tenants ADD COLUMN extra_users INT NOT NULL DEFAULT 0');
        }
        if (!existing.includes('extra_storage_gb')) {
          await AppDataSource.query('ALTER TABLE tenants ADD COLUMN extra_storage_gb INT NOT NULL DEFAULT 0');
        }
      } catch { /* 忽略 */ }

      log.info('[CapacityService] 扩容表结构检查完成');
    } catch (error) {
      log.error('[CapacityService] 初始化表结构失败:', error);
    }
  }
}

export const capacityService = new CapacityService();

