/**
 * 管理后台 - 短信额度套餐管理路由
 * 套餐CRUD、单条价格设置、订单查询、退款
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { SmsQuotaPackage } from '../../entities/SmsQuotaPackage';
import { SmsQuotaOrder } from '../../entities/SmsQuotaOrder';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../../config/logger';
import { adminNotificationService } from '../../services/AdminNotificationService';

const router = Router();

// ==================== 自动建表 ====================

const ensureTables = async () => {
  try {
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS sms_quota_packages (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '套餐名称',
        sms_count INT NOT NULL COMMENT '短信条数',
        price DECIMAL(10,2) NOT NULL COMMENT '套餐价格(元)',
        unit_price DECIMAL(10,4) DEFAULT 0 COMMENT '单条价格(元)',
        description VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
        sort_order INT DEFAULT 0 COMMENT '排序权重',
        is_enabled TINYINT DEFAULT 1 COMMENT '是否启用',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度套餐'
    `);
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS sms_quota_orders (
        id VARCHAR(36) PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        tenant_name VARCHAR(200) DEFAULT NULL COMMENT '租户名称',
        package_id VARCHAR(36) DEFAULT NULL COMMENT '套餐ID',
        package_name VARCHAR(100) DEFAULT NULL COMMENT '套餐名称',
        sms_count INT DEFAULT 0 COMMENT '购买短信条数',
        amount DECIMAL(10,2) DEFAULT 0 COMMENT '支付金额',
        pay_type VARCHAR(20) DEFAULT NULL COMMENT '支付方式',
        status VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
        qr_code TEXT DEFAULT NULL,
        pay_url TEXT DEFAULT NULL,
        paid_at DATETIME DEFAULT NULL,
        buyer_id VARCHAR(36) DEFAULT NULL,
        buyer_name VARCHAR(100) DEFAULT NULL,
        buyer_source VARCHAR(20) DEFAULT 'crm',
        refund_amount DECIMAL(10,2) DEFAULT 0,
        refund_sms_count INT DEFAULT 0,
        refund_at DATETIME DEFAULT NULL,
        refund_reason VARCHAR(500) DEFAULT NULL,
        refunded_by VARCHAR(100) DEFAULT NULL,
        expire_time DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_status (status),
        INDEX idx_order_no (order_no)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度购买订单'
    `);

    // 兼容旧表：自动补充 tenant_name 字段（如果表已存在但缺少该字段）
    try {
      const cols = await AppDataSource.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_quota_orders' AND COLUMN_NAME = 'tenant_name'`
      );
      if (cols.length === 0) {
        await AppDataSource.query(
          `ALTER TABLE sms_quota_orders ADD COLUMN tenant_name VARCHAR(200) DEFAULT NULL COMMENT '租户名称' AFTER tenant_id`
        );
        log.info('[SmsQuota] 自动补充 tenant_name 字段');
      }
    } catch { /* 字段已存在则跳过 */ }

    // 自动关闭过期的待支付订单（超过30分钟未支付）
    try {
      const closed = await AppDataSource.query(
        `UPDATE sms_quota_orders SET status = 'closed', updated_at = NOW()
         WHERE status = 'pending' AND expire_time IS NOT NULL AND expire_time < NOW()`
      );
      if (closed.affectedRows > 0) {
        log.info(`[SmsQuota] 自动关闭 ${closed.affectedRows} 个过期订单`);
      }
    } catch { /* ignore */ }

  } catch (e: any) {
    log.warn('[SmsQuota] 自动建表跳过:', e.message);
  }
};
setTimeout(() => ensureTables(), 3000);

// ==================== 单条价格管理 ====================

/**
 * 获取全局单条短信价格
 */
router.get('/unit-price', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_unit_price' LIMIT 1`
    ).catch(() => []);
    const unitPrice = rows.length > 0 ? parseFloat(rows[0].config_value) : 0.045;
    res.json({ success: true, data: { unitPrice } });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 获取单价失败:', error);
    res.status(500).json({ success: false, message: '获取单价失败' });
  }
});

/**
 * 设置全局单条短信价格
 */
router.put('/unit-price', async (req: Request, res: Response) => {
  try {
    const { unitPrice } = req.body;
    if (unitPrice === undefined || unitPrice < 0) {
      return res.status(400).json({ success: false, message: '价格不能为负数' });
    }
    // upsert
    await AppDataSource.query(
      `INSERT INTO system_config (config_key, config_value, config_group, description)
       VALUES ('sms_unit_price', ?, 'sms_quota', '单条短信价格(元)')
       ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()`,
      [String(unitPrice), String(unitPrice)]
    );
    res.json({ success: true, message: '保存成功' });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 设置单价失败:', error);
    res.status(500).json({ success: false, message: '设置单价失败' });
  }
});

// ==================== 套餐 CRUD ====================

/**
 * 获取所有套餐（含禁用）
 */
router.get('/packages', async (req: Request, res: Response) => {
  try {
    const { keyword, enabled } = req.query;
    const repo = AppDataSource.getRepository(SmsQuotaPackage);
    const qb = repo.createQueryBuilder('p');

    if (keyword) {
      qb.andWhere('p.name LIKE :kw', { kw: `%${keyword}%` });
    }
    if (enabled !== undefined && enabled !== '') {
      qb.andWhere('p.is_enabled = :enabled', { enabled: Number(enabled) });
    }

    qb.orderBy('p.sort_order', 'ASC').addOrderBy('p.created_at', 'DESC');
    const list = await qb.getMany();

    res.json({ success: true, data: { list } });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 获取套餐列表失败:', error);
    res.status(500).json({ success: false, message: '获取套餐列表失败' });
  }
});

/**
 * 创建套餐
 */
router.post('/packages', async (req: Request, res: Response) => {
  try {
    const { name, smsCount, price, description, sortOrder } = req.body;
    if (!name || !smsCount || !price) {
      return res.status(400).json({ success: false, message: '套餐名称、条数和价格不能为空' });
    }

    const repo = AppDataSource.getRepository(SmsQuotaPackage);
    const pkg = repo.create({
      id: uuidv4(),
      name,
      smsCount: Number(smsCount),
      price: Number(price),
      unitPrice: Number((Number(price) / Number(smsCount)).toFixed(4)),
      description: description || null,
      sortOrder: sortOrder || 0,
      isEnabled: 1
    });

    await repo.save(pkg);
    log.info(`[Admin SmsQuota] 创建套餐: ${name}, ${smsCount}条, ¥${price}`);
    res.json({ success: true, data: pkg, message: '创建成功' });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 创建套餐失败:', error);
    res.status(500).json({ success: false, message: '创建套餐失败' });
  }
});

/**
 * 编辑套餐
 */
router.put('/packages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, smsCount, price, description, sortOrder, isEnabled } = req.body;

    const repo = AppDataSource.getRepository(SmsQuotaPackage);
    const pkg = await repo.findOne({ where: { id } });
    if (!pkg) {
      return res.status(404).json({ success: false, message: '套餐不存在' });
    }

    if (name !== undefined) pkg.name = name;
    if (smsCount !== undefined) pkg.smsCount = Number(smsCount);
    if (price !== undefined) pkg.price = Number(price);
    if (description !== undefined) pkg.description = description;
    if (sortOrder !== undefined) pkg.sortOrder = Number(sortOrder);
    if (isEnabled !== undefined) pkg.isEnabled = Number(isEnabled);

    // 自动计算单价
    if (pkg.smsCount > 0 && pkg.price > 0) {
      pkg.unitPrice = Number((pkg.price / pkg.smsCount).toFixed(4));
    }

    await repo.save(pkg);
    log.info(`[Admin SmsQuota] 编辑套餐: ${pkg.name} (${id})`);
    res.json({ success: true, data: pkg, message: '保存成功' });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 编辑套餐失败:', error);
    res.status(500).json({ success: false, message: '编辑套餐失败' });
  }
});

/**
 * 删除套餐
 */
router.delete('/packages/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(SmsQuotaPackage);
    const pkg = await repo.findOne({ where: { id } });
    if (!pkg) {
      return res.status(404).json({ success: false, message: '套餐不存在' });
    }

    await repo.remove(pkg);
    log.info(`[Admin SmsQuota] 删除套餐: ${pkg.name} (${id})`);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 删除套餐失败:', error);
    res.status(500).json({ success: false, message: '删除套餐失败' });
  }
});

// ==================== 订单查询 ====================

/**
 * 获取短信额度订单列表（跨租户）
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, tenantId, orderNo, startDate, endDate, buyerName } = req.query;
    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const qb = repo.createQueryBuilder('o');

    if (status) qb.andWhere('o.status = :status', { status });
    if (tenantId) qb.andWhere('o.tenant_id = :tenantId', { tenantId });
    if (orderNo) qb.andWhere('(o.order_no LIKE :orderNo OR o.buyer_name LIKE :orderNo OR o.tenant_name LIKE :orderNo)', { orderNo: `%${orderNo}%` });
    if (buyerName && !orderNo) qb.andWhere('(o.buyer_name LIKE :bn OR o.tenant_name LIKE :bn)', { bn: `%${buyerName}%` });
    if (startDate) qb.andWhere('o.created_at >= :startDate', { startDate });
    if (endDate) qb.andWhere('o.created_at <= :endDate', { endDate: `${endDate} 23:59:59` });

    qb.orderBy('o.created_at', 'DESC');
    qb.skip((Number(page) - 1) * Number(pageSize));
    qb.take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();

    // 对没有 tenant_name 的订单尝试补充租户名称
    const needNameIds = list.filter(o => o.tenantId && !o.tenantName).map(o => o.tenantId);
    if (needNameIds.length > 0) {
      try {
        const uniqueIds = [...new Set(needNameIds)];
        const tenantRows = await AppDataSource.query(
          `SELECT id, name FROM tenants WHERE id IN (${uniqueIds.map(() => '?').join(',')})`,
          uniqueIds
        ).catch(() => []);
        const nameMap: Record<string, string> = {};
        for (const t of tenantRows) nameMap[t.id] = t.name;
        for (const o of list) {
          if (o.tenantId && !o.tenantName && nameMap[o.tenantId]) {
            (o as any).tenantName = nameMap[o.tenantId];
          }
        }
      } catch { /* ignore */ }
    }

    // 统计 — 按当前筛选条件统计（而不是全局）
    const statsQb = AppDataSource.createQueryBuilder()
      .select([
        'COUNT(*) as totalOrders',
        "SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as totalRevenue",
        "SUM(CASE WHEN status = 'paid' THEN sms_count ELSE 0 END) as totalSmsSold",
        "SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END) as totalRefunded"
      ])
      .from('sms_quota_orders', 'o');

    if (status) statsQb.andWhere('o.status = :status', { status });
    if (tenantId) statsQb.andWhere('o.tenant_id = :tenantId', { tenantId });
    if (startDate) statsQb.andWhere('o.created_at >= :startDate', { startDate });
    if (endDate) statsQb.andWhere('o.created_at <= :endDate', { endDate: `${endDate} 23:59:59` });

    const statsResult = await statsQb.getRawOne().catch(() => ({ totalOrders: 0, totalRevenue: 0, totalSmsSold: 0, totalRefunded: 0 }));

    res.json({
      success: true,
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        stats: statsResult || {}
      }
    });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 获取订单列表失败:', error);
    res.status(500).json({ success: false, message: '获取订单列表失败' });
  }
});

// ==================== 退款 ====================

/**
 * 退款预览 - 查看可退信息（不执行退款）
 */
router.get('/refund-preview/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = await repo.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, message: '仅已支付订单可退款' });
    }

    // 获取该租户当前额度（兼容私有部署 tenant_id IS NULL）
    const tenantCondition = order.tenantId ? 'AND tenant_id = ?' : 'AND tenant_id IS NULL';
    const tenantParams = order.tenantId ? [order.tenantId] : [];

    const quotaRows = await AppDataSource.query(
      `SELECT config_key, config_value FROM system_config
       WHERE config_key IN ('sms_quota_total', 'sms_quota_used') ${tenantCondition}`,
      tenantParams
    ).catch(() => []);

    let totalQuota = 0, usedQuota = 0;
    for (const r of quotaRows) {
      if (r.config_key === 'sms_quota_total') totalQuota = parseInt(r.config_value) || 0;
      if (r.config_key === 'sms_quota_used') usedQuota = parseInt(r.config_value) || 0;
    }
    const remainingQuota = Math.max(0, totalQuota - usedQuota);

    const refundableSmsCount = Math.min(order.smsCount, remainingQuota);
    const refundAmount = refundableSmsCount > 0
      ? Number(((refundableSmsCount / order.smsCount) * Number(order.amount)).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: {
        orderNo: order.orderNo,
        packageName: order.packageName,
        tenantName: order.tenantName || order.tenantId || '私有部署',
        originalAmount: Number(order.amount),
        originalSmsCount: order.smsCount,
        totalQuota,
        usedQuota,
        remainingQuota,
        refundableSmsCount,
        refundAmount,
        payType: order.payType,
        canRefund: refundableSmsCount > 0
      }
    });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 退款预览失败:', error);
    res.status(500).json({ success: false, message: '退款预览失败' });
  }
});

/**
 * 退款 - 仅退剩余未使用额度对应金额
 */
router.post('/refund/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const adminUser = (req as any).adminUser;

    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = await repo.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, message: '仅已支付订单可退款' });
    }

    // 获取该租户当前已用额度（兼容私有部署 tenant_id IS NULL）
    const tenantCondition = order.tenantId ? 'AND tenant_id = ?' : 'AND tenant_id IS NULL';
    const tenantParams = order.tenantId ? [order.tenantId] : [];

    const quotaRows = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_quota_used' ${tenantCondition}`,
      tenantParams
    ).catch(() => []);

    const quotaTotalRows = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_quota_total' ${tenantCondition}`,
      tenantParams
    ).catch(() => []);

    const totalQuota = quotaTotalRows.length > 0 ? parseInt(quotaTotalRows[0].config_value) : 0;
    const usedQuota = quotaRows.length > 0 ? parseInt(quotaRows[0].config_value) : 0;
    const remainingQuota = Math.max(0, totalQuota - usedQuota);

    // 本订单可退条数 = min(订单购买条数, 当前剩余条数)
    const refundableSmsCount = Math.min(order.smsCount, remainingQuota);
    if (refundableSmsCount <= 0) {
      return res.status(400).json({ success: false, message: '额度已全部使用，无法退款' });
    }

    // 按比例计算退款金额
    const refundAmount = Number(((refundableSmsCount / order.smsCount) * Number(order.amount)).toFixed(2));

    // 更新订单状态
    order.status = 'refunded';
    order.refundAmount = refundAmount;
    order.refundSmsCount = refundableSmsCount;
    order.refundAt = new Date();
    order.refundReason = reason || '管理员退款';
    order.refundedBy = adminUser?.username || adminUser?.realName || 'admin';
    await repo.save(order);

    // 从租户总额度中扣减退款条数（兼容私有部署 tenant_id IS NULL）
    await AppDataSource.query(
      `UPDATE system_config SET config_value = GREATEST(0, CAST(config_value AS SIGNED) - ?)
       WHERE config_key = 'sms_quota_total' ${tenantCondition}`,
      [refundableSmsCount, ...tenantParams]
    );

    log.info(`[Admin SmsQuota] 退款成功: 订单${order.orderNo}, 退款¥${refundAmount}, 退${refundableSmsCount}条`);

    // 发送退款通知给管理员
    try {
      await adminNotificationService.notify('sms_quota_refunded', {
        title: '短信额度退款',
        content: `订单 ${order.orderNo} 已退款 ¥${refundAmount}，退还 ${refundableSmsCount} 条额度`,
        relatedId: order.id,
        relatedType: 'sms_quota_order'
      });
    } catch { /* 通知失败不影响退款 */ }

    res.json({
      success: true,
      message: '退款成功',
      data: {
        refundAmount,
        refundSmsCount: refundableSmsCount,
        orderNo: order.orderNo
      }
    });
  } catch (error: any) {
    log.error('[Admin SmsQuota] 退款失败:', error);
    res.status(500).json({ success: false, message: '退款失败' });
  }
});

export default router;

