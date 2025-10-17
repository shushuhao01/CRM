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
      
      // 刷新汇总数据
      await fetchSummary()
      
      return response
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
      shipped: '已发货',
      delivered: '已签收',
      rejected: '拒收',
      returned: '拒收已退回',
      refunded: '退货退款',
      abnormal: '状态异常'
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