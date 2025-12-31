/**
 * 业绩统计相关API
 * 支持开发环境（localStorage）和生产环境（真实API）自动切换
 */

import { request } from '@/utils/request'
import { isProduction } from '@/utils/env'

// 个人业绩数据接口
export interface PersonalPerformance {
  userId: string
  userName: string
  todayOrders: number
  todayRevenue: number
  weekOrders: number
  weekRevenue: number
  monthOrders: number
  monthRevenue: number
  yearOrders: number
  yearRevenue: number
  avgOrderAmount: number
  totalCustomers: number
  newCustomers: number
}

// 团队业绩数据接口
export interface TeamPerformance {
  departmentId: string
  departmentName: string
  members: Array<{
    userId: string
    userName: string
    orders: number
    revenue: number
    customers: number
    avgOrderAmount: number
  }>
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
}

// 业绩分析数据接口
export interface PerformanceAnalysis {
  period: 'day' | 'week' | 'month' | 'year'
  data: Array<{
    date: string
    orders: number
    revenue: number
    customers: number
  }>
  summary: {
    totalOrders: number
    totalRevenue: number
    totalCustomers: number
    avgOrderAmount: number
    growth: number
  }
}

/**
 * 获取个人业绩统计数据（使用后端API）
 */
export const getPersonalStats = async (params?: {
  userId?: string
  startDate?: string
  endDate?: string
}): Promise<{
  success: boolean
  data: {
    userId: string
    orderCount: number
    orderAmount: number
    signCount: number
    signAmount: number
    signRate: number
    shipCount: number
    shipAmount: number
    shipRate: number
    rejectCount: number
    rejectAmount: number
    rejectRate: number
    returnCount: number
    returnAmount: number
    returnRate: number
    newCustomers: number
  }
}> => {
  console.log('[Performance API] 获取个人业绩统计')
  try {
    const response = await request.get('/performance/personal', { params })
    return response
  } catch (error) {
    console.error('[Performance API] 获取个人业绩统计失败:', error)
    return {
      success: false,
      data: {
        userId: params?.userId || '',
        orderCount: 0,
        orderAmount: 0,
        signCount: 0,
        signAmount: 0,
        signRate: 0,
        shipCount: 0,
        shipAmount: 0,
        shipRate: 0,
        rejectCount: 0,
        rejectAmount: 0,
        rejectRate: 0,
        returnCount: 0,
        returnAmount: 0,
        returnRate: 0,
        newCustomers: 0
      }
    }
  }
}

/**
 * 获取团队业绩统计数据（使用后端API）
 */
export const getTeamStats = async (params?: {
  departmentId?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  page?: number
  limit?: number
}): Promise<{
  success: boolean
  data: {
    members: Array<{
      id: string
      name: string
      username: string
      department: string
      orderCount: number
      orderAmount: number
      signCount: number
      signAmount: number
      signRate: number
      shipCount: number
      shipAmount: number
      shipRate: number
      transitCount: number
      transitAmount: number
      transitRate: number
      rejectCount: number
      rejectAmount: number
      rejectRate: number
      returnCount: number
      returnAmount: number
      returnRate: number
      isCurrentUser: boolean
    }>
    total: number
    page: number
    limit: number
    summary: {
      totalPerformance: number
      totalOrders: number
      avgPerformance: number
      signOrders: number
      signRate: number
      signPerformance: number
      memberCount: number
    }
  }
}> => {
  console.log('[Performance API] 获取团队业绩统计')
  try {
    // 🔥 request.get 返回的是 response.data.data，即直接的数据对象
    // 需要包装成 { success: true, data: ... } 格式
    const data = await request.get('/performance/team', { params })
    console.log('[Performance API] 后端返回数据:', data)

    // 🔥 如果data存在，说明请求成功
    if (data) {
      return {
        success: true,
        data: {
          members: data.members || [],
          total: data.pagination?.total || data.members?.length || 0,
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || 50,
          summary: {
            totalPerformance: data.summary?.totalOrderAmount || 0,
            totalOrders: data.summary?.totalOrderCount || 0,
            avgPerformance: data.summary?.avgPerformance || 0,
            signOrders: data.summary?.totalSignCount || 0,
            signRate: data.summary?.totalSignRate || 0,
            signPerformance: data.summary?.totalSignAmount || 0,
            memberCount: data.members?.length || 0
          }
        }
      }
    }

    return {
      success: false,
      data: {
        members: [],
        total: 0,
        page: 1,
        limit: 50,
        summary: {
          totalPerformance: 0,
          totalOrders: 0,
          avgPerformance: 0,
          signOrders: 0,
          signRate: 0,
          signPerformance: 0,
          memberCount: 0
        }
      }
    }
  } catch (error) {
    console.error('[Performance API] 获取团队业绩统计失败:', error)
    return {
      success: false,
      data: {
        members: [],
        total: 0,
        page: 1,
        limit: 50,
        summary: {
          totalPerformance: 0,
          totalOrders: 0,
          avgPerformance: 0,
          signOrders: 0,
          signRate: 0,
          signPerformance: 0,
          memberCount: 0
        }
      }
    }
  }
}

/**
 * 获取个人业绩数据（兼容旧接口）
 */
export const getPersonalPerformance = async (params: {
  userId: string
  startDate?: string
  endDate?: string
}): Promise<PersonalPerformance> => {
  // 🔥 优先使用后端API
  console.log('[Performance API] 使用后端API获取个人业绩')
  try {
    // 🔥 request.get 返回的是直接的数据对象，不是包含success的响应
    const data = await request.get('/performance/personal', { params })
    if (data) {
      return {
        userId: data.userId,
        userName: '当前用户',
        todayOrders: data.orderCount || 0,
        todayRevenue: data.orderAmount || 0,
        weekOrders: data.orderCount || 0,
        weekRevenue: data.orderAmount || 0,
        monthOrders: data.orderCount || 0,
        monthRevenue: data.orderAmount || 0,
        yearOrders: data.orderCount || 0,
        yearRevenue: data.orderAmount || 0,
        avgOrderAmount: data.orderCount > 0 ? data.orderAmount / data.orderCount : 0,
        totalCustomers: data.newCustomers || 0,
        newCustomers: data.newCustomers || 0
      }
    }
  } catch (error) {
    console.error('[Performance API] 后端API调用失败:', error)
  }

  return getEmptyPersonalPerformance(params.userId)
}

/**
 * 获取团队业绩数据（兼容旧接口）
 */
export const getTeamPerformance = async (params: {
  departmentId?: string
  startDate?: string
  endDate?: string
}): Promise<TeamPerformance> => {
  // 🔥 优先使用后端API
  console.log('[Performance API] 使用后端API获取团队业绩')
  try {
    // 🔥 request.get 返回的是直接的数据对象，不是包含success的响应
    const data = await request.get('/performance/team', { params })
    if (data) {
      return {
        departmentId: params.departmentId || 'all',
        departmentName: '全部部门',
        members: data.members?.map((m: any) => ({
          userId: m.id,
          userName: m.name,
          orders: m.orderCount,
          revenue: m.orderAmount,
          customers: 0,
          avgOrderAmount: m.orderCount > 0 ? m.orderAmount / m.orderCount : 0
        })) || [],
        totalOrders: data.summary?.totalOrders || 0,
        totalRevenue: data.summary?.totalPerformance || 0,
        totalCustomers: 0
      }
    }
  } catch (error) {
    console.error('[Performance API] 后端API调用失败:', error)
  }

  return getEmptyTeamPerformance()
}

/**
 * 获取业绩分析数据
 */
export const getPerformanceAnalysis = async (params: {
  userId?: string
  departmentId?: string
  period: 'day' | 'week' | 'month' | 'year'
  startDate?: string
  endDate?: string
}): Promise<PerformanceAnalysis> => {
  // 生产环境：强制使用真实API，不降级
  if (isProduction()) {
    console.log('[Performance API] 生产环境：使用后端API获取业绩分析')
    const response = await request.get('/performance/analysis', { params })
    return response.data || response
  }

  // 开发环境：从localStorage获取数据
  console.log('[Performance API] 开发环境：使用localStorage获取业绩分析')
  try {
    const ordersData = localStorage.getItem('crm_store_order')
    const customersData = localStorage.getItem('customer-store')

    if (!ordersData || !customersData) {
      return getEmptyPerformanceAnalysis(params.period)
    }

    const orders = JSON.parse(ordersData).orders || []
    const customers = JSON.parse(customersData).customers || []

    // 过滤订单
    let filteredOrders = orders.filter((order: any) => order.auditStatus === 'approved')
    if (params.userId) {
      filteredOrders = filteredOrders.filter((o: any) => o.salesPersonId === params.userId)
    }

    // 生成时间序列数据
    const data: Array<{ date: string; orders: number; revenue: number; customers: number }> = []
    const now = new Date()

    // 根据period生成不同的时间范围
    const periods: Date[] = []
    if (params.period === 'day') {
      // 最近7天
      for (let i = 6; i >= 0; i--) {
        periods.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
      }
    } else if (params.period === 'week') {
      // 最近8周
      for (let i = 7; i >= 0; i--) {
        periods.push(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000))
      }
    } else if (params.period === 'month') {
      // 最近6个月
      for (let i = 5; i >= 0; i--) {
        periods.push(new Date(now.getFullYear(), now.getMonth() - i, 1))
      }
    } else {
      // 最近3年
      for (let i = 2; i >= 0; i--) {
        periods.push(new Date(now.getFullYear() - i, 0, 1))
      }
    }

    if (periods.length === 0) {
      return getEmptyPerformanceAnalysis(params.period)
    }

    periods.forEach(date => {
      const dateStr = date.toISOString().split('T')[0]
      const periodOrders = filteredOrders.filter((o: any) => {
        if (params.period === 'day') {
          return o.createTime?.startsWith(dateStr)
        } else if (params.period === 'week') {
          const weekEnd = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
          return o.createTime >= dateStr && o.createTime < weekEnd.toISOString().split('T')[0]
        } else if (params.period === 'month') {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          return o.createTime?.startsWith(monthKey)
        } else {
          const yearKey = `${date.getFullYear()}`
          return o.createTime?.startsWith(yearKey)
        }
      })

      const revenue = periodOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
      const periodCustomers = customers.filter((c: any) => {
        if (params.period === 'day') {
          return c.createTime?.startsWith(dateStr)
        } else if (params.period === 'month') {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          return c.createTime?.startsWith(monthKey)
        }
        return false
      })

      data.push({
        date: formatDate(date, params.period),
        orders: periodOrders.length,
        revenue,
        customers: periodCustomers.length
      })
    })

    const totalOrders = filteredOrders.length
    const totalRevenue = filteredOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
    const totalCustomers = customers.length

    return {
      period: params.period,
      data,
      summary: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        avgOrderAmount: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        growth: 0 // 增长率需要对比历史数据计算
      }
    }
  } catch (error) {
    console.error('[Performance API] 获取业绩分析失败:', error)
    return getEmptyPerformanceAnalysis(params.period)
  }
}

// 辅助函数
function getEmptyPersonalPerformance(userId: string): PersonalPerformance {
  return {
    userId,
    userName: '当前用户',
    todayOrders: 0,
    todayRevenue: 0,
    weekOrders: 0,
    weekRevenue: 0,
    monthOrders: 0,
    monthRevenue: 0,
    yearOrders: 0,
    yearRevenue: 0,
    avgOrderAmount: 0,
    totalCustomers: 0,
    newCustomers: 0
  }
}

function getEmptyTeamPerformance(): TeamPerformance {
  return {
    departmentId: 'all',
    departmentName: '全部部门',
    members: [],
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0
  }
}

function getEmptyPerformanceAnalysis(period: 'day' | 'week' | 'month' | 'year'): PerformanceAnalysis {
  return {
    period,
    data: [],
    summary: {
      totalOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      avgOrderAmount: 0,
      growth: 0
    }
  }
}

function formatDate(date: Date, period: 'day' | 'week' | 'month' | 'year'): string {
  if (period === 'day') {
    return `${date.getMonth() + 1}/${date.getDate()}`
  } else if (period === 'week') {
    return `第${Math.ceil(date.getDate() / 7)}周`
  } else if (period === 'month') {
    return `${date.getMonth() + 1}月`
  } else {
    return `${date.getFullYear()}年`
  }
}


// ==================== 业绩分享相关API ====================

// 业绩分享数据接口
export interface PerformanceShareMember {
  userId: string
  userName: string
  department?: string
  percentage: number
  shareAmount: number
  status: 'pending' | 'confirmed' | 'rejected'
  confirmTime?: string
}

export interface PerformanceShare {
  id: string
  shareNumber: string
  orderId: string
  orderNumber: string
  orderAmount: number
  shareMembers: PerformanceShareMember[]
  status: 'active' | 'completed' | 'cancelled'
  description?: string
  createdBy: string
  createdById: string
  createTime: string
}

export interface PerformanceShareCreateParams {
  orderId: string
  orderNumber: string
  orderAmount: number
  shareMembers: Array<{
    userId: string
    userName: string
    department?: string
    percentage: number
  }>
  description?: string
}

export interface PerformanceShareListParams {
  page?: number
  limit?: number
  status?: string
  userId?: string
  orderId?: string
}

export interface PerformanceShareListResponse {
  success: boolean
  data: {
    shares: PerformanceShare[]
    total: number
    page: number
    limit: number
  }
}

/**
 * 获取业绩分享列表
 */
export const getPerformanceShares = async (params?: PerformanceShareListParams): Promise<PerformanceShareListResponse> => {
  // 生产环境：强制使用真实API
  // 🔥 统一使用后端API获取业绩分享列表
  console.log('[Performance API] 获取业绩分享列表')
  try {
    const response = await request.get('/performance/shares', { params })
    return response
  } catch (error) {
    console.error('[Performance API] 获取业绩分享列表失败:', error)
    // 返回空数据
    return {
      success: true,
      data: {
        shares: [],
        total: 0,
        page: params?.page || 1,
        limit: params?.limit || 10
      }
    }
  }
}

/**
 * 获取单个业绩分享详情
 */
export const getPerformanceShareDetail = async (shareId: string): Promise<{ success: boolean; data: PerformanceShare }> => {
  console.log('[Performance API] 获取业绩分享详情:', shareId)
  const response = await request.get(`/performance/shares/${shareId}`)
  return response
}

/**
 * 创建业绩分享
 */
export const createPerformanceShare = async (data: PerformanceShareCreateParams): Promise<{ success: boolean; data: { id: string; shareNumber: string }; message?: string }> => {
  console.log('[Performance API] 创建业绩分享:', data)
  const response = await request.post('/performance/shares', data)
  return response
}

/**
 * 取消业绩分享
 */
export const cancelPerformanceShare = async (shareId: string): Promise<{ success: boolean; message?: string }> => {
  console.log('[Performance API] 取消业绩分享:', shareId)
  const response = await request.delete(`/performance/shares/${shareId}`)
  return response
}

/**
 * 确认业绩分享
 */
export const confirmPerformanceShare = async (shareId: string): Promise<{ success: boolean; message?: string }> => {
  console.log('[Performance API] 确认业绩分享:', shareId)
  const response = await request.post(`/performance/shares/${shareId}/confirm`)
  return response
}

/**
 * 获取业绩分享统计数据
 */
export const getPerformanceStats = async (): Promise<{
  success: boolean
  data: {
    totalShares: number
    totalAmount: number
    pendingShares: number
    completedShares: number
    userStats: {
      totalShares: number
      totalAmount: number
    }
  }
}> => {
  console.log('[Performance API] 获取业绩分享统计')
  try {
    const response = await request.get('/performance/stats')
    return response
  } catch (error) {
    console.error('[Performance API] 获取业绩分享统计失败:', error)
    return {
      success: true,
      data: {
        totalShares: 0,
        totalAmount: 0,
        pendingShares: 0,
        completedShares: 0,
        userStats: {
          totalShares: 0,
          totalAmount: 0
        }
      }
    }
  }
}


// ==================== 业绩分析相关API ====================

/**
 * 获取个人业绩分析数据
 */
export const getPersonalAnalysis = async (params?: {
  userId?: string
  startDate?: string
  endDate?: string
}): Promise<{ success: boolean; data: any; message?: string }> => {
  console.log('[Performance API] 获取个人业绩分析')
  try {
    // 🔥 request.get 返回的是直接的数据对象
    const data = await request.get('/performance/analysis/personal', { params })
    return { success: true, data }
  } catch (error) {
    console.error('[Performance API] 获取个人业绩分析失败:', error)
    return { success: false, data: null, message: '获取个人业绩分析失败' }
  }
}

/**
 * 获取部门业绩分析数据
 */
export const getDepartmentAnalysis = async (params?: {
  departmentId?: string
  startDate?: string
  endDate?: string
}): Promise<{ success: boolean; data: any; message?: string }> => {
  console.log('[Performance API] 获取部门业绩分析')
  try {
    // 🔥 request.get 返回的是直接的数据对象
    const data = await request.get('/performance/analysis/department', { params })
    return { success: true, data }
  } catch (error) {
    console.error('[Performance API] 获取部门业绩分析失败:', error)
    return { success: false, data: null, message: '获取部门业绩分析失败' }
  }
}

/**
 * 获取公司业绩分析数据
 */
export const getCompanyAnalysis = async (params?: {
  startDate?: string
  endDate?: string
}): Promise<{ success: boolean; data: any; message?: string }> => {
  console.log('[Performance API] 获取公司业绩分析')
  try {
    // 🔥 request.get 返回的是直接的数据对象
    const data = await request.get('/performance/analysis/company', { params })
    return { success: true, data }
  } catch (error) {
    console.error('[Performance API] 获取公司业绩分析失败:', error)
    return { success: false, data: null, message: '获取公司业绩分析失败' }
  }
}

/**
 * 获取业绩统计指标
 */
export const getAnalysisMetrics = async (params?: {
  type?: 'personal' | 'department' | 'company'
  departmentId?: string
  startDate?: string
  endDate?: string
}): Promise<{ success: boolean; data: any; message?: string }> => {
  console.log('[Performance API] 获取业绩统计指标')
  try {
    // 🔥 request.get 返回的是直接的数据对象
    const data = await request.get('/performance/analysis/metrics', { params })
    return { success: true, data }
  } catch (error) {
    console.error('[Performance API] 获取业绩统计指标失败:', error)
    return { success: false, data: null, message: '获取业绩统计指标失败' }
  }
}

/**
 * 获取业绩趋势数据
 */
export const getAnalysisTrend = async (params?: {
  period?: '7d' | '30d'
}): Promise<{ success: boolean; data: any; message?: string }> => {
  console.log('[Performance API] 获取业绩趋势')
  try {
    // 🔥 request.get 返回的是直接的数据对象
    const data = await request.get('/performance/analysis/trend', { params })
    return { success: true, data }
  } catch (error) {
    console.error('[Performance API] 获取业绩趋势失败:', error)
    return { success: false, data: null, message: '获取业绩趋势失败' }
  }
}

/**
 * 导出业绩分享数据
 */
export const exportPerformanceShares = async (params: {
  startDate?: string
  endDate?: string
  status?: string
  format?: 'csv' | 'excel'
}): Promise<Blob | { success: boolean; data: any }> => {
  console.log('[Performance API] 导出业绩分享数据:', params)
  try {
    // 🔥 request.get 返回的是直接的数据对象
    const data = await request.get('/performance/shares/export', {
      params,
      responseType: params.format === 'csv' ? 'blob' : 'json'
    })
    return data
  } catch (error) {
    console.error('[Performance API] 导出业绩分享数据失败:', error)
    // 返回模拟数据用于导出
    return { success: false, data: [] }
  }
}
