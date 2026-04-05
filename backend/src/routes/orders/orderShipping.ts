/**
 * 订单模块 - 物流发货相关路由
 * 包含：待发货、已发货、退回、取消、草稿、物流统计、物流单号查询
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { Order } from '../../entities/Order';
import { Customer } from '../../entities/Customer';
import { getTenantRepo } from '../../utils/tenantRepo';
import { formatToBeijingTime, formatLocalDate } from './orderHelpers';
import { log } from '../../config/logger';
export function registerShippingRoutes(router: Router): void {router.get('/shipping/pending', async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const startTime = Date.now();

    // 🔥 服务端分页参数
    const { page = 1, pageSize = 20, orderNumber, customerName, keyword, startDate, endDate, quickFilter, departmentId, salesPersonId } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 500); // 🔥 最大500条/页
    const skip = (pageNum - 1) * pageSizeNum;

    // 🔥 优化：使用QueryBuilder只查询需要的字段
    const queryBuilder = orderRepository.createQueryBuilder('order')
      .select([
        'order.id', 'order.orderNumber', 'order.customerId', 'order.customerName',
        'order.customerPhone', 'order.totalAmount', 'order.depositAmount',
        'order.status', 'order.markType', 'order.paymentStatus', 'order.paymentMethod',
        'order.remark', 'order.createdBy', 'order.createdByName', 'order.createdAt',
        'order.shippingName', 'order.shippingPhone', 'order.shippingAddress',
        'order.expressCompany', 'order.logisticsStatus', 'order.serviceWechat',
        'order.orderSource', 'order.products', 'order.createdByDepartmentId',
        'order.customField1', 'order.customField2', 'order.customField3',
        'order.customField4', 'order.customField5', 'order.customField6', 'order.customField7'
      ])
      .where('order.status = :status', { status: 'pending_shipment' });

    // 🔥 支持综合关键词搜索（订单号 OR 客户名称 OR 手机号 OR 客户编码 OR 客户其他手机号）
    if (keyword) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :keyword OR order.customerName LIKE :keyword OR order.customerPhone LIKE :keyword OR order.customerId LIKE :keyword OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND (c.customer_code LIKE :keyword OR CAST(c.other_phones AS CHAR) LIKE :keyword)))',
        { keyword: `%${keyword}%` }
      );
      log.info(`📦 [待发货订单] 综合关键词搜索: "${keyword}"`);
    } else {
      // 支持单独筛选
      if (orderNumber) {
        queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
      }
      if (customerName) {
        queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
      }
    }

    // 🔥 部门筛选
    if (departmentId) {
      queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    }

    // 🔥 销售人员筛选
    if (salesPersonId) {
      queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    }

    // 🔥 日期范围筛选 - 数据库已配置为北京时区，直接使用北京时间查询
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    // 🔥 快速筛选 - 使用下单时间(createdAt)
    if (quickFilter) {
      const now = new Date();
      switch (quickFilter) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :today', { today });
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :yesterday', { yesterday: yesterdayStr });
          break;
        case 'thisWeek':
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - diff);
          queryBuilder.andWhere('order.createdAt >= :startOfWeek', { startOfWeek: startOfWeek.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'thisMonth':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          queryBuilder.andWhere('order.createdAt >= :startOfMonth', { startOfMonth: startOfMonth.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'lastMonth':
          // 上月订单：上个月1号00:00:00 到 上个月最后一天23:59:59
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          queryBuilder.andWhere('order.createdAt >= :lastMonthStart AND order.createdAt <= :lastMonthEnd', {
            lastMonthStart: formatLocalDate(lastMonthStart) + ' 00:00:00',
            lastMonthEnd: formatLocalDate(lastMonthEnd) + ' 23:59:59'
          });
          break;
        case 'thisYear':
          // 今年订单：今年1月1号00:00:00 到现在
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          queryBuilder.andWhere('order.createdAt >= :startOfYear', { startOfYear: startOfYear.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'timeout':
          // 🔥 超时订单：待发货超过24小时的订单
          const timeoutDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          queryBuilder.andWhere('order.createdAt <= :timeoutDate', { timeoutDate: timeoutDate.toISOString() });
          break;
      }
    }

    // 先获取总数
    const total = await queryBuilder.getCount();

    // 分页和排序
    queryBuilder.orderBy('order.createdAt', 'DESC').skip(skip).take(pageSizeNum);
    const orders = await queryBuilder.getMany();

    const queryTime = Date.now() - startTime;
    log.info(`📦 [待发货订单] 查询完成: ${orders.length}条, 总数${total}, 页码${pageNum}, 每页${pageSizeNum}, 耗时${queryTime}ms`);

    // 🔥 获取所有订单的客户ID，批量查询客户信息
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
    const customerRepository = getTenantRepo(Customer);
    const customers = customerIds.length > 0
      ? await customerRepository.findByIds(customerIds)
      : [];
    const customerMap = new Map(customers.map(c => [c.id, c]));

    // 转换数据格式
    const list = orders.map(order => {
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

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        // 🔥 新增：客户详细信息
        customerGender: customer?.gender || null,
        customerAge: customer?.age || null,
        customerHeight: customer?.height || null,
        customerWeight: customer?.weight || null,
        medicalHistory: customer?.medicalHistory || null,
        products: products,
        totalAmount: Number(order.totalAmount) || 0,
        depositAmount: Number(order.depositAmount) || 0,
        collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
        receiverName: order.shippingName || '',
        receiverPhone: order.shippingPhone || '',
        receiverAddress: order.shippingAddress || '',
        remark: order.remark || '',
        status: order.status,
        auditStatus: 'approved',
        markType: order.markType || 'normal',
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: order.paymentMethod || '',
        serviceWechat: order.serviceWechat || '',
        orderSource: order.orderSource || '',
        expressCompany: order.expressCompany || '',
        logisticsStatus: order.logisticsStatus || '',
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
        // 同时返回独立字段便于直接访问
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
    });

    res.json({
      success: true,
      code: 200,
      message: '获取待发货订单成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    log.error('❌ [待发货订单] 获取失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取待发货订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/shipping/shipped
 * @desc 获取已发货订单列表（优化版 - 服务端分页）
 * @access Private
 */
router.get('/shipping/shipped', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const startTime = Date.now();

    // 🔥 获取当前用户信息，用于数据权限过滤
    const jwtUser = (req as any).user;
    const dbUser = (req as any).currentUser;
    const userRole = dbUser?.role || jwtUser?.role || '';
    const userId = dbUser?.id || jwtUser?.userId || '';
    const userDepartmentId = dbUser?.departmentId || jwtUser?.departmentId || '';

    log.info(`🚚 [已发货订单] 用户: ${dbUser?.username || jwtUser?.username}, 角色: ${userRole}, 部门ID: ${userDepartmentId}`);

    // 🔥 服务端分页参数
    const { page = 1, pageSize = 20, orderNumber, customerName, trackingNumber, customerPhone, customerCode, keyword, status, logisticsStatus, startDate, endDate, quickFilter, departmentId, salesPersonId, expressCompany } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 500); // 🔥 最大500条/页
    const skip = (pageNum - 1) * pageSizeNum;

    // 🔥 优化：使用QueryBuilder只查询需要的字段
    const queryBuilder = orderRepository.createQueryBuilder('order')
      .select([
        'order.id', 'order.orderNumber', 'order.customerId', 'order.customerName',
        'order.customerPhone', 'order.totalAmount', 'order.depositAmount',
        'order.status', 'order.markType', 'order.paymentStatus', 'order.paymentMethod',
        'order.remark', 'order.createdBy', 'order.createdByName', 'order.createdAt',
        'order.createdByDepartmentId', 'order.createdByDepartmentName',
        'order.shippingName', 'order.shippingPhone', 'order.shippingAddress',
        'order.expressCompany', 'order.trackingNumber', 'order.logisticsStatus',
        'order.latestLogisticsInfo',  // 🔥 新增：最新物流动态
        'order.shippedAt', 'order.serviceWechat', 'order.orderSource', 'order.products',
        'order.customField1', 'order.customField2', 'order.customField3',
        'order.customField4', 'order.customField5', 'order.customField6', 'order.customField7'
      ]);

    // 🔥 修复：状态筛选 - 支持 updated 参数查询所有非 shipped 状态
    if (status === 'updated') {
      // 已更新 = 所有非 shipped 状态的订单（delivered, rejected, returned 等）
      // 🔥 修复：使用完整的发货后状态列表
      const updatedStatuses = ['delivered', 'completed', 'signed', 'rejected', 'rejected_returned', 'returned', 'refunded', 'after_sales_created', 'abnormal', 'exception', 'package_exception'];
      queryBuilder.where('order.status IN (:...statuses)', { statuses: updatedStatuses });
      log.info(`🚚 [已发货订单] 查询已更新订单（非shipped状态）`);
    } else if (status && status !== 'all') {
      queryBuilder.where('order.status = :status', { status });
    } else {
      // 🔥 修复：使用完整的发货后状态列表
      const allShippedStatuses = ['shipped', 'delivered', 'completed', 'signed', 'rejected', 'rejected_returned', 'returned', 'refunded', 'after_sales_created', 'abnormal', 'exception', 'package_exception'];
      queryBuilder.where('order.status IN (:...statuses)', { statuses: allShippedStatuses });
    }

    // 🔥 物流状态筛选
    if (logisticsStatus) {
      log.info(`🚚 [已发货订单] 物流状态筛选: "${logisticsStatus}"`);
      queryBuilder.andWhere('order.logisticsStatus = :logisticsStatus', { logisticsStatus });
    }

    // 🔥 调试：查询数据库中实际的物流状态分布
    if (!logisticsStatus) {
      try {
        const statusDistribution = await orderRepository.createQueryBuilder('order')
          .select('order.logisticsStatus', 'status')
          .addSelect('COUNT(*)', 'count')
          .where('order.status IN (:...statuses)', { statuses: ['shipped', 'delivered'] })
          .groupBy('order.logisticsStatus')
          .getRawMany();
        log.info(`🚚 [已发货订单] 数据库中物流状态分布:`, statusDistribution);
      } catch (e) {
        log.info(`🚚 [已发货订单] 查询物流状态分布失败:`, e);
      }
    }

    // 🔥 数据权限过滤
    const allowAllRoles = ['super_admin', 'admin', 'customer_service', 'service'];
    const managerRoles = ['department_manager', 'manager'];
    const salesRoles = ['sales_staff', 'sales', 'salesperson'];

    if (!allowAllRoles.includes(userRole)) {
      if (managerRoles.includes(userRole)) {
        // 部门经理可以看本部门所有成员的订单
        if (userDepartmentId) {
          queryBuilder.andWhere('(order.createdByDepartmentId = :userDeptId OR order.createdBy = :userId)', {
            userDeptId: userDepartmentId,
            userId
          });
          log.info(`🚚 [已发货订单] 经理过滤: 部门ID = ${userDepartmentId} 或 创建人ID = ${userId}`);
        } else {
          queryBuilder.andWhere('order.createdBy = :userId', { userId });
          log.info(`🚚 [已发货订单] 经理无部门ID，只看自己的订单`);
        }
      } else if (salesRoles.includes(userRole)) {
        // 销售员只能看自己的订单
        queryBuilder.andWhere('order.createdBy = :userId', { userId });
        log.info(`🚚 [已发货订单] 销售员过滤: 只看自己的订单, userId = ${userId}`);
      } else {
        // 其他角色：只能看自己的订单
        queryBuilder.andWhere('order.createdBy = :userId', { userId });
        log.info(`🚚 [已发货订单] 其他角色过滤: 只看自己的订单`);
      }
    } else {
      log.info(`🚚 [已发货订单] ${userRole}角色，查看所有订单`);
    }

    // 🔥 修复：支持关键词搜索（订单号 OR 客户名称 OR 物流单号 OR 手机号 OR 客户编码 OR 客户其他手机号）
    if (keyword) {
      // 统一关键词搜索：支持订单号、客户名称、物流单号、手机号、客户编码、客户其他手机号
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :keyword OR order.customerName LIKE :keyword OR order.trackingNumber LIKE :keyword OR order.customerPhone LIKE :keyword OR order.customerId LIKE :keyword OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND (c.customer_code LIKE :keyword OR CAST(c.other_phones AS CHAR) LIKE :keyword)))',
        { keyword: `%${keyword}%` }
      );
      log.info(`🚚 [已发货订单] 统一关键词搜索: "${keyword}"`);
    } else if (orderNumber && customerName && orderNumber === customerName) {
      // 如果订单号和客户名称相同，说明是同一个搜索关键词，使用 OR 条件
      queryBuilder.andWhere('(order.orderNumber LIKE :kw OR order.customerName LIKE :kw OR order.trackingNumber LIKE :kw OR order.customerPhone LIKE :kw OR order.customerId LIKE :kw OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND (c.customer_code LIKE :kw OR CAST(c.other_phones AS CHAR) LIKE :kw)))', { kw: `%${orderNumber}%` });
      log.info(`🚚 [已发货订单] 关键词搜索: "${orderNumber}"`);
    } else {
      // 分别筛选
      if (orderNumber) {
        queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
      }
      if (customerName) {
        queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
      }
      if (customerPhone) {
        queryBuilder.andWhere('(order.customerPhone LIKE :customerPhone OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND CAST(c.other_phones AS CHAR) LIKE :customerPhone))', { customerPhone: `%${customerPhone}%` });
      }
      if (customerCode) {
        queryBuilder.andWhere('EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND c.customer_code LIKE :customerCode)', { customerCode: `%${customerCode}%` });
      }
    }
    if (trackingNumber) {
      queryBuilder.andWhere('order.trackingNumber LIKE :trackingNumber', { trackingNumber: `%${trackingNumber}%` });
    }

    // 🔥 部门筛选（管理员可以筛选特定部门）
    if (departmentId && allowAllRoles.includes(userRole)) {
      queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    }

    // 🔥 销售人员筛选（管理员可以筛选特定销售）
    if (salesPersonId && allowAllRoles.includes(userRole)) {
      queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    }

    // 🔥 快递公司筛选
    if (expressCompany) {
      queryBuilder.andWhere('order.expressCompany = :expressCompany', { expressCompany });
    }

    // 🔥 日期范围筛选 - 按下单时间筛选（更符合业务需求，上月下单的订单都应该显示）
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
      log.info(`🚚 [已发货订单] 日期筛选(下单时间) - 开始日期: ${startDate}`);
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
      log.info(`🚚 [已发货订单] 日期筛选(下单时间) - 结束日期: ${endDate}`);
    }
    if (!startDate && !endDate) {
      log.info(`🚚 [已发货订单] 无日期筛选条件`);
    }

    // 🔥 快速筛选 - 使用下单时间(createdAt)而非发货时间(shippedAt)
    if (quickFilter) {
      const now = new Date();
      switch (quickFilter) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :today', { today });
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :yesterday', { yesterday: yesterdayStr });
          break;
        case 'thisWeek':
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - diff);
          queryBuilder.andWhere('order.createdAt >= :startOfWeek', { startOfWeek: startOfWeek.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'thisMonth':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          queryBuilder.andWhere('order.createdAt >= :startOfMonth', { startOfMonth: startOfMonth.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'lastMonth':
          // 上月订单：上个月1号00:00:00 到 上个月最后一天23:59:59
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          queryBuilder.andWhere('order.createdAt >= :lastMonthStart AND order.createdAt <= :lastMonthEnd', {
            lastMonthStart: formatLocalDate(lastMonthStart) + ' 00:00:00',
            lastMonthEnd: formatLocalDate(lastMonthEnd) + ' 23:59:59'
          });
          break;
        case 'thisYear':
          // 今年订单：今年1月1号00:00:00 到现在
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          queryBuilder.andWhere('order.createdAt >= :startOfYear', { startOfYear: startOfYear.toISOString().split('T')[0] + ' 00:00:00' });
          break;
      }
    }

    // 先获取总数
    const total = await queryBuilder.getCount();

    // 分页和排序 - 按发货时间倒序
    queryBuilder.orderBy('order.shippedAt', 'DESC').skip(skip).take(pageSizeNum);
    const orders = await queryBuilder.getMany();

    const queryTime = Date.now() - startTime;
    log.info(`🚚 [已发货订单] 查询完成: ${orders.length}条, 总数${total}, 耗时${queryTime}ms`);

    // 🔥 获取所有订单的客户ID，批量查询客户信息
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
    const customerRepository = getTenantRepo(Customer);
    const customers = customerIds.length > 0
      ? await customerRepository.findByIds(customerIds)
      : [];
    const customerMap = new Map(customers.map(c => [c.id, c]));

    // 转换数据格式
    const list = orders.map(order => {
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

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        // 🔥 新增：客户详细信息
        customerGender: customer?.gender || null,
        customerAge: customer?.age || null,
        customerHeight: customer?.height || null,
        customerWeight: customer?.weight || null,
        medicalHistory: customer?.medicalHistory || null,
        products: products,
        totalAmount: Number(order.totalAmount) || 0,
        depositAmount: Number(order.depositAmount) || 0,
        collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
        receiverName: order.shippingName || '',
        receiverPhone: order.shippingPhone || '',
        receiverAddress: order.shippingAddress || '',
        remark: order.remark || '',
        status: order.status,
        auditStatus: 'approved',
        markType: order.markType || 'normal',
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: order.paymentMethod || '',
        serviceWechat: order.serviceWechat || '',
        orderSource: order.orderSource || '',
        trackingNumber: order.trackingNumber || '',
        expressCompany: order.expressCompany || '',
        logisticsStatus: order.logisticsStatus || '',
        // 🔥 新增：最新物流动态（用于避免重复请求已完结的物流）
        latestLogisticsInfo: order.latestLogisticsInfo || '',
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
        shippedAt: order.shippedAt ? formatToBeijingTime(order.shippedAt) : '',
        createTime: formatToBeijingTime(order.createdAt),
        createdBy: order.createdBy || '',
        createdByName: order.createdByName || '',
        salesPersonId: order.createdBy || '',
        operatorId: order.createdBy || '',
        operator: order.createdByName || ''
      };
    });

    res.json({
      success: true,
      code: 200,
      message: '获取已发货订单成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    log.error('❌ [已发货订单] 获取失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取已发货订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/shipping/returned
 * @desc 获取退回订单列表（服务端分页）
 * @access Private
 */
router.get('/shipping/returned', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const { page = 1, pageSize = 10, orderNumber, customerName, keyword, startDate, endDate, quickFilter, departmentId, salesPersonId } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 500);
    const skip = (pageNum - 1) * pageSizeNum;

    // 🔥 优化:使用QueryBuilder只查询需要的字段(与待发货API保持一致)
    const queryBuilder = orderRepository.createQueryBuilder('order')
      .select([
        'order.id', 'order.orderNumber', 'order.customerId', 'order.customerName',
        'order.customerPhone', 'order.totalAmount', 'order.depositAmount',
        'order.status', 'order.markType', 'order.paymentStatus', 'order.paymentMethod',
        'order.remark', 'order.createdBy', 'order.createdByName', 'order.createdAt', 'order.updatedAt',
        'order.shippingName', 'order.shippingPhone', 'order.shippingAddress',
        'order.expressCompany', 'order.trackingNumber', 'order.logisticsStatus', 'order.serviceWechat',
        'order.orderSource', 'order.products', 'order.createdByDepartmentId',
        'order.customField1', 'order.customField2', 'order.customField3',
        'order.customField4', 'order.customField5', 'order.customField6', 'order.customField7'
      ])
      .where('order.status IN (:...statuses)', {
        statuses: ['logistics_returned', 'rejected_returned', 'audit_rejected']
      });

    // 🔥 支持综合关键词搜索(订单号 OR 客户名称 OR 手机号 OR 客户编码 OR 客户其他手机号)
    if (keyword) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :keyword OR order.customerName LIKE :keyword OR order.customerPhone LIKE :keyword OR order.customerId LIKE :keyword OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND (c.customer_code LIKE :keyword OR CAST(c.other_phones AS CHAR) LIKE :keyword)))',
        { keyword: `%${keyword}%` }
      );
      log.info(`📦 [退回订单] 综合关键词搜索: "${keyword}"`);
    } else {
      if (orderNumber) {
        queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
      }
      if (customerName) {
        queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
      }
    }
    // 🔥 部门筛选
    if (departmentId) {
      queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    }
    // 🔥 销售人员筛选
    if (salesPersonId) {
      queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    }

    // 🔥 快速筛选 - 使用下单时间(createdAt)
    if (quickFilter) {
      const now = new Date();
      switch (quickFilter) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :today', { today });
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :yesterday', { yesterday: yesterdayStr });
          break;
        case 'thisWeek':
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - diff);
          queryBuilder.andWhere('order.createdAt >= :startOfWeek', { startOfWeek: startOfWeek.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'thisMonth':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          queryBuilder.andWhere('order.createdAt >= :startOfMonth', { startOfMonth: startOfMonth.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'lastMonth':
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          queryBuilder.andWhere('order.createdAt >= :lastMonthStart AND order.createdAt <= :lastMonthEnd', {
            lastMonthStart: formatLocalDate(lastMonthStart) + ' 00:00:00',
            lastMonthEnd: formatLocalDate(lastMonthEnd) + ' 23:59:59'
          });
          break;
        case 'thisYear':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          queryBuilder.andWhere('order.createdAt >= :startOfYear', { startOfYear: startOfYear.toISOString().split('T')[0] + ' 00:00:00' });
          break;
      }
    }

    // 🔥 日期范围筛选
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    const total = await queryBuilder.getCount();
    queryBuilder.orderBy('order.updatedAt', 'DESC').skip(skip).take(pageSizeNum);
    const orders = await queryBuilder.getMany();

    // 🔥 获取所有订单的客户ID，批量查询客户信息
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
    const customerRepository = getTenantRepo(Customer);
    const customers = customerIds.length > 0
      ? await customerRepository.findByIds(customerIds)
      : [];
    const customerMap = new Map(customers.map(c => [c.id, c]));

    // 🔥 转换数据格式（与待发货API保持一致）
    const list = orders.map(order => {
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

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        // 🔥 客户详细信息
        customerGender: customer?.gender || null,
        customerAge: customer?.age || null,
        customerHeight: customer?.height || null,
        customerWeight: customer?.weight || null,
        medicalHistory: customer?.medicalHistory || null,
        products: products,
        totalAmount: Number(order.totalAmount) || 0,
        depositAmount: Number(order.depositAmount) || 0,
        collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
        receiverName: order.shippingName || '',
        receiverPhone: order.shippingPhone || '',
        receiverAddress: order.shippingAddress || '',
        remark: order.remark || '',
        status: order.status,
        markType: order.markType || 'normal',
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: order.paymentMethod || '',
        serviceWechat: order.serviceWechat || '',
        orderSource: order.orderSource || '',
        expressCompany: order.expressCompany || '',
        trackingNumber: order.trackingNumber || '',
        logisticsStatus: order.logisticsStatus || '',
        // 🔥 自定义字段
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
        updatedAt: formatToBeijingTime(order.updatedAt),
        createdBy: order.createdBy || '',
        createdByName: order.createdByName || '',
        salesPersonId: order.createdBy || '',
        operatorId: order.createdBy || '',
        operator: order.createdByName || ''
      };
    });

    res.json({ success: true, data: { list, total, page: pageNum, pageSize: pageSizeNum } });
  } catch (error) {
    log.error('❌ [退回订单] 获取失败:', error);
    res.status(500).json({ success: false, message: '获取退回订单失败' });
  }
});

/**
 * @route GET /api/v1/orders/shipping/cancelled
 * @desc 获取取消订单列表（服务端分页）
 * @access Private
 */
router.get('/shipping/cancelled', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const { page = 1, pageSize = 10, orderNumber, customerName, keyword, startDate, endDate, quickFilter, departmentId, salesPersonId } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 500);
    const skip = (pageNum - 1) * pageSizeNum;

    // 🔥 优化:使用QueryBuilder只查询需要的字段(与待发货API保持一致)
    const queryBuilder = orderRepository.createQueryBuilder('order')
      .select([
        'order.id', 'order.orderNumber', 'order.customerId', 'order.customerName',
        'order.customerPhone', 'order.totalAmount', 'order.depositAmount',
        'order.status', 'order.markType', 'order.paymentStatus', 'order.paymentMethod',
        'order.remark', 'order.createdBy', 'order.createdByName', 'order.createdAt', 'order.updatedAt',
        'order.shippingName', 'order.shippingPhone', 'order.shippingAddress',
        'order.expressCompany', 'order.trackingNumber', 'order.logisticsStatus', 'order.serviceWechat',
        'order.orderSource', 'order.products', 'order.createdByDepartmentId',
        'order.customField1', 'order.customField2', 'order.customField3',
        'order.customField4', 'order.customField5', 'order.customField6', 'order.customField7'
      ])
      .where('order.status IN (:...statuses)', {
        statuses: ['cancelled', 'logistics_cancelled']
      });

    // 🔥 支持综合关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :keyword OR order.customerName LIKE :keyword OR order.customerPhone LIKE :keyword OR order.customerId LIKE :keyword OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND (c.customer_code LIKE :keyword OR CAST(c.other_phones AS CHAR) LIKE :keyword)))',
        { keyword: `%${keyword}%` }
      );
    } else {
      if (orderNumber) {
        queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
      }
      if (customerName) {
        queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
      }
    }
    // 🔥 部门筛选
    if (departmentId) {
      queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    }
    // 🔥 销售人员筛选
    if (salesPersonId) {
      queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    }

    // 🔥 快速筛选 - 使用下单时间(createdAt)
    if (quickFilter) {
      const now = new Date();
      switch (quickFilter) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :today', { today });
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :yesterday', { yesterday: yesterdayStr });
          break;
        case 'thisWeek':
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - diff);
          queryBuilder.andWhere('order.createdAt >= :startOfWeek', { startOfWeek: startOfWeek.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'thisMonth':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          queryBuilder.andWhere('order.createdAt >= :startOfMonth', { startOfMonth: startOfMonth.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'lastMonth':
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          queryBuilder.andWhere('order.createdAt >= :lastMonthStart AND order.createdAt <= :lastMonthEnd', {
            lastMonthStart: formatLocalDate(lastMonthStart) + ' 00:00:00',
            lastMonthEnd: formatLocalDate(lastMonthEnd) + ' 23:59:59'
          });
          break;
        case 'thisYear':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          queryBuilder.andWhere('order.createdAt >= :startOfYear', { startOfYear: startOfYear.toISOString().split('T')[0] + ' 00:00:00' });
          break;
      }
    }

    // 🔥 日期范围筛选
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    const total = await queryBuilder.getCount();
    queryBuilder.orderBy('order.updatedAt', 'DESC').skip(skip).take(pageSizeNum);
    const orders = await queryBuilder.getMany();

    // 🔥 获取所有订单的客户ID，批量查询客户信息
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
    const customerRepository = getTenantRepo(Customer);
    const customers = customerIds.length > 0
      ? await customerRepository.findByIds(customerIds)
      : [];
    const customerMap = new Map(customers.map(c => [c.id, c]));

    // 🔥 转换数据格式（与待发货API保持一致）
    const list = orders.map(order => {
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

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        // 🔥 客户详细信息
        customerGender: customer?.gender || null,
        customerAge: customer?.age || null,
        customerHeight: customer?.height || null,
        customerWeight: customer?.weight || null,
        medicalHistory: customer?.medicalHistory || null,
        products: products,
        totalAmount: Number(order.totalAmount) || 0,
        depositAmount: Number(order.depositAmount) || 0,
        collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
        receiverName: order.shippingName || '',
        receiverPhone: order.shippingPhone || '',
        receiverAddress: order.shippingAddress || '',
        remark: order.remark || '',
        status: order.status,
        markType: order.markType || 'normal',
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: order.paymentMethod || '',
        serviceWechat: order.serviceWechat || '',
        orderSource: order.orderSource || '',
        expressCompany: order.expressCompany || '',
        trackingNumber: order.trackingNumber || '',
        logisticsStatus: order.logisticsStatus || '',
        // 🔥 自定义字段
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
        updatedAt: formatToBeijingTime(order.updatedAt),
        createdBy: order.createdBy || '',
        createdByName: order.createdByName || '',
        salesPersonId: order.createdBy || '',
        operatorId: order.createdBy || '',
        operator: order.createdByName || ''
      };
    });

    res.json({ success: true, data: { list, total, page: pageNum, pageSize: pageSizeNum } });
  } catch (error) {
    log.error('❌ [取消订单] 获取失败:', error);
    res.status(500).json({ success: false, message: '获取取消订单失败' });
  }
});

/**
 * @route GET /api/v1/orders/shipping/draft
 * @desc 获取草稿订单列表（服务端分页）
 * @access Private
 */
router.get('/shipping/draft', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const { page = 1, pageSize = 10, orderNumber, customerName, keyword, startDate, endDate, quickFilter } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 500);
    const skip = (pageNum - 1) * pageSizeNum;

    const queryBuilder = orderRepository.createQueryBuilder('order')
      .where('order.status = :status', { status: 'draft' });

    // 🔥 支持综合关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :keyword OR order.customerName LIKE :keyword OR order.customerPhone LIKE :keyword OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND (c.customer_code LIKE :keyword OR CAST(c.other_phones AS CHAR) LIKE :keyword)))',
        { keyword: `%${keyword}%` }
      );
    } else {
      if (orderNumber) {
        queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
      }
      if (customerName) {
        queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
      }
    }

    // 🔥 快速筛选 - 使用下单时间(createdAt)
    if (quickFilter) {
      const now = new Date();
      switch (quickFilter) {
        case 'today':
          const today = now.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :today', { today });
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          queryBuilder.andWhere('DATE(order.createdAt) = :yesterday', { yesterday: yesterdayStr });
          break;
        case 'thisWeek':
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - diff);
          queryBuilder.andWhere('order.createdAt >= :startOfWeek', { startOfWeek: startOfWeek.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'thisMonth':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          queryBuilder.andWhere('order.createdAt >= :startOfMonth', { startOfMonth: startOfMonth.toISOString().split('T')[0] + ' 00:00:00' });
          break;
        case 'lastMonth':
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          queryBuilder.andWhere('order.createdAt >= :lastMonthStart AND order.createdAt <= :lastMonthEnd', {
            lastMonthStart: formatLocalDate(lastMonthStart) + ' 00:00:00',
            lastMonthEnd: formatLocalDate(lastMonthEnd) + ' 23:59:59'
          });
          break;
        case 'thisYear':
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          queryBuilder.andWhere('order.createdAt >= :startOfYear', { startOfYear: startOfYear.toISOString().split('T')[0] + ' 00:00:00' });
          break;
      }
    }

    // 🔥 日期范围筛选
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    const total = await queryBuilder.getCount();
    queryBuilder.orderBy('order.updatedAt', 'DESC').skip(skip).take(pageSizeNum);
    const orders = await queryBuilder.getMany();

    const list = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      totalAmount: Number(order.totalAmount) || 0,
      status: order.status,
      shippingAddress: order.shippingAddress || '',
      createdByName: order.createdByName || '',
      createdAt: formatToBeijingTime(order.createdAt),
      updatedAt: formatToBeijingTime(order.updatedAt),
      products: typeof order.products === 'string' ? JSON.parse(order.products || '[]') : (order.products || [])
    }));

    res.json({ success: true, data: { list, total, page: pageNum, pageSize: pageSizeNum } });
  } catch (error) {
    log.error('❌ [草稿订单] 获取失败:', error);
    res.status(500).json({ success: false, message: '获取草稿订单失败' });
  }
});

/**
 * @route GET /api/v1/orders/shipping/statistics
 * @desc 获取物流统计数据（优化版）
 * @access Private
 */
router.get('/shipping/statistics', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const startTime = Date.now();

    // 🔥 优化：使用并行查询获取所有统计数据
    const [pendingCount, shippedCount, deliveredCount, exceptionCount] = await Promise.all([
      orderRepository.count({ where: { status: 'pending_shipment' } }),
      orderRepository.count({ where: { status: 'shipped' } }),
      orderRepository.count({ where: { status: 'delivered' } }),
      orderRepository.createQueryBuilder('order')
        .where('order.status IN (:...statuses)', {
          statuses: ['rejected', 'package_exception', 'logistics_returned', 'logistics_cancelled']
        })
        .getCount()
    ]);

    const queryTime = Date.now() - startTime;
    log.info(`📊 [物流统计] 查询完成: 待发货${pendingCount}, 已发货${shippedCount}, 已签收${deliveredCount}, 异常${exceptionCount}, 耗时${queryTime}ms`);

    res.json({
      success: true,
      code: 200,
      data: {
        pendingCount,
        shippedCount,
        deliveredCount,
        exceptionCount,
        totalShipped: shippedCount + deliveredCount
      }
    });
  } catch (error) {
    log.error('获取物流统计失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取物流统计失败'
    });
  }
});

/**
 * @route GET /api/v1/orders/by-tracking-no
 * @desc 根据物流单号获取订单信息
 * @access Private
 */
router.get('/by-tracking-no', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { trackingNo } = req.query;

    if (!trackingNo) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '缺少物流单号参数'
      });
    }

    log.info('[订单API] 根据物流单号查询订单:', trackingNo);

    const orderRepository = getTenantRepo(Order);

    const order = await orderRepository.findOne({
      where: { trackingNumber: trackingNo as string }
    });

    if (!order) {
      log.info('[订单API] 未找到对应订单, trackingNo:', trackingNo);
      return res.status(404).json({
        success: false,
        code: 404,
        message: '未找到对应订单'
      });
    }

    // 🔥 优先使用收货人电话，其次使用客户电话
    const phoneToReturn = order.shippingPhone || order.customerPhone || '';
    log.info('[订单API] 找到订单:', order.orderNumber);
    log.info('[订单API] 手机号字段 - shippingPhone:', order.shippingPhone, ', customerPhone:', order.customerPhone);
    log.info('[订单API] 返回手机号:', phoneToReturn || '(空)');

    res.json({
      success: true,
      code: 200,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone || '',
        // 🔥 确保receiverPhone有值
        receiverPhone: order.shippingPhone || order.customerPhone || '',
        phone: phoneToReturn,
        expressCompany: order.expressCompany,
        trackingNumber: order.trackingNumber,
        // 🔥 新增：收货地址和发货时间
        shippingAddress: order.shippingAddress || '',
        address: order.shippingAddress || '',
        shippedAt: order.shippedAt ? formatToBeijingTime(order.shippedAt) : '',
        shipTime: order.shippedAt ? formatToBeijingTime(order.shippedAt) : ''
      }
    });
  } catch (error) {
    log.error('根据物流单号获取订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取订单失败'
    });
  }
});

} // end registerShippingRoutes
