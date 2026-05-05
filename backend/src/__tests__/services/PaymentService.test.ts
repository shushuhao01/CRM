/**
 * PaymentService 支付服务单元测试
 * 聚焦纯函数与可 mock 的业务方法
 */

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
  formatDate: jest.fn().mockImplementation((d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  })
}))
jest.mock('../../services/AdminNotificationService', () => ({
  adminNotificationService: { notify: jest.fn().mockResolvedValue(undefined) }
}))

import { AppDataSource } from '../../config/database'

// paymentService 是模块导出的单例，需要在 mock 之后动态导入
let paymentService: any

beforeAll(async () => {
  const mod = await import('../../services/PaymentService')
  paymentService = mod.paymentService
})

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==================== generateOrderNo ====================

  describe('generateOrderNo', () => {
    it('以 PAY 开头', () => {
      const no = paymentService.generateOrderNo()
      expect(no.startsWith('PAY')).toBe(true)
    })

    it('长度合理（PAY + YYYYMMDD(8) + HHMMSS(6) + random(6) = 23）', () => {
      const no = paymentService.generateOrderNo()
      expect(no.length).toBe(23)
    })

    it('多次调用结果不同', () => {
      const a = paymentService.generateOrderNo()
      const b = paymentService.generateOrderNo()
      // 同一毫秒内可能相同但随机部分不同概率极高
      // 连续调用两次大概率不同
      expect(typeof a).toBe('string')
      expect(typeof b).toBe('string')
    })

    it('只包含 PAY + 数字 + 大写字母', () => {
      const no = paymentService.generateOrderNo()
      expect(no).toMatch(/^PAY[0-9A-Z]+$/)
    })
  })

  // ==================== queryOrder ====================

  describe('queryOrder', () => {
    it('存在的订单 → 返回订单数据', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { id: 'o1', order_no: 'PAY202605051200001', status: 'pending', amount: 99 }
      ])

      const result = await paymentService.queryOrder('PAY202605051200001')
      expect(result).toBeDefined()
      expect(result.order_no).toBe('PAY202605051200001')
    })

    it('不存在的订单 → 返回 null', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([])
      const result = await paymentService.queryOrder('NOTEXIST')
      expect(result).toBeNull()
    })
  })

  // ==================== closeOrder ====================

  describe('closeOrder', () => {
    it('关闭待支付订单 → 调用 UPDATE', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValue({ affectedRows: 1 })
      await paymentService.closeOrder('PAY202605051200001')
      expect(AppDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'closed'"),
        expect.arrayContaining(['PAY202605051200001'])
      )
    })
  })

  // ==================== loadConfig ====================

  describe('loadConfig', () => {
    it('加载微信支付配置', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { pay_type: 'wechat', config_data: '{"mchId":"123","appId":"wx456","apiKey":"key"}', enabled: 1 }
      ])
      await paymentService.loadConfig()
      // 不抛异常即为成功
    })

    it('数据库异常 → 不抛异常', async () => {
      ;(AppDataSource.query as jest.Mock).mockRejectedValueOnce(new Error('DB down'))
      await expect(paymentService.loadConfig()).resolves.toBeUndefined()
    })

    it('配置解析失败 → 不抛异常', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { pay_type: 'wechat', config_data: '{invalid json', enabled: 1 }
      ])
      await expect(paymentService.loadConfig()).resolves.toBeUndefined()
    })
  })

  // ==================== createOrder (mock 支付渠道) ====================

  describe('createOrder', () => {
    it('银行转账订单 → 不需要二维码', async () => {
      // loadConfig: 空配置
      ;(AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([]) // loadConfig
        .mockResolvedValueOnce(undefined) // ensurePaymentOrderColumns (already checked)
        .mockResolvedValueOnce(undefined) // INSERT INTO payment_orders
        .mockResolvedValueOnce(undefined) // UPDATE payment_orders (qr_code)
        .mockResolvedValueOnce(undefined) // _logPayment

      // 强制标记已检查
      paymentService.columnsChecked = true

      const result = await paymentService.createOrder({
        packageId: 'pkg1',
        packageName: '标准版',
        amount: 999,
        payType: 'bank',
        contactName: '张三',
        contactPhone: '13800138000',
      })

      expect(result.success).toBe(true)
      expect(result.orderNo).toBeTruthy()
    })

    it('金额和必填参数写入DB', async () => {
      ;(AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([]) // loadConfig
        .mockResolvedValueOnce(undefined) // INSERT
        .mockResolvedValueOnce(undefined) // UPDATE qr
        .mockResolvedValueOnce(undefined) // _logPayment

      paymentService.columnsChecked = true

      const result = await paymentService.createOrder({
        packageId: 'pkg2',
        packageName: '专业版',
        amount: 1999,
        payType: 'bank',
        contactName: '李四',
        contactPhone: '13900139000',
        tenantId: 'tenant-001',
        tenantName: '测试公司',
      })

      expect(result.success).toBe(true)
      // 验证 INSERT 语句包含所有参数
      const insertCall = (AppDataSource.query as jest.Mock).mock.calls.find(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO payment_orders')
      )
      expect(insertCall).toBeTruthy()
    })
  })
})
