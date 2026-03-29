import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { SensitiveInfoPermission } from '../entities/SensitiveInfoPermission';
import { Role } from '../entities/Role';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { logger } from '../config/logger';
import { getTenantRepo } from '../utils/tenantRepo';

const router = Router();

// 默认敏感信息类型
const DEFAULT_INFO_TYPES = ['phone', 'id_card', 'email', 'wechat', 'address', 'bank', 'financial'];
// 默认角色列表（作为降级方案，当数据库查询失败时使用）
const FALLBACK_ROLES = ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'];

/**
 * 从数据库动态获取角色code列表
 */
const getActiveRoleCodes = async (): Promise<string[]> => {
  try {
    const roleRepo = getTenantRepo(Role);
    const roles = await roleRepo.find({
      where: { status: 'active' },
      select: ['code'],
      order: { level: 'ASC' }
    });
    if (roles.length > 0) {
      return roles.map(r => r.code);
    }
    return FALLBACK_ROLES;
  } catch (error) {
    logger.warn('动态获取角色列表失败，使用默认角色:', error);
    return FALLBACK_ROLES;
  }
};

/**
 * 生成默认权限矩阵（新增角色默认无权限，只有super_admin有权限）
 */
const getDefaultPermissionMatrix = async (): Promise<Record<string, Record<string, boolean>>> => {
  const roleCodes = await getActiveRoleCodes();
  const matrix: Record<string, Record<string, boolean>> = {};
  DEFAULT_INFO_TYPES.forEach(infoType => {
    matrix[infoType] = {};
    roleCodes.forEach(roleCode => {
      // 新增角色默认无权限（加密显示），只有super_admin默认有权限
      matrix[infoType][roleCode] = roleCode === 'super_admin';
    });
  });
  return matrix;
};

// 获取Repository
const getRepository = () => {
  if (!AppDataSource?.isInitialized) {
    throw new Error('数据库连接未初始化');
  }
  return getTenantRepo(SensitiveInfoPermission);
};

/**
 * GET /api/v1/sensitive-info-permissions
 * 获取所有敏感信息权限配置
 * 租户隔离：getTenantRepo 自动按 tenant_id 过滤
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const repository = getRepository();
    const permissions = await repository.find({
      order: { infoType: 'ASC', roleCode: 'ASC' }
    });

    // 转换为前端需要的格式
    const permissionMatrix: Record<string, Record<string, boolean>> = {};

    permissions.forEach(p => {
      if (!permissionMatrix[p.infoType]) {
        permissionMatrix[p.infoType] = {};
      }
      permissionMatrix[p.infoType][p.roleCode] = p.hasPermission === 1;
    });

    // 如果当前租户没有数据，返回默认权限矩阵并自动初始化
    if (permissions.length === 0) {
      logger.info('当前租户无敏感信息权限数据，返回默认配置并初始化');
      const defaultMatrix = await getDefaultPermissionMatrix();

      // 异步初始化当前租户的默认数据（不阻塞响应）
      (async () => {
        try {
          const roleCodes = await getActiveRoleCodes();
          for (const infoType of DEFAULT_INFO_TYPES) {
            for (const roleCode of roleCodes) {
              // 新增角色默认无权限，只有super_admin有权限
              const hasPerm = roleCode === 'super_admin' ? 1 : 0;
              const newRecord = repository.create({
                infoType,
                roleCode,
                hasPermission: hasPerm
              });
              await repository.save(newRecord);
            }
          }
          logger.info('已为当前租户初始化默认敏感信息权限数据');
        } catch (initErr) {
          logger.warn('初始化默认敏感信息权限数据失败（非致命）:', initErr);
        }
      })();

      return res.json({
        success: true,
        data: defaultMatrix
      });
    }

    // 🔥 补充新增角色的默认权限：如果数据库已有数据但缺少某些角色，补充为默认无权限
    const roleCodes = await getActiveRoleCodes();
    DEFAULT_INFO_TYPES.forEach(infoType => {
      if (!permissionMatrix[infoType]) {
        permissionMatrix[infoType] = {};
      }
      roleCodes.forEach(roleCode => {
        if (permissionMatrix[infoType][roleCode] === undefined) {
          // 新增角色默认无权限（加密显示）
          permissionMatrix[infoType][roleCode] = false;
        }
      });
    });

    res.json({
      success: true,
      data: permissionMatrix
    });
  } catch (error) {
    logger.error('获取敏感信息权限配置失败:', error);
    // 即使查询失败，也返回默认权限矩阵，避免前端报错
    const defaultMatrix = await getDefaultPermissionMatrix();
    res.json({
      success: true,
      data: defaultMatrix
    });
  }
});

/**
 * PUT /api/v1/sensitive-info-permissions
 * 批量更新敏感信息权限配置
 * 租户隔离：getTenantRepo 自动按 tenant_id 过滤查询和写入
 */
router.put('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: '权限配置数据格式错误'
      });
    }

    const repository = getRepository();

    // 遍历并更新每个权限配置
    for (const infoType of Object.keys(permissions)) {
      const rolePermissions = permissions[infoType];

      for (const roleCode of Object.keys(rolePermissions)) {
        const hasPermission = rolePermissions[roleCode] ? 1 : 0;

        // 使用upsert逻辑（getTenantRepo自动添加tenant_id条件）
        const existing = await repository.findOne({
          where: { infoType, roleCode }
        });

        if (existing) {
          existing.hasPermission = hasPermission;
          await repository.save(existing);
        } else {
          // create() 会自动注入 tenant_id
          const newPermission = repository.create({
            infoType,
            roleCode,
            hasPermission
          });
          await repository.save(newPermission);
        }
      }
    }

    logger.info('敏感信息权限配置已更新');

    res.json({
      success: true,
      message: '权限配置保存成功'
    });
  } catch (error) {
    logger.error('保存敏感信息权限配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存敏感信息权限配置失败'
    });
  }
});

/**
 * GET /api/v1/sensitive-info-permissions/check/:infoType/:roleCode
 * 检查特定角色对特定敏感信息的权限
 * 租户隔离：getTenantRepo 自动按 tenant_id 过滤
 */
router.get('/check/:infoType/:roleCode', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { infoType, roleCode } = req.params;

    const repository = getRepository();
    const permission = await repository.findOne({
      where: { infoType, roleCode }
    });

    // 如果没有找到记录，使用默认权限（超级管理员和管理员有权限）
    const defaultPermission = roleCode === 'super_admin' || roleCode === 'admin';

    res.json({
      success: true,
      data: {
        infoType,
        roleCode,
        hasPermission: permission ? permission.hasPermission === 1 : defaultPermission
      }
    });
  } catch (error) {
    logger.error('检查敏感信息权限失败:', error);
    res.status(500).json({
      success: false,
      message: '检查敏感信息权限失败'
    });
  }
});

export default router;
