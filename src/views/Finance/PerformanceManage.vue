<template>
  <div class="performance-manage-page">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="16">
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.pendingCount }}</div>
              <div class="stat-label">待处理</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-icon processed"><el-icon><CircleCheck /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.processedCount }}</div>
              <div class="stat-label">已处理</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-icon valid"><el-icon><Select /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.validCount }}</div>
              <div class="stat-label">有效单数</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card">
            <div class="stat-icon coefficient"><el-icon><TrendCharts /></el-icon></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.coefficientSum.toFixed(1) }}</div>
              <div class="stat-label">系数合计</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 快捷日期筛选 -->
    <div class="quick-filters">
      <el-radio-group v-model="quickDateFilter" @change="handleQuickDateChange">
        <el-radio-button value="today">今日</el-radio-button>
        <el-radio-button value="yesterday">昨日</el-radio-button>
        <el-radio-button value="thisWeek">本周</el-radio-button>
        <el-radio-button value="lastWeek">上周</el-radio-button>
        <el-radio-button value="thisMonth">本月</el-radio-button>
        <el-radio-button value="lastMonth">上月</el-radio-button>
        <el-radio-button value="thisYear">今年</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
      </el-radio-group>
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
        class="filter-item"
      />
      <el-input
        v-model="searchKeyword"
        placeholder="搜索订单号"
        clearable
        @clear="loadData"
        @keyup.enter="loadData"
        class="filter-item search-input"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="departmentFilter" placeholder="部门" clearable @change="loadData" class="filter-item">
        <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
      </el-select>
      <el-select v-model="salesPersonFilter" placeholder="销售人员" clearable @change="loadData" class="filter-item">
        <el-option v-for="user in salesPersons" :key="user.id" :label="user.name" :value="user.id" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="有效状态" clearable @change="loadData" class="filter-item">
        <el-option label="待处理" value="pending" />
        <el-option label="有效" value="valid" />
        <el-option label="无效" value="invalid" />
      </el-select>
      <el-select v-model="coefficientFilter" placeholder="系数" clearable @change="loadData" class="filter-item">
        <el-option v-for="c in configData.coefficientConfigs" :key="c.id" :label="c.configLabel" :value="c.configValue" />
      </el-select>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Refresh" @click="loadData">刷新</el-button>
      <el-button :icon="Setting" @click="showConfigDialog">配置管理</el-button>
      <el-button type="success" :disabled="selectedRows.length === 0" @click="batchSetValid">
        批量设为有效
      </el-button>
      <el-button type="danger" :disabled="selectedRows.length === 0" @click="batchSetInvalid">
        批量设为无效
      </el-button>
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
      <el-table-column prop="trackingNumber" label="物流单号" min-width="130">
        <template #default="{ row }">
          <el-link v-if="row.trackingNumber" type="primary" @click="showLogisticsDialog(row)">
            {{ row.trackingNumber }}
          </el-link>
          <span v-else>-</span>
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
            <el-option v-for="s in configData.statusConfigs" :key="s.id" :label="s.configLabel" :value="s.configValue" />
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
            <el-option v-for="c in configData.coefficientConfigs" :key="c.id" :label="c.configLabel" :value="parseFloat(c.configValue)" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="performanceRemark" label="备注" width="140">
        <template #default="{ row }">
          <el-select
            v-model="row.performanceRemark"
            size="small"
            clearable
            allow-create
            filterable
            @change="(val: string) => updatePerformance(row, 'performanceRemark', val)"
          >
            <el-option v-for="r in configData.remarkConfigs" :key="r.id" :label="r.configLabel" :value="r.configValue" />
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
import { ElMessage } from 'element-plus'
import { Clock, CircleCheck, Select, TrendCharts, Search, Refresh, Setting } from '@element-plus/icons-vue'
import { financeApi, type PerformanceOrder, type PerformanceManageStatistics, type FinanceConfigData } from '@/api/finance'
import PerformanceConfigDialog from './components/PerformanceConfigDialog.vue'
import LogisticsTraceDialog from '@/components/Logistics/LogisticsTraceDialog.vue'
import { useDepartmentStore } from '@/stores/department'
import api from '@/utils/request'

const router = useRouter()
const departmentStore = useDepartmentStore()

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

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 部门和销售人员列表
const departments = computed(() => departmentStore.departments)
const salesPersons = ref<{ id: string; name: string }[]>([])

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
  setDefaultDateRange()
  await loadData()
  await loadStatistics()
})

// 设置默认日期范围（本月）
const setDefaultDateRange = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  dateRange.value = [formatDateStr(firstDay), formatDateStr(lastDay)]
}

// 加载配置
const loadConfig = async () => {
  try {
    const res = await financeApi.getConfig()
    if (res.data?.success) {
      Object.assign(configData, res.data.data)
    }
  } catch (e) {
    console.error('加载配置失败:', e)
  }
}

// 加载销售人员列表
const loadSalesPersons = async () => {
  try {
    const res = await api.get('/users', { params: { pageSize: 500 } }) as any
    salesPersons.value = (res?.data?.list || res?.list || []).map((u: any) => ({
      id: u.id,
      name: u.name || u.username
    }))
  } catch (_e) {
    console.error('加载销售人员失败:', _e)
  }
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

    const res = await financeApi.getPerformanceManageList(params)
    if (res.data?.success) {
      tableData.value = res.data.data.list
      pagination.total = res.data.data.total
    }
  } catch (_e) {
    ElMessage.error('加载数据失败')
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
    const res = await financeApi.getPerformanceManageStatistics(params)
    if (res.data?.success) {
      Object.assign(statistics, res.data.data)
    }
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

// 快捷日期切换
const handleQuickDateChange = (val: string) => {
  const now = new Date()
  let start: Date, end: Date

  switch (val) {
    case 'today':
      start = end = now
      break
    case 'yesterday':
      start = end = new Date(now.getTime() - 86400000)
      break
    case 'thisWeek':
      const dayOfWeek = now.getDay() || 7
      start = new Date(now.getTime() - (dayOfWeek - 1) * 86400000)
      end = now
      break
    case 'lastWeek':
      const lastWeekDay = now.getDay() || 7
      end = new Date(now.getTime() - lastWeekDay * 86400000)
      start = new Date(end.getTime() - 6 * 86400000)
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
      loadData()
      loadStatistics()
      return
    default:
      return
  }

  dateRange.value = [formatDateStr(start), formatDateStr(end)]
  loadData()
  loadStatistics()
}

// 日期变化
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
    await financeApi.updatePerformance(row.id, data)
    ElMessage.success('更新成功')
    loadStatistics()
  } catch (_e) {
    ElMessage.error('更新失败')
  }
}

// 保存行
const saveRow = async (row: PerformanceOrder) => {
  try {
    await financeApi.updatePerformance(row.id, {
      performanceStatus: row.performanceStatus,
      performanceCoefficient: row.performanceCoefficient,
      performanceRemark: row.performanceRemark
    })
    ElMessage.success('保存成功')
    loadStatistics()
  } catch (_e) {
    ElMessage.error('保存失败')
  }
}

// 批量设为有效
const batchSetValid = async () => {
  if (selectedRows.value.length === 0) return
  try {
    await financeApi.batchUpdatePerformance({
      orderIds: selectedRows.value.map(r => r.id),
      performanceStatus: 'valid',
      performanceCoefficient: 1
    })
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
    await financeApi.batchUpdatePerformance({
      orderIds: selectedRows.value.map(r => r.id),
      performanceStatus: 'invalid',
      performanceCoefficient: 0
    })
    ElMessage.success('批量更新成功')
    loadData()
    loadStatistics()
  } catch (_e) {
    ElMessage.error('批量更新失败')
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
const showLogisticsDialog = (row: PerformanceOrder) => {
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

const formatMoney = (val: number) => {
  return (val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
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

.filter-bar {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-item {
  width: 160px;
}

.search-input {
  width: 200px;
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
</style>
