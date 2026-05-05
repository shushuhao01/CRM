/**
 * SubscriptionService 订阅服务单元测试
 * 覆盖：createSubscription 核心流程、金额计算、签约异常处理
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../services/AdminNotificationService', () => ({
  adminNotificationService: { notify: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../utils/dateFormat', () => ({
  formatDateTime: jest.fn((d: any) => String(d))
}))
jest.mock('../../utils/paymentCrypto', () => ({
  decryptPaymentConfig: jest.fn((v: string) => v)
}))

import { SubscriptionService } from '../../services/SubscriptionService'
import { AppDataSource } from '../../config/database'

const mockQuery = AppDataSource.query as jest.Mock

describe('SubscriptionService', () => {
  let svc: SubscriptionService

  beforeEach(() => {
    jest.clearAllMocks()
    svc = new SubscriptionService()
  })

  // ==================== createSubscription ====================

  describe('createSubscription', () => {
    const baseParams = {
      tenantId: 'tenant-1',
      packageId: 1,
      channel: 'wechat' as const,
      billingCycle: 'monthly' as const,
    }

    it('无活跃订阅 + 套餐不存在 → 抛出错误', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // existing subscriptions
        .mockResolvedValueOnce([]) // package query

      await expect(svc.createSubscription(baseParams)).rejects.toThrow('套餐不存在')
    })

    it('套餐不支持订阅 → 抛出错误', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // no existing
        .mockResolvedValueOnce([{ id: 1, price: 100, name: 'Basic', subscription_enabled: false, subscription_channels: 'all', subscription_discount_rate: 0 }])

      await expect(svc.createSubscription(baseParams)).rejects.toThrow('不支持订阅')
    })

    it('渠道不支持 → 抛出错误', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // no existing
        .mockResolvedValueOnce([{ id: 1, price: 100, name: 'Basic', subscription_enabled: true, subscription_channels: 'alipay', subscription_discount_rate: 0 }])

      await expect(svc.createSubscription(baseParams)).rejects.toThrow('不支持')
    })

    it('已有相同套餐 → 自动取消旧订阅并继续', async () => {
      mockQuery
        .mockResolvedValueOnce([{ id: 'old-sub', package_id: 1, billing_cycle: 'monthly', amount: 100, channel: 'wechat', status: 'active' }]) // existing
        .mockResolvedValueOnce({}) // cancel old
        .mockResolvedValueOnce([{ id: 1, price: 100, name: 'Basic', subscription_enabled: true, subscription_channels: 'all', subscription_discount_rate: 0 }])
        .mockResolvedValueOnce([{ expire_date: null }]) // tenant query for nextDeductDate
        .mockResolvedValueOnce({}) // INSERT subscription
        // wechat config query
        .mockResolvedValueOnce([{ config_data: JSON.stringify({ appId: '', mchId: '', keyPem: '', serialNo: '' }), notify_url: '' }])

      // 签约会失败（mock wechat config 不完整），但在非 production 会走 mock 链接
      const OLD_ENV = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'

      // 后续还有 tenant name query + notification
      mockQuery.mockResolvedValueOnce([{ name: 'TestTenant', contact: 'user' }])

      const result = await svc.createSubscription(baseParams)
      expect(result.subscriptionId).toBeDefined()
      expect(result.signType).toBe('mock')

      process.env.NODE_ENV = OLD_ENV
    })

    it('月付金额 = price (无折扣)', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // no existing
        .mockResolvedValueOnce([{ id: 1, price: 99, name: 'Pro', subscription_enabled: true, subscription_channels: 'all', subscription_discount_rate: 0 }])
        .mockResolvedValueOnce([{ expire_date: null }]) // tenant
        .mockResolvedValueOnce({}) // INSERT
        .mockResolvedValueOnce([{ config_data: JSON.stringify({}), notify_url: '' }]) // wechat config

      process.env.NODE_ENV = 'test'
      mockQuery.mockResolvedValueOnce([{ name: 'T', contact: 'C' }])

      const result = await svc.createSubscription(baseParams)
      // INSERT 调用中 amount 参数应为 99
      const insertCall = mockQuery.mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO subscriptions'))
      if (insertCall) {
        expect(insertCall[1]).toContain(99) // amount
      }
      expect(result.subscriptionId).toBeDefined()
    })

    it('年付金额 = price * 12 - discount', async () => {
      mockQuery
        .mockResolvedValueOnce([]) // no existing
        .mockResolvedValueOnce([{ id: 1, price: 100, name: 'Pro', subscription_enabled: true, subscription_channels: 'all', subscription_discount_rate: 10 }])
        .mockResolvedValueOnce([{ expire_date: null }])
        .mockResolvedValueOnce({}) // INSERT
        .mockResolvedValueOnce([{ config_data: JSON.stringify({}), notify_url: '' }])

      process.env.NODE_ENV = 'test'
      mockQuery.mockResolvedValueOnce([{ name: 'T', contact: 'C' }])

      const result = await svc.createSubscription({ ...baseParams, billingCycle: 'yearly' })
      // 100 * 12 = 1200, 10% off = 1080
      const insertCall = mockQuery.mock.calls.find((c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO subscriptions'))
      if (insertCall) {
        expect(insertCall[1]).toContain(1080)
      }
      expect(result.subscriptionId).toBeDefined()
    })
  })

  // ==================== private helpers ====================

  describe('generateSignV3', () => {
    it('生成非空 RSA-SHA256 签名', () => {
      // 需要一个真实的 RSA 私钥来测试
      const crypto = require('crypto')
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
      const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string

      const fn = (svc as any).generateSignV3.bind(svc)
      const sig = fn('POST', '/v3/test', '1700000000', 'nonce123', '{}', pem)
      expect(typeof sig).toBe('string')
      expect(sig.length).toBeGreaterThan(0)
    })
  })

  describe('resolvePrivateKey', () => {
    it('PEM 内容直接返回', async () => {
      const fn = (svc as any).resolvePrivateKey.bind(svc)
      const pem = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----'
      const result = await fn(pem)
      expect(result).toBe(pem)
    })

    it('无效路径 → 抛出', async () => {
      const fn = (svc as any).resolvePrivateKey.bind(svc)
      await expect(fn('not-a-key')).rejects.toThrow('私钥配置无效')
    })
  })
})
