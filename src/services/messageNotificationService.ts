/**
 * 消息通知服务
 *
 * 负责处理消息的定向发送，确保消息发送到正确的接收者
 * 🔥 2025-12-13 更新：改为调用后端API存储消息，实现跨设备通知
 *
 * 创建日期：2025-12-13
 */

import { useNotificationStore, MessageType, MESSAGE_TEMPLATES } from '@/stores/notification'
import { useUserStore } from '@/stores/user'
import { messageApi } from '@/api/message'

// 消息接收者角色配置
export const MESSAGE_RECEIVERS: Record<string, string[]> = {
  // 审核相关 - 发送给审核员、客服、管理员
  [MessageType.AUDIT_PENDING]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.AUDIT_APPROVED]: ['sales_staff', 'department_manager'], // 发送给订单创建者
  [MessageType.AUDIT_REJECTED]: ['sales_staff', 'department_manager'], // 发送给订单创建者

  // 订单生命周期 - 🔥 2025-12-14 完善
  [MessageType.ORDER_CREATED]: ['sales_staff'], // 发送给订单创建者
  [MessageType.ORDER_PENDING_AUDIT]: ['super_admin', 'admin', 'customer_service'], // 🔥 待审核通知 - 只发给管理员和客服，不发给销售员
  [MessageType.ORDER_AUDIT_APPROVED]: ['sales_staff'], // 审核通过通知创建者
  [MessageType.ORDER_AUDIT_REJECTED]: ['sales_staff'], // 🔥 审核拒绝只通知创建者
  [MessageType.ORDER_PENDING_SHIPMENT]: ['sales_staff'], // 待发货通知创建者
  [MessageType.ORDER_SHIPPED]: ['sales_staff'], // 发货通知创建者
  [MessageType.ORDER_DELIVERED]: ['sales_staff'], // 签收通知创建者
  [MessageType.ORDER_REJECTED]: ['super_admin', 'admin', 'customer_service', 'sales_staff'], // 拒收通知
  [MessageType.ORDER_CANCELLED]: ['super_admin', 'admin', 'customer_service', 'sales_staff'], // 取消通知

  // 物流异常 - 🔥 2025-12-14 新增
  [MessageType.ORDER_LOGISTICS_RETURNED]: ['super_admin', 'admin', 'customer_service', 'sales_staff'],
  [MessageType.ORDER_LOGISTICS_CANCELLED]: ['super_admin', 'admin', 'customer_service', 'sales_staff'],
  [MessageType.ORDER_PACKAGE_EXCEPTION]: ['super_admin', 'admin', 'customer_service', 'sales_staff'],

  // 取消审核
  [MessageType.ORDER_CANCEL_REQUEST]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.ORDER_CANCEL_APPROVED]: ['sales_staff'],
  [MessageType.ORDER_CANCEL_REJECTED]: ['sales_staff'],

  // 订单超时提醒
  [MessageType.ORDER_AUDIT_TIMEOUT]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.ORDER_SHIPMENT_TIMEOUT]: ['super_admin', 'admin', 'customer_service'],
  [MessageType.ORDER_FOLLOWUP_REMINDER]: ['sales_staff', 'department_manager'],
  [MessageType.ORDER_SIGNED]: ['sales_staff'],

  // 售后相关 - 🔥 2025-12-14 完善
  [MessageType.AFTER_SALES_CREATED]: ['super_admin', 'admin', 'customer_service', 'sales_staff'],
  [MessageType.AFTER_SALES_PROCESSING]: ['sales_staff'], // 处理中通知创建者
  [MessageType.AFTER_SALES_COMPLETED]: ['sales_staff'], // 完成通知创建者
  [MessageType.AFTER_SALES_REJECTED]: ['sales_staff'], // 拒绝通知创建者
  [MessageType.AFTER_SALES_CANCELLED]: ['super_admin', 'admin', 'customer_service', 'sales_staff'],
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

  // 短信管理相关 - v1.8.0 新增
  [MessageType.SMS_TEMPLATE_APPLIED]: ['super_admin', 'admin'], // 模板申请通知管理员
  [MessageType.SMS_TEMPLATE_APPROVED]: ['sales_staff', 'department_manager'], // 模板审核通过通知申请人
  [MessageType.SMS_TEMPLATE_REJECTED]: ['sales_staff', 'department_manager'], // 模板审核拒绝通知申请人
  [MessageType.SMS_SEND_APPLIED]: ['super_admin', 'admin', 'customer_service'], // 短信发送申请通知管理员
  [MessageType.SMS_SEND_APPROVED]: ['sales_staff'], // 短信发送审核通过通知申请人
  [MessageType.SMS_SEND_REJECTED]: ['sales_staff'], // 短信发送审核拒绝通知申请人
  [MessageType.SMS_SEND_SUCCESS]: ['sales_staff', 'department_manager'], // 短信发送成功通知
  [MessageType.SMS_SEND_FAILED]: ['super_admin', 'admin', 'customer_service', 'sales_staff'], // 短信发送失败通知
}

// 消息发送服务类 - 🔥 改为调用后端API存储消息
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

  // 获取消息模板信息
  private getMessageTemplate(type: MessageType) {
    return MESSAGE_TEMPLATES[type] || {
      title: '系统通知',
      priority: 'normal',
      category: '系统通知'
    }
  }

  /**
   * 🔥 发送消息到后端数据库（核心方法）
   */
  private async sendToDatabase(
    type: MessageType,
    content: string,
    targetUserId: string,
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
    }
  ): Promise<boolean> {
    try {
      const template = this.getMessageTemplate(type)

      await messageApi.sendSystemMessage({
        type,
        title: template.title,
        content,
        targetUserId,
        priority: template.priority,
        category: template.category,
        relatedId: options?.relatedId?.toString(),
        relatedType: options?.relatedType,
        actionUrl: options?.actionUrl
      })

      console.log(`[MessageService] ✅ 消息已保存到数据库: ${type} -> ${targetUserId}`)
      return true
    } catch (error) {
      console.error(`[MessageService] ❌ 保存消息到数据库失败:`, error)
      // 降级：保存到本地localStorage
      this.initStores()
      this.notificationStore?.sendMessage(type, content, {
        ...options,
        targetUserId,
        createdBy: this.userStore?.currentUser?.id
      })
      return false
    }
  }

  /**
   * 发送消息给指定角色的所有用户
   */
  async sendToRoles(
    type: MessageType,
    content: string,
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
      excludeUserId?: string
    }
  ): Promise<number> {
    this.initStores()

    const targetRoles = MESSAGE_RECEIVERS[type] || []
    const users = this.userStore?.users || []

    // 获取目标角色的所有用户
    const targetUsers = users.filter(user => {
      if (options?.excludeUserId && user.id === options.excludeUserId) {
        return false
      }
      return targetRoles.includes(user.role)
    })

    // 🔥 批量发送到数据库
    if (targetUsers.length > 0) {
      try {
        const template = this.getMessageTemplate(type)
        const messages = targetUsers.map(user => ({
          type,
          title: template.title,
          content,
          targetUserId: user.id,
          priority: template.priority,
          category: template.category,
          relatedId: options?.relatedId?.toString(),
          relatedType: options?.relatedType,
          actionUrl: options?.actionUrl
        }))

        await messageApi.sendBatchSystemMessages(messages)
        console.log(`[MessageService] ✅ 批量发送 ${targetUsers.length} 条消息到数据库`)
      } catch (error) {
        console.error('[MessageService] ❌ 批量发送失败，降级到本地存储:', error)
        // 降级处理
        targetUsers.forEach(user => {
          this.notificationStore?.sendMessage(type, content, {
            ...options,
            targetUserId: user.id,
            createdBy: this.userStore?.currentUser?.id
          })
        })
      }
    }

    console.log(`[MessageService] 发送消息 ${type} 给 ${targetUsers.length} 个用户:`,
      targetUsers.map(u => u.name).join(', '))

    return targetUsers.length
  }

  /**
   * 发送消息给指定用户
   */
  async sendToUser(
    type: MessageType,
    content: string,
    targetUserId: string,
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
    }
  ): Promise<number> {
    // 🔥 发送到数据库
    await this.sendToDatabase(type, content, targetUserId, options)

    console.log(`[MessageService] 发送消息 ${type} 给用户 ${targetUserId}`)

    return 1
  }

  /**
   * 发送消息给多个指定用户
   */
  async sendToUsers(
    type: MessageType,
    content: string,
    targetUserIds: string[],
    options?: {
      relatedId?: string | number
      relatedType?: string
      actionUrl?: string
    }
  ): Promise<number> {
    if (targetUserIds.length === 0) return 0

    // 🔥 批量发送到数据库
    try {
      const template = this.getMessageTemplate(type)
      const messages = targetUserIds.map(userId => ({
        type,
        title: template.title,
        content,
        targetUserId: userId,
        priority: template.priority,
        category: template.category,
        relatedId: options?.relatedId?.toString(),
        relatedType: options?.relatedType,
        actionUrl: options?.actionUrl
      }))

      await messageApi.sendBatchSystemMessages(messages)
      console.log(`[MessageService] ✅ 批量发送 ${targetUserIds.length} 条消息到数据库`)
    } catch (error) {
      console.error('[MessageService] ❌ 批量发送失败，降级到本地存储:', error)
      // 降级处理
      this.initStores()
      targetUserIds.forEach(userId => {
        this.notificationStore?.sendMessage(type, content, {
          ...options,
          targetUserId: userId,
          createdBy: this.userStore?.currentUser?.id
        })
      })
    }

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
