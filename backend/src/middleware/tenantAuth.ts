/**
 * 租户认证中间件
 * 用于SaaS模式下的租户识别和验证
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any

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
          return res.status(403).json({ success: false, message: '企业授权已过期，请联系管理员续费', code: 'LICENSE_EXPIRED' })
        }
        req.tenantInfo = tenant
      } catch (dbErr) {
        // 数据库查询失败时放行（容错，避免数据库抖动导致全部用户掉线）
        log.error('[TenantAuth] 查询租户状态失败（已放行）:', dbErr)
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
 * 租户资源限制中间件
 * 检查租户的资源使用是否超限
 *
 * 使用方式：
 * router.post('/api/users', tenantAuth, checkTenantLimits, createUser)
 */
export const checkTenantLimits = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 只在SaaS模式下检查
    if (!deployConfig.isSaaS()) {
      next()
      return
    }

    const tenant = req.tenantInfo
    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: '租户信息缺失'
      })
    }

    // TODO: 实现具体的资源限制检查
    // 1. 检查用户数限制
    // if (req.path.includes('/users') && req.method === 'POST') {
    //   const userCount = await User.count({ where: { tenant_id: tenant.id } })
    //   if (userCount >= tenant.max_users) {
    //     return res.status(403).json({
    //       message: `用户数已达上限(${tenant.max_users})`
    //     })
    //   }
    // }

    // 2. 检查存储空间限制
    // if (req.path.includes('/upload')) {
    //   const storageUsed = await getStorageUsed(tenant.id)
    //   const maxStorage = tenant.max_storage_gb * 1024 * 1024 * 1024
    //   if (storageUsed >= maxStorage) {
    //     return res.status(403).json({
    //       message: `存储空间已满(${tenant.max_storage_gb}GB)`
    //     })
    //   }
    // }

    next()
  } catch (error) {
    log.error('检查租户资源限制失败:', error)
    next()
  }
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
