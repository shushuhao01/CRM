/**
 * TenantService 租户服务单元测试
 * 覆盖 getTenantById、canCreateUser、canUploadFile、isFeatureEnabled 等
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

import { AppDataSource } from '../../config/database'

const mockQuery = AppDataSource.query as jest.Mock

let tenantService: any

beforeAll(async () => {
  const mod = await import('../../services/TenantService')
  tenantService = mod.tenantService
})

beforeEach(() => {
  jest.clearAllMocks()
})

// 辅助：构造租户 DB 行
const makeTenantRow = (overrides: any = {}) => ({
  id: 'tenant-001',
  name: '测试租户',
  code: 'TEST',
  max_users: 20,
  max_storage_gb: 5,
  expire_date: new Date(Date.now() + 86400000).toISOString(),
  status: 'active',
  license_status: 'active',
  features: null,
  ...overrides,
})

describe('TenantService', () => {

  // ==================== getTenantById ====================

  describe('getTenantById', () => {
    it('租户不存在 → null', async () => {
      mockQuery.mockResolvedValueOnce([])
      const result = await tenantService.getTenantById('nonexistent')
      expect(result).toBeNull()
    })

    it('DB 异常 → null', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB fail'))
      const result = await tenantService.getTenantById('any')
      expect(result).toBeNull()
    })

    it('正常租户 → 返回完整信息', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow()])        // tenant query
        .mockResolvedValueOnce([{ count: 8 }])            // user count
        .mockResolvedValueOnce([{ total: 1048576 }])      // attachments size
        .mockResolvedValueOnce([{ total: 0 }])            // recordings size

      const result = await tenantService.getTenantById('tenant-001')
      expect(result).toMatchObject({
        id: 'tenant-001',
        name: '测试租户',
        maxUsers: 20,
        currentUsers: 8,
        status: 'active',
      })
    })

    it('features 有值 → 解析 JSON 数组', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ features: '["order","customer"]' })])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      const result = await tenantService.getTenantById('tenant-001')
      expect(result!.features).toEqual(['order', 'customer'])
    })
  })

  // ==================== canCreateUser ====================

  describe('canCreateUser', () => {
    it('租户不存在 → 不允许', async () => {
      mockQuery.mockResolvedValueOnce([])
      const result = await tenantService.canCreateUser('nonexistent')
      expect(result.allowed).toBe(false)
      expect(result.message).toContain('不存在')
    })

    it('租户被禁用 → 不允许', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ status: 'suspended' })])
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      const result = await tenantService.canCreateUser('tenant-001')
      expect(result.allowed).toBe(false)
      expect(result.message).toContain('禁用')
    })

    it('授权已暂停 → 不允许', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ license_status: 'suspended' })])
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      const result = await tenantService.canCreateUser('tenant-001')
      expect(result.allowed).toBe(false)
      expect(result.message).toContain('暂停')
    })

    it('授权已过期 → 不允许', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ expire_date: pastDate })])
        .mockResolvedValueOnce([{ count: 5 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      const result = await tenantService.canCreateUser('tenant-001')
      expect(result.allowed).toBe(false)
      expect(result.message).toContain('过期')
    })

    it('用户数达上限 → 不允许', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ max_users: 10 })])
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      const result = await tenantService.canCreateUser('tenant-001')
      expect(result.allowed).toBe(false)
      expect(result.message).toContain('上限')
    })

    it('正常 → 允许', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ max_users: 20 })])
        .mockResolvedValueOnce([{ count: 10 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      const result = await tenantService.canCreateUser('tenant-001')
      expect(result.allowed).toBe(true)
      expect(result.current).toBe(10)
      expect(result.max).toBe(20)
    })

    it('DB异常 → getTenantById 返回 null → 不允许（租户不存在）', async () => {
      mockQuery.mockRejectedValue(new Error('fail'))
      const result = await tenantService.canCreateUser('tenant-001')
      // getTenantById 内部 catch 返回 null，canCreateUser 视为"租户不存在"
      expect(result.allowed).toBe(false)
      expect(result.message).toContain('不存在')
    })
  })

  // ==================== canUploadFile ====================

  describe('canUploadFile', () => {
    it('租户不存在 → 不允许', async () => {
      mockQuery.mockResolvedValueOnce([])
      const result = await tenantService.canUploadFile('nonexistent', 10)
      expect(result.allowed).toBe(false)
    })

    it('存储空间不足 → 不允许', async () => {
      // 5GB = 5120MB, 已用 5000MB, 上传 200MB → 超出
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ max_storage_gb: 5 })])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ total: 5000 * 1024 * 1024 }])  // 5000MB attachments
        .mockResolvedValueOnce([{ total: 0 }])

      const result = await tenantService.canUploadFile('tenant-001', 200)
      expect(result.allowed).toBe(false)
      expect(result.message).toContain('存储空间不足')
    })

    it('存储充足 → 允许', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ max_storage_gb: 10 })])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ total: 1024 * 1024 }])  // 1MB
        .mockResolvedValueOnce([{ total: 0 }])

      const result = await tenantService.canUploadFile('tenant-001', 50)
      expect(result.allowed).toBe(true)
    })
  })

  // ==================== updateMaxUsers ====================

  describe('updateMaxUsers', () => {
    it('更新成功 → true', async () => {
      mockQuery.mockResolvedValueOnce(undefined)
      const result = await tenantService.updateMaxUsers('tenant-001', 50)
      expect(result).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tenants SET max_users'),
        [50, 'tenant-001']
      )
    })

    it('更新失败 → false', async () => {
      mockQuery.mockRejectedValueOnce(new Error('fail'))
      const result = await tenantService.updateMaxUsers('tenant-001', 50)
      expect(result).toBe(false)
    })
  })

  // ==================== isFeatureEnabled ====================

  describe('isFeatureEnabled', () => {
    it('租户不存在 → false', async () => {
      mockQuery.mockResolvedValueOnce([])
      expect(await tenantService.isFeatureEnabled('nonexist', 'order')).toBe(false)
    })

    it('租户被禁用 → false', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ status: 'suspended' })])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      expect(await tenantService.isFeatureEnabled('tenant-001', 'order')).toBe(false)
    })

    it('features 含 all → true', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ features: '["all"]' })])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      expect(await tenantService.isFeatureEnabled('tenant-001', 'anything')).toBe(true)
    })

    it('features 不含目标 → false', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ features: '["order"]' })])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      expect(await tenantService.isFeatureEnabled('tenant-001', 'finance')).toBe(false)
    })

    it('features 为 null → 默认 true', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ features: null })])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      expect(await tenantService.isFeatureEnabled('tenant-001', 'order')).toBe(true)
    })
  })

  // ==================== getTenantStats ====================

  describe('getTenantStats', () => {
    it('租户不存在 → 全零', async () => {
      mockQuery.mockResolvedValueOnce([])
      const stats = await tenantService.getTenantStats('nonexist')
      expect(stats.users).toEqual({ current: 0, max: 0, remaining: 0 })
      expect(stats.storage).toEqual({ usedMb: 0, maxGb: 0, remainingMb: 0 })
    })

    it('正常租户 → 正确计算', async () => {
      mockQuery
        .mockResolvedValueOnce([makeTenantRow({ max_users: 20, max_storage_gb: 10 })])
        .mockResolvedValueOnce([{ count: 12 }])
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([{ total: 0 }])

      const stats = await tenantService.getTenantStats('tenant-001')
      expect(stats.users.current).toBe(12)
      expect(stats.users.max).toBe(20)
      expect(stats.users.remaining).toBe(8)
    })
  })
})
