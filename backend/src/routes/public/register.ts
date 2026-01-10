/**
 * 公开注册 API - 官网用户注册租户
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { aliyunSmsService } from '../../services/AliyunSmsService'

const router = Router()

// 生成租户编码
const generateTenantCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `T${timestamp}${random}`
}

// 生成租户授权码
const generateLicenseKey = (): string => {
  const segments = []
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase())
  }
  return `TENANT-${segments.join('-')}`
}

// 验证码存储（生产环境应使用 Redis）
const verificationCodes: Map<string, { code: string; expires: number }> = new Map()

// 发送验证码
router.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ code: 400, message: '请输入正确的手机号' })
    }

    // 检查发送频率（1分钟内只能发送一次）
    const existing = verificationCodes.get(phone)
    if (existing && existing.expires > Date.now() + 4 * 60 * 1000) {
      return res.status(400).json({ code: 400, message: '发送太频繁，请稍后再试' })
    }

    // 生成6位验证码
    const code = Math.random().toString().slice(-6)
    const expires = Date.now() + 5 * 60 * 1000 // 5分钟有效

    // 优先从数据库加载配置，否则从环境变量加载
    const dbLoaded = await aliyunSmsService.loadFromDatabase()
    if (!dbLoaded) {
      aliyunSmsService.loadFromEnv()
    }

    // 发送短信
    const result = await aliyunSmsService.sendVerificationCode(phone, code)
    if (!result.success) {
      console.error(`[Register] 发送验证码失败: ${result.message}`)
      return res.status(500).json({ code: 500, message: result.message || '发送失败，请稍后重试' })
    }

    verificationCodes.set(phone, { code, expires })
    console.log(`[Register] 验证码已发送: ${phone}`)

    res.json({ code: 0, message: '验证码已发送' })
  } catch (error) {
    console.error('发送验证码失败:', error)
    res.status(500).json({ code: 500, message: '发送验证码失败' })
  }
})


// 注册租户（付费套餐：只创建记录，不生成授权码；免费套餐：直接生成授权码）
router.post('/', async (req: Request, res: Response) => {
  try {
    const { companyName, contactName, phone, code, email, packageCode } = req.body

    // 验证必填字段
    if (!companyName || !contactName || !phone || !code) {
      return res.status(400).json({ code: 400, message: '请填写完整信息' })
    }

    // 验证验证码
    const stored = verificationCodes.get(phone)
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      return res.status(400).json({ code: 400, message: '验证码错误或已过期' })
    }
    verificationCodes.delete(phone)

    // 检查手机号是否已注册
    const existing = await AppDataSource.query(
      'SELECT id FROM tenants WHERE phone = ?', [phone]
    )
    if (existing && existing.length > 0) {
      return res.status(400).json({ code: 400, message: '该手机号已注册' })
    }

    // 获取套餐信息
    let packageId = null
    let maxUsers = 3
    let expireDays = 7
    let isFree = true
    let packagePrice = 0

    if (packageCode) {
      const packages = await AppDataSource.query(
        'SELECT id, max_users, duration_days, price FROM tenant_packages WHERE code = ? AND status = 1',
        [packageCode]
      )
      if (packages && packages.length > 0) {
        packageId = packages[0].id
        maxUsers = packages[0].max_users
        expireDays = packages[0].duration_days
        packagePrice = packages[0].price || 0
        isFree = packagePrice === 0
      }
    }

    // 创建租户
    const tenantId = uuidv4()
    const tenantCode = generateTenantCode()

    // 免费套餐：直接生成授权码并激活
    // 付费套餐：不生成授权码，等支付成功后生成
    const licenseKey = isFree ? generateLicenseKey() : null
    const licenseStatus = isFree ? 'active' : 'pending'

    // 计算到期时间（免费套餐立即生效，付费套餐支付后生效）
    const expireDate = isFree ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000) : null

    await AppDataSource.query(
      `INSERT INTO tenants
       (id, name, code, license_key, license_status, package_id, contact, phone, email, max_users, expire_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [tenantId, companyName, tenantCode, licenseKey, licenseStatus, packageId, contactName, phone, email || null, maxUsers, expireDate]
    )

    // 记录日志
    if (licenseKey) {
      await AppDataSource.query(
        `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message)
         VALUES (?, ?, ?, 'register', 'success', '官网注册-免费试用')`,
        [uuidv4(), tenantId, licenseKey]
      )
    }

    res.json({
      code: 0,
      data: {
        tenantId,
        tenantCode,
        licenseKey: licenseKey || null, // 付费套餐返回null
        expireDate: expireDate ? expireDate.toISOString().split('T')[0] : null,
        needPay: !isFree
      },
      message: isFree ? '注册成功' : '注册成功，请完成支付'
    })
  } catch (error) {
    console.error('注册失败:', error)
    res.status(500).json({ code: 500, message: '注册失败，请稍后重试' })
  }
})

export default router
