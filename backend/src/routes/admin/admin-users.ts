import { Router } from 'express';
import { adminUserController } from '../../controllers/admin/AdminUserController';

const router = Router();

// 管理员用户管理路由
router.get('/', (req, res) => adminUserController.getAdminUsers(req, res));
router.get('/:id', (req, res) => adminUserController.getAdminUserById(req, res));
router.post('/', (req, res) => adminUserController.createAdminUser(req, res));
router.put('/:id', (req, res) => adminUserController.updateAdminUser(req, res));
router.delete('/:id', (req, res) => adminUserController.deleteAdminUser(req, res));

// 密码管理
router.put('/:id/password', (req, res) => adminUserController.changePassword(req, res));
router.post('/:id/reset-password', (req, res) => adminUserController.resetPassword(req, res));

// 用户状态控制
router.post('/:id/lock', (req, res) => adminUserController.lockUser(req, res));
router.post('/:id/unlock', (req, res) => adminUserController.unlockUser(req, res));

// 操作日志
router.get('/logs/operations', (req, res) => adminUserController.getOperationLogs(req, res));

export default router;
