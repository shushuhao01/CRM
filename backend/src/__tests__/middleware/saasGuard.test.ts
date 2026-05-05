/**
 * SaaS 模式守卫中间件单元测试
 */
import { Request, Response, NextFunction } from 'express'

// Mock dependencies
jest.mock('../../services/SaaSGuardService', () => ({
  SaaSGuardService: { isVerified: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

import { requireSaaSMode, checkSaaSMode } from '../../middleware/saasGuard'
import { SaaSGuardService } from '../../services/SaaSGuardService'

const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  path: '/some-saas-path',
  ...overrides,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('requireSaaSMode', () => {
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    next = jest.fn()
  })

  it('SaaS 已验证 → 放行', () => {
    ;(SaaSGuardService.isVerified as jest.Mock).mockReturnValue(true)
    const req = mockReq()
    const res = mockRes()
    requireSaaSMode(req as Request, res as Response, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('SaaS 未验证 → 403 + SAAS_NOT_AUTHORIZED', () => {
    ;(SaaSGuardService.isVerified as jest.Mock).mockReturnValue(false)
    const req = mockReq()
    const res = mockRes()
    requireSaaSMode(req as Request, res as Response, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'SAAS_NOT_AUTHORIZED' })
    )
    expect(next).not.toHaveBeenCalled()
  })
})

describe('checkSaaSMode', () => {
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    next = jest.fn()
  })

  it('SaaS 已验证 → req.isSaaSAuthorized = true, 放行', () => {
    ;(SaaSGuardService.isVerified as jest.Mock).mockReturnValue(true)
    const req = mockReq()
    const res = mockRes()
    checkSaaSMode(req as Request, res as Response, next)
    expect((req as any).isSaaSAuthorized).toBe(true)
    expect(next).toHaveBeenCalled()
  })

  it('SaaS 未验证 → req.isSaaSAuthorized = false, 仍放行', () => {
    ;(SaaSGuardService.isVerified as jest.Mock).mockReturnValue(false)
    const req = mockReq()
    const res = mockRes()
    checkSaaSMode(req as Request, res as Response, next)
    expect((req as any).isSaaSAuthorized).toBe(false)
    expect(next).toHaveBeenCalled()
  })
})
