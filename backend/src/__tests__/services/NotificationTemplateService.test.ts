/**
 * NotificationTemplateService 通知模板服务单元测试
 */

const mockFindOne = jest.fn()
const mockGetRepository = jest.fn(() => ({ findOne: mockFindOne }))
const mockGetDataSource = jest.fn(() => ({ getRepository: mockGetRepository }))

jest.mock('../../config/database', () => ({
  getDataSource: mockGetDataSource,
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../services/NotificationChannelService', () => ({
  notificationChannelService: {
    sendToAllChannels: jest.fn().mockResolvedValue([])
  }
}))
jest.mock('../../config/sites', () => ({
  SITE_CONFIG: {
    CRM_URL: 'https://crm.test.com',
    WEBSITE_URL: 'https://web.test.com',
    API_URL: 'https://api.test.com',
    ADMIN_URL: 'https://admin.test.com',
    RENEW_URL: 'https://renew.test.com'
  }
}))

import { AppDataSource } from '../../config/database'

// 导入默认实例
let notificationTemplateService: any
beforeAll(async () => {
  const mod = await import('../../services/NotificationTemplateService')
  notificationTemplateService = (mod as any).notificationTemplateService
  if (!notificationTemplateService) {
    const Cls = (mod as any).NotificationTemplateService || (mod as any).default
    if (Cls) notificationTemplateService = new Cls()
  }
})

describe('NotificationTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetDataSource.mockReturnValue({ getRepository: mockGetRepository })
  })

  // ==================== sendByTemplate ====================

  describe('sendByTemplate', () => {
    it('数据库未连接 → 返回失败', async () => {
      mockGetDataSource.mockReturnValue(null)
      const result = await notificationTemplateService.sendByTemplate('CODE', {})
      expect(result.success).toBe(false)
      expect(result.message).toContain('数据库未连接')
    })

    it('模板不存在 → 返回失败', async () => {
      mockFindOne.mockResolvedValue(null)
      const result = await notificationTemplateService.sendByTemplate('NONEXIST', {})
      expect(result.success).toBe(false)
      expect(result.message).toContain('模板不存在')
    })

    it('模板存在 + 无 sendEmail/sendSms → 成功但 0/0', async () => {
      mockFindOne.mockResolvedValue({
        templateCode: 'TEST',
        isEnabled: 1,
        sendEmail: false,
        sendSms: false,
        emailSubject: '',
        emailContent: '',
        smsContent: '',
      })
      const result = await notificationTemplateService.sendByTemplate('TEST', {})
      expect(result.success).toBe(false) // 0 成功
      expect(result.message).toContain('0/0')
    })

    it('异常 → 返回失败', async () => {
      mockFindOne.mockRejectedValue(new Error('boom'))
      const result = await notificationTemplateService.sendByTemplate('ERR', {})
      expect(result.success).toBe(false)
    })
  })

  // ==================== replaceVariables (私有方法测试) ====================

  describe('replaceVariables', () => {
    it('替换变量 {{key}}', () => {
      const fn = (notificationTemplateService as any).replaceVariables.bind(notificationTemplateService)
      expect(fn('Hello {{name}}!', { name: '张三' })).toBe('Hello 张三!')
    })

    it('多个变量', () => {
      const fn = (notificationTemplateService as any).replaceVariables.bind(notificationTemplateService)
      expect(fn('{{a}} and {{b}}', { a: '1', b: '2' })).toBe('1 and 2')
    })

    it('未匹配变量 → 被清空', () => {
      const fn = (notificationTemplateService as any).replaceVariables.bind(notificationTemplateService)
      expect(fn('Hello {{unknown}}!', {})).toBe('Hello !')
    })

    it('注入系统 URL 变量', () => {
      const fn = (notificationTemplateService as any).replaceVariables.bind(notificationTemplateService)
      const result = fn('Visit {{crmUrl}}', {})
      expect(result).toBe('Visit https://crm.test.com')
    })
  })

  // ==================== renderTemplate ====================

  describe('renderTemplate', () => {
    it('渲染邮件主题+内容+短信', () => {
      const fn = (notificationTemplateService as any).renderTemplate.bind(notificationTemplateService)
      const template = {
        emailSubject: '欢迎 {{name}}',
        emailContent: '<p>{{name}}，您好</p>',
        smsContent: '{{name}}，欢迎使用',
      }
      const result = fn(template, { name: '李四' })
      expect(result.emailSubject).toBe('欢迎 李四')
      expect(result.emailContent).toContain('李四')
      expect(result.smsContent).toContain('李四')
    })

    it('模板字段为空 → 不渲染', () => {
      const fn = (notificationTemplateService as any).renderTemplate.bind(notificationTemplateService)
      const result = fn({}, {})
      expect(result.emailSubject).toBeUndefined()
      expect(result.smsContent).toBeUndefined()
    })
  })

  // ==================== getEmailSettings / getSmsSettings ====================

  describe('getEmailSettings', () => {
    it('有完整配置 → 返回对象', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([{
        config_value: JSON.stringify({
          enabled: true,
          smtpHost: 'smtp.test.com',
          senderEmail: 'a@test.com',
          emailPassword: 'pass'
        })
      }])
      const fn = (notificationTemplateService as any).getEmailSettings.bind(notificationTemplateService)
      const result = await fn()
      expect(result.smtpHost).toBe('smtp.test.com')
    })

    it('无记录 → null', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([])
      const fn = (notificationTemplateService as any).getEmailSettings.bind(notificationTemplateService)
      expect(await fn()).toBeNull()
    })

    it('异常 → null', async () => {
      ;(AppDataSource.query as jest.Mock).mockRejectedValue(new Error('err'))
      const fn = (notificationTemplateService as any).getEmailSettings.bind(notificationTemplateService)
      expect(await fn()).toBeNull()
    })
  })

  describe('getSmsSettings', () => {
    it('有完整配置 → 返回', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([{
        config_value: JSON.stringify({
          enabled: true,
          accessKeyId: 'ak',
          accessKeySecret: 'sk',
          signName: 'sign'
        })
      }])
      const fn = (notificationTemplateService as any).getSmsSettings.bind(notificationTemplateService)
      const result = await fn()
      expect(result.signName).toBe('sign')
    })

    it('配置不完整 → null', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([{
        config_value: JSON.stringify({ enabled: false })
      }])
      const fn = (notificationTemplateService as any).getSmsSettings.bind(notificationTemplateService)
      expect(await fn()).toBeNull()
    })
  })
})
