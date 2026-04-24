/**
 * Admin 扩容管理路由
 * 管理扩容价格配置
 */
import { Router, Request, Response } from 'express';
import { capacityService } from '../../services/CapacityService';
import { log } from '../../config/logger';

const router = Router();

// 延迟初始化表结构,等待数据库连接建立
setTimeout(() => {
  capacityService.ensureTables().catch(() => {});
}, 3000);

/**
 * GET /api/v1/admin/capacity/configs
 * 获取所有扩容价格配置
 */
router.get('/configs', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const configs = await capacityService.getPriceConfigs({ type: type as string });
    res.json({ success: true, data: configs });
  } catch (error) {
    log.error('获取扩容价格配置失败:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

/**
 * POST /api/v1/admin/capacity/configs
 * 创建扩容价格配置
 */
router.post('/configs', async (req: Request, res: Response) => {
  try {
    const result = await capacityService.savePriceConfig(req.body);
    res.json(result);
  } catch (error) {
    log.error('创建扩容价格配置失败:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

/**
 * PUT /api/v1/admin/capacity/configs/:id
 * 更新扩容价格配置
 */
router.put('/configs/:id', async (req: Request, res: Response) => {
  try {
    const result = await capacityService.savePriceConfig({ ...req.body, id: req.params.id });
    res.json(result);
  } catch (error) {
    log.error('更新扩容价格配置失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

/**
 * DELETE /api/v1/admin/capacity/configs/:id
 * 删除扩容价格配置
 */
router.delete('/configs/:id', async (req: Request, res: Response) => {
  try {
    const result = await capacityService.deletePriceConfig(req.params.id);
    res.json(result);
  } catch (error) {
    log.error('删除扩容价格配置失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/**
 * GET /api/v1/admin/capacity/orders
 * 管理后台查询扩容订单（支持按 tenantId / licenseId 筛选）
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { tenantId, licenseId, page = '1', pageSize = '10' } = req.query;
    const p = Math.max(1, parseInt(page as string) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize as string) || 10));

    if (tenantId) {
      const result = await capacityService.getOrders(tenantId as string, p, ps);
      return res.json({ success: true, data: result });
    }

    if (licenseId) {
      // 私有客户：通过 licenseId 查找关联租户
      const result = await capacityService.getOrdersByLicenseId(licenseId as string, p, ps);
      return res.json({ success: true, data: result });
    }

    // 不带筛选条件则返回全部订单
    const result = await capacityService.getAllOrders(p, ps);
    res.json({ success: true, data: result });
  } catch (error) {
    log.error('查询扩容订单失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

export default router;

