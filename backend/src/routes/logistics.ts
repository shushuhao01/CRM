import { Router, Request, Response } from 'express';
import { LogisticsController } from '../controllers/LogisticsController';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { LogisticsCompany } from '../entities/LogisticsCompany';
import { v4 as uuidv4 } from 'uuid';
import { orderNotificationService } from '../services/OrderNotificationService';

const router = Router();
const logisticsController = new LogisticsController();

// 应用认证中间件
router.use(authenticateToken);

// ========== 物流公司管理 API ==========

/**
 * 获取物流公司列表（支持筛选）
 */
router.get('/companies/list', async (req: Request, res: Response) => {
  try {
    const { name, code, status, page = 1, pageSize = 20 } = req.query;

    const repository = AppDataSource!.getRepository(LogisticsCompany);
    const queryBuilder = repository.createQueryBuilder('company');

    // 筛选条件
    if (name) {
      queryBuilder.andWhere('company.name LIKE :name', { name: `%${name}%` });
    }
    if (code) {
      queryBuilder.andWhere('company.code LIKE :code', { code: `%${code}%` });
    }
    if (status) {
      queryBuilder.andWhere('company.status = :status', { status });
    }

    // 排序
    queryBuilder.orderBy('company.sortOrder', 'ASC').addOrderBy('company.createdAt', 'DESC');

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
    console.error('获取物流公司列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取物流公司列表失败'
    });
  }
});

/**
 * 获取启用的物流公司列表（用于下拉选择）
 */
router.get('/companies/active', async (_req: Request, res: Response) => {
  try {
    const repository = AppDataSource!.getRepository(LogisticsCompany);
    const companies = await repository.find({
      where: { status: 'active' },
      order: { sortOrder: 'ASC', name: 'ASC' },
      select: ['id', 'code', 'name', 'shortName', 'logo', 'trackingUrl']
    });

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('获取启用的物流公司列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取物流公司列表失败'
    });
  }
});

/**
 * 新增物流公司
 */
router.post('/companies', async (req: Request, res: Response) => {
  try {
    const { code, name, shortName, logo, website, trackingUrl, apiUrl, contactPhone, servicePhone, status, remark } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: '公司代码和名称不能为空'
      });
    }

    const repository = AppDataSource!.getRepository(LogisticsCompany);

    // 检查代码是否已存在
    const existing = await repository.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '公司代码已存在'
      });
    }

    const company = repository.create({
      id: uuidv4(),
      code,
      name,
      shortName,
      logo,
      website,
      trackingUrl,
      apiUrl,
      contactPhone: contactPhone || servicePhone,
      status: status || 'active',
      remark,
      sortOrder: 0
    });

    await repository.save(company);

    return res.json({
      success: true,
      message: '新增成功',
      data: company
    });
  } catch (error) {
    console.error('新增物流公司失败:', error);
    return res.status(500).json({
      success: false,
      message: '新增物流公司失败'
    });
  }
});

/**
 * 更新物流公司
 */
router.put('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, shortName, logo, website, trackingUrl, apiUrl, contactPhone, servicePhone, status, remark, sortOrder } = req.body;

    const repository = AppDataSource!.getRepository(LogisticsCompany);
    const company = await repository.findOne({ where: { id } });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '物流公司不存在'
      });
    }

    // 如果修改了代码，检查是否与其他公司冲突
    if (code && code !== company.code) {
      const existing = await repository.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '公司代码已存在'
        });
      }
    }

    // 更新字段
    if (code) company.code = code;
    if (name) company.name = name;
    if (shortName !== undefined) company.shortName = shortName;
    if (logo !== undefined) company.logo = logo;
    if (website !== undefined) company.website = website;
    if (trackingUrl !== undefined) company.trackingUrl = trackingUrl;
    if (apiUrl !== undefined) company.apiUrl = apiUrl;
    if (contactPhone !== undefined) company.contactPhone = contactPhone;
    if (servicePhone !== undefined) company.contactPhone = servicePhone;
    if (status !== undefined) company.status = status;
    if (remark !== undefined) company.remark = remark;
    if (sortOrder !== undefined) company.sortOrder = sortOrder;

    await repository.save(company);

    return res.json({
      success: true,
      message: '更新成功',
      data: company
    });
  } catch (error) {
    console.error('更新物流公司失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新物流公司失败'
    });
  }
});

/**
 * 切换物流公司状态
 */
router.patch('/companies/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }

    const repository = AppDataSource!.getRepository(LogisticsCompany);
    const company = await repository.findOne({ where: { id } });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '物流公司不存在'
      });
    }

    company.status = status;
    await repository.save(company);

    return res.json({
      success: true,
      message: status === 'active' ? '启用成功' : '禁用成功',
      data: company
    });
  } catch (error) {
    console.error('切换物流公司状态失败:', error);
    return res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
});

/**
 * 删除物流公司
 */
router.delete('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const repository = AppDataSource!.getRepository(LogisticsCompany);
    const company = await repository.findOne({ where: { id } });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '物流公司不存在'
      });
    }

    await repository.remove(company);

    return res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除物流公司失败:', error);
    return res.status(500).json({
      success: false,
      message: '删除物流公司失败'
    });
  }
});

// ========== 原有物流跟踪 API ==========

// 获取物流列表
router.get('/list', (req, res) => logisticsController.getLogisticsList(req, res));

// 获取支持的快递公司列表
router.get('/companies', (req, res) => logisticsController.getSupportedCompanies(req, res));

// 创建物流跟踪
router.post('/tracking', (req, res) => logisticsController.createLogisticsTracking(req, res));

// ========== 物流轨迹查询 API（调用真实快递API） ==========
import { logisticsTraceService } from '../services/LogisticsTraceService';

/**
 * 查询物流轨迹（调用真实快递公司API）
 */
router.get('/trace/query', async (req: Request, res: Response) => {
  try {
    const { trackingNo, companyCode, phone } = req.query;

    if (!trackingNo) {
      return res.status(400).json({
        success: false,
        message: '请提供物流单号'
      });
    }

    console.log(`[物流轨迹查询] 单号: ${trackingNo}, 快递公司: ${companyCode || '自动识别'}, 手机号: ${phone ? '已提供' : '未提供'}`);

    const result = await logisticsTraceService.queryTrace(
      trackingNo as string,
      companyCode as string | undefined,
      phone as string | undefined
    );

    return res.json({
      success: result.success,
      data: result,
      message: result.success ? '查询成功' : result.statusText
    });
  } catch (error) {
    console.error('[物流轨迹查询] 失败:', error);
    return res.status(500).json({
      success: false,
      message: '查询失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

/**
 * 批量查询物流轨迹
 */
router.post('/trace/batch-query', async (req: Request, res: Response) => {
  try {
    const { trackingNos, companyCode } = req.body;

    if (!trackingNos || !Array.isArray(trackingNos) || trackingNos.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供物流单号列表'
      });
    }

    if (trackingNos.length > 50) {
      return res.status(400).json({
        success: false,
        message: '单次最多查询50个单号'
      });
    }

    console.log(`[批量物流轨迹查询] 单号数量: ${trackingNos.length}`);

    const results = await logisticsTraceService.batchQueryTrace(trackingNos, companyCode);

    return res.json({
      success: true,
      data: results,
      message: `查询完成，成功 ${results.filter(r => r.success).length} 个`
    });
  } catch (error) {
    console.error('[批量物流轨迹查询] 失败:', error);
    return res.status(500).json({
      success: false,
      message: '查询失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

/**
 * 刷新物流轨迹（强制从快递API获取最新数据）
 */
router.post('/trace/refresh', async (req: Request, res: Response) => {
  try {
    const { trackingNo, companyCode } = req.body;

    if (!trackingNo) {
      return res.status(400).json({
        success: false,
        message: '请提供物流单号'
      });
    }

    console.log(`[刷新物流轨迹] 单号: ${trackingNo}`);

    // 强制从API获取最新数据
    const result = await logisticsTraceService.queryTrace(trackingNo, companyCode);

    // 如果查询成功，可以更新数据库中的物流状态
    if (result.success && result.traces.length > 0) {
      try {
        const { Order } = await import('../entities/Order');
        const orderRepository = AppDataSource!.getRepository(Order);

        // 查找对应的订单（通过trackingNumber字段）
        const order = await orderRepository.findOne({
          where: { trackingNumber: trackingNo }
        });

        if (order) {
          // 更新订单的物流状态
          order.logisticsStatus = result.status;
          order.updatedAt = new Date();
          await orderRepository.save(order);
          console.log(`[刷新物流轨迹] 订单 ${order.orderNumber} 物流状态已更新为: ${result.status}`);
        }
      } catch (updateError) {
        console.warn('[刷新物流轨迹] 更新订单状态失败:', updateError);
      }
    }

    return res.json({
      success: result.success,
      data: result,
      message: result.success ? '刷新成功' : result.statusText
    });
  } catch (error) {
    console.error('[刷新物流轨迹] 失败:', error);
    return res.status(500).json({
      success: false,
      message: '刷新失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

// 查询物流轨迹（旧版API，保持兼容）
router.get('/trace', (req, res) => logisticsController.getLogisticsTrace(req, res));

// 批量同步物流状态
router.post('/batch-sync', (req, res) => logisticsController.batchSyncLogistics(req, res));

// 更新物流状态
router.put('/tracking/:id', (req, res) => logisticsController.updateLogisticsStatus(req, res));

// 获取用户物流权限
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
    console.error('获取物流权限失败:', error);
    res.status(500).json({
      success: false,
      message: '获取物流权限失败'
    });
  }
});

// 获取物流状态更新页面的订单列表
router.get('/status-update/orders', async (req, res) => {
  try {
    const { _tab = 'pending', page = 1, pageSize = 20, _keyword, _status, _dateRange } = req.query;

    // 这里应该从数据库获取订单数据
    // 目前返回模拟数据结构
    res.json({
      success: true,
      data: {
        list: [],
        total: 0,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取物流状态更新订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
});

// 获取物流状态更新汇总数据
router.get('/status-update/summary', async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pending: 0,
        updated: 0,
        todo: 0,
        total: 0
      }
    });
  } catch (error) {
    console.error('获取物流状态汇总失败:', error);
    res.status(500).json({
      success: false,
      message: '获取汇总数据失败'
    });
  }
});

// 获取物流汇总数据
router.get('/summary', async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pending: 0,
        inTransit: 0,
        delivered: 0,
        exception: 0,
        total: 0
      }
    });
  } catch (error) {
    console.error('获取物流汇总失败:', error);
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
    const { Order } = await import('../entities/Order');
    const { OrderStatusHistory } = await import('../entities/OrderStatusHistory');
    const orderRepository = AppDataSource!.getRepository(Order);
    const statusHistoryRepository = AppDataSource!.getRepository(OrderStatusHistory);

    const order = await orderRepository.findOne({ where: { orderNumber: orderNo } });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 更新物流状态字段
    order.logisticsStatus = newStatus;

    // 🔥 修复：物流状态直接作为订单状态保存，不再映射成cancelled
    // 这些状态都是有效的订单状态，应该保持原样
    const validOrderStatuses = [
      'delivered',           // 已签收
      'rejected',            // 拒收
      'rejected_returned',   // 拒收已退回
      'refunded',            // 退货退款
      'after_sales_created', // 已建售后
      'abnormal',            // 状态异常
      'package_exception'    // 包裹异常
    ];

    if (validOrderStatuses.includes(newStatus)) {
      order.status = newStatus as any;
      console.log(`[物流状态] 订单状态同步更新为: ${newStatus}`);
    }

    // 更新订单的更新时间
    order.updatedAt = new Date();

    await orderRepository.save(order);

    // 添加状态更新记录到历史表（可选，如果失败不影响主流程）
    try {
      const historyRecord = statusHistoryRepository.create({
        orderId: order.id,
        status: newStatus as any, // 直接使用新状态
        notes: remark || `物流状态更新为: ${newStatus}`,
        operatorName: user?.username || '系统'
      });
      await statusHistoryRepository.save(historyRecord);
      console.log('✅ 状态历史记录已保存:', newStatus);
    } catch (historyError) {
      // 历史记录保存失败不影响主流程
      console.warn('⚠️ 状态历史记录保存失败（不影响主流程）:', historyError);
    }

    console.log('✅ 订单物流状态已持久化到数据库:', { orderNo, newStatus, remark });

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
          .catch(err => console.error('[物流状态] 发送签收通知失败:', err));
        break;
      case 'rejected':
      case 'rejected_returned':
        orderNotificationService.notifyOrderRejected(orderInfo, remark)
          .catch(err => console.error('[物流状态] 发送拒收通知失败:', err));
        break;
      case 'exception':
        orderNotificationService.notifyPackageException(orderInfo, remark)
          .catch(err => console.error('[物流状态] 发送异常通知失败:', err));
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
    console.error('更新订单物流状态失败:', error);
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
    const { Order } = await import('../entities/Order');
    const { OrderStatusHistory } = await import('../entities/OrderStatusHistory');
    const orderRepository = AppDataSource!.getRepository(Order);
    const statusHistoryRepository = AppDataSource!.getRepository(OrderStatusHistory);

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
          const historyRecord = statusHistoryRepository.create({
            orderId: order.id,
            status: newStatus as any,
            notes: remark || `批量更新物流状态为: ${newStatus}`,
            operatorName: user?.username || '系统'
          });
          await statusHistoryRepository.save(historyRecord);
        } catch (historyError) {
          console.warn(`⚠️ 订单 ${orderNo} 状态历史记录保存失败（不影响主流程）:`, historyError);
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
              .catch(err => console.error(`[物流状态] 订单 ${orderNo} 发送签收通知失败:`, err));
            break;
          case 'rejected':
          case 'rejected_returned':
            orderNotificationService.notifyOrderRejected(orderInfo, remark)
              .catch(err => console.error(`[物流状态] 订单 ${orderNo} 发送拒收通知失败:`, err));
            break;
          case 'exception':
            orderNotificationService.notifyPackageException(orderInfo, remark)
              .catch(err => console.error(`[物流状态] 订单 ${orderNo} 发送异常通知失败:`, err));
            break;
        }

        successCount++;
      } catch (err) {
        console.error(`更新订单 ${orderNo} 失败:`, err);
        failCount++;
        failedOrders.push(orderNo);
      }
    }

    console.log('✅ 批量更新订单物流状态完成:', { successCount, failCount, failedOrders });

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
    console.error('批量更新订单物流状态失败:', error);
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

    console.log('设置订单待办:', { orderNo, days, remark });

    // 从数据库获取订单并更新待办状态
    const { Order } = await import('../entities/Order');
    const orderRepository = AppDataSource!.getRepository(Order);

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

    console.log('✅ 订单待办设置成功:', { orderNo, todoDate: todoDateStr, remark });

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
    console.error('设置订单待办失败:', error);
    return res.status(500).json({
      success: false,
      message: '设置待办失败'
    });
  }
});

// 获取物流状态日志
router.get('/log', async (req, res) => {
  try {
    const { _orderNo, page = 1, pageSize = 20 } = req.query;

    res.json({
      success: true,
      data: {
        list: [],
        total: 0,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取物流日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取日志失败'
    });
  }
});

// 导出物流状态数据
router.get('/export', async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        url: '',
        filename: 'logistics_export.xlsx'
      }
    });
  } catch (error) {
    console.error('导出物流数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败'
    });
  }
});

// ========== 物流API配置管理 ==========

import { LogisticsApiConfig } from '../entities/LogisticsApiConfig';

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
    console.log('[圆通回调] 收到请求体:', rawBody);
    console.log('[圆通回调] Content-Type:', req.headers['content-type']);

    // 圆通推送的数据可能是XML格式或JSON格式
    let trackingNo = 'UNKNOWN';
    let _logisticsInfo = null;

    // 尝试从请求体中提取运单号
    if (typeof req.body === 'object') {
      // JSON格式
      trackingNo = req.body.waybillNo || req.body.mailNo || req.body.logisticsId || 'UNKNOWN';
      _logisticsInfo = req.body;
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

    console.log('[圆通回调] 解析到运单号:', trackingNo);

    // TODO: 这里可以将物流轨迹数据保存到数据库
    // await saveLogisticsTrace(trackingNo, logisticsInfo);

    // 返回圆通期望的成功响应格式
    // 圆通要求返回特定格式表示接收成功
    const successResponse = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <success>true</success>
  <code>0</code>
  <message>成功</message>
</response>`;

    console.log('[圆通回调] 返回成功响应');

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
    console.error('[圆通回调] 处理失败:', error);

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

/**
 * 获取物流API配置列表
 */
router.get('/api-configs', async (_req: Request, res: Response) => {
  try {
    const repository = AppDataSource!.getRepository(LogisticsApiConfig);
    const configs = await repository.find({
      order: { companyCode: 'ASC' }
    });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('获取物流API配置列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置列表失败'
    });
  }
});

/**
 * 根据公司代码获取API配置
 */
router.get('/api-configs/:companyCode', async (req: Request, res: Response) => {
  try {
    const { companyCode } = req.params;
    const repository = AppDataSource!.getRepository(LogisticsApiConfig);
    const config = await repository.findOne({
      where: { companyCode: companyCode.toUpperCase() }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取物流API配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

/**
 * 保存/更新物流API配置
 */
router.post('/api-configs/:companyCode', async (req: Request, res: Response) => {
  try {
    const { companyCode } = req.params;
    const { appId, appKey, appSecret, customerId, apiUrl, apiEnvironment, extraConfig, enabled } = req.body;
    const currentUser = (req as any).user;

    console.log(`[物流API配置] 保存配置请求: companyCode=${companyCode}`);
    console.log(`[物流API配置] 请求参数:`, {
      appId: appId ? `${appId.substring(0, 4)}***` : '(空)',
      appKey: appKey ? '***' : '(空)',
      appSecret: appSecret ? '***' : '(空)',
      customerId: customerId || '(空)',
      apiUrl: apiUrl || '(空)',
      apiEnvironment,
      enabled
    });

    const repository = AppDataSource!.getRepository(LogisticsApiConfig);
    let config = await repository.findOne({
      where: { companyCode: companyCode.toUpperCase() }
    });

    console.log(`[物流API配置] 现有配置: ${config ? `已存在(id=${config.id}, appId=${config.appId || '空'})` : '不存在'}`);

    if (!config) {
      // 创建新配置
      config = repository.create({
        id: `lac-${Date.now()}`,
        companyCode: companyCode.toUpperCase(),
        companyName: getCompanyName(companyCode),
        createdBy: currentUser?.userId || currentUser?.id
      });
      console.log(`[物流API配置] 创建新配置: id=${config.id}`);
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
    config.updatedBy = currentUser?.userId || currentUser?.id;

    console.log(`[物流API配置] 准备保存:`, {
      id: config.id,
      companyCode: config.companyCode,
      appId: config.appId ? `${config.appId.substring(0, 4)}***` : '(空)',
      appSecret: config.appSecret ? '***已设置***' : '(空)',
      enabled: config.enabled,
      apiEnvironment: config.apiEnvironment
    });

    const savedConfig = await repository.save(config);

    console.log(`[物流API配置] ✅ 保存成功, id=${savedConfig.id}`);

    // 🔥 验证保存结果
    const verifyConfig = await repository.findOne({
      where: { companyCode: companyCode.toUpperCase() }
    });
    console.log(`[物流API配置] 验证保存结果:`, {
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
  } catch (error) {
    console.error('[物流API配置] ❌ 保存失败:', error);
    return res.status(500).json({
      success: false,
      message: '保存配置失败'
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

    console.log(`[物流API测试] 公司: ${companyCode}, 参数:`, { appId, appKey: appKey ? '***' : '', appSecret: appSecret ? '***' : '', customerId, apiUrl });

    // 根据不同快递公司调用不同的测试逻辑
    let testResult = { success: false, message: '暂不支持该快递公司的API测试' };

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
        // 圆通: appId=AppKey, appKey=AppSecret, appSecret=UserId
        testResult = await testYTOExpressApi(appId, appKey, appSecret, apiUrl, testTrackingNo);
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

    console.log(`[物流API测试] 结果:`, testResult);

    // 更新测试结果到数据库
    const repository = AppDataSource!.getRepository(LogisticsApiConfig);
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
    console.error('测试物流API失败:', error);
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
import crypto from 'crypto';
import axios from 'axios';

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

    console.log('[顺丰API测试] ========== 请求参数 ==========');
    console.log('[顺丰API测试] URL:', apiUrl);
    console.log('[顺丰API测试] partnerID:', partnerId);
    console.log('[顺丰API测试] msgData(原始):', msgData);
    console.log('[顺丰API测试] msgData(编码后):', encodedMsgData);
    console.log('[顺丰API测试] timestamp:', timestamp);
    console.log('[顺丰API测试] signStr:', signStr.substring(0, 100) + '...');
    console.log('[顺丰API测试] msgDigest:', msgDigest);

    // 🔥 手动构建请求体，避免URLSearchParams的二次编码问题
    const requestBody = `partnerID=${encodeURIComponent(partnerId)}&requestID=${encodeURIComponent(requestId)}&serviceCode=${encodeURIComponent(serviceCode)}&timestamp=${timestamp}&msgDigest=${encodeURIComponent(msgDigest)}&msgData=${encodedMsgData}`;

    console.log('[顺丰API测试] 完整请求体:', requestBody);

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

    console.log('[顺丰API测试] 响应:', JSON.stringify(response.data));

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
    console.error('[顺丰API测试] 错误:', error);
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

    // 生成签名: MD5(app_key + timestamp + data + app_secret)
    const signStr = appKey + timestamp + data + appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const response = await axios.post(apiUrl || 'https://japi.zto.com/zto.open.getTraceInfo', data, {
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
 */
async function testYTOExpressApi(appKey: string, appSecret: string, userId: string, apiUrl: string, trackingNo?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!appKey || !appSecret || !userId) {
      return { success: false, message: '请填写AppKey、AppSecret和UserId' };
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const data = JSON.stringify({
      waybillNo: trackingNo || 'YT1234567890123'
    });

    // 生成签名
    const signStr = data + appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const response = await axios.post(apiUrl || 'https://openapi.yto.net.cn/open/track_query/v1/query', {
      data: data,
      sign: sign,
      timestamp: timestamp,
      format: 'JSON',
      appkey: appKey,
      user_id: userId,
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

    const _timestamp = Date.now().toString();
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

    const response = await axios.post(apiUrl || 'https://openapi.yundaex.com/openapi/outer/logictis/query', {
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

    // 生成签名: MD5(data + privateKey)
    const sign = crypto.createHash('md5').update(data + privateKey).digest('hex');

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

    // 生成签名: MD5(appKey + data + timestamp + appSecret)
    const signStr = appKey + data + timestamp + appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

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

export default router;
