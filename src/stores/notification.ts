import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 消息类型枚举
export enum MessageType {
  // 订单相关
  ORDER_CREATED = 'order_created',
  ORDER_PAID = 'order_paid',
  ORDER_PENDING_AUDIT = 'order_pending_audit', // 订单待审核
  ORDER_AUDIT_APPROVED = 'order_audit_approved', // 订单审核通过
  ORDER_AUDIT_REJECTED = 'order_audit_rejected', // 订单审核拒绝
  ORDER_PENDING_SHIPMENT = 'order_pending_shipment', // 订单待发货
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_SIGNED = 'order_signed',
  ORDER_REJECTED = 'order_rejected', // 订单拒收
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_CANCEL_REQUEST = 'order_cancel_request', // 订单取消申请
  ORDER_CANCEL_APPROVED = 'order_cancel_approved', // 订单取消通过
  ORDER_CANCEL_REJECTED = 'order_cancel_rejected', // 订单取消拒绝
  ORDER_MODIFY_APPROVED = 'order_modify_approved', // 订单修改申请通过
  ORDER_REFUNDED = 'order_refunded',
  // 物流异常
  ORDER_LOGISTICS_RETURNED = 'order_logistics_returned', // 物流退回
  ORDER_LOGISTICS_CANCELLED = 'order_logistics_cancelled', // 物流取消
  ORDER_PACKAGE_EXCEPTION = 'order_package_exception', // 包裹异常
  // 【2025-12-13新增】订单超时提醒
  ORDER_AUDIT_TIMEOUT = 'order_audit_timeout', // 订单审核超时
  ORDER_SHIPMENT_TIMEOUT = 'order_shipment_timeout', // 发货超时提醒
  ORDER_FOLLOWUP_REMINDER = 'order_followup_reminder', // 订单跟进提醒

  // 售后相关
  AFTER_SALES_CREATED = 'after_sales_created',
  AFTER_SALES_ASSIGNED = 'after_sales_assigned', // 售后分配
  AFTER_SALES_PROCESSING = 'after_sales_processing', // 售后处理
  AFTER_SALES_URGENT = 'after_sales_urgent', // 紧急售后
  AFTER_SALES_COMPLETED = 'after_sales_completed', // 售后完成
  AFTER_SALES_REJECTED = 'after_sales_rejected', // 售后拒绝
  AFTER_SALES_CLOSED = 'after_sales_closed', // 售后关闭
  AFTER_SALES_CANCELLED = 'after_sales_cancelled', // 售后取消
  AFTER_SALES_DELETED = 'after_sales_deleted', // 售后删除
  // 【2025-12-13新增】售后超时提醒
  AFTER_SALES_TIMEOUT = 'after_sales_timeout', // 售后处理超时
  AFTER_SALES_ESCALATED = 'after_sales_escalated', // 售后升级

  // 客户相关
  CUSTOMER_CREATED = 'customer_created', // 客户添加成功
  CUSTOMER_UPDATED = 'customer_updated',
  CUSTOMER_CALL = 'customer_call',
  CUSTOMER_SHARE = 'customer_share', // 客户分享
  CUSTOMER_COMPLAINT = 'customer_complaint',
  CUSTOMER_REJECTED = 'customer_rejected', // 客户拒收
  // 【2025-12-13新增】客户跟进相关
  CUSTOMER_FOLLOWUP_DUE = 'customer_followup_due', // 客户跟进到期
  CUSTOMER_INACTIVE_WARNING = 'customer_inactive_warning', // 客户沉默预警
  CUSTOMER_BIRTHDAY_REMINDER = 'customer_birthday_reminder', // 客户生日提醒
  CUSTOMER_ASSIGNED = 'customer_assigned', // 客户分配通知

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
  SMS_SEND_FAILED = 'sms_send_failed', // 短信发送失败

  // 【2025-12-13新增】资料分配相关
  DATA_ASSIGNED = 'data_assigned', // 资料分配通知
  DATA_REASSIGNED = 'data_reassigned', // 资料重新分配
  DATA_BATCH_ASSIGNED = 'data_batch_assigned' // 批量分配完成
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
  targetUserId?: string | number  // 目标用户ID，用于定向发送通知
  createdBy?: string | number     // 创建者ID
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
  [MessageType.ORDER_PENDING_AUDIT]: {
    title: '订单待审核',
    icon: 'Clock',
    color: '#E6A23C',
    category: '审核通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_AUDIT_APPROVED]: {
    title: '订单审核通过',
    icon: 'CircleCheck',
    color: '#67C23A',
    category: '审核通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_AUDIT_REJECTED]: {
    title: '订单审核拒绝',
    icon: 'CircleClose',
    color: '#F56C6C',
    category: '审核通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_REJECTED]: {
    title: '订单拒收',
    icon: 'Close',
    color: '#F56C6C',
    category: '订单通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_CANCEL_REJECTED]: {
    title: '取消申请被拒绝',
    icon: 'CircleClose',
    color: '#F56C6C',
    category: '审核通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_LOGISTICS_RETURNED]: {
    title: '物流退回',
    icon: 'RefreshLeft',
    color: '#E6A23C',
    category: '物流通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_LOGISTICS_CANCELLED]: {
    title: '物流取消',
    icon: 'CircleClose',
    color: '#F56C6C',
    category: '物流通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_PACKAGE_EXCEPTION]: {
    title: '包裹异常',
    icon: 'Warning',
    color: '#F56C6C',
    category: '异常通知',
    priority: MessagePriority.URGENT
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
  [MessageType.AFTER_SALES_REJECTED]: {
    title: '售后被拒绝',
    icon: 'CircleClose',
    color: '#F56C6C',
    category: '售后通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.AFTER_SALES_CANCELLED]: {
    title: '售后已取消',
    icon: 'Close',
    color: '#909399',
    category: '售后通知',
    priority: MessagePriority.NORMAL
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
  },

  // 【2025-12-13新增】订单超时提醒模板
  [MessageType.ORDER_AUDIT_TIMEOUT]: {
    title: '订单审核超时',
    icon: 'AlarmClock',
    color: '#F56C6C',
    category: '超时提醒',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_SHIPMENT_TIMEOUT]: {
    title: '发货超时提醒',
    icon: 'Timer',
    color: '#E6A23C',
    category: '超时提醒',
    priority: MessagePriority.HIGH
  },
  [MessageType.ORDER_FOLLOWUP_REMINDER]: {
    title: '订单跟进提醒',
    icon: 'Bell',
    color: '#409EFF',
    category: '跟进提醒',
    priority: MessagePriority.NORMAL
  },

  // 【2025-12-13新增】售后超时提醒模板
  [MessageType.AFTER_SALES_TIMEOUT]: {
    title: '售后处理超时',
    icon: 'AlarmClock',
    color: '#F56C6C',
    category: '超时提醒',
    priority: MessagePriority.HIGH
  },
  [MessageType.AFTER_SALES_ESCALATED]: {
    title: '售后升级',
    icon: 'Top',
    color: '#F56C6C',
    category: '售后通知',
    priority: MessagePriority.URGENT
  },

  // 【2025-12-13新增】客户跟进相关模板
  [MessageType.CUSTOMER_FOLLOWUP_DUE]: {
    title: '客户跟进到期',
    icon: 'Bell',
    color: '#E6A23C',
    category: '跟进提醒',
    priority: MessagePriority.HIGH
  },
  [MessageType.CUSTOMER_INACTIVE_WARNING]: {
    title: '客户沉默预警',
    icon: 'Warning',
    color: '#E6A23C',
    category: '客户预警',
    priority: MessagePriority.NORMAL
  },
  [MessageType.CUSTOMER_BIRTHDAY_REMINDER]: {
    title: '客户生日提醒',
    icon: 'Present',
    color: '#722ED1',
    category: '客户关怀',
    priority: MessagePriority.NORMAL
  },
  [MessageType.CUSTOMER_ASSIGNED]: {
    title: '客户分配通知',
    icon: 'UserFilled',
    color: '#409EFF',
    category: '客户通知',
    priority: MessagePriority.HIGH
  },

  // 【2025-12-13新增】资料分配相关模板
  [MessageType.DATA_ASSIGNED]: {
    title: '资料分配通知',
    icon: 'Document',
    color: '#409EFF',
    category: '资料通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.DATA_REASSIGNED]: {
    title: '资料重新分配',
    icon: 'Switch',
    color: '#E6A23C',
    category: '资料通知',
    priority: MessagePriority.HIGH
  },
  [MessageType.DATA_BATCH_ASSIGNED]: {
    title: '批量分配完成',
    icon: 'Finished',
    color: '#67C23A',
    category: '资料通知',
    priority: MessagePriority.NORMAL
  }
}

// Pinia Store
export const useNotificationStore = defineStore('notification', () => {
  // 🔥 WebSocket服务引用
  let wsUnsubscribers: (() => void)[] = []

  // 🔥 当前用户标识缓存（用于生成隔离的localStorage Key）
  let currentStorageKey = 'notification-messages'

  /**
   * 🔥 获取当前登录用户的唯一标识，用于隔离 localStorage Key
   * 格式: notification-messages-{userId}-{tenantId}
   * 这样不同用户/不同租户的消息缓存完全隔离，不会串数据
   */
  const getStorageKey = (): string => {
    try {
      // 优先从 localStorage 获取用户信息（确保 store 初始化时也能拿到）
      const userStr = localStorage.getItem('user') || localStorage.getItem('crm_current_user') || localStorage.getItem('user_info')
      if (userStr) {
        const user = JSON.parse(userStr)
        const userId = user.id || user.userId || ''
        const tenantId = user.tenantId || ''
        if (userId) {
          return `notification-messages-${userId}-${tenantId}`
        }
      }
    } catch (_e) {
      // 解析失败则使用默认 key
    }
    // 未登录时使用默认 key（不会缓存任何消息）
    return 'notification-messages'
  }

  /**
   * 🔥 更新当前 storage key（登录/切换用户后调用）
   */
  const refreshStorageKey = () => {
    currentStorageKey = getStorageKey()
    console.log('[Notification] 🔑 Storage Key 已更新:', currentStorageKey)
  }

  // 检查是否需要清理旧的模拟数据
  const checkAndCleanOldMockData = () => {
    // 🔥 v3: 清理旧的全局共享缓存数据（修复跨用户数据泄露）
    const cleanedKey = 'notification-mock-cleaned-v3'
    if (localStorage.getItem(cleanedKey)) {
      return // 已经清理过
    }

    // 清理旧的全局共享消息数据（不带用户标识的旧Key）
    localStorage.removeItem('notification-messages')
    localStorage.removeItem('notification-mock-cleaned-v2')
    // 🔥 清理旧的全局共享的隐藏公告数据
    localStorage.removeItem('hidden-announcements')
    localStorage.setItem(cleanedKey, 'true')
    console.log('[Notification] 🧹 已清理旧的全局共享缓存数据（v3迁移）')
  }

  // 从localStorage加载消息
  const loadMessagesFromStorage = (): NotificationMessage[] => {
    try {
      // 首先检查并清理旧数据
      checkAndCleanOldMockData()

      // 🔥 初始化时刷新 storage key
      refreshStorageKey()

      const stored = localStorage.getItem(currentStorageKey)
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
      // 🔥 使用用户隔离的 Key 保存
      localStorage.setItem(currentStorageKey, JSON.stringify(msgs))
    } catch (error) {
      console.error('保存消息失败:', error)
    }
  }

  // 状态
  const messages = ref<NotificationMessage[]>(loadMessagesFromStorage())
  const wsStatus = ref<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')

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
      targetUserId?: string | number  // 目标用户ID，用于定向发送通知
      createdBy?: string | number     // 创建者ID
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
      actionUrl: options?.actionUrl,
      targetUserId: options?.targetUserId,
      createdBy: options?.createdBy
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

  // 🔥 删除消息（同步到数据库）
  const deleteMessageWithAPI = async (messageId: string) => {
    try {
      const { messageApi } = await import('@/api/message')
      await messageApi.deleteMessage(messageId)

      // 更新本地状态
      const index = messages.value.findIndex(msg => msg.id === messageId)
      if (index > -1) {
        messages.value.splice(index, 1)
        saveMessagesToStorage(messages.value)
      }
      console.log(`[Notification] ✅ 消息已删除: ${messageId}`)
    } catch (error) {
      console.error('[Notification] 删除消息失败:', error)
      // 降级：只删除本地
      deleteMessage(messageId)
    }
  }

  // 🔥 清空所有消息（同步到数据库）
  const clearAllMessagesWithAPI = async () => {
    try {
      const { messageApi } = await import('@/api/message')
      await messageApi.clearAllMessages()

      // 更新本地状态
      messages.value = []
      saveMessagesToStorage(messages.value)
      console.log('[Notification] ✅ 所有消息已清空')
    } catch (error) {
      console.error('[Notification] 清空消息失败:', error)
      // 降级：只清空本地
      clearAllMessages()
    }
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

  // 🔥 从API加载消息（跨设备消息通知的核心）
  const loadMessagesFromAPI = async (options?: { limit?: number; unreadOnly?: boolean }) => {
    try {
      // 🔥 每次从API加载前，先刷新 storage key（确保切换用户后使用新Key）
      refreshStorageKey()

      // 动态导入messageApi以避免循环依赖
      const { messageApi } = await import('@/api/message')

      const response = await messageApi.getSystemMessages({
        limit: options?.limit || 50,
        unreadOnly: options?.unreadOnly
      })

      if (response.success && response.data) {
        const responseData = response.data as { messages?: any[]; total?: number; unreadCount?: number }
        const apiMessages = responseData.messages || []

        // 🔥 修复：API返回空消息时，清空本地缓存（不再保留上一个用户的数据）
        if (apiMessages.length === 0) {
          console.log('[Notification] API返回空消息，清空本地缓存')
          messages.value = []
          saveMessagesToStorage(messages.value)
          return []
        }

        // 🔥 将API消息转换为本地格式
        const newMessages: NotificationMessage[] = []

        apiMessages.forEach((msg: any) => {
          // 将API消息格式转换为notification store格式
          const template = MESSAGE_TEMPLATES[msg.type as MessageType] || {
            icon: 'Bell',
            color: '#409EFF',
            category: '系统通知'
          }

          const notificationMessage: NotificationMessage = {
            id: msg.id,
            type: msg.type || MessageType.SYSTEM_UPDATE,
            title: msg.title || '系统通知',
            content: msg.content || '',
            priority: msg.priority || MessagePriority.NORMAL,
            time: msg.createdAt ? new Date(msg.createdAt).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN'),
            read: msg.isRead === true || msg.isRead === 1,
            icon: template.icon,
            color: template.color,
            category: msg.category || template.category,
            relatedId: msg.relatedId,
            relatedType: msg.relatedType,
            actionUrl: msg.actionUrl
          }

          newMessages.push(notificationMessage)
        })

        // 🔥 修复：完全以服务端数据为准，不再合并本地旧数据（防止跨用户数据泄露）
        messages.value = newMessages
        saveMessagesToStorage(messages.value)

        console.log(`[Notification] ✅ 从数据库加载了 ${newMessages.length} 条消息，未读 ${responseData.unreadCount || 0} 条`)

        return apiMessages
      }

      return []
    } catch (error) {
      // 静默处理API加载失败，使用本地缓存
      console.log('[Notification] 从API加载消息失败，使用本地缓存:', error)
      return []
    }
  }

  // 🔥 标记消息已读（同步到数据库）
  const markAsReadWithAPI = async (messageId: string) => {
    try {
      const { messageApi } = await import('@/api/message')
      await messageApi.markMessageAsRead(messageId)

      // 更新本地状态
      const message = messages.value.find(msg => msg.id === messageId)
      if (message) {
        message.read = true
        saveMessagesToStorage(messages.value)
      }
    } catch (error) {
      console.error('[Notification] 标记已读失败:', error)
      // 降级：只更新本地
      markAsRead(messageId)
    }
  }

  // 🔥 标记所有消息已读（同步到数据库）
  const markAllAsReadWithAPI = async () => {
    try {
      const { messageApi } = await import('@/api/message')
      await messageApi.markAllMessagesAsRead()

      // 更新本地状态
      messages.value.forEach(msg => {
        msg.read = true
      })
      saveMessagesToStorage(messages.value)
    } catch (error) {
      console.error('[Notification] 标记全部已读失败:', error)
      // 降级：只更新本地
      markAllAsRead()
    }
  }

  // ==================== WebSocket集成 ====================

  /**
   * 🔥 初始化WebSocket连接
   */
  const initWebSocket = async (token: string) => {
    try {
      const { webSocketService } = await import('@/services/webSocketService')

      // 清理旧的订阅
      wsUnsubscribers.forEach(unsub => unsub())
      wsUnsubscribers = []

      // 订阅消息事件
      wsUnsubscribers.push(
        webSocketService.onMessage((wsMessage) => {
          // 将WebSocket消息转换为本地消息格式
          const template = MESSAGE_TEMPLATES[wsMessage.type as MessageType] || {
            icon: 'Bell',
            color: '#409EFF',
            category: '系统通知'
          }

          const message: NotificationMessage = {
            id: wsMessage.id,
            type: wsMessage.type as MessageType,
            title: wsMessage.title,
            content: wsMessage.content,
            priority: wsMessage.priority as MessagePriority,
            time: new Date(wsMessage.createdAt).toLocaleString('zh-CN'),
            read: false,
            icon: template.icon,
            color: template.color,
            category: template.category,
            relatedId: wsMessage.relatedId,
            relatedType: wsMessage.relatedType,
            actionUrl: wsMessage.actionUrl
          }

          // 添加到消息列表（避免重复）
          const exists = messages.value.some(m => m.id === message.id)
          if (!exists) {
            messages.value.unshift(message)
            // 限制本地消息数量
            if (messages.value.length > 100) {
              messages.value = messages.value.slice(0, 100)
            }
            saveMessagesToStorage(messages.value)
          }
        })
      )

      // 订阅状态变化
      wsUnsubscribers.push(
        webSocketService.onStatusChange((status) => {
          wsStatus.value = status
        })
      )

      // 订阅未读数量变化
      wsUnsubscribers.push(
        webSocketService.onUnreadCountChange((count) => {
          // 可以用于同步服务器端的未读数量
          console.log('[Notification] 服务器未读数量:', count)
        })
      )

      // 🔥 订阅新公告事件 - 实时刷新公告列表和触发弹窗
      wsUnsubscribers.push(
        webSocketService.on('announcement:new', async (data: any) => {
          console.log('[Notification] 📢 收到新公告推送:', data.title)
          try {
            // 动态导入message store以刷新公告列表
            const { useMessageStore } = await import('@/stores/message')
            const messageStore = useMessageStore()
            await messageStore.loadUserAnnouncements()
            console.log('[Notification] ✅ 公告列表已刷新')
          } catch (error) {
            console.error('[Notification] 刷新公告列表失败:', error)
          }
        })
      )

      // 连接WebSocket
      await webSocketService.connect(token)

      // 请求桌面通知权限
      webSocketService.requestNotificationPermission()

      console.log('[Notification] ✅ WebSocket已初始化')
    } catch (error) {
      console.error('[Notification] WebSocket初始化失败:', error)
    }
  }

  /**
   * 🔥 断开WebSocket连接
   */
  const disconnectWebSocket = async () => {
    try {
      const { webSocketService } = await import('@/services/webSocketService')
      webSocketService.disconnect()

      // 清理订阅
      wsUnsubscribers.forEach(unsub => unsub())
      wsUnsubscribers = []

      wsStatus.value = 'disconnected'
      console.log('[Notification] WebSocket已断开')
    } catch (error) {
      console.error('[Notification] 断开WebSocket失败:', error)
    }
  }

  /**
   * 🔥 通过WebSocket标记已读
   */
  const markAsReadWithWS = async (messageId: string) => {
    try {
      const { webSocketService } = await import('@/services/webSocketService')

      if (webSocketService.isConnected()) {
        webSocketService.markAsRead(messageId)
      }

      // 同时更新本地状态
      markAsRead(messageId)
    } catch (error) {
      console.error('[Notification] WebSocket标记已读失败:', error)
      markAsRead(messageId)
    }
  }

  /**
   * 🔥 通过WebSocket标记全部已读
   */
  const markAllAsReadWithWS = async () => {
    try {
      const { webSocketService } = await import('@/services/webSocketService')

      if (webSocketService.isConnected()) {
        webSocketService.markAllAsRead()
      }

      // 同时更新本地状态
      markAllAsRead()
    } catch (error) {
      console.error('[Notification] WebSocket标记全部已读失败:', error)
      markAllAsRead()
    }
  }

  /**
   * 🔥 重置通知状态（登出时调用）
   * 清空内存中的消息数据和当前用户的localStorage缓存
   * 防止切换用户后看到上一个用户的消息
   */
  const resetNotificationState = () => {
    console.log('[Notification] 🔄 重置通知状态（用户登出）')

    // 清空内存中的消息
    messages.value = []

    // 清空当前用户的localStorage缓存
    try {
      if (currentStorageKey && currentStorageKey !== 'notification-messages') {
        localStorage.removeItem(currentStorageKey)
      }
      // 也清理旧的全局Key（兼容）
      localStorage.removeItem('notification-messages')
    } catch (e) {
      console.error('[Notification] 清理缓存失败:', e)
    }

    // 重置 storage key
    currentStorageKey = 'notification-messages'

    console.log('[Notification] ✅ 通知状态已重置')
  }

  return {
    // 状态
    messages,
    wsStatus,

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
    // 🔥 同步到数据库的方法
    markAsReadWithAPI,
    markAllAsReadWithAPI,
    deleteMessageWithAPI,
    clearAllMessagesWithAPI,
    // 🔥 WebSocket方法
    initWebSocket,
    disconnectWebSocket,
    markAsReadWithWS,
    markAllAsReadWithWS,
    // 🔥 用户隔离方法
    resetNotificationState,
    refreshStorageKey,

    // 导出枚举供外部使用
    MessageType,
    MessagePriority
  }
})
