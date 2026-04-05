/**
 * 物流模块 - 路由入口
 */
import { Router } from 'express';
import { LogisticsController } from '../../controllers/LogisticsController';
import { authenticateToken } from '../../middleware/auth';
import { registerCompanyAndTraceRoutes } from './logisticsCompany';
import { registerStatusAndConfigRoutes } from './logisticsStatus';

const router = Router();
const logisticsController = new LogisticsController();

// 应用认证中间件
router.use(authenticateToken);

// 注册物流公司与追踪路由
registerCompanyAndTraceRoutes(router, logisticsController);

// 注册状态更新与配置路由
registerStatusAndConfigRoutes(router);

export default router;
