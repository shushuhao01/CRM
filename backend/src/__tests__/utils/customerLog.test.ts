/**
 * customerLog 客户操作日志工具单元测试
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-001')
}))

import { createCustomerLog } from '../../utils/customerLog'
import { AppDataSource } from '../../config/database'

describe('createCustomerLog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('基本参数 → 插入正确的 SQL 和参数', async () => {
    ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce(undefined)

    await createCustomerLog({
      customerId: 'cust-001',
      logType: 'follow_up',
      content: '跟进客户',
    })

    expect(AppDataSource.query).toHaveBeenCalledTimes(1)
    const [sql, params] = (AppDataSource.query as jest.Mock).mock.calls[0]
    expect(sql).toContain('INSERT INTO customer_logs')
    expect(params[0]).toBe('mock-uuid-001')       // id
    expect(params[1]).toBeNull()                   // tenantId (未提供)
    expect(params[2]).toBe('cust-001')             // customerId
    expect(params[3]).toBe('follow_up')            // logType
    expect(params[4]).toBe('跟进客户')              // content
    expect(params[5]).toBeNull()                   // detail (未提供)
    expect(params[6]).toBe('system')               // operatorId 默认
    expect(params[7]).toBe('系统')                  // operatorName 默认
  })

  it('包含全部参数 → detail 被 JSON.stringify', async () => {
    ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce(undefined)

    await createCustomerLog({
      customerId: 'cust-002',
      logType: 'status_change',
      content: '状态变更',
      detail: { from: 'active', to: 'inactive' },
      operatorId: 'user-001',
      operatorName: '张三',
      tenantId: 'tenant-001',
    })

    const [, params] = (AppDataSource.query as jest.Mock).mock.calls[0]
    expect(params[1]).toBe('tenant-001')
    expect(params[5]).toBe('{"from":"active","to":"inactive"}')
    expect(params[6]).toBe('user-001')
    expect(params[7]).toBe('张三')
  })

  it('数据库写入失败 → 不抛异常（静默处理）', async () => {
    ;(AppDataSource.query as jest.Mock).mockRejectedValueOnce(new Error('DB down'))

    // 不应该抛出异常
    await expect(
      createCustomerLog({
        customerId: 'cust-003',
        logType: 'error_test',
        content: '测试错误处理',
      })
    ).resolves.toBeUndefined()
  })

  it('detail 为 null → params 中为 null', async () => {
    ;(AppDataSource.query as jest.Mock).mockResolvedValueOnce(undefined)

    await createCustomerLog({
      customerId: 'cust-004',
      logType: 'note',
      content: '备注',
      detail: undefined,
    })

    const [, params] = (AppDataSource.query as jest.Mock).mock.calls[0]
    expect(params[5]).toBeNull()
  })
})
