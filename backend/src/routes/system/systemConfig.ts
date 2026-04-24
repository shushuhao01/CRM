/**
 * 系统模块 - 配置管理路由
 * 包含：订单字段配置、通用设置、订单流转、部门下单限制、支付方式、用户设置、系统监控、数据库备份、config键值
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { SystemConfig } from '../../entities/SystemConfig';
import { DepartmentOrderLimit } from '../../entities/DepartmentOrderLimit';
import { User } from '../../entities/User';
import { Customer } from '../../entities/Customer';
import { Order } from '../../entities/Order';
import { OrderItem } from '../../entities/OrderItem';
import { Product } from '../../entities/Product';
import { ProductCategory } from '../../entities/ProductCategory';
import { Role } from '../../entities/Role';
import { Permission } from '../../entities/Permission';
import { AfterSalesService } from '../../entities/AfterSalesService';
import { LogisticsCompany } from '../../entities/LogisticsCompany';
import { LogisticsTracking } from '../../entities/LogisticsTracking';
import { Announcement } from '../../entities/Announcement';
import { PerformanceMetric } from '../../entities/PerformanceMetric';
import { FollowUp } from '../../entities/FollowUp';
import { CustomerTag } from '../../entities/CustomerTag';
import { CustomerGroup } from '../../entities/CustomerGroup';
import { SmsTemplate } from '../../entities/SmsTemplate';
import { Department } from '../../entities/Department';
import { OrderStatusHistory } from '../../entities/OrderStatusHistory';
import { CustomerShare } from '../../entities/CustomerShare';
import { ServiceRecord } from '../../entities/ServiceRecord';
import { ServiceFollowUp } from '../../entities/ServiceFollowUp';
import { ServiceOperationLog } from '../../entities/ServiceOperationLog';
import { OperationLog } from '../../entities/OperationLog';
import { PaymentMethodOption } from '../../entities/PaymentMethodOption';
import { PerformanceConfig } from '../../entities/PerformanceConfig';
import { RejectionReason } from '../../entities/RejectionReason';
import { ImprovementGoal } from '../../entities/ImprovementGoal';
import { CommissionSetting } from '../../entities/CommissionSetting';
import { CommissionLadder } from '../../entities/CommissionLadder';
import { LogisticsTrace } from '../../entities/LogisticsTrace';
import { LogisticsApiConfig } from '../../entities/LogisticsApiConfig';
import { NotificationChannel } from '../../entities/NotificationChannel';
import { CodCancelApplication } from '../../entities/CodCancelApplication';
import { OutsourceCompany } from '../../entities/OutsourceCompany';
import { ValueAddedOrder } from '../../entities/ValueAddedOrder';
import { ValueAddedPriceConfig } from '../../entities/ValueAddedPriceConfig';
import { ValueAddedStatusConfig } from '../../entities/ValueAddedStatusConfig';
import { getTenantRepo } from '../../utils/tenantRepo';
import { TenantContextManager } from '../../utils/tenantContext';
import { cacheService } from '../../services/CacheService';
import { getConfigsByGroup, saveConfigsByGroup } from './systemHelpers';
import path from 'path';
import fs from 'fs';

import { log } from '../../config/logger';
export function registerConfigRoutes(router: Router): void {
// ========== 订单字段配置路由 ==========

/**
 * @route GET /api/v1/system/order-field-config
 * @desc 获取订单字段配置
 * @access Private
 */
router.get('/order-field-config', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const configRepository = getTenantRepo(SystemConfig);
    const config = await configRepository.findOne({
      where: { configKey: 'orderFieldConfig', configGroup: 'order_settings' }
    });

    if (config) {
      res.json({ success: true, code: 200, data: JSON.parse(config.configValue) });
    } else {
      // 返回默认配置
      res.json({
        success: true,
        code: 200,
        data: {
          orderSource: {
            fieldName: '订单来源',
            options: [
              { label: '线上商城', value: 'online_store' },
              { label: '微信小程序', value: 'wechat_mini' },
              { label: '电话咨询', value: 'phone_call' },
              { label: '其他渠道', value: 'other' }
            ]
          },
          customFields: []
        }
      });
    }
  } catch (error) {
    log.error('获取订单字段配置失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取订单字段配置失败' });
  }
});

/**
 * @route PUT /api/v1/system/order-field-config
 * @desc 更新订单字段配置
 * @access Private (Admin)
 */
router.put('/order-field-config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepository = getTenantRepo(SystemConfig);
    let config = await configRepository.findOne({
      where: { configKey: 'orderFieldConfig', configGroup: 'order_settings' }
    });

    if (config) {
      config.configValue = JSON.stringify(req.body);
    } else {
      config = configRepository.create({
        configKey: 'orderFieldConfig',
        configValue: JSON.stringify(req.body),
        valueType: 'json',
        configGroup: 'order_settings',
        description: '订单字段配置',
        isEnabled: true,
        isSystem: true
      });
    }

    await configRepository.save(config);
    res.json({ success: true, code: 200, message: '订单字段配置保存成功' });
  } catch (error) {
    log.error('保存订单字段配置失败:', error);
    res.status(500).json({ success: false, code: 500, message: '保存订单字段配置失败' });
  }
});

// ========== 客户字段配置路由 ==========

/**
 * @route GET /api/v1/system/customer-field-config
 * @desc 获取客户字段配置
 * @access Private
 */
router.get('/customer-field-config', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const configRepository = getTenantRepo(SystemConfig);
    const config = await configRepository.findOne({
      where: { configKey: 'customerFieldConfig', configGroup: 'customer_settings' }
    });

    if (config) {
      res.json({ success: true, code: 200, data: JSON.parse(config.configValue) });
    } else {
      // 返回默认配置
      res.json({
        success: true,
        code: 200,
        data: {
          fieldVisibility: {
            phone: { enabled: true, required: true },
            name: { enabled: true, required: true },
            gender: { enabled: true, required: false },
            age: { enabled: true, required: false },
            height: { enabled: true, required: false },
            weight: { enabled: true, required: false },
            email: { enabled: true, required: false },
            wechat: { enabled: true, required: false },
            fanAcquisitionTime: { enabled: true, required: false },
            medicalHistory: { enabled: true, required: false },
            improvementGoals: { enabled: true, required: false }
          },
          customFields: []
        }
      });
    }
  } catch (error) {
    log.error('获取客户字段配置失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户字段配置失败' });
  }
});

/**
 * @route PUT /api/v1/system/customer-field-config
 * @desc 更新客户字段配置
 * @access Private (Admin)
 */
router.put('/customer-field-config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepository = getTenantRepo(SystemConfig);
    let config = await configRepository.findOne({
      where: { configKey: 'customerFieldConfig', configGroup: 'customer_settings' }
    });

    if (config) {
      config.configValue = JSON.stringify(req.body);
    } else {
      config = configRepository.create({
        configKey: 'customerFieldConfig',
        configValue: JSON.stringify(req.body),
        valueType: 'json',
        configGroup: 'customer_settings',
        description: '客户字段配置',
        isEnabled: true,
        isSystem: true
      });
    }

    await configRepository.save(config);
    res.json({ success: true, code: 200, message: '客户字段配置保存成功' });
  } catch (error) {
    log.error('保存客户字段配置失败:', error);
    res.status(500).json({ success: false, code: 500, message: '保存客户字段配置失败' });
  }
});

// ========== 通用设置路由 ==========

/**
 * @route GET /api/v1/system/settings
 * @desc 获取系统设置（通用）
 * @access Private
 */
router.get('/settings', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const configRepository = getTenantRepo(SystemConfig);
    const configs = await configRepository.find({
      where: { isEnabled: true },
      order: { configGroup: 'ASC', sortOrder: 'ASC' }
    });

    const settings: Record<string, Record<string, unknown>> = {};
    configs.forEach(config => {
      if (!settings[config.configGroup]) {
        settings[config.configGroup] = {};
      }
      settings[config.configGroup][config.configKey] = config.getParsedValue();
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    log.error('获取系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统设置失败'
    });
  }
});

/**
 * @route POST /api/v1/system/settings
 * @desc 保存系统设置（通用）
 * @access Private (Admin)
 */
router.post('/settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type, config } = req.body;
    const configRepository = getTenantRepo(SystemConfig);

    if (type && config) {
      // 保存特定类型的配置
      for (const [key, value] of Object.entries(config)) {
        let existingConfig = await configRepository.findOne({
          where: { configKey: key, configGroup: type }
        });

        if (existingConfig) {
          existingConfig.configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        } else {
          existingConfig = configRepository.create({
            configKey: key,
            configValue: typeof value === 'object' ? JSON.stringify(value) : String(value),
            valueType: typeof value === 'object' ? 'json' : typeof value as 'string' | 'number' | 'boolean',
            configGroup: type,
            isEnabled: true,
            isSystem: false
          });
        }
        await configRepository.save(existingConfig);
      }
    }

    res.json({
      success: true,
      message: '设置保存成功'
    });
  } catch (error) {
    log.error('保存系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存系统设置失败'
    });
  }
});

// ========== 订单流转配置 ==========

/**
 * @route GET /api/v1/system/order-transfer-config
 * @desc 获取订单流转时间配置
 * @access Private
 */
router.get('/order-transfer-config', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const configRepository = getTenantRepo(SystemConfig);

    const modeConfig = await configRepository.findOne({
      where: { configKey: 'orderTransferMode', configGroup: 'order_settings', isEnabled: true }
    });
    const delayConfig = await configRepository.findOne({
      where: { configKey: 'orderTransferDelayMinutes', configGroup: 'order_settings', isEnabled: true }
    });

    res.json({
      success: true,
      data: {
        mode: modeConfig?.configValue || 'delayed',
        delayMinutes: delayConfig ? Number(delayConfig.configValue) : 3
      }
    });
  } catch (error) {
    log.error('获取订单流转配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单流转配置失败'
    });
  }
});

/**
 * @route POST /api/v1/system/order-transfer-config
 * @desc 保存订单流转时间配置（仅管理员）
 * @access Private (Admin only)
 */
router.post('/order-transfer-config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { mode, delayMinutes } = req.body;
    const configRepository = getTenantRepo(SystemConfig);

    // 保存流转模式
    let modeConfig = await configRepository.findOne({
      where: { configKey: 'orderTransferMode', configGroup: 'order_settings' }
    });
    if (modeConfig) {
      modeConfig.configValue = mode;
    } else {
      modeConfig = configRepository.create({
        configKey: 'orderTransferMode',
        configValue: mode,
        valueType: 'string',
        configGroup: 'order_settings',
        description: '订单流转模式：immediate-立即流转，delayed-延迟流转',
        isEnabled: true,
        isSystem: true
      });
    }
    await configRepository.save(modeConfig);

    // 保存延迟时间
    let delayConfig = await configRepository.findOne({
      where: { configKey: 'orderTransferDelayMinutes', configGroup: 'order_settings' }
    });
    if (delayConfig) {
      delayConfig.configValue = String(delayMinutes);
    } else {
      delayConfig = configRepository.create({
        configKey: 'orderTransferDelayMinutes',
        configValue: String(delayMinutes),
        valueType: 'number',
        configGroup: 'order_settings',
        description: '订单流转延迟时间（分钟）',
        isEnabled: true,
        isSystem: true
      });
    }
    await configRepository.save(delayConfig);

    log.info(`✅ [订单流转配置] 已保存: mode=${mode}, delayMinutes=${delayMinutes}`);

    res.json({
      success: true,
      message: '订单流转配置保存成功'
    });
  } catch (error) {
    log.error('保存订单流转配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存订单流转配置失败'
    });
  }
});

// ========== 部门下单限制配置 ==========

/**
 * @route GET /api/v1/system/department-order-limits
 * @desc 获取所有部门下单限制配置
 * @access Private (Admin)
 */
router.get('/department-order-limits', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const repository = getTenantRepo(DepartmentOrderLimit);
    const limits = await repository.find({
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      code: 200,
      data: limits
    });
  } catch (error) {
    log.error('获取部门下单限制配置失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取部门下单限制配置失败'
    });
  }
});

/**
 * @route GET /api/v1/system/department-order-limits/:departmentId
 * @desc 获取指定部门的下单限制配置
 * @access Private
 */
router.get('/department-order-limits/:departmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const repository = getTenantRepo(DepartmentOrderLimit);
    const limit = await repository.findOne({
      where: { departmentId, isEnabled: true }
    });

    res.json({
      success: true,
      code: 200,
      data: limit || null
    });
  } catch (error) {
    log.error('获取部门下单限制配置失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取部门下单限制配置失败'
    });
  }
});

/**
 * @route POST /api/v1/system/department-order-limits
 * @desc 创建或更新部门下单限制配置
 * @access Private (Admin)
 */
router.post('/department-order-limits', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      departmentId,
      departmentName,
      orderCountEnabled,
      maxOrderCount,
      singleAmountEnabled,
      maxSingleAmount,
      totalAmountEnabled,
      maxTotalAmount,
      isEnabled,
      remark
    } = req.body;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '部门ID不能为空'
      });
    }

    const repository = getTenantRepo(DepartmentOrderLimit);
    const currentUser = (req as any).currentUser;

    // 查找是否已存在配置
    let limit = await repository.findOne({ where: { departmentId } });

    if (limit) {
      // 更新现有配置
      limit.departmentName = departmentName;
      limit.orderCountEnabled = orderCountEnabled ?? false;
      limit.maxOrderCount = maxOrderCount ?? 0;
      limit.singleAmountEnabled = singleAmountEnabled ?? false;
      limit.maxSingleAmount = maxSingleAmount ?? 0;
      limit.totalAmountEnabled = totalAmountEnabled ?? false;
      limit.maxTotalAmount = maxTotalAmount ?? 0;
      limit.isEnabled = isEnabled ?? true;
      limit.remark = remark;
      limit.updatedBy = currentUser?.id;
      limit.updatedByName = currentUser?.name || currentUser?.username;
    } else {
      // 创建新配置
      limit = repository.create({
        id: `dol_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        departmentId,
        departmentName,
        orderCountEnabled: orderCountEnabled ?? false,
        maxOrderCount: maxOrderCount ?? 0,
        singleAmountEnabled: singleAmountEnabled ?? false,
        maxSingleAmount: maxSingleAmount ?? 0,
        totalAmountEnabled: totalAmountEnabled ?? false,
        maxTotalAmount: maxTotalAmount ?? 0,
        isEnabled: isEnabled ?? true,
        remark,
        createdBy: currentUser?.id,
        createdByName: currentUser?.name || currentUser?.username
      });
    }

    await repository.save(limit);

    log.info(`✅ [部门下单限制] 部门 ${departmentName}(${departmentId}) 配置已保存`);

    res.json({
      success: true,
      code: 200,
      message: '部门下单限制配置保存成功',
      data: limit
    });
  } catch (error) {
    log.error('保存部门下单限制配置失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '保存部门下单限制配置失败'
    });
  }
});

/**
 * @route DELETE /api/v1/system/department-order-limits/:departmentId
 * @desc 删除部门下单限制配置
 * @access Private (Admin)
 */
router.delete('/department-order-limits/:departmentId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const repository = getTenantRepo(DepartmentOrderLimit);

    const result = await repository.delete({ departmentId });

    if (result.affected === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '配置不存在'
      });
    }

    log.info(`✅ [部门下单限制] 部门 ${departmentId} 配置已删除`);

    res.json({
      success: true,
      code: 200,
      message: '部门下单限制配置删除成功'
    });
  } catch (error) {
    log.error('删除部门下单限制配置失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '删除部门下单限制配置失败'
    });
  }
});

// ========== 支付方式配置 ==========

/**
 * @route GET /api/v1/system/payment-methods
 * @desc 获取支付方式列表（包含全局预设 + 当前租户自定义）
 */
router.get('/payment-methods', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const { PaymentMethodOption } = await import('../../entities/PaymentMethodOption');
    const repo = AppDataSource.getRepository(PaymentMethodOption);
    const tenantId = TenantContextManager.getTenantId();

    // 查询全局预设（tenant_id IS NULL）+ 当前租户自定义的支付方式
    const qb = repo.createQueryBuilder('pm')
      .where('pm.is_enabled = :enabled', { enabled: true });

    if (tenantId) {
      qb.andWhere('(pm.tenant_id = :tenantId OR pm.tenant_id IS NULL)', { tenantId });
    }

    qb.orderBy('pm.sort_order', 'ASC');
    const methods = await qb.getMany();

    res.json({
      success: true,
      code: 200,
      data: methods
    });
  } catch (error) {
    log.error('获取支付方式列表失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取支付方式列表失败'
    });
  }
});

/**
 * @route GET /api/v1/system/payment-methods/all
 * @desc 获取所有支付方式（包括禁用的，包含全局预设 + 当前租户自定义）
 */
router.get('/payment-methods/all', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const { PaymentMethodOption } = await import('../../entities/PaymentMethodOption');
    const repo = AppDataSource.getRepository(PaymentMethodOption);
    const tenantId = TenantContextManager.getTenantId();

    const qb = repo.createQueryBuilder('pm');

    if (tenantId) {
      qb.where('(pm.tenant_id = :tenantId OR pm.tenant_id IS NULL)', { tenantId });
    }

    qb.orderBy('pm.sort_order', 'ASC');
    const methods = await qb.getMany();

    res.json({
      success: true,
      code: 200,
      data: methods
    });
  } catch (error) {
    log.error('获取所有支付方式失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取所有支付方式失败'
    });
  }
});

/**
 * @route POST /api/v1/system/payment-methods
 * @desc 添加支付方式（租户自定义）
 */
router.post('/payment-methods', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { label, value } = req.body;

    if (!label || !value) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '支付方式名称和值不能为空'
      });
    }

    const { PaymentMethodOption } = await import('../../entities/PaymentMethodOption');
    const repo = AppDataSource.getRepository(PaymentMethodOption);
    const tenantId = TenantContextManager.getTenantId();

    // 检查是否已存在（同时检查全局预设和当前租户的）
    const existingQb = repo.createQueryBuilder('pm')
      .where('pm.value = :value', { value });
    if (tenantId) {
      existingQb.andWhere('(pm.tenant_id = :tenantId OR pm.tenant_id IS NULL)', { tenantId });
    }
    const existing = await existingQb.getOne();

    if (existing) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '该支付方式值已存在'
      });
    }

    // 获取最大排序号（含全局预设）
    const maxOrderQb = repo.createQueryBuilder('pm')
      .select('MAX(pm.sort_order)', 'max');
    if (tenantId) {
      maxOrderQb.where('(pm.tenant_id = :tenantId OR pm.tenant_id IS NULL)', { tenantId });
    }
    const maxOrder = await maxOrderQb.getRawOne();

    const newMethod = repo.create({
      id: `pm_${Date.now()}`,
      tenantId: tenantId || undefined,
      label,
      value,
      sortOrder: (maxOrder?.max || 0) + 1,
      isEnabled: true,
      isSystem: false
    });

    await repo.save(newMethod);

    res.json({
      success: true,
      code: 200,
      message: '支付方式添加成功',
      data: newMethod
    });
  } catch (error) {
    log.error('添加支付方式失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '添加支付方式失败'
    });
  }
});

/**
 * @route PUT /api/v1/system/payment-methods/:id
 * @desc 更新支付方式（可修改全局预设的启用状态，但不能修改其value）
 */
router.put('/payment-methods/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, value, isEnabled, sortOrder } = req.body;

    const { PaymentMethodOption } = await import('../../entities/PaymentMethodOption');
    const repo = AppDataSource.getRepository(PaymentMethodOption);
    const tenantId = TenantContextManager.getTenantId();

    // 查询时同时包含全局预设和当前租户的
    const qb = repo.createQueryBuilder('pm')
      .where('pm.id = :id', { id });
    if (tenantId) {
      qb.andWhere('(pm.tenant_id = :tenantId OR pm.tenant_id IS NULL)', { tenantId });
    }
    const method = await qb.getOne();

    if (!method) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '支付方式不存在'
      });
    }

    // 系统预设支付方式：只允许修改启用/禁用和排序，不允许修改value
    if (method.isSystem && method.tenantId === null) {
      if (isEnabled !== undefined) method.isEnabled = isEnabled;
      if (sortOrder !== undefined) method.sortOrder = sortOrder;
      // label可以修改（租户想自定义显示名称）
      if (label !== undefined) method.label = label;
    } else {
      if (label !== undefined) method.label = label;
      if (value !== undefined) method.value = value;
      if (isEnabled !== undefined) method.isEnabled = isEnabled;
      if (sortOrder !== undefined) method.sortOrder = sortOrder;
    }

    await repo.save(method);

    res.json({
      success: true,
      code: 200,
      message: '支付方式更新成功',
      data: method
    });
  } catch (error) {
    log.error('更新支付方式失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '更新支付方式失败'
    });
  }
});

/**
 * @route DELETE /api/v1/system/payment-methods/:id
 * @desc 删除支付方式（不允许删除系统预设的支付方式）
 */
router.delete('/payment-methods/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { PaymentMethodOption } = await import('../../entities/PaymentMethodOption');
    const repo = AppDataSource.getRepository(PaymentMethodOption);
    const tenantId = TenantContextManager.getTenantId();

    const qb = repo.createQueryBuilder('pm')
      .where('pm.id = :id', { id });
    if (tenantId) {
      qb.andWhere('(pm.tenant_id = :tenantId OR pm.tenant_id IS NULL)', { tenantId });
    }
    const method = await qb.getOne();

    if (!method) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '支付方式不存在'
      });
    }

    // 系统预设不允许删除
    if (method.isSystem) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: '系统预设的支付方式不允许删除，只能禁用'
      });
    }

    await repo.remove(method);

    res.json({
      success: true,
      code: 200,
      message: '支付方式删除成功'
    });
  } catch (error) {
    log.error('删除支付方式失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '删除支付方式失败'
    });
  }
});

// ========== 用户个人设置（列设置等）==========

/**
 * @route GET /api/v1/system/user-settings/:settingKey
 * @desc 获取用户个人设置
 * @access Private
 */
router.get('/user-settings/:settingKey', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { settingKey } = req.params;
    const currentUser = (req as any).currentUser;

    if (!currentUser?.id) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: '用户未登录'
      });
    }

    const configRepository = getTenantRepo(SystemConfig);
    const configKey = `user_${currentUser.id}_${settingKey}`;

    const config = await configRepository.findOne({
      where: { configKey, configGroup: 'user_settings', isEnabled: true }
    });

    res.json({
      success: true,
      code: 200,
      data: config ? JSON.parse(config.configValue) : null
    });
  } catch (error) {
    log.error('获取用户设置失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取用户设置失败'
    });
  }
});

/**
 * @route POST /api/v1/system/user-settings/:settingKey
 * @desc 保存用户个人设置
 * @access Private
 */
router.post('/user-settings/:settingKey', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { settingKey } = req.params;
    const currentUser = (req as any).currentUser;

    if (!currentUser?.id) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: '用户未登录'
      });
    }

    const configRepository = getTenantRepo(SystemConfig);
    const configKey = `user_${currentUser.id}_${settingKey}`;

    let config = await configRepository.findOne({
      where: { configKey, configGroup: 'user_settings' }
    });

    if (config) {
      config.configValue = JSON.stringify(req.body);
    } else {
      config = configRepository.create({
        configKey,
        configValue: JSON.stringify(req.body),
        valueType: 'json',
        configGroup: 'user_settings',
        description: `用户 ${currentUser.id} 的 ${settingKey} 设置`,
        isEnabled: true,
        isSystem: false
      });
    }

    await configRepository.save(config);

    log.info(`✅ [用户设置] 用户 ${currentUser.id} 的 ${settingKey} 设置已保存`);

    res.json({
      success: true,
      code: 200,
      message: '设置保存成功'
    });
  } catch (error) {
    log.error('保存用户设置失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '保存用户设置失败'
    });
  }
});

// ========== 系统监控路由 ==========

/**
 * @route GET /api/v1/system/monitor
 * @desc 获取系统监控数据
 * @access Private (Admin)
 */
router.get('/monitor', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const os = await import('os');

    // 获取系统信息
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = Math.round((usedMemory / totalMemory) * 100);

    // 计算CPU使用率
    let cpuUsage = 0;
    if (cpus.length > 0) {
      const cpu = cpus[0];
      const total = cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
      const idle = cpu.times.idle;
      cpuUsage = Math.round(((total - idle) / total) * 100);
    }

    // 格式化内存大小
    const formatBytes = (bytes: number): string => {
      if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
      if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
      return `${(bytes / 1024).toFixed(2)} KB`;
    };

    // 格式化运行时间
    const formatUptime = (seconds: number): string => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (days > 0) return `${days}天 ${hours}小时 ${minutes}分钟`;
      if (hours > 0) return `${hours}小时 ${minutes}分钟`;
      return `${minutes}分钟`;
    };

    // 获取数据库连接状态
    let dbConnected = false;
    let dbActiveConnections = 0;
    try {
      if (AppDataSource.isInitialized) {
        dbConnected = true;
        // 尝试获取活跃连接数
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        dbActiveConnections = 1; // 至少有一个连接
        await queryRunner.release();
      }
    } catch {
      dbConnected = false;
    }

    const monitorData = {
      systemInfo: {
        os: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        cpuCores: cpus.length,
        totalMemory: formatBytes(totalMemory),
        nodeVersion: process.version,
        uptime: formatUptime(os.uptime())
      },
      performance: {
        cpuUsage,
        memoryUsage,
        diskUsage: 0, // 磁盘使用率需要额外的库来获取
        networkLatency: 0 // 网络延迟需要实际测量
      },
      database: {
        type: 'MySQL',
        version: '8.0',
        connected: dbConnected,
        activeConnections: dbActiveConnections,
        size: '计算中...',
        lastBackup: '未备份'
      },
      services: [
        {
          name: '后端API服务',
          status: 'running',
          port: process.env.PORT || '3000',
          uptime: formatUptime(process.uptime()),
          memory: formatBytes(process.memoryUsage().heapUsed)
        },
        {
          name: '数据库服务',
          status: dbConnected ? 'running' : 'stopped',
          port: process.env.DB_PORT || '3306',
          uptime: dbConnected ? '运行中' : '已停止',
          memory: '-'
        }
      ]
    };

    res.json({
      success: true,
      data: monitorData
    });
  } catch (error) {
    log.error('获取系统监控数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统监控数据失败'
    });
  }
});

// ========== 数据库备份路由（租户隔离版） ==========

/**
 * 🔥 获取当前请求的租户ID（用于备份文件隔离）
 */
const getBackupTenantId = (): string => {
  return TenantContextManager.getTenantId() || 'default';
};

/**
 * 🔥 获取租户专属备份目录
 */
const getTenantBackupDir = (): string => {
  const tenantId = getBackupTenantId();
  const dir = path.join(process.cwd(), 'backups', tenantId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

/**
 * 🔥 构建租户备份用的完整实体列表（35个核心业务表）
 * 全部使用 getTenantRepo 确保只备份当前租户的数据
 */
const buildBackupEntities = () => [
  // ===== 基础配置 =====
  { name: 'system_configs', repo: getTenantRepo(SystemConfig) },
  { name: 'roles', repo: getTenantRepo(Role) },
  { name: 'permissions', repo: getTenantRepo(Permission) },
  { name: 'payment_method_options', repo: getTenantRepo(PaymentMethodOption) },
  { name: 'rejection_reasons', repo: getTenantRepo(RejectionReason) },
  { name: 'improvement_goals', repo: getTenantRepo(ImprovementGoal) },
  // ===== 组织架构 =====
  { name: 'departments', repo: getTenantRepo(Department) },
  { name: 'department_order_limits', repo: getTenantRepo(DepartmentOrderLimit) },
  { name: 'users', repo: getTenantRepo(User) },
  // ===== 商品相关 =====
  { name: 'product_categories', repo: getTenantRepo(ProductCategory) },
  { name: 'products', repo: getTenantRepo(Product) },
  // ===== 客户相关 =====
  { name: 'customers', repo: getTenantRepo(Customer) },
  { name: 'customer_tags', repo: getTenantRepo(CustomerTag) },
  { name: 'customer_groups', repo: getTenantRepo(CustomerGroup) },
  { name: 'customer_shares', repo: getTenantRepo(CustomerShare) },
  { name: 'follow_up_records', repo: getTenantRepo(FollowUp) },
  // ===== 订单相关 =====
  { name: 'orders', repo: getTenantRepo(Order) },
  { name: 'order_items', repo: getTenantRepo(OrderItem) },
  { name: 'order_status_history', repo: getTenantRepo(OrderStatusHistory) },
  { name: 'cod_cancel_applications', repo: getTenantRepo(CodCancelApplication) },
  // ===== 售后服务 =====
  { name: 'after_sales_services', repo: getTenantRepo(AfterSalesService) },
  { name: 'service_records', repo: getTenantRepo(ServiceRecord) },
  { name: 'service_follow_ups', repo: getTenantRepo(ServiceFollowUp) },
  // ===== 物流相关 =====
  { name: 'logistics_companies', repo: getTenantRepo(LogisticsCompany) },
  { name: 'logistics_tracking', repo: getTenantRepo(LogisticsTracking) },
  { name: 'logistics_traces', repo: getTenantRepo(LogisticsTrace) },
  { name: 'logistics_api_configs', repo: getTenantRepo(LogisticsApiConfig) },
  // ===== 业绩/佣金 =====
  { name: 'performance_metrics', repo: getTenantRepo(PerformanceMetric) },
  { name: 'performance_configs', repo: getTenantRepo(PerformanceConfig) },
  { name: 'commission_settings', repo: getTenantRepo(CommissionSetting) },
  { name: 'commission_ladders', repo: getTenantRepo(CommissionLadder) },
  // ===== 增值服务 =====
  { name: 'value_added_orders', repo: getTenantRepo(ValueAddedOrder) },
  { name: 'value_added_price_config', repo: getTenantRepo(ValueAddedPriceConfig) },
  { name: 'value_added_status_configs', repo: getTenantRepo(ValueAddedStatusConfig) },
  // ===== 外包/协作 =====
  { name: 'outsource_companies', repo: getTenantRepo(OutsourceCompany) },
  // ===== 通知/消息 =====
  { name: 'announcements', repo: getTenantRepo(Announcement) },
  { name: 'notification_channels', repo: getTenantRepo(NotificationChannel) },
  // ===== 短信/模板 =====
  { name: 'sms_templates', repo: getTenantRepo(SmsTemplate) },
  // ===== 操作日志 =====
  { name: 'operation_logs', repo: getTenantRepo(OperationLog) },
  { name: 'service_operation_logs', repo: getTenantRepo(ServiceOperationLog) },
];

/**
 * @route GET /api/v1/system/backup/list
 * @desc 获取当前租户的备份列表
 * @access Private (Admin)
 */
router.get('/backup/list', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const backupDir = getTenantBackupDir();

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.gz'))
      .map(filename => {
        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);
        const isManual = filename.includes('manual');
        return {
          filename,
          timestamp: stats.mtime.toISOString(),
          size: stats.size,
          type: isManual ? 'manual' : 'auto'
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, data: files });
  } catch (error) {
    log.error('获取备份列表失败:', error);
    res.status(500).json({ success: false, message: '获取备份列表失败' });
  }
});

/**
 * @route POST /api/v1/system/backup/create
 * @desc 创建当前租户的数据备份（仅备份本租户数据）
 * @access Private (Admin)
 */
router.post('/backup/create', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type = 'manual' } = req.body;
    const tenantId = getBackupTenantId();
    const backupDir = getTenantBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${type}-backup-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    const backupData: Record<string, unknown[]> = {};
    const entities = buildBackupEntities();

    log.info(`[备份] 租户 ${tenantId} 开始备份 ${entities.length} 个数据表...`);

    for (const entity of entities) {
      try {
        // getTenantRepo 自动只查询当前租户的数据
        const data = await entity.repo.find();
        backupData[entity.name] = data;
        log.info(`[备份] ${entity.name}: ${data.length} 条记录`);
      } catch (err) {
        // 表不存在等情况下跳过，不中断整个备份
        log.warn(`[备份] ${entity.name} 跳过:`, (err as Error).message?.substring(0, 80));
        backupData[entity.name] = [];
      }
    }

    const totalRecords = Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0);
    const backup = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      tenantId,
      type,
      data: backupData,
      metadata: {
        tables: Object.keys(backupData).filter(k => (backupData[k] as unknown[]).length > 0),
        tableCount: Object.keys(backupData).length,
        totalRecords,
        recordsByTable: Object.fromEntries(
          Object.entries(backupData).map(([name, data]) => [name, (data as unknown[]).length])
        )
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
    const stats = fs.statSync(filePath);
    log.info(`[备份] 租户 ${tenantId} 备份完成: ${filename}, 大小: ${(stats.size / 1024).toFixed(2)} KB, 共 ${totalRecords} 条记录`);

    res.json({
      success: true,
      message: '备份创建成功',
      data: {
        filename,
        timestamp: backup.timestamp,
        size: stats.size,
        type,
        tables: backup.metadata.tables,
        totalRecords: backup.metadata.totalRecords
      }
    });
  } catch (error) {
    log.error('创建备份失败:', error);
    res.status(500).json({
      success: false,
      message: '创建备份失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

/**
 * @route GET /api/v1/system/backup/download/:filename
 * @desc 下载当前租户的备份文件
 * @access Private (Admin)
 */
router.get('/backup/download/:filename', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const backupDir = getTenantBackupDir();
    const filePath = path.join(backupDir, path.basename(filename));

    if (!filePath.startsWith(backupDir)) {
      return res.status(400).json({ success: false, message: '无效的文件路径' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '备份文件不存在' });
    }

    res.download(filePath, filename);
  } catch (error) {
    log.error('下载备份失败:', error);
    res.status(500).json({ success: false, message: '下载备份失败' });
  }
});

/**
 * @route DELETE /api/v1/system/backup/:filename
 * @desc 删除当前租户的备份文件
 * @access Private (Admin)
 */
router.delete('/backup/:filename', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const backupDir = getTenantBackupDir();
    const filePath = path.join(backupDir, path.basename(filename));

    if (!filePath.startsWith(backupDir)) {
      return res.status(400).json({ success: false, message: '无效的文件路径' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '备份文件不存在' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: '备份删除成功' });
  } catch (error) {
    log.error('删除备份失败:', error);
    res.status(500).json({ success: false, message: '删除备份失败' });
  }
});

/**
 * @route GET /api/v1/system/backup/status
 * @desc 获取当前租户的备份状态
 * @access Private (Admin)
 */
router.get('/backup/status', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const backupDir = getTenantBackupDir();

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.gz'))
      .map(filename => {
        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);
        return { filename, timestamp: stats.mtime, size: stats.size };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const lastBackup = files.length > 0 ? files[0].timestamp.toISOString() : null;
    const settings = await getConfigsByGroup('backup_settings');

    res.json({
      success: true,
      data: {
        backupCount: files.length,
        totalSize,
        lastBackupTime: lastBackup,
        autoBackupEnabled: settings.autoBackupEnabled || false
      }
    });
  } catch (error) {
    log.error('获取备份状态失败:', error);
    res.status(500).json({ success: false, message: '获取备份状态失败' });
  }
});

/**
 * @route POST /api/v1/system/backup/restore/:filename
 * @desc 从备份恢复数据（🔥 仅恢复当前租户的数据，不影响其他租户）
 * @access Private (Admin)
 */
router.post('/backup/restore/:filename', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const tenantId = getBackupTenantId();
    const backupDir = getTenantBackupDir();
    const filePath = path.join(backupDir, path.basename(filename));

    if (!filePath.startsWith(backupDir)) {
      return res.status(400).json({ success: false, message: '无效的文件路径' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '备份文件不存在' });
    }

    const backupContent = fs.readFileSync(filePath, 'utf-8');
    const backup = JSON.parse(backupContent);

    if (!backup.data || !backup.version) {
      return res.status(400).json({ success: false, message: '备份文件格式无效' });
    }

    // 🔥 校验备份的租户归属
    if (backup.tenantId && backup.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: '该备份不属于当前租户，无法恢复'
      });
    }

    log.info(`[恢复] 租户 ${tenantId} 开始从备份恢复: ${filename}`);
    log.info(`[恢复] 备份版本: ${backup.version}, 时间: ${backup.timestamp}`);

    const restoreResults: Record<string, { success: boolean; count: number; error?: string }> = {};
    const entities = buildBackupEntities();

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const entity of entities) {
        const tableData = backup.data[entity.name];
        if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
          restoreResults[entity.name] = { success: true, count: 0 };
          continue;
        }

        try {
          // 🔥 关键修复：只删除当前租户的数据，不影响其他租户
          await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
          await queryRunner.query(
            `DELETE FROM \`${entity.name}\` WHERE tenant_id = ?`,
            [tenantId]
          );
          await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);

          // 插入恢复数据
          const repo = entity.repo as any;
          // 分批插入避免超大事务
          const batchSize = 100;
          for (let i = 0; i < tableData.length; i += batchSize) {
            const batch = tableData.slice(i, i + batchSize);
            await repo.save(batch);
          }

          restoreResults[entity.name] = { success: true, count: tableData.length };
          log.info(`[恢复] ${entity.name}: 恢复 ${tableData.length} 条记录`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '未知错误';
          restoreResults[entity.name] = { success: false, count: 0, error: errorMsg.substring(0, 120) };
          log.error(`[恢复] ${entity.name} 失败:`, errorMsg.substring(0, 120));
        }
      }

      await queryRunner.commitTransaction();
      log.info(`[恢复] 租户 ${tenantId} 数据恢复完成`);

      res.json({
        success: true,
        message: '数据恢复成功',
        data: {
          filename,
          backupTime: backup.timestamp,
          results: restoreResults,
          totalRestored: Object.values(restoreResults).reduce((sum, r) => sum + r.count, 0)
        }
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    log.error('恢复备份失败:', error);
    res.status(500).json({
      success: false,
      message: '恢复备份失败: ' + (error instanceof Error ? error.message : '未知错误')
    });
  }
});

/**
 * @route DELETE /api/v1/system/backup/cleanup
 * @desc 清理当前租户的过期备份文件
 * @access Private (Admin)
 */
router.delete('/backup/cleanup', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { retentionDays = 30 } = req.body;
    const backupDir = getTenantBackupDir();

    const now = Date.now();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let freedSize = 0;

    const files = fs.readdirSync(backupDir);
    for (const filename of files) {
      if (!filename.endsWith('.json') && !filename.endsWith('.gz')) continue;

      const filePath = path.join(backupDir, filename);
      const stats = fs.statSync(filePath);
      if (now - stats.mtime.getTime() > retentionMs) {
        freedSize += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
        log.info(`[清理] 删除过期备份: ${filename}`);
      }
    }

    res.json({
      success: true,
      message: `清理完成，删除了 ${deletedCount} 个过期备份`,
      data: {
        deletedCount,
        freedSize,
        freedSizeFormatted: `${(freedSize / 1024 / 1024).toFixed(2)} MB`
      }
    });
  } catch (error) {
    log.error('清理备份失败:', error);
    res.status(500).json({ success: false, message: '清理备份失败' });
  }
});

/**
 * @route GET /api/v1/system/config/:configKey
 * @desc 获取单个系统配置（支持用户级和系统级配置）
 * @access Private
 */
router.get('/config/:configKey', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configKey } = req.params;
    const currentUser = (req as any).user;
    const configRepository = getTenantRepo(SystemConfig);

    // 🔥 对于寄件人手机号配置，支持用户级和系统级
    if (configKey === 'logistics_sender_phone') {
      // 1. 先查找用户级配置
      const userConfigKey = `user_${currentUser.id}_${configKey}`;
      const userConfig = await configRepository.findOne({
        where: { configKey: userConfigKey, isEnabled: true }
      });

      if (userConfig && userConfig.configValue) {
        return res.json({
          success: true,
          data: {
            configKey: configKey,
            configValue: userConfig.configValue,
            valueType: userConfig.valueType,
            description: userConfig.description,
            isUserLevel: true  // 标记为用户级配置
          }
        });
      }

      // 2. 没有用户级配置，查找系统级配置（管理员设置的）
      const systemConfig = await configRepository.findOne({
        where: { configKey: `system_${configKey}`, isEnabled: true }
      });

      if (systemConfig && systemConfig.configValue) {
        return res.json({
          success: true,
          data: {
            configKey: configKey,
            configValue: systemConfig.configValue,
            valueType: systemConfig.valueType,
            description: systemConfig.description,
            isSystemLevel: true  // 标记为系统级配置
          }
        });
      }

      // 3. 兼容旧数据：查找原来的配置
      const legacyConfig = await configRepository.findOne({
        where: { configKey, isEnabled: true }
      });

      if (legacyConfig && legacyConfig.configValue) {
        return res.json({
          success: true,
          data: {
            configKey: configKey,
            configValue: legacyConfig.configValue,
            valueType: legacyConfig.valueType,
            description: legacyConfig.description,
            isLegacy: true
          }
        });
      }

      // 没有任何配置
      return res.json({
        success: true,
        data: {
          configKey,
          configValue: null
        }
      });
    }

    // 其他配置保持原有逻辑
    const config = await configRepository.findOne({
      where: { configKey, isEnabled: true }
    });

    if (config) {
      res.json({
        success: true,
        data: {
          configKey: config.configKey,
          configValue: config.configValue,
          valueType: config.valueType,
          description: config.description
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          configKey,
          configValue: null
        }
      });
    }
  } catch (error) {
    log.error('获取系统配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

/**
 * @route POST /api/v1/system/config/:configKey
 * @desc 保存单个系统配置（支持用户级和系统级配置）
 * @access Private
 */
router.post('/config/:configKey', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configKey } = req.params;
    const { configValue, description, applyToAll } = req.body;
    const currentUser = (req as any).user;
    const configRepository = getTenantRepo(SystemConfig);

    // 🔥 对于寄件人手机号配置，支持用户级和系统级
    if (configKey === 'logistics_sender_phone') {
      const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';

      // 如果是管理员且选择了"全员生效"
      if (isAdmin && applyToAll) {
        const systemConfigKey = `system_${configKey}`;
        let systemConfig = await configRepository.findOne({
          where: { configKey: systemConfigKey }
        });

        if (systemConfig) {
          systemConfig.configValue = configValue || '';
          if (description) systemConfig.description = description;
          systemConfig.updatedAt = new Date();
        } else {
          systemConfig = configRepository.create({
            configKey: systemConfigKey,
            configValue: configValue || '',
            valueType: 'string',
            configGroup: 'logistics_settings',
            description: description || '物流查询预设寄件人手机号（系统级）',
            isEnabled: true,
            isSystem: true,
            sortOrder: 100
          });
        }

        await configRepository.save(systemConfig);
        log.info(`[系统配置] 管理员 ${currentUser.username} 设置了系统级寄件人手机号`);

        return res.json({
          success: true,
          message: '系统级配置保存成功，全员生效',
          isSystemLevel: true
        });
      }

      // 普通用户或管理员选择个人使用，保存用户级配置
      const userConfigKey = `user_${currentUser.id}_${configKey}`;
      let userConfig = await configRepository.findOne({
        where: { configKey: userConfigKey }
      });

      if (userConfig) {
        userConfig.configValue = configValue || '';
        if (description) userConfig.description = description;
        userConfig.updatedAt = new Date();
      } else {
        userConfig = configRepository.create({
          configKey: userConfigKey,
          configValue: configValue || '',
          valueType: 'string',
          configGroup: 'user_settings',
          description: description || '物流查询预设寄件人手机号（用户级）',
          isEnabled: true,
          isSystem: false,
          sortOrder: 100
        });
      }

      await configRepository.save(userConfig);
      log.info(`[系统配置] 用户 ${currentUser.username} 设置了个人寄件人手机号`);

      return res.json({
        success: true,
        message: '个人配置保存成功',
        isUserLevel: true
      });
    }

    // 其他配置保持原有逻辑
    let config = await configRepository.findOne({
      where: { configKey }
    });

    if (config) {
      config.configValue = configValue || '';
      if (description) config.description = description;
      config.updatedAt = new Date();
    } else {
      config = configRepository.create({
        configKey,
        configValue: configValue || '',
        valueType: 'string',
        configGroup: 'logistics_settings',
        description: description || '',
        isEnabled: true,
        isSystem: false,
        sortOrder: 100
      });
    }

    await configRepository.save(config);

    res.json({
      success: true,
      message: '配置保存成功'
    });
  } catch (error) {
    log.error('保存系统配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存配置失败'
    });
  }
});


} // end registerConfigRoutes
