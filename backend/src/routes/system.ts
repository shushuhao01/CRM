import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { DepartmentController } from '../controllers/DepartmentController';

const router = Router();
const departmentController = new DepartmentController();

/**
 * 系统管理路由
 * TODO: 实现系统配置、日志查看等功能
 */

// 所有系统路由都需要管理员权限
router.use(authenticateToken, requireAdmin);

/**
 * @route GET /api/v1/system/info
 * @desc 获取系统信息
 * @access Private (Admin)
 */
router.get('/info', (req, res) => {
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

/**
 * @route GET /api/v1/system/global-config
 * @desc 获取全局配置
 * @access Private (Admin)
 */
router.get('/global-config', (req, res) => {
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

/**
 * @route PUT /api/v1/system/global-config
 * @desc 更新全局配置
 * @access Private (Admin)
 */
router.put('/global-config', (req, res) => {
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

// 部门管理路由
/**
 * @route GET /api/v1/system/departments
 * @desc 获取部门列表
 * @access Private (Admin)
 */
router.get('/departments', departmentController.getDepartments.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/tree
 * @desc 获取部门树形结构
 * @access Private (Admin)
 */
router.get('/departments/tree', departmentController.getDepartmentTree.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/stats
 * @desc 获取部门统计信息
 * @access Private (Admin)
 */
router.get('/departments/stats', departmentController.getDepartmentStats.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/:id
 * @desc 获取部门详情
 * @access Private (Admin)
 */
router.get('/departments/:id', departmentController.getDepartmentById.bind(departmentController));

/**
 * @route POST /api/v1/system/departments
 * @desc 创建部门
 * @access Private (Admin)
 */
router.post('/departments', departmentController.createDepartment.bind(departmentController));

/**
 * @route PUT /api/v1/system/departments/:id
 * @desc 更新部门
 * @access Private (Admin)
 */
router.put('/departments/:id', departmentController.updateDepartment.bind(departmentController));

/**
 * @route PATCH /api/v1/system/departments/:id/status
 * @desc 更新部门状态
 * @access Private (Admin)
 */
router.patch('/departments/:id/status', departmentController.updateDepartmentStatus.bind(departmentController));

/**
 * @route DELETE /api/v1/system/departments/:id
 * @desc 删除部门
 * @access Private (Admin)
 */
router.delete('/departments/:id', departmentController.deleteDepartment.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/:id/members
 * @desc 获取部门成员
 * @access Private (Admin)
 */
router.get('/departments/:id/members', departmentController.getDepartmentMembers.bind(departmentController));

/**
 * @route POST /api/v1/system/departments/:departmentId/members
 * @desc 添加部门成员
 * @access Private (Admin)
 */
router.post('/departments/:departmentId/members', departmentController.addDepartmentMember.bind(departmentController));

/**
 * @route DELETE /api/v1/system/departments/:departmentId/members/:userId
 * @desc 移除部门成员
 * @access Private (Admin)
 */
router.delete('/departments/:departmentId/members/:userId', departmentController.removeDepartmentMember.bind(departmentController));

export default router;