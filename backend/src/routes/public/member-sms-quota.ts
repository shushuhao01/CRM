/**
 * 会员中心 - 短信额度路由
 * 获取额度、套餐列表、创建购买订单、查询支付状态、账单记录
 * 2026-04-10 修复：租户隔离、tenant_name、通知机制
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { SmsQuotaPackage } from '../../entities/SmsQuotaPackage';
import { SmsQuotaOrder } from '../../entities/SmsQuotaOrder';
import { v4 as uuidv4 } from 'uuid';
import { memberAuth } from '../../middleware/memberAuth';
import { log } from '../../config/logger';

const router = Router();

// 全部需要会员认证
router.use(memberAuth);

function generateOrderNo(): string {
  const now = new Date();
  const ds = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  return `MSQ${ds}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

/**
 * 获取短信额度信息
 * GET /api/v1/public/member/sms-quota
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const rows = await AppDataSource.query(
      `SELECT config_key, config_value FROM system_config
       WHERE config_key IN ('sms_quota_total', 'sms_quota_used') AND tenant_id = ?`,
      [tenantId]
    ).catch(() => []);

    let totalQuota = 0, usedQuota = 0;
    for (const r of rows) {
      if (r.config_key === 'sms_quota_total') totalQuota = parseInt(r.config_value) || 0;
      if (r.config_key === 'sms_quota_used') usedQuota = parseInt(r.config_value) || 0;
    }

    const priceRows = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_unit_price' LIMIT 1`
    ).catch(() => []);
    const unitPrice = priceRows.length > 0 ? parseFloat(priceRows[0].config_value) : 0.045;

    const remaining = Math.max(0, totalQuota - usedQuota);
    const usagePercent = totalQuota > 0 ? Number(((usedQuota / totalQuota) * 100).toFixed(1)) : 0;

    res.json({ code: 0, data: { totalQuota, usedQuota, remaining, usagePercent, unitPrice } });
  } catch (error: any) {
    log.error('[MemberSmsQuota] 获取额度失败:', error);
    res.status(500).json({ code: 1, message: '获取额度失败' });
  }
});

/**
 * 获取可用套餐列表
 * GET /api/v1/public/member/sms-quota/packages
 */
router.get('/packages', async (_req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(SmsQuotaPackage);
    const list = await repo.find({
      where: { isEnabled: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' }
    });
    res.json({ code: 0, data: { list } });
  } catch (error: any) {
    log.error('[MemberSmsQuota] 获取套餐失败:', error);
    res.status(500).json({ code: 1, message: '获取套餐失败' });
  }
});

/**
 * 创建购买订单
 * POST /api/v1/public/member/sms-quota/purchase
 */
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const tenant = (req as any).memberTenant;
    if (!tenant?.id) return res.status(401).json({ code: 1, message: '未登录' });

    const { packageId, payType } = req.body;
    if (!packageId || !payType) {
      return res.status(400).json({ code: 1, message: '请选择套餐和支付方式' });
    }

    const pkgRepo = AppDataSource.getRepository(SmsQuotaPackage);
    const pkg = await pkgRepo.findOne({ where: { id: packageId, isEnabled: 1 } });
    if (!pkg) return res.status(404).json({ code: 1, message: '套餐不存在或已下架' });

    const tenantName = tenant.name || tenant.company_name || tenant.companyName || '';

    const orderId = uuidv4();
    const orderNo = generateOrderNo();

    // 调用PaymentService创建支付二维码
    let qrCode = '', payUrl = '';
    try {
      const { paymentService } = await import('../../services/PaymentService');
      const payResult = await paymentService.createOrder({
        packageId: pkg.id,
        packageName: `短信额度-${pkg.name}`,
        amount: Number(pkg.price),
        payType: payType as 'wechat' | 'alipay' | 'bank',
        tenantId: tenant.id,
        tenantName,
        contactName: tenant.contact || tenant.name || '',
        contactPhone: tenant.phone || '',
        billingCycle: 'once'
      });
      if (payResult.success) {
        qrCode = payResult.qrCode || '';
        payUrl = payResult.payUrl || '';
      }
    } catch (payErr: any) {
      log.warn('[MemberSmsQuota] 支付服务调用失败:', payErr.message);
      qrCode = '';
      payUrl = '';
    }

    const orderRepo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = orderRepo.create({
      id: orderId,
      orderNo,
      tenantId: tenant.id,
      tenantName,
      packageId: pkg.id,
      packageName: pkg.name,
      smsCount: pkg.smsCount,
      amount: Number(pkg.price),
      payType,
      status: 'pending',
      qrCode,
      payUrl,
      buyerId: tenant.id,
      buyerName: tenant.name || tenant.contact || '',
      buyerSource: 'member',
      expireTime: new Date(Date.now() + 30 * 60 * 1000)
    });
    await orderRepo.save(order);

    log.info(`[MemberSmsQuota] 会员创建购买订单: ${orderNo}, 租户=${tenantName}(${tenant.id}), 套餐=${pkg.name}, ¥${pkg.price}`);

    res.json({
      code: 0,
      data: { orderId, orderNo, amount: Number(pkg.price), smsCount: pkg.smsCount, packageName: pkg.name, qrCode, payUrl, payType }
    });
  } catch (error: any) {
    log.error('[MemberSmsQuota] 创建订单失败:', error);
    res.status(500).json({ code: 1, message: '创建订单失败' });
  }
});

/**
 * 查询订单支付状态
 * GET /api/v1/public/member/sms-quota/order/:orderNo
 * 🔒 修复租户隔离：必须同时匹配 orderNo + tenantId
 */
router.get('/order/:orderNo', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = await repo.findOne({ where: { orderNo, tenantId } });
    if (!order) return res.status(404).json({ code: 1, message: '订单不存在' });

    // 🔑 兜底：订单仍为 pending 时，先查 payment_orders 是否已被回调更新
    if (order.status === 'pending') {
      try {
        const payRows = await AppDataSource.query(
          `SELECT status, pay_type, trade_no FROM payment_orders WHERE order_no = ? AND status = 'paid' LIMIT 1`,
          [orderNo]
        );
        if (payRows.length > 0) {
          order.status = 'paid';
          order.paidAt = new Date();
          await repo.save(order);
          const { addTenantQuota } = await import('../smsQuota');
          await addTenantQuota(order.tenantId!, order.smsCount);
          log.info(`[MemberSmsQuota] 兜底：从 payment_orders 同步支付状态成功: ${orderNo}`);
        } else {
          // 主动向支付渠道查询
          const payTypeRows = await AppDataSource.query(
            `SELECT pay_type FROM payment_orders WHERE order_no = ? LIMIT 1`, [orderNo]
          ).catch(() => []);
          const payType = payTypeRows[0]?.pay_type || order.payType;
          if (payType === 'wechat') {
            const { wechatPayService } = await import('../../services/WechatPayService');
            const wxResult = await wechatPayService.queryOrder(orderNo);
            if (wxResult.success && wxResult.data?.trade_state === 'SUCCESS') {
              const { paymentService } = await import('../../services/PaymentService');
              await paymentService.updateOrderStatus(orderNo, 'paid', { tradeNo: wxResult.data.transaction_id, paidAt: new Date() });
              order.status = 'paid';
              order.paidAt = new Date();
              await repo.save(order);
              const { addTenantQuota } = await import('../smsQuota');
              await addTenantQuota(order.tenantId!, order.smsCount);
              log.info(`[MemberSmsQuota] 兜底：微信主动查询发现订单 ${orderNo} 已支付`);
            }
          } else if (payType === 'alipay') {
            const { alipayService } = await import('../../services/AlipayService');
            const aliResult = await alipayService.queryOrder(orderNo);
            if (aliResult.success && (aliResult.data?.trade_status === 'TRADE_SUCCESS' || aliResult.data?.trade_status === 'TRADE_FINISHED')) {
              const { paymentService } = await import('../../services/PaymentService');
              await paymentService.updateOrderStatus(orderNo, 'paid', { tradeNo: aliResult.data.trade_no, paidAt: new Date() });
              order.status = 'paid';
              order.paidAt = new Date();
              await repo.save(order);
              const { addTenantQuota } = await import('../smsQuota');
              await addTenantQuota(order.tenantId!, order.smsCount);
              log.info(`[MemberSmsQuota] 兜底：支付宝主动查询发现订单 ${orderNo} 已支付`);
            }
          }
        }
      } catch (checkErr: any) {
        log.warn('[MemberSmsQuota] 主动查询支付状态失败（不影响正常流程）:', checkErr.message?.substring(0, 100));
      }
    }

    res.json({ code: 0, data: { orderNo: order.orderNo, status: order.status, amount: order.amount, smsCount: order.smsCount, paidAt: order.paidAt, packageName: order.packageName } });
  } catch (error: any) {
    log.error('[MemberSmsQuota] 查询订单失败:', error);
    res.status(500).json({ code: 1, message: '查询订单失败' });
  }
});

/**
 * 模拟支付（开发调试）
 * POST /api/v1/public/member/sms-quota/simulate-pay/:orderNo
 * 🔒 修复租户隔离：必须同时匹配 orderNo + tenantId
 */
router.post('/simulate-pay/:orderNo', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ code: 1, message: '生产环境不可使用模拟支付' });
    }
    const { orderNo } = req.params;
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const order = await repo.findOne({ where: { orderNo, tenantId } });
    if (!order) return res.status(404).json({ code: 1, message: '订单不存在' });
    if (order.status !== 'pending') return res.status(400).json({ code: 1, message: '订单不是待支付状态' });

    order.status = 'paid';
    order.paidAt = new Date();
    await repo.save(order);

    // 增加额度
    const { addTenantQuota } = await import('../smsQuota');
    await addTenantQuota(order.tenantId!, order.smsCount);

    log.info(`[MemberSmsQuota] 模拟支付成功: ${orderNo}, +${order.smsCount}条`);

    // 发送通知给管理员
    try {
      const { adminNotificationService } = await import('../../services/AdminNotificationService');
      await adminNotificationService.notify('sms_quota_purchased', {
        title: '短信额度购买成功',
        content: `租户 ${order.tenantName || order.tenantId} 通过会员中心购买了 ${order.packageName}（${order.smsCount}条），金额 ¥${order.amount}`,
        relatedId: order.id,
        relatedType: 'sms_quota_order'
      });
    } catch { /* 通知失败不影响主流程 */ }

    res.json({ code: 0, message: '支付成功', data: { smsCount: order.smsCount } });
  } catch (error: any) {
    log.error('[MemberSmsQuota] 模拟支付失败:', error);
    res.status(500).json({ code: 1, message: '模拟支付失败' });
  }
});

/**
 * 获取购买记录
 * GET /api/v1/public/member/sms-quota/bills
 */
router.get('/bills', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const { page = 1, pageSize = 10 } = req.query;
    const repo = AppDataSource.getRepository(SmsQuotaOrder);
    const qb = repo.createQueryBuilder('o')
      .where('o.tenant_id = :tenantId', { tenantId })
      .andWhere('o.status IN (:...statuses)', { statuses: ['paid', 'refunded'] })
      .orderBy('o.created_at', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();
    res.json({ code: 0, data: { list, total } });
  } catch (error: any) {
    log.error('[MemberSmsQuota] 获取账单失败:', error);
    res.status(500).json({ code: 1, message: '获取账单失败' });
  }
});

export default router;

