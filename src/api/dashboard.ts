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
    deliveredAmount?: number  // 🔥 签收业绩金额（旧字段，保留兼容）
    orders?: number
    orderCount?: number  // 🔥 下单单数
    deliveredCount?: number  // 🔥 签收单数
  }>
  signRevenue?: Array<{  // 🔥 新增：签收业绩数据
    date: string
    amount: number
  }>
  orderStatus: Array<{
    status: string
    count: number
    amount?: number  // 🔥 金额
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

// 获取核心指标（使用后端API）
export const getMetrics = async (params?: {
  userRole?: string,
  userId?: string,
  departmentId?: string
}): Promise<DashboardMetrics & {
  pendingAudit?: number
  pendingShipment?: number
  monthlyRevenue?: number
  monthlyDeliveredCount?: number
  monthlyDeliveredAmount?: number
  // 🔥 添加环比字段
  todayOrdersChange?: number
  todayOrdersTrend?: string
  todayRevenueChange?: number
  todayRevenueTrend?: string
  monthlyOrdersChange?: number
  monthlyOrdersTrend?: string
  monthlyRevenueChange?: number
  monthlyRevenueTrend?: string
  newCustomersChange?: number
  newCustomersTrend?: string
  pendingServiceChange?: number
  pendingServiceTrend?: string
  pendingAuditChange?: number
  pendingAuditTrend?: string
  pendingShipmentChange?: number
  pendingShipmentTrend?: string
  monthlyDeliveredCountChange?: number
  monthlyDeliveredCountTrend?: string
  monthlyDeliveredAmountChange?: number
  monthlyDeliveredAmountTrend?: string
}> => {
  console.log('[Dashboard API] 使用后端API获取核心指标')
  try {
    const data = await request.get('/dashboard/metrics', { params, showError: false } as any)
    if (data) {
      console.log('[Dashboard API] 后端返回数据:', data)
      // 🔥 修复：返回完整的数据，包括所有环比字段
      return {
        todayOrders: data.todayOrders || 0,
        todayOrdersChange: data.todayOrdersChange,
        todayOrdersTrend: data.todayOrdersTrend,

        newCustomers: data.newCustomers || 0,
        newCustomersChange: data.newCustomersChange,
        newCustomersTrend: data.newCustomersTrend,

        todayRevenue: data.todayRevenue || 0,
        todayRevenueChange: data.todayRevenueChange,
        todayRevenueTrend: data.todayRevenueTrend,

        monthlyOrders: data.monthlyOrders || 0,
        monthlyOrdersChange: data.monthlyOrdersChange,
        monthlyOrdersTrend: data.monthlyOrdersTrend,

        monthlyRevenue: data.monthlyRevenue || 0,
        monthlyRevenueChange: data.monthlyRevenueChange,
        monthlyRevenueTrend: data.monthlyRevenueTrend,

        pendingService: data.pendingService || 0,
        pendingServiceChange: data.pendingServiceChange,
        pendingServiceTrend: data.pendingServiceTrend,

        pendingAudit: data.pendingAudit || 0,
        pendingAuditChange: data.pendingAuditChange,
        pendingAuditTrend: data.pendingAuditTrend,

        pendingShipment: data.pendingShipment || 0,
        pendingShipmentChange: data.pendingShipmentChange,
        pendingShipmentTrend: data.pendingShipmentTrend,

        monthlyDeliveredCount: data.monthlyDeliveredCount || 0,
        monthlyDeliveredCountChange: data.monthlyDeliveredCountChange,
        monthlyDeliveredCountTrend: data.monthlyDeliveredCountTrend,

        monthlyDeliveredAmount: data.monthlyDeliveredAmount || 0,
        monthlyDeliveredAmountChange: data.monthlyDeliveredAmountChange,
        monthlyDeliveredAmountTrend: data.monthlyDeliveredAmountTrend
      }
    }
  } catch (error) {
    // 🔥 静默处理，只在控制台记录
    console.log('[Dashboard API] 后端API调用失败（静默处理）:', error)
  }

  // 返回空数据
  return {
    todayOrders: 0,
    newCustomers: 0,
    todayRevenue: 0,
    monthlyOrders: 0,
    monthlyRevenue: 0,
    pendingService: 0
  }
}

// 获取排行榜数据
export const getRankings = async (): Promise<DashboardRankings> => {
  // 生产环境调用后端 API
  if (useBackendAPI()) {
    try {
      // 🔥 静默处理错误，修复API路径
      const data = await request.get('/dashboard/rankings', { showError: false } as any)
      if (data) {
        return data
      }
    } catch (error) {
      console.log('[Dashboard API] 排行榜API调用失败（静默处理）:', error)
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
  // 🔥 开发环境和生产环境都从后端API加载数据
  try {
    console.log('[Dashboard API] 调用后端API获取图表数据, period:', params?.period)
    const data = await request.get('/dashboard/charts', { params, showError: false } as any)
    console.log('[Dashboard API] 后端返回图表数据:', data)
    if (data) {
      return {
        revenue: data.performance?.series?.[0]?.data?.map((amount: number, index: number) => ({
          date: data.performance?.categories?.[index] || `${index + 1}月`,
          amount,  // 🔥 下单业绩金额
          deliveredAmount: data.performance?.series?.[1]?.data?.[index] || 0,  // 🔥 签收业绩金额
          orderCount: data.performance?.series?.[0]?.counts?.[index] || 0,  // 🔥 下单单数
          deliveredCount: data.performance?.series?.[1]?.counts?.[index] || 0  // 🔥 签收单数
        })) || [],
        orderStatus: data.orderStatus?.map((item: any) => ({
          status: item.name,
          count: item.value,
          amount: item.amount || 0,  // 🔥 添加金额字段
          percentage: 0
        })) || []
      }
    }
  } catch (error) {
    console.log('[Dashboard API] 图表API调用失败，尝试降级方案:', error)
  }

  // 后端API不可用时，从localStorage获取数据作为降级方案
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
    // 🔥 静默处理错误，修复API路径
    return await request.get('/dashboard/todos', { showError: false } as any)
  } catch (error) {
    console.log('[Dashboard API] 待办事项API调用失败（静默处理）:', error)
    return []
  }
}

// 获取快捷操作
export const getQuickActions = async (): Promise<DashboardQuickAction[]> => {
  try {
    // 🔥 静默处理错误，修复API路径
    return await request.get('/dashboard/quick-actions', { showError: false } as any)
  } catch (error) {
    console.log('[Dashboard API] 快捷操作API调用失败（静默处理）:', error)
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
