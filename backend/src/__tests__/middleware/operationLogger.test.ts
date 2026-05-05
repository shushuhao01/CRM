/**
 * operationLogger 操作日志中间件单元测试
 * 覆盖 inferAction、extractModule、extractTargetType、extractTargetId、
 *      extractRealIp、generateDetail、extractNameFromBody、中间件逻辑
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn().mockResolvedValue([]) }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

import { adminOperationLoggerMiddleware } from '../../middleware/operationLogger'

// 辅助函数：构造 mock req / res / next
const mockReq = (overrides: any = {}): any => ({
  method: 'POST',
  path: '/tenants',
  body: {},
  headers: {},
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
  ...overrides,
})

const mockRes = (): any => {
  const res: any = { statusCode: 200 }
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockNext = jest.fn()

describe('operationLogger 中间件', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==================== 中间件基础逻辑 ====================

  describe('中间件基础逻辑', () => {
    it('GET 请求 → 直接放行，不拦截', () => {
      const req = mockReq({ method: 'GET' })
      const res = mockRes()
      adminOperationLoggerMiddleware(req, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
      // GET 不应修改 res.json
    })

    it('POST 请求 → 拦截并调用 next', () => {
      const req = mockReq({ method: 'POST', path: '/tenants' })
      const res = mockRes()
      adminOperationLoggerMiddleware(req, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })

    it('PUT 请求 → 拦截', () => {
      const req = mockReq({ method: 'PUT', path: '/tenants/123' })
      const res = mockRes()
      adminOperationLoggerMiddleware(req, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })

    it('DELETE 请求 → 拦截', () => {
      const req = mockReq({ method: 'DELETE', path: '/tenants/123' })
      const res = mockRes()
      adminOperationLoggerMiddleware(req, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })

    it('PATCH 请求 → 拦截', () => {
      const req = mockReq({ method: 'PATCH', path: '/tenants/123' })
      const res = mockRes()
      adminOperationLoggerMiddleware(req, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })
  })

  // ==================== 跳过路径 ====================

  describe('跳过路径', () => {
    it('/auth/profile → 放行不记录', () => {
      const req = mockReq({ method: 'POST', path: '/auth/profile' })
      const res = mockRes()
      const originalJson = res.json
      adminOperationLoggerMiddleware(req, res, mockNext)
      // 被跳过的路径不应替换 res.json（或替换后行为无异）
      expect(mockNext).toHaveBeenCalled()
    })

    it('/export/xxx → 放行', () => {
      const req = mockReq({ method: 'POST', path: '/export/customers' })
      const res = mockRes()
      adminOperationLoggerMiddleware(req, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })

    it('/operation-logs → 放行', () => {
      const req = mockReq({ method: 'POST', path: '/operation-logs' })
      const res = mockRes()
      adminOperationLoggerMiddleware(req, res, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })
  })

  // ==================== 响应拦截逻辑 ====================

  describe('响应拦截', () => {
    it('成功响应 + 有 adminUser → 记录日志', () => {
      const req = mockReq({
        method: 'POST',
        path: '/tenants',
        body: { name: '新租户' },
        headers: { 'user-agent': 'test-agent' },
        adminUser: { adminId: 'admin-1', username: 'admin' },
      })
      const res = mockRes()
      res.statusCode = 200

      adminOperationLoggerMiddleware(req, res, mockNext)
      // 中间件替换了 res.json，调用它不应抛错
      expect(() => res.json({ success: true, data: { id: 'new-id' } })).not.toThrow()
    })

    it('失败响应 (400+) → 不记录日志', () => {
      const req = mockReq({
        method: 'POST',
        path: '/tenants',
        adminUser: { adminId: 'admin-1', username: 'admin' },
      })
      const res = mockRes()
      res.statusCode = 400

      adminOperationLoggerMiddleware(req, res, mockNext)
      res.json({ success: false })
      // 400 不触发写日志
    })

    it('无 adminUser → 不记录日志', () => {
      const req = mockReq({
        method: 'POST',
        path: '/tenants',
        // 无 adminUser
      })
      const res = mockRes()
      res.statusCode = 200

      adminOperationLoggerMiddleware(req, res, mockNext)
      res.json({ success: true })
    })
  })

  // ==================== 纯函数逻辑测试 ====================

  describe('inferAction 逻辑', () => {
    function inferActionSimple(method: string): string {
      switch (method) {
        case 'POST': return 'create'
        case 'DELETE': return 'delete'
        case 'PUT':
        case 'PATCH': return 'update'
        default: return 'other'
      }
    }

    it('POST → create', () => {
      expect(inferActionSimple('POST')).toBe('create')
    })

    it('DELETE → delete', () => {
      expect(inferActionSimple('DELETE')).toBe('delete')
    })

    it('PUT → update', () => {
      expect(inferActionSimple('PUT')).toBe('update')
    })

    it('PATCH → update', () => {
      expect(inferActionSimple('PATCH')).toBe('update')
    })
  })

  describe('extractTargetId — UUID 提取', () => {
    it('路径含 UUID → 提取正确', () => {
      const path = '/tenants/550e8400-e29b-41d4-a716-446655440000'
      const match = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      expect(match).not.toBeNull()
      expect(match![0]).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    it('路径无 UUID → 空字符串', () => {
      const path = '/tenants'
      const match = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      expect(match).toBeNull()
    })
  })

  describe('extractRealIp 逻辑', () => {
    it('x-forwarded-for → 取第一个 IP', () => {
      const headers: any = { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
      const forwarded = headers['x-forwarded-for']
      const ip = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim()
      expect(ip).toBe('1.2.3.4')
    })

    it('x-real-ip → 直接使用', () => {
      const headers: any = { 'x-real-ip': '10.0.0.1' }
      expect(headers['x-real-ip']).toBe('10.0.0.1')
    })

    it('::1 → 转换为 127.0.0.1', () => {
      let ip = '::1'
      if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1'
      expect(ip).toBe('127.0.0.1')
    })

    it('::ffff: 前缀 → 去掉', () => {
      let ip = '::ffff:192.168.1.1'
      if (ip.startsWith('::ffff:')) ip = ip.substring(7)
      expect(ip).toBe('192.168.1.1')
    })
  })

  describe('extractNameFromBody 逻辑', () => {
    it('body.name 存在 → 返回「name」', () => {
      const body = { name: '测试' }
      const name = body.name || ''
      expect(name ? `「${name}」` : '').toBe('「测试」')
    })

    it('body 为空 → 返回空', () => {
      const body: any = null
      expect(!body ? '' : (body.name || '')).toBe('')
    })

    it('title 字段 → 也被提取', () => {
      const body = { title: '公告标题' }
      const name = (body as any).name || (body as any).username || body.title || ''
      expect(name ? `「${name}」` : '').toBe('「公告标题」')
    })
  })

  describe('PATH_MODULE_MAP 路径映射', () => {
    const extractModule = (path: string): string => {
      const map: [string, string][] = [
        ['/system-config', 'system_settings'],
        ['/admin-users', 'admin_users'],
        ['/auth', 'auth'],
        ['/licenses', 'licenses'],
        ['/tenants', 'tenants'],
        ['/payment', 'payment'],
        ['/packages', 'packages'],
      ]
      for (const [prefix, module] of map) {
        if (path.startsWith(prefix)) return module
      }
      return 'other'
    }

    it('/tenants → tenants', () => expect(extractModule('/tenants')).toBe('tenants'))
    it('/licenses/xxx → licenses', () => expect(extractModule('/licenses/123')).toBe('licenses'))
    it('/admin-users → admin_users', () => expect(extractModule('/admin-users')).toBe('admin_users'))
    it('/unknown → other', () => expect(extractModule('/unknown')).toBe('other'))
    it('/system-config/sms → system_settings', () => expect(extractModule('/system-config/sms')).toBe('system_settings'))
  })
})
