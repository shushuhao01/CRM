import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { messageApi } from '@/api/message'
import { ElMessage } from 'element-plus'

// 消息类型枚举
export enum MessageType {
  ORDER_CREATED = 'order_created',
  ORDER_SIGNED = 'order_signed',
  ORDER_AUDIT_REJECTED = 'order_audit_rejected',
  ORDER_AUDIT_APPROVED = 'order_audit_approved',
  CUSTOMER_CREATED = 'customer_created',
  CUSTOMER_UPDATED = 'customer_updated',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_OVERDUE = 'payment_overdue',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  SYSTEM_MAINTENANCE = 'system_maintenance'
}

// 通知方式枚举
export enum NotificationMethod {
  DINGTALK = 'dingtalk',
  WECHAT_WORK = 'wechat_work',
  WECHAT_OFFICIAL = 'wechat_official',
  EMAIL = 'email',
  SYSTEM_MESSAGE = 'system_message',
  ANNOUNCEMENT = 'announcement'
}

// 部门消息订阅配置接口
export interface DepartmentSubscriptionConfig {
  departmentId: string
  departmentName: string
  isSubscribed: boolean
  notificationMethods: NotificationMethod[]
  customSettings?: {
    priority?: 'low' | 'normal' | 'high'
    scheduleEnabled?: boolean
    scheduleStart?: string
    scheduleEnd?: string
    excludeWeekends?: boolean
  }
}

// 消息订阅接口
export interface MessageSubscription {
  id: string
  messageType: MessageType
  name: string
  description: string
  category: string
  isGlobalEnabled: boolean
  globalNotificationMethods: NotificationMethod[]
  departmentConfigs: DepartmentSubscriptionConfig[]
  createdAt: string
  updatedAt: string
}

// 公告接口
export interface Announcement {
  id: string
  title: string
  content: string
  type: 'company' | 'department'
  targetDepartments: string[]
  isPopup: boolean
  isMarquee: boolean
  scheduledAt?: string
  publishedAt?: string
  status: 'draft' | 'scheduled' | 'published' | 'expired'
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 消息配置接口
export interface MessageConfig {
  id: string
  type: NotificationMethod
  name: string
  config: {
    webhook?: string
    token?: string
    secret?: string
    appId?: string
    appSecret?: string
    smtpHost?: string
    smtpPort?: number
    username?: string
    password?: string
  }
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

// 系统消息接口
export interface SystemMessage {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'error' | 'success'
  isRead: boolean
  userId: string
  createdAt: string
}

export const useMessageStore = defineStore('message', () => {
  // 状态
  const subscriptions = ref<MessageSubscription[]>([])
  const announcements = ref<Announcement[]>([])
  const configs = ref<MessageConfig[]>([])
  const systemMessages = ref<SystemMessage[]>([])
  const loading = ref(false)

  // 计算属性
  const unreadMessageCount = computed(() => {
    return systemMessages.value.filter(msg => !msg.isRead).length
  })

  const activeAnnouncements = computed(() => {
    return announcements.value.filter(ann =>
      ann.status === 'published' &&
      ann.isMarquee
    )
  })

  const popupAnnouncements = computed(() => {
    return announcements.value.filter(ann =>
      ann.status === 'published' &&
      ann.isPopup
    )
  })

  // 消息订阅相关方法
  const loadSubscriptions = async () => {
    try {
      loading.value = true
      const response = await messageApi.getSubscriptions()
      // 确保数据结构符合新的接口定义
      subscriptions.value = response.data.map((sub: any) => ({
        ...sub,
        isGlobalEnabled: sub.isGlobalEnabled ?? sub.isSubscribed ?? false,
        globalNotificationMethods: sub.globalNotificationMethods ?? sub.notificationMethods ?? [],
        departmentConfigs: sub.departmentConfigs ?? []
      }))
    } catch (error) {
      console.error('加载订阅设置失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateSubscription = async (id: string, data: Partial<MessageSubscription>) => {
    try {
      const response = await messageApi.updateSubscription(id, data)
      const index = subscriptions.value.findIndex(sub => sub.id === id)
      if (index !== -1) {
        subscriptions.value[index] = { ...subscriptions.value[index], ...data }
      }
      return response
    } catch (error) {
      console.error('更新订阅设置失败:', error)
      throw error
    }
  }

  // 更新部门级别的消息订阅设置
  const updateDepartmentSubscription = async (subscriptionId: string, departmentId: string, config: Partial<DepartmentSubscriptionConfig>) => {
    try {
      const response = await messageApi.updateDepartmentSubscription(subscriptionId, departmentId, config)
      const subscription = subscriptions.value.find(sub => sub.id === subscriptionId)
      if (subscription) {
        const deptConfigIndex = subscription.departmentConfigs.findIndex(cfg => cfg.departmentId === departmentId)
        if (deptConfigIndex !== -1) {
          subscription.departmentConfigs[deptConfigIndex] = { ...subscription.departmentConfigs[deptConfigIndex], ...config }
        }
      }
      return response
    } catch (error) {
      console.error('更新部门订阅设置失败:', error)
      throw error
    }
  }

  // 公告相关方法（管理员用，返回所有公告）
  const loadAnnouncements = async (params?: any) => {
    try {
      loading.value = true
      const response = await messageApi.getAnnouncements(params)
      // 后端返回格式是 { list: [], total: 0 }
      const data = response.data
      announcements.value = data?.list || data || []
      return response
    } catch (error) {
      console.error('加载公告失败:', error)
      // 确保在错误情况下也有一个空数组
      announcements.value = []
    } finally {
      loading.value = false
    }
  }

  // 加载当前用户的已发布公告（用于弹窗和消息铃铛）
  const loadUserAnnouncements = async () => {
    try {
      const response = await messageApi.getPublishedAnnouncements()
      if (response.success) {
        announcements.value = response.data || []
        console.log('[MessageStore] 加载用户公告:', announcements.value.length, '条')
      }
      return response
    } catch (error) {
      console.error('加载用户公告失败:', error)
      announcements.value = []
    }
  }

  const createAnnouncement = async (data: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await messageApi.createAnnouncement(data)
      // 确保announcements.value是一个有效数组
      if (!Array.isArray(announcements.value)) {
        announcements.value = []
      }
      announcements.value.unshift(response.data)
      ElMessage.success('公告创建成功')
      return response.data
    } catch (error) {
      console.error('创建公告失败:', error)
      ElMessage.error('创建公告失败')
      throw error
    }
  }

  const updateAnnouncement = async (id: string, data: Partial<Announcement>) => {
    try {
      const response = await messageApi.updateAnnouncement(id, data)
      // 确保announcements.value是一个有效数组
      if (!Array.isArray(announcements.value)) {
        announcements.value = []
      }
      const index = announcements.value.findIndex(ann => ann.id === id)
      if (index !== -1) {
        announcements.value[index] = { ...announcements.value[index], ...data }
      }
      ElMessage.success('公告更新成功')
      return response.data
    } catch (error) {
      console.error('更新公告失败:', error)
      ElMessage.error('更新公告失败')
      throw error
    }
  }

  const deleteAnnouncement = async (id: string) => {
    try {
      await messageApi.deleteAnnouncement(id)
      // 确保announcements.value是一个有效数组
      if (!Array.isArray(announcements.value)) {
        announcements.value = []
        return
      }
      const index = announcements.value.findIndex(ann => ann.id === id)
      if (index !== -1) {
        announcements.value.splice(index, 1)
      }
      ElMessage.success('公告删除成功')
    } catch (error) {
      console.error('删除公告失败:', error)
      ElMessage.error('删除公告失败')
    }
  }

  // 配置相关方法
  const loadConfigs = async () => {
    try {
      loading.value = true
      const response = await messageApi.getConfigs()
      configs.value = response.data
    } catch (error) {
      console.error('加载配置失败:', error)
      ElMessage.error('加载配置失败')
    } finally {
      loading.value = false
    }
  }

  const updateConfig = async (id: string, data: Partial<MessageConfig>) => {
    try {
      await messageApi.updateConfig(id, data)
      const index = configs.value.findIndex(config => config.id === id)
      if (index !== -1) {
        configs.value[index] = { ...configs.value[index], ...data }
      }
      ElMessage.success('配置更新成功')
    } catch (error) {
      console.error('更新配置失败:', error)
      ElMessage.error('更新配置失败')
    }
  }

  const testConfig = async (id: string) => {
    try {
      await messageApi.testConfig(id)
      ElMessage.success('配置测试成功')
    } catch (error) {
      console.error('配置测试失败:', error)
      ElMessage.error('配置测试失败')
    }
  }

  // 系统消息相关方法
  const loadSystemMessages = async (params?: any) => {
    try {
      const response = await messageApi.getSystemMessages(params)
      systemMessages.value = response.data
      return response
    } catch (error) {
      console.error('加载系统消息失败:', error)
      ElMessage.error('加载系统消息失败')
    }
  }

  const markMessageAsRead = async (id: string) => {
    try {
      await messageApi.markMessageAsRead(id)
      const message = systemMessages.value.find(msg => msg.id === id)
      if (message) {
        message.isRead = true
      }
    } catch (error) {
      console.error('标记消息已读失败:', error)
    }
  }

  const markAllMessagesAsRead = async () => {
    try {
      await messageApi.markAllMessagesAsRead()
      systemMessages.value.forEach(msg => {
        msg.isRead = true
      })
      ElMessage.success('所有消息已标记为已读')
    } catch (error) {
      console.error('标记所有消息已读失败:', error)
      ElMessage.error('标记消息已读失败')
    }
  }

  const markAnnouncementAsRead = async (id: string) => {
    try {
      // 调用API标记公告为已读
      await messageApi.markAnnouncementAsRead(id)
      // 更新本地状态
      const announcement = announcements.value.find(ann => ann.id === id)
      if (announcement) {
        (announcement as any).read = true
      }
    } catch (error) {
      console.error('标记公告已读失败:', error)
    }
  }

  return {
    // 状态
    subscriptions,
    announcements,
    configs,
    systemMessages,
    loading,

    // 计算属性
    unreadMessageCount,
    activeAnnouncements,
    popupAnnouncements,

    // 方法
    loadSubscriptions,
    updateSubscription,
    updateDepartmentSubscription,
    loadAnnouncements,
    loadUserAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    loadConfigs,
    updateConfig,
    testConfig,
    loadSystemMessages,
    markMessageAsRead,
    markAllMessagesAsRead,
    markAnnouncementAsRead,

    // API对象
    messageApi
  }
})
