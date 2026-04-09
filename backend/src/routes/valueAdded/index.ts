/**
 * 增值管理模块 - 路由入口
 */
import { Router, Request, Response } from 'express';
import { registerOrderRoutes } from './valueAddedOrders';
import { registerCompanyRoutes } from './valueAddedCompany';
import { authenticateToken } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { ValueAddedOrder } from '../../entities/ValueAddedOrder';
import { log } from '../../config/logger';

const router = Router();

// 根路由 GET /value-added → 返回增值服务订单列表
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const orderRepo = getTenantRepo(ValueAddedOrder);
    const [list, total] = await orderRepo.findAndCount({
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      order: { createdAt: 'DESC' }
    });
    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (error) {
    log.warn('增值服务根路由查询失败:', error instanceof Error ? error.message : error);
    res.json({
      success: true,
      data: { list: [], total: 0, page: 1, pageSize: 10 }
    });
  }
});

// 注册订单相关路由
registerOrderRoutes(router);

// 注册公司管理相关路由
registerCompanyRoutes(router);

export default router;
