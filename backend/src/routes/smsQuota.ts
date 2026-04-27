/**
 * 短信额度路由 - CRM端
 * 获取额度、套餐列表、创建购买订单、查询支付状态、账单记录
 * 2026-04-10 修复：租户隔离、tenant_name、通知机制
 * 2026-04-11 修复：兼容私有部署模式（tenant_id IS NULL）
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { SmsQuotaPackage } from '../entities/SmsQuotaPackage';
import { SmsQuotaOrder } from '../entities/SmsQuotaOrder';
import { IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';
import { log } from '../config/logger';
import { tenantRawSQLStrict, getTenantIdOrNull } from '../utils/tenantHelpers';

const router = Router();
router.use(authenticateToken);

// 生成订单号
function generateOrderNo(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SQ${dateStr}${random}`;
}

/**
 * 获取当前租户名称（辅助）
 * 私有部署模式下返回"私有部署"
 */
async function getTenantName(tenantId: string | null): Promise<string> {
  if (!tenantId) return '私有部署';
  try {
    const rows = await AppDataSource.query(
      `SELECT name FROM tenants WHERE id = ? LIMIT 1`,
      [tenantId]
    );
    return rows.length > 0 ? rows[0].name || '' : '';
  } catch {
    return '';
  }
}

/**
 * 获取当前租户的短信额度信息
 * 兼容私有部署（tenant_id IS NULL）和 SaaS（tenant_id = ?）
 */
router.get('/quota', async (_req: Request, res: Response) => {
  try {
    const t = tenantRawSQLStrict();

    // 获取额度数据（私有部署: AND tenant_id IS NULL; SaaS: AND tenant_id = ?）
    const rows = await AppDataSource.query(
      `SELECT config_key, config_value FROM system_config
       WHERE config_key IN ('sms_quota_total', 'sms_quota_used') ${t.sql}`,
      [...t.params]
    ).catch(() => []);

    let totalQuota = 0;
    let usedQuota = 0;
    for (const row of rows) {
      if (row.config_key === 'sms_quota_total') totalQuota = parseInt(row.config_value) || 0;
      if (row.config_key === 'sms_quota_used') usedQuota = parseInt(row.config_value) || 0;
    }

    // 获取全局单价
    const priceRows = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_unit_price' LIMIT 1`
    ).catch(() => []);
    const unitPrice = priceRows.length > 0 ? parseFloat(priceRows[0].config_value) : 0.045;

    const remaining = Math.max(0, totalQuota - usedQuota);
    const usagePercent = totalQuota > 0 ? Number(((usedQuota / totalQuota) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        totalQuota,
        usedQuota,
        remaining,
        usagePercent,
        unitPrice
      }
    });
  } catch (error: any) {
    log.error('[SmsQuota] 获取额度失败:', error);
    res.status(500).json({ success: false, message: '获取额度失败' });
  }
});

/**
 * 获取可用套餐列表
 */
router.get('/quota/packages', async (_req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(SmsQuotaPackage);
    const list = await repo.find({
      where: { isEnabled: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' }
    });
    res.json({ success: true, data: { list } });
  } catch (error: any) {
    log.error('[SmsQuota] 获取套餐列表失败:', error);
    res.status(500).json({ success: false, message: '获取套餐列表失败' });
  }
});

/**
 * 创建购买订单
 */
router.post('/quota/purchase', async (req: Request, res: Response) => {
  try {
    const { packageId, payType } = req.body;
    const currentUser = (req as any).user;
    const tenantId = getTenantIdOrNull();

    log.info(`[SmsQuota] 购买请求: packageId=${packageId}, payType=${payType}, tenantId=${tenantId ?? 'private'}, userId=${currentUser?.userId}`);

    if (!packageId || !payType) {
      log.warn(`[SmsQuota] 购买参数缺失: packageId=${packageId}, payType=${payType}, body=${JSON.stringify(req.body)}`);
      return res.status(400).json({ success: false, message: '请选择套餐和支付方式' });
    }

    // 查询套餐
    const pkgRepo = AppDataSource.getRepository(SmsQuotaPackage);
    const pkg = await pkgRepo.findOne({ where: { id: packageId, isEnabled: 1 } });
    if (!pkg) {
      return res.status(404).json({ success: false, message: '套餐不存在或已下架' });
    }

    // 获取租户名称
    const tenantName = tenantId ? await getTenantName(tenantId) : '';

    const orderId = uuidv4();
    const orderNo = generateOrderNo();

    // 调用PaymentService创建支付二维码
    let qrCode = '';
    let payUrl = '';

    try {
      const { paymentService } = await import('../services/PaymentService');
      const payResult = await paymentService.createOrder({
        packageId: pkg.id,
        packageName: `短信额度-${pkg.name}`,
        amount: Number(pkg.price),
        payType: payType as 'wechat' | 'alipay' | 'bank',
        tenantId: tenantId || undefined,
        tenantName,
        contactName: currentUser?.realName || currentUser?.username || '',
        contactPhone: '',
        billingCycle: 'once'
      });

      if (payResult.success) {
        qrCode = payResult.qrCode || '';
        payUrl = payResult.payUrl || '';
      }
    } catch (payErr: any) {
      log.warn('[SmsQuota] 支付服务调用失败:', payErr.message);
      qrCode = '';
      payUrl = '';
    }

    // 创建订单记录（包含tenant_name）
    const orderRepo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = orderRepo.create({
      id: orderId,
      orderNo,
      tenantId,
      tenantName,
      packageId: pkg.id,
      packageName: pkg.name,
      smsCount: pkg.smsCount,
      amount: Number(pkg.price),
      payType,
      status: 'pending',
      qrCode,
      payUrl,
      buyerId: currentUser?.userId || null,
      buyerName: currentUser?.realName || currentUser?.username || null,
      buyerSource: 'crm',
      expireTime: new Date(Date.now() + 30 * 60 * 1000) // 30分钟过期
    });

    await orderRepo.save(order);

    log.info(`[SmsQuota] 创建购买订单: ${orderNo}, 租户=${tenantName}(${tenantId}), 套餐=${pkg.name}, 金额=¥${pkg.price}`);

    res.json({
      success: true,
      data: {
        orderId,
        orderNo,
        amount: Number(pkg.price),
        smsCount: pkg.smsCount,
        packageName: pkg.name,
        qrCode,
        payUrl,
        payType
      }
    });
  } catch (error: any) {
    log.error('[SmsQuota] 创建订单失败:', error);
    res.status(500).json({ success: false, message: '创建订单失败' });
  }
});

/**
 * 查询订单支付状态
 * 🔒 修复租户隔离：必须同时匹配 orderNo + tenantId
 */
router.get('/quota/order/:orderNo', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;
    const tenantId = getTenantIdOrNull();

    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = await repo.findOne({
      where: { orderNo, tenantId: tenantId === null ? IsNull() as any : tenantId }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 🔑 兜底：订单仍为 pending 时，先查 payment_orders 是否已被回调更新
    if (order.status === 'pending') {
      try {
        const payRows = await AppDataSource.query(
          `SELECT status, pay_type, trade_no FROM payment_orders WHERE order_no = ? AND status = 'paid' LIMIT 1`,
          [orderNo]
        );
        if (payRows.length > 0) {
          // payment_orders 已 paid，同步更新 sms_quota_orders
          order.status = 'paid';
          order.paidAt = new Date();
          await repo.save(order);
          await addTenantQuota(order.tenantId ?? null, order.smsCount);
          log.info(`[SmsQuota] 兜底：从 payment_orders 同步支付状态成功: ${orderNo}`);
        } else {
          // payment_orders 也没更新，主动向支付渠道查询
          const payTypeRows = await AppDataSource.query(
            `SELECT pay_type FROM payment_orders WHERE order_no = ? LIMIT 1`, [orderNo]
          ).catch(() => []);
          const payType = payTypeRows[0]?.pay_type || order.payType;
          if (payType === 'wechat') {
            const { wechatPayService } = await import('../services/WechatPayService');
            const wxResult = await wechatPayService.queryOrder(orderNo);
            if (wxResult.success && wxResult.data?.trade_state === 'SUCCESS') {
              const { paymentService } = await import('../services/PaymentService');
              await paymentService.updateOrderStatus(orderNo, 'paid', { tradeNo: wxResult.data.transaction_id, paidAt: new Date() });
              order.status = 'paid';
              order.paidAt = new Date();
              await repo.save(order);
              await addTenantQuota(order.tenantId ?? null, order.smsCount);
              log.info(`[SmsQuota] 兜底：微信主动查询发现订单 ${orderNo} 已支付`);
            }
          } else if (payType === 'alipay') {
            const { alipayService } = await import('../services/AlipayService');
            const aliResult = await alipayService.queryOrder(orderNo);
            if (aliResult.success && (aliResult.data?.trade_status === 'TRADE_SUCCESS' || aliResult.data?.trade_status === 'TRADE_FINISHED')) {
              const { paymentService } = await import('../services/PaymentService');
              await paymentService.updateOrderStatus(orderNo, 'paid', { tradeNo: aliResult.data.trade_no, paidAt: new Date() });
              order.status = 'paid';
              order.paidAt = new Date();
              await repo.save(order);
              await addTenantQuota(order.tenantId ?? null, order.smsCount);
              log.info(`[SmsQuota] 兜底：支付宝主动查询发现订单 ${orderNo} 已支付`);
            }
          }
        }
      } catch (checkErr: any) {
        log.warn('[SmsQuota] 主动查询支付状态失败（不影响正常流程）:', checkErr.message?.substring(0, 100));
      }
    }

    res.json({
      success: true,
      data: {
        orderNo: order.orderNo,
        status: order.status,
        amount: order.amount,
        smsCount: order.smsCount,
        payType: order.payType,
        paidAt: order.paidAt,
        packageName: order.packageName
      }
    });
  } catch (error: any) {
    log.error('[SmsQuota] 查询订单状态失败:', error);
    res.status(500).json({ success: false, message: '查询订单状态失败' });
  }
});

/**
 * 模拟支付成功（开发环境调试用）
 * 🔒 修复租户隔离：必须同时匹配 orderNo + tenantId
 */
router.post('/quota/simulate-pay/:orderNo', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: '生产环境不可使用模拟支付' });
    }
    const { orderNo } = req.params;
    const tenantId = getTenantIdOrNull();

    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = await repo.findOne({
      where: { orderNo, tenantId: tenantId === null ? IsNull() as any : tenantId }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: '订单状态不是待支付' });
    }

    // 标记已支付
    order.status = 'paid';
    order.paidAt = new Date();
    await repo.save(order);

    // 增加租户短信额度（兼容私有部署 tenantId=null）
    await addTenantQuota(order.tenantId ?? null, order.smsCount);

    log.info(`[SmsQuota] 模拟支付成功: ${orderNo}, +${order.smsCount}条`);

    // 发送通知给管理员
    try {
      const { adminNotificationService } = await import('../services/AdminNotificationService');
      await adminNotificationService.notify('sms_quota_purchased', {
        title: '短信额度购买成功',
        content: `租户 ${order.tenantName || order.tenantId || '私有部署'} 购买了 ${order.packageName}（${order.smsCount}条），金额 ¥${order.amount}，来源: CRM`,
        relatedId: order.id,
        relatedType: 'sms_quota_order'
      });
    } catch { /* 通知失败不影响主流程 */ }

    res.json({ success: true, message: '支付成功', data: { smsCount: order.smsCount } });
  } catch (error: any) {
    log.error('[SmsQuota] 模拟支付失败:', error);
    res.status(500).json({ success: false, message: '模拟支付失败' });
  }
});

/**
 * 获取购买账单记录（返回所有状态）
 */
router.get('/quota/bills', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdOrNull();
    const { page = 1, pageSize = 10 } = req.query;

    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const qb = repo.createQueryBuilder('o');

    // 兼容私有部署（tenant_id IS NULL）和 SaaS（tenant_id = ?）
    if (tenantId) {
      qb.where('o.tenant_id = :tenantId', { tenantId });
    } else {
      qb.where('o.tenant_id IS NULL');
    }

    qb.orderBy('o.created_at', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (error: any) {
    log.error('[SmsQuota] 获取账单失败:', error);
    res.status(500).json({ success: false, message: '获取账单失败' });
  }
});

/**
 * 取消未支付订单
 * 🔒 租户隔离：必须同时匹配 orderNo + tenantId
 */
router.post('/quota/order/:orderNo/cancel', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;
    const tenantId = getTenantIdOrNull();

    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = await repo.findOne({
      where: { orderNo, tenantId: tenantId === null ? IsNull() as any : tenantId }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: '仅待支付的订单可以取消' });
    }

    order.status = 'closed';
    await repo.save(order);

    log.info(`[SmsQuota] 取消订单: ${orderNo}, 租户=${tenantId ?? 'private'}`);

    res.json({ success: true, message: '订单已取消' });
  } catch (error: any) {
    log.error('[SmsQuota] 取消订单失败:', error);
    res.status(500).json({ success: false, message: '取消订单失败' });
  }
});

// ==================== 辅助函数 ====================

/**
 * 增加租户短信额度
 * 兼容私有部署（tenantId=null → tenant_id IS NULL）和 SaaS（tenantId有值）
 */
async function addTenantQuota(tenantId: string | null, smsCount: number): Promise<void> {
  if (tenantId) {
    // SaaS 模式：按 tenant_id 精确匹配
    await AppDataSource.query(
      `INSERT INTO system_config (config_key, config_value, config_group, tenant_id, description)
       VALUES ('sms_quota_total', ?, 'sms_quota', ?, '短信总额度')
       ON DUPLICATE KEY UPDATE config_value = CAST(config_value AS SIGNED) + ?, updated_at = NOW()`,
      [String(smsCount), tenantId, smsCount]
    );
    await AppDataSource.query(
      `INSERT IGNORE INTO system_config (config_key, config_value, config_group, tenant_id, description)
       VALUES ('sms_quota_used', '0', 'sms_quota', ?, '短信已用额度')`,
      [tenantId]
    );
  } else {
    // 私有部署模式：tenant_id 为 NULL
    // 先检查是否已存在
    const existing = await AppDataSource.query(
      `SELECT id, config_value FROM system_config WHERE config_key = 'sms_quota_total' AND tenant_id IS NULL LIMIT 1`
    );
    if (existing.length > 0) {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = CAST(config_value AS SIGNED) + ?, updated_at = NOW()
         WHERE config_key = 'sms_quota_total' AND tenant_id IS NULL`,
        [smsCount]
      );
    } else {
      await AppDataSource.query(
        `INSERT INTO system_config (config_key, config_value, config_group, tenant_id, description)
         VALUES ('sms_quota_total', ?, 'sms_quota', NULL, '短信总额度')`,
        [String(smsCount)]
      );
    }

    // sms_quota_used: 确保存在
    const usedExists = await AppDataSource.query(
      `SELECT id FROM system_config WHERE config_key = 'sms_quota_used' AND tenant_id IS NULL LIMIT 1`
    );
    if (usedExists.length === 0) {
      await AppDataSource.query(
        `INSERT INTO system_config (config_key, config_value, config_group, tenant_id, description)
         VALUES ('sms_quota_used', '0', 'sms_quota', NULL, '短信已用额度')`
      );
    }
  }
}

// 导出 addTenantQuota 供支付回调使用
export { addTenantQuota };
export default router;

