import { api as request } from './request'
import type { MessageSubscription, Announcement, MessageConfig, DepartmentSubscriptionConfig } from '@/stores/message'

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
    return request.get('/message/subscriptions/departments', departmentId ? { params: { departmentId } } : undefined)
  },

  updateDepartmentSubscription: (subscriptionId: string, departmentId: string, config: Partial<DepartmentSubscriptionConfig>) => {
    return request.put(`/message/subscriptions/${subscriptionId}/departments/${departmentId}`, config)
  },

  batchUpdateDepartmentSubscriptions: (subscriptionId: string, configs: DepartmentSubscriptionConfig[]) => {
    return request.put(`/message/subscriptions/${subscriptionId}/departments/batch`, { configs })
  },

  // 公告相关
  getAnnouncements: async (params?: any) => {
    try {
      // 🔥 修复：api.get 需要 { params } 结构，否则查询参数不会附加到请求上
      return await request.get('/message/announcements', params ? { params } : undefined)
    } catch (error: any) {
      // 【修复】如果是404或502错误，返回空数据而不是抛出错误
      if (error?.status === 404 || error?.status === 502 || error?.status === 500) {
        console.log('[Message API] 公告功能未启用或后端未实现')
        return { success: true, data: { list: [], total: 0 } }
      }
      throw error
    }
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

  // 获取当前用户的已发布公告（用于弹窗和消息铃铛）
  getPublishedAnnouncements: async () => {
    try {
      return await request.get('/message/announcements/published')
    } catch (error: any) {
      if (error?.status === 404 || error?.status === 502 || error?.status === 500) {
        console.log('[Message API] 公告功能未启用或后端未实现')
        return { success: true, data: [] }
      }
      throw error
    }
  },

  // 标记公告为已读
  markAnnouncementAsRead: (id: string) => {
    return request.put(`/message/announcements/${id}/read`)
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

  // =====================================================
  // 系统消息相关 - 🔥 跨设备消息通知
  // =====================================================

  getSystemMessages: async (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
    try {
      // 转换参数格式
      const queryParams: Record<string, string | number> = {}
      if (params?.limit) queryParams.limit = params.limit
      if (params?.offset) queryParams.offset = params.offset
      if (params?.unreadOnly !== undefined) queryParams.unreadOnly = params.unreadOnly ? 'true' : 'false'

      // 🔥 修复：api.get 第二个参数必须是 { params } 结构，之前平铺传参导致 limit/offset 从未生效（翻页失效）
      return await request.get('/message/system-messages', { params: queryParams })
    } catch (error: any) {
      // 🔥 静默处理所有错误，包括401未授权
      if (error?.status === 401 || error?.status === 404 || error?.status === 502 || error?.status === 500) {
        console.log('[Message API] 系统消息功能未启用或未授权（静默处理）')
        return { success: true, data: { messages: [], total: 0, unreadCount: 0 } }
      }
      // 其他错误也静默处理
      console.log('[Message API] 获取系统消息失败（静默处理）:', error?.message || error)
      return { success: true, data: { messages: [], total: 0, unreadCount: 0 } }
    }
  },

  // 🔥 发送系统消息到数据库
  sendSystemMessage: async (data: {
    type: string
    title: string
    content: string
    targetUserId: string
    priority?: string
    category?: string
    relatedId?: string
    relatedType?: string
    actionUrl?: string
  }) => {
    try {
      return await request.post('/message/system-messages/send', data)
    } catch (error: any) {
      console.error('[Message API] 发送系统消息失败:', error)
      throw error
    }
  },

  // 🔥 批量发送系统消息
  sendBatchSystemMessages: async (messages: Array<{
    type: string
    title: string
    content: string
    targetUserId: string
    priority?: string
    category?: string
    relatedId?: string
    relatedType?: string
    actionUrl?: string
  }>) => {
    try {
      return await request.post('/message/system-messages/send-batch', { messages })
    } catch (error: any) {
      console.error('[Message API] 批量发送系统消息失败:', error)
      throw error
    }
  },

  markMessageAsRead: (id: string) => {
    return request.put(`/message/system-messages/${id}/read`)
  },

  markAllMessagesAsRead: () => {
    return request.put('/message/system-messages/read-all')
  },

  // 🔥 删除单条消息
  deleteMessage: (id: string) => {
    return request.delete(`/message/system-messages/${id}`)
  },

  // 🔥 清空当前用户的所有消息
  clearAllMessages: () => {
    return request.delete('/message/system-messages/clear-all')
  },

  // 统计相关
  getMessageStats: () => {
    return request.get('/message/stats')
  },

  // =====================================================
  // 通知渠道配置管理 - 🔥 跨平台通知配置
  // =====================================================

  // 获取通知渠道配置列表
  getNotificationChannels: async () => {
    try {
      return await request.get('/message/notification-channels')
    } catch (error: any) {
      // 如果是404或500错误，返回空数据
      if (error?.status === 404 || error?.status === 500) {
        console.log('[Message API] 通知渠道功能未启用或后端未实现')
        return { success: true, data: [] }
      }
      throw error
    }
  },

  // 创建通知渠道配置
  createNotificationChannel: (data: {
    name: string
    channelType: string
    config?: Record<string, any>
    messageTypes?: string[]
    targetType?: string
    targetDepartments?: string[]
    targetUsers?: string[]
    targetRoles?: string[]
    priorityFilter?: string
  }) => {
    return request.post('/message/notification-channels', data)
  },

  // 更新通知渠道配置
  updateNotificationChannel: (id: string, data: any) => {
    return request.put(`/message/notification-channels/${id}`, data)
  },

  // 删除通知渠道配置
  deleteNotificationChannel: (id: string) => {
    return request.delete(`/message/notification-channels/${id}`)
  },

  // 测试通知渠道
  testNotificationChannel: (id: string, testMessage?: string) => {
    return request.post(`/message/notification-channels/${id}/test`, { testMessage })
  },

  // 获取通知发送记录
  getNotificationLogs: (params?: { channelId?: string; status?: string; page?: number; pageSize?: number }) => {
    return request.get('/message/notification-logs', params ? { params: params as Record<string, string | number | undefined> } : undefined)
  },

  // 获取通知配置选项
  getNotificationOptions: () => {
    return request.get('/message/notification-options')
  }
}
