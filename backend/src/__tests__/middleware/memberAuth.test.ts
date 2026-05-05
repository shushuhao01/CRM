/**
 * memberAuth 会员认证中间件单元测试
 */
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../config/jwt', () => ({
  JwtConfig: { getAccessTokenSecret: jest.fn().mockReturnValue('test-secret') }
}))

import { memberAuth, generateMemberToken, verifyMemberToken } from '../../middleware/memberAuth'
import { AppDataSource } from '../../config/database'

const MEMBER_SECRET = 'test-secret'

const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  ...overrides,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('memberAuth', () => {
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    next = jest.fn()
  })

  // ==================== generateMemberToken ====================

  describe('generateMemberToken', () => {
    it('生成有效的JWT token', () => {
      const token = generateMemberToken({
        tenantId: 't1',
        tenantCode: 'TC001',
        phone: '13800138000',
      })
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
    })

    it('token payload 包含 type=member', () => {
      const token = generateMemberToken({
        tenantId: 't1',
        tenantCode: 'TC001',
        phone: '13800138000',
      })
      const decoded = jwt.decode(token) as any
      expect(decoded.type).toBe('member')
      expect(decoded.tenantId).toBe('t1')
      expect(decoded.tenantCode).toBe('TC001')
      expect(decoded.phone).toBe('13800138000')
    })
  })

  // ==================== verifyMemberToken ====================

  describe('verifyMemberToken', () => {
    it('有效 token → 返回 payload', () => {
      const token = generateMemberToken({
        tenantId: 't1',
        tenantCode: 'TC001',
        phone: '13800138000',
      })
      const result = verifyMemberToken(token)
      expect(result).not.toBeNull()
      expect(result!.type).toBe('member')
      expect(result!.tenantId).toBe('t1')
    })

    it('无效 token → 返回 null', () => {
      expect(verifyMemberToken('invalid-token')).toBeNull()
    })

    it('过期 token → 返回 null', () => {
      const token = jwt.sign(
        { type: 'member', tenantId: 't1', tenantCode: 'TC001', phone: '13800138000' },
        MEMBER_SECRET,
        { expiresIn: '-1s', issuer: 'yunke-crm-member' }
      )
      expect(verifyMemberToken(token)).toBeNull()
    })

    it('type 不是 member → 返回 null', () => {
      const token = jwt.sign(
        { type: 'admin', tenantId: 't1' },
        MEMBER_SECRET,
        { expiresIn: '1h', issuer: 'yunke-crm-member' }
      )
      expect(verifyMemberToken(token)).toBeNull()
    })
  })

  // ==================== memberAuth middleware ====================

  describe('中间件主流程', () => {
    it('无 Authorization header → 401', async () => {
      const req = mockReq()
      const res = mockRes()
      await memberAuth(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '请先登录会员中心' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('非 Bearer 格式 → 401', async () => {
      const req = mockReq({ headers: { authorization: 'Basic abc123' } as any })
      const res = mockRes()
      await memberAuth(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })

    it('无效 token → 401 登录已过期', async () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid-token' } as any })
      const res = mockRes()
      await memberAuth(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '登录已过期，请重新登录' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('有效 token 但租户不存在 → 401', async () => {
      const token = generateMemberToken({ tenantId: 't1', tenantCode: 'TC001', phone: '13800138000' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([])

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await memberAuth(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '账号不存在' })
      )
    })

    it('有效 token 但租户已禁用 → 403', async () => {
      const token = generateMemberToken({ tenantId: 't1', tenantCode: 'TC001', phone: '13800138000' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([{
        id: 't1', code: 'TC001', name: '测试企业', phone: '13800138000',
        email: null, contact: '张三', status: 'disabled',
        package_id: 'pkg1', expire_date: null, license_status: 'active',
        max_users: 10, max_storage_gb: 5, user_count: 3, used_storage_mb: 100
      }])

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await memberAuth(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '账号已被禁用，请联系客服' })
      )
    })

    it('有效 token 但租户已删除 → 403', async () => {
      const token = generateMemberToken({ tenantId: 't1', tenantCode: 'TC001', phone: '13800138000' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([{
        id: 't1', code: 'TC001', name: '测试企业', phone: '13800138000',
        email: null, contact: '张三', status: 'deleted',
        package_id: 'pkg1', expire_date: null, license_status: 'active',
        max_users: 10, max_storage_gb: 5, user_count: 3, used_storage_mb: 100
      }])

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await memberAuth(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('有效 token + 正常租户 → 注入 memberTenant, 调用 next', async () => {
      const token = generateMemberToken({ tenantId: 't1', tenantCode: 'TC001', phone: '13800138000' })
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([{
        id: 't1', code: 'TC001', name: '测试企业', phone: '13800138000',
        email: 'test@test.com', contact: '张三', status: 'active',
        package_id: 'pkg1', expire_date: '2027-01-01', license_status: 'active',
        max_users: 10, max_storage_gb: 5, user_count: 3, used_storage_mb: 100
      }])

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await memberAuth(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect((req as any).memberTenant).toBeDefined()
      expect((req as any).memberTenant.id).toBe('t1')
      expect((req as any).memberTenant.code).toBe('TC001')
      expect((req as any).memberTenant.name).toBe('测试企业')
      expect((req as any).memberTenant.status).toBe('active')
    })

    it('数据库异常 → 500', async () => {
      const token = generateMemberToken({ tenantId: 't1', tenantCode: 'TC001', phone: '13800138000' })
      ;(AppDataSource.query as jest.Mock).mockRejectedValueOnce(new Error('DB down'))

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await memberAuth(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '认证服务异常' })
      )
    })
  })
})
