import { Request, Response, NextFunction } from 'express';
import { JwtConfig, JwtPayload } from '../config/jwt';
import { getDataSource } from '../config/database';
import { User } from '../entities/User';
import { logger } from '../config/logger';

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

    // 获取用户详细信息
    const dataSource = getDataSource();
    if (!dataSource) {
      return res.status(500).json({
        success: false,
        message: '数据库连接未初始化',
        code: 'DATABASE_NOT_INITIALIZED'
      });
    }
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: payload.userId },
      relations: ['department']
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '用户账户已被禁用',
        code: 'USER_DISABLED'
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    logger.error('JWT认证失败:', error);
    logger.error('Token内容:', token?.substring(0, 50) + '...');

    if (error instanceof Error) {
      logger.error('错误详情:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });

      if (error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          message: '访问令牌已过期',
          code: 'TOKEN_EXPIRED',
          error: error.message
        });
      }

      if (error.message.includes('invalid')) {
        return res.status(401).json({
          success: false,
          message: '访问令牌无效',
          code: 'TOKEN_INVALID',
          error: error.message
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: '认证失败',
      code: 'AUTH_FAILED',
      error: error instanceof Error ? error.message : '未知错误'
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
 */
export const requireAdmin = requireRole(['admin', 'superadmin']);

/**
 * 管理员或经理权限检查中间件
 */
export const requireManagerOrAdmin = requireRole(['admin', 'manager']);

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

      // 获取用户详细信息
      const dataSource = getDataSource();
      if (!dataSource) {
        // 可选认证，数据库未初始化时继续执行
        return next();
      }
      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: payload.userId },
        relations: ['department']
      });

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
