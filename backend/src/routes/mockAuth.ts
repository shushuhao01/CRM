import { Router } from 'express';
import { MockAuthController } from '../controllers/MockAuthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const mockAuthController = new MockAuthController();

// 模拟登录路由
router.post('/login', mockAuthController.login);

// 模拟获取当前用户信息（需要认证）
router.get('/me', authenticateToken, mockAuthController.getCurrentUser);

// 模拟登出路由
router.post('/logout', mockAuthController.logout);

// 模拟刷新token路由
router.post('/refresh', mockAuthController.refreshToken);

// 模拟修改密码路由（需要认证）
router.put('/password', authenticateToken, mockAuthController.changePassword);

// 模拟更新用户信息路由（需要认证）
router.put('/me', authenticateToken, mockAuthController.updateCurrentUser);

export default router;