/**
 * 管理后台 - 系统公告 API
 */
import request from './request'

export interface SystemAnnouncement {
  id: string
  title: string
  content: string
  type: string
  source: 'system'
  priority: string
  status: 'draft' | 'published' | 'expired'
  targetRoles?: string[]
  targetDepartments?: string[]
  targetTenants?: string[]
  startTime?: string
  endTime?: string
  isPinned: boolean
  isPopup: boolean
  isMarquee: boolean
  viewCount: number
  deliveredCount?: number
  readCount?: number
  createdBy?: string
  createdByName?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TenantOption {
  id: string
  name: string
  code: string
  status: string
}

export const announcementApi = {
  // 获取系统公告列表
  getList: (params?: { status?: string; type?: string; page?: number; pageSize?: number }) => {
    return request.get<{ list: SystemAnnouncement[]; total: number }>('/announcements', { params })
  },

  // 创建系统公告
  create: (data: {
    title: string
    content: string
    type?: string
    priority?: string
    targetRoles?: string[]
    targetDepartments?: string[]
    targetTenants?: string[]
    startTime?: string
    endTime?: string
    isPinned?: boolean
    isPopup?: boolean
    isMarquee?: boolean
  }) => {
    return request.post('/announcements', data)
  },

  // 更新系统公告
  update: (id: string, data: Partial<SystemAnnouncement>) => {
    return request.put(`/announcements/${id}`, data)
  },

  // 删除系统公告
  remove: (id: string) => {
    return request.delete(`/announcements/${id}`)
  },

  // 发布系统公告
  publish: (id: string) => {
    return request.post(`/announcements/${id}/publish`)
  },

  // 获取租户列表（用于生效范围选择）
  getTenants: () => {
    return request.get<TenantOption[]>('/announcements/tenants')
  }
}

