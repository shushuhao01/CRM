/**
 * WechatPayService 微信支付服务单元测试
 * 聚焦签名生成、回调解密、回调处理等核心方法
 */
import crypto from 'crypto'

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../utils/paymentCrypto', () => ({
  decryptPaymentConfig: jest.fn().mockImplementation((val: string) => val)
}))
jest.mock('../../utils/dateFormat', () => ({
  formatDateTime: jest.fn().mockReturnValue('2026-05-05 12:00:00'),
  formatDate: jest.fn().mockReturnValue('2026-05-05')
}))
jest.mock('../../services/PaymentService', () => ({
  paymentService: {
    logPayment: jest.fn().mockResolvedValue(undefined),
    updateOrderStatus: jest.fn().mockResolvedValue(null),
  }
}))
jest.mock('../../services/NotificationTemplateService', () => ({
  notificationTemplateService: { sendByTemplate: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../utils/adminAccountHelper', () => ({
  createDefaultAdmin: jest.fn().mockResolvedValue({ username: 'admin', password: 'Aa123456' })
}))

import { WechatPayService } from '../../services/WechatPayService'
import { AppDataSource } from '../../config/database'
import { paymentService } from '../../services/PaymentService'

describe('WechatPayService', () => {
  let service: WechatPayService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new WechatPayService()
  })

  // ==================== decryptCallbackData ====================

  describe('decryptCallbackData', () => {
    it('有效的 AES-256-GCM 密文 → 正确解密', () => {
      // 构造一个合法的 AES-256-GCM 加密数据
      const apiKey = '0123456789abcdef0123456789abcdef' // 32字节
      const nonce = '0123456789ab' // 12字节
      const associatedData = 'transaction'
      const plainObj = { out_trade_no: 'PAY20260505001', trade_state: 'SUCCESS' }

      const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(apiKey, 'utf8'),
        Buffer.from(nonce, 'utf8')
      )
      cipher.setAAD(Buffer.from(associatedData, 'utf8'))
      let encrypted = cipher.update(JSON.stringify(plainObj), 'utf8')
      encrypted = Buffer.concat([encrypted, cipher.final()])
      const authTag = cipher.getAuthTag()
      const ciphertext = Buffer.concat([encrypted, authTag]).toString('base64')

      const result = service.decryptCallbackData(ciphertext, associatedData, nonce, apiKey)
      expect(result.out_trade_no).toBe('PAY20260505001')
      expect(result.trade_state).toBe('SUCCESS')
    })

    it('无效密文 → 抛出解密失败', () => {
      expect(() => {
        service.decryptCallbackData(
          'invalid-base64-data',
          'transaction',
          '012345678901',
          '0123456789abcdef0123456789abcdef'
        )
      }).toThrow('解密回调数据失败')
    })

    it('错误的 apiKey → 抛出解密失败', () => {
      const apiKey = '0123456789abcdef0123456789abcdef'
      const nonce = '0123456789ab'
      const associatedData = 'transaction'
      const plainObj = { out_trade_no: 'TEST001' }

      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(apiKey, 'utf8'), Buffer.from(nonce, 'utf8'))
      cipher.setAAD(Buffer.from(associatedData, 'utf8'))
      let encrypted = cipher.update(JSON.stringify(plainObj), 'utf8')
      encrypted = Buffer.concat([encrypted, cipher.final()])
      const authTag = cipher.getAuthTag()
      const ciphertext = Buffer.concat([encrypted, authTag]).toString('base64')

      expect(() => {
        service.decryptCallbackData(
          ciphertext,
          associatedData,
          nonce,
          'wrongkeywrongkeywrongkeywrongkey' // 错误密钥
        )
      }).toThrow('解密回调数据失败')
    })
  })

  // ==================== handleCallback ====================

  describe('handleCallback', () => {
    it('非 TRANSACTION.SUCCESS 事件 → 忽略', async () => {
      const result = await service.handleCallback({
        event_type: 'REFUND.SUCCESS',
        resource: {}
      })
      expect(result.code).toBe('SUCCESS')
      expect(result.message).toContain('忽略')
    })

    it('支付成功回调 + 订单存在 + 状态 pending → 更新为 paid', async () => {
      // Mock getConfig
      const apiKey = '0123456789abcdef0123456789abcdef'
      const nonce = '0123456789ab'
      const associatedData = 'transaction'
      const plainObj = {
        out_trade_no: 'PAY20260505001',
        transaction_id: 'wx_txn_001',
        trade_state: 'SUCCESS',
        amount: { total: 9900 }
      }

      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(apiKey, 'utf8'), Buffer.from(nonce, 'utf8'))
      cipher.setAAD(Buffer.from(associatedData, 'utf8'))
      let encrypted = cipher.update(JSON.stringify(plainObj), 'utf8')
      encrypted = Buffer.concat([encrypted, cipher.final()])
      const authTag = cipher.getAuthTag()
      const ciphertext = Buffer.concat([encrypted, authTag]).toString('base64')

      // Mock DB: getConfig
      ;(AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{
          config_data: JSON.stringify({ appId: 'wx123', mchId: 'mch123', apiKeyV3: apiKey }),
          notify_url: 'https://example.com/notify'
        }])
        // Mock DB: query order
        .mockResolvedValueOnce([{ id: 'order-001', tenant_id: 'tenant-001', status: 'pending' }])

      const result = await service.handleCallback({
        event_type: 'TRANSACTION.SUCCESS',
        resource: {
          ciphertext,
          associated_data: associatedData,
          nonce,
        }
      })

      expect(result.code).toBe('SUCCESS')
      expect(paymentService.logPayment).toHaveBeenCalled()
      expect(paymentService.updateOrderStatus).toHaveBeenCalledWith(
        'PAY20260505001',
        'paid',
        expect.objectContaining({ tradeNo: 'wx_txn_001' })
      )
    })

    it('订单已 paid → 不重复处理', async () => {
      const apiKey = '0123456789abcdef0123456789abcdef'
      const nonce = '0123456789ab'
      const associatedData = 'transaction'
      const plainObj = { out_trade_no: 'PAY002', transaction_id: 'wx_002', trade_state: 'SUCCESS', amount: { total: 100 } }

      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(apiKey, 'utf8'), Buffer.from(nonce, 'utf8'))
      cipher.setAAD(Buffer.from(associatedData, 'utf8'))
      let encrypted = cipher.update(JSON.stringify(plainObj), 'utf8')
      encrypted = Buffer.concat([encrypted, cipher.final()])
      const ciphertext = Buffer.concat([encrypted, cipher.getAuthTag()]).toString('base64')

      ;(AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{
          config_data: JSON.stringify({ appId: 'wx', mchId: 'mch', apiKeyV3: apiKey }),
          notify_url: 'https://example.com/notify'
        }])
        .mockResolvedValueOnce([{ id: 'o2', tenant_id: 't2', status: 'paid' }])

      const result = await service.handleCallback({
        event_type: 'TRANSACTION.SUCCESS',
        resource: { ciphertext, associated_data: associatedData, nonce }
      })

      expect(result.code).toBe('SUCCESS')
      expect(result.message).toBe('订单已处理')
      expect(paymentService.updateOrderStatus).not.toHaveBeenCalled()
    })

    it('异常 → 返回 FAIL', async () => {
      ;(AppDataSource.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'))

      const result = await service.handleCallback({
        event_type: 'TRANSACTION.SUCCESS',
        resource: { ciphertext: 'bad', associated_data: 'x', nonce: 'y' }
      })

      expect(result.code).toBe('FAIL')
      expect(paymentService.logPayment).toHaveBeenCalledWith(
        expect.objectContaining({ result: 'fail' })
      )
    })
  })

  // ==================== verifySignatureV3 ====================

  describe('verifySignatureV3', () => {
    it('临时实现总是返回 true', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([{
        config_data: JSON.stringify({ appId: 'wx', mchId: 'mch' }),
        notify_url: 'https://example.com/notify'
      }])

      const result = await service.verifySignatureV3('ts', 'nonce', 'body', 'sig', 'serial')
      expect(result).toBe(true)
    })
  })
})
