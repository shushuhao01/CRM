import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createPersistentStore } from '@/utils/storage'
import type {
  DataListItem,
  DataListParams,
  DataListResponse,
  AssigneeOption,
  CustomerSearchResult,
  CustomerDetail,
  DataStatistics,
  BatchAssignParams,
  BatchArchiveParams,
  AssignmentHistory,
  DepartmentRoundRobinState,
  AssignmentStats
} from '@/api/data'
import * as dataApi from '@/api/data'
import { useUserStore } from './user'
import { messageNotificationService } from '@/services/messageNotificationService'

export const useDataStore = createPersistentStore('data', () => {
  // 状态
  const dataList = ref<DataListItem[]>([])
  const total = ref(0)
  const loading = ref(false)
  const searchLoading = ref(false)

  // 汇总数据
  const summary = ref({
    totalCount: 0,
    pendingCount: 0,
    assignedCount: 0,
    archivedCount: 0,
    recoveredCount: 0,
    totalAmount: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0
  })

  // 分页参数
  const pagination = ref({
    page: 1,
    pageSize: 30
  })

  // 筛选参数
  const filters = ref<Partial<DataListParams>>({
    status: 'pending',
    dateRange: [],
    searchKeyword: '',
    assigneeId: '',
    orderAmountRange: []
  })

  // 可分配成员列表
  const assigneeOptions = ref<AssigneeOption[]>([])

  // 客户搜索结果
  const searchResults = ref<CustomerSearchResult[]>([])
  const searchHistory = ref<CustomerSearchParams[]>([])

  // 统计数据
  const statistics = ref<DataStatistics | null>(null)

  // 选中的数据项
  const selectedDataIds = ref<string[]>([])

  // 轮流分配状态管理
  const departmentAssignmentState = ref<Record<string, {
    members: Array<{
      id: string
      name: string
      assignmentCount: number
      lastAssignedAt?: string
    }>
    currentIndex: number
    lastRoundCompleted: boolean
  }>>({})

  // 分配模式：'direct' - 直接分配给成员，'leader' - 先分配给部门负责人
  const assignmentMode = ref<'direct' | 'leader'>('direct')

  // 分配历史和统计相关状态
  const assignmentHistory = ref<AssignmentHistory[]>([])
  const assignmentHistoryTotal = ref(0)
  const assignmentHistoryLoading = ref(false)
  const departmentRoundRobinStates = ref<Record<string, DepartmentRoundRobinState>>({})
  const assignmentStats = ref<AssignmentStats[]>([])
  const assignmentStatsLoading = ref(false)

  // 计算属性
  const hasSelectedData = computed(() => selectedDataIds.value.length > 0)

  const selectedDataCount = computed(() => selectedDataIds.value.length)

  const filteredDataList = computed(() => {
    const userStore = useUserStore()
    let result = dataList.value

    // 客户归属权限控制
    if (userStore.currentUser) {
      const currentUserId = userStore.currentUser.id
      const currentUserRole = userStore.currentUser.role
      const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin'
      const isDepartmentManager = currentUserRole === 'department_manager'

      // 超级管理员和管理员可以查看所有数据
      if (isSuperAdmin) {
        // 管理员可以查看所有资料
        console.log(`[资料列表] 管理员 ${userStore.currentUser.name} 查看所有数据: ${result.length} 条`)
      } else if (isDepartmentManager) {
        // 🔥 部门经理：只能查看被分配给自己的资料（不包括自己创建的）
        result = result.filter(item => {
          // 只有被分配给自己的资料才显示
          return item.assigneeId === currentUserId
        })
        console.log(`[资料列表] 部门经理 ${userStore.currentUser.name} 过滤后数据: ${result.length} 条（仅显示分配给自己的）`)
      } else {
        // 🔥 销售员等普通角色：不能查看资料列表，返回空数组
        result = []
        console.log(`[资料列表] 普通用户 ${userStore.currentUser.name} 无权查看资料列表`)
      }
    }

    // 按状态筛选
    if (filters.value.status) {
      result = result.filter(item => item.status === filters.value.status)
    }

    // 按关键词搜索
    if (filters.value.searchKeyword) {
      const keyword = filters.value.searchKeyword.toLowerCase()
      result = result.filter(item =>
        item.customerName.toLowerCase().includes(keyword) ||
        item.phone.includes(keyword) ||
        item.orderNo.toLowerCase().includes(keyword) ||
        (item.customerCode && item.customerCode.toLowerCase().includes(keyword))
      )
    }

    // 按分配人筛选
    if (filters.value.assigneeId) {
      result = result.filter(item => item.assigneeId === filters.value.assigneeId)
    }

    // 按订单金额范围筛选
    if (filters.value.orderAmountRange && filters.value.orderAmountRange.length === 2) {
      const [min, max] = filters.value.orderAmountRange
      result = result.filter(item => item.orderAmount >= min && item.orderAmount <= max)
    }

    // 按日期范围筛选
    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      const [startDate, endDate] = filters.value.dateRange
      result = result.filter(item => {
        const itemDate = new Date(item.orderDate)
        return itemDate >= new Date(startDate) && itemDate <= new Date(endDate)
      })
    }

    // 按快捷日期筛选
    if (filters.value.dateFilter && filters.value.dateFilter !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (filters.value.dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          result = result.filter(item => {
            const itemDate = new Date(item.orderDate)
            return itemDate >= startDate && itemDate < new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
          })
          break
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          result = result.filter(item => {
            const itemDate = new Date(item.orderDate)
            return itemDate >= startDate && itemDate < new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
          })
          break
        case 'thisWeek':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          result = result.filter(item => new Date(item.orderDate) >= weekStart)
          break
        case 'last30Days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          result = result.filter(item => new Date(item.orderDate) >= startDate)
          break
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          result = result.filter(item => new Date(item.orderDate) >= startDate)
          break
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1)
          result = result.filter(item => new Date(item.orderDate) >= startDate)
          break
      }
    }

    return result
  })

  // 获取资料列表
  const fetchDataList = async (params?: Partial<DataListParams>) => {
    loading.value = true
    try {
      const requestParams = {
        ...pagination.value,
        ...filters.value,
        ...params
      }

      const response = await dataApi.getDataList(requestParams)
      dataList.value = response?.list || []
      total.value = response?.total || 0
      summary.value = response?.summary || {}

      return response
    } catch (error) {
      console.error('获取资料列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 刷新数据
  const refreshData = () => {
    return fetchDataList()
  }

  // 设置筛选条件
  const setFilters = (newFilters: Partial<DataListParams>) => {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1 // 重置到第一页
    return fetchDataList()
  }

  // 设置分页
  const setPagination = (page: number, pageSize?: number) => {
    pagination.value.page = page
    if (pageSize) {
      pagination.value.pageSize = pageSize
    }
    return fetchDataList()
  }

  // 重置筛选条件
  const resetFilters = () => {
    filters.value = {
      status: 'pending',
      dateRange: [],
      searchKeyword: '',
      assigneeId: '',
      orderAmountRange: []
    }
    pagination.value.page = 1
    return fetchDataList()
  }

  // 获取可分配成员列表
  const fetchAssigneeOptions = async () => {
    try {
      assigneeOptions.value = await dataApi.getAssigneeOptions()
      return assigneeOptions.value
    } catch (error) {
      console.error('获取分配成员列表失败:', error)
      throw error
    }
  }

  // 批量分配资料
  const batchAssignData = async (params: BatchAssignParams) => {
    try {
      const result = await dataApi.batchAssignData(params)

      if (result.success) {
        // 更新本地数据
        dataList.value = dataList.value.map(item => {
          if (params.dataIds.includes(item.id)) {
            return {
              ...item,
              status: 'assigned' as const,
              assigneeId: params.assigneeId,
              assigneeName: params.assigneeName,
              updateTime: new Date().toISOString()
            }
          }
          return item
        })

        // 清空选中状态
        selectedDataIds.value = []

        // 刷新汇总数据
        await refreshData()

        // 【2025-12-13新增】发送资料分配通知
        const userStore = useUserStore()
        const assignerName = userStore.currentUser?.name || '管理员'
        try {
          messageNotificationService.sendDataAssigned(
            params.assigneeId,
            params.assigneeName,
            params.dataIds.length,
            assignerName
          )
        } catch (error) {
          console.error('发送资料分配通知失败:', error)
        }
      }

      return result
    } catch (error) {
      console.error('批量分配资料失败:', error)
      throw error
    }
  }

  // 初始化部门分配状态
  const initializeDepartmentState = (departmentId: string, members: Array<{id: string, name: string}>) => {
    if (!departmentAssignmentState.value[departmentId]) {
      departmentAssignmentState.value[departmentId] = {
        members: members.map(member => ({
          id: member.id,
          name: member.name,
          assignmentCount: 0,
          lastAssignedAt: undefined
        })),
        currentIndex: 0,
        lastRoundCompleted: false
      }
    } else {
      // 更新成员列表，保留已有的分配计数
      const existingState = departmentAssignmentState.value[departmentId]
      const updatedMembers = members.map(member => {
        const existing = existingState.members.find(m => m.id === member.id)
        return existing || {
          id: member.id,
          name: member.name,
          assignmentCount: 0,
          lastAssignedAt: undefined
        }
      })
      departmentAssignmentState.value[departmentId].members = updatedMembers
    }
  }

  // 轮流分配算法
  const getNextAssignees = (departmentId: string, count: number): Array<{id: string, name: string}> => {
    const state = departmentAssignmentState.value[departmentId]
    if (!state || state.members.length === 0) {
      return []
    }

    const assignments: Array<{id: string, name: string}> = []
    const members = [...state.members]

    // 按分配次数排序，优先分配给次数少的成员
    members.sort((a, b) => {
      if (a.assignmentCount !== b.assignmentCount) {
        return a.assignmentCount - b.assignmentCount
      }
      // 如果分配次数相同，按上次分配时间排序（越早越优先）
      if (!a.lastAssignedAt && !b.lastAssignedAt) return 0
      if (!a.lastAssignedAt) return -1
      if (!b.lastAssignedAt) return 1
      return new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime()
    })

    // 分配逻辑
    for (let i = 0; i < count; i++) {
      const memberIndex = i % members.length
      const member = members[memberIndex]
      assignments.push({
        id: member.id,
        name: member.name
      })

      // 更新分配计数和时间
      const stateIndex = state.members.findIndex(m => m.id === member.id)
      if (stateIndex !== -1) {
        state.members[stateIndex].assignmentCount++
        state.members[stateIndex].lastAssignedAt = new Date().toISOString()
      }
    }

    return assignments
  }

  // 轮流批量分配资料
  const batchRoundRobinAssignData = async (params: {
    dataIds: string[]
    departmentId: string
    departmentName: string
    members: Array<{id: string, name: string}>
    mode: 'direct' | 'leader'
    leaderId?: string
    leaderName?: string
    remark?: string
  }) => {
    try {
      // 初始化部门状态
      initializeDepartmentState(params.departmentId, params.members)

      let assignments: Array<{
        dataId: string
        assigneeId: string
        assigneeName: string
      }> = []

      if (params.mode === 'leader' && params.leaderId && params.leaderName) {
        // 模式1：先分配给部门负责人
        assignments = params.dataIds.map(dataId => ({
          dataId,
          assigneeId: params.leaderId!,
          assigneeName: params.leaderName!
        }))
      } else {
        // 模式2：直接轮流分配给成员
        const assignees = getNextAssignees(params.departmentId, params.dataIds.length)
        assignments = params.dataIds.map((dataId, index) => ({
          dataId,
          assigneeId: assignees[index % assignees.length].id,
          assigneeName: assignees[index % assignees.length].name
        }))
      }

      // 调用真实API进行批量分配
      // 将轮流分配的结果逐个调用batchAssignData API
      for (const assignment of assignments) {
        await dataApi.batchAssignData({
          dataIds: [assignment.dataId],
          assigneeId: assignment.assigneeId,
          assigneeName: assignment.assigneeName,
          remark: params.remark
        })
      }

      const result = { success: true, message: '轮流分配成功' }

      if (result.success) {
        // 更新本地数据
        dataList.value = dataList.value.map(item => {
          const assignment = assignments.find(a => a.dataId === item.id)
          if (assignment) {
            return {
              ...item,
              status: 'assigned' as const,
              assigneeId: assignment.assigneeId,
              assigneeName: assignment.assigneeName,
              updateTime: new Date().toISOString()
            }
          }
          return item
        })

        // 清空选中状态
        selectedDataIds.value = []

        // 刷新汇总数据
        await refreshData()
      }

      return result
    } catch (error) {
      console.error('轮流批量分配资料失败:', error)
      throw error
    }
  }



  // 批量封存资料
  const batchArchiveData = async (params: BatchArchiveParams) => {
    try {
      const result = await dataApi.batchArchiveData(params)

      if (result.success) {
        // 更新本地数据
        dataList.value = dataList.value.map(item => {
          if (params.dataIds.includes(item.id)) {
            return {
              ...item,
              status: 'archived' as const,
              updateTime: new Date().toISOString()
            }
          }
          return item
        })

        // 清空选中状态
        selectedDataIds.value = []

        // 刷新汇总数据
        await refreshData()
      }

      return result
    } catch (error) {
      console.error('批量封存资料失败:', error)
      throw error
    }
  }

  // 单个封存资料
  const archiveData = async (params: {
    dataId: string
    duration: string
    reason: string
    remark: string
    unarchiveTime?: string
  }) => {
    try {
      // 模拟API调用
      const result = { success: true, message: '封存成功' }

      if (result.success) {
        // 更新本地数据
        dataList.value = dataList.value.map(item => {
          if (item.id === params.dataId) {
            return {
              ...item,
              status: 'archived' as const,
              archiveInfo: {
                duration: params.duration,
                reason: params.reason,
                remark: params.remark,
                unarchiveTime: params.unarchiveTime,
                archiveTime: new Date().toISOString()
              },
              updateTime: new Date().toISOString()
            }
          }
          return item
        })

        // 刷新汇总数据
        await refreshData()
      }

      return result
    } catch (error) {
      console.error('封存资料失败:', error)
      throw error
    }
  }

  // 回收资料
  const recoverData = async (dataId: string, reason?: string) => {
    try {
      const result = await dataApi.recoverData({ dataId, reason })

      if (result.success) {
        // 更新本地数据
        const index = dataList.value.findIndex(item => item.id === dataId)
        if (index > -1) {
          dataList.value[index] = {
            ...dataList.value[index],
            status: 'recovered',
            assigneeId: undefined,
            assigneeName: undefined,
            assigneeDepartment: undefined,
            updateTime: new Date().toISOString()
          }
        }

        // 刷新汇总数据
        await refreshData()
      }

      return result
    } catch (error) {
      console.error('回收资料失败:', error)
      throw error
    }
  }

  // 删除资料（移至回收站）
  const deleteData = async (dataId: string, reason?: string) => {
    try {
      const result = await dataApi.deleteData({ dataId, reason })

      if (result.success) {
        // 从本地数据中移除
        const index = dataList.value.findIndex(item => item.id === dataId)
        if (index > -1) {
          dataList.value.splice(index, 1)
        }

        // 刷新汇总数据
        await refreshData()
      }

      return result
    } catch (error) {
      console.error('删除资料失败:', error)
      throw error
    }
  }

  // 客户搜索
  const searchCustomer = async (params: CustomerSearchParams) => {
    searchLoading.value = true
    try {
      searchResults.value = await dataApi.searchCustomer(params)

      // 添加到搜索历史
      addToSearchHistory(params)

      return searchResults.value
    } catch (error) {
      console.error('客户搜索失败:', error)
      throw error
    } finally {
      searchLoading.value = false
    }
  }

  // 添加到搜索历史
  const addToSearchHistory = (params: CustomerSearchParams) => {
    const searchText = []
    if (params.phone) searchText.push(`手机号: ${params.phone}`)
    if (params.customerCode) searchText.push(`客户编码: ${params.customerCode}`)
    if (params.orderNo) searchText.push(`订单号: ${params.orderNo}`)
    if (params.trackingNo) searchText.push(`物流单号: ${params.trackingNo}`)
    if (params.customerName) searchText.push(`客户: ${params.customerName}`)

    if (searchText.length > 0) {
      const historyItem = {
        text: searchText.join(', '),
        time: new Date().toLocaleString(),
        params
      }

      // 避免重复
      const existingIndex = searchHistory.value.findIndex(item => item.text === historyItem.text)
      if (existingIndex > -1) {
        searchHistory.value.splice(existingIndex, 1)
      }

      searchHistory.value.unshift(historyItem)

      // 限制历史记录数量
      if (searchHistory.value.length > 10) {
        searchHistory.value = searchHistory.value.slice(0, 10)
      }
    }
  }

  // 清空搜索历史
  const clearSearchHistory = () => {
    searchHistory.value = []
  }

  // 获取统计数据
  const fetchStatistics = async (dateRange?: string[]) => {
    try {
      statistics.value = await dataApi.getDataStatistics(dateRange)
      return statistics.value
    } catch (error) {
      console.error('获取统计数据失败:', error)
      throw error
    }
  }

  // 选择/取消选择数据项
  const toggleSelectData = (dataId: string) => {
    const index = selectedDataIds.value.indexOf(dataId)
    if (index > -1) {
      selectedDataIds.value.splice(index, 1)
    } else {
      selectedDataIds.value.push(dataId)
    }
  }

  // 全选/取消全选
  const toggleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      selectedDataIds.value = filteredDataList.value.map(item => item.id)
    } else {
      selectedDataIds.value = []
    }
  }

  // 清空选中状态
  const clearSelection = () => {
    selectedDataIds.value = []
  }

  // 导出数据
  const exportData = async (params: { format: string; [key: string]: unknown }) => {
    try {
      const blob = await dataApi.exportDataList(params)

      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `资料列表_${new Date().toISOString().split('T')[0]}.${params.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return true
    } catch (error) {
      console.error('导出数据失败:', error)
      throw error
    }
  }

  // 获取客户详情
  const getCustomerDetail = async (customerId: string) => {
    try {
      return await dataApi.getCustomerDetail(customerId)
    } catch (error) {
      console.error('获取客户详情失败:', error)
      throw error
    }
  }

  // 分配历史和统计相关方法

  // 获取分配历史记录
  const fetchAssignmentHistory = async (params: {
    dataId?: string
    userId?: string
    departmentId?: string
    assignType?: string
    dateRange?: string[]
    page?: number
    pageSize?: number
  }) => {
    try {
      assignmentHistoryLoading.value = true
      const response = await dataApi.getAssignmentHistory(params)
      assignmentHistory.value = response?.list || []
      assignmentHistoryTotal.value = response?.total || 0
      return response
    } catch (error) {
      console.error('获取分配历史失败:', error)
      throw error
    } finally {
      assignmentHistoryLoading.value = false
    }
  }

  // 获取部门轮流分配状态
  const fetchDepartmentRoundRobinState = async (departmentId: string) => {
    try {
      const state = await dataApi.getDepartmentRoundRobinState(departmentId)
      departmentRoundRobinStates.value[departmentId] = state
      return state
    } catch (error) {
      console.error('获取部门轮流分配状态失败:', error)
      throw error
    }
  }

  // 更新部门轮流分配状态
  const updateDepartmentRoundRobinState = async (departmentId: string, state: DepartmentRoundRobinState) => {
    try {
      await dataApi.updateDepartmentRoundRobinState(departmentId, state)
      departmentRoundRobinStates.value[departmentId] = state
    } catch (error) {
      console.error('更新部门轮流分配状态失败:', error)
      throw error
    }
  }

  // 获取分配统计数据
  const fetchAssignmentStats = async (params: {
    userId?: string
    departmentId?: string
    dateRange?: string[]
  }) => {
    try {
      assignmentStatsLoading.value = true
      const stats = await dataApi.getAssignmentStats(params)
      assignmentStats.value = stats
      return stats
    } catch (error) {
      console.error('获取分配统计失败:', error)
      throw error
    } finally {
      assignmentStatsLoading.value = false
    }
  }

  // 记录分配历史
  const recordAssignmentHistory = async (history: Omit<AssignmentHistory, 'id' | 'createTime'>) => {
    try {
      await dataApi.recordAssignmentHistory(history)
      // 记录成功后，可以选择刷新分配历史列表
      if (assignmentHistory.value.length > 0) {
        await fetchAssignmentHistory({})
      }
    } catch (error) {
      console.error('记录分配历史失败:', error)
      throw error
    }
  }

  // 增强版轮流分配方法（集成历史记录）
  const batchRoundRobinAssignDataWithHistory = async (params: {
    dataIds: string[]
    departmentId: string
    assignMode: 'direct' | 'leader'
    remark?: string
  }) => {
    try {
      // 先执行原有的轮流分配逻辑
      await batchRoundRobinAssignData(params)

      // 记录分配历史
      const currentTime = new Date().toISOString()
      const currentUser = { id: 'current_user', name: '当前用户' } // 实际应用中从用户状态获取

      for (const dataId of params.dataIds) {
        await recordAssignmentHistory({
          dataId,
          assignType: 'roundrobin',
          assignMode: params.assignMode,
          toUserId: 'assigned_user_id', // 实际应用中需要从分配结果获取
          toUserName: 'assigned_user_name',
          departmentId: params.departmentId,
          departmentName: 'department_name', // 实际应用中需要从部门信息获取
          operatorId: currentUser.id,
          operatorName: currentUser.name,
          remark: params.remark
        })
      }

      // 更新部门轮流分配状态
      const currentState = departmentRoundRobinStates.value[params.departmentId]
      if (currentState) {
        await updateDepartmentRoundRobinState(params.departmentId, currentState)
      }

    } catch (error) {
      console.error('轮流分配（含历史记录）失败:', error)
      throw error
    }
  }

  // 跨部门智能分配方法
  const batchCrossDepartmentAssignData = async (params: {
    assignments: Array<{
      dataId: string
      assigneeId: string
      assigneeName: string
      department: string
    }>
    strategy: 'workload' | 'performance' | 'manual'
    targetDepartments: Array<{ id: string; name: string }>
    remark?: string
  }) => {
    try {
      loading.value = true

      // 调用真实API进行跨部门分配
      // 将分配结果逐个调用batchAssignData API
      for (const assignment of params.assignments) {
        await dataApi.batchAssignData({
          dataIds: [assignment.dataId],
          assigneeId: assignment.assigneeId,
          assigneeName: assignment.assigneeName,
          remark: params.remark
        })
      }

      // 更新数据列表中的分配信息
      params.assignments.forEach(assignment => {
        const dataItem = dataList.value.find(item => item.id === assignment.dataId)
        if (dataItem) {
          dataItem.assigneeId = assignment.assigneeId
          dataItem.assigneeName = assignment.assigneeName
          dataItem.status = 'assigned'
          dataItem.assignTime = new Date().toISOString()

          // 添加操作记录
          dataItem.operationRecords = dataItem.operationRecords || []
          dataItem.operationRecords.unshift({
            id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'cross_department_assign',
            description: `跨部门智能分配给 ${assignment.assigneeName}（${assignment.department}）`,
            operatorId: 'current_user',
            operatorName: '当前用户',
            createTime: new Date().toISOString(),
            remark: params.remark
          })

          // 更新分配历史
          if (!dataItem.assignmentHistory) {
            dataItem.assignmentHistory = []
          }
          dataItem.assignmentHistory.unshift({
            id: `ah_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            dataId: assignment.dataId,
            assignType: 'cross_department',
            assignMode: params.strategy,
            toUserId: assignment.assigneeId,
            toUserName: assignment.assigneeName,
            departmentId: '', // 跨部门分配可能涉及多个部门
            departmentName: assignment.department,
            operatorId: 'current_user',
            operatorName: '当前用户',
            createTime: new Date().toISOString(),
            remark: params.remark
          })

          // 更新当前分配信息
          dataItem.currentAssignment = {
            type: 'cross_department',
            mode: params.strategy,
            assignTime: new Date().toISOString(),
            assigneeId: assignment.assigneeId,
            assigneeName: assignment.assigneeName,
            departmentId: '',
            departmentName: assignment.department
          }
        }
      })

      // 记录分配历史到全局记录
      const currentTime = new Date().toISOString()
      const currentUser = { id: 'current_user', name: '当前用户' }

      for (const assignment of params.assignments) {
        await recordAssignmentHistory({
          dataId: assignment.dataId,
          assignType: 'cross_department',
          assignMode: params.strategy,
          toUserId: assignment.assigneeId,
          toUserName: assignment.assigneeName,
          departmentId: '',
          departmentName: assignment.department,
          operatorId: currentUser.id,
          operatorName: currentUser.name,
          remark: params.remark
        })
      }

      console.log(`跨部门智能分配完成: ${params.assignments.length} 条资料，策略: ${params.strategy}`)

    } catch (error) {
      console.error('跨部门智能分配失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    dataList,
    total,
    loading,
    searchLoading,
    summary,
    pagination,
    filters,
    assigneeOptions,
    searchResults,
    searchHistory,
    statistics,
    selectedDataIds,
    departmentAssignmentState,
    assignmentMode,
    assignmentHistory,
    assignmentHistoryTotal,
    assignmentHistoryLoading,
    departmentRoundRobinStates,
    assignmentStats,
    assignmentStatsLoading,

    // 计算属性
    hasSelectedData,
    selectedDataCount,
    filteredDataList,

    // 方法
    fetchDataList,
    refreshData,
    setFilters,
    setPagination,
    resetFilters,
    fetchAssigneeOptions,
    batchAssignData,
    batchRoundRobinAssignData,
    initializeDepartmentState,
    getNextAssignees,
    batchArchiveData,
    archiveData,
    recoverData,
    deleteData,
    searchCustomer,
    addToSearchHistory,
    clearSearchHistory,
    fetchStatistics,
    toggleSelectData,
    toggleSelectAll,
    clearSelection,
    exportData,
    getCustomerDetail,
    fetchAssignmentHistory,
    fetchDepartmentRoundRobinState,
    updateDepartmentRoundRobinState,
    fetchAssignmentStats,
    recordAssignmentHistory,
    batchRoundRobinAssignDataWithHistory,
    batchCrossDepartmentAssignData
  }
})
