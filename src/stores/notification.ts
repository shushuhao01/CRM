import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 消息类型枚举
export enum MessageType {
  // 订单相关
  ORDER_CREATED = 'order_created',
  ORDER_SUBMITTED = 'order_submitted', // 订单提交成功
  ORDER_PAID = 'order_paid',
  ORDER_PENDING_SHIPMENT = 'order_pending_shipment', // 【批次201新增】订单待发货
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_SIGNED = 'order_signed',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_CANCEL_REQUEST = 'order_cancel_request', // 订单取消申请
  ORDER_CANCEL_APPROVED = 'order_cancel_approved', // 订单取消通过
  ORDER_MODIFY_APPROVED = 'order_modify_approved', // 订单修改申请通过
  ORDER_REFUNDED = 'order_refunded',

  // 售后相关
  AFTER_SALES_CREATED = 'after_sales_created',
  AFTER_SALES_ASSIGNED = 'after_sales_assigned', // 售后分配
  AFTER_SALES_PROCESSING = 'after_sales_processing', // 售后处理
  AFTER_SALES_URGENT = 'after_sales_urgent', // 紧急售后
  AFTER_SALES_COMPLETED = 'after_sales_completed', // 售后完成
  AFTER_SALES_CLOSED = 'after_sales_closed', // 售后关闭
  AFTER_SALES_DELETED = 'after_sales_deleted', // 售后删除

  // 客户相关
  CUSTOMER_CREATED = 'customer_created', // 客户添加成功
  CUSTOMER_UPDATED = 'customer_updated',
  CUSTOMER_CALL = 'customer_call',
  CUSTOMER_SHARE = 'customer_share', // 客户分享
  CUSTOMER_COMPLAINT = 'customer_complaint',
  CUSTOMER_REJECTED = 'customer_rejected', // 客户拒收

  // 商品相关
  PRODUCT_CREATED = 'product_created', // 商品添加成功
  PRODUCT_UPDATED = 'product_updated',
  PRODUCT_OUT_OF_STOCK = 'product_out_of_stock',

  // 系统相关
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_UPDATE = 'system_update',
  USER_LOGIN = 'user_login',
  USER_CREATED = 'user_created', // 系统用户添加成功
  PERMISSION_CONFIGURED = 'permission_configured', // 权限配置成功
  DATA_EXPORT_SUCCESS = 'data_export_success', // 导出成功
  DATA_IMPORT_COMPLETED = 'data_import_completed', // 导入完成

  // 物流相关
  LOGISTICS_PICKUP = 'logistics_pickup',
  LOGISTICS_IN_TRANSIT = 'logistics_in_transit',
  LOGISTICS_DELIVERED = 'logistics_delivered',
  PACKAGE_ANOMALY = 'package_anomaly',

  // 审核相关
  AUDIT_PENDING = 'audit_pending',
  AUDIT_APPROVED = 'audit_approved',
  AUDIT_REJECTED = 'audit_rejected',

  // 业绩分享相关
  PERFORMANCE_SHARE_CREATED = 'performance_share_created', // 业绩分享创建
  PERFORMANCE_SHARE_RECEIVED = 'performance_share_received', // 收到业绩分享
  PERFORMANCE_SHARE_CONFIRMED = 'performance_share_confirmed', // 业绩分享确认
  PERFORMANCE_SHARE_REJECTED = 'performance_share_rejected', // 业绩分享拒绝
  PERFORMANCE_SHARE_CANCELLED = 'performance_share_cancelled', // 业绩分享取消

  // 短信相关
  SMS_TEMPLATE_APPLIED = 'sms_template_applied', // 短信模板申请
  SMS_TEMPLATE_APPROVED = 'sms_template_approved', // 短信模板审核通过
  SMS_TEMPLATE_REJECTED = 'sms_template_rejected', // 短信模板审核拒绝
  SMS_SEND_APPLIED = 'sms_send_applied', // 短信发送申请
  SMS_SEND_APPROVED = 'sms_send_approved', // 短信发送审核通过
  SMS_SEND_REJECTED = 'sms_send_rejected', // 短信发送审核拒绝
  SMS_SEND_SUCCESS = 'sms_send_success', // 短信发送成功
  SMS_SEND_FAILED = 'sms_send_failed' // 短信发送失败
}

// 消息优先级
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// 消息接口
export interface NotificationMessage {
  id: string
  type: MessageType
  title: string
  content: string
  priority: MessagePriority
  time: string
  read: boolean
  icon: string
  color: string
  category: string
  relatedId?: string | number
  relatedType?: string
  actionUrl?: string
}

// 消息模板配置
export const MESSAGE_TEMPLATES: Record<MessageType, {
  title: string
  icon: string
  color: string
  category: string
  priority: MessagePriority
}> = {
  // 订单相关模板
  [MessageType.ORDER_CREATED]: {
    title: '新订单创建',
    icon: 'Plus',
    color: '#409EFF',
    category: '订单通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.ORDER_SUBMITTED]: {
    title: '订单提交成功',
    icon: 'DocumentAdd',
    color: '#67C23A',
    category: '订单通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_PAID]: {
    title: '订单已支付',
    icon: 'Money',
    color: '#67C23A',
    category: '订单通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_PENDING_SHIPMENT]: {
    title: '订单待发货',
    icon: 'Box',
    color: '#E6A23C',
    category: '订单通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.ORDER_SHIPPED]: {
    title: '订单已发货',
    icon: 'Van',
    color: '#409EFF',
    category: '物流通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.ORDER_DELIVERED]: {
    title: '订单已送达',
    icon: 'Check',
    color: '#67C23A',
    category: '物流通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.ORDER_SIGNED]: {
    title: '订单已签收',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '订单通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_CANCELLED]: {
    title: '订单已取消',
    icon: 'Close',
    color: '#F56C6C',
    category: '订单通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.ORDER_CANCEL_REQUEST]: {
    title: '订单取消申请',
    icon: 'Document',
    color: '#E6A23C',
    category: '审核通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_CANCEL_APPROVED]: {
    title: '订单取消通过',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '审核通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_MODIFY_APPROVED]: {
    title: '订单修改申请通过',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '审核通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_REFUNDED]: {
    title: '订单已退款',
    icon: 'RefreshLeft',
    color: '#E6A23C',
    category: '订单通知',
    priority: MessagePriority.HIGH
  },

  // 售后相关模板
  [MessageType.AFTER_SALES_CREATED]: {
    title: '新售后申请',
    icon: 'Service',
    color: '#E6A23C',
    category: '售后通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.AFTER_SALES_ASSIGNED]: {
    title: '售后分配',
    icon: 'User',
    color: '#409EFF',
    category: '售后通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.AFTER_SALES_PROCESSING]: {
    title: '售后处理',
    icon: 'Loading',
    color: '#409EFF',
    category: '售后通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.AFTER_SALES_URGENT]: {
    title: '紧急售后',
    icon: 'Warning',
    color: '#F56C6C',
    category: '售后通知',
    priority: MessagePriority.URGENT
  },
  [MessageType.AFTER_SALES_COMPLETED]: {
    title: '售后完成',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '售后通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.AFTER_SALES_CLOSED]: {
    title: '售后关闭',
    icon: 'CircleClose',
    color: '#909399',
    category: '售后通知',
    priority: MessagePriority.LOW
  },
  [MessageType.AFTER_SALES_DELETED]: {
    title: '售后删除',
    icon: 'Delete',
    color: '#F56C6C',
    category: '售后通知',
    priority: MessagePriority.LOW
  },

  // 客户相关模板
  [MessageType.CUSTOMER_CREATED]: {
    title: '客户添加成功',
    icon: 'User',
    color: '#13C2C2',
    category: '客户通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.CUSTOMER_UPDATED]: {
    title: '客户信息更新',
    icon: 'Edit',
    color: '#409EFF',
    category: '客户通知',
    priority: MessagePriority.LOW
  },
  [MessageType.CUSTOMER_CALL]: {
    title: '客户外呼',
    icon: 'Phone',
    color: '#722ED1',
    category: '客服通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.CUSTOMER_SHARE]: {
    title: '客户分享',
    icon: 'Share',
    color: '#409EFF',
    category: '客户通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.CUSTOMER_COMPLAINT]: {
    title: '客户投诉',
    icon: 'Warning',
    color: '#F56C6C',
    category: '客服通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.CUSTOMER_REJECTED]: {
    title: '客户拒收',
    icon: 'Close',
    color: '#F56C6C',
    category: '客户通知',
    priority: MessagePriority.HIGH
  },

  // 商品相关模板
  [MessageType.PRODUCT_CREATED]: {
    title: '商品添加成功',
    icon: 'Goods',
    color: '#67C23A',
    category: '商品通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.PRODUCT_UPDATED]: {
    title: '商品信息更新',
    icon: 'Edit',
    color: '#409EFF',
    category: '商品通知',
    priority: MessagePriority.LOW
  },
  [MessageType.PRODUCT_OUT_OF_STOCK]: {
    title: '商品缺货',
    icon: 'Warning',
    color: '#E6A23C',
    category: '商品通知',
    priority: MessagePriority.HIGH
  },

  // 系统相关模板
  [MessageType.SYSTEM_MAINTENANCE]: {
    title: '系统维护',
    icon: 'Tools',
    color: '#909399',
    category: '系统通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.SYSTEM_UPDATE]: {
    title: '系统更新',
    icon: 'Refresh',
    color: '#409EFF',
    category: '系统通知',
    priority: MessagePriority.LOW
  },
  [MessageType.USER_LOGIN]: {
    title: '用户登录',
    icon: 'User',
    color: '#67C23A',
    category: '系统通知',
    priority: MessagePriority.LOW
  },
  [MessageType.USER_CREATED]: {
    title: '系统用户添加成功',
    icon: 'UserFilled',
    color: '#67C23A',
    category: '系统通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.PERMISSION_CONFIGURED]: {
    title: '权限配置成功',
    icon: 'Key',
    color: '#67C23A',
    category: '系统通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.DATA_EXPORT_SUCCESS]: {
    title: '导出成功',
    icon: 'Download',
    color: '#67C23A',
    category: '系统通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.DATA_IMPORT_COMPLETED]: {
    title: '导入完成',
    icon: 'Upload',
    color: '#67C23A',
    category: '系统通知',
    priority: MessagePriority.NORMAL
  },

  // 物流相关模板
  [MessageType.LOGISTICS_PICKUP]: {
    title: '快递已揽收',
    icon: 'Box',
    color: '#409EFF',
    category: '物流通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.LOGISTICS_IN_TRANSIT]: {
    title: '快递运输中',
    icon: 'Van',
    color: '#409EFF',
    category: '物流通知',
    priority: MessagePriority.LOW
  },
  [MessageType.LOGISTICS_DELIVERED]: {
    title: '快递已送达',
    icon: 'Check',
    color: '#67C23A',
    category: '物流通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.PACKAGE_ANOMALY]: {
    title: '包裹异常',
    icon: 'Warning',
    color: '#E6A23C',
    category: '异常通知',
    priority: MessagePriority.HIGH
  },

  // 审核相关模板
  [MessageType.AUDIT_PENDING]: {
    title: '待审核',
    icon: 'Clock',
    color: '#E6A23C',
    category: '审核通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.AUDIT_APPROVED]: {
    title: '审核通过',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '审核通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.AUDIT_REJECTED]: {
    title: '审核拒绝',
    icon: 'Close',
    color: '#F56C6C',
    category: '审核通知',
    priority: MessagePriority.HIGH
  },

  // 业绩分享相关模板
  [MessageType.PERFORMANCE_SHARE_CREATED]: {
    title: '业绩分享创建',
    icon: 'Share',
    color: '#409EFF',
    category: '业绩通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.PERFORMANCE_SHARE_RECEIVED]: {
    title: '收到业绩分享',
    icon: 'Gift',
    color: '#722ED1',
    category: '业绩通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.PERFORMANCE_SHARE_CONFIRMED]: {
    title: '业绩分享确认',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '业绩通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.PERFORMANCE_SHARE_REJECTED]: {
    title: '业绩分享拒绝',
    icon: 'Close',
    color: '#F56C6C',
    category: '业绩通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.PERFORMANCE_SHARE_CANCELLED]: {
    title: '业绩分享取消',
    icon: 'CircleClose',
    color: '#E6A23C',
    category: '业绩通知',
    priority: MessagePriority.NORMAL
  },

  // 短信相关模板
  [MessageType.SMS_TEMPLATE_APPLIED]: {
    title: '短信模板申请',
    icon: 'DocumentAdd',
    color: '#409EFF',
    category: '短信通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.SMS_TEMPLATE_APPROVED]: {
    title: '短信模板审核通过',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '短信通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.SMS_TEMPLATE_REJECTED]: {
    title: '短信模板审核拒绝',
    icon: 'CircleClose',
    color: '#F56C6C',
    category: '短信通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.SMS_SEND_APPLIED]: {
    title: '短信发送申请',
    icon: 'Message',
    color: '#409EFF',
    category: '短信通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.SMS_SEND_APPROVED]: {
    title: '短信发送审核通过',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '短信通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.SMS_SEND_REJECTED]: {
    title: '短信发送审核拒绝',
    icon: 'CircleClose',
    color: '#F56C6C',
    category: '短信通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.SMS_SEND_SUCCESS]: {
    title: '短信发送成功',
    icon: 'SuccessFilled',
    color: '#67C23A',
    category: '短信通知',
    priority: MessagePriority.NORMAL
  },
  [MessageType.SMS_SEND_FAILED]: {
    title: '短信发送失败',
    icon: 'CircleClose',
    color: '#F56C6C',
    category: '短信通知',
    priority: MessagePriority.HIGH
  }
}

// Pinia Store
export const useNotificationStore = defineStore('notification', () => {
  // 检查是否需要清理旧的模拟数据
  const checkAndCleanOldMockData = () => {
    const cleanedKey = 'notification-mock-cleaned-v2'
    if (localStorage.getItem(cleanedKey)) {
      return // 已经清理过
    }

    // 清理旧的模拟消息数据
    localStorage.removeItem('notification-messages')
    localStorage.setItem(cleanedKey, 'true')
    console.log('[Notification] 已清理旧的模拟消息数据')
  }

  // 从localStorage加载消息
  const loadMessagesFromStorage = (): NotificationMessage[] => {
    try {
      // 首先检查并清理旧数据
      checkAndCleanOldMockData()

      const stored = localStorage.getItem('notification-messages')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('加载消息失败:', error)
    }
    return []
  }

  // 保存消息到localStorage
  const saveMessagesToStorage = (msgs: NotificationMessage[]) => {
    try {
      localStorage.setItem('notification-messages', JSON.stringify(msgs))
    } catch (error) {
      console.error('保存消息失败:', error)
    }
  }

  // 状态
  const messages = ref<NotificationMessage[]>(loadMessagesFromStorage())

  // 计算属性
  const unreadCount = computed(() => {
    return messages.value.filter(msg => !msg.read).length
  })

  const recentMessages = computed(() => {
    return messages.value
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10)
  })

  const messagesByCategory = computed(() => {
    const categories: Record<string, NotificationMessage[]> = {}
    messages.value.forEach(msg => {
      if (!categories[msg.category]) {
        categories[msg.category] = []
      }
      categories[msg.category].push(msg)
    })
    return categories
  })

  // 方法
  const sendMessage = (
    type: MessageType,
    content: string,
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
    }
  ) => {
    const template = MESSAGE_TEMPLATES[type]
    const message: NotificationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: template.title,
      content,
      priority: template.priority,
      time: new Date().toLocaleString('zh-CN'),
      read: false,
      icon: template.icon,
      color: template.color,
      category: template.category,
      relatedId: options?.relatedId,
      relatedType: options?.relatedType,
      actionUrl: options?.actionUrl
    }

    messages.value.unshift(message)
    saveMessagesToStorage(messages.value)
    return message
  }

  const markAsRead = (messageId: string) => {
    const message = messages.value.find(msg => msg.id === messageId)
    if (message) {
      message.read = true
      saveMessagesToStorage(messages.value)
    }
  }

  const markAllAsRead = () => {
    messages.value.forEach(msg => {
      msg.read = true
    })
    saveMessagesToStorage(messages.value)
  }

  const deleteMessage = (messageId: string) => {
    const index = messages.value.findIndex(msg => msg.id === messageId)
    if (index > -1) {
      messages.value.splice(index, 1)
      saveMessagesToStorage(messages.value)
    }
  }

  const clearAllMessages = () => {
    messages.value = []
    saveMessagesToStorage(messages.value)
  }

  const batchSendMessages = (messageConfigs: Array<{
    type: MessageType
    content: string
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
    }
  }>) => {
    return messageConfigs.map(config =>
      sendMessage(config.type, config.content, config.options)
    )
  }

  // 从API加载消息
  const loadMessagesFromAPI = async (permissionParams: Record<string, unknown> = {}) => {
    try {
      // 动态导入messageApi以避免循环依赖
      const { messageApi } = await import('@/api/message')

      const response = await messageApi.getSystemMessages({
        limit: 50,
        ...permissionParams
      })

      if (response.success && response.data) {
        // 不清空现有消息，而是合并
        const existingIds = new Set(messages.value.map(m => m.id))

        const responseData = response.data as { messages?: any[]; total?: number }
        const apiMessages = responseData.messages || []
        apiMessages.forEach((msg: unknown) => {
          // 跳过已存在的消息
          if (existingIds.has(msg.id)) {
            return
          }

          // 将API消息格式转换为notification store格式
          const notificationMessage: NotificationMessage = {
            id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: msg.type || MessageType.SYSTEM_UPDATE,
            title: msg.title || '系统通知',
            content: msg.content || '',
            priority: msg.priority || MessagePriority.NORMAL,
            time: msg.createdAt || new Date().toLocaleString('zh-CN'),
            read: msg.read || false,
            icon: msg.icon || 'Bell',
            color: msg.color || '#409EFF',
            category: msg.category || '系统通知',
            relatedId: msg.relatedId,
            relatedType: msg.relatedType,
            actionUrl: msg.actionUrl
          }

          // 直接添加到messages数组
          messages.value.push(notificationMessage)
        })

        // 保存到localStorage
        saveMessagesToStorage(messages.value)

        return apiMessages
      }

      return []
    } catch (error) {
      // 静默处理API加载失败，不影响主流程
      console.log('[Notification] 从API加载消息失败（非关键功能）:', error)
      return []
    }
  }

  return {
    // 状态
    messages,

    // 计算属性
    unreadCount,
    recentMessages,
    messagesByCategory,

    // 方法
    sendMessage,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    clearAllMessages,
    batchSendMessages,
    loadMessagesFromAPI,

    // 导出枚举供外部使用
    MessageType,
    MessagePriority
  }
})
