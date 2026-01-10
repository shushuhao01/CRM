/**
 * License Routes - CRM系统授权管理
 * 供私有部署的CRM系统使用
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'

const router = Router()

// 检查系统激活状态（公开接口）
router.get('/status', async (_req: Request, res: Response) => {
  try {
    // 检查本地是否有激活的授权信息
    const result = await AppDataSource.query(
      `SELECT * FROM system_license WHERE status = 'active' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const license = result[0]
      const isExpired = license.expires_at && new Date(license.expires_at) < new Date()

      res.json({
        success: true,
        data: {
          activated: true,
          expired: isExpired,
          licenseType: license.license_type,
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
    console.error('检查授权状态失败:', error)
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

    // 获取机器码（简单实现，使用服务器信息）
    const os = await import('os')
    const machineId = `${os.hostname()}-${os.platform()}-${os.arch()}`

    // 调用平台管理后台验证授权码
    const adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000/api/v1/admin'

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
      console.log('无法连接平台管理后台，尝试本地验证')
      verifyResult = await localVerifyLicense(licenseKey, machineId)
    }

    if (!verifyResult.success) {
      return res.status(400).json({ success: false, message: verifyResult.message || '授权码验证失败' })
    }

    const licenseData = verifyResult.data

    // 保存授权信息到本地数据库
    await ensureLicenseTable()

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 先删除旧的授权记录
    await AppDataSource.query(`DELETE FROM system_license`)

    // 插入新的授权记录
    await AppDataSource.query(
      `INSERT INTO system_license (id, license_key, customer_name, license_type, max_users, features, expires_at, status, activated_at, machine_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
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
        now,
        now
      ]
    )

    // 检查是否需要创建默认管理员
    const adminExists = await AppDataSource.query(
      `SELECT id FROM users WHERE role = 'super_admin' OR role_id IN (SELECT id FROM roles WHERE code = 'super_admin') LIMIT 1`
    ).catch(() => [])

    let defaultAdmin = null
    if (!adminExists || adminExists.length === 0) {
      // 创建默认管理员账号
      const hashedPassword = await bcrypt.hash('admin123', 10)
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
        `INSERT INTO users (id, username, password, name, role, role_id, status, created_at, updated_at)
         VALUES (?, 'admin', ?, '系统管理员', 'super_admin', ?, 'active', ?, ?)`,
        [adminId, hashedPassword, roleId, now, now]
      )

      defaultAdmin = { username: 'admin', password: 'admin123' }
    }

    res.json({
      success: true,
      message: '系统激活成功',
      data: {
        customerName: licenseData.customerName,
        licenseType: licenseData.licenseType,
        maxUsers: licenseData.maxUsers,
        expiresAt: licenseData.expiresAt,
        defaultAdmin
      }
    })
  } catch (error: any) {
    console.error('系统激活失败:', error)
    res.status(500).json({ success: false, message: '系统激活失败: ' + error.message })
  }
})

// 获取授权详情（需要登录）
router.get('/info', async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT * FROM system_license WHERE status = 'active' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const license = result[0]

      // 获取当前用户数
      const userCountResult = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM users WHERE status = 'active'`
      ).catch(() => [{ count: 0 }])
      const currentUsers = userCountResult[0]?.count || 0

      res.json({
        success: true,
        data: {
          licenseKey: license.license_key ? license.license_key.substring(0, 8) + '****' : '',
          customerName: license.customer_name,
          licenseType: license.license_type,
          maxUsers: license.max_users,
          currentUsers,
          remainingUsers: Math.max(0, (license.max_users || 50) - currentUsers),
          features: license.features ? JSON.parse(license.features) : null,
          expiresAt: license.expires_at,
          activatedAt: license.activated_at,
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
    console.error('获取授权信息失败:', error)
    res.status(500).json({ success: false, message: '获取授权信息失败' })
  }
})

// 手动同步授权信息（从管理后台获取最新配置）
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    const { licenseService } = await import('../services/LicenseService')
    const result = await licenseService.verifyOnline()

    if (result.valid) {
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
        message: result.message || '同步失败，请检查网络连接'
      })
    }
  } catch (error: any) {
    console.error('同步授权信息失败:', error)
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
      features TEXT,
      expires_at DATETIME,
      status VARCHAR(20) DEFAULT 'active',
      activated_at DATETIME,
      machine_id VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {})
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
      customerName: '私有部署客户'
    }
  }
}

export default router
