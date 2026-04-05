/**
 * 公开注册 API - 官网用户注册租户
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { aliyunSmsService } from '../../services/AliyunSmsService'
import { adminNotificationService } from '../../services/AdminNotificationService'
import { createDefaultAdmin } from '../../utils/adminAccountHelper'
import { generateMemberToken } from '../../middleware/memberAuth'

import { log } from '../../config/logger';
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
      log.error(`[Register] 发送验证码失败: ${result.message}`)
      return res.status(500).json({ code: 500, message: result.message || '发送失败，请稍后重试' })
    }

    verificationCodes.set(phone, { code, expires })
    log.info(`[Register] 验证码已发送: ${phone}`)

    res.json({ code: 0, message: '验证码已发送' })
  } catch (error) {
    log.error('发送验证码失败:', error)
    res.status(500).json({ code: 500, message: '发送验证码失败' })
  }
})


// 注册租户（付费套餐：只创建记录，不生成授权码；免费套餐：直接生成授权码）
router.post('/', async (req: Request, res: Response) => {
  try {
    const { companyName, contactName, phone, code, email, packageCode, password, autoRenew, autoRenewPackage } = req.body

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
        maxUsers = packages[0].max_users || 3
        expireDays = packages[0].duration_days || 7  // 防止NULL覆盖默认值
        packagePrice = Number(packages[0].price) || 0  // 🔥 MySQL返回字符串"0.00"，必须转数字
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

    // 如果设置了密码，存储密码哈希（用于会员中心登录）
    if (password && password.length >= 6) {
      try {
        const passwordHash = await bcrypt.hash(password, 10)
        await AppDataSource.query('UPDATE tenants SET password_hash = ? WHERE id = ?', [passwordHash, tenantId])
      } catch (pwdErr) {
        log.warn('[Register] 存储密码失败（不影响注册）:', pwdErr)
      }
    }

    // 如果免费试用勾选了"到期自动续费"，记录意向（实际签约在 /subscribe 端点完成）
    if (isFree && autoRenew && autoRenewPackage) {
      log.info(`[Register] 免费试用用户 ${tenantCode} 勾选到期自动续费 ${autoRenewPackage}，等待前端发起签约`)
    }

    // 记录日志
    if (licenseKey) {
      await AppDataSource.query(
        `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message)
         VALUES (?, ?, ?, 'register', 'success', '官网注册-免费试用')`,
        [uuidv4(), tenantId, licenseKey]
      )
    }

    // 🔥 免费套餐：创建默认管理员账号（用手机号作为用户名，默认密码 Aa123456）
    let adminAccount: { username: string; password: string } | null = null
    if (isFree) {
      try {
        const result = await createDefaultAdmin({
          tenantId,
          phone,
          realName: contactName,
          email: email || undefined
        })
        adminAccount = { username: result.username, password: result.password }
        log.info(`[Register] ✅ 已为租户 ${tenantCode} 创建默认管理员: ${result.username}`)
      } catch (adminErr: any) {
        log.error('[Register] 创建默认管理员失败（不影响注册）:', adminErr.message?.substring(0, 100))
      }
    }

    // 生成会员中心token，让注册用户（含未付费用户）可直接进入会员中心
    const memberToken = generateMemberToken({ tenantId, tenantCode, phone })

    res.json({
      code: 0,
      data: {
        tenantId,
        tenantCode,
        licenseKey: licenseKey || null, // 付费套餐返回null
        expireDate: expireDate ? expireDate.toISOString().split('T')[0] : null,
        needPay: !isFree,
        memberToken,
        adminUsername: adminAccount?.username || null,
        adminPassword: adminAccount?.password || null
      },
      message: isFree ? '注册成功' : '注册成功，请完成支付'
    })

    // 异步通知管理员（不阻塞响应）
    adminNotificationService.notify('tenant_registered', {
      title: `新租户注册：${companyName}`,
      content: `企业「${companyName}」（联系人：${contactName}，手机：${phone}）刚刚注册了${isFree ? '免费试用' : '付费'}套餐。租户编码：${tenantCode}`,
      relatedId: tenantId,
      relatedType: 'tenant',
      extraData: { companyName, contactName, phone, tenantCode, isFree }
    }).catch(err => log.error('[Register] 发送管理员通知失败:', err.message))
  } catch (error) {
    log.error('注册失败:', error)
    res.status(500).json({ code: 500, message: '注册失败，请稍后重试' })
  }
})

/**
 * 免费试用用户发起自动续费签约
 * POST /api/v1/public/register/subscribe
 * 不需要 memberAuth，使用注册返回的 tenantId 标识
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { tenantId, packageCode, channel } = req.body

    if (!tenantId || !packageCode || !channel) {
      return res.status(400).json({ code: 400, message: '参数不完整' })
    }
    if (!['wechat', 'alipay'].includes(channel)) {
      return res.status(400).json({ code: 400, message: '不支持的签约渠道' })
    }

    // 校验租户存在且是免费试用（30分钟内创建）
    const tenants = await AppDataSource.query(
      `SELECT id, license_status, created_at FROM tenants WHERE id = ? AND license_status = 'active'`,
      [tenantId]
    )
    if (tenants.length === 0) {
      return res.status(400).json({ code: 400, message: '租户不存在或未激活' })
    }
    const createdAt = new Date(tenants[0].created_at).getTime()
    if (Date.now() - createdAt > 30 * 60 * 1000) {
      return res.status(400).json({ code: 400, message: '注册会话已过期，请在会员中心完成签约' })
    }

    // 查找套餐
    const pkgs = await AppDataSource.query(
      'SELECT id FROM tenant_packages WHERE code = ? AND status = 1',
      [packageCode]
    )
    if (pkgs.length === 0) {
      return res.status(400).json({ code: 400, message: '套餐不存在' })
    }

    // 清理该租户之前失败/未完成的 signing 记录，避免冲突
    await AppDataSource.query(
      "DELETE FROM subscriptions WHERE tenant_id = ? AND status = 'signing'",
      [tenantId]
    )

    // 调用 SubscriptionService 创建真实的签约请求
    const { subscriptionService } = await import('../../services/SubscriptionService')
    const result = await subscriptionService.createSubscription({
      tenantId,
      packageId: pkgs[0].id,
      channel: channel as 'wechat' | 'alipay',
      billingCycle: 'monthly'
    })

    log.info(`[Register] 免费试用用户签约发起成功: tenant=${tenantId}, channel=${channel}, subscription=${result.subscriptionId}`)

    res.json({
      code: 0,
      data: result,
      message: '请完成签约授权'
    })
  } catch (error: any) {
    log.error('[Register] 创建签约失败:', error.message)
    res.status(400).json({ code: 400, message: error.message || '创建签约失败' })
  }
})

/**
 * 查询签约状态（前端轮询用）
 * GET /api/v1/public/register/subscribe-status/:subscriptionId
 */
router.get('/subscribe-status/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params
    const subs = await AppDataSource.query(
      'SELECT status FROM subscriptions WHERE id = ?',
      [subscriptionId]
    )
    if (subs.length === 0) {
      return res.json({ code: 1, message: '订阅记录不存在' })
    }
    res.json({ code: 0, data: { status: subs[0].status } })
  } catch (error: any) {
    log.error('[Register] 查询签约状态失败:', error.message)
    res.status(500).json({ code: 1, message: '查询失败' })
  }
})

export default router
