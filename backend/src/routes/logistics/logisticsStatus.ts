/**
 * 物流模块 - 状态更新、导出、回调、API配置路由
 * 包含：权限检查、订单状态更新、批量更新、待办、日志、导出、圆通回调、快递100配置、API配置
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { findCustomerIdsByKeywords } from '../../utils/customerSearchHelper';
import { orderNotificationService } from '../../services/OrderNotificationService';
import { LogisticsApiConfig } from '../../entities/LogisticsApiConfig';
import { ExpressAPIService } from '../../services/ExpressAPIService';
import { SystemConfig } from '../../entities/SystemConfig';
import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { formatDate } from '../../utils/dateFormat';
import { ensureStatusHistoryTable } from '../orders/orderHelpers';

import { log } from '../../config/logger';
import { writeOperationLog, extractUserInfo, translateStatus } from '../../utils/operationLogWriter';
import { AppDataSource } from '../../config/database';
export function registerStatusAndConfigRoutes(router: Router): void {
router.get('/permission', (req: Request, res: Response) => {
  try {

    const user = (req as any).user;

    // 根据用户角色返回权限信息
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
    const isManager = user?.role === 'manager' || user?.role === 'department_head';
    const isLogisticsStaff = user?.department === 'logistics';
    const isCustomerService = user?.role === 'customer_service' || user?.role === 'service';

    const permission = {
      canView: true,
      canUpdate: isAdmin || isManager || isLogisticsStaff || isCustomerService,
      canBatchUpdate: isAdmin || isManager || isCustomerService,
      canExport: isAdmin || isManager || isCustomerService,
      role: user?.role || 'user',
      department: user?.department || ''
    };

    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    log.error('获取物流权限失败:', error);
    res.status(500).json({
      success: false,
      message: '获取物流权限失败'
    });
  }
});

// 获取物流状态更新页面的订单列表
router.get('/status-update/orders', async (req, res) => {
  try {
    const { tab = 'pending', page = 1, pageSize = 20, keyword, status, startDate, endDate } = req.query;

    const { Order } = await import('../../entities/Order');
    const orderRepository = getTenantRepo(Order);
    const queryBuilder = orderRepository.createQueryBuilder('order');

    // 基础条件：只查已发货及之后状态的订单（有trackingNumber的），排除虚拟订单
    queryBuilder.andWhere('order.trackingNumber IS NOT NULL');
    queryBuilder.andWhere('order.trackingNumber != :empty', { empty: '' });
    queryBuilder.andWhere('(order.orderProductType IS NULL OR order.orderProductType != :vType)', { vType: 'virtual' });

    // 根据标签页筛选
    if (tab === 'pending') {
      // 待更新 = 已发货但物流状态未更新
      queryBuilder.andWhere('order.status = :shippedStatus', { shippedStatus: 'shipped' });
    } else if (tab === 'updated') {
      // 已更新 = 物流状态已确认的（delivered, rejected, rejected_returned, refunded, after_sales_created, abnormal, package_exception）
      queryBuilder.andWhere('order.status IN (:...updatedStatuses)', {
        updatedStatuses: ['delivered', 'rejected', 'rejected_returned', 'refunded', 'after_sales_created', 'abnormal', 'package_exception']
      });
    } else if (tab === 'todo') {
      // 待办 = 标记了待办的订单
      queryBuilder.andWhere('(order.isTodo = :isTodo OR order.logisticsStatus = :todoStatus)', { isTodo: true, todoStatus: 'todo' });
    }

    // 物流状态筛选
    if (status) {
      queryBuilder.andWhere('order.logisticsStatus = :logisticsStatus', { logisticsStatus: status });
    }

    // 关键词搜索（支持订单号、客户名、手机号、物流单号、客户其他手机号）
    if (keyword) {
      // 🔥 性能优化：先在 customers 表单次索引查询命中客户ID，替代逐行 EXISTS 关联子查询
      const matchedCustomerIds = await findCustomerIdsByKeywords([keyword as string]);
      const orConditions = [
        'order.orderNumber LIKE :kw',
        'order.customerName LIKE :kw',
        'order.customerPhone LIKE :kw',
        'order.trackingNumber LIKE :kw',
        'order.shippingPhone LIKE :kw'
      ];
      const keywordParams: any = { kw: `%${keyword}%` };
      if (matchedCustomerIds.length > 0) {
        orConditions.push('order.customerId IN (:...matchedCustomerIds)');
        keywordParams.matchedCustomerIds = matchedCustomerIds;
      }
      queryBuilder.andWhere(`(${orConditions.join(' OR ')})`, keywordParams);
    }

    // 日期范围筛选
    if (startDate) {
      queryBuilder.andWhere('order.shippedAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.shippedAt <= :endDate', { endDate: endDate + ' 23:59:59' });
    }

    // 排序：按发货时间倒序
    queryBuilder.orderBy('order.shippedAt', 'DESC');

    // 分页
    const skip = (Number(page) - 1) * Number(pageSize);
    queryBuilder.skip(skip).take(Number(pageSize));

    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    log.error('获取物流状态更新订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
});

// 获取物流状态更新汇总数据
router.get('/status-update/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { Order } = await import('../../entities/Order');
    const orderRepository = getTenantRepo(Order);

    // 基础查询条件：有物流单号的订单
    const baseCondition = (qb: any) => {
      qb.andWhere('order.trackingNumber IS NOT NULL');
      qb.andWhere('order.trackingNumber != :empty', { empty: '' });
      if (startDate) {
        qb.andWhere('order.shippedAt >= :startDate', { startDate });
      }
      if (endDate) {
        qb.andWhere('order.shippedAt <= :endDate', { endDate: endDate + ' 23:59:59' });
      }
    };

    // 待更新数量（shipped 状态）
    const pendingQb = orderRepository.createQueryBuilder('order');
    baseCondition(pendingQb);
    pendingQb.andWhere('order.status = :shippedStatus', { shippedStatus: 'shipped' });
    const pending = await pendingQb.getCount();

    // 已更新数量（delivered, rejected 等终态）
    const updatedQb = orderRepository.createQueryBuilder('order');
    baseCondition(updatedQb);
    updatedQb.andWhere('order.status IN (:...updatedStatuses)', {
      updatedStatuses: ['delivered', 'rejected', 'rejected_returned', 'refunded', 'after_sales_created', 'abnormal', 'package_exception']
    });
    const updated = await updatedQb.getCount();

    // 待办数量
    const todoQb = orderRepository.createQueryBuilder('order');
    baseCondition(todoQb);
    todoQb.andWhere('(order.isTodo = :isTodo OR order.logisticsStatus = :todoStatus)', { isTodo: true, todoStatus: 'todo' });
    const todo = await todoQb.getCount();

    const total = pending + updated;

    res.json({
      success: true,
      data: {
        pending,
        updated,
        todo,
        total
      }
    });
  } catch (error) {
    log.error('获取物流状态汇总失败:', error);
    res.status(500).json({
      success: false,
      message: '获取汇总数据失败'
    });
  }
});

// 获取物流汇总数据
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { Order } = await import('../../entities/Order');
    const orderRepository = getTenantRepo(Order);

    // 基础查询条件：有物流单号的订单
    const baseQb = () => {
      const qb = orderRepository.createQueryBuilder('order');
      qb.andWhere('order.trackingNumber IS NOT NULL');
      qb.andWhere('order.trackingNumber != :empty', { empty: '' });
      if (startDate) {
        qb.andWhere('order.shippedAt >= :startDate', { startDate });
      }
      if (endDate) {
        qb.andWhere('order.shippedAt <= :endDate', { endDate: endDate + ' 23:59:59' });
      }
      return qb;
    };

    // 待揽收：shipped 但还没有物流状态更新的
    const pendingQb = baseQb();
    pendingQb.andWhere('(order.logisticsStatus IS NULL OR order.logisticsStatus = :emptyStr OR order.logisticsStatus = :pendingStr)', { emptyStr: '', pendingStr: 'pending' });
    const pending = await pendingQb.getCount();

    // 运输中：logisticsStatus 为 in_transit, picked_up, out_for_delivery 等
    const inTransitQb = baseQb();
    inTransitQb.andWhere('order.logisticsStatus IN (:...transitStatuses)', {
      transitStatuses: ['in_transit', 'picked_up', 'out_for_delivery', 'transit']
    });
    const inTransit = await inTransitQb.getCount();

    // 已签收
    const deliveredQb = baseQb();
    deliveredQb.andWhere('order.logisticsStatus = :deliveredStatus', { deliveredStatus: 'delivered' });
    const delivered = await deliveredQb.getCount();

    // 异常：rejected, rejected_returned, abnormal, package_exception, exception
    const exceptionQb = baseQb();
    exceptionQb.andWhere('order.logisticsStatus IN (:...exceptionStatuses)', {
      exceptionStatuses: ['exception', 'rejected', 'rejected_returned', 'abnormal', 'package_exception']
    });
    const exception = await exceptionQb.getCount();

    const total = pending + inTransit + delivered + exception;

    res.json({
      success: true,
      data: {
        pending,
        inTransit,
        delivered,
        exception,
        total
      }
    });
  } catch (error) {
    log.error('获取物流汇总失败:', error);
    res.status(500).json({
      success: false,
      message: '获取汇总数据失败'
    });
  }
});

// 更新订单物流状态
router.post('/order/status', async (req, res) => {
  try {
    const { orderNo, newStatus, remark } = req.body;
    const user = (req as any).user;

    if (!orderNo || !newStatus) {
      return res.status(400).json({
        success: false,
        message: '订单号和新状态不能为空'
      });
    }

    // 🔥 从数据库获取订单并更新物流状态
    const { Order } = await import('../../entities/Order');
    const { OrderStatusHistory } = await import('../../entities/OrderStatusHistory');
    const orderRepository = getTenantRepo(Order);
    const statusHistoryRepository = getTenantRepo(OrderStatusHistory);

    const order = await orderRepository.findOne({ where: { orderNumber: orderNo } });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 更新物流状态字段
    const oldStatus = order.status;
    order.logisticsStatus = newStatus;

    // 手动更新：直接设置订单状态，不受自动映射限制
    const validOrderStatuses = ['delivered', 'rejected', 'rejected_returned', 'refunded', 'after_sales_created', 'abnormal', 'package_exception', 'shipped'];
    if (validOrderStatuses.includes(newStatus)) {
      order.status = newStatus as any;
      log.info(`[物流状态] 手动更新订单状态: ${oldStatus} → ${newStatus}`);

      if (newStatus === 'delivered') {
        order.deliveredAt = new Date();
      }
    }

    // 标记为手动覆盖：后续自动同步将跳过此订单
    (order as any).manualStatusOverride = true;

    order.updatedAt = new Date();

    await orderRepository.save(order);

    // 添加状态更新记录到历史表（可选，如果失败不影响主流程）
    try {
      await ensureStatusHistoryTable();
      const realName = user?.realName || user?.name || user?.username || '系统';
      const deptName = user?.departmentName || user?.department || '';
      const fullOperatorName = deptName ? `${deptName}-${realName}` : realName;
      const historyRecord = statusHistoryRepository.create({
        orderId: order.id,
        status: newStatus as any,
        notes: remark || `物流状态更新为: ${translateStatus(newStatus)}`,
        operatorId: user?.id ? Number(user.id) : undefined,
        operatorName: fullOperatorName,
        operatorDepartment: deptName,
        actionType: 'status_change'
      });
      await statusHistoryRepository.save(historyRecord);
      log.info('✅ 状态历史记录已保存:', newStatus, '操作人:', fullOperatorName);
    } catch (historyError) {
      // 历史记录保存失败不影响主流程
      log.warn('⚠️ 状态历史记录保存失败（不影响主流程）:', historyError);
    }

    log.info('✅ 订单物流状态已持久化到数据库:', { orderNo, newStatus, remark });

    // 写入操作日志
    const userInfo = extractUserInfo(req);
    writeOperationLog({
      module: 'logistics_status',
      resourceType: 'order',
      resourceId: order.id,
      action: 'status_change',
      description: `手动更新订单状态: ${translateStatus(oldStatus)} → ${translateStatus(newStatus)}`,
      ...userInfo,
    });

    // 🔥 根据物流状态发送通知
    const orderInfo = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: Number(order.totalAmount),
      createdBy: order.createdBy,
      createdByName: order.createdByName
    };

    switch (newStatus) {
      case 'delivered':
        orderNotificationService.notifyOrderDelivered(orderInfo)
          .catch(err => log.error('[物流状态] 发送签收通知失败:', err));
        break;
      case 'rejected':
      case 'rejected_returned':
        orderNotificationService.notifyOrderRejected(orderInfo, remark)
          .catch(err => log.error('[物流状态] 发送拒收通知失败:', err));
        break;
      case 'exception':
        orderNotificationService.notifyPackageException(orderInfo, remark)
          .catch(err => log.error('[物流状态] 发送异常通知失败:', err));
        break;
    }

    return res.json({
      success: true,
      message: '物流状态更新成功',
      data: {
        orderNo,
        newStatus,
        orderStatus: order.status
      }
    });
  } catch (error) {
    log.error('更新订单物流状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新物流状态失败'
    });
  }
});

// 批量更新订单物流状态
router.post('/order/batch-status', async (req, res) => {
  try {
    const { orderNos, newStatus, remark } = req.body;
    const user = (req as any).user;

    if (!orderNos || !Array.isArray(orderNos) || orderNos.length === 0) {
      return res.status(400).json({
        success: false,
        message: '订单号列表不能为空'
      });
    }

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: '新状态不能为空'
      });
    }

    // 🔥 从数据库批量更新订单物流状态
    const { Order } = await import('../../entities/Order');
    const { OrderStatusHistory } = await import('../../entities/OrderStatusHistory');
    const orderRepository = getTenantRepo(Order);
    const statusHistoryRepository = getTenantRepo(OrderStatusHistory);

    let successCount = 0;
    let failCount = 0;
    const failedOrders: string[] = [];

    // 🔥 修复：物流状态直接作为订单状态保存，不再映射成cancelled
    const validOrderStatuses = [
      'delivered',           // 已签收
      'rejected',            // 拒收
      'rejected_returned',   // 拒收已退回
      'refunded',            // 退货退款
      'after_sales_created', // 已建售后
      'abnormal',            // 状态异常
      'package_exception'    // 包裹异常
    ];

    for (const orderNo of orderNos) {
      try {
        const order = await orderRepository.findOne({ where: { orderNumber: orderNo } });

        if (!order) {
          failCount++;
          failedOrders.push(orderNo);
          continue;
        }

        // 更新物流状态
        order.logisticsStatus = newStatus;

        // 🔥 修复：直接使用新状态，不再映射成cancelled
        if (validOrderStatuses.includes(newStatus)) {
          order.status = newStatus as any;
        }

        // 更新订单的更新时间
        order.updatedAt = new Date();

        await orderRepository.save(order);

        // 添加状态更新记录到历史表
        try {
          await ensureStatusHistoryTable();
          const historyRecord = statusHistoryRepository.create({
            orderId: order.id,
            status: newStatus as any,
            notes: remark || `批量更新物流状态为: ${translateStatus(newStatus)}`,
            operatorName: user?.departmentName ? `${user.departmentName}-${user.realName || user.username || '系统'}` : (user?.realName || user?.username || '系统'),
            operatorDepartment: user?.departmentName || '',
            actionType: 'status_change'
          });
          await statusHistoryRepository.save(historyRecord);
        } catch (historyError) {
          log.warn(`⚠️ 订单 ${orderNo} 状态历史记录保存失败（不影响主流程）:`, historyError);
        }

        // 写入操作日志
        const batchUserInfo = extractUserInfo(req);
        writeOperationLog({
          module: 'logistics_status',
          resourceType: 'order',
          resourceId: order.id,
          action: 'status_change',
          description: `批量更新订单状态: → ${translateStatus(newStatus)}`,
          ...batchUserInfo,
        });

        // 🔥 根据物流状态发送通知
        const orderInfo = {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          totalAmount: Number(order.totalAmount),
          createdBy: order.createdBy,
          createdByName: order.createdByName
        };

        switch (newStatus) {
          case 'delivered':
            orderNotificationService.notifyOrderDelivered(orderInfo)
              .catch(err => log.error(`[物流状态] 订单 ${orderNo} 发送签收通知失败:`, err));
            break;
          case 'rejected':
          case 'rejected_returned':
            orderNotificationService.notifyOrderRejected(orderInfo, remark)
              .catch(err => log.error(`[物流状态] 订单 ${orderNo} 发送拒收通知失败:`, err));
            break;
          case 'exception':
            orderNotificationService.notifyPackageException(orderInfo, remark)
              .catch(err => log.error(`[物流状态] 订单 ${orderNo} 发送异常通知失败:`, err));
            break;
        }

        successCount++;
      } catch (err) {
        log.error(`更新订单 ${orderNo} 失败:`, err);
        failCount++;
        failedOrders.push(orderNo);
      }
    }

    log.info('✅ 批量更新订单物流状态完成:', { successCount, failCount, failedOrders });

    return res.json({
      success: true,
      message: `批量更新完成，成功 ${successCount} 个，失败 ${failCount} 个`,
      data: {
        successCount,
        failCount,
        failedOrders
      }
    });
  } catch (error) {
    log.error('批量更新订单物流状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '批量更新失败'
    });
  }
});

// 设置订单待办
router.post('/order/todo', async (req, res) => {
  try {
    const { orderNo, days, remark } = req.body;

    if (!orderNo || !days) {
      return res.status(400).json({
        success: false,
        message: '订单号和待办天数不能为空'
      });
    }

    log.info('设置订单待办:', { orderNo, days, remark });

    // 从数据库获取订单并更新待办状态
    const { Order } = await import('../../entities/Order');
    const orderRepository = getTenantRepo(Order);

    const order = await orderRepository.findOne({ where: { orderNumber: orderNo } });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 计算待办日期
    const todoDate = new Date();
    todoDate.setDate(todoDate.getDate() + days);
    const todoDateStr = todoDate.toISOString().split('T')[0];

    // 更新订单待办状态
    order.isTodo = true;
    order.todoDate = todoDateStr;
    order.todoRemark = remark || '';
    order.logisticsStatus = 'todo';
    order.updatedAt = new Date();

    await orderRepository.save(order);

    log.info('✅ 订单待办设置成功:', { orderNo, todoDate: todoDateStr, remark });

    return res.json({
      success: true,
      message: '待办设置成功',
      data: {
        orderNo,
        todoDate: todoDateStr,
        days
      }
    });
  } catch (error) {
    log.error('设置订单待办失败:', error);
    return res.status(500).json({
      success: false,
      message: '设置待办失败'
    });
  }
});

// 获取物流状态日志
router.get('/log', async (req, res) => {
  try {
    const { orderNo, page = 1, pageSize = 20 } = req.query;

    const { OrderStatusHistory } = await import('../../entities/OrderStatusHistory');
    const statusHistoryRepository = getTenantRepo(OrderStatusHistory);
    const queryBuilder = statusHistoryRepository.createQueryBuilder('history');

    // 如果指定了订单号，先查找订单ID
    if (orderNo) {
      const { Order } = await import('../../entities/Order');
      const orderRepository = getTenantRepo(Order);
      const order = await orderRepository.findOne({ where: { orderNumber: orderNo as string } });
      if (order) {
        queryBuilder.andWhere('history.orderId = :orderId', { orderId: order.id });
      } else {
        // 订单不存在，返回空
        return res.json({
          success: true,
          data: {
            list: [],
            total: 0,
            page: Number(page),
            pageSize: Number(pageSize)
          }
        });
      }
    }

    // 按创建时间倒序排序
    queryBuilder.orderBy('history.createdAt', 'DESC');

    // 分页
    const skip = (Number(page) - 1) * Number(pageSize);
    queryBuilder.skip(skip).take(Number(pageSize));

    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    log.error('获取物流日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取日志失败'
    });
  }
});

// 导出物流状态数据
router.get('/export', async (req, res) => {
  try {
    const { tab, keyword, status, startDate, endDate } = req.query;

    const { Order } = await import('../../entities/Order');
    const orderRepository = getTenantRepo(Order);
    const queryBuilder = orderRepository.createQueryBuilder('order');

    // 基础条件：有物流单号的订单
    queryBuilder.andWhere('order.trackingNumber IS NOT NULL');
    queryBuilder.andWhere('order.trackingNumber != :empty', { empty: '' });

    // 根据标签页筛选
    if (tab === 'pending') {
      queryBuilder.andWhere('order.status = :shippedStatus', { shippedStatus: 'shipped' });
    } else if (tab === 'updated') {
      queryBuilder.andWhere('order.status IN (:...updatedStatuses)', {
        updatedStatuses: ['delivered', 'rejected', 'rejected_returned', 'refunded', 'after_sales_created', 'abnormal', 'package_exception']
      });
    } else if (tab === 'todo') {
      queryBuilder.andWhere('(order.isTodo = :isTodo OR order.logisticsStatus = :todoStatus)', { isTodo: true, todoStatus: 'todo' });
    }

    // 物流状态筛选
    if (status) {
      queryBuilder.andWhere('order.logisticsStatus = :logisticsStatus', { logisticsStatus: status });
    }

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :kw OR order.customerName LIKE :kw OR order.trackingNumber LIKE :kw)',
        { kw: `%${keyword}%` }
      );
    }

    // 日期范围
    if (startDate) {
      queryBuilder.andWhere('order.shippedAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.shippedAt <= :endDate', { endDate: endDate + ' 23:59:59' });
    }

    queryBuilder.orderBy('order.shippedAt', 'DESC');

    // 🔥 性能修复：导出无上限的全量 getMany() 在订单量大时会超时/内存溢出，限制单次导出上限
    const EXPORT_MAX_ROWS = 10000;
    const orders = await queryBuilder.take(EXPORT_MAX_ROWS).getMany();

    // 生成CSV内容
    const logisticsStatusMap: Record<string, string> = {
      'pending': '待揽收',
      'picked_up': '已揽收',
      'in_transit': '运输中',
      'out_for_delivery': '派送中',
      'delivered': '已签收',
      'exception': '异常',
      'rejected': '拒收',
      'rejected_returned': '拒收已退回',
      'refunded': '退货退款',
      'after_sales_created': '已建售后',
      'abnormal': '状态异常',
      'package_exception': '包裹异常',
      'todo': '待办',
      'transit': '运输中'
    };

    const orderStatusMap: Record<string, string> = {
      'shipped': '已发货',
      'delivered': '已签收',
      'rejected': '拒收',
      'rejected_returned': '拒收已退回',
      'refunded': '已退款',
      'after_sales_created': '已建售后',
      'abnormal': '状态异常',
      'package_exception': '包裹异常',
      'completed': '已完成',
      'cancelled': '已取消'
    };

    // BOM + CSV header
    const BOM = '\uFEFF';
    const headers = ['序号', '订单号', '客户名称', '客户电话', '快递公司', '物流单号', '订单状态', '物流状态', '最新物流动态', '发货时间', '收货人', '收货电话', '收货地址', '订单金额', '备注'];
    const rows = orders.map((order, index) => [
      index + 1,
      order.orderNumber || '',
      order.customerName || '',
      order.customerPhone || '',
      order.expressCompany || '',
      order.trackingNumber || '',
      orderStatusMap[order.status] || order.status || '',
      logisticsStatusMap[order.logisticsStatus || ''] || order.logisticsStatus || '',
      (order.latestLogisticsInfo || '').replace(/,/g, '，'),
      order.shippedAt ? new Date(order.shippedAt).toLocaleString('zh-CN') : '',
      order.shippingName || '',
      order.shippingPhone || '',
      (order.shippingAddress || '').replace(/,/g, '，'),
      order.totalAmount || 0,
      (order.remark || '').replace(/,/g, '，').replace(/\n/g, ' ')
    ]);

    const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    const filename = `logistics_export_${formatDate(new Date())}.csv`;

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    log.error('导出物流数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败'
    });
  }
});

// ========== 物流API配置管理 ==========

/**
 * 🔥 自动修复：logistics_api_configs 表缺失时自动建表，字段缺失时自动补齐
 * 各物流公司的配置表单字段不同（appId/appKey/appSecret/customerId/apiUrl等），
 * 老版本数据库可能缺表或缺列，这里在使用前自动检测并修复，
 * 解决 "Table doesn't exist" / "Unknown column 'xxx'" 等报错
 */
let _columnMigrationDone = false;

// 表的完整建表语句（与 LogisticsApiConfig 实体保持一致）
const LOGISTICS_API_CONFIGS_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`logistics_api_configs\` (
  \`id\` VARCHAR(50) NOT NULL COMMENT '主键',
  \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID',
  \`company_code\` VARCHAR(50) NOT NULL COMMENT '快递公司代码(SF/ZTO/YTO等)',
  \`company_name\` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '快递公司名称',
  \`app_id\` VARCHAR(200) NULL COMMENT '应用ID(各公司含义不同:顺丰=顾客编码,圆通=客户编码,EMS=协议客户号,德邦=公司编码等)',
  \`app_key\` VARCHAR(200) NULL COMMENT '附加密钥(EMS=SM4密钥,京东=AccessToken)',
  \`app_secret\` VARCHAR(500) NULL COMMENT '应用密钥/校验码/授权码',
  \`customer_id\` VARCHAR(200) NULL COMMENT '客户标识(顺丰=月结卡号,圆通=user_id,京东=商家编码)',
  \`api_url\` VARCHAR(500) NULL COMMENT '接口地址(圆通为客户专属地址)',
  \`api_environment\` ENUM('sandbox','production') NOT NULL DEFAULT 'sandbox' COMMENT 'API环境',
  \`extra_config\` JSON NULL COMMENT '扩展配置',
  \`support_create_order\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否支持下单生成运单号: 0=仅查询, 1=支持下单',
  \`enabled\` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  \`last_test_time\` DATETIME NULL COMMENT '最后测试时间',
  \`last_test_result\` TINYINT(1) NULL COMMENT '最后测试结果: 1=成功, 0=失败',
  \`last_test_message\` VARCHAR(500) NULL COMMENT '最后测试消息',
  \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  \`created_by\` VARCHAR(50) NULL COMMENT '创建人',
  \`updated_by\` VARCHAR(50) NULL COMMENT '更新人',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_logistics_api_configs_tenant_code\` (\`tenant_id\`, \`company_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流公司API配置'
`;

// 补列用的 DDL 清单（列名 -> ADD COLUMN 语句），老表缺哪个补哪个
const LOGISTICS_API_CONFIGS_REQUIRED_COLUMNS: Record<string, string> = {
  'tenant_id': "ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID'",
  'company_name': "ADD COLUMN `company_name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '快递公司名称'",
  'app_id': "ADD COLUMN `app_id` VARCHAR(200) NULL COMMENT '应用ID'",
  'app_key': "ADD COLUMN `app_key` VARCHAR(200) NULL COMMENT '附加密钥(EMS=SM4密钥,京东=AccessToken)'",
  'app_secret': "ADD COLUMN `app_secret` VARCHAR(500) NULL COMMENT '应用密钥/校验码/授权码'",
  'customer_id': "ADD COLUMN `customer_id` VARCHAR(200) NULL COMMENT '客户标识'",
  'api_url': "ADD COLUMN `api_url` VARCHAR(500) NULL COMMENT '接口地址(圆通为客户专属地址)'",
  'api_environment': "ADD COLUMN `api_environment` ENUM('sandbox','production') NOT NULL DEFAULT 'sandbox' COMMENT 'API环境'",
  'extra_config': "ADD COLUMN `extra_config` JSON NULL COMMENT '扩展配置'",
  'support_create_order': "ADD COLUMN `support_create_order` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否支持下单生成运单号: 0=仅查询, 1=支持下单'",
  'enabled': "ADD COLUMN `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用'",
  'last_test_time': "ADD COLUMN `last_test_time` DATETIME NULL COMMENT '最后测试时间'",
  'last_test_result': "ADD COLUMN `last_test_result` TINYINT(1) NULL COMMENT '最后测试结果'",
  'last_test_message': "ADD COLUMN `last_test_message` VARCHAR(500) NULL COMMENT '最后测试消息'",
  'created_at': "ADD COLUMN `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间'",
  'updated_at': "ADD COLUMN `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间'",
  'created_by': "ADD COLUMN `created_by` VARCHAR(50) NULL COMMENT '创建人'",
  'updated_by': "ADD COLUMN `updated_by` VARCHAR(50) NULL COMMENT '更新人'"
};

async function ensureLogisticsApiConfigColumns(): Promise<void> {
  if (_columnMigrationDone) return;
  try {
    const { AppDataSource } = await import('../../config/database');
    const ds = AppDataSource;
    if (!ds || !ds.isInitialized) return;

    // 1) 表不存在时自动建表（完整结构）
    const [tblRow]: any = await ds.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'logistics_api_configs'`
    );
    const tblCnt = Number(tblRow?.cnt ?? tblRow?.['COUNT(*)'] ?? 0);
    if (tblCnt === 0) {
      log.info('[物流API配置] ⚡ 检测到 logistics_api_configs 表不存在，正在自动创建...');
      await ds.query(LOGISTICS_API_CONFIGS_CREATE_SQL);
      log.info('[物流API配置] ✅ logistics_api_configs 表已自动创建');
      _columnMigrationDone = true;
      return;
    }

    // 2) 表已存在，检测并补齐缺失字段
    const colRows: any[] = await ds.query(
      `SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'logistics_api_configs'`
    );
    const existingCols = new Set(
      (colRows || []).map((r: any) => String(r.name ?? r.COLUMN_NAME ?? '').toLowerCase())
    );

    for (const [col, ddl] of Object.entries(LOGISTICS_API_CONFIGS_REQUIRED_COLUMNS)) {
      if (existingCols.has(col)) continue;
      log.info(`[物流API配置] ⚡ 检测到 ${col} 字段缺失，正在自动添加...`);
      try {
        await ds.query(`ALTER TABLE \`logistics_api_configs\` ${ddl}`);
        log.info(`[物流API配置] ✅ ${col} 字段已自动添加`);
      } catch (colErr: any) {
        // "列已存在"视为成功（并发场景），其他错误记录但不中断后续字段
        if (!colErr?.message?.includes('Duplicate column')) {
          log.warn(`[物流API配置] 自动添加 ${col} 字段失败:`, colErr?.message || colErr);
        }
      }
    }

    // 3) 确保租户+公司代码的唯一索引存在（旧表补了tenant_id后可能缺索引）
    try {
      const [idxRow]: any = await ds.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'logistics_api_configs'
         AND INDEX_NAME = 'idx_logistics_api_configs_tenant_code'`
      );
      const idxCnt = Number(idxRow?.cnt ?? idxRow?.['COUNT(*)'] ?? 0);
      if (idxCnt === 0) {
        await ds.query(
          `ALTER TABLE \`logistics_api_configs\`
           ADD UNIQUE INDEX \`idx_logistics_api_configs_tenant_code\` (\`tenant_id\`, \`company_code\`)`
        );
        log.info('[物流API配置] ✅ 唯一索引 idx_logistics_api_configs_tenant_code 已自动添加');
      }
    } catch (idxErr: any) {
      // 存量数据有重复时无法建唯一索引，记录警告但不影响功能
      log.warn('[物流API配置] 自动添加唯一索引失败（不影响运行）:', idxErr?.message || idxErr);
    }

    _columnMigrationDone = true;
  } catch (migErr: any) {
    // 如果是"列已存在"的错误，标记为已完成
    if (migErr?.message?.includes('Duplicate column') || migErr?.message?.includes('already exists')) {
      _columnMigrationDone = true;
      return;
    }
    log.warn('[物流API配置] 自动建表/补字段失败（不影响运行）:', migErr?.message || migErr);
  }
}


/**
 * 默认物流API配置（每个快递公司一条，待用户填写密钥）
 */
const DEFAULT_API_CONFIGS = [
  { code: 'SF',   name: '顺丰速运' },
  { code: 'ZTO',  name: '中通快递' },
  { code: 'YTO',  name: '圆通速递' },
  { code: 'STO',  name: '申通快递' },
  { code: 'YD',   name: '韵达速递' },
  { code: 'JTSD', name: '极兔速递' },
  { code: 'EMS',  name: '邮政EMS' },
  { code: 'JD',   name: '京东物流' },
  { code: 'DBL',  name: '德邦快递' },
];

/**
 * 检查并初始化当前租户的默认物流API配置
 * 逐个检查每个预设公司代码是否存在，缺失则补充插入
 */
async function ensureDefaultApiConfigs(): Promise<void> {
  try {
    // 🔥 先确保数据库字段完整，避免 Unknown column 错误
    await ensureLogisticsApiConfigColumns();

    const repository = getTenantRepo(LogisticsApiConfig);

    // 获取当前租户已有的API配置公司代码
    const existingConfigs = await repository.find({ select: ['companyCode'] });
    const existingCodes = new Set(existingConfigs.map(c => c.companyCode));

    // 筛选出缺失的配置
    const missingConfigs = DEFAULT_API_CONFIGS.filter(c => !existingCodes.has(c.code));

    if (missingConfigs.length === 0) return; // 全部已存在，无需操作

    log.info(`[物流API配置] 当前租户缺少 ${missingConfigs.length} 个默认API配置，正在补充初始化...`);

    for (const cfg of missingConfigs) {
      try {
        const config = repository.create({
          id: `lac-${cfg.code.toLowerCase()}-${uuidv4().substring(0, 8)}`,
          companyCode: cfg.code,
          companyName: cfg.name,
          apiEnvironment: 'production' as const,
          enabled: 1
        });
        await repository.save(config);
      } catch (insertError) {
        log.warn(`[物流API配置] 初始化 ${cfg.name} 失败:`, insertError instanceof Error ? insertError.message : insertError);
      }
    }

    log.info('[物流API配置] ✅ 默认API配置数据初始化完成');
  } catch (error) {
    log.error('[物流API配置] 初始化默认数据失败:', error);
  }
}

// 注：圆通/申通轨迹推送回调接口已迁移至 publicCallbacks.ts（挂载在认证中间件之前，外部平台无令牌也可访问）

// ========== 快递100配置API ==========

/**
 * 🔥 自动修复：system_configs 表缺失时自动创建（快递100配置存储于此表）
 * 表结构与 database/schema.sql 及 SystemConfig 实体保持一致
 */
let _systemConfigTableEnsured = false;
async function ensureSystemConfigsTable(): Promise<void> {
  if (_systemConfigTableEnsured) return;
  try {
    const ds = AppDataSource;
    if (!ds || !ds.isInitialized) return;

    const [tblRow]: any = await ds.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'system_configs'`
    );
    const tblCnt = Number(tblRow?.cnt ?? tblRow?.['COUNT(*)'] ?? 0);
    if (tblCnt === 0) {
      log.info('[快递100配置] ⚡ 检测到 system_configs 表不存在，正在自动创建...');
      await ds.query(`
        CREATE TABLE IF NOT EXISTS \`system_configs\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
          \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID',
          \`configKey\` VARCHAR(100) NOT NULL COMMENT '配置键名',
          \`configValue\` MEDIUMTEXT COMMENT '配置值',
          \`valueType\` VARCHAR(50) DEFAULT 'string' COMMENT '值类型: string, number, boolean, json, text',
          \`configGroup\` VARCHAR(100) NOT NULL DEFAULT 'general' COMMENT '配置分组',
          \`description\` VARCHAR(200) COMMENT '配置描述',
          \`isEnabled\` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
          \`isSystem\` BOOLEAN DEFAULT FALSE COMMENT '是否为系统配置（不可删除）',
          \`sortOrder\` INT DEFAULT 0 COMMENT '排序权重',
          \`createdAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          \`updatedAt\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          UNIQUE INDEX \`idx_tenant_config_key_group\` (\`tenant_id\`, \`configKey\`, \`configGroup\`),
          INDEX \`idx_config_group\` (\`configGroup\`),
          INDEX \`idx_enabled\` (\`isEnabled\`),
          INDEX \`idx_tenant_id\` (\`tenant_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表'
      `);
      log.info('[快递100配置] ✅ system_configs 表已自动创建');
    }
    _systemConfigTableEnsured = true;
  } catch (e: any) {
    if (e?.message?.includes('already exists')) {
      _systemConfigTableEnsured = true;
      return;
    }
    log.warn('[快递100配置] 自动创建 system_configs 表失败（不影响运行）:', e?.message || e);
  }
}

/**
 * 获取快递100配置
 */
router.get('/kuaidi100/config', async (_req: Request, res: Response) => {
  try {
    // 🔥 确保配置表存在
    await ensureSystemConfigsTable();

    // 从系统配置表获取快递100配置
    const repository = getTenantRepo(SystemConfig);
    const config = await repository.findOne({
      where: { configKey: 'kuaidi100_config' }
    });

    if (config && config.configValue) {
      const data = JSON.parse(config.configValue);
      // 不返回完整的key，只返回部分用于显示
      res.json({
        success: true,
        data: {
          customer: data.customer || '',
          key: data.key ? '***已配置***' : '',
          url: data.url || 'https://poll.kuaidi100.com/poll/query.do',
          enabled: data.enabled !== false,
          hasKey: !!data.key
        }
      });
    } else {
      // 从环境变量获取
      const expressService = ExpressAPIService.getInstance();
      const status = expressService.getConfigStatus();
      res.json({
        success: true,
        data: {
          customer: process.env.EXPRESS_API_CUSTOMER ? '***已配置***' : '',
          key: process.env.EXPRESS_API_KEY ? '***已配置***' : '',
          url: process.env.EXPRESS_API_URL || 'https://poll.kuaidi100.com/poll/query.do',
          enabled: status.kuaidi100,
          hasKey: status.kuaidi100
        }
      });
    }
  } catch (error) {
    log.error('获取快递100配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

/**
 * 保存快递100配置
 */
router.post('/kuaidi100/config', async (req: Request, res: Response) => {
  try {
    const { customer, key, url, enabled } = req.body;

    if (!customer || !key) {
      return res.status(400).json({
        success: false,
        message: 'Customer和Key不能为空'
      });
    }

    // 🔥 确保配置表存在
    await ensureSystemConfigsTable();

    // 保存到系统配置表
    const repository = getTenantRepo(SystemConfig);
    const config = await repository.findOne({
      where: { configKey: 'kuaidi100_config' }
    });

    const configValue = JSON.stringify({
      customer,
      key,
      url: url || 'https://poll.kuaidi100.com/poll/query.do',
      enabled: enabled !== false
    });

    if (config) {
      (config as any).configValue = configValue;
      await repository.save(config);
    } else {
      const newConfig = repository.create({
        configKey: 'kuaidi100_config',
        configValue,
        configGroup: 'logistics',
        description: '快递100 API配置'
      } as any);
      await repository.save(newConfig);
    }

    // 更新环境变量（运行时生效）
    process.env.EXPRESS_API_CUSTOMER = customer;
    process.env.EXPRESS_API_KEY = key;
    process.env.EXPRESS_API_URL = url || 'https://poll.kuaidi100.com/poll/query.do';

    res.json({
      success: true,
      message: '配置保存成功'
    });
  } catch (error) {
    log.error('保存快递100配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存配置失败'
    });
  }
});

/**
 * 测试快递100连接
 */
router.post('/kuaidi100/test', async (req: Request, res: Response) => {
  try {
    const { customer, key, url } = req.body;

    if (!customer || !key) {
      return res.status(400).json({
        success: false,
        message: 'Customer和Key不能为空'
      });
    }

    // 临时设置环境变量进行测试
    const oldCustomer = process.env.EXPRESS_API_CUSTOMER;
    const oldKey = process.env.EXPRESS_API_KEY;
    const oldUrl = process.env.EXPRESS_API_URL;

    process.env.EXPRESS_API_CUSTOMER = customer;
    process.env.EXPRESS_API_KEY = key;
    process.env.EXPRESS_API_URL = url || 'https://poll.kuaidi100.com/poll/query.do';

    try {
      // 使用一个测试单号进行查询
      const expressService = ExpressAPIService.getInstance();
      const result = await expressService.queryExpress('SF1234567890', 'shunfeng');

      // 恢复环境变量
      process.env.EXPRESS_API_CUSTOMER = oldCustomer;
      process.env.EXPRESS_API_KEY = oldKey;
      process.env.EXPRESS_API_URL = oldUrl;

      // 即使查询结果为空也算连接成功（因为测试单号不存在）
      res.json({
        success: true,
        message: '连接测试成功',
        data: {
          connected: true,
          testResult: result
        }
      });
    } catch (testError: any) {
      // 恢复环境变量
      process.env.EXPRESS_API_CUSTOMER = oldCustomer;
      process.env.EXPRESS_API_KEY = oldKey;
      process.env.EXPRESS_API_URL = oldUrl;

      res.json({
        success: false,
        message: '连接测试失败: ' + testError.message
      });
    }
  } catch (error) {
    log.error('测试快递100连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试失败'
    });
  }
});

/**
 * 获取物流API配置列表
 */
router.get('/api-configs', async (_req: Request, res: Response) => {
  try {
    // 🔥 确保当前租户有默认API配置数据
    await ensureDefaultApiConfigs();

    const repository = getTenantRepo(LogisticsApiConfig);
    const configs = await repository.find({
      order: { companyCode: 'ASC' }
    });

    res.json({
      success: true,
      data: configs
    });
  } catch (error: any) {
    log.error('获取物流API配置列表失败:', error);

    const isTableError = error?.message?.includes('no such table') ||
      error?.message?.includes('doesn\'t exist') ||
      error?.code === 'ER_NO_SUCH_TABLE' ||
      error?.code === 'SQLITE_ERROR';

    // 🔥 如果是"Unknown column"或表缺失错误，自动建表/补字段后重试
    if (error?.message?.includes('Unknown column') || isTableError) {
      log.info('[物流API配置] 检测到表/字段缺失，尝试自动修复...');
      _columnMigrationDone = false; // 重置标志以便重新执行
      try {
        await ensureDefaultApiConfigs(); // 内部会先建表/补字段，再补默认配置数据
        const repository = getTenantRepo(LogisticsApiConfig);
        const configs = await repository.find({ order: { companyCode: 'ASC' } });
        return res.json({ success: true, data: configs });
      } catch (retryErr: any) {
        log.error('[物流API配置] 自动修复后重试仍然失败:', retryErr?.message);
        return res.json({
          success: false,
          data: [],
          message: '物流API配置表自动初始化失败，请联系管理员检查数据库权限'
        });
      }
    }

    res.json({
      success: false,
      data: [],
      message: '获取配置列表失败: ' + (error?.message || '未知错误')
    });
  }
});

/**
 * 根据公司代码获取API配置
 */
router.get('/api-configs/:companyCode', async (req: Request, res: Response) => {
  try {
    const { companyCode } = req.params;

    // 🔥 确保当前租户有默认API配置数据（与列表接口保持一致）
    try {
      await ensureDefaultApiConfigs();
    } catch (initErr) {
      log.warn('[物流API配置] ensureDefaultApiConfigs 初始化异常（忽略）:', initErr instanceof Error ? initErr.message : initErr);
    }

    let repository: any;
    try {
      repository = getTenantRepo(LogisticsApiConfig);
    } catch (repoErr) {
      log.error('[物流API配置] getTenantRepo 失败:', repoErr);
      return res.json({
        success: false,
        data: null,
        message: '物流API配置服务暂不可用，请稍后再试'
      });
    }

    const config = await repository.findOne({
      where: { companyCode: companyCode.toUpperCase() }
    });

    if (!config) {
      return res.json({
        success: false,
        data: null,
        message: `未找到 ${companyCode} 的物流API配置`
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    log.error('获取物流API配置失败:', error);

    const isTableError = error?.message?.includes('no such table') ||
      error?.message?.includes('doesn\'t exist') ||
      error?.code === 'ER_NO_SUCH_TABLE' ||
      error?.code === 'SQLITE_ERROR';

    // 🔥 如果是"Unknown column"或表缺失错误，自动建表/补字段后重试
    if (error?.message?.includes('Unknown column') || isTableError) {
      log.info(`[物流API配置] 检测到表/字段缺失(${req.params.companyCode})，尝试自动修复...`);
      _columnMigrationDone = false;
      try {
        await ensureDefaultApiConfigs(); // 内部会先建表/补字段，再补默认配置数据
        const repository = getTenantRepo(LogisticsApiConfig);
        const config = await repository.findOne({
          where: { companyCode: req.params.companyCode.toUpperCase() }
        });
        if (!config) {
          return res.json({ success: false, data: null, message: `未找到 ${req.params.companyCode} 的物流API配置` });
        }
        return res.json({ success: true, data: config });
      } catch (retryErr: any) {
        log.error('[物流API配置] 自动修复后重试仍然失败:', retryErr?.message);
        return res.json({
          success: false,
          data: null,
          message: '物流API配置表自动初始化失败，请联系管理员检查数据库权限'
        });
      }
    }

    // 🔥 其他错误也返回200+friendly JSON，不再返回500
    return res.json({
      success: false,
      data: null,
      message: `获取 ${req.params.companyCode} 配置失败: ${error?.message || '未知错误'}`
    });
  }
});

/**
 * 保存/更新物流API配置
 */
router.post('/api-configs/:companyCode', async (req: Request, res: Response) => {
  try {
    // 🔥 确保字段完整，避免 Unknown column 错误
    await ensureLogisticsApiConfigColumns();

    const { companyCode } = req.params;
    const { appId, appKey, appSecret, customerId, apiUrl, apiEnvironment, extraConfig, enabled, supportCreateOrder } = req.body;
    const currentUser = (req as any).user;

    log.info(`[物流API配置] 保存配置请求: companyCode=${companyCode}`);
    log.info(`[物流API配置] 请求参数:`, {
      appId: appId ? `${appId.substring(0, 4)}***` : '(空)',
      appKey: appKey ? '***' : '(空)',
      appSecret: appSecret ? '***' : '(空)',
      customerId: customerId || '(空)',
      apiUrl: apiUrl || '(空)',
      apiEnvironment,
      enabled
    });

    const repository = getTenantRepo(LogisticsApiConfig);
    let config = await repository.findOne({
      where: { companyCode: companyCode.toUpperCase() }
    });

    log.info(`[物流API配置] 现有配置: ${config ? `已存在(id=${config.id}, appId=${config.appId || '空'})` : '不存在'}`);

    if (!config) {
      // 创建新配置
      config = repository.create({
        id: `lac-${Date.now()}`,
        companyCode: companyCode.toUpperCase(),
        companyName: getCompanyName(companyCode),
        createdBy: currentUser?.userId || currentUser?.id
      });
      log.info(`[物流API配置] 创建新配置: id=${config.id}`);
    }

    // 🔥 关键：更新配置字段（即使是空字符串也要更新，因为用户可能清空了某个字段）
    config.appId = appId || config.appId || '';
    config.appKey = appKey || config.appKey || '';
    config.appSecret = appSecret || config.appSecret || '';
    config.customerId = customerId !== undefined ? customerId : (config.customerId || '');
    config.apiUrl = apiUrl || config.apiUrl || '';
    config.apiEnvironment = apiEnvironment || config.apiEnvironment || 'sandbox';
    if (extraConfig !== undefined) config.extraConfig = extraConfig;
    // 🔥 关键：enabled 字段需要正确处理布尔值
    config.enabled = enabled === true || enabled === 1 || enabled === '1' ? 1 : 0;
    // 🔥 新增：supportCreateOrder 字段 - 是否支持下单生成运单号
    if (supportCreateOrder !== undefined) {
      config.supportCreateOrder = supportCreateOrder === true || supportCreateOrder === 1 || supportCreateOrder === '1' ? 1 : 0;
    }
    config.updatedBy = currentUser?.userId || currentUser?.id;

    log.info(`[物流API配置] 准备保存:`, {
      id: config.id,
      companyCode: config.companyCode,
      appId: config.appId ? `${config.appId.substring(0, 4)}***` : '(空)',
      appSecret: config.appSecret ? '***已设置***' : '(空)',
      enabled: config.enabled,
      apiEnvironment: config.apiEnvironment
    });

    const savedConfig = await repository.save(config);

    log.info(`[物流API配置] ✅ 保存成功, id=${savedConfig.id}`);

    // 🔥 验证保存结果
    const verifyConfig = await repository.findOne({
      where: { companyCode: companyCode.toUpperCase() }
    });
    log.info(`[物流API配置] 验证保存结果:`, {
      id: verifyConfig?.id,
      appId: verifyConfig?.appId ? `${verifyConfig.appId.substring(0, 4)}***` : '(空)',
      appSecret: verifyConfig?.appSecret ? '***已设置***' : '(空)',
      enabled: verifyConfig?.enabled
    });

    return res.json({
      success: true,
      message: '配置保存成功',
      data: savedConfig
    });
  } catch (error: any) {
    log.error('[物流API配置] ❌ 保存失败:', error);

    const isTableError = error?.message?.includes('no such table') ||
      error?.message?.includes('doesn\'t exist') ||
      error?.code === 'ER_NO_SUCH_TABLE';

    // 🔥 如果是"Unknown column"或表缺失错误，自动建表/补字段
    if (error?.message?.includes('Unknown column') || isTableError) {
      _columnMigrationDone = false;
      try {
        await ensureLogisticsApiConfigColumns();
        return res.json({
          success: false,
          message: '数据库表结构已自动修复，请重新保存配置'
        });
      } catch { /* ignore */ }
    }

    return res.json({
      success: false,
      message: '保存配置失败: ' + (error?.message || '未知错误')
    });
  }
});

/**
 * 测试物流API连接
 * 根据不同快递公司调用对应的API进行真实连接测试
 */
router.post('/api-configs/:companyCode/test', async (req: Request, res: Response) => {
  try {
    const { companyCode } = req.params;
    const { appId, appKey, appSecret, customerId, apiUrl, testTrackingNo } = req.body;

    log.info(`[物流API测试] 公司: ${companyCode}, 参数:`, { appId, appKey: appKey ? '***' : '', appSecret: appSecret ? '***' : '', customerId, apiUrl });

    // 根据不同快递公司调用不同的测试逻辑
    let testResult: { success: boolean; message: string };

    switch (companyCode.toUpperCase()) {
      case 'SF':
        // 顺丰: appId=顾客编码, appSecret=校验码, customerId=月结卡号
        testResult = await testSFExpressApi(appId, appSecret, apiUrl, testTrackingNo);
        break;
      case 'ZTO':
        // 中通: appId=公司ID, appKey=AppKey, appSecret=AppSecret
        testResult = await testZTOExpressApi(appId, appKey, appSecret, apiUrl, testTrackingNo);
        break;
      case 'YTO':
        // 圆通: appId=客户编码(app_key), appSecret=客户密钥, customerId=用户ID(user_id), apiUrl=专属接口地址
        testResult = await testYTOExpressApi(appId, appSecret, customerId, apiUrl, testTrackingNo);
        break;
      case 'STO':
        // 申通: appId=AppKey, appSecret=SecretKey
        testResult = await testSTOExpressApi(appId, appSecret, apiUrl, testTrackingNo);
        break;
      case 'YD':
        // 韵达: appId=AppKey(app-key), appSecret=AppSecret
        testResult = await testYDExpressApi(appId, appSecret, customerId, apiUrl, testTrackingNo);
        break;
      case 'JTSD':
        // 极兔: appId=API账号(apiAccount), appSecret=私钥(privateKey)
        testResult = await testJTExpressApi(appId, appSecret, customerId, apiUrl, testTrackingNo);
        break;
      case 'EMS':
        // 邮政EMS: appId=协议客户号(senderNo), appSecret=授权码(authorization), appKey=SM4密钥
        testResult = await testEMSApi(appId, appSecret, appKey, apiUrl, testTrackingNo);
        break;
      case 'JD':
        // 京东物流: appId=AppKey, appSecret=AppSecret, appKey=AccessToken, customerId=商家编码
        testResult = await testJDExpressApi(appId, appSecret, appKey, apiUrl, testTrackingNo);
        break;
      case 'DBL':
        // 德邦快递: appId=公司编码(companyCode), appSecret=密钥(appkey)
        testResult = await testDBLExpressApi(appId, appSecret, customerId, apiUrl, testTrackingNo);
        break;
      default:
        testResult = { success: false, message: `暂不支持 ${companyCode} 的API测试` };
    }

    log.info(`[物流API测试] 结果:`, testResult);

    // 更新测试结果到数据库
    const repository = getTenantRepo(LogisticsApiConfig);
    const config = await repository.findOne({
      where: { companyCode: companyCode.toUpperCase() }
    });

    if (config) {
      config.lastTestTime = new Date();
      config.lastTestResult = testResult.success ? 1 : 0;
      config.lastTestMessage = testResult.message;
      await repository.save(config);
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: testResult
    });
  } catch (error) {
    log.error('测试物流API失败:', error);
    res.status(500).json({
      success: false,
      message: '测试失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

// 辅助函数：获取公司名称
function getCompanyName(code: string): string {
  const names: Record<string, string> = {
    'SF': '顺丰速运',
    'ZTO': '中通快递',
    'YTO': '圆通速递',
    'STO': '申通快递',
    'YD': '韵达速递',
    'JTSD': '极兔速递',
    'EMS': '邮政EMS',
    'JD': '京东物流',
    'DBL': '德邦快递'
  };
  return names[code.toUpperCase()] || code;
}

// ========== 各快递公司API测试函数 ==========

/**
 * 顺丰速运API测试 - 顺丰开放平台
 * 文档: https://open.sf-express.com/
 */
async function testSFExpressApi(partnerId: string, checkWord: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!partnerId || !checkWord) {
      return { success: false, message: '请填写顾客编码和校验码' };
    }

    // 构建请求参数 - 时间戳使用毫秒级（13位）
    const timestamp = Date.now().toString();
    const requestId = `REQ${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

    // 测试用的路由查询接口
    const serviceCode = 'EXP_RECE_SEARCH_ROUTES';
    const msgData = JSON.stringify({
      trackingType: '1',
      trackingNumber: [trackingNo || 'SF1234567890'],
      methodType: '1'
    });

    // 🔥 关键：先对msgData进行URL编码，然后用编码后的值计算签名
    const encodedMsgData = encodeURIComponent(msgData);

    // 签名计算: Base64(MD5(URL编码后的msgData + timestamp + checkWord))
    const signStr = encodedMsgData + timestamp + checkWord;
    const msgDigest = crypto.createHash('md5').update(signStr, 'utf8').digest('base64');

    log.info('[顺丰API测试] ========== 请求参数 ==========');
    log.info('[顺丰API测试] URL:', apiUrl);
    log.info('[顺丰API测试] partnerID:', partnerId);
    log.info('[顺丰API测试] msgData(原始):', msgData);
    log.info('[顺丰API测试] msgData(编码后):', encodedMsgData);
    log.info('[顺丰API测试] timestamp:', timestamp);
    log.info('[顺丰API测试] signStr:', signStr.substring(0, 100) + '...');
    log.info('[顺丰API测试] msgDigest:', msgDigest);

    // 🔥 手动构建请求体，避免URLSearchParams的二次编码问题
    const requestBody = `partnerID=${encodeURIComponent(partnerId)}&requestID=${encodeURIComponent(requestId)}&serviceCode=${encodeURIComponent(serviceCode)}&timestamp=${timestamp}&msgDigest=${encodeURIComponent(msgDigest)}&msgData=${encodedMsgData}`;

    log.info('[顺丰API测试] 完整请求体:', requestBody);

    const response = await axios.post(
      apiUrl || 'https://sfapi-sbox.sf-express.com/std/service',
      requestBody,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
      }
    );

    log.info('[顺丰API测试] 响应:', JSON.stringify(response.data));

    const result = response.data;
    if (result && result.apiResultCode === 'A1000') {
      // 解析业务结果
      try {
        const resultData = typeof result.apiResultData === 'string'
          ? JSON.parse(result.apiResultData)
          : result.apiResultData;

        if (resultData.success) {
          return { success: true, message: 'API连接成功，路由查询正常' };
        } else {
          return { success: false, message: `业务错误: ${resultData.errorMsg || resultData.errorCode}` };
        }
      } catch {
        return { success: true, message: 'API连接成功' };
      }
    } else if (result && result.apiErrorMsg) {
      // 认证错误
      return { success: false, message: `API错误: ${result.apiErrorMsg} (${result.apiResultCode})` };
    }
    return { success: false, message: '未知响应格式' };
  } catch (error: any) {
    log.error('[顺丰API测试] 错误:', error);
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return { success: false, message: 'API服务器无法连接' };
    }
    if (error.response) {
      return { success: false, message: `HTTP错误: ${error.response.status}` };
    }
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}

/**
 * 中通快递API测试 - 中通开放平台
 * 文档: https://open.zto.com/
 */
async function testZTOExpressApi(companyId: string, appKey: string, appSecret: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if ((!companyId && !appKey) || !appSecret) {
      return { success: false, message: '请填写AppKey和AppSecret' };
    }

    const data = JSON.stringify({
      billCode: trackingNo || '75331234567890'
    });

    // 🔥 中通官方标准签名: x-datadigest = Base64(MD5(body + appSecret))
    const sign = crypto.createHash('md5').update(data + appSecret, 'utf8').digest('base64');
    const zopKey = companyId || appKey;

    // 商家轨迹查询网关
    let url = (apiUrl || '').trim();
    if (!url || !url.includes('zto.merchant.waybill.track.query')) {
      url = 'https://japi.zto.com/zto.merchant.waybill.track.query';
    }

    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        'x-companyid': zopKey,
        'x-appkey': zopKey,
        'x-datadigest': sign
      },
      timeout: 10000
    });

    const result = response.data;
    if (result && result.status === true) {
      return { success: true, message: 'API连接成功' };
    } else if (result && result.message) {
      return { success: false, message: result.message };
    }
    return { success: true, message: 'API连接成功（请使用真实单号验证）' };
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      return { success: false, message: '认证失败，请检查密钥配置' };
    }
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}

/**
 * 圆通速递API测试 - 圆通开放平台
 * 文档: https://open.yto.net.cn/
 * 签名方式: sign = Base64(MD5(param + method + v + secret))，表单方式提交
 * 接口方法: yto.Marketing.WaybillTrace
 * 注意: 接口地址为客户专属（含waybill_query路径），需在开放平台控制台获取后填入
 */
async function testYTOExpressApi(appKey: string, secretKey: string, userId: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !secretKey) {
      return { success: false, message: '请填写客户编码(app_key)和客户密钥' };
    }

    const url = (apiUrl || '').trim();
    if (!url || !url.includes('waybill_query')) {
      return { success: false, message: '请填写圆通专属接口地址（在开放平台控制台-接口管理中获取，形如 https://openapi.yto.net.cn/service/waybill_query/v1/xxxxxx）' };
    }

    const method = 'yto.Marketing.WaybillTrace';
    const v = '1.01';
    const timestamp = Date.now().toString();
    const param = JSON.stringify({ NUMBER: trackingNo || 'YT1234567890123' });

    // 🔥 官方签名: Base64(MD5(param + method + v + secret))
    const sign = crypto.createHash('md5').update(param + method + v + secretKey, 'utf8').digest('base64');

    const formBody = new URLSearchParams({
      sign: sign,
      app_key: appKey,
      format: 'JSON',
      method: method,
      timestamp: timestamp,
      user_id: userId || '',
      v: v,
      param: param
    });

    const response = await axios.post(url, formBody.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      timeout: 10000
    });

    const result = response.data;
    if (Array.isArray(result)) {
      return { success: true, message: 'API连接成功，轨迹查询正常' };
    }
    if (result && (result.success === 'true' || result.success === true)) {
      // 上游可能返回英文 "success"，此类无意义英文不拼接到提示中
      const extra = result.message && !/^\s*(success|ok)\s*!?$/i.test(String(result.message)) ? `（${result.message}）` : '';
      return { success: true, message: `API连接成功${extra}` };
    }
    if (result && (result.message || result.msg || result.reason)) {
      return { success: false, message: result.message || result.msg || result.reason };
    }
    return { success: true, message: 'API连接成功（请使用真实单号验证）' };
  } catch (error: any) {
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}

/**
 * 申通快递API测试 - 申通开放平台
 * 文档: https://open.sto.cn/
 */
async function testSTOExpressApi(appKey: string, secretKey: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !secretKey) {
      return { success: false, message: '请填写AppKey和SecretKey' };
    }

    const data = JSON.stringify({
      waybillNoList: [trackingNo || '773012345678901']
    });

    // 生成签名: Base64(MD5(content + secretKey))
    const signStr = data + secretKey;
    const sign = crypto.createHash('md5').update(signStr).digest('base64');

    const params = new URLSearchParams();
    params.append('content', data);
    params.append('data_digest', sign);
    params.append('api_name', 'STO_TRACE_QUERY_COMMON');
    params.append('from_appkey', appKey);
    params.append('from_code', appKey);
    params.append('to_appkey', 'sto_trace_query');
    params.append('to_code', 'sto_trace_query');

    const response = await axios.post(apiUrl || 'https://cloudinter-linkgateway.sto.cn/gateway/link.do', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.success === true || result.success === 'true')) {
      return { success: true, message: 'API连接成功' };
    } else if (result && result.errorMsg) {
      return { success: false, message: result.errorMsg };
    }
    return { success: true, message: 'API连接成功（请使用真实单号验证）' };
  } catch (error: any) {
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}

/**
 * 韵达速递API测试 - 韵达开放平台
 * 文档: https://open.yundaex.com/
 */
async function testYDExpressApi(appKey: string, appSecret: string, _partnerId: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !appSecret) {
      return { success: false, message: '请填写AppKey和AppSecret' };
    }

    const reqTime = Date.now().toString();
    const body = JSON.stringify({
      mailno: trackingNo || '4312345678901'
    });

    // 🔥 韵达官方签名: MD5(报文 + "_" + AppSecret) 十六进制小写，放请求头
    const sign = crypto.createHash('md5').update(body + '_' + appSecret, 'utf8').digest('hex').toLowerCase();

    let url = (apiUrl || '').trim();
    if (!url || !url.includes('logictis/query')) {
      url = 'https://openapi.yundaex.com/openapi/outer/logictis/query';
    }

    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'app-key': appKey,
        'req-time': reqTime,
        'sign': sign
      },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.result === true || result.code === '0' || result.code === 0 || result.success === true)) {
      return { success: true, message: 'API连接成功' };
    } else if (result && (result.message || result.msg || result.remark)) {
      return { success: false, message: result.message || result.msg || result.remark };
    }
    return { success: true, message: 'API连接成功（请使用真实单号验证，韵达需先订阅轨迹）' };
  } catch (error: any) {
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}

/**
 * 极兔速递API测试 - 极兔开放平台
 * 文档: https://open.jtexpress.com.cn/
 */
async function testJTExpressApi(apiAccount: string, privateKey: string, _customerCode: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!apiAccount || !privateKey) {
      return { success: false, message: '请填写API账号和私钥' };
    }

    const timestamp = Date.now().toString();
    const bizContent = JSON.stringify({
      billCodes: trackingNo || 'JT1234567890123'
    });

    // 🔥 极兔官方签名: digest = Base64(MD5(bizContent + privateKey))，放请求头
    const digest = crypto.createHash('md5').update(bizContent + privateKey, 'utf8').digest('base64');

    let url = (apiUrl || '').trim();
    if (!url || !url.includes('/logistics/trace')) {
      url = (url || 'https://openapi.jtexpress.com.cn/webopenplatformapi/api').replace(/\/+$/, '') + '/logistics/trace';
    }

    const response = await axios.post(url, 'bizContent=' + encodeURIComponent(bizContent), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'apiAccount': apiAccount,
        'digest': digest,
        'timestamp': timestamp
      },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.code === '1' || result.code === 1 || result.success === true)) {
      return { success: true, message: 'API连接成功' };
    } else if (result && (result.msg || result.message)) {
      return { success: false, message: result.msg || result.message };
    }
    return { success: true, message: 'API连接成功（请使用真实单号验证）' };
  } catch (error: any) {
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}

/**
 * 邮政EMS API测试 - 中国邮政国内协议客户API开放平台
 * 文档: https://api.ems.com.cn/
 * senderNo=协议客户号, authorization=授权码, sm4Key=SM4密钥（报文加密）
 */
async function testEMSApi(senderNo: string, authorization: string, sm4KeyStr: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!senderNo || !authorization) {
      return { success: false, message: '请填写协议客户号(senderNo)和授权码(authorization)' };
    }
    if (!sm4KeyStr) {
      return { success: false, message: '请填写SM4密钥（在邮政开放平台获取，Base64格式）' };
    }

    const { parseSm4Key, sm4EncryptEcbBase64 } = await import('../../utils/sm4');
    let sm4Key: Buffer;
    try {
      sm4Key = parseSm4Key(sm4KeyStr);
    } catch (e: any) {
      return { success: false, message: 'SM4密钥格式错误: ' + (e?.message || '密钥必须为16字节') };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const bizJson = JSON.stringify({ waybillNo: trackingNo || 'EMS1234567890CN' });
    const cipherText = sm4EncryptEcbBase64(bizJson + sm4KeyStr.trim(), sm4Key);

    let url = (apiUrl || '').trim();
    if (!url || !url.includes('/amp')) {
      url = 'https://api.ems.com.cn/amp-prod-api/f/amp/api/open';
    }

    const formBody = new URLSearchParams({
      apiCode: '040001',
      senderNo: senderNo,
      authorization: authorization,
      timeStamp: timestamp,
      logitcsInterface: cipherText
    });

    const response = await axios.post(url, formBody.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.retCode === '00000' || result.code === '0' || result.success === true)) {
      return { success: true, message: 'API连接成功' };
    } else if (result && (result.retMsg || result.message || result.msg)) {
      return { success: false, message: result.retMsg || result.message || result.msg };
    }
    return { success: true, message: 'API连接成功（请使用真实单号验证）' };
  } catch (error: any) {
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}

/**
 * 京东物流API测试 - 京东物流开放平台
 * 文档: https://open.jdl.com/
 * 轨迹查询接口 /jd/tracking/query (对接方案编码 Tracking_JD)，需OAuth授权的AccessToken
 */
async function testJDExpressApi(appKey: string, appSecret: string, accessToken: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !appSecret) {
      return { success: false, message: '请填写AppKey和AppSecret' };
    }
    if (!accessToken) {
      return { success: false, message: '请填写AccessToken（在京东物流开放平台用签约商家账号OAuth授权获取）' };
    }

    const method = '/jd/tracking/query';
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const paramJson = JSON.stringify([{
      referenceNumber: trackingNo || 'JD1234567890',
      referenceType: '20000'
    }]);

    // 🔥 京东物流网关签名（md5-salt）
    const signStr = appSecret
      + 'access_token' + accessToken
      + 'app_key' + appKey
      + 'method' + method
      + 'param_json' + paramJson
      + 'timestamp' + timestamp
      + 'v' + '2.0'
      + appSecret;
    const sign = crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();

    let base = (apiUrl || '').trim();
    if (base.includes('/jd/tracking/query')) {
      base = base.substring(0, base.indexOf('/jd/tracking/query'));
    }
    if (!base) {
      base = 'https://api.jdl.com';
    }
    const url = `${base.replace(/\/+$/, '')}${method}`
      + `?LOP-DN=Tracking_JD`
      + `&app_key=${encodeURIComponent(appKey)}`
      + `&access_token=${encodeURIComponent(accessToken)}`
      + `&timestamp=${encodeURIComponent(timestamp)}`
      + `&v=2.0`
      + `&algorithm=md5-salt`
      + `&sign=${encodeURIComponent(sign)}`;

    const response = await axios.post(url, paramJson, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const result = response.data;
    if (result?.error_response) {
      return { success: false, message: String(result.error_response.zh_desc || result.error_response.en_desc || result.error_response.code || '京东网关错误') };
    }
    if (result && (result.code === '0' || result.code === 0 || result.success === true || result.data)) {
      return { success: true, message: 'API连接成功' };
    } else if (result && (result.message || result.msg)) {
      return { success: false, message: result.message || result.msg };
    }
    return { success: true, message: 'API连接成功（请使用真实单号验证）' };
  } catch (error: any) {
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}

/**
 * 德邦快递API测试 - 德邦开放平台
 * 文档: https://open.deppon.com/
 */
async function testDBLExpressApi(companyCode: string, appkey: string, _customerId: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!companyCode || !appkey) {
      return { success: false, message: '请填写公司编码(companyCode)和密钥(appkey)' };
    }

    const timestamp = Date.now().toString();
    const params = JSON.stringify({
      mailno: trackingNo || 'DPK1234567890'
    });

    // 🔥 德邦官方签名: digest = Base64( MD5十六进制字符串(params + appkey + timestamp) 的字节 )
    const md5Hex = crypto.createHash('md5').update(params + appkey + timestamp, 'utf8').digest('hex');
    const digest = Buffer.from(md5Hex, 'utf8').toString('base64');

    let url = (apiUrl || '').trim();
    if (!url || !url.includes('TraceQuery')) {
      url = 'https://dpapi.deppon.com/dop-interface-sync/standard-order/newTraceQuery.action';
    }

    const formBody = new URLSearchParams({
      companyCode: companyCode,
      params: params,
      timestamp: timestamp,
      digest: digest
    });

    const response = await axios.post(url, formBody.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.result === 'true' || result.result === true || result.success === true)) {
      return { success: true, message: 'API连接成功' };
    } else if (result && (result.reason || result.message)) {
      return { success: false, message: result.reason || result.message };
    }
    return { success: true, message: 'API连接成功（请使用真实单号验证）' };
  } catch (error: any) {
    return { success: false, message: '测试失败: ' + (error.message || '未知错误') };
  }
}



/**
 * 创建物流订单 / 生成运单号
 * 根据物流公司API配置，调用对应API生成真实运单号
 */
router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { companyCode, orderNo, receiverName, receiverPhone, receiverAddress, weight, remark } = req.body;

    if (!companyCode) {
      return res.status(400).json({
        success: false,
        message: '请指定物流公司代码'
      });
    }

    // 1. 查询物流API配置
    const repository = getTenantRepo(LogisticsApiConfig);
    const config = await repository.findOne({
      where: { companyCode: companyCode.toUpperCase() }
    });

    if (!config) {
      return res.json({
        success: false,
        message: `未找到 ${companyCode} 的物流API配置，请先在系统设置中配置`
      });
    }

    if (!config.enabled) {
      return res.json({
        success: false,
        message: `${config.companyName || companyCode} 的物流API已禁用`
      });
    }

    if (!config.supportCreateOrder) {
      return res.json({
        success: false,
        message: `${config.companyName || companyCode} 的物流API仅支持物流查询，不支持自动生成运单号`
      });
    }

    // 2. 根据物流公司调用对应的下单API
    let trackingNumber = '';

    switch (companyCode.toUpperCase()) {
      case 'SF': {
        // 顺丰下单API
        try {
          const sfServiceModule = await import('../../services/sfExpressService');
          const sfService = sfServiceModule.default || new (sfServiceModule as any).SFExpressService();
          const sfResult = await sfService.createOrder({
            orderNo: orderNo || `ORD${Date.now()}`,
            receiverName: receiverName || '',
            receiverPhone: receiverPhone || '',
            receiverAddress: receiverAddress || '',
            weight: weight || 1,
            remark: remark || ''
          });

          // 解析SF API响应 - 提取运单号
          if (sfResult && sfResult.apiResultData) {
            const resultData = typeof sfResult.apiResultData === 'string'
              ? JSON.parse(sfResult.apiResultData)
              : sfResult.apiResultData;

            if (resultData.msgData?.waybillNoInfoList?.[0]?.waybillNo) {
              trackingNumber = resultData.msgData.waybillNoInfoList[0].waybillNo;
            } else if (resultData.waybillNo) {
              trackingNumber = resultData.waybillNo;
            }
          } else if (sfResult?.trackingNumber) {
            trackingNumber = sfResult.trackingNumber;
          }

          if (!trackingNumber) {
            log.warn('[物流下单] 顺丰响应中未找到运单号:', JSON.stringify(sfResult));
            return res.json({
              success: false,
              message: '顺丰API未返回运单号，请检查API配置和权限'
            });
          }
        } catch (sfError: any) {
          log.error('[物流下单] 顺丰下单失败:', sfError);
          return res.json({
            success: false,
            message: '顺丰API调用失败: ' + (sfError?.message || '未知错误')
          });
        }
        break;
      }

      default: {
        // 其他物流公司暂未接入下单API
        return res.json({
          success: false,
          message: `${config.companyName || companyCode} 的下单API暂未接入，请手动输入运单号`
        });
      }
    }

    log.info(`[物流下单] 成功: ${companyCode} -> ${trackingNumber}`);
    return res.json({
      success: true,
      trackingNumber,
      message: '运单号生成成功'
    });

  } catch (error: any) {
    log.error('[物流下单] 创建订单失败:', error);
    return res.status(500).json({
      success: false,
      message: '创建物流订单失败: ' + (error?.message || '未知错误')
    });
  }
});

// ==================== 物流状态自动同步 API ====================

/**
 * 手动触发物流状态自动同步
 * POST /api/v1/logistics/status/auto-sync/trigger
 */
router.post('/auto-sync/trigger', async (req, res) => {
  try {
    const { logisticsAutoSyncService } = await import('../../services/LogisticsAutoSyncService');

    const svcStatus = logisticsAutoSyncService.getStatus();
    if (svcStatus.isRunning) {
      return res.json({ success: false, message: '自动同步正在执行中，请稍后再试' });
    }

    const user = (req as any).user;
    const tenantId = user?.tenantId;
    const tenantWhere = tenantId ? 'tenant_id = ?' : 'tenant_id IS NULL';
    const tenantParams = tenantId ? [tenantId] : [];

    // 标记运行中
    await AppDataSource.query(
      `UPDATE logistics_auto_sync_settings SET is_running = 1, last_start_time = NOW(), updated_at = NOW() WHERE ${tenantWhere}`,
      tenantParams
    ).catch(() => {});

    const result = await logisticsAutoSyncService.runAutoSync(tenantId);

    // 写回同步结果
    await AppDataSource.query(
      `UPDATE logistics_auto_sync_settings SET is_running = 0, last_sync_time = NOW(), last_stop_time = NOW(),
       total_synced = total_synced + ?, last_synced_count = ?, last_updated_count = ?, last_error_count = ?, updated_at = NOW()
       WHERE ${tenantWhere}`,
      [result.totalProcessed, result.totalProcessed, result.statusUpdated, result.errors, ...tenantParams]
    ).catch(() => {});

    return res.json({
      success: true,
      message: `同步完成: 处理${result.totalProcessed}个订单, 更新${result.statusUpdated}个订单状态, 更新${result.logisticsUpdated}个物流状态, 错误${result.errors}个`,
      data: result
    });
  } catch (error: any) {
    log.error('[物流自动同步] 手动触发失败:', error);
    return res.status(500).json({ success: false, message: '自动同步执行失败: ' + (error?.message || '未知错误') });
  }
});

/**
 * 获取自动同步状态
 * GET /api/v1/logistics/status/auto-sync/status
 */
router.get('/auto-sync/status', async (req, res) => {
  try {
    const { logisticsAutoSyncService } = await import('../../services/LogisticsAutoSyncService');
    const svcStatus = logisticsAutoSyncService.getStatus();

    const user = (req as any).user;
    const tenantId = user?.tenantId;
    const tenantWhere = tenantId ? 'tenant_id = ?' : 'tenant_id IS NULL';
    const tenantParams = tenantId ? [tenantId] : [];

    const rows = await AppDataSource.query(
      `SELECT enabled, is_running, last_sync_time, last_start_time, last_stop_time,
              total_synced, last_synced_count, last_updated_count, last_error_count
       FROM logistics_auto_sync_settings WHERE ${tenantWhere} LIMIT 1`,
      tenantParams
    ).catch(() => []);

    const row = rows[0] || {};

    return res.json({
      success: true,
      data: {
        isRunning: svcStatus.isRunning || !!row.is_running,
        enabled: !!row.enabled,
        lastSyncTime: svcStatus.lastSyncTime || row.last_sync_time || null,
        lastStartTime: svcStatus.lastStartTime || row.last_start_time || null,
        lastStopTime: svcStatus.lastStopTime || row.last_stop_time || null,
        totalSynced: row.total_synced || 0,
        lastSyncedCount: row.last_synced_count || 0,
        lastUpdatedCount: row.last_updated_count || 0,
        lastErrorCount: row.last_error_count || 0,
        description: '物流状态自动同步服务：根据物流最新动态自动判断并更新订单状态（已发货→已签收/已拒收等）。启用后系统定时检测待同步订单，无需人工逐一操作。'
      }
    });
  } catch (_error: any) {
    return res.status(500).json({ success: false, message: '获取状态失败' });
  }
});

/**
 * 单个订单物流状态检测预览（不写入数据库，用于调试）
 * POST /api/v1/logistics/status/auto-sync/preview
 * body: { description: "物流动态文本", currentOrderStatus: "shipped" }
 */
router.post('/auto-sync/preview', async (req, res) => {
  try {
    const { description, currentOrderStatus } = req.body;
    const { detectLogisticsStatus, mapLogisticsToOrderStatus } = await import('../../services/LogisticsAutoSyncService');

    if (!description) {
      return res.status(400).json({ success: false, message: '请提供物流动态描述' });
    }

    const logisticsStatus = detectLogisticsStatus(description);
    const targetOrderStatus = mapLogisticsToOrderStatus(logisticsStatus, currentOrderStatus || 'shipped');

    return res.json({
      success: true,
      data: {
        inputDescription: description,
        detectedLogisticsStatus: logisticsStatus,
        currentOrderStatus: currentOrderStatus || 'shipped',
        targetOrderStatus: targetOrderStatus,
        willUpdateOrder: !!targetOrderStatus,
        explanation: targetOrderStatus
          ? `物流状态 "${logisticsStatus}" + 当前订单状态 "${currentOrderStatus || 'shipped'}" → 订单将更新为 "${targetOrderStatus}"`
          : `物流状态 "${logisticsStatus}" 不会触发订单状态更新（当前: ${currentOrderStatus || 'shipped'}）`
      }
    });
  } catch (_error: any) {
    return res.status(500).json({ success: false, message: '预览失败' });
  }
});

/**
 * 获取物流自动同步配置（从数据库读取）
 * GET /api/v1/logistics/status/auto-sync/config
 */
router.get('/auto-sync/config', async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenantId;
    const tenantWhere = tenantId ? 'tenant_id = ?' : 'tenant_id IS NULL';
    const tenantParams = tenantId ? [tenantId] : [];

    const rows = await AppDataSource.query(
      `SELECT enabled FROM logistics_auto_sync_settings WHERE ${tenantWhere} LIMIT 1`,
      tenantParams
    ).catch(() => []);

    const enabled = rows.length > 0 ? !!rows[0].enabled : false;
    return res.json({ success: true, data: { enabled } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * 保存物流自动同步配置（持久化到数据库）
 * POST /api/v1/logistics/status/auto-sync/config
 */
router.post('/auto-sync/config', async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = (req as any).user;
    const tenantId = user?.tenantId;
    const tenantWhere = tenantId ? 'tenant_id = ?' : 'tenant_id IS NULL';
    const tenantParams = tenantId ? [tenantId] : [];

    const existing = await AppDataSource.query(
      `SELECT id FROM logistics_auto_sync_settings WHERE ${tenantWhere} LIMIT 1`, tenantParams
    ).catch(() => []);

    if (existing.length > 0) {
      await AppDataSource.query(
        `UPDATE logistics_auto_sync_settings SET enabled = ?, updated_at = NOW() WHERE ${tenantWhere}`,
        [enabled ? 1 : 0, ...tenantParams]
      );
    } else {
      await AppDataSource.query(
        `INSERT INTO logistics_auto_sync_settings (tenant_id, enabled) VALUES (?, ?)`,
        [tenantId || null, enabled ? 1 : 0]
      );
    }

    log.info(`[物流自动同步] 配置已${enabled ? '启用' : '停用'}${tenantId ? ` (租户: ${tenantId})` : ''}`);
    return res.json({ success: true, message: `自动同步已${enabled ? '启用' : '停用'}` });
  } catch (error: any) {
    log.error('[物流自动同步] 保存配置失败:', error.message);
    return res.status(500).json({ success: false, message: '保存配置失败' });
  }
});

} // end registerStatusAndConfigRoutes
