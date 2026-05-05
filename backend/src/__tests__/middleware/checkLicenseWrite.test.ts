/**
 * checkLicenseWrite 授权过期写入限制中间件单元测试
 */
import { Request, Response, NextFunction } from 'express'

// Mock dependencies
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../config/jwt', () => ({
  JwtConfig: { getAccessTokenSecret: jest.fn().mockReturnValue('test-secret') }
}))
jest.mock('../../config/deploy', () => ({
  deployConfig: {
    effectiveMode: 'private',
    isSaaS: jest.fn().mockReturnValue(false),
    isPrivate: jest.fn().mockReturnValue(true),
  }
}))
jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))

import { checkLicenseWrite, clearLicenseWriteCache } from '../../middleware/checkLicenseWrite'
import { deployConfig } from '../../config/deploy'
import { AppDataSource } from '../../config/database'

const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'POST',
  path: '/api/v1/customers',
  headers: {},
  ...overrides,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.setHeader = jest.fn().mockReturnValue(res)
  return res
}

describe('checkLicenseWrite', () => {
  let next: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()
    next = jest.fn()
    clearLicenseWriteCache()
    ;(deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
  })

  // ==================== GET 请求直接放行 ====================

  describe('GET/HEAD/OPTIONS 直接放行', () => {
    it('GET 请求 → 放行', async () => {
      const req = mockReq({ method: 'GET' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('HEAD 请求 → 放行', async () => {
      const req = mockReq({ method: 'HEAD' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })

    it('OPTIONS 请求 → 放行', async () => {
      const req = mockReq({ method: 'OPTIONS' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })
  })

  // ==================== 跳过路径 ====================

  describe('跳过路径放行', () => {
    const skipPaths = [
      '/api/v1/auth/login',
      '/api/v1/license/activate',
      '/api/v1/public/info',
      '/api/v1/health',
      '/api/v1/tenant-license/check',
    ]

    skipPaths.forEach((path) => {
      it(`POST ${path} → 放行`, async () => {
        const req = mockReq({ method: 'POST', path })
        const res = mockRes()
        await checkLicenseWrite(req as Request, res as Response, next)
        expect(next).toHaveBeenCalled()
      })
    })
  })

  // ==================== 私有部署：未过期 ====================

  describe('私有部署 - 未过期', () => {
    it('无授权信息（开发模式） → 放行', async () => {
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([])

      const req = mockReq({ method: 'POST' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })

    it('授权未过期 → 放行', async () => {
      const futureDate = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString()
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { expires_at: futureDate, status: 'active' }
      ])

      const req = mockReq({ method: 'POST' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })
  })

  // ==================== 私有部署：已过期 ====================

  describe('私有部署 - 已过期', () => {
    it('授权已过期 → 403 阻止写入', async () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { expires_at: pastDate, status: 'active' }
      ])

      const req = mockReq({ method: 'POST' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'LICENSE_EXPIRED_WRITE_BLOCKED' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('PUT 请求也被阻止', async () => {
      clearLicenseWriteCache()
      const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { expires_at: pastDate, status: 'active' }
      ])

      const req = mockReq({ method: 'PUT' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })

    it('DELETE 请求也被阻止', async () => {
      clearLicenseWriteCache()
      const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { expires_at: pastDate, status: 'active' }
      ])

      const req = mockReq({ method: 'DELETE' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  // ==================== 即将到期预警 ====================

  describe('即将到期预警', () => {
    it('30天内到期 → 设置预警响应头', async () => {
      clearLicenseWriteCache()
      const nearFuture = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString()
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { expires_at: nearFuture, status: 'active' }
      ])

      const req = mockReq({ method: 'POST' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)

      expect(next).toHaveBeenCalled()
      expect(res.setHeader).toHaveBeenCalledWith('X-License-Warning', 'true')
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-License-Days-Remaining',
        expect.any(String)
      )
    })
  })

  // ==================== 数据库异常 ====================

  describe('异常处理', () => {
    it('数据库查询异常 → 放行（不阻塞）', async () => {
      clearLicenseWriteCache()
      ;(AppDataSource.query as jest.Mock).mockImplementation(() => {
        throw new Error('DB connection failed')
      })

      const req = mockReq({ method: 'POST' })
      const res = mockRes()
      await checkLicenseWrite(req as Request, res as Response, next)
      expect(next).toHaveBeenCalled()
    })
  })

  // ==================== clearLicenseWriteCache ====================

  describe('clearLicenseWriteCache', () => {
    it('清除缓存后下次查询重新读取数据库', async () => {
      // 第一次：未过期
      const futureDate = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString()
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { expires_at: futureDate, status: 'active' }
      ])
      const req1 = mockReq({ method: 'POST' })
      const res1 = mockRes()
      await checkLicenseWrite(req1 as Request, res1 as Response, next)
      expect(next).toHaveBeenCalled()

      // 清除缓存
      clearLicenseWriteCache()
      jest.clearAllMocks()
      next = jest.fn()

      // 第二次：过期
      const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce([
        { expires_at: pastDate, status: 'active' }
      ])
      const req2 = mockReq({ method: 'POST' })
      const res2 = mockRes()
      await checkLicenseWrite(req2 as Request, res2 as Response, next)
      expect(res2.status).toHaveBeenCalledWith(403)
    })
  })
})
