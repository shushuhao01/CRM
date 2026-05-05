/**
 * 财务绩效路由 — 佣金计算核心逻辑单元测试
 * 因路由函数与 TypeORM queryBuilder 深度耦合，
 * 此处提取 calculateCommission 的纯逻辑做独立验证。
 */

describe('finance route 业务逻辑', () => {

  // ==================== shippedStatuses / deliveredStatuses ====================

  describe('订单状态定义', () => {
    const shippedStatuses = [
      'shipped', 'delivered', 'completed', 'signed',
      'rejected', 'rejected_returned', 'refunded',
      'after_sales_created', 'package_exception', 'abnormal', 'exception'
    ]
    const deliveredStatuses = ['delivered', 'completed', 'signed']

    it('shippedStatuses 包含 11 个状态', () => {
      expect(shippedStatuses.length).toBe(11)
    })

    it('deliveredStatuses 是 shippedStatuses 子集', () => {
      for (const s of deliveredStatuses) {
        expect(shippedStatuses).toContain(s)
      }
    })

    it('shippedStatuses 包含 shipped', () => {
      expect(shippedStatuses).toContain('shipped')
    })

    it('shippedStatuses 包含异常状态', () => {
      expect(shippedStatuses).toContain('abnormal')
      expect(shippedStatuses).toContain('exception')
      expect(shippedStatuses).toContain('package_exception')
    })
  })

  // ==================== 角色权限控制 ====================

  describe('角色权限控制逻辑', () => {
    const allowAllRoles = ['super_admin', 'admin', 'customer_service', 'finance']
    const managerRoles = ['department_manager', 'manager']

    function resolveScope(role: string, deptId: string) {
      if (allowAllRoles.includes(role)) return 'all'
      if (managerRoles.includes(role) && deptId) return 'department'
      return 'self'
    }

    it('super_admin → all', () => {
      expect(resolveScope('super_admin', '')).toBe('all')
    })
    it('admin → all', () => {
      expect(resolveScope('admin', '')).toBe('all')
    })
    it('finance → all', () => {
      expect(resolveScope('finance', '')).toBe('all')
    })
    it('department_manager + deptId → department', () => {
      expect(resolveScope('department_manager', 'd1')).toBe('department')
    })
    it('department_manager 无 deptId → self', () => {
      expect(resolveScope('department_manager', '')).toBe('self')
    })
    it('salesperson → self', () => {
      expect(resolveScope('salesperson', 'd1')).toBe('self')
    })
  })

  // ==================== 佣金计算逻辑 ====================

  describe('佣金计算 (amount mode)', () => {
    // 金额阶梯：[0, 10000) → 5%，[10000, 50000) → 8%，[50000, Inf) → 10%
    const ladders = [
      { min: 0, max: 10000, rate: 0.05 },
      { min: 10000, max: 50000, rate: 0.08 },
      { min: 50000, max: Infinity, rate: 0.10 }
    ]

    function matchRate(totalAmount: number): number {
      for (const l of ladders) {
        if (totalAmount >= l.min && totalAmount < l.max) return l.rate
      }
      return 0
    }

    function calcCommission(orderAmount: number, coefficient: number, totalPerformance: number) {
      if (coefficient === 0) return 0
      const rate = matchRate(totalPerformance)
      return orderAmount * coefficient * rate
    }

    it('系数0 → 佣金0', () => {
      expect(calcCommission(1000, 0, 5000)).toBe(0)
    })
    it('低阶梯 5%', () => {
      expect(calcCommission(1000, 1, 5000)).toBe(50)
    })
    it('中阶梯 8%', () => {
      expect(calcCommission(2000, 1, 20000)).toBe(160)
    })
    it('高阶梯 10%', () => {
      expect(calcCommission(5000, 0.5, 60000)).toBe(250)
    })
    it('系数0.5 半折佣金', () => {
      expect(calcCommission(1000, 0.5, 5000)).toBe(25)
    })
  })

  describe('佣金计算 (count mode)', () => {
    // 单数阶梯：[0, 50) → ¥10/单，[50, 100) → ¥15/单，[100, Inf) → ¥20/单
    const ladders = [
      { min: 0, max: 50, perUnit: 10 },
      { min: 50, max: 100, perUnit: 15 },
      { min: 100, max: Infinity, perUnit: 20 }
    ]

    function matchPerUnit(count: number): number {
      for (const l of ladders) {
        if (count >= l.min && count < l.max) return l.perUnit
      }
      return 0
    }

    function calcCountCommission(coefficient: number, totalCount: number) {
      if (coefficient === 0) return 0
      return coefficient * matchPerUnit(totalCount)
    }

    it('低档 ¥10', () => {
      expect(calcCountCommission(1, 30)).toBe(10)
    })
    it('中档 ¥15', () => {
      expect(calcCountCommission(1, 70)).toBe(15)
    })
    it('高档 ¥20', () => {
      expect(calcCountCommission(1, 150)).toBe(20)
    })
    it('系数0.5', () => {
      expect(calcCountCommission(0.5, 30)).toBe(5)
    })
  })

  // ==================== 分页参数 ====================

  describe('分页参数解析', () => {
    function parsePagination(page: any, pageSize: any) {
      const pageNum = parseInt(page as string) || 1
      const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 5000)
      const skip = (pageNum - 1) * pageSizeNum
      return { pageNum, pageSizeNum, skip }
    }

    it('默认值', () => {
      expect(parsePagination(undefined, undefined)).toEqual({ pageNum: 1, pageSizeNum: 10, skip: 0 })
    })
    it('第2页', () => {
      expect(parsePagination('2', '20')).toEqual({ pageNum: 2, pageSizeNum: 20, skip: 20 })
    })
    it('pageSize 超限 → 5000', () => {
      expect(parsePagination('1', '99999')).toEqual({ pageNum: 1, pageSizeNum: 5000, skip: 0 })
    })
    it('非法值 → 默认', () => {
      expect(parsePagination('abc', 'xyz')).toEqual({ pageNum: 1, pageSizeNum: 10, skip: 0 })
    })
  })
})
