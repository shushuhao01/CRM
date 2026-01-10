/**
 * 公开API路由索引
 * 这些接口不需要认证，用于官网注册、支付等功能
 */
import { Router } from 'express';
import registerRoutes from './register';
import packagesRoutes from './packages';
import paymentRoutes from './payment';

const router = Router();

// 注册相关接口
router.use('/register', registerRoutes);

// 套餐查询接口
router.use('/packages', packagesRoutes);

// 支付相关接口
router.use('/payment', paymentRoutes);

export default router;
