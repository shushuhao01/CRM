import { Request, Response, NextFunction } from 'express';
import { JwtConfig, JwtPayload } from '../config/jwt';
import { getDataSource } from '../config/database';
import { User } from '../entities/User';
import { logger } from '../config/logger';
import { TenantContextManager } from '../utils/tenantContext';
import { cacheService } from '../services/CacheService';

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

    // 🔥 性能优化：优先从缓存获取用户信息，避免每次API请求都查数据库
    // 🔥 安全修复：缓存key包含tenantId，防止跨租户缓存混淆
    const tenantPrefix = payload.tenantId || 'default';
    const cacheKey = `auth:user:${tenantPrefix}:${payload.userId}`;
    let user: User | null = cacheService.get(cacheKey);

    if (!user) {
      // 缓存未命中，从数据库查询
      const dataSource = getDataSource();
      if (!dataSource) {
        return res.status(500).json({
          success: false,
          message: '数据库连接未初始化',
          code: 'DATABASE_NOT_INITIALIZED'
        });
      }
      const userRepository = dataSource.getRepository(User);
      // 🔥 安全修复：添加 tenantId 过滤，防止跨租户用户认证
      const where: any = { id: payload.userId };
      if (payload.tenantId) {
        where.tenantId = payload.tenantId;
      }
      user = await userRepository.findOne({ where });

      // 查到后写入缓存（TTL 2分钟）
      if (user) {
        cacheService.set(cacheKey, user, AUTH_USER_CACHE_TTL);
      }
    }

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
    if (payload.tenantId) {
      (req as any).tenantId = payload.tenantId;
      // 同步更新AsyncLocalStorage中的租户上下文
      TenantContextManager.setContext({ tenantId: payload.tenantId, userId: payload.userId });
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

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.warn(`用户 ${req.user.username} 尝试访问需要 ${allowedRoles.join('/')} 权限的资源，但用户角色为 ${userRole}`);

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

      // 🔥 性能优化：复用认证缓存（包含tenantId前缀）
      const tenantPrefix = payload.tenantId || 'default';
      const cacheKey = `auth:user:${tenantPrefix}:${payload.userId}`;
      let user: User | null = cacheService.get(cacheKey);

      if (!user) {
        const dataSource = getDataSource();
        if (!dataSource) {
          return next();
        }
        const userRepository = dataSource.getRepository(User);
        // 🔥 安全修复：添加 tenantId 过滤
        const where: any = { id: payload.userId };
        if (payload.tenantId) {
          where.tenantId = payload.tenantId;
        }
        user = await userRepository.findOne({ where });
        if (user) {
          cacheService.set(cacheKey, user, AUTH_USER_CACHE_TTL);
        }
      }

      if (user && user.status === 'active') {
        req.currentUser = user;
      }
    }
  } catch (error) {
    // 可选认证失败时不阻止请求继续
    logger.debug('可选认证失败:', error);
  }

  next();
};
