import { request } from '@/utils/request'

// 核心指标数据接口
export interface DashboardMetrics {
  todayOrders: number
  newCustomers: number
  todayRevenue: number
  monthlyOrders: number
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

// 获取核心指标
export const getMetrics = async (params?: { 
  userRole?: string, 
  userId?: string, 
  departmentId?: string 
}): Promise<DashboardMetrics> => {
  try {
    return await request.get('/api/dashboard/metrics', { params })
  } catch (error) {
    console.error('获取核心指标失败:', error)
    // 返回默认值，避免页面崩溃
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
  try {
    return await request.get('/api/dashboard/rankings')
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
  try {
    return await request.get('/api/dashboard/charts', { params })
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