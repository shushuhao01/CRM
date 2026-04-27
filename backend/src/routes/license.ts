/**
 * License Routes - CRM系统授权管理
 * 同时支持私有部署和SaaS租户
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { clearLicenseWriteCache } from '../middleware/checkLicenseWrite'
import { formatDateTime } from '../utils/dateFormat'
import { optionalAuth } from '../middleware/auth'
import { getCentralAdminApiUrl } from '../config/centralServer'

import { log } from '../config/logger';
const router = Router()

/**
 * 辅助：计算过期天数和是否即将到期
 */
function calcExpiry(expiresAt: string | Date | null) {
  if (!expiresAt) return { isExpired: false, nearExpiry: false, daysUntilExpiry: null as number | null }
  const expireDate = new Date(expiresAt)
  const isExpired = expireDate < new Date()
  const daysUntilExpiry = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const nearExpiry = !isExpired && daysUntilExpiry <= 30
  return { isExpired, nearExpiry, daysUntilExpiry }
}

// 检查系统激活状态（使用 optionalAuth 以识别 SaaS 租户）
router.get('/status', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId

    // ========== SaaS租户：从 tenants 表读取 ==========
    if (tenantId) {
      const tenantRows = await AppDataSource.query(
        `SELECT t.*, p.name as package_name, p.features as package_features, p.code as package_code
         FROM tenants t LEFT JOIN tenant_packages p ON t.package_id = p.id
         WHERE t.id = ?`,
        [tenantId]
      ).catch(() => [])
      const tenant = tenantRows[0]

      if (tenant && tenant.license_status !== 'pending') {
        const { isExpired, nearExpiry, daysUntilExpiry } = calcExpiry(tenant.expire_date)
        return res.json({
          success: true,
          data: {
            activated: true,
            expired: isExpired,
            nearExpiry,
            daysUntilExpiry,
            licenseType: tenant.license_key?.startsWith('PRIVATE-') ? 'private' : 'saas',
            deployType: tenant.license_key?.startsWith('PRIVATE-') ? 'private' : 'saas',
            maxUsers: tenant.max_users,
            customerName: tenant.name,
            expiresAt: tenant.expire_date,
            features: tenant.features ? (typeof tenant.features === 'string' ? JSON.parse(tenant.features) : tenant.features) : null
          }
        })
      }
    }

    // ========== 私有部署：从 system_license 表读取 ==========
    const result = await AppDataSource.query(
      `SELECT * FROM system_license WHERE status = 'active' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const license = result[0]
      const { isExpired, nearExpiry, daysUntilExpiry } = calcExpiry(license.expires_at)

      res.json({
        success: true,
        data: {
          activated: true,
          expired: isExpired,
          nearExpiry,
          daysUntilExpiry,
          licenseType: license.license_type,
          deployType: 'private',
          maxUsers: license.max_users,
          customerName: license.customer_name,
          expiresAt: license.expires_at,
          features: license.features ? JSON.parse(license.features) : null
        }
      })
    } else {
      res.json({
        success: true,
        data: {
          activated: false,
          expired: false
        }
      })
    }
  } catch (error) {
    log.error('检查授权状态失败:', error)
    res.json({
      success: true,
      data: { activated: false, expired: false }
    })
  }
})

// 激活系统（公开接口）
router.post('/activate', async (req: Request, res: Response) => {
  try {
    const { licenseKey } = req.body

    if (!licenseKey) {
      return res.status(400).json({ success: false, message: '请输入授权码' })
    }

    // 如果是 TENANT- 前缀的SaaS租户授权码，转发到租户验证逻辑
    if (licenseKey.toUpperCase().startsWith('TENANT-') || licenseKey.toUpperCase().startsWith('LIC-')) {
      try {
        const tenantRows = await AppDataSource.query(
          `SELECT t.*, p.name as package_name, p.features as package_features
           FROM tenants t LEFT JOIN tenant_packages p ON t.package_id = p.id
           WHERE t.license_key = ?`,
          [licenseKey]
        )
        const tenant = tenantRows[0]
        if (!tenant) {
          return res.status(404).json({ success: false, message: '授权码无效或不存在，请检查后重试' })
        }
        if (tenant.status === 'disabled') {
          return res.status(403).json({ success: false, message: '该租户已被禁用，请联系管理员' })
        }

        const isExpired = tenant.expire_date && new Date(tenant.expire_date) < new Date()
        // 更新验证时间
        await AppDataSource.query(`UPDATE tenants SET last_verify_at = NOW() WHERE id = ?`, [tenant.id]).catch(() => {})

        return res.json({
          success: true,
          message: isExpired ? '授权已过期，请联系管理员续费' : '授权码验证成功',
          data: {
            customerName: tenant.name,
            licenseType: 'saas',
            deployType: 'saas',
            maxUsers: tenant.max_users,
            expiresAt: tenant.expire_date,
            tenantId: tenant.id,
            tenantCode: tenant.code,
            packageName: tenant.package_name,
            expired: !!isExpired
          }
        })
      } catch (tenantErr: any) {
        log.error('租户授权码验证失败:', tenantErr)
        return res.status(500).json({ success: false, message: '授权码验证失败，请稍后重试' })
      }
    }

    // 获取机器码（简单实现，使用服务器信息）
    const os = await import('os')
    const machineId = `${os.hostname()}-${os.platform()}-${os.arch()}`

    // 调用平台管理后台验证授权码
    const adminApiUrl = getCentralAdminApiUrl()

    let verifyResult
    try {
      const response = await fetch(`${adminApiUrl}/verify/license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, machineId })
      })
      verifyResult = await response.json()
    } catch (_fetchError) {
      // 如果无法连接平台，尝试本地验证（适用于离线部署）
      log.info('无法连接平台管理后台，尝试本地验证')
      verifyResult = await localVerifyLicense(licenseKey, machineId)
    }

    if (!verifyResult.success) {
      return res.status(400).json({ success: false, message: verifyResult.message || '授权码验证失败' })
    }

    const licenseData = verifyResult.data

    // 保存授权信息到本地数据库
    await ensureLicenseTable()

    const now = formatDateTime(new Date())

    // 🔒 保留旧记录中的安全标记（凭据是否已展示过）
    const oldLicense = await AppDataSource.query(
      `SELECT admin_credentials_shown FROM system_license LIMIT 1`
    ).catch(() => [])
    const wasCredentialsShown = (oldLicense && oldLicense.length > 0 && oldLicense[0].admin_credentials_shown === 1) ? 1 : 0

    // 先删除旧的授权记录
    await AppDataSource.query(`DELETE FROM system_license`)

    // 插入新的授权记录（保留凭据展示标记）
    await AppDataSource.query(
      `INSERT INTO system_license (id, license_key, customer_name, license_type, max_users, features, expires_at, status, activated_at, machine_id, admin_credentials_shown, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        licenseKey,
        licenseData.customerName || '',
        licenseData.licenseType || 'perpetual',
        licenseData.maxUsers || 50,
        JSON.stringify(licenseData.features || {}),
        licenseData.expiresAt || null,
        now,
        machineId,
        wasCredentialsShown,
        now,
        now
      ]
    )

    // 检查是否需要创建默认管理员
    // 清除授权过期检查的缓存，使续费/激活立即生效
    clearLicenseWriteCache()

    const adminExists = await AppDataSource.query(
      `SELECT id FROM users WHERE role = 'super_admin' OR role_id IN (SELECT id FROM roles WHERE code = 'super_admin') LIMIT 1`
    ).catch(() => [])

    // 🔒 安全标记：检查是否已经展示过管理员凭据（防止任何情况下的二次泄露）
    const credentialsShownFlag = await AppDataSource.query(
      `SELECT id FROM system_license WHERE admin_credentials_shown = 1 LIMIT 1`
    ).catch(() => [])
    const alreadyShownCredentials = credentialsShownFlag && credentialsShownFlag.length > 0

    let defaultAdmin = null
    let isFirstActivation = false

    if (!adminExists || adminExists.length === 0) {
      // 🔥 首次激活：管理员不存在，创建默认管理员并返回凭据（仅此一次）
      isFirstActivation = true

      const adminPhone = licenseData.customerPhone || null
      const adminUsername = adminPhone || 'admin'
      const defaultPassword = 'Aa123456'
      const hashedPassword = await bcrypt.hash(defaultPassword, 10)
      const adminId = uuidv4()

      // 获取或创建超级管理员角色
      let roleId = ''
      const roleResult = await AppDataSource.query(
        `SELECT id FROM roles WHERE code = 'super_admin' LIMIT 1`
      ).catch(() => [])

      if (roleResult && roleResult.length > 0) {
        roleId = roleResult[0].id
      } else {
        roleId = uuidv4()
        await AppDataSource.query(
          `INSERT INTO roles (id, name, code, description, level, is_system, status, created_at, updated_at)
           VALUES (?, '系统管理员', 'super_admin', '系统超级管理员', 100, 1, 'active', ?, ?)`,
          [roleId, now, now]
        )
      }

      await AppDataSource.query(
        `INSERT INTO users (id, username, password, name, phone, role, role_id, status, created_at, updated_at)
         VALUES (?, ?, ?, '系统管理员', ?, 'super_admin', ?, 'active', ?, ?)`,
        [adminId, adminUsername, hashedPassword, adminPhone, roleId, now, now]
      )

      // 🔒 仅当凭据未曾展示过时才返回明文密码（双重保险）
      if (!alreadyShownCredentials) {
        defaultAdmin = {
          username: adminUsername,
          password: defaultPassword,
          isPhoneAccount: !!adminPhone,
          phone: adminPhone
        }

        // 标记凭据已展示，后续永不再返回
        await AppDataSource.query(
          `UPDATE system_license SET admin_credentials_shown = 1 WHERE status = 'active'`
        ).catch(() => {})
      }
    }

    res.json({
      success: true,
      message: isFirstActivation ? '系统首次激活成功' : '系统激活成功',
      data: {
        customerName: licenseData.customerName,
        licenseType: licenseData.licenseType,
        maxUsers: licenseData.maxUsers,
        expiresAt: licenseData.expiresAt,
        isFirstActivation,
        defaultAdmin
      }
    })
  } catch (error: any) {
    log.error('系统激活失败:', error)
    res.status(500).json({ success: false, message: '系统激活失败: ' + error.message })
  }
})

// 获取授权详情（使用 optionalAuth 以识别 SaaS 租户）
router.get('/info', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId

    // ========== SaaS租户：从 tenants 表读取详情 ==========
    if (tenantId) {
      const tenantRows = await AppDataSource.query(
        `SELECT t.*, p.name as package_name, p.features as package_features, p.code as package_code,
                p.user_limit_mode as pkg_user_limit_mode, p.max_online_seats as pkg_max_online_seats
         FROM tenants t LEFT JOIN tenant_packages p ON t.package_id = p.id
         WHERE t.id = ?`,
        [tenantId]
      ).catch(() => [])
      const tenant = tenantRows[0]

      if (tenant) {
        // 统计当前租户用户数
        const userCountResult = await AppDataSource.query(
          `SELECT COUNT(*) as count FROM users WHERE status = 'active' AND tenant_id = ?`,
          [tenantId]
        ).catch(() => [{ count: 0 }])
        const currentUsers = Number(userCountResult[0]?.count) || 0

        const userLimitMode = tenant.user_limit_mode || 'total'
        const maxOnlineSeats = (tenant.max_online_seats || 0) + (tenant.extra_online_seats || 0)
        const totalMaxUsers = (tenant.max_users || 10) + (tenant.extra_users || 0)
        const totalMaxStorageGb = (tenant.max_storage_gb || 5) + (tenant.extra_storage_gb || 0)

        // 在线席位统计
        let onlineCount = 0
        if (userLimitMode === 'online' || userLimitMode === 'both') {
          const onlineResult = await AppDataSource.query(
            `SELECT COUNT(*) as count FROM users WHERE status = 'active' AND tenant_id = ? AND last_active_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
            [tenantId]
          ).catch(() => [{ count: 0 }])
          onlineCount = Number(onlineResult[0]?.count) || 0
        }

        // 解析 features
        let features = null
        try {
          features = tenant.features ? (typeof tenant.features === 'string' ? JSON.parse(tenant.features) : tenant.features) : null
        } catch { features = null }

        let packageFeatures = null
        try {
          packageFeatures = tenant.package_features ? (typeof tenant.package_features === 'string' ? JSON.parse(tenant.package_features) : tenant.package_features) : null
        } catch { packageFeatures = null }

        return res.json({
          success: true,
          data: {
            licenseKey: tenant.license_key ? (tenant.license_key.substring(0, 12) + '****') : '',
            fullLicenseKey: tenant.license_key || '',
            customerName: tenant.name,
            tenantId: tenant.id,
            tenantCode: tenant.code,
            deployType: tenant.license_key?.startsWith('PRIVATE-') ? 'private' : 'saas',
            licenseType: tenant.license_key?.startsWith('PRIVATE-') ? 'private' : 'saas',
            packageName: tenant.package_name || (tenant.license_key?.startsWith('PRIVATE-') ? '私有部署版' : '标准版'),
            packageCode: tenant.package_code || null,
            maxUsers: totalMaxUsers,
            currentUsers,
            remainingUsers: Math.max(0, totalMaxUsers - currentUsers),
            userLimitMode,
            maxOnlineSeats,
            onlineCount,
            maxStorageGb: totalMaxStorageGb,
            usedStorageMb: Number(tenant.used_storage_mb) || 0,
            features,
            packageFeatures,
            expiresAt: tenant.expire_date,
            activatedAt: tenant.activated_at,
            lastVerifyAt: tenant.last_verify_at,
            status: tenant.license_status || tenant.status,
            contact: tenant.contact,
            phone: tenant.phone,
            email: tenant.email
          }
        })
      }
    }

    // ========== 私有部署：从 system_license 表读取 ==========
    const result = await AppDataSource.query(
      `SELECT * FROM system_license WHERE status = 'active' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const license = result[0]

      // 获取当前用户数（私有部署只统计 tenant_id IS NULL 的用户）
      const userCountResult = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM users WHERE status = 'active' AND tenant_id IS NULL`
      ).catch(() => [{ count: 0 }])
      const currentUsers = Number(userCountResult[0]?.count) || 0

      // 用户限制模式和在线席位信息
      const userLimitMode = license.user_limit_mode || 'total'
      const maxOnlineSeats = license.max_online_seats || 0

      // 在线席位模式：统计当前在线人数（30分钟内有活动的用户）
      let onlineCount = 0
      if (userLimitMode === 'online') {
        const onlineResult = await AppDataSource.query(
          `SELECT COUNT(*) as count FROM users WHERE status = 'active' AND tenant_id IS NULL AND last_active_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
        ).catch(() => [{ count: 0 }])
        onlineCount = Number(onlineResult[0]?.count) || 0
      }

      // 尝试查对应的 tenants 记录获取额外信息
      let tenantInfo: any = null
      if (license.license_key) {
        const tenantRows = await AppDataSource.query(
          `SELECT id, code, name, activated_at, last_verify_at, max_storage_gb, extra_storage_gb, used_storage_mb FROM tenants WHERE license_key = ? LIMIT 1`,
          [license.license_key]
        ).catch(() => [])
        tenantInfo = tenantRows?.[0] || null
      }

      res.json({
        success: true,
        data: {
          licenseKey: license.license_key ? license.license_key.substring(0, 12) + '****' : '',
          fullLicenseKey: license.license_key || '',
          customerName: license.customer_name,
          tenantId: tenantInfo?.id || null,
          tenantCode: tenantInfo?.code || null,
          deployType: 'private',
          licenseType: license.license_type,
          packageName: '私有部署版',
          maxUsers: license.max_users,
          currentUsers,
          remainingUsers: Math.max(0, (license.max_users || 50) - currentUsers),
          userLimitMode,
          maxOnlineSeats,
          onlineCount,
          maxStorageGb: tenantInfo ? ((tenantInfo.max_storage_gb || 5) + (tenantInfo.extra_storage_gb || 0)) : null,
          usedStorageMb: tenantInfo ? (Number(tenantInfo.used_storage_mb) || 0) : null,
          features: license.features ? JSON.parse(license.features) : null,
          expiresAt: license.expires_at,
          activatedAt: license.activated_at || tenantInfo?.activated_at,
          lastVerifyAt: tenantInfo?.last_verify_at || null,
          status: license.status
        }
      })
    } else {
      res.json({
        success: true,
        data: null
      })
    }
  } catch (error) {
    log.error('获取授权信息失败:', error)
    res.status(500).json({ success: false, message: '获取授权信息失败' })
  }
})

// 手动同步授权信息（从管理后台获取最新配置）
router.post('/sync', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId

    // ========== SaaS租户同步：从 tenants 表刷新 + 尝试远程同步 ==========
    if (tenantId) {
      // 读取当前租户信息
      const tenantRows = await AppDataSource.query(
        `SELECT t.*, p.name as package_name FROM tenants t LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE t.id = ?`,
        [tenantId]
      ).catch(() => [])
      const tenant = tenantRows[0]

      if (!tenant) {
        return res.json({ success: true, data: { synced: false, activated: false, message: '租户信息不存在' } })
      }

      // 尝试远程同步（从管理后台获取最新租户信息）
      let remoteSynced = false
      try {
        const adminApiUrl = getCentralAdminApiUrl()
        const response = await fetch(`${adminApiUrl}/verify/tenant-license`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: tenant.id, licenseKey: tenant.license_key }),
          signal: AbortSignal.timeout(8000)
        })
        const result = await response.json() as any

        if (result.success && result.data) {
          // 远程返回了最新数据，更新本地 tenants 表
          const updates: string[] = ['last_verify_at = NOW()']
          const values: any[] = []

          if (result.data.maxUsers != null) { updates.push('max_users = ?'); values.push(result.data.maxUsers) }
          if (result.data.expireDate !== undefined) { updates.push('expire_date = ?'); values.push(result.data.expireDate) }
          if (result.data.maxStorageGb != null) { updates.push('max_storage_gb = ?'); values.push(result.data.maxStorageGb) }
          if (result.data.features !== undefined) {
            updates.push('features = ?')
            values.push(typeof result.data.features === 'string' ? result.data.features : JSON.stringify(result.data.features))
          }
          if (result.data.userLimitMode) { updates.push('user_limit_mode = ?'); values.push(result.data.userLimitMode) }
          if (result.data.maxOnlineSeats != null) { updates.push('max_online_seats = ?'); values.push(result.data.maxOnlineSeats) }
          if (result.data.licenseStatus) { updates.push('license_status = ?'); values.push(result.data.licenseStatus) }

          values.push(tenantId)
          await AppDataSource.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, values).catch(() => {})
          remoteSynced = true
        }
      } catch (syncErr: any) {
        log.warn('[License Sync] 租户远程同步失败（将使用本地数据）:', syncErr.message || syncErr)
      }

      // 清除授权过期检查的缓存，使续费/扩容立即生效
      clearLicenseWriteCache()

      // 重新读取最新租户数据
      const updatedRows = await AppDataSource.query(
        `SELECT t.*, p.name as package_name FROM tenants t LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE t.id = ?`,
        [tenantId]
      ).catch(() => [tenantRows[0]])
      const updated = updatedRows[0] || tenant

      const totalMaxUsers = (updated.max_users || 10) + (updated.extra_users || 0)
      const userCountResult = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM users WHERE status = 'active' AND tenant_id = ?`,
        [tenantId]
      ).catch(() => [{ count: 0 }])
      const currentUsers = Number(userCountResult[0]?.count) || 0

      return res.json({
        success: true,
        message: remoteSynced ? '授权信息同步成功' : '已刷新本地授权信息（远程同步暂不可用）',
        data: {
          synced: true,
          remoteSynced,
          maxUsers: totalMaxUsers,
          currentUsers,
          remainingUsers: Math.max(0, totalMaxUsers - currentUsers),
          packageName: updated.package_name,
          expiresAt: updated.expire_date
        }
      })
    }

    // ========== 私有部署同步：从 system_license 表 + 在线验证 ==========
    await ensureLicenseTable()

    const { licenseService } = await import('../services/LicenseService')

    // 先检查本地是否有激活记录
    const localLicense = await AppDataSource.query(
      `SELECT license_key FROM system_license WHERE status = 'active' LIMIT 1`
    ).catch(() => [])

    if (!localLicense || localLicense.length === 0) {
      // 未激活 — 用 success:true + activated:false 标记，避免前端全局错误拦截器弹窗
      return res.json({
        success: true,
        data: {
          synced: false,
          activated: false,
          message: '系统尚未激活，请先输入授权码进行激活'
        }
      })
    }

    // 已激活，尝试在线同步
    const result = await licenseService.verifyOnline()

    if (result.valid) {
      // 同步成功，清除授权过期检查的缓存
      clearLicenseWriteCache()

      // 重新获取本地授权信息
      const licenseInfo = await licenseService.getLicenseInfo()

      res.json({
        success: true,
        message: '授权信息同步成功',
        data: {
          maxUsers: result.maxUsers,
          currentUsers: licenseInfo?.currentUsers || 0,
          remainingUsers: Math.max(0, (result.maxUsers || 50) - (licenseInfo?.currentUsers || 0))
        }
      })
    } else {
      res.json({
        success: false,
        code: 'SYNC_FAILED',
        message: result.message || '同步失败，请检查网络连接'
      })
    }
  } catch (error: any) {
    log.error('同步授权信息失败:', error)
    res.status(500).json({ success: false, message: '同步失败: ' + error.message })
  }
})

// 确保授权表存在
async function ensureLicenseTable() {
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS system_license (
      id VARCHAR(36) PRIMARY KEY,
      license_key VARCHAR(255) NOT NULL,
      customer_name VARCHAR(200),
      license_type VARCHAR(50) DEFAULT 'perpetual',
      max_users INT DEFAULT 50,
      user_limit_mode VARCHAR(20) DEFAULT 'total',
      max_online_seats INT DEFAULT 0,
      features TEXT,
      expires_at DATETIME,
      status VARCHAR(20) DEFAULT 'active',
      activated_at DATETIME,
      machine_id VARCHAR(255),
      admin_credentials_shown TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {})

  // 兼容已有的表：尝试添加新列，已存在则忽略
  await AppDataSource.query(
    `ALTER TABLE system_license ADD COLUMN admin_credentials_shown TINYINT DEFAULT 0`
  ).catch(() => {})
  await AppDataSource.query(
    `ALTER TABLE system_license ADD COLUMN user_limit_mode VARCHAR(20) DEFAULT 'total' COMMENT '用户限制模式: total总用户数, online在线席位'`
  ).catch(() => {})
  await AppDataSource.query(
    `ALTER TABLE system_license ADD COLUMN max_online_seats INT DEFAULT 0 COMMENT '最大在线席位数'`
  ).catch(() => {})
}

// 本地验证授权码（离线模式）
async function localVerifyLicense(licenseKey: string, _machineId: string) {
  // 简单的本地验证逻辑
  // 实际生产环境可以使用更复杂的加密验证
  if (!licenseKey || licenseKey.length < 10) {
    return { success: false, message: '授权码格式无效' }
  }

  // 解析授权码（假设格式：CRM-XXXX-XXXX-XXXX-XXXX）
  if (!licenseKey.startsWith('CRM-')) {
    return { success: false, message: '授权码格式无效' }
  }

  return {
    success: true,
    data: {
      valid: true,
      licenseType: 'perpetual',
      maxUsers: 50,
      features: { all: true },
      customerName: '私有部署客户',
      customerPhone: null
    }
  }
}

export default router
