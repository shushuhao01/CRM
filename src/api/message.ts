import { api as request } from './request'
import type { MessageSubscription, Announcement, MessageConfig, SystemMessage, DepartmentSubscriptionConfig } from '@/stores/message'

export const messageApi = {
  // 消息订阅相关
  getSubscriptions: () => {
    return request.get('/message/subscriptions')
  },

  updateSubscription: (id: string, data: Partial<MessageSubscription>) => {
    return request.put(`/message/subscriptions/${id}`, data)
  },

  // 部门级别订阅配置
  getDepartmentSubscriptions: (departmentId?: string) => {
    const params = departmentId ? { departmentId } : {}
    return request.get('/message/subscriptions/departments', { params })
  },

  updateDepartmentSubscription: (subscriptionId: string, departmentId: string, config: Partial<DepartmentSubscriptionConfig>) => {
    return request.put(`/message/subscriptions/${subscriptionId}/departments/${departmentId}`, config)
  },

  batchUpdateDepartmentSubscriptions: (subscriptionId: string, configs: DepartmentSubscriptionConfig[]) => {
    return request.put(`/message/subscriptions/${subscriptionId}/departments/batch`, { configs })
  },

  // 公告相关
  getAnnouncements: (params?: any) => {
    return request.get('/message/announcements', { params })
  },

  createAnnouncement: (data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => {
    return request.post('/message/announcements', data)
  },

  updateAnnouncement: (id: string, data: Partial<Announcement>) => {
    return request.put(`/message/announcements/${id}`, data)
  },

  deleteAnnouncement: (id: string) => {
    return request.delete(`/message/announcements/${id}`)
  },

  publishAnnouncement: (id: string) => {
    return request.post(`/message/announcements/${id}/publish`)
  },

  // 配置相关
  getConfigs: () => {
    return request.get('/message/configs')
  },

  updateConfig: (id: string, data: Partial<MessageConfig>) => {
    return request.put(`/message/configs/${id}`, data)
  },

  testConfig: (id: string) => {
    return request.post(`/message/configs/${id}/test`)
  },

  // 系统消息相关
  getSystemMessages: (params?: any) => {
    return request.get('/message/system-messages', { params })
  },

  markMessageAsRead: (id: string) => {
    return request.put(`/message/system-messages/${id}/read`)
  },

  markAllMessagesAsRead: () => {
    return request.put('/message/system-messages/read-all')
  },

  // 统计相关
  getMessageStats: () => {
    return request.get('/message/stats')
  }
}