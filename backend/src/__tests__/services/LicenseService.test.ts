/**
 * LicenseService 授权服务单元测试
 * 覆盖 getLicenseInfo、canCreateUser、isFeatureEnabled、verifyLicense 等核心方法
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../utils/dateFormat', () => ({
  formatDateTime: jest.fn().mockImplementation((d: any) => d?.toISOString?.() || String(d))
}))
jest.mock('../../utils/tenantHelpers', () => ({
  getCurrentTenantIdSafe: jest.fn().mockReturnValue(null)
}))
jest.mock('../../config/centralServer', () => ({
  getCentralAdminApiUrl: jest.fn().mockReturnValue('http://admin.example.com')
}))

import { AppDataSource } from '../../config/database'
import { getCurrentTenantIdSafe } from '../../utils/tenantHelpers'

const mockQuery = AppDataSource.query as jest.Mock

// 使用动态 import 获取 singleton
let licenseService: any

beforeAll(async () => {
  const mod = await import('../../services/LicenseService')
  licenseService = mod.licenseService
})

beforeEach(() => {
  jest.clearAllMocks()
  licenseService.clearCache()
})

describe('LicenseService', () => {

  // ==================== getLicenseInfo ====================

  describe('getLicenseInfo', () => {
    it('无授权记录 → 返回 null', async () => {
      mockQuery.mockResolvedValueOnce([])  // system_license
      const result = await licenseService.getLicenseInfo()
      expect(result).toBeNull()
    })

    it('查询失败 → 返回 null', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'))
      const result = await licenseService.getLicenseInfo()
      expect(result).toBeNull()
    })

    it('有效授权 → 返回完整信息', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'enterprise',
          max_users: 50,
          customer_name: 'TestCorp',
          expires_at: future,
          features: '["order","customer"]',
        }])
        .mockResolvedValueOnce([{ count: 10 }])  // user count

      const result = await licenseService.getLicenseInfo()
      expect(result).toMatchObject({
        activated: true,
        expired: false,
        licenseType: 'enterprise',
        maxUsers: 50,
        currentUsers: 10,
        customerName: 'TestCorp',
        features: ['order', 'customer'],
      })
    })

    it('已过期授权 → expired=true', async () => {
      const past = new Date(Date.now() - 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic',
          max_users: 10,
          customer_name: 'ExpiredCorp',
          expires_at: past,
          features: null,
        }])
        .mockResolvedValueOnce([{ count: 5 }])

      const result = await licenseService.getLicenseInfo()
      expect(result!.expired).toBe(true)
    })

    it('SaaS 模式带 tenantId → SQL 含租户过滤', async () => {
      ;(getCurrentTenantIdSafe as jest.Mock).mockReturnValueOnce('tenant-abc')
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'saas',
          max_users: 20,
          customer_name: 'SaaSCorp',
          expires_at: future,
          features: null,
        }])
        .mockResolvedValueOnce([{ count: 3 }])

      await licenseService.getLicenseInfo()
      // 第二次 query 应带 tenant_id 参数
      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery.mock.calls[1][1]).toEqual(['tenant-abc'])
    })
  })

  // ==================== canCreateUser ====================

  describe('canCreateUser', () => {
    it('无授权 → 默认允许（开发模式）', async () => {
      mockQuery.mockResolvedValueOnce([])  // no license
      const result = await licenseService.canCreateUser()
      expect(result.canCreate).toBe(true)
      expect(result.maxUsers).toBe(999999)
    })

    it('授权已过期 → 不允许', async () => {
      const past = new Date(Date.now() - 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic', max_users: 10, customer_name: 'X',
          expires_at: past, features: null,
        }])
        .mockResolvedValueOnce([{ count: 5 }])

      const result = await licenseService.canCreateUser()
      expect(result.canCreate).toBe(false)
      expect(result.message).toContain('过期')
    })

    it('用户数达上限 → 不允许', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic', max_users: 10, customer_name: 'X',
          expires_at: future, features: null,
        }])
        .mockResolvedValueOnce([{ count: 10 }])

      const result = await licenseService.canCreateUser()
      expect(result.canCreate).toBe(false)
      expect(result.message).toContain('上限')
    })

    it('用户数未达上限 → 允许', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic', max_users: 10, customer_name: 'X',
          expires_at: future, features: null,
        }])
        .mockResolvedValueOnce([{ count: 5 }])

      const result = await licenseService.canCreateUser()
      expect(result.canCreate).toBe(true)
      expect(result.currentUsers).toBe(5)
      expect(result.maxUsers).toBe(10)
    })

    it('异常 → 默认允许', async () => {
      mockQuery.mockRejectedValue(new Error('fail'))
      const result = await licenseService.canCreateUser()
      expect(result.canCreate).toBe(true)
    })
  })

  // ==================== isFeatureEnabled ====================

  describe('isFeatureEnabled', () => {
    it('无授权 → 默认所有功能可用', async () => {
      mockQuery.mockResolvedValueOnce([])
      const result = await licenseService.isFeatureEnabled('order')
      expect(result).toBe(true)
    })

    it('已过期 → 功能不可用', async () => {
      const past = new Date(Date.now() - 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic', max_users: 10, customer_name: 'X',
          expires_at: past, features: '["order"]',
        }])
        .mockResolvedValueOnce([{ count: 1 }])

      expect(await licenseService.isFeatureEnabled('order')).toBe(false)
    })

    it('features 含 all → 所有功能可用', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'enterprise', max_users: 50, customer_name: 'X',
          expires_at: future, features: '["all"]',
        }])
        .mockResolvedValueOnce([{ count: 1 }])

      expect(await licenseService.isFeatureEnabled('anything')).toBe(true)
    })

    it('features 不含目标功能 → 不可用', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic', max_users: 10, customer_name: 'X',
          expires_at: future, features: '["order","customer"]',
        }])
        .mockResolvedValueOnce([{ count: 1 }])

      expect(await licenseService.isFeatureEnabled('finance')).toBe(false)
    })

    it('features 含目标功能 → 可用', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic', max_users: 10, customer_name: 'X',
          expires_at: future, features: '["order","customer"]',
        }])
        .mockResolvedValueOnce([{ count: 1 }])

      expect(await licenseService.isFeatureEnabled('order')).toBe(true)
    })

    it('features 为 null → 默认所有功能可用', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic', max_users: 10, customer_name: 'X',
          expires_at: future, features: null,
        }])
        .mockResolvedValueOnce([{ count: 1 }])

      expect(await licenseService.isFeatureEnabled('anything')).toBe(true)
    })
  })

  // ==================== getUserStats ====================

  describe('getUserStats', () => {
    it('无授权 → 返回默认值', async () => {
      mockQuery.mockResolvedValueOnce([])
      const stats = await licenseService.getUserStats()
      expect(stats).toEqual({ current: 0, max: 999999, remaining: 999999 })
    })

    it('有授权 → 正确计算 remaining', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([{
          license_type: 'basic', max_users: 20, customer_name: 'X',
          expires_at: future, features: null,
        }])
        .mockResolvedValueOnce([{ count: 15 }])

      const stats = await licenseService.getUserStats()
      expect(stats).toEqual({ current: 15, max: 20, remaining: 5 })
    })
  })

  // ==================== verifyLicense ====================

  describe('verifyLicense', () => {
    it('授权码不存在 → valid=false', async () => {
      mockQuery.mockResolvedValueOnce([])
      const result = await licenseService.verifyLicense('INVALID-KEY')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('不存在')
    })

    it('授权已吊销 → valid=false', async () => {
      mockQuery.mockResolvedValueOnce([{ status: 'revoked' }])
      const result = await licenseService.verifyLicense('REVOKED-KEY')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('吊销')
    })

    it('授权已过期 → valid=false', async () => {
      const past = new Date(Date.now() - 86400000).toISOString()
      mockQuery.mockResolvedValueOnce([{ status: 'active', expires_at: past }])
      const result = await licenseService.verifyLicense('EXPIRED-KEY')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('过期')
    })

    it('授权有效 → valid=true', async () => {
      const future = new Date(Date.now() + 86400000).toISOString()
      mockQuery.mockResolvedValueOnce([{ status: 'active', expires_at: future }])
      const result = await licenseService.verifyLicense('VALID-KEY')
      expect(result.valid).toBe(true)
    })
  })

  // ==================== getStatistics ====================

  describe('getStatistics', () => {
    it('返回正确的统计数据', async () => {
      mockQuery
        .mockResolvedValueOnce([{ c: 100 }])  // total
        .mockResolvedValueOnce([{ c: 60 }])   // active
        .mockResolvedValueOnce([{ c: 20 }])   // expired
        .mockResolvedValueOnce([{ c: 15 }])   // pending
        .mockResolvedValueOnce([{ c: 5 }])    // revoked

      const stats = await licenseService.getStatistics()
      expect(stats).toEqual({
        total: 100, active: 60, expired: 20, pending: 15, revoked: 5
      })
    })
  })
})
