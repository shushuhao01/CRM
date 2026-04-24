/**
 * 租户认证中间件
 * 用于SaaS模式下的租户识别和验证
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JwtConfig } from '../config/jwt'
import { deployConfig } from '../config/deploy'
import { AppDataSource } from '../config/database'
import { TenantContextManager } from '../utils/tenantContext'

import { log } from '../config/logger';
/**
 * 扩展Request接口，添加租户信息
 */
export interface TenantRequest extends Request {
  tenantId?: string
  tenantInfo?: any
  userId?: string
  userInfo?: any
}

/**
 * 租户认证中间件
 *
 * 功能：
 * 1. 从Token中提取租户ID（SaaS模式）
 * 2. 验证租户状态（启用/禁用/过期）
 * 3. 将租户信息注入到请求对象
 *
 * 使用方式：
 * router.get('/api/customers', tenantAuth, getCustomers)
 */
export const tenantAuth = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 获取Token
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未登录，请先登录'
      })
    }

    // 验证Token
    const decoded = jwt.verify(token, JwtConfig.getAccessTokenSecret()) as any

    // 根据部署模式处理
    if (deployConfig.isSaaS()) {
      // SaaS模式：提取租户ID并验证
      req.tenantId = decoded.tenantId
      req.userId = decoded.userId

      if (!req.tenantId) {
        return res.status(403).json({
          success: false,
          message: '租户信息缺失，请重新登录'
        })
      }

      // 验证租户状态（查询数据库）
      try {
        const tenantRows = await AppDataSource.query(
          `SELECT id, name, status, license_status, expire_date FROM tenants WHERE id = ?`,
          [req.tenantId]
        )
        const tenant = tenantRows[0]
        if (!tenant) {
          return res.status(403).json({ success: false, message: '租户不存在，请联系管理员' })
        }
        if (tenant.status === 'disabled') {
          return res.status(403).json({ success: false, message: '企业账户已被禁用，请联系管理员' })
        }
        if (tenant.license_status === 'suspended') {
          return res.status(403).json({ success: false, message: '企业授权已暂停，请联系管理员续费' })
        }
        if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
          // 过期租户：标记过期状态，但不阻止请求
          // 写入限制由全局 checkLicenseWrite 中间件统一处理
          ;(req as any).tenantExpired = true
        }
        req.tenantInfo = tenant
      } catch (dbErr) {
        log.error('[TenantAuth] 查询租户状态失败:', dbErr)
        return res.status(500).json({ success: false, message: '系统异常，请稍后重试' })
      }

      // 更新 TenantContext（关键！让 BaseRepository 能获取到 tenantId）
      TenantContextManager.setContext({
        tenantId: req.tenantId,
        userId: req.userId,
        tenantInfo: req.tenantInfo
      })

    } else {
      // 私有部署模式：从token提取userId即可，不强制tenantId
      req.userId = decoded.userId
      // 私有模式也可能有tenantId（私有租户），保持传递
      if (decoded.tenantId) {
        req.tenantId = decoded.tenantId
      }

      // 更新 TenantContext
      TenantContextManager.setContext({
        tenantId: req.tenantId,
        userId: req.userId
      })
    }

    next()
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token已过期，请重新登录'
      })
    }

    return res.status(401).json({
      success: false,
      message: '认证失败，请重新登录'
    })
  }
}

/**
 * 可选的租户认证中间件
 * 如果有Token则验证，没有Token则跳过
 *
 * 使用场景：公开接口，但需要区分登录用户
 */
export const optionalTenantAuth = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      // 没有Token，跳过认证
      next()
      return
    }

    // 有Token，执行认证
    await tenantAuth(req, res, next)
  } catch (_error) {
    // 认证失败，但不阻止请求
    next()
  }
}

/**
 * ⚠️ 已弃用 — 请使用 middleware/checkTenantLimits.ts 中的完整实现
 *
 * 此处仅保留导出名以兼容可能的旧引用，内部直接放行。
 * 完整的用户数/存储空间/模块限制检查请使用：
 *   import { checkUserLimit, checkStorageLimit } from './checkTenantLimits'
 *
 * @deprecated
 */
export const checkTenantLimits = async (
  _req: TenantRequest,
  _res: Response,
  next: NextFunction
) => {
  // 直接放行 — 真实限制检查在 middleware/checkTenantLimits.ts
  next()
}

/**
 * 获取当前请求的租户ID
 *
 * 使用方式：
 * const tenantId = getTenantId(req)
 */
export const getTenantId = (req: TenantRequest): string | undefined => {
  return req.tenantId
}

/**
 * 判断当前请求是否为租户请求
 */
export const isTenantRequest = (req: TenantRequest): boolean => {
  return !!req.tenantId
}
