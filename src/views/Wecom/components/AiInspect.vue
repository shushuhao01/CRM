<template>
  <div class="ai-inspect">
    <el-tabs v-model="subTab">
      <el-tab-pane label="质检策略" name="strategies">
        <div class="tab-actions">
          <el-button type="primary" @click="handleCreateStrategy"><el-icon><Plus /></el-icon> 创建策略</el-button>
          <el-button @click="fetchStrategies"><el-icon><Refresh /></el-icon> 刷新</el-button>
        </div>
        <el-table :data="strategies" stripe v-loading="strategyLoading">
          <el-table-column prop="strategyName" label="策略名称" min-width="150" />
          <el-table-column label="检测类型" min-width="150">
            <template #default="{ row }">{{ formatDetectTypes(row.detectTypes) }}</template>
          </el-table-column>
          <el-table-column label="适用范围" width="100">
            <template #default="{ row }">{{ row.scope === 'all' ? '全部' : '指定' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }"><el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '停用' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleEditStrategy(row)">编辑</el-button>
              <el-button :type="row.isEnabled ? 'warning' : 'success'" link size="small" @click="handleToggleStrategy(row)">{{ row.isEnabled ? '禁用' : '启用' }}</el-button>
              <el-button type="danger" link size="small" @click="handleDeleteStrategy(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper" v-if="strategyTotal > 10">
          <el-pagination v-model:current-page="strategyPage" :page-size="10" :total="strategyTotal" layout="total, prev, pager, next" small @current-change="fetchStrategies" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="分析结果" name="results">
        <div class="tab-actions">
          <el-radio-group v-model="resultFilter" size="default" @change="handleResultFilterChange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="fail">不合格</el-radio-button>
            <el-radio-button label="pending">待分析</el-radio-button>
          </el-radio-group>
          <el-button @click="handleRunInspection" :loading="runningInspection" style="margin-left:8px">
            <el-icon><VideoPlay /></el-icon> 执行质检
          </el-button>
          <el-button style="margin-left: auto" @click="handleExportResults">导出报表</el-button>
        </div>

        <!-- 质检概况卡片 -->
        <div class="inspect-summary">
          <div class="inspect-stat"><span class="inspect-stat-val">{{ inspectStats.total }}</span><span class="inspect-stat-label">总质检数</span></div>
          <div class="inspect-stat"><span class="inspect-stat-val" style="color:#10B981">{{ inspectStats.pass }}</span><span class="inspect-stat-label">合格</span></div>
          <div class="inspect-stat"><span class="inspect-stat-val" style="color:#EF4444">{{ inspectStats.fail }}</span><span class="inspect-stat-label">不合格</span></div>
          <div class="inspect-stat"><span class="inspect-stat-val" style="color:#F59E0B">{{ inspectStats.pending }}</span><span class="inspect-stat-label">待分析</span></div>
          <div class="inspect-stat"><span class="inspect-stat-val">{{ inspectStats.avgScore }}</span><span class="inspect-stat-label">平均评分</span></div>
        </div>

        <el-table :data="results" stripe v-loading="resultLoading">
          <el-table-column prop="employeeName" label="员工" width="100" />
          <el-table-column prop="customerName" label="客户" width="100" />
          <el-table-column label="评分" width="80">
            <template #default="{ row }">
              <span :class="['score', row.riskLevel]">{{ row.totalScore }}</span>
            </template>
          </el-table-column>
          <el-table-column label="等级" width="80">
            <template #default="{ row }">
              <el-tag :type="row.riskLevel === 'excellent' ? 'success' : row.riskLevel === 'pass' ? 'warning' : 'danger'" size="small">
                {{ row.riskLevel === 'excellent' ? '优秀' : row.riskLevel === 'pass' ? '合格' : '不合格' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="messageCount" label="消息数" width="80" />
          <el-table-column prop="analyzedAt" label="分析时间" width="160" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleViewReport(row)">查看报告</el-button>
              <el-button type="warning" link size="small" @click="handleReviewInspection(row)">复核</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination v-model:current-page="resultPage" v-model:page-size="resultPageSize" :total="resultTotal" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @size-change="fetchResults" @current-change="fetchResults" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 质检报告抽屉 -->
    <AiInspectReportDrawer v-if="reportDrawerVisible" v-model="reportDrawerVisible" :report="selectedReport" />

    <!-- 复核弹窗 -->
    <el-dialog v-model="reviewDialogVisible" title="质检复核" width="500px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="员工">{{ reviewingRow?.employeeName }}</el-form-item>
        <el-form-item label="客户">{{ reviewingRow?.customerName }}</el-form-item>
        <el-form-item label="当前评分">{{ reviewingRow?.totalScore }} 分</el-form-item>
        <el-form-item label="复核评分">
          <el-input-number v-model="reviewScore" :min="0" :max="100" :step="5" />
        </el-form-item>
        <el-form-item label="复核意见">
          <el-input v-model="reviewRemark" type="textarea" :rows="3" placeholder="请输入复核意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReview" :loading="submittingReview">确认复核</el-button>
      </template>
    </el-dialog>

    <!-- 创建/编辑策略弹窗 -->
    <el-dialog v-model="strategyDialogVisible" :title="editingStrategy ? '编辑质检策略' : '创建质检策略'" width="580px" destroy-on-close>
      <el-form ref="strategyFormRef" :model="strategyForm" :rules="strategyRules" label-width="100px">
        <el-form-item label="策略名称" prop="strategyName">
          <el-input v-model="strategyForm.strategyName" placeholder="请输入策略名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="检测类型" prop="detectTypes">
          <el-checkbox-group v-model="strategyForm.detectTypes">
            <el-checkbox label="sensitive_word">敏感词检测</el-checkbox>
            <el-checkbox label="response_time">响应时效</el-checkbox>
            <el-checkbox label="service_quality">服务质量</el-checkbox>
            <el-checkbox label="customer_satisfaction">客户满意度</el-checkbox>
            <el-checkbox label="compliance">合规检查</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="适用范围" prop="scope">
          <el-radio-group v-model="strategyForm.scope">
            <el-radio label="all">全部员工</el-radio>
            <el-radio label="specified">指定员工</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="AI智能体" v-if="aiAgents.length > 0">
          <el-select v-model="strategyForm.agentId" placeholder="选择AI智能体（来自AI助手配置）" clearable style="width:100%">
            <el-option v-for="a in aiAgents" :key="a.id" :label="a.agentName" :value="a.id" />
          </el-select>
          <div style="font-size:12px;color:#909399;margin-top:4px">关联AI助手中配置的智能体进行质检分析</div>
        </el-form-item>
        <el-form-item label="响应时效" v-if="strategyForm.detectTypes.includes('response_time')">
          <el-input-number v-model="strategyForm.maxResponseTime" :min="10" :max="3600" :step="10" /> <span style="margin-left:8px;color:#909399">秒</span>
        </el-form-item>
        <el-form-item label="质检评分">
          <el-slider v-model="strategyForm.passScore" :min="0" :max="100" :step="5" show-input />
          <div style="font-size:12px;color:#909399;margin-top:4px">低于此分数标记为不合格</div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="strategyForm.description" type="textarea" :rows="3" placeholder="策略描述（可选）" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="strategyForm.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="strategyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStrategy" :loading="savingStrategy">{{ editingStrategy ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { Plus, Refresh, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getQualityRules, createQualityRule, updateQualityRule, deleteQualityRule, getQualityInspections, runQualityInspection, getQualityInspectionStats } from '@/api/wecom'
import { getAiAgents } from '@/api/wecomAi'
import AiInspectReportDrawer from './AiInspectReportDrawer.vue'

defineOptions({ name: 'AiInspect' })

const props = defineProps<{ configId?: number | null; isDemoMode?: boolean }>()

const subTab = ref('strategies')
const resultFilter = ref('all')

// 策略
const strategies = ref<any[]>([])
const strategyLoading = ref(false)
const strategyPage = ref(1)
const strategyTotal = ref(0)

// AI智能体列表（来自AI助手）
const aiAgents = ref<any[]>([])

// 策略弹窗
const strategyDialogVisible = ref(false)
const editingStrategy = ref<any>(null)
const savingStrategy = ref(false)
const strategyFormRef = ref<FormInstance>()
const strategyForm = reactive({
  strategyName: '',
  detectTypes: [] as string[],
  scope: 'all',
  agentId: null as number | null,
  maxResponseTime: 60,
  passScore: 60,
  description: '',
  isEnabled: true
})
const strategyRules: FormRules = {
  strategyName: [{ required: true, message: '请输入策略名称', trigger: 'blur' }],
  detectTypes: [{ required: true, type: 'array', min: 1, message: '请选择至少一种检测类型', trigger: 'change' }],
  scope: [{ required: true, message: '请选择适用范围', trigger: 'change' }],
}

// 结果
const results = ref<any[]>([])
const resultLoading = ref(false)
const resultPage = ref(1)
const resultPageSize = ref(20)
const resultTotal = ref(0)
const runningInspection = ref(false)

// 报告
const reportDrawerVisible = ref(false)
const selectedReport = ref<any>(null)

// 复核
const reviewDialogVisible = ref(false)
const reviewingRow = ref<any>(null)
const reviewScore = ref(0)
const reviewRemark = ref('')
const submittingReview = ref(false)

// 统计
const inspectStats = reactive({ total: 0, pass: 0, fail: 0, pending: 0, avgScore: 0 })

const formatDetectTypes = (types: string) => {
  try {
    const arr = JSON.parse(types || '[]')
    const labels: Record<string, string> = {
      sensitive_word: '敏感词检测', response_time: '响应时效', service_quality: '服务质量',
      customer_satisfaction: '客户满意度', compliance: '合规检查'
    }
    return arr.map((t: string) => labels[t] || t).join(', ')
  } catch { return types || '-' }
}

/** 获取AI助手中配置的智能体列表 */
const fetchAiAgents = async () => {
  try {
    const res: any = await getAiAgents()
    aiAgents.value = Array.isArray(res) ? res : (res?.data || [])
  } catch {
    aiAgents.value = []
  }
}

const fetchStrategies = async () => {
  strategyLoading.value = true
  try {
    const res: any = await getQualityRules()
    strategies.value = Array.isArray(res) ? res : []
    strategyTotal.value = strategies.value.length
  } catch {
    strategies.value = []
  } finally {
    strategyLoading.value = false
  }
}

const fetchResults = async () => {
  resultLoading.value = true
  try {
    const res: any = await getQualityInspections({
      configId: props.configId || undefined,
      status: resultFilter.value === 'all' ? undefined : resultFilter.value,
      page: resultPage.value,
      pageSize: resultPageSize.value
    })
    if (res?.list) {
      results.value = res.list
      resultTotal.value = res.total || 0
    } else {
      results.value = Array.isArray(res) ? res : []
      resultTotal.value = results.value.length
    }
  } catch {
    results.value = []
    resultTotal.value = 0
  } finally {
    resultLoading.value = false
  }
}

const handleResultFilterChange = () => {
  resultPage.value = 1
  fetchResults()
}

const fetchInspectStats = async () => {
  try {
    const res: any = await getQualityInspectionStats(props.configId || undefined)
    if (res) {
      inspectStats.total = res.total || 0
      inspectStats.pass = res.pass || 0
      inspectStats.fail = res.fail || 0
      inspectStats.pending = res.pending || 0
      inspectStats.avgScore = res.avgScore || 0
    }
  } catch { /* silent */ }
}

const resetStrategyForm = () => {
  strategyForm.strategyName = ''
  strategyForm.detectTypes = []
  strategyForm.scope = 'all'
  strategyForm.agentId = null
  strategyForm.maxResponseTime = 60
  strategyForm.passScore = 60
  strategyForm.description = ''
  strategyForm.isEnabled = true
}

const handleCreateStrategy = () => {
  editingStrategy.value = null
  resetStrategyForm()
  strategyDialogVisible.value = true
}

const handleEditStrategy = (row: any) => {
  editingStrategy.value = row
  strategyForm.strategyName = row.strategyName || ''
  try {
    strategyForm.detectTypes = JSON.parse(row.detectTypes || '[]')
  } catch { strategyForm.detectTypes = [] }
  strategyForm.scope = row.scope || 'all'
  strategyForm.agentId = row.agentId || null
  strategyForm.maxResponseTime = row.maxResponseTime || 60
  strategyForm.passScore = row.passScore || 60
  strategyForm.description = row.description || ''
  strategyForm.isEnabled = !!row.isEnabled
  strategyDialogVisible.value = true
}

const submitStrategy = async () => {
  if (!strategyFormRef.value) return
  try {
    await strategyFormRef.value.validate()
  } catch { return }

  savingStrategy.value = true
  try {
    const data = {
      strategyName: strategyForm.strategyName,
      detectTypes: JSON.stringify(strategyForm.detectTypes),
      scope: strategyForm.scope,
      agentId: strategyForm.agentId,
      maxResponseTime: strategyForm.maxResponseTime,
      passScore: strategyForm.passScore,
      description: strategyForm.description,
      isEnabled: strategyForm.isEnabled,
      configId: props.configId || undefined
    }
    if (editingStrategy.value) {
      await updateQualityRule(editingStrategy.value.id, data)
      ElMessage.success('策略已更新')
    } else {
      await createQualityRule(data)
      ElMessage.success('策略已创建')
    }
    strategyDialogVisible.value = false
    fetchStrategies()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    savingStrategy.value = false
  }
}

const handleToggleStrategy = async (row: any) => {
  try {
    await updateQualityRule(row.id, { isEnabled: !row.isEnabled })
    ElMessage.success(row.isEnabled ? '已禁用' : '已启用')
    fetchStrategies()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

const handleDeleteStrategy = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定删除该质检策略？', '提示', { type: 'warning' })
    await deleteQualityRule(row.id)
    ElMessage.success('已删除')
    fetchStrategies()
  } catch { /* cancelled */ }
}

const handleRunInspection = async () => {
  if (!props.configId) { ElMessage.warning('请先选择企微配置'); return }
  runningInspection.value = true
  try {
    const res: any = await runQualityInspection({ configId: props.configId })
    ElMessage.success(res?.message || '质检执行完成')
    fetchResults()
    fetchInspectStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '执行失败')
  } finally {
    runningInspection.value = false
  }
}

const handleViewReport = (row: any) => {
  // 构造报告数据，兼容后端直接返回完整报告 或 仅返回基础字段
  selectedReport.value = {
    id: row.id,
    employeeName: row.employeeName || '-',
    customerName: row.customerName || '-',
    strategyName: row.strategyName || '-',
    totalScore: row.totalScore || 0,
    riskLevel: row.riskLevel || 'fail',
    analyzedAt: row.analyzedAt || '-',
    messageCount: row.messageCount || 0,
    dimensions: row.dimensions || [],
    highlights: row.highlights || [],
    improvements: row.improvements || [],
    risks: row.risks || [],
    suggestion: row.suggestion || '暂无AI建议'
  }
  reportDrawerVisible.value = true
}

const handleReviewInspection = (row: any) => {
  reviewingRow.value = row
  reviewScore.value = row.totalScore || 0
  reviewRemark.value = ''
  reviewDialogVisible.value = true
}

const submitReview = async () => {
  if (!reviewingRow.value) return
  submittingReview.value = true
  try {
    await updateQualityRule(reviewingRow.value.id, {
      reviewScore: reviewScore.value,
      reviewRemark: reviewRemark.value,
      isReviewed: true
    })
    ElMessage.success('复核已提交')
    reviewDialogVisible.value = false
    fetchResults()
    fetchInspectStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '复核提交失败')
  } finally {
    submittingReview.value = false
  }
}

const handleExportResults = async () => {
  try {
    const params = {
      configId: props.configId || undefined,
      status: resultFilter.value === 'all' ? undefined : resultFilter.value
    }
    const res: any = await getQualityInspections({ ...params, page: 1, pageSize: 9999 })
    const list = res?.list || (Array.isArray(res) ? res : [])
    if (list.length === 0) {
      ElMessage.warning('暂无数据可导出')
      return
    }
    // 简易CSV导出
    const header = '员工,客户,评分,等级,消息数,分析时间'
    const rows = list.map((r: any) => {
      const level = r.riskLevel === 'excellent' ? '优秀' : r.riskLevel === 'pass' ? '合格' : '不合格'
      return [r.employeeName, r.customerName, r.totalScore, level, r.messageCount, r.analyzedAt].join(',')
    })
    const csvContent = '\uFEFF' + header + '\n' + rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ai-inspect-report-' + new Date().toISOString().slice(0, 10) + '.csv'
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('报表已导出')
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败')
  }
}

watch(() => props.configId, () => {
  fetchStrategies()
  fetchResults()
  fetchInspectStats()
})

onMounted(() => {
  fetchStrategies()
  fetchResults()
  fetchInspectStats()
  fetchAiAgents()
})
</script>

<style scoped lang="scss">
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
.score { font-weight: 700; font-size: 16px; }
.score.excellent { color: #10B981; }
.score.pass { color: #F59E0B; }
.score.fail { color: #EF4444; }

.inspect-summary {
  display: flex; gap: 16px; margin-bottom: 16px; padding: 14px 20px;
  background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%);
  border: 1px solid #e0e7ff; border-radius: 10px;
}
.inspect-stat { text-align: center; flex: 1; }
.inspect-stat-val { display: block; font-size: 22px; font-weight: 700; color: #1F2937; }
.inspect-stat-label { display: block; font-size: 12px; color: #9CA3AF; margin-top: 2px; }

.pagination-wrapper { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
