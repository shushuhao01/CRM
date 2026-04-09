/**
 * 认证中间件 authenticateToken 单元测试
 */
import { Request, Response, NextFunction } from 'express'

// Mock dependencies before importing
jest.mock('../config/jwt', () => ({
  JwtConfig: {
    verifyAccessToken: jest.fn()
  }
}))
jest.mock('../config/database', () => ({
  getDataSource: jest.fn()
}))
jest.mock('../services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }
}))
jest.mock('../config/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../utils/tenantContext', () => ({
  TenantContextManager: { setTenantId: jest.fn(), setContext: jest.fn() }
}))

import { authenticateToken, clearUserAuthCache } from '../middleware/auth'
import { JwtConfig } from '../config/jwt'
import { cacheService } from '../services/CacheService'

const mockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers: headers as any
})

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockNext: NextFunction = jest.fn()

describe('authenticateToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('无 token 返回 401', async () => {
    const req = mockRequest({})
    const res = mockResponse()

    await authenticateToken(req as Request, res as Response, mockNext)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'TOKEN_MISSING' })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })

  test('无效 token 返回 401（TOKEN_INVALID）', async () => {
    (JwtConfig.verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new Error('invalid token')
    })

    const req = mockRequest({ authorization: 'Bearer invalid-token' })
    const res = mockResponse()

    await authenticateToken(req as Request, res as Response, mockNext)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'TOKEN_INVALID' })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })

  test('有效 token + 缓存命中（用户 active） → 设置 req.user 并调用 next', async () => {
    const payload = { userId: 'u1', tenantId: 't1', username: 'test', role: 'admin' }
    ;(JwtConfig.verifyAccessToken as jest.Mock).mockReturnValue(payload)
    ;(cacheService.get as jest.Mock).mockReturnValue({
      id: 'u1', status: 'active', role: 'admin', tenantId: 't1'
    })

    const req = mockRequest({ authorization: 'Bearer valid-token' })
    const res = mockResponse()

    await authenticateToken(req as Request, res as Response, mockNext)

    expect(req.user).toEqual(payload)
    expect((req as any).currentUser).toBeTruthy()
    expect(mockNext).toHaveBeenCalled()
  })

  test('过期 token 返回 401（TOKEN_EXPIRED）', async () => {
    (JwtConfig.verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new Error('jwt expired')
    })

    const req = mockRequest({ authorization: 'Bearer expired-token' })
    const res = mockResponse()

    await authenticateToken(req as Request, res as Response, mockNext)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'TOKEN_EXPIRED' })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })
})

describe('clearUserAuthCache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('带 tenantId 清除两个缓存键', () => {
    clearUserAuthCache('user1', 'tenant1')
    expect(cacheService.delete).toHaveBeenCalledWith('auth:user:tenant1:user1')
    expect(cacheService.delete).toHaveBeenCalledWith('auth:user:default:user1')
  })

  test('不带 tenantId 只清除默认键', () => {
    clearUserAuthCache('user1')
    expect(cacheService.delete).toHaveBeenCalledWith('auth:user:default:user1')
    expect(cacheService.delete).toHaveBeenCalledTimes(1)
  })
})

