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
      <el-popover
        placement="bottom"
        :width="400"
        trigger="click"
        v-model:visible="batchSearchVisible"
      >
        <template #reference>
          <el-input
            v-model="searchKeyword"
            :placeholder="batchSearchKeywords ? `已输入 ${batchSearchCount} 条` : '批量搜索（点击展开）'"
            clearable
            class="filter-item"
            @clear="clearBatchSearch"
            @keyup.enter="loadData"
            readonly
          >
            <template #prefix><el-icon><Search /></el-icon></template>
            <template #suffix>
              <el-badge v-if="batchSearchCount > 0" :value="batchSearchCount" :max="999" class="batch-badge" />
            </template>
          </el-input>
        </template>
        <div class="batch-search-popover">
          <div class="batch-search-header">
            <span class="batch-search-title">批量搜索</span>
            <span class="batch-search-tip">支持订单号、客户名称、客户电话，一行一个，最多3000条</span>
          </div>
          <el-input
            v-model="batchSearchKeywords"
            type="textarea"
            :rows="8"
            placeholder="请输入搜索内容，一行一个&#10;例如：&#10;ORD202601010001&#10;张三&#10;13800138000"
            class="batch-search-textarea"
          />
          <div class="batch-search-footer">
            <span class="batch-search-count">已输入 {{ batchSearchCount }} 条</span>
            <div class="batch-search-actions">
              <el-button size="small" @click="clearBatchSearch">清空</el-button>
              <el-button size="small" type="primary" @click="applyBatchSearch">搜索</el-button>
            </div>
          </div>
        </div>
      </el-popover>
      <el-select v-model="departmentFilter" placeholder="选择部门" :clearable="isAdmin" :disabled="isSales" @change="handleDepartmentChange" class="filter-item">
        <el-option v-for="dept in filteredDepartments" :key="dept.id" :label="dept.name" :value="dept.id" />
      </el-select>
      <el-select v-model="salesPersonFilter" placeholder="销售人员" :clearable="isAdmin || isManager" :disabled="isSales" filterable @change="handleFilterChange" class="filter-item">
        <el-option v-for="user in filteredSalesPersons" :key="user.id" :label="user.name" :value="user.id" />
      </el-select>
      <el-select v-model="coefficientFilter" placeholder="系数" clearable @change="handleFilterChange" class="filter-item">
        <el-option v-for="c in configData.coefficientConfigs" :key="c.id" :label="c.configLabel" :value="c.configValue" />
      </el-select>
    </div>

    <!-- 操作栏:左侧标签页 + 右侧操作按钮 -->
    <div class="action-bar">
      <div class="action-left">
        <el-tabs v-model="activeStatusTab" @tab-change="handleStatusTabChange" class="status-tabs">
          <el-tab-pane name="pending">
            <template #label>
              <span>待处理 <el-badge :value="statistics.pendingCount" :max="999" class="tab-badge" /></span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="valid">
            <template #label>
              <span>有效 <el-badge :value="statistics.validCount" :max="999" type="success" class="tab-badge tab-badge-valid" /></span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="invalid">
            <template #label>
              <span>无效 <el-badge :value="statistics.invalidCount || 0" :max="999" type="info" class="tab-badge tab-badge-muted" /></span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="all">
            <template #label>
              <span>全部 <el-badge :value="statistics.totalCount || 0" :max="999" type="info" class="tab-badge tab-badge-muted" /></span>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>
      <div class="action-right">
        <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
        <el-button :icon="Setting" @click="showConfigDialog">配置管理</el-button>
        <el-button :icon="Download" :disabled="selectedRows.length === 0" @click="handleExport">
          批量导出
        </el-button>
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
      <el-table-column prop="performanceRemark" label="备注" width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <el-select
            v-model="row.performanceRemark"
            size="small"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入备注"
            @change="(val: string) => updatePerformance(row, 'performanceRemark', val)"
          >
            <!-- 预设备注选项 -->
            <el-option
              v-for="r in configData.remarkConfigs"
              :key="'preset-' + r.id"
              :label="getRemarkLabel(r.configValue)"
              :value="r.configValue"
            />
            <!-- 自定义备注历史记录 -->
            <el-option
              v-for="(customRemark, index) in customRemarkHistory"
              :key="'custom-' + index"
              :value="customRemark"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ customRemark }}</span>
                <el-icon
                  style="color: #f56c6c; cursor: pointer; margin-left: 8px;"
                  @click.stop="removeCustomRemark(customRemark)"
                >
                  <CircleClose />
                </el-icon>
              </div>
            </el-option>
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="estimatedCommission" label="预估佣金" width="120" align="left">
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
        :page-sizes="[10, 20, 50, 100, 200, 500, 1000, 2000, 5000]"
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
import { Clock, CircleCheck, Select, TrendCharts, Search, Refresh, Setting, ArrowDown, Download, CircleClose } from '@element-plus/icons-vue'
import { financeApi, type PerformanceOrder, type PerformanceManageStatistics, type FinanceConfigData } from '@/api/finance'
import PerformanceConfigDialog from './components/PerformanceConfigDialog.vue'
import LogisticsTraceDialog from '@/components/Logistics/LogisticsTraceDialog.vue'
import { eventBus, EventNames } from '@/utils/eventBus'
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
  invalidCount: 0,
  totalCount: 0,
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

// 🔥 自定义备注历史记录（从localStorage加载）
const CUSTOM_REMARK_STORAGE_KEY = 'performance_custom_remarks'
const customRemarkHistory = ref<string[]>([])

// 加载自定义备注历史
const loadCustomRemarkHistory = () => {
  try {
    const stored = localStorage.getItem(CUSTOM_REMARK_STORAGE_KEY)
    if (stored) {
      customRemarkHistory.value = JSON.parse(stored)
    }
  } catch (e) {
    console.error('加载自定义备注历史失败:', e)
    customRemarkHistory.value = []
  }
}

// 保存自定义备注历史
const saveCustomRemarkHistory = () => {
  try {
    localStorage.setItem(CUSTOM_REMARK_STORAGE_KEY, JSON.stringify(customRemarkHistory.value))
  } catch (e) {
    console.error('保存自定义备注历史失败:', e)
  }
}

// 添加自定义备注到历史记录
const addCustomRemarkToHistory = (remark: string) => {
  if (!remark || remark.trim() === '') return

  // 检查是否是预设备注
  const isPreset = configData.remarkConfigs.some(r => r.configValue === remark)
  if (isPreset) return

  // 检查是否已存在
  if (customRemarkHistory.value.includes(remark)) return

  // 添加到历史记录
  customRemarkHistory.value.push(remark)
  saveCustomRemarkHistory()
}

// 删除自定义备注历史记录
const removeCustomRemark = (remark: string) => {
  const index = customRemarkHistory.value.indexOf(remark)
  if (index > -1) {
    customRemarkHistory.value.splice(index, 1)
    saveCustomRemarkHistory()
    ElMessage.success('已删除备注历史记录')
  }
}

// 筛选条件
const quickDateFilter = ref('thisMonth')
const dateRange = ref<[string, string] | null>(null)
const searchKeyword = ref('')
const departmentFilter = ref('')
const salesPersonFilter = ref('')
const statusFilter = ref('')
const coefficientFilter = ref('')

// 批量搜索相关
const batchSearchVisible = ref(false)
const batchSearchKeywords = ref('')
const batchSearchCount = computed(() => {
  if (!batchSearchKeywords.value) return 0
  return batchSearchKeywords.value.split(/[\n,;，；]+/).map(k => k.trim()).filter(k => k.length > 0).length
})

// 状态标签页
const activeStatusTab = ref('pending')

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
  // 🔥 加载自定义备注历史
  loadCustomRemarkHistory()
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
  // 默认显示待处理标签页
  activeStatusTab.value = 'pending'
  statusFilter.value = 'pending'
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

// 清空批量搜索
const clearBatchSearch = () => {
  batchSearchKeywords.value = ''
  searchKeyword.value = ''
  batchSearchVisible.value = false
  loadData()
  loadStatistics()
}

// 应用批量搜索
const applyBatchSearch = () => {
  batchSearchVisible.value = false
  if (batchSearchCount.value > 0) {
    searchKeyword.value = `已输入 ${batchSearchCount.value} 条`
  } else {
    searchKeyword.value = ''
  }
  pagination.currentPage = 1
  loadData()
  loadStatistics()
}

// 刷新按钮
const handleRefresh = () => {
  loadData()
  loadStatistics()
}

// 状态标签页切换
const handleStatusTabChange = (tabName: string) => {
  activeStatusTab.value = tabName
  // 🔥 如果选择"全部"标签页,不传递performanceStatus参数
  statusFilter.value = tabName === 'all' ? '' : tabName
  pagination.currentPage = 1
  loadData()
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      departmentId: departmentFilter.value || undefined,
      salesPersonId: salesPersonFilter.value || undefined,
      performanceStatus: statusFilter.value || undefined,
      performanceCoefficient: coefficientFilter.value || undefined
    }
    if (dateRange.value) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    // 🔥 批量搜索参数
    if (batchSearchKeywords.value && batchSearchCount.value > 0) {
      params.batchKeywords = batchSearchKeywords.value
    }

    console.log('[PerformanceManage] loadData params:', params)
    const res = await financeApi.getPerformanceManageList(params)
    console.log('[PerformanceManage] loadData res:', JSON.stringify(res))

    // 响应拦截器返回 response.data.data，即 { list: [], total: 0 }
    const resData = res as any
    if (resData && Array.isArray(resData.list)) {
      // 🔥 直接使用后端返回的备注值，支持自定义输入
      // 如果备注为空，默认设置为"正常"
      tableData.value = resData.list.map((item: PerformanceOrder) => ({
        ...item,
        // 保留原始备注值，如果为空则默认为"正常"
        performanceRemark: item.performanceRemark || '正常'
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

// 更新绩效
const updatePerformance = async (row: PerformanceOrder, field: string, value: any) => {
  try {
    // 🔥 如果是有效状态字段，验证订单状态
    if (field === 'performanceStatus' && value === 'valid') {
      // 只有已签收(delivered)或已完成(completed)的订单才能设置为有效
      const validOrderStatuses = ['delivered', 'completed']
      if (!validOrderStatuses.includes(row.status)) {
        ElMessage.warning('只有已签收或已完成的订单才能设置为有效')
        // 恢复原值
        row.performanceStatus = row.performanceStatus === 'valid' ? 'pending' : row.performanceStatus
        return
      }
    }

    const data: any = {}
    data[field] = value

    // 🔥 如果是备注字段，添加到自定义历史记录
    if (field === 'performanceRemark' && value) {
      addCustomRemarkToHistory(value)
    }

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
    // 发送绩效更新事件，通知其他页面刷新
    eventBus.emit(EventNames.PERFORMANCE_UPDATED, { type: field, orderIds: [row.id] })
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

    // 🔥 如果有备注，添加到自定义历史记录
    if (row.performanceRemark) {
      addCustomRemarkToHistory(row.performanceRemark)
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
    // 发送绩效更新事件
    eventBus.emit(EventNames.PERFORMANCE_UPDATED, { type: 'save', orderIds: [row.id] })
  } catch (_e) {
    ElMessage.error('保存失败')
  }
}

// 批量设为有效
const batchSetValid = async () => {
  if (selectedRows.value.length === 0) return

  // 🔥 验证所有选中的订单状态
  const validOrderStatuses = ['delivered', 'completed']
  const invalidOrders = selectedRows.value.filter(row => !validOrderStatuses.includes(row.status))

  if (invalidOrders.length > 0) {
    ElMessage.warning(`有 ${invalidOrders.length} 个订单不是已签收或已完成状态，无法设置为有效`)
    return
  }

  try {
    const orderIds = selectedRows.value.map(r => r.id)
    const data: any = {
      orderIds,
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
    // 发送绩效更新事件
    eventBus.emit(EventNames.PERFORMANCE_UPDATED, { type: 'batchValid', orderIds })
  } catch (_e) {
    ElMessage.error('批量更新失败')
  }
}

// 批量设为无效
const batchSetInvalid = async () => {
  if (selectedRows.value.length === 0) return
  try {
    const orderIds = selectedRows.value.map(r => r.id)
    const data: any = {
      orderIds,
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
    // 发送绩效更新事件
    eventBus.emit(EventNames.PERFORMANCE_UPDATED, { type: 'batchInvalid', orderIds })
  } catch (_e) {
    ElMessage.error('批量更新失败')
  }
}

// 批量设置系数
const handleBatchCoefficient = async (coefficient: string) => {
  if (selectedRows.value.length === 0) return
  try {
    const orderIds = selectedRows.value.map(r => r.id)
    const data: any = {
      orderIds,
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
    // 发送绩效更新事件
    eventBus.emit(EventNames.PERFORMANCE_UPDATED, { type: 'batchCoefficient', orderIds })
  } catch (_e) {
    ElMessage.error('批量设置系数失败')
  }
}

// 批量设置备注
const handleBatchRemark = async (remark: string) => {
  if (selectedRows.value.length === 0) return
  try {
    const orderIds = selectedRows.value.map(r => r.id)
    const data: any = {
      orderIds,
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
    // 发送绩效更新事件
    eventBus.emit(EventNames.PERFORMANCE_UPDATED, { type: 'batchRemark', orderIds })
  } catch (_e) {
    ElMessage.error('批量设置备注失败')
  }
}

// 批量导出
const handleExport = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要导出的数据')
    return
  }

  try {
    const XLSX = await import('xlsx')

    // 准备导出数据
    const exportData = selectedRows.value.map((row) => ({
      订单号: row.orderNumber,
      客户姓名: row.customerName,
      订单状态: getStatusText(row.status),
      最新物流动态: row.latestLogisticsInfo || '',
      下单日期: formatDate(row.createdAt),
      订单金额: Number(row.totalAmount || 0),
      部门: row.createdByDepartmentName || '',
      销售人员: row.createdByName || '',
      有效状态: getStatusLabel(row.performanceStatus || ''),
      系数: Number(row.performanceCoefficient || 0),
      备注: getRemarkLabel(row.performanceRemark || ''),
      预估佣金: Number(row.estimatedCommission || 0)
    }))

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 订单号
      { wch: 10 }, // 客户姓名
      { wch: 10 }, // 订单状态
      { wch: 40 }, // 最新物流动态
      { wch: 12 }, // 下单日期
      { wch: 12 }, // 订单金额
      { wch: 12 }, // 部门
      { wch: 10 }, // 销售人员
      { wch: 10 }, // 有效状态
      { wch: 8 },  // 系数
      { wch: 10 }, // 备注
      { wch: 12 }  // 预估佣金
    ]

    XLSX.utils.book_append_sheet(wb, ws, '绩效管理')

    // 生成文件名
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fileName = `绩效管理_${dateStr}.xlsx`

    // 导出
    XLSX.writeFile(wb, fileName)
    ElMessage.success(`成功导出 ${exportData.length} 条数据`)
  } catch (e) {
    console.error('导出失败:', e)
    ElMessage.error('导出失败')
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
  padding: 8px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-left {
  flex: 1;
}

.action-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.status-tabs {
  margin: 0;
}

.status-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.status-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.status-tabs :deep(.el-tabs__item) {
  padding: 0 16px;
  height: 36px;
  line-height: 36px;
}

.tab-badge {
  margin-left: 4px;
}

.tab-badge :deep(.el-badge__content) {
  font-size: 11px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
}

.tab-badge-muted :deep(.el-badge__content) {
  background-color: #c0c4cc !important;
  opacity: 0.7;
}

.tab-badge-valid :deep(.el-badge__content) {
  background-color: #95d475 !important;
}

.order-number-link {
  white-space: nowrap;
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

/* 批量搜索弹窗样式 */
.batch-search-popover {
  padding: 0;
}

.batch-search-header {
  margin-bottom: 12px;
}

.batch-search-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: block;
  margin-bottom: 4px;
}

.batch-search-tip {
  font-size: 12px;
  color: #909399;
}

.batch-search-textarea {
  margin-bottom: 12px;
}

.batch-search-textarea :deep(.el-textarea__inner) {
  font-family: monospace;
  line-height: 1.6;
}

.batch-search-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-search-count {
  font-size: 12px;
  color: #909399;
}

.batch-search-actions {
  display: flex;
  gap: 8px;
}

.batch-badge {
  margin-left: 4px;
}

.batch-badge :deep(.el-badge__content) {
  font-size: 10px;
}
</style>
