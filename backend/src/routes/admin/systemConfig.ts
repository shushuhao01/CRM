/**
 * Admin System Config Routes - 系统配置管理
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'

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
          enableBasicOverride: false, enableCopyrightOverride: false, enableAgreementOverride: false
        }
      })
    }
  } catch (error) {
    console.error('获取系统配置失败:', error)
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
    console.error('保存系统配置失败:', error)
    res.status(500).json({ success: false, message: '保存系统配置失败' })
  }
})

// 公开API：获取系统配置覆盖（供CRM前端调用，不需要认证）
// 路径: /api/v1/admin/public/system-config
router.get('/public/system-config', async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const data = JSON.parse(result[0].config_value || '{}')
      const responseData: Record<string, any> = {}

      if (data.enableBasicOverride) {
        responseData.systemName = data.systemName
        responseData.systemVersion = data.systemVersion
        responseData.companyName = data.companyName
        responseData.contactPhone = data.contactPhone
        responseData.contactEmail = data.contactEmail
        responseData.websiteUrl = data.websiteUrl
        responseData.companyAddress = data.companyAddress
        responseData.systemDescription = data.systemDescription
        responseData.systemLogo = data.systemLogo
        responseData.contactQRCode = data.contactQRCode
        responseData.contactQRCodeLabel = data.contactQRCodeLabel
      }

      if (data.enableCopyrightOverride) {
        responseData.copyrightText = data.copyrightText
        responseData.icpNumber = data.icpNumber
        responseData.policeNumber = data.policeNumber
        responseData.techSupport = data.techSupport
      }

      if (data.enableAgreementOverride) {
        responseData.userAgreement = data.userAgreement
        responseData.privacyPolicy = data.privacyPolicy
      }

      res.json({
        success: true,
        data: responseData,
        hasOverride: {
          basic: data.enableBasicOverride || false,
          copyright: data.enableCopyrightOverride || false,
          agreement: data.enableAgreementOverride || false
        }
      })
    } else {
      res.json({
        success: true,
        data: {},
        hasOverride: { basic: false, copyright: false, agreement: false }
      })
    }
  } catch (error) {
    console.error('获取公开系统配置失败:', error)
    res.json({
      success: true,
      data: {},
      hasOverride: { basic: false, copyright: false, agreement: false }
    })
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
          templateCode: data.templateCode || ''
        }
      })
    } else {
      res.json({
        success: true,
        data: { enabled: false, accessKeyId: '', accessKeySecret: '', signName: '', templateCode: '' }
      })
    }
  } catch (error) {
    console.error('获取短信配置失败:', error)
    res.status(500).json({ success: false, message: '获取短信配置失败' })
  }
})

// 保存短信配置
router.post('/system-config/sms', async (req: Request, res: Response) => {
  try {
    const { enabled, accessKeyId, accessKeySecret, signName, templateCode } = req.body
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
    configData.templateCode = templateCode

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
    console.error('保存短信配置失败:', error)
    res.status(500).json({ success: false, message: '保存短信配置失败' })
  }
})

// 测试短信发送
router.post('/system-config/sms/test', async (req: Request, res: Response) => {
  try {
    const { phone, accessKeyId, accessKeySecret, signName, templateCode } = req.body
    console.log(`[SMS Test] 收到测试请求: phone=${phone}, signName=${signName}, templateCode=${templateCode}`)

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

    if (!accessKeyId || !actualSecret || !signName || !templateCode) {
      return res.status(400).json({ success: false, message: '请完整填写短信配置' })
    }

    // 动态导入短信服务
    const { aliyunSmsService } = await import('../../services/AliyunSmsService')
    aliyunSmsService.init({ accessKeyId, accessKeySecret: actualSecret, signName, templateCode })

    const code = '123456'
    const result = await aliyunSmsService.sendVerificationCode(phone, code)

    if (result.success) {
      res.json({ success: true, message: result.message || '测试短信已发送' })
    } else {
      res.status(500).json({ success: false, message: result.message || '发送失败，请检查配置' })
    }
  } catch (error) {
    console.error('测试短信发送失败:', error)
    res.status(500).json({ success: false, message: '发送失败' })
  }
})


export default router
