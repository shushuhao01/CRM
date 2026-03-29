/**
 * 公开API路由索引
 * 这些接口不需要认证，用于官网注册、支付等功能
 */
import { Router } from 'express';
import registerRoutes from './register';
import packagesRoutes from './packages';
import paymentRoutes from './payment';
import licenseQueryRoutes from './license-query';

const router = Router();

// 注册相关接口
router.use('/register', registerRoutes);

// 套餐查询接口
router.use('/packages', packagesRoutes);

// 支付相关接口
router.use('/payment', paymentRoutes);

// 授权查询接口（供私有部署系统调用）
router.use('/license-query', licenseQueryRoutes);

export default router;
