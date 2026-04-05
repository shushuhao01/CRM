/**
 * 私有部署授权过期写入限制中间件
 *
 * 功能：
 * 1. 仅在私有部署模式下生效
 * 2. 授权过期时，允许登录和读取（GET），但禁止写入操作（POST/PUT/DELETE/PATCH）
 * 3. 续费后自动恢复写入权限
 * 4. 提供即将到期预警信息（响应头）
 *
 * 使用方式：在 app.ts 中作为全局中间件，放在路由注册之前
 */

import { Request, Response, NextFunction } from 'express'
import { deployConfig } from '../config/deploy'
import { log } from '../config/logger'

// 缓存授权状态，避免每次请求都查数据库
let licenseStatusCache: {
  expired: boolean
  expiresAt: string | null
  daysUntilExpiry: number | null
  timestamp: number
} | null = null

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
    const expiresAt = license.expires_at
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
export function clearLicenseWriteCache(): void {
  licenseStatusCache = null
}

/**
 * 私有部署授权过期写入限制中间件
 */
export const checkLicenseWrite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 仅在私有部署模式下生效
    if (deployConfig.isSaaS()) {
      return next()
    }

    // 只检查写入操作（POST/PUT/DELETE/PATCH）
    const method = req.method.toUpperCase()
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next()
    }

    // 跳过不需要检查的路径
    if (shouldSkipPath(req.path)) {
      return next()
    }

    // 获取授权状态
    const status = await getLicenseStatus()

    // 如果授权已过期，阻止写入操作
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

    // 如果即将到期（30天内），在响应头中添加预警信息
    if (status.daysUntilExpiry !== null && status.daysUntilExpiry <= 30 && status.daysUntilExpiry > 0) {
      res.setHeader('X-License-Warning', `true`)
      res.setHeader('X-License-Days-Remaining', `${status.daysUntilExpiry}`)
      res.setHeader('X-License-Expires-At', status.expiresAt || '')
    }

    next()
  } catch (error) {
    log.error('[CheckLicenseWrite] 中间件执行失败:', error)
    // 出错时放行，避免阻塞正常使用
    next()
  }
}

export default checkLicenseWrite

