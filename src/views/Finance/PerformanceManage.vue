，<template>
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
              <el-popover
                v-if="missingKeywords.length > 0"
                placement="bottom"
                :width="360"
                trigger="hover"
              >
                <template #reference>
                  <span class="missing-count-tag">缺{{ missingKeywords.length }}</span>
                </template>
                <div class="missing-popover">
                  <div class="missing-popover-header">
                    <span>以下 <b>{{ missingKeywords.length }}</b> 条未匹配到结果</span>
                    <el-button type="primary" link size="small" @click="copyMissingKeywords">
                      <el-icon><DocumentCopy /></el-icon> 一键复制
                    </el-button>
                  </div>
                  <div class="missing-popover-list">
                    <div v-for="(kw, idx) in missingKeywords" :key="idx" class="missing-item">
                      <span class="missing-item-text">{{ kw }}</span>
                    </div>
                  </div>
                </div>
              </el-popover>
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
        <el-button :icon="Download" :loading="exportByFilterLoading" @click="handleExportByFilter">
          导出筛选结果
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
            :model-value="normalizeStatus(row.performanceStatus)"
            size="small"
            @change="(val: string) => updatePerformance(row, 'performanceStatus', val)"
          >
            <el-option v-for="s in standardStatusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="performanceCoefficient" label="系数" width="100">
        <template #default="{ row }">
          <el-select
            v-model="row.performanceCoefficient"
            size="small"
            @change="(val: number) => updatePerformance(row, 'performanceCoefficient', val)"
            @blur="() => handleCoefficientBlur(row)"
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
            @blur="() => handleRemarkBlur(row)"
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
      <!-- 操作日志列：默认显示最新一条，点击可查看历史 -->
      <el-table-column label="操作日志" min-width="280">
        <template #default="{ row }">
          <div v-if="latestLogs[row.id]" class="op-log-cell">
            <div class="op-log-line1">
              <el-tag
                :type="getOpTagType(latestLogs[row.id].operationType)"
                size="small"
                effect="light"
              >
                {{ perfOpLabels[latestLogs[row.id].operationType] || latestLogs[row.id].operationType }}
              </el-tag>
              <span class="op-log-text" :title="latestLogs[row.id].operationContent">
                {{ latestLogs[row.id].operationContent }}
              </span>
            </div>
            <div class="op-log-line2">
              <span class="op-log-operator">
                <el-icon><User /></el-icon>{{ latestLogs[row.id].operatorName || '系统' }}
              </span>
              <span class="op-log-time">{{ formatLogTime(latestLogs[row.id].createdAt) }}</span>
              <el-button type="primary" link size="small" @click="showOperationLogDialog(row)">查看历史</el-button>
            </div>
          </div>
          <div v-else class="op-log-cell">
            <div class="op-log-line1">
              <span class="text-muted">暂无记录</span>
            </div>
            <div class="op-log-line2">
              <el-button type="primary" link size="small" @click="showOperationLogDialog(row)">查看历史</el-button>
            </div>
          </div>
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

    <!-- 操作日志弹窗（分页查看历史记录） -->
    <el-dialog
      v-model="opLogDialog.visible"
      title="操作日志"
      width="960px"
      class="op-log-dialog"
      destroy-on-close
    >
      <template #header>
        <div class="op-log-dialog-header">
          <el-icon class="op-log-dialog-icon"><DocumentCopy /></el-icon>
          <span class="op-log-dialog-title">操作日志</span>
          <el-tag v-if="opLogDialog.orderNumber" size="default" type="info" effect="plain" class="op-log-dialog-tag">
            订单：{{ opLogDialog.orderNumber }}
          </el-tag>
        </div>
      </template>

      <el-table
        :data="opLogDialog.list"
        v-loading="opLogDialog.loading"
        stripe
        border
        class="op-log-table"
      >
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="操作类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getOpTagType(row.operationType)" size="small" effect="light">
              {{ perfOpLabels[row.operationType] || row.operationType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作内容" min-width="260">
          <template #default="{ row }">
            <span class="op-log-detail-content">{{ row.operationContent }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="110" align="center">
          <template #default="{ row }">
            <span class="op-log-detail-operator">{{ row.operatorName || '系统' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作时间" width="180" align="center">
          <template #default="{ row }">
            <span class="op-log-detail-time">{{ formatLogTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="op-log-dialog-footer">
        <el-pagination
          v-model:current-page="opLogDialog.page"
          v-model:page-size="opLogDialog.pageSize"
          :total="opLogDialog.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadOperationLogs"
          @current-change="loadOperationLogs"
          background
        />
      </div>

      <template #footer>
        <el-button @click="opLogDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, CircleCheck, Select, TrendCharts, Search, Refresh, Setting, ArrowDown, Download, CircleClose, DocumentCopy, User } from '@element-plus/icons-vue'
import { financeApi, type PerformanceOrder, type PerformanceManageStatistics, type FinanceConfigData } from '@/api/finance'
import PerformanceConfigDialog from './components/PerformanceConfigDialog.vue'
import LogisticsTraceDialog from '@/components/Logistics/LogisticsTraceDialog.vue'
import { eventBus, EventNames } from '@/utils/eventBus'
import { useDepartmentStore } from '@/stores/department'
import { useUserStore } from '@/stores/user'
import { getLogisticsInfoStyle } from '@/utils/logisticsStatusConfig'
import { getOrderStatusText as getUnifiedOrderStatusText, getOrderStatusTagType as getUnifiedOrderStatusTagType } from '@/utils/orderStatusConfig'
// getDepartmentMembers 需要 admin 权限，经理改用 /users/department-members
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

// 操作日志：列表中每个订单的最新一条记录
const latestLogs = ref<Record<string, any>>({})

// 操作类型标签映射
const perfOpLabels = financeApi.performanceOperationTypeLabels

// 操作日志弹窗状态
const opLogDialog = reactive({
  visible: false,
  loading: false,
  orderId: '' as string,
  orderNumber: '' as string,
  list: [] as any[],
  total: 0,
  page: 1,
  pageSize: 10
})
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

// 🔥 备注字段失去焦点时的处理（备用触发方式）
// 用于处理 allow-create 模式下 @change 事件可能不触发的情况
const remarkBlurTimers = new Map<string, number>()
const handleRemarkBlur = (row: PerformanceOrder) => {
  // 清除之前的定时器
  const existingTimer = remarkBlurTimers.get(row.id)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  // 延迟执行，避免与 @change 事件冲突
  const timer = window.setTimeout(() => {
    // 如果备注值存在且不为空，触发更新
    if (row.performanceRemark && row.performanceRemark.trim() !== '') {
      console.log('[PerformanceManage] handleRemarkBlur triggered for order:', row.id, 'remark:', row.performanceRemark)
      // 不显示成功消息，避免重复提示
      updatePerformanceQuietly(row, 'performanceRemark', row.performanceRemark)
    }
    remarkBlurTimers.delete(row.id)
  }, 300)

  remarkBlurTimers.set(row.id, timer)
}

// 🔥 系数字段失去焦点时的处理（备用触发方式）
const coefficientBlurTimers = new Map<string, number>()
const handleCoefficientBlur = (row: PerformanceOrder) => {
  // 清除之前的定时器
  const existingTimer = coefficientBlurTimers.get(row.id)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  // 延迟执行，避免与 @change 事件冲突
  const timer = window.setTimeout(() => {
    // 如果系数值存在，触发更新
    if (row.performanceCoefficient !== undefined && row.performanceCoefficient !== null) {
      console.log('[PerformanceManage] handleCoefficientBlur triggered for order:', row.id, 'coefficient:', row.performanceCoefficient)
      // 不显示成功消息，避免重复提示
      updatePerformanceQuietly(row, 'performanceCoefficient', row.performanceCoefficient)
    }
    coefficientBlurTimers.delete(row.id)
  }, 300)

  coefficientBlurTimers.set(row.id, timer)
}

// 🔥 静默更新绩效（不显示成功消息，用于 blur 事件）
const updatePerformanceQuietly = async (row: PerformanceOrder, field: string, value: any) => {
  try {
    // 🔥 如果是有效状态字段，验证订单状态
    if (field === 'performanceStatus' && value === 'valid') {
      // 只有已签收(delivered)或已完成(completed)的订单才能设置为有效
      const validOrderStatuses = ['delivered', 'completed']
      if (!validOrderStatuses.includes(row.status)) {
        return // 静默失败，不显示警告
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

    console.log('[PerformanceManage] updatePerformanceQuietly API call:', row.id, data)
    await financeApi.updatePerformance(row.id, data)
    // 不显示成功消息
    loadData()
    loadStatistics()
    // 发送绩效更新事件，通知其他页面刷新
    eventBus.emit(EventNames.PERFORMANCE_UPDATED, { type: field, orderIds: [row.id] })
  } catch (e) {
    console.error('[PerformanceManage] updatePerformanceQuietly error:', e)
    // 静默失败，不显示错误消息
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

// 🔥 搜索缺失关键词
const missingKeywords = ref<string[]>([])

// 🔥 计算缺失的搜索关键词（在loadData后调用）
const computeMissingKeywords = () => {
  if (!batchSearchKeywords.value || batchSearchCount.value === 0) {
    missingKeywords.value = []
    return
  }
  const keywords = batchSearchKeywords.value.split(/[\n,;，；]+/).map(k => k.trim()).filter(k => k.length > 0)
  const missing: string[] = []
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase()
    const found = tableData.value.some(row =>
      (row.orderNumber && row.orderNumber.toLowerCase().includes(kwLower)) ||
      (row.customerName && row.customerName.toLowerCase().includes(kwLower)) ||
      (row.trackingNumber && row.trackingNumber.toLowerCase().includes(kwLower))
    )
    if (!found) missing.push(kw)
  }
  missingKeywords.value = missing
}

// 🔥 一键复制缺失关键词
const copyMissingKeywords = async () => {
  if (missingKeywords.value.length === 0) return
  try {
    await navigator.clipboard.writeText(missingKeywords.value.join('\n'))
    ElMessage.success(`已复制 ${missingKeywords.value.length} 条缺失内容`)
  } catch {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = missingKeywords.value.join('\n')
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success(`已复制 ${missingKeywords.value.length} 条缺失内容`)
  }
}

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
      // 经理加载本部门成员 - 使用不需要管理员权限的接口
      const res = (await api.get('/users/department-members')) as any
      const members = res?.data || res || []
      allSalesPersons.value = members.map((m: any) => ({
        id: m.userId || m.id,
        name: m.realName || m.name || m.username,
        departmentId: m.departmentId || currentUserDepartmentId.value
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
  missingKeywords.value = []
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

    // 🔥 计算缺失的搜索关键词
    computeMissingKeywords()

    // 加载列表中订单的最新操作日志
    await loadLatestLogs()
  } catch (e) {
    console.error('[PerformanceManage] loadData error:', e)
    ElMessage.error('加载数据失败')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 批量加载列表中订单的最新操作日志
const loadLatestLogs = async () => {
  if (tableData.value.length === 0) {
    latestLogs.value = {}
    return
  }
  try {
    const orderIds = tableData.value.map(o => o.id)
    const res = await financeApi.getLatestPerformanceOperationLogs(orderIds) as any
    // 响应拦截器已提取内层 data，res 即为 { orderId: log, ... }
    latestLogs.value = res || {}
  } catch (e) {
    console.error('加载操作日志失败:', e)
  }
}

// 打开操作日志弹窗
const showOperationLogDialog = (row: PerformanceOrder) => {
  opLogDialog.orderId = row.id
  opLogDialog.orderNumber = row.orderNumber || ''
  opLogDialog.page = 1
  opLogDialog.pageSize = 10
  opLogDialog.list = []
  opLogDialog.total = 0
  opLogDialog.visible = true
  loadOperationLogs()
}

// 分页加载历史操作日志
const loadOperationLogs = async () => {
  if (!opLogDialog.orderId) return
  opLogDialog.loading = true
  try {
    const res = await financeApi.getPerformanceOperationLogs(opLogDialog.orderId, {
      page: opLogDialog.page,
      pageSize: opLogDialog.pageSize
    }) as any
    // 响应拦截器已提取内层 data，res 即为 { list, total, page, pageSize }
    const data = res || {}
    opLogDialog.list = data.list || []
    opLogDialog.total = data.total || 0
  } catch (e) {
    console.error('加载历史操作日志失败:', e)
    ElMessage.error('加载操作日志失败')
  } finally {
    opLogDialog.loading = false
  }
}

// 获取操作类型的标签颜色
const getOpTagType = (type: string): string => {
  switch (type) {
    case 'status_change': return 'warning'
    case 'coefficient_change': return 'danger'
    case 'remark_change': return 'info'
    default: return 'info'
  }
}

// 格式化操作时间（北京时间格式）
const formatLogTime = (time: string): string => {
  if (!time) return '-'
  try {
    const d = new Date(time)
    const beijing = new Date(d.getTime() + (d.getTimezoneOffset() + 8 * 60) * 60000)
    const y = beijing.getFullYear()
    const m = String(beijing.getMonth() + 1).padStart(2, '0')
    const day = String(beijing.getDate()).padStart(2, '0')
    const h = String(beijing.getHours()).padStart(2, '0')
    const min = String(beijing.getMinutes()).padStart(2, '0')
    const s = String(beijing.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}:${s}`
  } catch {
    return time
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

// 🔥 导出行数据映射（批量导出与导出筛选结果共用，保证格式完全一致）
const buildPerfExportRows = (rows: PerformanceOrder[], logsMap: Record<string, any>) => {
  return rows.map((row) => ({
    订单号: row.orderNumber,
    客户姓名: row.customerName,
    订单状态: getStatusText(row.status),
    最新物流动态: row.latestLogisticsInfo || '',
    下单日期: formatDate(row.createdAt),
    订单金额: Number(row.totalAmount || 0),
    部门: row.createdByDepartmentName || '',
    销售人员: row.createdByName || '',
    有效状态: getStatusLabel(normalizeStatus(row.performanceStatus || '')),
    系数: Number(row.performanceCoefficient || 0),
    备注: getRemarkLabel(row.performanceRemark || ''),
    预估佣金: Number(row.estimatedCommission || 0),
    操作日志: logsMap[row.id] ? `${perfOpLabels[logsMap[row.id].operationType] || logsMap[row.id].operationType}：${logsMap[row.id].operationContent}（${logsMap[row.id].operatorName || '系统'} ${formatLogTime(logsMap[row.id].createdAt)}）` : ''
  }))
}

// 🔥 写出Excel文件（批量导出与导出筛选结果共用，保证列宽排版一致）
const writePerfExportFile = (XLSX: any, exportData: Record<string, unknown>[]) => {
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
    { wch: 12 }, // 预估佣金
    { wch: 40 }  // 操作日志
  ]

  XLSX.utils.book_append_sheet(wb, ws, '绩效管理')

  // 生成文件名
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const fileName = `绩效管理_${dateStr}.xlsx`

  // 导出
  XLSX.writeFile(wb, fileName)
}

// 批量导出
const handleExport = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要导出的数据')
    return
  }

  try {
    const XLSX = await import('xlsx')
    const exportData = buildPerfExportRows(selectedRows.value, latestLogs.value)
    writePerfExportFile(XLSX, exportData)
    ElMessage.success(`成功导出 ${exportData.length} 条数据`)
  } catch (e) {
    console.error('导出失败:', e)
    ElMessage.error('导出失败')
  }
}

// 🔥 按当前筛选条件导出（不受翻页限制，自动分批拉取全部命中数据）
const exportByFilterLoading = ref(false)
const handleExportByFilter = async () => {
  if (exportByFilterLoading.value) return
  exportByFilterLoading.value = true

  // 🔥 全屏进度提示：分批拉取耗时较长，避免用户以为"没反应"
  const { ElLoading } = await import('element-plus')
  const loadingInstance = ElLoading.service({ lock: true, text: '正在按筛选条件拉取数据，请稍候...' })
  try {
    const XLSX = await import('xlsx')

    // 构建与 loadData 一致的筛选参数（不含分页）
    const baseParams: any = {
      departmentId: departmentFilter.value || undefined,
      salesPersonId: salesPersonFilter.value || undefined,
      performanceStatus: statusFilter.value || undefined,
      performanceCoefficient: coefficientFilter.value || undefined
    }
    if (dateRange.value) {
      baseParams.startDate = dateRange.value[0]
      baseParams.endDate = dateRange.value[1]
    }
    if (batchSearchKeywords.value && batchSearchCount.value > 0) {
      baseParams.batchKeywords = batchSearchKeywords.value
    }

    // 分批拉取全部命中数据（每批300条，上限20000条防止误操作）
    const EXPORT_BATCH_SIZE = 300
    const EXPORT_MAX_ROWS = 20000
    const allRows: PerformanceOrder[] = []
    let page = 1
    let total = 0
    do {
      const res = await financeApi.getPerformanceManageList({ ...baseParams, page, pageSize: EXPORT_BATCH_SIZE }) as any
      const list = Array.isArray(res?.list) ? res.list : []
      total = res?.total || 0
      if (list.length === 0) break
      // 与列表加载一致：空备注默认为"正常"
      allRows.push(...list.map((item: PerformanceOrder) => ({
        ...item,
        performanceRemark: item.performanceRemark || '正常'
      })))
      loadingInstance.setText(`正在拉取数据：${allRows.length}/${Math.min(total, EXPORT_MAX_ROWS)} 条...`)
      page++
    } while (allRows.length < total && allRows.length < EXPORT_MAX_ROWS && page <= Math.ceil(EXPORT_MAX_ROWS / EXPORT_BATCH_SIZE))

    if (allRows.length === 0) {
      ElMessage.warning('当前筛选条件下没有可导出的数据')
      return
    }

    // 分批加载操作日志（与批量导出的"操作日志"列保持一致）
    const logsMap: Record<string, any> = {}
    const LOG_BATCH_SIZE = 100
    for (let i = 0; i < allRows.length; i += LOG_BATCH_SIZE) {
      const batchIds = allRows.slice(i, i + LOG_BATCH_SIZE).map(o => o.id)
      try {
        const res = await financeApi.getLatestPerformanceOperationLogs(batchIds) as any
        Object.assign(logsMap, res || {})
      } catch (e) {
        console.error('加载导出操作日志失败:', e)
      }
    }

    loadingInstance.setText(`正在生成Excel文件（共 ${allRows.length} 条）...`)
    const exportData = buildPerfExportRows(allRows, logsMap)
    writePerfExportFile(XLSX, exportData)
    if (total > allRows.length) {
      ElMessage.warning(`已导出前 ${allRows.length} 条（共命中 ${total} 条，超出单次导出上限），请缩小筛选范围后分次导出`)
    } else {
      ElMessage.success(`成功导出 ${allRows.length} 条数据`)
    }
  } catch (e) {
    console.error('导出筛选结果失败:', e)
    ElMessage.error('导出筛选结果失败')
  } finally {
    loadingInstance.close()
    exportByFilterLoading.value = false
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
  return getUnifiedOrderStatusTagType(status)
}

const getStatusText = (status: string) => {
  return getUnifiedOrderStatusText(status)
}

// 绩效状态中文映射
const statusLabelMap: Record<string, string> = {
  pending: '待处理',
  valid: '有效',
  invalid: '无效',
  // 兼容数据库中可能存在的中文值
  '待处理': '待处理',
  '有效': '有效',
  '无效': '无效'
}

// 标准有效状态选项（统一使用英文键名作为value，显示中文label）
const standardStatusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'valid', label: '有效' },
  { value: 'invalid', label: '无效' }
]

// 将数据库中可能存在的中文状态值标准化为英文键名
const normalizeStatus = (value: string): string => {
  const reverseMap: Record<string, string> = {
    '待处理': 'pending',
    '有效': 'valid',
    '无效': 'invalid'
  }
  return reverseMap[value] || value || 'pending'
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

.missing-count-tag {
  display: inline-block;
  font-size: 11px;
  color: #909399;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 4px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    color: #e6a23c;
    background: #fdf6ec;
  }
}

.missing-popover {
  max-height: 300px;
  overflow-y: auto;
}

.missing-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  color: #606266;
  b { font-weight: 700; color: #e6a23c; }
}

.missing-popover-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.missing-item {
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  word-break: break-all;
}

/* ========== 操作日志列样式 ========== */
.op-log-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
  line-height: 1.5;
}

.op-log-line1 {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.op-log-line1 .el-tag {
  flex-shrink: 0;
}

.op-log-text {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.op-log-line2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #909399;
}

.op-log-operator {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.op-log-time {
  color: #b1b3b8;
  flex-shrink: 0;
}

.op-log-line2 .el-button {
  margin-left: auto;
  padding: 0;
}

.text-muted {
  color: #c0c4cc;
  font-size: 13px;
}

/* ========== 操作日志弹窗样式 ========== */
.op-log-dialog .op-log-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.op-log-dialog-icon {
  font-size: 20px;
  color: #409eff;
}

.op-log-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.op-log-dialog-tag {
  margin-left: 4px;
}

.op-log-table {
  margin-bottom: 16px;
}

.op-log-detail-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}

.op-log-detail-operator {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.op-log-detail-time {
  font-size: 13px;
  color: #909399;
  font-family: 'Courier New', monospace;
}

.op-log-dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
