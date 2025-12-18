/**
 * 客服权限管理API
 */
import { api } from './request'

// 客服类型枚举
export enum CustomerServiceType {
  AFTER_SALES = 'after_sales',
  AUDIT = 'audit',
  LOGISTICS = 'logistics',
  PRODUCT = 'product',
  GENERAL = 'general'
}

// 数据范围枚举
export enum DataScope {
  ALL = 'all',
  DEPARTMENT = 'department',
  SELF = 'self',
  CUSTOM = 'custom'
}

// 客服权限配置接口
export interface CustomerServicePermission {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  userDepartment?: string
  userDepartmentId?: string
  customerServiceType: string
  dataScope: string
  departmentIds: string[]
  customPermissions: string[]
  permissionTemplate?: string
  status: 'active' | 'inactive'
  remark?: string
  createdBy?: string
  createdByName?: string
  createdAt?: string
  updatedAt?: string
}

// 可用用户接口
export interface AvailableUser {
  id: string
  name: string
  email: string
  phone?: string
  department: string
  departmentId?: string
  role: string
  position?: string
}

// 统计数据接口
export interface PermissionStats {
  total: number
  active: number
  inactive: number
  configured: number
  configRate: number
  byType: Record<string, number>
}

// 创建客服权限请求
export interface CreatePermissionRequest {
  userId: string
  customerServiceType?: string
  dataScope?: string
  departmentIds?: string[]
  customPermissions?: string[]
  permissionTemplate?: string
  remark?: string
}

// 更新客服权限请求
export interface UpdatePermissionRequest {
  customerServiceType?: string
  dataScope?: string
  departmentIds?: string[]
  customPermissions?: string[]
  permissionTemplate?: string
  status?: 'active' | 'inactive'
  remark?: string
}

// 批量配置请求
export interface BatchConfigRequest {
  userIds: string[]
  customerServiceType?: string
  dataScope?: string
  customPermissions?: string[]
  permissionTemplate?: string
}

export const customerServicePermissionApi = {
  /**
   * 获取客服权限列表
   */
  async getList(params: {
    page?: number
    limit?: number
    customerServiceType?: string
    status?: string
    search?: string
  } = {}): Promise<{
    items: CustomerServicePermission[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const response = await api.get<any>('/customer-service-permissions', params)
    return response.data || response
  },

  /**
   * 获取统计数据
   */
  async getStats(): Promise<PermissionStats> {
    const response = await api.get<any>('/customer-service-permissions/stats')
    return response.data || response
  },

  /**
   * 获取可添加为客服的用户列表
   */
  async getAvailableUsers(): Promise<AvailableUser[]> {
    const response = await api.get<any>('/customer-service-permissions/available-users')
    return response.data || response
  },

  /**
   * 获取单个客服权限详情
   */
  async getById(id: string): Promise<CustomerServicePermission> {
    const response = await api.get<any>(`/customer-service-permissions/${id}`)
    return response.data || response
  },

  /**
   * 根据用户ID获取客服权限
   */
  async getByUserId(userId: string): Promise<CustomerServicePermission | null> {
    const response = await api.get<any>(`/customer-service-permissions/user/${userId}`)
    return response.data || null
  },

  /**
   * 创建客服权限配置
   */
  async create(data: CreatePermissionRequest): Promise<CustomerServicePermission> {
    const response = await api.post<any>('/customer-service-permissions', data)
    return response.data || response
  },

  /**
   * 更新客服权限配置
   */
  async update(id: string, data: UpdatePermissionRequest): Promise<CustomerServicePermission> {
    const response = await api.put<any>(`/customer-service-permissions/${id}`, data)
    return response.data || response
  },

  /**
   * 删除客服权限配置
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/customer-service-permissions/${id}`)
  },

  /**
   * 批量配置客服权限
   */
  async batchConfig(data: BatchConfigRequest): Promise<{
    total: number
    created: number
    updated: number
    failed: number
  }> {
    const response = await api.post<any>('/customer-service-permissions/batch', data)
    return response.data || response
  }
}

export default customerServicePermissionApi
