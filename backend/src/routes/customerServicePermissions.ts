/**
 * 客服权限管理路由
 * 处理客服人员的权限配置CRUD操作
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { CustomerServicePermission } from '../entities/CustomerServicePermission';
import { User } from '../entities/User';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 获取Repository（带错误处理）
const getPermissionRepository = () => {
  if (!AppDataSource?.isInitialized) {
    throw new Error('数据库连接未初始化');
  }
  return AppDataSource.getRepository(CustomerServicePermission);
};

const getUserRepository = () => {
  if (!AppDataSource?.isInitialized) {
    throw new Error('数据库连接未初始化');
  }
  return AppDataSource.getRepository(User);
};

/**
 * GET /api/v1/customer-service-permissions
 * 获取所有客服权限配置列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, customerServiceType, status } = req.query;

    let permissions: CustomerServicePermission[] = [];
    let total = 0;

    try {
      const permissionRepo = getPermissionRepository();
      const queryBuilder = permissionRepo.createQueryBuilder('csp');

      if (customerServiceType) {
        queryBuilder.andWhere('csp.customer_service_type = :type', { type: customerServiceType });
      }
      if (status) {
        queryBuilder.andWhere('csp.status = :status', { status });
      }

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      queryBuilder.orderBy('csp.created_at', 'DESC');

      [permissions, total] = await queryBuilder.getManyAndCount();
    } catch (dbError) {
      logger.warn('客服权限表可能不存在:', dbError);
    }

    // 获取关联的用户信息
    const userIds = permissions.map(p => p.userId);
    const usersMap: Map<string, any> = new Map();

    if (userIds.length > 0) {
      try {
        const userRepo = getUserRepository();
        const users = await userRepo.createQueryBuilder('user').where('user.id IN (:...ids)', { ids: userIds }).getMany();
        users.forEach(user => {
          usersMap.set(user.id, { id: user.id, name: user.realName || user.name, email: user.email, department: user.departmentName, departmentId: user.departmentId, role: user.role });
        });
      } catch (userError) {
        logger.warn('获取用户信息失败:', userError);
      }
    }

    const items = permissions.map(p => {
      const user = usersMap.get(p.userId);
      return {
        id: p.id, userId: p.userId, userName: user?.name || '未知用户', userEmail: user?.email || '', userDepartment: user?.department || '未分配',
        userDepartmentId: user?.departmentId || '', customerServiceType: p.customerServiceType, dataScope: p.dataScope,
        departmentIds: p.departmentIds || [], customPermissions: p.customPermissions || [], permissionTemplate: p.permissionTemplate,
        status: p.status, remark: p.remark, createdBy: p.createdBy, createdByName: p.createdByName, createdAt: p.createdAt, updatedAt: p.updatedAt
      };
    });

    res.json({
      success: true,
      data: { items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    logger.error('获取客服权限列表失败:', error);
    // 返回空列表而不是500错误
    res.json({
      success: true,
      data: { items: [], total: 0, page: 1, limit: 50, totalPages: 0 }
    });
  }
});

/**
 * GET /api/v1/customer-service-permissions/stats
 * 获取客服权限统计数据
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const permissionRepo = getPermissionRepository();

    // 总数
    let total = 0;
    let active = 0;
    let configured = 0;
    const byType: Record<string, number> = {};

    try {
      total = await permissionRepo.count();
      active = await permissionRepo.count({ where: { status: 'active' } });

      // 按类型统计
      const typeStats = await permissionRepo
        .createQueryBuilder('csp')
        .select('csp.customer_service_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('csp.customer_service_type')
        .getRawMany();

      typeStats.forEach(item => {
        byType[item.type] = parseInt(item.count);
      });

      // 已配置权限的数量 - 使用简单查询避免JSON_LENGTH在某些数据库不支持
      const allPermissions = await permissionRepo.find();
      configured = allPermissions.filter(p => p.customPermissions && p.customPermissions.length > 0).length;
    } catch (dbError) {
      // 表可能不存在，返回空数据
      logger.warn('客服权限表可能不存在:', dbError);
    }

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive: total - active,
        configured,
        configRate: total > 0 ? Math.round((configured / total) * 100) : 0,
        byType
      }
    });
  } catch (error) {
    logger.error('获取客服权限统计失败:', error);
    // 返回空数据而不是500错误
    res.json({
      success: true,
      data: { total: 0, active: 0, inactive: 0, configured: 0, configRate: 0, byType: {} }
    });
  }
});

/**
 * GET /api/v1/customer-service-permissions/available-users
 * 获取可添加为客服的用户列表（排除已配置的）
 */
router.get('/available-users', async (req: Request, res: Response) => {
  try {
    const userRepo = getUserRepository();
    let existingUserIds: string[] = [];

    // 尝试获取已配置客服权限的用户ID
    try {
      const permissionRepo = getPermissionRepository();
      const existingPermissions = await permissionRepo.find({ select: ['userId'] });
      existingUserIds = existingPermissions.map(p => p.userId);
    } catch (permError) {
      // 表可能不存在，忽略错误
      logger.warn('获取已配置用户失败（表可能不存在）:', permError);
    }

    // 获取所有活跃用户
    const queryBuilder = userRepo
      .createQueryBuilder('user')
      .where('user.status = :status', { status: 'active' });

    // 排除已配置的用户
    if (existingUserIds.length > 0) {
      queryBuilder.andWhere('user.id NOT IN (:...ids)', { ids: existingUserIds });
    }

    const users = await queryBuilder.getMany();

    const items = users.map(user => ({
      id: user.id,
      name: user.realName || user.name,
      email: user.email || '',
      phone: user.phone || '',
      department: user.departmentName || '未分配',
      departmentId: user.departmentId || '',
      role: user.role,
      position: user.position || ''
    }));

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    logger.error('获取可用用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取可用用户列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * GET /api/v1/customer-service-permissions/:id
 * 获取单个客服权限配置详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissionRepo = getPermissionRepository();
    const userRepo = getUserRepository();

    const permission = await permissionRepo.findOne({ where: { id } });

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: '客服权限配置不存在'
      });
    }

    // 获取用户信息
    const user = await userRepo.findOne({ where: { id: permission.userId } });

    res.json({
      success: true,
      data: {
        id: permission.id,
        userId: permission.userId,
        userName: user?.realName || user?.name || '未知用户',
        userEmail: user?.email || '',
        userDepartment: user?.departmentName || '未分配',
        userDepartmentId: user?.departmentId || '',
        customerServiceType: permission.customerServiceType,
        dataScope: permission.dataScope,
        departmentIds: permission.departmentIds || [],
        customPermissions: permission.customPermissions || [],
        permissionTemplate: permission.permissionTemplate,
        status: permission.status,
        remark: permission.remark,
        createdBy: permission.createdBy,
        createdByName: permission.createdByName,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt
      }
    });
  } catch (error) {
    logger.error('获取客服权限详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取客服权限详情失败'
    });
  }
});

/**
 * GET /api/v1/customer-service-permissions/user/:userId
 * 根据用户ID获取客服权限配置
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const permissionRepo = getPermissionRepository();

    const permission = await permissionRepo.findOne({ where: { userId } });

    if (!permission) {
      return res.json({
        success: true,
        data: null,
        message: '该用户没有客服权限配置'
      });
    }

    res.json({
      success: true,
      data: {
        id: permission.id,
        userId: permission.userId,
        customerServiceType: permission.customerServiceType,
        dataScope: permission.dataScope,
        departmentIds: permission.departmentIds || [],
        customPermissions: permission.customPermissions || [],
        permissionTemplate: permission.permissionTemplate,
        status: permission.status
      }
    });
  } catch (error) {
    logger.error('获取用户客服权限失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户客服权限失败'
    });
  }
});

/**
 * POST /api/v1/customer-service-permissions
 * 创建客服权限配置
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      customerServiceType = 'general',
      dataScope = 'self',
      departmentIds = [],
      customPermissions = [],
      permissionTemplate,
      remark
    } = req.body;

    // 从请求头获取当前用户信息
    const currentUser = (req as any).user || {};

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    const permissionRepo = getPermissionRepository();
    const userRepo = getUserRepository();

    // 检查用户是否存在
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查是否已存在配置
    const existing = await permissionRepo.findOne({ where: { userId } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该用户已有客服权限配置，请使用更新接口'
      });
    }

    // 创建新配置
    const newPermission = permissionRepo.create({
      id: uuidv4(),
      userId,
      customerServiceType,
      dataScope,
      departmentIds: departmentIds.length > 0 ? departmentIds : null,
      customPermissions: customPermissions.length > 0 ? customPermissions : null,
      permissionTemplate: permissionTemplate || null,
      status: 'active',
      remark: remark || null,
      createdBy: currentUser.id || null,
      createdByName: currentUser.realName || currentUser.name || null
    });

    await permissionRepo.save(newPermission);

    logger.info(`创建客服权限配置成功: userId=${userId}, type=${customerServiceType}`);

    res.status(201).json({
      success: true,
      message: '创建客服权限配置成功',
      data: {
        id: newPermission.id,
        userId: newPermission.userId,
        userName: user.realName || user.name,
        customerServiceType: newPermission.customerServiceType,
        dataScope: newPermission.dataScope,
        customPermissions: newPermission.customPermissions || [],
        status: newPermission.status
      }
    });
  } catch (error) {
    logger.error('创建客服权限配置失败:', error);
    res.status(500).json({
      success: false,
      message: '创建客服权限配置失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * PUT /api/v1/customer-service-permissions/:id
 * 更新客服权限配置
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      customerServiceType,
      dataScope,
      departmentIds,
      customPermissions,
      permissionTemplate,
      status,
      remark
    } = req.body;

    const currentUser = (req as any).user || {};
    const permissionRepo = getPermissionRepository();

    const permission = await permissionRepo.findOne({ where: { id } });
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: '客服权限配置不存在'
      });
    }

    // 更新字段
    if (customerServiceType !== undefined) permission.customerServiceType = customerServiceType;
    if (dataScope !== undefined) permission.dataScope = dataScope;
    if (departmentIds !== undefined) permission.departmentIds = departmentIds.length > 0 ? departmentIds : null;
    if (customPermissions !== undefined) permission.customPermissions = customPermissions.length > 0 ? customPermissions : null;
    if (permissionTemplate !== undefined) permission.permissionTemplate = permissionTemplate || null;
    if (status !== undefined) permission.status = status;
    if (remark !== undefined) permission.remark = remark || null;

    permission.updatedBy = currentUser.id || null;
    permission.updatedByName = currentUser.realName || currentUser.name || null;

    await permissionRepo.save(permission);

    logger.info(`更新客服权限配置成功: id=${id}`);

    res.json({
      success: true,
      message: '更新客服权限配置成功',
      data: {
        id: permission.id,
        userId: permission.userId,
        customerServiceType: permission.customerServiceType,
        dataScope: permission.dataScope,
        customPermissions: permission.customPermissions || [],
        status: permission.status
      }
    });
  } catch (error) {
    logger.error('更新客服权限配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新客服权限配置失败'
    });
  }
});

/**
 * DELETE /api/v1/customer-service-permissions/:id
 * 删除客服权限配置
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const permissionRepo = getPermissionRepository();

    const permission = await permissionRepo.findOne({ where: { id } });
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: '客服权限配置不存在'
      });
    }

    await permissionRepo.remove(permission);

    logger.info(`删除客服权限配置成功: id=${id}, userId=${permission.userId}`);

    res.json({
      success: true,
      message: '删除客服权限配置成功'
    });
  } catch (error) {
    logger.error('删除客服权限配置失败:', error);
    res.status(500).json({
      success: false,
      message: '删除客服权限配置失败'
    });
  }
});

/**
 * POST /api/v1/customer-service-permissions/batch
 * 批量配置客服权限
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const {
      userIds,
      customerServiceType,
      dataScope,
      customPermissions,
      permissionTemplate
    } = req.body;

    const currentUser = (req as any).user || {};

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '用户ID列表不能为空'
      });
    }

    const permissionRepo = getPermissionRepository();
    const userRepo = getUserRepository();

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        // 检查用户是否存在
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
          failed++;
          continue;
        }

        // 检查是否已存在配置
        const permission = await permissionRepo.findOne({ where: { userId } });

        if (permission) {
          // 更新
          permission.customerServiceType = customerServiceType || permission.customerServiceType;
          permission.dataScope = dataScope || permission.dataScope;
          permission.customPermissions = customPermissions || permission.customPermissions;
          permission.permissionTemplate = permissionTemplate || permission.permissionTemplate;
          permission.updatedBy = currentUser.id || null;
          permission.updatedByName = currentUser.realName || currentUser.name || null;
          await permissionRepo.save(permission);
          updated++;
        } else {
          // 创建
          const newPermission = permissionRepo.create({
            id: uuidv4(),
            userId,
            customerServiceType: customerServiceType || 'general',
            dataScope: dataScope || 'self',
            customPermissions: customPermissions || null,
            permissionTemplate: permissionTemplate || null,
            status: 'active',
            createdBy: currentUser.id || null,
            createdByName: currentUser.realName || currentUser.name || null
          });
          await permissionRepo.save(newPermission);
          created++;
        }
      } catch (err) {
        failed++;
        logger.error(`批量配置客服权限失败: userId=${userId}`, err);
      }
    }

    logger.info(`批量配置客服权限完成: created=${created}, updated=${updated}, failed=${failed}`);

    res.json({
      success: true,
      message: '批量配置完成',
      data: {
        total: userIds.length,
        created,
        updated,
        failed
      }
    });
  } catch (error) {
    logger.error('批量配置客服权限失败:', error);
    res.status(500).json({
      success: false,
      message: '批量配置客服权限失败'
    });
  }
});

export default router;
