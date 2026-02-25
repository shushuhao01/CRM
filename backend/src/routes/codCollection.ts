/**
 * 代收管理路由
 * 管理已发货订单的代收款项（快递代收货款/COD）
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { Department } from '../entities/Department';
import { Between, In } from 'typeorm';

const router = Router();

// 有效订单状态（计入代收统计的订单）- 只统计已发货且有效的订单
const VALID_STATUSES = ['shipped', 'delivered', 'completed'];

// 已发货的订单状态（出现在代收列表中）- 包含所有已发货状态，用于列表展示
const SHIPPED_STATUSES = ['shipped', 'delivered', 'completed', 'rejected', 'logistics_returned', 'exception'];

/**
 * 获取代收统计数据
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, departmentId, salesPersonId } = req.query;
    const orderRepo = AppDataSource.getRepository(Order);

    // 构建基础查询条件
    const baseWhere: any = {
      status: In(SHIPPED_STATUSES)
    };

    // 部门筛选
    if (departmentId) {
      baseWhere.createdByDepartmentId = departmentId;
    }

    // 销售人员筛选
    if (salesPersonId) {
      baseWhere.createdBy = salesPersonId;
    }

    // 🔥 修复：根据用户选择的日期范围计算统计数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // 用户选择的日期范围（如果有）
    const userStartDate = startDate ? new Date(startDate as string) : null;
    const userEndDate = endDate ? new Date(endDate as string + ' 23:59:59') : null;

    // 🔥 修改1：订单金额统计（筛选范围内的有效订单总金额，只统计已发货且有效的订单）
    const orderAmountWhere = { ...baseWhere, status: In(VALID_STATUSES) };
    if (userStartDate && userEndDate) {
      orderAmountWhere.createdAt = Between(userStartDate, userEndDate);
    } else {
      orderAmountWhere.createdAt = Between(monthStart, monthEnd);
    }
    const orderAmountOrders = await orderRepo.find({
      where: orderAmountWhere,
      select: ['totalAmount', 'finalAmount']
    });
    const totalOrderAmount = orderAmountOrders.reduce((sum, o) => {
      return sum + (Number(o.finalAmount) || Number(o.totalAmount) || 0);
    }, 0);

    // 🔥 修改2：需要代收金额统计（筛选范围内需要代收的金额，只统计有效订单）
    const needCodWhere = { ...baseWhere, status: In(VALID_STATUSES) };
    if (userStartDate && userEndDate) {
      needCodWhere.createdAt = Between(userStartDate, userEndDate);
    } else {
      needCodWhere.createdAt = Between(monthStart, monthEnd);
    }
    const needCodOrders = await orderRepo.find({
      where: needCodWhere,
      select: ['totalAmount', 'depositAmount']
    });
    const totalNeedCod = needCodOrders.reduce((sum, o) => {
      // 代收金额 = 订单总额 - 定金
      const codAmount = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      return sum + codAmount;
    }, 0);

    // 已改代收金额（如果用户选择了日期范围，则计算该范围内的；否则计算当月，只统计有效订单）
    // 🔥 统计逻辑：原本需要代收的金额 - 修改后的代收金额 = 已经收取的金额
    const cancelledWhere = { ...baseWhere, codStatus: 'cancelled', status: In(VALID_STATUSES) };
    if (userStartDate && userEndDate) {
      cancelledWhere.createdAt = Between(userStartDate, userEndDate);
    } else {
      cancelledWhere.codCancelledAt = Between(monthStart, monthEnd);
    }
    const cancelledOrders = await orderRepo.find({
      where: cancelledWhere,
      select: ['codAmount', 'totalAmount', 'depositAmount']
    });
    const totalCancelledCod = cancelledOrders.reduce((sum, o) => {
      // 原本需要代收的金额
      const originalCodAmount = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      // 修改后的代收金额
      const modifiedCodAmount = (o.codAmount !== null && o.codAmount !== undefined) ? Number(o.codAmount) : 0;
      // 已经收取的金额 = 原本需要代收 - 修改后需要代收
      const collectedAmount = originalCodAmount - modifiedCodAmount;
      return sum + collectedAmount;
    }, 0);

    // 已返款金额（如果用户选择了日期范围，则计算该范围内的；否则计算当月，只统计有效订单）
    const returnedWhere = { ...baseWhere, codStatus: 'returned', status: In(VALID_STATUSES) };
    if (userStartDate && userEndDate) {
      returnedWhere.createdAt = Between(userStartDate, userEndDate);
    } else {
      returnedWhere.codReturnedAt = Between(monthStart, monthEnd);
    }
    const returnedOrders = await orderRepo.find({
      where: returnedWhere,
      select: ['codReturnedAmount']
    });
    const totalReturnedCod = returnedOrders.reduce((sum, o) => sum + Number(o.codReturnedAmount || 0), 0);

    // 未返款金额（如果用户选择了日期范围，则计算该范围内的；否则计算当月，只统计有效订单）
    const pendingWhere = { ...baseWhere, codStatus: 'pending', status: In(VALID_STATUSES) };
    if (userStartDate && userEndDate) {
      pendingWhere.createdAt = Between(userStartDate, userEndDate);
    } else {
      pendingWhere.createdAt = Between(monthStart, monthEnd);
    }
    const pendingOrders = await orderRepo.find({
      where: pendingWhere,
      select: ['totalAmount', 'depositAmount']
    });
    const totalPendingCod = pendingOrders.reduce((sum, o) => {
      // 待处理订单，代收金额 = 订单总额 - 定金
      const codAmount = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      return sum + codAmount;
    }, 0);

    res.json({
      success: true,
      data: {
        todayCod: Number(totalOrderAmount.toFixed(2)),  // 🔥 改为订单金额
        monthCod: Number(totalNeedCod.toFixed(2)),      // 🔥 改为需要代收金额
        cancelledCod: Number(totalCancelledCod.toFixed(2)),
        returnedCod: Number(totalReturnedCod.toFixed(2)),
        pendingCod: Number(totalPendingCod.toFixed(2))
      }
    });
  } catch (error: any) {
    console.error('[CodCollection] Get stats error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

/**
 * 获取代收订单列表
 */
router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      startDate,
      endDate,
      departmentId,
      salesPersonId,
      status,
      codStatus,
      keywords,
      tab = 'pending' // pending-待处理, returned-已返款, cancelled-已改代收
    } = req.query;

    const orderRepo = AppDataSource.getRepository(Order);
    const queryBuilder = orderRepo.createQueryBuilder('o');

    // 基础条件：已发货的订单
    queryBuilder.where('o.status IN (:...statuses)', { statuses: SHIPPED_STATUSES });

    // 标签页筛选
    if (tab === 'pending') {
      queryBuilder.andWhere('o.cod_status = :codStatus', { codStatus: 'pending' });
      console.log('[CodCollection] 查询待处理订单，条件: cod_status = pending');
    } else if (tab === 'returned') {
      queryBuilder.andWhere('o.cod_status = :codStatus', { codStatus: 'returned' });
      console.log('[CodCollection] 查询已返款订单，条件: cod_status = returned');
    } else if (tab === 'cancelled') {
      queryBuilder.andWhere('o.cod_status = :codStatus', { codStatus: 'cancelled' });
      console.log('[CodCollection] 查询已改代收订单，条件: cod_status = cancelled');
    }

    // 日期筛选（订单下单时间）
    if (startDate && endDate) {
      queryBuilder.andWhere('o.created_at BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    // 部门筛选
    if (departmentId) {
      queryBuilder.andWhere('o.created_by_department_id = :departmentId', { departmentId });
    }

    // 销售人员筛选
    if (salesPersonId) {
      queryBuilder.andWhere('o.created_by = :salesPersonId', { salesPersonId });
    }

    // 订单状态筛选
    if (status) {
      queryBuilder.andWhere('o.status = :status', { status });
    }

    // 代收状态筛选
    if (codStatus) {
      queryBuilder.andWhere('o.cod_status = :codStatus', { codStatus });
    }

    // 批量关键词搜索
    if (keywords) {
      const keywordList = (keywords as string).split('\n').map(k => k.trim()).filter(k => k);
      if (keywordList.length > 0) {
        const conditions = keywordList.map((_, i) =>
          `(o.order_number LIKE :kw${i} OR o.customer_phone LIKE :kw${i} OR o.customer_name LIKE :kw${i} OR o.tracking_number LIKE :kw${i})`
        ).join(' OR ');

        const params: any = {};
        keywordList.forEach((kw, i) => {
          params[`kw${i}`] = `%${kw}%`;
        });

        queryBuilder.andWhere(`(${conditions})`, params);
      }
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页
    const pageNum = parseInt(page as string);
    const size = parseInt(pageSize as string);
    queryBuilder.skip((pageNum - 1) * size).take(size);

    // 排序（按下单时间倒序）
    queryBuilder.orderBy('o.created_at', 'DESC');

    const orders = await queryBuilder.getMany();

    // 🔥 调试日志：打印查询到的订单状态
    console.log('[CodCollection] 查询结果:', {
      tab,
      total,
      ordersCount: orders.length,
      orderStatuses: orders.map(o => ({
        orderNumber: o.orderNumber,
        codStatus: o.codStatus,
        codAmount: o.codAmount
      }))
    });

    // 获取所有订单的客户ID
    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];

    // 批量查询客户信息
    let customerMap: Record<string, any> = {};
    if (customerIds.length > 0) {
      try {
        const { Customer } = await import('../entities/Customer');
        const customerRepo = AppDataSource.getRepository(Customer);
        const customers = await customerRepo
          .createQueryBuilder('c')
          .where('c.id IN (:...ids)', { ids: customerIds })
          .select(['c.id', 'c.customerNo'])
          .getMany();

        customerMap = customers.reduce((map, customer) => {
          map[customer.id] = customer;
          return map;
        }, {} as Record<string, any>);
      } catch (customerErr: any) {
        console.error('[CodCollection] Query customers error:', customerErr);
        // 如果查询客户失败，继续返回订单数据，只是客户编码使用customerId
      }
    }

    // 格式化返回数据
    const list = orders.map(o => {
      // 🔥 修复：使用数据库中的实际代收金额（如果有修改过）
      // 如果 codAmount 有值，使用它；否则使用原始计算值
      const originalCodAmount = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      const currentCodAmount = (o.codAmount !== null && o.codAmount !== undefined)
        ? Number(o.codAmount)
        : originalCodAmount;

      // 获取客户编码
      const customer = customerMap[o.customerId];
      const customerCode = customer?.customerNo || o.customerId;

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerId: customerCode, // 使用客户编码
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        totalAmount: o.totalAmount,
        finalAmount: o.finalAmount,
        depositAmount: o.depositAmount,
        codAmount: currentCodAmount,  // 🔥 使用当前实际代收金额
        codStatus: o.codStatus || 'pending',
        codReturnedAmount: o.codReturnedAmount || 0,
        codReturnedAt: o.codReturnedAt,
        codCancelledAt: o.codCancelledAt,
        codRemark: o.codRemark,
        salesPersonId: o.createdBy,
        salesPersonName: o.createdByName,
        departmentId: o.createdByDepartmentId,
        departmentName: o.createdByDepartmentName,
        trackingNumber: o.trackingNumber,
        expressCompany: o.expressCompany,
        logisticsStatus: o.logisticsStatus,
        latestLogisticsInfo: o.latestLogisticsInfo,
        shippedAt: o.shippedAt,
        createdAt: o.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        list,
        total,
        page: pageNum,
        pageSize: size
      }
    });
  } catch (error: any) {
    console.error('[CodCollection] Get list error:', error);
    res.status(500).json({ success: false, message: '获取代收列表失败' });
  }
});

/**
 * 获取代收订单详情
 */
router.get('/detail/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderRepo = AppDataSource.getRepository(Order);

    const order = await orderRepo.findOne({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 🔥 修复：使用数据库中的实际代收金额（如果有修改过）
    const originalCodAmount = (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);
    const currentCodAmount = (order.codAmount !== null && order.codAmount !== undefined)
      ? Number(order.codAmount)
      : originalCodAmount;

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        status: order.status,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        depositAmount: order.depositAmount,
        codAmount: currentCodAmount,  // 🔥 使用当前实际代收金额
        codStatus: order.codStatus || 'pending',
        codReturnedAmount: order.codReturnedAmount || 0,
        codReturnedAt: order.codReturnedAt,
        codCancelledAt: order.codCancelledAt,
        codRemark: order.codRemark,
        salesPersonId: order.createdBy,
        salesPersonName: order.createdByName,
        departmentId: order.createdByDepartmentId,
        departmentName: order.createdByDepartmentName,
        trackingNumber: order.trackingNumber,
        expressCompany: order.expressCompany,
        logisticsStatus: order.logisticsStatus,
        latestLogisticsInfo: order.latestLogisticsInfo,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        shippingName: order.shippingName,
        shippingPhone: order.shippingPhone,
        shippingAddress: order.shippingAddress,
        products: order.products,
        remark: order.remark,
        createdAt: order.createdAt
      }
    });
  } catch (error: any) {
    console.error('[CodCollection] Get detail error:', error);
    res.status(500).json({ success: false, message: '获取订单详情失败' });
  }
});

/**
 * 修改代收金额（改代收）
 * 场景：客户直接付尾款给商家，不需要快递代收，修改代收金额
 * 业务规则：
 * 1. 如果已经标记返款，不能再改代收
 * 2. 修改的金额不能大于原代收金额
 * 3. 如果改为0元，则标记为已改代收状态（cancelled）
 * 4. 如果改为大于0的金额，保持待处理状态（pending），可以继续修改
 */
router.put('/update-cod/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { codAmount, codRemark } = req.body;

    const orderRepo = AppDataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id } });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 🔥 业务规则1：如果已经标记返款，不能再改代收
    if (order.codStatus === 'returned') {
      return res.status(400).json({ success: false, message: '订单已返款，不能修改代收金额' });
    }

    // 🔥 业务规则2：如果已经改为0元，不能再修改
    if (order.codStatus === 'cancelled' && Number(order.codAmount) === 0) {
      return res.status(400).json({ success: false, message: '订单已改为0元代收，不能再次修改' });
    }

    // 计算原代收金额 = 订单总额 - 定金
    const originalCodAmount = (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);

    // 🔥 业务规则2：修改的金额不能大于原代收金额
    const newCodAmount = Number(codAmount) || 0;
    if (newCodAmount > originalCodAmount) {
      return res.status(400).json({ success: false, message: '修改的金额不能大于原代收金额' });
    }

    // 更新代收金额
    order.codAmount = newCodAmount;

    // 🔥 业务规则3和4：根据新金额决定状态
    if (newCodAmount === 0) {
      // 改为0元，标记为已改代收状态（不能再修改）
      order.codStatus = 'cancelled';
      order.codCancelledAt = new Date();
    } else {
      // 改为大于0的金额，保持待处理状态（可以继续修改）
      order.codStatus = 'pending';
      order.codCancelledAt = null;
    }

    if (codRemark !== undefined) {
      order.codRemark = codRemark;
    }

    await orderRepo.save(order);

    res.json({ success: true, message: '代收金额更新成功' });
  } catch (error: any) {
    console.error('[CodCollection] Update cod error:', error);
    res.status(500).json({ success: false, message: '更新代收金额失败' });
  }
});

/**
 * 标记返款
 * 场景：快递公司代收货款后，把钱返还给商家
 * 代收金额不变，只记录返款金额
 * 业务规则：
 * 1. 如果代收金额为0，不能标记返款
 * 2. 如果已经标记返款，不能重复标记
 */
router.put('/mark-returned/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { returnedAmount, codRemark } = req.body;

    const orderRepo = AppDataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id } });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 计算默认代收金额（用于返款金额默认值）
    // 如果用户修改过代收金额，使用修改后的值；否则使用计算值
    const defaultCodAmount = (order.codAmount !== null && order.codAmount !== undefined)
      ? Number(order.codAmount)
      : (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);

    // 🔥 业务规则1：如果代收金额为0，不能标记返款
    if (defaultCodAmount === 0) {
      return res.status(400).json({ success: false, message: '代收金额为0，无需标记返款' });
    }

    // 🔥 业务规则2：如果已经标记返款，不能重复标记
    if (order.codStatus === 'returned') {
      return res.status(400).json({ success: false, message: '订单已返款，不能重复标记' });
    }

    // 更新返款信息（代收金额不变）
    order.codStatus = 'returned';
    order.codReturnedAmount = Number(returnedAmount) || defaultCodAmount;
    order.codReturnedAt = new Date();

    if (codRemark !== undefined) {
      order.codRemark = codRemark;
    }

    await orderRepo.save(order);

    res.json({ success: true, message: '返款标记成功' });
  } catch (error: any) {
    console.error('[CodCollection] Mark returned error:', error);
    res.status(500).json({ success: false, message: '标记返款失败' });
  }
});

/**
 * 取消代收（不修改金额，只改状态）
 * 场景：客户直接付款给商家，不需要快递代收
 */
router.put('/cancel-cod/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { codAmount, codRemark } = req.body;

    const orderRepo = AppDataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id } });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 取消代收，可以修改代收金额
    order.codStatus = 'cancelled';
    order.codCancelledAt = new Date();

    // 如果传入了新的代收金额，则更新
    if (codAmount !== undefined) {
      order.codAmount = Number(codAmount) || 0;
    }

    if (codRemark !== undefined) {
      order.codRemark = codRemark;
    }

    await orderRepo.save(order);

    res.json({ success: true, message: '取消代收成功' });
  } catch (error: any) {
    console.error('[CodCollection] Cancel cod error:', error);
    res.status(500).json({ success: false, message: '取消代收失败' });
  }
});

/**
 * 批量修改代收金额（批量改代收）
 * 场景：批量将订单标记为已改代收
 */
router.put('/batch-update-cod', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderIds, codAmount, codRemark } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要操作的订单' });
    }

    const orderRepo = AppDataSource.getRepository(Order);
    const newCodAmount = Number(codAmount) || 0;

    // 批量更新：修改代收金额并标记为已改代收
    await orderRepo.update(
      { id: In(orderIds) },
      {
        codAmount: newCodAmount,
        codStatus: 'cancelled',
        codCancelledAt: new Date(),
        codRemark: codRemark || undefined
      }
    );

    res.json({ success: true, message: `批量更新 ${orderIds.length} 个订单的代收金额成功` });
  } catch (error: any) {
    console.error('[CodCollection] Batch update cod error:', error);
    res.status(500).json({ success: false, message: '批量更新代收金额失败' });
  }
});

/**
 * 批量标记返款
 * 场景：快递公司批量返款给商家
 */
router.put('/batch-mark-returned', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderIds, codRemark } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要操作的订单' });
    }

    const orderRepo = AppDataSource.getRepository(Order);

    // 获取订单并更新
    const orders = await orderRepo.find({ where: { id: In(orderIds) } });

    for (const order of orders) {
      // 计算代收金额（用于返款金额）
      // 如果用户修改过代收金额，使用修改后的值；否则使用计算值
      const codAmount = (order.codAmount !== null && order.codAmount !== undefined)
        ? Number(order.codAmount)
        : (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);

      // 标记返款（代收金额不变）
      order.codStatus = 'returned';
      order.codReturnedAmount = codAmount;
      order.codReturnedAt = new Date();
      if (codRemark) {
        order.codRemark = codRemark;
      }
    }

    await orderRepo.save(orders);

    res.json({ success: true, message: `批量标记 ${orderIds.length} 个订单返款成功` });
  } catch (error: any) {
    console.error('[CodCollection] Batch mark returned error:', error);
    res.status(500).json({ success: false, message: '批量标记返款失败' });
  }
});

/**
 * 获取部门列表
 */
router.get('/departments', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const deptRepo = AppDataSource.getRepository(Department);
    const departments = await deptRepo.find({ order: { name: 'ASC' } });
    res.json({ success: true, data: departments });
  } catch (error: any) {
    console.error('[CodCollection] Get departments error:', error);
    res.status(500).json({ success: false, message: '获取部门列表失败' });
  }
});

/**
 * 获取销售人员列表
 */
router.get('/sales-users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;
    const userRepo = AppDataSource.getRepository(User);

    const where: any = { status: 'active' };
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const users = await userRepo.find({
      where,
      select: ['id', 'name', 'departmentId'],
      order: { name: 'ASC' }
    });

    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('[CodCollection] Get sales users error:', error);
    res.status(500).json({ success: false, message: '获取销售人员列表失败' });
  }
});

export default router;

