import { request } from '@/utils/request'

// 核心指标数据接口
export interface DashboardMetrics {
  todayOrders: number
  newCustomers: number
  todayRevenue: number
  monthlyOrders: number
  monthlyRevenue?: number
  pendingService?: number
}

// 排行榜数据接口
export interface DashboardRankings {
  sales: Array<{
    id: string
    name: string
    avatar?: string
    sales: number
    orders: number
    growth: number
  }>
  products: Array<{
    id: string
    name: string
    sales: number
    orders: number
    revenue: number
  }>
}

// 图表数据接口
export interface DashboardChartData {
  revenue: Array<{
    date: string
    amount: number
    orders: number
  }>
  orderStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
}

// 待办事项接口
export interface DashboardTodo {
  id: string
  title: string
  type: 'order' | 'customer' | 'system'
  priority: 'high' | 'medium' | 'low'
  deadline?: string
  completed: boolean
  description?: string
}

// 快捷操作接口
export interface DashboardQuickAction {
  key: string
  label: string
  icon: string
  color: string
  gradient?: string
  route: string
  description?: string
}

import { isProduction } from '@/utils/env'

// 环境检测：判断是否使用后端API
const useBackendAPI = () => {
  return isProduction()
}

// 获取核心指标
export const getMetrics = async (params?: {
  userRole?: string,
  userId?: string,
  departmentId?: string
}): Promise<DashboardMetrics> => {
  // 如果在生产环境且后端API可用，使用后端API
  if (useBackendAPI()) {
    try {
      const response = await request.get('/api/dashboard/metrics', { params })
      return response.data || response
    } catch (error) {
      console.error('后端API调用失败，降级到localStorage:', error)
      // 降级到localStorage
    }
  }

  // 开发环境或后端API不可用时，从localStorage获取数据
  try {
    // 从localStorage获取真实数据
    const ordersData = localStorage.getItem('order-store')
    const customersData = localStorage.getItem('customer-store')

    if (!ordersData || !customersData) {
      return {
        todayOrders: 0,
        newCustomers: 0,
        todayRevenue: 0,
        monthlyOrders: 0
      }
    }

    const orders = JSON.parse(ordersData).orders || []
    const customers = JSON.parse(customersData).customers || []

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    // 🔥 统一的业绩计算规则
    const isValidForOrderPerformance = (order: any): boolean => {
      const excludedStatuses = [
        'pending_cancel', 'cancelled', 'audit_rejected',
        'logistics_returned', 'logistics_cancelled', 'refunded'
      ]
      // 待流转状态只有正常发货单才计入业绩
      if (order.status === 'pending_transfer') {
        return order.markType === 'normal'
      }
      return !excludedStatuses.includes(order.status)
    }

    // 根据权限过滤订单
    let allOrders = orders
    if (params?.userId && params?.userRole !== 'super_admin') {
      allOrders = allOrders.filter((order: any) => order.salesPersonId === params.userId)
    }

    // 🔥 使用新的业绩计算规则过滤有效订单
    const validOrders = allOrders.filter(isValidForOrderPerformance)

    // 计算今日订单
    const todayValidOrders = validOrders.filter((order: any) =>
      order.createTime?.startsWith(today)
    )
    const todayOrders = todayValidOrders.length

    // 计算今日业绩
    const todayRevenue = todayValidOrders.reduce((sum: number, order: any) =>
      sum + (order.totalAmount || 0), 0)

    // 计算本月订单
    const monthlyValidOrders = validOrders.filter((order: any) =>
      order.createTime >= monthStart
    )
    const monthlyOrders = monthlyValidOrders.length

    // 计算本月业绩
    const monthlyRevenue = monthlyValidOrders.reduce((sum: number, order: any) =>
      sum + (order.totalAmount || 0), 0)

    // 计算新增客户（今日）
    const newCustomers = customers.filter((customer: any) =>
      customer.createTime?.startsWith(today)
    ).length

    console.log('[数据看板API] 今日订单:', todayOrders, '今日业绩:', todayRevenue)
    console.log('[数据看板API] 本月订单:', monthlyOrders, '本月业绩:', monthlyRevenue)
    console.log('[数据看板API] 新增客户:', newCustomers)

    return {
      todayOrders,
      newCustomers,
      todayRevenue,
      monthlyOrders,
      monthlyRevenue,
      pendingService: 0
    }
  } catch (error) {
    console.error('获取核心指标失败:', error)
    return {
      todayOrders: 0,
      newCustomers: 0,
      todayRevenue: 0,
      monthlyOrders: 0
    }
  }
}

// 获取排行榜数据
export const getRankings = async (): Promise<DashboardRankings> => {
  // 生产环境调用后端 API
  if (useBackendAPI()) {
    try {
      const response = await request.get('/api/dashboard/rankings')
      if (response.data) {
        return response.data
      }
    } catch (error) {
      console.error('后端API调用失败，降级到localStorage:', error)
    }
  }

  // 开发环境或后端API不可用时，从localStorage获取数据
  try {
    // 从localStorage获取真实数据
    const ordersData = localStorage.getItem('order-store')
    // 尝试从多个可能的用户存储键获取数据
    let users: any[] = []
    const userStorageKeys = ['crm_mock_users', 'userDatabase', 'erp_users_list', 'user-store']

    for (const key of userStorageKeys) {
      const usersData = localStorage.getItem(key)
      if (usersData) {
        try {
          const parsed = JSON.parse(usersData)
          users = Array.isArray(parsed) ? parsed : (parsed.users || [])
          if (users.length > 0) {
            console.log(`[业绩排名] 从 ${key} 获取到 ${users.length} 个用户`)
            break
          }
        } catch (_e) {
          console.warn(`[业绩排名] 解析 ${key} 失败`)
        }
      }
    }

    if (!ordersData || users.length === 0) {
      console.warn('[业绩排名] 缺少订单或用户数据')
      return { sales: [], products: [] }
    }

    const orders = JSON.parse(ordersData).orders || []

    // 🔥 统一的业绩计算规则
    const isValidForOrderPerformance = (order: any): boolean => {
      const excludedStatuses = [
        'pending_cancel', 'cancelled', 'audit_rejected',
        'logistics_returned', 'logistics_cancelled', 'refunded'
      ]
      // 待流转状态只有正常发货单才计入业绩
      if (order.status === 'pending_transfer') {
        return order.markType === 'normal'
      }
      return !excludedStatuses.includes(order.status)
    }

    // 🔥 使用新的业绩计算规则过滤有效订单
    const validOrders = orders.filter(isValidForOrderPerformance)

    // 计算本月数据
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthOrders = validOrders.filter((order: any) => order.createTime >= monthStart)

    console.log(`[业绩排名] 本月有效订单数: ${monthOrders.length}`)

    // 统计销售人员业绩
    const salesStats: Record<string, any> = {}
    monthOrders.forEach((order: any) => {
      const salesPersonId = order.salesPersonId || order.createdBy
      if (!salesPersonId) return

      if (!salesStats[salesPersonId]) {
        const user = users.find((u: any) =>
          String(u.id) === String(salesPersonId) ||
          u.username === salesPersonId
        )

        console.log(`[业绩排名] 查找用户 ${salesPersonId}:`, user ? '找到' : '未找到')

        salesStats[salesPersonId] = {
          id: salesPersonId,
          name: user?.realName || user?.name || user?.username || '未知用户',
          avatar: user?.avatar || '',
          department: user?.department || '',
          sales: 0,
          orders: 0,
          growth: 0
        }
      }

      salesStats[salesPersonId].sales += order.totalAmount || 0
      salesStats[salesPersonId].orders += 1
    })

    const salesRankings = Object.values(salesStats)
      .sort((a: any, b: any) => b.sales - a.sales)
      .slice(0, 10)

    console.log('[业绩排名] 最终排名数据:', salesRankings)

    // 统计产品销售
    const productStats: Record<string, any> = {}
    monthOrders.forEach((order: any) => {
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach((product: any) => {
          const productId = product.id || product.productId
          if (!productId) return

          if (!productStats[productId]) {
            productStats[productId] = {
              id: productId,
              name: product.name || '未知产品',
              sales: 0,
              orders: 0,
              revenue: 0
            }
          }

          productStats[productId].sales += product.quantity || 0
          productStats[productId].orders += 1
          productStats[productId].revenue += product.total || (product.price * product.quantity) || 0
        })
      }
    })

    const productRankings = Object.values(productStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      sales: salesRankings,
      products: productRankings
    }
  } catch (error) {
    console.error('获取排行榜数据失败:', error)
    return {
      sales: [],
      products: []
    }
  }
}

// 获取图表数据
export const getChartData = async (params?: {
  userRole?: string,
  userId?: string,
  departmentId?: string,
  period?: 'day' | 'week' | 'month'
}): Promise<DashboardChartData> => {
  // 生产环境调用后端 API
  if (useBackendAPI()) {
    try {
      const response = await request.get('/api/dashboard/charts', { params })
      if (response.data) {
        return {
          revenue: response.data.performance?.series?.[1]?.data?.map((amount: number, index: number) => ({
            date: response.data.performance?.categories?.[index] || `${index + 1}月`,
            amount,
            orders: response.data.performance?.series?.[0]?.data?.[index] || 0
          })) || [],
          orderStatus: response.data.orderStatus?.map((item: any) => ({
            status: item.name,
            count: item.value,
            percentage: 0
          })) || []
        }
      }
    } catch (error) {
      console.error('后端API调用失败，降级到localStorage:', error)
    }
  }

  // 开发环境或后端API不可用时，从localStorage获取数据
  try {
    // 从localStorage获取真实数据
    const ordersData = localStorage.getItem('order-store')

    if (!ordersData) {
      return { revenue: [], orderStatus: [] }
    }

    const orders = JSON.parse(ordersData).orders || []

    // 🔥 统一的业绩计算规则
    const isValidForOrderPerformance = (order: any): boolean => {
      const excludedStatuses = [
        'pending_cancel', 'cancelled', 'audit_rejected',
        'logistics_returned', 'logistics_cancelled', 'refunded'
      ]
      // 待流转状态只有正常发货单才计入业绩
      if (order.status === 'pending_transfer') {
        return order.markType === 'normal'
      }
      return !excludedStatuses.includes(order.status)
    }

    // 根据权限过滤订单
    let allOrders = orders
    if (params?.userId && params?.userRole !== 'super_admin') {
      allOrders = allOrders.filter((order: any) => order.salesPersonId === params.userId)
    }

    // 🔥 使用新的业绩计算规则过滤有效订单
    const filteredOrders = allOrders.filter(isValidForOrderPerformance)

    const now = new Date()
    const period = params?.period || 'month'

    // 生成业绩趋势数据
    const revenueData: Array<{ date: string; amount: number; orders: number }> = []

    if (period === 'day') {
      // 最近7天
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const dayOrders = filteredOrders.filter((order: any) =>
          order.createTime?.startsWith(dateStr)
        )
        revenueData.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          amount: dayOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0),
          orders: dayOrders.length
        })
      }
    } else if (period === 'week') {
      // 最近8周
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        const weekOrders = filteredOrders.filter((order: any) => {
          const orderDate = new Date(order.createTime)
          return orderDate >= weekStart && orderDate < weekEnd
        })
        const weekNum = Math.ceil((weekStart.getDate() - weekStart.getDay()) / 7)
        revenueData.push({
          date: `第${weekNum}周`,
          amount: weekOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0),
          orders: weekOrders.length
        })
      }
    } else {
      // 最近6个月
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthOrders = filteredOrders.filter((order: any) =>
          order.createTime?.startsWith(monthKey)
        )
        revenueData.push({
          date: `${date.getMonth() + 1}月`,
          amount: monthOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0),
          orders: monthOrders.length
        })
      }
    }

    // 统计订单状态分布（这里统计所有订单，不过滤）
    const statusMap: Record<string, { name: string; count: number }> = {
      pending_transfer: { name: '待流转', count: 0 },
      pending_audit: { name: '待审核', count: 0 },
      audit_rejected: { name: '审核拒绝', count: 0 },
      pending_shipment: { name: '待发货', count: 0 },
      shipped: { name: '已发货', count: 0 },
      delivered: { name: '已签收', count: 0 },
      logistics_returned: { name: '物流部退回', count: 0 },
      logistics_cancelled: { name: '物流部取消', count: 0 },
      package_exception: { name: '包裹异常', count: 0 },
      rejected: { name: '拒收', count: 0 },
      rejected_returned: { name: '拒收已退回', count: 0 },
      after_sales_created: { name: '已建售后', count: 0 },
      pending_cancel: { name: '待取消', count: 0 },
      cancel_failed: { name: '取消失败', count: 0 },
      cancelled: { name: '已取消', count: 0 },
      draft: { name: '草稿', count: 0 }
    }

    allOrders.forEach((order: any) => {
      const status = order.status
      if (statusMap[status]) {
        statusMap[status].count += 1
      }
    })

    const orderStatusData = Object.entries(statusMap)
      .filter(([_, data]) => data.count > 0)
      .map(([_status, data]) => ({
        status: data.name,
        count: data.count,
        percentage: filteredOrders.length > 0 ? (data.count / filteredOrders.length) * 100 : 0
      }))

    return {
      revenue: revenueData,
      orderStatus: orderStatusData
    }
  } catch (error) {
    console.error('获取图表数据失败:', error)
    return {
      revenue: [],
      orderStatus: []
    }
  }
}

// 获取待办事项
export const getTodos = async (): Promise<DashboardTodo[]> => {
  try {
    return await request.get('/api/dashboard/todos')
  } catch (error) {
    console.error('获取待办事项失败:', error)
    return []
  }
}

// 获取快捷操作
export const getQuickActions = async (): Promise<DashboardQuickAction[]> => {
  try {
    return await request.get('/api/dashboard/quick-actions')
  } catch (error) {
    console.error('获取快捷操作失败:', error)
    return []
  }
}

// 整合的dashboard API对象，保持向后兼容
export const dashboardApi = {
  getMetrics,
  getRankings,
  getChartData,
  getTodos,
  getQuickActions
}
