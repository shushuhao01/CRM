/**
 * 订单模块 - CRUD及审批相关路由
 * 包含：订单列表、详情、创建、更新、删除、提交审核、审核通过/拒绝、取消审核
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { Order } from '../../entities/Order';
import { Product } from '../../entities/Product';
import { Customer } from '../../entities/Customer';
import { CodCancelApplication } from '../../entities/CodCancelApplication';
import { getTenantRepo } from '../../utils/tenantRepo';
import { orderNotificationService } from '../../services/OrderNotificationService';
import {
  saveStatusHistory,
  formatToBeijingTime,
  checkDepartmentOrderLimit,
  getOrderTransferConfig,
  getStatusTitle,
  getActionTypeTitle,
  getAfterSalesTitle
} from './orderHelpers';
import { log } from '../../config/logger';

/** 从请求中提取操作人完整信息（姓名+部门）*/
function getOperatorInfo(req: Request) {
  const currentUser = (req as any).currentUser || (req as any).user;
  const operatorId = currentUser?.id || null;
  const realName = currentUser?.realName || currentUser?.name || currentUser?.username || '系统';
  const departmentName = currentUser?.departmentName || currentUser?.department || '';
  // 格式化为"某部门-某人"
  const operatorName = departmentName ? `${departmentName}-${realName}` : realName;
  return { operatorId, operatorName, departmentName, realName, currentUser };
}

export function registerCrudRoutes(router: Router): void {router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);

    const {
      page = 1,
      pageSize = 20,
      status,
      statusList,
      orderNumber,
      customerName,
      keyword,  // 综合搜索关键词
      startDate,
      endDate,
      markType,
      salesPersonId,
      departmentId,
      minAmount,
      maxAmount,
      productName,
      customerPhone,
      paymentMethod,
      customerId
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    // 🔥 获取当前用户信息，用于数据权限过滤
    // 优先使用 req.currentUser（完整用户对象），其次使用 req.user（JWT payload）
    const jwtUser = (req as any).user;
    const dbUser = (req as any).currentUser;

    const userRole = dbUser?.role || jwtUser?.role || '';
    const userId = dbUser?.id || jwtUser?.userId || '';
    const userDepartmentId = dbUser?.departmentId || jwtUser?.departmentId || '';

    log.info(`📋 [订单列表] 用户: ${dbUser?.username || jwtUser?.username}, 角色: ${userRole}, 部门ID: ${userDepartmentId}, 用户ID: ${userId}`);

    // 使用QueryBuilder构建查询，支持更复杂的条件
    const queryBuilder = orderRepository.createQueryBuilder('order');

    // 🔥 数据权限过滤
    // 超级管理员、管理员、客服可以看所有订单
    const allowAllRoles = ['super_admin', 'admin', 'customer_service', 'service'];
    // 🔥 经理角色（可以看本部门订单）
    const managerRoles = ['department_manager', 'manager'];
    // 🔥 销售员角色（只能看自己的订单）
    const salesRoles = ['sales_staff', 'sales', 'salesperson'];

    if (!allowAllRoles.includes(userRole)) {
      if (managerRoles.includes(userRole)) {
        // 部门经理可以看本部门所有成员的订单，也包括自己的订单
        if (userDepartmentId) {
          // 🔥 修复：同时匹配部门ID或创建人ID（确保能看到自己的订单）
          queryBuilder.andWhere('(order.createdByDepartmentId = :departmentId OR order.createdBy = :userId)', {
            departmentId: userDepartmentId,
            userId
          });
          log.info(`📋 [订单列表] 经理过滤: 部门ID = ${userDepartmentId} 或 创建人ID = ${userId}`);
        } else {
          // 如果没有部门ID，只能看自己的订单
          queryBuilder.andWhere('order.createdBy = :userId', { userId });
          log.info(`📋 [订单列表] 经理无部门ID，只看自己的订单: userId = ${userId}`);
        }
      } else if (salesRoles.includes(userRole)) {
        // 🔥 销售员只能看自己的订单（仅限订单列表页面）
        queryBuilder.andWhere('order.createdBy = :userId', { userId });
        log.info(`📋 [订单列表] 销售员过滤: 只看自己的订单 userId = ${userId}`);
      } else {
        // 🔥 其他角色：只能看自己的订单
        queryBuilder.andWhere('order.createdBy = :userId', { userId });
        log.info(`📋 [订单列表] 其他角色过滤: 只看自己的订单 userId = ${userId}`);
      }
    } else {
      log.info(`📋 [订单列表] ${userRole}角色，查看所有订单`);
    }

    // 🔥 综合关键词搜索（商品名称模糊搜索，其他字段精准搜索，客户编码和其他手机号通过子查询关联customers表）
    if (keyword) {
      queryBuilder.andWhere(
        '(order.orderNumber = :exactKeyword OR order.customerName = :exactKeyword OR order.customerPhone = :exactKeyword OR order.customerId = :exactKeyword OR order.trackingNumber = :exactKeyword OR order.products LIKE :fuzzyKeyword OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND (c.customer_code LIKE :fuzzyKeyword OR c.phone = :exactKeyword OR JSON_CONTAINS(c.other_phones, JSON_QUOTE(:exactKeyword)))))',
        { exactKeyword: keyword, fuzzyKeyword: `%${keyword}%` }
      );
      log.info(`📋 [订单列表] 综合关键词搜索: "${keyword}" (商品模糊，其他精准，支持客户编码和其他手机号)`);
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // 订单号筛选
    if (orderNumber) {
      queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    }

    // 客户名称筛选
    if (customerName) {
      queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
    }

    // 日期范围筛选- 🔥 修复：数据库已配置为北京时区，直接使用北京时间查询
    if (startDate && endDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    // 🔥 标记类型筛选
    if (markType) {
      queryBuilder.andWhere('order.markType = :markType', { markType });
    }

    // 🔥 订单商品类型筛选（虚拟商品功能）
    const { orderProductType: filterOrderProductType } = req.query;
    if (filterOrderProductType) {
      queryBuilder.andWhere('order.orderProductType = :orderProductType', { orderProductType: filterOrderProductType });
    }

    // 🔥 部门筛选
    if (departmentId) {
      queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    }

    // 🔥 销售人员筛选
    if (salesPersonId) {
      queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    }

    // 🔥 高级筛选：订单状态（多选，逗号分隔）
    if (statusList) {
      const statusArray = (statusList as string).split(',').filter(s => s.trim());
      if (statusArray.length > 0) {
        queryBuilder.andWhere('order.status IN (:...statusArray)', { statusArray });
      }
    }

    // 🔥 高级筛选：金额范围
    if (minAmount) {
      queryBuilder.andWhere('order.totalAmount >= :minAmount', { minAmount: Number(minAmount) });
    }
    if (maxAmount) {
      queryBuilder.andWhere('order.totalAmount <= :maxAmount', { maxAmount: Number(maxAmount) });
    }

    // 🔥 高级筛选：商品名称（模糊搜索，搜索JSON字段中的商品名称）
    if (productName) {
      queryBuilder.andWhere('order.products LIKE :productName', { productName: `%${productName}%` });
    }

    // 🔥 高级筛选：客户电话（同时搜索客户其他手机号）
    if (customerPhone) {
      queryBuilder.andWhere('(order.customerPhone LIKE :customerPhone OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND CAST(c.other_phones AS CHAR) LIKE :customerPhone))', { customerPhone: `%${customerPhone}%` });
    }

    // 🔥 高级筛选：支付方式
    if (paymentMethod) {
      queryBuilder.andWhere('order.paymentMethod = :paymentMethod', { paymentMethod });
    }

    // 🔥 客户ID精确筛选（客户详情页消费趋势等场景使用）
    if (customerId) {
      queryBuilder.andWhere('order.customerId = :customerId', { customerId });
      log.info(`📋 [订单列表] 按客户ID筛选: ${customerId}`);
    }

    // 排序和分页
    queryBuilder.orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(pageSizeNum);

    const [orders, total] = await queryBuilder.getManyAndCount();

    log.info(`📋 [订单列表] 查询到 ${orders.length} 条订单, 总数: ${total}`);

    // 🔥 获取客户信息（年龄、身高、体重、病史）
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
    const customerRepository = getTenantRepo(Customer);
    const customers = customerIds.length > 0
      ? await customerRepository.findByIds(customerIds)
      : [];
    const customerMap = new Map(customers.map(c => [c.id, c]));

    // 转换数据格式以匹配前端期望
    const list = orders.map(order => {
      // 解析products JSON字段
      let products: unknown[] = [];
      if (order.products) {
        try {
          products = typeof order.products === 'string' ? JSON.parse(order.products as string) : order.products;
        } catch {
          products = [];
        }
      }

      // 🔥 获取客户信息
      const customer = order.customerId ? customerMap.get(order.customerId) : null;

      // 🔥 计算总数量
      const totalQuantity = (products as any[]).reduce((sum: number, p: any) => sum + (p.quantity || 0), 0);

      // 根据订单状态推断auditStatus
      // 🔥 修复：正确映射auditStatus
      let auditStatus = 'pending';
      if (['pending_shipment', 'shipped', 'delivered', 'paid', 'completed'].includes(order.status)) {
        auditStatus = 'approved';
      } else if (order.status === 'audit_rejected') {
        auditStatus = 'rejected';
      } else if (order.status === 'pending_audit' || order.status === 'pending_transfer') {
        auditStatus = 'pending';
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        // 🔥 新增：客户详细信息（从客户表获取）
        customerGender: customer?.gender || null,
        customerAge: customer?.age || null,
        customerHeight: customer?.height || null,
        customerWeight: customer?.weight || null,
        medicalHistory: customer?.medicalHistory || null,
        products: products,
        totalQuantity,  // 🔥 新增：总数量
        totalAmount: Number(order.totalAmount) || 0,
        depositAmount: Number(order.depositAmount) || 0,
        // 🔥 代收金额 = 订单总额 - 定金
        collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
        // 🔥 代收相关字段
        codAmount: order.codAmount !== undefined && order.codAmount !== null ? Number(order.codAmount) : ((Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0)),
        codStatus: order.codStatus || 'pending',
        receiverName: order.shippingName || '',
        receiverPhone: order.shippingPhone || '',
        receiverAddress: order.shippingAddress || '',
        remark: order.remark || '',
        status: order.status || 'pending_transfer',
        auditStatus: auditStatus,
        markType: order.markType || 'normal',
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: order.paymentMethod || '',
        paymentMethodOther: order.paymentMethodOther || '',
        expressCompany: order.expressCompany || '',
        trackingNumber: order.trackingNumber || '',
        serviceWechat: order.serviceWechat || '',
        orderSource: order.orderSource || '',
        depositScreenshots: order.depositScreenshots || [],
        // 🔥 新版自定义字段：优先从独立字段读取，其次从JSON字段读取
        customFields: {
          custom_field1: order.customField1 || (order.customFields as any)?.custom_field1 || '',
          custom_field2: order.customField2 || (order.customFields as any)?.custom_field2 || '',
          custom_field3: order.customField3 || (order.customFields as any)?.custom_field3 || '',
          custom_field4: order.customField4 || (order.customFields as any)?.custom_field4 || '',
          custom_field5: order.customField5 || (order.customFields as any)?.custom_field5 || '',
          custom_field6: order.customField6 || (order.customFields as any)?.custom_field6 || '',
          custom_field7: order.customField7 || (order.customFields as any)?.custom_field7 || ''
        },
        customField1: order.customField1 || (order.customFields as any)?.custom_field1 || '',
        customField2: order.customField2 || (order.customFields as any)?.custom_field2 || '',
        customField3: order.customField3 || (order.customFields as any)?.custom_field3 || '',
        customField4: order.customField4 || (order.customFields as any)?.custom_field4 || '',
        customField5: order.customField5 || (order.customFields as any)?.custom_field5 || '',
        customField6: order.customField6 || (order.customFields as any)?.custom_field6 || '',
        customField7: order.customField7 || (order.customFields as any)?.custom_field7 || '',
        createTime: formatToBeijingTime(order.createdAt),
        createdBy: order.createdBy || '',
        createdByName: order.createdByName || '',
        salesPersonId: order.createdBy || '',
        // 🔥 添加operatorId和operator字段，用于前端权限判断
        operatorId: order.createdBy || '',
        operator: order.createdByName || ''
      };
    });

    res.json({
      success: true,
      code: 200,
      message: '获取订单列表成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    log.error('❌ [订单列表] 获取失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取订单列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 🔥 以下路由必须在 /:id 之前定义，否则会被 /:id 拦截
 */

/**
 * @route GET /api/v1/orders/:id/status-history
 * @desc 获取订单状态历史
 * @access Private
 */
router.get('/:id/status-history', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;

    // 🔥 先检查表是否存在，避免报错
    try {
      const { OrderStatusHistory } = await import('../../entities/OrderStatusHistory');
      const statusHistoryRepository = getTenantRepo(OrderStatusHistory);

      const history = await statusHistoryRepository.find({
        where: { orderId },
        order: { createdAt: 'DESC' }
      });

      const list = history.map(item => ({
        id: item.id,
        orderId: item.orderId,
        status: item.status,
        title: getActionTypeTitle(item.actionType, item.status),
        description: item.notes || `订单状态变更为「${getStatusTitle(item.status)}`,
        operator: item.operatorName || '系统',
        operatorDepartment: item.operatorDepartment || '',
        operatorId: item.operatorId,
        actionType: item.actionType || 'status_change',
        changeDetail: item.changeDetail || '',
        timestamp: item.createdAt?.toISOString() || ''
      }));

      log.info(`[订单状态历史] 订单 ${orderId} 有 ${list.length} 条状态记录`);
      res.json({ success: true, code: 200, data: list });
    } catch (entityError) {
      // 如果表不存在，返回空数组
      log.warn(`[订单状态历史] 表可能不存在，返回空数组:`, entityError);
      res.json({ success: true, code: 200, data: [] });
    }
  } catch (error) {
    log.error('获取订单状态历史失败', error);
    res.status(500).json({ success: false, code: 500, message: '获取订单状态历史失败' });
  }
});

/**
 * @route GET /api/v1/orders/:id/operation-logs
 * @desc 获取订单操作记录
 * @access Private
 */
router.get('/:id/operation-logs', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { OperationLog } = await import('../../entities/OperationLog');
    const logRepository = getTenantRepo(OperationLog);

    const logs = await logRepository.find({
      where: { resourceId: orderId, resourceType: 'order' },
      order: { createdAt: 'DESC' }
    });

    const list = logs.map(log => ({
      id: log.id,
      time: log.createdAt?.toISOString() || '',
      operator: log.username || log.userId || '系统',
      action: log.action || '',
      description: log.description || '',
      remark: ''
    }));

    log.info(`[订单操作记录] 订单 ${orderId} 有 ${list.length} 条操作记录`);
    res.json({ success: true, code: 200, data: list });
  } catch (error) {
    log.error('获取订单操作记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取订单操作记录失败' });
  }
});

/**
 * @route GET /api/v1/orders/:id/after-sales
 * @desc 获取订单售后历史
 * @access Private
 */
router.get('/:id/after-sales', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { AfterSalesService } = await import('../../entities/AfterSalesService');
    const serviceRepository = getTenantRepo(AfterSalesService);

    const services = await serviceRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' }
    });

    const list = services.map(service => ({
      id: service.id,
      serviceNumber: service.serviceNumber,
      type: service.serviceType,
      title: getAfterSalesTitle(service.serviceType, service.status),
      description: service.description || service.reason || '',
      status: service.status,
      operator: service.createdBy || '系统',
      amount: Number(service.price) || 0,
      timestamp: service.createdAt?.toISOString() || ''
    }));

    log.info(`[订单售后历史] 订单 ${orderId} 有 ${list.length} 条售后记录`);
    res.json({ success: true, code: 200, data: list });
  } catch (error) {
    log.error('获取订单售后历史失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取订单售后历史失败' });
  }
});

/**
 * @route PUT /api/v1/orders/:id/mark-type
 * @desc 更新订单标记类型
 * @access Private
 */
router.put('/:id/mark-type', async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const { markType } = req.body;
    const orderId = req.params.id;

    log.info(`📝 [订单标记] 更新订单 ${orderId} 标记类型为 ${markType}`);

    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    order.markType = markType;
    await orderRepository.save(order);

    log.info(`✅ [订单标记] 订单 ${orderId} 标记更新成功`);

    res.json({
      success: true,
      code: 200,
      message: '订单标记更新成功',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        markType: order.markType
      }
    });
  } catch (error) {
    log.error('❌ [订单标记] 更新失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '更新订单标记失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/:id
 * @desc 获取订单详情
 * @access Private
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const order = await orderRepository.findOne({
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    // 解析products JSON字段
    let products: unknown[] = [];
    if (order.products) {
      try {
        products = typeof order.products === 'string' ? JSON.parse(order.products as string) : order.products;
      } catch {
        products = [];
      }
    }

    // 根据订单状态推断auditStatus
    // 🔥 修复：正确映射auditStatus
    let auditStatus = 'pending';
    if (['pending_shipment', 'shipped', 'delivered', 'paid', 'completed'].includes(order.status)) {
      auditStatus = 'approved';
    } else if (order.status === 'audit_rejected') {
      auditStatus = 'rejected';
    } else if (order.status === 'pending_audit' || order.status === 'pending_transfer') {
      auditStatus = 'pending';
    }

    // 计算流转时间（创建时间 + 配置的延迟分钟数）
    let auditTransferTime = '';
    let isAuditTransferred = false;
    if (order.createdAt && order.status === 'pending_transfer') {
      // 获取流转配置
      const transferConfig = await getOrderTransferConfig();
      const delayMs = transferConfig.delayMinutes * 60 * 1000;
      const transferDate = new Date(order.createdAt.getTime() + delayMs);
      auditTransferTime = transferDate.toISOString();
      isAuditTransferred = false;
    } else if (order.status === 'pending_audit' || order.status === 'pending_shipment' || order.status === 'shipped') {
      isAuditTransferred = true;
    }

    // 检查是否有待审核的取消代收申请
    const codApplicationRepo = getTenantRepo(CodCancelApplication);
    const pendingApplicationCount = await codApplicationRepo.count({
      where: { orderId: order.id, status: 'pending' }
    });
    const hasPendingCodApplication = pendingApplicationCount > 0;

    const data = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      products: products,
      totalAmount: Number(order.totalAmount) || 0,
      depositAmount: Number(order.depositAmount) || 0,
      // 🔥 代收金额 = 订单总额 - 定金
      collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
      // 🔥 代收相关字段
      codAmount: order.codAmount !== undefined && order.codAmount !== null ? Number(order.codAmount) : ((Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0)),
      codStatus: order.codStatus || 'pending',
      hasPendingCodApplication: hasPendingCodApplication,
      receiverName: order.shippingName || '',
      receiverPhone: order.shippingPhone || '',
      receiverAddress: order.shippingAddress || '',
      remark: order.remark || '',
      status: order.status || 'pending_transfer',
      auditStatus: auditStatus,
      markType: order.markType || 'normal',
      isAuditTransferred: isAuditTransferred,
      auditTransferTime: auditTransferTime,
      paymentStatus: order.paymentStatus || 'unpaid',
      paymentMethod: order.paymentMethod || '',
      paymentMethodOther: order.paymentMethodOther || '',
      expressCompany: order.expressCompany || '',
      trackingNumber: order.trackingNumber || '',
      // 🔥 新增：物流相关字段
      shippedAt: order.shippedAt ? formatToBeijingTime(order.shippedAt) : '',
      shippingTime: order.shippingTime || (order.shippedAt ? formatToBeijingTime(order.shippedAt) : ''),
      expectedDeliveryDate: order.expectedDeliveryDate || '',
      logisticsStatus: order.logisticsStatus || '',
      latestLogisticsInfo: order.latestLogisticsInfo || '',
      deliveredAt: order.deliveredAt ? formatToBeijingTime(order.deliveredAt) : '',
      isTodo: order.isTodo || false,
      todoDate: order.todoDate || '',
      todoRemark: order.todoRemark || '',
      serviceWechat: order.serviceWechat || '',
      orderSource: order.orderSource || '',
      depositScreenshots: order.depositScreenshots || [],
      // 🔥 新版自定义字段
      // 🔥 新版自定义字段：优先从独立字段读取，其次从JSON字段读取
      customFields: {
        custom_field1: order.customField1 || (order.customFields as any)?.custom_field1 || '',
        custom_field2: order.customField2 || (order.customFields as any)?.custom_field2 || '',
        custom_field3: order.customField3 || (order.customFields as any)?.custom_field3 || '',
        custom_field4: order.customField4 || (order.customFields as any)?.custom_field4 || '',
        custom_field5: order.customField5 || (order.customFields as any)?.custom_field5 || '',
        custom_field6: order.customField6 || (order.customFields as any)?.custom_field6 || '',
        custom_field7: order.customField7 || (order.customFields as any)?.custom_field7 || ''
      },
      customField1: order.customField1 || (order.customFields as any)?.custom_field1 || '',
      customField2: order.customField2 || (order.customFields as any)?.custom_field2 || '',
      customField3: order.customField3 || (order.customFields as any)?.custom_field3 || '',
      customField4: order.customField4 || (order.customFields as any)?.custom_field4 || '',
      customField5: order.customField5 || (order.customFields as any)?.custom_field5 || '',
      customField6: order.customField6 || (order.customFields as any)?.custom_field6 || '',
      customField7: order.customField7 || (order.customFields as any)?.custom_field7 || '',
      createTime: formatToBeijingTime(order.createdAt),
      createdBy: order.createdBy || '',
      createdByName: order.createdByName || '',
      salesPersonId: order.createdBy || '',
      operatorId: order.createdBy || '',
      operator: order.createdByName || ''
    };

    res.json({
      success: true,
      code: 200,
      message: '获取订单详情成功',
      data
    });
  } catch (error) {
    log.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取订单详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders
 * @desc 创建订单
 * @access Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    log.info('📝 [订单创建] 收到请求数据:', JSON.stringify(req.body, null, 2));

    const orderRepository = getTenantRepo(Order);

    const {
      customerId,
      customerName,
      customerPhone,
      products,
      totalAmount,
      discount,
      collectAmount,
      depositAmount,
      depositScreenshots,
      depositScreenshot,
      receiverName,
      receiverPhone,
      receiverAddress,
      remark,
      paymentMethod,
      paymentMethodOther,
      salesPersonId,
      salesPersonName,
      orderNumber,
      serviceWechat,
      orderSource,
      markType,
      expressCompany,
      customFields,
      source
    } = req.body;

    // 🔥 调试：打印接收到的customFields
    log.info('📋 [订单创建] 接收到的customFields:', JSON.stringify(customFields, null, 2));

    // 数据验证
    if (!customerId) {
      log.error('❌ [订单创建] 缺少客户ID');
      return res.status(400).json({
        success: false,
        code: 400,
        message: '缺少客户ID'
      });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      log.error('❌ [订单创建] 缺少商品信息信息');
      return res.status(400).json({
        success: false,
        code: 400,
        message: '缺少商品信息'
      });
    }

    // 生成订单号
    const generatedOrderNumber = orderNumber || `ORD${Date.now()}`;

    // 计算金额
    const finalTotalAmount = Number(totalAmount) || 0;
    const finalDepositAmount = Number(depositAmount) || 0;
    const finalAmount = finalTotalAmount - (Number(discount) || 0);

    // 处理定金截图
    let finalDepositScreenshots: string[] = [];
    if (depositScreenshots && Array.isArray(depositScreenshots)) {
      finalDepositScreenshots = depositScreenshots;
    } else if (depositScreenshot) {
      finalDepositScreenshots = [depositScreenshot];
    }

    // 获取当前用户信息
    const currentUser = (req as any).currentUser;
    const finalCreatedBy = salesPersonId || currentUser?.id || 'admin';
    // 🔥 优先使用传入的销售人员姓名，其次使用当前用户的name字段，再次使用realName，最后使用用户名
    const finalCreatedByName = salesPersonName || currentUser?.name || currentUser?.realName || currentUser?.username || '';
    // 获取创建人部门信息
    const createdByDepartmentId = currentUser?.departmentId || '';
    const createdByDepartmentName = currentUser?.departmentName || '';

    // 验证部门下单限制（仅对正常发货单进行验证）
    if (markType !== 'reserved' && markType !== 'return' && createdByDepartmentId) {
      const limitCheck = await checkDepartmentOrderLimit(
        createdByDepartmentId,
        String(customerId),
        finalTotalAmount
      );

      if (!limitCheck.allowed) {
        log.warn(`⚠️ [订单创建] 部门下单限制: ${limitCheck.message}`);
        return res.status(400).json({
          success: false,
          code: 400,
          message: limitCheck.message,
          limitType: limitCheck.limitType
        });
      }
    }

    log.info('📝 [订单创建] 准备创建订单:', {
      orderNumber: generatedOrderNumber,
      customerId,
      totalAmount: finalTotalAmount,
      depositAmount: finalDepositAmount
    });

    // 🔥 自动计算订单商品类型
    const hasPhysical = products.some((p: any) => (p.productType || 'physical') === 'physical');
    const hasVirtual = products.some((p: any) => p.productType === 'virtual');
    let orderProductType = 'physical';
    if (hasPhysical && hasVirtual) orderProductType = 'mixed';
    else if (hasVirtual) orderProductType = 'virtual';

    // 创建订单
    const order = orderRepository.create({
      orderNumber: generatedOrderNumber,
      customerId: String(customerId),
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      serviceWechat: serviceWechat || '',
      orderSource: orderSource || '',
      products: products,
      status: 'pending_transfer',
      totalAmount: finalTotalAmount,
      discountAmount: Number(discount) || 0,
      finalAmount: finalAmount,
      depositAmount: finalDepositAmount,
      depositScreenshots: finalDepositScreenshots.length > 0 ? finalDepositScreenshots : undefined,
      paymentStatus: finalDepositAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod: paymentMethod || undefined,
      paymentMethodOther: paymentMethodOther || undefined,
      shippingName: receiverName || customerName || '',
      shippingPhone: receiverPhone || customerPhone || '',
      shippingAddress: receiverAddress || '',
      expressCompany: expressCompany || '',
      markType: markType || 'normal',
      orderProductType: orderProductType,
      remark: remark || '',
      // 🔥 代收相关字段初始化
      codAmount: finalTotalAmount - finalDepositAmount, // 初始代收金额 = 总额 - 定金
      codStatus: 'pending', // 初始状态为待处理
      // 🔥 新版自定义字段：7个独立字段
      customField1: customFields?.custom_field1 || undefined,
      customField2: customFields?.custom_field2 || undefined,
      customField3: customFields?.custom_field3 || undefined,
      customField4: customFields?.custom_field4 || undefined,
      customField5: customFields?.custom_field5 || undefined,
      customField6: customFields?.custom_field6 || undefined,
      customField7: customFields?.custom_field7 || undefined,
      // 保留旧版JSON字段用于兼容
      customFields: customFields || undefined,
      createdBy: finalCreatedBy,
      createdByName: finalCreatedByName,
      createdByDepartmentId: createdByDepartmentId || undefined,
      createdByDepartmentName: createdByDepartmentName || undefined
    });

    const savedOrder = await orderRepository.save(order);
    log.info('✅ [订单创建] 订单保存成功:', savedOrder.id);

    // 更新产品库存
    try {
      const productRepository = getTenantRepo(Product);
      for (const item of products) {
        const productId = item.id || item.productId;
        const quantity = Number(item.quantity) || 1;

        if (productId) {
          const product = await productRepository.findOne({ where: { id: productId } });
          if (product && product.stock >= quantity) {
            product.stock = product.stock - quantity;
            await productRepository.save(product);
            log.info(`📦 [库存更新] 产品 ${product.name} 库存减少 ${quantity}，剩余 ${product.stock}`);
          } else if (product) {
            log.warn(`⚠️ [库存更新] 产品 ${product.name} 库存不足，当前 ${product.stock}，需要 ${quantity}`);
          }
        }
      }
    } catch (stockError) {
      log.error('⚠️ [库存更新] 更新库存失败，但订单已创建', stockError);
    }

    // 🔥 虚拟商品预占卡密/资源
    try {
      const { getDataSource } = await import('../../config/database');
      const ds = getDataSource();
      const tenantId = (req as any).user?.tenantId || null;

      for (const item of products) {
        const productId = item.id || item.productId;
        if (item.productType === 'virtual' && item.virtualDeliveryType === 'card_key' && productId) {
          const [available] = await ds.query(
            `SELECT id FROM card_key_inventory WHERE product_id = ? AND status = 'unused' AND tenant_id = ? LIMIT 1`,
            [productId, tenantId]
          );
          if (available) {
            await ds.query(
              `UPDATE card_key_inventory SET status = 'reserved', reserved_order_id = ?, updated_at = NOW() WHERE id = ?`,
              [savedOrder.id, available.id]
            );
            log.info(`🔑 [虚拟库存] 卡密 ${available.id} 已预占给订单 ${savedOrder.id}`);
          } else {
            log.warn(`⚠️ [虚拟库存] 商品 ${productId} 无可用卡密`);
          }
        } else if (item.productType === 'virtual' && item.virtualDeliveryType === 'resource_link' && productId) {
          const [available] = await ds.query(
            `SELECT id FROM resource_inventory WHERE product_id = ? AND status = 'unused' AND tenant_id = ? LIMIT 1`,
            [productId, tenantId]
          );
          if (available) {
            await ds.query(
              `UPDATE resource_inventory SET status = 'reserved', reserved_order_id = ?, updated_at = NOW() WHERE id = ?`,
              [savedOrder.id, available.id]
            );
            log.info(`☁️ [虚拟库存] 资源 ${available.id} 已预占给订单 ${savedOrder.id}`);
          } else {
            log.warn(`⚠️ [虚拟库存] 商品 ${productId} 无可用资源`);
          }
        }
      }
    } catch (virtualStockError) {
      log.error('⚠️ [虚拟库存] 预占失败，但订单已创建', virtualStockError);
    }

    // 返回完整的订单数据
    const responseData = {
      id: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      customerId: savedOrder.customerId,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      products: products,
      totalAmount: finalTotalAmount,
      depositAmount: finalDepositAmount,
      collectAmount: Number(collectAmount) || finalTotalAmount - finalDepositAmount,
      receiverName: receiverName || customerName || '',
      receiverPhone: receiverPhone || customerPhone || '',
      receiverAddress: receiverAddress || '',
      remark: remark || '',
      status: 'pending_transfer',
      auditStatus: 'pending',
      markType: markType || 'normal',
      orderProductType: orderProductType,
      createTime: formatToBeijingTime(savedOrder.createdAt) || formatToBeijingTime(new Date()),
      createdBy: finalCreatedBy,
      createdByName: finalCreatedByName,
      salesPersonId: finalCreatedBy,
      operatorId: finalCreatedBy,
      operator: finalCreatedByName
    };

    log.info('✅ [订单创建] 返回数据:', responseData);

    // 🔥 保存订单创建的状态历史记录
    const creatorDept = currentUser?.departmentName || currentUser?.department || '';
    const creatorFullName = creatorDept ? `${creatorDept}-${finalCreatedByName}` : finalCreatedByName;
    const sourceLabel = source === 'wecom_sidebar' ? '（企微侧边栏快捷下单）' : '（CRM系统下单）';
    await saveStatusHistory(
      savedOrder.id,
      savedOrder.status,
      finalCreatedBy,
      creatorFullName,
      `订单创建成功，订单号为 ${savedOrder.orderNumber}${sourceLabel}`,
      { operatorDepartment: creatorDept, actionType: 'create' }
    );

    // 🔥 发送订单创建成功通知给下单员
    orderNotificationService.notifyOrderCreated({
      id: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      customerName: customerName || '',
      totalAmount: finalTotalAmount,
      createdBy: finalCreatedBy,
      createdByName: finalCreatedByName
    }).catch(err => log.error('[订单创建] 发送通知失败:', err));

    res.status(201).json({
      success: true,
      code: 200,
      message: '订单创建成功',
      data: responseData
    });
  } catch (error) {
    const err = error as any;
    log.error('❌ [订单创建] 失败:', {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
      sqlMessage: err?.sqlMessage
    });
    res.status(500).json({
      success: false,
      code: 500,
      message: err?.sqlMessage || err?.message || '创建订单失败',
      error: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
});


// 🔥 订单状态流转规则：定义合法的状态变更路径
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'pending_transfer': ['pending_audit'],                                    // 待流转 → 待审核
  'pending_audit': ['pending_shipment', 'audit_rejected', 'virtual_pending', 'completed'], // 待审核 → 待发货/审核拒绝/虚拟待发货/直接完成
  'audit_rejected': ['pending_audit', 'cancelled'],                         // 审核拒绝 → 重新提审/取消
  'pending_shipment': ['shipped', 'logistics_returned', 'logistics_cancelled', 'cancelled'], // 待发货 → 已发货/退回/取消
  'virtual_pending': ['signed', 'completed', 'cancelled'],                  // 虚拟待发货 → 已签收/已完成/取消
  'shipped': ['delivered', 'rejected', 'package_exception', 'logistics_returned'], // 已发货 → 已签收/拒收/异常/退回
  'delivered': ['after_sales_created'],                                     // 已签收 → 已建售后（终态，一般不变）
  'signed': ['after_sales_created'],                                        // 已签收（虚拟订单专用终态）
  'rejected': ['rejected_returned'],                                        // 拒收 → 拒收已退回
  'rejected_returned': [],                                                  // 拒收已退回（终态）
  'logistics_returned': ['pending_shipment', 'cancelled'],                  // 物流退回 → 重新发货/取消
  'logistics_cancelled': ['cancelled'],                                     // 物流取消 → 已取消
  'package_exception': ['shipped', 'rejected', 'cancelled'],                // 包裹异常 → 重新发货/拒收/取消
  'after_sales_created': [],                                                // 已建售后（终态）
  'completed': [],                                                          // 已完成（终态）
  'cancelled': []                                                           // 已取消（终态）
};

// 🔥 校验状态变更是否合法
const isValidStatusTransition = (currentStatus: string, targetStatus: string): boolean => {
  // 如果状态相同，允许（可能只是更新其他字段）
  if (currentStatus === targetStatus) return true;

  const allowedTargets = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTargets) {
    log.warn(`[状态校验] 未知的当前状态: ${currentStatus}`);
    return true; // 未知状态，允许更新（兼容旧数据）
  }

  return allowedTargets.includes(targetStatus);
};

// 🔥 获取状态中文名称
const getStatusName = (status: string): string => {
  const statusNames: Record<string, string> = {
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'logistics_returned': '物流部退回',
    'logistics_cancelled': '物流部取消',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收已退回',
    'after_sales_created': '已建售后',
    'virtual_pending': '虚拟待发货',
    'signed': '已签收',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusNames[status] || status;
};

/**
 * @route PUT /api/v1/orders/:id
 * @desc 更新订单
 * @access Private
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const order = await orderRepository.findOne({
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    const updateData = req.body;
    const previousStatus = order.status;

    // 🔥 状态校验：检查状态变更是否合法
    if (updateData.status !== undefined && updateData.status !== order.status) {
      const currentStatus = order.status;
      const targetStatus = updateData.status;

      if (!isValidStatusTransition(currentStatus, targetStatus)) {
        log.error(`[状态校验] ❌ 非法状态变更: ${currentStatus} → ${targetStatus}`);
        return res.status(400).json({
          success: false,
          code: 400,
          message: `订单状态变更不合法：不能从"${getStatusName(currentStatus)}"变更为"${getStatusName(targetStatus)}"`,
          currentStatus,
          targetStatus
        });
      }

      log.info(`[状态校验] ✅ 合法状态变更: ${currentStatus} → ${targetStatus}`);
    }

    // 更新订单字段
    if (updateData.status !== undefined) order.status = updateData.status;
    if (updateData.receiverName || updateData.shippingName) order.shippingName = updateData.receiverName || updateData.shippingName;
    if (updateData.receiverPhone || updateData.shippingPhone) order.shippingPhone = updateData.receiverPhone || updateData.shippingPhone;
    if (updateData.receiverAddress || updateData.shippingAddress) order.shippingAddress = updateData.receiverAddress || updateData.shippingAddress;
    if (updateData.remark !== undefined) order.remark = updateData.remark;
    if (updateData.paymentStatus !== undefined) order.paymentStatus = updateData.paymentStatus;
    if (updateData.paymentMethod !== undefined) order.paymentMethod = updateData.paymentMethod;
    if (updateData.paymentMethodOther !== undefined) order.paymentMethodOther = updateData.paymentMethodOther;
    if (updateData.expressCompany !== undefined) order.expressCompany = updateData.expressCompany;
    if (updateData.trackingNumber !== undefined) order.trackingNumber = updateData.trackingNumber;
    if (updateData.markType !== undefined) order.markType = updateData.markType;
    // 🔥 修复：添加金额字段的更新，并同步codAmount
    const oldTotalAmount = Number(order.totalAmount) || 0;
    const oldDepositAmount = Number(order.depositAmount) || 0;
    const oldCollectAmount = oldTotalAmount - oldDepositAmount;
    const oldCodAmount = order.codAmount !== undefined && order.codAmount !== null ? Number(order.codAmount) : oldCollectAmount;

    if (updateData.totalAmount !== undefined) order.totalAmount = updateData.totalAmount;
    if (updateData.depositAmount !== undefined) order.depositAmount = updateData.depositAmount;
    if (updateData.discountAmount !== undefined) order.discountAmount = updateData.discountAmount;

    // 🔥 修复Bug2：编辑订单时同步更新codAmount
    // 只有当codAmount之前没有被代收管理修改过（即codAmount等于旧的totalAmount-depositAmount）时才同步
    // 如果codAmount已被代收管理或取消审核修改过，则保留不变
    if (updateData.totalAmount !== undefined || updateData.depositAmount !== undefined) {
      const isCodUnmodified = Math.abs(oldCodAmount - oldCollectAmount) < 0.01;
      if (isCodUnmodified) {
        const newTotalAmount = Number(order.totalAmount) || 0;
        const newDepositAmount = Number(order.depositAmount) || 0;
        order.codAmount = newTotalAmount - newDepositAmount;
        log.info(`[订单编辑] codAmount同步更新: ${oldCodAmount} → ${order.codAmount}`);
      } else {
        log.info(`[订单编辑] codAmount已被代收管理修改过（${oldCodAmount} → ${oldCollectAmount})，保留不变`);
      }
    }

    // 🔥 修复：添加产品列表的更新
    if (updateData.products !== undefined) order.products = updateData.products;
    // 🔥 修复：添加截图字段的更新
    if (updateData.depositScreenshots !== undefined) order.depositScreenshots = updateData.depositScreenshots;
    if (updateData.depositScreenshot !== undefined) {
      // 如果只传了单个截图，也更新到数组）
      if (!updateData.depositScreenshots && updateData.depositScreenshot) {
        order.depositScreenshots = [updateData.depositScreenshot];
      }
    }
    // 🔥 修复：添加客户信息字段的更新
    if (updateData.customerId !== undefined) order.customerId = updateData.customerId;
    if (updateData.customerName !== undefined) order.customerName = updateData.customerName;
    if (updateData.customerPhone !== undefined) order.customerPhone = updateData.customerPhone;
    if (updateData.serviceWechat !== undefined) order.serviceWechat = updateData.serviceWechat;
    if (updateData.orderSource !== undefined) order.orderSource = updateData.orderSource;
    // 🔥 发货时间和预计送达时间
    if (updateData.shippingTime !== undefined) order.shippingTime = updateData.shippingTime;
    if (updateData.shippedAt !== undefined) order.shippedAt = new Date(updateData.shippedAt);
    if (updateData.expectedDeliveryDate !== undefined) order.expectedDeliveryDate = updateData.expectedDeliveryDate;
    if (updateData.estimatedDeliveryTime !== undefined) order.expectedDeliveryDate = updateData.estimatedDeliveryTime;
    // 🔥 物流状态
    if (updateData.logisticsStatus !== undefined) order.logisticsStatus = updateData.logisticsStatus;
    // 🔥 新版自定义字段：从customFields对象中提取到独立字段
    if (updateData.customFields !== undefined) {
      order.customFields = updateData.customFields;
      // 同时更新7个独立字段
      if (updateData.customFields.custom_field1 !== undefined) order.customField1 = updateData.customFields.custom_field1;
      if (updateData.customFields.custom_field2 !== undefined) order.customField2 = updateData.customFields.custom_field2;
      if (updateData.customFields.custom_field3 !== undefined) order.customField3 = updateData.customFields.custom_field3;
      if (updateData.customFields.custom_field4 !== undefined) order.customField4 = updateData.customFields.custom_field4;
      if (updateData.customFields.custom_field5 !== undefined) order.customField5 = updateData.customFields.custom_field5;
      if (updateData.customFields.custom_field6 !== undefined) order.customField6 = updateData.customFields.custom_field6;
      if (updateData.customFields.custom_field7 !== undefined) order.customField7 = updateData.customFields.custom_field7;
    }

    const updatedOrder = await orderRepository.save(order);

    // 🔥 根据状态变更发送相应通知和保存状态历史
    if (updateData.status !== undefined && updateData.status !== previousStatus) {
      // 获取当前操作人信息
      const opInfo = getOperatorInfo(req);
      const currentUser = opInfo.currentUser;

      // 🔥 保存状态历史记录
      await saveStatusHistory(
        order.id,
        updateData.status,
        opInfo.operatorId,
        opInfo.operatorName,
        updateData.remark || `状态从"${getStatusName(previousStatus)}"变更为"${getStatusName(updateData.status)}"`,
        { operatorDepartment: opInfo.departmentName, actionType: 'status_change' }
      );

      const orderInfo = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        totalAmount: Number(order.totalAmount),
        createdBy: order.createdBy,
        createdByName: order.createdByName
      };

      const newStatus = updateData.status;

      // 根据新状态发送不同的通知
      switch (newStatus) {
        case 'shipped':
          orderNotificationService.notifyOrderShipped(orderInfo, order.trackingNumber, order.expressCompany)
            .catch(err => log.error('[订单更新] 发送发货通知失败:', err));
          // 🔥 触发自动发送短信
          try {
            const { SmsAutoSendService } = await import('../../services/SmsAutoSendService');
            const tenantId = (req as any).tenantId || order.tenantId;
            if (tenantId) {
              SmsAutoSendService.triggerEvent(tenantId, 'order_shipped', {
                customer: { name: order.customerName, phone: order.customerPhone, customerNo: order.customerId },
                order: { orderNo: order.orderNumber, totalAmount: order.totalAmount, trackingNo: order.trackingNumber, expressCompany: order.expressCompany, productName: JSON.stringify(order.products) },
                userId: currentUser?.userId,
                departmentId: currentUser?.department
              }).catch((err: any) => log.error('[SMS-AutoSend] 发货触发失败:', err));
            }
          } catch (autoSendErr: any) { log.warn('[SMS-AutoSend] 触发跳过:', autoSendErr.message); }
          break;
        case 'delivered':
          orderNotificationService.notifyOrderDelivered(orderInfo)
            .catch(err => log.error('[订单更新] 发送签收通知失败:', err));
          // 🔥 触发自动发送短信（签收）
          try {
            const { SmsAutoSendService } = await import('../../services/SmsAutoSendService');
            const tenantId = (req as any).tenantId || order.tenantId;
            if (tenantId) {
              SmsAutoSendService.triggerEvent(tenantId, 'order_delivered', {
                customer: { name: order.customerName, phone: order.customerPhone },
                order: { orderNo: order.orderNumber, totalAmount: order.totalAmount },
                userId: currentUser?.userId,
                departmentId: currentUser?.department
              }).catch((err: any) => log.error('[SMS-AutoSend] 签收触发失败:', err));
            }
          } catch (autoSendErr: any) { log.warn('[SMS-AutoSend] 触发跳过:', autoSendErr.message); }
          break;
        case 'confirmed':
          // 🔥 v1.8.1 新增：订单确认触发自动发送短信
          try {
            const { SmsAutoSendService } = await import('../../services/SmsAutoSendService');
            const tenantId = (req as any).tenantId || order.tenantId;
            if (tenantId) {
              SmsAutoSendService.triggerEvent(tenantId, 'order_confirmed', {
                customer: { name: order.customerName, phone: order.customerPhone, customerNo: order.customerId },
                order: { orderNo: order.orderNumber, totalAmount: order.totalAmount, productName: JSON.stringify(order.products) },
                userId: currentUser?.userId,
                departmentId: currentUser?.department
              }).catch((err: any) => log.error('[SMS-AutoSend] 订单确认触发失败:', err));
            }
          } catch (autoSendErr: any) { log.warn('[SMS-AutoSend] 触发跳过:', autoSendErr.message); }
          break;
        case 'paid':
          // 🔥 v1.8.1 新增：订单付款触发自动发送短信
          try {
            const { SmsAutoSendService } = await import('../../services/SmsAutoSendService');
            const tenantId = (req as any).tenantId || order.tenantId;
            if (tenantId) {
              SmsAutoSendService.triggerEvent(tenantId, 'order_paid', {
                customer: { name: order.customerName, phone: order.customerPhone, customerNo: order.customerId },
                order: { orderNo: order.orderNumber, totalAmount: order.totalAmount, productName: JSON.stringify(order.products) },
                userId: currentUser?.userId,
                departmentId: currentUser?.department
              }).catch((err: any) => log.error('[SMS-AutoSend] 订单付款触发失败:', err));
            }
          } catch (autoSendErr: any) { log.warn('[SMS-AutoSend] 触发跳过:', autoSendErr.message); }
          break;
        case 'rejected':
          orderNotificationService.notifyOrderRejected(orderInfo, updateData.remark)
            .catch(err => log.error('[订单更新] 发送拒收通知失败:', err));
          break;
        case 'cancelled':
          orderNotificationService.notifyOrderCancelled(orderInfo, updateData.remark)
            .catch(err => log.error('[订单更新] 发送取消通知失败:', err));
          // 🔥 释放虚拟库存预占
          try {
            const { getDataSource } = await import('../../config/database');
            const ds = getDataSource();
            const tenantId = (req as any).user?.tenantId || null;
            await ds.query(
              `UPDATE card_key_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND status = 'reserved' AND tenant_id = ?`,
              [order.id, tenantId]
            );
            await ds.query(
              `UPDATE resource_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND status = 'reserved' AND tenant_id = ?`,
              [order.id, tenantId]
            );
            log.info(`🔓 [虚拟库存] 订单 ${order.id} 取消，已释放预占`);
          } catch (releaseErr) {
            log.error('[虚拟库存] 释放预占失败:', releaseErr);
          }
          break;
        case 'logistics_returned':
          orderNotificationService.notifyLogisticsReturned(orderInfo, updateData.remark)
            .catch(err => log.error('[订单更新] 发送物流退回通知失败:', err));
          break;
        case 'logistics_cancelled':
          orderNotificationService.notifyLogisticsCancelled(orderInfo, updateData.remark)
            .catch(err => log.error('[订单更新] 发送物流取消通知失败:', err));
          break;
        case 'package_exception':
          orderNotificationService.notifyPackageException(orderInfo, updateData.remark)
            .catch(err => log.error('[订单更新] 发送包裹异常通知失败:', err));
          break;
      }
    } else if (updateData.status === undefined || updateData.status === previousStatus) {
      // 🔥 非状态变更的编辑操作也记录历史
      const editFields: string[] = [];
      if (updateData.receiverName || updateData.shippingName) editFields.push('收件人');
      if (updateData.receiverPhone || updateData.shippingPhone) editFields.push('联系电话');
      if (updateData.receiverAddress || updateData.shippingAddress) editFields.push('收货地址');
      if (updateData.totalAmount !== undefined) editFields.push('订单金额');
      if (updateData.depositAmount !== undefined) editFields.push('定金金额');
      if (updateData.expressCompany !== undefined) editFields.push('快递公司');
      if (updateData.trackingNumber !== undefined) editFields.push('快递单号');
      if (updateData.remark !== undefined) editFields.push('备注');
      if (updateData.paymentMethod !== undefined) editFields.push('支付方式');
      if (updateData.markType !== undefined) editFields.push('订单标记');
      if (updateData.products !== undefined) editFields.push('商品信息');

      if (editFields.length > 0) {
        const opInfo = getOperatorInfo(req);
        await saveStatusHistory(
          order.id,
          order.status,
          opInfo.operatorId,
          opInfo.operatorName,
          `编辑订单，修改了「${editFields.join('、')}」`,
          {
            operatorDepartment: opInfo.departmentName,
            actionType: 'edit',
            changeDetail: JSON.stringify({ editFields })
          }
        );
      }
    }

    res.json({
      success: true,
      code: 200,
      message: '订单更新成功',
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status
      }
    });
  } catch (error) {
    log.error('更新订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '更新订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route DELETE /api/v1/orders/:id
 * @desc 删除订单
 * @access Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const order = await orderRepository.findOne({
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    await orderRepository.remove(order);

    res.json({
      success: true,
      code: 200,
      message: '订单删除成功'
    });
  } catch (error) {
    log.error('删除订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '删除订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders/:id/submit-audit
 * @desc 提交订单审核
 * @access Private
 */
router.post('/:id/submit-audit', async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const { remark } = req.body;
    const idParam = req.params.id;

    let order = await orderRepository.findOne({ where: { id: idParam } });
    if (!order) {
      order = await orderRepository.findOne({ where: { orderNumber: idParam } });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    // 🔥 提审时，如果是预留单或退单，自动改为正常发货单
    const previousMarkType = order.markType;
    if (order.markType === 'reserved' || order.markType === 'return') {
      order.markType = 'normal';
      log.info(`📝 [订单提审] 订单 ${order.orderNumber} 标记从 ${previousMarkType} 改为 normal`);
    }

    order.status = 'pending_audit';
    if (remark) {
      order.remark = `${order.remark || ''} | 提审备注: ${remark}`;
    }

    await orderRepository.save(order);

    // 🔥 保存状态历史记录
    const opInfoSubmit = getOperatorInfo(req);
    await saveStatusHistory(
      order.id,
      order.status,
      opInfoSubmit.operatorId || order.createdBy,
      opInfoSubmit.operatorName || order.createdByName || '销售员',
      `订单已提交审核，${remark ? `，备注：${remark}` : ''}`,
      { operatorDepartment: opInfoSubmit.departmentName, actionType: 'submit_audit' }
    );

    log.info(`✅ [订单提审] 订单 ${order.orderNumber} 已提交审核，状态变更为 pending_audit`);

    // 🔥 发送待审核通知给下单员和管理员
    orderNotificationService.notifyOrderPendingAudit({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: Number(order.totalAmount),
      createdBy: order.createdBy,
      createdByName: order.createdByName
    }).catch(err => log.error('[订单提审] 发送通知失败:', err));

    res.json({
      success: true,
      code: 200,
      message: '订单已提交审核',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        markType: order.markType,
        previousMarkType: previousMarkType !== order.markType ? previousMarkType : undefined
      }
    });
  } catch (error) {
    log.error('提交订单审核失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '提交订单审核失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders/:id/audit
 * @desc 审核订单
 * @access Private
 */
router.post('/:id/audit', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const { action, auditStatus, remark, auditRemark } = req.body;
    const idParam = req.params.id;

    // 获取当前审核员信息
    const currentUser = (req as any).currentUser || (req as any).user;
    const auditorName = currentUser?.realName || currentUser?.name || currentUser?.username || '审核员';

    // 兼容两种参数格式：action='approve'/'reject' 或 auditStatus='approved'/'rejected'
    const isApproved = action === 'approve' || auditStatus === 'approved';
    const finalRemark = remark || auditRemark || '';

    log.info(`📝 [订单审核] 收到审核请求: orderId=${idParam}, action=${action}, auditStatus=${auditStatus}, isApproved=${isApproved}`);

    let order = await orderRepository.findOne({ where: { id: idParam } });
    if (!order) {
      order = await orderRepository.findOne({ where: { orderNumber: idParam } });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    const orderInfo = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: Number(order.totalAmount),
      createdBy: order.createdBy,
      createdByName: order.createdByName
    };

    log.info(`📋 [订单审核] orderInfo: ${JSON.stringify(orderInfo)}`);

    if (isApproved) {
      // 🔥 虚拟商品订单差异化流转
      if (order.markType === 'virtual' || order.orderProductType === 'virtual') {
        // 判断是否全部为无需发货型
        let products: any[] = [];
        try {
          products = typeof order.products === 'string' ? JSON.parse(order.products as any) : (order.products || []);
        } catch { products = []; }
        const virtualItems = products.filter((p: any) => p.productType === 'virtual');
        const allNone = virtualItems.length > 0 && virtualItems.every((p: any) => p.virtualDeliveryType === 'none');

        if (allNone) {
          // 无需发货型：审核通过直接完成（已签收）
          order.status = 'signed' as any;
          (order as any).completionSource = 'audit_auto_complete';
          log.info(`✅ [订单审核] 虚拟订单 ${order.orderNumber} 全部无需发货，审核通过直接签收`);
        } else {
          // 卡密/资源型：进入虚拟待发货
          order.status = 'virtual_pending' as any;
          log.info(`✅ [订单审核] 虚拟订单 ${order.orderNumber} 审核通过，进入虚拟待发货`);
        }
      } else {
        // 普通/混合订单：进入普通待发货
        order.status = 'pending_shipment';
        log.info(`✅ [订单审核] 订单 ${order.orderNumber} 审核通过，状态变更为 pending_shipment`);
      }
      order.remark = `${order.remark || ''} | 审核通过: ${finalRemark}`;
      log.info(`📨 [订单审核] 准备发送通知: createdBy=${order.createdBy}, auditorName=${auditorName}`);

      // 🔥 发送审核通过通知给下单员
      orderNotificationService.notifyOrderAuditApproved(orderInfo, auditorName)
        .catch(err => log.error('[订单审核] 发送审核通过通知失败:', err));

      // 🔥 发送待发货通知给下单员（仅非直接完成的订单）
      if (order.status === 'pending_shipment' || order.status === ('virtual_pending' as any)) {
        orderNotificationService.notifyOrderPendingShipment(orderInfo)
          .catch(err => log.error('[订单审核] 发送待发货通知失败:', err));
      }
    } else {
      order.status = 'audit_rejected';
      order.remark = `${order.remark || ''} | 审核拒绝: ${finalRemark}`;
      log.info(`✅ [订单审核] 订单 ${order.orderNumber} 审核拒绝，状态变更为 audit_rejected`);

      // 🔥 审核拒绝时释放预占的虚拟库存
      try {
        const { getDataSource } = await import('../../config/database');
        const ds = getDataSource();
        const tenantId = (req as any).user?.tenantId || null;
        await ds.query(
          `UPDATE card_key_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND status = 'reserved' AND tenant_id = ?`,
          [order.id, tenantId]
        );
        await ds.query(
          `UPDATE resource_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND status = 'reserved' AND tenant_id = ?`,
          [order.id, tenantId]
        );
        log.info(`🔓 [虚拟库存] 订单 ${order.id} 审核拒绝，已释放预占`);
      } catch (releaseErr) {
        log.error('[虚拟库存] 审核拒绝释放预占失败:', releaseErr);
      }

      // 🔥 发送审核拒绝通知给下单员和管理员
      orderNotificationService.notifyOrderAuditRejected(orderInfo, auditorName, finalRemark)
        .catch(err => log.error('[订单审核] 发送审核拒绝通知失败:', err));
    }

    await orderRepository.save(order);

    // 🔥 保存状态历史记录
    const auditOpInfo = getOperatorInfo(req);
    await saveStatusHistory(
      order.id,
      order.status,
      auditOpInfo.operatorId,
      auditOpInfo.operatorName,
      isApproved
        ? `审核通过${finalRemark ? `，备注：${finalRemark}` : ''}`
        : `审核拒绝${finalRemark ? `，原因：${finalRemark}` : ''}`,
      { operatorDepartment: auditOpInfo.departmentName, actionType: isApproved ? 'audit_approve' : 'audit_reject' }
    );

    res.json({
      success: true,
      code: 200,
      message: isApproved ? '订单审核通过' : '订单审核拒绝',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        auditStatus: isApproved ? 'approved' : 'rejected'
      }
    });
  } catch (error) {
    log.error('审核订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '审核订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders/:id/cancel-audit
 * @desc 审核取消订单申请
 * @access Private
 */
router.post('/:id/cancel-audit', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const { action, remark } = req.body;

    // 获取当前审核员信息
    const currentUser = (req as any).currentUser || (req as any).user;
    const auditorName = currentUser?.realName || currentUser?.name || currentUser?.username || '审核员';

    const order = await orderRepository.findOne({ where: { id: req.params.id } });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    const orderInfo = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: Number(order.totalAmount),
      createdBy: order.createdBy,
      createdByName: order.createdByName
    };

    if (action === 'approve') {
      order.status = 'cancelled';
      order.remark = `${order.remark || ''} | 审核通过: ${remark || ''}`;

      // 🔥 发送取消审核通过通知
      orderNotificationService.notifyOrderCancelApproved(orderInfo, auditorName)
        .catch(err => log.error('[取消审核] 发送通过通知失败:', err));

      // 🔥 发送订单已取消通知
      orderNotificationService.notifyOrderCancelled(orderInfo, remark, auditorName)
        .catch(err => log.error('[取消审核] 发送取消通知失败:', err));
    } else {
      // 🔥 修复：审核拒绝后应该设置为 cancel_failed，而不是 confirmed
      order.status = 'cancel_failed';
      order.remark = `${order.remark || ''} | 审核拒绝: ${remark || ''}`;

      // 🔥 发送取消审核拒绝通知
      orderNotificationService.notifyOrderCancelRejected(orderInfo, auditorName, remark)
        .catch(err => log.error('[取消审核] 发送拒绝通知失败:', err));
    }

    await orderRepository.save(order);

    // 🔥 保存状态历史记录
    const cancelOpInfo = getOperatorInfo(req);
    await saveStatusHistory(
      order.id,
      order.status,
      cancelOpInfo.operatorId,
      cancelOpInfo.operatorName,
      action === 'approve' ? `取消申请已通过${remark ? `，原因：${remark}` : ''}` : `取消申请已拒绝，${remark ? `，原因：${remark}` : ''}`,
      { operatorDepartment: cancelOpInfo.departmentName, actionType: action === 'approve' ? 'cancel_approve' : 'cancel_reject' }
    );

    res.json({
      success: true,
      code: 200,
      message: action === 'approve' ? '取消申请已通过' : '取消申请已拒绝'
    });
  } catch (error) {
    log.error('审核取消申请失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '审核取消申请失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});


} // end registerCrudRoutes
