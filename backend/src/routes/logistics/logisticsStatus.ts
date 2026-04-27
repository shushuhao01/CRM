/**
 * 物流模块 - 状态更新、导出、回调、API配置路由
 * 包含：权限检查、订单状态更新、批量更新、待办、日志、导出、圆通回调、快递100配置、API配置
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
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
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :kw OR order.customerName LIKE :kw OR order.customerPhone LIKE :kw OR order.trackingNumber LIKE :kw OR order.shippingPhone LIKE :kw OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND CAST(c.other_phones AS CHAR) LIKE :kw))',
        { kw: `%${keyword}%` }
      );
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
    order.logisticsStatus = newStatus;

    // 🔥 使用安全映射函数：物流状态 → 订单状态
    const { mapLogisticsToOrderStatus } = await import('../../services/LogisticsAutoSyncService');
    const targetOrderStatus = mapLogisticsToOrderStatus(newStatus, order.status);

    if (targetOrderStatus) {
      order.status = targetOrderStatus as any;
      log.info(`[物流状态] 订单状态安全映射: ${order.status} → ${targetOrderStatus} (物流状态: ${newStatus})`);

      // 签收时记录签收时间
      if (targetOrderStatus === 'delivered') {
        order.deliveredAt = new Date();
      }
    }

    // 更新订单的更新时间
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
        notes: remark || `物流状态更新为: ${newStatus}`,
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
            notes: remark || `批量更新物流状态为: ${newStatus}`,
            operatorName: user?.departmentName ? `${user.departmentName}-${user.realName || user.username || '系统'}` : (user?.realName || user?.username || '系统'),
            operatorDepartment: user?.departmentName || '',
            actionType: 'status_change'
          });
          await statusHistoryRepository.save(historyRecord);
        } catch (historyError) {
          log.warn(`⚠️ 订单 ${orderNo} 状态历史记录保存失败（不影响主流程）:`, historyError);
        }

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

    const orders = await queryBuilder.getMany();

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
 * 🔥 自动修复：检查并添加 logistics_api_configs 表缺失的字段
 * 解决 "Unknown column 'support_create_order'" 等报错
 */
let _columnMigrationDone = false;
async function ensureLogisticsApiConfigColumns(): Promise<void> {
  if (_columnMigrationDone) return;
  try {
    const { AppDataSource } = await import('../../config/database');
    const ds = AppDataSource;
    if (!ds || !ds.isInitialized) return;

    // 检查 support_create_order 字段是否存在
    const [rows]: any = await ds.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'logistics_api_configs'
       AND COLUMN_NAME = 'support_create_order'`
    );
    const cnt = rows?.cnt ?? rows?.['COUNT(*)'] ?? 0;
    if (Number(cnt) === 0) {
      log.info('[物流API配置] ⚡ 检测到 support_create_order 字段缺失，正在自动添加...');
      await ds.query(
        `ALTER TABLE \`logistics_api_configs\`
         ADD COLUMN \`support_create_order\` TINYINT(1) NOT NULL DEFAULT 0
         COMMENT '是否支持下单生成运单号: 0=仅查询, 1=支持下单'`
      );
      log.info('[物流API配置] ✅ support_create_order 字段已自动添加');
    }
    _columnMigrationDone = true;
  } catch (migErr: any) {
    // 如果是"列已存在"的错误，标记为已完成
    if (migErr?.message?.includes('Duplicate column')) {
      _columnMigrationDone = true;
      return;
    }
    log.warn('[物流API配置] 自动添加字段失败（不影响运行）:', migErr?.message || migErr);
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

/**
 * 圆通开放平台API调试回调接口
 * 用于圆通开放平台的API在线调试功能（物流轨迹推送服务）
 * URL格式: /api/v1/logistics/yto-callback
 *
 * 圆通会向此接口推送物流轨迹数据（XML格式）
 * 需要返回正确的响应格式表示接收成功
 */
router.post('/yto-callback', async (req: Request, res: Response) => {
  try {
    // 获取原始请求体
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    log.info('[圆通回调] 收到请求体:', rawBody);
    log.info('[圆通回调] Content-Type:', req.headers['content-type']);

    // 圆通推送的数据可能是XML格式或JSON格式
    let trackingNo = 'UNKNOWN';

    // 尝试从请求体中提取运单号
    if (typeof req.body === 'object') {
      // JSON格式
      trackingNo = req.body.waybillNo || req.body.mailNo || req.body.logisticsId || 'UNKNOWN';
    } else if (typeof req.body === 'string') {
      // 可能是XML格式，尝试提取运单号
      const mailNoMatch = req.body.match(/<mailNo>([^<]+)<\/mailNo>/);
      if (mailNoMatch) {
        trackingNo = mailNoMatch[1];
      }
      const logisticsIdMatch = req.body.match(/<logisticsId>([^<]+)<\/logisticsId>/);
      if (logisticsIdMatch) {
        trackingNo = logisticsIdMatch[1];
      }
    }

    log.info('[圆通回调] 解析到运单号:', trackingNo);

    // 🔥 将物流轨迹数据保存到数据库，更新对应订单的物流状态
    if (trackingNo !== 'UNKNOWN') {
      try {
        const { Order } = await import('../../entities/Order');
        const orderRepository = getTenantRepo(Order);
        const order = await orderRepository.findOne({
          where: { trackingNumber: trackingNo }
        });
        if (order) {
          // 从回调数据中提取物流状态和最新动态
          let latestInfo = '';
          let logisticsStatus = '';

          if (typeof req.body === 'object') {
            latestInfo = req.body.description || req.body.acceptRemark || req.body.remark || '';
            logisticsStatus = req.body.logisticsStatus || req.body.opCode || '';
          }

          if (latestInfo) {
            order.latestLogisticsInfo = latestInfo;
          }
          if (logisticsStatus) {
            order.logisticsStatus = logisticsStatus;
          }
          order.updatedAt = new Date();
          await orderRepository.save(order);
          log.info(`[圆通回调] ✅ 订单 ${order.orderNumber} 物流数据已更新`);
        }
      } catch (dbError) {
        log.warn('[圆通回调] 保存物流数据到数据库失败:', dbError);
      }
    }

    // 返回圆通期望的成功响应格式
    // 圆通要求返回特定格式表示接收成功
    const successResponse = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <success>true</success>
  <code>0</code>
  <message>成功</message>
</response>`;

    log.info('[圆通回调] 返回成功响应');

    // 根据请求的Content-Type返回对应格式
    if (req.headers['content-type']?.includes('xml')) {
      res.set('Content-Type', 'application/xml;charset=UTF-8');
      res.send(successResponse);
    } else {
      res.json({
        success: true,
        code: '0',
        message: '成功',
        data: {
          waybillNo: trackingNo,
          received: true,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    log.error('[圆通回调] 处理失败:', error);

    // 返回失败响应
    if (req.headers['content-type']?.includes('xml')) {
      res.set('Content-Type', 'application/xml;charset=UTF-8');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<response>
  <success>false</success>
  <code>-1</code>
  <message>处理失败</message>
</response>`);
    } else {
      res.json({
        success: false,
        code: '-1',
        message: '处理失败',
        data: null
      });
    }
  }
});

/**
 * 圆通开放平台API调试回调接口 (GET方式，用于验证URL可访问性)
 */
router.get('/yto-callback', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    code: '0',
    message: '圆通API回调接口正常',
    data: {
      status: 'ready',
      timestamp: new Date().toISOString()
    }
  });
});

// ========== 快递100配置API ==========

/**
 * 获取快递100配置
 */
router.get('/kuaidi100/config', async (_req: Request, res: Response) => {
  try {
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

    // 🔥 如果是"Unknown column"错误，尝试自动修复后重试
    if (error?.message?.includes('Unknown column')) {
      log.info('[物流API配置] 检测到字段缺失，尝试自动修复...');
      _columnMigrationDone = false; // 重置标志以便重新执行
      try {
        await ensureLogisticsApiConfigColumns();
        const repository = getTenantRepo(LogisticsApiConfig);
        const configs = await repository.find({ order: { companyCode: 'ASC' } });
        return res.json({ success: true, data: configs });
      } catch (retryErr: any) {
        log.error('[物流API配置] 自动修复后重试仍然失败:', retryErr?.message);
        return res.json({
          success: false,
          data: [],
          message: '数据库字段需要更新，请联系管理员执行数据库迁移脚本'
        });
      }
    }

    const isTableError = error?.message?.includes('no such table') ||
      error?.message?.includes('doesn\'t exist') ||
      error?.code === 'ER_NO_SUCH_TABLE' ||
      error?.code === 'SQLITE_ERROR';
    if (isTableError) {
      return res.json({
        success: true,
        data: [],
        message: '物流API配置表尚未初始化'
      });
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

    // 🔥 如果是"Unknown column"错误（数据库字段缺失），尝试自动修复后重试
    if (error?.message?.includes('Unknown column')) {
      log.info(`[物流API配置] 检测到字段缺失(${req.params.companyCode})，尝试自动修复...`);
      _columnMigrationDone = false;
      try {
        await ensureLogisticsApiConfigColumns();
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
          message: '数据库字段需要更新，请联系管理员执行数据库迁移脚本'
        });
      }
    }

    // 🔥 所有错误都返回200+JSON（表不存在、数据库连接、或其他异常），避免前端收到500
    const isTableError = error?.message?.includes('no such table') ||
      error?.message?.includes('doesn\'t exist') ||
      error?.code === 'ER_NO_SUCH_TABLE' ||
      error?.code === 'SQLITE_ERROR';
    if (isTableError) {
      return res.json({
        success: false,
        data: null,
        message: '物流API配置表尚未初始化，请先在系统设置中配置物流API'
      });
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

    // 🔥 如果是"Unknown column"错误，尝试自动修复
    if (error?.message?.includes('Unknown column')) {
      _columnMigrationDone = false;
      try {
        await ensureLogisticsApiConfigColumns();
        return res.json({
          success: false,
          message: '数据库字段已自动更新，请重新保存配置'
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
        // 圆通: appId=AppKey, appSecret=SecretKey, customerId=客户编码(user_id)
        testResult = await testYTOExpressApi(appId, appSecret, customerId, apiUrl, testTrackingNo);
        break;
      case 'STO':
        // 申通: appId=AppKey, appSecret=SecretKey
        testResult = await testSTOExpressApi(appId, appSecret, apiUrl, testTrackingNo);
        break;
      case 'YD':
        // 韵达: appId=AppKey, appSecret=AppSecret, customerId=PartnerId
        testResult = await testYDExpressApi(appId, appSecret, customerId, apiUrl, testTrackingNo);
        break;
      case 'JTSD':
        // 极兔: appId=API账号, appSecret=私钥, customerId=客户编码
        testResult = await testJTExpressApi(appId, appSecret, customerId, apiUrl, testTrackingNo);
        break;
      case 'EMS':
        // 邮政EMS: appId=AppKey, appSecret=AppSecret
        testResult = await testEMSApi(appId, appSecret, apiUrl, testTrackingNo);
        break;
      case 'JD':
        // 京东物流: appId=AppKey, appSecret=AppSecret, customerId=商家编码
        testResult = await testJDExpressApi(appId, appSecret, customerId, apiUrl, testTrackingNo);
        break;
      case 'DBL':
        // 德邦快递: appId=AppKey, appSecret=AppSecret, customerId=公司编码
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
    if (!companyId || !appKey || !appSecret) {
      return { success: false, message: '请填写公司ID、AppKey和AppSecret' };
    }

    const timestamp = Date.now().toString();
    const data = JSON.stringify({
      billCode: trackingNo || '75331234567890'
    });

    // 生成签名: Base64(HMAC-SHA256(requestBody, app_secret))
    // 中通开放平台要求使用HMAC-SHA256签名，放在x-datadigest请求头
    const sign = crypto.createHmac('sha256', appSecret).update(data).digest('base64');

    const response = await axios.post(apiUrl || 'https://japi.zto.com/traceInterfaceNewTraces', data, {
      headers: {
        'Content-Type': 'application/json',
        'x-companyid': companyId,
        'x-appkey': appKey,
        'x-datadigest': sign,
        'x-timestamp': timestamp
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
 * 签名方式: MD5(param值 + SecretKey).toUpperCase()
 * 接口方法: yto.Marketing.WaybillTrace
 */
async function testYTOExpressApi(appKey: string, secretKey: string, userId: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !secretKey) {
      return { success: false, message: '请填写AppKey和SecretKey' };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const param = JSON.stringify({
      Number: trackingNo || 'YT1234567890123',
      OrderType: ''
    });

    // 生成签名: MD5(param + SecretKey).toUpperCase()
    const signStr = param + secretKey;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const response = await axios.post(apiUrl || 'https://openapi.yto.net.cn/open/track_query/v1/query', {
      param: param,
      sign: sign,
      timestamp: timestamp,
      format: 'JSON',
      appkey: appKey,
      user_id: userId || '',
      method: 'yto.Marketing.WaybillTrace'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.success === true || result.code === '0' || result.code === 0)) {
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
async function testYDExpressApi(appKey: string, appSecret: string, partnerId: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !appSecret) {
      return { success: false, message: '请填写AppKey和AppSecret' };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const data = JSON.stringify({
      mailno: trackingNo || '4312345678901'
    });

    // 生成签名
    const signStr = data + appSecret + timestamp;
    const sign = crypto.createHash('md5').update(signStr).digest('hex');

    const response = await axios.post(apiUrl || 'https://openapi.yundaex.com/api/queryTraceInfo', {
      appkey: appKey,
      partner_id: partnerId || '',
      timestamp: timestamp,
      sign: sign,
      request: data
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.code === '0' || result.code === 0 || result.success === true)) {
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
 * 极兔速递API测试 - 极兔开放平台
 * 文档: https://open.jtexpress.com.cn/
 */
async function testJTExpressApi(apiAccount: string, privateKey: string, customerCode: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!apiAccount || !privateKey) {
      return { success: false, message: '请填写API账号和私钥' };
    }

    const timestamp = Date.now().toString();
    const data = JSON.stringify({
      billCodes: trackingNo || 'JT1234567890123'
    });

    // 生成签名: Base64(MD5(data + privateKey))
    const sign = crypto.createHash('md5').update(data + privateKey).digest('base64');

    const response = await axios.post((apiUrl || 'https://openapi.jtexpress.com.cn/webopenplatformapi/api') + '/logistics/trace/queryTracesByBillCodes', {
      logistics_interface: data,
      data_digest: sign,
      msg_type: 'TRACEQUERY',
      eccompanyid: customerCode || apiAccount,
      timestamp: timestamp
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.code === '1' || result.success === true)) {
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
 * 邮政EMS API测试
 * 文档: https://eis.11183.com.cn/
 */
async function testEMSApi(appKey: string, appSecret: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !appSecret) {
      return { success: false, message: '请填写AppKey和AppSecret' };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const data = JSON.stringify({
      mailNo: trackingNo || 'EMS1234567890CN'
    });

    // 生成签名
    const signStr = data + appSecret + timestamp;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const response = await axios.post(apiUrl || 'https://eis.11183.com.cn/openapi/mailTrack/query', {
      appKey: appKey,
      timestamp: timestamp,
      sign: sign,
      data: data
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.code === '0' || result.success === true)) {
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
 * 京东物流API测试 - 京东物流开放平台
 * 文档: https://open.jdl.com/
 */
async function testJDExpressApi(appKey: string, appSecret: string, customerCode: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !appSecret) {
      return { success: false, message: '请填写AppKey和AppSecret' };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const data = JSON.stringify({
      waybillCode: trackingNo || 'JD1234567890',
      customerCode: customerCode || ''
    });

    // 生成签名
    const signStr = appSecret + timestamp + data + appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const response = await axios.post((apiUrl || 'https://api.jdl.com') + '/ecap/v1/orders/trace/query', {
      app_key: appKey,
      timestamp: timestamp,
      sign: sign,
      param_json: data
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.code === '0' || result.code === 0 || result.success === true)) {
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
async function testDBLExpressApi(appKey: string, appSecret: string, companyCode: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !appSecret) {
      return { success: false, message: '请填写AppKey和AppSecret' };
    }

    const timestamp = Date.now().toString();
    const data = JSON.stringify({
      logisticCompanyID: 'DEPPON',
      logisticID: trackingNo || 'DPK1234567890',
      companyCode: companyCode || ''
    });

    // 生成签名: Base64(MD5(appKey + data + timestamp + appSecret))
    const signStr = appKey + data + timestamp + appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('base64');

    const response = await axios.post((apiUrl || 'https://dpapi.deppon.com/dop-interface-sync/standard-order') + '/newTraceQuery.action', {
      companyCode: appKey,
      timestamp: timestamp,
      digest: sign,
      params: data
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const result = response.data;
    if (result && (result.result === 'true' || result.success === true)) {
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

    const status = logisticsAutoSyncService.getStatus();
    if (status.isRunning) {
      return res.json({
        success: false,
        message: '自动同步正在执行中，请稍后再试'
      });
    }

    // 获取租户ID
    const user = (req as any).user;
    const tenantId = user?.tenantId;

    const result = await logisticsAutoSyncService.runAutoSync(tenantId);

    return res.json({
      success: true,
      message: `同步完成: 处理${result.totalProcessed}个订单, 更新${result.statusUpdated}个订单状态, 更新${result.logisticsUpdated}个物流状态, 错误${result.errors}个`,
      data: result
    });
  } catch (error: any) {
    log.error('[物流自动同步] 手动触发失败:', error);
    return res.status(500).json({
      success: false,
      message: '自动同步执行失败: ' + (error?.message || '未知错误')
    });
  }
});

/**
 * 获取自动同步状态
 * GET /api/v1/logistics/status/auto-sync/status
 */
router.get('/auto-sync/status', async (_req, res) => {
  try {
    const { logisticsAutoSyncService } = await import('../../services/LogisticsAutoSyncService');
    const status = logisticsAutoSyncService.getStatus();

    return res.json({
      success: true,
      data: {
        ...status,
        cronSchedule: '*/15 * * * *',
        description: '每15分钟自动检查并同步物流状态到订单状态'
      }
    });
  } catch (_error: any) {
    return res.status(500).json({
      success: false,
      message: '获取状态失败'
    });
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

} // end registerStatusAndConfigRoutes
