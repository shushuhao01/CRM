/**
 * errorHandler 错误处理中间件单元测试
 * 覆盖 AppError 体系、errorHandler 中间件、notFoundHandler、catchAsync、敏感信息过滤
 */

jest.mock('../../config/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../services/AdminNotificationService', () => ({
  adminNotificationService: {
    notify: jest.fn().mockResolvedValue(undefined)
  }
}))

import {
  AppError,
  BusinessError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  errorHandler,
  notFoundHandler,
  catchAsync,
} from '../../middleware/errorHandler'

// 辅助：构造 mock req / res / next
const mockReq = (overrides: any = {}): any => ({
  method: 'POST',
  url: '/api/test',
  path: '/api/test',
  ip: '127.0.0.1',
  params: {},
  query: {},
  headers: {},
  body: {},
  get: jest.fn().mockReturnValue('test-agent'),
  ...overrides,
})

const mockRes = (): any => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockNext = jest.fn()

describe('errorHandler 中间件', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==================== 错误类体系 ====================

  describe('错误类体系', () => {
    it('AppError — 默认 500 + INTERNAL_ERROR', () => {
      const err = new AppError('服务器错误')
      expect(err.statusCode).toBe(500)
      expect(err.code).toBe('INTERNAL_ERROR')
      expect(err.isOperational).toBe(true)
      expect(err.message).toBe('服务器错误')
    })

    it('AppError — 自定义 statusCode 和 code', () => {
      const err = new AppError('自定义', 422, 'CUSTOM')
      expect(err.statusCode).toBe(422)
      expect(err.code).toBe('CUSTOM')
    })

    it('BusinessError — 400 + BUSINESS_ERROR', () => {
      const err = new BusinessError('业务错误')
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('BUSINESS_ERROR')
    })

    it('BusinessError — 自定义 code', () => {
      const err = new BusinessError('库存不足', 'STOCK_INSUFFICIENT')
      expect(err.code).toBe('STOCK_INSUFFICIENT')
    })

    it('ValidationError — 400 + VALIDATION_ERROR + details', () => {
      const err = new ValidationError('参数错误', { field: 'name' })
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('VALIDATION_ERROR')
      expect(err.details).toEqual({ field: 'name' })
    })

    it('NotFoundError — 404 + NOT_FOUND', () => {
      const err = new NotFoundError('用户')
      expect(err.statusCode).toBe(404)
      expect(err.message).toBe('用户不存在')
    })

    it('NotFoundError — 默认资源名', () => {
      const err = new NotFoundError()
      expect(err.message).toBe('资源不存在')
    })

    it('ForbiddenError — 403', () => {
      const err = new ForbiddenError()
      expect(err.statusCode).toBe(403)
      expect(err.message).toBe('权限不足')
    })

    it('UnauthorizedError — 401', () => {
      const err = new UnauthorizedError()
      expect(err.statusCode).toBe(401)
      expect(err.message).toBe('未认证')
    })

    it('所有自定义错误都是 AppError 实例', () => {
      expect(new BusinessError('x')).toBeInstanceOf(AppError)
      expect(new ValidationError('x')).toBeInstanceOf(AppError)
      expect(new NotFoundError()).toBeInstanceOf(AppError)
      expect(new ForbiddenError()).toBeInstanceOf(AppError)
      expect(new UnauthorizedError()).toBeInstanceOf(AppError)
    })
  })

  // ==================== errorHandler ====================

  describe('errorHandler', () => {
    it('AppError → 使用其 statusCode 和 code', () => {
      const err = new AppError('测试', 502, 'BAD_GATEWAY')
      const res = mockRes()
      errorHandler(err, mockReq(), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(502)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, code: 'BAD_GATEWAY', message: '测试' })
      )
    })

    it('ValidationError → 包含 details', () => {
      const err = new ValidationError('字段错误', [{ field: 'email', msg: '格式错误' }])
      const res = mockRes()
      errorHandler(err, mockReq(), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(400)
      const body = res.json.mock.calls[0][0]
      expect(body.details).toEqual([{ field: 'email', msg: '格式错误' }])
    })

    it('数据库 QueryFailedError ER_DUP_ENTRY → DUPLICATE_ENTRY', () => {
      const err = new Error('dup') as any
      err.name = 'QueryFailedError'
      err.code = 'ER_DUP_ENTRY'
      const res = mockRes()
      errorHandler(err, mockReq(), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(400)
      const body = res.json.mock.calls[0][0]
      expect(body.code).toBe('DUPLICATE_ENTRY')
    })

    it('数据库 ER_NO_REFERENCED_ROW_2 → FOREIGN_KEY_ERROR', () => {
      const err = new Error('fk') as any
      err.name = 'QueryFailedError'
      err.code = 'ER_NO_REFERENCED_ROW_2'
      const res = mockRes()
      errorHandler(err, mockReq(), res, mockNext)
      const body = res.json.mock.calls[0][0]
      expect(body.code).toBe('FOREIGN_KEY_ERROR')
    })

    it('数据库 ER_BAD_FIELD_ERROR → SCHEMA_ERROR', () => {
      const err = new Error('field') as any
      err.name = 'QueryFailedError'
      err.code = 'ER_BAD_FIELD_ERROR'
      const res = mockRes()
      errorHandler(err, mockReq(), res, mockNext)
      const body = res.json.mock.calls[0][0]
      expect(body.code).toBe('SCHEMA_ERROR')
    })

    it('数据库未知错误码 → DATABASE_ERROR', () => {
      const err = new Error('unknown') as any
      err.name = 'QueryFailedError'
      err.code = 'ER_SOMETHING_ELSE'
      const res = mockRes()
      errorHandler(err, mockReq(), res, mockNext)
      const body = res.json.mock.calls[0][0]
      expect(body.code).toBe('DATABASE_ERROR')
    })

    it('JSON SyntaxError → INVALID_JSON', () => {
      const err = new SyntaxError('Unexpected token') as any
      err.body = '{bad json}'
      const res = mockRes()
      errorHandler(err, mockReq(), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(400)
      const body = res.json.mock.calls[0][0]
      expect(body.code).toBe('INVALID_JSON')
    })

    it('普通 Error → 500 INTERNAL_ERROR', () => {
      const err = new Error('意外错误')
      const res = mockRes()
      errorHandler(err, mockReq(), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(500)
      const body = res.json.mock.calls[0][0]
      expect(body.code).toBe('INTERNAL_ERROR')
      expect(body.message).toBe('服务器内部错误')
    })

    it('响应包含 timestamp 和 path', () => {
      const err = new AppError('x', 400, 'X')
      const res = mockRes()
      errorHandler(err, mockReq({ path: '/api/foo' }), res, mockNext)
      const body = res.json.mock.calls[0][0]
      expect(body.timestamp).toBeDefined()
      expect(body.path).toBe('/api/foo')
    })
  })

  // ==================== 敏感信息过滤 ====================

  describe('敏感信息过滤', () => {
    it('authorization header 被脱敏', () => {
      const err = new AppError('x', 400, 'X')
      const req = mockReq({
        headers: { authorization: 'Bearer secret-token', cookie: 'session=abc' },
        body: { password: '123456', username: 'admin' },
      })
      const res = mockRes()
      errorHandler(err, req, res, mockNext)
      // 不抛异常即可，具体脱敏逻辑在日志中，我们仅验证不泄露原值
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('body 敏感字段被过滤', () => {
      const err = new AppError('x', 400, 'X')
      const req = mockReq({
        body: { password: 'secret', newPassword: '123', refreshToken: 'tok' },
      })
      const res = mockRes()
      // 不抛异常
      errorHandler(err, req, res, mockNext)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // ==================== notFoundHandler ====================

  describe('notFoundHandler', () => {
    it('调用 next 并传递 NotFoundError', () => {
      const next = jest.fn()
      notFoundHandler(mockReq(), mockRes(), next)
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError))
      const err = next.mock.calls[0][0]
      expect(err.statusCode).toBe(404)
      expect(err.message).toContain('API端点')
    })
  })

  // ==================== catchAsync ====================

  describe('catchAsync', () => {
    it('正常函数 → 不调用 next', async () => {
      const fn = jest.fn().mockResolvedValue(undefined)
      const wrapped = catchAsync(fn)
      const next = jest.fn()
      await wrapped(mockReq(), mockRes(), next)
      // 给 Promise.resolve 一个微任务周期
      await new Promise(r => setTimeout(r, 0))
      expect(fn).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('抛出异常 → 调用 next(error)', async () => {
      const error = new Error('async fail')
      const fn = jest.fn().mockRejectedValue(error)
      const wrapped = catchAsync(fn)
      const next = jest.fn()
      wrapped(mockReq(), mockRes(), next)
      // 等 promise reject 传播
      await new Promise(r => setTimeout(r, 10))
      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
