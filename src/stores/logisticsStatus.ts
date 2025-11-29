import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import {
  getLogisticsStatusList,
  getLogisticsStatusSummary,
  updateOrderLogisticsStatus,
  batchUpdateOrderLogisticsStatus,
  setOrderTodo,
  getLogisticsTracking,
  autoUpdateLogisticsStatus,
  getUserLogisticsPermission
} from '@/api/logisticsStatus'
import { useOrderStore } from './order'

export interface LogisticsOrder {
  id: string
  orderNo: string
  customerName: string
  status: string
  amount: number
  trackingNo: string
  latestUpdate: string
  assignedTo: string
  orderDate: string
  todoDate?: string
  todoRemark?: string
}

export interface LogisticsSummary {
  pending: number
  updated: number
  todo: number
  total: number
}

export interface TrackingInfo {
  time: string
  description: string
  location?: string
  operator?: string
}

export interface UserPermission {
  canAccess: boolean
  canUpdate: boolean
  canSetTodo: boolean
  canAutoUpdate: boolean
}

export const useLogisticsStatusStore = defineStore('logisticsStatus', () => {
  // 状态数据
  const loading = ref(false)
  const orderList = ref<LogisticsOrder[]>([])
  const summary = reactive<LogisticsSummary>({
    pending: 0,
    updated: 0,
    todo: 0,
    total: 0
  })
  const userPermission = reactive<UserPermission>({
    canAccess: false,
    canUpdate: false,
    canSetTodo: false,
    canAutoUpdate: false
  })

  // 分页信息
  const pagination = reactive({
    currentPage: 1,
    pageSize: 20,
    total: 0
  })

  // 筛选条件
  const filters = reactive({
    tab: 'pending',
    dateRange: [] as [string, string] | [],
    keyword: '',
    status: ''
  })

  // 获取订单列表
  const fetchOrderList = async () => {
    loading.value = true
    try {
      const params = {
        tab: filters.tab,
        dateRange: filters.dateRange.length === 2 ? filters.dateRange : undefined,
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        page: pagination.currentPage,
        pageSize: pagination.pageSize
      }

      const response = await getLogisticsStatusList(params)
      orderList.value = response.data.list || []
      pagination.total = response.data.total || 0

      return response
    } catch (error) {
      console.error('获取订单列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取汇总数据
  const fetchSummary = async () => {
    try {
      const params = {
        dateRange: filters.dateRange.length === 2 ? filters.dateRange : undefined
      }

      const response = await getLogisticsStatusSummary(params)
      Object.assign(summary, response.data)

      return response
    } catch (error) {
      console.error('获取汇总数据失败:', error)
      throw error
    }
  }

  // 创建资料记录（从订单）
  const createDataRecordFromOrder = async (order: unknown) => {
    try {
      // 【生产环境修复】只在开发环境从localStorage读取
      let dataList = []
      if (!import.meta.env.PROD) {
        const dataListStr = localStorage.getItem('dataList')
        if (dataListStr) {
          dataList = JSON.parse(dataListStr)
        }
      }

      if (dataListStr) {
        try {
          dataList = JSON.parse(dataListStr)
        } catch (error) {
          console.error('解析dataList失败:', error)
          dataList = []
        }
      }

      // 检查该客户是否已存在资料记录（只有首次签收才创建）
      // 注意：这里检查的是客户，不是订单，确保同一客户只创建一次资料记录
      const customerExists = dataList.some((item: unknown) =>
        (item.customerCode && item.customerCode === order.customerCode) ||
        (item.customerName && item.customerName === order.customerName)
      )
      if (customerExists) {
        console.log(`客户已存在资料记录，跳过创建: ${order.customerName} (${order.customerCode})`)
      }

      console.log(`首次签收客户，创建资料记录: ${order.customerName} (${order.customerCode})`)


      // 创建新的资料记录
      const dataRecord = {
        id: `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerCode: order.customerCode || `C${Date.now()}`,
        customerName: order.customerName,
        phone: order.phone,
        orderNo: order.orderNo,
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

      // 【生产环境修复】只在开发环境保存到localStorage
      if (!import.meta.env.PROD) {
        localStorage.setItem('dataList', JSON.stringify(dataList))
        console.log('[物流状态Store] 开发环境：已保存到localStorage')
      }

      console.log('成功创建资料记录:', dataRecord)
    } catch (error) {
      console.error('创建资料记录失败:', error)
    }
  }

  // 更新订单状态
  const updateOrderStatus = async (orderNo: string, newStatus: string, remark?: string) => {
    try {
      const response = await updateOrderLogisticsStatus({
        orderNo,
        newStatus,
        remark
      })

      // 更新本地数据
      const order = orderList.value.find(item => item.orderNo === orderNo)
      if (order) {
        order.status = newStatus
      }

      // 【关键修复】同步更新 orderStore 中的订单物流状态和订单状态
      const orderStore = useOrderStore()
      const storeOrder = orderStore.getOrderByNumber(orderNo)
      if (storeOrder) {
        console.log(`[物流状态Store] 同步更新订单 ${orderNo} 的物流状态: ${newStatus}`)

        // 构建更新对象
        const updates: unknown = {
          logisticsStatus: newStatus
        }

        // 【核心修复】根据物流状态同步更新订单状态
        // 这些状态需要同步到订单状态
        const statusMapping: Record<string, string> = {
          'delivered': 'delivered',              // 已签收
          'rejected': 'rejected',                // 拒收
          'rejected_returned': 'rejected_returned', // 拒收已退回
          'refunded': 'refunded',                // 退货退款（需要添加到订单状态）
          'after_sales_created': 'after_sales_created', // 已建售后
          'abnormal': 'package_exception'        // 状态异常 → 包裹异常
        }

        if (statusMapping[newStatus]) {
          updates.status = statusMapping[newStatus]
          console.log(`[物流状态Store] 同时更新订单状态为: ${statusMapping[newStatus]}`)
        }

        orderStore.updateOrder(storeOrder.id, updates)

        // 如果状态更新为已签收，创建资料记录
        if (newStatus === 'delivered') {
          console.log(`[物流状态Store] 订单已签收，创建资料记录: ${orderNo}`)
          await createDataRecordFromOrder(storeOrder)
        }
      }

      // 刷新汇总数据
      await fetchSummary()

    } catch (error) {
      console.error('更新订单状态失败:', error)
      throw error
    }
  }

  // 批量更新订单状态
  const batchUpdateOrderStatus = async (orderNos: string[], newStatus: string, remark?: string) => {
    try {
      const response = await batchUpdateOrderLogisticsStatus({
        orderNos,
        newStatus,
        remark
      })

      // 更新本地数据
      orderNos.forEach(orderNo => {
        const order = orderList.value.find(item => item.orderNo === orderNo)
        if (order) {
          order.status = newStatus
        }
      })

      // 【关键修复】同步更新 orderStore 中的订单物流状态和订单状态
      const orderStore = useOrderStore()
      orderNos.forEach(orderNo => {
        const storeOrder = orderStore.getOrderByNumber(orderNo)
        if (storeOrder) {
          console.log(`[物流状态Store] 批量同步更新订单 ${orderNo} 的物流状态: ${newStatus}`)

          // 构建更新对象
          const updates: unknown = {
            logisticsStatus: newStatus
          }

          // 【核心修复】根据物流状态同步更新订单状态
          const statusMapping: Record<string, string> = {
            'delivered': 'delivered',
            'rejected': 'rejected',
            'rejected_returned': 'rejected_returned',
            'refunded': 'refunded',
            'after_sales_created': 'after_sales_created',
            'abnormal': 'package_exception'
          }

          if (statusMapping[newStatus]) {
            updates.status = statusMapping[newStatus]
            console.log(`[物流状态Store] 同时更新订单状态为: ${statusMapping[newStatus]}`)
          }

          orderStore.updateOrder(storeOrder.id, updates)
        }
      })

      // 刷新汇总数据
      await fetchSummary()

      return response
    } catch (error) {
      console.error('批量更新订单状态失败:', error)
      throw error
    }
  }

  // 设置待办
  const setTodoOrder = async (orderNo: string, days: number, remark?: string) => {
    try {
      const response = await setOrderTodo({
        orderNo,
        days,
        remark
      })

      // 更新本地数据
      const order = orderList.value.find(item => item.orderNo === orderNo)
      if (order) {
        const todoDate = new Date()
        todoDate.setDate(todoDate.getDate() + days)
        order.todoDate = todoDate.toISOString().split('T')[0]
        order.todoRemark = remark
      }

      // 【关键修复】同步更新 orderStore 中的订单待办状态
      const orderStore = useOrderStore()
      const storeOrder = orderStore.getOrderByNumber(orderNo)
      if (storeOrder) {
        const todoDate = new Date()
        todoDate.setDate(todoDate.getDate() + days)
        console.log(`[物流状态Store] 设置订单 ${orderNo} 为待办，${days}天后处理`)
        orderStore.updateOrder(storeOrder.id, {
          isTodo: true,
          todoDate: todoDate.toISOString().split('T')[0],
          todoRemark: remark
        } as unknown)
      }

      // 刷新汇总数据
      await fetchSummary()

      return response
    } catch (error) {
      console.error('设置待办失败:', error)
      throw error
    }
  }

  // 获取物流轨迹
  const fetchTrackingInfo = async (trackingNo: string): Promise<TrackingInfo[]> => {
    try {
      const response = await getLogisticsTracking(trackingNo)
      return response.data || []
    } catch (error) {
      console.error('获取物流轨迹失败:', error)
      throw error
    }
  }

  // 自动更新物流状态
  const autoUpdateStatus = async () => {
    try {
      const response = await autoUpdateLogisticsStatus()

      // 刷新数据
      await Promise.all([
        fetchOrderList(),
        fetchSummary()
      ])

      return response
    } catch (error) {
      console.error('自动更新物流状态失败:', error)
      throw error
    }
  }

  // 获取用户权限
  const fetchUserPermission = async () => {
    try {
      const response = await getUserLogisticsPermission()
      Object.assign(userPermission, response.data)

      return response
    } catch (error) {
      console.error('获取用户权限失败:', error)
      throw error
    }
  }

  // 设置筛选条件
  const setFilters = (newFilters: Partial<typeof filters>) => {
    Object.assign(filters, newFilters)
  }

  // 设置分页信息
  const setPagination = (newPagination: Partial<typeof pagination>) => {
    Object.assign(pagination, newPagination)
  }

  // 重置筛选条件
  const resetFilters = () => {
    filters.tab = 'pending'
    filters.dateRange = []
    filters.keyword = ''
    filters.status = ''
    pagination.currentPage = 1
  }

  // 刷新数据
  const refreshData = async () => {
    await Promise.all([
      fetchOrderList(),
      fetchSummary()
    ])
  }

  // 获取状态文本
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      // 物流状态
      picked_up: '已揽收',
      in_transit: '运输中',
      out_for_delivery: '派送中',
      delivered: '已签收',
      exception: '异常',
      rejected: '拒收',
      returned: '已退回',
      refunded: '退货退款',
      abnormal: '状态异常',
      // 订单状态（兼容）
      shipped: '已发货'
    }
    return statusMap[status] || status
  }

  // 获取状态类型
  const getStatusType = (status: string): string => {
    const statusMap: Record<string, string> = {
      shipped: 'info',
      delivered: 'success',
      rejected: 'warning',
      returned: 'danger',
      refunded: 'danger',
      abnormal: 'danger'
    }
    return statusMap[status] || 'info'
  }

  return {
    // 状态
    loading,
    orderList,
    summary,
    userPermission,
    pagination,
    filters,

    // 方法
    fetchOrderList,
    fetchSummary,
    updateOrderStatus,
    batchUpdateOrderStatus,
    setTodoOrder,
    fetchTrackingInfo,
    autoUpdateStatus,
    fetchUserPermission,
    setFilters,
    setPagination,
    resetFilters,
    refreshData,
    getStatusText,
    getStatusType
  }
})
