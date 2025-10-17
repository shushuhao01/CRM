import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useOrderStore } from './order'
import { useCustomerStore } from './customer'
import { useUserStore } from './user'
import { useNotificationStore, MessageType } from './notification'
import { createPersistentStore } from '@/utils/storage'
import * as performanceApi from '@/api/performance'

export interface PerformanceData {
  totalSales: number
  salesTrend: number
  totalOrders: number
  ordersTrend: number
  newCustomers: number
  customersTrend: number
  conversionRate: number
  conversionTrend: number
}

export interface TeamMember {
  id: string
  name: string
  position: string
  avatar?: string
  salesAmount: number
  orderCount: number
  customerCount: number
  targetCompletion: number
  performance: 'excellent' | 'good' | 'normal' | 'poor'
  commission: number
}

export interface TeamData {
  totalSales: number
  salesTrend: number
  memberCount: number
  activeMemberCount: number
  totalOrders: number
  ordersTrend: number
  avgPerformance: number
  avgTrend: number
}

export interface ProductPerformance {
  id: string
  name: string
  salesAmount: number
  orderCount: number
  trend: number
}

export interface ShareMember {
  userId: string
  userName: string
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
  shareMembers: ShareMember[]
  status: 'active' | 'completed' | 'cancelled'
  createTime: string
  createdBy: string
  createdById: string
  description?: string
  completedTime?: string
}

export interface ShareStats {
  totalShares: number
  totalAmount: number
  involvedMembers: number
  sharedOrders: number
  pendingShares: number
  completedShares: number
}

export const usePerformanceStore = createPersistentStore('performance', () => {
  // 依赖的其他store
  const orderStore = useOrderStore()
  const customerStore = useCustomerStore()
  const userStore = useUserStore()

  // 日期范围
  const dateRange = ref<[string, string] | null>(null)

  // 团队成员数据
  const teamMembers = ref<TeamMember[]>([
    {
      id: 'sales1',
      name: '小明',
      position: '高级销售',
      avatar: '',
      salesAmount: 108500,
      orderCount: 35,
      customerCount: 28,
      targetCompletion: 125,
      performance: 'excellent',
      commission: 10850
    },
    {
      id: 'sales2',
      name: '张三',
      position: '销售经理',
      avatar: '',
      salesAmount: 92300,
      orderCount: 32,
      customerCount: 25,
      targetCompletion: 118,
      performance: 'excellent',
      commission: 9230
    },
    {
      id: 'sales3',
      name: '李四',
      position: '销售专员',
      avatar: '',
      salesAmount: 85600,
      orderCount: 30,
      customerCount: 22,
      targetCompletion: 95,
      performance: 'good',
      commission: 8560
    }
  ])

  // 产品业绩数据
  const productPerformance = ref<ProductPerformance[]>([
    {
      id: '1',
      name: '产品A',
      salesAmount: 35200,
      orderCount: 28,
      trend: 12.5
    },
    {
      id: '2',
      name: '产品B',
      salesAmount: 28900,
      orderCount: 22,
      trend: 8.3
    },
    {
      id: '3',
      name: '产品C',
      salesAmount: 22300,
      orderCount: 18,
      trend: -2.1
    }
  ])

  // 业绩分享数据
  const performanceShares = ref<PerformanceShare[]>([])
  
  // 分享统计数据
  const shareStats = computed((): ShareStats => {
    const shares = performanceShares.value
    const totalShares = shares.length
    const totalAmount = shares.reduce((sum, share) => sum + share.orderAmount, 0)
    const involvedMembers = new Set(shares.flatMap(share => share.shareMembers.map(member => member.userId))).size
    const sharedOrders = shares.length
    const pendingShares = shares.filter(share => share.status === 'active').length
    const completedShares = shares.filter(share => share.status === 'completed').length

    return {
      totalShares,
      totalAmount,
      involvedMembers,
      sharedOrders,
      pendingShares,
      completedShares
    }
  })

  // 计算属性 - 个人业绩数据
  const personalPerformance = computed((): PerformanceData => {
    const currentUserId = userStore.currentUser?.id
    if (!currentUserId) {
      return {
        totalSales: 0,
        salesTrend: 0,
        totalOrders: 0,
        ordersTrend: 0,
        newCustomers: 0,
        customersTrend: 0,
        conversionRate: 0,
        conversionTrend: 0
      }
    }

    // 获取当前用户的订单
    const userOrders = orderStore.orders.filter(order => 
      order.salesPersonId === currentUserId && 
      order.auditStatus === 'approved'
    )

    // 获取当前用户的客户
    const userCustomers = customerStore.customers.filter(customer => 
      customer.salesPersonId === currentUserId
    )

    const totalSales = userOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const totalOrders = userOrders.length
    const newCustomers = userCustomers.length
    const conversionRate = totalOrders > 0 ? (totalOrders / newCustomers) * 100 : 0

    return {
      totalSales,
      salesTrend: 12.5, // 模拟趋势数据
      totalOrders,
      ordersTrend: 8.3,
      newCustomers,
      customersTrend: -2.1,
      conversionRate,
      conversionTrend: 5.2
    }
  })

  // 计算属性 - 团队业绩数据
  const teamPerformance = computed((): TeamData => {
    const totalSales = teamMembers.value.reduce((sum, member) => sum + member.salesAmount, 0)
    const totalOrders = teamMembers.value.reduce((sum, member) => sum + member.orderCount, 0)
    const memberCount = teamMembers.value.length
    const activeMemberCount = teamMembers.value.filter(member => member.orderCount > 0).length
    const avgPerformance = memberCount > 0 ? totalSales / memberCount : 0

    return {
      totalSales,
      salesTrend: 15.8,
      memberCount,
      activeMemberCount,
      totalOrders,
      ordersTrend: 12.3,
      avgPerformance,
      avgTrend: 8.7
    }
  })

  // 计算属性 - 排行榜数据
  const salesRanking = computed(() => {
    return [...teamMembers.value]
      .sort((a, b) => b.salesAmount - a.salesAmount)
      .map((member, index) => ({
        ...member,
        rank: index + 1
      }))
  })

  // 方法 - 更新日期范围
  const updateDateRange = (range: [string, string] | null) => {
    dateRange.value = range
    // 这里可以触发数据重新计算
  }

  // 方法 - 获取指定用户的业绩数据
  const getUserPerformance = (userId: string): PerformanceData => {
    const userOrders = orderStore.orders.filter(order => 
      order.salesPersonId === userId && 
      order.auditStatus === 'approved'
    )

    const userCustomers = customerStore.customers.filter(customer => 
      customer.salesPersonId === userId
    )

    const totalSales = userOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const totalOrders = userOrders.length
    const newCustomers = userCustomers.length
    const conversionRate = totalOrders > 0 ? (totalOrders / newCustomers) * 100 : 0

    return {
      totalSales,
      salesTrend: 12.5,
      totalOrders,
      ordersTrend: 8.3,
      newCustomers,
      customersTrend: -2.1,
      conversionRate,
      conversionTrend: 5.2
    }
  }

  // 方法 - 更新团队成员数据
  const updateTeamMember = (memberId: string, updates: Partial<TeamMember>) => {
    const index = teamMembers.value.findIndex(member => member.id === memberId)
    if (index !== -1) {
      teamMembers.value[index] = { ...teamMembers.value[index], ...updates }
    }
  }

  // 方法 - 添加团队成员
  const addTeamMember = (member: TeamMember) => {
    teamMembers.value.push(member)
  }

  // 方法 - 删除团队成员
  const removeTeamMember = (memberId: string) => {
    const index = teamMembers.value.findIndex(member => member.id === memberId)
    if (index !== -1) {
      teamMembers.value.splice(index, 1)
    }
  }

  // 方法 - 获取产品业绩排行
  const getProductRanking = () => {
    return [...productPerformance.value]
      .sort((a, b) => b.salesAmount - a.salesAmount)
  }

  // 方法 - 刷新业绩数据
  const refreshPerformanceData = async () => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 这里可以从API获取最新的业绩数据
    console.log('业绩数据已刷新')
  }

  // 方法 - 创建业绩分享
  const createPerformanceShare = async (shareData: Omit<PerformanceShare, 'id' | 'shareNumber' | 'createTime' | 'status'>) => {
    try {
      const notificationStore = useNotificationStore()
      
      // 调用后端API创建分享
      const response = await performanceApi.createPerformanceShare({
        orderId: shareData.orderId,
        orderNumber: shareData.orderNumber,
        orderAmount: shareData.orderAmount,
        shareMembers: shareData.shareMembers.map(member => ({
          userId: member.userId,
          userName: member.userName,
          percentage: member.percentage
        })),
        description: shareData.description
      })
      
      if (response.data.success) {
        const newShare = response.data.data
        
        // 添加到本地存储
        performanceShares.value.unshift(newShare)
        
        // 更新相关成员的业绩数据
        await updateMembersPerformance(newShare)
        
        // 发送通知给分享对象
        newShare.shareMembers.forEach((member: ShareMember) => {
          if (member.userId !== userStore.currentUser?.id) {
            notificationStore.sendMessage(
              MessageType.PERFORMANCE_SHARE_RECEIVED,
              `${userStore.currentUser?.name} 与您分享了订单 ${newShare.orderNumber} 的业绩，您的分成比例为 ${member.percentage}%，金额为 ¥${member.shareAmount.toFixed(2)}`,
              {
                relatedId: newShare.id,
                relatedType: 'performance_share',
                actionUrl: `/performance/share?id=${newShare.id}`
              }
            )
          }
        })
        
        // 发送创建通知给创建者
        notificationStore.sendMessage(
          MessageType.PERFORMANCE_SHARE_CREATED,
          `成功创建业绩分享，订单 ${newShare.orderNumber}，共分享给 ${newShare.shareMembers.length} 位成员`,
          {
            relatedId: newShare.id,
            relatedType: 'performance_share',
            actionUrl: `/performance/share?id=${newShare.id}`
          }
        )
        
        return newShare
      } else {
        throw new Error(response.data.message || '创建业绩分享失败')
      }
    } catch (error) {
      console.error('创建业绩分享失败:', error)
      throw error
    }
  }

  // 方法 - 更新业绩分享
  const updatePerformanceShare = async (shareId: string, updates: Partial<PerformanceShare>) => {
    const index = performanceShares.value.findIndex(share => share.id === shareId)
    if (index !== -1) {
      const oldShare = { ...performanceShares.value[index] }
      performanceShares.value[index] = { ...performanceShares.value[index], ...updates }
      
      // 如果分享成员或比例发生变化，重新计算分享金额
      if (updates.shareMembers) {
        performanceShares.value[index].shareMembers = updates.shareMembers.map(member => ({
          ...member,
          shareAmount: (performanceShares.value[index].orderAmount * member.percentage) / 100
        }))
      }
      
      // 更新相关成员的业绩数据
      await updateMembersPerformance(performanceShares.value[index], oldShare)
      
      return performanceShares.value[index]
    }
    return null
  }

  // 方法 - 取消业绩分享
  const cancelPerformanceShare = async (shareId: string) => {
    const notificationStore = useNotificationStore()
    
    const share = performanceShares.value.find(s => s.id === shareId)
    if (share && share.status === 'active') {
      share.status = 'cancelled'
      
      // 恢复原始业绩数据
      await revertMembersPerformance(share)
      
      // 发送取消通知给所有相关成员
      share.shareMembers.forEach(member => {
        if (member.userId !== userStore.currentUser?.id) {
          notificationStore.sendMessage(
            MessageType.PERFORMANCE_SHARE_CANCELLED,
            `${userStore.currentUser?.name} 取消了业绩分享，订单 ${share.orderNumber}`,
            {
              relatedId: shareId,
              relatedType: 'performance_share',
              actionUrl: `/performance/share?id=${shareId}`
            }
          )
        }
      })
      
      return true
    }
    return false
  }

  // 方法 - 确认分享成员
  const confirmShareMember = async (shareId: string, userId: string) => {
    const notificationStore = useNotificationStore()
    
    const share = performanceShares.value.find(s => s.id === shareId)
    if (share) {
      const member = share.shareMembers.find(m => m.userId === userId)
      if (member && member.status === 'pending') {
        member.status = 'confirmed'
        member.confirmTime = new Date().toLocaleString()
        
        // 检查是否所有成员都已确认
        const allConfirmed = share.shareMembers.every(m => m.status === 'confirmed')
        if (allConfirmed) {
          share.status = 'completed'
          share.completedTime = new Date().toLocaleString()
        }
        
        // 发送确认通知给创建者
        notificationStore.sendMessage(
          MessageType.PERFORMANCE_SHARE_CONFIRMED,
          `${member.userName} 已确认业绩分享，订单 ${share.orderNumber}，分成金额 ¥${member.shareAmount.toFixed(2)}`,
          {
            relatedId: shareId,
            relatedType: 'performance_share',
            actionUrl: `/performance/share?id=${shareId}`
          }
        )
        
        return true
      }
    }
    return false
  }

  // 方法 - 拒绝分享成员
  const rejectShareMember = async (shareId: string, userId: string, reason?: string) => {
    const notificationStore = useNotificationStore()
    
    const share = performanceShares.value.find(s => s.id === shareId)
    if (share) {
      const member = share.shareMembers.find(m => m.userId === userId)
      if (member && member.status === 'pending') {
        member.status = 'rejected'
        member.confirmTime = new Date().toLocaleString()
        
        // 发送拒绝通知给创建者
        notificationStore.sendMessage(
          MessageType.PERFORMANCE_SHARE_REJECTED,
          `${member.userName} 拒绝了业绩分享，订单 ${share.orderNumber}${reason ? `，原因：${reason}` : ''}`,
          {
            relatedId: shareId,
            relatedType: 'performance_share',
            actionUrl: `/performance/share?id=${shareId}`
          }
        )
        
        // 如果有成员拒绝，整个分享可能需要重新调整
        return true
      }
    }
    return false
  }

  // 方法 - 获取用户的分享记录
  const getUserShares = (userId: string) => {
    return performanceShares.value.filter(share => 
      share.shareMembers.some(member => member.userId === userId) ||
      share.createdById === userId
    )
  }

  // 方法 - 获取订单的分享记录
  const getOrderShares = (orderId: string) => {
    return performanceShares.value.filter(share => share.orderId === orderId)
  }

  // 辅助方法 - 生成分享编号
  const generateShareNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const sequence = String(performanceShares.value.length + 1).padStart(4, '0')
    return `SH${year}${month}${day}${sequence}`
  }

  // 辅助方法 - 更新成员业绩数据
  const updateMembersPerformance = async (newShare: PerformanceShare, oldShare?: PerformanceShare) => {
    // 如果有旧分享记录，先恢复原始数据
    if (oldShare) {
      await revertMembersPerformance(oldShare)
    }
    
    // 应用新的分享数据
    for (const member of newShare.shareMembers) {
      const teamMember = teamMembers.value.find(tm => tm.id === member.userId)
      if (teamMember) {
        teamMember.salesAmount += member.shareAmount
        teamMember.commission += member.shareAmount * 0.1 // 假设10%的佣金率
      }
    }
  }

  // 辅助方法 - 恢复成员业绩数据
  const revertMembersPerformance = async (share: PerformanceShare) => {
    for (const member of share.shareMembers) {
      const teamMember = teamMembers.value.find(tm => tm.id === member.userId)
      if (teamMember) {
        teamMember.salesAmount -= member.shareAmount
        teamMember.commission -= member.shareAmount * 0.1
      }
    }
  }

  // 应用数据范围控制
  const applyDataScopeControl = (orders: any[]) => {
    const currentUser = userStore.user
    if (!currentUser) return []

    // 超级管理员可以查看所有订单
    if (currentUser.role === 'super_admin') {
      return orders
    }

    // 部门负责人可以查看本部门所有订单
    if (currentUser.role === 'department_head') {
      return orders.filter(order => 
        order.salesPerson?.departmentId === currentUser.departmentId ||
        order.customerService?.departmentId === currentUser.departmentId
      )
    }

    // 销售员只能查看自己的订单
    if (currentUser.role === 'sales') {
      return orders.filter(order => order.salesPersonId === currentUser.id)
    }

    // 客服只能查看自己负责的订单
    if (currentUser.role === 'customer_service') {
      return orders.filter(order => order.customerServiceId === currentUser.id)
    }

    // 其他角色默认只能查看自己相关的订单
    return orders.filter(order => 
      order.salesPersonId === currentUser.id || 
      order.customerServiceId === currentUser.id
    )
  }

  // 实时同步功能 - 刷新所有业绩数据
  const syncPerformanceData = async () => {
    // 重新计算所有团队成员的业绩数据
    const orderStore = useOrderStore()
    const userStore = useUserStore()
    
    // 重置所有成员的业绩数据
    teamMembers.value.forEach(member => {
      member.salesAmount = 0
      member.orderCount = 0
      member.commission = 0
    })
    
    // 重新计算基础业绩（来自订单），应用数据范围控制
    const accessibleOrders = applyDataScopeControl(orderStore.orders)
    accessibleOrders.forEach(order => {
      if (order.status === 'completed' || order.status === 'signed') {
        const member = teamMembers.value.find(tm => tm.id === order.salesPersonId)
        if (member) {
          member.salesAmount += order.totalAmount
          member.orderCount += 1
          member.commission += order.totalAmount * 0.1
        }
      }
    })
    
    // 应用所有有效的业绩分享
    performanceShares.value
      .filter(share => share.status === 'active' || share.status === 'completed')
      .forEach(share => {
        share.shareMembers.forEach(member => {
          if (member.status === 'confirmed') {
            const teamMember = teamMembers.value.find(tm => tm.id === member.userId)
            if (teamMember) {
              teamMember.salesAmount += member.shareAmount
              teamMember.commission += member.shareAmount * 0.1
            }
          }
        })
      })
    
    // 重新计算业绩等级
    teamMembers.value.forEach(member => {
      if (member.targetCompletion >= 120) {
        member.performance = 'excellent'
      } else if (member.targetCompletion >= 100) {
        member.performance = 'good'
      } else if (member.targetCompletion >= 80) {
        member.performance = 'normal'
      } else {
        member.performance = 'poor'
      }
    })
  }

  // 监听业绩分享变化，自动同步数据
  const watchPerformanceShares = () => {
    // 使用Vue的watch监听performanceShares的变化
    watch(
      () => performanceShares.value,
      () => {
        syncPerformanceData()
      },
      { deep: true }
    )
  }

  // 方法 - 加载业绩分享数据
  const loadPerformanceShares = async (params?: {
    page?: number
    limit?: number
    status?: string
    userId?: string
    orderId?: string
  }) => {
    try {
      const response = await performanceApi.getPerformanceShares(params)
      if (response.data.success) {
        performanceShares.value = response.data.data.shares
        return response.data.data
      } else {
        throw new Error(response.data.message || '加载业绩分享数据失败')
      }
    } catch (error) {
      console.error('加载业绩分享数据失败:', error)
      throw error
    }
  }

  // 方法 - 加载分享统计数据
  const loadShareStats = async () => {
    try {
      const response = await performanceApi.getPerformanceStats()
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '加载统计数据失败')
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
      throw error
    }
  }

  // 业绩分析相关方法
  
  // 方法 - 获取个人业绩分析数据
  const getPersonalAnalysisData = async (params?: {
    userId?: string
    startDate?: string
    endDate?: string
  }) => {
    try {
      const response = await performanceApi.getPersonalAnalysis(params)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取个人业绩分析数据失败')
      }
    } catch (error) {
      console.error('获取个人业绩分析数据失败:', error)
      throw error
    }
  }

  // 方法 - 获取部门业绩分析数据
  const getDepartmentAnalysisData = async (params?: {
    departmentId?: string
    startDate?: string
    endDate?: string
  }) => {
    try {
      const response = await performanceApi.getDepartmentAnalysis(params)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取部门业绩分析数据失败')
      }
    } catch (error) {
      console.error('获取部门业绩分析数据失败:', error)
      throw error
    }
  }

  // 方法 - 获取公司业绩分析数据
  const getCompanyAnalysisData = async (params?: {
    startDate?: string
    endDate?: string
  }) => {
    try {
      const response = await performanceApi.getCompanyAnalysis(params)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取公司业绩分析数据失败')
      }
    } catch (error) {
      console.error('获取公司业绩分析数据失败:', error)
      throw error
    }
  }

  // 方法 - 获取业绩分析统计指标
  const getAnalysisMetrics = async (params?: {
    type?: 'personal' | 'department' | 'company'
    userId?: string
    departmentId?: string
    startDate?: string
    endDate?: string
  }) => {
    try {
      const response = await performanceApi.getAnalysisMetrics(params)
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取业绩统计指标失败')
      }
    } catch (error) {
      console.error('获取业绩统计指标失败:', error)
      throw error
    }
  }

  // 初始化时启动监听
  watchPerformanceShares()

  return {
    // 状态
    dateRange,
    teamMembers,
    productPerformance,
    performanceShares,
    
    // 计算属性
    personalPerformance,
    teamPerformance,
    salesRanking,
    shareStats,
    
    // 方法
    updateDateRange,
    getUserPerformance,
    updateTeamMember,
    addTeamMember,
    removeTeamMember,
    getProductRanking,
    refreshPerformanceData,
    syncPerformanceData,
    
    // 分享相关方法
    createPerformanceShare,
    updatePerformanceShare,
    cancelPerformanceShare,
    confirmShareMember,
    rejectShareMember,
    getUserShares,
    loadPerformanceShares,
    loadShareStats,
    getOrderShares,
    
    // 业绩分析相关方法
    getPersonalAnalysisData,
    getDepartmentAnalysisData,
    getCompanyAnalysisData,
    getAnalysisMetrics
  }
})