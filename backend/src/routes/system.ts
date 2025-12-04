import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { DepartmentController } from '../controllers/DepartmentController';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';

const router = Router();
const departmentController = new DepartmentController();

/**
 * 系统管理路由
 */

// ========== 公共路由（只需要登录，不需要管理员权限）==========

/**
 * @route GET /api/v1/system/global-config
 * @desc 获取全局配置（所有登录用户可访问）
 * @access Private (All authenticated users)
 */
router.get('/global-config', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      storageConfig: {
        mode: 'local',
        autoSync: true,
        syncInterval: 30,
        apiEndpoint: '/api/v1',
        lastUpdatedBy: 'system',
        lastUpdatedAt: new Date().toISOString(),
        version: 1
      }
    }
  });
});

// ========== 基本设置路由 ==========

/**
 * @route GET /api/v1/system/basic-settings
 * @desc 获取系统基本设置
 * @access Private (All authenticated users)
 */
router.get('/basic-settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);

    // 获取所有基本设置配置
    const configs = await configRepository.find({
      where: { configGroup: 'basic_settings', isEnabled: true },
      order: { sortOrder: 'ASC' }
    });

    // 转换为键值对格式
    const settings: Record<string, any> = {};
    configs.forEach(config => {
      settings[config.configKey] = config.getParsedValue();
    });

    // 设置默认值
    const defaultSettings = {
      systemName: settings.systemName || 'CRM客户管理系统',
      systemVersion: settings.systemVersion || '1.0.0',
      companyName: settings.companyName || '',
      contactPhone: settings.contactPhone || '',
      contactEmail: settings.contactEmail || '',
      websiteUrl: settings.websiteUrl || '',
      companyAddress: settings.companyAddress || '',
      systemDescription: settings.systemDescription || '',
      systemLogo: settings.systemLogo || '',
      contactQRCode: settings.contactQRCode || '',
      contactQRCodeLabel: settings.contactQRCodeLabel || '扫码联系'
    };

    res.json({
      success: true,
      data: { ...defaultSettings, ...settings }
    });
  } catch (error) {
    console.error('获取基本设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取基本设置失败'
    });
  }
});

/**
 * @route PUT /api/v1/system/basic-settings
 * @desc 更新系统基本设置
 * @access Private (Admin)
 */
router.put('/basic-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);
    const settings = req.body;

    // 定义需要保存的配置项
    const configItems = [
      { key: 'systemName', type: 'string' as const, desc: '系统名称' },
      { key: 'systemVersion', type: 'string' as const, desc: '系统版本' },
      { key: 'companyName', type: 'string' as const, desc: '公司名称' },
      { key: 'contactPhone', type: 'string' as const, desc: '联系电话' },
      { key: 'contactEmail', type: 'string' as const, desc: '联系邮箱' },
      { key: 'websiteUrl', type: 'string' as const, desc: '网站地址' },
      { key: 'companyAddress', type: 'string' as const, desc: '公司地址' },
      { key: 'systemDescription', type: 'text' as const, desc: '系统描述' },
      { key: 'systemLogo', type: 'text' as const, desc: '系统Logo' },
      { key: 'contactQRCode', type: 'text' as const, desc: '联系二维码' },
      { key: 'contactQRCodeLabel', type: 'string' as const, desc: '二维码标签' }
    ];

    // 保存或更新每个配置项
    for (const item of configItems) {
      if (settings[item.key] !== undefined) {
        let config = await configRepository.findOne({
          where: { configKey: item.key, configGroup: 'basic_settings' }
        });

        if (config) {
          // 更新现有配置
          config.configValue = String(settings[item.key]);
          config.valueType = item.type;
        } else {
          // 创建新配置
          config = configRepository.create({
            configKey: item.key,
            configValue: String(settings[item.key]),
            valueType: item.type,
            configGroup: 'basic_settings',
            description: item.desc,
            isEnabled: true,
            isSystem: true
          });
        }

        await configRepository.save(config);
      }
    }

    res.json({
      success: true,
      message: '基本设置保存成功',
      data: settings
    });
  } catch (error) {
    console.error('保存基本设置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存基本设置失败'
    });
  }
});

// ========== 管理员路由（需要管理员权限）==========

/**
 * @route PUT /api/v1/system/global-config
 * @desc 更新全局配置（仅管理员可操作）
 * @access Private (Admin)
 */
router.put('/global-config', authenticateToken, requireAdmin, (req, res) => {
  const { storageConfig } = req.body;

  // 这里应该保存到数据库，目前返回模拟数据
  res.json({
    success: true,
    message: '全局配置已更新',
    data: {
      storageConfig: {
        ...storageConfig,
        lastUpdatedAt: new Date().toISOString(),
        version: (storageConfig.version || 1) + 1
      }
    }
  });
});

/**
 * @route GET /api/v1/system/info
 * @desc 获取系统信息
 * @access Private (Admin)
 */
router.get('/info', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: '系统管理功能开发中',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// ========== 部门管理路由（需要管理员权限）==========
// 为部门路由添加认证和管理员权限中间件

/**
 * @route GET /api/v1/system/departments
 * @desc 获取部门列表
 * @access Private (Admin)
 */
router.get('/departments', authenticateToken, requireAdmin, departmentController.getDepartments.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/tree
 * @desc 获取部门树形结构
 * @access Private (Admin)
 */
router.get('/departments/tree', authenticateToken, requireAdmin, departmentController.getDepartmentTree.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/stats
 * @desc 获取部门统计信息
 * @access Private (Admin)
 */
router.get('/departments/stats', authenticateToken, requireAdmin, departmentController.getDepartmentStats.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/:id
 * @desc 获取部门详情
 * @access Private (Admin)
 */
router.get('/departments/:id', authenticateToken, requireAdmin, departmentController.getDepartmentById.bind(departmentController));

/**
 * @route POST /api/v1/system/departments
 * @desc 创建部门
 * @access Private (Admin)
 */
router.post('/departments', authenticateToken, requireAdmin, departmentController.createDepartment.bind(departmentController));

/**
 * @route PUT /api/v1/system/departments/:id
 * @desc 更新部门
 * @access Private (Admin)
 */
router.put('/departments/:id', authenticateToken, requireAdmin, departmentController.updateDepartment.bind(departmentController));

/**
 * @route PATCH /api/v1/system/departments/:id/status
 * @desc 更新部门状态
 * @access Private (Admin)
 */
router.patch('/departments/:id/status', authenticateToken, requireAdmin, departmentController.updateDepartmentStatus.bind(departmentController));

/**
 * @route DELETE /api/v1/system/departments/:id
 * @desc 删除部门
 * @access Private (Admin)
 */
router.delete('/departments/:id', authenticateToken, requireAdmin, departmentController.deleteDepartment.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/:id/members
 * @desc 获取部门成员
 * @access Private (Admin)
 */
router.get('/departments/:id/members', authenticateToken, requireAdmin, departmentController.getDepartmentMembers.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/:id/roles
 * @desc 获取部门角色列表
 * @access Private (Admin)
 */
router.get('/departments/:id/roles', authenticateToken, requireAdmin, departmentController.getDepartmentRoles.bind(departmentController));

/**
 * @route PATCH /api/v1/system/departments/:id/permissions
 * @desc 更新部门权限
 * @access Private (Admin)
 */
router.patch('/departments/:id/permissions', authenticateToken, requireAdmin, departmentController.updateDepartmentPermissions.bind(departmentController));

/**
 * @route PATCH /api/v1/system/departments/:id/move
 * @desc 移动部门
 * @access Private (Admin)
 */
router.patch('/departments/:id/move', authenticateToken, requireAdmin, departmentController.moveDepartment.bind(departmentController));

/**
 * @route POST /api/v1/system/departments/:departmentId/members
 * @desc 添加部门成员
 * @access Private (Admin)
 */
router.post('/departments/:departmentId/members', authenticateToken, requireAdmin, departmentController.addDepartmentMember.bind(departmentController));

/**
 * @route DELETE /api/v1/system/departments/:departmentId/members/:userId
 * @desc 移除部门成员
 * @access Private (Admin)
 */
router.delete('/departments/:departmentId/members/:userId', authenticateToken, requireAdmin, departmentController.removeDepartmentMember.bind(departmentController));

export default router;
