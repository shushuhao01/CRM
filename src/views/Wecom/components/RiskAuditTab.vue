<template>
  <div class="risk-audit-tab">
    <!-- 统计卡片 -->
    <div class="audit-stat-cards">
      <div class="audit-stat-card">
        <div class="audit-stat-value">{{ auditStats.total }}</div>
        <div class="audit-stat-label">总标记</div>
      </div>
      <div class="audit-stat-card pending">
        <div class="audit-stat-value">{{ auditStats.pending }}</div>
        <div class="audit-stat-label">待处理</div>
      </div>
      <div class="audit-stat-card processing">
        <div class="audit-stat-value">{{ auditStats.processing }}</div>
        <div class="audit-stat-label">处理中</div>
      </div>
      <div class="audit-stat-card resolved">
        <div class="audit-stat-value">{{ auditStats.resolved }}</div>
        <div class="audit-stat-label">已处理</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="audit-filter-bar">
      <el-select v-model="filters.riskType" placeholder="风险类型" clearable style="width: 140px" @change="fetchList">
        <el-option label="敏感词" value="sensitive_word" />
        <el-option label="合规问题" value="compliance" />
        <el-option label="服务态度" value="attitude" />
        <el-option label="信息泄露" value="leak" />
        <el-option label="其他" value="other" />
      </el-select>
      <el-select v-model="filters.status" placeholder="处理状态" clearable style="width: 120px" @change="fetchList">
        <el-option label="待处理" value="pending" />
        <el-option label="处理中" value="processing" />
        <el-option label="已处理" value="resolved" />
        <el-option label="已驳回" value="dismissed" />
      </el-select>
      <el-input v-model="filters.operatorName" placeholder="操作人" clearable style="width: 140px" @keyup.enter="fetchList" />
      <el-button type="primary" @click="fetchList">查询</el-button>
      <div style="flex: 1" />
      <span class="count-label">共 {{ total }} 条记录</span>
    </div>

    <!-- 审计记录表格 -->
    <el-table :data="auditList" v-loading="loading" stripe>
      <el-table-column label="风险类型" width="110">
        <template #default="{ row }">
          <el-tag :type="riskTypeTag(row.riskType)" size="small">{{ riskTypeLabel(row.riskType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="风险等级" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="riskLevelTag(row.riskLevel)" size="small" effect="dark">{{ riskLevelLabel(row.riskLevel) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="消息原文" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="msg-preview">{{ row.msgContent || '[非文本消息]' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="发送者" width="120">
        <template #default="{ row }">
          <el-tooltip v-if="row.fromUserName" :content="row.fromUserId" placement="top" :show-after="300">
            <span>{{ row.fromUserName }}</span>
          </el-tooltip>
          <span v-else class="sender-id">{{ row.fromUserId || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="审计备注" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.remark || '-' }}</template>
      </el-table-column>
      <el-table-column label="标记人" width="100">
        <template #default="{ row }">{{ row.operatorName || '-' }}</template>
      </el-table-column>
      <el-table-column label="标记时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handleViewContext(row)">查看上下文</el-button>
          <el-button v-if="row.status === 'pending'" type="success" link size="small" @click="handleResolve(row)">处理</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-bar">
      <span class="page-total">共 {{ total }} 条记录</span>
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="sizes, prev, pager, next, jumper"
        small
        background
        @current-change="fetchList"
        @size-change="() => { currentPage = 1; fetchList() }"
      />
    </div>

    <!-- 处理弹窗 -->
    <el-dialog v-model="resolveDialogVisible" title="处理风险标记" width="480px">
      <el-form label-width="80px">
        <el-form-item label="处理结果">
          <el-radio-group v-model="resolveForm.status">
            <el-radio label="resolved">已处理</el-radio>
            <el-radio label="dismissed">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input v-model="resolveForm.resolveRemark" type="textarea" :rows="3" placeholder="输入处理说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitResolve" :loading="resolving">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getAuditMarks, updateAuditMark, getAuditMarkStats } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const props = defineProps<{ configId: number | null }>()
const emit = defineEmits<{
  (e: 'gotoConversation', data: { fromUserId: string; toUserId: string; msgTime: number }): void
}>()

const loading = ref(false)
const auditList = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const auditStats = reactive({ total: 0, pending: 0, processing: 0, resolved: 0 })

const filters = reactive({ riskType: '', status: '', operatorName: '' })

const resolveDialogVisible = ref(false)
const resolving = ref(false)
const resolveTarget = ref<any>(null)
const resolveForm = reactive({ status: 'resolved', resolveRemark: '' })

const formatDate = (d: string) => d ? formatDateTime(d) : '-'

const riskTypeLabel = (t: string) => ({ sensitive_word: '敏感词', compliance: '合规问题', attitude: '服务态度', leak: '信息泄露', other: '其他' }[t] || t)
const riskTypeTag = (t: string) => ({ sensitive_word: 'danger', compliance: 'warning', attitude: 'info', leak: 'danger', other: '' }[t] || '' as any)
const riskLevelLabel = (l: string) => ({ low: '低', medium: '中', high: '高', critical: '严重' }[l] || l)
const riskLevelTag = (l: string) => ({ low: 'info', medium: 'warning', high: 'danger', critical: 'danger' }[l] || '' as any)
const statusLabel = (s: string) => ({ pending: '待处理', processing: '处理中', resolved: '已处理', dismissed: '已驳回' }[s] || s)
const statusTag = (s: string) => ({ pending: 'warning', processing: '', resolved: 'success', dismissed: 'info' }[s] || '' as any)

const fetchList = async () => {
  if (!props.configId) return
  loading.value = true
  try {
    const res: any = await getAuditMarks({
      configId: props.configId,
      riskType: filters.riskType || undefined,
      status: filters.status || undefined,
      operatorName: filters.operatorName || undefined,
      page: currentPage.value,
      pageSize: pageSize.value,
    })
    const data = res?.data || res
    auditList.value = data?.list || []
    total.value = data?.total || 0
  } catch { auditList.value = [] }
  finally { loading.value = false }
}

const fetchStats = async () => {
  if (!props.configId) return
  try {
    const res: any = await getAuditMarkStats(props.configId)
    const data = res?.data || res
    if (data) Object.assign(auditStats, data)
  } catch { /* ignore */ }
}

const handleViewContext = (row: any) => {
  emit('gotoConversation', {
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    msgTime: row.msgTime
  })
}

const handleResolve = (row: any) => {
  resolveTarget.value = row
  resolveForm.status = 'resolved'
  resolveForm.resolveRemark = ''
  resolveDialogVisible.value = true
}

const submitResolve = async () => {
  if (!resolveTarget.value) return
  resolving.value = true
  try {
    await updateAuditMark(resolveTarget.value.id, {
      status: resolveForm.status,
      resolveRemark: resolveForm.resolveRemark,
    })
    ElMessage.success('处理完成')
    resolveDialogVisible.value = false
    fetchList()
    fetchStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '处理失败')
  } finally {
    resolving.value = false
  }
}

watch(() => props.configId, () => { fetchList(); fetchStats() })
onMounted(() => { fetchList(); fetchStats() })
</script>

<style scoped>
.audit-stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.audit-stat-card {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 10px;
  padding: 16px 20px; text-align: center; transition: all 0.2s;
}
.audit-stat-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.audit-stat-value { font-size: 24px; font-weight: 700; color: #1F2937; }
.audit-stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.audit-stat-card.pending .audit-stat-value { color: #F59E0B; }
.audit-stat-card.processing .audit-stat-value { color: #4C6EF5; }
.audit-stat-card.resolved .audit-stat-value { color: #10B981; }

.audit-filter-bar { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.count-label { font-size: 13px; color: #9CA3AF; }
.msg-preview { font-size: 13px; color: #4B5563; }
.sender-id { font-size: 12px; color: #9CA3AF; font-family: monospace; word-break: break-all; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 8px 0; }
.page-total { font-size: 13px; color: #9CA3AF; }
</style>
