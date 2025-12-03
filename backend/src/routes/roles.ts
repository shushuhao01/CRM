import { Router } from 'express';
import { RoleController } from '../controllers/RoleController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();
const roleController = new RoleController();

// 获取角色列表 - 使用可选认证
router.get('/', optionalAuth, (req, res) => roleController.getRoles(req, res));

// 获取角色统计 - 使用可选认证
router.get('/stats', optionalAuth, (req, res) => roleController.getRoleStats(req, res));

// 获取角色权限 - 使用可选认证
router.get('/:id/permissions', optionalAuth, (req, res) => roleController.getRolePermissions(req, res));

// 获取单个角色 - 使用可选认证
router.get('/:id', optionalAuth, (req, res) => roleController.getRoleById(req, res));

// 以下操作需要认证
router.use(authenticateToken);

// 创建角色
router.post('/', (req, res) => roleController.createRole(req, res));

// 更新角色
router.put('/:id', (req, res) => roleController.updateRole(req, res));

// 删除角色
router.delete('/:id', (req, res) => roleController.deleteRole(req, res));

export default router;
