// 客户分组相关API服务
import { api } from './request'
import { API_ENDPOINTS } from './config'

// 客户分组接口
export interface CustomerGroup {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  customerCount: number
  createTime: string
  conditions: Array<{
    field: string
    operator: string
    value: string
  }>
}

// 分组查询参数接口
export interface GroupSearchParams {
  name?: string
  status?: string
  page?: number
  pageSize?: number
}

// 分组列表响应接口
export interface GroupListResponse {
  list: CustomerGroup[]
  total: number
  page: number
  pageSize: number
}

// 客户分组API服务
export const customerGroupApi = {
  // 获取分组列表
  getList: async (params?: GroupSearchParams) => {
    try {
      // 从localStorage获取数据
      const storedGroups = localStorage.getItem('customer_groups')
      const groups: CustomerGroup[] = storedGroups ? JSON.parse(storedGroups) : []
      
      let filteredGroups = groups
      
      // 应用搜索过滤
      if (params?.name) {
        filteredGroups = filteredGroups.filter(group => 
          group.name.toLowerCase().includes(params.name!.toLowerCase())
        )
      }
      
      if (params?.status) {
        filteredGroups = filteredGroups.filter(group => group.status === params.status)
      }
      
      // 分页处理
      const page = params?.page || 1
      const pageSize = params?.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginatedGroups = filteredGroups.slice(start, end)
      
      return {
        data: {
          list: paginatedGroups,
          total: filteredGroups.length,
          page,
          pageSize
        },
        code: 200,
        message: 'success',
        success: true
      }
    } catch (error) {
      console.error('获取分组列表失败:', error)
      return {
        data: { list: [], total: 0, page: 1, pageSize: 20 },
        code: 500,
        message: '获取分组列表失败',
        success: false
      }
    }
  },
  
  // 创建分组
  create: async (data: Omit<CustomerGroup, 'id' | 'createTime' | 'customerCount'>) => {
    try {
      const storedGroups = localStorage.getItem('customer_groups')
      const groups: CustomerGroup[] = storedGroups ? JSON.parse(storedGroups) : []
      
      const newGroup: CustomerGroup = {
        ...data,
        id: Date.now().toString(),
        createTime: new Date().toLocaleString('zh-CN'),
        customerCount: 0
      }
      
      groups.unshift(newGroup)
      localStorage.setItem('customer_groups', JSON.stringify(groups))
      
      return {
        data: newGroup,
        code: 200,
        message: 'success',
        success: true
      }
    } catch (error) {
      console.error('创建分组失败:', error)
      return {
        data: null,
        code: 500,
        message: '创建分组失败',
        success: false
      }
    }
  },
  
  // 更新分组
  update: async (id: string, data: Partial<CustomerGroup>) => {
    try {
      const storedGroups = localStorage.getItem('customer_groups')
      const groups: CustomerGroup[] = storedGroups ? JSON.parse(storedGroups) : []
      
      const index = groups.findIndex(group => group.id === id)
      if (index === -1) {
        return {
          data: null,
          code: 404,
          message: '分组不存在',
          success: false
        }
      }
      
      groups[index] = { ...groups[index], ...data }
      localStorage.setItem('customer_groups', JSON.stringify(groups))
      
      return {
        data: groups[index],
        code: 200,
        message: 'success',
        success: true
      }
    } catch (error) {
      console.error('更新分组失败:', error)
      return {
        data: null,
        code: 500,
        message: '更新分组失败',
        success: false
      }
    }
  },
  
  // 删除分组
  delete: async (id: string) => {
    try {
      const storedGroups = localStorage.getItem('customer_groups')
      const groups: CustomerGroup[] = storedGroups ? JSON.parse(storedGroups) : []
      
      const filteredGroups = groups.filter(group => group.id !== id)
      localStorage.setItem('customer_groups', JSON.stringify(filteredGroups))
      
      return {
        data: null,
        code: 200,
        message: 'success',
        success: true
      }
    } catch (error) {
      console.error('删除分组失败:', error)
      return {
        data: null,
        code: 500,
        message: '删除分组失败',
        success: false
      }
    }
  },
  
  // 获取分组详情
  getDetail: async (id: string) => {
    try {
      const storedGroups = localStorage.getItem('customer_groups')
      const groups: CustomerGroup[] = storedGroups ? JSON.parse(storedGroups) : []
      
      const group = groups.find(g => g.id === id)
      if (!group) {
        return {
          data: null,
          code: 404,
          message: '分组不存在',
          success: false
        }
      }
      
      return {
        data: group,
        code: 200,
        message: 'success',
        success: true
      }
    } catch (error) {
      console.error('获取分组详情失败:', error)
      return {
        data: null,
        code: 500,
        message: '获取分组详情失败',
        success: false
      }
    }
  }
}