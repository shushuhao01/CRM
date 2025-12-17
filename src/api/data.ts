import { api } from './request'
import { shouldUseMockApi } from './mock'
import { generateCustomerCode } from '@/utils/customerCode'
import { isProduction } from '@/utils/env'

// 资料管理相关接口

// 资料列表相关接口
export interface DataListParams {
  page?: number
  pageSize?: number
  status?: 'pending' | 'assigned' | 'archived' | 'recovered'
  dateRange?: string[]
  dateFilter?: 'today' | 'yesterday' | 'thisWeek' | 'last30Days' | 'thisMonth' | 'thisYear' | 'all'
  searchKeyword?: string
  assigneeId?: string
  orderAmountRange?: number[]
}

// 操作轨迹记录接口
export interface OperationRecord {
  id: string
  type: 'assign' | 'archive' | 'recover' | 'reassign'
  operatorId: string
  operatorName: string
  operatorDepartment?: string
  targetId?: string // 分配目标ID
  targetName?: string // 分配目标姓名
  targetDepartment?: string // 分配目标部门
  reason?: string
  remark?: string
  createTime: string
}

// 分配历史记录接口
export interface AssignmentHistory {
  id: string
  dataId: string // 资料ID
  assignType: 'random' | 'roundrobin' | 'specific' | 'leader_assign' // 分配类型
  assignMode?: 'direct' | 'leader' // 分配模式（轮流分配时使用）
  fromUserId?: string // 来源用户ID（重新分配时）
  fromUserName?: string // 来源用户姓名
  toUserId: string // 目标用户ID
  toUserName: string // 目标用户姓名
  departmentId?: string // 部门ID
  departmentName?: string // 部门名称
  operatorId: string // 操作人ID
  operatorName: string // 操作人姓名
  remark?: string // 备注
  createTime: string // 分配时间
}

// 部门轮流分配状态接口
export interface DepartmentRoundRobinState {
  departmentId: string
  departmentName: string
  members: {
    userId: string
    userName: string
    assignmentCount: number // 分配次数
    lastAssignedTime?: string // 最后分配时间
  }[]
  lastUpdated: string // 最后更新时间
}

// 分配统计接口
export interface AssignmentStats {
  userId: string
  userName: string
  departmentId: string
  departmentName: string
  totalAssigned: number // 总分配数
  todayAssigned: number // 今日分配数
  weekAssigned: number // 本周分配数
  monthAssigned: number // 本月分配数
  avgOrderAmount: number // 平均订单金额
  lastAssignedTime?: string // 最后分配时间
}

export interface DataListItem {
  id: string
  customerName: string
  customerCode?: string  // 客户编码
  phone: string
  orderNo: string
  orderAmount: number
  orderDate: string
  signDate: string
  status: 'pending' | 'assigned' | 'archived' | 'recovered'
  assigneeId?: string
  assigneeName?: string
  assigneeDepartment?: string
  assignDate?: string
  createTime: string
  updateTime: string
  trackingNo?: string
  address?: string
  remark?: string
  archiveInfo?: {
    duration: string
    reason: string
    remark: string
    unarchiveTime?: string
    archiveTime: string
  }
  isReassigned?: boolean // 是否为重新分配的标识
  operatorId?: string // 操作人ID（分配或封存操作的执行者）
  operatorName?: string // 操作人姓名
  operatorDepartment?: string // 操作人部门
  createdBy?: string // 创建者ID
  createdByName?: string // 创建者姓名
  operationRecords?: OperationRecord[] // 操作轨迹记录
  assignmentHistory?: AssignmentHistory[] // 分配历史记录
  currentAssignment?: {
    assignType: 'random' | 'roundrobin' | 'specific' | 'leader_assign'
    assignMode?: 'direct' | 'leader'
    assignedAt: string
    assignedBy: string
    assignedByName: string
  } // 当前分配信息
}

export interface DataListResponse {
  list: DataListItem[]
  total: number
  summary: {
    totalCount: number
    pendingCount: number
    assignedCount: number
    archivedCount: number
    totalAmount: number
    todayCount: number
    weekCount: number
    monthCount: number
  }
}

// 获取资料列表
export const getDataList = async (params: DataListParams): Promise<DataListResponse> => {
  // 🔥 始终尝试从后端API获取数据
  try {
    console.log('[Data API] 从后端API获取资料列表...')
    const response = await api.get('/data/list', params)

    // 处理API响应格式
    if (response && response.data) {
      return {
        list: response.data.list || [],
        total: response.data.total || 0,
        summary: response.summary || {
          totalCount: response.data.total || 0,
          pendingCount: 0,
          assignedCount: 0,
          archivedCount: 0,
          totalAmount: 0,
          todayCount: 0,
          weekCount: 0,
          monthCount: 0
        }
      }
    }

    return response
  } catch (error) {
    console.error('[Data API] 从后端获取资料列表失败，尝试使用本地数据:', error)

    // 降级：从localStorage读取数据
    const dataListStr = localStorage.getItem('dataList')
    let dataList: DataListItem[] = []

    if (dataListStr) {
      try {
        dataList = JSON.parse(dataListStr)
      } catch (parseError) {
        console.error('解析dataList失败:', parseError)
        dataList = []
      }
    }

    // 如果localStorage中没有数据，返回空列表
    if (!dataList || dataList.length === 0) {
      console.log('localStorage中没有dataList数据，返回空列表')
      return {
        list: [],
        total: 0,
        summary: {
          totalCount: 0,
          pendingCount: 0,
          assignedCount: 0,
          archivedCount: 0,
          totalAmount: 0,
          todayCount: 0,
          weekCount: 0,
          monthCount: 0
        }
      }
    }

    const { page = 1, pageSize = 30 } = params
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize

    return {
      list: dataList.slice(startIndex, endIndex),
      total: dataList.length,
      summary: {
        totalCount: dataList.length,
        pendingCount: dataList.filter(item => item.status === 'pending').length,
        assignedCount: dataList.filter(item => item.status === 'assigned').length,
        archivedCount: dataList.filter(item => item.status === 'archived').length,
        totalAmount: (dataList || []).reduce((sum, item) => sum + (item.orderAmount || 0), 0),
        todayCount: dataList.filter(item => {
          const today = new Date().toDateString()
          return new Date(item.orderDate).toDateString() === today
        }).length,
        weekCount: dataList.filter(item => {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return new Date(item.orderDate) >= weekAgo
        }).length,
        monthCount: dataList.filter(item => {
          const monthAgo = new Date()
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          return new Date(item.orderDate) >= monthAgo
        }).length
      }
    }
  }
}

// 批量分配资料
export interface BatchAssignParams {
  dataIds: string[]
  assigneeId: string
  assigneeName: string
  remark?: string
}

export const batchAssignData = (params: BatchAssignParams): Promise<{ success: boolean; message: string }> => {
  if (shouldUseMockApi()) {
    // 使用mock数据
    return Promise.resolve({ success: true, message: '批量分配成功' })
  }

  // 注意：BASE_URL已包含/api/v1，所以这里只需要/data/batch-assign
  return api.post('/data/batch-assign', params)
}

// 批量封存资料
export interface BatchArchiveParams {
  dataIds: string[]
  reason?: string
}

export const batchArchiveData = (params: BatchArchiveParams): Promise<{ success: boolean; message: string }> => {
  if (shouldUseMockApi()) {
    // 使用mock数据
    return Promise.resolve({ success: true, message: '批量封存成功' })
  }

  return api.post('/data/batch-archive', params)
}

// 回收资料
export interface RecoverDataParams {
  dataId: string
  reason?: string
}

export const recoverData = (params: RecoverDataParams): Promise<{ success: boolean; message: string }> => {
  if (shouldUseMockApi()) {
    // 使用mock数据
    return Promise.resolve({ success: true, message: '回收成功' })
  }

  return api.post('/data/recover', params)
}

// 删除资料（移至回收站）
export interface DeleteDataParams {
  dataId: string
  reason?: string
}

export const deleteData = (params: DeleteDataParams): Promise<{ success: boolean; message: string }> => {
  if (shouldUseMockApi()) {
    // 使用mock数据
    return Promise.resolve({ success: true, message: '删除成功' })
  }

  return api.post('/data/delete', params)
}

// 获取可分配的成员列表
export interface AssigneeOption {
  id: string
  name: string
  department: string
  phone: string
  workload: number
  maxWorkload: number
  status: 'active' | 'busy' | 'offline'
}

export const getAssigneeOptions = async (): Promise<AssigneeOption[]> => {
  // 🔥 始终尝试从后端API获取真实用户数据
  try {
    console.log('[Data API] 从后端API获取分配成员列表...')
    const response = await api.get('/data/assignee-options')

    if (response && response.data) {
      return response.data.map((u: any) => ({
        id: u.id,
        name: u.name || u.realName || u.username,
        department: u.department || u.departmentName || '未知部门',
        phone: u.phone || '',
        workload: u.workload || 0,
        maxWorkload: u.maxWorkload || 100,
        status: u.status || 'active'
      }))
    }

    return response || []
  } catch (error) {
    console.error('[Data API] 从后端获取分配成员失败，尝试使用本地数据:', error)

    // 降级：从localStorage获取用户数据
    try {
      const userDatabaseStr = localStorage.getItem('userDatabase')
      if (userDatabaseStr) {
        const users = JSON.parse(userDatabaseStr)
        return users
          .filter((u: any) => u.status === 'active' || !u.status)
          .map((u: any) => ({
            id: u.id,
            name: u.realName || u.name || u.username,
            department: u.department || u.departmentName || '未知部门',
            phone: u.phone || '',
            workload: 0,
            maxWorkload: 100,
            status: 'active' as const
          }))
      }
    } catch (parseError) {
      console.error('解析用户数据失败:', parseError)
    }

    return []
  }
}

// 客户查询相关接口
export interface CustomerSearchParams {
  phone?: string
  orderNo?: string
  trackingNo?: string
  customerName?: string
  customerCode?: string
}

export interface CustomerSearchResult {
  customerName: string
  phone: string
  orderNo: string
  orderAmount: number
  orderDate: string
  trackingNo?: string
  ownerName: string
  ownerDepartment: string
  ownerPhone: string
  ownerStatus: 'active' | 'inactive' | 'offline'
  customerId: string
  ownerId: string
}

export const searchCustomer = async (params: CustomerSearchParams): Promise<CustomerSearchResult[]> => {
  // 生产环境：强制使用真实API，不降级
  if (isProduction()) {
    console.log('[Data API] 生产环境：使用后端API搜索客户')
    const response = await api.get('/data/search-customer', params)
    return response.data || response
  }

  // 开发环境：从localStorage搜索
  console.log('[Data API] 开发环境：使用localStorage搜索客户')
  try {
    const customerStore = localStorage.getItem('customer-store')
    const orderStoreRaw = localStorage.getItem('crm_store_order')
    const userDatabase = localStorage.getItem('userDatabase')

    if (!customerStore || !orderStoreRaw || !userDatabase) {
      return []
    }

    // 解析订单数据（支持新旧格式）
    let orders: any[] = []
    try {
      const parsed = JSON.parse(orderStoreRaw)
      if (parsed.data && parsed.data.orders) {
        orders = parsed.data.orders
      } else if (parsed.orders) {
        orders = parsed.orders
      } else if (Array.isArray(parsed)) {
        orders = parsed
      }
    } catch (e) {
      console.error('[Data API] 解析订单数据失败:', e)
      return []
    }

    const customers = JSON.parse(customerStore).customers || []
    const users = JSON.parse(userDatabase) || []

    const results: CustomerSearchResult[] = []
    const keyword = params.phone || params.orderNo || params.trackingNo || params.customerName || params.customerCode || ''

    // 搜索匹配的订单
    for (const order of orders) {
      const customer = customers.find((c: unknown) => c.id === order.customerId)
      if (!customer) continue

      const owner = users.find((u: unknown) => u.id === order.salesPersonId)

      let matched = false

      // 匹配逻辑
      if (params.phone && customer.phone === params.phone) matched = true
      if (params.customerName && customer.name?.includes(params.customerName)) matched = true
      if (params.customerCode && customer.code === params.customerCode) matched = true
      if (params.orderNo && order.orderNumber === params.orderNo) matched = true
      if (params.trackingNo && order.trackingNumber === params.trackingNo) matched = true

      // 通用关键词匹配
      if (!matched && keyword) {
        if (customer.name?.includes(keyword) ||
            customer.phone === keyword ||
            customer.code === keyword ||
            order.orderNumber === keyword ||
            order.orderNumber?.includes(keyword) ||
            order.trackingNumber === keyword ||
            order.trackingNumber?.includes(keyword)) {
          matched = true
        }
      }

      if (matched) {
        results.push({
          customerName: customer.name || '未知',
          phone: customer.phone || '',
          orderNo: order.orderNumber || '',
          orderAmount: order.totalAmount || 0,
          orderDate: order.createTime ? order.createTime.split(' ')[0] : '',
          trackingNo: order.trackingNumber || '',
          ownerName: owner ? (owner.realName || owner.name || '未知') : '未知',
          ownerDepartment: owner ? (owner.department || '未知部门') : '未知部门',
          ownerPhone: owner ? (owner.phone || '') : '',
          ownerStatus: 'active',
          customerId: customer.id,
          ownerId: owner?.id || ''
        })
      }
    }

    // 去重
    const uniqueResults = results.reduce((acc: CustomerSearchResult[], current) => {
      const exists = acc.find(item =>
        item.customerName === current.customerName &&
        item.orderNo === current.orderNo
      )
      if (!exists) {
        acc.push(current)
      }
      return acc
    }, [])

    return uniqueResults
  } catch (error) {
    console.error('[Data API] 搜索客户失败:', error)
    return []
  }
}

// 获取客户详情
export interface CustomerDetail extends CustomerSearchResult {
  address: string
  createTime: string
  lastContactTime?: string
  orderHistory: {
    orderNo: string
    amount: number
    date: string
    status: string
  }[]
  contactHistory: {
    type: 'call' | 'message' | 'visit'
    content: string
    time: string
    operator: string
  }[]
  tags: string[]
  remark?: string
}

export const getCustomerDetail = (customerId: string): Promise<CustomerDetail> => {
  return api.get(`/data/customer/${customerId}`)
}

// 资料操作日志
export interface DataOperationLog {
  id: string
  dataId: string
  customerName: string
  operationType: 'assign' | 'archive' | 'recover' | 'transfer'
  operatorName: string
  operatorId: string
  fromAssignee?: string
  toAssignee?: string
  reason?: string
  createTime: string
}

export const getDataOperationLogs = (dataId: string): Promise<DataOperationLog[]> => {
  return api.get(`/data/operation-logs/${dataId}`)
}

// 统计数据
export interface DataStatistics {
  totalCustomers: number
  pendingAssignment: number
  assignedToday: number
  archivedThisMonth: number
  totalOrderAmount: number
  averageOrderAmount: number
  topAssignees: {
    name: string
    count: number
    amount: number
  }[]
  dailyStats: {
    date: string
    assigned: number
    archived: number
    recovered: number
  }[]
}

export const getDataStatistics = (dateRange?: string[]): Promise<DataStatistics> => {
  return api.get('/data/statistics',
    dateRange ? { startDate: dateRange[0], endDate: dateRange[1] } : {}
  )
}

// 导出资料
export interface ExportDataParams {
  status?: 'pending' | 'assigned' | 'archived'
  dateRange?: string[]
  assigneeId?: string
  format: 'excel' | 'csv'
}

export const exportDataList = (params: ExportDataParams): Promise<unknown> => {
  return api.get('/data/export', params)
}

// 回收站相关接口
export interface RecycleItem {
  id: string
  customerName: string
  phone: string
  orderAmount: number
  orderDate: string
  deletedAt: string
  deletedBy: string
  deletedByName: string
  deleteReason: string
  expiresAt: string
}

export interface RecycleListParams {
  page?: number
  pageSize?: number
  keyword?: string
  deleteTimeFilter?: 'today' | 'week' | 'month' | 'all'
  deletedBy?: string
}

export interface RecycleListResponse {
  list: RecycleItem[]
  total: number
  page: number
  pageSize: number
  summary: {
    totalCount: number
    recentCount: number
    expiringSoonCount: number
  }
}

// 获取回收站列表
export const getRecycleList = async (params: RecycleListParams = {}): Promise<RecycleListResponse> => {
  if (shouldUseMockApi()) {
    // 返回模拟数据
    return Promise.resolve({
      list: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      summary: { totalCount: 0, recentCount: 0, expiringSoonCount: 0 }
    })
  }

  const response = await api.get('/data/recycle', params)
  return response.data || response
}

// 从回收站恢复数据
export const restoreData = async (dataIds: string[]): Promise<{ success: boolean; message: string }> => {
  if (shouldUseMockApi()) {
    return Promise.resolve({ success: true, message: '恢复成功' })
  }

  return api.post('/data/restore', { dataIds })
}

// 永久删除数据
export const permanentDeleteData = async (dataIds: string[]): Promise<{ success: boolean; message: string }> => {
  if (shouldUseMockApi()) {
    return Promise.resolve({ success: true, message: '永久删除成功' })
  }

  return api.post('/data/permanent-delete', { dataIds })
}

// 模拟数据生成器（开发环境使用）
export const generateMockData = () => {
  const mockCustomers: DataListItem[] = []
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '陈明', '刘强', '杨丽', '黄伟', '林芳', '郭涛', '何静']
  const statuses: ('pending' | 'assigned' | 'archived' | 'recovered')[] = ['pending', 'assigned', 'archived', 'recovered']
  const assignees = [
    { id: '1', name: '李销售', department: '销售一部' },
    { id: '2', name: '王经理', department: '销售二部' },
    { id: '3', name: '张主管', department: '销售三部' }
  ]

  const creators = [
    { id: 'creator1', name: '系统管理员', department: '管理部' },
    { id: 'creator2', name: '数据录入员', department: '客服部' },
    { id: 'creator3', name: '业务员小王', department: '业务部' }
  ]

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisYearStart = new Date(now.getFullYear(), 0, 1)

  // 生成不同时间段的数据
  const timeRanges = [
    { label: '今日', date: today, count: 3 },
    { label: '昨日', date: yesterday, count: 2 },
    { label: '本周', date: thisWeekStart, count: 8 },
    { label: '本月', date: thisMonthStart, count: 15 },
    { label: '今年', date: thisYearStart, count: 25 },
    { label: '历史', date: new Date(2023, 0, 1), count: 10 }
  ]

  let id = 1
  timeRanges.forEach(range => {
    for (let i = 0; i < range.count; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const assignee = status === 'assigned' ? assignees[Math.floor(Math.random() * assignees.length)] : undefined

      // 在指定时间范围内生成随机日期
      let orderDate: Date
      if (range.label === '今日') {
        orderDate = new Date(today.getTime() + Math.random() * 24 * 60 * 60 * 1000)
      } else if (range.label === '昨日') {
        orderDate = new Date(yesterday.getTime() + Math.random() * 24 * 60 * 60 * 1000)
      } else if (range.label === '本周') {
        orderDate = new Date(thisWeekStart.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
      } else if (range.label === '本月') {
        orderDate = new Date(thisMonthStart.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
      } else if (range.label === '今年') {
        orderDate = new Date(thisYearStart.getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000)
      } else {
        orderDate = new Date(range.date.getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000)
      }

      const signDate = new Date(orderDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)

      // 生成重新分配标识（10%概率）
      const isReassigned = Math.random() < 0.1

      // 生成创建者信息
      const creator = creators[Math.floor(Math.random() * creators.length)]

      // 生成操作人信息（对于已分配、已封存、已回收状态）
      let operatorInfo = undefined
      if (status !== 'pending') {
        const operator = assignees[Math.floor(Math.random() * assignees.length)]
        operatorInfo = {
          operatorId: operator.id,
          operatorName: operator.name,
          operatorDepartment: operator.department
        }
      }

      // 生成操作记录
      const operationRecords: OperationRecord[] = []

      // 添加创建记录
      operationRecords.push({
        id: `op_${id}_1`,
        type: 'assign' as const,
        operatorId: creator.id,
        operatorName: creator.name,
        operatorDepartment: creator.department,
        remark: '客户资料创建',
        createTime: orderDate.toISOString()
      })

      // 根据状态添加相应的操作记录
      let assignDate = undefined
      if (status === 'assigned' && assignee) {
        const assignTime = new Date(orderDate.getTime() + Math.random() * 24 * 60 * 60 * 1000)
        assignDate = assignTime.toISOString().split('T')[0]
        operationRecords.push({
          id: `op_${id}_2`,
          type: 'assign' as const,
          operatorId: operatorInfo?.operatorId || 'system',
          operatorName: operatorInfo?.operatorName || '系统',
          operatorDepartment: operatorInfo?.operatorDepartment,
          targetId: assignee.id,
          targetName: assignee.name,
          targetDepartment: assignee.department,
          remark: '分配给销售人员',
          createTime: assignTime.toISOString()
        })
      }

      // 生成封存信息（对于已封存状态的数据）
      let archiveInfo = undefined
      if (status === 'archived') {
        const archiveReasons = ['客户暂停合作', '订单取消', '客户要求暂停', '内部调整']
        const durations = ['1个月', '3个月', '6个月', '1年']
        const archiveTime = new Date(orderDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
        const duration = durations[Math.floor(Math.random() * durations.length)]

        // 计算解封时间
        const unarchiveTime = new Date(archiveTime)
        switch (duration) {
          case '1个月':
            unarchiveTime.setMonth(unarchiveTime.getMonth() + 1)
            break
          case '3个月':
            unarchiveTime.setMonth(unarchiveTime.getMonth() + 3)
            break
          case '6个月':
            unarchiveTime.setMonth(unarchiveTime.getMonth() + 6)
            break
          case '1年':
            unarchiveTime.setFullYear(unarchiveTime.getFullYear() + 1)
            break
        }

        archiveInfo = {
          duration,
          reason: archiveReasons[Math.floor(Math.random() * archiveReasons.length)],
          remark: `封存备注：${Math.random() > 0.5 ? '客户主动要求' : '业务调整需要'}`,
          archiveTime: archiveTime.toISOString(),
          unarchiveTime: unarchiveTime.toISOString()
        }

        // 添加封存操作记录
        operationRecords.push({
          id: `op_${id}_archive`,
          type: 'archive' as const,
          operatorId: operatorInfo?.operatorId || 'system',
          operatorName: operatorInfo?.operatorName || '系统',
          operatorDepartment: operatorInfo?.operatorDepartment,
          reason: archiveInfo.reason,
          remark: archiveInfo.remark,
          createTime: archiveInfo.archiveTime
        })
      }

      // 为回收状态添加操作记录
      if (status === 'recovered') {
        const recoverTime = new Date(orderDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
        operationRecords.push({
          id: `op_${id}_recover`,
          type: 'recover' as const,
          operatorId: operatorInfo?.operatorId || 'system',
          operatorName: operatorInfo?.operatorName || '系统',
          operatorDepartment: operatorInfo?.operatorDepartment,
          remark: '客户资料回收',
          createTime: recoverTime.toISOString()
        })
      }

      mockCustomers.push({
        id: `data_${id}`,
        customerName: names[Math.floor(Math.random() * names.length)],
        customerCode: generateCustomerCode(),
        phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        orderNo: `ORD${new Date().getFullYear()}${id.toString().padStart(6, '0')}`,
        orderAmount: Math.floor(Math.random() * 5000) + 500,
        orderDate: orderDate.toISOString().split('T')[0],
        signDate: signDate.toISOString().split('T')[0],
        status,
        assigneeId: assignee?.id,
        assigneeName: assignee?.name,
        assigneeDepartment: assignee?.department,
        assignDate: assignDate,
        createTime: orderDate.toISOString(),
        updateTime: new Date().toISOString(),
        trackingNo: `SF${Math.floor(Math.random() * 1000000000000)}`,
        address: `广东省深圳市南山区科技园${Math.floor(Math.random() * 100)}号`,
        remark: Math.random() > 0.7 ? '重要客户' : undefined,
        isReassigned,
        archiveInfo,
        // 新增字段
        operatorId: operatorInfo?.operatorId,
        operatorName: operatorInfo?.operatorName,
        operatorDepartment: operatorInfo?.operatorDepartment,
        createdBy: creator.id,
        createdByName: creator.name,
        operationRecords
      })
      id++
    }
  })

  return mockCustomers
}

// 分配历史相关API接口

// 获取分配历史记录
export const getAssignmentHistory = (params: {
  dataId?: string
  userId?: string
  departmentId?: string
  assignType?: string
  dateRange?: string[]
  page?: number
  pageSize?: number
}): Promise<{
  list: AssignmentHistory[]
  total: number
}> => {
  if (shouldUseMockApi()) {
    // 模拟分配历史数据
    const mockHistory: AssignmentHistory[] = [
      {
        id: 'ah_1',
        dataId: 'data_1',
        assignType: 'roundrobin',
        assignMode: 'direct',
        toUserId: 'user_1',
        toUserName: '张三',
        departmentId: 'dept_1',
        departmentName: '销售一部',
        operatorId: 'admin_1',
        operatorName: '管理员',
        remark: '轮流分配',
        createTime: '2024-01-15 10:30:00'
      },
      {
        id: 'ah_2',
        dataId: 'data_2',
        assignType: 'leader_assign',
        fromUserId: 'leader_1',
        fromUserName: '部门负责人',
        toUserId: 'user_2',
        toUserName: '李四',
        departmentId: 'dept_1',
        departmentName: '销售一部',
        operatorId: 'leader_1',
        operatorName: '部门负责人',
        remark: '部门负责人二次分配',
        createTime: '2024-01-15 11:00:00'
      }
    ]

    return Promise.resolve({
      list: mockHistory,
      total: mockHistory.length
    })
  }

  return api.get('/assignment/history', { params })
}

// 获取部门轮流分配状态
export const getDepartmentRoundRobinState = (departmentId: string): Promise<DepartmentRoundRobinState> => {
  if (shouldUseMockApi()) {
    const mockState: DepartmentRoundRobinState = {
      departmentId,
      departmentName: '销售一部',
      members: [
        {
          userId: 'user_1',
          userName: '张三',
          assignmentCount: 5,
          lastAssignedTime: '2024-01-15 10:30:00'
        },
        {
          userId: 'user_2',
          userName: '李四',
          assignmentCount: 3,
          lastAssignedTime: '2024-01-14 15:20:00'
        },
        {
          userId: 'user_3',
          userName: '王五',
          assignmentCount: 4,
          lastAssignedTime: '2024-01-15 09:15:00'
        }
      ],
      lastUpdated: '2024-01-15 11:00:00'
    }

    return Promise.resolve(mockState)
  }

  return api.get(`/department/${departmentId}/roundrobin-state`)
}

// 更新部门轮流分配状态
export const updateDepartmentRoundRobinState = (
  departmentId: string,
  state: DepartmentRoundRobinState
): Promise<void> => {
  if (shouldUseMockApi()) {
    return Promise.resolve()
  }

  return api.put(`/department/${departmentId}/roundrobin-state`, state)
}

// 获取分配统计数据
export const getAssignmentStats = (params: {
  userId?: string
  departmentId?: string
  dateRange?: string[]
}): Promise<AssignmentStats[]> => {
  if (shouldUseMockApi()) {
    const mockStats: AssignmentStats[] = [
      {
        userId: 'user_1',
        userName: '张三',
        departmentId: 'dept_1',
        departmentName: '销售一部',
        totalAssigned: 25,
        todayAssigned: 3,
        weekAssigned: 12,
        monthAssigned: 25,
        avgOrderAmount: 3500,
        lastAssignedTime: '2024-01-15 10:30:00'
      },
      {
        userId: 'user_2',
        userName: '李四',
        departmentId: 'dept_1',
        departmentName: '销售一部',
        totalAssigned: 18,
        todayAssigned: 2,
        weekAssigned: 8,
        monthAssigned: 18,
        avgOrderAmount: 4200,
        lastAssignedTime: '2024-01-15 11:00:00'
      }
    ]

    return Promise.resolve(mockStats)
  }

  return api.get('/assignment/stats', { params })
}

// 记录分配历史
export const recordAssignmentHistory = (history: Omit<AssignmentHistory, 'id' | 'createTime'>): Promise<void> => {
  if (shouldUseMockApi()) {
    return Promise.resolve()
  }

  return api.post('/assignment/history', history)
}
