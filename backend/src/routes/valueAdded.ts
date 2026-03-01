/**
 * 增值管理路由
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { ValueAddedOrder } from '../entities/ValueAddedOrder';
import { ValueAddedPriceConfig } from '../entities/ValueAddedPriceConfig';
import { OutsourceCompany } from '../entities/OutsourceCompany';
import { v4 as uuidv4 } from 'uuid';
import { In, Not } from 'typeorm';

const router = Router();

/**
 * 获取增值订单列表（自动从订单表同步已签收和已完成的订单）
 */
router.get('/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      status,
      settlementStatus,
      companyId,
      startDate,
      endDate,
      dateFilter, // 🔥 添加快捷日期筛选参数
      keywords,
      tab // 新增：标签页参数
    } = req.query;

    const orderRepo = AppDataSource.getRepository(ValueAddedOrder);

    // 🔥 首先从订单表同步已签收和已完成的订单
    await syncOrdersToValueAdded();

    const queryBuilder = orderRepo.createQueryBuilder('order');

    // 🔥 标签页筛选（优先级最高）
    if (tab && tab !== 'all') {
      if (tab === 'pending') {
        // 待处理：status = 'pending'
        queryBuilder.andWhere('order.status = :tabStatus', { tabStatus: 'pending' });
      } else if (tab === 'valid') {
        // 有效：status = 'valid'
        queryBuilder.andWhere('order.status = :tabStatus', { tabStatus: 'valid' });
      } else if (tab === 'invalid') {
        // 无效：status = 'invalid'
        queryBuilder.andWhere('order.status = :tabStatus', { tabStatus: 'invalid' });
      }
    }

    // 状态筛选（仅在全部标签页时生效）
    if (!tab || tab === 'all') {
      if (status && status !== 'all') {
        queryBuilder.andWhere('order.status = :status', { status });
      }
    }

    // 结算状态筛选
    if (settlementStatus && settlementStatus !== 'all') {
      queryBuilder.andWhere('order.settlement_status = :settlementStatus', { settlementStatus });
    }

    // 外包公司筛选
    if (companyId) {
      queryBuilder.andWhere('order.company_id = :companyId', { companyId });
    }

    // 🔥 日期筛选 - 支持快捷日期和自定义日期（使用order_date下单日期）
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      let filterStartDate: Date;
      let filterEndDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      switch (dateFilter) {
        case 'today':
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'thisMonth':
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          filterEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case 'lastMonth':
          filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          filterEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'thisQuarter':
          const thisQuarter = Math.floor(now.getMonth() / 3);
          filterStartDate = new Date(now.getFullYear(), thisQuarter * 3, 1);
          filterEndDate = new Date(now.getFullYear(), (thisQuarter + 1) * 3, 0, 23, 59, 59);
          break;
        case 'lastQuarter':
          const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
          const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const lastQuarterMonth = lastQuarter < 0 ? 3 : lastQuarter;
          filterStartDate = new Date(lastQuarterYear, lastQuarterMonth * 3, 1);
          filterEndDate = new Date(lastQuarterYear, (lastQuarterMonth + 1) * 3, 0, 23, 59, 59);
          break;
        case 'q1':
          filterStartDate = new Date(now.getFullYear(), 0, 1);
          filterEndDate = new Date(now.getFullYear(), 3, 0, 23, 59, 59);
          break;
        case 'q2':
          filterStartDate = new Date(now.getFullYear(), 3, 1);
          filterEndDate = new Date(now.getFullYear(), 6, 0, 23, 59, 59);
          break;
        case 'q3':
          filterStartDate = new Date(now.getFullYear(), 6, 1);
          filterEndDate = new Date(now.getFullYear(), 9, 0, 23, 59, 59);
          break;
        case 'q4':
          filterStartDate = new Date(now.getFullYear(), 9, 1);
          filterEndDate = new Date(now.getFullYear(), 12, 0, 23, 59, 59);
          break;
        case 'thisYear':
          filterStartDate = new Date(now.getFullYear(), 0, 1);
          filterEndDate = new Date(now.getFullYear(), 12, 0, 23, 59, 59);
          break;
        default:
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      queryBuilder.andWhere('order.order_date BETWEEN :startDate AND :endDate', {
        startDate: filterStartDate,
        endDate: filterEndDate
      });
    } else if (startDate && endDate) {
      // 自定义日期范围
      queryBuilder.andWhere('order.order_date BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    // 关键词搜索（订单号、客户电话、物流单号）- 支持批量搜索
    if (keywords) {
      // 处理批量关键词：支持换行符和逗号分隔
      const keywordStr = String(keywords).trim()
      const keywordList = keywordStr
        .split(/[\n,，;；]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0)

      if (keywordList.length > 0) {
        // 🔥 修复：使用 TypeORM 的命名参数而不是 ? 占位符
        const conditions = keywordList.map((kw, index) =>
          `(order.order_number = :kw${index}_1 OR order.customer_phone = :kw${index}_2 OR order.tracking_number = :kw${index}_3 OR order.customer_name LIKE :kw${index}_4)`
        ).join(' OR ')

        const params: any = {}
        keywordList.forEach((kw, index) => {
          params[`kw${index}_1`] = kw
          params[`kw${index}_2`] = kw
          params[`kw${index}_3`] = kw
          params[`kw${index}_4`] = `%${kw}%`
        })

        queryBuilder.andWhere(`(${conditions})`, params)
      }
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页
    const pageNum = parseInt(page as string);
    const size = parseInt(pageSize as string);
    queryBuilder.skip((pageNum - 1) * size).take(size);

    // 排序
    queryBuilder.orderBy('order.created_at', 'DESC');

    const list = await queryBuilder.getMany();

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: size }
    });
  } catch (error: any) {
    console.error('[ValueAdded] Get orders error:', error);
    res.status(500).json({ success: false, message: '获取订单列表失败' });
  }
});

/**
 * 从订单表同步已签收和已完成的订单到增值管理
 */
async function syncOrdersToValueAdded() {
  try {
    const { Order } = await import('../entities/Order');
    const orderRepo = AppDataSource.getRepository(Order);
    const valueAddedRepo = AppDataSource.getRepository(ValueAddedOrder);
    const priceConfigRepo = AppDataSource.getRepository(ValueAddedPriceConfig);
    const companyRepo = AppDataSource.getRepository(OutsourceCompany);

    // 查询所有已签收和已完成的订单
    const orders = await orderRepo
      .createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: ['delivered', 'completed'] })
      .getMany();

    console.log(`[ValueAdded] 找到 ${orders.length} 个已签收/已完成的订单`);

    // 获取默认公司或第一个公司
    const defaultCompany = await companyRepo.findOne({
      where: { isDefault: 1, status: 'active' }
    });

    const firstCompany = defaultCompany || await companyRepo.findOne({
      where: { status: 'active' },
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    // 获取默认价格（从第一个公司的第一个档位）
    let defaultPrice = 900; // 系统默认值
    if (firstCompany) {
      const firstTier = await priceConfigRepo.findOne({
        where: { companyId: firstCompany.id, isActive: 1 },
        order: { tierOrder: 'ASC', priority: 'DESC' }
      });
      if (firstTier) {
        defaultPrice = firstTier.unitPrice || 900;
      }
    }

    const defaultCompanyId = firstCompany?.id || 'default-company';
    const defaultCompanyName = firstCompany?.companyName || '待分配';

    for (const order of orders) {
      // 检查是否已存在
      const existing = await valueAddedRepo.findOne({
        where: { orderId: order.id }
      });

      if (!existing) {
        // 创建新的增值订单记录
        const valueAddedOrder = new ValueAddedOrder();
        valueAddedOrder.id = uuidv4();
        valueAddedOrder.orderId = order.id;
        valueAddedOrder.orderNumber = order.orderNumber;
        valueAddedOrder.customerId = order.customerId;
        valueAddedOrder.customerName = order.customerName;
        valueAddedOrder.customerPhone = order.customerPhone;
        valueAddedOrder.trackingNumber = order.trackingNumber;
        valueAddedOrder.orderStatus = order.status;
        valueAddedOrder.orderDate = order.createdAt;
        valueAddedOrder.companyId = defaultCompanyId;
        valueAddedOrder.companyName = defaultCompanyName;
        valueAddedOrder.unitPrice = defaultPrice;
        valueAddedOrder.status = 'pending';
        valueAddedOrder.settlementStatus = 'unsettled';
        valueAddedOrder.settlementAmount = 0;
        valueAddedOrder.createdBy = order.createdBy;
        valueAddedOrder.createdByName = order.createdByName;

        await valueAddedRepo.save(valueAddedOrder);
      }
    }

    console.log('[ValueAdded] 订单同步完成');
  } catch (error) {
    console.error('[ValueAdded] 订单同步失败:', error);
  }
}

/**
 * 获取统计数据
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId, dateFilter } = req.query;

    const orderRepo = AppDataSource.getRepository(ValueAddedOrder);
    const queryBuilder = orderRepo.createQueryBuilder('order');

    // 日期筛选 - 支持快捷日期和自定义日期（使用order_date下单日期）
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      let filterStartDate: Date;
      let filterEndDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      switch (dateFilter) {
        case 'today':
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'thisMonth':
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          filterEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case 'lastMonth':
          filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          filterEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'thisQuarter':
          const thisQuarter = Math.floor(now.getMonth() / 3);
          filterStartDate = new Date(now.getFullYear(), thisQuarter * 3, 1);
          filterEndDate = new Date(now.getFullYear(), (thisQuarter + 1) * 3, 0, 23, 59, 59);
          break;
        case 'lastQuarter':
          const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
          const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const lastQuarterMonth = lastQuarter < 0 ? 3 : lastQuarter;
          filterStartDate = new Date(lastQuarterYear, lastQuarterMonth * 3, 1);
          filterEndDate = new Date(lastQuarterYear, (lastQuarterMonth + 1) * 3, 0, 23, 59, 59);
          break;
        case 'q1':
          filterStartDate = new Date(now.getFullYear(), 0, 1);
          filterEndDate = new Date(now.getFullYear(), 3, 0, 23, 59, 59);
          break;
        case 'q2':
          filterStartDate = new Date(now.getFullYear(), 3, 1);
          filterEndDate = new Date(now.getFullYear(), 6, 0, 23, 59, 59);
          break;
        case 'q3':
          filterStartDate = new Date(now.getFullYear(), 6, 1);
          filterEndDate = new Date(now.getFullYear(), 9, 0, 23, 59, 59);
          break;
        case 'q4':
          filterStartDate = new Date(now.getFullYear(), 9, 1);
          filterEndDate = new Date(now.getFullYear(), 12, 0, 23, 59, 59);
          break;
        case 'thisYear':
          filterStartDate = new Date(now.getFullYear(), 0, 1);
          filterEndDate = new Date(now.getFullYear(), 12, 0, 23, 59, 59);
          break;
        default:
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      queryBuilder.where('order.order_date BETWEEN :startDate AND :endDate', {
        startDate: filterStartDate,
        endDate: filterEndDate
      });
    } else if (startDate && endDate) {
      // 自定义日期范围
      queryBuilder.where('order.order_date BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    // 公司筛选
    if (companyId) {
      queryBuilder.andWhere('order.company_id = :companyId', { companyId });
    }

    // 统计各状态数量和金额
    const [
      allData,
      pendingData,
      validData,
      invalidData,
      unsettledData,
      settledData
    ] = await Promise.all([
      // 全部资料
      queryBuilder.clone().select([
        'COUNT(*) as count',
        'SUM(order.unit_price) as amount'
      ]).getRawOne(),
      // 待处理
      queryBuilder.clone().andWhere('order.status = :status', { status: 'pending' }).select([
        'COUNT(*) as count',
        'SUM(order.unit_price) as amount'
      ]).getRawOne(),
      // 有效资料
      queryBuilder.clone().andWhere('order.status = :status', { status: 'valid' }).select([
        'COUNT(*) as count',
        'SUM(order.settlement_amount) as amount'
      ]).getRawOne(),
      // 无效资料（显示单价总额，虽然不结算）
      queryBuilder.clone().andWhere('order.status = :status', { status: 'invalid' }).select([
        'COUNT(*) as count',
        'SUM(order.unit_price) as amount'
      ]).getRawOne(),
      // 未结算
      queryBuilder.clone().andWhere('order.settlement_status = :settlementStatus', { settlementStatus: 'unsettled' }).select([
        'COUNT(*) as count',
        'SUM(order.unit_price) as amount'
      ]).getRawOne(),
      // 已结算
      queryBuilder.clone().andWhere('order.settlement_status = :settlementStatus', { settlementStatus: 'settled' }).select([
        'COUNT(*) as count',
        'SUM(order.settlement_amount) as amount'
      ]).getRawOne()
    ]);

    res.json({
      success: true,
      data: {
        all: {
          count: parseInt(allData?.count || 0),
          amount: parseFloat(allData?.amount || 0)
        },
        pending: {
          count: parseInt(pendingData?.count || 0),
          amount: parseFloat(pendingData?.amount || 0)
        },
        valid: {
          count: parseInt(validData?.count || 0),
          amount: parseFloat(validData?.amount || 0)
        },
        invalid: {
          count: parseInt(invalidData?.count || 0),
          amount: parseFloat(invalidData?.amount || 0)
        },
        unsettled: {
          count: parseInt(unsettledData?.count || 0),
          amount: parseFloat(unsettledData?.amount || 0)
        },
        settled: {
          count: parseInt(settledData?.count || 0),
          amount: parseFloat(settledData?.amount || 0)
        }
      }
    });
  } catch (error: any) {
    console.error('[ValueAdded] Get stats error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

/**
 * 创建增值订单
 */
router.post('/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      orderNumber,
      customerId,
      customerName,
      customerPhone,
      trackingNumber,
      companyId,
      companyName,
      unitPrice,
      exportDate,
      exportBatch,
      remark
    } = req.body;
    const user = (req as any).currentUser;

    if (!companyId || !companyName || !unitPrice) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    const orderRepo = AppDataSource.getRepository(ValueAddedOrder);

    const order = new ValueAddedOrder();
    order.id = uuidv4();
    order.orderNumber = orderNumber || null;
    order.customerId = customerId || null;
    order.customerName = customerName || null;
    order.customerPhone = customerPhone || null;
    order.trackingNumber = trackingNumber || null;
    order.companyId = companyId;
    order.companyName = companyName;
    order.unitPrice = unitPrice;
    order.status = 'pending';
    order.settlementStatus = 'unsettled';
    order.settlementAmount = 0;
    order.exportDate = exportDate ? new Date(exportDate) : null;
    order.exportBatch = exportBatch || null;
    order.remark = remark || null;
    order.createdBy = user.id;
    order.createdByName = user.name || user.username;

    await orderRepo.save(order);

    res.json({ success: true, message: '创建成功', data: { id: order.id } });
  } catch (error: any) {
    console.error('[ValueAdded] Create order error:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

/**
 * 批量处理订单状态
 */
router.put('/orders/batch-process', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ids, action, data } = req.body;
    const user = (req as any).currentUser;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要处理的订单' });
    }

    if (!action) {
      return res.status(400).json({ success: false, message: '请指定操作类型' });
    }

    const orderRepo = AppDataSource.getRepository(ValueAddedOrder);
    const orders = await orderRepo.findBy({ id: In(ids) });

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '未找到订单' });
    }

    // 根据操作类型更新订单
    for (const order of orders) {
      order.operatorId = user.id;
      order.operatorName = user.name || user.username;

      switch (action) {
        case 'updateStatus':
          // 更新有效状态
          const newStatus = data?.status || order.status;
          order.status = newStatus;

          // 更新备注（如果提供）
          if (data?.remark !== undefined) {
            order.remark = data.remark;
          }

          // 业务规则：如果改为非"有效"状态，自动将结算状态改为"未结算"
          if (order.status !== 'valid' && order.settlementStatus === 'settled') {
            order.settlementStatus = 'unsettled';
            order.settlementDate = null;
          }

          // 业务规则：根据结算状态计算实际结算金额
          if (order.settlementStatus === 'settled' && order.status === 'valid') {
            order.settlementAmount = order.unitPrice;
          } else {
            order.settlementAmount = 0;
          }
          break;
        case 'updateSettlementStatus':
          // 更新结算状态
          const newSettlementStatus = data?.settlementStatus || order.settlementStatus;

          // 业务规则：只有有效状态为"有效"时才能设置为"已结算"
          if (newSettlementStatus === 'settled' && order.status !== 'valid') {
            return res.status(400).json({
              success: false,
              message: '只有有效状态为"有效"的订单才能设置为已结算'
            });
          }

          order.settlementStatus = newSettlementStatus;
          if (order.settlementStatus === 'settled') {
            order.settlementDate = new Date();
            // 业务规则：已结算时，实际结算金额=单价
            order.settlementAmount = order.unitPrice;
          } else if (order.settlementStatus === 'unsettled') {
            order.settlementDate = null;
            // 业务规则：未结算时，实际结算金额=0
            order.settlementAmount = 0;
          }
          break;
        case 'mark_valid':
          order.status = 'valid';
          order.settlementAmount = order.unitPrice;
          break;
        case 'mark_invalid':
          order.status = 'invalid';
          order.settlementAmount = 0;
          order.invalidReason = data?.invalidReason || null;
          break;
        case 'mark_pending':
          order.status = 'pending';
          order.settlementAmount = 0;
          order.invalidReason = null;
          break;
        case 'mark_supplemented':
          order.status = 'supplemented';
          order.supplementOrderId = data?.supplementOrderId || null;
          break;
        case 'settle':
          order.settlementStatus = 'settled';
          order.settlementDate = new Date();
          order.settlementBatch = data?.settlementBatch || null;
          if (order.status === 'valid') {
            order.settlementAmount = order.unitPrice;
          }
          break;
        case 'unsettle':
          order.settlementStatus = 'unsettled';
          order.settlementDate = null;
          order.settlementBatch = null;
          break;
        case 'supplement':
          order.status = 'supplemented';
          order.supplementOrderId = data?.supplementOrderId || null;
          break;
        default:
          return res.status(400).json({ success: false, message: '不支持的操作类型' });
      }
    }

    await orderRepo.save(orders);

    // 更新外包公司统计
    if (action === 'updateStatus' || action === 'updateSettlementStatus' || action === 'mark_valid' || action === 'mark_invalid' || action === 'settle') {
      await updateCompanyStats(orders[0].companyId);
    }

    res.json({ success: true, message: '批量处理成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Batch process error:', error);
    res.status(500).json({ success: false, message: '批量处理失败' });
  }
});

/**
 * 更新外包公司统计数据
 */
async function updateCompanyStats(companyId: string) {
  const orderRepo = AppDataSource.getRepository(ValueAddedOrder);
  const companyRepo = AppDataSource.getRepository(OutsourceCompany);

  const [totalOrders, validOrders, invalidOrders, totalAmount, settledAmount] = await Promise.all([
    orderRepo.count({ where: { companyId } }),
    orderRepo.count({ where: { companyId, status: 'valid' } }),
    orderRepo.count({ where: { companyId, status: 'invalid' } }),
    orderRepo.createQueryBuilder('order')
      .select('SUM(order.unit_price)', 'total')
      .where('order.company_id = :companyId', { companyId })
      .getRawOne(),
    orderRepo.createQueryBuilder('order')
      .select('SUM(order.settlement_amount)', 'total')
      .where('order.company_id = :companyId AND order.settlement_status = :status', { companyId, status: 'settled' })
      .getRawOne()
  ]);

  await companyRepo.update(companyId, {
    totalOrders,
    validOrders,
    invalidOrders,
    totalAmount: parseFloat(totalAmount?.total || 0),
    settledAmount: parseFloat(settledAmount?.total || 0)
  });
}

/**
 * 获取外包公司列表
 */
router.get('/companies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, keywords } = req.query;

    const companyRepo = AppDataSource.getRepository(OutsourceCompany);
    const queryBuilder = companyRepo.createQueryBuilder('company');

    // 状态筛选
    if (status && status !== 'all') {
      queryBuilder.where('company.status = :status', { status });
    }

    // 关键词搜索
    if (keywords) {
      queryBuilder.andWhere(
        '(company.company_name LIKE :kw OR company.contact_person LIKE :kw OR company.contact_phone LIKE :kw)',
        { kw: `%${keywords}%` }
      );
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页
    const pageNum = parseInt(page as string);
    const size = parseInt(pageSize as string);
    queryBuilder.skip((pageNum - 1) * size).take(size);

    // 排序：先按sort_order，再按created_at
    queryBuilder.orderBy('company.sort_order', 'ASC').addOrderBy('company.created_at', 'DESC');

    const list = await queryBuilder.getMany();

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: size }
    });
  } catch (error: any) {
    console.error('[ValueAdded] Get companies error:', error);
    res.status(500).json({ success: false, message: '获取公司列表失败' });
  }
});

/**
 * 创建外包公司
 */
router.post('/companies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      contactPerson,
      contactPhone,
      contactEmail,
      address,
      remark
    } = req.body;
    const user = (req as any).currentUser;

    if (!companyName) {
      return res.status(400).json({ success: false, message: '请填写公司名称' });
    }

    const companyRepo = AppDataSource.getRepository(OutsourceCompany);

    // 检查公司名称是否已存在
    const existing = await companyRepo.findOne({ where: { companyName } });
    if (existing) {
      return res.status(400).json({ success: false, message: '公司名称已存在' });
    }

    const company = new OutsourceCompany();
    company.id = uuidv4();
    company.companyName = companyName;
    company.contactPerson = contactPerson || null;
    company.contactPhone = contactPhone || null;
    company.contactEmail = contactEmail || null;
    company.address = address || null;
    company.status = 'active';
    company.remark = remark || null;
    company.createdBy = user.id;
    company.createdByName = user.name || user.username;

    await companyRepo.save(company);

    res.json({ success: true, message: '创建成功', data: company });
  } catch (error: any) {
    console.error('[ValueAdded] Create company error:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

/**
 * 更新外包公司
 */
router.put('/companies/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      companyName,
      contactPerson,
      contactPhone,
      contactEmail,
      address,
      status,
      remark
    } = req.body;

    const companyRepo = AppDataSource.getRepository(OutsourceCompany);
    const company = await companyRepo.findOne({ where: { id } });

    if (!company) {
      return res.status(404).json({ success: false, message: '公司不存在' });
    }

    // 检查公司名称是否与其他公司重复
    if (companyName && companyName !== company.companyName) {
      const existing = await companyRepo.findOne({ where: { companyName } });
      if (existing) {
        return res.status(400).json({ success: false, message: '公司名称已存在' });
      }
    }

    if (companyName) company.companyName = companyName;
    if (contactPerson !== undefined) company.contactPerson = contactPerson;
    if (contactPhone !== undefined) company.contactPhone = contactPhone;
    if (contactEmail !== undefined) company.contactEmail = contactEmail;
    if (address !== undefined) company.address = address;
    if (status) company.status = status;
    if (remark !== undefined) company.remark = remark;

    await companyRepo.save(company);

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Update company error:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

/**
 * 删除外包公司
 */
router.delete('/companies/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const companyRepo = AppDataSource.getRepository(OutsourceCompany);
    const orderRepo = AppDataSource.getRepository(ValueAddedOrder);

    const company = await companyRepo.findOne({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: '公司不存在' });
    }

    // 检查是否有关联的订单
    const orderCount = await orderRepo.count({ where: { companyId: id } });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `该公司有 ${orderCount} 个关联订单，无法删除。请先停用该公司。`
      });
    }

    // 检查是否是默认公司
    if (company.isDefault === 1) {
      return res.status(400).json({
        success: false,
        message: '默认公司无法删除，请先设置其他公司为默认'
      });
    }

    await companyRepo.remove(company);

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Delete company error:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});
/**
 * 获取结算报表数据（全面版）
 */
router.get('/settlement-report', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    const orderRepo = AppDataSource.getRepository(ValueAddedOrder);

    // 构建基础查询条件（所有订单）- 按下单时间筛选
    const buildAllOrdersQuery = () => {
      const qb = orderRepo.createQueryBuilder('order');

      // 日期筛选（按下单时间）
      if (startDate && endDate) {
        qb.where('order.order_date BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string + ' 23:59:59')
        });
      }

      // 公司筛选
      if (companyId) {
        qb.andWhere('order.company_id = :companyId', { companyId });
      }

      return qb;
    };

    // 构建已结算订单查询条件 - 按下单时间筛选
    const buildSettledQuery = () => {
      const qb = orderRepo.createQueryBuilder('order');
      qb.where('order.settlement_status = :status', { status: 'settled' });

      if (startDate && endDate) {
        qb.andWhere('order.order_date BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string + ' 23:59:59')
        });
      }

      if (companyId) {
        qb.andWhere('order.company_id = :companyId', { companyId });
      }

      return qb;
    };

    // 1. 汇总统计数据
    const [
      totalStats,
      settledStats,
      unsettledStats,
      validStats,
      invalidStats,
      pendingStats
    ] = await Promise.all([
      // 全部订单
      buildAllOrdersQuery()
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'totalAmount')
        .addSelect('SUM(order.settlement_amount)', 'settledAmount')
        .getRawOne(),
      // 已结算
      buildAllOrdersQuery()
        .andWhere('order.settlement_status = :status', { status: 'settled' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.settlement_amount)', 'amount')
        .getRawOne(),
      // 未结算
      buildAllOrdersQuery()
        .andWhere('order.settlement_status = :status', { status: 'unsettled' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'amount')
        .getRawOne(),
      // 有效资料
      buildAllOrdersQuery()
        .andWhere('order.status = :status', { status: 'valid' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.settlement_amount)', 'amount')
        .getRawOne(),
      // 无效资料
      buildAllOrdersQuery()
        .andWhere('order.status = :status', { status: 'invalid' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'amount')
        .getRawOne(),
      // 待处理
      buildAllOrdersQuery()
        .andWhere('order.status = :status', { status: 'pending' })
        .select('COUNT(*)', 'count')
        .addSelect('SUM(order.unit_price)', 'amount')
        .getRawOne()
    ]);

    // 2. 按日期分组统计（已结算订单）- 按下单时间分组
    const dailyData = await buildSettledQuery()
      .select('DATE(order.order_date)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(order.settlement_amount)', 'amount')
      .addSelect('AVG(order.settlement_amount)', 'avgAmount')
      .groupBy('DATE(order.order_date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 3. 按公司分组统计（全面数据）
    const companyData = await buildAllOrdersQuery()
      .select('order.company_id', 'companyId')
      .addSelect('order.company_name', 'companyName')
      .addSelect('COUNT(*)', 'totalCount')
      .addSelect('SUM(CASE WHEN order.settlement_status = "settled" THEN 1 ELSE 0 END)', 'settledCount')
      .addSelect('SUM(CASE WHEN order.settlement_status = "unsettled" THEN 1 ELSE 0 END)', 'unsettledCount')
      .addSelect('SUM(CASE WHEN order.status = "valid" THEN 1 ELSE 0 END)', 'validCount')
      .addSelect('SUM(CASE WHEN order.status = "invalid" THEN 1 ELSE 0 END)', 'invalidCount')
      .addSelect('SUM(CASE WHEN order.status = "pending" THEN 1 ELSE 0 END)', 'pendingCount')
      .addSelect('SUM(order.settlement_amount)', 'settledAmount')
      .addSelect('SUM(CASE WHEN order.settlement_status = "unsettled" THEN order.unit_price ELSE 0 END)', 'unsettledAmount')
      .addSelect('AVG(CASE WHEN order.settlement_status = "settled" THEN order.settlement_amount ELSE NULL END)', 'avgSettledAmount')
      .addSelect('MIN(order.settlement_date)', 'firstSettlementDate')
      .addSelect('MAX(order.settlement_date)', 'lastSettlementDate')
      .groupBy('order.company_id')
      .addGroupBy('order.company_name')
      .orderBy('settledAmount', 'DESC')
      .getRawMany();

    // 4. 有效率和结算率趋势（按日期）- 按下单时间分组
    const trendData = await buildAllOrdersQuery()
      .select('DATE(order.order_date)', 'date')
      .addSelect('COUNT(*)', 'totalCount')
      .addSelect('SUM(CASE WHEN order.status = "valid" THEN 1 ELSE 0 END)', 'validCount')
      .addSelect('SUM(CASE WHEN order.settlement_status = "settled" THEN 1 ELSE 0 END)', 'settledCount')
      .groupBy('DATE(order.order_date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // 5. 状态分布统计
    const statusDistribution = await buildAllOrdersQuery()
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(order.unit_price)', 'amount')
      .groupBy('order.status')
      .getRawMany();

    res.json({
      success: true,
      data: {
        // 汇总统计
        summary: {
          total: {
            count: parseInt(totalStats?.count || 0),
            totalAmount: parseFloat(totalStats?.totalAmount || 0),
            settledAmount: parseFloat(totalStats?.settledAmount || 0)
          },
          settled: {
            count: parseInt(settledStats?.count || 0),
            amount: parseFloat(settledStats?.amount || 0)
          },
          unsettled: {
            count: parseInt(unsettledStats?.count || 0),
            amount: parseFloat(unsettledStats?.amount || 0)
          },
          valid: {
            count: parseInt(validStats?.count || 0),
            amount: parseFloat(validStats?.amount || 0)
          },
          invalid: {
            count: parseInt(invalidStats?.count || 0),
            amount: parseFloat(invalidStats?.amount || 0)
          },
          pending: {
            count: parseInt(pendingStats?.count || 0),
            amount: parseFloat(pendingStats?.amount || 0)
          }
        },
        // 按日期统计（已结算）
        dailyData: dailyData.map(item => ({
          date: item.date,
          count: parseInt(item.count),
          amount: parseFloat(item.amount || 0),
          avgAmount: parseFloat(item.avgAmount || 0)
        })),
        // 按公司统计
        companyData: companyData.map(item => ({
          companyId: item.companyId,
          companyName: item.companyName,
          totalCount: parseInt(item.totalCount || 0),
          settledCount: parseInt(item.settledCount || 0),
          unsettledCount: parseInt(item.unsettledCount || 0),
          validCount: parseInt(item.validCount || 0),
          invalidCount: parseInt(item.invalidCount || 0),
          pendingCount: parseInt(item.pendingCount || 0),
          settledAmount: parseFloat(item.settledAmount || 0),
          unsettledAmount: parseFloat(item.unsettledAmount || 0),
          avgSettledAmount: parseFloat(item.avgSettledAmount || 0),
          firstSettlementDate: item.firstSettlementDate,
          lastSettlementDate: item.lastSettlementDate
        })),
        // 趋势数据
        trendData: trendData.map(item => ({
          date: item.date,
          totalCount: parseInt(item.totalCount || 0),
          validCount: parseInt(item.validCount || 0),
          settledCount: parseInt(item.settledCount || 0),
          validRate: parseInt(item.totalCount || 0) > 0
            ? (parseInt(item.validCount || 0) / parseInt(item.totalCount || 0) * 100).toFixed(2)
            : '0.00',
          settlementRate: parseInt(item.totalCount || 0) > 0
            ? (parseInt(item.settledCount || 0) / parseInt(item.totalCount || 0) * 100).toFixed(2)
            : '0.00'
        })),
        // 状态分布
        statusDistribution: statusDistribution.map(item => ({
          status: item.status,
          count: parseInt(item.count || 0),
          amount: parseFloat(item.amount || 0)
        }))
      }
    });
  } catch (error: any) {
    console.error('[ValueAdded] Get settlement report error:', error);
    res.status(500).json({ success: false, message: '获取报表数据失败' });
  }
});

/**
 * 获取状态配置列表
 */
router.get('/status-configs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ValueAddedStatusConfig } = await import('../entities/ValueAddedStatusConfig');
    const configRepo = AppDataSource.getRepository(ValueAddedStatusConfig);

    const validStatus = await configRepo.find({ where: { type: 'validStatus' }, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    const settlementStatus = await configRepo.find({ where: { type: 'settlementStatus' }, order: { sortOrder: 'ASC', createdAt: 'ASC' } });

    res.json({
      success: true,
      data: {
        validStatus,
        settlementStatus
      }
    });
  } catch (error: any) {
    console.error('[ValueAdded] Get status configs error:', error);
    res.status(500).json({ success: false, message: '获取状态配置失败' });
  }
});

/**
 * 添加状态配置
 */
router.post('/status-configs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, value, label } = req.body;

    if (!type || !value || !label) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    const { ValueAddedStatusConfig } = await import('../entities/ValueAddedStatusConfig');
    const configRepo = AppDataSource.getRepository(ValueAddedStatusConfig);

    // 检查是否已存在
    const existing = await configRepo.findOne({ where: { type, value } });
    if (existing) {
      return res.status(400).json({ success: false, message: '该状态已存在' });
    }

    const config = new ValueAddedStatusConfig();
    config.type = type;
    config.value = value;
    config.label = label;

    await configRepo.save(config);

    res.json({ success: true, message: '添加成功', data: { id: config.id } });
  } catch (error: any) {
    console.error('[ValueAdded] Add status config error:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

/**
 * 删除状态配置
 */
router.delete('/status-configs/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { ValueAddedStatusConfig } = await import('../entities/ValueAddedStatusConfig');
    const configRepo = AppDataSource.getRepository(ValueAddedStatusConfig);
    const config = await configRepo.findOne({ where: { id } });

    if (!config) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    await configRepo.remove(config);

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Delete status config error:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/**
 * 公司排序
 */
router.put('/companies/sort', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companies } = req.body;

    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    const companyRepo = AppDataSource.getRepository(OutsourceCompany);

    // 批量更新排序
    for (let i = 0; i < companies.length; i++) {
      await companyRepo.update(companies[i].id, { sortOrder: i + 1 });
    }

    res.json({ success: true, message: '排序成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Sort companies error:', error);
    res.status(500).json({ success: false, message: '排序失败' });
  }
});

/**
 * 设置默认公司
 */
router.put('/companies/:id/set-default', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const companyRepo = AppDataSource.getRepository(OutsourceCompany);

    // 🔥 支持取消默认：如果id为'none'，则取消所有默认
    if (id === 'none') {
      // 查找所有公司并更新
      const allCompanies = await companyRepo.find();
      for (const company of allCompanies) {
        await companyRepo.update(company.id, { isDefault: 0 });
      }
      return res.json({ success: true, message: '已取消默认公司' });
    }

    // 取消所有公司的默认状态
    const allCompanies = await companyRepo.find();
    for (const company of allCompanies) {
      await companyRepo.update(company.id, { isDefault: 0 });
    }

    // 设置当前公司为默认
    await companyRepo.update(id, { isDefault: 1, sortOrder: 1 });

    // 重新排序其他公司
    const otherCompanies = await companyRepo.find({
      where: { id: Not(id) },
      order: { sortOrder: 'ASC' }
    });

    for (let i = 0; i < otherCompanies.length; i++) {
      await companyRepo.update(otherCompanies[i].id, { sortOrder: i + 2 });
    }

    res.json({ success: true, message: '设置成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Set default company error:', error);
    res.status(500).json({ success: false, message: '设置失败' });
  }
});

/**
 * 批量修改订单公司
 */
router.put('/orders/batch-update-company', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ids, companyId, companyName, unitPrice: providedUnitPrice } = req.body;
    const user = (req as any).currentUser;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要处理的订单' });
    }

    if (!companyId || !companyName) {
      return res.status(400).json({ success: false, message: '请选择外包公司' });
    }

    const orderRepo = AppDataSource.getRepository(ValueAddedOrder);

    let unitPrice = 0; // 默认单价为0（待分配）

    // 🔥 如果前端提供了单价，优先使用前端的值
    if (providedUnitPrice !== undefined && providedUnitPrice !== null) {
      unitPrice = Number(providedUnitPrice);
    } else if (companyId !== 'default-company') {
      // 🔥 如果不是"待分配"且前端未提供单价，则从数据库获取
      const priceConfigRepo = AppDataSource.getRepository(ValueAddedPriceConfig);
      const priceTier = await priceConfigRepo.findOne({
        where: { companyId, isActive: 1 },
        order: { priority: 'DESC', tierOrder: 'ASC' }
      });

      if (priceTier && priceTier.pricingType === 'fixed') {
        unitPrice = priceTier.unitPrice || 0;
      }
    }

    // 批量更新订单
    const orders = await orderRepo.findBy({ id: In(ids) });
    for (const order of orders) {
      order.companyId = companyId;
      order.companyName = companyName;
      order.unitPrice = unitPrice;
      order.operatorId = user.id;
      order.operatorName = user.name || user.username;
    }

    await orderRepo.save(orders);

    // 更新公司统计
    await updateCompanyStats(companyId);

    res.json({ success: true, message: '批量修改成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Batch update company error:', error);
    res.status(500).json({ success: false, message: '批量修改失败' });
  }
});

/**
 * 修改单个订单公司
 */
router.put('/orders/:id/company', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { companyId, companyName, unitPrice: providedUnitPrice } = req.body;
    const user = (req as any).currentUser;

    if (!companyId || !companyName) {
      return res.status(400).json({ success: false, message: '请选择外包公司' });
    }

    const orderRepo = AppDataSource.getRepository(ValueAddedOrder);

    const order = await orderRepo.findOne({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    let unitPrice = 0; // 默认单价为0（待分配）

    // 🔥 如果前端提供了单价，优先使用前端的值
    if (providedUnitPrice !== undefined && providedUnitPrice !== null) {
      unitPrice = Number(providedUnitPrice);
    } else if (companyId !== 'default-company') {
      // 🔥 如果不是"待分配"且前端未提供单价，则从数据库获取
      const companyRepo = AppDataSource.getRepository(OutsourceCompany);
      const company = await companyRepo.findOne({ where: { id: companyId } });

      if (company) {
        // 获取公司的最高优先级档位
        const priceConfigRepo = AppDataSource.getRepository(ValueAddedPriceConfig);
        const priceTier = await priceConfigRepo.findOne({
          where: { companyId, isActive: 1 },
          order: { priority: 'DESC', tierOrder: 'ASC' }
        });

        if (priceTier && priceTier.pricingType === 'fixed') {
          unitPrice = priceTier.unitPrice || 0;
        }
      }
    }

    // 更新订单
    order.companyId = companyId;
    order.companyName = companyName;
    order.unitPrice = unitPrice;
    order.operatorId = user.id;
    order.operatorName = user.name || user.username;

    await orderRepo.save(order);

    // 更新公司统计
    await updateCompanyStats(companyId);

    res.json({ success: true, message: '修改成功', data: { unitPrice } });
  } catch (error: any) {
    console.error('[ValueAdded] Update order company error:', error);
    res.status(500).json({ success: false, message: '修改失败' });
  }
});

/**
 * 公司排序
 */
router.put('/companies/sort', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companies } = req.body;

    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    const companyRepo = AppDataSource.getRepository(OutsourceCompany);

    // 批量更新排序
    for (let i = 0; i < companies.length; i++) {
      await companyRepo.update(companies[i].id, { sortOrder: i + 1 });
    }

    res.json({ success: true, message: '排序成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Sort companies error:', error);
    res.status(500).json({ success: false, message: '排序失败' });
  }
});

/**
 * ============================================
 * 价格档位管理 API（新版多档位系统）
 * ============================================
 */

/**
 * 获取公司的价格档位列表
 */
router.get('/companies/:companyId/price-tiers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const configRepo = AppDataSource.getRepository(ValueAddedPriceConfig);

    const tiers = await configRepo.find({
      where: { companyId },
      order: { tierOrder: 'ASC', priority: 'DESC', createdAt: 'DESC' }
    });

    res.json({ success: true, data: tiers });
  } catch (error: any) {
    console.error('[ValueAdded] Get price tiers error:', error);
    res.status(500).json({ success: false, message: '获取价格档位失败' });
  }
});

/**
 * 创建价格档位
 */
router.post('/companies/:companyId/price-tiers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const user = (req as any).currentUser;
    const {
      tierName,
      tierOrder = 1,
      pricingType = 'fixed',
      unitPrice = 0,
      percentageRate = 0,
      baseAmountField = 'orderAmount',
      startDate,
      endDate,
      isActive = 1,
      priority = 0,
      remark
    } = req.body;

    if (!tierName) {
      return res.status(400).json({ success: false, message: '请输入档位名称' });
    }

    if (pricingType === 'fixed' && (!unitPrice || unitPrice <= 0)) {
      return res.status(400).json({ success: false, message: '按单计价时请输入有效的单价' });
    }

    if (pricingType === 'percentage' && (!percentageRate || percentageRate <= 0)) {
      return res.status(400).json({ success: false, message: '按比例计价时请输入有效的比例' });
    }

    const configRepo = AppDataSource.getRepository(ValueAddedPriceConfig);
    const tier = new ValueAddedPriceConfig();

    tier.id = uuidv4();
    tier.companyId = companyId;
    tier.tierName = tierName;
    tier.tierOrder = tierOrder;
    tier.pricingType = pricingType;
    tier.unitPrice = unitPrice;
    tier.percentageRate = percentageRate;
    tier.baseAmountField = baseAmountField;
    tier.startDate = startDate || null;
    tier.endDate = endDate || null;
    tier.isActive = isActive;
    tier.priority = priority;
    tier.remark = remark || null;
    tier.createdBy = user.id;
    tier.createdByName = user.name || user.username;

    await configRepo.save(tier);

    res.json({ success: true, message: '创建成功', data: { id: tier.id } });
  } catch (error: any) {
    console.error('[ValueAdded] Create price tier error:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

/**
 * 更新价格档位
 */
router.put('/companies/:companyId/price-tiers/:tierId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    const {
      tierName,
      tierOrder,
      pricingType,
      unitPrice,
      percentageRate,
      baseAmountField,
      startDate,
      endDate,
      isActive,
      priority,
      remark
    } = req.body;

    const configRepo = AppDataSource.getRepository(ValueAddedPriceConfig);
    const tier = await configRepo.findOne({ where: { id: tierId } });

    if (!tier) {
      return res.status(404).json({ success: false, message: '档位不存在' });
    }

    if (tierName) tier.tierName = tierName;
    if (tierOrder !== undefined) tier.tierOrder = tierOrder;
    if (pricingType) tier.pricingType = pricingType;
    if (unitPrice !== undefined) tier.unitPrice = unitPrice;
    if (percentageRate !== undefined) tier.percentageRate = percentageRate;
    if (baseAmountField) tier.baseAmountField = baseAmountField;
    if (startDate !== undefined) tier.startDate = startDate || null;
    if (endDate !== undefined) tier.endDate = endDate || null;
    if (isActive !== undefined) tier.isActive = isActive;
    if (priority !== undefined) tier.priority = priority;
    if (remark !== undefined) tier.remark = remark;

    await configRepo.save(tier);

    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Update price tier error:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

/**
 * 删除价格档位
 */
router.delete('/companies/:companyId/price-tiers/:tierId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    const configRepo = AppDataSource.getRepository(ValueAddedPriceConfig);

    const tier = await configRepo.findOne({ where: { id: tierId } });
    if (!tier) {
      return res.status(404).json({ success: false, message: '档位不存在' });
    }

    await configRepo.remove(tier);

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('[ValueAdded] Delete price tier error:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/**
 * 计算订单价格（根据档位配置）
 * 内部辅助函数 - 预留用于自动价格计算
 */
function _calculateOrderPrice(order: any, company: any, priceTiers: ValueAddedPriceConfig[]): number {
  // 1. 待分配
  if (order.companyId === 'default-company' || !order.companyId) {
    return 0;
  }

  // 2. 查找匹配的价格档位
  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
  const matchedTier = findMatchingPriceTier(priceTiers, orderDate);

  // 3. 根据档位计算价格
  if (matchedTier) {
    if (matchedTier.pricingType === 'fixed') {
      return matchedTier.unitPrice;
    } else if (matchedTier.pricingType === 'percentage') {
      const baseAmount = order[matchedTier.baseAmountField] || 0;
      return Number((baseAmount * (matchedTier.percentageRate / 100)).toFixed(2));
    }
  }

  // 4. 使用公司默认单价
  return company?.defaultUnitPrice || 0;
}

/**
 * 查找匹配的价格档位
 */
function findMatchingPriceTier(tiers: ValueAddedPriceConfig[], orderDate: Date): ValueAddedPriceConfig | null {
  // 只考虑启用的档位
  const activeTiers = tiers.filter(t => t.isActive === 1);

  // 过滤出日期范围匹配的档位
  const matchedTiers = activeTiers.filter(tier => {
    // 没有设置日期范围，永久有效
    if (!tier.startDate && !tier.endDate) {
      return true;
    }

    const start = tier.startDate ? new Date(tier.startDate) : null;
    const end = tier.endDate ? new Date(tier.endDate) : null;

    // 只有开始日期
    if (start && !end) {
      return orderDate >= start;
    }

    // 只有结束日期
    if (!start && end) {
      return orderDate <= end;
    }

    // 有开始和结束日期
    if (start && end) {
      return orderDate >= start && orderDate <= end;
    }

    return false;
  });

  // 按优先级降序排序，取第一个
  if (matchedTiers.length > 0) {
    matchedTiers.sort((a, b) => b.priority - a.priority);
    return matchedTiers[0];
  }

  return null;
}

/**
 * 获取备注预设列表
 */
router.get('/remark-presets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const query = `
      SELECT id, remark_text, category, sort_order, is_active, usage_count
      FROM value_added_remark_presets
      WHERE is_active = 1
      ${category ? 'AND category = ?' : ''}
      ORDER BY category, sort_order ASC
    `;

    const params = category ? [category] : [];
    const presets = await AppDataSource.query(query, params);

    res.json({
      success: true,
      data: presets
    });
  } catch (error: any) {
    console.error('获取备注预设失败:', error);
    res.status(500).json({
      success: false,
      message: '获取备注预设失败',
      error: error.message
    });
  }
});

/**
 * 创建备注预设
 */
router.post('/remark-presets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { remarkText, category = 'general', sortOrder = 0 } = req.body;

    if (!remarkText) {
      return res.status(400).json({
        success: false,
        message: '备注内容不能为空'
      });
    }

    const id = uuidv4();
    await AppDataSource.query(
      `INSERT INTO value_added_remark_presets (id, remark_text, category, sort_order, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [id, remarkText, category, sortOrder]
    );

    res.json({
      success: true,
      message: '创建成功',
      data: { id }
    });
  } catch (error: any) {
    console.error('创建备注预设失败:', error);
    res.status(500).json({
      success: false,
      message: '创建备注预设失败',
      error: error.message
    });
  }
});

/**
 * 更新备注预设
 */
router.put('/remark-presets/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarkText, category, sortOrder, isActive } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (remarkText !== undefined) {
      updates.push('remark_text = ?');
      params.push(remarkText);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      });
    }

    params.push(id);
    await AppDataSource.query(
      `UPDATE value_added_remark_presets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error: any) {
    console.error('更新备注预设失败:', error);
    res.status(500).json({
      success: false,
      message: '更新备注预设失败',
      error: error.message
    });
  }
});

/**
 * 删除备注预设
 */
router.delete('/remark-presets/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await AppDataSource.query(
      'DELETE FROM value_added_remark_presets WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error: any) {
    console.error('删除备注预设失败:', error);
    res.status(500).json({
      success: false,
      message: '删除备注预设失败',
      error: error.message
    });
  }
});

/**
 * 增加备注预设使用次数
 */
router.post('/remark-presets/:id/increment-usage', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await AppDataSource.query(
      'UPDATE value_added_remark_presets SET usage_count = usage_count + 1 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error: any) {
    console.error('更新使用次数失败:', error);
    res.status(500).json({
      success: false,
      message: '更新使用次数失败',
      error: error.message
    });
  }
});

export default router;
