/**
 * 租户资源限制检查中间件
 *
 * 功能：
 * 1. 检查租户用户数限制（创建用户时）
 * 2. 检查租户存储空间限制（上传文件时）
 * 3. 返回友好的错误提示
 *
 * 使用方式：
 * router.post('/api/users', tenantAuth, checkUserLimit, createUser)
 * router.post('/api/upload', tenantAuth, checkStorageLimit, uploadFile)
 */

import { Response, NextFunction } from 'express'
import { TenantRequest } from './tenantAuth'
import { deployConfig } from '../config/deploy'
import { AppDataSource } from '../config/database'
import { Tenant } from '../entities/Tenant'
import { User } from '../entities/User'
import licenseService from '../services/LicenseService'
import { onlineSeatService } from '../services/OnlineSeatService'

import { log } from '../config/logger';
/**
 * 检查租户用户数限制
 * 在创建用户前调用
 */
export const checkUserLimit = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 私有部署模式：通过 LicenseService 检查用户数限制
    if (!deployConfig.isSaaS()) {
      const result = await licenseService.canCreateUser()
      if (!result.canCreate) {
        return res.status(403).json({
          success: false,
          message: result.message || `用户数已达上限（${result.currentUsers}/${result.maxUsers}）`,
          code: 'USER_LIMIT_EXCEEDED',
          data: {
            currentCount: result.currentUsers,
            maxUsers: result.maxUsers,
            usagePercent: result.maxUsers > 0 ? Math.round((result.currentUsers / result.maxUsers) * 100) : 0
          }
        })
      }
      next()
      return
    }

    // 获取租户ID
    const tenantId = req.tenantId
    if (!tenantId) {
      return res.status(403).json({
        success: false,
        message: '租户信息缺失'
      })
    }

    // 查询租户信息
    const tenantRepository = AppDataSource.getRepository(Tenant)
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: '租户不存在'
      })
    }

    // 查询当前用户数
    const userRepository = AppDataSource.getRepository(User)
    const currentUserCount = await userRepository.count({
      where: { tenantId }
    })

    // 🔥 在线席位模式：注册用户不限制（席位在登录时检查），但仍可配置max_users作为软上限
    if (tenant.userLimitMode === 'online') {
      // 在线席位模式下，max_users作为最大注册用户数的软上限
      // 如果max_users为0或很大的值，则不限制注册用户数
      if (tenant.maxUsers > 0 && currentUserCount >= tenant.maxUsers) {
        return res.status(403).json({
          success: false,
          message: `注册用户数已达上限（${currentUserCount}/${tenant.maxUsers}），当前为在线席位模式，请联系管理员调整`,
          code: 'USER_LIMIT_EXCEEDED',
          data: {
            currentCount: currentUserCount,
            maxUsers: tenant.maxUsers,
            userLimitMode: 'online',
            usagePercent: Math.round((currentUserCount / tenant.maxUsers) * 100)
          }
        })
      }
      // 将当前用户数注入到请求对象
      req.tenantInfo = { ...req.tenantInfo, currentUserCount }
      next()
      return
    }

    // 总用户数模式：检查是否超过限制
    if (currentUserCount >= tenant.maxUsers) {
      return res.status(403).json({
        success: false,
        message: `用户数已达上限，当前 ${currentUserCount}/${tenant.maxUsers} 个用户`,
        code: 'USER_LIMIT_EXCEEDED',
        data: {
          currentCount: currentUserCount,
          maxUsers: tenant.maxUsers,
          userLimitMode: 'total',
          usagePercent: Math.round((currentUserCount / tenant.maxUsers) * 100)
        }
      })
    }

    // 检查是否接近限制（90%以上）
    const usagePercent = (currentUserCount / tenant.maxUsers) * 100
    if (usagePercent >= 90) {
      log.warn(`[租户资源警告] 租户 ${tenant.name}(${tenantId}) 用户数接近上限: ${currentUserCount}/${tenant.maxUsers}`)
    }

    // 将当前用户数注入到请求对象，供后续使用
    req.tenantInfo = {
      ...req.tenantInfo,
      currentUserCount
    }

    next()
  } catch (error) {
    log.error('检查租户用户数限制失败:', error)
    return res.status(500).json({
      success: false,
      message: '检查用户数限制失败'
    })
  }
}

/**
 * 检查租户存储空间限制
 * 在上传文件前调用
 */
export const checkStorageLimit = async (
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

    // 获取租户ID
    const tenantId = req.tenantId
    if (!tenantId) {
      return res.status(403).json({
        success: false,
        message: '租户信息缺失'
      })
    }

    // 查询租户信息
    const tenantRepository = AppDataSource.getRepository(Tenant)
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: '租户不存在'
      })
    }

    // 获取文件大小（从请求头或请求体）
    let fileSizeMb = 0

    // 方式1: 从Content-Length头获取
    const contentLength = req.headers['content-length']
    if (contentLength) {
      fileSizeMb = parseInt(contentLength) / (1024 * 1024)
    }

    // 方式2: 从multer上传的文件获取（如果已经上传）
    if (req.file && req.file.size) {
      fileSizeMb = req.file.size / (1024 * 1024)
    }

    // 方式3: 从多文件上传获取
    if (req.files && Array.isArray(req.files)) {
      const totalSize = req.files.reduce((sum, file) => sum + file.size, 0)
      fileSizeMb = totalSize / (1024 * 1024)
    }

    // 如果无法获取文件大小，跳过检查（在文件上传后再检查）
    if (fileSizeMb === 0) {
      next()
      return
    }

    // 计算最大存储空间（MB）
    const maxStorageMb = tenant.maxStorageGb * 1024
    const usedStorageMb = tenant.usedStorageMb || 0
    const availableStorageMb = maxStorageMb - usedStorageMb

    // 检查是否超过限制
    if (fileSizeMb > availableStorageMb) {
      return res.status(403).json({
        success: false,
        message: `存储空间不足，需要 ${fileSizeMb.toFixed(2)}MB，剩余 ${availableStorageMb.toFixed(2)}MB`,
        code: 'STORAGE_LIMIT_EXCEEDED',
        data: {
          requiredMb: parseFloat(fileSizeMb.toFixed(2)),
          usedMb: parseFloat(usedStorageMb.toFixed(2)),
          maxMb: maxStorageMb,
          availableMb: parseFloat(availableStorageMb.toFixed(2)),
          usagePercent: Math.round((usedStorageMb / maxStorageMb) * 100)
        }
      })
    }

    // 检查是否接近限制（90%以上）
    const newUsedStorageMb = usedStorageMb + fileSizeMb
    const usagePercent = (newUsedStorageMb / maxStorageMb) * 100
    if (usagePercent >= 90) {
      log.warn(`[租户资源警告] 租户 ${tenant.name}(${tenantId}) 存储空间接近上限: ${newUsedStorageMb.toFixed(2)}MB/${maxStorageMb}MB`)
    }

    // 将文件大小注入到请求对象，供后续更新使用
    req.tenantInfo = {
      ...req.tenantInfo,
      uploadFileSizeMb: fileSizeMb
    }

    next()
  } catch (error) {
    log.error('检查租户存储空间限制失败:', error)
    return res.status(500).json({
      success: false,
      message: '检查存储空间限制失败'
    })
  }
}

/**
 * 更新租户用户数统计
 * 在成功创建用户后调用
 */
export const updateTenantUserCount = async (
  tenantId: string,
  increment: number = 1
): Promise<void> => {
  try {
    const tenantRepository = AppDataSource.getRepository(Tenant)
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (tenant) {
      tenant.userCount = (tenant.userCount || 0) + increment
      await tenantRepository.save(tenant)
      log.info(`[租户资源] 更新租户 ${tenant.name}(${tenantId}) 用户数: ${tenant.userCount}`)
    }
  } catch (error) {
    log.error('更新租户用户数失败:', error)
  }
}

/**
 * 更新租户存储空间统计
 * 在成功上传文件后调用
 */
export const updateTenantStorage = async (
  tenantId: string,
  fileSizeMb: number
): Promise<void> => {
  try {
    const tenantRepository = AppDataSource.getRepository(Tenant)
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (tenant) {
      tenant.usedStorageMb = Number(tenant.usedStorageMb || 0) + fileSizeMb
      await tenantRepository.save(tenant)
      log.info(`[租户资源] 更新租户 ${tenant.name}(${tenantId}) 存储空间: ${Number(tenant.usedStorageMb).toFixed(2)}MB`)
    }
  } catch (error) {
    log.error('更新租户存储空间失败:', error)
  }
}

/**
 * 减少租户用户数统计
 * 在删除用户后调用
 */
export const decrementTenantUserCount = async (
  tenantId: string,
  decrement: number = 1
): Promise<void> => {
  try {
    const tenantRepository = AppDataSource.getRepository(Tenant)
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (tenant) {
      tenant.userCount = Math.max(0, (tenant.userCount || 0) - decrement)
      await tenantRepository.save(tenant)
      log.info(`[租户资源] 更新租户 ${tenant.name}(${tenantId}) 用户数: ${tenant.userCount}`)
    }
  } catch (error) {
    log.error('减少租户用户数失败:', error)
  }
}

/**
 * 减少租户存储空间统计
 * 在删除文件后调用
 */
export const decrementTenantStorage = async (
  tenantId: string,
  fileSizeMb: number
): Promise<void> => {
  try {
    const tenantRepository = AppDataSource.getRepository(Tenant)
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (tenant) {
      tenant.usedStorageMb = Math.max(0, Number(tenant.usedStorageMb || 0) - fileSizeMb)
      await tenantRepository.save(tenant)
      log.info(`[租户资源] 更新租户 ${tenant.name}(${tenantId}) 存储空间: ${Number(tenant.usedStorageMb).toFixed(2)}MB`)
    }
  } catch (error) {
    log.error('减少租户存储空间失败:', error)
  }
}

/**
 * 获取租户资源使用情况
 * 用于仪表盘展示
 */
export const getTenantResourceUsage = async (tenantId: string) => {
  try {
    const tenantRepository = AppDataSource.getRepository(Tenant)
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (!tenant) {
      return null
    }

    // 查询实际用户数
    const userRepository = AppDataSource.getRepository(User)
    const actualUserCount = await userRepository.count({
      where: { tenantId }
    })

    // 🔥 动态计算存储空间使用量
    let usedStorageMb = tenant.usedStorageMb || 0
    try {
      const storageResult = await AppDataSource.query(
        `SELECT COALESCE(SUM(
          CASE WHEN file_size IS NOT NULL THEN file_size ELSE 0 END
        ), 0) as total_bytes FROM (
          SELECT file_size FROM customer_files WHERE tenant_id = ?
          UNION ALL
          SELECT file_size FROM order_attachments WHERE tenant_id = ?
          UNION ALL
          SELECT file_size FROM after_sale_attachments WHERE tenant_id = ?
        ) as all_files`,
        [tenantId, tenantId, tenantId]
      )
      const totalBytes = Number(storageResult[0]?.total_bytes || 0)
      const calculatedMb = totalBytes / (1024 * 1024)
      if (calculatedMb > 0) {
        usedStorageMb = Number(calculatedMb.toFixed(2))
      }
    } catch {
      // 存储计算失败使用数据库记录值
    }

    // 计算使用率
    const maxStorageMb = tenant.maxStorageGb * 1024
    const userUsagePercent = tenant.maxUsers > 0 ? Math.round((actualUserCount / tenant.maxUsers) * 100) : 0
    const storageUsagePercent = maxStorageMb > 0 ? Math.round((usedStorageMb / maxStorageMb) * 100) : 0

    // 🔥 在线席位模式：获取实时在线席位统计
    let onlineSeats: {
      mode: string
      maxSeats: number
      onlineCount: number
      usagePercent: number
      extraSeats: number
    } | null = null

    const userLimitMode = tenant.userLimitMode || 'total'

    if (userLimitMode === 'online') {
      try {
        const seatStats = await onlineSeatService.getTenantSeatStats(tenantId)
        onlineSeats = {
          mode: seatStats.mode,
          maxSeats: seatStats.maxSeats,
          onlineCount: seatStats.onlineCount,
          usagePercent: seatStats.maxSeats > 0 ? Math.round((seatStats.onlineCount / seatStats.maxSeats) * 100) : 0,
          extraSeats: tenant.extraOnlineSeats || 0
        }
      } catch (e) {
        log.warn('[getTenantResourceUsage] 获取在线席位统计失败:', e)
      }
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      userLimitMode,
      users: {
        current: actualUserCount,
        max: tenant.maxUsers,
        usagePercent: userUsagePercent,
        available: Math.max(0, tenant.maxUsers - actualUserCount)
      },
      onlineSeats,
      storage: {
        usedMb: usedStorageMb,
        usedGb: (usedStorageMb / 1024).toFixed(2),
        maxGb: tenant.maxStorageGb,
        maxMb: maxStorageMb,
        usagePercent: storageUsagePercent,
        availableMb: Math.max(0, maxStorageMb - usedStorageMb),
        availableGb: (Math.max(0, maxStorageMb - usedStorageMb) / 1024).toFixed(2)
      }
    }
  } catch (error) {
    log.error('获取租户资源使用情况失败:', error)
    return null
  }
}
