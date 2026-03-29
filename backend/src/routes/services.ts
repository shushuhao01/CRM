import { Router, Request, Response } from 'express';
import { AfterSalesService } from '../entities/AfterSalesService';
import { Order } from '../entities/Order';
import { Customer } from '../entities/Customer';
import { ServiceFollowUp } from '../entities/ServiceFollowUp';
import { ServiceOperationLog } from '../entities/ServiceOperationLog';
import { authenticateToken } from '../middleware/auth';
import { orderNotificationService } from '../services/OrderNotificationService';
import { getTenantRepo } from '../utils/tenantRepo';
// import { Like, In } from 'typeorm'; // 暂时未使用

const router = Router();

// 获取售后服务仓库（🔥 使用租户感知仓储）
const getServiceRepository = () => {
  return getTenantRepo(AfterSalesService);
};

// 获取跟进记录仓库（🔥 使用租户感知仓储）
const getFollowUpRepository = () => {
  return getTenantRepo(ServiceFollowUp);
};

// 获取操作记录仓库（🔥 使用租户感知仓储）
const getOperationLogRepository = () => {
  return getTenantRepo(ServiceOperationLog);
};

// 生成唯一ID
const generateId = (prefix: string = '') => {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
};

// 记录操作日志
const logOperation = async (
  serviceId: string,
  serviceNumber: string,
  operationType: string,
  operationContent: string,
  operatorId: string,
  operatorName: string,
  oldValue?: string,
  newValue?: string,
  remark?: string
) => {
  try {
    const logRepository = getOperationLogRepository();
    const log = logRepository.create({
      id: generateId('SOL'),
      serviceId,
      serviceNumber,
      operationType,
      operationContent,
      oldValue,
      newValue,
      operatorId,
      operatorName,
      remark
    });
    await logRepository.save(log);
  } catch (error) {
    console.error('[Services] 记录操作日志失败:', error);
  }
};

/**
 * 获取售后服务列表
 * GET /api/v1/services
 * 支持数据权限过滤：
 * - 超管/管理员/客服：查看所有
 * - 经理：查看本部门的
 * - 销售员：查看自己创建的
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const currentUser = (req as any).user;
    const { page = 1, limit = 20, status, serviceType, search, orderNumber } = req.query;

    const queryBuilder = serviceRepository.createQueryBuilder('service');

    // 数据权限过滤
    const role = currentUser?.role || '';
    const allowAllRoles = ['super_admin', 'superadmin', 'admin', 'service', 'customer_service'];

    if (!allowAllRoles.includes(role)) {
      if (role === 'manager' || role === 'department_manager') {
        // 经理看本部门的
        if (currentUser?.departmentId) {
          queryBuilder.andWhere('service.departmentId = :departmentId', {
            departmentId: currentUser.departmentId
          });
        }
      } else {
        // 销售员只看自己创建的
        queryBuilder.andWhere('service.createdById = :userId', {
          userId: currentUser?.userId
        });
      }
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('service.status = :status', { status });
    }

    // 服务类型筛选
    if (serviceType) {
      queryBuilder.andWhere('service.serviceType = :serviceType', { serviceType });
    }

    // 订单号搜索
    if (orderNumber) {
      queryBuilder.andWhere('service.orderNumber LIKE :orderNumber', {
        orderNumber: `%${orderNumber}%`
      });
    }

    // 关键词搜索（支持：售后单号、订单号、客户姓名、客户电话、客户编码、物流单号、客户其他手机号）
    if (search) {
      queryBuilder.andWhere(
        '(service.serviceNumber LIKE :search OR service.customerName LIKE :search OR service.orderNumber LIKE :search OR service.customerPhone LIKE :search' +
        ' OR EXISTS (SELECT 1 FROM customers c WHERE c.id = service.customer_id AND (c.customer_code LIKE :search OR CAST(c.other_phones AS CHAR) LIKE :search))' +
        ' OR EXISTS (SELECT 1 FROM orders o WHERE o.id = service.order_id AND o.tracking_number LIKE :search))',
        { search: `%${search}%` }
      );
    }

    // 分页
    const offset = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(offset).take(Number(limit));

    // 排序
    queryBuilder.orderBy('service.createdAt', 'DESC');

    const [services, total] = await queryBuilder.getManyAndCount();

    // 格式化返回数据
    const formattedServices = services.map(service => ({
      id: service.id,
      serviceNumber: service.serviceNumber,
      orderId: service.orderId,
      orderNumber: service.orderNumber,
      customerId: service.customerId,
      customerName: service.customerName,
      customerPhone: service.customerPhone,
      serviceType: service.serviceType,
      status: service.status,
      priority: service.priority,
      reason: service.reason,
      description: service.description,
      productName: service.productName,
      productSpec: service.productSpec,
      quantity: service.quantity,
      price: service.price,
      contactName: service.contactName,
      contactPhone: service.contactPhone,
      contactAddress: service.contactAddress,
      assignedTo: service.assignedTo,
      assignedToId: service.assignedToId,
      remark: service.remark,
      attachments: service.attachments || [],
      createdBy: service.createdBy,
      createdById: service.createdById,
      departmentId: service.departmentId,
      createTime: service.createdAt?.toISOString().replace('T', ' ').substring(0, 19),
      updateTime: service.updatedAt?.toISOString().replace('T', ' ').substring(0, 19),
      expectedTime: service.expectedTime?.toISOString().replace('T', ' ').substring(0, 19),
      resolvedTime: service.resolvedTime?.toISOString().replace('T', ' ').substring(0, 19)
    }));

    res.json({
      success: true,
      data: {
        items: formattedServices,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('[Services] 获取售后服务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取售后服务列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取售后服务详情
 * GET /api/v1/services/:id
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const { id } = req.params;

    const service = await serviceRepository.findOne({ where: { id } });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '售后服务不存在'
      });
    }

    res.json({
      success: true,
      data: {
        id: service.id,
        serviceNumber: service.serviceNumber,
        orderId: service.orderId,
        orderNumber: service.orderNumber,
        customerId: service.customerId,
        customerName: service.customerName,
        customerPhone: service.customerPhone,
        serviceType: service.serviceType,
        status: service.status,
        priority: service.priority,
        reason: service.reason,
        description: service.description,
        productName: service.productName,
        productSpec: service.productSpec,
        quantity: service.quantity,
        price: service.price,
        contactName: service.contactName,
        contactPhone: service.contactPhone,
        contactAddress: service.contactAddress,
        assignedTo: service.assignedTo,
        assignedToId: service.assignedToId,
        remark: service.remark,
        attachments: service.attachments || [],
        createdBy: service.createdBy,
        createdById: service.createdById,
        departmentId: service.departmentId,
        createTime: service.createdAt?.toISOString().replace('T', ' ').substring(0, 19),
        updateTime: service.updatedAt?.toISOString().replace('T', ' ').substring(0, 19),
        expectedTime: service.expectedTime?.toISOString().replace('T', ' ').substring(0, 19),
        resolvedTime: service.resolvedTime?.toISOString().replace('T', ' ').substring(0, 19)
      }
    });
  } catch (error) {
    console.error('[Services] 获取售后服务详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取售后服务详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 创建售后服务
 * POST /api/v1/services
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const currentUser = (req as any).user;
    const data = req.body;

    // 🔥 租户数据隔离：验证关联订单归属当前租户
    if (data.orderId) {
      const orderRepo = getTenantRepo(Order);
      const order = await orderRepo.findOne({ where: { id: data.orderId } });
      if (!order) {
        return res.status(400).json({
          success: false,
          message: '关联订单不存在或无权访问'
        });
      }
    }

    // 🔥 租户数据隔离：验证关联客户归属当前租户
    if (data.customerId) {
      const customerRepo = getTenantRepo(Customer);
      const customer = await customerRepo.findOne({ where: { id: data.customerId } });
      if (!customer) {
        return res.status(400).json({
          success: false,
          message: '关联客户不存在或无权访问'
        });
      }
    }

    // 生成ID和服务单号
    const timestamp = Date.now();
    const serviceId = `SH${timestamp}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const serviceNumber = `SH${timestamp}`;

    const service = serviceRepository.create({
      id: serviceId,
      serviceNumber,
      orderId: data.orderId || null,
      orderNumber: data.orderNumber || null,
      customerId: data.customerId || null,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      serviceType: data.serviceType || 'return',
      status: 'pending',
      priority: data.priority || 'normal',
      reason: data.reason || null,
      description: data.description || null,
      productName: data.productName || null,
      productSpec: data.productSpec || null,
      quantity: data.quantity || 1,
      price: data.price || 0,
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      contactAddress: data.contactAddress || null,
      assignedTo: data.assignedTo || null,
      assignedToId: data.assignedToId || null,
      remark: data.remark || null,
      attachments: data.attachments || [],
      createdBy: currentUser?.username || data.createdBy || null,
      createdById: currentUser?.userId || data.createdById || null,
      departmentId: currentUser?.departmentId || data.departmentId || null,
      expectedTime: data.expectedTime ? new Date(data.expectedTime) : null
    });

    const savedService = await serviceRepository.save(service);

    console.log('[Services] 创建售后服务成功:', savedService.serviceNumber);

    // 🔥 发送售后创建通知给创建者和管理员
    orderNotificationService.notifyAfterSalesCreated({
      id: savedService.id,
      serviceNumber: savedService.serviceNumber,
      orderId: savedService.orderId || undefined,
      orderNumber: savedService.orderNumber || undefined,
      customerName: savedService.customerName || undefined,
      serviceType: savedService.serviceType,
      createdBy: savedService.createdById || undefined,
      createdByName: savedService.createdBy || undefined
    }).catch(err => console.error('[Services] 发送售后创建通知失败:', err));

    res.status(201).json({
      success: true,
      message: '创建售后服务成功',
      data: {
        id: savedService.id,
        serviceNumber: savedService.serviceNumber,
        status: savedService.status,
        createTime: savedService.createdAt?.toISOString().replace('T', ' ').substring(0, 19)
      }
    });
  } catch (error) {
    console.error('[Services] 创建售后服务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建售后服务失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 更新售后服务
 * PUT /api/v1/services/:id
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const { id } = req.params;
    const data = req.body;
    const currentUser = (req as any).user;
    const operatorName = currentUser?.realName || currentUser?.name || currentUser?.username || '系统';

    const service = await serviceRepository.findOne({ where: { id } });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '售后服务不存在'
      });
    }

    const previousStatus = service.status;

    // 更新字段
    if (data.serviceType !== undefined) service.serviceType = data.serviceType;
    if (data.status !== undefined) service.status = data.status;
    if (data.priority !== undefined) service.priority = data.priority;
    if (data.reason !== undefined) service.reason = data.reason;
    if (data.description !== undefined) service.description = data.description;
    if (data.assignedTo !== undefined) service.assignedTo = data.assignedTo;
    if (data.assignedToId !== undefined) service.assignedToId = data.assignedToId;
    if (data.remark !== undefined) service.remark = data.remark;
    if (data.expectedTime !== undefined) service.expectedTime = data.expectedTime ? new Date(data.expectedTime) : null;

    // 如果状态变为已解决，记录解决时间
    if (data.status === 'resolved' && !service.resolvedTime) {
      service.resolvedTime = new Date();
    }

    const updatedService = await serviceRepository.save(service);

    console.log('[Services] 更新售后服务成功:', updatedService.serviceNumber);

    // 🔥 如果状态发生变更，发送通知
    if (data.status !== undefined && data.status !== previousStatus) {
      const afterSalesInfo = {
        id: service.id,
        serviceNumber: service.serviceNumber,
        orderId: service.orderId || undefined,
        orderNumber: service.orderNumber || undefined,
        customerName: service.customerName || undefined,
        serviceType: service.serviceType,
        createdBy: service.createdById || undefined,
        createdByName: service.createdBy || undefined
      };

      switch (data.status) {
        case 'processing':
          orderNotificationService.notifyAfterSalesProcessing(afterSalesInfo, operatorName)
            .catch(err => console.error('[Services] 发送处理中通知失败:', err));
          break;
        case 'resolved':
        case 'closed':
          orderNotificationService.notifyAfterSalesCompleted(afterSalesInfo, operatorName)
            .catch(err => console.error('[Services] 发送完成通知失败:', err));
          break;
        case 'rejected':
          orderNotificationService.notifyAfterSalesRejected(afterSalesInfo, operatorName, data.remark)
            .catch(err => console.error('[Services] 发送拒绝通知失败:', err));
          break;
        case 'cancelled':
          orderNotificationService.notifyAfterSalesCancelled(afterSalesInfo, operatorName)
            .catch(err => console.error('[Services] 发送取消通知失败:', err));
          break;
      }
    }

    res.json({
      success: true,
      message: '更新售后服务成功',
      data: {
        id: updatedService.id,
        serviceNumber: updatedService.serviceNumber,
        status: updatedService.status,
        updateTime: updatedService.updatedAt?.toISOString().replace('T', ' ').substring(0, 19)
      }
    });
  } catch (error) {
    console.error('[Services] 更新售后服务失败:', error);
    res.status(500).json({
      success: false,
      message: '更新售后服务失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 更新售后服务状态
 * PATCH /api/v1/services/:id/status
 */
router.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const { id } = req.params;
    const { status, remark } = req.body;
    const currentUser = (req as any).user;
    const operatorName = currentUser?.realName || currentUser?.name || currentUser?.username || '系统';

    if (!['pending', 'processing', 'resolved', 'closed', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }

    const service = await serviceRepository.findOne({ where: { id } });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '售后服务不存在'
      });
    }

    const previousStatus = service.status;
    service.status = status;
    if (remark) service.remark = remark;

    // 如果状态变为已解决，记录解决时间
    if (status === 'resolved' && !service.resolvedTime) {
      service.resolvedTime = new Date();
    }

    const updatedService = await serviceRepository.save(service);

    // 🔥 根据状态变更发送通知
    if (status !== previousStatus) {
      const afterSalesInfo = {
        id: service.id,
        serviceNumber: service.serviceNumber,
        orderId: service.orderId || undefined,
        orderNumber: service.orderNumber || undefined,
        customerName: service.customerName || undefined,
        serviceType: service.serviceType,
        createdBy: service.createdById || undefined,
        createdByName: service.createdBy || undefined
      };

      switch (status) {
        case 'processing':
          orderNotificationService.notifyAfterSalesProcessing(afterSalesInfo, operatorName)
            .catch(err => console.error('[Services] 发送处理中通知失败:', err));
          break;
        case 'resolved':
        case 'closed':
          orderNotificationService.notifyAfterSalesCompleted(afterSalesInfo, operatorName)
            .catch(err => console.error('[Services] 发送完成通知失败:', err));
          break;
        case 'rejected':
          orderNotificationService.notifyAfterSalesRejected(afterSalesInfo, operatorName, remark)
            .catch(err => console.error('[Services] 发送拒绝通知失败:', err));
          break;
        case 'cancelled':
          orderNotificationService.notifyAfterSalesCancelled(afterSalesInfo, operatorName)
            .catch(err => console.error('[Services] 发送取消通知失败:', err));
          break;
      }
    }

    res.json({
      success: true,
      message: '状态更新成功',
      data: {
        id: updatedService.id,
        status: updatedService.status
      }
    });
  } catch (error) {
    console.error('[Services] 更新售后服务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新状态失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 分配处理人
 * PATCH /api/v1/services/:id/assign
 */
router.patch('/:id/assign', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const { id } = req.params;
    const { assignedTo, assignedToId, remark } = req.body;
    const currentUser = (req as any).user;

    const service = await serviceRepository.findOne({ where: { id } });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '售后服务不存在'
      });
    }

    service.assignedTo = assignedTo;
    service.assignedToId = assignedToId;
    if (remark) service.remark = remark;

    // 分配后自动变为处理中
    if (service.status === 'pending') {
      service.status = 'processing';
    }

    const updatedService = await serviceRepository.save(service);

    // 发送消息提醒给处理人和创建者
    try {
      await orderNotificationService.notifyAfterSalesAssigned(
        {
          id: updatedService.id,
          serviceNumber: updatedService.serviceNumber,
          orderId: updatedService.orderId,
          orderNumber: updatedService.orderNumber,
          customerName: updatedService.customerName,
          serviceType: updatedService.serviceType,
          createdBy: updatedService.createdById,
          assignedTo: updatedService.assignedTo,
          assignedToId: updatedService.assignedToId
        },
        currentUser?.userId,
        currentUser?.name || currentUser?.username
      );
    } catch (notifyError) {
      console.error('[Services] 发送分配通知失败:', notifyError);
      // 通知失败不影响主流程
    }

    res.json({
      success: true,
      message: '分配成功',
      data: {
        id: updatedService.id,
        assignedTo: updatedService.assignedTo,
        status: updatedService.status
      }
    });
  } catch (error) {
    console.error('[Services] 分配处理人失败:', error);
    res.status(500).json({
      success: false,
      message: '分配失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 设置优先级
 * PATCH /api/v1/services/:id/priority
 */
router.patch('/:id/priority', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const { id } = req.params;
    const { priority, remark } = req.body;

    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: '无效的优先级值'
      });
    }

    const service = await serviceRepository.findOne({ where: { id } });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '售后服务不存在'
      });
    }

    service.priority = priority;
    if (remark) service.remark = remark;

    const updatedService = await serviceRepository.save(service);

    res.json({
      success: true,
      message: '优先级设置成功',
      data: {
        id: updatedService.id,
        priority: updatedService.priority
      }
    });
  } catch (error) {
    console.error('[Services] 设置优先级失败:', error);
    res.status(500).json({
      success: false,
      message: '设置优先级失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 删除售后服务
 * DELETE /api/v1/services/:id
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const { id } = req.params;

    const service = await serviceRepository.findOne({ where: { id } });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: '售后服务不存在'
      });
    }

    // 🔥 使用 delete 而非 remove：delete 被租户 Proxy 拦截，自动添加 tenant_id 条件，提供纵深防御
    await serviceRepository.delete(id);

    console.log('[Services] 删除售后服务成功:', service.serviceNumber);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('[Services] 删除售后服务失败:', error);
    res.status(500).json({
      success: false,
      message: '删除失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取售后服务统计
 * GET /api/v1/services/statistics
 */
router.get('/stats/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const serviceRepository = getServiceRepository();
    const currentUser = (req as any).user;

    const queryBuilder = serviceRepository.createQueryBuilder('service');

    // 数据权限过滤
    const role = currentUser?.role || '';
    const allowAllRoles = ['super_admin', 'superadmin', 'admin', 'service', 'customer_service'];

    if (!allowAllRoles.includes(role)) {
      if (role === 'manager' || role === 'department_manager') {
        if (currentUser?.departmentId) {
          queryBuilder.andWhere('service.departmentId = :departmentId', {
            departmentId: currentUser.departmentId
          });
        }
      } else {
        queryBuilder.andWhere('service.createdById = :userId', {
          userId: currentUser?.userId
        });
      }
    }

    const total = await queryBuilder.getCount();

    const pendingCount = await queryBuilder.clone()
      .andWhere('service.status = :status', { status: 'pending' })
      .getCount();

    const processingCount = await queryBuilder.clone()
      .andWhere('service.status = :status', { status: 'processing' })
      .getCount();

    const resolvedCount = await queryBuilder.clone()
      .andWhere('service.status = :status', { status: 'resolved' })
      .getCount();

    const closedCount = await queryBuilder.clone()
      .andWhere('service.status = :status', { status: 'closed' })
      .getCount();

    res.json({
      success: true,
      data: {
        total,
        pending: pendingCount,
        processing: processingCount,
        resolved: resolvedCount,
        closed: closedCount
      }
    });
  } catch (error) {
    console.error('[Services] 获取统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取售后服务跟进记录
 * GET /api/v1/services/:id/follow-ups
 */
router.get('/:id/follow-ups', authenticateToken, async (req: Request, res: Response) => {
  try {
    const followUpRepository = getFollowUpRepository();
    const { id } = req.params;

    const followUps = await followUpRepository.find({
      where: { serviceId: id },
      order: { followUpTime: 'DESC' }
    });

    const formattedFollowUps = followUps.map(record => ({
      id: record.id,
      serviceId: record.serviceId,
      serviceNumber: record.serviceNumber,
      followUpTime: record.followUpTime?.toISOString().replace('T', ' ').substring(0, 19),
      content: record.content,
      createdBy: record.createdBy,
      createdById: record.createdById,
      createTime: record.createdAt?.toISOString().replace('T', ' ').substring(0, 19)
    }));

    res.json({
      success: true,
      data: formattedFollowUps
    });
  } catch (error) {
    console.error('[Services] 获取跟进记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取跟进记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 添加售后服务跟进记录
 * POST /api/v1/services/:id/follow-ups
 */
router.post('/:id/follow-ups', authenticateToken, async (req: Request, res: Response) => {
  try {
    const followUpRepository = getFollowUpRepository();
    const serviceRepository = getServiceRepository();
    const currentUser = (req as any).user;
    const { id } = req.params;
    const { followUpTime, content } = req.body;

    // 验证售后服务存在
    const service = await serviceRepository.findOne({ where: { id } });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: '售后服务不存在'
      });
    }

    const followUp = followUpRepository.create({
      id: generateId('SFU'),
      serviceId: id,
      serviceNumber: service.serviceNumber,
      followUpTime: new Date(followUpTime),
      content,
      createdBy: currentUser?.username || '系统',
      createdById: currentUser?.userId || null
    });

    const savedFollowUp = await followUpRepository.save(followUp);

    // 记录操作日志
    await logOperation(
      id,
      service.serviceNumber,
      'follow_up',
      `添加跟进记录: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      currentUser?.userId,
      currentUser?.username
    );

    res.status(201).json({
      success: true,
      message: '添加跟进记录成功',
      data: {
        id: savedFollowUp.id,
        followUpTime: savedFollowUp.followUpTime?.toISOString().replace('T', ' ').substring(0, 19),
        content: savedFollowUp.content,
        createdBy: savedFollowUp.createdBy,
        createTime: savedFollowUp.createdAt?.toISOString().replace('T', ' ').substring(0, 19)
      }
    });
  } catch (error) {
    console.error('[Services] 添加跟进记录失败:', error);
    res.status(500).json({
      success: false,
      message: '添加跟进记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 获取售后服务操作记录
 * GET /api/v1/services/:id/operation-logs
 */
router.get('/:id/operation-logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const logRepository = getOperationLogRepository();
    const { id } = req.params;

    const logs = await logRepository.find({
      where: { serviceId: id },
      order: { createdAt: 'DESC' }
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      serviceId: log.serviceId,
      serviceNumber: log.serviceNumber,
      operationType: log.operationType,
      operationContent: log.operationContent,
      oldValue: log.oldValue,
      newValue: log.newValue,
      operatorId: log.operatorId,
      operatorName: log.operatorName,
      remark: log.remark,
      createTime: log.createdAt?.toISOString().replace('T', ' ').substring(0, 19)
    }));

    res.json({
      success: true,
      data: formattedLogs
    });
  } catch (error) {
    console.error('[Services] 获取操作记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作记录失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
