/**
 * 授权过期写入限制中间件（私有部署 + SaaS 租户通用）
 *
 * 功能：
 * 1. 私有部署：检查 system_license 表的过期状态
 * 2. SaaS 租户：检查 tenants 表的 expire_date
 * 3. 授权过期时，允许登录和读取（GET），但禁止写入操作（POST/PUT/DELETE/PATCH）
 * 4. 续费后自动恢复写入权限
 * 5. 提供即将到期预警信息（响应头）
 *
 * 使用方式：在 app.ts 中作为全局中间件，放在路由注册之前
 */

import { Request, Response, NextFunction } from 'express'
import { deployConfig } from '../config/deploy'
import { log } from '../config/logger'
import jwt from 'jsonwebtoken'
import { JwtConfig } from '../config/jwt'

// 缓存授权状态，避免每次请求都查数据库
let licenseStatusCache: {
  expired: boolean
  expiresAt: string | null
  daysUntilExpiry: number | null
  timestamp: number
} | null = null

// SaaS 租户过期状态缓存（按 tenantId 缓存）
const tenantExpireCache = new Map<string, {
  expired: boolean
  expiresAt: string | null
  daysUntilExpiry: number | null
  timestamp: number
}>()

const CACHE_TTL = 60 * 1000 // 1分钟缓存

// 不需要检查的路径前缀（公开接口、认证接口、授权接口）
const SKIP_PATHS = [
  '/auth/',
  '/auth',
  '/license/',
  '/license',
  '/public/',
  '/public',
  '/tenant-license/',
  '/tenant-license',
  '/health',
  '/sdk/',
  '/mobile-sdk/',
  '/calls/webhook',
]

/**
 * 检查路径是否应该跳过授权检查
 */
function shouldSkipPath(path: string): boolean {
  // 去掉 API 前缀
  const apiPrefix = process.env.API_PREFIX || '/api/v1'
  const relativePath = path.startsWith(apiPrefix) ? path.substring(apiPrefix.length) : path

  return SKIP_PATHS.some(skip => relativePath.startsWith(skip) || relativePath === skip)
}

/**
 * 获取授权状态（带缓存）
 */
async function getLicenseStatus(): Promise<{
  expired: boolean
  expiresAt: string | null
  daysUntilExpiry: number | null
}> {
  // 检查缓存
  if (licenseStatusCache && Date.now() - licenseStatusCache.timestamp < CACHE_TTL) {
    return licenseStatusCache
  }

  try {
    const { AppDataSource } = await import('../config/database')
    const result = await AppDataSource.query(
      `SELECT expires_at, status FROM system_license WHERE status = 'active' LIMIT 1`
    ).catch(() => [])

    if (!result || result.length === 0) {
      // 没有授权信息（开发模式），不限制
      const status = { expired: false, expiresAt: null, daysUntilExpiry: null }
      licenseStatusCache = { ...status, timestamp: Date.now() }
      return status
    }

    const license = result[0]
    const expiresAt = license.expires_at ? new Date(license.expires_at).toISOString() : null
    let expired = false
    let daysUntilExpiry: number | null = null

    if (expiresAt) {
      const expireDate = new Date(expiresAt)
      const now = new Date()
      expired = expireDate < now
      daysUntilExpiry = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    const status = { expired, expiresAt, daysUntilExpiry }
    licenseStatusCache = { ...status, timestamp: Date.now() }
    return status
  } catch (error) {
    log.error('[CheckLicenseWrite] 获取授权状态失败:', error)
    // 出错时不限制
    return { expired: false, expiresAt: null, daysUntilExpiry: null }
  }
}

/**
 * 清除授权状态缓存（在续费/激活后调用）
 */
export function clearLicenseWriteCache(tenantId?: string): void {
  licenseStatusCache = null
  if (tenantId) {
    tenantExpireCache.delete(tenantId)
  } else {
    tenantExpireCache.clear()
  }
}

/**
 * 获取 SaaS 租户过期状态（带缓存）
 */
async function getTenantExpireStatus(tenantId: string): Promise<{
  expired: boolean
  expiresAt: string | null
  daysUntilExpiry: number | null
}> {
  // 检查缓存
  const cached = tenantExpireCache.get(tenantId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached
  }

  try {
    const { AppDataSource } = await import('../config/database')
    const rows = await AppDataSource.query(
      `SELECT expire_date, license_status, status FROM tenants WHERE id = ? LIMIT 1`,
      [tenantId]
    ).catch(() => [])

    if (!rows || rows.length === 0) {
      // 租户不存在，不限制（容错）
      const status = { expired: false, expiresAt: null, daysUntilExpiry: null }
      tenantExpireCache.set(tenantId, { ...status, timestamp: Date.now() })
      return status
    }

    const tenant = rows[0]
    const expiresAt = tenant.expire_date ? new Date(tenant.expire_date).toISOString() : null
    let expired = false
    let daysUntilExpiry: number | null = null

    if (expiresAt) {
      const expireDate = new Date(expiresAt)
      const now = new Date()
      expired = expireDate < now
      daysUntilExpiry = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    const status = { expired, expiresAt, daysUntilExpiry }
    tenantExpireCache.set(tenantId, { ...status, timestamp: Date.now() })
    return status
  } catch (error) {
    log.error('[CheckLicenseWrite] 获取租户过期状态失败:', error)
    return { expired: false, expiresAt: null, daysUntilExpiry: null }
  }
}

/**
 * 授权过期写入限制中间件（私有部署 + SaaS 通用）
 */
export const checkLicenseWrite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 只检查写入操作（POST/PUT/DELETE/PATCH）
    const method = req.method.toUpperCase()
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next()
    }

    // 跳过不需要检查的路径
    if (shouldSkipPath(req.path)) {
      return next()
    }

    if (deployConfig.isSaaS()) {
      // ===== SaaS 模式：从请求中获取 tenantId，检查租户到期状态 =====
      // 注意：此中间件作为全局中间件在 authenticateToken 之前执行，
      // 所以需要自行从 JWT 中提取 tenantId
      let tenantId = (req as any).tenantId
      if (!tenantId) {
        try {
          const token = req.headers.authorization?.replace('Bearer ', '')
          if (token) {
            const decoded = jwt.verify(token, JwtConfig.getAccessTokenSecret()) as any
            tenantId = decoded?.tenantId
          }
        } catch {
          // JWT 无效或过期，放行（由 authenticateToken 处理认证）
        }
      }
      if (!tenantId) {
        // 未登录或无租户信息，放行（由其他中间件处理认证）
        return next()
      }

      const tenantStatus = await getTenantExpireStatus(tenantId)

      if (tenantStatus.expired) {
        log.warn(`[CheckLicenseWrite] 租户 ${tenantId} 授权已过期，阻止写入操作: ${method} ${req.path}`)
        return res.status(403).json({
          success: false,
          message: '企业套餐已过期，无法执行写入操作（新增/修改/删除）。请前往会员中心续费后恢复使用。',
          code: 'LICENSE_EXPIRED_WRITE_BLOCKED',
          data: {
            expiresAt: tenantStatus.expiresAt,
            action: '续费后自动恢复',
            readOnly: true
          }
        })
      }

      // 即将到期预警（响应头）
      if (tenantStatus.daysUntilExpiry !== null && tenantStatus.daysUntilExpiry <= 30 && tenantStatus.daysUntilExpiry > 0) {
        res.setHeader('X-License-Warning', 'true')
        res.setHeader('X-License-Days-Remaining', `${tenantStatus.daysUntilExpiry}`)
        const expiresAtStr = tenantStatus.expiresAt ? new Date(tenantStatus.expiresAt).toISOString() : ''
        res.setHeader('X-License-Expires-At', expiresAtStr)
      }
    } else {
      // ===== 私有部署模式：检查 system_license 表 =====
      const status = await getLicenseStatus()

      if (status.expired) {
        log.warn(`[CheckLicenseWrite] 授权已过期，阻止写入操作: ${method} ${req.path}`)
        return res.status(403).json({
          success: false,
          message: '系统授权已过期，无法执行写入操作（新增/修改/删除）。请联系管理员续费后恢复使用。',
          code: 'LICENSE_EXPIRED_WRITE_BLOCKED',
          data: {
            expiresAt: status.expiresAt,
            action: '续费后自动恢复',
            readOnly: true
          }
        })
      }

      // 即将到期预警（响应头）
      if (status.daysUntilExpiry !== null && status.daysUntilExpiry <= 30 && status.daysUntilExpiry > 0) {
        res.setHeader('X-License-Warning', 'true')
        res.setHeader('X-License-Days-Remaining', `${status.daysUntilExpiry}`)
        const expiresAtStr = status.expiresAt ? new Date(status.expiresAt).toISOString() : ''
        res.setHeader('X-License-Expires-At', expiresAtStr)
      }
    }

    next()
  } catch (error) {
    log.error('[CheckLicenseWrite] 中间件执行失败:', error)
    // 出错时放行，避免阻塞正常使用
    next()
  }
}

export default checkLicenseWrite

