import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { SensitiveInfoPermission } from '../entities/SensitiveInfoPermission';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

// 获取Repository
const getRepository = () => {
  if (!AppDataSource?.isInitialized) {
    throw new Error('数据库连接未初始化');
  }
  return AppDataSource.getRepository(SensitiveInfoPermission);
};

/**
 * GET /api/v1/sensitive-info-permissions
 * 获取所有敏感信息权限配置
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

    res.json({
      success: true,
      data: permissionMatrix
    });
  } catch (error) {
    logger.error('获取敏感信息权限配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取敏感信息权限配置失败'
    });
  }
});

/**
 * PUT /api/v1/sensitive-info-permissions
 * 批量更新敏感信息权限配置
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

        // 使用upsert逻辑
        const existing = await repository.findOne({
          where: { infoType, roleCode }
        });

        if (existing) {
          existing.hasPermission = hasPermission;
          await repository.save(existing);
        } else {
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
 */
router.get('/check/:infoType/:roleCode', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { infoType, roleCode } = req.params;

    const repository = getRepository();
    const permission = await repository.findOne({
      where: { infoType, roleCode }
    });

    res.json({
      success: true,
      data: {
        infoType,
        roleCode,
        hasPermission: permission ? permission.hasPermission === 1 : false
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
