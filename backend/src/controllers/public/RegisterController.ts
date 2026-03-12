/**
 * 公共注册控制器（官网注册使用）
 */
import { Request, Response } from 'express'
import { AppDataSource } from '../../config/database'
import { v4 as uuidv4 } from 'uuid'
import * as crypto from 'crypto'
import { aliyunSmsService } from '../../services/AliyunSmsService'
import { verificationCodeService } from '../../services/VerificationCodeService'
import { notificationTemplateService } from '../../services/NotificationTemplateService'
import { SITE_CONFIG } from '../../config/sites'

export class PublicRegisterController {
  /**
   * 发送验证码
   */
  async sendCode(req: Request, res: Response) {
    try {
      const { phone } = req.body

      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ code: 1, message: '请输入正确的手机号' })
      }

      // 检查是否可以发送（防刷）
      const canSend = await verificationCodeService.canSendCode(phone)
      if (!canSend.canSend) {
        return res.status(400).json({
          code: 1,
          message: canSend.message || '发送过于频繁，请稍后再试'
        })
      }

      // 开发环境：直接返回成功，验证码固定为123456
      if (process.env.NODE_ENV !== 'production') {
        const code = '123456'
        await verificationCodeService.saveCode(phone, code)
        return res.json({
          code: 0,
          message: '验证码发送成功（开发环境：123456）'
        })
      }

      // 生产环境：生成随机验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      // 加载短信配置
      const dbLoaded = await aliyunSmsService.loadFromDatabase()
      if (!dbLoaded) {
        aliyunSmsService.loadFromEnv()
      }

      // 发送短信
      const result = await aliyunSmsService.sendVerificationCode(phone, code)

      if (!result.success) {
        console.error(`[Register] 发送验证码失败: ${result.message}`)
        return res.status(500).json({
          code: 1,
          message: result.message || '发送失败，请稍后重试'
        })
      }

      // 存储验证码
      await verificationCodeService.saveCode(phone, code)

      res.json({
        code: 0,
        message: '验证码发送成功'
      })
    } catch (error: any) {
      console.error('发送验证码失败:', error)
      res.status(500).json({ code: 1, message: `发送失败: ${error.message}` })
    }
  }

  /**
   * 注册租户
   */
  async register(req: Request, res: Response) {
    try {
      const {
        companyName, contactName, phone, code, email, packageCode
      } = req.body

      // 验证必填参数
      if (!companyName || !contactName || !phone || !code) {
        return res.status(400).json({ code: 1, message: '缺少必填参数' })
      }

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ code: 1, message: '手机号格式不正确' })
      }

      // 验证码校验
      const verifyResult = await verificationCodeService.verifyCode(phone, code)
      if (!verifyResult.valid) {
        return res.status(400).json({
          code: 1,
          message: verifyResult.message || '验证码错误'
        })
      }

      // 查询套餐信息
      const packages = await AppDataSource.query(
        'SELECT * FROM packages WHERE code = ?',
        [packageCode]
      )

      if (packages.length === 0) {
        return res.status(400).json({ code: 1, message: '套餐不存在或已下架' })
      }

      const pkg = packages[0]

      // 检查手机号是否已注册
      const existingTenants = await AppDataSource.query(
        'SELECT id FROM tenants WHERE phone = ?',
        [phone]
      )

      if (existingTenants.length > 0) {
        return res.status(400).json({ code: 1, message: '该手机号已注册' })
      }

      // 生成租户编码（6位随机字符）
      const tenantCode = this.generateTenantCode()

      // 生成授权码
      const licenseKey = this.generateLicenseKey()

      // 计算到期时间
      const now = new Date()
      let expireDate: Date

      if (pkg.is_trial || pkg.price == 0) {
        // 免费试用：从当前时间开始计算
        expireDate = new Date(now.getTime() + pkg.duration_days * 24 * 60 * 60 * 1000)
      } else {
        // 付费套餐：暂时设置为当前时间（支付成功后更新）
        expireDate = now
      }

      // 创建租户
      const tenantId = uuidv4()
      const nowStr = now.toISOString().slice(0, 19).replace('T', ' ')
      const expireDateStr = expireDate.toISOString().slice(0, 10)

      await AppDataSource.query(
        `INSERT INTO tenants (
          id, code, name, contact, phone, email,
          package_id, max_users, max_storage_gb, status, expire_date,
          license_key, license_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId, tenantCode, companyName, contactName, phone, email,
          pkg.id, pkg.max_users, pkg.max_storage_gb,
          pkg.price == 0 ? 'active' : 'inactive', // 免费试用直接激活，付费套餐需支付后激活
          expireDateStr, licenseKey,
          pkg.price == 0 ? 'active' : 'pending',
          nowStr, nowStr
        ]
      )

      // 创建授权记录（licenses表用于私有部署客户，SaaS租户不需要）
      // SaaS租户的授权信息已经存储在tenants表中

      // 如果是免费试用，创建默认管理员账号
      if (pkg.price == 0) {
        await this.createDefaultAdmin(tenantId, tenantCode)

        // 发送注册成功通知
        await this.sendRegistrationNotification({
          tenantName: companyName,
          tenantCode,
          adminUsername: 'admin',
          adminPassword: 'admin123',
          packageName: pkg.name,
          expireDate: expireDateStr,
          phone,
          email
        })
      }

      res.json({
        code: 0,
        message: '注册成功',
        data: {
          tenantId,
          tenantCode,
          licenseKey,
          isTrial: pkg.is_trial || pkg.price == 0,
          needPayment: pkg.price > 0
        }
      })
    } catch (error: any) {
      console.error('注册失败:', error)
      res.status(500).json({ code: 1, message: `注册失败: ${error.message}` })
    }
  }

  /**
   * 生成租户编码（6位大写字母+数字）
   */
  private generateTenantCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去除易混淆字符
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  /**
   * 生成授权码（32位UUID）
   */
  private generateLicenseKey(): string {
    return uuidv4().replace(/-/g, '').toUpperCase()
  }

  /**
   * 创建默认管理员账号
   */
  private async createDefaultAdmin(tenantId: string, tenantCode: string) {
    try {
      const userId = uuidv4()
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

      // 密码：admin123
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync('admin123', salt, 1000, 64, 'sha512').toString('hex')

      await AppDataSource.query(
        `INSERT INTO users (
          id, tenant_id, username, password, salt, real_name, role,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, tenantId, 'admin', hash, salt, '系统管理员', 'admin',
          'active', now, now
        ]
      )

      console.log(`✓ 已为租户 ${tenantCode} 创建默认管理员账号`)
    } catch (error) {
      console.error('创建默认管理员失败:', error)
      // 不抛出错误，避免影响注册流程
    }
  }

  /**
   * 发送注册成功通知
   */
  private async sendRegistrationNotification(params: {
    tenantName: string
    tenantCode: string
    adminUsername: string
    adminPassword: string
    packageName: string
    expireDate: string
    phone?: string
    email?: string
  }) {
    try {
      await notificationTemplateService.sendByTemplate('tenant_register_success', {
        systemName: '云客CRM',
        tenantName: params.tenantName,
        adminUsername: params.adminUsername,
        adminPassword: params.adminPassword,
        packageName: params.packageName,
        expireDate: params.expireDate
      }, {
        to: params.email || params.phone,
        priority: 'high'
      })

      console.log(`✓ 已发送注册成功通知给租户 ${params.tenantCode}`)
    } catch (error) {
      console.error('发送注册通知失败:', error)
      // 不抛出错误，避免影响注册流程
    }
  }
}

export const publicRegisterController = new PublicRegisterController()
