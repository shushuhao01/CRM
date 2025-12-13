/**
 * 消息通知服务
 *
 * 负责处理消息的定向发送，确保消息发送到正确的接收者
 *
 * 创建日期：2025-12-13
 */

import { useNotificationStore, MessageType } from '@/stores/notification'
import { useUserStore } from '@/stores/user'

// 消息接收者角色配置
export const MESSAGE_RECEIVERS: Record<string, string[]> = {
  // 审核相关 - 发送给审核员、客服、管理员
  [MessageType.AUDIT_PENDING]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.AUDIT_APPROVED]: ['sales_staff', 'department_manager'], // 发送给订单创建者
  [MessageType.AUDIT_REJECTED]: ['sales_staff', 'department_manager'], // 发送给订单创建者

  // 订单超时提醒
  [MessageType.ORDER_AUDIT_TIMEOUT]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.ORDER_SHIPMENT_TIMEOUT]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.ORDER_FOLLOWUP_REMINDER]: ['sales_staff', 'department_manager'],

  // 售后相关
  [MessageType.AFTER_SALES_CREATED]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.AFTER_SALES_TIMEOUT]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.AFTER_SALES_ESCALATED]: ['super_admin', 'admin', 'department_manager'],

  // 客户跟进相关
  [MessageType.CUSTOMER_FOLLOWUP_DUE]: ['sales_staff'], // 发送给客户负责人
  [MessageType.CUSTOMER_INACTIVE_WARNING]: ['sales_staff', 'department_manager'],
  [MessageType.CUSTOMER_BIRTHDAY_REMINDER]: ['sales_staff'],
  [MessageType.CUSTOMER_ASSIGNED]: ['sales_staff'], // 发送给被分配的销售员

  // 资料分配相关
  [MessageType.DATA_ASSIGNED]: ['sales_staff', 'department_manager'], // 发送给被分配者
  [MessageType.DATA_REASSIGNED]: ['sales_staff', 'department_manager'],
  [MessageType.DATA_BATCH_ASSIGNED]: ['super_admin', 'admin', 'department_manager'],

  // 订单状态变更
  [MessageType.ORDER_SUBMITTED]: ['sales_staff'], // 发送给订单创建者
  [MessageType.ORDER_PENDING_SHIPMENT]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.ORDER_SHIPPED]: ['sales_staff'], // 发送给订单创建者
  [MessageType.ORDER_SIGNED]: ['sales_staff'],
  [MessageType.ORDER_CANCELLED]: ['sales_staff', 'department_manager'],
}

// 消息发送服务类
class MessageNotificationService {
  private notificationStore: ReturnType<typeof useNotificationStore> | null = null
  private userStore: ReturnType<typeof useUserStore> | null = null

  // 初始化stores（延迟初始化，避免循环依赖）
  private initStores() {
    if (!this.notificationStore) {
      this.notificationStore = useNotificationStore()
    }
    if (!this.userStore) {
      this.userStore = useUserStore()
    }
  }

  /**
   * 发送消息给指定角色的所有用户
   */
  sendToRoles(
    type: MessageType,
    content: string,
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
      excludeUserId?: string // 排除某个用户（如操作者本人）
    }
  ) {
    this.initStores()

    const targetRoles = MESSAGE_RECEIVERS[type] || []
    const users = this.userStore?.users || []
    const currentUserId = this.userStore?.currentUser?.id

    // 获取目标角色的所有用户
    const targetUsers = users.filter(user => {
      // 排除指定用户
      if (options?.excludeUserId && user.id === options.excludeUserId) {
        return false
      }
      // 检查用户角色是否在目标角色列表中
      return targetRoles.includes(user.role)
    })

    // 为每个目标用户发送消息
    targetUsers.forEach(user => {
      this.notificationStore?.sendMessage(type, content, {
        ...options,
        targetUserId: user.id,
        createdBy: currentUserId
      })
    })

    console.log(`[MessageService] 发送消息 ${type} 给 ${targetUsers.length} 个用户:`,
      targetUsers.map(u => u.name).join(', '))

    return targetUsers.length
  }

  /**
   * 发送消息给指定用户
   */
  sendToUser(
    type: MessageType,
    content: string,
    targetUserId: string,
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
    }
  ) {
    this.initStores()

    const currentUserId = this.userStore?.currentUser?.id

    this.notificationStore?.sendMessage(type, content, {
      ...options,
      targetUserId,
      createdBy: currentUserId
    })

    console.log(`[MessageService] 发送消息 ${type} 给用户 ${targetUserId}`)

    return 1
  }

  /**
   * 发送消息给多个指定用户
   */
  sendToUsers(
    type: MessageType,
    content: string,
    targetUserIds: string[],
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
    }
  ) {
    this.initStores()

    const currentUserId = this.userStore?.currentUser?.id

    targetUserIds.forEach(userId => {
      this.notificationStore?.sendMessage(type, content, {
        ...options,
        targetUserId: userId,
        createdBy: currentUserId
      })
    })

    console.log(`[MessageService] 发送消息 ${type} 给 ${targetUserIds.length} 个用户`)

    return targetUserIds.length
  }

  /**
   * 发送订单待审核通知给审核员
   */
  sendOrderAuditPending(
    orderNumber: string,
    customerName: string,
    totalAmount: number,
    creatorName: string,
    options?: {
      orderId?: string | number
    }
  ) {
    const content = `销售员 ${creatorName} 提交了订单 #${orderNumber}（客户：${customerName}，金额：¥${totalAmount.toFixed(2)}），请及时审核`

    return this.sendToRoles(MessageType.AUDIT_PENDING, content, {
      relatedId: options?.orderId || orderNumber,
      relatedType: 'order',
      actionUrl: '/order/audit'
    })
  }

  /**
   * 发送订单审核通过通知给订单创建者
   */
  sendOrderAuditApproved(
    orderNumber: string,
    creatorId: string,
    auditorName: string,
    options?: {
      orderId?: string | number
    }
  ) {
    const content = `您的订单 #${orderNumber} 已被 ${auditorName} 审核通过，即将安排发货`

    return this.sendToUser(MessageType.AUDIT_APPROVED, content, creatorId, {
      relatedId: options?.orderId || orderNumber,
      relatedType: 'order',
      actionUrl: `/order/list`
    })
  }

  /**
   * 发送订单审核拒绝通知给订单创建者
   */
  sendOrderAuditRejected(
    orderNumber: string,
    creatorId: string,
    auditorName: string,
    reason: string,
    options?: {
      orderId?: string | number
    }
  ) {
    const content = `您的订单 #${orderNumber} 被 ${auditorName} 审核拒绝，原因：${reason}`

    return this.sendToUser(MessageType.AUDIT_REJECTED, content, creatorId, {
      relatedId: options?.orderId || orderNumber,
      relatedType: 'order',
      actionUrl: `/order/list`
    })
  }

  /**
   * 发送资料分配通知
   */
  sendDataAssigned(
    assigneeId: string,
    assigneeName: string,
    dataCount: number,
    assignerName: string
  ) {
    const content = `${assignerName} 将 ${dataCount} 条客户资料分配给您，请及时跟进`

    return this.sendToUser(MessageType.DATA_ASSIGNED, content, assigneeId, {
      relatedType: 'data',
      actionUrl: '/data/list'
    })
  }

  /**
   * 发送批量分配完成通知
   */
  sendDataBatchAssigned(
    totalCount: number,
    assigneeCount: number,
    assignerName: string
  ) {
    const content = `${assignerName} 完成批量分配：共 ${totalCount} 条资料分配给 ${assigneeCount} 个成员`

    return this.sendToRoles(MessageType.DATA_BATCH_ASSIGNED, content, {
      relatedType: 'data',
      actionUrl: '/data/list'
    })
  }

  /**
   * 发送客户分配通知
   */
  sendCustomerAssigned(
    assigneeId: string,
    customerName: string,
    customerPhone: string,
    assignerName: string
  ) {
    const maskedPhone = customerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    const content = `${assignerName} 将客户 ${customerName}（${maskedPhone}）分配给您`

    return this.sendToUser(MessageType.CUSTOMER_ASSIGNED, content, assigneeId, {
      relatedType: 'customer',
      actionUrl: '/customer/list'
    })
  }

  /**
   * 发送客户跟进到期提醒
   */
  sendCustomerFollowupDue(
    salesId: string,
    customerName: string,
    followupDate: string
  ) {
    const content = `客户 ${customerName} 的跟进时间已到（${followupDate}），请及时联系`

    return this.sendToUser(MessageType.CUSTOMER_FOLLOWUP_DUE, content, salesId, {
      relatedType: 'customer',
      actionUrl: '/customer/list'
    })
  }

  /**
   * 发送售后处理超时提醒
   */
  sendAfterSalesTimeout(
    serviceNumber: string,
    customerName: string,
    hours: number
  ) {
    const content = `⚠️ 售后申请 #${serviceNumber}（客户：${customerName}）已超时 ${hours} 小时未处理`

    return this.sendToRoles(MessageType.AFTER_SALES_TIMEOUT, content, {
      relatedId: serviceNumber,
      relatedType: 'afterSales',
      actionUrl: '/service/list'
    })
  }

  /**
   * 发送订单审核超时提醒
   */
  sendOrderAuditTimeout(
    orderNumber: string,
    customerName: string,
    hours: number
  ) {
    const content = `⚠️ 订单 #${orderNumber}（客户：${customerName}）审核已超时 ${hours} 小时`

    return this.sendToRoles(MessageType.ORDER_AUDIT_TIMEOUT, content, {
      relatedId: orderNumber,
      relatedType: 'order',
      actionUrl: '/order/audit'
    })
  }

  /**
   * 发送发货超时提醒
   */
  sendOrderShipmentTimeout(
    orderNumber: string,
    customerName: string,
    hours: number
  ) {
    const content = `⚠️ 订单 #${orderNumber}（客户：${customerName}）已超过 ${hours} 小时未发货`

    return this.sendToRoles(MessageType.ORDER_SHIPMENT_TIMEOUT, content, {
      relatedId: orderNumber,
      relatedType: 'order',
      actionUrl: '/logistics/shipping'
    })
  }
}

// 导出单例
export const messageNotificationService = new MessageNotificationService()

// 导出便捷方法
export const sendOrderAuditPending = messageNotificationService.sendOrderAuditPending.bind(messageNotificationService)
export const sendOrderAuditApproved = messageNotificationService.sendOrderAuditApproved.bind(messageNotificationService)
export const sendOrderAuditRejected = messageNotificationService.sendOrderAuditRejected.bind(messageNotificationService)
export const sendDataAssigned = messageNotificationService.sendDataAssigned.bind(messageNotificationService)
export const sendCustomerAssigned = messageNotificationService.sendCustomerAssigned.bind(messageNotificationService)
