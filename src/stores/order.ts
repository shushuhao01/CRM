import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCustomerStore } from './customer'
import { useUserStore } from './user'
import { createPersistentStore } from '@/utils/storage'
import { logisticsService, type LogisticsResult } from '@/services/logistics'
import { eventBus, EventNames } from '@/utils/eventBus'

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
  operatorId?: string  // ✅ 添加operatorId字段定义
  auditTime?: string
  auditBy?: string
  auditRemark?: string
  // 审核流转相关
  auditTransferTime?: string // 流转审核的时间（3分钟后）
  isAuditTransferred?: boolean // 是否已流转到审核
  hasBeenAudited?: boolean // 是否曾经被审核过（用于标识重新提审的订单）
  // 发货相关
  shippingTime?: string
  shippingData?: { [key: string]: unknown }
  expressCompany?: string     // 快递公司
  trackingNumber?: string     // 快递单号
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
  // 客服和订单来源
  serviceWechat?: string  // 客服微信号
  orderSource?: string    // 订单来源
  expectedShipDate?: string  // 预计发货日期
  expectedDeliveryDate?: string  // 预计送达日期
}

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

    // 超管、管理员和经理可以查看所有订单
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'department_manager') {
      console.log('[数据权限] 超管/管理员/经理角色，可查看全部订单:', orderList.length)
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

  // 物流自动同步定时器
  let logisticsAutoSyncTimer: NodeJS.Timeout | null = null

  // 订单自动流转定时器
  let orderAutoTransferTimer: NodeJS.Timeout | null = null

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
  const updateOrder = async (id: string, updates: Partial<Order>) => {
    const index = orders.value.findIndex(order => order.id === id)
    if (index !== -1) {
      const oldOrder = orders.value[index]
      // 使用splice确保触发响应式更新
      const updatedOrder = { ...oldOrder, ...updates }
      orders.value.splice(index, 1, updatedOrder)
      console.log(`[订单Store] 更新订单 ${id}，新数据:`, {
        status: updatedOrder.status,
        logisticsStatus: updatedOrder.logisticsStatus,
        isTodo: updatedOrder.isTodo,
        auditStatus: updatedOrder.auditStatus
      })

      // 【关键修复】如果订单状态或物流状态更新为已签收，创建资料记录
      const oldStatus = oldOrder.status || oldOrder.logisticsStatus
      const newStatus = updatedOrder.status || updatedOrder.logisticsStatus

      if (newStatus === 'delivered' && oldStatus !== 'delivered') {
        console.log(`[订单Store] 订单已签收，创建资料记录: ${updatedOrder.orderNo}`)
        await createDataRecordFromOrder(updatedOrder)
      }
    } else {
      console.warn(`[订单Store] 未找到订单 ${id}`)
    }
  }

  // 创建资料记录（从订单）
  const createDataRecordFromOrder = async (order: Order) => {
    try {
      console.log('[订单Store] 开始创建资料记录，订单信息:', {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerId: order.customerId
      })

      // 从localStorage获取现有的dataList
      const dataListStr = localStorage.getItem('dataList')
      let dataList = []

      if (dataListStr) {
        try {
          dataList = JSON.parse(dataListStr)
        } catch (error) {
          console.error('[订单Store] 解析dataList失败:', error)
          dataList = []
        }
      }

      // 从customers获取客户编码
      let customerCode = ''
      try {
        const customersStr = localStorage.getItem('customers')
        if (customersStr) {
          const customers = JSON.parse(customersStr)
          const customer = customers.find((c: any) =>
            c.id === order.customerId || c.name === order.customerName
          )
          if (customer) {
            customerCode = customer.code
            console.log('[订单Store] 找到客户编码:', customerCode)
          }
        }
      } catch (error) {
        console.error('[订单Store] 获取客户编码失败:', error)
      }

      // 如果没有找到客户编码，生成一个
      if (!customerCode) {
        customerCode = `C${Date.now()}`
        console.log('[订单Store] 生成新客户编码:', customerCode)
      }

      // 【关键修复】检查该客户是否已存在资料记录
      // 优先按客户编码匹配，其次按客户姓名匹配
      const customerExists = dataList.some((item: any) => {
        // 如果有客户编码，优先用客户编码匹配
        if (customerCode && item.customerCode === customerCode) {
          console.log('[订单Store] 客户编码匹配，已存在:', customerCode)
          return true
        }
        // 如果没有客户编码或编码不匹配，用客户姓名匹配
        if (item.customerName === order.customerName) {
          console.log('[订单Store] 客户姓名匹配，已存在:', order.customerName)
          return true
        }
        return false
      })

      if (customerExists) {
        console.log(`[订单Store] ✓ 客户已存在资料记录，跳过创建: ${order.customerName} (${customerCode})`)
        return
      }

      console.log(`[订单Store] ✓ 首次签收客户，创建资料记录: ${order.customerName} (${customerCode})`)

      // 创建新的资料记录
      const dataRecord = {
        id: `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerCode: customerCode,
        customerName: order.customerName,
        phone: order.customerPhone || '',
        orderNo: order.orderNumber,
        orderStatus: 'delivered', // 订单状态固定为已签收
        orderAmount: order.totalAmount || 0,
        orderDate: order.createTime || new Date().toISOString(),
        signDate: new Date().toISOString(),
        status: 'pending', // 初始状态为待分配
        source: '订单签收',
        createdBy: 'system',
        createdByName: '系统',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }

      // 添加到dataList
      dataList.unshift(dataRecord)

      // 保存到localStorage
      localStorage.setItem('dataList', JSON.stringify(dataList))

      console.log('[订单Store] ✓ 成功创建资料记录:', dataRecord)
    } catch (error) {
      console.error('[订单Store] ✗ 创建资料记录失败:', error)
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
  const createOrder = async (payload: any): Promise<Order> => {
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

    const id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const orderNumber = generateOrderNumber()

    const newOrder: Order = {
      id,
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
      status: 'pending_transfer',
      auditStatus: 'pending',
      markType: payload.markType || 'normal',
      createTime: formatTime(now),
      createdBy: payload.createdBy || (userStore.currentUser?.name || 'system'),
      salesPersonId: payload.salesPersonId || (userStore.currentUser?.id || '1'),
      operatorId: payload.operatorId || (userStore.currentUser?.id || '1'), // ✅ 添加operatorId字段
      expressCompany: payload.expressCompany,
      // 新增字段：客服微信号和订单来源
      serviceWechat: payload.serviceWechat || '',
      orderSource: payload.orderSource || ''
    }

    // 设置3分钟后自动流转到审核
    const transferTime = new Date(now.getTime() + 3 * 60 * 1000)
    newOrder.auditTransferTime = formatTime(transferTime)
    newOrder.isAuditTransferred = false

    console.log('[订单创建] 流转时间设置:', {
      当前时间: formatTime(now),
      流转时间: newOrder.auditTransferTime,
      剩余毫秒: transferTime.getTime() - now.getTime(),
      剩余分钟: Math.ceil((transferTime.getTime() - now.getTime()) / 60000)
    })

    // 初始化状态历史
    newOrder.statusHistory = [
      {
        status: 'pending_transfer',
        time: formatTime(now),
        operator: newOrder.createdBy,
        description: '订单创建成功',
        remark: payload.remark || '客户下单'
      }
    ]

    // 初始化操作日志
    newOrder.operationLogs = [
      {
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        time: formatTime(now),
        operator: newOrder.createdBy,
        action: '创建订单',
        description: '订单创建成功',
        remark: payload.remark || ''
      }
    ]

    // 入库并由持久化工具自动保存
    addOrder(newOrder)

    // 立即保存，确保新订单不丢失（通过 store 实例调用）
    setTimeout(() => {
      const storeInstance = useOrderStore()
      if (storeInstance && typeof (storeInstance as any).saveImmediately === 'function') {
        (storeInstance as any).saveImmediately()
        console.log('[订单Store] 创建订单后立即保存完成')
      }
    }, 10)

    return newOrder
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

  // 审核订单
  const auditOrder = (id: string, approved: boolean, remark: string) => {
    const order = getOrderById(id)
    if (order) {
      const currentUser = userStore.currentUser
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

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

      // 添加操作日志
      if (order.operationLogs) {
        order.operationLogs.push({
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          time: now,
          operator: currentUser?.name || 'unknown',
          action: approved ? '审核通过' : '审核拒绝',
          description: approved ? '订单审核通过，等待发货' : '订单审核被拒绝',
          remark
        })
      }

      // 发射事件通知
      console.log(`[订单审核] 订单 ${order.orderNumber} 审核${approved ? '通过' : '拒绝'}`)
      eventBus.emit(EventNames.ORDER_AUDITED, { order, approved, remark })
      eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)

      if (approved) {
        // 审核通过，流转到发货列表
        eventBus.emit(EventNames.REFRESH_SHIPPING_LIST)
        console.log(`[订单流转] 订单 ${order.orderNumber} 已流转到发货列表`)
      } else {
        // 审核拒绝，退回订单列表
        eventBus.emit(EventNames.REFRESH_ORDER_LIST)
        console.log(`[订单退回] 订单 ${order.orderNumber} 已退回订单列表`)
      }

      // 刷新审核列表
      eventBus.emit(EventNames.REFRESH_AUDIT_LIST)

      // 立即保存，确保审核结果不丢失
      setTimeout(() => {
        const storeInstance = useOrderStore()
        if (storeInstance && typeof (storeInstance as unknown).saveImmediately === 'function') {
          (storeInstance as unknown).saveImmediately()
          console.log('[订单Store] 审核后立即保存完成')
        }
      }, 10)
    }
  }

  // 发货
  const shipOrder = (id: string, expressCompany: string, trackingNumber: string) => {
    const order = getOrderById(id)
    if (order) {
      const currentUser = userStore.currentUser
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

      updateOrder(id, {
        status: 'shipped',
        shippingTime: now,
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

      // 添加操作日志
      if (order.operationLogs) {
        order.operationLogs.push({
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          time: now,
          operator: currentUser?.name || 'unknown',
          action: '订单发货',
          description: `订单已通过${expressCompany}发货，快递单号：${trackingNumber}`,
          remark: '正常发货'
        })
      }

      // 发射事件通知
      console.log(`[订单发货] 订单 ${order.orderNumber} 已发货，快递单号：${trackingNumber}`)
      eventBus.emit(EventNames.ORDER_SHIPPED, { order, expressCompany, trackingNumber })
      eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
      eventBus.emit(EventNames.REFRESH_SHIPPING_LIST) // 刷新发货列表
      eventBus.emit(EventNames.REFRESH_LOGISTICS_LIST) // 刷新物流列表
      console.log(`[订单流转] 订单 ${order.orderNumber} 已流转到物流列表`)

      // 立即保存，确保发货信息不丢失
      setTimeout(() => {
        const storeInstance = useOrderStore()
        if (storeInstance && typeof (storeInstance as unknown).saveImmediately === 'function') {
          (storeInstance as unknown).saveImmediately()
          console.log('[订单Store] 发货后立即保存完成')
        }
      }, 10)
    }
  }

  // 退回订单
  const returnOrder = (id: string, reason: string) => {
    const order = getOrderById(id)
    if (order) {
      const currentUser = userStore.currentUser
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

      // 根据当前订单状态确定退回后的状态
      let newStatus: OrderStatus = 'rejected_returned'
      if (order.status === 'shipped' || order.status === 'pending_shipment') {
        newStatus = 'logistics_returned'
      }

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

      // 添加操作日志
      if (order.operationLogs) {
        order.operationLogs.push({
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          time: now,
          operator: currentUser?.name || 'unknown',
          action: '退回订单',
          description: '订单已退回',
          remark: reason
        })
      }

      // 发射事件通知
      console.log(`[订单退回] 订单 ${order.orderNumber} 已退回，原因：${reason}`)
      eventBus.emit(EventNames.ORDER_RETURNED, { order, reason })
      eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
      eventBus.emit(EventNames.REFRESH_ORDER_LIST)
      eventBus.emit(EventNames.REFRESH_SHIPPING_LIST)
      eventBus.emit(EventNames.REFRESH_LOGISTICS_LIST)

      return order
    }
    return null
  }

  // 审核通过取消订单
  const approveCancelOrders = async (orderIds: string[]): Promise<boolean> => {
    try {
      const currentUser = userStore.currentUser
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

      let successCount = 0
      for (const id of orderIds) {
        const order = getOrderById(id)
        if (order && order.status === 'pending_cancel') {
          updateOrder(id, {
            status: 'cancelled',
            cancelStatus: 'approved',
            cancelTime: now
          })

          // 添加状态历史
          if (order.statusHistory) {
            order.statusHistory.push({
              status: 'cancelled',
              time: now,
              operator: currentUser?.name || 'unknown',
              description: '取消订单审核通过',
              remark: order.cancelReason || '审核通过'
            })
          }

          // 添加操作日志
          if (order.operationLogs) {
            order.operationLogs.push({
              id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              time: now,
              operator: currentUser?.name || 'unknown',
              action: '审核通过取消订单',
              description: '取消订单审核通过',
              remark: order.cancelReason || '审核通过'
            })
          }

          // 发射事件通知
          eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
          console.log(`[订单取消审核] 订单 ${order.orderNumber} 取消审核通过`)
          successCount++
        }
      }

      if (successCount === 0) {
        console.warn('[订单取消审核] 没有找到符合条件的订单')
        return false
      }

      eventBus.emit(EventNames.REFRESH_ORDER_LIST)

      // 立即保存，确保审核结果不丢失
      setTimeout(() => {
        const storeInstance = useOrderStore()
        if (storeInstance && typeof (storeInstance as unknown).saveImmediately === 'function') {
          (storeInstance as unknown).saveImmediately()
          console.log('[订单Store] 取消审核通过后立即保存完成')
        }
      }, 10)

      return true
    } catch (error) {
      console.error('[订单取消审核] 审核通过失败:', error)
      return false
    }
  }

  // 审核拒绝取消订单
  const rejectCancelOrders = async (orderIds: string[]): Promise<boolean> => {
    try {
      const currentUser = userStore.currentUser
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

      let successCount = 0
      for (const id of orderIds) {
        const order = getOrderById(id)
        if (order && order.status === 'pending_cancel') {
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

          // 添加状态历史
          if (order.statusHistory) {
            order.statusHistory.push({
              status: restoreStatus,
              time: now,
              operator: currentUser?.name || 'unknown',
              description: '取消订单审核拒绝，订单已恢复',
              remark: order.cancelReason || '审核拒绝'
            })
          }

          // 添加操作日志
          if (order.operationLogs) {
            order.operationLogs.push({
              id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              time: now,
              operator: currentUser?.name || 'unknown',
              action: '审核拒绝取消订单',
              description: '取消订单审核拒绝，订单已恢复',
              remark: order.cancelReason || '审核拒绝'
            })
          }

      // 发射事件通知
      eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
      console.log(`[订单取消审核] 订单 ${order.orderNumber} 取消审核拒绝，已恢复状态`)
      successCount++
        }
      }

      if (successCount === 0) {
        console.warn('[订单取消审核] 没有找到符合条件的订单')
        return false
      }

      eventBus.emit(EventNames.REFRESH_ORDER_LIST)

      // 立即保存，确保审核结果不丢失
      setTimeout(() => {
        const storeInstance = useOrderStore()
        if (storeInstance && typeof (storeInstance as unknown).saveImmediately === 'function') {
          (storeInstance as unknown).saveImmediately()
          console.log('[订单Store] 取消审核拒绝后立即保存完成')
        }
      }, 10)

      return true
    } catch (error) {
      console.error('[订单取消审核] 审核拒绝失败:', error)
      return false
    }
  }

  // 取消订单
  const cancelOrder = (id: string, reason: string) => {
    const order = getOrderById(id)
    if (order) {
      const currentUser = userStore.currentUser
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

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

      // 添加操作日志
      if (order.operationLogs) {
        order.operationLogs.push({
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          time: now,
          operator: currentUser?.name || 'unknown',
          action: '取消订单',
          description: '订单已取消',
          remark: reason
        })
      }

      // 发射事件通知
      console.log(`[订单取消] 订单 ${order.orderNumber} 已取消，原因：${reason}`)
      eventBus.emit(EventNames.ORDER_CANCELLED, { order, reason })
      eventBus.emit(EventNames.ORDER_STATUS_CHANGED, order)
      eventBus.emit(EventNames.REFRESH_ORDER_LIST)
      eventBus.emit(EventNames.REFRESH_SHIPPING_LIST)
      eventBus.emit(EventNames.REFRESH_LOGISTICS_LIST)
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

    if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'department_manager') {
      // 管理员和经理可以看到所有订单
      visibleOrders = orders.value
      console.log('[发货列表] 管理员/经理角色，可查看全部订单')
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
  const checkAndTransferOrders = () => {
    const now = new Date()
    const currentUser = userStore.currentUser

    let hasTransferred = false
    const transferredOrders: Order[] = []

    orders.value.forEach(order => {
      // 检查待流转的订单是否需要自动流转到审核
      if (order.status === 'pending_transfer' && order.auditTransferTime) {
        const transferTime = new Date(order.auditTransferTime)
        if (now >= transferTime && !order.isAuditTransferred) {
          // 自动流转到审核状态
          updateOrder(order.id, {
            status: 'pending_audit',
            auditStatus: 'pending',
            isAuditTransferred: true
          })

          // 添加状态历史
          if (order.statusHistory) {
            order.statusHistory.push({
              status: 'pending_audit',
              time: now.toISOString().slice(0, 19).replace('T', ' '),
              operator: 'system',
              description: '订单自动流转到审核状态',
              remark: '3分钟后自动流转'
            })
          }

          // 添加操作日志
          if (order.operationLogs) {
            order.operationLogs.push({
              id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              time: now.toISOString().slice(0, 19).replace('T', ' '),
              operator: 'system',
              action: '自动流转',
              description: '订单自动流转到审核状态',
              remark: '系统自动执行'
            })
          }

          hasTransferred = true
          transferredOrders.push(order)
        }
      }
    })

    // 如果有订单被流转，发送事件通知
    if (hasTransferred) {
      console.log(`[订单流转] 共有 ${transferredOrders.length} 个订单自动流转到审核状态`)
      eventBus.emit(EventNames.ORDER_TRANSFERRED, transferredOrders)
      eventBus.emit(EventNames.REFRESH_ORDER_LIST)
      eventBus.emit(EventNames.REFRESH_AUDIT_LIST)
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

  // 初始化模拟数据（安全版）：优先使用持久化数据，必要时一次性迁移旧键
  // 重要：此函数只在 store 初始化时调用一次，不应该在页面组件中调用
  const initializeWithMockData = () => {
    // 1) 若内存已有数据，绝不覆盖（这是最重要的保护）
    if (orders.value.length > 0) {
      console.log('[Order Store] 订单数据已存在，跳过初始化（保护已有数据）')
      return
    }

    // 2) 优先尝试从统一持久化键恢复（由持久化工具负责加载，但此处再次兜底）
    try {
      const persistedRaw = localStorage.getItem('crm_store_order')
      if (persistedRaw) {
        const persisted = JSON.parse(persistedRaw)
        const recovered = Array.isArray(persisted?.data?.orders)
          ? persisted.data.orders
          : Array.isArray(persisted?.orders)
            ? persisted.orders
            : Array.isArray(persisted)
              ? persisted
              : null
        if (recovered && Array.isArray(recovered) && recovered.length > 0) {
          // 重要：只要从 crm_store_order 恢复到了数据，就使用它，不要判断是否包含今天的数据
          // 因为 createPersistentStore 已经恢复了数据，这里只是兜底检查
          // 如果这里再判断，可能会导致数据被覆盖
          orders.value = recovered
          console.log(`[Order Store] ✅ 从 crm_store_order 兜底恢复 ${orders.value.length} 个订单`)
          return
        }
      }
    } catch (error) {
      console.warn('[Order Store] 从 crm_store_order 恢复失败:', error)
    }

    // 3) 兼容并迁移旧的复数键（crm_store_orders）到统一键（crm_store_order）
    try {
      const pluralRaw = localStorage.getItem('crm_store_orders')
      if (pluralRaw) {
        const plural = JSON.parse(pluralRaw)
        if (Array.isArray(plural)) {
          orders.value = plural
          try {
            const wrapped = JSON.stringify({ data: { orders: plural }, timestamp: Date.now(), version: '1.0.0' })
            localStorage.setItem('crm_store_order', wrapped)
            localStorage.removeItem('crm_store_orders')
            console.log(`[Order Store] 已从 crm_store_orders 迁移 ${plural.length} 条订单到 crm_store_order，并清理旧键`)
          } catch (saveErr) {
            console.warn('[Order Store] 迁移保存失败:', saveErr)
          }
          return
        }
      }
    } catch (error) {
      console.warn('[Order Store] 从 crm_store_orders 加载失败:', error)
    }

    // 4) 若统一持久化无数据，则尝试一次性迁移旧的 mock 键（仅限开发演示）
    // 重要：只有在确认没有真实数据时才迁移 mock 数据
    try {
      const stored = localStorage.getItem('crm_mock_orders')
      if (stored) {
        const mockOrders = JSON.parse(stored)
        if (!Array.isArray(mockOrders) || mockOrders.length === 0) {
          localStorage.removeItem('crm_mock_orders')
          console.log('[Order Store] crm_mock_orders 数据无效，已清理')
        } else {
          const firstOrder = mockOrders[0]
          if (firstOrder && (!firstOrder.receiverName || !firstOrder.subtotal)) {
            console.log('[Order Store] 检测到旧版本 mock 数据结构，清理后走默认演示数据')
            localStorage.removeItem('crm_mock_orders')
          } else {
            // 重要：只有在确认 crm_store_order 没有数据时，才迁移 crm_mock_orders
            // 检查 crm_store_order 是否已经有数据
            const existingData = localStorage.getItem('crm_store_order')
            if (existingData) {
              try {
                const existing = JSON.parse(existingData)
                const existingOrders = Array.isArray(existing?.data?.orders)
                  ? existing.data.orders
                  : Array.isArray(existing?.orders)
                    ? existing.orders
                    : []
                if (existingOrders.length > 0) {
                  console.log(`[Order Store] ⚠️ crm_store_order 已有 ${existingOrders.length} 个订单，跳过 crm_mock_orders 迁移（保护已有数据）`)
                  // 使用已有的数据，不覆盖
                  orders.value = existingOrders
                  return
                }
              } catch (e) {
                console.warn('[Order Store] 检查 crm_store_order 失败:', e)
              }
            }

            // 只有在 crm_store_order 确实没有数据时，才迁移 crm_mock_orders
            orders.value = mockOrders
            try {
              const wrapped = JSON.stringify({ data: { orders: mockOrders }, timestamp: Date.now(), version: '1.0.0' })
              localStorage.setItem('crm_store_order', wrapped)
              localStorage.removeItem('crm_mock_orders')
              console.log(`[Order Store] 已将 ${mockOrders.length} 条 mock 订单迁移到 crm_store_order，并清理 crm_mock_orders`)
            } catch (saveErr) {
              console.warn('[Order Store] 迁移保存失败:', saveErr)
            }
            return
          }
        }
      }
    } catch (error) {
      console.warn('[Order Store] 从 crm_mock_orders 加载失败:', error)
    }

    // 5) 以上都没有时，才使用默认演示数据（开发场景），并存入统一持久化键
    // 重要：在使用默认演示数据之前，再次检查 crm_store_order 是否有数据
    // 防止在检查过程中数据被恢复或保存
    const finalCheckData = localStorage.getItem('crm_store_order')
    if (finalCheckData) {
      try {
        const finalCheck = JSON.parse(finalCheckData)
        const finalOrders = Array.isArray(finalCheck?.data?.orders)
          ? finalCheck.data.orders
          : Array.isArray(finalCheck?.orders)
            ? finalCheck.orders
            : []
        if (finalOrders.length > 0) {
          console.log(`[Order Store] ⚠️ 最终检查发现 crm_store_order 已有 ${finalOrders.length} 个订单，使用已有数据（保护真实数据）`)
          orders.value = finalOrders
          return
        }
      } catch (e) {
        console.warn('[Order Store] 最终检查失败:', e)
      }
    }

    // 只有在确实没有任何数据时，才使用默认演示数据
    console.log('[Order Store] 确认没有任何数据，使用默认演示数据')
    const initialMockOrders: Order[] = [
      {
        id: '1',
        orderNumber: 'ORD202401001',
        customerId: '1',
        customerName: '张三',
        customerPhone: '13800138001',
        products: [
          { id: '1', name: '产品A', price: 1000, quantity: 2, total: 2000 }
        ],
        subtotal: 2000,
        discount: 0,
        totalAmount: 2000,
        collectAmount: 1500,
        depositAmount: 500,
        receiverName: '张三',
        receiverPhone: '13800138001',
        receiverAddress: '北京市朝阳区建国门外大街1号',
        remark: '请尽快发货',
        status: 'pending_shipment',
        auditStatus: 'approved',
        markType: 'normal',
        createTime: '2024-01-15 10:30:00',
        createdBy: 'admin',
        salesPersonId: 'admin',
        serviceWechat: 'service001',
        orderSource: 'online_store',
        expectedShipDate: '2024-01-16',
        expectedDeliveryDate: '2024-01-18',
        expressCompany: 'sf',
        trackingNumber: 'SF1234567890',
        logisticsStatus: 'picked_up',
        statusHistory: [
          {
            status: 'pending_transfer',
            time: '2024-01-15 10:30:00',
            operator: 'admin',
            description: '订单创建成功',
            remark: '客户下单'
          },
          {
            status: 'pending_audit',
            time: '2024-01-15 10:33:00',
            operator: 'admin',
            description: '订单流转到审核',
            remark: '自动流转'
          },
          {
            status: 'pending_shipment',
            time: '2024-01-15 11:00:00',
            operator: '审核员',
            description: '订单审核通过，等待发货',
            remark: '审核通过'
          }
        ],
        operationLogs: [
          {
            id: 'op_1',
            time: '2024-01-15 10:30:00',
            operator: 'admin',
            action: '创建订单',
            description: '订单创建成功',
            remark: '客户下单'
          },
          {
            id: 'op_2',
            time: '2024-01-15 11:00:00',
            operator: '审核员',
            action: '审核通过',
            description: '订单审核通过，等待发货',
            remark: '审核通过'
          }
        ]
      },
      {
        id: '2',
        orderNumber: 'ORD202401002',
        customerId: '2',
        customerName: '李四',
        customerPhone: '13900139002',
        products: [
          { id: '2', name: '产品B', price: 1500, quantity: 1, total: 1500 }
        ],
        subtotal: 1500,
        discount: 100,
        totalAmount: 1400,
        collectAmount: 900,
        depositAmount: 500,
        receiverName: '李四',
        receiverPhone: '13900139002',
        receiverAddress: '上海市浦东新区陆家嘴环路1000号',
        remark: '客户要求包装精美',
        status: 'pending_cancel',
        auditStatus: 'pending',
        markType: 'normal',
        createTime: '2024-01-16 14:20:00',
        createdBy: 'sales1',
        salesPersonId: 'sales1',
        cancelStatus: 'pending',
        cancelReason: 'customer_cancel',
        cancelDescription: '客户临时改变主意，不需要此产品',
        cancelRequestTime: '2024-01-17 09:15:00',
        serviceWechat: 'service002',
        orderSource: 'wechat_mini',
        statusHistory: [
          {
            status: 'pending_transfer',
            time: '2024-01-16 14:20:00',
            operator: 'sales1',
            description: '订单创建成功',
            remark: '客户下单'
          },
          {
            status: 'pending_cancel',
            time: '2024-01-17 09:15:00',
            operator: 'sales1',
            description: '申请取消订单',
            remark: '客户要求取消'
          }
        ],
        operationLogs: [
          {
            id: 'op_3',
            time: '2024-01-16 14:20:00',
            operator: 'sales1',
            action: '创建订单',
            description: '订单创建成功',
            remark: '客户下单'
          },
          {
            id: 'op_4',
            time: '2024-01-17 09:15:00',
            operator: 'sales1',
            action: '申请取消',
            description: '申请取消订单',
            remark: '客户要求取消'
          }
        ]
      },
      {
        id: '3',
        orderNumber: 'ORD202401003',
        customerId: '3',
        customerName: '王五',
        customerPhone: '13700137003',
        products: [
          { id: '3', name: '产品C', price: 800, quantity: 3, total: 2400 }
        ],
        subtotal: 2400,
        discount: 0,
        totalAmount: 2400,
        collectAmount: 2400,
        depositAmount: 0,
        receiverName: '王五',
        receiverPhone: '13700137003',
        receiverAddress: '广州市天河区珠江新城花城大道1号',
        remark: '货到付款',
        status: 'shipped',
        auditStatus: 'approved',
        markType: 'normal',
        createTime: '2024-01-18 09:15:00',
        createdBy: 'sales2',
        salesPersonId: 'sales2',
        auditRemark: '审核通过',
        auditTime: '2024-01-18 14:20:00',
        auditorId: 'admin',
        serviceWechat: 'service003',
        orderSource: 'phone_call',
        expectedShipDate: '2024-01-19',
        expectedDeliveryDate: '2024-01-21',
        expressCompany: 'yt',
        trackingNumber: 'YT9876543210',
        logisticsStatus: 'in_transit',
        statusHistory: [
          {
            status: 'pending_transfer',
            time: '2024-01-18 09:15:00',
            operator: 'sales2',
            description: '订单创建成功',
            remark: '客户下单'
          },
          {
            status: 'pending_audit',
            time: '2024-01-18 09:18:00',
            operator: 'sales2',
            description: '订单流转到审核',
            remark: '自动流转'
          },
          {
            status: 'pending_shipment',
            time: '2024-01-18 14:20:00',
            operator: 'admin',
            description: '订单审核通过，等待发货',
            remark: '审核通过'
          },
          {
            status: 'shipped',
            time: '2024-01-19 10:30:00',
            operator: '物流员',
            description: '订单已发货',
            remark: '圆通快递'
          }
        ],
        operationLogs: [
          {
            id: 'op_5',
            time: '2024-01-18 09:15:00',
            operator: 'sales2',
            action: '创建订单',
            description: '订单创建成功',
            remark: '客户下单'
          },
          {
            id: 'op_6',
            time: '2024-01-18 14:20:00',
            operator: 'admin',
            action: '审核通过',
            description: '订单审核通过，等待发货',
            remark: '审核通过'
          },
          {
            id: 'op_7',
            time: '2024-01-19 10:30:00',
            operator: '物流员',
            action: '订单发货',
            description: '订单已通过圆通快递发货',
            remark: '正常发货'
          }
        ]
      }
    ]

    orders.value = initialMockOrders

    // 保存到统一持久化键
    try {
      const wrapped = JSON.stringify({ data: { orders: initialMockOrders }, timestamp: Date.now(), version: '1.0.0' })
      localStorage.setItem('crm_store_order', wrapped)
      // 移除旧 mock 键，避免后续误覆盖
      localStorage.removeItem('crm_mock_orders')
      console.log(`[Order Store] 初始化演示订单 ${initialMockOrders.length} 条，并写入 crm_store_order`)
    } catch (error) {
      console.warn('[Order Store] 保存演示订单到 crm_store_order 失败:', error)
    }
  }

  // 重要：不要在 store 初始化时自动调用 initializeWithMockData
  // createPersistentStore 已经自动恢复了数据，如果数据为空，说明确实没有数据
  // initializeWithMockData 应该只在明确需要初始化演示数据时才调用（比如首次安装）
  // 这里只记录日志，不执行初始化，确保不会覆盖真实数据
  if (typeof window !== 'undefined') {
    // 延迟检查，确保 createPersistentStore 的数据恢复已完成
    setTimeout(() => {
      if (orders.value.length === 0) {
        console.log('[Order Store] ⚠️ 数据恢复后仍为空，但不自动初始化（保护真实数据）')
        console.log('[Order Store] 如果需要初始化演示数据，请手动调用 initializeWithMockData()')
      } else {
        console.log(`[Order Store] ✅ 数据已从持久化存储恢复，共 ${orders.value.length} 个订单`)
        // 验证数据完整性
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayOrders = orders.value.filter(order => {
          const orderDate = new Date(order.createTime || 0)
          orderDate.setHours(0, 0, 0, 0)
          return orderDate.getTime() >= today.getTime()
        })
        if (todayOrders.length > 0) {
          console.log(`[Order Store] ✅ 包含 ${todayOrders.length} 个今天的订单，数据完整`)
        }
        // 验证 localStorage 中的数据
        const stored = localStorage.getItem('crm_store_order')
        if (stored) {
          try {
            const storedData = JSON.parse(stored)
            const storedOrders = Array.isArray(storedData?.data?.orders) ? storedData.data.orders : []
            console.log(`[Order Store] ✅ localStorage 中存储了 ${storedOrders.length} 个订单`)
            if (storedOrders.length !== orders.value.length) {
              console.warn(`[Order Store] ⚠️ 数据不一致：内存 ${orders.value.length} 个，localStorage ${storedOrders.length} 个`)
            }
          } catch (e) {
            console.warn('[Order Store] 验证 localStorage 数据失败:', e)
          }
        }
      }
    }, 200)
  }

    return {
    orders,
    totalOrders,
    pendingOrders,
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
    setupLogisticsEventListener,
    startLogisticsAutoSync,
    stopLogisticsAutoSync,
    getOperationLogs,
    getOrderStatusHistory,
    syncOrderStatus,
    queryLogisticsTrack,
    initializeWithMockData,
    getStatusText
  }
})
