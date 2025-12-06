// 客户标签相关API服务
import { api } from './request'
import { API_ENDPOINTS } from './config'

// 客户标签接口
export interface CustomerTag {
  id: string
  name: string
  color: string
  customerCount: number
  status: 'active' | 'inactive'
  createTime: string
  description?: string
}

// 标签查询参数接口
export interface TagSearchParams {
  name?: string
  status?: string
  page?: number
  pageSize?: number
}

// 标签列表响应接口
export interface TagListResponse {
  list: CustomerTag[]
  total: number
  page: number
  pageSize: number
}

// 检测是否为生产环境
const isProductionEnv = (): boolean => {
  const hostname = window.location.hostname
  return (
    hostname.includes('abc789.cn') ||
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app') ||
    hostname.includes('railway.app') ||
    (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))
  )
}

// 客户标签API服务
export const customerTagApi = {
  // 获取标签列表
  getList: async (params?: TagSearchParams) => {
    // 生产环境调用真实API
    if (isProductionEnv()) {
      try {
        console.log('[CustomerTagApi] 生产环境：调用真实API')
        return await api.get<TagListResponse>(API_ENDPOINTS.CUSTOMERS.TAGS.LIST, params)
      } catch (error) {
        console.error('[CustomerTagApi] API调用失败:', error)
        throw error
      }
    }

    // 开发环境使用localStorage
    try {
      const storedTags = localStorage.getItem('customer_tags')
      const tags: CustomerTag[] = storedTags ? JSON.parse(storedTags) : []

      let filteredTags = tags

      if (params?.name) {
        filteredTags = filteredTags.filter(tag =>
          tag.name.toLowerCase().includes(params.name!.toLowerCase())
        )
      }

      if (params?.status) {
        filteredTags = filteredTags.filter(tag => tag.status === params.status)
      }

      const page = params?.page || 1
      const pageSize = params?.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginatedTags = filteredTags.slice(start, end)

      return {
        data: { list: paginatedTags, total: filteredTags.length, page, pageSize },
        code: 200,
        message: 'success',
        success: true
      }
    } catch (error) {
      console.error('获取标签列表失败:', error)
      return {
        data: { list: [], total: 0, page: 1, pageSize: 20 },
        code: 500,
        message: '获取标签列表失败',
        success: false
      }
    }
  },

  // 创建标签
  create: async (data: Omit<CustomerTag, 'id' | 'createTime' | 'customerCount'>) => {
    // 生产环境调用真实API
    if (isProductionEnv()) {
      try {
        console.log('[CustomerTagApi] 生产环境：创建标签')
        return await api.post<CustomerTag>(API_ENDPOINTS.CUSTOMERS.TAGS.CREATE, data)
      } catch (error) {
        console.error('[CustomerTagApi] 创建标签失败:', error)
        throw error
      }
    }

    // 开发环境使用localStorage
    try {
      const storedTags = localStorage.getItem('customer_tags')
      const tags: CustomerTag[] = storedTags ? JSON.parse(storedTags) : []

      const newTag: CustomerTag = {
        ...data,
        id: Date.now().toString(),
        createTime: new Date().toLocaleString('zh-CN'),
        customerCount: 0
      }

      tags.unshift(newTag)
      localStorage.setItem('customer_tags', JSON.stringify(tags))

      return { data: newTag, code: 200, message: 'success', success: true }
    } catch (error) {
      console.error('创建标签失败:', error)
      return { data: null, code: 500, message: '创建标签失败', success: false }
    }
  },

  // 更新标签
  update: async (id: string, data: Partial<CustomerTag>) => {
    // 生产环境调用真实API
    if (isProductionEnv()) {
      try {
        console.log('[CustomerTagApi] 生产环境：更新标签')
        return await api.put<CustomerTag>(API_ENDPOINTS.CUSTOMERS.TAGS.UPDATE(id), data)
      } catch (error) {
        console.error('[CustomerTagApi] 更新标签失败:', error)
        throw error
      }
    }

    // 开发环境使用localStorage
    try {
      const storedTags = localStorage.getItem('customer_tags')
      const tags: CustomerTag[] = storedTags ? JSON.parse(storedTags) : []

      const index = tags.findIndex(tag => tag.id === id)
      if (index === -1) {
        return { data: null, code: 404, message: '标签不存在', success: false }
      }

      tags[index] = { ...tags[index], ...data }
      localStorage.setItem('customer_tags', JSON.stringify(tags))

      return { data: tags[index], code: 200, message: 'success', success: true }
    } catch (error) {
      console.error('更新标签失败:', error)
      return { data: null, code: 500, message: '更新标签失败', success: false }
    }
  },

  // 删除标签
  delete: async (id: string) => {
    // 生产环境调用真实API
    if (isProductionEnv()) {
      try {
        console.log('[CustomerTagApi] 生产环境：删除标签')
        return await api.delete(API_ENDPOINTS.CUSTOMERS.TAGS.DELETE(id))
      } catch (error) {
        console.error('[CustomerTagApi] 删除标签失败:', error)
        throw error
      }
    }

    // 开发环境使用localStorage
    try {
      const storedTags = localStorage.getItem('customer_tags')
      const tags: CustomerTag[] = storedTags ? JSON.parse(storedTags) : []

      const filteredTags = tags.filter(tag => tag.id !== id)
      localStorage.setItem('customer_tags', JSON.stringify(filteredTags))

      return { data: null, code: 200, message: 'success', success: true }
    } catch (error) {
      console.error('删除标签失败:', error)
      return { data: null, code: 500, message: '删除标签失败', success: false }
    }
  },

  // 获取标签详情
  getDetail: async (id: string) => {
    // 生产环境调用真实API
    if (isProductionEnv()) {
      try {
        console.log('[CustomerTagApi] 生产环境：获取标签详情')
        return await api.get<CustomerTag>(API_ENDPOINTS.CUSTOMERS.TAGS.DETAIL(id))
      } catch (error) {
        console.error('[CustomerTagApi] 获取标签详情失败:', error)
        throw error
      }
    }

    // 开发环境使用localStorage
    try {
      const storedTags = localStorage.getItem('customer_tags')
      const tags: CustomerTag[] = storedTags ? JSON.parse(storedTags) : []

      const tag = tags.find(t => t.id === id)
      if (!tag) {
        return { data: null, code: 404, message: '标签不存在', success: false }
      }

      return { data: tag, code: 200, message: 'success', success: true }
    } catch (error) {
      console.error('获取标签详情失败:', error)
      return { data: null, code: 500, message: '获取标签详情失败', success: false }
    }
  },

  // 获取所有启用的标签（用于下拉选择）
  getActiveList: async () => {
    // 生产环境调用真实API
    if (isProductionEnv()) {
      try {
        console.log('[CustomerTagApi] 生产环境：获取启用标签列表')
        return await api.get<CustomerTag[]>(API_ENDPOINTS.CUSTOMERS.TAGS.LIST, { status: 'active' })
      } catch (error) {
        console.error('[CustomerTagApi] 获取启用标签列表失败:', error)
        throw error
      }
    }

    // 开发环境使用localStorage
    try {
      const storedTags = localStorage.getItem('customer_tags')
      const tags: CustomerTag[] = storedTags ? JSON.parse(storedTags) : []

      const activeTags = tags.filter(tag => tag.status === 'active')

      return { data: activeTags, code: 200, message: 'success', success: true }
    } catch (error) {
      console.error('获取启用标签列表失败:', error)
      return { data: [], code: 500, message: '获取启用标签列表失败', success: false }
    }
  }
}
