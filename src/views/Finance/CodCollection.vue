<template>
  <div class="cod-collection-page">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon today"><el-icon><Coin /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">¥{{ formatMoney(stats.todayCod) }}</div>
          <div class="stat-label">{{ getStatLabel('today') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon month"><el-icon><Calendar /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">¥{{ formatMoney(stats.monthCod) }}</div>
          <div class="stat-label">{{ getStatLabel('month') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon cancelled"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">¥{{ formatMoney(stats.cancelledCod) }}</div>
          <div class="stat-label">已改代收</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon returned"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">¥{{ formatMoney(stats.returnedCod) }}</div>
          <div class="stat-label">已返款</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">¥{{ formatMoney(stats.pendingCod) }}</div>
          <div class="stat-label">未返款</div>
        </div>
      </div>
    </div>

    <!-- 快捷日期筛选 -->
    <div class="quick-filters">
      <div class="quick-btn-group">
        <button v-for="item in quickDateOptions" :key="item.value"
          :class="['quick-btn', { active: quickDateFilter === item.value }]"
          @click="handleQuickDateClick(item.value)">{{ item.label }}</button>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filter-bar">
      <el-popover placement="bottom" :width="400" trigger="click" v-model:visible="batchSearchVisible">
        <template #reference>
          <el-input v-model="searchKeyword" :placeholder="batchSearchKeywords ? `已输入 ${batchSearchCount} 条` : '批量搜索'"
            clearable class="filter-search" @clear="clearBatchSearch" readonly>
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </template>
        <div class="batch-search-popover">
          <div class="batch-search-header">
            <span class="batch-search-title">批量搜索</span>
            <span class="batch-search-tip">支持订单号、手机号、客户名称、物流单号，一行一个</span>
          </div>
          <el-input v-model="batchSearchKeywords" type="textarea" :rows="6" placeholder="一行一个" />
          <div class="batch-search-footer">
            <span>已输入 {{ batchSearchCount }} 条</span>
            <div><el-button size="small" @click="clearBatchSearch">清空</el-button>
            <el-button size="small" type="primary" @click="applyBatchSearch">搜索</el-button></div>
          </div>
        </div>
      </el-popover>
      <el-date-picker v-model="startDate" type="date" placeholder="开始日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" @change="handleDateChange" class="filter-date" />
      <span class="date-separator">至</span>
      <el-date-picker v-model="endDate" type="date" placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" @change="handleDateChange" class="filter-date" />
      <el-select v-model="departmentFilter" placeholder="部门" clearable @change="handleDepartmentChange" class="filter-item">
        <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
      </el-select>
      <el-select v-model="salesPersonFilter" placeholder="销售人员" clearable filterable @change="handleFilterChange" class="filter-item">
        <el-option v-for="u in salesUsers" :key="u.id" :label="u.name" :value="u.id" />
      </el-select>
      <el-select v-model="orderStatusFilter" placeholder="订单状态" clearable @change="handleFilterChange" class="filter-item">
        <el-option label="已发货" value="shipped" /><el-option label="已签收" value="delivered" />
        <el-option label="已完成" value="completed" /><el-option label="拒收" value="rejected" />
      </el-select>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="status-tabs">
          <el-tab-pane name="pending" label="待处理" />
          <el-tab-pane name="returned" label="已返款" />
          <el-tab-pane name="cancelled" label="已改代收" />
          <el-tab-pane name="all" label="全部" />
        </el-tabs>
      </div>
      <div class="action-right">
        <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
        <el-button :icon="Download" :disabled="selectedRows.length === 0" @click="handleExport">批量导出</el-button>
        <el-button :icon="Edit" :disabled="selectedRows.length === 0" @click="showBatchCodDialog">批量改代收</el-button>
        <el-button type="success" :icon="Check" :disabled="selectedRows.length === 0" @click="handleBatchReturn">批量改返款</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table :data="tableData" v-loading="loading" stripe border class="data-table" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" />
      <el-table-column prop="orderNumber" label="订单号" min-width="160">
        <template #default="{ row }"><el-link type="primary" @click="goToOrderDetail(row.id)">{{ row.orderNumber }}</el-link></template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户姓名" min-width="100">
        <template #default="{ row }"><el-link type="primary" @click="goToCustomerDetail(row.customerId)">{{ row.customerName }}</el-link></template>
      </el-table-column>
      <el-table-column prop="status" label="订单状态" width="90">
        <template #default="{ row }"><el-tag :type="getOrderStatusType(row.status)" size="small">{{ getOrderStatusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="finalAmount" label="订单金额" width="100" align="right">
        <template #default="{ row }">¥{{ formatMoney(row.finalAmount) }}</template>
      </el-table-column>
      <el-table-column prop="codAmount" label="代收金额" width="110" align="right">
        <template #default="{ row }"><span class="cod-amount">¥{{ formatMoney(row.codAmount) }}</span></template>
      </el-table-column>
      <el-table-column prop="codStatus" label="代收状态" width="100">
        <template #default="{ row }"><el-tag :type="getCodStatusType(row)" size="small">{{ getCodStatusText(row) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="salesPersonName" label="销售人员" width="90" />
      <el-table-column prop="trackingNumber" label="物流单号" min-width="150">
        <template #default="{ row }">
          <el-link v-if="row.trackingNumber" type="primary" @click="showTrackingDialog(row)">{{ row.trackingNumber }}</el-link>
          <span v-else class="no-data">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="latestLogisticsInfo" label="最新物流动态" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <div v-if="row.latestLogisticsInfo" class="logistics-info" :style="getLogisticsInfoStyle(row.latestLogisticsInfo)">{{ row.latestLogisticsInfo }}</div>
          <span v-else class="no-data">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="下单时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showDetailDialog(row)">详情</el-button>
          <el-button
            type="warning"
            link
            size="small"
            @click="showCodDialog(row)"
            :disabled="row.codStatus === 'returned' || row.codStatus === 'cancelled'"
          >改代收</el-button>
          <el-button
            type="success"
            link
            size="small"
            @click="handleReturn(row)"
            :disabled="row.codStatus === 'returned' || row.codStatus === 'cancelled'"
          >返款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 30, 50, 100, 300, 500, 1000, 3000]" :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange" @current-change="handlePageChange" />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="代收订单详情" width="700px">
      <el-descriptions :column="2" border v-if="currentOrder">
        <el-descriptions-item label="订单号">{{ currentOrder.orderNumber }}</el-descriptions-item>
        <el-descriptions-item label="客户姓名">{{ currentOrder.customerName }}</el-descriptions-item>
        <el-descriptions-item label="订单金额">¥{{ formatMoney(currentOrder.finalAmount) }}</el-descriptions-item>
        <el-descriptions-item label="代收金额"><span class="cod-amount">¥{{ formatMoney(currentOrder.codAmount) }}</span></el-descriptions-item>
        <el-descriptions-item label="代收状态"><el-tag :type="getCodStatusType(currentOrder)" size="small">{{ getCodStatusText(currentOrder) }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="已返款金额">¥{{ formatMoney(currentOrder.codReturnedAmount) }}</el-descriptions-item>
        <el-descriptions-item label="销售人员">{{ currentOrder.salesPersonName }}</el-descriptions-item>
        <el-descriptions-item label="物流单号">{{ currentOrder.trackingNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="发货时间">{{ formatDateTime(currentOrder.shippedAt) }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ formatDateTime(currentOrder.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="最新物流" :span="2">{{ currentOrder.latestLogisticsInfo || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 修改代收弹窗 -->
    <el-dialog v-model="codDialogVisible" :title="isBatchCod ? '批量修改代收' : '修改代收金额'" width="450px">
      <el-form :model="codForm" label-width="120px">
        <el-form-item label="原始代收金额" v-if="!isBatchCod && currentOrder">
          <span style="color: #909399;">¥{{ formatMoney((currentOrder.totalAmount || 0) - (currentOrder.depositAmount || 0)) }}</span>
        </el-form-item>
        <el-form-item label="当前代收金额" v-if="!isBatchCod && currentOrder">
          <span style="color: #e6a23c; font-weight: 600;">¥{{ formatMoney(currentOrder.codAmount) }}</span>
          <span v-if="hasModifiedCod(currentOrder)" style="color: #f56c6c; font-size: 12px; margin-left: 8px;">（已改代收）</span>
        </el-form-item>
        <el-form-item label="快递员代收金额">
          <el-input-number
            v-model="codForm.codAmount"
            :min="0"
            :max="isBatchCod ? undefined : (currentOrder?.codAmount || 0)"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
          <el-alert
            v-if="!isBatchCod"
            :title="codForm.codAmount === 0 ? '⚠️ 修改为0元表示客户已全部付款，修改后将不能再改代收和返款！' : `修改的金额不能大于当前代收金额¥${formatMoney(currentOrder?.codAmount || 0)}`"
            :type="codForm.codAmount === 0 ? 'error' : 'info'"
            :closable="false"
            style="margin-top: 8px;"
          />
          <div v-else style="font-size: 12px; color: #909399; margin-top: 4px;">
            默认为0元，表示客户已直接付款
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="codForm.codRemark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="codDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCodSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 物流查询弹窗 -->
    <TrackingDialog v-model="trackingDialogVisible" :tracking-no="currentTrackingNo" :company="currentCompany" :phone="currentPhone" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Edit, Check, Coin, Calendar, CircleClose, CircleCheck, Clock, Download } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/date'
import TrackingDialog from '@/components/Logistics/TrackingDialog.vue'
import { getCodStats, getCodList, updateCodAmount, markCodReturned, batchUpdateCodAmount, batchMarkCodReturned, getCodDepartments, getCodSalesUsers, type CodOrder, type CodStats } from '@/api/codCollection'
import { getLogisticsInfoStyle } from '@/utils/logisticsStatusConfig'

defineOptions({ name: 'CodCollection' })

const router = useRouter()
const stats = ref<CodStats>({ todayCod: 0, monthCod: 0, cancelledCod: 0, returnedCod: 0, pendingCod: 0 })
const quickDateOptions = [{ label: '今日', value: 'today' }, { label: '昨日', value: 'yesterday' }, { label: '本周', value: 'week' }, { label: '本月', value: 'month' }, { label: '上月', value: 'lastMonth' }, { label: '今年', value: 'year' }, { label: '全部', value: 'all' }]
const quickDateFilter = ref('month')
const startDate = ref('')
const endDate = ref('')
const departmentFilter = ref('')
const salesPersonFilter = ref('')
const orderStatusFilter = ref('')
const activeTab = ref<'pending' | 'returned' | 'cancelled' | 'all'>('pending')
const batchSearchVisible = ref(false)
const batchSearchKeywords = ref('')
const searchKeyword = ref('')
const batchSearchCount = computed(() => batchSearchKeywords.value ? batchSearchKeywords.value.split('\n').filter(k => k.trim()).length : 0)
const loading = ref(false)
const tableData = ref<CodOrder[]>([])
const selectedRows = ref<CodOrder[]>([])
const departments = ref<any[]>([])
const salesUsers = ref<any[]>([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const detailDialogVisible = ref(false)
const codDialogVisible = ref(false)
const trackingDialogVisible = ref(false)
const currentOrder = ref<CodOrder | null>(null)
const currentTrackingNo = ref('')
const currentCompany = ref('')
const currentPhone = ref('')
const isBatchCod = ref(false)
const submitting = ref(false)
const codForm = ref({ codAmount: 0, codRemark: '' })

const formatMoney = (val: number | string | undefined) => (Number(val) || 0).toFixed(2)
const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// 判断订单是否改过代收
const hasModifiedCod = (order: any) => {
  if (!order) return false
  const originalCodAmount = (order.totalAmount || 0) - (order.depositAmount || 0)
  const currentCodAmount = order.codAmount || 0
  return currentCodAmount < originalCodAmount
}

// 🔥 监听代收金额输入，超过最大值时自动重置
watch(() => codForm.value.codAmount, (newAmount) => {
  if (!isBatchCod.value && currentOrder.value) {
    const maxAmount = currentOrder.value.codAmount || 0
    if (newAmount > maxAmount) {
      ElMessage.warning(`修改的金额不能大于当前代收金额¥${formatMoney(maxAmount)}，已自动重置`)
      codForm.value.codAmount = maxAmount
    }
  }
})

// 🔥 新增：根据筛选条件动态显示统计标签
const getStatLabel = (type: 'today' | 'month') => {
  if (startDate.value && endDate.value) {
    // 用户选择了日期范围
    if (type === 'today') {
      return '订单金额'
    }
    return '需要代收'
  }
  // 默认显示（当月）
  return type === 'today' ? '订单金额' : '需要代收'
}

const getDateRange = (type: string): string[] => {
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (type === 'today') return [formatDate(today), formatDate(today)]
  if (type === 'yesterday') { const y = new Date(today); y.setDate(y.getDate() - 1); return [formatDate(y), formatDate(y)] }
  if (type === 'week') { const w = new Date(today); w.setDate(w.getDate() - w.getDay() + 1); return [formatDate(w), formatDate(today)] }
  if (type === 'month') return [formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), formatDate(today)]
  if (type === 'lastMonth') return [formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)), formatDate(new Date(today.getFullYear(), today.getMonth(), 0))]
  if (type === 'year') return [formatDate(new Date(today.getFullYear(), 0, 1)), formatDate(today)]
  // 🔥 修复：全部按钮返回一个很大的日期范围（5年前到今天）
  if (type === 'all') return [formatDate(new Date(today.getFullYear() - 5, 0, 1)), formatDate(today)]
  return []
}

const loadStats = async () => { try { const p: any = {}; if (startDate.value) p.startDate = startDate.value; if (endDate.value) p.endDate = endDate.value; if (departmentFilter.value) p.departmentId = departmentFilter.value; if (salesPersonFilter.value) p.salesPersonId = salesPersonFilter.value; const r = await getCodStats(p) as any; if (r) stats.value = r } catch (e) { console.error(e) } }
const loadData = async () => { loading.value = true; try { const p: any = { page: pagination.value.page, pageSize: pagination.value.pageSize, tab: activeTab.value }; if (startDate.value) p.startDate = startDate.value; if (endDate.value) p.endDate = endDate.value; if (departmentFilter.value) p.departmentId = departmentFilter.value; if (salesPersonFilter.value) p.salesPersonId = salesPersonFilter.value; if (orderStatusFilter.value) p.status = orderStatusFilter.value; if (batchSearchKeywords.value) p.keywords = batchSearchKeywords.value; const r = await getCodList(p) as any; if (r) { tableData.value = r.list || []; pagination.value.total = r.total || 0 } } catch (e) { console.error(e) } finally { loading.value = false } }
const loadDepartments = async () => { try { const r = await getCodDepartments() as any; departments.value = r || [] } catch (e) { console.error(e) } }
const loadSalesUsers = async () => { try { const r = await getCodSalesUsers(departmentFilter.value) as any; salesUsers.value = r || [] } catch (e) { console.error(e) } }

const handleQuickDateClick = (v: string) => { quickDateFilter.value = v; const range = getDateRange(v); startDate.value = range[0] || ''; endDate.value = range[1] || ''; pagination.value.page = 1; loadStats(); loadData() }
const handleDateChange = () => { quickDateFilter.value = ''; pagination.value.page = 1; loadStats(); loadData() }
const handleDepartmentChange = () => { salesPersonFilter.value = ''; loadSalesUsers(); handleFilterChange() }
const handleFilterChange = () => { pagination.value.page = 1; loadStats(); loadData() }
const handleTabChange = () => { pagination.value.page = 1; loadData() }
const handleRefresh = () => { loadStats(); loadData() }
const handleSizeChange = (s: number) => { pagination.value.pageSize = s; pagination.value.page = 1; loadData() }
const handlePageChange = (p: number) => { pagination.value.page = p; loadData() }
const handleSelectionChange = (rows: CodOrder[]) => { selectedRows.value = rows }
const clearBatchSearch = () => { batchSearchKeywords.value = ''; searchKeyword.value = ''; batchSearchVisible.value = false; handleFilterChange() }
const applyBatchSearch = () => { batchSearchVisible.value = false; searchKeyword.value = batchSearchCount.value > 0 ? `已输入 ${batchSearchCount.value} 条` : ''; handleFilterChange() }

const getOrderStatusType = (s: string) => ({ shipped: 'primary', delivered: 'success', completed: 'success', rejected: 'danger', logistics_returned: 'warning', exception: 'danger' }[s] || 'info')
const getOrderStatusText = (s: string) => ({ shipped: '已发货', delivered: '已签收', completed: '已完成', rejected: '拒收', logistics_returned: '已退回', exception: '异常' }[s] || s)
const getCodStatusType = (r: CodOrder) => r.codAmount === 0 && r.codStatus === 'cancelled' ? 'info' : r.codStatus === 'returned' ? 'success' : r.codStatus === 'cancelled' ? 'warning' : 'danger'
const getCodStatusText = (r: CodOrder) => {
  // 🔥 代收状态显示逻辑：基于codAmount（当前实际代收金额）
  if (r.codAmount === 0 && r.codStatus === 'cancelled') {
    return '无需代收'
  }
  if (r.codStatus === 'returned') {
    return '已返款'
  }
  if (r.codStatus === 'cancelled') {
    return '已改代收'
  }
  return '未返款'
}

const goToOrderDetail = (id: string) => router.push(`/order/detail/${id}`)
const goToCustomerDetail = (id: string) => router.push(`/customer/detail/${id}`)
const showDetailDialog = (r: CodOrder) => { currentOrder.value = r; detailDialogVisible.value = true }

const showCodDialog = (r: CodOrder) => {
  // 🔥 检查订单状态：已签收和已完成的订单不能改代收
  const signedStatuses = ['delivered', 'completed']
  if (signedStatuses.includes(r.status)) {
    ElMessage.warning('订单已签收，不支持改代收')
    return
  }

  currentOrder.value = r
  isBatchCod.value = false
  // 🔥 默认金额为0
  codForm.value = { codAmount: 0, codRemark: r.codRemark || '' }
  codDialogVisible.value = true
}
const showBatchCodDialog = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择订单')
    return
  }

  // 🔥 检查订单状态：已签收和已完成的订单不能改代收
  const signedStatuses = ['delivered', 'completed']
  const invalidOrders = selectedRows.value.filter(r => signedStatuses.includes(r.status))

  if (invalidOrders.length > 0) {
    const invalidOrderNumbers = invalidOrders.map(r => r.orderNumber).join('、')
    ElMessage.warning(`以下订单已签收，不支持改代收：${invalidOrderNumbers}`)
    return
  }

  isBatchCod.value = true
  codForm.value = { codAmount: 0, codRemark: '' }
  codDialogVisible.value = true
}
const showTrackingDialog = (r: CodOrder) => { currentTrackingNo.value = r.trackingNumber; currentCompany.value = r.expressCompany; currentPhone.value = r.customerPhone; trackingDialogVisible.value = true }

const handleCodSubmit = async () => {
  submitting.value = true
  try {
    // 🔥 验证：修改的金额不能大于原代收金额
    if (!isBatchCod.value && currentOrder.value) {
      if (codForm.value.codAmount > currentOrder.value.codAmount) {
        ElMessage.warning('修改的金额不能大于原代收金额')
        submitting.value = false
        return
      }
    }

    if (isBatchCod.value) {
      await batchUpdateCodAmount({
        orderIds: selectedRows.value.map(r => r.id),
        codAmount: codForm.value.codAmount,
        codRemark: codForm.value.codRemark
      })
      ElMessage.success(`批量修改 ${selectedRows.value.length} 个订单成功`)
    } else if (currentOrder.value) {
      await updateCodAmount(currentOrder.value.id, {
        codAmount: codForm.value.codAmount,
        codRemark: codForm.value.codRemark
      })
      ElMessage.success('修改成功')
    }
    codDialogVisible.value = false
    loadStats()
    loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}
const handleReturn = async (r: CodOrder) => {
  try {
    // 🔥 检查订单状态：只有已签收或已完成的订单才能返款
    const allowedStatuses = ['delivered', 'completed']
    if (!allowedStatuses.includes(r.status)) {
      ElMessage.warning('订单状态非已签收，请先处理订单签收')
      return
    }

    await ElMessageBox.confirm(
      '',
      '确认返款',
      {
        message: `<p style="margin-bottom: 16px;">确定将订单 <strong>${r.orderNumber}</strong> 标记为已返款吗？</p><div style="border: 2px solid #f56c6c; background-color: #fef0f0; padding: 12px; border-radius: 4px;"><p style="color: #f56c6c; margin: 0; line-height: 1.6;">⚠️ 重要提示：一旦确定返款将不再支持修改！</p></div>`,
        dangerouslyUseHTMLString: true,
        type: 'warning',
        icon: 'WarningFilled',
        confirmButtonText: '确定返款',
        cancelButtonText: '取消'
      }
    )
    await markCodReturned(r.id, { returnedAmount: r.codAmount })
    ElMessage.success('返款成功')
    loadStats()
    loadData()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '失败')
  }
}
const handleBatchReturn = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择订单')
    return
  }

  // 🔥 检查订单状态：只有已签收或已完成的订单才能返款
  const allowedStatuses = ['delivered', 'completed']
  const invalidOrders = selectedRows.value.filter(r => !allowedStatuses.includes(r.status))

  if (invalidOrders.length > 0) {
    const invalidOrderNumbers = invalidOrders.map(r => r.orderNumber).join('、')
    ElMessage.warning(`以下订单状态非已签收，请先处理订单签收：${invalidOrderNumbers}`)
    return
  }

  try {
    await ElMessageBox.confirm(
      '',
      '批量返款',
      {
        message: `<p style="margin-bottom: 16px;">确定将 <strong>${selectedRows.value.length}</strong> 个订单标记为已返款吗？</p><div style="border: 2px solid #f56c6c; background-color: #fef0f0; padding: 12px; border-radius: 4px;"><p style="color: #f56c6c; margin: 0; line-height: 1.6;">⚠️ 重要提示：一旦确定返款将不再支持修改！</p></div>`,
        dangerouslyUseHTMLString: true,
        type: 'warning',
        icon: 'WarningFilled',
        confirmButtonText: '确定返款',
        cancelButtonText: '取消'
      }
    )
    await batchMarkCodReturned({ orderIds: selectedRows.value.map(r => r.id) })
    ElMessage.success(`批量标记 ${selectedRows.value.length} 个订单成功`)
    loadStats()
    loadData()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '失败')
  }
}

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
      订单状态: getOrderStatusText(row.status),
      订单金额: Number(row.finalAmount || 0),
      代收金额: Number(row.codAmount || 0),
      代收状态: getCodStatusText(row),
      销售人员: row.salesPersonName || '',
      物流单号: row.trackingNumber || '',
      最新物流动态: row.latestLogisticsInfo || '',
      下单时间: row.createdAt || ''
    }))

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 订单号
      { wch: 12 }, // 客户姓名
      { wch: 10 }, // 订单状态
      { wch: 12 }, // 订单金额
      { wch: 12 }, // 代收金额
      { wch: 10 }, // 代收状态
      { wch: 10 }, // 销售人员
      { wch: 20 }, // 物流单号
      { wch: 40 }, // 最新物流动态
      { wch: 20 }  // 下单时间
    ]

    XLSX.utils.book_append_sheet(wb, ws, '代收管理')

    // 生成文件名
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const fileName = `代收管理_${dateStr}.xlsx`

    // 导出
    XLSX.writeFile(wb, fileName)
    ElMessage.success(`成功导出 ${exportData.length} 条数据`)
  } catch (e) {
    console.error('导出失败:', e)
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  const range = getDateRange('month')
  startDate.value = range[0] || ''
  endDate.value = range[1] || ''
  loadDepartments()
  loadSalesUsers()
  loadStats()
  loadData()

  // 🔥 监听订单更新事件，自动刷新列表
  window.addEventListener('order-update', handleOrderUpdate)
})

onUnmounted(() => {
  // 🔥 移除事件监听器
  window.removeEventListener('order-update', handleOrderUpdate)
})

// 🔥 处理订单更新事件
const handleOrderUpdate = () => {
  console.log('[CodCollection] 收到订单更新事件，刷新列表')
  loadStats()
  loadData()
}
</script>

<style scoped lang="scss">
.cod-collection-page { padding: 20px; }
.stats-cards { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 180px; background: #fff; border-radius: 8px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;
  &.today { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
  &.month { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #fff; }
  &.cancelled { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #e67e22; }
  &.returned { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #27ae60; }
  &.pending { background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); color: #e74c3c; }
}
.stat-info { .stat-value { font-size: 24px; font-weight: 600; color: #303133; } .stat-label { font-size: 13px; color: #909399; margin-top: 4px; } }
.quick-filters { margin-bottom: 16px; }
.quick-btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
.quick-btn { padding: 8px 16px; border: 1px solid #dcdfe6; border-radius: 20px; background: #fff; color: #606266; cursor: pointer; transition: all 0.2s; font-size: 13px; &:hover { border-color: #409eff; color: #409eff; } &.active { background: #409eff; border-color: #409eff; color: #fff; } }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; background: #fff; padding: 16px; border-radius: 8px; }
.filter-item { flex: 1; min-width: 100px; }
.filter-search { flex: 1; min-width: 120px; }
.filter-date { flex: 1; min-width: 120px; }
.date-separator { color: #909399; font-size: 13px; flex-shrink: 0; }
.batch-search-popover { .batch-search-header { margin-bottom: 12px; .batch-search-title { font-weight: 600; } .batch-search-tip { display: block; font-size: 12px; color: #909399; margin-top: 4px; } } .batch-search-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; } }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #fff; padding: 0 16px; border-radius: 8px; }
.action-left { .status-tabs { :deep(.el-tabs__header) { margin: 0; } :deep(.el-tabs__nav-wrap::after) { display: none; } } }
.action-right { display: flex; gap: 8px; }
.data-table { background: #fff; border-radius: 8px; .cod-amount { color: #e6a23c; font-weight: 600; } .logistics-info { font-size: 12px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .no-data { color: #c0c4cc; } }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; }
</style>
