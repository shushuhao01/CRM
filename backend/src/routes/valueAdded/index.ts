/**
 * 增值管理模块 - 路由入口
 */
import { Router } from 'express';
import { registerOrderRoutes } from './valueAddedOrders';
import { registerCompanyRoutes } from './valueAddedCompany';

const router = Router();

// 注册订单相关路由
registerOrderRoutes(router);

// 注册公司管理相关路由
registerCompanyRoutes(router);

export default router;
