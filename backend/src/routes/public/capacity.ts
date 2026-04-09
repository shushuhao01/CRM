/**
 * 公开端扩容管理路由（会员中心使用）
 */
import { Router, Request, Response } from 'express';
import { memberAuth } from '../../middleware/memberAuth';
import { capacityService } from '../../services/CapacityService';
import { log } from '../../config/logger';

const router = Router();

/**
 * GET /api/v1/public/capacity/prices
 * GET /api/v1/public/capacity/price (别名)
 * 获取可用的扩容价格列表（公开，不需要认证）
 */
const pricesHandler = async (_req: Request, res: Response) => {
  try {
    const prices = await capacityService.getActivePrices();
    res.json({ code: 0, data: prices });
  } catch (error) {
    log.error('获取扩容价格失败:', error);
    res.status(500).json({ code: 1, message: '获取失败' });
  }
};
router.get('/prices', pricesHandler);
router.get('/price', pricesHandler);

/**
 * GET /api/v1/public/capacity/my
 * 获取当前租户的扩容额度和订单
 */
router.get('/my', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const [capacity, orders] = await Promise.all([
      capacityService.getTenantCapacity(tenantId),
      capacityService.getOrders(tenantId, page, pageSize)
    ]);

    res.json({ code: 0, data: { capacity, orders } });
  } catch (error) {
    log.error('获取扩容信息失败:', error);
    res.status(500).json({ code: 1, message: '获取失败' });
  }
});

/**
 * POST /api/v1/public/capacity/order
 * 创建扩容订单
 */
router.post('/order', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const { type, quantity, priceConfigId, payType } = req.body;

    if (!type || !quantity || !priceConfigId || !payType) {
      return res.status(400).json({ code: 1, message: '参数不完整' });
    }

    const result = await capacityService.createOrder(tenantId, {
      type, quantity: Number(quantity), priceConfigId, payType
    });

    // 订单创建成功后，前端可使用 /public/payment/repay/:orderNo 生成支付二维码
    res.json({ code: result.success ? 0 : 1, message: result.message, data: result.data });
  } catch (error) {
    log.error('创建扩容订单失败:', error);
    res.status(500).json({ code: 1, message: '创建失败' });
  }
});

export default router;

