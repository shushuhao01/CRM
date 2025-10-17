import { Request, Response, NextFunction } from 'express';
import { JwtConfig, JwtPayload } from '../config/jwt';
import { logger } from '../config/logger';

// 扩展Request接口
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * 简化的JWT认证中间件 - 不依赖数据库
 * 用于替代连接功能等不需要完整用户信息的场景
 */
export const authenticateTokenSimple = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

    // 简单验证：只检查token是否有效，不查询数据库
    if (!payload.userId || !payload.username) {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌',
        code: 'INVALID_TOKEN'
      });
    }

    next();
  } catch (error) {
    logger.error('JWT认证失败:', error);
    
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
          message: '无效的访问令牌',
          code: 'INVALID_TOKEN'
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: '认证失败',
      code: 'AUTHENTICATION_FAILED'
    });
  }
};

/**
 * 可选的认证中间件 - 如果有token则验证，没有则跳过
 * 用于某些可以匿名访问但有token时需要验证的场景
 */
export const authenticateTokenOptional = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // 没有token，跳过认证
      next();
      return;
    }

    // 有token，进行验证
    const payload = JwtConfig.verifyAccessToken(token);
    req.user = payload;
    
    next();
  } catch (error) {
    logger.warn('可选认证失败，继续处理请求:', error);
    // 认证失败但不阻止请求继续
    next();
  }
};