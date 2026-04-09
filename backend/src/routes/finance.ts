/**
 * Finance Management Routes
 */
import { Router, Request, Response } from 'express';
import { Order } from '../entities/Order';
import { PerformanceConfig } from '../entities/PerformanceConfig';
import { CommissionLadder } from '../entities/CommissionLadder';
import { CommissionSetting } from '../entities/CommissionSetting';
import { Department } from '../entities/Department';
import { User } from '../entities/User';
import { authenticateToken } from '../middleware/auth';
import { getTenantRepo } from '../utils/tenantRepo';
import { TenantContextManager } from '../utils/tenantContext';
import { deployConfig } from '../config/deploy';

import { log } from '../config/logger';
const router = Router();

router.use(authenticateToken);

// Get performance data statistics
router.get('/performance-data/statistics', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userRole = user?.role || '';
    const userId = user?.userId || user?.id || '';
    const userDepartmentId = user?.departmentId || '';

    const { startDate, endDate, departmentId, salesPersonId, _performanceStatus, performanceCoefficient } = req.query;
    const orderRepo = getTenantRepo(Order);

    // 🔥 已发货后的所有状态（从发货列表提交发货后的订单）- 完整列表
    const shippedStatuses = [
      'shipped',           // 已发货
      'delivered',         // 已签收
      'completed',         // 已完成
      'signed',            // 已签收（别名）
      'rejected',          // 拒收
      'rejected_returned', // 拒收已退回
      'refunded',          // 已退款
      'after_sales_created', // 已建售后
      'package_exception', // 包裹异常
      'abnormal',          // 异常
      'exception'          // 异常（别名）
    ];
    // 签收状态
    const deliveredStatuses = ['delivered', 'completed', 'signed'];

    const queryBuilder = orderRepo.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: shippedStatuses });

    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }
    // 支持筛选条件
    if (departmentId) {
      queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    }
    if (salesPersonId) {
      queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    }
    // 🔥 统计卡片不受 performanceStatus 筛选影响
    if (performanceCoefficient) {
      queryBuilder.andWhere('order.performanceCoefficient = :performanceCoefficient', { performanceCoefficient });
    }

    const allowAllRoles = ['super_admin', 'admin', 'customer_service', 'finance'];
    const managerRoles = ['department_manager', 'manager'];

    if (!allowAllRoles.includes(userRole)) {
      if (managerRoles.includes(userRole) && userDepartmentId) {
        queryBuilder.andWhere('order.createdByDepartmentId = :deptId', { deptId: userDepartmentId });
      } else {
        queryBuilder.andWhere('order.createdBy = :userId', { userId });
      }
    }

    const [shippedCount, deliveredCount, validCount, coefficientSum] = await Promise.all([
      // 🔥 发货单数：统计所有发货后状态的订单总数（已发货、已签收、拒收等）
      queryBuilder.clone().getCount(),
      // 🔥 签收单数：只统计已签收状态的订单
      queryBuilder.clone().andWhere('order.status IN (:...s)', { s: deliveredStatuses }).getCount(),
      // 有效单数
      queryBuilder.clone().andWhere('order.performanceStatus = :ps', { ps: 'valid' }).getCount(),
      // 系数合计：只计算有效订单且系数>0的
      queryBuilder.clone()
        .andWhere('order.performanceStatus = :ps', { ps: 'valid' })
        .andWhere('order.performanceCoefficient > 0')
        .select('SUM(order.performanceCoefficient)', 'total')
        .getRawOne()
    ]);

    // 预估佣金：只计算有效订单且系数>0的
    const commissionSum = await queryBuilder.clone()
      .andWhere('order.performanceStatus = :ps', { ps: 'valid' })
      .andWhere('order.performanceCoefficient > 0')
      .select('SUM(order.estimatedCommission)', 'total')
      .getRawOne();

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
    log.error('[Finance] Get statistics failed:', error);
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

    const { page = 1, pageSize = 10, startDate, endDate, orderNumber, departmentId, salesPersonId, performanceStatus, performanceCoefficient, batchKeywords } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 5000);
    const skip = (pageNum - 1) * pageSizeNum;

    const orderRepo = getTenantRepo(Order);

    // 🔥 已发货后的所有状态（从发货列表提交发货后的订单）- 完整列表
    const shippedStatuses = [
      'shipped',           // 已发货
      'delivered',         // 已签收
      'completed',         // 已完成
      'signed',            // 已签收（别名）
      'rejected',          // 拒收
      'rejected_returned', // 拒收已退回
      'refunded',          // 已退款
      'after_sales_created', // 已建售后
      'package_exception', // 包裹异常
      'abnormal',          // 异常
      'exception'          // 异常（别名）
    ];

    const queryBuilder = orderRepo.createQueryBuilder('order')
      .leftJoin(Department, 'dept', 'dept.id = order.createdByDepartmentId' + (deployConfig.isSaaS() && TenantContextManager.getTenantId() ? ' AND dept.tenant_id = :_joinTid' : ''))
      .leftJoin(User, 'creator', 'creator.id = order.createdBy' + (deployConfig.isSaaS() && TenantContextManager.getTenantId() ? ' AND creator.tenant_id = :_joinTid' : ''))
      .setParameter('_joinTid', TenantContextManager.getTenantId() || '')
      .select([
        'order.id AS id',
        'order.orderNumber AS orderNumber',
        'order.customerId AS customerId',
        'order.customerName AS customerName',
        'order.status AS status',
        'order.trackingNumber AS trackingNumber',
        'order.latestLogisticsInfo AS latestLogisticsInfo',
        'order.createdAt AS createdAt',
        'order.totalAmount AS totalAmount',
        'order.createdBy AS createdBy',
        'order.performanceStatus AS performanceStatus',
        'order.performanceCoefficient AS performanceCoefficient',
        'order.performanceRemark AS performanceRemark',
        'order.estimatedCommission AS estimatedCommission',
        'COALESCE(dept.name, order.createdByDepartmentName) AS createdByDepartmentName',
        'COALESCE(creator.realName, creator.name, order.createdByName) AS createdByName'
      ])
      .where('order.status IN (:...statuses)', { statuses: shippedStatuses });

    if (startDate) queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

    // 🔥 批量搜索：支持订单号、客户名称、客户电话、客户其他手机号（最多3000条）
    if (batchKeywords) {
      const keywordsStr = batchKeywords as string;
      const keywordList = keywordsStr.split(/[\n,;，；\s]+/).map(k => k.trim()).filter(k => k.length > 0);
      // 限制最多3000条
      const limitedKeywords = keywordList.slice(0, 3000);

      if (limitedKeywords.length > 0) {
        // 构建多字段OR查询
        const orConditions: string[] = [];
        const orParams: Record<string, any> = {};

        limitedKeywords.forEach((keyword, index) => {
          const paramKey = `kw${index}`;
          orConditions.push(`(order.orderNumber LIKE :${paramKey} OR order.customerName LIKE :${paramKey} OR order.customerPhone LIKE :${paramKey} OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND CAST(c.other_phones AS CHAR) LIKE :${paramKey}))`);
          orParams[paramKey] = `%${keyword}%`;
        });

        queryBuilder.andWhere(`(${orConditions.join(' OR ')})`, orParams);
      }
    } else if (orderNumber) {
      // 单个关键词搜索（兼容旧逻辑）
      queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    }

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

    queryBuilder.orderBy('order.createdAt', 'DESC').offset(skip).limit(pageSizeNum);

    // 使用 getRawMany 获取原生结果
    const list = await queryBuilder.getRawMany();

    // 获取总数
    const countBuilder = orderRepo.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: shippedStatuses });
    if (startDate) countBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    if (endDate) countBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

    // 🔥 批量搜索条件也要应用到count查询
    if (batchKeywords) {
      const keywordsStr = batchKeywords as string;
      const keywordList = keywordsStr.split(/[\n,;，；\s]+/).map(k => k.trim()).filter(k => k.length > 0);
      const limitedKeywords = keywordList.slice(0, 3000);

      if (limitedKeywords.length > 0) {
        const orConditions: string[] = [];
        const orParams: Record<string, any> = {};

        limitedKeywords.forEach((keyword, index) => {
          const paramKey = `kw${index}`;
          orConditions.push(`(order.orderNumber LIKE :${paramKey} OR order.customerName LIKE :${paramKey} OR order.customerPhone LIKE :${paramKey} OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND CAST(c.other_phones AS CHAR) LIKE :${paramKey}))`);
          orParams[paramKey] = `%${keyword}%`;
        });

        countBuilder.andWhere(`(${orConditions.join(' OR ')})`, orParams);
      }
    } else if (orderNumber) {
      countBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    }

    if (departmentId) countBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    if (salesPersonId) countBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    if (performanceStatus) countBuilder.andWhere('order.performanceStatus = :performanceStatus', { performanceStatus });
    if (performanceCoefficient) countBuilder.andWhere('order.performanceCoefficient = :performanceCoefficient', { performanceCoefficient });

    // 🔥 数据权限控制：与list查询相同的逻辑
    const allowAllRoles2 = ['super_admin', 'admin', 'customer_service'];
    const managerRoles2 = ['department_manager', 'manager'];

    if (!allowAllRoles2.includes(userRole)) {
      if (managerRoles2.includes(userRole) && userDepartmentId) {
        countBuilder.andWhere('order.createdByDepartmentId = :deptId', { deptId: userDepartmentId });
      } else {
        countBuilder.andWhere('order.createdBy = :userId', { userId });
      }
    }

    const total = await countBuilder.getCount();

    res.json({ success: true, data: { list, total, page: pageNum, pageSize: pageSizeNum } });
  } catch (error: any) {
    log.error('[Finance] Get performance data failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get data' });
  }
});


// Get performance manage statistics
router.get('/performance-manage/statistics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, departmentId, salesPersonId, performanceCoefficient } = req.query;
    // 🔥 注意：这里不接收 performanceStatus 参数，因为汇总卡片需要显示所有状态的统计
    const orderRepo = getTenantRepo(Order);

    // 🔥 已发货后的所有状态（从发货列表提交发货后的订单）- 完整列表
    const shippedStatuses = [
      'shipped',           // 已发货
      'delivered',         // 已签收
      'completed',         // 已完成
      'signed',            // 已签收（别名）
      'rejected',          // 拒收
      'rejected_returned', // 拒收已退回
      'refunded',          // 已退款
      'after_sales_created', // 已建售后
      'package_exception', // 包裹异常
      'abnormal',          // 异常
      'exception'          // 异常（别名）
    ];

    const queryBuilder = orderRepo.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: shippedStatuses });

    if (startDate) queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    // 支持筛选条件（但不包括 performanceStatus，因为汇总卡片需要显示所有状态）
    if (departmentId) queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    if (salesPersonId) queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    if (performanceCoefficient) queryBuilder.andWhere('order.performanceCoefficient = :performanceCoefficient', { performanceCoefficient });

    // 🔥 修复：处理 NULL 值，将 NULL 视为 pending
    const [pendingCount, processedCount, validCount, invalidCount, totalCount, coefficientSum] = await Promise.all([
      // 待处理：performanceStatus = 'pending' 或 NULL
      queryBuilder.clone().andWhere('(order.performanceStatus = :ps OR order.performanceStatus IS NULL)', { ps: 'pending' }).getCount(),
      // 已处理：performanceStatus != 'pending' 且不为 NULL
      queryBuilder.clone().andWhere('order.performanceStatus IS NOT NULL AND order.performanceStatus != :ps', { ps: 'pending' }).getCount(),
      // 有效：performanceStatus = 'valid'
      queryBuilder.clone().andWhere('order.performanceStatus = :ps', { ps: 'valid' }).getCount(),
      // 无效：performanceStatus = 'invalid'
      queryBuilder.clone().andWhere('order.performanceStatus = :ps', { ps: 'invalid' }).getCount(),
      // 🔥 全部：所有已发货订单
      queryBuilder.clone().getCount(),
      // 系数合计：只计算有效订单且系数>0的
      queryBuilder.clone()
        .andWhere('order.performanceStatus = :ps', { ps: 'valid' })
        .andWhere('order.performanceCoefficient > 0')
        .select('SUM(order.performanceCoefficient)', 'total')
        .getRawOne()
    ]);

    log.info(`[Finance] 绩效管理统计: 待处理=${pendingCount}, 已处理=${processedCount}, 有效=${validCount}, 无效=${invalidCount}, 全部=${totalCount}, 系数合计=${coefficientSum?.total || 0}`);

    res.json({
      success: true,
      data: { pendingCount, processedCount, validCount, invalidCount, totalCount, coefficientSum: parseFloat(coefficientSum?.total || '0') }
    });
  } catch (error: any) {
    log.error('[Finance] Get manage statistics failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
});

// Get performance manage list (editable)
router.get('/performance-manage', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, startDate, endDate, orderNumber, departmentId, salesPersonId, performanceStatus, performanceCoefficient, batchKeywords } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 5000);
    const skip = (pageNum - 1) * pageSizeNum;

    const orderRepo = getTenantRepo(Order);

    // 🔥 已发货后的所有状态（从发货列表提交发货后的订单）- 完整列表
    const shippedStatuses = [
      'shipped',           // 已发货
      'delivered',         // 已签收
      'completed',         // 已完成
      'signed',            // 已签收（别名）
      'rejected',          // 拒收
      'rejected_returned', // 拒收已退回
      'refunded',          // 已退款
      'after_sales_created', // 已建售后
      'package_exception', // 包裹异常
      'abnormal',          // 异常
      'exception'          // 异常（别名）
    ];

    const queryBuilder = orderRepo.createQueryBuilder('order')
      .leftJoin(Department, 'dept', 'dept.id = order.createdByDepartmentId' + (deployConfig.isSaaS() && TenantContextManager.getTenantId() ? ' AND dept.tenant_id = :_joinTid2' : ''))
      .leftJoin(User, 'creator', 'creator.id = order.createdBy' + (deployConfig.isSaaS() && TenantContextManager.getTenantId() ? ' AND creator.tenant_id = :_joinTid2' : ''))
      .setParameter('_joinTid2', TenantContextManager.getTenantId() || '')
      .select([
        'order.id AS id',
        'order.orderNumber AS orderNumber',
        'order.customerId AS customerId',
        'order.customerName AS customerName',
        'order.status AS status',
        'order.trackingNumber AS trackingNumber',
        'order.latestLogisticsInfo AS latestLogisticsInfo',
        'order.createdAt AS createdAt',
        'order.totalAmount AS totalAmount',
        'order.createdBy AS createdBy',
        'order.createdByDepartmentId AS createdByDepartmentId',
        'order.performanceStatus AS performanceStatus',
        'order.performanceCoefficient AS performanceCoefficient',
        'order.performanceRemark AS performanceRemark',
        'order.estimatedCommission AS estimatedCommission',
        'order.performanceUpdatedAt AS performanceUpdatedAt',
        'COALESCE(dept.name, order.createdByDepartmentName) AS createdByDepartmentName',
        'COALESCE(creator.realName, creator.name, order.createdByName) AS createdByName'
      ])
      .where('order.status IN (:...statuses)', { statuses: shippedStatuses });

    if (startDate) queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

    // 🔥 批量搜索：支持订单号、客户名称、客户电话、客户其他手机号（最多3000条）
    if (batchKeywords) {
      const keywordsStr = batchKeywords as string;
      const keywordList = keywordsStr.split(/[\n,;，；\s]+/).map(k => k.trim()).filter(k => k.length > 0);
      const limitedKeywords = keywordList.slice(0, 3000);

      if (limitedKeywords.length > 0) {
        const orConditions: string[] = [];
        const orParams: Record<string, any> = {};

        limitedKeywords.forEach((keyword, index) => {
          const paramKey = `kw${index}`;
          orConditions.push(`(order.orderNumber LIKE :${paramKey} OR order.customerName LIKE :${paramKey} OR order.customerPhone LIKE :${paramKey} OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND CAST(c.other_phones AS CHAR) LIKE :${paramKey}))`);
          orParams[paramKey] = `%${keyword}%`;
        });

        queryBuilder.andWhere(`(${orConditions.join(' OR ')})`, orParams);
      }
    } else if (orderNumber) {
      queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    }

    if (departmentId) queryBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    if (salesPersonId) queryBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    if (performanceStatus) queryBuilder.andWhere('order.performanceStatus = :performanceStatus', { performanceStatus });
    if (performanceCoefficient) queryBuilder.andWhere('order.performanceCoefficient = :performanceCoefficient', { performanceCoefficient });

    queryBuilder.orderBy('order.createdAt', 'DESC').offset(skip).limit(pageSizeNum);

    // 使用 getRawMany 获取原生结果
    const list = await queryBuilder.getRawMany();

    // 获取总数
    const countBuilder = orderRepo.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', { statuses: shippedStatuses });
    if (startDate) countBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    if (endDate) countBuilder.andWhere('order.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

    // 🔥 批量搜索条件也要应用到count查询
    if (batchKeywords) {
      const keywordsStr = batchKeywords as string;
      const keywordList = keywordsStr.split(/[\n,;，；\s]+/).map(k => k.trim()).filter(k => k.length > 0);
      const limitedKeywords = keywordList.slice(0, 3000);

      if (limitedKeywords.length > 0) {
        const orConditions: string[] = [];
        const orParams: Record<string, any> = {};

        limitedKeywords.forEach((keyword, index) => {
          const paramKey = `kw${index}`;
          orConditions.push(`(order.orderNumber LIKE :${paramKey} OR order.customerName LIKE :${paramKey} OR order.customerPhone LIKE :${paramKey} OR EXISTS (SELECT 1 FROM customers c WHERE c.id = order.customer_id AND CAST(c.other_phones AS CHAR) LIKE :${paramKey}))`);
          orParams[paramKey] = `%${keyword}%`;
        });

        countBuilder.andWhere(`(${orConditions.join(' OR ')})`, orParams);
      }
    } else if (orderNumber) {
      countBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    }

    if (departmentId) countBuilder.andWhere('order.createdByDepartmentId = :departmentId', { departmentId });
    if (salesPersonId) countBuilder.andWhere('order.createdBy = :salesPersonId', { salesPersonId });
    if (performanceStatus) countBuilder.andWhere('order.performanceStatus = :performanceStatus', { performanceStatus });
    if (performanceCoefficient) countBuilder.andWhere('order.performanceCoefficient = :performanceCoefficient', { performanceCoefficient });
    const total = await countBuilder.getCount();

    res.json({ success: true, data: { list, total, page: pageNum, pageSize: pageSizeNum } });
  } catch (error: any) {
    log.error('[Finance] Get performance manage failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get data' });
  }
});

// Batch update order performance (必须在 /performance/:orderId 之前定义)
router.put('/performance/batch', async (req: Request, res: Response) => {
  try {
    const { orderIds, performanceStatus, performanceCoefficient, performanceRemark, startDate, endDate } = req.body;
    const user = (req as any).user;
    const userId = user?.userId || user?.id || '';

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select orders to update' });
    }

    const orderRepo = getTenantRepo(Order);
    let updateCount = 0;

    for (const orderId of orderIds) {
      const order = await orderRepo.findOne({ where: { id: orderId } });
      if (order) {
        if (performanceStatus !== undefined) order.performanceStatus = performanceStatus;
        if (performanceCoefficient !== undefined) order.performanceCoefficient = performanceCoefficient;
        if (performanceRemark !== undefined) order.performanceRemark = performanceRemark;
        order.performanceUpdatedAt = new Date();
        order.performanceUpdatedBy = userId;

        // 如果状态为无效或系数为0，佣金直接设为0
        if (order.performanceStatus === 'invalid' || order.performanceCoefficient === 0) {
          order.estimatedCommission = 0;
        } else {
          // 根据订单所属部门和创建人计算佣金
          const commission = await calculateCommission(
            order.totalAmount,
            order.performanceCoefficient,
            order.createdByDepartmentId,
            order.createdBy,
            startDate as string,
            endDate as string
          );
          order.estimatedCommission = commission;
        }

        await orderRepo.save(order);
        updateCount++;
      }
    }

    res.json({ success: true, message: `Updated ${updateCount} orders`, data: { updateCount } });
  } catch (error: any) {
    log.error('[Finance] Batch update failed:', error);
    res.status(500).json({ success: false, message: 'Batch update failed' });
  }
});

// Update order performance
router.put('/performance/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { performanceStatus, performanceCoefficient, performanceRemark, startDate, endDate } = req.body;
    const user = (req as any).user;
    const userId = user?.userId || user?.id || '';

    log.info('[绩效更新] ========== 开始更新 ==========');
    log.info('[绩效更新] 订单ID:', orderId);
    log.info('[绩效更新] 请求参数:', { performanceStatus, performanceCoefficient, performanceRemark, startDate, endDate });

    const orderRepo = getTenantRepo(Order);
    const order = await orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      log.info('[绩效更新] 订单不存在');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    log.info('[绩效更新] 订单信息:', {
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      createdBy: order.createdBy,
      createdByDepartmentId: order.createdByDepartmentId,
      currentPerformanceStatus: order.performanceStatus,
      currentPerformanceCoefficient: order.performanceCoefficient
    });

    if (performanceStatus !== undefined) order.performanceStatus = performanceStatus;
    if (performanceCoefficient !== undefined) order.performanceCoefficient = performanceCoefficient;
    if (performanceRemark !== undefined) order.performanceRemark = performanceRemark;
    order.performanceUpdatedAt = new Date();
    order.performanceUpdatedBy = userId;

    log.info('[绩效更新] 更新后状态:', order.performanceStatus, '系数:', order.performanceCoefficient);

    // 🔥 修复：待处理状态也应该计算预估佣金
    // 只有无效状态或系数为0时，佣金才设为0
    if (order.performanceStatus === 'invalid' || order.performanceCoefficient === 0) {
      log.info('[绩效更新] 状态为无效或系数为0，佣金设为0');
      order.estimatedCommission = 0;
    } else {
      log.info('[绩效更新] 开始计算佣金...');
      // 根据订单所属部门和创建人计算佣金
      const commission = await calculateCommission(
        order.totalAmount,
        order.performanceCoefficient,
        order.createdByDepartmentId,
        order.createdBy,
        startDate as string,
        endDate as string
      );
      log.info('[绩效更新] 计算完成，佣金:', commission);
      order.estimatedCommission = commission;
    }

    await orderRepo.save(order);
    log.info('[绩效更新] 保存成功，最终佣金:', order.estimatedCommission);
    log.info('[绩效更新] ========== 更新完成 ==========');

    res.json({
      success: true,
      message: 'Updated successfully',
      data: { performanceStatus: order.performanceStatus, performanceCoefficient: order.performanceCoefficient, performanceRemark: order.performanceRemark, estimatedCommission: order.estimatedCommission }
    });
  } catch (error: any) {
    log.error('[Finance] Update performance failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// 根据成员和部门计算佣金
// 🔥 核心逻辑：
// 1. 统计该销售人员的有效订单数量（只统计已经是"有效"状态的订单）
// 2. 根据有效订单数量匹配阶梯档位
// 3. 使用匹配的档位计算当前订单的预估佣金
// 4. 不管当前订单是什么状态（待处理、有效、无效），都按照这个逻辑计算
async function calculateCommission(
  orderAmount: number,
  coefficient: number,
  departmentId?: string,
  userId?: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  try {
    log.info('[佣金计算] ========== 开始计算 ==========');
    log.info('[佣金计算] 订单金额:', orderAmount);
    log.info('[佣金计算] 系数:', coefficient);
    log.info('[佣金计算] 部门ID:', departmentId);
    log.info('[佣金计算] 用户ID:', userId);
    log.info('[佣金计算] 时间范围:', startDate, '至', endDate);

    // 系数为0时，佣金为0
    if (coefficient === 0) {
      log.info('[佣金计算] 系数为0，返回佣金0');
      return 0;
    }

    const ladderRepo = getTenantRepo(CommissionLadder);
    const orderRepo = getTenantRepo(Order);

    // 优先查找该部门的阶梯配置
    let ladders: CommissionLadder[] = [];

    if (departmentId) {
      ladders = await ladderRepo.find({
        where: { departmentId: departmentId, isActive: 1 },
        order: { sortOrder: 'ASC' }
      });
      log.info('[佣金计算] 查找部门阶梯配置:', departmentId, '找到', ladders.length, '个');
    }

    // 如果该部门没有配置，查找全局配置
    if (ladders.length === 0) {
      ladders = await ladderRepo
        .createQueryBuilder('l')
        .where('l.isActive = 1')
        .andWhere('(l.departmentId IS NULL OR l.departmentId = :empty)', { empty: '' })
        .orderBy('l.sortOrder', 'ASC')
        .getMany();
      log.info('[佣金计算] 查找全局阶梯配置，找到', ladders.length, '个');
    }

    if (ladders.length === 0) {
      log.info('[佣金计算] 没有找到阶梯配置，返回佣金0');
      return 0;
    }

    const firstLadder = ladders[0];
    const commissionType = firstLadder.commissionType;
    log.info('[佣金计算] 计提类型:', commissionType);
    log.info('[佣金计算] 阶梯配置:', ladders.map(l => ({
      min: l.minValue,
      max: l.maxValue,
      rate: l.commissionRate,
      perUnit: l.commissionPerUnit
    })));

    // 签收状态
    const signedStatuses = ['delivered', 'completed', 'signed'];

    if (commissionType === 'amount') {
      // 按签收业绩计提：
      // 1. 统计该成员的签收业绩总金额（有效系数>0的订单）
      // 2. 根据总金额匹配阶梯比例
      // 3. 单个订单佣金 = 订单金额 × 系数 × 阶梯比例

      let totalAmount = 0;
      if (userId) {
        const query = orderRepo.createQueryBuilder('o')
          .select('SUM(o.totalAmount * o.performanceCoefficient)', 'total')
          .where('o.createdBy = :userId', { userId })
          .andWhere('o.status IN (:...statuses)', { statuses: signedStatuses })
          .andWhere('o.performanceStatus = :ps', { ps: 'valid' })
          .andWhere('o.performanceCoefficient > 0');

        if (startDate) query.andWhere('o.createdAt >= :startDate', { startDate });
        if (endDate) query.andWhere('o.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

        const result = await query.getRawOne();
        totalAmount = parseFloat(result?.total || '0');
        log.info('[佣金计算] 统计签收业绩总金额（只统计有效订单）:', totalAmount);
      }

      // 根据总业绩匹配阶梯
      let rate = 0;
      for (const ladder of ladders) {
        const min = parseFloat(ladder.minValue?.toString() || '0');
        const max = ladder.maxValue ? parseFloat(ladder.maxValue.toString()) : Infinity;
        log.info('[佣金计算] 检查阶梯:', min, '-', max, '当前业绩:', totalAmount);
        if (totalAmount >= min && totalAmount < max) {
          rate = parseFloat(ladder.commissionRate?.toString() || '0');
          log.info('[佣金计算] ✓ 匹配阶梯，比例:', rate);
          break;
        }
      }

      // 计算单个订单佣金
      const commission = orderAmount * coefficient * rate;
      log.info('[佣金计算] 最终佣金 =', orderAmount, '×', coefficient, '×', rate, '=', commission);
      log.info('[佣金计算] ========== 计算结束 ==========');
      return commission;
    }

    if (commissionType === 'count') {
      // 按签收单数计提：
      // 1. 统计该成员的签收订单数量（有效系数>0的订单，按系数累加）
      // 2. 根据总数量匹配阶梯单价
      // 3. 单个订单佣金 = 系数 × 阶梯单价

      let totalCount = 0;
      if (userId) {
        const query = orderRepo.createQueryBuilder('o')
          .select('SUM(o.performanceCoefficient)', 'total')
          .where('o.createdBy = :userId', { userId })
          .andWhere('o.status IN (:...statuses)', { statuses: signedStatuses })
          .andWhere('o.performanceStatus = :ps', { ps: 'valid' })
          .andWhere('o.performanceCoefficient > 0');

        if (startDate) query.andWhere('o.createdAt >= :startDate', { startDate });
        if (endDate) query.andWhere('o.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

        const result = await query.getRawOne();
        totalCount = parseFloat(result?.total || '0');
        log.info('[佣金计算] 统计签收订单数量（系数合计，只统计有效订单）:', totalCount);
      }

      // 根据总单数匹配阶梯
      let perUnit = 0;
      for (const ladder of ladders) {
        const min = parseFloat(ladder.minValue?.toString() || '0');
        const max = ladder.maxValue ? parseFloat(ladder.maxValue.toString()) : Infinity;
        log.info('[佣金计算] 检查阶梯:', min, '-', max, '当前单数:', totalCount);
        if (totalCount >= min && totalCount < max) {
          perUnit = parseFloat(ladder.commissionPerUnit?.toString() || '0');
          log.info('[佣金计算] ✓ 匹配阶梯，单价:', perUnit);
          break;
        }
      }

      // 计算单个订单佣金
      const commission = coefficient * perUnit;
      log.info('[佣金计算] 最终佣金 =', coefficient, '×', perUnit, '=', commission);
      log.info('[佣金计算] ========== 计算结束 ==========');
      return commission;
    }

    log.info('[佣金计算] 未知的计提类型:', commissionType);
    return 0;
  } catch (error) {
    log.error('[Finance] Calculate commission failed:', error);
    return 0;
  }
}


// Get all config
const getConfigHandler = async (_req: Request, res: Response) => {
  try {
    const configRepo = getTenantRepo(PerformanceConfig);
    const ladderRepo = getTenantRepo(CommissionLadder);
    const settingRepo = getTenantRepo(CommissionSetting);

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
    log.error('[Finance] Get config failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get config' });
  }
};
router.get('/config', getConfigHandler);
router.get('/commission-settings', getConfigHandler);
router.get('/commission-ladders', getConfigHandler);

// Add config
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { configType, configValue, configLabel } = req.body;
    if (!configType || !configValue) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const configRepo = getTenantRepo(PerformanceConfig);
    const maxSort = await configRepo.createQueryBuilder('c').select('MAX(c.sortOrder)', 'max').where('c.configType = :configType', { configType }).getRawOne();

    const config = configRepo.create({ configType, configValue, configLabel: configLabel || configValue, sortOrder: (maxSort?.max || 0) + 1, isActive: 1 });
    await configRepo.save(config);

    res.json({ success: true, message: 'Added successfully', data: config });
  } catch (error: any) {
    log.error('[Finance] Add config failed:', error);
    res.status(500).json({ success: false, message: 'Add failed' });
  }
});

// Update config
router.put('/config/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { configValue, configLabel, sortOrder, isActive } = req.body;

    const configRepo = getTenantRepo(PerformanceConfig);
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
    log.error('[Finance] Update config failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Delete config
router.delete('/config/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const configRepo = getTenantRepo(PerformanceConfig);
    await configRepo.delete({ id: parseInt(id) });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    log.error('[Finance] Delete config failed:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// Add ladder
router.post('/ladder', async (req: Request, res: Response) => {
  try {
    const { commissionType, minValue, maxValue, commissionRate, commissionPerUnit, departmentId, departmentName } = req.body;
    if (!commissionType || minValue === undefined) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const ladderRepo = getTenantRepo(CommissionLadder);
    const maxSort = await ladderRepo.createQueryBuilder('l').select('MAX(l.sortOrder)', 'max').where('l.commissionType = :commissionType', { commissionType }).getRawOne();

    const ladder = ladderRepo.create({
      commissionType,
      departmentId: departmentId || null,
      departmentName: departmentName || null,
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
    log.error('[Finance] Add ladder failed:', error);
    res.status(500).json({ success: false, message: 'Add failed' });
  }
});

// Update ladder
router.put('/ladder/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { minValue, maxValue, commissionRate, commissionPerUnit, sortOrder, isActive, departmentId, departmentName } = req.body;

    const ladderRepo = getTenantRepo(CommissionLadder);
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
    if (departmentId !== undefined) ladder.departmentId = departmentId || null;
    if (departmentName !== undefined) ladder.departmentName = departmentName || null;

    await ladderRepo.save(ladder);
    res.json({ success: true, message: 'Updated successfully', data: ladder });
  } catch (error: any) {
    log.error('[Finance] Update ladder failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Delete ladder
router.delete('/ladder/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ladderRepo = getTenantRepo(CommissionLadder);
    await ladderRepo.delete({ id: parseInt(id) });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    log.error('[Finance] Delete ladder failed:', error);
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

    const settingRepo = getTenantRepo(CommissionSetting);
    let setting = await settingRepo.findOne({ where: { settingKey } });

    if (setting) {
      setting.settingValue = settingValue;
    } else {
      setting = settingRepo.create({ settingKey, settingValue });
    }

    await settingRepo.save(setting);
    res.json({ success: true, message: 'Updated successfully', data: setting });
  } catch (error: any) {
    log.error('[Finance] Update setting failed:', error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

export default router;
