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
  // 🔥 新增：签收业绩相关字段
  signedAmount?: number
  signedTrend?: number
  signedOrders?: number
  signedOrdersTrend?: number
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
  // 订单关联信息（从后端JOIN orders表获取）
  orderCustomerName?: string
  orderCustomerPhone?: string
  orderProducts?: any[]
  orderCreatedAt?: string
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
  // 懒加载CustomerStore，避免在初始化时重新创建CustomerStore实例
  const getCustomerStore = () => useCustomerStore()
  const userStore = useUserStore()

  // 日期范围
  const dateRange = ref<[string, string] | null>(null)

  // 团队成员数据 - 初始为空，从userStore动态加载
  const teamMembers = ref<TeamMember[]>([])

  // 从userStore加载团队成员
  const loadTeamMembersFromUserStore = async () => {
    try {
      const { useUserStore } = await import('@/stores/user')
      const userStore = useUserStore()

      // 确保用户列表已加载
      if (userStore.users.length === 0) {
        await userStore.loadUsers()
      }

      // 将用户转换为团队成员格式
      teamMembers.value = userStore.users
        .filter((u: any) => ['sales_staff', 'department_manager', 'admin', 'super_admin'].includes(u.role))
        .map((u: any) => ({
          id: u.id,
          name: u.realName || u.name || u.username,
          position: u.position || '销售专员',
          avatar: u.avatar || '',
          salesAmount: 0,
          orderCount: 0,
          customerCount: 0,
          targetCompletion: 0,
          performance: 'good' as const,
          commission: 0
        }))

      console.log('[Performance Store] 从userStore加载团队成员:', teamMembers.value.length)
    } catch (error) {
      console.error('[Performance Store] 加载团队成员失败:', error)
    }
  }

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
    let shares = performanceShares.value

    // 权限控制：根据用户角色过滤数据
    const currentUser = userStore.currentUser
    if (currentUser) {
      // 超级管理员和管理员可以查看所有分享记录
      if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
        // 不做过滤，显示所有记录
      } else if (currentUser.role === 'department_manager') {
        // 部门经理只能查看自己创建的分享记录
        shares = shares.filter(share =>
          share.createdById === currentUser.id ||
          share.createdBy === currentUser.name
        )
      } else {
        // 其他角色（如销售员）只能查看自己创建的分享记录
        shares = shares.filter(share =>
          share.createdById === currentUser.id ||
          share.createdBy === currentUser.name
        )
      }
    }

    const totalShares = shares.length
    const totalAmount = shares.reduce((sum, share) => {
      // 分享总金额 = 所有分享成员的shareAmount之和
      const memberTotal = (share.shareMembers || []).reduce((s, m) => s + (m.shareAmount || 0), 0)
      return sum + memberTotal
    }, 0)
    // 🔥 修复：参与成员应包含分享创建人（原始下单人）
    const involvedMemberIds = new Set<string>()
    shares
      .filter(share => share.shareMembers && Array.isArray(share.shareMembers))
      .forEach(share => {
        // 添加原始下单人
        if (share.createdById) involvedMemberIds.add(share.createdById)
        // 添加分享成员
        share.shareMembers.forEach(member => {
          if (member.userId) involvedMemberIds.add(member.userId)
        })
      })
    const involvedMembers = involvedMemberIds.size
    const sharedOrders = new Set(shares.map(s => s.orderId)).size
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

    // 🔥 获取日期范围，用于计算环比
    const now = new Date()
    let currentStart: Date
    let currentEnd: Date
    let previousStart: Date
    let previousEnd: Date

    if (dateRange.value && dateRange.value.length === 2) {
      // 用户自定义日期范围
      currentStart = new Date(dateRange.value[0])
      currentEnd = new Date(dateRange.value[1])
      currentEnd.setHours(23, 59, 59, 999)

      // 计算上一期：相同天数的前一个时间段
      const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24))
      previousEnd = new Date(currentStart)
      previousEnd.setDate(previousEnd.getDate() - 1)
      previousEnd.setHours(23, 59, 59, 999)
      previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - daysDiff + 1)
      previousStart.setHours(0, 0, 0, 0)
    } else {
      // 默认：本月至今 vs 上月整月
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    }

    // 获取当前用户的订单（已审核通过的）
    const userOrders = orderStore.orders.filter(order =>
      order.salesPersonId === currentUserId &&
      order.auditStatus === 'approved'
    )

    // 🔥 按时间段过滤订单
    const currentOrders = userOrders.filter(order => {
      const orderTime = new Date(order.createTime)
      return orderTime >= currentStart && orderTime <= currentEnd
    })

    const previousOrders = userOrders.filter(order => {
      const orderTime = new Date(order.createTime)
      return orderTime >= previousStart && orderTime <= previousEnd
    })

    // 获取当前用户的客户
    const userCustomers = getCustomerStore().customers.filter(customer =>
      customer.salesPersonId === currentUserId
    )

    // 🔥 按时间段过滤客户
    const currentCustomers = userCustomers.filter(customer => {
      const createTime = new Date(customer.createdAt || customer.createTime)
      return createTime >= currentStart && createTime <= currentEnd
    })

    const previousCustomers = userCustomers.filter(customer => {
      const createTime = new Date(customer.createdAt || customer.createTime)
      return createTime >= previousStart && createTime <= previousEnd
    })

    // 计算业绩，考虑分享情况
    let totalSales = 0
    let previousTotalSales = 0

    // 创建订单分享映射
    const orderShareMap = new Map<string, Array<{ userId: string, percentage: number, shareAmount: number }>>()
    performanceShares.value
      .filter(share => share.status === 'active' || share.status === 'completed')
      .forEach(share => {
        const shareDetails = share.shareMembers
          .filter(member => member.status === 'confirmed' || member.status === 'pending')
          .map(member => ({
            userId: member.userId,
            percentage: member.percentage,
            shareAmount: member.shareAmount
          }))
        orderShareMap.set(share.orderId, shareDetails)
      })

    // 🔥 计算当期业绩
    currentOrders.forEach(order => {
      const shareDetails = orderShareMap.get(order.id)
      if (shareDetails && shareDetails.length > 0) {
        const totalSharedPercentage = shareDetails.reduce((sum, detail) => sum + detail.percentage, 0)
        const remainingPercentage = 100 - totalSharedPercentage
        const remainingAmount = (order.totalAmount * remainingPercentage) / 100
        totalSales += remainingAmount
      } else {
        totalSales += order.totalAmount
      }
    })

    // 🔥 计算上期业绩
    previousOrders.forEach(order => {
      const shareDetails = orderShareMap.get(order.id)
      if (shareDetails && shareDetails.length > 0) {
        const totalSharedPercentage = shareDetails.reduce((sum, detail) => sum + detail.percentage, 0)
        const remainingPercentage = 100 - totalSharedPercentage
        const remainingAmount = (order.totalAmount * remainingPercentage) / 100
        previousTotalSales += remainingAmount
      } else {
        previousTotalSales += order.totalAmount
      }
    })

    // 加上别人分享给自己的业绩
    // 🔥 修复：使用订单创建时间而非分享创建时间进行时间筛选，确保业绩守恒
    performanceShares.value
      .filter(share => share.status === 'active' || share.status === 'completed')
      .forEach(share => {
        const myShare = share.shareMembers.find(member =>
          member.userId === currentUserId &&
          (member.status === 'confirmed' || member.status === 'pending')
        )
        if (myShare) {
          // 🔥 修复：查找原始订单的创建时间，保持与步骤1的时间维度一致
          const originalOrder = orderStore.orders.find((o: any) => o.id === share.orderId)
          if (originalOrder) {
            const orderTime = new Date(originalOrder.createTime)
            if (orderTime >= currentStart && orderTime <= currentEnd) {
              totalSales += myShare.shareAmount
            }
            if (orderTime >= previousStart && orderTime <= previousEnd) {
              previousTotalSales += myShare.shareAmount
            }
          } else {
            // 如果找不到原始订单（可能是其他用户的订单），使用分享创建时间作为兜底
            const shareTime = new Date(share.createTime)
            if (shareTime >= currentStart && shareTime <= currentEnd) {
              totalSales += myShare.shareAmount
            }
            if (shareTime >= previousStart && shareTime <= previousEnd) {
              previousTotalSales += myShare.shareAmount
            }
          }
        }
      })

    const totalOrders = currentOrders.length
    const previousTotalOrders = previousOrders.length

    // 🔥 守恒定律：订单数也按分享比例拆分
    let sharedOrderCount = 0
    let previousSharedOrderCount = 0
    let receivedOrderCount = 0
    let previousReceivedOrderCount = 0

    // 计算当期分享出去的订单数
    currentOrders.forEach(order => {
      const shareDetails = orderShareMap.get(order.id)
      if (shareDetails && shareDetails.length > 0) {
        const totalSharedPercentage = shareDetails.reduce((sum, detail) => sum + detail.percentage, 0)
        sharedOrderCount += totalSharedPercentage / 100
      }
    })

    // 计算上期分享出去的订单数
    previousOrders.forEach(order => {
      const shareDetails = orderShareMap.get(order.id)
      if (shareDetails && shareDetails.length > 0) {
        const totalSharedPercentage = shareDetails.reduce((sum, detail) => sum + detail.percentage, 0)
        previousSharedOrderCount += totalSharedPercentage / 100
      }
    })

    // 计算接收到的订单数（按订单创建时间归属）
    performanceShares.value
      .filter(share => share.status === 'active' || share.status === 'completed')
      .forEach(share => {
        const myShare = share.shareMembers.find(member =>
          member.userId === currentUserId &&
          (member.status === 'confirmed' || member.status === 'pending')
        )
        if (myShare) {
          const originalOrder = orderStore.orders.find((o: any) => o.id === share.orderId)
          if (originalOrder) {
            const orderTime = new Date(originalOrder.createTime)
            if (orderTime >= currentStart && orderTime <= currentEnd) {
              receivedOrderCount += myShare.percentage / 100
            }
            if (orderTime >= previousStart && orderTime <= previousEnd) {
              previousReceivedOrderCount += myShare.percentage / 100
            }
          } else {
            const shareTime = new Date(share.createTime)
            if (shareTime >= currentStart && shareTime <= currentEnd) {
              receivedOrderCount += myShare.percentage / 100
            }
            if (shareTime >= previousStart && shareTime <= previousEnd) {
              previousReceivedOrderCount += myShare.percentage / 100
            }
          }
        }
      })

    // 🔥 净订单数 = 自有订单数 - 分享出的比例 + 接收到的比例（守恒定律）
    const netTotalOrders = Math.max(0, totalOrders - sharedOrderCount + receivedOrderCount)
    const netPreviousTotalOrders = Math.max(0, previousTotalOrders - previousSharedOrderCount + previousReceivedOrderCount)
    const newCustomers = currentCustomers.length
    const previousNewCustomers = previousCustomers.length
    const conversionRate = newCustomers > 0 ? (netTotalOrders / newCustomers) * 100 : 0
    const previousConversionRate = previousNewCustomers > 0 ? (netPreviousTotalOrders / previousNewCustomers) * 100 : 0

    // 🔥 计算签收业绩和签收订单数量
    const currentSignedOrders = currentOrders.filter(order => order.status === 'delivered')
    const previousSignedOrders = previousOrders.filter(order => order.status === 'delivered')

    let signedAmount = 0
    let previousSignedAmount = 0

    // 计算当期签收业绩
    currentSignedOrders.forEach(order => {
      const shareDetails = orderShareMap.get(order.id)
      if (shareDetails && shareDetails.length > 0) {
        const totalSharedPercentage = shareDetails.reduce((sum, detail) => sum + detail.percentage, 0)
        const remainingPercentage = 100 - totalSharedPercentage
        const remainingAmount = (order.totalAmount * remainingPercentage) / 100
        signedAmount += remainingAmount
      } else {
        signedAmount += order.totalAmount
      }
    })

    // 计算上期签收业绩
    previousSignedOrders.forEach(order => {
      const shareDetails = orderShareMap.get(order.id)
      if (shareDetails && shareDetails.length > 0) {
        const totalSharedPercentage = shareDetails.reduce((sum, detail) => sum + detail.percentage, 0)
        const remainingPercentage = 100 - totalSharedPercentage
        const remainingAmount = (order.totalAmount * remainingPercentage) / 100
        previousSignedAmount += remainingAmount
      } else {
        previousSignedAmount += order.totalAmount
      }
    })

    const signedOrders = currentSignedOrders.length
    const previousSignedOrdersCount = previousSignedOrders.length

    // 🔥 计算环比的辅助函数
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0
      }
      if (current === 0) {
        return -100
      }
      const rawChange = ((current - previous) / previous) * 100
      let change = Number(rawChange.toFixed(1))
      if (Math.abs(change) < 0.1) {
        change = 0
      }
      return change
    }

    return {
      totalSales,
      salesTrend: calculateTrend(totalSales, previousTotalSales),
      totalOrders: netTotalOrders,
      ordersTrend: calculateTrend(netTotalOrders, netPreviousTotalOrders),
      newCustomers,
      customersTrend: calculateTrend(newCustomers, previousNewCustomers),
      conversionRate,
      conversionTrend: calculateTrend(conversionRate, previousConversionRate),
      // 🔥 新增：签收业绩相关数据
      signedAmount,
      signedTrend: calculateTrend(signedAmount, previousSignedAmount),
      signedOrders,
      signedOrdersTrend: calculateTrend(signedOrders, previousSignedOrdersCount)
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

    const userCustomers = getCustomerStore().customers.filter(customer =>
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
      console.log('[Performance Store] 创建业绩分享:', shareData)

      // 尝试调用API，如果失败则使用本地存储
      try {
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

        // 🔥 修复：API直接返回 { success, data }
        if (response.success) {
          // 🔥 API创建成功后返回的只有 { id, shareNumber }，需要构建完整对象
          const apiResult = response.data as any
          const newShare: PerformanceShare = {
            id: apiResult.id || apiResult.shareId,
            shareNumber: apiResult.shareNumber || apiResult.share_number || '',
            orderId: shareData.orderId,
            orderNumber: shareData.orderNumber,
            orderAmount: shareData.orderAmount,
            shareMembers: shareData.shareMembers.map(member => ({
              ...member,
              shareAmount: (shareData.orderAmount * member.percentage) / 100,
              status: 'pending' as const
            })),
            status: 'active',
            createTime: new Date().toLocaleString(),
            createdBy: shareData.createdBy,
            createdById: shareData.createdById,
            description: shareData.description
          }
          performanceShares.value.unshift(newShare)
          await updateMembersPerformance(newShare)
          await syncPerformanceData()
          console.log('[Performance Store] API创建业绩分享成功')
          return newShare
        }
      } catch (apiError) {
        console.warn('[Performance Store] API调用失败，使用本地存储:', apiError)
      }

      // API失败或开发环境，使用本地存储
      const newShare: PerformanceShare = {
        id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        shareNumber: generateShareNumber(),
        orderId: shareData.orderId,
        orderNumber: shareData.orderNumber,
        orderAmount: shareData.orderAmount,
        shareMembers: shareData.shareMembers.map(member => ({
          ...member,
          shareAmount: (shareData.orderAmount * member.percentage) / 100,
          status: 'confirmed' // 默认为已确认状态
        })),
        status: 'active',
        createTime: new Date().toLocaleString(),
        createdBy: shareData.createdBy,
        createdById: shareData.createdById,
        description: shareData.description
      }

      console.log('[Performance Store] 新分享记录:', newShare)

      // 添加到本地存储
      performanceShares.value.unshift(newShare)

      // 更新相关成员的业绩数据
      await updateMembersPerformance(newShare)

      // 触发业绩数据同步
      await syncPerformanceData()

      console.log('[Performance Store] 本地创建业绩分享成功')

      return newShare
    } catch (error) {
      console.error('[Performance Store] 创建业绩分享失败:', error)
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


      return performanceShares.value[index]
    }
    return null
  }

  // 方法 - 取消业绩分享
  const cancelPerformanceShare = async (shareId: string) => {
    const share = performanceShares.value.find(s => s.id === shareId)
    if (!share) {
      console.error('[Performance Store] 找不到分享记录:', shareId)
      return false
    }
    if (share.status !== 'active') {
      console.warn('[Performance Store] 分享状态不是active，无法取消:', share.status)
      return false
    }

    // 🔥 关键修复：必须先调用后端API取消，成功后才更新本地状态
    let apiSuccess = false
    try {
      const apiResult = await performanceApi.cancelPerformanceShare(shareId)
      if (apiResult.success) {
        apiSuccess = true
        console.log('[Performance Store] API取消业绩分享成功')
      } else {
        console.error('[Performance Store] API取消失败:', apiResult.message)
        return false
      }
    } catch (apiError) {
      console.error('[Performance Store] API调用异常:', apiError)
      return false
    }

    if (!apiSuccess) return false

    // 🔥 API成功后，更新本地状态
    share.status = 'cancelled'

    // 恢复原始业绩数据
    await revertMembersPerformance(share)

    // 🔥 重新从后端加载最新数据，确保本地与后端一致
    try {
      await loadPerformanceShares({ limit: 500 })
    } catch (e) {
      console.warn('[Performance Store] 重新加载分享数据失败:', e)
    }

    // 🔥 触发业绩数据同步，确保个人/团队/数据看板同步更新
    await syncPerformanceData()

    // 发送取消通知给所有相关成员（不阻塞取消流程）
    try {
      const notificationStore = useNotificationStore()
      ;(share.shareMembers || []).forEach(member => {
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
    } catch (notifyError) {
      console.warn('[Performance Store] 发送取消通知失败（不影响取消操作）:', notifyError)
    }

    return true
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

  // 辅助方法 - 生成分享编号（短编码格式）
  const generateShareNumber = () => {
    const now = new Date()
    const dateStr = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `SH${dateStr}${randomStr}`
  }

  // 辅助方法 - 更新成员业绩数据
  const updateMembersPerformance = async (newShare: PerformanceShare) => {
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
    const currentUser = userStore.currentUser
    if (!currentUser) return []

    // 超级管理员可以查看所有订单
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
      return orders
    }

    // 部门负责人可以查看本部门所有订单
    if (currentUser.role === 'department_manager') {
      return orders.filter((order: any) =>
        order.salesPersonId === currentUser.id ||
        order.createdBy === currentUser.name
      )
    }

    // 销售员只能查看自己的订单
    if (currentUser.role === 'sales_staff') {
      return orders.filter((order: any) => order.salesPersonId === currentUser.id)
    }

    // 客服只能查看自己负责的订单
    if (currentUser.role === 'customer_service') {
      return orders.filter((order: any) => order.customerServiceId === currentUser.id)
    }

    // 其他角色默认只能查看自己相关的订单
    return orders.filter((order: unknown) =>
      order.salesPersonId === currentUser.id ||
      order.customerServiceId === currentUser.id
    )
  }

  // 实时同步功能 - 刷新所有业绩数据
  const syncPerformanceData = async () => {
    console.log('[Performance Store] 开始同步业绩数据')

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

    // 创建订单分享映射，记录每个订单的分享详情
    const orderShareMap = new Map<string, Array<{ userId: string, percentage: number, shareAmount: number }>>()
    performanceShares.value
      .filter(share => share.status === 'active' || share.status === 'completed')
      .forEach(share => {
        const shareDetails = share.shareMembers
          .filter(member => member.status === 'confirmed' || member.status === 'pending')
          .map(member => ({
            userId: member.userId,
            percentage: member.percentage,
            shareAmount: member.shareAmount
          }))
        orderShareMap.set(share.orderId, shareDetails)
      })

    // 计算订单业绩，考虑分享情况
    accessibleOrders.forEach((order: unknown) => {
      // 只计算已完成、已发货、已签收的订单
      if (order.status === 'shipped' || order.status === 'delivered' || order.auditStatus === 'approved') {
        const shareDetails = orderShareMap.get(order.id)

        if (shareDetails && shareDetails.length > 0) {
          // 该订单有分享，计算下单员保留的业绩
          const totalSharedPercentage = shareDetails.reduce((sum, detail) => sum + detail.percentage, 0)
          const remainingPercentage = 100 - totalSharedPercentage
          const remainingAmount = (order.totalAmount * remainingPercentage) / 100

          // 给下单员分配保留的业绩
          const orderOwner = teamMembers.value.find(tm => tm.id === order.salesPersonId)
          if (orderOwner) {
            orderOwner.salesAmount += remainingAmount
            orderOwner.orderCount += 1
            orderOwner.commission += remainingAmount * 0.1

            console.log(`[Performance Store] 订单 ${order.orderNumber} (有分享):`, {
              下单员: orderOwner.name,
              订单金额: order.totalAmount,
              分享总比例: totalSharedPercentage + '%',
              保留比例: remainingPercentage + '%',
              保留金额: remainingAmount.toFixed(2)
            })
          }

          // 给分享成员分配业绩
          shareDetails.forEach(detail => {
            const shareMember = teamMembers.value.find(tm => tm.id === detail.userId)
            if (shareMember) {
              shareMember.salesAmount += detail.shareAmount
              shareMember.commission += detail.shareAmount * 0.1

              console.log(`[Performance Store] 分享给 ${shareMember.name}:`, {
                分享金额: detail.shareAmount.toFixed(2),
                分享比例: detail.percentage + '%'
              })
            }
          })
        } else {
          // 该订单没有分享，全部业绩归下单员
          const orderOwner = teamMembers.value.find(tm => tm.id === order.salesPersonId)
          if (orderOwner) {
            orderOwner.salesAmount += order.totalAmount
            orderOwner.orderCount += 1
            orderOwner.commission += order.totalAmount * 0.1

            console.log(`[Performance Store] 订单 ${order.orderNumber} (无分享):`, {
              下单员: orderOwner.name,
              订单金额: order.totalAmount
            })
          }
        }
      }
    })

    // 重新计算业绩等级和目标完成率
    teamMembers.value.forEach(member => {
      // 假设每个成员的月度目标是80000元
      const monthlyTarget = 80000
      member.targetCompletion = Math.round((member.salesAmount / monthlyTarget) * 100)

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

    console.log('[Performance Store] 业绩数据同步完成')
    console.log('[Performance Store] 团队成员业绩:', teamMembers.value.map(m => ({
      姓名: m.name,
      业绩: m.salesAmount.toFixed(2),
      订单数: m.orderCount,
      目标完成率: m.targetCompletion + '%'
    })))
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

  /**
   * 🔥 工具函数：将后端API返回的snake_case字段映射为前端camelCase
   * 后端 performance_shares 表列名是 snake_case（如 order_number, created_by 等）
   * 前端 PerformanceShare 接口使用 camelCase（如 orderNumber, createdBy 等）
   */
  const mapShareFromAPI = (raw: any): PerformanceShare => {
    // 解析 shareMembers（可能是JSON字符串或已解析的数组）
    let members = raw.shareMembers || raw.share_members || []
    if (typeof members === 'string') {
      try { members = JSON.parse(members) } catch { members = [] }
    }
    // shareMembers 在SQL的JSON_OBJECT中已定义为camelCase (userId, userName, percentage, shareAmount)
    const parsedMembers: ShareMember[] = (members || []).map((m: any) => ({
      userId: m.userId || m.user_id || '',
      userName: m.userName || m.user_name || '',
      percentage: Number(m.percentage || m.share_percentage || 0),
      shareAmount: Number(m.shareAmount || m.share_amount || 0),
      status: m.status || 'pending',
      confirmTime: m.confirmTime || m.confirm_time || undefined
    }))

    return {
      id: raw.id,
      shareNumber: raw.shareNumber || raw.share_number || '',
      orderId: raw.orderId || raw.order_id || '',
      orderNumber: raw.orderNumber || raw.order_number || '',
      orderAmount: Number(raw.orderAmount || raw.order_amount || 0),
      shareMembers: parsedMembers,
      status: raw.status || 'active',
      createTime: raw.createTime || raw.created_at || raw.createdAt || '',
      createdBy: raw.createdBy || raw.created_by_name || '',
      createdById: raw.createdById || raw.created_by || '',
      description: raw.description || '',
      completedTime: raw.completedTime || raw.completed_at || undefined,
      // 订单关联信息
      orderCustomerName: raw.orderCustomerName || raw.order_customer_name || undefined,
      orderCustomerPhone: raw.orderCustomerPhone || raw.order_customer_phone || undefined,
      orderProducts: raw.orderProducts || raw.order_products || undefined,
      orderCreatedAt: raw.orderCreatedAt || raw.order_created_at || undefined
    }
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
      // 🔥 修复：API直接返回 { success, data }，不是 { data: { success, data } }
      if (response.success) {
        // 🔥 关键修复：将后端snake_case字段映射为前端camelCase
        performanceShares.value = (response.data.shares || []).map((raw: any) => mapShareFromAPI(raw))
        return response.data
      } else {
        throw new Error((response as any).message || '加载业绩分享数据失败')
      }
    } catch (error) {
      console.error('加载业绩分享数据失败:', error)
      // 返回空数据而不是抛出错误，避免页面崩溃
      performanceShares.value = []
      return { shares: [], total: 0, page: 1, limit: 10 }
    }
  }

  // 方法 - 加载分享统计数据
  const loadShareStats = async () => {
    try {
      const response = await performanceApi.getPerformanceStats()
      // 🔥 修复：API直接返回 { success, data }
      if (response.success) {
        return response.data
      } else {
        throw new Error((response as any).message || '加载统计数据失败')
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
      // 返回默认数据而不是抛出错误
      return {
        totalShares: 0,
        totalAmount: 0,
        pendingShares: 0,
        completedShares: 0,
        userStats: { totalShares: 0, totalAmount: 0 }
      }
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
    loadTeamMembersFromUserStore,

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
