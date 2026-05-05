/**
 * tenantAuth 租户认证中间件单元测试
 */
import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const SECRET = 'test-secret'

// Mock dependencies
jest.mock('../../config/jwt', () => ({
  JwtConfig: { getAccessTokenSecret: jest.fn().mockReturnValue(SECRET) }
}))
jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/deploy', () => ({
  deployConfig: { isSaaS: jest.fn().mockReturnValue(true) }
}))
jest.mock('../../utils/tenantContext', () => ({
  TenantContextManager: { setContext: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

import { tenantAuth, optionalTenantAuth, getTenantId, isTenantRequest, TenantRequest } from '../../middleware/tenantAuth'
import { AppDataSource } from '../../config/database'
import { deployConfig } from '../../config/deploy'
import { TenantContextManager } from '../../utils/tenantContext'

const mockReq = (overrides: Partial<TenantRequest> = {}): Partial<TenantRequest> => ({
  headers: {},
  ...overrides,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('tenantAuth', () => {
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    next = jest.fn()
    ;(deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
  })

  // ==================== 无 token ====================

  it('无 token → 401', async () => {
    const req = mockReq()
    const res = mockRes()
    await tenantAuth(req as TenantRequest, res as Response, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: '未登录，请先登录' })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('无效 token → 401', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer bad-token' } as any })
    const res = mockRes()
    await tenantAuth(req as TenantRequest, res as Response, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '认证失败，请重新登录' })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('过期 token → 401 提示过期', async () => {
    const token = jwt.sign({ userId: 'u1', tenantId: 't1' }, SECRET, { expiresIn: '-1s' })
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
    const res = mockRes()
    await tenantAuth(req as TenantRequest, res as Response, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token已过期，请重新登录' })
    )
  })

  // ==================== SaaS 模式 ====================

  describe('SaaS 模式', () => {
    it('token 缺少 tenantId → 403', async () => {
      const token = jwt.sign({ userId: 'u1' }, SECRET, { expiresIn: '1h' })
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '租户信息缺失，请重新登录' })
      )
    })

    it('租户不存在 → 403', async () => {
      const token = jwt.sign({ userId: 'u1', tenantId: 't-not-found' }, SECRET, { expiresIn: '1h' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([])
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '租户不存在，请联系管理员' })
      )
    })

    it('租户已禁用 → 403', async () => {
      const token = jwt.sign({ userId: 'u1', tenantId: 't1' }, SECRET, { expiresIn: '1h' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([
        { id: 't1', name: 'Test', status: 'disabled', license_status: 'active', expire_date: null }
      ])
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '企业账户已被禁用，请联系管理员' })
      )
    })

    it('许可证暂停 → 403', async () => {
      const token = jwt.sign({ userId: 'u1', tenantId: 't1' }, SECRET, { expiresIn: '1h' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([
        { id: 't1', name: 'Test', status: 'active', license_status: 'suspended', expire_date: null }
      ])
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '企业授权已暂停，请联系管理员续费' })
      )
    })

    it('租户过期 → 标记 tenantExpired 但放行', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      const token = jwt.sign({ userId: 'u1', tenantId: 't1' }, SECRET, { expiresIn: '1h' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([
        { id: 't1', name: 'Test', status: 'active', license_status: 'active', expire_date: pastDate }
      ])
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)
      expect(next).toHaveBeenCalled()
      expect((req as any).tenantExpired).toBe(true)
      expect((req as any).tenantId).toBe('t1')
    })

    it('正常租户 → 设置 req 属性, 调用 TenantContextManager, 调用 next', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30).toISOString()
      const token = jwt.sign({ userId: 'u1', tenantId: 't1' }, SECRET, { expiresIn: '1h' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValue([
        { id: 't1', name: 'Test', status: 'active', license_status: 'active', expire_date: futureDate }
      ])
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(req.tenantId).toBe('t1')
      expect(req.userId).toBe('u1')
      expect(req.tenantInfo).toBeDefined()
      expect(TenantContextManager.setContext).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', userId: 'u1' })
      )
    })

    it('数据库查询异常 → 500', async () => {
      const token = jwt.sign({ userId: 'u1', tenantId: 't1' }, SECRET, { expiresIn: '1h' })
      ;(AppDataSource.query as jest.Mock).mockRejectedValue(new Error('DB down'))
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(next).not.toHaveBeenCalled()
    })
  })

  // ==================== 私有部署模式 ====================

  describe('私有部署模式', () => {
    beforeEach(() => {
      ;(deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    })

    it('有效 token → 提取 userId, 不查数据库, 直接放行', async () => {
      const token = jwt.sign({ userId: 'u1' }, SECRET, { expiresIn: '1h' })
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(req.userId).toBe('u1')
      expect(AppDataSource.query).not.toHaveBeenCalled()
    })

    it('token 含 tenantId → 保持传递', async () => {
      const token = jwt.sign({ userId: 'u1', tenantId: 't-private' }, SECRET, { expiresIn: '1h' })
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await tenantAuth(req as TenantRequest, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(req.tenantId).toBe('t-private')
    })
  })
})

// ==================== optionalTenantAuth ====================

describe('optionalTenantAuth', () => {
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    next = jest.fn()
    ;(deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
  })

  it('无 token → 直接放行, 不报错', async () => {
    const req = mockReq()
    const res = mockRes()
    await optionalTenantAuth(req as TenantRequest, res as Response, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('有效 token → 走正常认证', async () => {
    const token = jwt.sign({ userId: 'u1' }, SECRET, { expiresIn: '1h' })
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
    const res = mockRes()
    await optionalTenantAuth(req as TenantRequest, res as Response, next)
    expect(next).toHaveBeenCalled()
    expect(req.userId).toBe('u1')
  })
})

// ==================== 工具函数 ====================

describe('getTenantId / isTenantRequest', () => {
  it('getTenantId 返回 req.tenantId', () => {
    expect(getTenantId({ tenantId: 't1' } as TenantRequest)).toBe('t1')
    expect(getTenantId({} as TenantRequest)).toBeUndefined()
  })

  it('isTenantRequest 正确判断', () => {
    expect(isTenantRequest({ tenantId: 't1' } as TenantRequest)).toBe(true)
    expect(isTenantRequest({} as TenantRequest)).toBe(false)
  })
})
