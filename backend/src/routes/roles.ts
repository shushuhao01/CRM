import { Router } from 'express';
import { RoleController } from '../controllers/RoleController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();
const roleController = new RoleController();

// 获取角色列表 - 使用可选认证
router.get('/', optionalAuth, (req, res) => roleController.getRoles(req, res));

// 获取角色统计 - 使用可选认证
router.get('/stats', optionalAuth, (req, res) => roleController.getRoleStats(req, res));

// 获取角色模板列表 - 使用可选认证
router.get('/templates', optionalAuth, (req, res) => roleController.getRoleTemplates(req, res));

// 获取角色权限 - 使用可选认证
router.get('/:id/permissions', optionalAuth, (req, res) => roleController.getRolePermissions(req, res));

// 获取单个角色 - 使用可选认证
router.get('/:id', optionalAuth, (req, res) => roleController.getRoleById(req, res));

// 以下操作需要认证
router.use(authenticateToken);

// 创建角色
router.post('/', (req, res) => roleController.createRole(req, res));

// 从模板创建角色
router.post('/from-template', (req, res) => roleController.createRoleFromTemplate(req, res));

// 更新角色权限（必须在 /:id 之前，避免被通配路由拦截）
router.put('/:id/permissions', (req, res) => roleController.updateRolePermissions(req, res));

// 更新角色状态（必须在 /:id 之前）
router.patch('/:id/status', (req, res) => roleController.updateRoleStatus(req, res));

// 更新角色（通配路由放最后）
router.put('/:id', (req, res) => roleController.updateRole(req, res));

// 删除角色
router.delete('/:id', (req, res) => roleController.deleteRole(req, res));

export default router;
