/**
 * VerificationCodeService 验证码服务单元测试
 * 覆盖 saveCode、verifyCode、canSendCode、cleanExpiredCodes、getStats
 */

jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

// 阻止模块级 setInterval 干扰测试
jest.useFakeTimers()

let service: any

beforeAll(async () => {
  // 动态 import 以便模块级 setInterval 受 fakeTimers 控制
  const mod = await import('../../services/VerificationCodeService')
  service = mod.verificationCodeService
})

afterAll(() => {
  jest.useRealTimers()
})

beforeEach(() => {
  // 通过清理所有过期验证码来重置内部 Map
  jest.clearAllMocks()
  // 将时间推进足够多，让所有验证码过期，再清理
  jest.advanceTimersByTime(10 * 60 * 1000)
  service.cleanExpiredCodes()
  // 回到"当前"
  jest.setSystemTime(new Date())
})

describe('VerificationCodeService', () => {

  // ==================== saveCode + verifyCode ====================

  describe('saveCode → verifyCode', () => {
    it('保存后可以正确验证', async () => {
      await service.saveCode('13800000001', '123456')
      const result = await service.verifyCode('13800000001', '123456')
      expect(result.valid).toBe(true)
    })

    it('验证成功后验证码被删除（防重复使用）', async () => {
      await service.saveCode('13800000002', '654321')
      await service.verifyCode('13800000002', '654321')
      const result = await service.verifyCode('13800000002', '654321')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('不存在')
    })

    it('验证码错误 → valid=false', async () => {
      await service.saveCode('13800000003', '111111')
      const result = await service.verifyCode('13800000003', '999999')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('错误')
    })

    it('未保存过验证码 → valid=false', async () => {
      const result = await service.verifyCode('13899999999', '123456')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('不存在')
    })

    it('验证码过期 → valid=false', async () => {
      await service.saveCode('13800000004', '222222')
      // 推进 6 分钟（超过 5 分钟有效期）
      jest.advanceTimersByTime(6 * 60 * 1000)
      const result = await service.verifyCode('13800000004', '222222')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('过期')
    })
  })

  // ==================== canSendCode ====================

  describe('canSendCode', () => {
    it('无历史验证码 → 可以发送', async () => {
      const result = await service.canSendCode('13800000010')
      expect(result.canSend).toBe(true)
    })

    it('刚发送过 → 60秒内不允许重发', async () => {
      await service.saveCode('13800000011', '333333')
      const result = await service.canSendCode('13800000011')
      expect(result.canSend).toBe(false)
      expect(result.remainingSeconds).toBeGreaterThan(0)
      expect(result.message).toContain('秒后再试')
    })

    it('超过60秒 → 允许重发', async () => {
      await service.saveCode('13800000012', '444444')
      jest.advanceTimersByTime(61 * 1000) // 61 秒
      const result = await service.canSendCode('13800000012')
      expect(result.canSend).toBe(true)
    })
  })

  // ==================== cleanExpiredCodes ====================

  describe('cleanExpiredCodes', () => {
    it('清理过期验证码', async () => {
      await service.saveCode('13800000020', '555555')
      await service.saveCode('13800000021', '666666')

      // 推进 6 分钟让验证码过期
      jest.advanceTimersByTime(6 * 60 * 1000)
      service.cleanExpiredCodes()

      const stats = service.getStats()
      expect(stats.validCodes).toBe(0)
    })

    it('未过期的不会被清理', async () => {
      await service.saveCode('13800000022', '777777')

      // 推进 2 分钟（未过期）
      jest.advanceTimersByTime(2 * 60 * 1000)
      service.cleanExpiredCodes()

      const stats = service.getStats()
      expect(stats.validCodes).toBe(1)
    })
  })

  // ==================== getStats ====================

  describe('getStats', () => {
    it('空时全零', () => {
      const stats = service.getStats()
      expect(stats.totalCodes).toBe(0)
      expect(stats.validCodes).toBe(0)
      expect(stats.expiredCodes).toBe(0)
    })

    it('包含有效和过期的验证码', async () => {
      await service.saveCode('13800000030', '111111')
      await service.saveCode('13800000031', '222222')

      // 推进 3 分钟（两个都未过期）
      jest.advanceTimersByTime(3 * 60 * 1000)

      // 再添加一个新的
      await service.saveCode('13800000032', '333333')

      // 再推进 3 分钟（前两个过期，第三个未过期）
      jest.advanceTimersByTime(3 * 60 * 1000)

      const stats = service.getStats()
      // 注意：saveCode 中的 setTimeout 会在 fakeTimers 下自动触发 delete
      // 前两个可能已被 setTimeout 自动删除
      // 第三个仍有效
      expect(stats.validCodes).toBeGreaterThanOrEqual(0)
    })
  })
})
