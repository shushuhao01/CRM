/**
 * 物流模块 - 路由入口
 */
import { Router } from 'express';
import { LogisticsController } from '../../controllers/LogisticsController';
import { authenticateToken } from '../../middleware/auth';
import { registerCompanyAndTraceRoutes } from './logisticsCompany';
import { registerStatusAndConfigRoutes } from './logisticsStatus';
import { registerSenderAddressRoutes } from './senderAddress';
import publicCallbacksRouter from './publicCallbacks';

const router = Router();
const logisticsController = new LogisticsController();

// 🔥 轨迹推送回调路由（必须在认证中间件之前注册）
// 快递开放平台从外部推送数据，无法携带JWT令牌
router.use(publicCallbacksRouter);

// 应用认证中间件
router.use(authenticateToken);

// 注册物流公司与追踪路由
registerCompanyAndTraceRoutes(router, logisticsController);

// 注册状态更新与配置路由
registerStatusAndConfigRoutes(router);

// 注册寄件人/退货地址路由
registerSenderAddressRoutes(router);

export default router;
