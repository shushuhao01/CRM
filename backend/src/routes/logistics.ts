import { Router, Request, Response } from 'express';
import { LogisticsController } from '../controllers/LogisticsController';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { LogisticsCompany } from '../entities/LogisticsCompany';
import { v4 as uuidv4 } from 'uuid';

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

// 查询物流轨迹
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

    const permission = {
      canView: true,
      canUpdate: isAdmin || isManager || isLogisticsStaff,
      canBatchUpdate: isAdmin || isManager,
      canExport: isAdmin || isManager,
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

    // 根据物流状态同步更新订单状态（只使用Order实体中定义的有效状态）
    type ValidOrderStatus = 'delivered' | 'refunded' | 'cancelled' | 'shipped';
    const statusMapping: Record<string, ValidOrderStatus> = {
      'delivered': 'delivered',              // 已签收
      'refunded': 'refunded',                // 退货退款
      'rejected': 'cancelled',               // 拒收 -> 取消
      'rejected_returned': 'cancelled',      // 拒收已退回 -> 取消
    };

    if (statusMapping[newStatus]) {
      order.status = statusMapping[newStatus];
    }

    // 更新订单的更新时间
    order.updatedAt = new Date();

    await orderRepository.save(order);

    // 添加状态更新记录到历史表
    type ValidHistoryStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
    const historyStatusMapping: Record<string, ValidHistoryStatus> = {
      'delivered': 'delivered',
      'refunded': 'refunded',
      'rejected': 'cancelled',
      'rejected_returned': 'cancelled',
    };

    const historyRecord = statusHistoryRepository.create({
      orderId: order.id,
      status: historyStatusMapping[newStatus] || 'shipped',
      notes: remark || `物流状态更新为: ${newStatus}`,
      operatorName: user?.username || '系统'
    });
    await statusHistoryRepository.save(historyRecord);

    console.log('✅ 订单物流状态已持久化到数据库:', { orderNo, newStatus, remark });

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

    // 根据物流状态同步更新订单状态（只使用Order实体中定义的有效状态）
    type ValidOrderStatus = 'delivered' | 'refunded' | 'cancelled' | 'shipped';
    const statusMapping: Record<string, ValidOrderStatus> = {
      'delivered': 'delivered',
      'refunded': 'refunded',
      'rejected': 'cancelled',
      'rejected_returned': 'cancelled',
    };

    // 历史记录状态映射
    type ValidHistoryStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
    const historyStatusMapping: Record<string, ValidHistoryStatus> = {
      'delivered': 'delivered',
      'refunded': 'refunded',
      'rejected': 'cancelled',
      'rejected_returned': 'cancelled',
    };

    for (const orderNo of orderNos) {
      try {
        const order = await orderRepository.findOne({ where: { orderNumber: orderNo } });

        if (!order) {
          failCount++;
          failedOrders.push(orderNo);
          continue;
        }

        // 同步更新订单状态
        if (statusMapping[newStatus]) {
          order.status = statusMapping[newStatus];
        }

        // 更新订单的更新时间
        order.updatedAt = new Date();

        await orderRepository.save(order);

        // 添加状态更新记录到历史表
        const historyRecord = statusHistoryRepository.create({
          orderId: order.id,
          status: historyStatusMapping[newStatus] || 'shipped',
          notes: remark || `批量更新物流状态为: ${newStatus}`,
          operatorName: user?.username || '系统'
        });
        await statusHistoryRepository.save(historyRecord);

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

export default router;
