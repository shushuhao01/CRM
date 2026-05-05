/**
 * tenantRepo 租户仓储隔离工具单元测试
 * 测试 tenantSQL / tenantWHERE 等纯函数
 */

// Mock dependencies
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      metadata: { tableName: 'customers', columns: [{ propertyName: 'tenantId', databaseName: 'tenant_id' }] },
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    })
  }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../config/deploy', () => ({
  deployConfig: {
    effectiveMode: 'saas',
    isSaaS: jest.fn().mockReturnValue(true),
    isPrivate: jest.fn().mockReturnValue(false),
  }
}))
jest.mock('../../utils/tenantContext', () => ({
  TenantContextManager: {
    getTenantId: jest.fn().mockReturnValue('tenant-001'),
  }
}))

import { tenantSQL, tenantWHERE } from '../../utils/tenantRepo'
import { TenantContextManager } from '../../utils/tenantContext'
import { deployConfig } from '../../config/deploy'

describe('tenantRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('tenant-001')
  })

  // ==================== tenantSQL ====================

  describe('tenantSQL', () => {
    it('SaaS模式有租户ID → 返回 AND tenant_id = ?', () => {
      const result = tenantSQL()
      expect(result.sql).toBe(' AND tenant_id = ?')
      expect(result.params).toEqual(['tenant-001'])
    })

    it('带前缀 → AND c.tenant_id = ?', () => {
      const result = tenantSQL('c.')
      expect(result.sql).toBe(' AND c.tenant_id = ?')
      expect(result.params).toEqual(['tenant-001'])
    })

    it('私有模式 → 空 SQL', () => {
      ;(deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
      const result = tenantSQL()
      expect(result.sql).toBe('')
      expect(result.params).toEqual([])
    })

    it('SaaS模式但无租户上下文 → 空 SQL', () => {
      ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
      const result = tenantSQL()
      expect(result.sql).toBe('')
      expect(result.params).toEqual([])
    })
  })

  // ==================== tenantWHERE ====================

  describe('tenantWHERE', () => {
    it('SaaS模式有租户ID → 返回 WHERE tenant_id = ?', () => {
      const result = tenantWHERE()
      expect(result.sql).toBe('WHERE tenant_id = ?')
      expect(result.params).toEqual(['tenant-001'])
    })

    it('带前缀 → WHERE o.tenant_id = ?', () => {
      const result = tenantWHERE('o.')
      expect(result.sql).toBe('WHERE o.tenant_id = ?')
      expect(result.params).toEqual(['tenant-001'])
    })

    it('私有模式 → 空 SQL', () => {
      ;(deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
      const result = tenantWHERE()
      expect(result.sql).toBe('')
      expect(result.params).toEqual([])
    })

    it('无租户上下文 → 空 SQL', () => {
      ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
      const result = tenantWHERE()
      expect(result.sql).toBe('')
      expect(result.params).toEqual([])
    })
  })
})
