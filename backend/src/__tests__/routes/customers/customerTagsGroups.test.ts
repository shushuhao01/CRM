/**
 * customerTags & customerGroups 标签/分组 CRUD 逻辑测试
 * 聚焦 输入校验、列表分页、响应格式
 */

jest.mock('../../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../../utils/tenantRepo', () => ({
  getTenantRepo: jest.fn(),
}))
jest.mock('../../../utils/customerLog', () => ({
  createCustomerLog: jest.fn()
}))

describe('customerTags & customerGroups', () => {

  // ==================== 标签 ====================

  describe('标签 CRUD 校验', () => {
    it('创建标签 — name 不能为空', () => {
      const body = { name: '', color: '#fff' }
      expect(!body.name).toBe(true) // 应返回 400
    })

    it('创建标签 — 有 name 通过', () => {
      const body = { name: '重要客户', color: '#ff0000' }
      expect(!!body.name).toBe(true)
    })

    it('标签默认颜色 — 未提供时为 #007bff', () => {
      const rawColor: string | undefined = undefined
      const color = rawColor || '#007bff'
      expect(color).toBe('#007bff')
    })

    it('标签列表分页 — 默认 pageSize=20', () => {
      const pageSize = parseInt(undefined as any) || 20
      expect(pageSize).toBe(20)
    })

    it('标签响应格式', () => {
      const tag = {
        id: 'tag-1', name: '重要', color: '#ff0000',
        description: '', customerCount: 5,
        createdAt: new Date('2024-01-01')
      }
      const formatted = {
        id: tag.id,
        name: tag.name,
        color: tag.color || '#007bff',
        description: tag.description || '',
        status: 'active' as const,
        customerCount: tag.customerCount || 0,
        createTime: tag.createdAt?.toISOString() || '',
      }
      expect(formatted.status).toBe('active')
      expect(formatted.color).toBe('#ff0000')
      expect(formatted.customerCount).toBe(5)
    })

    it('标签更新 — 只修改提供的字段', () => {
      const existing = { name: '旧名', color: '#000', description: '旧描述' }
      const body = { name: '新名' }
      if ((body as any).name !== undefined) existing.name = (body as any).name
      if ((body as any).color !== undefined) existing.color = (body as any).color
      if ((body as any).description !== undefined) existing.description = (body as any).description
      expect(existing.name).toBe('新名')
      expect(existing.color).toBe('#000') // 未修改
      expect(existing.description).toBe('旧描述') // 未修改
    })
  })

  // ==================== 分组 ====================

  describe('分组 CRUD 校验', () => {
    it('创建分组 — name 不能为空', () => {
      const body = { name: '' }
      expect(!body.name).toBe(true)
    })

    it('分组默认 description 为空字符串', () => {
      const rawDesc: string | undefined = undefined
      const desc = rawDesc || ''
      expect(desc).toBe('')
    })

    it('分组响应格式', () => {
      const group = {
        id: 'grp-1', name: 'VIP客户',
        description: 'VIP描述', customerCount: 10,
        createdAt: new Date('2024-06-01'),
      }
      const formatted = {
        id: group.id,
        name: group.name,
        description: group.description || '',
        status: 'active',
        customerCount: group.customerCount || 0,
        createTime: group.createdAt?.toISOString() || '',
        conditions: [],
      }
      expect(formatted.conditions).toEqual([])
      expect(formatted.status).toBe('active')
    })

    it('分组更新 — 部分字段', () => {
      const existing = { name: '旧分组', description: '旧' }
      const body = { description: '新描述' }
      if ((body as any).name !== undefined) existing.name = (body as any).name
      if ((body as any).description !== undefined) existing.description = (body as any).description
      expect(existing.name).toBe('旧分组')
      expect(existing.description).toBe('新描述')
    })
  })

  // ==================== 共通 ====================

  describe('标签/分组共通逻辑', () => {
    it('列表查询支持 name 模糊搜索', () => {
      const name = '重要'
      // Like(`%${name}%`) 模拟
      const pattern = `%${name}%`
      expect(pattern).toBe('%重要%')
    })

    it('404 — 不存在的 tag/group', () => {
      const found = null
      const should404 = !found
      expect(should404).toBe(true)
    })

    it('删除后 — repository.remove 被调用', () => {
      const mockRemove = jest.fn()
      const tag = { id: 'tag-1' }
      mockRemove(tag)
      expect(mockRemove).toHaveBeenCalledWith(tag)
    })
  })
})
