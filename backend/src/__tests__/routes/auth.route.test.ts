/**
 * auth 路由 / UserController 单元测试
 * 覆盖登录、刷新令牌、登出核心场景
 */
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'

// ====== Mocks ======

const mockFindOne = jest.fn()
const mockSave = jest.fn()
const mockCreateQueryBuilder = jest.fn()

jest.mock('../../utils/tenantRepo', () => ({
  getTenantRepo: jest.fn().mockReturnValue({
    findOne: mockFindOne,
    save: mockSave,
    createQueryBuilder: mockCreateQueryBuilder,
  })
}))

jest.mock('../../config/database', () => ({
  getDataSource: jest.fn().mockReturnValue({
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      save: jest.fn(),
    }),
  }),
  AppDataSource: { query: jest.fn() }
}))

jest.mock('../../config/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
  operationLogger: { info: jest.fn() }
}))

jest.mock('../../config/jwt', () => ({
  JwtConfig: {
    generateTokenPair: jest.fn().mockReturnValue({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresIn: 3600,
    }),
    verifyRefreshToken: jest.fn().mockReturnValue({
      userId: 'user-001',
      username: 'admin',
      role: 'admin',
      tenantId: 'tenant-001',
    }),
    getAccessTokenSecret: jest.fn().mockReturnValue('test-secret'),
  }
}))

jest.mock('../../config/deploy', () => ({
  deployConfig: {
    isSaaS: jest.fn().mockReturnValue(false),
    isPrivate: jest.fn().mockReturnValue(true),
    effectiveMode: 'private',
  }
}))

jest.mock('../../services/OnlineSeatService', () => ({
  onlineSeatService: {
    checkLoginAllowed: jest.fn().mockResolvedValue({ allowed: true }),
    createSession: jest.fn().mockResolvedValue(undefined),
    generateSessionToken: jest.fn().mockReturnValue('session-token'),
    removeSession: jest.fn().mockResolvedValue(undefined),
  }
}))

jest.mock('../../utils/getClientIp', () => ({
  getClientIp: jest.fn().mockReturnValue('127.0.0.1')
}))

jest.mock('../../middleware/errorHandler', () => {
  class BusinessError extends Error {
    code: string
    statusCode: number
    constructor(message: string, code: string) {
      super(message)
      this.code = code
      this.statusCode = 400
      this.name = 'BusinessError'
    }
  }
  class NotFoundError extends Error {
    statusCode: number
    constructor(message: string) {
      super(message)
      this.statusCode = 404
      this.name = 'NotFoundError'
    }
  }
  class ValidationError extends Error {
    statusCode: number
    constructor(message: string) {
      super(message)
      this.statusCode = 400
      this.name = 'ValidationError'
    }
  }
  return {
    BusinessError,
    NotFoundError,
    ValidationError,
    catchAsync: (fn: Function) => fn,
  }
})

import { UserController } from '../../controllers/UserController'
import { JwtConfig } from '../../config/jwt'
import { deployConfig } from '../../config/deploy'

// ====== Helpers ======

const makeUser = (overrides: any = {}) => ({
  id: 'user-001',
  username: 'admin',
  password: bcrypt.hashSync('Aa123456', 10),
  role: 'admin',
  roleId: 'admin',
  status: 'active',
  tenantId: 'tenant-001',
  departmentId: 'dept-001',
  loginFailCount: 0,
  loginCount: 5,
  lastLoginAt: null,
  lastLoginIp: null,
  authorizedIps: null,
  realName: '管理员',
  name: '管理员',
  departmentName: '管理部',
  ...overrides,
})

const mockReq = (body: any = {}, extra: any = {}): Partial<Request> => ({
  body,
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' } as any,
  get: jest.fn().mockReturnValue('TestAgent/1.0'),
  ...extra,
})

const mockRes = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockNext = jest.fn()

describe('UserController', () => {
  let controller: UserController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new UserController()
  })

  // ==================== login ====================

  describe('login', () => {
    it('用户名不存在 → 抛出 INVALID_CREDENTIALS', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      await expect(
        controller.login(
          mockReq({ username: 'nouser', password: '123456' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow('用户名或密码错误')
    })

    it('密码错误 → 抛出 INVALID_CREDENTIALS + 增加失败次数', async () => {
      const user = makeUser({ loginFailCount: 0 })
      mockFindOne.mockResolvedValueOnce(user)
      mockSave.mockResolvedValueOnce(user)

      await expect(
        controller.login(
          mockReq({ username: 'admin', password: 'wrong' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow(/密码错误|用户名或密码错误/)
    })

    it('账户已锁定 → 抛出 ACCOUNT_LOCKED', async () => {
      mockFindOne.mockResolvedValueOnce(makeUser({ status: 'locked' }))

      await expect(
        controller.login(
          mockReq({ username: 'admin', password: 'Aa123456' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow('账户已被锁定')
    })

    it('账户已禁用 → 抛出 ACCOUNT_DISABLED', async () => {
      mockFindOne.mockResolvedValueOnce(makeUser({ status: 'inactive' }))

      await expect(
        controller.login(
          mockReq({ username: 'admin', password: 'Aa123456' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow('账户已被禁用')
    })

    it('IP 未授权 → 抛出 IP_NOT_AUTHORIZED', async () => {
      mockFindOne.mockResolvedValueOnce(
        makeUser({ authorizedIps: ['192.168.1.100'] })
      )

      await expect(
        controller.login(
          mockReq({ username: 'admin', password: 'Aa123456' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow('当前IP地址未授权登录')
    })

    it('密码错误达5次 → 账户被锁定', async () => {
      const user = makeUser({ loginFailCount: 4 })
      mockFindOne.mockResolvedValueOnce(user)
      mockSave.mockResolvedValueOnce(user)

      await expect(
        controller.login(
          mockReq({ username: 'admin', password: 'wrong' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow(/锁定/)

      expect(user.status).toBe('locked')
      expect(user.loginFailCount).toBe(5)
    })

    it('登录成功 → 返回 tokens + userInfo', async () => {
      const user = makeUser()
      mockFindOne.mockResolvedValueOnce(user)
      mockSave.mockResolvedValue(user)

      const res = mockRes()
      await controller.login(
        mockReq({ username: 'admin', password: 'Aa123456' }) as Request,
        res as Response,
        mockNext,
      )

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tokens: expect.objectContaining({
              accessToken: 'access-token-123',
              refreshToken: 'refresh-token-456',
            }),
            user: expect.objectContaining({
              id: 'user-001',
              username: 'admin',
            }),
          }),
        })
      )
      expect(user.loginFailCount).toBe(0)
    })

    it('SaaS 模式无 tenantId → 抛出 ValidationError', async () => {
      ;(deployConfig.isSaaS as jest.Mock).mockReturnValue(true)

      await expect(
        controller.login(
          mockReq({ username: 'admin', password: 'Aa123456' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow('SaaS模式下必须提供租户编码')
    })
  })

  // ==================== refreshToken ====================

  describe('refreshToken', () => {
    it('无 refreshToken → 抛出 ValidationError', async () => {
      await expect(
        controller.refreshToken(
          mockReq({}) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow('刷新令牌不能为空')
    })

    it('无效 refreshToken → verifyRefreshToken 抛异常', async () => {
      ;(JwtConfig.verifyRefreshToken as jest.Mock).mockImplementationOnce(() => {
        throw new Error('invalid token')
      })

      await expect(
        controller.refreshToken(
          mockReq({ refreshToken: 'bad-token' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow()
    })

    it('用户状态非 active → 抛出 USER_STATUS_INVALID', async () => {
      mockFindOne.mockResolvedValueOnce(makeUser({ status: 'locked' }))

      await expect(
        controller.refreshToken(
          mockReq({ refreshToken: 'valid-refresh' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow('用户状态异常')
    })

    it('用户不存在 → 抛出 USER_STATUS_INVALID', async () => {
      mockFindOne.mockResolvedValueOnce(null)

      await expect(
        controller.refreshToken(
          mockReq({ refreshToken: 'valid-refresh' }) as Request,
          mockRes() as Response,
          mockNext,
        )
      ).rejects.toThrow('用户状态异常')
    })

    it('有效 refreshToken + active 用户 → 返回新 tokens', async () => {
      mockFindOne.mockResolvedValueOnce(makeUser())

      const res = mockRes()
      await controller.refreshToken(
        mockReq({ refreshToken: 'valid-refresh' }) as Request,
        res as Response,
        mockNext,
      )

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tokens: expect.objectContaining({
              accessToken: 'access-token-123',
            }),
          }),
        })
      )
      expect(JwtConfig.generateTokenPair).toHaveBeenCalled()
    })
  })
})
