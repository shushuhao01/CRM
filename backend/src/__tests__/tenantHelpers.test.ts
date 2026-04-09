/**
 * tenantHelpers 单元测试
 * 测试租户数据隔离辅助函数
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

  test('SaaS模式返回租户ID', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('tenant-123')
    expect(getCurrentTenantIdSafe()).toBe('tenant-123')
  })

  test('私有模式返回 undefined', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    expect(getCurrentTenantIdSafe()).toBeUndefined()
  })

  test('SaaS模式但无租户上下文返回 undefined', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue(undefined)
    expect(getCurrentTenantIdSafe()).toBeUndefined()
  })
})

describe('withTenant', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('SaaS模式添加 tenantId 到 where 条件', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const result = withTenant({ status: 'active' })
    expect(result).toEqual({ status: 'active', tenantId: 't1' })
  })

  test('私有模式不添加 tenantId', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    const result = withTenant({ status: 'active' })
    expect(result).toEqual({ status: 'active' })
  })

  test('无参数时 SaaS 模式返回仅 tenantId', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const result = withTenant()
    expect(result).toEqual({ tenantId: 't1' })
  })

  test('无参数时私有模式返回空对象', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    const result = withTenant()
    expect(result).toEqual({})
  })
})

describe('tenantRawSQL', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('SaaS模式返回 SQL 片段和参数', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const { sql, params } = tenantRawSQL()
    expect(sql).toBe(' AND tenant_id = ?')
    expect(params).toEqual(['t1'])
  })

  test('带别名的 SQL 片段', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const { sql, params } = tenantRawSQL('c.')
    expect(sql).toBe(' AND c.tenant_id = ?')
    expect(params).toEqual(['t1'])
  })

  test('私有模式返回空 SQL 和空参数', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    const { sql, params } = tenantRawSQL()
    expect(sql).toBe('')
    expect(params).toEqual([])
  })
})

describe('tenantWhereSQL', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('SaaS模式返回 WHERE 条件', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const { sql, params } = tenantWhereSQL()
    expect(sql).toBe('WHERE tenant_id = ?')
    expect(params).toEqual(['t1'])
  })

  test('带别名的 WHERE 条件', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const { sql, params } = tenantWhereSQL('c.')
    expect(sql).toBe('WHERE c.tenant_id = ?')
    expect(params).toEqual(['t1'])
  })

  test('私有模式返回空', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    const { sql, params } = tenantWhereSQL()
    expect(sql).toBe('')
    expect(params).toEqual([])
  })
})

describe('setTenantOnEntity', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('SaaS模式设置实体的 tenantId', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const entity: any = { name: 'test' }
    setTenantOnEntity(entity)
    expect(entity.tenantId).toBe('t1')
    expect(entity.tenant_id).toBe('t1')
  })

  test('已有 tenantId 不覆盖', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    const entity: any = { name: 'test', tenantId: 'existing-tenant' }
    setTenantOnEntity(entity)
    expect(entity.tenantId).toBe('existing-tenant')
  })

  test('私有模式不设置 tenantId', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(false)
    const entity: any = { name: 'test' }
    setTenantOnEntity(entity)
    expect(entity.tenantId).toBeUndefined()
  })

  test('null 实体不报错', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
    ;(TenantContextManager.getTenantId as jest.Mock).mockReturnValue('t1')
    expect(() => setTenantOnEntity(null)).not.toThrow()
  })
})

describe('setTenantOnEntities', () => {
  beforeEach(() => { jest.clearAllMocks() })

  test('批量设置实体的 tenantId', () => {
    (deployConfig.isSaaS as jest.Mock).mockReturnValue(true)
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

