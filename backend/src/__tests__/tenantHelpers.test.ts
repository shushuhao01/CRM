/**
 * tenantHelpers 单元测试
 * 测试租户数据隔离辅助函数
 *
 * 🔒 安全防护：无论部署模式，只要上下文中有 tenantId 就做隔离
 * 防止配置错误降级时跨租户数据泄漏
 */

// Mock 依赖
jest.mock('../utils/tenantContext', () => ({
  TenantContextManager: {
    getTenantId: jest.fn(),
    setTenantId: jest.fn()
  }
}))

jest.mock('../config/deploy', () => ({
  deployConfig: {
    isSaaS: jest.fn()
  }
}))

import {
  getCurrentTenantIdSafe,
  withTenant,
  tenantRawSQL,
  tenantWhereSQL,
  setTenantOnEntity,
  setTenantOnEntities
} from '../utils/tenantHelpers'
import { TenantContextManager } from '../utils/tenantContext'
import { deployConfig } from '../config/deploy'

describe('getCurrentTenantIdSafe', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('有租户上下文时返回租户ID（SaaS模式）', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('tenant-123')
    expect(getCurrentTenantIdSafe()).toBe('tenant-123')
  })

  test('有租户上下文时返回租户ID（private模式降级场景）', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('tenant-123')
    expect(getCurrentTenantIdSafe()).toBe('tenant-123')
  })

  test('无租户上下文返回 undefined', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
    expect(getCurrentTenantIdSafe()).toBeUndefined()
  })

  test('私有模式且无上下文返回 undefined', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
    expect(getCurrentTenantIdSafe()).toBeUndefined()
  })
})

describe('withTenant', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('有上下文时添加 tenantId 到 where 条件', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const result = withTenant({ status: 'active' })
    expect(result).toEqual({ status: 'active', tenantId: 't1' })
  })

  test('降级模式下有上下文仍添加 tenantId（安全兜底）', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const result = withTenant({ status: 'active' })
    expect(result).toEqual({ status: 'active', tenantId: 't1' })
  })

  test('无上下文时不添加 tenantId', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
    const result = withTenant({ status: 'active' })
    expect(result).toEqual({ status: 'active' })
  })

  test('无参数有上下文时返回仅 tenantId', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const result = withTenant()
    expect(result).toEqual({ tenantId: 't1' })
  })

  test('无参数无上下文时返回空对象', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
    const result = withTenant()
    expect(result).toEqual({})
  })
})

describe('tenantRawSQL', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('有上下文时返回 SQL 片段和参数', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const { sql, params } = tenantRawSQL()
    expect(sql).toBe(' AND tenant_id = ?')
    expect(params).toEqual(['t1'])
  })

  test('带别名的 SQL 片段', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const { sql, params } = tenantRawSQL('c.')
    expect(sql).toBe(' AND c.tenant_id = ?')
    expect(params).toEqual(['t1'])
  })

  test('无上下文时返回空 SQL 和空参数', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
    const { sql, params } = tenantRawSQL()
    expect(sql).toBe('')
    expect(params).toEqual([])
  })
})

describe('tenantWhereSQL', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('有上下文时返回 WHERE 条件', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const { sql, params } = tenantWhereSQL()
    expect(sql).toBe('WHERE tenant_id = ?')
    expect(params).toEqual(['t1'])
  })

  test('带别名的 WHERE 条件', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const { sql, params } = tenantWhereSQL('c.')
    expect(sql).toBe('WHERE c.tenant_id = ?')
    expect(params).toEqual(['t1'])
  })

  test('无上下文时返回空', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
    const { sql, params } = tenantWhereSQL()
    expect(sql).toBe('')
    expect(params).toEqual([])
  })
})

describe('setTenantOnEntity', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('有上下文时设置实体的 tenantId', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const entity: any = { name: 'test' }
    setTenantOnEntity(entity)
    expect(entity.tenantId).toBe('t1')
    expect(entity.tenant_id).toBe('t1')
  })

  test('降级模式有上下文时仍设置 tenantId（安全兜底）', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const entity: any = { name: 'test' }
    setTenantOnEntity(entity)
    expect(entity.tenantId).toBe('t1')
  })

  test('已有 tenantId 不覆盖', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const entity: any = { name: 'test', tenantId: 'existing-tenant' }
    setTenantOnEntity(entity)
    expect(entity.tenantId).toBe('existing-tenant')
  })

  test('无上下文时不设置 tenantId', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
    const entity: any = { name: 'test' }
    setTenantOnEntity(entity)
    expect(entity.tenantId).toBeUndefined()
  })

  test('null 实体不报错', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    expect(() => setTenantOnEntity(null)).not.toThrow()
  })
})

describe('setTenantOnEntities', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('批量设置实体的 tenantId', () => {
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const entities: any[] = [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
    setTenantOnEntities(entities)
    entities.forEach(e => {
      expect(e.tenantId).toBe('t1')
    })
  })

  test('空数组不报错', () => {
    expect(() => setTenantOnEntities([])).not.toThrow()
  })
})
