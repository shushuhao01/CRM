/**
 * SaaS 模式守卫中间件
 *
 * 在 SaaS 专属路由前使用，确保只有验证通过的 SaaS 平台才能访问
 * 对于未授权的 SaaS 功能请求，返回 403 错误
 */

import { Request, Response, NextFunction } from 'express';
import { SaaSGuardService } from '../services/SaaSGuardService';
import { log } from '../config/logger';

/**
 * 要求 SaaS 模式已验证
 * 未通过验证时返回 403
 */
export const requireSaaSMode = (req: Request, res: Response, next: NextFunction): void => {
  if (SaaSGuardService.isVerified()) {
    next();
    return;
  }

  log.warn(`[SaaSGuard] 拒绝未授权的 SaaS 功能访问: ${req.method} ${req.path}`);

  res.status(403).json({
    success: false,
    message: 'SaaS 多租户功能未授权，当前系统以私有部署模式运行',
    code: 'SAAS_NOT_AUTHORIZED'
  });
};

/**
 * 可选的 SaaS 模式检查（不阻断请求，仅注入标识）
 * 用于兼容两种模式的路由，在 req 上标记 SaaS 是否可用
 */
export const checkSaaSMode = (req: Request, _res: Response, next: NextFunction): void => {
  (req as any).isSaaSAuthorized = SaaSGuardService.isVerified();
  next();
};

