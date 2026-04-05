/**
 * 公开API路由索引
 * 这些接口不需要认证，用于官网注册、支付等功能
 */
import { Router } from 'express';
import registerRoutes from './register';
import packagesRoutes from './packages';
import paymentRoutes from './payment';
import licenseQueryRoutes from './license-query';
import websiteConfigRoutes from './website-config';
import versionCheckRoutes from './version-check';
import memberRoutes from './member';
import subscriptionRoutes from './subscription';
import capacityRoutes from './capacity';

const router = Router();

// 注册相关接口
router.use('/register', registerRoutes);

// 套餐查询接口
router.use('/packages', packagesRoutes);

// 支付相关接口
router.use('/payment', paymentRoutes);

// 会员中心接口
router.use('/member', memberRoutes);

// 订阅管理接口
router.use('/subscription', subscriptionRoutes);

// 扩容管理接口
router.use('/capacity', capacityRoutes);

// 授权查询接口（供私有部署系统调用）
router.use('/license-query', licenseQueryRoutes);

// 官网配置接口
router.use('/website-config', websiteConfigRoutes);

// 版本检查接口（供私有客户和SaaS租户检查更新）
router.use('/version-check', versionCheckRoutes);

export default router;
