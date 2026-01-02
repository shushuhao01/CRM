/**
 * Finance Management Routes
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { PerformanceConfig } from '../entities/PerformanceConfig';
import { CommissionLadder } from '../entities/CommissionLadder';
import { CommissionSetting } from '../entities/CommissionSetting';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Get performance data statistics
router.get('/performance-data/statistics', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userRole = user?.role || '';
    const userId = user?.userId || user?.id || '';
    const userDepartmentId = user?.departmentId || '';

    const { startDate, endDate } = req.query;
    const orderRepo = AppDataSource.getRepository(Order);

    const queryBuilder = orderRepo.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: ['shipped', 'delivered', 'completed'] });

    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    const allowAllRoles = ['super_admin', 'admin', 'customer_service'];
    const managerRoles = ['department_manager', 'manager'];

    if (!allowAllRoles.includes(userRole)) {
      if (managerRoles.includes(userRole) && userDepartmentId) {
        queryBuilder.andWhere('order.createdByDepartmentId = :deptId', { deptId: userDepartmentId });
      } else {
        queryBuilder.andWhere('order.createdBy = :userId', { userId });
      }
    }

    const [shippedCount, deliveredCount, validCount, coefficientSum] = await Promise.all([
      queryBuilder.clone().andWhere('order.status = :status', { status: 'shipped' }).getCount(),
      queryBuilder.clone().andWhere('order.status IN (:...s)', { s: ['delivered', 'completed'] }).getCount(),
      queryBuilder.clone().andWhere('order.performanceStatus = :ps', { ps: 'valid' }).getCount(),
      queryBuilder.clone().select('SUM(order.performanceCoefficient)', 'total').getRawOne()
    ]);

    const commissionSum = await queryBuilder.clone().select('SUM(order.estimatedCommission)', 'total').getRawOne();

    res.json({
      success: true,
      data: {
        shippedCount,
        deliveredCount,
        validCount,
        coefficientSum: parseFloat(coefficientSum?.total || '0'),
        estimatedCommission: parseFloat(commissionSum?.total || '0')
      }
    });
  } catch (error: any) {
    console.error('[Finance] Get statistics failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
});

// Get performance data list (read-only)
router.get('/performance-data', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userRole = user?.role || '';
    const userId = user?.userId || user?.id || '';
    const userDepartmentId = user?.departmentId || '';

    const { page = 1, pageSize = 10, startDate, endDate, orderNumber, departmentId, salesPersonId, performanceStatus, performanceCoefficient } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 300);
    const skip = (pageNum - 1) * pageSizeNum;

    const orderRepo = AppDataSource.getRepository(Order);

    const queryBuilder = orderRepo.createQueryBuilder('order')
      .select(['order.id', 'order.orderNumber', 'order.customerId', 'order.customerName', 'order.status', 'order.trackingNumber', 'order.createdAt', 'order.totalAmount', 'order.createdByDepartmentName', 'order.createdByName', 'order.createdBy', 'order.performanceStatus', 'order.performanceCoefficient', 'order.performanceRemark', 'order.estimatedCommission'])
      .where('order.status IN (:...statuses)', { statuses: ['shipped', 'delivered', 'completed'] });

    if (startDate) queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    if (orderNumber) queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    if (departmentId) queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    if (salesPersonId) queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    if (performanceStatus) queryBuilder.andWhere('order.performanceStatus = :performanceStatus', { performanceStatus });
    if (performanceCoefficient) queryBuilder.andWhere('order.performanceCoefficient = :performanceCoefficient', { performanceCoefficient });

    const allowAllRoles = ['super_admin', 'admin', 'customer_service'];
    const managerRoles = ['department_manager', 'manager'];

    if (!allowAllRoles.includes(userRole)) {
      if (managerRoles.includes(userRole) && userDepartmentId) {
        queryBuilder.andWhere('order.createdByDepartmentId = :deptId', { deptId: userDepartmentId });
      } else {
        queryBuilder.andWhere('order.createdBy = :userId', { userId });
      }
    }

    queryBuilder.orderBy('order.createdAt', 'DESC').skip(skip).take(pageSizeNum);
    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({ success: true, data: { list, total, page: pageNum, pageSize: pageSizeNum } });
  } catch (error: any) {
    console.error('[Finance] Get performance data failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get data' });
  }
});


// Get performance manage statistics
router.get('/performance-manage/statistics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const orderRepo = AppDataSource.getRepository(Order);

    const queryBuilder = orderRepo.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: ['shipped', 'delivered', 'completed'] });

    if (startDate) queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

    const [pendingCount, processedCount, validCount, coefficientSum] = await Promise.all([
      queryBuilder.clone().andWhere('order.performanceStatus = :ps', { ps: 'pending' }).getCount(),
      queryBuilder.clone().andWhere('order.performanceStatus != :ps', { ps: 'pending' }).getCount(),
      queryBuilder.clone().andWhere('order.performanceStatus = :ps', { ps: 'valid' }).getCount(),
      queryBuilder.clone().select('SUM(order.performanceCoefficient)', 'total').getRawOne()
    ]);

    res.json({
      success: true,
      data: { pendingCount, processedCount, validCount, coefficientSum: parseFloat(coefficientSum?.total || '0') }
    });
  } catch (error: any) {
    console.error('[Finance] Get manage statistics failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
});

// Get performance manage list (editable)
router.get('/performance-manage', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, startDate, endDate, orderNumber, departmentId, salesPersonId, performanceStatus, performanceCoefficient } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 300);
    const skip = (pageNum - 1) * pageSizeNum;

    const orderRepo = AppDataSource.getRepository(Order);

    const queryBuilder = orderRepo.createQueryBuilder('order')
      .select(['order.id', 'order.orderNumber', 'order.customerId', 'order.customerName', 'order.status', 'order.trackingNumber', 'order.createdAt', 'order.totalAmount', 'order.createdByDepartmentId', 'order.createdByDepartmentName', 'order.createdByName', 'order.createdBy', 'order.performanceStatus', 'order.performanceCoefficient', 'order.performanceRemark', 'order.estimatedCommission', 'order.performanceUpdatedAt'])
      .where('order.status IN (:...statuses)', { statuses: ['shipped', 'delivered', 'completed'] });

    if (startDate) queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    if (orderNumber) queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    if (departmentId) queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    if (salesPersonId) queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    if (performanceStatus) queryBuilder.andWhere('order.performanceStatus = :performanceStatus', { performanceStatus });
    if (performanceCoefficient) queryBuilder.andWhere('order.performanceCoefficient = :performanceCoefficient', { performanceCoefficient });

    queryBuilder.orderBy('order.createdAt', 'DESC').skip(skip).take(pageSizeNum);
    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({ success: true, data: { list, total, page: pageNum, pageSize: pageSizeNum } });
  } catch (error: any) {
    console.error('[Finance] Get performance manage failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get data' });
  }
});

// Update order performance
router.put('/performance/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { performanceStatus, performanceCoefficient, performanceRemark } = req.body;
    const user = (req as any).user;
    const userId = user?.userId || user?.id || '';

    const orderRepo = AppDataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (performanceStatus !== undefined) order.performanceStatus = performanceStatus;
    if (performanceCoefficient !== undefined) order.performanceCoefficient = performanceCoefficient;
    if (performanceRemark !== undefined) order.performanceRemark = performanceRemark;
    order.performanceUpdatedAt = new Date();
    order.performanceUpdatedBy = userId;

    const commission = await calculateCommission(order.totalAmount, performanceCoefficient || order.performanceCoefficient || 1);
    order.estimatedCommission = commission;

    await orderRepo.save(order);

    res.json({
      success: true,
      message: 'Updated successfully',
      data: { performanceStatus: order.performanceStatus, performanceCoefficient: order.performanceCoefficient, performanceRemark: order.performanceRemark, estimatedCommission: order.estimatedCommission }
    });
  } catch (error: any) {
    console.error('[Finance] Update performance failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Batch update order performance
router.put('/performance/batch', async (req: Request, res: Response) => {
  try {
    const { orderIds, performanceStatus, performanceCoefficient, performanceRemark } = req.body;
    const user = (req as any).user;
    const userId = user?.userId || user?.id || '';

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select orders to update' });
    }

    const orderRepo = AppDataSource.getRepository(Order);
    let updateCount = 0;

    for (const orderId of orderIds) {
      const order = await orderRepo.findOne({ where: { id: orderId } });
      if (order) {
        if (performanceStatus !== undefined) order.performanceStatus = performanceStatus;
        if (performanceCoefficient !== undefined) order.performanceCoefficient = performanceCoefficient;
        if (performanceRemark !== undefined) order.performanceRemark = performanceRemark;
        order.performanceUpdatedAt = new Date();
        order.performanceUpdatedBy = userId;

        const commission = await calculateCommission(order.totalAmount, order.performanceCoefficient || 1);
        order.estimatedCommission = commission;

        await orderRepo.save(order);
        updateCount++;
      }
    }

    res.json({ success: true, message: `Updated ${updateCount} orders`, data: { updateCount } });
  } catch (error: any) {
    console.error('[Finance] Batch update failed:', error);
    res.status(500).json({ success: false, message: 'Batch update failed' });
  }
});

async function calculateCommission(orderAmount: number, coefficient: number): Promise<number> {
  try {
    const settingRepo = AppDataSource.getRepository(CommissionSetting);
    const ladderRepo = AppDataSource.getRepository(CommissionLadder);

    const typeSetting = await settingRepo.findOne({ where: { settingKey: 'commission_type' } });
    const commissionType = typeSetting?.settingValue || 'amount';

    const ladders = await ladderRepo.find({
      where: { commissionType: commissionType as 'amount' | 'count', isActive: 1 },
      order: { sortOrder: 'ASC' }
    });

    if (ladders.length === 0) return 0;

    if (commissionType === 'amount') {
      for (const ladder of ladders) {
        const min = parseFloat(ladder.minValue?.toString() || '0');
        const max = ladder.maxValue ? parseFloat(ladder.maxValue.toString()) : Infinity;
        const rate = parseFloat(ladder.commissionRate?.toString() || '0');
        if (orderAmount >= min && orderAmount < max) {
          return orderAmount * coefficient * rate;
        }
      }
    }

    if (commissionType === 'count') {
      const firstLadder = ladders[0];
      const perUnit = parseFloat(firstLadder.commissionPerUnit?.toString() || '0');
      return coefficient * perUnit;
    }

    return 0;
  } catch (error) {
    console.error('[Finance] Calculate commission failed:', error);
    return 0;
  }
}


// Get all config
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const configRepo = AppDataSource.getRepository(PerformanceConfig);
    const ladderRepo = AppDataSource.getRepository(CommissionLadder);
    const settingRepo = AppDataSource.getRepository(CommissionSetting);

    const [statusConfigs, coefficientConfigs, remarkConfigs, amountLadders, countLadders, settings] = await Promise.all([
      configRepo.find({ where: { configType: 'status', isActive: 1 }, order: { sortOrder: 'ASC' } }),
      configRepo.find({ where: { configType: 'coefficient', isActive: 1 }, order: { sortOrder: 'ASC' } }),
      configRepo.find({ where: { configType: 'remark', isActive: 1 }, order: { sortOrder: 'ASC' } }),
      ladderRepo.find({ where: { commissionType: 'amount', isActive: 1 }, order: { sortOrder: 'ASC' } }),
      ladderRepo.find({ where: { commissionType: 'count', isActive: 1 }, order: { sortOrder: 'ASC' } }),
      settingRepo.find()
    ]);

    const settingsObj: Record<string, string> = {};
    settings.forEach(s => { settingsObj[s.settingKey] = s.settingValue; });

    res.json({ success: true, data: { statusConfigs, coefficientConfigs, remarkConfigs, amountLadders, countLadders, settings: settingsObj } });
  } catch (error: any) {
    console.error('[Finance] Get config failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get config' });
  }
});

// Add config
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { configType, configValue, configLabel } = req.body;
    if (!configType || !configValue) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const configRepo = AppDataSource.getRepository(PerformanceConfig);
    const maxSort = await configRepo.createQueryBuilder('c').select('MAX(c.sortOrder)', 'max').where('c.configType = :configType', { configType }).getRawOne();

    const config = configRepo.create({ configType, configValue, configLabel: configLabel || configValue, sortOrder: (maxSort?.max || 0) + 1, isActive: 1 });
    await configRepo.save(config);

    res.json({ success: true, message: 'Added successfully', data: config });
  } catch (error: any) {
    console.error('[Finance] Add config failed:', error);
    res.status(500).json({ success: false, message: 'Add failed' });
  }
});

// Update config
router.put('/config/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { configValue, configLabel, sortOrder, isActive } = req.body;

    const configRepo = AppDataSource.getRepository(PerformanceConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(id) } });

    if (!config) {
      return res.status(404).json({ success: false, message: 'Config not found' });
    }

    if (configValue !== undefined) config.configValue = configValue;
    if (configLabel !== undefined) config.configLabel = configLabel;
    if (sortOrder !== undefined) config.sortOrder = sortOrder;
    if (isActive !== undefined) config.isActive = isActive;

    await configRepo.save(config);
    res.json({ success: true, message: 'Updated successfully', data: config });
  } catch (error: any) {
    console.error('[Finance] Update config failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Delete config
router.delete('/config/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const configRepo = AppDataSource.getRepository(PerformanceConfig);
    await configRepo.delete({ id: parseInt(id) });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('[Finance] Delete config failed:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// Add ladder
router.post('/ladder', async (req: Request, res: Response) => {
  try {
    const { commissionType, minValue, maxValue, commissionRate, commissionPerUnit } = req.body;
    if (!commissionType || minValue === undefined) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const ladderRepo = AppDataSource.getRepository(CommissionLadder);
    const maxSort = await ladderRepo.createQueryBuilder('l').select('MAX(l.sortOrder)', 'max').where('l.commissionType = :commissionType', { commissionType }).getRawOne();

    const ladder = ladderRepo.create({
      commissionType,
      minValue,
      maxValue: maxValue || null,
      commissionRate: commissionType === 'amount' ? commissionRate : null,
      commissionPerUnit: commissionType === 'count' ? commissionPerUnit : null,
      sortOrder: (maxSort?.max || 0) + 1,
      isActive: 1
    });
    await ladderRepo.save(ladder);

    res.json({ success: true, message: 'Added successfully', data: ladder });
  } catch (error: any) {
    console.error('[Finance] Add ladder failed:', error);
    res.status(500).json({ success: false, message: 'Add failed' });
  }
});

// Update ladder
router.put('/ladder/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { minValue, maxValue, commissionRate, commissionPerUnit, sortOrder, isActive } = req.body;

    const ladderRepo = AppDataSource.getRepository(CommissionLadder);
    const ladder = await ladderRepo.findOne({ where: { id: parseInt(id) } });

    if (!ladder) {
      return res.status(404).json({ success: false, message: 'Ladder not found' });
    }

    if (minValue !== undefined) ladder.minValue = minValue;
    if (maxValue !== undefined) ladder.maxValue = maxValue;
    if (commissionRate !== undefined) ladder.commissionRate = commissionRate;
    if (commissionPerUnit !== undefined) ladder.commissionPerUnit = commissionPerUnit;
    if (sortOrder !== undefined) ladder.sortOrder = sortOrder;
    if (isActive !== undefined) ladder.isActive = isActive;

    await ladderRepo.save(ladder);
    res.json({ success: true, message: 'Updated successfully', data: ladder });
  } catch (error: any) {
    console.error('[Finance] Update ladder failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Delete ladder
router.delete('/ladder/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ladderRepo = AppDataSource.getRepository(CommissionLadder);
    await ladderRepo.delete({ id: parseInt(id) });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('[Finance] Delete ladder failed:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// Update setting
router.put('/setting', async (req: Request, res: Response) => {
  try {
    const { settingKey, settingValue } = req.body;
    if (!settingKey || settingValue === undefined) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const settingRepo = AppDataSource.getRepository(CommissionSetting);
    let setting = await settingRepo.findOne({ where: { settingKey } });

    if (setting) {
      setting.settingValue = settingValue;
    } else {
      setting = settingRepo.create({ settingKey, settingValue });
    }

    await settingRepo.save(setting);
    res.json({ success: true, message: 'Updated successfully', data: setting });
  } catch (error: any) {
    console.error('[Finance] Update setting failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

export default router;
