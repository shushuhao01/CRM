/**
 * 租户管理控制器
 *
 * 功能：
 * 1. 租户CRUD操作
 * 2. 授权码管理
 * 3. 租户状态管理
 * 4. 租户统计数据
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { Tenant } from '../../entities/Tenant';
import { TenantSettings } from '../../entities/TenantSettings';
import { User } from '../../entities/User';
import { v4 as uuidv4 } from 'uuid';
import { Like } from 'typeorm';
import { TenantLogService } from '../../services/TenantLogService';
import bcrypt from 'bcryptjs';

import { log } from '../../config/logger';
/**
 * 获取租户列表（分页、搜索、筛选）
 */
export const getTenantList = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const tenantRepo = AppDataSource.getRepository(Tenant);

    // 构建查询条件
    const where: any = {};

    // 关键词搜索（名称、代码、授权码）
    if (keyword) {
      where.name = Like(`%${keyword}%`);
      // 注意：这里简化处理，实际应该用OR条件
    }

    // 状态筛选
    if (status && ['active', 'inactive', 'expired'].includes(status as string)) {
      where.status = status;
    }

    // 查询总数
    const total = await tenantRepo.count({ where });

    // 查询列表
    const tenants = await tenantRepo.find({
      where,
      order: {
        [sortBy as string]: sortOrder as 'ASC' | 'DESC'
      },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize)
    });

    // 查询每个租户的用户数
    const userRepo = AppDataSource.getRepository(User);
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const userCount = await userRepo.count({
          where: { tenantId: tenant.id }
        });

        // 转换为camelCase格式返回给前端
        return {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          packageId: tenant.packageId,
          packageName: null, // TODO: 从packages表查询
          contact: tenant.contact,
          phone: tenant.phone,
          email: tenant.email,
          maxUsers: tenant.maxUsers,
          maxStorageGb: tenant.maxStorageGb,
          userCount,
          usedStorageMb: tenant.usedStorageMb,
          expireDate: tenant.expireDate ? (tenant.expireDate instanceof Date ? tenant.expireDate.toISOString().split('T')[0] : tenant.expireDate) : null,
          licenseKey: tenant.licenseKey,
          licenseStatus: tenant.licenseStatus,
          activatedAt: tenant.activatedAt,
          features: tenant.features,
          databaseName: tenant.databaseName,
          remark: tenant.remark,
          status: tenant.status,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
          isExpired: tenant.isExpired(),
          isAvailable: tenant.isAvailable()
        };
      })
    );

    res.json({
      success: true,
      data: {
        list: tenantsWithStats,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize))
      }
    });
  } catch (error) {
    log.error('获取租户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取租户列表失败'
    });
  }
};

/**
 * 获取租户详情
 */
export const getTenantDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 查询租户配置
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const settings = await settingsRepo.find({
      where: { tenantId: id }
    });

    // 查询用户数
    const userRepo = AppDataSource.getRepository(User);
    const userCount = await userRepo.count({
      where: { tenantId: id }
    });

    // 转换为 camelCase 格式返回
    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        packageId: tenant.packageId,
        packageName: null, // TODO: 从packages表查询
        contact: tenant.contact,
        phone: tenant.phone,
        email: tenant.email,
        maxUsers: tenant.maxUsers,
        maxStorageGb: tenant.maxStorageGb,
        userCount,
        usedStorageMb: tenant.usedStorageMb,
        expireDate: tenant.expireDate ? (tenant.expireDate instanceof Date ? tenant.expireDate.toISOString().split('T')[0] : tenant.expireDate) : null,
        licenseKey: tenant.licenseKey,
        licenseStatus: tenant.licenseStatus,
        activatedAt: tenant.activatedAt,
        features: tenant.features,
        databaseName: tenant.databaseName,
        remark: tenant.remark,
        status: tenant.status,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        isExpired: tenant.isExpired(),
        isAvailable: tenant.isAvailable(),
        settings
      }
    });
  } catch (error) {
    log.error('获取租户详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取租户详情失败'
    });
  }
};

/**
 * 创建租户
 */
export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      code,
      expireDate,
      maxUsers = 10,
      maxStorageGb = 10,
      contact,
      phone,
      email
    } = req.body;

    // 验证必填字段
    if (!name) {
      res.status(400).json({ success: false, message: '租户名称为必填项' });
      return;
    }
    if (!phone) {
      res.status(400).json({ success: false, message: '联系电话为必填项（将作为管理员登录账号）' });
      return;
    }

    const tenantRepo = AppDataSource.getRepository(Tenant);

    // 如果没有提供编码，自动生成
    let tenantCode = code;
    if (!tenantCode) {
      tenantCode = Tenant.generateShortCode();
      // 检查是否重复，如果重复则重新生成
      let attempts = 0;
      while (attempts < 10) {
        const existing = await tenantRepo.findOne({ where: { code: tenantCode } });
        if (!existing) break;
        tenantCode = Tenant.generateShortCode();
        attempts++;
      }
    } else {
      // 检查代码是否已存在
      const existingTenant = await tenantRepo.findOne({
        where: { code: tenantCode }
      });

      if (existingTenant) {
        res.status(400).json({
          success: false,
          message: '租户代码已存在'
        });
        return;
      }
    }

    // 生成授权码
    const licenseKey = Tenant.generateLicenseKey();

    // 创建租户
    const tenant = tenantRepo.create({
      id: uuidv4(),
      name,
      code: tenantCode,
      status: 'active',
      licenseKey,
      licenseStatus: 'active',
      activatedAt: new Date(), // 设置激活时间
      expireDate: expireDate ? new Date(expireDate) : null,
      maxUsers,
      maxStorageGb,
      contact,
      phone,
      email
    });

    await tenantRepo.save(tenant);

    // 🔥 自动创建该租户的系统管理部和默认管理员用户
    try {
      const { createSystemDepartment, createDefaultAdmin } = await import('../../utils/adminAccountHelper');

      // 创建系统管理部
      const departmentId = await createSystemDepartment(tenant.id);

      // 创建默认管理员账号（使用手机号作为用户名，归属到系统管理部）
      const adminAccount = await createDefaultAdmin({
        tenantId: tenant.id,
        phone: phone,
        realName: contact || '系统管理员',
        email: email || undefined
      });

      log.info(`✅ 已为租户 ${tenant.code} (${tenant.name}) 创建系统管理部和默认管理员账号 (${adminAccount.username}/${adminAccount.password})`);
    } catch (err: any) {
      log.error(`创建租户系统管理部和默认管理员失败:`, err.message);
      // 不影响租户创建流程
    }

    // 记录操作日志
    await TenantLogService.logFromRequest(req, tenant.id, 'create', {
      name: tenant.name,
      code: tenant.code,
      maxUsers: tenant.maxUsers,
      maxStorageGb: tenant.maxStorageGb
    });

    res.json({
      success: true,
      message: '租户创建成功',
      data: {
        ...tenant,
        licenseKey // 返回授权码供前端显示
      }
    });
  } catch (error) {
    log.error('创建租户失败:', error);
    res.status(500).json({
      success: false,
      message: '创建租户失败'
    });
  }
};

/**
 * 更新租户
 */
export const updateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      expireDate,
      maxUsers,
      maxStorageGb,
      contact,
      phone,
      email
    } = req.body;

    const tenantRepo = AppDataSource.getRepository(Tenant);

    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 如果修改了代码，检查是否重复
    if (code && code !== tenant.code) {
      const existingTenant = await tenantRepo.findOne({
        where: { code }
      });

      if (existingTenant) {
        res.status(400).json({
          success: false,
          message: '租户代码已存在'
        });
        return;
      }
    }

    // 更新字段
    if (name) tenant.name = name;
    if (code) tenant.code = code;
    if (expireDate !== undefined) {
      tenant.expireDate = expireDate ? new Date(expireDate) : null;
    }
    if (maxUsers !== undefined) tenant.maxUsers = maxUsers;
    if (maxStorageGb !== undefined) tenant.maxStorageGb = maxStorageGb;
    if (contact !== undefined) tenant.contact = contact;
    if (phone !== undefined) tenant.phone = phone;
    if (email !== undefined) tenant.email = email;

    await tenantRepo.save(tenant);

    // 记录操作日志
    await TenantLogService.logFromRequest(req, tenant.id, 'update', {
      name: tenant.name,
      maxUsers: tenant.maxUsers,
      maxStorageGb: tenant.maxStorageGb
    });

    res.json({
      success: true,
      message: '租户更新成功',
      data: tenant
    });
  } catch (error) {
    log.error('更新租户失败:', error);
    res.status(500).json({
      success: false,
      message: '更新租户失败'
    });
  }
};

/**
 * 删除租户（软删除）
 */
export const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantRepo = AppDataSource.getRepository(Tenant);

    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 软删除：标记为inactive
    tenant.status = 'inactive';
    await tenantRepo.save(tenant);

    res.json({
      success: true,
      message: '租户删除成功'
    });
  } catch (error) {
    log.error('删除租户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除租户失败'
    });
  }
};

/**
 * 重新生成授权码
 */
export const regenerateLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantRepo = AppDataSource.getRepository(Tenant);

    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 生成新的授权码
    const oldLicenseKey = tenant.licenseKey;
    const newLicenseKey = Tenant.generateLicenseKey();
    tenant.licenseKey = newLicenseKey;

    await tenantRepo.save(tenant);

    // 记录操作日志
    await TenantLogService.logFromRequest(req, tenant.id, 'regenerate_license', {
      oldLicenseKey: oldLicenseKey?.substring(0, 10) + '...',
      newLicenseKey: newLicenseKey.substring(0, 10) + '...'
    });

    res.json({
      success: true,
      message: '授权码重新生成成功',
      data: {
        licenseKey: newLicenseKey
      }
    });
  } catch (error) {
    log.error('重新生成授权码失败:', error);
    res.status(500).json({
      success: false,
      message: '重新生成授权码失败'
    });
  }
};

/**
 * 修改租户状态
 */
export const updateTenantStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'expired'].includes(status)) {
      res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
      return;
    }

    const tenantRepo = AppDataSource.getRepository(Tenant);

    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    tenant.status = status;
    await tenantRepo.save(tenant);

    res.json({
      success: true,
      message: '租户状态更新成功',
      data: tenant
    });
  } catch (error) {
    log.error('更新租户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新租户状态失败'
    });
  }
};

/**
 * 暂停租户授权
 * 将 licenseStatus 改为 suspended
 */
export const suspendTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 检查当前状态
    if (tenant.licenseStatus === 'suspended') {
      res.status(400).json({
        success: false,
        message: '租户授权已处于暂停状态'
      });
      return;
    }

    if (tenant.licenseStatus !== 'active') {
      res.status(400).json({
        success: false,
        message: `无法暂停，当前授权状态为: ${tenant.licenseStatus}`
      });
      return;
    }

    // 暂停授权
    tenant.licenseStatus = 'suspended';
    await tenantRepo.save(tenant);

    // 记录操作日志
    await TenantLogService.logFromRequest(req, tenant.id, 'suspend', {
      previousStatus: 'active',
      newStatus: 'suspended'
    });

    log.info(`[租户管理] 租户授权已暂停: ${tenant.name} (${tenant.id})`);

    res.json({
      success: true,
      message: '租户授权已暂停',
      data: tenant
    });
  } catch (error) {
    log.error('暂停租户授权失败:', error);
    res.status(500).json({
      success: false,
      message: '暂停租户授权失败'
    });
  }
};

/**
 * 恢复租户授权
 * 将 licenseStatus 从 suspended 改为 active
 */
export const resumeTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 检查当前状态
    if (tenant.licenseStatus === 'active') {
      res.status(400).json({
        success: false,
        message: '租户授权已处于激活状态'
      });
      return;
    }

    if (tenant.licenseStatus !== 'suspended') {
      res.status(400).json({
        success: false,
        message: `无法恢复，当前授权状态为: ${tenant.licenseStatus}`
      });
      return;
    }

    // 检查是否过期
    if (tenant.isExpired()) {
      res.status(400).json({
        success: false,
        message: '租户已过期，请先续期'
      });
      return;
    }

    // 恢复授权
    tenant.licenseStatus = 'active';
    // 如果之前没有激活时间，设置为当前时间
    if (!tenant.activatedAt) {
      tenant.activatedAt = new Date();
    }
    await tenantRepo.save(tenant);

    // 记录操作日志
    await TenantLogService.logFromRequest(req, tenant.id, 'resume', {
      previousStatus: 'suspended',
      newStatus: 'active'
    });

    log.info(`[租户管理] 租户授权已恢复: ${tenant.name} (${tenant.id})`);

    res.json({
      success: true,
      message: '租户授权已恢复',
      data: tenant
    });
  } catch (error) {
    log.error('恢复租户授权失败:', error);
    res.status(500).json({
      success: false,
      message: '恢复租户授权失败'
    });
  }
};

/**
 * 启用租户
 * 将 status 改为 active
 */
export const enableTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    if (tenant.status === 'active') {
      res.status(400).json({
        success: false,
        message: '租户已处于启用状态'
      });
      return;
    }

    tenant.status = 'active';
    await tenantRepo.save(tenant);

    // 记录操作日志
    await TenantLogService.logFromRequest(req, tenant.id, 'enable', {
      previousStatus: 'inactive',
      newStatus: 'active'
    });

    log.info(`[租户管理] 租户已启用: ${tenant.name} (${tenant.id})`);

    res.json({
      success: true,
      message: '租户已启用',
      data: tenant
    });
  } catch (error) {
    log.error('启用租户失败:', error);
    res.status(500).json({
      success: false,
      message: '启用租户失败'
    });
  }
};

/**
 * 禁用租户
 * 将 status 改为 inactive
 */
export const disableTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    if (tenant.status === 'inactive') {
      res.status(400).json({
        success: false,
        message: '租户已处于禁用状态'
      });
      return;
    }

    tenant.status = 'inactive';
    await tenantRepo.save(tenant);

    // 记录操作日志
    await TenantLogService.logFromRequest(req, tenant.id, 'disable', {
      previousStatus: 'active',
      newStatus: 'inactive'
    });

    log.info(`[租户管理] 租户已禁用: ${tenant.name} (${tenant.id})`);

    res.json({
      success: true,
      message: '租户已禁用',
      data: tenant
    });
  } catch (error) {
    log.error('禁用租户失败:', error);
    res.status(500).json({
      success: false,
      message: '禁用租户失败'
    });
  }
};

/**
 * 续期租户
 * 延长过期时间
 */
export const renewTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { months = 12 } = req.body; // 默认续期12个月

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 计算新的过期时间
    const currentExpireDate = tenant.expireDate ? new Date(tenant.expireDate) : new Date();
    const baseDate = currentExpireDate > new Date() ? currentExpireDate : new Date();
    const newExpireDate = new Date(baseDate);
    newExpireDate.setMonth(newExpireDate.getMonth() + months);

    tenant.expireDate = newExpireDate;

    // 如果之前是过期状态，恢复为active
    if (tenant.licenseStatus === 'expired') {
      tenant.licenseStatus = 'active';
    }

    await tenantRepo.save(tenant);

    // 记录操作日志
    await TenantLogService.logFromRequest(req, tenant.id, 'renew', {
      months,
      oldExpireDate: currentExpireDate?.toISOString(),
      newExpireDate: newExpireDate.toISOString()
    });

    log.info(`[租户管理] 租户已续期: ${tenant.name} (${tenant.id}), 新过期时间: ${newExpireDate.toISOString()}`);

    res.json({
      success: true,
      message: `租户已续期${months}个月`,
      data: {
        ...tenant,
        renewMonths: months
      }
    });
  } catch (error) {
    log.error('续期租户失败:', error);
    res.status(500).json({
      success: false,
      message: '续期租户失败'
    });
  }
};

/**
 * 获取租户统计数据
 */
export const getTenantStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 查询用户数
    const userRepo = AppDataSource.getRepository(User);
    const userCount = await userRepo.count({
      where: { tenantId: id }
    });

    // TODO: 查询其他统计数据
    // - 订单数
    // - 客户数
    // - 存储空间使用
    // - 最近登录时间
    // - 活跃用户数

    res.json({
      success: true,
      data: {
        tenantId: id,
        tenantName: tenant.name,
        userCount,
        maxUsers: tenant.maxUsers,
        userUsagePercent: (userCount / tenant.maxUsers) * 100,
        storageUsedGb: 0,
        maxStorageGb: tenant.maxStorageGb,
        storageUsagePercent: 0,
        isExpired: tenant.isExpired(),
        isAvailable: tenant.isAvailable()
      }
    });
  } catch (error) {
    log.error('获取租户统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取租户统计数据失败'
    });
  }
};

/**
 * 获取租户用户列表
 */
export const getTenantUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      pageSize = 50
    } = req.query;

    const tenantRepo = AppDataSource.getRepository(Tenant);
    const tenant = await tenantRepo.findOne({
      where: { id }
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: '租户不存在'
      });
      return;
    }

    // 查询用户列表
    const userRepo = AppDataSource.getRepository(User);

    const [users, total] = await userRepo.findAndCount({
      where: { tenantId: id },
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize)
    });

    // 转换为 camelCase 格式
    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      realName: user.realName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      position: user.position,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      status: user.status,
      createdAt: user.createdAt
    }));

    res.json({
      success: true,
      data: {
        list: userList,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    log.error('获取租户用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取租户用户列表失败'
    });
  }
};
