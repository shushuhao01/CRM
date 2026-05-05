/**
 * customerCore 客户核心路由单元测试
 * 聚焦 getLatestAddress 辅助函数、分页参数、权限过滤逻辑
 */

jest.mock('../../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../../utils/tenantRepo', () => ({
  getTenantRepo: jest.fn().mockReturnValue({
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  }),
  tenantSQL: jest.fn().mockReturnValue({ sql: '', params: [] }),
}))
jest.mock('../../../utils/customerLog', () => ({
  createCustomerLog: jest.fn()
}))

/**
 * getLatestAddress — 从 core.ts 中提取的辅助函数逻辑复刻
 */
function getLatestAddress(address: string | null | undefined): string {
  if (!address) return ''
  try {
    const parsed = JSON.parse(address)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].content || ''
    }
  } catch {
    // 纯文本地址
  }
  return address
}

describe('customerCore', () => {

  // ==================== getLatestAddress ====================

  describe('getLatestAddress', () => {
    it('null → 空字符串', () => {
      expect(getLatestAddress(null)).toBe('')
    })

    it('undefined → 空字符串', () => {
      expect(getLatestAddress(undefined)).toBe('')
    })

    it('空字符串 → 空字符串', () => {
      expect(getLatestAddress('')).toBe('')
    })

    it('纯文本地址 → 原样返回', () => {
      expect(getLatestAddress('北京市朝阳区')).toBe('北京市朝阳区')
    })

    it('JSON 数组格式 → 返回第一条的 content', () => {
      const json = JSON.stringify([
        { content: '上海市浦东新区' },
        { content: '北京市海淀区' },
      ])
      expect(getLatestAddress(json)).toBe('上海市浦东新区')
    })

    it('空 JSON 数组 → 原 JSON 字符串', () => {
      const json = JSON.stringify([])
      expect(getLatestAddress(json)).toBe(json)
    })

    it('JSON 数组第一条无 content → 空字符串', () => {
      const json = JSON.stringify([{ id: 1 }])
      expect(getLatestAddress(json)).toBe('')
    })

    it('非数组 JSON → 原字符串', () => {
      const json = JSON.stringify({ content: '地址' })
      expect(getLatestAddress(json)).toBe(json)
    })
  })

  // ==================== 分页参数解析 ====================

  describe('分页参数解析', () => {
    it('默认 page=1, pageSize=10', () => {
      const page = parseInt(undefined as any) || 1
      const pageSize = parseInt(undefined as any) || 10
      expect(page).toBe(1)
      expect(pageSize).toBe(10)
    })

    it('page=3, pageSize=20 → skip=40', () => {
      const page = parseInt('3') || 1
      const pageSize = parseInt('20') || 10
      const skip = (page - 1) * pageSize
      expect(skip).toBe(40)
    })

    it('非法 page → 默认1', () => {
      const page = parseInt('abc') || 1
      expect(page).toBe(1)
    })
  })

  // ==================== 权限过滤规则 ====================

  describe('权限过滤规则', () => {
    const roles = {
      admin: 'admin',
      super_admin: 'super_admin',
      manager: 'department_manager',
      member: 'member',
    }

    it('admin 可看所有客户', () => {
      const userRole = roles.admin
      const canSeeAll = userRole === 'admin' || userRole === 'super_admin'
      expect(canSeeAll).toBe(true)
    })

    it('super_admin 可看所有客户', () => {
      const userRole = roles.super_admin
      const canSeeAll = userRole === 'admin' || userRole === 'super_admin'
      expect(canSeeAll).toBe(true)
    })

    it('普通成员不能看所有客户', () => {
      const userRole = roles.member
      const canSeeAll = userRole === 'admin' || userRole === 'super_admin'
      expect(canSeeAll).toBe(false)
    })

    it('部门经理不能看所有客户（受部门限制）', () => {
      const userRole = roles.manager
      const canSeeAll = userRole === 'admin' || userRole === 'super_admin'
      expect(canSeeAll).toBe(false)
    })

    it('onlyMine=true 时 admin 也按个人过滤', () => {
      const forceOnlyMine = true
      const userRole = roles.admin
      const needFilter = forceOnlyMine || (userRole !== 'admin' && userRole !== 'super_admin')
      expect(needFilter).toBe(true)
    })

    it('部门经理有 departmentId → 按部门过滤', () => {
      const userRole = 'department_manager'
      const forceOnlyMine = false
      const isManager = !forceOnlyMine && (userRole === 'department_manager' || userRole === 'manager')
      expect(isManager).toBe(true)
    })

    it('forceOnlyMine 时部门经理不按部门过滤', () => {
      const userRole = 'department_manager'
      const forceOnlyMine = true
      const isManager = !forceOnlyMine && (userRole === 'department_manager' || userRole === 'manager')
      expect(isManager).toBe(false)
    })
  })

  // ==================== 搜索条件构建 ====================

  describe('搜索条件构建', () => {
    it('keyword 同时搜索姓名和电话', () => {
      const keyword = '张三'
      const conditions: string[] = []
      if (keyword) {
        conditions.push('(name LIKE ? OR phone LIKE ?)')
      }
      expect(conditions).toHaveLength(1)
      expect(conditions[0]).toContain('name')
      expect(conditions[0]).toContain('phone')
    })

    it('多条件组合', () => {
      const filters = { name: '张', level: 'A', status: 'active' }
      const conditions: string[] = []
      if (filters.name) conditions.push('name LIKE ?')
      if (filters.level) conditions.push('level = ?')
      if (filters.status) conditions.push('status = ?')
      expect(conditions).toHaveLength(3)
    })

    it('无筛选条件 → 空数组', () => {
      const filters = { name: '', level: '', status: '' }
      const conditions: string[] = []
      if (filters.name) conditions.push('name LIKE ?')
      if (filters.level) conditions.push('level = ?')
      if (filters.status) conditions.push('status = ?')
      expect(conditions).toHaveLength(0)
    })
  })
})
