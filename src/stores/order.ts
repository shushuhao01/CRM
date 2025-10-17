import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCustomerStore } from './customer'
import { useUserStore } from './user'
import { createPersistentStore } from '@/utils/storage'
import { logisticsService, type LogisticsResult } from '@/services/logistics'

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
}

export const useOrderStore = createPersistentStore('order', () => {
  const customerStore = useCustomerStore()
  const userStore = useUserStore()

  // 获取当前用户可见的订单列表
  const getVisibleOrders = (orderList: Order[]) => {
    const currentUser = userStore.currentUser
    if (!currentUser) return []

    // 管理员和经理可以查看所有订单
    if (currentUser.role === 'admin' || currentUser.role === 'manager') {
      return orderList
    }

    // 销售员只能查看自己创建的订单
    if (currentUser.role === 'sales_staff') {
      return orderList.filter(order => order.createdBy === currentUser.id)
    }

    // 客服只能查看自己处理的订单
    if (currentUser.role === 'customer_service') {
      return orderList.filter(order => order.servicePersonId === currentUser.id)
    }

    // 其他角色默认只能查看自己创建的订单
    return orderList.filter(order => order.createdBy === currentUser.id)
  }

  // 订单数据
  const orders = ref<Order[]>([])

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
      orders.value[index] = { ...orders.value[index], ...updates }
    }
  }

  // 删除订单
  const deleteOrder = (id: string) => {
    const index = orders.value.findIndex(order => order.id === id)
    if (index !== -1) {
      orders.value.splice(index, 1)
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

  // 检查并流转订单（用于定时任务）
  const checkAndTransferOrders = () => {
    const now = new Date()
    const currentUser = userStore.currentUser
    
    orders.value.forEach(order => {
      // 检查待流转的订单是否需要自动流转到审核
      if (order.status === 'pending_transfer' && order.auditTransferTime) {
        const transferTime = new Date(order.auditTransferTime)
        if (now >= transferTime && !order.isAuditTransferred) {
          // 自动流转到审核状态
          updateOrder(order.id, {
            status: 'pending_audit',
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
        }
      }
    })
  }

  return {
    orders,
    totalOrders,
    pendingOrders,
    getOrders,
    getOrderById,
    getOrderByNumber,
    addOrder,
    updateOrder,
    deleteOrder,
    generateOrderNumber,
    auditOrder,
    shipOrder,
    cancelOrder,
    updateLogisticsStatus,
    batchUpdateLogisticsStatus,
    getOrderStats,
    searchOrders,
    filterOrdersByStatus,
    filterOrdersByDateRange,
    checkAndTransferOrders
  }
})