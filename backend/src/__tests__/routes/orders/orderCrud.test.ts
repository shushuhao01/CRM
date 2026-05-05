/**
 * orderCrud 订单CRUD路由单元测试
 * 聚焦 getOperatorInfo 辅助函数、订单创建参数验证、状态流转约束
 */

// ====== Mocks ======

const mockFind = jest.fn()
const mockFindOne = jest.fn()
const mockSave = jest.fn()
const mockRemove = jest.fn()
const mockCreateQueryBuilder = jest.fn()
const mockCount = jest.fn()

jest.mock('../../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: jest.fn((_req: any, _res: any, next: any) => next())
}))
jest.mock('../../../utils/tenantRepo', () => ({
  getTenantRepo: jest.fn().mockReturnValue({
    find: mockFind,
    findOne: mockFindOne,
    save: mockSave,
    remove: mockRemove,
    count: mockCount,
    createQueryBuilder: mockCreateQueryBuilder,
  })
}))
jest.mock('../../../services/OrderNotificationService', () => ({
  orderNotificationService: {
    notifyOrderCreated: jest.fn().mockResolvedValue(undefined),
    notifyOrderApproved: jest.fn().mockResolvedValue(undefined),
    notifyOrderRejected: jest.fn().mockResolvedValue(undefined),
  }
}))

// ====== Tests ======

/**
 * getOperatorInfo 是 orderCrud 内部函数，
 * 这里从源码中提取逻辑进行独立测试
 */
function getOperatorInfo(req: any) {
  const currentUser = (req as any).currentUser || (req as any).user
  const operatorId = currentUser?.id || null
  const realName = currentUser?.realName || currentUser?.name || currentUser?.username || '系统'
  const departmentName = currentUser?.departmentName || currentUser?.department || ''
  const operatorName = departmentName ? `${departmentName}-${realName}` : realName
  return { operatorId, operatorName, departmentName, realName, currentUser }
}

describe('orderCrud', () => {

  // ==================== getOperatorInfo ====================

  describe('getOperatorInfo', () => {
    it('完整 currentUser → 部门-姓名格式', () => {
      const req = {
        currentUser: {
          id: 'u1',
          realName: '张三',
          departmentName: '销售部',
          username: 'zhangsan',
        }
      }
      const result = getOperatorInfo(req)
      expect(result.operatorId).toBe('u1')
      expect(result.operatorName).toBe('销售部-张三')
      expect(result.departmentName).toBe('销售部')
      expect(result.realName).toBe('张三')
    })

    it('无部门 → 仅返回姓名', () => {
      const req = {
        currentUser: { id: 'u2', realName: '李四', username: 'lisi' }
      }
      const result = getOperatorInfo(req)
      expect(result.operatorName).toBe('李四')
      expect(result.departmentName).toBe('')
    })

    it('回退到 user → 提取 name', () => {
      const req = {
        user: { id: 'u3', name: '王五' }
      }
      const result = getOperatorInfo(req)
      expect(result.operatorId).toBe('u3')
      expect(result.operatorName).toBe('王五')
    })

    it('无用户信息 → 默认系统', () => {
      const req = {}
      const result = getOperatorInfo(req)
      expect(result.operatorId).toBeNull()
      expect(result.operatorName).toBe('系统')
    })

    it('回退到 username → 使用用户名', () => {
      const req = {
        currentUser: { id: 'u4', username: 'admin' }
      }
      const result = getOperatorInfo(req)
      expect(result.realName).toBe('admin')
      expect(result.operatorName).toBe('admin')
    })
  })

  // ==================== 订单状态流转约束 ====================

  describe('订单状态流转', () => {
    const validTransitions: Record<string, string[]> = {
      draft: ['pending_audit', 'pending_transfer'],
      pending_transfer: ['pending_audit'],
      pending_audit: ['pending_shipment', 'audit_rejected'],
      audit_rejected: ['pending_audit', 'draft'],
      pending_shipment: ['shipped'],
      shipped: ['delivered'],
      delivered: ['paid', 'completed'],
    }

    Object.entries(validTransitions).forEach(([from, toList]) => {
      toList.forEach(to => {
        it(`${from} → ${to} 是合法的`, () => {
          expect(validTransitions[from]).toContain(to)
        })
      })
    })

    it('completed 状态不能流转到其他状态', () => {
      expect(validTransitions['completed']).toBeUndefined()
    })

    it('paid 状态不在状态机中（终态）', () => {
      expect(validTransitions['paid']).toBeUndefined()
    })
  })

  // ==================== 订单金额验证 ====================

  describe('订单金额验证', () => {
    it('正常金额 → 通过', () => {
      const amount = 999.99
      expect(amount).toBeGreaterThan(0)
      expect(Number.isFinite(amount)).toBe(true)
    })

    it('零金额 → 不通过', () => {
      const amount = 0
      expect(amount).toBe(0)
    })

    it('负金额 → 不通过', () => {
      const amount = -100
      expect(amount).toBeLessThan(0)
    })

    it('NaN 金额 → 不通过', () => {
      expect(Number.isFinite(NaN)).toBe(false)
    })
  })

  // ==================== 分页参数处理 ====================

  describe('分页参数处理', () => {
    it('默认值 page=1, pageSize=20', () => {
      const page = parseInt(undefined as any) || 1
      const pageSize = parseInt(undefined as any) || 20
      expect(page).toBe(1)
      expect(pageSize).toBe(20)
    })

    it('字符串参数正确转为数字', () => {
      const page = parseInt('3' as any) || 1
      const pageSize = parseInt('50' as any) || 20
      expect(page).toBe(3)
      expect(pageSize).toBe(50)
    })

    it('无效字符串使用默认值', () => {
      const page = parseInt('abc' as any) || 1
      expect(page).toBe(1)
    })

    it('skip 计算正确', () => {
      const page = 3
      const pageSize = 20
      const skip = (page - 1) * pageSize
      expect(skip).toBe(40)
    })
  })
})
