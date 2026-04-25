/**
 * 增值管理模块 - 订单相关路由
 * 包含：增值订单列表、统计、创建、批量处理、结算报告
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { ValueAddedOrder } from '../../entities/ValueAddedOrder';
import { ValueAddedPriceConfig } from '../../entities/ValueAddedPriceConfig';
import { OutsourceCompany } from '../../entities/OutsourceCompany';
import { v4 as uuidv4 } from 'uuid';
import { In, Not } from 'typeorm';
import { getTenantRepo, tenantSQL } from '../../utils/tenantRepo';

import { log } from '../../config/logger';

// 🔥 同步节流机制：每个租户最多每2分钟同步一次，避免每次查询都触发同步导致性能严重下降
const syncThrottleMap = new Map<string, number>(); // tenantKey -> lastSyncTimestamp
const SYNC_THROTTLE_MS = 2 * 60 * 1000; // 2分钟节流间隔

export function registerOrderRoutes(router: Router): void {
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

    const orderRepo = getTenantRepo(ValueAddedOrder);

    // 🔥 性能优化：同步操作加节流，每2分钟最多执行一次
    // 注意：必须await等待同步完成，否则新签收订单无法立即显示
    const tenantKey = (req as any).currentUser?.tenantId || 'default';
    const lastSync = syncThrottleMap.get(tenantKey) || 0;
    const now = Date.now();
    // 🔥 无数据时跳过节流，强制同步（确保首次访问能看到数据）
    const currentCount = await orderRepo.count();
    const shouldSync = currentCount === 0 || (now - lastSync > SYNC_THROTTLE_MS);
    if (shouldSync) {
      syncThrottleMap.set(tenantKey, now);
      try {
        await syncOrdersToValueAddedOptimized();
      } catch (syncError) {
        log.error('[ValueAdded] 同步失败，但继续查询:', syncError);
      }
    }

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
      const keywordStr = String(keywords).trim();
      const keywordList = keywordStr
        .split(/[\n,，;；]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      if (keywordList.length > 0) {
        // 🔥 使用 OR 条件组合多个关键词
        const conditions = keywordList.map((_kw, index) =>
          `(order.order_number = :kw${index}_1 OR order.customer_phone = :kw${index}_2 OR order.tracking_number = :kw${index}_3 OR order.customer_name LIKE :kw${index}_4)`
        ).join(' OR ');

        const params: any = {};
        keywordList.forEach((kw, index) => {
          params[`kw${index}_1`] = kw;
          params[`kw${index}_2`] = kw;
          params[`kw${index}_3`] = kw;
          params[`kw${index}_4`] = `%${kw}%`;
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
    queryBuilder.orderBy('order.created_at', 'DESC');

    log.info(`[ValueAdded] 开始执行查询，分页: page=${pageNum}, size=${size}`);
    const list = await queryBuilder.getMany();
    log.info(`[ValueAdded] 查询成功，返回 ${list.length} 条记录`);

    // 🔥 数据清理和验证，确保所有字段都有有效值
    const cleanedList = list.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice) || 0,
      settlementAmount: Number(item.settlementAmount) || 0,
      orderNumber: item.orderNumber || '',
      customerName: item.customerName || '',
      customerPhone: item.customerPhone || '',
      trackingNumber: item.trackingNumber || '',
      expressCompany: item.expressCompany || '',
      status: item.status || 'pending',
      settlementStatus: item.settlementStatus || 'unsettled',
      companyName: item.companyName || '待分配',
      orderStatus: item.orderStatus || '',
      remark: item.remark || null
    }));

    res.json({
      success: true,
      data: { list: cleanedList, total, page: pageNum, pageSize: size }
    });
  } catch (error: any) {
    log.error('[ValueAdded] Get orders error:', error);
    log.error('[ValueAdded] Error stack:', error.stack);
    log.error('[ValueAdded] Query params:', JSON.stringify(req.query));
    res.status(500).json({
      success: false,
      message: '获取订单列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 从订单表同步已签收和已完成的订单到增值管理（优化版）
 * 优化点：
 * 1. 只查询最近30天的订单（减少查询量）
 * 2. 使用批量查询检查是否存在（减少数据库往返）
 * 3. 使用批量插入（提升插入性能）
 */
async function syncOrdersToValueAddedOptimized() {
  try {
    const { Order } = await import('../../entities/Order');
    const orderRepo = getTenantRepo(Order);
    const valueAddedRepo = getTenantRepo(ValueAddedOrder);
    const companyRepo = getTenantRepo(OutsourceCompany);

    // 🔥 优化1：只查询最近30天的已签收和已完成订单
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await orderRepo
      .createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: ['delivered', 'completed'] })
      .andWhere('order.created_at >= :startDate', { startDate: thirtyDaysAgo })
      .getMany();

    if (orders.length === 0) {
      log.info('[ValueAdded] 没有需要同步的订单');
      return;
    }

    log.info(`[ValueAdded] 找到 ${orders.length} 个最近30天的已签收/已完成订单`);

    // 🔥 优化2：批量查询已存在的订单ID
    const orderIds = orders.map(o => o.id);
    const existingOrders = await valueAddedRepo
      .createQueryBuilder('vo')
      .select('vo.orderId')
      .where('vo.orderId IN (:...orderIds)', { orderIds })
      .getMany();

    const existingOrderIds = new Set(existingOrders.map(o => o.orderId));
    const newOrders = orders.filter(o => !existingOrderIds.has(o.id));

    if (newOrders.length === 0) {
      log.info('[ValueAdded] 所有订单已同步，无需处理');
      return;
    }

    log.info(`[ValueAdded] 需要同步 ${newOrders.length} 个新订单`);

    // 获取默认公司和价格
    const defaultCompany = await companyRepo.findOne({
      where: { isDefault: 1, status: 'active' }
    });

    const firstCompany = defaultCompany || await companyRepo.findOne({
      where: { status: 'active' },
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    const defaultCompanyId = firstCompany?.id || 'default-company';
    const defaultCompanyName = firstCompany?.companyName || '待分配';

    // 🔥 优化3：批量创建记录，根据每个订单的下单日期动态匹配价格档位
    const valueAddedOrders: ValueAddedOrder[] = [];
    for (const order of newOrders) {
      const valueAddedOrder = new ValueAddedOrder();
      valueAddedOrder.id = uuidv4();
      valueAddedOrder.orderId = order.id;
      valueAddedOrder.orderNumber = order.orderNumber;
      valueAddedOrder.customerId = order.customerId;
      valueAddedOrder.customerName = order.customerName;
      valueAddedOrder.customerPhone = order.customerPhone;
      valueAddedOrder.trackingNumber = order.trackingNumber;
      // 🔥 安全处理 expressCompany 字段
      if (order.expressCompany !== undefined) {
        valueAddedOrder.expressCompany = order.expressCompany;
      }
      valueAddedOrder.orderStatus = order.status;
      valueAddedOrder.orderDate = order.createdAt;
      valueAddedOrder.companyId = defaultCompanyId;
      valueAddedOrder.companyName = defaultCompanyName;
      // 🔥 根据订单下单日期动态匹配价格档位
      if (firstCompany) {
        valueAddedOrder.unitPrice = await findPriceByOrderDate(firstCompany.id, order.createdAt);
      } else {
        valueAddedOrder.unitPrice = 0;
      }
      valueAddedOrder.status = 'pending';
      valueAddedOrder.settlementStatus = 'unsettled';
      valueAddedOrder.settlementAmount = 0;
      valueAddedOrder.createdBy = order.createdBy;
      valueAddedOrder.createdByName = order.createdByName;
      valueAddedOrders.push(valueAddedOrder);
    }

    // 批量插入（每次最多500条）
    const batchSize = 500;
    for (let i = 0; i < valueAddedOrders.length; i += batchSize) {
      const batch = valueAddedOrders.slice(i, i + batchSize);
      await valueAddedRepo.save(batch);
      log.info(`[ValueAdded] 已同步 ${Math.min(i + batchSize, valueAddedOrders.length)}/${valueAddedOrders.length} 条记录`);
    }

    log.info('[ValueAdded] 订单同步完成');
  } catch (error) {
    log.error('[ValueAdded] 订单同步失败:', error);
  }
}

/**
 * 旧版同步函数（保留用于手动触发）
 */
async function syncOrdersToValueAdded() {
  try {
    const { Order } = await import('../../entities/Order');
    const orderRepo = getTenantRepo(Order);
    const valueAddedRepo = getTenantRepo(ValueAddedOrder);
    const companyRepo = getTenantRepo(OutsourceCompany);

    // 查询所有已签收和已完成的订单
    const orders = await orderRepo
      .createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: ['delivered', 'completed'] })
      .getMany();

    log.info(`[ValueAdded] 找到 ${orders.length} 个已签收/已完成的订单`);

    // 获取默认公司或第一个公司
    const defaultCompany = await companyRepo.findOne({
      where: { isDefault: 1, status: 'active' }
    });

    const firstCompany = defaultCompany || await companyRepo.findOne({
      where: { status: 'active' },
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    // 获取默认价格（从第一个公司的第一个档位）- 仅作为兜底
    const defaultCompanyId = firstCompany?.id || 'default-company';
    const defaultCompanyName = firstCompany?.companyName || '待分配';

    for (const order of orders) {
      // 检查是否已存在
      const existing = await valueAddedRepo.findOne({
        where: { orderId: order.id }
      });

      if (!existing) {
        // 🔥 根据订单下单日期动态匹配价格档位
        let orderPrice = 0;
        if (firstCompany) {
          orderPrice = await findPriceByOrderDate(firstCompany.id, order.createdAt);
        }

        // 创建新的增值订单记录
        const valueAddedOrder = new ValueAddedOrder();
        valueAddedOrder.id = uuidv4();
        valueAddedOrder.orderId = order.id;
        valueAddedOrder.orderNumber = order.orderNumber;
        valueAddedOrder.customerId = order.customerId;
        valueAddedOrder.customerName = order.customerName;
        valueAddedOrder.customerPhone = order.customerPhone;
        valueAddedOrder.trackingNumber = order.trackingNumber;
        // 🔥 安全处理 expressCompany 字段
        if (order.expressCompany !== undefined) {
          valueAddedOrder.expressCompany = order.expressCompany;
        }
        valueAddedOrder.orderStatus = order.status;
        valueAddedOrder.orderDate = order.createdAt;
        valueAddedOrder.companyId = defaultCompanyId;
        valueAddedOrder.companyName = defaultCompanyName;
        valueAddedOrder.unitPrice = orderPrice;
        valueAddedOrder.status = 'pending';
        valueAddedOrder.settlementStatus = 'unsettled';
        valueAddedOrder.settlementAmount = 0;
        valueAddedOrder.createdBy = order.createdBy;
        valueAddedOrder.createdByName = order.createdByName;

        await valueAddedRepo.save(valueAddedOrder);
      }
    }

    log.info('[ValueAdded] 订单同步完成');
  } catch (error) {
    log.error('[ValueAdded] 订单同步失败:', error);
  }
}

/**
 * 获取统计数据
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, companyId, dateFilter } = req.query;

    const orderRepo = getTenantRepo(ValueAddedOrder);
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
      settledData,
      unsettledAllData  // 新增：包含所有未结算订单（含无效和补单）
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
      // 未结算（排除无效和补单状态，只统计有效和待处理）
      queryBuilder.clone()
        .andWhere('order.settlement_status = :settlementStatus', { settlementStatus: 'unsettled' })
        .andWhere('order.status IN (:...validStatuses)', { validStatuses: ['valid', 'pending'] })
        .select([
          'COUNT(*) as count',
          'SUM(order.unit_price) as amount'
        ]).getRawOne(),
      // 已结算
      queryBuilder.clone().andWhere('order.settlement_status = :settlementStatus', { settlementStatus: 'settled' }).select([
        'COUNT(*) as count',
        'SUM(order.settlement_amount) as amount'
      ]).getRawOne(),
      // 全部未结算（包含无效和补单，用于tooltip显示）
      queryBuilder.clone()
        .andWhere('order.settlement_status = :settlementStatus', { settlementStatus: 'unsettled' })
        .select([
          'COUNT(*) as count',
          'SUM(order.unit_price) as amount'
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
        },
        // 新增：全部未结算数据（包含无效和补单）
        unsettledAll: {
          count: parseInt(unsettledAllData?.count || 0),
          amount: parseFloat(unsettledAllData?.amount || 0)
        }
      }
    });
  } catch (error: any) {
    log.error('[ValueAdded] Get stats error:', error);
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

    const orderRepo = getTenantRepo(ValueAddedOrder);

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
    log.error('[ValueAdded] Create order error:', error);
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

    const orderRepo = getTenantRepo(ValueAddedOrder);
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
    log.error('[ValueAdded] Batch process error:', error);
    res.status(500).json({ success: false, message: '批量处理失败' });
  }
});

/**
 * 🔥 根据订单下单日期匹配价格档位
 * 业务规则：根据订单的下单时间来匹配价格档位的生效日期范围
 * @param companyId 外包公司ID
 * @param orderDate 订单下单日期
 * @returns 匹配的单价，未找到返回0
 */
async function findPriceByOrderDate(companyId: string, orderDate: Date | string | null): Promise<number> {
  try {
    const priceConfigRepo = getTenantRepo(ValueAddedPriceConfig);
    const activeTiers = await priceConfigRepo.find({
      where: { companyId, isActive: 1 },
      order: { priority: 'ASC', tierOrder: 'ASC' }
    });

    if (activeTiers.length === 0) return 0;

    // 将订单日期格式化为 YYYY-MM-DD 用于比较
    let dateStr = '';
    if (orderDate) {
      if (typeof orderDate === 'string') {
        dateStr = orderDate.split('T')[0];
      } else {
        dateStr = orderDate.toISOString().split('T')[0];
      }
    }

    if (dateStr) {
      // 优先找时间范围覆盖订单日期的档位
      const matchedTiers = activeTiers.filter(t => {
        const start = t.startDate ? String(t.startDate).split('T')[0] : null;
        const end = t.endDate ? String(t.endDate).split('T')[0] : null;
        if (start && dateStr < start) return false;
        if (end && dateStr > end) return false;
        return true;
      });

      if (matchedTiers.length > 0) {
        // 按优先级排序，取第一个
        const tier = matchedTiers[0];
        if (tier.pricingType === 'fixed') {
          return tier.unitPrice || 0;
        }
      }
    }

    // 没有匹配到日期范围的，使用最高优先级的档位
    const fallback = activeTiers[0];
    if (fallback && fallback.pricingType === 'fixed') {
      return fallback.unitPrice || 0;
    }

    return 0;
  } catch (e) {
    log.error('[findPriceByOrderDate] Error:', e);
    return 0;
  }
}

/**
 * 更新外包公司统计数据
 */
async function updateCompanyStats(companyId: string) {
  const orderRepo = getTenantRepo(ValueAddedOrder);
  const companyRepo = getTenantRepo(OutsourceCompany);

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

} // end registerOrderRoutes
