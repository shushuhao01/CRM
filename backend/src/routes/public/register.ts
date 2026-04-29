/**
 * 公开注册 API - 官网用户注册租户
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { aliyunSmsService } from '../../services/AliyunSmsService'
import { adminNotificationService } from '../../services/AdminNotificationService'
import { createDefaultAdmin } from '../../utils/adminAccountHelper'
import { generateMemberToken } from '../../middleware/memberAuth'
import { Tenant } from '../../entities/Tenant'

import { log } from '../../config/logger';
const router = Router()

// 生成租户编码（与管理后台 Tenant.generateShortCode 格式保持一致）
// 格式: T + YYMMDD + 4位随机字符 (例如: T260427A1B2)
const generateTenantCode = async (): Promise<string> => {
  let code = Tenant.generateShortCode()
  // 确保编码不重复
  for (let i = 0; i < 10; i++) {
    const existing = await AppDataSource.query('SELECT id FROM tenants WHERE code = ?', [code])
    if (existing.length === 0) break
    code = Tenant.generateShortCode()
  }
  return code
}

// 生成租户授权码（统一使用 Tenant.generateLicenseKey，与管理后台格式保持一致）

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


// 注册租户（无论免费还是付费，都在注册时生成授权码，确保成功页显示完整授权码）
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

    // 检查手机号是否已注册（排除已软删除的租户，允许删除后重新注册）
    const existing = await AppDataSource.query(
      'SELECT id FROM tenants WHERE phone = ? AND deleted_at IS NULL', [phone]
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
    const tenantCode = await generateTenantCode()

    // 🔑 无论免费还是付费，都在注册时生成授权码（确保成功页能显示完整授权码）
    // 免费套餐：直接激活；付费套餐：状态为pending，支付后激活
    const licenseKey = Tenant.generateLicenseKey()
    const licenseStatus = isFree ? 'active' : 'pending'

    // 计算到期时间（免费套餐立即生效，付费套餐支付后生效）
    const expireDate = isFree ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000) : null

    await AppDataSource.query(
      `INSERT INTO tenants
       (id, name, code, license_key, license_status, package_id, contact, phone, email, max_users, expire_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [tenantId, companyName, tenantCode, licenseKey, licenseStatus, packageId, contactName, phone, email || null, maxUsers, expireDate]
    )

    // 会员中心密码：用户填了用用户的，没填则默认 Aa123456
    const memberPassword = (password && password.length >= 6) ? password : 'Aa123456'
    const memberPasswordIsDefault = !(password && password.length >= 6)
    try {
      const passwordHash = await bcrypt.hash(memberPassword, 10)
      await AppDataSource.query('UPDATE tenants SET password_hash = ? WHERE id = ?', [passwordHash, tenantId])
    } catch (pwdErr) {
      log.warn('[Register] 存储会员中心密码失败（不影响注册）:', pwdErr)
    }

    // 如果免费试用勾选了"到期自动续费"，记录意向（实际签约在 /subscribe 端点完成）
    if (isFree && autoRenew && autoRenewPackage) {
      log.info(`[Register] 免费试用用户 ${tenantCode} 勾选到期自动续费 ${autoRenewPackage}，等待前端发起签约`)
    }

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message)
       VALUES (?, ?, ?, 'register', 'success', ?)`,
      [uuidv4(), tenantId, licenseKey, isFree ? '官网注册-免费试用' : '官网注册-付费套餐（待支付）']
    )

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
        licenseKey: isFree ? licenseKey : null, // � 付费套餐支付前不暴露授权码
        expireDate: expireDate ? expireDate.toISOString().split('T')[0] : null,
        needPay: !isFree,
        memberToken,
        adminUsername: adminAccount?.username || null,
        adminPassword: adminAccount?.password || null,
        memberPasswordIsDefault
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

    // 🔥 注册成功后，发送邮件和短信通知给用户（免费和付费都发送，包含完整授权码信息）
    {
      const expireDateStr = expireDate ? expireDate.toISOString().split('T')[0] : ''
      const packageLabel = isFree ? '7天免费试用' : '付费套餐（待支付）'
      // 异步发送，不阻塞响应
      ;(async () => {
        const notifyResults: string[] = []
        try {
          // 发送短信通知
          if (phone) {
            try {
              const dbLoaded = await aliyunSmsService.loadFromDatabase()
              if (!dbLoaded) {
                log.warn('[Register] 数据库无有效短信配置，尝试环境变量')
                aliyunSmsService.loadFromEnv()
              } else {
                log.info('[Register] 已从数据库加载短信配置')
              }
              const smsParams = {
                tenantName: companyName,
                orderNo: isFree ? '免费试用' : '待支付',
                amount: isFree ? '0' : String(packagePrice),
                tenantCode: tenantCode,
                licenseKey: isFree ? licenseKey : '支付后发放', // 🔒 付费套餐不泄露授权码
                adminPassword: isFree ? (adminAccount?.password || 'Aa123456') : '支付后发放',
                packageName: packageLabel,
                expireDate: expireDateStr || '支付后生效'
              }
              // 依次尝试: ACCOUNT_ACTIVATION → PAYMENT_ACTIVATION
              const templateTypes = ['ACCOUNT_ACTIVATION', 'PAYMENT_ACTIVATION']
              let smsResult: { success: boolean; message?: string } = { success: false, message: '未尝试发送' }
              for (const templateType of templateTypes) {
                log.info(`[Register] 尝试使用模板 ${templateType} 发送短信`)
                smsResult = await aliyunSmsService.sendSms(phone, templateType, smsParams)
                if (smsResult.success) {
                  log.info(`[Register] ✅ 注册短信已通过 ${templateType} 模板发送至: ${phone}`)
                  notifyResults.push(`短信:成功(${templateType})`)
                  break
                }
                log.warn(`[Register] ${templateType} 发送失败: ${smsResult.message}`)
                if (!smsResult.message?.includes('未配置')) break
              }
              if (!smsResult.success) {
                log.error(`[Register] 所有短信模板均失败，最后错误: ${smsResult.message}`)
                notifyResults.push(`短信:失败(${smsResult.message})`)
              }
            } catch (smsErr: any) {
              log.error('[Register] 发送注册短信异常:', smsErr.message, smsErr.stack?.substring(0, 300))
              notifyResults.push(`短信:异常(${smsErr.message?.substring(0, 50)})`)
            }
          } else {
            notifyResults.push('短信:跳过(无手机号)')
          }

          // 发送邮件通知
          if (email) {
            try {
              log.info(`[Register] 准备发送注册邮件至: ${email}`)
              const emailConfigRows = await AppDataSource.query(
                `SELECT config_value FROM system_config WHERE config_key = 'email_settings' LIMIT 1`
              ).catch(() => [])

              let emailSettings: any = null
              if (emailConfigRows && emailConfigRows.length > 0) {
                const parsed = JSON.parse(emailConfigRows[0].config_value || '{}')
                log.info(`[Register] 邮件配置状态: enabled=${parsed.enabled}, smtpHost=${parsed.smtpHost ? '已配置' : '未配置'}, senderEmail=${parsed.senderEmail ? '已配置' : '未配置'}, password=${parsed.emailPassword ? '已配置' : '未配置'}`)
                if (parsed.enabled && parsed.smtpHost && parsed.senderEmail && parsed.emailPassword) {
                  emailSettings = parsed
                } else {
                  const missing: string[] = []
                  if (!parsed.enabled) missing.push('enabled=false')
                  if (!parsed.smtpHost) missing.push('smtpHost缺失')
                  if (!parsed.senderEmail) missing.push('senderEmail缺失')
                  if (!parsed.emailPassword) missing.push('emailPassword缺失')
                  log.warn(`[Register] 邮件配置不完整，缺少: ${missing.join(', ')}`)
                  notifyResults.push(`邮件:失败(配置不完整:${missing.join(',')})`)
                }
              } else {
                log.warn('[Register] 数据库中未找到 email_settings 配置记录')
                notifyResults.push('邮件:失败(无email_settings配置)')
              }

              if (emailSettings) {
                const nodemailer = await import('nodemailer')
                const { SITE_CONFIG } = await import('../../config/sites')

                const transporter = nodemailer.createTransport({
                  host: emailSettings.smtpHost,
                  port: emailSettings.smtpPort || 465,
                  secure: emailSettings.enableSsl !== false,
                  auth: {
                    user: emailSettings.senderEmail,
                    pass: emailSettings.emailPassword
                  }
                })

                const emailTitle = isFree ? '🎉 注册成功 - 免费试用已开通' : '📋 注册成功 - 请完成支付'
                const actionText = isFree ? '立即登录 CRM 系统' : '前往会员中心完成支付'
                const actionUrl = isFree ? SITE_CONFIG.CRM_URL : `${SITE_CONFIG.WEBSITE_URL || SITE_CONFIG.CRM_URL}/member`

                // 🔒 免费/付费使用不同邮件内容，付费不暴露授权码和密码
                let emailBodyContent = ''
                if (isFree) {
                  emailBodyContent = `
            <p style="font-size:14px;line-height:1.8;color:#333;margin:0 0 20px;">
              您的7天免费试用账号已成功开通。以下是您的账号信息，请妥善保管：
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;padding:20px;margin-bottom:20px;">
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">套餐名称</td><td style="padding:8px 16px;font-size:14px;color:#303133;font-weight:500;">${packageLabel}</td></tr>
              ${expireDateStr ? `<tr><td style="padding:8px 16px;font-size:14px;color:#606266;">有效期至</td><td style="padding:8px 16px;font-size:14px;color:#303133;font-weight:500;">${expireDateStr}</td></tr>` : ''}
              <tr><td colspan="2" style="padding:4px 16px;"><hr style="border:none;border-top:1px solid #e4e7ed;"></td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">租户编码</td><td style="padding:8px 16px;font-size:14px;color:#e6a23c;font-weight:600;">${tenantCode}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">授权码</td><td style="padding:8px 16px;font-size:14px;color:#e6a23c;font-weight:600;">${licenseKey}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">管理员账号</td><td style="padding:8px 16px;font-size:14px;color:#e6a23c;font-weight:600;">${adminAccount?.username || phone}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">管理员密码</td><td style="padding:8px 16px;font-size:14px;color:#e6a23c;font-weight:600;">${adminAccount?.password || 'Aa123456'}</td></tr>
            </table>
            <p style="font-size:13px;line-height:1.8;color:#909399;margin:16px 0 0;">
              ⚠️ 首次登录请使用租户编码和管理员密码登录，登录后请及时修改密码。
            </p>`
                } else {
                  emailBodyContent = `
            <p style="font-size:14px;line-height:1.8;color:#333;margin:0 0 20px;">
              您的账号已注册成功，请尽快完成支付以开通服务。
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:8px;padding:20px;margin-bottom:20px;">
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">企业名称</td><td style="padding:8px 16px;font-size:14px;color:#303133;font-weight:500;">${companyName}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">租户编码</td><td style="padding:8px 16px;font-size:14px;color:#e6a23c;font-weight:600;">${tenantCode}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">联系人</td><td style="padding:8px 16px;font-size:14px;color:#303133;font-weight:500;">${contactName}（${phone}）</td></tr>
              <tr><td colspan="2" style="padding:4px 16px;"><hr style="border:none;border-top:1px solid #e4e7ed;"></td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">套餐名称</td><td style="padding:8px 16px;font-size:14px;color:#303133;font-weight:500;">${packageLabel}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">套餐价格</td><td style="padding:8px 16px;font-size:14px;color:#f56c6c;font-weight:600;">¥${packagePrice}</td></tr>
              <tr><td style="padding:8px 16px;font-size:14px;color:#606266;">支付状态</td><td style="padding:8px 16px;font-size:14px;color:#e6a23c;font-weight:600;">⏳ 待支付</td></tr>
            </table>
            <p style="font-size:14px;line-height:1.8;color:#606266;margin:0 0 8px;">
              💡 完成支付后，系统将自动为您开通服务并发送账号信息（含授权码和登录密码）。
            </p>
            <p style="font-size:13px;line-height:1.8;color:#909399;margin:0 0 0;">
              如有疑问请联系客服。
            </p>`
                }

                const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:28px 32px;">
            <h2 style="margin:0;color:#fff;font-size:20px;font-weight:600;">${emailTitle}</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="font-size:15px;line-height:1.8;color:#333;margin:0 0 16px;">
              尊敬的 <strong>${companyName}</strong>，您好！
            </p>
            ${emailBodyContent}
            <div style="text-align:center;margin:24px 0;">
              <a href="${actionUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:500;">${actionText}</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">此邮件由云客CRM系统自动发送，请勿直接回复</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

                await transporter.sendMail({
                  from: `"${emailSettings.senderName || '云客CRM'}" <${emailSettings.senderEmail}>`,
                  to: email,
                  subject: isFree ? `【云客CRM】注册成功 - 您的免费试用账号已开通` : `【云客CRM】注册成功 - 请完成支付`,
                  html: emailHtml
                })
                log.info(`[Register] 注册成功邮件已发送至: ${email}`)
                notifyResults.push('邮件:成功')
              } else {
                log.warn('[Register] 邮件配置未启用，跳过注册成功邮件通知')
              }
            } catch (emailErr: any) {
              log.error('[Register] 发送注册邮件失败:', emailErr.message)
              notifyResults.push(`邮件:失败(${emailErr.message?.substring(0, 50)})`)
            }
          } else {
            notifyResults.push('邮件:跳过(无邮箱)')
          }
        } catch (notifyErr: any) {
          log.error('[Register] 发送用户通知失败:', notifyErr.message)
          notifyResults.push(`总异常:${notifyErr.message?.substring(0, 50)}`)
        }

        // 🔥 记录通知发送结果到日志（方便排查短信/邮件不触发的问题）
        try {
          await AppDataSource.query(
            `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message)
             VALUES (?, ?, ?, 'notify', ?, ?)`,
            [uuidv4(), tenantId, licenseKey, notifyResults.some(r => r.includes(':成功')) ? 'success' : 'fail',
             `注册通知: ${notifyResults.join('; ')}`]
          )
        } catch (_logErr) { /* 忽略日志写入失败 */ }
      })()
    }
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

    // 校验租户存在（30分钟内创建）
    // 🔑 允许 active 和 pending 状态：免费试用套餐 license_status='active'，付费套餐 license_status='pending'
    // 付费套餐签约后首次扣款会自动激活租户（SubscriptionService.executeDeduction）
    const tenants = await AppDataSource.query(
      `SELECT id, license_status, created_at FROM tenants WHERE id = ? AND license_status IN ('active', 'pending')`,
      [tenantId]
    )
    if (tenants.length === 0) {
      return res.status(400).json({ code: 400, message: '租户不存在' })
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
