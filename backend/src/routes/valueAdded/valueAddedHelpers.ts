/**
 * 增值管理模块 - 共享辅助函数
 * 包含跨子模块共用的业务函数
 */
import { ValueAddedOrder } from '../../entities/ValueAddedOrder';
import { ValueAddedPriceConfig } from '../../entities/ValueAddedPriceConfig';
import { OutsourceCompany } from '../../entities/OutsourceCompany';
import { v4 as uuidv4 } from 'uuid';
import { getTenantRepo } from '../../utils/tenantRepo';

import { log } from '../../config/logger';
/**
 * 根据订单下单日期查找匹配的价格档位
 */
export async function findPriceByOrderDate(companyId: string, orderDate: Date | string | null): Promise<number> {
  try {
    const priceConfigRepo = getTenantRepo(ValueAddedPriceConfig);
    const activeTiers = await priceConfigRepo.find({
      where: { companyId, isActive: 1 },
      order: { priority: 'ASC', tierOrder: 'ASC' }
    });

    if (activeTiers.length === 0) return 0;

    let dateStr = '';
    if (orderDate) {
      if (typeof orderDate === 'string') {
        dateStr = orderDate.split('T')[0];
      } else {
        dateStr = orderDate.toISOString().split('T')[0];
      }
    }

    if (dateStr) {
      const matchedTiers = activeTiers.filter(t => {
        const start = t.startDate ? String(t.startDate).split('T')[0] : null;
        const end = t.endDate ? String(t.endDate).split('T')[0] : null;
        if (start && dateStr < start) return false;
        if (end && dateStr > end) return false;
        return true;
      });

      if (matchedTiers.length > 0) {
        const tier = matchedTiers[0];
        if (tier.pricingType === 'fixed') {
          return tier.unitPrice || 0;
        }
      }
    }

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
export async function updateCompanyStats(companyId: string) {
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
 * 优化版同步函数
 */
export async function syncOrdersToValueAddedOptimized() {
  try {
    const { Order } = await import('../../entities/Order');
    const orderRepo = getTenantRepo(Order);
    const valueAddedRepo = getTenantRepo(ValueAddedOrder);
    const companyRepo = getTenantRepo(OutsourceCompany);

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

    const defaultCompany = await companyRepo.findOne({
      where: { isDefault: 1, status: 'active' }
    });

    const firstCompany = defaultCompany || await companyRepo.findOne({
      where: { status: 'active' },
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    const defaultCompanyId = firstCompany?.id || 'default-company';
    const defaultCompanyName = firstCompany?.companyName || '待分配';

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
      if (order.expressCompany !== undefined) {
        valueAddedOrder.expressCompany = order.expressCompany;
      }
      valueAddedOrder.orderStatus = order.status;
      valueAddedOrder.orderDate = order.createdAt;
      valueAddedOrder.companyId = defaultCompanyId;
      valueAddedOrder.companyName = defaultCompanyName;
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
export async function syncOrdersToValueAdded() {
  try {
    const { Order } = await import('../../entities/Order');
    const orderRepo = getTenantRepo(Order);
    const valueAddedRepo = getTenantRepo(ValueAddedOrder);
    const companyRepo = getTenantRepo(OutsourceCompany);

    const orders = await orderRepo
      .createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: ['delivered', 'completed'] })
      .getMany();

    log.info(`[ValueAdded] 找到 ${orders.length} 个已签收/已完成的订单`);

    const defaultCompany = await companyRepo.findOne({
      where: { isDefault: 1, status: 'active' }
    });

    const firstCompany = defaultCompany || await companyRepo.findOne({
      where: { status: 'active' },
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    const defaultCompanyId = firstCompany?.id || 'default-company';
    const defaultCompanyName = firstCompany?.companyName || '待分配';

    for (const order of orders) {
      const existing = await valueAddedRepo.findOne({
        where: { orderId: order.id }
      });

      if (!existing) {
        let orderPrice = 0;
        if (firstCompany) {
          orderPrice = await findPriceByOrderDate(firstCompany.id, order.createdAt);
        }

        const valueAddedOrder = new ValueAddedOrder();
        valueAddedOrder.id = uuidv4();
        valueAddedOrder.orderId = order.id;
        valueAddedOrder.orderNumber = order.orderNumber;
        valueAddedOrder.customerId = order.customerId;
        valueAddedOrder.customerName = order.customerName;
        valueAddedOrder.customerPhone = order.customerPhone;
        valueAddedOrder.trackingNumber = order.trackingNumber;
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

