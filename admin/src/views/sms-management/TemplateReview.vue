<template>
  <div class="sms-template-review">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2>模板审核</h2>
        <p class="header-desc">审核租户提交的短信模板申请，管理四阶段审核流程</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon pending-icon">
              <el-icon :size="28"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statusCounts.pending_admin }}</div>
              <div class="stat-label">待管理员审核</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon vendor-icon">
              <el-icon :size="28"><Promotion /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statusCounts.pending_vendor }}</div>
              <div class="stat-label">待服务商审核</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon active-icon">
              <el-icon :size="28"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statusCounts.active }}</div>
              <div class="stat-label">已激活</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon rejected-icon">
              <el-icon :size="28"><CircleClose /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statusCounts.rejected }}</div>
              <div class="stat-label">已拒绝</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 主内容 -->
    <el-card class="main-card">
      <!-- 筛选栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select v-model="filterStatus" placeholder="审核状态" clearable style="width: 160px" @change="handleSearch">
            <el-option label="全部" value="all" />
            <el-option label="待管理员审核" value="pending_admin" />
            <el-option label="待服务商审核" value="pending_vendor" />
            <el-option label="已激活" value="active" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已撤销" value="withdrawn" />
          </el-select>
          <el-input v-model="keyword" placeholder="搜索模板名称、申请人、内容" clearable style="width: 260px" @keyup.enter="handleSearch">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button @click="handleSearch" :loading="loading">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </div>

      <!-- 列表 -->
      <el-table :data="list" v-loading="loading" stripe style="width: 100%" table-layout="auto">
        <el-table-column label="编号" width="100">
          <template #default="{ row }">
            <el-tooltip :content="row.id" placement="top">
              <span class="short-id">{{ row.shortId || row.id?.substring(0, 8)?.toUpperCase() }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="130" show-overflow-tooltip />
        <el-table-column label="短信内容" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.content" placement="top" :show-after="300" :disabled="!row.content || row.content.length <= 50">
              <div class="content-clamp">{{ row.content || '—' }}</div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="90">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ getCategoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="100">
          <template #default="{ row }">
            <span>{{ row.applicantName || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="租户" width="110" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.tenantName || '平台' }}</div>
            <div v-if="row.tenantId && row.tenantName" class="sub-text">{{ row.tenantId.substring(0, 8) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服务商CODE" width="150">
          <template #default="{ row }">
            <span v-if="row.vendorTemplateCode" class="code-text">{{ row.vendorTemplateCode }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="showDetail(row)">
              <el-icon><View /></el-icon> 查看
            </el-button>
            <template v-if="row.status === 'pending_admin'">
              <el-button v-permission="'sms-management:template-review:edit'" size="small" link type="success" @click="handleReview(row, 'approve')">通过</el-button>
              <el-button v-permission="'sms-management:template-review:edit'" size="small" link type="danger" @click="handleReview(row, 'reject')">拒绝</el-button>
            </template>
            <template v-if="row.status === 'pending_vendor'">
              <el-button v-permission="'sms-management:template-review:edit'" size="small" link type="success" @click="handleReview(row, 'activate')">激活</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="模板详情" width="650px" destroy-on-close>
      <el-descriptions v-if="currentTemplate" :column="2" border>
        <el-descriptions-item label="编号">
          <span class="short-id">{{ currentTemplate.shortId || currentTemplate.id?.substring(0, 8)?.toUpperCase() }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="模板名称">{{ currentTemplate.name }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ getCategoryLabel(currentTemplate.category) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentTemplate.status)" size="small">{{ getStatusLabel(currentTemplate.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentTemplate.applicantName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="租户">{{ currentTemplate.tenantName || '平台' }}</el-descriptions-item>
        <el-descriptions-item label="申请时间" :span="2">{{ formatTime(currentTemplate.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="模板内容" :span="2">
          <div class="content-preview">{{ currentTemplate.content }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="变量" :span="2">
          <el-tag v-for="v in (currentTemplate.variables || [])" :key="v" size="small" class="var-tag">{{ v }}</el-tag>
          <span v-if="!currentTemplate.variables?.length" class="text-muted">无</span>
        </el-descriptions-item>
        <el-descriptions-item label="说明" :span="2">{{ currentTemplate.description || '—' }}</el-descriptions-item>
        <el-descriptions-item label="服务商CODE" :span="2">
          <span v-if="currentTemplate.vendorTemplateCode" class="code-text">{{ currentTemplate.vendorTemplateCode }}</span>
          <span v-else class="text-muted">未填写</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentTemplate.adminReviewer" label="审核人">{{ currentTemplate.adminReviewer }}</el-descriptions-item>
        <el-descriptions-item v-if="currentTemplate.adminReviewAt" label="审核时间">{{ formatTime(currentTemplate.adminReviewAt) }}</el-descriptions-item>
        <el-descriptions-item v-if="currentTemplate.adminReviewNote" label="审核备注" :span="2">{{ currentTemplate.adminReviewNote }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 审核弹窗 -->
    <el-dialog v-model="showReviewDialog" :title="reviewDialogTitle" width="520px" destroy-on-close>
      <div v-if="currentTemplate" class="review-template-info">
        <div class="rti-row"><span class="rti-label">模板名称：</span><span>{{ currentTemplate.name }}</span></div>
        <div class="rti-row"><span class="rti-label">短信内容：</span></div>
        <div class="rti-content">{{ currentTemplate.content }}</div>
      </div>
      <el-divider />
      <el-form :model="reviewForm" label-width="110px">
        <el-form-item label="服务商模板CODE" v-if="reviewAction === 'approve' || reviewAction === 'activate'" :required="reviewAction === 'activate'">
          <el-input v-model="reviewForm.vendorTemplateCode" placeholder="如 SMS_123456789">
            <template #prefix><span style="color: #909399; font-size: 12px;">CODE:</span></template>
          </el-input>
          <div class="form-tip" v-if="reviewAction === 'approve'">
            <el-icon style="color: #e6a23c; vertical-align: middle;"><Warning /></el-icon>
            填写服务商模板CODE后将<strong>直接激活</strong>模板；不填则进入「待服务商审核」阶段
          </div>
          <div class="form-tip" v-else>
            <el-icon style="color: #f56c6c; vertical-align: middle;"><Warning /></el-icon>
            激活模板<strong>必须</strong>填写服务商模板CODE，发送短信时将使用此CODE调用服务商API
          </div>
        </el-form-item>
        <el-form-item label="审核备注">
          <el-input v-model="reviewForm.note" type="textarea" :rows="3" :placeholder="reviewAction === 'reject' ? '请填写拒绝原因（必填）' : '可选备注'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReviewDialog = false">取消</el-button>
        <el-button :type="reviewAction === 'reject' ? 'danger' : 'primary'" :loading="submitting" @click="submitReview">
          {{ reviewAction === 'reject' ? '确认拒绝' : reviewAction === 'activate' ? '确认激活' : '确认通过' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, Promotion, CircleCheck, CircleClose, Search, Refresh, View, Warning } from '@element-plus/icons-vue'
import { smsManagementApi, type SmsTemplateItem } from '@/api/smsManagement'

const loading = ref(false)
const submitting = ref(false)
const list = ref<SmsTemplateItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filterStatus = ref('pending_admin')
const keyword = ref('')

const showDetailDialog = ref(false)
const showReviewDialog = ref(false)
const currentTemplate = ref<any>(null)
const reviewAction = ref<'approve' | 'reject' | 'activate'>('approve')
const reviewForm = reactive({ note: '', vendorTemplateCode: '' })

const statusCounts = ref({ pending_admin: 0, pending_vendor: 0, active: 0, rejected: 0 })

const reviewDialogTitle = computed(() => {
  const map: Record<string, string> = { approve: '审核通过', reject: '审核拒绝', activate: '激活模板' }
  return map[reviewAction.value] || '审核'
})

const categoryMap: Record<string, string> = {
  order: '订单通知', logistics: '物流通知', marketing: '营销推广',
  service: '客服通知', system: '系统通知', reminder: '提醒通知'
}
const getCategoryLabel = (v: string) => categoryMap[v] || v || '未分类'

const statusMap: Record<string, { label: string; type: string }> = {
  pending_admin: { label: '待管理员审核', type: 'warning' },
  pending_vendor: { label: '待服务商审核', type: '' },
  active: { label: '已激活', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
  withdrawn: { label: '已撤销', type: 'info' },
  pending: { label: '待审核', type: 'warning' },
  approved: { label: '已通过', type: 'success' }
}
const getStatusLabel = (s: string) => statusMap[s]?.label || s
const getStatusType = (s: string) => (statusMap[s]?.type || 'info') as any

const formatTime = (t: string) => {
  if (!t) return '—'
  return new Date(t).toLocaleString('zh-CN')
}

const handleSearch = () => {
  currentPage.value = 1
  loadList()
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await smsManagementApi.getTemplateReviewList({
      status: filterStatus.value || 'all',
      keyword: keyword.value,
      page: currentPage.value,
      pageSize: pageSize.value
    })
    if (res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
    updateCounts()
  } catch (e) {
    console.error('加载审核列表失败', e)
  } finally {
    loading.value = false
  }
}

const updateCounts = async () => {
  try {
    const statuses = ['pending_admin', 'pending_vendor', 'active', 'rejected']
    for (const s of statuses) {
      const res = await smsManagementApi.getTemplateReviewList({ status: s, page: 1, pageSize: 1 })
      if (res.data) {
        (statusCounts.value as any)[s] = res.data.total
      }
    }
  } catch (e) { /* ignore */ }
}

const showDetail = (row: any) => {
  currentTemplate.value = row
  showDetailDialog.value = true
}

const handleReview = (row: any, action: 'approve' | 'reject' | 'activate') => {
  currentTemplate.value = row
  reviewAction.value = action
  reviewForm.note = ''
  reviewForm.vendorTemplateCode = row.vendorTemplateCode || ''
  showReviewDialog.value = true
}

const submitReview = async () => {
  if (!currentTemplate.value) return
  if (reviewAction.value === 'reject' && !reviewForm.note.trim()) {
    ElMessage.warning('请填写拒绝原因')
    return
  }
  if (reviewAction.value === 'activate' && !reviewForm.vendorTemplateCode.trim()) {
    ElMessage.warning('激活模板需要填写服务商模板CODE')
    return
  }

  submitting.value = true
  try {
    await smsManagementApi.reviewTemplate(currentTemplate.value.id, {
      action: reviewAction.value,
      note: reviewForm.note,
      vendorTemplateCode: reviewForm.vendorTemplateCode || undefined
    })
    ElMessage.success(reviewAction.value === 'reject' ? '已拒绝' : '操作成功')
    showReviewDialog.value = false
    loadList()
  } catch (e) {
    console.error('审核失败', e)
  } finally {
    submitting.value = false
  }
}

onMounted(() => { loadList() })
</script>

<style scoped lang="scss">
.page-header {
  margin-bottom: 20px;
  h2 { margin: 0 0 4px 0; font-size: 20px; color: #303133; }
  .header-desc { margin: 0; font-size: 13px; color: #909399; }
}
.stats-row { margin-bottom: 20px; }
.stat-card { border-radius: 12px; }
.stat-content { display: flex; align-items: center; gap: 16px; }
.stat-icon {
  width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center;
  &.pending-icon { background: linear-gradient(135deg, #e6a23c 0%, #f5ba62 100%); color: #fff; }
  &.vendor-icon { background: linear-gradient(135deg, #909399 0%, #b1b3b8 100%); color: #fff; }
  &.active-icon { background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%); color: #fff; }
  &.rejected-icon { background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%); color: #fff; }
}
.stat-info { .stat-number { font-size: 28px; font-weight: 700; color: #303133; } .stat-label { font-size: 13px; color: #909399; } }
.main-card { border-radius: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar-left { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }

.short-id {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
  padding: 2px 6px;
  background: #ecf5ff;
  border-radius: 4px;
}

.content-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
  max-height: 3em;
  word-break: break-all;
}

.sub-text {
  font-size: 11px;
  color: #c0c4cc;
  font-family: 'Consolas', 'Monaco', monospace;
}

.content-preview { padding: 8px 12px; background: #f8f9fa; border-radius: 4px; line-height: 1.6; white-space: pre-wrap; }
.var-tag { margin-right: 6px; font-family: 'Courier New', monospace; }
.code-text { font-family: 'Courier New', monospace; color: #409eff; }
.text-muted { color: #c0c4cc; }
.form-tip { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.6; }

.review-template-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 14px 16px;
  .rti-row { display: flex; gap: 4px; margin-bottom: 6px; font-size: 13px; color: #606266; }
  .rti-label { color: #909399; white-space: nowrap; }
  .rti-content {
    background: #fff; border: 1px solid #ebeef5; border-radius: 4px; padding: 10px 12px;
    font-size: 13px; color: #303133; line-height: 1.6; white-space: pre-wrap; word-break: break-all;
  }
}
</style>

