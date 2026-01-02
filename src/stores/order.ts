import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCustomerStore } from './customer'
import { useUserStore } from './user'
import { createPersistentStore } from '@/utils/storage'
import { logisticsService, type LogisticsResult } from '@/services/logistics'
import { eventBus, EventNames } from '@/utils/eventBus'
import { messageNotificationService } from '@/services/messageNotificationService'
import { MessageType } from '@/stores/notification'

export interface OrderProduct {
  id: string
  name: string
  price: number
  quantity: number
  total: number
}

// 订单状态枚举
export const OrderStatus = {
  PENDING_TRANSFER: 'pending_transfer',      // 待流转
  PENDING_AUDIT: 'pending_audit',            // 待审核
  AUDIT_REJECTED: 'audit_rejected',          // 审核拒绝
  PENDING_SHIPMENT: 'pending_shipment',      // 待发货
  SHIPPED: 'shipped',                        // 已发货
  LOGISTICS_RETURNED: 'logistics_returned',  // 物流部退回
  LOGISTICS_CANCELLED: 'logistics_cancelled', // 物流部取消
  DELIVERED: 'delivered',                    // 已签收
  PACKAGE_EXCEPTION: 'package_exception',    // 包裹异常
  REJECTED: 'rejected',                      // 拒收
  REJECTED_RETURNED: 'rejected_returned',    // 拒收已退回
  AFTER_SALES_CREATED: 'after_sales_created', // 已建售后
  PENDING_CANCEL: 'pending_cancel',          // 待取消
  CANCEL_FAILED: 'cancel_failed',            // 取消失败
  CANCELLED: 'cancelled',                    // 已取消
  DRAFT: 'draft'                             // 草稿
} as const

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus]

// 物流状态类型
export type LogisticsStatus =
  | 'pending'             // 待发货
  | 'picked_up'           // 已揽收
  | 'in_transit'          // 运输中
  | 'out_for_delivery'    // 派送中
  | 'delivered'           // 已签收
  | 'exception'           // 异常
  | 'rejected'            // 拒收
  | 'returned'            // 已退回

export interface Order {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  products: OrderProduct[]
  subtotal: number
  discount: number
  totalAmount: number
  collectAmount: number
  depositAmount: number
  depositScreenshot?: string
  depositScreenshots?: string[]  // 支持多张定金截图
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  remark: string
  status: OrderStatus
  auditStatus: 'pending' | 'approved' | 'rejected'
  markType?: 'normal' | 'reserved' | 'return'
  createTime: string
  createdBy: string
  salesPersonId: string
  auditTime?: string
  auditBy?: string
  auditRemark?: string
  // 审核流转相关
  auditTransferTime?: string // 流转审核的时间（3分钟后）
  isAuditTransferred?: boolean // 是否已流转到审核
  hasBeenAudited?: boolean // 是否曾经被审核过（用于标识重新提审的订单）
  // 发货相关
  shippingTime?: string
  shippedAt?: string          // 🔥 发货时间（ISO格式）
  expectedDeliveryDate?: string // 🔥 预计送达日期
  estimatedDeliveryTime?: string // 🔥 预计送达时间（兼容字段）
  shippingData?: { [key: string]: unknown }
  expressCompany?: string     // 快递公司
  trackingNumber?: string     // 快递单号
  expressNo?: string          // 🔥 快递单号（兼容字段）
  logisticsStatus?: LogisticsStatus // 物流状态
  // 退货相关
  returnReason?: string
  returnTime?: string
  // 取消相关
  cancelReason?: string
  cancelTime?: string
  // 取消审核相关
  cancelStatus?: 'pending' | 'approved' | 'rejected' | null
  cancelDescription?: string
  cancelRequestTime?: string
  auditHistory?: Array<{
    action: 'request' | 'approved' | 'rejected' | 'pending'
    time: string
    auditor: string
    remark?: string
  }>
  auditorId?: string
  // 状态历史
  statusHistory?: Array<{
    status: OrderStatus
    time: string
    operator: string
    description: string
    remark?: string
  }>
  // 物流历史
  logisticsHistory?: Array<{
    time: string
    location: string
    description: string
    status: LogisticsStatus
  }>
  // 操作日志
  operationLogs?: Array<{
    id: string
    time: string
    operator: string
    action: string
    description: string
    remark?: string
  }>
  // 服务微信号
  serviceWechat?: string
  // 订单来源
  orderSource?: string
  // 待办相关
  isTodo?: boolean
  todoDate?: string
  todoRemark?: string
  // 创建人姓名
  createdByName?: string
  salesPersonName?: string
}

// 订单数据不需要本地持久化，因为数据存储在后端数据库
// 使用exclude排除orders字段，避免localStorage空间不足
export const useOrderStore = createPersistentStore('order', () => {
  // 懒加载CustomerStore，避免在初始化时重新创建CustomerStore实例
  const getCustomerStore = () => useCustomerStore()
  const userStore = useUserStore()

  // 获取当前用户可见的订单列表
  const getVisibleOrders = (orderList: Order[]) => {
    const currentUser = userStore.currentUser
    if (!currentUser) return []

    console.log('[数据权限] getVisibleOrders - 当前用户:', {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role
    })

    // 管理员和经理可以查看所有订单
    if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'department_manager') {
      console.log('[数据权限] 管理员/经理角色，可查看全部订单:', orderList.length)
      return orderList
    }

    // 销售员只能查看自己创建的订单（使用salesPersonId或createdBy名字匹配）
    if (currentUser.role === 'sales_staff' || currentUser.role === 'employee') {
      const filtered = orderList.filter(order => {
        const match = order.salesPersonId === currentUser.id || order.createdBy === currentUser.name
        if (match) {
          console.log('[数据权限] 销售员订单匹配:', order.orderNumber, order.salesPersonId, currentUser.id, order.createdBy, currentUser.name)
        }
        return match
      })
      console.log('[数据权限] 销售员，可查看自己的订单:', filtered.length)
      return filtered
    }

    // 客服只能查看自己处理的订单
    if (currentUser.role === 'customer_service') {
      const filtered = orderList.filter(order => order.servicePersonId === currentUser.id)
      console.log('[数据权限] 客服，可查看自己处理的订单:', filtered.length)
      return filtered
    }

    // 其他角色默认只能查看自己创建的订单（使用salesPersonId或createdBy名字匹配）
    const filtered = orderList.filter(order => order.salesPersonId === currentUser.id || order.createdBy === currentUser.name)
    console.log('[数据权限] 其他角色，可查看自己的订单:', filtered.length)
    return filtered
  }

  // 订单数据
  const orders = ref<Order[]>([])

  // 流转延迟时间（分钟），默认3分钟
  const transferDelayMinutes = ref(3)

  // 物流自动同步定时器
  let logisticsAutoSyncTimer: NodeJS.Timeout | null = null

  // 订单自动流转定时器
  let orderAutoTransferTimer: NodeJS.Timeout | null = null

  // 获取流转延迟时间配置
  const loadTransferDelayConfig = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/v1/system/order-transfer-config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success && data.data) {
        transferDelayMinutes.value = data.data.delayMinutes ?? 3
        console.log('[订单Store] 流转延迟时间配置:', transferDelayMinutes.value, '分钟')
      }
    } catch (_error) {
      console.warn('[订单Store] 获取流转延迟配置失败，使用默认值:', transferDelayMinutes.value, '分钟')
    }
  }

  // 计算属性
  const totalOrders = computed(() => orders.value.length)
  const pendingOrders = computed(() => orders.value.filter(order => order.status === 'pending_transfer').length)

  // 获取订单列表
  const getOrders = () => {
    return getVisibleOrders(orders.value)
  }

  // 根据ID获取订单
  const getOrderById = (id: string) => {
    return orders.value.find(order => order.id === id)
  }

  // 根据订单号获取订单
  const getOrderByNumber = (orderNumber: string) => {
    return orders.value.find(order => order.orderNumber === orderNumber)
  }

  // 添加订单
  const addOrder = (order: Order) => {
    orders.value.push(order)
  }

  // 更新订单
  const updateOrder = (id: string, updates: Partial<Order>) => {
    const index = orders.value.findIndex(order => order.id === id)
    if (index !== -1) {
      // 使用响应式更新，确保触发watch
      const updatedOrder = { ...orders.value[index], ...updates }
      orders.value[index] = updatedOrder
      console.log(`[订单Store] 更新订单 ${id}，新状态:`, {
        status: updatedOrder.status,
        auditStatus: updatedOrder.auditStatus,
        hasBeenAudited: updatedOrder.hasBeenAudited
      })
    } else {
      console.warn(`[订单Store] 未找到订单 ${id}`)
    }
  }

  // 删除订单
  const deleteOrder = (id: string) => {
    const index = orders.value.findIndex(order => order.id === id)
    if (index !== -1) {
      orders.value.splice(index, 1)
    }
  }

  // 创建订单（用于新增订单页面的提交）
  const createOrder = async (payload: unknown): Promise<Order> => {
    const now = new Date()
    // 使用本地时间格式化函数，避免UTC时区问题
    const formatTime = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      const seconds = String(d.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    const orderNumber = generateOrderNumber()

    // 构建订单数据
    const orderData = {
      orderNumber,
      customerId: payload.customerId,
      customerName: payload.customerName || '',
      customerPhone: payload.customerPhone || '',
      products: payload.products || [],
      subtotal: Number(payload.subtotal) || 0,
      discount: Number(payload.discount) || 0,
      totalAmount: Number(payload.totalAmount) || 0,
      collectAmount: Number(payload.collectAmount) || 0,
      depositAmount: Number(payload.depositAmount) || 0,
      depositScreenshot: payload.depositScreenshot,
      depositScreenshots: payload.depositScreenshots,
      receiverName: payload.receiverName || '',
      receiverPhone: payload.receiverPhone || '',
      receiverAddress: payload.receiverAddress || '',
      remark: payload.remark || '',
      status: 'pending_transfer' as const,
      auditStatus: 'pending' as const,
      markType: payload.markType || 'normal',
      createdBy: payload.createdBy || (userStore.currentUser?.name || 'system'),
      // 🔥 创建人姓名（用于销售人员显示）
      createdByName: payload.createdByName || userStore.currentUser?.realName || userStore.currentUser?.name || 'system',
      salesPersonId: payload.salesPersonId || (userStore.currentUser?.id || '1'),
      expressCompany: payload.expressCompany,
      // 🔥 服务微信号
      serviceWechat: payload.serviceWechat || '',
      // 🔥 订单来源
      orderSource: payload.orderSource || '',
      // 🔥 支付方式
      paymentMethod: payload.paymentMethod || '',
      // 🔥 自定义字段
      customFields: payload.customFields || {}
    }

    // 🔥 检测环境，生产环境调用真实API
    const hostname = window.location.hostname
    const isProdEnv = (
      hostname.includes('abc789.cn') ||
      hostname.includes('vercel.app') ||
      hostname.includes('netlify.app') ||
      hostname.includes('railway.app') ||
      !hostname.includes('localhost') && !hostname.includes('127.0.0.1')
    )

    console.log('[OrderStore] 环境检测: hostname=', hostname, ', isProdEnv=', isProdEnv)

    // 🔥 修复：开发环境也使用API保存订单到数据库
    console.log('[OrderStore] 🌐 调用API保存订单到数据库')
    try {
      const { orderApi } = await import('@/api/order')
      console.log('[OrderStore] 准备发送到API的数据:', orderData)

      const response = await orderApi.create(orderData)
      console.log('[OrderStore] API响应:', response)

      if (response.success && response.data) {
        const newOrder = response.data
        console.log('[OrderStore] ✅ API保存成功，订单ID:', newOrder.id)

        // 同时更新本地缓存
        orders.value.unshift(newOrder)
        console.log('[OrderStore] 本地缓存已更新，订单总数:', orders.value.length)

        return newOrder
      } else {
        console.error('[OrderStore] API响应失败:', response)
        throw new Error((response as { message?: string }).message || '创建订单失败')
      }
    } catch (apiError) {
      console.error('[OrderStore] ❌ API保存失败:', apiError)
      throw apiError
    }
  }

  // 生成订单号
  const generateOrderNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const timestamp = now.getTime().toString().slice(-6)
    return `ORD${year}${month}${day}${timestamp}`
  }

  // 审核订单 - 🔥 API优先原则：必须API成功才更新本地
  const auditOrder = async (id: string, approved: boolean, remark: string): Promise<boolean> => {
    // 🔥 修复：不再依赖本地store中的订单，直接调用API
    // 审核页面的订单数据来自专门的审核API，不一定在orderStore.orders中
    const order = getOrderById(id)
    // 即使本地没有订单数据，也继续调用API（后端会验证订单是否存在）

    const currentUser = userStore.currentUser
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 🔥 必须先调用API，成功后才更新本地
    try {
      console.log('[OrderStore] 调用API审核订单:', id, '审核结果:', approved ? '通过' : '拒绝')
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.audit(id, {
        auditStatus: approved ? 'approved' : 'rejected',
        auditRemark: remark
      })

      console.log('[OrderStore] API响应:', JSON.stringify(response))

      // 🔥 检查API响应 - 兼容多种响应格式
      if (!response) {
        console.error('[OrderStore] API返回空响应')
        throw new Error('API返回空响应')
      }

      // 检查是否有错误
      if (response.success === false || response.code === 404 || response.code === 500) {
        const errorMsg = response.message || 'API返回失败'
        console.error('[OrderStore] API审核失败:', errorMsg)
        throw new Error(errorMsg)
      }

      console.log('[OrderStore] ✅ API审核成功, 订单状态:', response.data?.status)

      // 🔥 如果本地有订单数据，更新本地缓存
      if (order) {
        updateOrder(id, {
          auditStatus: approved ? 'approved' : 'rejected',
          auditTime: now,
          auditBy: currentUser?.name || 'unknown',
          auditRemark: remark,
          status: approved ? 'pending_shipment' : 'audit_rejected',
          hasBeenAudited: true
        })

        // 添加状态历史
        if (order.statusHistory) {
          order.statusHistory.push({
            status: approved ? 'pending_shipment' : 'audit_rejected',
            time: now,
            operator: currentUser?.name || 'unknown',
            description: approved ? '订单审核通过，等待发货' : '订单审核被拒绝',
            remark
          })
        }

        // 发射事件通知
        console.log(`[订单审核] 订单 ${order.orderNumber} 审核${approved ? '通过' : '拒绝'}`)
        eventBus.emit(EventNames.ORDER_AUDITED, { order, approved, remark })
        eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
      }

      // 发射刷新事件
      if (approved) {
        eventBus.emit(EventNames.REFRESH_SHIPPING_LIST)
      } else {
        eventBus.emit(EventNames.REFRESH_ORDER_LIST)
      }
      eventBus.emit(EventNames.REFRESH_AUDIT_LIST)

      // 🔥 发送消息通知给订单创建者（如果有订单数据）
      if (order) {
        try {
          const creatorId = order.salesPersonId || order.createdBy
          const auditorName = currentUser?.name || '系统'
          if (creatorId) {
            if (approved) {
              messageNotificationService.sendOrderAuditApproved(
                order.orderNumber,
                creatorId,
                auditorName,
                { orderId: order.id }
              )
              console.log(`[消息通知] 已通知订单创建者 ${creatorId} 审核通过`)
            } else {
              messageNotificationService.sendOrderAuditRejected(
                order.orderNumber,
                creatorId,
                auditorName,
                remark || '未填写原因',
                { orderId: order.id }
              )
              console.log(`[消息通知] 已通知订单创建者 ${creatorId} 审核拒绝`)
            }
          }
        } catch (notifyError) {
          console.warn('[消息通知] 发送通知失败，但不影响审核结果:', notifyError)
        }
      }

      return true
    } catch (apiError) {
      console.error('[OrderStore] ❌ API审核失败:', apiError)
      throw apiError
    }
  }

  // 发货 - 🔥 API优先原则：必须API成功才更新本地
  const shipOrder = async (id: string, expressCompany: string, trackingNumber: string): Promise<boolean> => {
    const order = getOrderById(id)
    if (!order) {
      console.error('[OrderStore] 订单不存在:', id)
      throw new Error('订单不存在')
    }

    const currentUser = userStore.currentUser
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

      // 🔥 计算预计送达时间（发货时间 + 3天）
      const threeDaysLater = new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000)
      const expectedDeliveryDate = threeDaysLater.toISOString().split('T')[0]

      console.log('[OrderStore] 发货信息:', {
        id,
        shippingTime: now,
        shippedAt: now,
        expectedDeliveryDate,
        expressCompany,
        trackingNumber
      })

      // 🔥 API优先原则：必须API成功才更新本地
      try {
        console.log('[OrderStore] 调用API更新发货信息')
        const { orderApi } = await import('@/api/order')
        const response = await orderApi.update(id, {
          status: 'shipped',
          shippingTime: now,
          shippedAt: now,
          expectedDeliveryDate,
          expressCompany,
          trackingNumber,
          logisticsStatus: 'picked_up'
        })

        // 🔥 检查API响应
        if (!response || response.success === false) {
          const errorMsg = (response as any)?.message || 'API返回失败'
          console.error('[OrderStore] API发货更新失败:', errorMsg)
          throw new Error(errorMsg)
        }

        console.log('[OrderStore] ✅ API发货更新成功，更新本地缓存')

        // 🔥 API成功后才更新本地数据
        updateOrder(id, {
          status: 'shipped',
          shippingTime: now,
          shippedAt: now,
          expectedDeliveryDate,
          expressCompany,
          trackingNumber,
          logisticsStatus: 'picked_up'
        })

        // 添加状态历史
        if (order.statusHistory) {
          order.statusHistory.push({
            status: 'shipped',
            time: now,
            operator: currentUser?.name || 'unknown',
            description: '订单已发货',
            remark: `${expressCompany}，单号：${trackingNumber}`
          })
        }

        // 发射事件通知
        console.log(`[订单发货] 订单 ${order.orderNumber} 已发货，快递单号：${trackingNumber}`)
        eventBus.emit(EventNames.ORDER_SHIPPED, { order, expressCompany, trackingNumber })
        eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
        eventBus.emit(EventNames.REFRESH_SHIPPING_LIST)
        eventBus.emit(EventNames.REFRESH_LOGISTICS_LIST)

        // 🔥 发送消息通知给订单创建者
        try {
          const creatorId = order.salesPersonId || order.createdBy
          if (creatorId) {
            messageNotificationService.sendToUser(
              MessageType.ORDER_SHIPPED,
              `您的订单 #${order.orderNumber} 已发货，快递公司：${expressCompany}，单号：${trackingNumber}`,
              creatorId,
              { relatedId: order.id, relatedType: 'order', actionUrl: '/logistics/list' }
            )
            console.log(`[消息通知] 已通知订单创建者 ${creatorId} 订单已发货`)
          }
        } catch (notifyError) {
          console.warn('[消息通知] 发送通知失败，但不影响发货结果:', notifyError)
        }

        // 🔥 强制刷新订单列表
        await loadOrdersFromAPI(true)

        return true
      } catch (apiError) {
        console.error('[OrderStore] ❌ API发货失败，不更新本地数据:', apiError)
        throw apiError
      }
  }

  // 退回订单 - 🔥 API优先原则
  const returnOrder = async (id: string, reason: string): Promise<Order | null> => {
    // 🔥 修复：不再强制要求本地存在订单，直接调用API
    const order = getOrderById(id)
    // 即使本地没有订单数据，也继续调用API（后端会验证订单是否存在）

    const currentUser = userStore.currentUser
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 根据当前订单状态确定退回后的状态
    // 🔥 修复：如果本地没有订单，默认使用 logistics_returned 状态
    let newStatus: OrderStatus = 'logistics_returned'
    if (order) {
      if (order.status === 'shipped' || order.status === 'pending_shipment') {
        newStatus = 'logistics_returned'
      } else {
        newStatus = 'rejected_returned'
      }
    }

    // 🔥 API优先原则：必须API成功才更新本地
    try {
      console.log('[OrderStore] 调用API退回订单:', id, '目标状态:', newStatus)
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.update(id, {
        status: newStatus,
        remark: `退回原因: ${reason}`
      })

      if (!response || response.success === false) {
        const errorMsg = (response as any)?.message || 'API返回失败'
        console.error('[OrderStore] API退回订单失败:', errorMsg)
        throw new Error(errorMsg)
      }

      console.log('[OrderStore] ✅ API退回订单成功，更新本地缓存')

      // 🔥 API成功后才更新本地数据（如果本地有订单）
      if (order) {
        updateOrder(id, {
          status: newStatus,
          returnReason: reason,
          returnTime: now
        })

        // 添加状态历史
        if (order.statusHistory) {
          order.statusHistory.push({
            status: newStatus,
            time: now,
            operator: currentUser?.name || 'unknown',
            description: '订单已退回',
            remark: reason
          })
        }
      }

      // 发射事件通知
      console.log(`[订单退回] 订单已退回，原因：${reason}`)
      eventBus.emit(EventNames.ORDER_RETURNED, { order, reason })
      eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
      eventBus.emit(EventNames.REFRESH_ORDER_LIST)
      eventBus.emit(EventNames.REFRESH_SHIPPING_LIST)
      eventBus.emit(EventNames.REFRESH_LOGISTICS_LIST)

      // 🔥 强制刷新订单列表
      await loadOrdersFromAPI(true)

      return order
    } catch (apiError) {
      console.error('[OrderStore] ❌ API退回订单失败，不更新本地数据:', apiError)
      throw apiError
    }
  }

  // 审核通过取消订单 - 🔥 API优先原则
  const approveCancelOrders = async (orderIds: string[]): Promise<boolean> => {
    const currentUser = userStore.currentUser
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const failedIds: string[] = []

    for (const id of orderIds) {
      // 🔥 API优先：必须API成功才更新本地
      try {
        const result = await auditCancelOrderToAPI(id, 'approve', '审核通过')
        if (!result.success) {
          console.error(`[订单取消审核] API审核通过失败: ${id}, ${result.message}`)
          failedIds.push(id)
          continue
        }

        console.log(`[订单取消审核] ✅ API审核通过成功: ${id}`)

        // 🔥 API成功后才更新本地数据
        const order = getOrderById(id)
        if (order) {
          updateOrder(id, {
            status: 'cancelled',
            cancelStatus: 'approved',
            cancelTime: now
          })

          if (order.statusHistory) {
            order.statusHistory.push({
              status: 'cancelled',
              time: now,
              operator: currentUser?.name || 'unknown',
              description: '取消订单审核通过',
              remark: order.cancelReason || '审核通过'
            })
          }

          eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
        }
      } catch (apiError) {
        console.error(`[订单取消审核] ❌ API异常: ${id}`, apiError)
        failedIds.push(id)
      }
    }

    // 🔥 强制刷新订单列表
    await loadOrdersFromAPI(true)
    eventBus.emit(EventNames.REFRESH_ORDER_LIST)

    if (failedIds.length > 0) {
      throw new Error(`以下订单审核失败: ${failedIds.join(', ')}`)
    }

    return true
  }

  // 审核拒绝取消订单 - 🔥 API优先原则
  const rejectCancelOrders = async (orderIds: string[]): Promise<boolean> => {
    const currentUser = userStore.currentUser
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const failedIds: string[] = []

    for (const id of orderIds) {
      const order = getOrderById(id)

      // 🔥 API优先：必须API成功才更新本地
      try {
        const result = await auditCancelOrderToAPI(id, 'reject', '审核拒绝')
        if (!result.success) {
          console.error(`[订单取消审核] API审核拒绝失败: ${id}, ${result.message}`)
          failedIds.push(id)
          continue
        }

        console.log(`[订单取消审核] ✅ API审核拒绝成功: ${id}`)

        // 🔥 API成功后才更新本地数据
        if (order) {
          // 根据订单的原始状态恢复订单状态
          let restoreStatus: OrderStatus = 'pending_shipment'
          if (order.auditStatus === 'approved') {
            restoreStatus = 'pending_shipment'
          } else if (order.auditStatus === 'pending') {
            restoreStatus = 'pending_audit'
          } else {
            restoreStatus = 'pending_transfer'
          }

          updateOrder(id, {
            status: restoreStatus,
            cancelStatus: 'rejected',
            cancelTime: now
          })

          if (order.statusHistory) {
            order.statusHistory.push({
              status: restoreStatus,
              time: now,
              operator: currentUser?.name || 'unknown',
              description: '取消订单审核拒绝，订单已恢复',
              remark: order.cancelReason || '审核拒绝'
            })
          }

          eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
        }
      } catch (apiError) {
        console.error(`[订单取消审核] ❌ API异常: ${id}`, apiError)
        failedIds.push(id)
      }
    }

    // 🔥 强制刷新订单列表
    await loadOrdersFromAPI(true)
    eventBus.emit(EventNames.REFRESH_ORDER_LIST)

    if (failedIds.length > 0) {
      throw new Error(`以下订单审核失败: ${failedIds.join(', ')}`)
    }

    return true
  }

  // 取消订单 - 🔥 API优先原则
  const cancelOrder = async (id: string, reason: string): Promise<void> => {
    // 🔥 修复：不再强制要求本地存在订单，直接调用API
    const order = getOrderById(id)
    // 即使本地没有订单数据，也继续调用API（后端会验证订单是否存在）

    const currentUser = userStore.currentUser
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // 🔥 API优先：必须API成功才更新本地
    try {
      console.log('[OrderStore] 调用API取消订单:', id)
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.update(id, {
        status: 'cancelled',
        remark: `取消原因: ${reason}`
      })

      if (!response || response.success === false) {
        const errorMsg = (response as any)?.message || 'API返回失败'
        console.error('[OrderStore] API取消订单失败:', errorMsg)
        throw new Error(errorMsg)
      }

      console.log('[OrderStore] ✅ API取消订单成功，更新本地缓存')

      // 🔥 API成功后才更新本地数据（如果本地有订单）
      if (order) {
        updateOrder(id, {
          status: 'cancelled',
          cancelReason: reason,
          cancelTime: now
        })

        // 添加状态历史
        if (order.statusHistory) {
          order.statusHistory.push({
            status: 'cancelled',
            time: now,
            operator: currentUser?.name || 'unknown',
            description: '订单已取消',
            remark: reason
          })
        }
      }

      // 发射事件通知
      console.log(`[订单取消] 订单已取消，原因：${reason}`)
      eventBus.emit(EventNames.ORDER_CANCELLED, { order, reason })
      eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
      eventBus.emit(EventNames.REFRESH_ORDER_LIST)
      eventBus.emit(EventNames.REFRESH_SHIPPING_LIST)
      eventBus.emit(EventNames.REFRESH_LOGISTICS_LIST)

      // 🔥 发送消息通知给订单创建者（如果本地有订单信息）
      if (order) {
        try {
          const creatorId = order.salesPersonId || order.createdBy
          if (creatorId && creatorId !== currentUser?.id) {
            messageNotificationService.sendToUser(
              MessageType.ORDER_CANCELLED,
              `订单 #${order.orderNumber} 已被取消，原因：${reason}`,
              creatorId,
              { relatedId: order.id, relatedType: 'order', actionUrl: '/order/list' }
            )
            console.log(`[消息通知] 已通知订单创建者 ${creatorId} 订单已取消`)
          }
        } catch (notifyError) {
          console.warn('[消息通知] 发送通知失败，但不影响取消结果:', notifyError)
        }
      }

      // 🔥 强制刷新订单列表
      await loadOrdersFromAPI(true)
    } catch (apiError) {
      console.error('[OrderStore] ❌ API取消订单失败，不更新本地数据:', apiError)
      throw apiError
    }
  }

  // 更新物流状态
  const updateLogisticsStatus = async (trackingNumber: string) => {
    try {
      const result = await logisticsService.queryLogistics(trackingNumber)
      const order = orders.value.find(o => o.trackingNumber === trackingNumber)

      if (order && result) {
        updateOrder(order.id, {
          logisticsStatus: result.status,
          logisticsHistory: result.traces
        })
      }

      return result
    } catch (error) {
      console.error('更新物流状态失败:', error)
      return null
    }
  }

  // 批量更新物流状态
  const batchUpdateLogisticsStatus = async () => {
    const shippedOrders = orders.value.filter(order =>
      order.status === 'shipped' &&
      order.trackingNumber &&
      order.logisticsStatus !== 'delivered'
    )

    const results = await Promise.allSettled(
      shippedOrders.map(order => updateLogisticsStatus(order.trackingNumber!))
    )

    return results
  }

  // 获取订单统计
  const getOrderStats = () => {
    const visibleOrders = getVisibleOrders(orders.value)

    return {
      total: visibleOrders.length,
      pending: visibleOrders.filter(o => o.status === 'pending_transfer').length,
      pendingAudit: visibleOrders.filter(o => o.status === 'pending_audit').length,
      pendingShipment: visibleOrders.filter(o => o.status === 'pending_shipment').length,
      shipped: visibleOrders.filter(o => o.status === 'shipped').length,
      delivered: visibleOrders.filter(o => o.status === 'delivered').length,
      cancelled: visibleOrders.filter(o => o.status === 'cancelled').length
    }
  }

  // 搜索订单
  const searchOrders = (keyword: string) => {
    const visibleOrders = getVisibleOrders(orders.value)

    if (!keyword) return visibleOrders

    return visibleOrders.filter(order =>
      order.orderNumber.toLowerCase().includes(keyword.toLowerCase()) ||
      order.customerName.toLowerCase().includes(keyword.toLowerCase()) ||
      order.customerPhone.includes(keyword) ||
      order.receiverName.toLowerCase().includes(keyword.toLowerCase()) ||
      order.receiverPhone.includes(keyword)
    )
  }

  // 按状态筛选订单
  const filterOrdersByStatus = (status: OrderStatus | 'all') => {
    const visibleOrders = getVisibleOrders(orders.value)

    if (status === 'all') return visibleOrders
    return visibleOrders.filter(order => order.status === status)
  }

  // 按日期范围筛选订单
  const filterOrdersByDateRange = (startDate: string, endDate: string) => {
    const visibleOrders = getVisibleOrders(orders.value)

    return visibleOrders.filter(order => {
      const orderDate = order.createTime.split(' ')[0]
      return orderDate >= startDate && orderDate <= endDate
    })
  }

  // 获取订单状态文本（中文）
  const getStatusText = (status: OrderStatus | string): string => {
    const statusMap: Record<string, string> = {
      'pending_transfer': '待流转',
      'pending_audit': '待审核',
      'audit_rejected': '审核拒绝',
      'pending_shipment': '待发货',
      'shipped': '已发货',
      'delivered': '已签收',
      'logistics_returned': '物流退回',
      'logistics_cancelled': '物流取消',
      'package_exception': '包裹异常',
      'rejected': '拒收',
      'rejected_returned': '拒收已退回',
      'after_sales_created': '已建售后',
      'pending_cancel': '待取消',
      'cancel_failed': '取消失败',
      'cancelled': '已取消',
      'draft': '草稿'
    }
    return statusMap[status] || status
  }

  // 根据发货状态获取订单（用于发货列表页面）
  // 注意：发货列表应该显示所有相关状态的订单，不受创建者限制（物流人员需要处理所有订单）
  const getOrdersByShippingStatus = (shippingTab: string) => {
    const currentUser = userStore.currentUser
    if (!currentUser) return []

    console.log('[发货列表] 获取订单，标签页:', shippingTab, '总订单数:', orders.value.length)

    // 发货列表的数据权限：管理员、经理、物流人员可以看到所有订单
    // 其他角色（销售员、客服）只能看到自己相关的订单
    let visibleOrders: Order[] = []

    if (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'department_manager') {
      // 超级管理员、管理员和经理可以看到所有订单
      visibleOrders = orders.value
      console.log('[发货列表] 超级管理员/管理员/经理角色，可查看全部订单，总数:', orders.value.length)
    } else {
      // 其他角色使用getVisibleOrders进行权限过滤
      visibleOrders = getVisibleOrders(orders.value)
      console.log('[发货列表] 其他角色，权限过滤后的订单数:', visibleOrders.length)
    }

    let result: Order[] = []
    switch (shippingTab) {
      case 'pending': // 待发货
        result = visibleOrders.filter(order => {
          const match = order.status === 'pending_shipment'
          if (match) {
            console.log('[发货列表] ✅ 待发货订单:', order.orderNumber, order.status, order.auditStatus)
          }
          return match
        })
        console.log('[发货列表] 待发货订单数量:', result.length)
        break
      case 'shipped': // 已发货
        result = visibleOrders.filter(order => order.status === 'shipped' || order.status === 'delivered')
        console.log('[发货列表] 已发货订单数量:', result.length)
        break
      case 'returned': // 退回
        result = visibleOrders.filter(order =>
          order.status === 'logistics_returned' ||
          order.status === 'rejected_returned' ||
          order.status === 'audit_rejected'
        )
        console.log('[发货列表] 退回订单数量:', result.length)
        break
      case 'cancelled': // 取消
        result = visibleOrders.filter(order =>
          order.status === 'cancelled' ||
          order.status === 'logistics_cancelled'
        )
        console.log('[发货列表] 取消订单数量:', result.length)
        break
      case 'draft': // 草稿
        result = visibleOrders.filter(order => order.status === 'draft')
        console.log('[发货列表] 草稿订单数量:', result.length)
        break
      default:
        result = visibleOrders
    }

    return result
  }

  // 检查并流转订单（用于定时任务）
  const checkAndTransferOrders = async () => {
    // 🔥 修复：开发环境也使用后端API执行流转
    try {
      console.log('[订单流转] 🌐 调用后端API检查流转')
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.checkTransfer()

      if (response.success && response.data?.transferredCount > 0) {
        console.log(`[订单流转] ✅ 后端流转成功: ${response.data.transferredCount} 个订单`)
        // 重新加载订单列表以获取最新状态
        await loadOrdersFromAPI(true)
        eventBus.emit(EventNames.ORDER_TRANSFERRED, response.data.orders || [])
        eventBus.emit(EventNames.REFRESH_ORDER_LIST)
        eventBus.emit(EventNames.REFRESH_AUDIT_LIST)
      } else {
        console.log('[订单流转] 没有需要流转的订单')
      }
    } catch (error) {
      console.error('[订单流转] ❌ 后端API调用失败:', error)
    }
  }

  // 物流事件监听器
  const setupLogisticsEventListener = () => {
    // 设置物流状态更新事件监听器
    console.log('物流事件监听器已设置')
  }

  // 启动物流自动同步
  const startLogisticsAutoSync = () => {
    // 如果已有定时器，先清除
    if (logisticsAutoSyncTimer) {
      clearInterval(logisticsAutoSyncTimer)
    }

    // 启动物流状态自动同步
    console.log('物流自动同步已启动')

    // 每30分钟自动更新一次物流状态
    logisticsAutoSyncTimer = setInterval(() => {
      batchUpdateLogisticsStatus()
    }, 30 * 60 * 1000)
  }

  // 停止物流自动同步
  const stopLogisticsAutoSync = () => {
    if (logisticsAutoSyncTimer) {
      clearInterval(logisticsAutoSyncTimer)
      logisticsAutoSyncTimer = null
      console.log('物流自动同步已停止')
    }
  }

  // 启动订单自动流转定时任务
  const startAutoTransferTask = () => {
    // 如果已有定时器，先清除
    if (orderAutoTransferTimer) {
      clearInterval(orderAutoTransferTimer)
    }

    console.log('[订单流转] 定时任务已启动，每分钟检查一次')

    // 每分钟检查一次订单是否需要流转
    orderAutoTransferTimer = setInterval(() => {
      console.log('[订单流转] 执行定时检查...')
      checkAndTransferOrders()
    }, 60 * 1000) // 每60秒检查一次
  }

  // 停止订单自动流转定时任务
  const stopAutoTransferTask = () => {
    if (orderAutoTransferTimer) {
      clearInterval(orderAutoTransferTimer)
      orderAutoTransferTimer = null
      console.log('[订单流转] 定时任务已停止')
    }
  }

  // 获取订单操作记录
  const getOperationLogs = (orderId: string) => {
    const order = getOrderById(orderId)
    return order?.operationLogs || []
  }

  // 获取订单状态历史
  const getOrderStatusHistory = (orderId: string) => {
    const order = getOrderById(orderId)
    return order?.statusHistory || []
  }

  // 同步订单状态（用于详情页面）
  const syncOrderStatus = (orderId: string, newStatus: OrderStatus, operator: string, description: string) => {
    const order = getOrderById(orderId)
    if (order) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

      // 更新订单状态
      updateOrder(orderId, { status: newStatus })

      // 添加状态历史
      if (!order.statusHistory) {
        order.statusHistory = []
      }
      order.statusHistory.push({
        status: newStatus,
        time: now,
        operator,
        description,
        remark: ''
      })

      // 添加操作日志
      if (!order.operationLogs) {
        order.operationLogs = []
      }
      order.operationLogs.push({
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        time: now,
        operator,
        action: '状态变更',
        description,
        remark: ''
      })
    }
  }

  // 查询物流轨迹
  const queryLogisticsTrack = async (orderId: string) => {
    const order = getOrderById(orderId)
    if (!order) {
      return null
    }

    const trackingNumber = order.trackingNumber || order.expressNo
    const expressCompany = order.expressCompany

    if (!trackingNumber || !expressCompany) {
      return null
    }

    try {
      // 导入物流服务
      const { logisticsService } = await import('@/services/logistics')

      // 调用真实物流API
      const result = await logisticsService.queryLogistics(trackingNumber, expressCompany)

      if (result && result.tracks && result.tracks.length > 0) {
        // 更新订单的物流状态和历史
        if (order.logisticsStatus !== result.currentStatus) {
          updateOrder(orderId, {
            logisticsStatus: result.currentStatus
          })
        }

        // 更新物流历史
        if (!order.logisticsHistory) {
          order.logisticsHistory = []
        }

        // 合并新的轨迹数据（避免重复）
        result.tracks.forEach(track => {
          const exists = order.logisticsHistory?.some(h =>
            h.time === track.time && h.description === track.description
          )
          if (!exists) {
            order.logisticsHistory?.push({
              time: track.time,
              location: track.location,
              description: track.description,
              status: track.status
            })
          }
        })

        // 按时间倒序排列
        order.logisticsHistory?.sort((a, b) =>
          new Date(b.time).getTime() - new Date(a.time).getTime()
        )

        return {
          tracks: result.tracks.map(track => ({
            time: track.time,
            status: track.status,
            statusText: track.statusText || track.description,
            description: track.description,
            location: track.location
          })),
          currentStatus: result.currentStatus,
          lastUpdateTime: result.lastUpdateTime,
          estimatedDeliveryTime: result.estimatedDeliveryTime
        }
      } else {
        // 如果没有查询到数据，返回空结果
        return {
          tracks: [],
          currentStatus: order.logisticsStatus || 'pending',
          lastUpdateTime: new Date().toISOString(),
          estimatedDeliveryTime: undefined
        }
      }
    } catch (error) {
      console.error('查询物流信息失败:', error)
      // 如果API调用失败，返回订单已有的物流历史数据
      if (order.logisticsHistory && order.logisticsHistory.length > 0) {
        return {
          tracks: order.logisticsHistory.map(item => ({
            time: item.time,
            status: item.status,
            statusText: item.description,
            description: item.description,
            location: item.location || ''
          })),
          currentStatus: order.logisticsStatus || 'pending',
          lastUpdateTime: order.logisticsHistory[0].time,
          estimatedDeliveryTime: undefined
        }
      }
      return null
    }
  }

  // 从API加载订单数据
  // 缓存上次加载时间，避免频繁请求
  let lastAPILoadTime = 0
  const API_CACHE_DURATION = 30000 // 🔥 30秒内不重复请求（从2秒改为30秒）

  const loadOrdersFromAPI = async (forceRefresh = false, params?: { page?: number; pageSize?: number; status?: string }) => {
    // 检测是否为生产环境
    const hostname = window.location.hostname
    const isProdEnv = (
      hostname.includes('abc789.cn') ||
      hostname.includes('vercel.app') ||
      hostname.includes('netlify.app') ||
      hostname.includes('railway.app') ||
      (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))
    )

    // 🔥 优化：如果已有数据且不是强制刷新，直接返回缓存
    const now = Date.now()
    if (!forceRefresh && orders.value.length > 0 && (now - lastAPILoadTime < API_CACHE_DURATION)) {
      console.log('[OrderStore] 使用缓存数据，跳过API请求')
      return orders.value
    }

    try {
      const { orderApi } = await import('@/api/order')
      console.log('[OrderStore] 正在从API加载订单列表...')
      // 🔥 优化：默认加载100条，业绩统计等需要更多数据的场景应使用专门的统计API
      const response = await orderApi.getList({
        page: params?.page || 1,
        pageSize: params?.pageSize || 100,
        status: params?.status
      })

      if (response && response.data && response.data.list) {
        orders.value = response.data.list
        lastAPILoadTime = now
        console.log(`[OrderStore] ✅ 从API加载了 ${response.data.list.length} 个订单`)
        return response.data.list
      } else if (response && response.success === false) {
        console.error('[OrderStore] API返回失败:', response)
        throw new Error('API返回失败')
      }

      // 🔥 修复：开发环境也使用API数据，不使用本地模拟数据
      console.log('[OrderStore] API返回空数据，订单列表为空')
      orders.value = []
      return []
    } catch (error) {
      console.error('[OrderStore] ❌ 从API加载订单失败:', error)

      // 🔥 修复：开发环境也不使用本地数据，直接返回空数组
      console.warn('[OrderStore] API失败，订单列表为空')
      orders.value = []
      return []
    }
  }

  // 从API加载待审核取消订单
  const loadPendingCancelOrdersFromAPI = async () => {
    try {
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.getPendingCancelOrders()

      if (response && response.data) {
        return response.data
      }
      return []
    } catch (error) {
      console.warn('Order Store: 从API加载待审核取消订单失败:', error)
      return []
    }
  }

  // 从API加载已审核取消订单
  const loadAuditedCancelOrdersFromAPI = async () => {
    try {
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.getAuditedCancelOrders()

      if (response && response.data) {
        return response.data
      }
      return []
    } catch (error) {
      console.warn('Order Store: 从API加载已审核取消订单失败:', error)
      return []
    }
  }

  // 提交取消订单申请到API
  const submitCancelRequestToAPI = async (orderId: string, reason: string, description: string) => {
    try {
      const { orderApi } = await import('@/api/order')
      const userStore = useUserStore()
      const response = await orderApi.cancelRequest({
        orderId,
        reason,
        description,
        operatorId: userStore.currentUser?.id || ''
      })

      if (response && response.success) {
        // 更新本地订单状态
        updateOrder(orderId, {
          status: 'pending_cancel' as unknown,
          cancelReason: reason,
          cancelDescription: description,
          cancelRequestTime: new Date().toISOString()
        })
        return { success: true, message: response.message }
      }
      return { success: false, message: '提交失败' }
    } catch (error) {
      console.error('Order Store: 提交取消申请失败:', error)
      return { success: false, message: '提交失败' }
    }
  }

  // 审核取消订单到API
  const auditCancelOrderToAPI = async (orderId: string, action: 'approve' | 'reject', remark: string) => {
    try {
      const { orderApi } = await import('@/api/order')
      const userStore = useUserStore()
      const response = await orderApi.cancelAudit(orderId, {
        action,
        remark,
        auditorId: userStore.currentUser?.id || ''
      })

      if (response && response.success) {
        // 更新本地订单状态
        const newStatus = action === 'approve' ? 'cancelled' : 'cancel_failed'
        updateOrder(orderId, {
          status: newStatus as unknown,
          cancelStatus: action === 'approve' ? 'approved' : 'rejected'
        })
        return { success: true, message: response.message }
      }
      return { success: false, message: '审核失败' }
    } catch (error) {
      console.error('Order Store: 审核取消订单失败:', error)
      return { success: false, message: '审核失败' }
    }
  }

  // 初始化模拟数据（已废弃，保留函数签名以兼容旧代码）
  const initializeWithMockData = () => {
    // 🔥 修复：不再使用模拟数据，所有环境都从API获取数据
    console.log('[OrderStore] initializeWithMockData已废弃，订单数据从API获取')
    return
  }

  return {
    orders,
    totalOrders,
    pendingOrders,
    transferDelayMinutes,
    getOrders,
    getOrderById,
    getOrderByNumber,
    addOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    generateOrderNumber,
    auditOrder,
    shipOrder,
    returnOrder,
    cancelOrder,
    approveCancelOrders,
    rejectCancelOrders,
    updateLogisticsStatus,
    batchUpdateLogisticsStatus,
    getOrderStats,
    searchOrders,
    filterOrdersByStatus,
    filterOrdersByDateRange,
    getOrdersByShippingStatus,
    checkAndTransferOrders,
    startAutoTransferTask,
    stopAutoTransferTask,
    loadTransferDelayConfig,
    setupLogisticsEventListener,
    startLogisticsAutoSync,
    stopLogisticsAutoSync,
    getOperationLogs,
    getOrderStatusHistory,
    syncOrderStatus,
    queryLogisticsTrack,
    initializeWithMockData,
    getStatusText,
    // 新增API方法
    loadOrdersFromAPI,
    loadPendingCancelOrdersFromAPI,
    loadAuditedCancelOrdersFromAPI,
    submitCancelRequestToAPI,
    auditCancelOrderToAPI
  }
}, {
  // 排除orders字段不保存到localStorage，避免存储空间不足
  // 订单数据从后端API加载，不需要本地持久化
  exclude: ['orders']
})
