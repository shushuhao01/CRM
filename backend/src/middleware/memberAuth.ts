/**
 * 会员中心认证中间件
 * 独立于CRM用户认证(auth.ts)和Admin管理员认证(adminAuth.ts)
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { log } from '../config/logger';

const MEMBER_JWT_SECRET = process.env.MEMBER_JWT_SECRET || process.env.JWT_SECRET || 'member-center-secret-key-2026';

export interface MemberJwtPayload {
  type: 'member';
  tenantId: string;
  tenantCode: string;
  phone: string;
  iat?: number;
  exp?: number;
}

/**
 * 生成会员JWT Token
 */
export function generateMemberToken(payload: Omit<MemberJwtPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    { ...payload, type: 'member' },
    MEMBER_JWT_SECRET,
    { expiresIn: '7d', issuer: 'yunke-crm-member' }
  );
}

/**
 * 验证会员JWT Token
 */
export function verifyMemberToken(token: string): MemberJwtPayload | null {
  try {
    const decoded = jwt.verify(token, MEMBER_JWT_SECRET) as MemberJwtPayload;
    if (decoded.type !== 'member') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 会员认证中间件
 * 从 Authorization Header 提取 Bearer Token，验证后注入 req.memberTenant
 */
export const memberAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录会员中心' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyMemberToken(token);

  if (!decoded) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }

  try {
    // 验证租户是否存在且未被禁用
    const tenants = await AppDataSource.query(
      'SELECT id, code, name, phone, email, contact, status, package_id, expire_date, license_status, max_users, max_storage_gb, user_count, used_storage_mb FROM tenants WHERE id = ?',
      [decoded.tenantId]
    );

    if (tenants.length === 0) {
      return res.status(401).json({ code: 401, message: '账号不存在' });
    }

    const tenant = tenants[0];
    if (tenant.status === 'disabled' || tenant.status === 'deleted') {
      return res.status(403).json({ code: 403, message: '账号已被禁用，请联系客服' });
    }

    // 注入租户信息到请求对象
    (req as any).memberTenant = {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      contact: tenant.contact,
      status: tenant.status,
      packageId: tenant.package_id,
      expireDate: tenant.expire_date,
      licenseStatus: tenant.license_status,
      maxUsers: tenant.max_users,
      maxStorageGb: tenant.max_storage_gb,
      userCount: tenant.user_count,
      usedStorageMb: tenant.used_storage_mb
    };

    next();
  } catch (error) {
    log.error('[MemberAuth] 认证失败:', error);
    return res.status(500).json({ code: 500, message: '认证服务异常' });
  }
};

