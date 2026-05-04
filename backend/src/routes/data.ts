import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { CustomerServicePermission } from '../entities/CustomerServicePermission';
import { Not, IsNull, In } from 'typeorm';
import { getTenantRepo, tenantSQL } from '../utils/tenantRepo';

import { log } from '../config/logger';
const router = Router();

router.use(authenticateToken);

/**
 * @route GET /api/v1/data/list
 * @desc 获取资料列表（从已签收订单中获取客户资料）
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, keyword, assigneeId, departmentId, dateFilter } = req.query;
    const currentUser = req.user;

    // 🔥 从订单表获取已签收的订单数据
    const { Order } = await import('../entities/Order');
    const orderRepository = getTenantRepo(Order);

    const queryBuilder = orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer');

    // 只获取已签收的订单（delivered状态）
    queryBuilder.andWhere('order.status = :deliveredStatus', { deliveredStatus: 'delivered' });

    // 数据权限过滤
    const role = currentUser?.role || '';
    const adminRoles = ['super_admin', 'superadmin', 'admin'];
    const customerServiceRoles = ['customer_service', 'service'];

    if (adminRoles.includes(role)) {
      // 管理员可以看到所有数据，不做过滤
    } else if (customerServiceRoles.includes(role)) {
      // 客服角色需要根据客服权限配置的dataScope来过滤
      const csPermissionRepo = getTenantRepo(CustomerServicePermission);
      const csPermission = await csPermissionRepo.findOne({
        where: { userId: currentUser?.userId, status: 'active' }
      });

      if (csPermission) {
        const dataScope = csPermission.dataScope || 'self';
        if (dataScope === 'all') {
          // 全部数据，不做过滤
        } else if (dataScope === 'department') {
          // 部门数据
          if (currentUser?.departmentId) {
            queryBuilder.andWhere('order.createdByDepartmentId = :deptId', {
              deptId: currentUser.departmentId
            });
          }
        } else if (dataScope === 'custom' && csPermission.departmentIds?.length) {
          // 自定义部门范围
          queryBuilder.andWhere('order.createdByDepartmentId IN (:...deptIds)', {
            deptIds: csPermission.departmentIds
          });
        } else {
          // 默认只看自己的数据
          queryBuilder.andWhere('order.createdBy = :userId', {
            userId: currentUser?.userId
          });
        }
      } else {
        // 没有客服权限配置，默认只看自己的数据
        queryBuilder.andWhere('order.createdBy = :userId', {
          userId: currentUser?.userId
        });
      }
    } else if (role === 'manager' || role === 'department_manager') {
      // 经理看本部门的
      if (currentUser?.departmentId) {
        queryBuilder.andWhere('order.createdByDepartmentId = :deptId', {
          deptId: currentUser.departmentId
        });
      }
    } else {
      // 销售员只看自己的
      queryBuilder.andWhere('order.createdBy = :userId', {
        userId: currentUser?.userId
      });
    }

    // 关键词搜索（支持客户姓名、手机号、订单号、客户编码）
    if (keyword) {
      queryBuilder.andWhere(
        '(order.customerName LIKE :keyword OR order.customerPhone LIKE :keyword OR order.orderNumber LIKE :keyword OR customer.customerNo LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // 分配人筛选
    if (assigneeId) {
      queryBuilder.andWhere('order.createdBy = :assigneeId', { assigneeId });
    }

    // 部门筛选
    if (departmentId) {
      queryBuilder.andWhere('order.createdByDepartmentId = :filterDeptId', { filterDeptId: departmentId });
    }

    // 日期筛选
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          queryBuilder.andWhere('order.deliveredAt >= :startDate', { startDate });
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          queryBuilder.andWhere('order.deliveredAt >= :startDate AND order.deliveredAt < :endDate', { startDate, endDate });
          break;
        case 'thisWeek':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          queryBuilder.andWhere('order.deliveredAt >= :weekStart', { weekStart });
          break;
        case 'last30Days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          queryBuilder.andWhere('order.deliveredAt >= :startDate', { startDate });
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          queryBuilder.andWhere('order.deliveredAt >= :startDate', { startDate });
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1);
          queryBuilder.andWhere('order.deliveredAt >= :startDate', { startDate });
          break;
      }
    }

    // 🔥 资料分配状态筛选（基于客户记录派生）
    if (status && status !== 'all') {
      switch (status) {
        case 'pending':
          queryBuilder.andWhere(
            '(customer.sales_person_id IS NULL AND (customer.status IS NULL OR customer.status NOT IN (:...excludePending)))',
            { excludePending: ['archived', 'deleted'] }
          );
          break;
        case 'assigned':
          queryBuilder.andWhere(
            'customer.sales_person_id IS NOT NULL AND (customer.status IS NULL OR customer.status NOT IN (:...excludeAssigned))',
            { excludeAssigned: ['archived', 'deleted'] }
          );
          break;
        case 'archived':
          queryBuilder.andWhere('customer.status = :archivedStatus', { archivedStatus: 'archived' });
          break;
        case 'recovered':
          // recovered 客户状态会被重置为 active，暂不区分
          break;
      }
    }

    queryBuilder.orderBy('order.deliveredAt', 'DESC');
    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const [orders, total] = await queryBuilder.getManyAndCount();

    // 🔥 转换为资料列表格式 —— 从客户记录派生分配状态
    const list = orders.map(order => {
      let allocationStatus: 'pending' | 'assigned' | 'archived' | 'recovered' = 'pending';
      const cust = order.customer;
      if (cust) {
        if (cust.status === 'archived') {
          allocationStatus = 'archived';
        } else if ((cust as any).salesPersonId) {
          allocationStatus = 'assigned';
        }
      }

      return {
        id: order.id,
        customerName: order.customerName || '',
        customerCode: cust?.customerNo || '',
        phone: order.customerPhone || '',
        orderNo: order.orderNumber,
        orderAmount: Number(order.totalAmount) || 0,
        orderDate: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '',
        signDate: order.deliveredAt ? new Date(order.deliveredAt).toISOString().split('T')[0] : '',
        orderStatus: order.status,
        status: allocationStatus,
        assigneeId: (cust as any)?.salesPersonId || order.createdBy,
        assigneeName: (cust as any)?.salesPersonName || order.createdByName,
        assigneeDepartment: order.createdByDepartmentName,
        operatorName: order.createdByName || '',
        createTime: order.createdAt ? new Date(order.createdAt).toISOString() : '',
        updateTime: order.updatedAt ? new Date(order.updatedAt).toISOString() : '',
        trackingNo: order.trackingNumber || '',
        address: order.shippingAddress || '',
        remark: order.remark || ''
      };
    });

    // 🔥 使用SQL聚合查询高效计算汇总数据（带客户JOIN，按分配状态统计）
    const summaryBuilder = orderRepository.createQueryBuilder('o')
      .leftJoin('o.customer', 'sc')
      .select('COUNT(*)', 'totalCount')
      .addSelect('COALESCE(SUM(o.total_amount), 0)', 'totalAmount')
      .addSelect(`SUM(CASE WHEN sc.sales_person_id IS NULL AND (sc.status IS NULL OR sc.status NOT IN ('archived','deleted')) THEN 1 WHEN sc.id IS NULL THEN 1 ELSE 0 END)`, 'pendingCount')
      .addSelect(`SUM(CASE WHEN sc.sales_person_id IS NOT NULL AND (sc.status IS NULL OR sc.status NOT IN ('archived','deleted')) THEN 1 ELSE 0 END)`, 'assignedCount')
      .addSelect(`SUM(CASE WHEN sc.status = 'archived' THEN 1 ELSE 0 END)`, 'archivedCount')
      .addSelect(`SUM(CASE WHEN DATE(o.delivered_at) = CURDATE() THEN 1 ELSE 0 END)`, 'todayCount')
      .addSelect(`SUM(CASE WHEN o.delivered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END)`, 'weekCount')
      .addSelect(`SUM(CASE WHEN o.delivered_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 ELSE 0 END)`, 'monthCount');
    // 租户隔离已由 getTenantRepo 自动添加
    summaryBuilder.andWhere('o.status = :sDeliveredStatus', { sDeliveredStatus: 'delivered' });

    // 🔥 汇总也需要权限过滤（与列表查询保持一致）
    if (adminRoles.includes(role)) {
      // 管理员不做过滤
    } else if (customerServiceRoles.includes(role)) {
      const csPermissionRepo2 = getTenantRepo(CustomerServicePermission);
      const csPermission2 = await csPermissionRepo2.findOne({
        where: { userId: currentUser?.userId, status: 'active' }
      });
      if (csPermission2) {
        const ds = csPermission2.dataScope || 'self';
        if (ds === 'all') { /* no filter */ }
        else if (ds === 'department' && currentUser?.departmentId) {
          summaryBuilder.andWhere('o.createdByDepartmentId = :sDeptId', { sDeptId: currentUser.departmentId });
        } else if (ds === 'custom' && csPermission2.departmentIds?.length) {
          summaryBuilder.andWhere('o.createdByDepartmentId IN (:...sDeptIds)', { sDeptIds: csPermission2.departmentIds });
        } else {
          summaryBuilder.andWhere('o.createdBy = :sUserId', { sUserId: currentUser?.userId });
        }
      } else {
        summaryBuilder.andWhere('o.createdBy = :sUserId', { sUserId: currentUser?.userId });
      }
    } else if (role === 'manager' || role === 'department_manager') {
      if (currentUser?.departmentId) {
        summaryBuilder.andWhere('o.createdByDepartmentId = :sDeptId', { sDeptId: currentUser.departmentId });
      }
    } else {
      summaryBuilder.andWhere('o.createdBy = :sUserId', { sUserId: currentUser?.userId });
    }

    const summaryRaw = await summaryBuilder.getRawOne();

    const summary = {
      totalCount: Number(summaryRaw?.totalCount || 0),
      pendingCount: Number(summaryRaw?.pendingCount || 0),
      assignedCount: Number(summaryRaw?.assignedCount || 0),
      archivedCount: Number(summaryRaw?.archivedCount || 0),
      recoveredCount: 0,
      totalAmount: Number(summaryRaw?.totalAmount || 0),
      todayCount: Number(summaryRaw?.todayCount || 0),
      weekCount: Number(summaryRaw?.weekCount || 0),
      monthCount: Number(summaryRaw?.monthCount || 0)
    };

    // 🔥 把 summary 放入 data 内部，避免被前端拦截器 `return data` 丢弃
    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize), summary }
    });
  } catch (error) {
    log.error('获取资料列表失败:', error);
    res.status(500).json({ success: false, message: '获取资料列表失败' });
  }
});


/**
 * @route POST /api/v1/data/batch-assign
 * @desc 批量分配客户资料（只更新客户的归属人，不影响订单）
 */
router.post('/batch-assign', async (req: Request, res: Response) => {
  try {
    const { dataIds, assigneeId, assigneeName } = req.body;

    if (!dataIds || dataIds.length === 0 || !assigneeId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const userRepository = getTenantRepo(User);
    const customerRepository = getTenantRepo(Customer);

    // 获取被分配人信息
    const assignee = await userRepository.findOne({ where: { id: assigneeId } });
    if (!assignee) {
      return res.status(404).json({ success: false, message: '被分配人不存在' });
    }

    const finalAssigneeName = assigneeName || assignee.realName || assignee.username;

    let successCount = 0;
    for (const customerId of dataIds) {
      try {
        // 🔥 修复：只更新客户的归属人，不影响订单
        const customer = await customerRepository.findOne({ where: { id: customerId } });
        if (customer) {
          customer.salesPersonId = assigneeId;
          customer.salesPersonName = finalAssigneeName;
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        log.error('分配单条客户资料失败:', e);
      }
    }

    // 🔥 发送资料分配通知给被分配人
    if (successCount > 0) {
      try {
        const currentUser = (req as any).user;
        const { orderNotificationService } = await import('../services/OrderNotificationService');
        await orderNotificationService.notifyDataAssign({
          dataIds: dataIds,
          dataCount: successCount,
          assigneeId: assigneeId,
          assigneeName: finalAssigneeName,
          assignerId: currentUser?.userId,
          assignerName: currentUser?.realName || currentUser?.username
        });
      } catch (notifyError) {
        log.error('[资料分配] 发送通知失败:', notifyError);
      }
    }

    res.json({
      success: true,
      message: '分配成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    log.error('批量分配失败:', error);
    res.status(500).json({ success: false, message: '批量分配失败' });
  }
});

/**
 * @route POST /api/v1/data/batch-archive
 * @desc 批量归档数据
 */
router.post('/batch-archive', async (req: Request, res: Response) => {
  try {
    const { dataIds } = req.body;

    if (!dataIds || dataIds.length === 0) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const customerRepository = getTenantRepo(Customer);
    let successCount = 0;

    for (const id of dataIds) {
      try {
        const customer = await customerRepository.findOne({ where: { id } });
        if (customer) {
          customer.status = 'archived';
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        log.error('归档单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '归档成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    log.error('批量归档失败:', error);
    res.status(500).json({ success: false, message: '批量归档失败' });
  }
});

/**
 * @route POST /api/v1/data/recover
 * @desc 恢复数据
 */
router.post('/recover', async (req: Request, res: Response) => {
  try {
    const { dataIds } = req.body;

    if (!dataIds || dataIds.length === 0) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const customerRepository = getTenantRepo(Customer);
    let successCount = 0;

    for (const id of dataIds) {
      try {
        const customer = await customerRepository.findOne({ where: { id } });
        if (customer) {
          customer.status = 'active';
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        log.error('恢复单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '恢复成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    log.error('恢复数据失败:', error);
    res.status(500).json({ success: false, message: '恢复数据失败' });
  }
});

/**
 * @route GET /api/v1/data/assignee-options
 * @desc 获取分配人选项
 */
router.get('/assignee-options', async (req: Request, res: Response) => {
  try {
    const userRepository = getTenantRepo(User);
    const users = await userRepository.find({
      where: { status: 'active' },
      select: ['id', 'username', 'realName', 'departmentName', 'position']
    });

    const options = users.map(u => ({
      id: u.id,
      name: u.realName || u.username,
      department: u.departmentName,
      position: u.position
    }));

    res.json({ success: true, data: options });
  } catch (error) {
    log.error('获取分配人选项失败:', error);
    res.status(500).json({ success: false, message: '获取分配人选项失败' });
  }
});

/**
 * @route GET /api/v1/data/search
 * @desc 搜索客户（资料管理-客户查询）
 * 支持：客户姓名、手机号、客户编码、订单号、物流单号
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    const customerRepository = getTenantRepo(Customer);

    if (!keyword) {
      return res.json({ success: true, data: null });
    }

    log.info('🔍 [客户搜索] 关键词:', keyword);

    // 1. 直接搜索客户信息（客户编码、手机号、姓名）
    // 🔥 修复：使用单个 .where() 包含所有 OR 条件，防止 .orWhere() 绕过租户隔离
    let customer = await customerRepository
      .createQueryBuilder('customer')
      .where('(customer.customerNo = :keyword OR customer.phone = :keyword OR customer.name = :keyword)', { keyword })
      .getOne();

    // 2. 如果没找到，通过订单号搜索
    if (!customer) {
      log.info('🔍 [客户搜索] 尝试通过订单号查找');
      const tData = tenantSQL('o.');
      const tCustomer = tenantSQL('c.');
      const orderResult = await AppDataSource.query(
        `SELECT c.* FROM customers c
         JOIN orders o ON c.id = o.customer_id
         WHERE o.order_no = ?${tData.sql}${tCustomer.sql}
         LIMIT 1`,
        [keyword, ...tData.params, ...tCustomer.params]
      );
      if (orderResult && orderResult.length > 0) {
        // 通过ID重新查询获取完整的Customer实体
        customer = await customerRepository.findOne({
          where: { id: orderResult[0].id }
        }) || null;
        if (customer) {
          log.info('✅ [客户搜索] 通过订单号找到客户:', customer.name);
        }
      }
    }

    // 3. 如果还没找到，通过物流单号搜索
    if (!customer) {
      log.info('🔍 [客户搜索] 尝试通过物流单号查找');
      const tLogistics = tenantSQL('o.');
      const tLogisticsC = tenantSQL('c.');
      const logisticsResult = await AppDataSource.query(
        `SELECT c.* FROM customers c
         JOIN orders o ON c.id = o.customer_id
         JOIN logistics_tracking l ON o.id = l.order_id
         WHERE l.tracking_number = ?${tLogistics.sql}${tLogisticsC.sql}
         LIMIT 1`,
        [keyword, ...tLogistics.params, ...tLogisticsC.params]
      );
      if (logisticsResult && logisticsResult.length > 0) {
        // 通过ID重新查询获取完整的Customer实体
        customer = await customerRepository.findOne({
          where: { id: logisticsResult[0].id }
        }) || null;
        if (customer) {
          log.info('✅ [客户搜索] 通过物流单号找到客户:', customer.name);
        }
      }
    }

    if (!customer) {
      log.info('❌ [客户搜索] 未找到匹配的客户');
      return res.json({ success: true, data: null, message: '未找到匹配的客户' });
    }

    // 获取客户的销售员归属信息
    if (customer.salesPersonId) {
      const tSales = tenantSQL('');
      const salesPersonResult = await AppDataSource.query(
        `SELECT id, username, real_name, department_name, position FROM users WHERE id = ?${tSales.sql}`,
        [customer.salesPersonId, ...tSales.params]
      );
      if (salesPersonResult && salesPersonResult.length > 0) {
        const salesPerson = salesPersonResult[0];

        (customer as any).salesPersonInfo = {
          id: salesPerson.id,
          name: salesPerson.real_name || salesPerson.username,
          department: salesPerson.department_name,
          position: salesPerson.position
        };
        log.info('✅ [客户搜索] 获取到销售员信息:', salesPerson.real_name || salesPerson.username);
      }
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    log.error('❌ [客户搜索] 失败:', error);
    res.status(500).json({ success: false, message: '搜索客户失败' });
  }
});

/**
 * @route GET /api/v1/data/search-customer
 * @desc 全局搜索客户（模糊搜索，返回列表，含归属信息和匹配类型）
 * 支持：客户姓名、手机号、客户编码、订单号、物流单号
 */
router.get('/search-customer', async (req: Request, res: Response) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    const customerRepository = getTenantRepo(Customer);

    if (!keyword) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    const kw = String(keyword).trim();
    const pageNum = Math.max(1, Number(page));
    const pageSizeNum = Math.min(50, Math.max(1, Number(pageSize)));

    // 1. 从客户表模糊搜索（姓名、手机号、编码）
    const queryBuilder = customerRepository.createQueryBuilder('customer');
    queryBuilder.where(
      '(customer.customerNo LIKE :keyword OR customer.name LIKE :keyword OR customer.phone LIKE :keyword)',
      { keyword: `%${kw}%` }
    );

    queryBuilder.orderBy('customer.createdAt', 'DESC');
    queryBuilder.skip((pageNum - 1) * pageSizeNum);
    queryBuilder.take(pageSizeNum);

    const [customers, total] = await queryBuilder.getManyAndCount();

    // 2. 批量获取销售员信息
    const salesIds = [...new Set(customers.map((c: any) => c.salesPersonId).filter(Boolean))];
    const salesMap: Record<string, any> = {};
    if (salesIds.length > 0) {
      const userRepo = getTenantRepo(User);
      const salesPersons = await userRepo.find({
        where: { id: In(salesIds) },
        select: ['id', 'realName', 'name', 'departmentName']
      });
      salesPersons.forEach((sp: any) => {
        salesMap[sp.id] = { name: sp.realName || sp.name || '', department: sp.departmentName || '' };
      });
    }

    // 3. 构建结果（带匹配类型和归属信息）
    const list = customers.map((c: any) => {
      let matchType = '客户姓名';
      if (c.phone?.includes(kw)) matchType = '手机号';
      else if (c.customerNo?.toLowerCase().includes(kw.toLowerCase())) matchType = '客户编码';

      const owner = c.salesPersonId ? salesMap[c.salesPersonId] : null;
      return {
        customerName: c.name || '未知',
        phone: c.phone || '',
        customerCode: c.customerNo || '',
        gender: c.gender || '',
        age: c.age || 0,
        level: c.level || '',
        address: c.address || '',
        createTime: c.createdAt,
        orderCount: c.orderCount || 0,
        ownerName: owner?.name || '未分配',
        ownerDepartment: owner?.department || '',
        matchType
      };
    });

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error) {
    log.error('搜索客户失败:', error);
    res.status(500).json({ success: false, message: '搜索客户失败' });
  }
});

/**
 * @route GET /api/v1/data/statistics
 * @desc 获取数据统计
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const customerRepository = getTenantRepo(Customer);

    const totalCount = await customerRepository.count();
    const assignedCount = await customerRepository.count({

      where: { salesPersonId: Not(IsNull()) } as any
    });
    const archivedCount = await customerRepository.count({
      where: { status: 'archived' }
    });

    res.json({
      success: true,
      data: {
        totalCount,
        assignedCount,
        unassignedCount: totalCount - assignedCount,
        archivedCount
      }
    });
  } catch (error) {
    log.error('获取数据统计失败:', error);
    res.status(500).json({ success: false, message: '获取数据统计失败' });
  }
});

/**
 * @route GET /api/v1/data/recycle
 * @desc 获取回收站列表（已删除/归档的客户资料）
 */
router.get('/recycle', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword, deleteTimeFilter, deletedBy: _deletedBy } = req.query;
    const customerRepository = getTenantRepo(Customer);

    const queryBuilder = customerRepository.createQueryBuilder('customer')
      .where('customer.status = :status', { status: 'deleted' });

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(customer.name LIKE :keyword OR customer.phone LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // 删除时间筛选
    if (deleteTimeFilter && deleteTimeFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (deleteTimeFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      queryBuilder.andWhere('customer.updatedAt >= :startDate', { startDate });
    }

    queryBuilder.orderBy('customer.updatedAt', 'DESC');
    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const [customers, total] = await queryBuilder.getManyAndCount();

    // 转换为回收站格式
    const list = customers.map(customer => ({
      id: customer.id,
      customerName: customer.name || '',
      phone: customer.phone || '',
      orderAmount: 0, // 需要从订单表获取
      orderDate: customer.createdAt ? new Date(customer.createdAt).toISOString().split('T')[0] : '',
      deletedAt: customer.updatedAt ? new Date(customer.updatedAt).toISOString() : '',
      deletedBy: '',
      deletedByName: '系统',
      deleteReason: '已删除',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30天后过期
    }));

    // 计算汇总数据
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) },
      summary: {
        totalCount: total,
        recentCount: list.filter(item => new Date(item.deletedAt) >= sevenDaysAgo).length,
        expiringSoonCount: list.filter(item => new Date(item.expiresAt) <= threeDaysLater).length
      }
    });
  } catch (error) {
    log.error('获取回收站列表失败:', error);
    res.status(500).json({ success: false, message: '获取回收站列表失败' });
  }
});

/**
 * @route POST /api/v1/data/restore
 * @desc 从回收站恢复数据
 */
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { dataIds } = req.body;

    if (!dataIds || dataIds.length === 0) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const customerRepository = getTenantRepo(Customer);
    let successCount = 0;

    for (const id of dataIds) {
      try {
        const customer = await customerRepository.findOne({ where: { id } });
        if (customer) {
          customer.status = 'active';
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        log.error('恢复单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '恢复成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    log.error('恢复数据失败:', error);
    res.status(500).json({ success: false, message: '恢复数据失败' });
  }
});

/**
 * @route POST /api/v1/data/permanent-delete
 * @desc 永久删除数据
 */
router.post('/permanent-delete', async (req: Request, res: Response) => {
  try {
    const { dataIds } = req.body;

    if (!dataIds || dataIds.length === 0) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const customerRepository = getTenantRepo(Customer);
    let successCount = 0;

    for (const id of dataIds) {
      try {
        await customerRepository.delete(id);
        successCount++;
      } catch (e) {
        log.error('永久删除单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '永久删除成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    log.error('永久删除失败:', error);
    res.status(500).json({ success: false, message: '永久删除失败' });
  }
});

export default router;
