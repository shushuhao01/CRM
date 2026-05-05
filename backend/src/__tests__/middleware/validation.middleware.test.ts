/**
 * validation 中间件单元测试
 * 覆盖 validate() 工厂函数 + commonValidations 规则
 */

import Joi from 'joi'
import { validate, commonValidations } from '../../middleware/validation'

// mock errorHandler 的 ValidationError
jest.mock('../../middleware/errorHandler', () => {
  class ValidationError extends Error {
    errors: any
    constructor(msg: string, errors: any) {
      super(msg)
      this.errors = errors
      this.name = 'ValidationError'
    }
  }
  return { ValidationError }
})

const mockReq = (overrides: any = {}): any => ({
  body: {},
  query: {},
  params: {},
  ...overrides,
})
const mockRes = (): any => ({})
const mockNext = jest.fn()

describe('validate 中间件', () => {

  beforeEach(() => jest.clearAllMocks())

  // ==================== body 验证 ====================

  describe('body 验证', () => {
    const schema = { body: Joi.object({ name: Joi.string().required() }) }
    const mw = validate(schema)

    it('合法 body → 调用 next', () => {
      const req = mockReq({ body: { name: 'test' } })
      mw(req, mockRes(), mockNext)
      expect(mockNext).toHaveBeenCalled()
      expect(req.body.name).toBe('test')
    })

    it('非法 body → 抛出 ValidationError', () => {
      const req = mockReq({ body: {} })
      expect(() => mw(req, mockRes(), mockNext)).toThrow('请求数据验证失败')
    })

    it('stripUnknown → 自动清除多余字段', () => {
      const req = mockReq({ body: { name: 'a', extra: 'b' } })
      mw(req, mockRes(), mockNext)
      expect(req.body.extra).toBeUndefined()
    })
  })

  // ==================== query 验证 ====================

  describe('query 验证', () => {
    const schema = {
      query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
      })
    }
    const mw = validate(schema)

    it('无参数 → 使用默认值', () => {
      const req = mockReq({ query: {} })
      mw(req, mockRes(), mockNext)
      expect(req.query.page).toBe(1)
      expect(req.query.limit).toBe(20)
    })

    it('合法参数 → 通过', () => {
      const req = mockReq({ query: { page: 2, limit: 50 } })
      mw(req, mockRes(), mockNext)
      expect(mockNext).toHaveBeenCalled()
    })

    it('limit 超限 → 抛出 ValidationError', () => {
      const req = mockReq({ query: { page: 1, limit: 999 } })
      expect(() => mw(req, mockRes(), mockNext)).toThrow()
    })
  })

  // ==================== params 验证 ====================

  describe('params 验证', () => {
    const schema = { params: Joi.object({ id: Joi.number().integer().positive().required() }) }
    const mw = validate(schema)

    it('合法 params → 通过', () => {
      const req = mockReq({ params: { id: 1 } })
      mw(req, mockRes(), mockNext)
      expect(mockNext).toHaveBeenCalled()
    })

    it('非法 params → 抛出', () => {
      const req = mockReq({ params: { id: -1 } })
      expect(() => mw(req, mockRes(), mockNext)).toThrow()
    })
  })

  // ==================== 混合验证 ====================

  describe('混合验证', () => {
    it('body + query 同时验证', () => {
      const schema = {
        body: Joi.object({ name: Joi.string().required() }),
        query: Joi.object({ page: Joi.number().default(1) }),
      }
      const mw = validate(schema)
      const req = mockReq({ body: { name: 'test' }, query: {} })
      mw(req, mockRes(), mockNext)
      expect(mockNext).toHaveBeenCalled()
      expect(req.query.page).toBe(1)
    })

    it('body 失败 + query 也失败 → 抛出含多个 key 的错误', () => {
      const schema = {
        body: Joi.object({ name: Joi.string().required() }),
        query: Joi.object({ page: Joi.number().required() }),
      }
      const mw = validate(schema)
      const req = mockReq({ body: {}, query: {} })
      expect(() => mw(req, mockRes(), mockNext)).toThrow()
    })
  })
})

// ==================== commonValidations 规则 ====================

describe('commonValidations', () => {
  describe('id', () => {
    it('正整数 → 通过', () => {
      expect(commonValidations.id.validate(1).error).toBeUndefined()
    })
    it('负数 → 失败', () => {
      expect(commonValidations.id.validate(-1).error).toBeDefined()
    })
    it('null → 失败 (required)', () => {
      expect(commonValidations.id.validate(null).error).toBeDefined()
    })
  })

  describe('optionalId', () => {
    it('undefined → 通过', () => {
      expect(commonValidations.optionalId.validate(undefined).error).toBeUndefined()
    })
    it('正整数 → 通过', () => {
      expect(commonValidations.optionalId.validate(5).error).toBeUndefined()
    })
  })

  describe('pagination', () => {
    it('page 默认 1', () => {
      expect(commonValidations.pagination.page.validate(undefined).value).toBe(1)
    })
    it('limit 默认 20', () => {
      expect(commonValidations.pagination.limit.validate(undefined).value).toBe(20)
    })
    it('limit 超限 → 失败', () => {
      expect(commonValidations.pagination.limit.validate(200).error).toBeDefined()
    })
  })

  describe('username', () => {
    it('合法 → 通过', () => {
      expect(commonValidations.username.validate('abc123').error).toBeUndefined()
    })
    it('太短 → 失败', () => {
      expect(commonValidations.username.validate('ab').error).toBeDefined()
    })
    it('含特殊字符 → 失败', () => {
      expect(commonValidations.username.validate('a!b').error).toBeDefined()
    })
  })

  describe('password', () => {
    it('合法 → 通过', () => {
      expect(commonValidations.password.validate('pass123').error).toBeUndefined()
    })
    it('太短 → 失败', () => {
      expect(commonValidations.password.validate('abc').error).toBeDefined()
    })
  })

  describe('email', () => {
    it('合法 → 通过', () => {
      expect(commonValidations.email.validate('a@b.com').error).toBeUndefined()
    })
    it('格式错误 → 失败', () => {
      expect(commonValidations.email.validate('not-email').error).toBeDefined()
    })
  })

  describe('phone', () => {
    it('合法手机号 → 通过', () => {
      expect(commonValidations.phone.validate('13800138000').error).toBeUndefined()
    })
    it('格式错误 → 失败', () => {
      expect(commonValidations.phone.validate('123').error).toBeDefined()
    })
  })

  describe('status', () => {
    it('合法值 → 通过', () => {
      const rule = commonValidations.status(['active', 'inactive'])
      expect(rule.validate('active').error).toBeUndefined()
    })
    it('非法值 → 失败', () => {
      const rule = commonValidations.status(['active', 'inactive'])
      expect(rule.validate('deleted').error).toBeDefined()
    })
  })

  describe('amount', () => {
    it('0 → 通过', () => {
      expect(commonValidations.amount.validate(0).error).toBeUndefined()
    })
    it('负数 → 失败', () => {
      expect(commonValidations.amount.validate(-1).error).toBeDefined()
    })
  })

  describe('quantity', () => {
    it('正整数 → 通过', () => {
      expect(commonValidations.quantity.validate(1).error).toBeUndefined()
    })
    it('0 → 失败', () => {
      expect(commonValidations.quantity.validate(0).error).toBeDefined()
    })
  })
})
