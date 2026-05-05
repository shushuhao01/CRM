/**
 * adminAuthMiddleware 单元测试
 */
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Mock dependencies
jest.mock('../../config/jwt', () => ({
  JwtConfig: { getAccessTokenSecret: jest.fn().mockReturnValue('test-secret') }
}))
jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

import { adminAuthMiddleware } from '../../middleware/adminAuth'
import { AppDataSource } from '../../config/database'

const SECRET = 'test-secret'

const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  path: '/some-admin-path',
  method: 'GET',
  headers: {},
  ...overrides,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('adminAuthMiddleware', () => {
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    next = jest.fn()
  })

  // ==================== 公开路由跳过 ====================

  describe('公开路由放行', () => {
    it('/auth/login 直接放行', async () => {
      const req = mockReq({ path: '/auth/login' })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('GET /auth/captcha 直接放行', async () => {
      const req = mockReq({ path: '/auth/captcha', method: 'GET' })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })

    it('GET /versions/latest 直接放行', async () => {
      const req = mockReq({ path: '/versions/latest', method: 'GET' })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })

    it('GET /public/system-config 直接放行', async () => {
      const req = mockReq({ path: '/public/system-config', method: 'GET' })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })
  })

  // ==================== 无 token ====================

  describe('无 token', () => {
    it('无 Authorization header → 401', async () => {
      const req = mockReq()
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: '未提供认证令牌' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('Authorization header 非 Bearer 格式 → 401', async () => {
      const req = mockReq({ headers: { authorization: 'Basic abc123' } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })

  // ==================== 无效/过期 token ====================

  describe('无效/过期 token', () => {
    it('无效 token → 401', async () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid-token' } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: '无效的认证令牌' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('过期 token → 401 提示过期', async () => {
      const token = jwt.sign(
        { isAdmin: true, adminId: 1, role: 'admin' },
        SECRET,
        { expiresIn: '-1s' }
      )
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '登录已过期，请重新登录' })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  // ==================== 非管理员 token ====================

  describe('非管理员 token', () => {
    it('isAdmin 为 false → 403', async () => {
      const token = jwt.sign({ isAdmin: false, userId: 'u1' }, SECRET, { expiresIn: '1h' })
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权访问管理后台' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('缺少 isAdmin 字段 → 403', async () => {
      const token = jwt.sign({ userId: 'u1' }, SECRET, { expiresIn: '1h' })
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })
  })

  // ==================== 有效管理员 token ====================

  describe('有效管理员 token', () => {
    it('super_admin → permissions=[*], 设置 req.adminUser, 调用 next', async () => {
      const token = jwt.sign(
        { isAdmin: true, adminId: 1, role: 'super_admin' },
        SECRET,
        { expiresIn: '1h' }
      )
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect((req as any).adminUser).toBeDefined()
      expect((req as any).adminUser.permissions).toEqual(['*'])
      expect((req as any).adminUser.role).toBe('super_admin')
    })

    it('普通管理员 → 从数据库加载角色权限', async () => {
      const token = jwt.sign(
        { isAdmin: true, adminId: 42, role: 'admin' },
        SECRET,
        { expiresIn: '1h' }
      )
      ;(AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ role_id: 5 }])  // admin_users 查询
        .mockResolvedValueOnce([{ permissions: '["dashboard:view","tenants:manage"]' }])  // admin_roles 查询

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect((req as any).adminUser.permissions).toEqual(['dashboard:view', 'tenants:manage'])
    })

    it('普通管理员无角色 → permissions=[], 仍放行', async () => {
      const token = jwt.sign(
        { isAdmin: true, adminId: 42, role: 'admin' },
        SECRET,
        { expiresIn: '1h' }
      )
      ;(AppDataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ role_id: null }])

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect((req as any).adminUser.permissions).toEqual([])
    })

    it('权限加载DB异常 → 不阻塞请求, permissions=[]', async () => {
      const token = jwt.sign(
        { isAdmin: true, adminId: 42, role: 'admin' },
        SECRET,
        { expiresIn: '1h' }
      )
      ;(AppDataSource.query as jest.Mock).mockRejectedValue(new Error('DB down'))

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } as any })
      const res = mockRes()
      await adminAuthMiddleware(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect((req as any).adminUser.permissions).toEqual([])
    })
  })
})
