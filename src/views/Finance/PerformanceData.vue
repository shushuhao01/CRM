<template>
  <div class="performance-data-page">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon shipped"><el-icon><Van /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.shippedCount }}</div>
            <div class="stat-label">发货单数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon delivered"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.deliveredCount }}</div>
            <div class="stat-label">签收单数</div>
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
        <div class="stat-card">
          <div class="stat-icon commission"><el-icon><Money /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ formatMoney(statistics.estimatedCommission) }}</div>
            <div class="stat-label">预估佣金</div>
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
        <el-option label="1.0" value="1.00" />
        <el-option label="0.8" value="0.80" />
        <el-option label="0.5" value="0.50" />
        <el-option label="0" value="0.00" />
      </el-select>
    </div>

    <!-- 数据表格 -->
    <el-table :data="tableData" v-loading="loading" stripe border class="data-table">
      <el-table-column type="selection" width="50" />
      <el-table-column prop="orderNumber" label="订单号" min-width="160">
        <template #default="{ row }">
          <el-link type="primary" class="order-number-link" @click="goToOrderDetail(row.id)">{{ row.orderNumber }}</el-link>
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
      <el-table-column prop="performanceStatus" label="有效状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getPerformanceStatusType(row.performanceStatus)" size="small">
            {{ getPerformanceStatusText(row.performanceStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="performanceCoefficient" label="系数" width="70" align="center">
        <template #default="{ row }">
          <span :class="getCoefficientClass(row.performanceCoefficient)">
            {{ Number(row.performanceCoefficient || 1).toFixed(1) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="performanceRemark" label="备注" min-width="100" show-overflow-tooltip>
        <template #default="{ row }">{{ getRemarkLabel(row.performanceRemark) }}</template>
      </el-table-column>
      <el-table-column prop="estimatedCommission" label="预估佣金" width="100" align="center">
        <template #default="{ row }">
          <span class="commission-value">¥{{ formatMoney(row.estimatedCommission || 0) }}</span>
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
import { ElMessage } from 'element-plus'
import { Van, CircleCheck, Select, TrendCharts, Money, Search } from '@element-plus/icons-vue'
import { financeApi, type PerformanceOrder, type PerformanceDataStatistics } from '@/api/finance'
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
const statistics = reactive<PerformanceDataStatistics>({
  shippedCount: 0,
  deliveredCount: 0,
  validCount: 0,
  coefficientSum: 0,
  estimatedCommission: 0
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
    // 管理员可以看所有部门
    return allDepts
  } else if (isManager.value) {
    // 经理只能看自己的部门
    return allDepts.filter((d: any) => d.id === currentUserDepartmentId.value)
  } else {
    // 销售员只能看自己的部门
    return allDepts.filter((d: any) => d.id === currentUserDepartmentId.value)
  }
})

// 销售人员列表（根据权限过滤）
const allSalesPersons = ref<{ id: string; name: string; departmentId?: string }[]>([])
const filteredSalesPersons = computed(() => {
  if (isAdmin.value) {
    // 管理员可以看所有人
    return allSalesPersons.value
  } else if (isManager.value) {
    // 经理只能看本部门的人
    return allSalesPersons.value.filter(u => u.departmentId === currentUserDepartmentId.value)
  } else {
    // 销售员只能看自己
    return [{ id: currentUserId.value, name: currentUserName.value }]
  }
})

// 物流弹窗
const logisticsDialogVisible = ref(false)
const currentTrackingNumber = ref('')
const currentExpressCompany = ref('')

// 初始化
onMounted(async () => {
  await departmentStore.fetchDepartments()
  await loadSalesPersons()
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
    // 管理员默认不筛选
    departmentFilter.value = ''
    salesPersonFilter.value = ''
  } else if (isManager.value) {
    // 经理默认筛选本部门
    departmentFilter.value = currentUserDepartmentId.value
    salesPersonFilter.value = ''
  } else {
    // 销售员默认筛选自己
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
      const users = res?.data?.items || res?.data?.users || res?.items || res?.users || res?.data?.list || res?.list || []
      allSalesPersons.value = users.map((u: any) => ({
        id: u.id,
        name: u.realName || u.name || u.username,
        departmentId: u.departmentId
      }))
    } else if (isManager.value && currentUserDepartmentId.value) {
      // 经理加载本部门成员
      const res = await getDepartmentMembers(currentUserDepartmentId.value) as any
      const members = res?.data || res || []
      allSalesPersons.value = members.map((m: any) => ({
        id: m.userId || m.id,
        name: m.realName || m.name || m.username,
        departmentId: currentUserDepartmentId.value
      }))
    }
  } catch (_e) {
    // 静默处理错误
    console.warn('[PerformanceData] 加载销售人员失败:', _e)
  }
}

// 部门变化时，清空销售人员筛选
const handleDepartmentChange = () => {
  // 如果选择了部门，清空销售人员筛选（除非是销售员）
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

    console.log('[PerformanceData] loadData params:', params)
    const res = await financeApi.getPerformanceDataList(params)
    console.log('[PerformanceData] loadData res:', JSON.stringify(res))

    // 响应拦截器返回 response.data.data，即 { list: [], total: 0 }
    const resData = res as any
    if (resData && Array.isArray(resData.list)) {
      tableData.value = resData.list
      pagination.total = resData.total || 0
    } else {
      tableData.value = []
      pagination.total = 0
    }
  } catch (e) {
    console.error('[PerformanceData] loadData error:', e)
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

    const res = (await financeApi.getPerformanceDataStatistics(params)) as any
    console.log('[PerformanceData] loadStatistics res:', res)

    // 处理不同的响应格式
    if (res && typeof res === 'object') {
      if (res.shippedCount !== undefined) {
        Object.assign(statistics, res)
      } else if (res.data && typeof res.data === 'object') {
        Object.assign(statistics, res.data)
      }
    }
  } catch (e) {
    console.error('[PerformanceData] loadStatistics error:', e)
  }
}

// 快捷日期点击
const handleQuickDateClick = (val: string) => {
  quickDateFilter.value = val
  const now = new Date()
  let start: Date, end: Date

  switch (val) {
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
    completed: 'success',
    rejected: 'danger',
    rejected_returned: 'warning',
    refunded: 'warning',
    after_sales_created: 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    shipped: '已发货',
    delivered: '已签收',
    completed: '已完成',
    rejected: '拒收',
    rejected_returned: '拒收退回',
    refunded: '已退款',
    after_sales_created: '售后中'
  }
  return map[status] || status
}

const getPerformanceStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info',
    valid: 'success',
    invalid: 'danger'
  }
  return map[status] || 'info'
}

const getPerformanceStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    valid: '有效',
    invalid: '无效'
  }
  return map[status] || status
}

// 备注中文映射
const remarkLabelMap: Record<string, string> = {
  normal: '正常',
  return: '退货',
  refund: '退款'
}

const getRemarkLabel = (value: string) => {
  if (!value) return '-'
  return remarkLabelMap[value] || value
}

const getCoefficientClass = (val: number | string) => {
  const num = Number(val || 0)
  if (num >= 1) return 'coefficient-full'
  if (num >= 0.5) return 'coefficient-half'
  return 'coefficient-zero'
}
</script>

<style scoped>
.performance-data-page {
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

.stat-icon.shipped { background: #e6f7ff; color: #1890ff; }
.stat-icon.delivered { background: #f6ffed; color: #52c41a; }
.stat-icon.valid { background: #fff7e6; color: #fa8c16; }
.stat-icon.coefficient { background: #f9f0ff; color: #722ed1; }
.stat-icon.commission { background: #fff1f0; color: #f5222d; }

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

.coefficient-full { color: #52c41a; font-weight: 600; }
.coefficient-half { color: #fa8c16; font-weight: 600; }
.coefficient-zero { color: #f5222d; font-weight: 600; }

.commission-value {
  color: #f5222d;
  font-weight: 500;
}

.order-number-link {
  white-space: nowrap;
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
