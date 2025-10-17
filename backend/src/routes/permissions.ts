import { Router } from 'express';
import { PermissionController } from '../controllers/PermissionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const permissionController = new PermissionController();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取权限树
router.get('/tree', (req, res) => permissionController.getPermissionTree(req, res));

// 获取权限列表
router.get('/', (req, res) => permissionController.getPermissions(req, res));

// 创建权限
router.post('/', (req, res) => permissionController.createPermission(req, res));

// 更新权限
router.put('/:id', (req, res) => permissionController.updatePermission(req, res));

// 删除权限
router.delete('/:id', (req, res) => permissionController.deletePermission(req, res));

export default router;