/**
 * Admin Routes - 平台管理后台路由
 * 只在 ENABLE_ADMIN=true 时启用
 */
import { Router } from 'express';
import { adminAuthMiddleware } from '../../middleware/adminAuth';
import authRouter from './auth';
import licensesRouter from './licenses';
import versionsRouter from './versions';
import dashboardRouter from './dashboard';
import verifyRouter from './verify';
import systemConfigRouter from './systemConfig';
import tenantsRouter from './tenants';
import packagesRouter from './packages';
import paymentRouter from './payment';
import modulesRouter from './modules';

const router = Router();

// 公开接口（不需要认证）
router.use('/verify', verifyRouter);
// 公开的系统配置接口（供CRM前端调用）- 需要放在认证中间件之前
// 路径: /api/v1/admin/public/system-config
router.use('/', systemConfigRouter);

// 所有admin路由都经过认证中间件（中间件内部会跳过登录接口）
router.use(adminAuthMiddleware);
router.use('/auth', authRouter);
router.use('/licenses', licensesRouter);
router.use('/versions', versionsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/tenants', tenantsRouter);
router.use('/packages', packagesRouter);
router.use('/payment', paymentRouter);
router.use('/modules', modulesRouter);
router.use('/', systemConfigRouter);

export default router;
