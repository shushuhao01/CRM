<template>
  <div class="cod-application-review-page">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon approved"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.approved }}</div>
          <div class="stat-label">已通过</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon rejected"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.rejected }}</div>
          <div class="stat-label">已驳回</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total"><el-icon><Document /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总计</div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input v-model="searchKeyword" placeholder="订单号/申请人" clearable class="filter-search" @clear="handleSearch">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="申请状态" clearable @change="handleSearch" class="filter-item">
        <el-option label="全部" value="all" />
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-date-picker v-model="startDate" type="date" placeholder="开始日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" @change="handleSearch" class="filter-date" />
      <span class="date-separator">至</span>
      <el-date-picker v-model="endDate" type="date" placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" @change="handleSearch" class="filter-date" />
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="status-tabs">
          <el-tab-pane name="all" label="全部" />
          <el-tab-pane name="pending">
            <template #label>
              待审核<el-badge v-if="stats.pending > 0" :value="stats.pending" class="tab-badge" />
            </template>
          </el-tab-pane>
          <el-tab-pane name="approved" label="已通过" />
          <el-tab-pane name="rejected" label="已驳回" />
        </el-tabs>
      </div>
      <div class="action-right">
        <el-button v-if="selectedIds.length > 0 && activeTab === 'pending'" type="success" :icon="CircleCheck" @click="handleBatchReview(true)">批量通过</el-button>
        <el-button v-if="selectedIds.length > 0 && activeTab === 'pending'" type="danger" :icon="CircleClose" @click="handleBatchReview(false)">批量驳回</el-button>
        <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table :data="tableData" v-loading="loading" stripe border class="data-table" @selection-change="handleSelectionChange">
      <el-table-column v-if="activeTab === 'pending'" type="selection" width="55" />
      <el-table-column prop="orderNumber" label="订单号" min-width="160">
        <template #default="{ row }"><el-link type="primary" @click="goToOrderDetail(row.orderId)">{{ row.orderNumber }}</el-link></template>
      </el-table-column>
      <el-table-column prop="applicantName" label="申请人" width="100" />
      <el-table-column prop="departmentName" label="部门" width="100" />
      <el-table-column prop="originalCodAmount" label="原代收金额" width="110" align="right">
        <template #default="{ row }">¥{{ formatMoney(row.originalCodAmount) }}</template>
      </el-table-column>
      <el-table-column prop="modifiedCodAmount" label="修改后金额" width="110" align="right">
        <template #default="{ row }">¥{{ formatMoney(row.modifiedCodAmount) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="申请状态" width="100">
        <template #default="{ row }"><el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="cancelReason" label="取消原因" min-width="200" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="申请时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" type="primary" link size="small" @click="showReviewDialog(row)">审核</el-button>
          <el-button v-else type="primary" link size="small" @click="showDetailDialog(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 30, 50]" :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange" @current-change="handlePageChange" />
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="reviewDialogVisible" title="审核代收取消申请" width="700px" :close-on-click-modal="false">
      <el-descriptions :column="2" border v-if="currentApplication">
        <el-descriptions-item label="申请状态" :span="2">
          <el-tag :type="getStatusType(currentApplication.status)" size="large">{{ getStatusText(currentApplication.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="订单号">
          <el-link type="primary" @click="goToOrderDetail(currentApplication.orderId)">{{ currentApplication.orderNumber }}</el-link>
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentApplication.applicantName }}（{{ currentApplication.departmentName }}）</el-descriptions-item>
        <el-descriptions-item label="原代收金额">¥{{ formatMoney(currentApplication.originalCodAmount) }}</el-descriptions-item>
        <el-descriptions-item label="修改后金额">¥{{ formatMoney(currentApplication.modifiedCodAmount) }}</el-descriptions-item>
        <el-descriptions-item label="实际取消">
          <span style="color: #f56c6c; font-weight: 600;">¥{{ formatMoney(currentApplication.originalCodAmount - currentApplication.modifiedCodAmount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDateTime(currentApplication.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="取消原因" :span="2">{{ currentApplication.cancelReason }}</el-descriptions-item>
        <el-descriptions-item label="尾款凭证" :span="2">
          <div class="proof-images">
            <el-image v-for="(img, index) in currentApplication.paymentProof" :key="index" :src="img" :preview-src-list="currentApplication.paymentProof" fit="cover" style="width: 100px; height: 100px; margin-right: 8px;" />
          </div>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider />

      <el-form :model="reviewForm" label-width="100px">
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="reviewForm.approved">
            <el-radio :label="true">通过</el-radio>
            <el-radio :label="false">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核备注" required>
          <el-input v-model="reviewForm.reviewRemark" type="textarea" :rows="3" placeholder="请输入审核备注" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>

      <el-alert type="warning" :closable="false" style="margin-top: 16px;">
        <ul style="margin: 0; padding-left: 20px;">
          <li>审核通过后，订单代收金额将自动更新为 ¥{{ formatMoney(currentApplication?.modifiedCodAmount || 0) }}</li>
          <li v-if="currentApplication?.modifiedCodAmount === 0">代收状态将变更为"已改代收"，无法再次修改</li>
          <li v-else>代收状态将变更为"待处理"，可以继续修改</li>
          <li>请仔细核对尾款凭证后再审核</li>
        </ul>
      </el-alert>

      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleReview" :loading="submitting">确认提交</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="申请详情" width="700px">
      <el-descriptions :column="2" border v-if="currentApplication">
        <el-descriptions-item label="申请状态" :span="2">
          <el-tag :type="getStatusType(currentApplication.status)" size="large">{{ getStatusText(currentApplication.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="订单号">
          <el-link type="primary" @click="goToOrderDetail(currentApplication.orderId)">{{ currentApplication.orderNumber }}</el-link>
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentApplication.applicantName }}（{{ currentApplication.departmentName }}）</el-descriptions-item>
        <el-descriptions-item label="原代收金额">¥{{ formatMoney(currentApplication.originalCodAmount) }}</el-descriptions-item>
        <el-descriptions-item label="修改后金额">¥{{ formatMoney(currentApplication.modifiedCodAmount) }}</el-descriptions-item>
        <el-descriptions-item label="取消原因" :span="2">{{ currentApplication.cancelReason }}</el-descriptions-item>
        <el-descriptions-item label="尾款凭证" :span="2">
          <div class="proof-images">
            <el-image v-for="(img, index) in currentApplication.paymentProof" :key="index" :src="img" :preview-src-list="currentApplication.paymentProof" fit="cover" style="width: 100px; height: 100px; margin-right: 8px;" />
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDateTime(currentApplication.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ currentApplication.reviewedAt ? formatDateTime(currentApplication.reviewedAt) : '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="currentApplication.reviewerName" label="审核人" :span="2">{{ currentApplication.reviewerName }}</el-descriptions-item>
        <el-descriptions-item v-if="currentApplication.reviewRemark" label="审核备注" :span="2">{{ currentApplication.reviewRemark }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Clock, CircleCheck, CircleClose, Document } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/date'
import { getReviewList, reviewApplication, getApplicationStats, type CodApplication, type CodApplicationStats } from '@/api/codApplication'

defineOptions({ name: 'CodApplicationReview' })

const router = useRouter()
const stats = ref<CodApplicationStats>({ pending: 0, approved: 0, rejected: 0, total: 0 })
const searchKeyword = ref('')
const statusFilter = ref('all')
const startDate = ref('')
const endDate = ref('')
const activeTab = ref('pending')
const loading = ref(false)
const tableData = ref<CodApplication[]>([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const reviewDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentApplication = ref<CodApplication | null>(null)
const submitting = ref(false)
const reviewForm = ref({ approved: true, reviewRemark: '' })
const selectedIds = ref<string[]>([])
const batchReviewDialogVisible = ref(false)
const batchReviewForm = ref({ approved: true, reviewRemark: '' })

const formatMoney = (val: number | string | undefined) => (Number(val) || 0).toFixed(2)

const getStatusType = (status: string) => {
  const types: Record<string, any> = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'info' }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回', cancelled: '已取消' }
  return texts[status] || status
}

const loadStats = async () => {
  try {
    const res = await getApplicationStats('review') as any
    if (res) stats.value = res
  } catch (e) {
    console.error(e)
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const params: any = { page: pagination.value.page, pageSize: pagination.value.pageSize }
    if (activeTab.value !== 'all') params.status = activeTab.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    if (searchKeyword.value) params.keywords = searchKeyword.value
    const res = await getReviewList(params) as any
    if (res) {
      tableData.value = res.list || []
      pagination.value.total = res.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { pagination.value.page = 1; loadData() }
const handleTabChange = () => { statusFilter.value = activeTab.value; handleSearch() }
const handleRefresh = () => { loadStats(); loadData() }
const handleSizeChange = (size: number) => { pagination.value.pageSize = size; pagination.value.page = 1; loadData() }
const handlePageChange = (page: number) => { pagination.value.page = page; loadData() }
const goToOrderDetail = (id: string) => router.push(`/order/detail/${id}`)

const showReviewDialog = (row: CodApplication) => {
  currentApplication.value = row
  reviewForm.value = { approved: true, reviewRemark: '' }
  reviewDialogVisible.value = true
}

const showDetailDialog = (row: CodApplication) => {
  currentApplication.value = row
  detailDialogVisible.value = true
}

const handleReview = async () => {
  if (!currentApplication.value) return
  if (!reviewForm.value.reviewRemark) {
    ElMessage.warning('请填写审核备注')
    return
  }

  submitting.value = true
  try {
    await reviewApplication(currentApplication.value.id, reviewForm.value)
    ElMessage.success(reviewForm.value.approved ? '审核通过' : '已驳回')
    reviewDialogVisible.value = false
    loadStats()
    loadData()
  } catch (err: any) {
    ElMessage.error(err.message || '审核失败')
  } finally {
    submitting.value = false
  }
}

const handleSelectionChange = (selection: CodApplication[]) => {
  selectedIds.value = selection.map(item => item.id)
}

const handleBatchReview = async (approved: boolean) => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要审核的申请')
    return
  }

  try {
    await ElMessageBox.prompt(
      `确定要批量${approved ? '通过' : '驳回'}选中的 ${selectedIds.value.length} 条申请吗？`,
      '批量审核',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入审核备注',
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
            return '请输入审核备注'
          }
          return true
        }
      }
    ).then(async ({ value }) => {
      submitting.value = true
      try {
        let successCount = 0
        let failCount = 0

        for (const id of selectedIds.value) {
          try {
            await reviewApplication(id, { approved, reviewRemark: value })
            successCount++
          } catch (e) {
            failCount++
          }
        }

        if (failCount === 0) {
          ElMessage.success(`批量审核成功，共 ${successCount} 条`)
        } else {
          ElMessage.warning(`批量审核完成，成功 ${successCount} 条，失败 ${failCount} 条`)
        }

        selectedIds.value = []
        loadStats()
        loadData()
      } catch (err: any) {
        ElMessage.error(err.message || '批量审核失败')
      } finally {
        submitting.value = false
      }
    })
  } catch (e) {
    // 用户取消
  }
}

onMounted(() => {
  loadStats()
  loadData()
})
</script>

<style scoped lang="scss">
.cod-application-review-page { padding: 20px; }
.stats-cards { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 180px; background: #fff; border-radius: 8px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;
  &.pending { background: linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%); color: #f39c12; }
  &.approved { background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); color: #27ae60; }
  &.rejected { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #e74c3c; }
  &.total { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); color: #fff; }
}
.stat-info { .stat-value { font-size: 24px; font-weight: 600; color: #303133; } .stat-label { font-size: 13px; color: #909399; margin-top: 4px; } }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; background: #fff; padding: 16px; border-radius: 8px; }
.filter-item { flex: 1; min-width: 100px; }
.filter-search { flex: 1; min-width: 120px; }
.filter-date { flex: 1; min-width: 120px; }
.date-separator { color: #909399; font-size: 13px; flex-shrink: 0; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #fff; padding: 0 16px; border-radius: 8px; }
.action-left { .status-tabs { :deep(.el-tabs__header) { margin: 0; } :deep(.el-tabs__nav-wrap::after) { display: none; } } }
.action-right { display: flex; gap: 8px; }
.tab-badge { margin-left: 8px; }
.data-table { background: #fff; border-radius: 8px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; }
.proof-images { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
