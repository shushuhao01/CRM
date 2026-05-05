/**
 * AliyunSmsService 阿里云短信服务单元测试
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

// mock global fetch
const mockFetch = jest.fn()
;(global as any).fetch = mockFetch

import { aliyunSmsService } from '../../services/AliyunSmsService'
import { AppDataSource } from '../../config/database'

describe('AliyunSmsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 重置内部 config
    ;(aliyunSmsService as any).config = null
  })

  // ==================== init ====================

  describe('init', () => {
    it('设置配置', () => {
      aliyunSmsService.init({
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
        signName: '测试'
      })
      expect((aliyunSmsService as any).config).toMatchObject({
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
        signName: '测试'
      })
    })
  })

  // ==================== loadFromEnv ====================

  describe('loadFromEnv', () => {
    const OLD_ENV = process.env

    beforeEach(() => {
      process.env = { ...OLD_ENV }
    })
    afterAll(() => {
      process.env = OLD_ENV
    })

    it('从环境变量加载配置', () => {
      process.env.ALIYUN_SMS_ACCESS_KEY_ID = 'env_ak'
      process.env.ALIYUN_SMS_ACCESS_KEY_SECRET = 'env_sk'
      process.env.ALIYUN_SMS_SIGN_NAME = 'EnvSign'
      process.env.ALIYUN_SMS_TEMPLATE_CODE = 'SMS_001'

      aliyunSmsService.loadFromEnv()
      const cfg = (aliyunSmsService as any).config
      expect(cfg.accessKeyId).toBe('env_ak')
      expect(cfg.accessKeySecret).toBe('env_sk')
      expect(cfg.signName).toBe('EnvSign')
      expect(cfg.templateCode).toBe('SMS_001')
    })
  })

  // ==================== loadFromDatabase ====================

  describe('loadFromDatabase', () => {
    it('数据库有完整配置 → 返回 true', async () => {
      (AppDataSource.query as jest.Mock).mockResolvedValue([{
        config_value: JSON.stringify({
          enabled: true,
          accessKeyId: 'db_ak',
          accessKeySecret: 'db_sk',
          signName: 'DBSign',
          templateCode: 'SMS_DB',
          templates: { VERIFY_CODE: 'SMS_VC' }
        })
      }])

      const result = await aliyunSmsService.loadFromDatabase()
      expect(result).toBe(true)
      expect((aliyunSmsService as any).config.accessKeyId).toBe('db_ak')
    })

    it('数据库无记录 → 返回 false', async () => {
      (AppDataSource.query as jest.Mock).mockResolvedValue([])
      const result = await aliyunSmsService.loadFromDatabase()
      expect(result).toBe(false)
    })

    it('数据库配置不完整(enabled=false) → 返回 false', async () => {
      (AppDataSource.query as jest.Mock).mockResolvedValue([{
        config_value: JSON.stringify({ enabled: false, accessKeyId: '', accessKeySecret: '' })
      }])
      const result = await aliyunSmsService.loadFromDatabase()
      expect(result).toBe(false)
    })

    it('数据库异常 → 返回 false', async () => {
      (AppDataSource.query as jest.Mock).mockRejectedValue(new Error('db error'))
      const result = await aliyunSmsService.loadFromDatabase()
      expect(result).toBe(false)
    })
  })

  // ==================== sendSms ====================

  describe('sendSms / sendVerificationCode', () => {
    it('未配置 → 模拟发送成功', async () => {
      ;(aliyunSmsService as any).config = null
      const result = await aliyunSmsService.sendVerificationCode('13800138000', '1234')
      expect(result.success).toBe(true)
      expect(result.message).toContain('开发模式')
    })

    it('无 accessKeyId → 模拟发送', async () => {
      ;(aliyunSmsService as any).config = { accessKeyId: '', accessKeySecret: '', signName: '' }
      const result = await aliyunSmsService.sendSms('13800138000', 'VERIFY_CODE', { code: '1234' })
      expect(result.success).toBe(true)
    })

    it('有配置 + 无模板 → 失败', async () => {
      ;(aliyunSmsService as any).config = {
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
        signName: 'Sign',
        templateCode: '',
        templates: {}
      }
      const result = await aliyunSmsService.sendSms('13800138000', 'UNKNOWN_TYPE', { code: '1234' })
      expect(result.success).toBe(false)
      expect(result.message).toContain('未配置')
    })

    it('有配置 + 模板存在 + API返回OK → 成功', async () => {
      ;(aliyunSmsService as any).config = {
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
        signName: 'Sign',
        templates: { VERIFY_CODE: 'SMS_001' }
      }
      mockFetch.mockResolvedValue({
        json: async () => ({ Code: 'OK', Message: 'OK', RequestId: 'req-1' })
      })

      const result = await aliyunSmsService.sendVerificationCode('13800138000', '5678')
      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('有配置 + API返回错误码 → 失败', async () => {
      ;(aliyunSmsService as any).config = {
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
        signName: 'Sign',
        templates: { VERIFY_CODE: 'SMS_001' }
      }
      mockFetch.mockResolvedValue({
        json: async () => ({ Code: 'isv.BUSINESS_LIMIT_CONTROL', Message: 'limit' })
      })

      const result = await aliyunSmsService.sendVerificationCode('13800138000', '5678')
      expect(result.success).toBe(false)
      expect(result.message).toContain('频率过快')
    })

    it('网络异常 → 失败', async () => {
      ;(aliyunSmsService as any).config = {
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
        signName: 'Sign',
        templates: { VERIFY_CODE: 'SMS_001' }
      }
      mockFetch.mockRejectedValue(new Error('network'))

      const result = await aliyunSmsService.sendVerificationCode('13800138000', '5678')
      expect(result.success).toBe(false)
      expect(result.message).toContain('网络请求失败')
    })

    it('旧版 templateCode 兜底', async () => {
      ;(aliyunSmsService as any).config = {
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
        signName: 'Sign',
        templateCode: 'SMS_LEGACY'
      }
      mockFetch.mockResolvedValue({
        json: async () => ({ Code: 'OK' })
      })

      const result = await aliyunSmsService.sendSms('13800138000', 'VERIFY_CODE', { code: '1' })
      expect(result.success).toBe(true)
    })
  })

  // ==================== private helpers ====================

  describe('getErrorMessage', () => {
    it('已知错误码 → 中文提示', () => {
      const fn = (aliyunSmsService as any).getErrorMessage.bind(aliyunSmsService)
      expect(fn('isv.MOBILE_NUMBER_ILLEGAL')).toBe('手机号格式错误')
      expect(fn('isv.AMOUNT_NOT_ENOUGH')).toBe('账户余额不足')
      expect(fn('SignatureDoesNotMatch')).toContain('签名错误')
      expect(fn('InvalidAccessKeyId.NotFound')).toContain('不存在')
    })

    it('未知错误码 → 原始 message', () => {
      const fn = (aliyunSmsService as any).getErrorMessage.bind(aliyunSmsService)
      expect(fn('UNKNOWN_CODE', 'raw msg')).toBe('raw msg')
    })

    it('都为空 → 未知错误', () => {
      const fn = (aliyunSmsService as any).getErrorMessage.bind(aliyunSmsService)
      expect(fn(undefined, undefined)).toBe('未知错误')
    })
  })

  describe('buildParams', () => {
    it('返回包含所有必需字段的参数对象', () => {
      ;(aliyunSmsService as any).config = {
        accessKeyId: 'testAK',
        accessKeySecret: 'testSK',
        signName: 'TestSign'
      }
      const fn = (aliyunSmsService as any).buildParams.bind(aliyunSmsService)
      const params = fn('13800138000', 'SMS_001', { code: '1234' })

      expect(params.AccessKeyId).toBe('testAK')
      expect(params.Action).toBe('SendSms')
      expect(params.PhoneNumbers).toBe('13800138000')
      expect(params.SignName).toBe('TestSign')
      expect(params.TemplateCode).toBe('SMS_001')
      expect(JSON.parse(params.TemplateParam)).toEqual({ code: '1234' })
    })
  })

  describe('sign', () => {
    it('生成非空 base64 签名', () => {
      ;(aliyunSmsService as any).config = {
        accessKeyId: 'testAK',
        accessKeySecret: 'testSK',
        signName: 'TestSign'
      }
      const fn = (aliyunSmsService as any).sign.bind(aliyunSmsService)
      const sig = fn({ Action: 'SendSms', AccessKeyId: 'testAK' })
      expect(typeof sig).toBe('string')
      expect(sig.length).toBeGreaterThan(0)
    })
  })
})
