/**
 * 系统模块 - 路由入口
 * 聚合所有系统子路由模块，导出统一的 router
 *
 * 子模块：
 * - systemHelpers.ts: 共享辅助函数（上传配置、缓存）
 * - systemSettings.ts: 设置相关路由
 * - systemConfig.ts: 配置管理路由
 */
import { Router } from 'express';
import { registerSettingsRoutes } from './systemSettings';
import { registerConfigRoutes } from './systemConfig';
import { registerUpdateRoutes } from './systemUpdate';

const router = Router();

// 注册设置相关路由
registerSettingsRoutes(router);

// 注册配置管理路由
registerConfigRoutes(router);

// 注册系统更新路由（CRM端一键更新）
registerUpdateRoutes(router);

export default router;
