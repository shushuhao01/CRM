/**
 * 订单模块 - 路由入口
 * 聚合所有订单子路由模块，导出统一的 router
 *
 * 子模块：
 * - orderHelpers.ts: 共享辅助函数和类型定义
 * - orderAudit.ts: 审核与取消相关路由
 * - orderShipping.ts: 物流发货相关路由
 * - orderCrud.ts: CRUD及审批相关路由
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { Order } from '../../entities/Order';
import { DepartmentOrderLimit } from '../../entities/DepartmentOrderLimit';
import { getTenantRepo } from '../../utils/tenantRepo';
import { orderNotificationService } from '../../services/OrderNotificationService';
import { getOrderTransferConfig } from './orderHelpers';
import { registerAuditRoutes } from './orderAudit';
import { registerShippingRoutes } from './orderShipping';
import { registerCrudRoutes } from './orderCrud';
import { log } from '../../config/logger';
const router = Router();
// 所有订单路由都需要认证
router.use(authenticateToken);
// ========== 特殊路由（必须在 /:id 之前定义）==========

/**
 * @route POST /api/v1/orders/check-department-limit
 * @desc 预检查部门下单限制（选中客户时调用）
 * @access Private
 */
router.post('/check-department-limit', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).currentUser;
    const departmentId = currentUser?.departmentId || '';
    const { customerId } = req.body;

    if (!customerId) {
      return res.json({
        success: true,
        code: 200,
        data: { hasLimit: false, exceeded: false }
      });
    }

    if (!departmentId) {
      return res.json({
        success: true,
        code: 200,
        data: { hasLimit: false, exceeded: false, message: '当前用户未分配部门' }
      });
    }

    // 获取部门下单限制配置
    const limitRepository = getTenantRepo(DepartmentOrderLimit);
    const limit = await limitRepository.findOne({
      where: { departmentId, isEnabled: true }
    });

    if (!limit) {
      return res.json({
        success: true,
        code: 200,
        data: { hasLimit: false, exceeded: false }
      });
    }

    const orderRepository = getTenantRepo(Order);

    // 查询已下单次数
    let orderCount = 0;
    if (limit.orderCountEnabled && limit.maxOrderCount > 0) {
      orderCount = await orderRepository.count({
        where: {
          customerId: String(customerId),
          createdByDepartmentId: departmentId
        }
      });
    }

    // 查询累计金额
    let totalAmount = 0;
    if (limit.totalAmountEnabled && limit.maxTotalAmount > 0) {
      const result = await orderRepository
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.totalAmount), 0)', 'total')
        .where('order.customerId = :customerId', { customerId: String(customerId) })
        .andWhere('order.createdByDepartmentId = :departmentId', { departmentId })
        .getRawOne();
      totalAmount = Number(result?.total || 0);
    }

    // 判断是否超出限制
    const details = {
      // 下单次数
      orderCountEnabled: limit.orderCountEnabled,
      orderCount,
      maxOrderCount: limit.maxOrderCount,
      orderCountExceeded: limit.orderCountEnabled && limit.maxOrderCount > 0 && orderCount >= limit.maxOrderCount,
      // 单笔金额
      singleAmountEnabled: limit.singleAmountEnabled,
      maxSingleAmount: Number(limit.maxSingleAmount),
      // 累计金额
      totalAmountEnabled: limit.totalAmountEnabled,
      totalAmount,
      maxTotalAmount: Number(limit.maxTotalAmount),
      remainingAmount: limit.totalAmountEnabled && limit.maxTotalAmount > 0
        ? Math.max(0, Number(limit.maxTotalAmount) - totalAmount)
        : 0,
      totalAmountExceeded: limit.totalAmountEnabled && limit.maxTotalAmount > 0 && totalAmount >= Number(limit.maxTotalAmount),
    };

    const exceeded = !!(details.orderCountExceeded || details.totalAmountExceeded);

    res.json({
      success: true,
      code: 200,
      data: {
        hasLimit: true,
        exceeded,
        details,
        departmentName: limit.departmentName || ''
      }
    });
  } catch (error) {
    log.error('检查部门下单限制失败:', error);
    res.json({
      success: true,
      code: 200,
      data: { hasLimit: false, exceeded: false, message: '检查失败，默认允许下单' }
    });
  }
});

/**
 * @route GET /api/v1/orders/transfer-config
 * @desc 获取订单流转配置
 * @access Private
 */
router.get('/transfer-config', async (_req: Request, res: Response) => {
  try {
    const config = await getOrderTransferConfig();
    res.json({
      success: true,
      code: 200,
      data: config
    });
  } catch (error) {
    log.error('获取流转配置失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取流转配置失败'
    });
  }
});

/**
 * @route POST /api/v1/orders/check-transfer
 * @desc 检查并执行订单流转
 * @access Private
 */
router.post('/check-transfer', async (_req: Request, res: Response) => {
  try {
    log.info('🔄 [订单流转] 检查待流转订单...');

    const orderRepository = getTenantRepo(Order);
    const transferConfig = await getOrderTransferConfig();
    const now = new Date();
    const delayMs = transferConfig.delayMinutes * 60 * 1000;

    // 查找所有待流转的订单（状态为pending_transfer且markType为normal）
    const pendingOrders = await orderRepository.find({
      where: {
        status: 'pending_transfer',
        markType: 'normal'
      }
    });

    log.info(`🔍 [订单流转] 找到 ${pendingOrders.length} 个待流转订单`);

    const transferredOrders: Order[] = [];

    for (const order of pendingOrders) {
      if (!order.createdAt) continue;

      const transferTime = new Date(order.createdAt.getTime() + delayMs);

      // 检查是否已到流转时间
      if (now >= transferTime) {
        log.info(`⏰ [订单流转] 订单 ${order.orderNumber} 已到流转时间，执行流转`);

        // 更新订单状态
        order.status = 'pending_audit';
        order.updatedAt = now;

        await orderRepository.save(order);
        transferredOrders.push(order);

        // 🔥 发送待审核通知给下单员和管理员
        orderNotificationService.notifyOrderPendingAudit({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          totalAmount: Number(order.totalAmount),
          createdBy: order.createdBy,
          createdByName: order.createdByName
        }).catch(err => log.error('[订单流转] 发送通知失败:', err));

        log.info(`✅ [订单流转] 订单 ${order.orderNumber} 已流转到待审核状态`);
      }
    }

    log.info(`📊 [订单流转] 本次流转 ${transferredOrders.length} 个订单`);

    res.json({
      success: true,
      code: 200,
      message: '订单流转检查完成',
      data: {
        transferredCount: transferredOrders.length,
        orders: transferredOrders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status
        }))
      }
    });
  } catch (error) {
    log.error('❌ [订单流转] 检查失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '订单流转检查失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/statistics
 * @desc 获取订单统计数据
 * @access Private
 */
router.get('/statistics', async (_req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingCount = await orderRepository.count({
      where: { status: 'pending' }
    });

    const todayCount = await orderRepository.createQueryBuilder('order')
      .where('order.createdAt >= :today', { today })
      .getCount();

    const pendingAmountResult = await orderRepository.createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: 'pending' })
      .getRawOne();

    res.json({
      success: true,
      code: 200,
      data: {
        pendingCount,
        todayCount,
        pendingAmount: Number(pendingAmountResult?.total || 0),
        urgentCount: 0
      }
    });
  } catch (error) {
    log.error('获取订单统计失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取订单统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});// ========== 注册子路由模块 ==========
// 审核与取消相关路由
registerAuditRoutes(router);
// 物流发货相关路由
registerShippingRoutes(router);
// CRUD及审批相关路由（包含 /:id 等参数路由，必须最后注册）
registerCrudRoutes(router);
export default router;
