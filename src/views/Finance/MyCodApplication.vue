<template>
  <div class="my-cod-application-page">
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
      <el-input v-model="searchKeyword" placeholder="订单号/取消原因" clearable class="filter-search" @clear="handleSearch">
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
          <el-tab-pane name="pending" label="待审核" />
          <el-tab-pane name="approved" label="已通过" />
          <el-tab-pane name="rejected" label="已驳回" />
        </el-tabs>
      </div>
      <div class="action-right">
        <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
        <el-button type="success" :icon="Plus" @click="showCreateDialog">发起申请</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table :data="tableData" v-loading="loading" stripe border class="data-table">
      <el-table-column prop="orderNumber" label="订单号" min-width="160">
        <template #default="{ row }"><el-link type="primary" @click="goToOrderDetail(row.orderId)">{{ row.orderNumber }}</el-link></template>
      </el-table-column>
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
      <el-table-column prop="reviewedAt" label="审核时间" width="160">
        <template #default="{ row }">{{ row.reviewedAt ? formatDateTime(row.reviewedAt) : '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showDetailDialog(row)">详情</el-button>
          <el-button v-if="row.status === 'pending'" type="danger" link size="small" @click="handleCancel(row)">撤销</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 30, 50]" :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange" @current-change="handlePageChange" />
    </div>

    <!-- 发起申请弹窗 -->
    <el-dialog v-model="createDialogVisible" title="发起代收取消申请" width="700px" :close-on-click-modal="false">
      <el-steps :active="currentStep" finish-status="success" align-center style="margin-bottom: 30px;">
        <el-step title="选择订单" />
        <el-step title="填写信息" />
      </el-steps>

      <!-- 第一步：选择订单 -->
      <div v-if="currentStep === 0">
        <div class="order-search">
          <el-input v-model="orderSearchKeyword" placeholder="搜索订单号/客户名称" clearable @input="handleOrderSearch">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>
        <el-radio-group v-model="selectedOrderId" class="order-list">
          <el-radio v-for="order in availableOrders" :key="order.id" :label="order.id" class="order-item">
            <div class="order-info">
              <div class="order-number">{{ order.orderNumber }}</div>
              <div class="order-detail">{{ order.customerName }} - ¥{{ formatMoney(order.codAmount) }}（代收）- {{ getOrderStatusText(order.status) }}</div>
            </div>
          </el-radio>
        </el-radio-group>
        <el-empty v-if="availableOrders.length === 0" description="暂无可申请的订单" />
      </div>

      <!-- 第二步：填写信息 -->
      <div v-if="currentStep === 1">
        <el-form :model="createForm" label-width="120px">
          <el-form-item label="订单信息">
            <span>{{ selectedOrder?.orderNumber }} - {{ selectedOrder?.customerName }} - ¥{{ formatMoney(selectedOrder?.codAmount || 0) }}</span>
          </el-form-item>
          <el-form-item label="原代收金额">
            <span style="color: #e6a23c; font-weight: 600;">¥{{ formatMoney(selectedOrder?.codAmount || 0) }}</span>
          </el-form-item>
          <el-form-item label="修改后金额" required>
            <el-input-number v-model="createForm.modifiedCodAmount" :min="0" :max="selectedOrder?.codAmount || 0" :precision="2" :step="10" style="width: 100%" />
            <div style="font-size: 12px; color: #909399; margin-top: 4px;">默认为0元，表示客户已全额付款</div>
          </el-form-item>
          <el-form-item label="取消原因" required>
            <el-input v-model="createForm.cancelReason" type="textarea" :rows="3" placeholder="请输入取消原因" maxlength="500" show-word-limit />
          </el-form-item>
          <el-form-item label="尾款凭证" required>
            <div class="upload-area">
              <div class="upload-tips">支持粘贴图片（Ctrl+V）或点击上传，最多5张</div>
              <div class="image-list">
                <div v-for="(img, index) in createForm.paymentProof" :key="index" class="image-item">
                  <el-image :src="img" :preview-src-list="createForm.paymentProof" fit="cover" />
                  <div class="image-actions">
                    <el-icon class="delete-icon" @click="removeImage(index)"><Close /></el-icon>
                  </div>
                </div>
                <div v-if="createForm.paymentProof.length < 5" class="upload-btn" @click="triggerUpload">
                  <el-icon><Plus /></el-icon>
                  <div>上传图片</div>
                </div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" multiple style="display: none" @change="handleFileUpload" />
            </div>
          </el-form-item>
        </el-form>
        <el-alert title="提示" type="warning" :closable="false" style="margin-top: 16px;">
          <ul style="margin: 0; padding-left: 20px;">
            <li>修改为0元表示客户已全额付款</li>
            <li>修改为部分金额表示客户部分付款</li>
            <li>请上传尾款凭证（转账截图、收款记录等）</li>
            <li>提交后将进入审核流程，审核通过后自动更新代收状态</li>
          </ul>
        </el-alert>
      </div>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button v-if="currentStep === 0" type="primary" :disabled="!selectedOrderId" @click="nextStep">下一步</el-button>
        <el-button v-if="currentStep === 1" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep === 1" type="primary" @click="handleCreate" :loading="submitting">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="申请详情" width="700px">
      <el-descriptions :column="2" border v-if="currentApplication">
        <el-descriptions-item label="申请状态" :span="2">
          <el-tag :type="getStatusType(currentApplication.status)" size="large">{{ getStatusText(currentApplication.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="订单号">{{ currentApplication.orderNumber }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentApplication.applicantName }}</el-descriptions-item>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Clock, CircleCheck, CircleClose, Document, Close } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/date'
import { getMyApplications, createApplication, cancelApplication, getApplicationStats, uploadProof, type CodApplication, type CodApplicationStats } from '@/api/codApplication'
import { getCodList, type CodOrder } from '@/api/codCollection'

defineOptions({ name: 'MyCodApplication' })

const router = useRouter()
const stats = ref<CodApplicationStats>({ pending: 0, approved: 0, rejected: 0, total: 0 })
const searchKeyword = ref('')
const statusFilter = ref('all')
const startDate = ref('')
const endDate = ref('')
const activeTab = ref('all')
const loading = ref(false)
const tableData = ref<CodApplication[]>([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const createDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentApplication = ref<CodApplication | null>(null)
const submitting = ref(false)
const currentStep = ref(0)
const selectedOrderId = ref('')
const orderSearchKeyword = ref('')
const availableOrders = ref<CodOrder[]>([])
const selectedOrder = ref<CodOrder | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const createForm = ref({
  modifiedCodAmount: 0,
  cancelReason: '',
  paymentProof: [] as string[]
})

const formatMoney = (val: number | string | undefined) => (Number(val) || 0).toFixed(2)

const getStatusType = (status: string) => {
  const types: Record<string, any> = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'info' }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回', cancelled: '已取消' }
  return texts[status] || status
}

const getOrderStatusText = (status: string) => {
  const texts: Record<string, string> = { shipped: '已发货', delivered: '已签收', completed: '已完成' }
  return texts[status] || status
}

const loadStats = async () => {
  try {
    const res = await getApplicationStats('my') as any
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
    const res = await getMyApplications(params) as any
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

const loadAvailableOrders = async () => {
  try {
    const params: any = { page: 1, pageSize: 100, tab: 'pending' }
    if (orderSearchKeyword.value) params.keywords = orderSearchKeyword.value
    const res = await getCodList(params) as any
    if (res) availableOrders.value = res.list || []
  } catch (e) {
    console.error(e)
  }
}

const handleSearch = () => { pagination.value.page = 1; loadData() }
const handleTabChange = () => { statusFilter.value = activeTab.value; handleSearch() }
const handleRefresh = () => { loadStats(); loadData() }
const handleSizeChange = (size: number) => { pagination.value.pageSize = size; pagination.value.page = 1; loadData() }
const handlePageChange = (page: number) => { pagination.value.page = page; loadData() }
const goToOrderDetail = (id: string) => router.push(`/order/detail/${id}`)

const showCreateDialog = () => {
  currentStep.value = 0
  selectedOrderId.value = ''
  orderSearchKeyword.value = ''
  createForm.value = { modifiedCodAmount: 0, cancelReason: '', paymentProof: [] }
  loadAvailableOrders()
  createDialogVisible.value = true
}

const handleOrderSearch = () => loadAvailableOrders()

const nextStep = () => {
  selectedOrder.value = availableOrders.value.find(o => o.id === selectedOrderId.value) || null
  currentStep.value = 1
}

const prevStep = () => { currentStep.value = 0 }

const triggerUpload = () => fileInput.value?.click()

const handleFileUpload = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files) return

  for (let i = 0; i < files.length && createForm.value.paymentProof.length < 5; i++) {
    try {
      const res = await uploadProof(files[i]) as any
      if (res?.url) createForm.value.paymentProof.push(res.url)
    } catch (err: any) {
      ElMessage.error(err.message || '上传失败')
    }
  }

  if (fileInput.value) fileInput.value.value = ''
}

const handlePaste = async (e: ClipboardEvent) => {
  if (!createDialogVisible.value || currentStep.value !== 1) return

  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length && createForm.value.paymentProof.length < 5; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) {
        try {
          const res = await uploadProof(file) as any
          if (res?.url) createForm.value.paymentProof.push(res.url)
        } catch (err: any) {
          ElMessage.error(err.message || '上传失败')
        }
      }
    }
  }
}

const removeImage = (index: number) => createForm.value.paymentProof.splice(index, 1)

const handleCreate = async () => {
  if (!selectedOrder.value) return
  if (!createForm.value.cancelReason) {
    ElMessage.warning('请填写取消原因')
    return
  }
  if (createForm.value.paymentProof.length === 0) {
    ElMessage.warning('请上传尾款凭证')
    return
  }

  submitting.value = true
  try {
    await createApplication({
      orderId: selectedOrder.value.id,
      modifiedCodAmount: createForm.value.modifiedCodAmount,
      cancelReason: createForm.value.cancelReason,
      paymentProof: createForm.value.paymentProof
    })
    ElMessage.success('申请提交成功，等待审核')
    createDialogVisible.value = false
    loadStats()
    loadData()
  } catch (err: any) {
    ElMessage.error(err.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const showDetailDialog = (row: CodApplication) => {
  currentApplication.value = row
  detailDialogVisible.value = true
}

const handleCancel = async (row: CodApplication) => {
  try {
    await ElMessageBox.confirm('确定要撤销该申请吗？', '提示', { type: 'warning' })
    await cancelApplication(row.id)
    ElMessage.success('申请已撤销')
    loadStats()
    loadData()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤销失败')
  }
}

onMounted(() => {
  loadStats()
  loadData()
  document.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})
</script>

<style scoped lang="scss">
.my-cod-application-page { padding: 20px; }
.stats-cards { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 180px; background: #fff; border-radius: 8px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;
  &.pending { background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); color: #e6a23c; }
  &.approved { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #67c23a; }
  &.rejected { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #f56c6c; }
  &.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
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
.data-table { background: #fff; border-radius: 8px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; }
.order-search { margin-bottom: 16px; }
.order-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.order-item { width: 100%; padding: 12px; border: 1px solid #dcdfe6; border-radius: 4px; margin: 0 !important;
  &:hover { background: #f5f7fa; }
  :deep(.el-radio__label) { width: 100%; }
}
.order-info { .order-number { font-weight: 600; margin-bottom: 4px; } .order-detail { font-size: 12px; color: #909399; } }
.upload-area { .upload-tips { font-size: 12px; color: #909399; margin-bottom: 8px; } }
.image-list { display: flex; gap: 8px; flex-wrap: wrap; }
.image-item { position: relative; width: 100px; height: 100px; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden;
  .image-actions { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.5); padding: 4px; cursor: pointer;
    .delete-icon { color: #fff; font-size: 16px; }
  }
}
.upload-btn { width: 100px; height: 100px; border: 1px dashed #dcdfe6; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #909399;
  &:hover { border-color: #409eff; color: #409eff; }
}
.proof-images { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
""
