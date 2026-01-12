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
import { Between, In, Not } from 'typeorm';

const router = Router();

// 排除的订单状态（不计入代收统计）
const EXCLUDED_STATUSES = ['rejected', 'logistics_returned', 'exception', 'cancelled'];

// 已发货的订单状态（出现在代收列表中）
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

    // 日期筛选
    if (startDate && endDate) {
      baseWhere.shippedAt = Between(new Date(startDate as string), new Date(endDate as string + ' 23:59:59'));
    }

    // 部门筛选
    if (departmentId) {
      baseWhere.createdByDepartmentId = departmentId;
    }

    // 销售人员筛选
    if (salesPersonId) {
      baseWhere.createdBy = salesPersonId;
    }

    // 今日日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 当月日期范围
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // 今日代收（今日发货的订单代收金额，排除异常状态）
    const todayOrders = await orderRepo.find({
      where: {
        ...baseWhere,
        shippedAt: Between(today, todayEnd),
        status: Not(In(EXCLUDED_STATUSES))
      },
      select: ['codAmount', 'totalAmount', 'depositAmount']
    });
    const todayCod = todayOrders.reduce((sum, o) => {
      // 代收金额逻辑：如果cod_amount有值则使用，否则使用 总额-定金
      const calculatedCod = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      const codAmount = (o.codAmount !== null && o.codAmount !== undefined && Number(o.codAmount) > 0)
        ? Number(o.codAmount)
        : calculatedCod;
      return sum + codAmount;
    }, 0);

    // 当月代收（当月发货的订单代收金额，排除异常状态）
    const monthOrders = await orderRepo.find({
      where: {
        ...baseWhere,
        shippedAt: Between(monthStart, monthEnd),
        status: Not(In(EXCLUDED_STATUSES))
      },
      select: ['codAmount', 'totalAmount', 'depositAmount']
    });
    const monthCod = monthOrders.reduce((sum, o) => {
      const calculatedCod = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      const codAmount = (o.codAmount !== null && o.codAmount !== undefined && Number(o.codAmount) > 0)
        ? Number(o.codAmount)
        : calculatedCod;
      return sum + codAmount;
    }, 0);

    // 取消代收金额（当月）
    const cancelledOrders = await orderRepo.find({
      where: {
        ...baseWhere,
        codStatus: 'cancelled',
        codCancelledAt: Between(monthStart, monthEnd)
      },
      select: ['codAmount', 'totalAmount', 'depositAmount']
    });
    const cancelledCod = cancelledOrders.reduce((sum, o) => {
      const calculatedCod = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      const codAmount = (o.codAmount !== null && o.codAmount !== undefined && Number(o.codAmount) > 0)
        ? Number(o.codAmount)
        : calculatedCod;
      return sum + codAmount;
    }, 0);

    // 已返款金额（当月）
    const returnedOrders = await orderRepo.find({
      where: {
        ...baseWhere,
        codStatus: 'returned',
        codReturnedAt: Between(monthStart, monthEnd)
      },
      select: ['codReturnedAmount']
    });
    const returnedCod = returnedOrders.reduce((sum, o) => sum + Number(o.codReturnedAmount || 0), 0);

    // 未返款金额（当月发货且未返款的订单）
    const pendingOrders = await orderRepo.find({
      where: {
        ...baseWhere,
        shippedAt: Between(monthStart, monthEnd),
        codStatus: 'pending',
        status: Not(In(EXCLUDED_STATUSES))
      },
      select: ['codAmount', 'totalAmount', 'depositAmount']
    });
    const pendingCod = pendingOrders.reduce((sum, o) => {
      const calculatedCod = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      const codAmount = (o.codAmount !== null && o.codAmount !== undefined && Number(o.codAmount) > 0)
        ? Number(o.codAmount)
        : calculatedCod;
      return sum + codAmount;
    }, 0);

    res.json({
      success: true,
      data: {
        todayCod: Number(todayCod.toFixed(2)),
        monthCod: Number(monthCod.toFixed(2)),
        cancelledCod: Number(cancelledCod.toFixed(2)),
        returnedCod: Number(returnedCod.toFixed(2)),
        pendingCod: Number(pendingCod.toFixed(2))
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
    } else if (tab === 'returned') {
      queryBuilder.andWhere('o.cod_status = :codStatus', { codStatus: 'returned' });
    } else if (tab === 'cancelled') {
      queryBuilder.andWhere('o.cod_status = :codStatus', { codStatus: 'cancelled' });
    }

    // 日期筛选（发货日期）
    if (startDate && endDate) {
      queryBuilder.andWhere('o.shipped_at BETWEEN :startDate AND :endDate', {
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

    // 排序
    queryBuilder.orderBy('o.shipped_at', 'DESC');

    const orders = await queryBuilder.getMany();

    // 格式化返回数据
    const list = orders.map(o => {
      // 代收金额逻辑：如果cod_amount有值则使用，否则使用 总额-定金
      const calculatedCod = (Number(o.totalAmount) || 0) - (Number(o.depositAmount) || 0);
      const codAmount = (o.codAmount !== null && o.codAmount !== undefined && Number(o.codAmount) > 0)
        ? Number(o.codAmount)
        : calculatedCod;

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerId: o.customerId,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        status: o.status,
        totalAmount: o.totalAmount,
        finalAmount: o.finalAmount,
        depositAmount: o.depositAmount,
        codAmount: codAmount,
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

    // 代收金额逻辑：如果cod_amount有值则使用，否则使用 总额-定金
    const calculatedCod = (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);
    const codAmount = (order.codAmount !== null && order.codAmount !== undefined && Number(order.codAmount) > 0)
      ? Number(order.codAmount)
      : calculatedCod;

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
        codAmount: codAmount,
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

    // 更新代收金额
    const newCodAmount = Number(codAmount) || 0;
    order.codAmount = newCodAmount;

    // 标记为已改代收状态
    order.codStatus = 'cancelled';
    order.codCancelledAt = new Date();

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
    const calculatedCod = (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);
    const defaultCodAmount = (order.codAmount !== null && order.codAmount !== undefined && Number(order.codAmount) > 0)
      ? Number(order.codAmount)
      : calculatedCod;

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
      const calculatedCod = (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);
      const codAmount = (order.codAmount !== null && order.codAmount !== undefined && Number(order.codAmount) > 0)
        ? Number(order.codAmount)
        : calculatedCod;

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
