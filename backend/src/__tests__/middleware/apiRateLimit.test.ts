/**
 * apiRateLimit 限流中间件单元测试
 */
import { Request, Response, NextFunction } from 'express'

// Mock logger
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

// Mock setInterval 防止 apiRateLimit 模块级定时器泄漏
jest.useFakeTimers()

import { apiRateLimit, cleanupRateLimitCache } from '../../middleware/apiRateLimit'

const mockReq = (apiConfig?: any): Partial<Request> => ({
  apiConfig,
} as any)

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.setHeader = jest.fn().mockReturnValue(res)
  return res
}

describe('apiRateLimit', () => {
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    next = jest.fn()
  })

  // ==================== 无 apiConfig ====================

  describe('无 apiConfig', () => {
    it('req 上无 apiConfig → 401', () => {
      const req = mockReq(undefined)
      const res = mockRes()
      apiRateLimit(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 401, message: '未认证的API请求' })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  // ==================== 正常放行 ====================

  describe('正常放行', () => {
    it('首次调用 → 放行并设置限流响应头', () => {
      const req = mockReq({ apiKey: 'key-1', rateLimit: 100 })
      const res = mockRes()
      apiRateLimit(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100')
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '99')
    })

    it('多次调用，剩余次数递减', () => {
      for (let i = 0; i < 3; i++) {
        const req = mockReq({ apiKey: 'key-2', rateLimit: 10 })
        const res = mockRes()
        apiRateLimit(req as Request, res as Response, next)
      }
      // 第4次调用
      const req = mockReq({ apiKey: 'key-2', rateLimit: 10 })
      const res = mockRes()
      apiRateLimit(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '6')
    })
  })

  // ==================== 超过限流 ====================

  describe('超过限流', () => {
    it('达到上限后 → 429', () => {
      const rateLimit = 3
      // 消耗所有额度
      for (let i = 0; i < rateLimit; i++) {
        const req = mockReq({ apiKey: 'key-3', rateLimit })
        const res = mockRes()
        apiRateLimit(req as Request, res as Response, next)
      }

      // 超出限制
      const req = mockReq({ apiKey: 'key-3', rateLimit })
      const res = mockRes()
      const nextFn = jest.fn()
      apiRateLimit(req as Request, res as Response, nextFn)

      expect(res.status).toHaveBeenCalledWith(429)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 429 })
      )
      expect(nextFn).not.toHaveBeenCalled()
    })
  })

  // ==================== 不同 apiKey 互不影响 ====================

  describe('不同 apiKey 互不影响', () => {
    it('key-a 和 key-b 各自计数', () => {
      const reqA = mockReq({ apiKey: 'key-a-iso', rateLimit: 1 })
      const resA = mockRes()
      apiRateLimit(reqA as Request, resA as Response, next) // key-a 第1次
      expect(next).toHaveBeenCalled()

      const reqB = mockReq({ apiKey: 'key-b-iso', rateLimit: 1 })
      const resB = mockRes()
      const nextB = jest.fn()
      apiRateLimit(reqB as Request, resB as Response, nextB) // key-b 第1次
      expect(nextB).toHaveBeenCalled()
    })
  })

  // ==================== cleanupRateLimitCache ====================

  describe('cleanupRateLimitCache', () => {
    it('清理过期记录后不影响新请求', () => {
      // 推进时间让旧记录过期
      jest.advanceTimersByTime(2 * 60 * 60 * 1000) // 2小时
      cleanupRateLimitCache()

      // 新请求应该正常工作
      const req = mockReq({ apiKey: 'key-cleanup', rateLimit: 100 })
      const res = mockRes()
      const nextFn = jest.fn()
      apiRateLimit(req as Request, res as Response, nextFn)
      expect(nextFn).toHaveBeenCalled()
    })
  })
})
