import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { Not, IsNull } from 'typeorm';

const router = Router();

router.use(authenticateToken);

/**
 * @route GET /api/v1/data/list
 * @desc 获取资料列表（从已签收订单中获取客户资料）
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 30, _status, keyword, assigneeId, dateFilter } = req.query;
    const currentUser = req.user;

    // 🔥 从订单表获取已签收的订单数据
    const { Order } = await import('../entities/Order');
    const orderRepository = AppDataSource.getRepository(Order);

    const queryBuilder = orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer');

    // 只获取已签收的订单（delivered状态）
    queryBuilder.andWhere('order.status = :deliveredStatus', { deliveredStatus: 'delivered' });

    // 数据权限过滤
    const role = currentUser?.role || '';
    const allowAllRoles = ['super_admin', 'superadmin', 'admin'];
    if (!allowAllRoles.includes(role)) {
      if (role === 'manager' || role === 'department_manager') {
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
    }

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(order.customerName LIKE :keyword OR order.customerPhone LIKE :keyword OR order.orderNumber LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // 分配人筛选
    if (assigneeId) {
      queryBuilder.andWhere('order.createdBy = :assigneeId', { assigneeId });
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

    queryBuilder.orderBy('order.deliveredAt', 'DESC');
    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const [orders, total] = await queryBuilder.getManyAndCount();

    // 转换为资料列表格式
    const list = orders.map(order => ({
      id: order.id,
      customerName: order.customerName || '',
      customerCode: order.customer?.customerNo || '',
      phone: order.customerPhone || '',
      orderNo: order.orderNumber,
      orderAmount: Number(order.totalAmount) || 0,
      orderDate: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '',
      signDate: order.deliveredAt ? new Date(order.deliveredAt).toISOString().split('T')[0] : '',
      orderStatus: order.status, // 订单状态（delivered=已签收）
      status: 'pending' as const, // 资料分配状态（待分配）
      assigneeId: order.createdBy,
      assigneeName: order.createdByName,
      assigneeDepartment: order.createdByDepartmentName,
      createTime: order.createdAt ? new Date(order.createdAt).toISOString() : '',
      updateTime: order.updatedAt ? new Date(order.updatedAt).toISOString() : '',
      trackingNo: order.trackingNumber || '',
      address: order.shippingAddress || '',
      remark: order.remark || ''
    }));

    // 计算汇总数据
    const allOrders = await orderRepository.find({ where: { status: 'delivered' } });
    const summary = {
      totalCount: allOrders.length,
      pendingCount: allOrders.length, // 暂时都算待分配
      assignedCount: 0,
      archivedCount: 0,
      totalAmount: allOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0),
      todayCount: allOrders.filter(o => {
        const today = new Date().toDateString();
        return o.deliveredAt && new Date(o.deliveredAt).toDateString() === today;
      }).length,
      weekCount: allOrders.filter(o => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return o.deliveredAt && new Date(o.deliveredAt) >= weekAgo;
      }).length,
      monthCount: allOrders.filter(o => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return o.deliveredAt && new Date(o.deliveredAt) >= monthAgo;
      }).length
    };

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) },
      summary
    });
  } catch (error) {
    console.error('获取资料列表失败:', error);
    res.status(500).json({ success: false, message: '获取资料列表失败' });
  }
});


/**
 * @route POST /api/v1/data/batch-assign
 * @desc 批量分配数据
 */
router.post('/batch-assign', async (req: Request, res: Response) => {
  try {
    const { dataIds, assigneeId } = req.body;

    if (!dataIds || dataIds.length === 0 || !assigneeId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const userRepository = AppDataSource.getRepository(User);

    const assignee = await userRepository.findOne({ where: { id: assigneeId } });
    if (!assignee) {
      return res.status(404).json({ success: false, message: '分配人不存在' });
    }

    let successCount = 0;
    for (const id of dataIds) {
      try {
        const customer = await customerRepository.findOne({ where: { id } });
        if (customer) {
          customer.salesPersonId = assigneeId;
          customer.salesPersonName = assignee.realName || assignee.username;
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        console.error('分配单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '分配成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    console.error('批量分配失败:', error);
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

    const customerRepository = AppDataSource.getRepository(Customer);
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
        console.error('归档单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '归档成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    console.error('批量归档失败:', error);
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

    const customerRepository = AppDataSource.getRepository(Customer);
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
        console.error('恢复单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '恢复成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    console.error('恢复数据失败:', error);
    res.status(500).json({ success: false, message: '恢复数据失败' });
  }
});

/**
 * @route GET /api/v1/data/assignee-options
 * @desc 获取分配人选项
 */
router.get('/assignee-options', async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
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
    console.error('获取分配人选项失败:', error);
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
    const customerRepository = AppDataSource.getRepository(Customer);

    if (!keyword) {
      return res.json({ success: true, data: null });
    }

    console.log('🔍 [客户搜索] 关键词:', keyword);

    // 1. 直接搜索客户信息（客户编码、手机号、姓名）
    let customer = await customerRepository
      .createQueryBuilder('customer')
      .where('customer.customerCode = :keyword', { keyword })
      .orWhere('customer.phone = :keyword', { keyword })
      .orWhere('customer.name = :keyword', { keyword })
      .getOne();

    // 2. 如果没找到，通过订单号搜索
    if (!customer) {
      console.log('🔍 [客户搜索] 尝试通过订单号查找');
      const orderResult = await AppDataSource.query(
        `SELECT c.* FROM customers c
         JOIN orders o ON c.id = o.customer_id
         WHERE o.order_no = ?
         LIMIT 1`,
        [keyword]
      );
      if (orderResult && orderResult.length > 0) {
        // 通过ID重新查询获取完整的Customer实体
        customer = await customerRepository.findOne({
          where: { id: orderResult[0].id }
        }) || null;
        if (customer) {
          console.log('✅ [客户搜索] 通过订单号找到客户:', customer.name);
        }
      }
    }

    // 3. 如果还没找到，通过物流单号搜索
    if (!customer) {
      console.log('🔍 [客户搜索] 尝试通过物流单号查找');
      const logisticsResult = await AppDataSource.query(
        `SELECT c.* FROM customers c
         JOIN orders o ON c.id = o.customer_id
         JOIN logistics_tracking l ON o.id = l.order_id
         WHERE l.tracking_number = ?
         LIMIT 1`,
        [keyword]
      );
      if (logisticsResult && logisticsResult.length > 0) {
        // 通过ID重新查询获取完整的Customer实体
        customer = await customerRepository.findOne({
          where: { id: logisticsResult[0].id }
        }) || null;
        if (customer) {
          console.log('✅ [客户搜索] 通过物流单号找到客户:', customer.name);
        }
      }
    }

    if (!customer) {
      console.log('❌ [客户搜索] 未找到匹配的客户');
      return res.json({ success: true, data: null, message: '未找到匹配的客户' });
    }

    // 获取客户的销售员归属信息
    if (customer.salesPersonId) {
      const salesPersonResult = await AppDataSource.query(
        `SELECT id, username, real_name, department_name, position FROM users WHERE id = ?`,
        [customer.salesPersonId]
      );
      if (salesPersonResult && salesPersonResult.length > 0) {
        const salesPerson = salesPersonResult[0];

        (customer as any).salesPersonInfo = {
          id: salesPerson.id,
          name: salesPerson.real_name || salesPerson.username,
          department: salesPerson.department_name,
          position: salesPerson.position
        };
        console.log('✅ [客户搜索] 获取到销售员信息:', salesPerson.real_name || salesPerson.username);
      }
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('❌ [客户搜索] 失败:', error);
    res.status(500).json({ success: false, message: '搜索客户失败' });
  }
});

/**
 * @route GET /api/v1/data/search-customer
 * @desc 搜索客户（模糊搜索，返回列表）
 */
router.get('/search-customer', async (req: Request, res: Response) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    const customerRepository = AppDataSource.getRepository(Customer);

    if (!keyword) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    const queryBuilder = customerRepository.createQueryBuilder('customer');
    queryBuilder.where(
      '(customer.customerCode LIKE :keyword OR customer.name LIKE :keyword OR customer.phone LIKE :keyword)',
      { keyword: `%${keyword}%` }
    );

    queryBuilder.orderBy('customer.createdAt', 'DESC');
    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (error) {
    console.error('搜索客户失败:', error);
    res.status(500).json({ success: false, message: '搜索客户失败' });
  }
});

/**
 * @route GET /api/v1/data/statistics
 * @desc 获取数据统计
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);

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
    console.error('获取数据统计失败:', error);
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
    const customerRepository = AppDataSource.getRepository(Customer);

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
    console.error('获取回收站列表失败:', error);
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

    const customerRepository = AppDataSource.getRepository(Customer);
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
        console.error('恢复单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '恢复成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    console.error('恢复数据失败:', error);
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

    const customerRepository = AppDataSource.getRepository(Customer);
    let successCount = 0;

    for (const id of dataIds) {
      try {
        await customerRepository.delete(id);
        successCount++;
      } catch (e) {
        console.error('永久删除单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '永久删除成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    console.error('永久删除失败:', error);
    res.status(500).json({ success: false, message: '永久删除失败' });
  }
});

export default router;
