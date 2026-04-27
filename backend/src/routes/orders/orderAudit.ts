/**
 * 订单模块 - 审核与取消相关路由
 * 包含：审核列表、审核统计、取消申请、待审核取消、已审核取消
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { Order } from '../../entities/Order';
import { getTenantRepo } from '../../utils/tenantRepo';
import { orderNotificationService } from '../../services/OrderNotificationService';
import { formatDateTime } from '../../utils/dateFormat';
import { formatToBeijingTime, saveStatusHistory } from './orderHelpers';
import { log } from '../../config/logger';
export function registerAuditRoutes(router: Router): void {router.get('/audit-list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const startTime = Date.now();

    const {
      page = 1,
      pageSize = 20,
      status = 'pending_audit', // 默认只查待审核
      orderNumber,
      customerName,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100); // 限制最大100条
    const skip = (pageNum - 1) * pageSizeNum;

    log.info(`📋 [审核列表] 查询参数: status=${status}, page=${pageNum}, pageSize=${pageSizeNum}`);

    // 🔥 调试：先查询所有订单的状态分布
    const statusCountQuery = await orderRepository.createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();
    log.info(`📋 [审核列表] 订单状态分布:`, statusCountQuery);

    // 🔥 优化：使用QueryBuilder只查询需要的字段
    const queryBuilder = orderRepository.createQueryBuilder('order')
      .select([
        'order.id',
        'order.orderNumber',
        'order.customerId',
        'order.customerName',
        'order.customerPhone',
        'order.totalAmount',
        'order.depositAmount',
        'order.depositScreenshots',
        'order.status',
        'order.markType',
        'order.paymentStatus',
        'order.paymentMethod',
        'order.remark',
        'order.createdBy',
        'order.createdByName',
        'order.createdAt',
        'order.shippingName',
        'order.shippingPhone',
        'order.shippingAddress',
        'order.products'
      ]);

    // 状态筛选
    if (status === 'pending_audit') {
      queryBuilder.where('order.status = :status', { status: 'pending_audit' });
      log.info(`📋 [审核列表] 筛选待审核订单: status=pending_audit`);
    } else if (status === 'approved') {
      // 🔥 修复：已审核通过的订单状态只包括审核通过后的状态
      // 不包括 pending_transfer（待流转）和 pending_audit（待审核）
      const approvedStatuses = ['pending_shipment', 'shipped', 'delivered', 'paid', 'completed'];
      queryBuilder.where('order.status IN (:...statuses)', {
        statuses: approvedStatuses
      });
      log.info(`📋 [审核列表] 筛选已审核通过订单: statuses=${approvedStatuses.join(', ')}`);
    } else if (status === 'rejected') {
      queryBuilder.where('order.status = :status', { status: 'audit_rejected' });
      log.info(`📋 [审核列表] 筛选审核拒绝订单: status=audit_rejected`);
    } else if (status) {
      // 🔥 修复：其他状态直接使用传入的状态值
      queryBuilder.where('order.status = :status', { status });
      log.info(`📋 [审核列表] 筛选其他状态订单: status=${status}`);
    }

    // 订单号筛选
    if (orderNumber) {
      queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    }

    // 客户名称筛选
    if (customerName) {
      queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
    }

    // 日期范围筛选 - 🔥 修复：数据库已配置为北京时区，直接使用北京时间查询
    if (startDate && endDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    // 🔥 优化：先获取总数（使用count查询更快）
    const total = await queryBuilder.getCount();

    // 排序和分页
    queryBuilder.orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(pageSizeNum);

    const orders = await queryBuilder.getMany();

    const queryTime = Date.now() - startTime;
    log.info(`📋 [审核列表] 查询完成: ${orders.length}条, 总数${total}, 耗时${queryTime}ms`);

    // 🔥 优化：简化数据转换
    const list = orders.map(order => {
      let products: unknown[] = [];
      if (order.products) {
        try {
          products = typeof order.products === 'string' ? JSON.parse(order.products as string) : order.products;
        } catch {
          products = [];
        }
      }

      return {
        id: order.id,
        orderNo: order.orderNumber,
        orderNumber: order.orderNumber,
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        products,
        totalAmount: Number(order.totalAmount) || 0,
        depositAmount: Number(order.depositAmount) || 0,
        collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
        status: order.status,
        // 🔥 修复：正确映射auditStatus
        // pending_audit 和 pending_transfer -> pending（待审核）
        // audit_rejected -> rejected（审核拒绝）
        // pending_shipment, shipped, delivered, paid, completed -> approved（已审核通过）
        auditStatus: (order.status === 'pending_audit' || order.status === 'pending_transfer') ? 'pending' :
                     order.status === 'audit_rejected' ? 'rejected' :
                     ['pending_shipment', 'shipped', 'delivered', 'paid', 'completed'].includes(order.status) ? 'approved' : 'pending',
        markType: order.markType || 'normal',
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: order.paymentMethod || '',
        remark: order.remark || '',
        salesPerson: order.createdByName || '',
        createdBy: order.createdBy || '',
        createdByName: order.createdByName || '',
        createTime: formatToBeijingTime(order.createdAt),
        receiverName: order.shippingName || '',
        receiverPhone: order.shippingPhone || '',
        deliveryAddress: order.shippingAddress || '',
        depositScreenshots: order.depositScreenshots || []
      };
    });

    res.json({
      success: true,
      code: 200,
      message: '获取审核订单列表成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    log.error('❌ [审核列表] 获取失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取审核订单列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/audit-statistics
 * @desc 获取审核统计数据（优化版）
 * @access Private
 */
router.get('/audit-statistics', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const startTime = Date.now();

    // 🔥 优化：使用单个查询获取所有统计数据
    const [pendingCount, approvedCount, rejectedCount, pendingAmountResult, todayCount] = await Promise.all([
      orderRepository.count({ where: { status: 'pending_audit' } }),
      orderRepository.createQueryBuilder('order')
        .where('order.status IN (:...statuses)', { statuses: ['pending_shipment', 'shipped', 'delivered', 'paid'] })
        .getCount(),
      orderRepository.count({ where: { status: 'audit_rejected' } }),
      orderRepository.createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.status = :status', { status: 'pending_audit' })
        .getRawOne(),
      orderRepository.createQueryBuilder('order')
        .where('order.createdAt >= :today', { today: new Date(new Date().setHours(0, 0, 0, 0)) })
        .andWhere('order.status = :status', { status: 'pending_audit' })
        .getCount()
    ]);

    const queryTime = Date.now() - startTime;
    log.info(`📊 [审核统计] 查询完成: 待审核${pendingCount}, 已通过${approvedCount}, 已拒绝${rejectedCount}, 耗时${queryTime}ms`);

    res.json({
      success: true,
      code: 200,
      data: {
        pendingCount,
        approvedCount,
        rejectedCount,
        pendingAmount: Number(pendingAmountResult?.total || 0),
        todayCount,
        urgentCount: 0
      }
    });
  } catch (error) {
    log.error('获取审核统计失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取审核统计失败'
    });
  }
});

/**
 * @route POST /api/v1/orders/cancel-request
 * @desc 提交取消订单申请
 * @access Private
 */
router.post('/cancel-request', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const { orderId, reason, description } = req.body;

    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    // 🔥 修复：将英文取消原因转换为中文
    const reasonMap: Record<string, string> = {
      'customer_cancel': '客户主动取消',
      'out_of_stock': '商品缺货',
      'price_change': '价格调整',
      'order_error': '订单信息错误',
      'other': '其他原因'
    };
    const cancelReasonText = reasonMap[reason] || reason;
    const cancelReason = `${cancelReasonText}${description ? ` - ${description}` : ''}`;

    order.status = 'pending_cancel'; // 🔥 修复：设置为 pending_cancel 状态
    order.remark = `取消原因: ${cancelReason}`;
    order.cancelReason = cancelReason; // 🔥 保存取消原因到专门的字段

    await orderRepository.save(order);

    // 🔥 保存状态历史记录 - 取消申请
    const currentUser = (req as any).currentUser || (req as any).user;
    const realName = currentUser?.realName || currentUser?.name || currentUser?.username || '系统';
    const deptName = currentUser?.departmentName || currentUser?.department || '';
    const operatorName = deptName ? `${deptName}-${realName}` : realName;
    await saveStatusHistory(
      order.id,
      'pending_cancel',
      currentUser?.id || null,
      operatorName,
      `申请取消订单，原因：${cancelReason}`,
      { operatorDepartment: deptName, actionType: 'cancel_request' }
    );

    // 🔥 发送取消申请通知给管理员
    orderNotificationService.notifyOrderCancelRequest({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: Number(order.totalAmount),
      createdBy: order.createdBy,
      createdByName: order.createdByName
    }, cancelReason).catch(err => log.error('[取消申请] 发送通知失败:', err));

    res.json({
      success: true,
      code: 200,
      message: '取消申请已提交'
    });
  } catch (error) {
    log.error('提交取消申请失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '提交取消申请失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/pending-cancel
 * @desc 获取待审核的取消订单列表（支持分页）
 * @access Private
 */
router.get('/pending-cancel', async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);

    // 🔥 分页参数
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;

    // 🔥 查询总数
    const total = await orderRepository.count({
      where: { status: 'pending_cancel' }
    });

    // 🔥 查询分页数据
    const orders = await orderRepository.find({
      where: { status: 'pending_cancel' },
      order: { updatedAt: 'DESC' },
      skip,
      take: pageSize
    });

    log.info(`[取消审核] 📊 后端查询到 ${orders.length} 条待审核订单（第${page}页，共${total}条）`);

    const formattedOrders = orders.map(order => {
      // 🔥 组合取消原因：cancelReason（取消原因） + remark中的最后一次审核信息
      let fullCancelReason = order.cancelReason || '';

      // 如果remark中有审核相关信息，取最后一次审核结果
      if (order.remark && order.remark.includes('审核')) {
        const parts = order.remark.split('|');
        const auditParts = parts.filter(part => part.includes('审核'));
        if (auditParts.length > 0) {
          // 取最后一次审核结果
          const lastAudit = auditParts[auditParts.length - 1].trim();
          fullCancelReason = fullCancelReason ? `${fullCancelReason} | ${lastAudit}` : lastAudit;
        }
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        totalAmount: Number(order.totalAmount),
        cancelReason: fullCancelReason,
        cancelRequestTime: formatDateTime(order.updatedAt),
        status: 'pending_cancel',
        createdBy: order.createdBy || '',
        createdByName: order.createdByName || ''
      };
    });

    res.json({
      success: true,
      code: 200,
      data: formattedOrders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    log.error('获取待审核取消订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取待审核取消订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/audited-cancel
 * @desc 获取已审核的取消订单列表（支持分页）
 * @access Private
 */
router.get('/audited-cancel', async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);

    // 🔥 分页参数
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;

    // 🔥 查询总数
    const total = await orderRepository.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: ['cancelled', 'cancel_failed'] })
      .getCount();

    // 🔥 查询分页数据
    const orders = await orderRepository.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: ['cancelled', 'cancel_failed'] })
      .orderBy('order.updatedAt', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getMany();

    log.info(`[取消审核] 📊 后端查询到 ${orders.length} 条已审核订单（第${page}页，共${total}条）`);
    orders.forEach((order, index) => {
      log.info(`  ${index + 1}. ID: ${order.id}, 订单号: ${order.orderNumber}, 状态: ${order.status}`);
    });

    const formattedOrders = orders.map(order => {
      // 🔥 组合取消原因：cancelReason（取消原因） + remark中的最后一次审核信息
      let fullCancelReason = order.cancelReason || '';

      // 如果remark中有审核相关信息，取最后一次审核结果
      if (order.remark && order.remark.includes('审核')) {
        const parts = order.remark.split('|');
        const auditParts = parts.filter(part => part.includes('审核'));
        if (auditParts.length > 0) {
          // 取最后一次审核结果
          const lastAudit = auditParts[auditParts.length - 1].trim();
          fullCancelReason = fullCancelReason ? `${fullCancelReason} | ${lastAudit}` : lastAudit;
        }
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        totalAmount: Number(order.totalAmount),
        cancelReason: fullCancelReason,
        cancelRequestTime: formatDateTime(order.updatedAt),
        status: order.status,
        createdBy: order.createdBy || '',
        createdByName: order.createdByName || ''
      };
    });

    log.info(`[取消审核] ✅ 返回 ${formattedOrders.length} 条格式化订单`);

    res.json({
      success: true,
      code: 200,
      data: formattedOrders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    log.error('获取已审核取消订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取已审核取消订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

} // end registerAuditRoutes
