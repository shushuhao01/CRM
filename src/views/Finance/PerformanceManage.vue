<template>
  <div class="performance-manage-page">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.pendingCount }}</div>
            <div class="stat-label">待处理</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon processed"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.processedCount }}</div>
            <div class="stat-label">已处理</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon valid"><el-icon><Select /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.validCount }}</div>
            <div class="stat-label">有效单数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon coefficient"><el-icon><TrendCharts /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ Number(statistics.coefficientSum || 0).toFixed(1) }}</div>
            <div class="stat-label">系数合计</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷日期筛选 -->
    <div class="quick-filters">
      <div class="quick-btn-group">
        <button
          v-for="item in quickDateOptions"
          :key="item.value"
          :class="['quick-btn', { active: quickDateFilter === item.value }]"
          @click="handleQuickDateClick(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filter-bar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        @change="handleDateChange"
        class="filter-date"
      />
      <el-input
        v-model="searchKeyword"
        placeholder="搜索订单号"
        clearable
        class="filter-item"
        @clear="loadData"
        @keyup.enter="loadData"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="departmentFilter" placeholder="选择部门" :clearable="isAdmin" :disabled="isSales" @change="handleDepartmentChange" class="filter-item">
        <el-option v-for="dept in filteredDepartments" :key="dept.id" :label="dept.name" :value="dept.id" />
      </el-select>
      <el-select v-model="salesPersonFilter" placeholder="销售人员" :clearable="isAdmin || isManager" :disabled="isSales" filterable @change="handleFilterChange" class="filter-item">
        <el-option v-for="user in filteredSalesPersons" :key="user.id" :label="user.name" :value="user.id" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="有效状态" clearable @change="handleFilterChange" class="filter-item">
        <el-option label="待处理" value="pending" />
        <el-option label="有效" value="valid" />
        <el-option label="无效" value="invalid" />
      </el-select>
      <el-select v-model="coefficientFilter" placeholder="系数" clearable @change="handleFilterChange" class="filter-item">
        <el-option v-for="c in configData.coefficientConfigs" :key="c.id" :label="c.configLabel" :value="c.configValue" />
      </el-select>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
      <el-button :icon="Setting" @click="showConfigDialog">配置管理</el-button>
      <el-button type="success" :disabled="selectedRows.length === 0" @click="batchSetValid">
        批量设为有效
      </el-button>
      <el-button type="danger" :disabled="selectedRows.length === 0" @click="batchSetInvalid">
        批量设为无效
      </el-button>
      <el-dropdown :disabled="selectedRows.length === 0" @command="handleBatchCoefficient">
        <el-button type="warning" :disabled="selectedRows.length === 0">
          批量设置系数 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="c in configData.coefficientConfigs" :key="c.id" :command="c.configValue">
              {{ c.configValue }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown :disabled="selectedRows.length === 0" @command="handleBatchRemark">
        <el-button type="info" :disabled="selectedRows.length === 0">
          批量设置备注 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="r in configData.remarkConfigs" :key="r.id" :command="r.configValue">
              {{ getRemarkLabel(r.configValue) }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- 数据表格 -->
    <el-table
      :data="tableData"
      v-loading="loading"
      stripe
      border
      class="data-table"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column type="index" label="序号" width="60" :index="indexMethod" />
      <el-table-column prop="orderNumber" label="订单号" min-width="140">
        <template #default="{ row }">
          <el-link type="primary" @click="goToOrderDetail(row.id)">{{ row.orderNumber }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户姓名" min-width="100">
        <template #default="{ row }">
          <el-link type="primary" @click="goToCustomerDetail(row.customerId)">{{ row.customerName }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="订单状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="latestLogisticsInfo" label="最新物流动态" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span
            v-if="row.latestLogisticsInfo"
            :style="getLogisticsInfoStyle(row.latestLogisticsInfo)"
            class="logistics-info-text"
          >
            {{ row.latestLogisticsInfo }}
          </span>
          <span v-else class="text-gray-400">暂无物流信息</span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="下单日期" width="110">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="totalAmount" label="订单金额" width="100" align="right">
        <template #default="{ row }">¥{{ formatMoney(row.totalAmount) }}</template>
      </el-table-column>
      <el-table-column prop="createdByDepartmentName" label="部门" width="100" />
      <el-table-column prop="createdByName" label="销售人员" width="90" />
      <el-table-column prop="performanceStatus" label="有效状态" width="120">
        <template #default="{ row }">
          <el-select
            v-model="row.performanceStatus"
            size="small"
            @change="(val: string) => updatePerformance(row, 'performanceStatus', val)"
          >
            <el-option v-for="s in configData.statusConfigs" :key="s.id" :label="getStatusLabel(s.configValue)" :value="s.configValue" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="performanceCoefficient" label="系数" width="100">
        <template #default="{ row }">
          <el-select
            v-model="row.performanceCoefficient"
            size="small"
            @change="(val: number) => updatePerformance(row, 'performanceCoefficient', val)"
          >
            <el-option v-for="c in configData.coefficientConfigs" :key="c.id" :label="c.configValue" :value="parseFloat(c.configValue)" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="performanceRemark" label="备注" width="140">
        <template #default="{ row }">
          <el-select
            v-model="row.performanceRemark"
            size="small"
            allow-create
            filterable
            @change="(val: string) => updatePerformance(row, 'performanceRemark', val)"
          >
            <el-option v-for="r in configData.remarkConfigs" :key="r.id" :label="getRemarkLabel(r.configValue)" :value="r.configValue" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="estimatedCommission" label="预估佣金" width="100" align="right">
        <template #default="{ row }">
          <span class="commission-value">¥{{ formatMoney(row.estimatedCommission || 0) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click="saveRow(row)">保存</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100, 200, 300]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 配置管理弹窗 -->
    <PerformanceConfigDialog v-model:visible="configDialogVisible" @saved="loadConfig" />

    <!-- 物流弹窗 -->
    <LogisticsTraceDialog
      v-model:visible="logisticsDialogVisible"
      :tracking-no="currentTrackingNumber"
      :company-code="currentExpressCompany"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, CircleCheck, Select, TrendCharts, Search, Refresh, Setting, ArrowDown } from '@element-plus/icons-vue'
import { financeApi, type PerformanceOrder, type PerformanceManageStatistics, type FinanceConfigData } from '@/api/finance'
import PerformanceConfigDialog from './components/PerformanceConfigDialog.vue'
import LogisticsTraceDialog from '@/components/Logistics/LogisticsTraceDialog.vue'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { getLogisticsInfoStyle } from '@/utils/logisticsStatusConfig'
import { getDepartmentMembers } from '@/api/department'
import api from '@/utils/request'

const router = useRouter()
const departmentStore = useDepartmentStore()
const userStore = useUserStore()

// 当前用户信息
const currentUser = computed(() => userStore.currentUser)
const currentUserRole = computed(() => currentUser.value?.role || '')
const currentUserId = computed(() => currentUser.value?.id || '')
const currentUserDepartmentId = computed(() => currentUser.value?.departmentId || '')
const currentUserName = computed(() => currentUser.value?.name || '')

// 权限判断
const isAdmin = computed(() => ['super_admin', 'admin', 'customer_service', 'finance'].includes(currentUserRole.value))
const isManager = computed(() => ['department_manager', 'manager'].includes(currentUserRole.value))
const isSales = computed(() => !isAdmin.value && !isManager.value)

// 状态
const loading = ref(false)
const tableData = ref<PerformanceOrder[]>([])
const selectedRows = ref<PerformanceOrder[]>([])
const statistics = reactive<PerformanceManageStatistics>({
  pendingCount: 0,
  processedCount: 0,
  validCount: 0,
  coefficientSum: 0
})

// 配置数据
const configData = reactive<FinanceConfigData>({
  statusConfigs: [],
  coefficientConfigs: [],
  remarkConfigs: [],
  amountLadders: [],
  countLadders: [],
  settings: {}
})

// 筛选条件
const quickDateFilter = ref('thisMonth')
const dateRange = ref<[string, string] | null>(null)
const searchKeyword = ref('')
const departmentFilter = ref('')
const salesPersonFilter = ref('')
const statusFilter = ref('')
const coefficientFilter = ref('')

// 快捷日期选项
const quickDateOptions = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '上周', value: 'lastWeek' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '今年', value: 'thisYear' },
  { label: '全部', value: 'all' }
]

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 部门列表（根据权限过滤）
const filteredDepartments = computed(() => {
  const allDepts = departmentStore.departments
  if (isAdmin.value) {
    return allDepts
  } else if (isManager.value) {
    return allDepts.filter((d: any) => d.id === currentUserDepartmentId.value)
  } else {
    return allDepts.filter((d: any) => d.id === currentUserDepartmentId.value)
  }
})

// 销售人员列表（根据权限过滤）
const allSalesPersons = ref<{ id: string; name: string; departmentId?: string }[]>([])
const filteredSalesPersons = computed(() => {
  if (isAdmin.value) {
    return allSalesPersons.value
  } else if (isManager.value) {
    return allSalesPersons.value.filter(u => u.departmentId === currentUserDepartmentId.value)
  } else {
    return [{ id: currentUserId.value, name: currentUserName.value }]
  }
})

// 弹窗
const configDialogVisible = ref(false)
const logisticsDialogVisible = ref(false)
const currentTrackingNumber = ref('')
const currentExpressCompany = ref('')

// 初始化
onMounted(async () => {
  await departmentStore.fetchDepartments()
  await loadSalesPersons()
  await loadConfig()
  // 根据角色设置默认筛选值
  initDefaultFilters()
  // 默认选择本月
  setThisMonth()
  await loadData()
  await loadStatistics()
})

// 根据角色初始化默认筛选值
const initDefaultFilters = () => {
  if (isAdmin.value) {
    departmentFilter.value = ''
    salesPersonFilter.value = ''
  } else if (isManager.value) {
    departmentFilter.value = currentUserDepartmentId.value
    salesPersonFilter.value = ''
  } else {
    departmentFilter.value = currentUserDepartmentId.value
    salesPersonFilter.value = currentUserId.value
  }
}

// 设置本月日期
const setThisMonth = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  dateRange.value = [formatDateStr(firstDay), formatDateStr(lastDay)]
}

// 加载配置
const loadConfig = async () => {
  try {
    const res = await financeApi.getConfig() as any
    console.log('[PerformanceManage] loadConfig res:', res)

    // 处理不同的响应格式
    if (res && typeof res === 'object') {
      if (res.statusConfigs) {
        Object.assign(configData, res)
      } else if (res.data && res.data.statusConfigs) {
        Object.assign(configData, res.data)
      }
    }
  } catch (e) {
    console.error('[PerformanceManage] loadConfig error:', e)
  }
}

// 加载销售人员列表
// - 管理员：加载全部用户
// - 经理：加载本部门成员
// - 销售员：不需要加载（只能看自己的数据）
const loadSalesPersons = async () => {
  // 销售员不需要加载销售人员列表
  if (isSales.value) {
    return
  }

  try {
    if (isAdmin.value) {
      // 管理员加载全部用户
      const res = (await api.get('/users', { params: { pageSize: 500 } })) as any
      console.log('[PerformanceManage] loadSalesPersons res:', res)
      const users = res?.data?.items || res?.data?.users || res?.items || res?.users || res?.data?.list || res?.list || []
      allSalesPersons.value = users.map((u: any) => ({
        id: u.id,
        name: u.realName || u.name || u.username,
        departmentId: u.departmentId
      }))
      console.log('[PerformanceManage] allSalesPersons:', allSalesPersons.value)
    } else if (isManager.value && currentUserDepartmentId.value) {
      // 经理加载本部门成员
      const res = await getDepartmentMembers(currentUserDepartmentId.value) as any
      const members = res?.data || res || []
      allSalesPersons.value = members.map((m: any) => ({
        id: m.userId || m.id,
        name: m.realName || m.name || m.username,
        departmentId: currentUserDepartmentId.value
      }))
      console.log('[PerformanceManage] 经理加载本部门成员:', allSalesPersons.value)
    }
  } catch (_e) {
    // 静默处理错误
    console.warn('[PerformanceManage] 加载销售人员失败:', _e)
  }
}

// 部门变化时，清空销售人员筛选
const handleDepartmentChange = () => {
  if (!isSales.value) {
    salesPersonFilter.value = ''
  }
  loadData()
  loadStatistics()
}

// 筛选条件变化
const handleFilterChange = () => {
  loadData()
  loadStatistics()
}

// 刷新按钮
const handleRefresh = () => {
  loadData()
  loadStatistics()
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      orderNumber: searchKeyword.value || undefined,
      departmentId: departmentFilter.value || undefined,
      salesPersonId: salesPersonFilter.value || undefined,
      performanceStatus: statusFilter.value || undefined,
      performanceCoefficient: coefficientFilter.value || undefined
    }
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    console.log('[PerformanceManage] loadData params:', params)
    const res = await financeApi.getPerformanceManageList(params)
    console.log('[PerformanceManage] loadData res:', JSON.stringify(res))

    // 响应拦截器返回 response.data.data，即 { list: [], total: 0 }
    const resData = res as any
    if (resData && Array.isArray(resData.list)) {
      // 给没有备注的订单设置默认值"normal"（正常）
      tableData.value = resData.list.map((item: PerformanceOrder) => ({
        ...item,
        performanceRemark: item.performanceRemark || 'normal'
      }))
      pagination.total = resData.total || 0
    } else {
      tableData.value = []
      pagination.total = 0
    }
  } catch (e) {
    console.error('[PerformanceManage] loadData error:', e)
    ElMessage.error('加载数据失败')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStatistics = async () => {
  try {
    const params: any = {}
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    // 传入所有筛选条件
    if (departmentFilter.value) params.departmentId = departmentFilter.value
    if (salesPersonFilter.value) params.salesPersonId = salesPersonFilter.value
    if (statusFilter.value) params.performanceStatus = statusFilter.value
    if (coefficientFilter.value) params.performanceCoefficient = coefficientFilter.value

    const res = (await financeApi.getPerformanceManageStatistics(params)) as any
    console.log('[PerformanceManage] loadStatistics res:', res)

    // 处理不同的响应格式
    if (res && typeof res === 'object') {
      if (res.pendingCount !== undefined) {
        Object.assign(statistics, res)
      } else if (res.data && typeof res.data === 'object') {
        Object.assign(statistics, res.data)
      }
    }
  } catch (e) {
    console.error('[PerformanceManage] loadStatistics error:', e)
  }
}

// 快捷日期点击
const handleQuickDateClick = (val: string) => {
  quickDateFilter.value = val
  const now = new Date()
  let start: Date, end: Date

  switch (val) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'yesterday':
      const yesterday = new Date(now.getTime() - 86400000)
      start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      break
    case 'thisWeek':
      const dayOfWeek = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'lastWeek':
      const lastWeekDay = now.getDay() || 7
      const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay)
      start = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate() - 6)
      end = lastWeekEnd
      break
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31)
      break
    case 'all':
      dateRange.value = null
      pagination.currentPage = 1
      loadData()
      loadStatistics()
      return
    default:
      return
  }

  dateRange.value = [formatDateStr(start), formatDateStr(end)]
  pagination.currentPage = 1
  loadData()
  loadStatistics()
}

// 日期选择变化
const handleDateChange = () => {
  quickDateFilter.value = ''
  loadData()
  loadStatistics()
}

// 分页
const handleSizeChange = () => {
  pagination.currentPage = 1
  loadData()
}

const handlePageChange = () => {
  loadData()
}

// 选择变化
const handleSelectionChange = (rows: PerformanceOrder[]) => {
  selectedRows.value = rows
}

// 序号方法
const indexMethod = (index: number) => {
  return (pagination.currentPage - 1) * pagination.pageSize + index + 1
}

// 更新绩效
const updatePerformance = async (row: PerformanceOrder, field: string, value: any) => {
  try {
    const data: any = {}
    data[field] = value

    // 如果状态改为无效，自动将系数设为0
    if (field === 'performanceStatus' && value === 'invalid') {
      data.performanceCoefficient = 0
      row.performanceCoefficient = 0 // 同步更新UI
    }

    // 传入时间范围，用于计算阶梯佣金
    if (dateRange.value) {
      data.startDate = dateRange.value[0]
      data.endDate = dateRange.value[1]
    }
    await financeApi.updatePerformance(row.id, data)
    ElMessage.success('更新成功')
    loadData()
    loadStatistics()
  } catch (_e) {
    ElMessage.error('更新失败')
  }
}

// 保存行
const saveRow = async (row: PerformanceOrder) => {
  try {
    const data: any = {
      performanceStatus: row.performanceStatus,
      performanceCoefficient: row.performanceCoefficient,
      performanceRemark: row.performanceRemark
    }
    // 传入时间范围，用于计算阶梯佣金
    if (dateRange.value) {
      data.startDate = dateRange.value[0]
      data.endDate = dateRange.value[1]
    }
    await financeApi.updatePerformance(row.id, data)
    ElMessage.success('保存成功')
    loadData()
    loadStatistics()
  } catch (_e) {
    ElMessage.error('保存失败')
  }
}

// 批量设为有效
const batchSetValid = async () => {
  if (selectedRows.value.length === 0) return
  try {
    const data: any = {
      orderIds: selectedRows.value.map(r => r.id),
      performanceStatus: 'valid',
      performanceCoefficient: 1
    }
    // 传入时间范围，用于计算阶梯佣金
    if (dateRange.value) {
      data.startDate = dateRange.value[0]
      data.endDate = dateRange.value[1]
    }
    await financeApi.batchUpdatePerformance(data)
    ElMessage.success('批量更新成功')
    loadData()
    loadStatistics()
  } catch (_e) {
    ElMessage.error('批量更新失败')
  }
}

// 批量设为无效
const batchSetInvalid = async () => {
  if (selectedRows.value.length === 0) return
  try {
    const data: any = {
      orderIds: selectedRows.value.map(r => r.id),
      performanceStatus: 'invalid',
      performanceCoefficient: 0
    }
    // 传入时间范围，用于计算阶梯佣金
    if (dateRange.value) {
      data.startDate = dateRange.value[0]
      data.endDate = dateRange.value[1]
    }
    await financeApi.batchUpdatePerformance(data)
    ElMessage.success('批量更新成功')
    loadData()
    loadStatistics()
  } catch (_e) {
    ElMessage.error('批量更新失败')
  }
}

// 批量设置系数
const handleBatchCoefficient = async (coefficient: string) => {
  if (selectedRows.value.length === 0) return
  try {
    const data: any = {
      orderIds: selectedRows.value.map(r => r.id),
      performanceCoefficient: parseFloat(coefficient)
    }
    if (dateRange.value) {
      data.startDate = dateRange.value[0]
      data.endDate = dateRange.value[1]
    }
    await financeApi.batchUpdatePerformance(data)
    ElMessage.success(`批量设置系数为 ${coefficient} 成功`)
    loadData()
    loadStatistics()
  } catch (_e) {
    ElMessage.error('批量设置系数失败')
  }
}

// 批量设置备注
const handleBatchRemark = async (remark: string) => {
  if (selectedRows.value.length === 0) return
  try {
    const data: any = {
      orderIds: selectedRows.value.map(r => r.id),
      performanceRemark: remark
    }
    if (dateRange.value) {
      data.startDate = dateRange.value[0]
      data.endDate = dateRange.value[1]
    }
    await financeApi.batchUpdatePerformance(data)
    ElMessage.success(`批量设置备注为 ${getRemarkLabel(remark)} 成功`)
    loadData()
    loadStatistics()
  } catch (_e) {
    ElMessage.error('批量设置备注失败')
  }
}

// 显示配置弹窗
const showConfigDialog = () => {
  configDialogVisible.value = true
}

// 跳转
const goToOrderDetail = (id: string) => {
  router.push(`/order/detail/${id}`)
}

const goToCustomerDetail = (id: string) => {
  router.push(`/customer/detail/${id}`)
}

// 物流弹窗
const _showLogisticsDialog = (row: PerformanceOrder) => {
  currentTrackingNumber.value = row.trackingNumber
  currentExpressCompany.value = ''
  logisticsDialogVisible.value = true
}

// 格式化
const formatDate = (date: string) => {
  if (!date) return '-'
  return date.substring(0, 10)
}

const formatDateStr = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatMoney = (val: number | string) => {
  return Number(val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 状态映射
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    shipped: 'warning',
    delivered: 'success',
    completed: 'success'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    shipped: '已发货',
    delivered: '已签收',
    completed: '已完成'
  }
  return map[status] || status
}

// 绩效状态中文映射
const statusLabelMap: Record<string, string> = {
  pending: '待处理',
  valid: '有效',
  invalid: '无效'
}

// 备注中文映射
const remarkLabelMap: Record<string, string> = {
  normal: '正常',
  return: '退货',
  refund: '退款'
}

// 获取状态中文标签
const getStatusLabel = (value: string) => {
  return statusLabelMap[value] || value
}

// 获取备注中文标签
const getRemarkLabel = (value: string) => {
  return remarkLabelMap[value] || value
}
</script>

<style scoped>
.performance-manage-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 120px);
}

.stats-cards {
  margin-bottom: 20px;
}

.stats-row {
  display: flex;
  gap: 16px;
}

.stats-row .stat-card {
  flex: 1;
  min-width: 0;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.pending { background: #fff7e6; color: #fa8c16; }
.stat-icon.processed { background: #e6f7ff; color: #1890ff; }
.stat-icon.valid { background: #f6ffed; color: #52c41a; }
.stat-icon.coefficient { background: #f9f0ff; color: #722ed1; }

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.quick-filters {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.quick-btn-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.quick-btn.active {
  color: #fff;
  background: #409eff;
  border-color: #409eff;
}

.filter-bar {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-date {
  flex: 0 0 25%;
  max-width: 25%;
}

.filter-item {
  flex: 1;
  min-width: 0;
}

.action-bar {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
}

.data-table {
  background: #fff;
  border-radius: 8px;
}

.pagination-wrapper {
  background: #fff;
  padding: 16px;
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: flex-end;
}

.commission-value {
  color: #f5222d;
  font-weight: 500;
}

.logistics-info-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-gray-400 {
  color: #909399;
}
</style>
