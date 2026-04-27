import { Request, Response, NextFunction } from 'express';
import { JwtConfig, JwtPayload } from '../config/jwt';
import { getDataSource } from '../config/database';
import { User } from '../entities/User';
import { logger } from '../config/logger';
import { TenantContextManager } from '../utils/tenantContext';
import { deployConfig } from '../config/deploy';
import { cacheService } from '../services/CacheService';
import { onlineSeatService } from '../services/OnlineSeatService';
import { getClientIp } from '../utils/getClientIp';

// 🔥 用户认证缓存 TTL（秒）— 短TTL保证安全性，用户禁用最多延迟2分钟生效
const AUTH_USER_CACHE_TTL = 120;

// 扩展Request接口
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      currentUser?: User;
    }
  }
}

/**
 * 🔥 清除指定用户的认证缓存
 * 在用户状态变更（禁用/启用/修改密码/删除）时调用
 * 🔥 安全修复：支持按 tenantId 精确清除，兼容旧格式
 */
export const clearUserAuthCache = (userId: string, tenantId?: string): void => {
  if (tenantId) {
    cacheService.delete(`auth:user:${tenantId}:${userId}`);
  }
  // 兼容：同时清除默认前缀的缓存
  cacheService.delete(`auth:user:default:${userId}`);
};

/**
 * 🔥 从缓存或数据库查找用户（共用逻辑）
 * authenticateToken 和 optionalAuth 共用此函数，避免重复代码
 * 返回 { user, cacheKey } 或 null（数据库不可用时）
 */
const lookupUserWithCache = async (payload: JwtPayload): Promise<{ user: User | null; cacheKey: string } | null> => {
  const tenantPrefix = payload.tenantId || 'default';
  const cacheKey = `auth:user:${tenantPrefix}:${payload.userId}`;
  let user: User | null = cacheService.get(cacheKey);

  if (!user) {
    const dataSource = getDataSource();
    if (!dataSource) return null;

    const userRepository = dataSource.getRepository(User);
    const where: any = { id: payload.userId };
    if (payload.tenantId) {
      where.tenantId = payload.tenantId;
    }
    user = await userRepository.findOne({ where });

    if (user) {
      cacheService.set(cacheKey, user, AUTH_USER_CACHE_TTL);
    }
  }

  return { user, cacheKey };
};

/**
 * JWT认证中间件
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  try {

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失',
        code: 'TOKEN_MISSING'
      });
    }

    // 验证令牌
    const payload = JwtConfig.verifyAccessToken(token);
    req.user = payload;

    // 🔥 性能优化：共用 lookupUserWithCache，避免重复的缓存/DB查询逻辑
    const result = await lookupUserWithCache(payload);

    if (!result) {
      return res.status(500).json({
        success: false,
        message: '数据库连接未初始化',
        code: 'DATABASE_NOT_INITIALIZED'
      });
    }

    const { user, cacheKey } = result;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== 'active') {
      // 用户已被禁用，同时清除缓存确保后续请求也被拒绝
      cacheService.delete(cacheKey);
      return res.status(401).json({
        success: false,
        message: '用户账户已被禁用',
        code: 'USER_DISABLED'
      });
    }

    req.currentUser = user;

    // 从JWT中提取tenantId并注入到请求对象，供租户上下文使用
    // 🔒 安全守护：仅 SaaS 模式已验证时才注入租户上下文，防止私有部署绵过守卫
    if (payload.tenantId && deployConfig.isSaaS()) {
      (req as any).tenantId = payload.tenantId;
      // 同步更新AsyncLocalStorage中的租户上下文
      TenantContextManager.setContext({ tenantId: payload.tenantId, userId: payload.userId });
    }

    // 🔥 在线席位：检查会话状态 + 更新活跃时间
    if (token && payload.tenantId) {
      try {
        const sessionToken = onlineSeatService.generateSessionToken(token);
        (req as any).sessionToken = sessionToken;

        // 🔥 同步检查：被踢出/过期/登出的会话直接拒绝，强制用户重新登录
        const isKicked = await onlineSeatService.isSessionKicked(sessionToken);
        if (isKicked) {
          return res.status(401).json({
            success: false,
            message: '您的会话已被下线，请重新登录',
            code: 'SESSION_KICKED'
          });
        }

        onlineSeatService.updateActivity(sessionToken);
        // 🔥 异步确保会话记录存在（解决重启/表新建后已登录用户无记录的问题）
        // 内部已检查被踢状态，不会重建被踢出的会话
        onlineSeatService.ensureSessionExists({
          sessionToken,
          userId: payload.userId,
          tenantId: payload.tenantId,
          deviceInfo: req.get('User-Agent'),
          ipAddress: getClientIp(req)
        }).catch(() => {}); // 不阻塞请求
      } catch (_e) {
        // 在线席位更新失败不影响正常请求
      }
    }

    next();
  } catch (error) {
    // 仅开发环境输出详细错误信息
    if (process.env.NODE_ENV === 'development') {
      logger.error('JWT认证失败:', error instanceof Error ? error.message : '未知错误');
    }

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          message: '访问令牌已过期',
          code: 'TOKEN_EXPIRED'
        });
      }

      if (error.message.includes('invalid')) {
        return res.status(401).json({
          success: false,
          message: '访问令牌无效',
          code: 'TOKEN_INVALID'
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: '认证失败',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * 角色权限检查中间件
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const allowedRoles = (Array.isArray(roles) ? roles : [roles]).map(r => r.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      logger.warn(`用户 ${req.user.username} 尝试访问需要 ${allowedRoles.join('/')} 权限的资源，但用户角色为 ${req.user.role}`);

      return res.status(403).json({
        success: false,
        message: '权限不足',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * 管理员权限检查中间件
 * 支持的角色: admin, superadmin, super_admin
 */
export const requireAdmin = requireRole(['admin', 'superadmin', 'super_admin']);

/**
 * 管理员或经理权限检查中间件
 * 支持的角色: admin, super_admin, manager, department_manager
 */
export const requireManagerOrAdmin = requireRole([
  'admin',
  'super_admin',
  'superadmin',
  'manager',
  'department_manager'
]);

/**
 * 可选认证中间件（不强制要求认证）
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = JwtConfig.verifyAccessToken(token);
      req.user = payload;

      // 🔥 性能优化：复用 lookupUserWithCache，与 authenticateToken 共享缓存逻辑
      const result = await lookupUserWithCache(payload);

      if (result?.user && result.user.status === 'active') {
        req.currentUser = result.user;
      }
    }
  } catch (error) {
    // 可选认证失败时不阻止请求继续
    logger.debug('可选认证失败:', error);
  }

  next();
};

// ==================== 企微侧边栏认证 ====================

export interface SidebarPayload {
  type: 'sidebar';
  wecomUserId: string;
  crmUserId: string;
  crmUserName: string;
  tenantId: string;
  corpId: string;
}

/**
 * 企微侧边栏认证中间件
 * 验证侧边栏专用JWT token (type='sidebar')
 */
export const authenticateSidebarToken = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '侧边栏令牌缺失', code: 'SIDEBAR_TOKEN_MISSING' });
  }

  try {
    const payload = JwtConfig.verifyAccessToken(token) as any;

    if (payload.type !== 'sidebar') {
      return res.status(401).json({ success: false, message: '令牌类型无效', code: 'INVALID_TOKEN_TYPE' });
    }

    (req as any).sidebarUser = payload as SidebarPayload;

    // 注入租户上下文（🔒 仅 SaaS 模式已验证时才注入）
    if (payload.tenantId && deployConfig.isSaaS()) {
      (req as any).tenantId = payload.tenantId;
      TenantContextManager.setContext({ tenantId: payload.tenantId, userId: payload.crmUserId });
    }

    next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: '侧边栏令牌无效或已过期', code: 'SIDEBAR_TOKEN_INVALID' });
  }
};

