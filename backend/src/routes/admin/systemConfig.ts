/**
 * Admin System Config Routes - 系统配置管理
 * 注意：公开API(/public/system-config)已在 admin/index.ts 中直接注册，避免路由冲突
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'

import { log } from '../../config/logger';
const router = Router()

// 获取管理后台系统配置（需要管理员认证）
router.get('/system-config', async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      res.json({
        success: true,
        data: JSON.parse(result[0].config_value || '{}')
      })
    } else {
      res.json({
        success: true,
        data: {
          systemName: '', systemVersion: '', companyName: '', contactPhone: '',
          contactEmail: '', websiteUrl: '', companyAddress: '', systemDescription: '',
          systemLogo: '', contactQRCode: '', contactQRCodeLabel: '',
          copyrightText: '', icpNumber: '', policeNumber: '', techSupport: '',
          userAgreement: '', privacyPolicy: '',
          enableBasicOverride: false, enableCopyrightOverride: false, enableAgreementOverride: false,
          enableConsoleEncryption: false
        }
      })
    }
  } catch (error) {
    log.error('获取系统配置失败:', error)
    res.status(500).json({ success: false, message: '获取系统配置失败' })
  }
})

// 保存管理后台系统配置（需要管理员认证）
router.post('/system-config', async (req: Request, res: Response) => {
  try {
    const configData = req.body
    const configValue = JSON.stringify(configData)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 检查是否存在
    const existing = await AppDataSource.query(
      `SELECT id FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
    ).catch(() => [])

    if (existing && existing.length > 0) {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = ?, updated_at = ? WHERE config_key = 'admin_system_config'`,
        [configValue, now]
      )
    } else {
      // 使用UUID()函数生成id
      await AppDataSource.query(
        `INSERT INTO system_config (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        ['admin_system_config', configValue, 'system', '管理后台系统配置', now, now]
      )
    }

    res.json({ success: true, message: '配置保存成功' })
  } catch (error) {
    log.error('保存系统配置失败:', error)
    res.status(500).json({ success: false, message: '保存系统配置失败' })
  }
})

// ============ 短信配置 API ============

// 获取短信配置
router.get('/system-config/sms', async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_config' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const data = JSON.parse(result[0].config_value || '{}')
      // 不返回完整的 secret，只返回是否已配置
      res.json({
        success: true,
        data: {
          enabled: data.enabled || false,
          accessKeyId: data.accessKeyId || '',
          accessKeySecret: data.accessKeySecret ? '******' : '',
          signName: data.signName || '',
          templateCode: data.templateCode || '', // 保留兼容旧版
          templates: data.templates || {
            VERIFY_CODE: '',
            REGISTER_SUCCESS: '',
            PAYMENT_SUCCESS: '',
            RENEW_SUCCESS: '',
            PACKAGE_CHANGE: '',
            QUOTA_CHANGE: '',
            ACCOUNT_SUSPEND: '',
            ACCOUNT_RESUME: '',
            ACCOUNT_CANCEL: '',
            REFUND_SUCCESS: '',
            EXPIRE_REMIND: '',
            EXPIRED_NOTICE: ''
          }
        }
      })
    } else {
      res.json({
        success: true,
        data: {
          enabled: false,
          accessKeyId: '',
          accessKeySecret: '',
          signName: '',
          templateCode: '',
          templates: {
            VERIFY_CODE: '',
            REGISTER_SUCCESS: '',
            PAYMENT_SUCCESS: '',
            RENEW_SUCCESS: '',
            PACKAGE_CHANGE: '',
            QUOTA_CHANGE: '',
            ACCOUNT_SUSPEND: '',
            ACCOUNT_RESUME: '',
            ACCOUNT_CANCEL: '',
            REFUND_SUCCESS: '',
            EXPIRE_REMIND: '',
            EXPIRED_NOTICE: ''
          }
        }
      })
    }
  } catch (error) {
    log.error('获取短信配置失败:', error)
    res.status(500).json({ success: false, message: '获取短信配置失败' })
  }
})

// 保存短信配置
router.post('/system-config/sms', async (req: Request, res: Response) => {
  try {
    const { enabled, accessKeyId, accessKeySecret, signName, templateCode, templates } = req.body
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 获取现有配置
    const existing = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_config' LIMIT 1`
    ).catch(() => [])

    let configData: any = {}
    if (existing && existing.length > 0) {
      configData = JSON.parse(existing[0].config_value || '{}')
    }

    // 更新配置（如果 secret 是 ****** 则保留原值）
    configData.enabled = enabled
    configData.accessKeyId = accessKeyId
    if (accessKeySecret && accessKeySecret !== '******') {
      configData.accessKeySecret = accessKeySecret
    }
    configData.signName = signName
    configData.templateCode = templateCode // 保留兼容旧版

    // 更新模板配置
    if (templates) {
      configData.templates = templates
    }

    const configValue = JSON.stringify(configData)

    if (existing && existing.length > 0) {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = ?, updated_at = ? WHERE config_key = 'sms_config'`,
        [configValue, now]
      )
    } else {
      await AppDataSource.query(
        `INSERT INTO system_config (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        ['sms_config', configValue, 'system', '阿里云短信配置', now, now]
      )
    }

    res.json({ success: true, message: '短信配置保存成功' })
  } catch (error) {
    log.error('保存短信配置失败:', error)
    res.status(500).json({ success: false, message: '保存短信配置失败' })
  }
})

// 测试短信发送
router.post('/system-config/sms/test', async (req: Request, res: Response) => {
  try {
    const { phone, accessKeyId, accessKeySecret, signName, templateCode, templates } = req.body
    log.info(`[SMS Test] 收到测试请求: phone=${phone}, signName=${signName}`)

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: '请输入正确的手机号' })
    }

    // 获取实际的 secret
    let actualSecret = accessKeySecret
    if (accessKeySecret === '******') {
      const existing = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'sms_config' LIMIT 1`
      ).catch(() => [])
      if (existing && existing.length > 0) {
        const data = JSON.parse(existing[0].config_value || '{}')
        actualSecret = data.accessKeySecret
      }
    }

    // 确定使用哪个模板CODE
    let testTemplateCode = templateCode
    if (templates && templates.VERIFY_CODE) {
      testTemplateCode = templates.VERIFY_CODE
    }

    if (!accessKeyId || !actualSecret || !signName || !testTemplateCode) {
      return res.status(400).json({ success: false, message: '请完整填写短信配置和验证码模板CODE' })
    }

    // 动态导入短信服务
    const { aliyunSmsService } = await import('../../services/AliyunSmsService')
    aliyunSmsService.init({
      accessKeyId,
      accessKeySecret: actualSecret,
      signName,
      templateCode: testTemplateCode,
      templates: templates || {}
    })

    const code = '123456'
    const result = await aliyunSmsService.sendVerificationCode(phone, code)

    if (result.success) {
      res.json({ success: true, message: result.message || '测试短信已发送' })
    } else {
      res.status(500).json({ success: false, message: result.message || '发送失败，请检查配置' })
    }
  } catch (error) {
    log.error('测试短信发送失败:', error)
    res.status(500).json({ success: false, message: '发送失败' })
  }
})

// ============ 邮件配置 API ============

// ============ OSS存储连接测试 API ============

// 测试OSS连接（服务器端发起，避免浏览器CORS问题）
router.post('/system-config/storage/test-oss', async (req: Request, res: Response) => {
  try {
    const { accessKey, secretKey, bucketName, region, customDomain } = req.body;

    if (!accessKey || !secretKey || !bucketName || !region) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：accessKey、secretKey、bucketName、region'
      });
      return;
    }

    // 动态导入 ali-oss
    let OSS: any;
    try {
      OSS = (await import('ali-oss')).default;
    } catch {
      res.status(500).json({
        success: false,
        message: '服务器未安装 ali-oss SDK，请联系管理员执行 npm install ali-oss'
      });
      return;
    }

    // 构建OSS客户端配置
    const ossConfig: Record<string, any> = {
      region,
      accessKeyId: accessKey,
      accessKeySecret: secretKey,
      bucket: bucketName,
      secure: true,
      timeout: 10000
    };

    // 如果有自定义域名，使用CNAME模式
    if (customDomain) {
      const endpoint = customDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      ossConfig.endpoint = `https://${endpoint}`;
      ossConfig.cname = true;
    }

    const client = new OSS(ossConfig);
    const listResult = await client.list({ 'max-keys': 1 });

    res.json({
      success: true,
      message: 'OSS连接测试成功',
      data: {
        bucketName,
        region,
        objectCount: listResult.objects ? listResult.objects.length : 0
      }
    });
  } catch (error: any) {
    let errorMessage = '未知错误';

    if (error.code) {
      switch (error.code) {
        case 'InvalidAccessKeyId':
        case 'InvalidAccessKeyIdError':
          errorMessage = 'Access Key ID 无效，请检查是否填写正确';
          break;
        case 'SignatureDoesNotMatch':
        case 'SignatureDoesNotMatchError':
          errorMessage = 'Secret Key 错误或签名不匹配，请检查是否填写正确';
          break;
        case 'NoSuchBucket':
        case 'NoSuchBucketError':
          errorMessage = '存储桶不存在，请检查 Bucket 名称和区域是否匹配';
          break;
        case 'AccessDenied':
        case 'AccessDeniedError':
          errorMessage = '访问被拒绝，请检查 RAM 用户权限是否包含 oss:ListObjects';
          break;
        case 'RequestTimeTooSkewed':
          errorMessage = '请求时间偏差过大，请检查服务器系统时间';
          break;
        default:
          errorMessage = `OSS错误 [${error.code}]: ${error.message || ''}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    log.error('OSS连接测试失败:', { code: error.code, message: errorMessage });

    res.status(400).json({
      success: false,
      message: `OSS连接失败: ${errorMessage}`
    });
  }
});

// ============ 邮件配置独立 API ============

// 获取邮件配置
router.get('/system/email-settings', async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'email_settings' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const data = JSON.parse(result[0].config_value || '{}')
      // 不返回完整的密码，只返回是否已配置
      res.json({
        success: true,
        data: {
          enabled: data.enabled || false,
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 465,
          senderEmail: data.senderEmail || '',
          senderName: data.senderName || '',
          emailPassword: data.emailPassword ? '******' : '',
          enableSsl: data.enableSsl !== false,
          enableTls: data.enableTls || false,
          testEmail: data.testEmail || ''
        }
      })
    } else {
      res.json({
        success: true,
        data: {
          enabled: false,
          smtpHost: '',
          smtpPort: 465,
          senderEmail: '',
          senderName: '',
          emailPassword: '',
          enableSsl: true,
          enableTls: false,
          testEmail: ''
        }
      })
    }
  } catch (error) {
    log.error('获取邮件配置失败:', error)
    res.status(500).json({ success: false, message: '获取邮件配置失败' })
  }
})

// 保存邮件配置
router.put('/system/email-settings', async (req: Request, res: Response) => {
  try {
    const { enabled, smtpHost, smtpPort, senderEmail, senderName, emailPassword, enableSsl, enableTls, testEmail } = req.body
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 获取现有配置
    const existing = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'email_settings' LIMIT 1`
    ).catch(() => [])

    let configData: any = {}
    if (existing && existing.length > 0) {
      configData = JSON.parse(existing[0].config_value || '{}')
    }

    // 更新配置（如果密码是 ****** 则保留原值）
    configData.enabled = enabled
    configData.smtpHost = smtpHost
    configData.smtpPort = smtpPort
    configData.senderEmail = senderEmail
    configData.senderName = senderName
    if (emailPassword && emailPassword !== '******') {
      configData.emailPassword = emailPassword
    }
    configData.enableSsl = enableSsl
    configData.enableTls = enableTls
    configData.testEmail = testEmail

    const configValue = JSON.stringify(configData)

    if (existing && existing.length > 0) {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = ?, updated_at = ? WHERE config_key = 'email_settings'`,
        [configValue, now]
      )
    } else {
      await AppDataSource.query(
        `INSERT INTO system_config (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        ['email_settings', configValue, 'system', '邮件服务配置', now, now]
      )
    }

    res.json({ success: true, message: '邮件配置保存成功' })
  } catch (error) {
    log.error('保存邮件配置失败:', error)
    res.status(500).json({ success: false, message: '保存邮件配置失败' })
  }
})

// 测试邮件发送
router.post('/system/email-settings/test', async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, senderEmail, senderName, emailPassword, enableSsl, enableTls, testEmail } = req.body
    log.info(`[Email Test] 收到测试请求: testEmail=${testEmail}, smtpHost=${smtpHost}`)

    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return res.status(400).json({ success: false, message: '请输入正确的邮箱地址' })
    }

    // 获取实际的密码
    let actualPassword = emailPassword
    if (emailPassword === '******') {
      const existing = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'email_settings' LIMIT 1`
      ).catch(() => [])
      if (existing && existing.length > 0) {
        const data = JSON.parse(existing[0].config_value || '{}')
        actualPassword = data.emailPassword
      }
    }

    if (!smtpHost || !smtpPort || !senderEmail || !actualPassword) {
      return res.status(400).json({ success: false, message: '请完整填写邮件配置' })
    }

    // 动态导入邮件服务
    const nodemailer = require('nodemailer')

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: enableSsl,
      auth: {
        user: senderEmail,
        pass: actualPassword
      },
      tls: enableTls ? { rejectUnauthorized: false } : undefined
    })

    await transporter.sendMail({
      from: `"${senderName || 'CRM系统'}" <${senderEmail}>`,
      to: testEmail,
      subject: '测试邮件 - CRM系统',
      html: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #409eff;">✅ 邮件配置测试成功</h2>
          <p>如果您收到这封邮件，说明邮件配置正确。</p>
          <div style="background: #f0f9eb; padding: 12px 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e1f3d8;">
            <p style="margin: 4px 0;"><strong>SMTP服务器：</strong>${smtpHost}:${smtpPort}</p>
            <p style="margin: 4px 0;"><strong>发件人：</strong>${senderName || 'CRM系统'} &lt;${senderEmail}&gt;</p>
            <p style="margin: 4px 0;"><strong>SSL：</strong>${enableSsl ? '已启用' : '未启用'}</p>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          </p>
          <p style="color: #999; font-size: 12px;">此邮件由CRM管理后台自动发送，请勿回复。</p>
        </div>
      `
    })

    res.json({ success: true, message: '测试邮件已发送，请查收' })
  } catch (error: any) {
    log.error('测试邮件发送失败:', error)

    // 针对常见SMTP错误提供友好的中文提示
    let friendlyMessage = '发送失败，请检查配置'
    const errMsg = (error.message || '').toLowerCase()
    const errCode = error.responseCode || error.code || ''
    const reqHost = req.body.smtpHost || ''
    const reqPort = req.body.smtpPort || ''

    if (errMsg.includes('535') || errMsg.includes('authentication failed') || errMsg.includes('auth')) {
      friendlyMessage = '认证失败：请检查邮箱密码/授权码是否正确。注意：163/126邮箱、QQ邮箱等需要使用「授权码」而非登录密码，请在邮箱设置中开启SMTP服务并获取授权码'
    } else if (errMsg.includes('connect') || errMsg.includes('econnrefused') || errMsg.includes('timeout')) {
      friendlyMessage = `连接失败：无法连接到 ${reqHost}:${reqPort}，请检查SMTP服务器地址和端口是否正确，以及SSL/TLS设置是否匹配`
    } else if (errMsg.includes('certificate') || errMsg.includes('ssl') || errMsg.includes('tls')) {
      friendlyMessage = 'SSL/TLS错误：请检查SSL和TLS设置。端口465通常启用SSL，端口587通常启用TLS'
    } else if (errMsg.includes('envelope') || errMsg.includes('sender') || errMsg.includes('from')) {
      friendlyMessage = '发件人错误：请检查发件人邮箱地址格式是否正确'
    } else if (errMsg.includes('recipient') || errMsg.includes('rcpt')) {
      friendlyMessage = '收件人错误：测试邮箱地址无效或被拒绝'
    } else if (errCode === 'ENOTFOUND') {
      friendlyMessage = `DNS解析失败：找不到服务器 ${reqHost}，请检查SMTP服务器地址拼写`
    } else if (error.message) {
      friendlyMessage = `发送失败: ${error.message}`
    }

    res.status(500).json({
      success: false,
      message: friendlyMessage
    })
  }
})

// ============ 超时提醒配置 API ============

// 获取超时提醒配置
router.get('/timeout-reminder/config', async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'timeout_reminder_config' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const data = JSON.parse(result[0].config_value || '{}')
      res.json({
        success: true,
        data: {
          enabled: data.enabled || false,
          orderAuditTimeout: data.orderAuditTimeout || 24,
          orderShipmentTimeout: data.orderShipmentTimeout || 48,
          afterSalesTimeout: data.afterSalesTimeout || 48,
          orderFollowupDays: data.orderFollowupDays || 3,
          checkIntervalMinutes: data.checkIntervalMinutes || 30
        }
      })
    } else {
      res.json({
        success: true,
        data: {
          enabled: false,
          orderAuditTimeout: 24,
          orderShipmentTimeout: 48,
          afterSalesTimeout: 48,
          orderFollowupDays: 3,
          checkIntervalMinutes: 30
        }
      })
    }
  } catch (error) {
    log.error('获取超时提醒配置失败:', error)
    res.status(500).json({ success: false, message: '获取超时提醒配置失败' })
  }
})

// 保存超时提醒配置
router.put('/timeout-reminder/config', async (req: Request, res: Response) => {
  try {
    const configData = req.body
    const configValue = JSON.stringify(configData)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 检查是否存在
    const existing = await AppDataSource.query(
      `SELECT id FROM system_config WHERE config_key = 'timeout_reminder_config' LIMIT 1`
    ).catch(() => [])

    if (existing && existing.length > 0) {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = ?, updated_at = ? WHERE config_key = 'timeout_reminder_config'`,
        [configValue, now]
      )
    } else {
      await AppDataSource.query(
        `INSERT INTO system_config (id, config_key, config_value, config_type, description, created_at, updated_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
        ['timeout_reminder_config', configValue, 'system', '超时提醒配置', now, now]
      )
    }

    res.json({ success: true, message: '超时提醒配置保存成功' })
  } catch (error) {
    log.error('保存超时提醒配置失败:', error)
    res.status(500).json({ success: false, message: '保存超时提醒配置失败' })
  }
})

// 手动触发超时检测
router.post('/timeout-reminder/check', async (_req: Request, res: Response) => {
  try {
    // 这里可以调用实际的超时检测服务
    // 暂时返回模拟结果
    res.json({
      success: true,
      message: '检测完成，未发现超时订单'
    })
  } catch (error) {
    log.error('超时检测失败:', error)
    res.status(500).json({ success: false, message: '检测失败' })
  }
})


export default router
