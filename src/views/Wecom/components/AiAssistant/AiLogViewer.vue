<template>
  <div class="ai-log-viewer">
    <!-- 调用统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-purple">
          <div class="stat-value">{{ stats.todayCalls || 0 }}</div>
          <div class="stat-label">今日调用</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-green">
          <div class="stat-value">{{ stats.todaySuccessRate || '0%' }}</div>
          <div class="stat-label">成功率</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-blue">
          <div class="stat-value">{{ stats.avgDuration || '0' }}s</div>
          <div class="stat-label">平均耗时</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-orange">
          <div class="stat-value">{{ formatTokens(stats.monthTokens) }}</div>
          <div class="stat-label">本月Token</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 月度统计信息 -->
    <el-alert v-if="stats.monthCalls" type="info" :closable="false" style="margin-bottom: 16px">
      本月调用: <strong>{{ stats.monthCalls }}</strong>次 &nbsp;|&nbsp;
      Token消耗: <strong>{{ formatTokens(stats.monthTokens) }}</strong> &nbsp;|&nbsp;
      预估费用: <strong>约{{ stats.estimatedCost || '0' }}元</strong>
    </el-alert>

    <!-- 筛选栏 - 重新设计，更大更清晰 -->
    <el-card shadow="never" class="filter-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="5">
          <div class="filter-label">智能体</div>
          <el-select v-model="filter.agentId" placeholder="全部智能体" clearable style="width: 100%" @change="handleFilterChange">
            <el-option v-for="a in agents" :key="a.id" :label="a.agentName" :value="a.id" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <div class="filter-label">操作类型</div>
          <el-select v-model="filter.operationType" placeholder="全部类型" clearable style="width: 100%" @change="handleFilterChange">
            <el-option label="会话质检" value="quality_inspect" />
            <el-option label="智能回复" value="auto_reply" />
            <el-option label="跟进建议" value="follow_suggest" />
            <el-option label="自动标签" value="auto_tag" />
            <el-option label="意向判断" value="intent_judge" />
            <el-option label="欢迎语生成" value="welcome_gen" />
            <el-option label="通用问答" value="general_qa" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <div class="filter-label">状态</div>
          <el-select v-model="filter.status" placeholder="全部状态" clearable style="width: 100%" @change="handleFilterChange">
            <el-option label="成功" value="success" />
            <el-option label="失败" value="fail" />
            <el-option label="超时" value="timeout" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <div class="filter-label">开始日期</div>
          <el-date-picker v-model="filter.startDate" type="date" placeholder="起始日期" value-format="YYYY-MM-DD" style="width: 100%" @change="handleFilterChange" />
        </el-col>
        <el-col :span="4">
          <div class="filter-label">结束日期</div>
          <el-date-picker v-model="filter.endDate" type="date" placeholder="截止日期" value-format="YYYY-MM-DD" style="width: 100%" @change="handleFilterChange" />
        </el-col>
        <el-col :span="2">
          <div class="filter-label">&nbsp;</div>
          <el-button type="primary" @click="fetchLogs" style="width: 100%">查询</el-button>
        </el-col>
      </el-row>
      <div style="margin-top: 8px; display: flex; justify-content: flex-end; gap: 8px">
        <el-button size="small" @click="handleReset">重置</el-button>
        <el-button size="small" @click="handleExport" :loading="exporting">导出CSV</el-button>
      </div>
    </el-card>

    <!-- 日志表格 - 丰富字段 -->
    <el-table :data="logs" v-loading="loading" stripe style="margin-top: 12px">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column label="调用时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="智能体" width="120">
        <template #default="{ row }">{{ row.agentName || '-' }}</template>
      </el-table-column>
      <el-table-column label="模型" width="110">
        <template #default="{ row }">
          <el-text size="small" type="info">{{ row.modelName || row.modelId || '-' }}</el-text>
        </template>
      </el-table-column>
      <el-table-column label="操作类型" width="110">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ operationTypeLabels[row.operationType] || row.operationType }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="targetDescription" label="目标描述" min-width="180" show-overflow-tooltip />
      <el-table-column label="输入Token" width="90" align="right">
        <template #default="{ row }">{{ row.inputTokens || '-' }}</template>
      </el-table-column>
      <el-table-column label="输出Token" width="90" align="right">
        <template #default="{ row }">{{ row.outputTokens || '-' }}</template>
      </el-table-column>
      <el-table-column label="总Token" width="90" align="right">
        <template #default="{ row }">
          <strong>{{ row.totalTokens ? formatTokens(row.totalTokens) : '-' }}</strong>
        </template>
      </el-table-column>
      <el-table-column label="耗时" width="80" align="right">
        <template #default="{ row }">{{ row.durationMs ? (row.durationMs / 1000).toFixed(1) + 's' : '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'success' ? 'success' : row.status === 'timeout' ? 'warning' : 'danger'" size="small">
            {{ row.status === 'success' ? '成功' : row.status === 'timeout' ? '超时' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页控件 -->
    <div style="display: flex; justify-content: flex-end; margin-top: 16px">
      <el-pagination
        v-model:current-page="filter.page"
        v-model:page-size="filter.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchLogs"
        @current-change="fetchLogs"
      />
    </div>

    <!-- 日志详情弹窗 -->
    <el-dialog v-model="detailVisible" title="AI调用详情" width="640px">
      <div v-if="detailLog" class="log-detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="调用时间">{{ formatDate(detailLog.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="智能体">{{ detailLog.agentName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="模型">{{ detailLog.modelName || detailLog.modelId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">{{ operationTypeLabels[detailLog.operationType] || detailLog.operationType }}</el-descriptions-item>
          <el-descriptions-item label="目标描述" :span="2">{{ detailLog.targetDescription || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailLog.status === 'success' ? 'success' : 'danger'" size="small">
              {{ detailLog.status === 'success' ? '成功' : detailLog.status === 'timeout' ? '超时' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="耗时">{{ detailLog.durationMs ? (detailLog.durationMs / 1000).toFixed(1) + '秒' : '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">Token消耗</el-divider>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="输入">{{ detailLog.inputTokens || 0 }} tokens</el-descriptions-item>
          <el-descriptions-item label="输出">{{ detailLog.outputTokens || 0 }} tokens</el-descriptions-item>
          <el-descriptions-item label="合计">{{ detailLog.totalTokens || 0 }} tokens</el-descriptions-item>
        </el-descriptions>

        <template v-if="detailLog.errorMessage">
          <el-divider content-position="left">错误信息</el-divider>
          <el-alert type="error" :closable="false">{{ detailLog.errorMessage }}</el-alert>
        </template>

        <el-divider content-position="left">请求内容（脱敏）</el-divider>
        <el-collapse>
          <el-collapse-item title="展开查看">
            <pre class="payload-pre">{{ detailLog.requestPayload || '无' }}</pre>
          </el-collapse-item>
        </el-collapse>

        <el-divider content-position="left">响应内容</el-divider>
        <el-collapse>
          <el-collapse-item title="展开查看">
            <pre class="payload-pre">{{ detailLog.responsePayload || '无' }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AiLogViewer' })

import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAiLogs, getAiLogDetail, getAiLogStats, exportAiLogs, getAiAgents } from '@/api/wecomAi'

const loading = ref(false)
const logs = ref<any[]>([])
const total = ref(0)
const agents = ref<any[]>([])
const exporting = ref(false)
const stats = ref<any>({})

const filter = ref({
  page: 1, pageSize: 10, agentId: undefined as number | undefined,
  operationType: undefined as string | undefined, status: undefined as string | undefined,
  startDate: null as string | null, endDate: null as string | null,
})

const detailVisible = ref(false)
const detailLog = ref<any>(null)

const operationTypeLabels: Record<string, string> = {
  quality_inspect: '会话质检', auto_reply: '智能回复', follow_suggest: '跟进建议',
  auto_tag: '自动标签', intent_judge: '意向判断', welcome_gen: '欢迎语生成', general_qa: '通用问答',
}

const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-'

const formatTokens = (n: number) => {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

const handleFilterChange = () => {
  filter.value.page = 1
}

const handleReset = () => {
  filter.value = {
    page: 1, pageSize: 10, agentId: undefined,
    operationType: undefined, status: undefined,
    startDate: null, endDate: null,
  }
  fetchLogs()
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const params: any = {
      page: filter.value.page, pageSize: filter.value.pageSize,
      agentId: filter.value.agentId, operationType: filter.value.operationType, status: filter.value.status,
    }
    if (filter.value.startDate) params.startDate = filter.value.startDate
    if (filter.value.endDate) params.endDate = filter.value.endDate
    const res: any = await getAiLogs(params)
    if (Array.isArray(res)) {
      logs.value = res
      total.value = res.length
    } else {
      logs.value = res?.list || res?.data || res?.logs || []
      total.value = res?.total || logs.value.length
    }
  } catch { logs.value = [] }
  loading.value = false
}

const fetchStats = async () => {
  try {
    const res: any = await getAiLogStats()
    const today = res?.today || {}
    const month = res?.month || {}
    stats.value = {
      todayCalls: today.totalCalls || 0,
      todaySuccessRate: today.successRate ? today.successRate + '%' : '0%',
      avgDuration: today.avgDuration ? (today.avgDuration / 1000).toFixed(1) : '0',
      monthTokens: month.totalTokens || 0,
      monthCalls: month.totalCalls || 0,
      estimatedCost: month.estimatedCost || '0',
    }
  } catch { stats.value = {} }
}

const fetchAgents = async () => {
  try {
    const res: any = await getAiAgents()
    agents.value = Array.isArray(res) ? res : (res?.data || [])
  } catch { agents.value = [] }
}

const viewDetail = async (row: any) => {
  try {
    const res: any = await getAiLogDetail(row.id)
    detailLog.value = res || row
  } catch {
    detailLog.value = row
  }
  detailVisible.value = true
}

const handleExport = async () => {
  exporting.value = true
  try {
    const params: any = { agentId: filter.value.agentId, operationType: filter.value.operationType, status: filter.value.status }
    if (filter.value.startDate) params.startDate = filter.value.startDate
    if (filter.value.endDate) params.endDate = filter.value.endDate
    const res: any = await exportAiLogs(params)
    const blob = new Blob([res], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败')
  }
  exporting.value = false
}

onMounted(() => {
  fetchLogs()
  fetchStats()
  fetchAgents()
})
</script>

<style scoped>
.stat-card { text-align: center; border-radius: 8px; }
.stat-card .stat-value { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.stat-card .stat-label { font-size: 12px; color: #909399; }
.stat-purple .stat-value { color: #7C3AED; }
.stat-green .stat-value { color: #10B981; }
.stat-blue .stat-value { color: #3B82F6; }
.stat-orange .stat-value { color: #F59E0B; }

.filter-card {
  background: #FAFAFA;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
}
.filter-card :deep(.el-card__body) { padding: 16px 20px; }
.filter-label { font-size: 12px; color: #6B7280; margin-bottom: 4px; font-weight: 500; }

.log-detail { padding: 0; }
.payload-pre {
  background: #f5f7fa; border-radius: 6px; padding: 12px;
  font-size: 12px; line-height: 1.6; max-height: 300px; overflow: auto;
  white-space: pre-wrap; word-break: break-all;
}
</style>

