/**
 * Admin Authentication Middleware
 * 管理后台认证中间件
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtConfig } from '../config/jwt';
import { AppDataSource } from '../config/database';

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 登录接口不需要认证
  if (req.path === '/auth/login') {
    return next();
  }

  // 验证码接口不需要认证
  if (req.path === '/auth/captcha' && req.method === 'GET') {
    return next();
  }

  // 公开接口：获取最新版本（供客户端检查更新）
  if (req.path === '/versions/latest' && req.method === 'GET') {
    return next();
  }

  // 公开接口：获取系统配置覆盖（供CRM前端调用）
  if (req.path === '/public/system-config' && req.method === 'GET') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JwtConfig.getAccessTokenSecret()) as any;

    // 验证是否是管理员 token
    if (!decoded.isAdmin) {
      return res.status(403).json({ success: false, message: '无权访问管理后台' });
    }

    // 加载管理员权限列表
    let permissions: string[] = [];
    if (decoded.role === 'super_admin') {
      permissions = ['*'];
    } else {
      try {
        const adminRows = await AppDataSource.query(
          'SELECT role_id FROM admin_users WHERE id = ? LIMIT 1', [decoded.adminId]
        );
        if (adminRows.length > 0 && adminRows[0].role_id) {
          const roleRows = await AppDataSource.query(
            "SELECT permissions FROM admin_roles WHERE id = ? AND status = 'active' LIMIT 1", [adminRows[0].role_id]
          );
          if (roleRows.length > 0) {
            permissions = JSON.parse(roleRows[0].permissions || '[]');
          }
        }
      } catch { /* 权限加载失败不阻塞请求 */ }
    }
    decoded.permissions = permissions;

    (req as any).adminUser = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ success: false, message: '无效的认证令牌' });
  }
};
