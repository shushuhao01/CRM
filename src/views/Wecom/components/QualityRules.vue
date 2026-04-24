<template>
  <div class="quality-rules">
    <!-- 顶部统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-val">{{ stats.total }}</div>
        <div class="stat-label">总质检数</div>
      </div>
      <div class="stat-card stat-card-success">
        <div class="stat-val">{{ stats.excellent }}</div>
        <div class="stat-label">优秀</div>
      </div>
      <div class="stat-card stat-card-warning">
        <div class="stat-val">{{ stats.normal }}</div>
        <div class="stat-label">正常</div>
      </div>
      <div class="stat-card stat-card-danger">
        <div class="stat-val">{{ stats.violation }}</div>
        <div class="stat-label">违规</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">{{ stats.avgScore }}</div>
        <div class="stat-label">平均分</div>
      </div>
    </div>

    <!-- 内部Tab: 规则管理 / 质检记录 -->
    <el-tabs v-model="innerTab" type="border-card">
      <!-- Tab A: 规则管理 -->
      <el-tab-pane label="规则管理" name="rules">
        <div class="toolbar">
          <el-button type="primary" @click="openRuleDialog(null)">
            <el-icon><Plus /></el-icon> 新建规则
          </el-button>
          <el-tag type="info">共 {{ rules.length }} 条规则</el-tag>
        </div>

        <el-table :data="rules" v-loading="rulesLoading" stripe>
          <el-table-column label="规则名称" prop="name" min-width="150" />
          <el-table-column label="规则类型" width="130">
            <template #default="{ row }">
              <el-tag :type="ruleTypeTag(row.ruleType)">{{ ruleTypeLabel(row.ruleType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="分值" width="80" align="center">
            <template #default="{ row }">
              <span :style="{ color: row.scoreValue >= 0 ? '#67c23a' : '#f56c6c' }">
                {{ row.scoreValue >= 0 ? '+' : '' }}{{ row.scoreValue }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.isEnabled" @change="toggleRule(row)" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openRuleDialog(row)">编辑</el-button>
              <el-popconfirm title="确定删除此规则？" @confirm="handleDeleteRule(row.id)">
                <template #reference>
                  <el-button link type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- Tab B: 质检记录 -->
      <el-tab-pane label="质检记录" name="inspections">
        <div class="toolbar">
          <el-select v-model="inspFilter.status" placeholder="状态筛选" clearable style="width: 130px" @change="fetchInspections">
            <el-option label="全部" value="" />
            <el-option label="待质检" value="pending" />
            <el-option label="正常" value="normal" />
            <el-option label="优秀" value="excellent" />
            <el-option label="违规" value="violation" />
          </el-select>
          <el-button type="warning" :loading="runningInspection" @click="handleRunInspection">
            <el-icon><VideoPlay /></el-icon> 执行质检
          </el-button>
          <div style="flex: 1"></div>
          <el-pagination
            v-model:current-page="inspFilter.page"
            v-model:page-size="inspFilter.pageSize"
            :total="inspTotal"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next"
            small
            @size-change="fetchInspections"
            @current-change="fetchInspections"
          />
        </div>

        <el-table :data="inspections" v-loading="inspLoading" stripe>
          <el-table-column label="员工" min-width="130">
            <template #default="{ row }">{{ row.fromUserName || row.fromUserId }}</template>
          </el-table-column>
          <el-table-column label="消息数" prop="messageCount" width="80" align="center" />
          <el-table-column label="评分" width="80" align="center">
            <template #default="{ row }">
              <span :style="{ fontWeight: 'bold', color: scoreColor(row.score) }">{{ row.score ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="违规类型" min-width="200">
            <template #default="{ row }">
              <span v-if="row.violationType" class="violation-text">{{ parseViolations(row.violationType) }}</span>
              <span v-else style="color: #c0c4cc">-</span>
            </template>
          </el-table-column>
          <el-table-column label="质检时间" width="160">
            <template #default="{ row }">{{ formatDate(row.inspectedAt || row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openReviewDialog(row)">复核</el-button>
              <el-popconfirm title="确定删除此记录？" @confirm="handleDeleteInspection(row.id)">
                <template #reference>
                  <el-button link type="danger" size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 规则编辑弹窗 -->
    <el-dialog v-model="ruleDialogVisible" :title="ruleForm.id ? '编辑规则' : '新建规则'" width="560px" destroy-on-close>
      <el-form :model="ruleForm" label-width="100px" :rules="ruleFormRules" ref="ruleFormRef">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name" placeholder="如：客户消息30分钟内必须响应" />
        </el-form-item>
        <el-form-item label="规则类型" prop="ruleType">
          <el-select v-model="ruleForm.ruleType" placeholder="选择类型" style="width: 100%" @change="handleRuleTypeChange">
            <el-option label="响应时长" value="response_time" />
            <el-option label="消息数量" value="msg_count" />
            <el-option label="关键词检测" value="keyword" />
            <el-option label="情绪分析" value="emotion" />
          </el-select>
        </el-form-item>

        <!-- 按类型展示不同的条件配置 -->
        <el-form-item label="条件参数">
          <template v-if="ruleForm.ruleType === 'response_time'">
            <div class="condition-row">
              <span>最大响应时间(分钟)：</span>
              <el-input-number v-model="ruleConditions.maxResponseMinutes" :min="1" :max="1440" />
            </div>
          </template>
          <template v-else-if="ruleForm.ruleType === 'msg_count'">
            <div class="condition-row">
              <span>最少消息数：</span>
              <el-input-number v-model="ruleConditions.minCount" :min="1" :max="9999" />
            </div>
          </template>
          <template v-else-if="ruleForm.ruleType === 'keyword'">
            <el-input v-model="ruleConditions.keywordsText" type="textarea" :rows="4" placeholder="每行一个关键词" />
          </template>
          <template v-else-if="ruleForm.ruleType === 'emotion'">
            <el-alert type="info" :closable="false">情绪分析功能开发中，将通过NLP检测负面情绪</el-alert>
          </template>
        </el-form-item>

        <el-form-item label="扣分/加分">
          <el-input-number v-model="ruleForm.scoreValue" :min="-50" :max="50" />
          <span style="margin-left: 8px; color: #909399; font-size: 13px">正值加分，负值扣分</span>
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="ruleForm.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingRule" @click="handleSaveRule">保存</el-button>
      </template>
    </el-dialog>

    <!-- 复核弹窗 -->
    <el-dialog v-model="reviewDialogVisible" title="质检复核" width="480px" destroy-on-close>
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="员工">
          <span>{{ reviewForm.fromUserName || reviewForm.fromUserId }}</span>
        </el-form-item>
        <el-form-item label="消息数">
          <span>{{ reviewForm.messageCount }} 条</span>
        </el-form-item>
        <el-form-item label="评分">
          <el-input-number v-model="reviewForm.score" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="reviewForm.status">
            <el-radio label="excellent">优秀</el-radio>
            <el-radio label="normal">正常</el-radio>
            <el-radio label="violation">违规</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="reviewForm.remark" type="textarea" :rows="3" placeholder="质检备注..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingReview" @click="handleSaveReview">提交复核</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'QualityRules' })
import { ref, reactive, onMounted } from 'vue'
import { Plus, VideoPlay } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getQualityRules, createQualityRule, updateQualityRule, deleteQualityRule,
  getQualityInspections, runQualityInspection, reviewQualityInspection, deleteQualityInspection,
  getQualityInspectionStats
} from '@/api/wecom'
import type { QualityRule, QualityInspection } from '../types'

const props = defineProps<{ configId: number | null }>()

const innerTab = ref('rules')

// ==================== 统计 ====================
const stats = ref({ total: 0, pending: 0, normal: 0, excellent: 0, violation: 0, avgScore: 0 })

const fetchStats = async () => {
  try {
    const res: any = await getQualityInspectionStats(props.configId || undefined)
    if (res) stats.value = { ...stats.value, ...res }
  } catch { /* silent */ }
}

// ==================== 规则管理 ====================
const rules = ref<QualityRule[]>([])
const rulesLoading = ref(false)
const ruleDialogVisible = ref(false)
const savingRule = ref(false)
const ruleFormRef = ref<FormInstance>()

const ruleForm = reactive({
  id: null as number | null,
  name: '',
  ruleType: 'response_time',
  scoreValue: -5,
  isEnabled: true
})

const ruleConditions = reactive({
  maxResponseMinutes: 30,
  minCount: 5,
  keywordsText: ''
})

const ruleFormRules: FormRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  ruleType: [{ required: true, message: '请选择规则类型', trigger: 'change' }]
}

const fetchRules = async () => {
  rulesLoading.value = true
  try {
    const res: any = await getQualityRules()
    rules.value = Array.isArray(res) ? res : []
  } catch { rules.value = [] }
  finally { rulesLoading.value = false }
}

const openRuleDialog = (rule: QualityRule | null) => {
  if (rule) {
    ruleForm.id = rule.id
    ruleForm.name = rule.name
    ruleForm.ruleType = rule.ruleType
    ruleForm.scoreValue = rule.scoreValue
    ruleForm.isEnabled = rule.isEnabled
    // 解析 conditions
    let cond: any = {}
    try { cond = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : (rule.conditions || {}) } catch { /* skip */ }
    ruleConditions.maxResponseMinutes = cond.maxResponseMinutes || 30
    ruleConditions.minCount = cond.minCount || 5
    ruleConditions.keywordsText = Array.isArray(cond.keywords) ? cond.keywords.join('\n') : ''
  } else {
    ruleForm.id = null
    ruleForm.name = ''
    ruleForm.ruleType = 'response_time'
    ruleForm.scoreValue = -5
    ruleForm.isEnabled = true
    ruleConditions.maxResponseMinutes = 30
    ruleConditions.minCount = 5
    ruleConditions.keywordsText = ''
  }
  ruleDialogVisible.value = true
}

const handleRuleTypeChange = () => {
  // 重置条件为默认值
  ruleConditions.maxResponseMinutes = 30
  ruleConditions.minCount = 5
  ruleConditions.keywordsText = ''
}

const buildConditions = () => {
  if (ruleForm.ruleType === 'response_time') return { maxResponseMinutes: ruleConditions.maxResponseMinutes }
  if (ruleForm.ruleType === 'msg_count') return { minCount: ruleConditions.minCount }
  if (ruleForm.ruleType === 'keyword') {
    const keywords = ruleConditions.keywordsText.split('\n').map(s => s.trim()).filter(Boolean)
    return { keywords }
  }
  return {}
}

const handleSaveRule = async () => {
  try {
    await ruleFormRef.value?.validate()
  } catch { return }

  savingRule.value = true
  try {
    const conditions = buildConditions()
    if (ruleForm.id) {
      await updateQualityRule(ruleForm.id, {
        name: ruleForm.name,
        ruleType: ruleForm.ruleType,
        conditions,
        scoreValue: ruleForm.scoreValue,
        isEnabled: ruleForm.isEnabled
      })
      ElMessage.success('规则已更新')
    } else {
      await createQualityRule({
        name: ruleForm.name,
        ruleType: ruleForm.ruleType,
        conditions,
        scoreValue: ruleForm.scoreValue,
        isEnabled: ruleForm.isEnabled
      })
      ElMessage.success('规则已创建')
    }
    ruleDialogVisible.value = false
    fetchRules()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    savingRule.value = false
  }
}

const toggleRule = async (rule: QualityRule) => {
  try {
    await updateQualityRule(rule.id, { isEnabled: rule.isEnabled })
    ElMessage.success(rule.isEnabled ? '规则已启用' : '规则已禁用')
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败')
    rule.isEnabled = !rule.isEnabled
  }
}

const handleDeleteRule = async (id: number) => {
  try {
    await deleteQualityRule(id)
    ElMessage.success('规则已删除')
    fetchRules()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

// ==================== 质检记录 ====================
const inspections = ref<QualityInspection[]>([])
const inspLoading = ref(false)
const inspTotal = ref(0)
const runningInspection = ref(false)

const inspFilter = reactive({
  status: '',
  page: 1,
  pageSize: 20
})

const fetchInspections = async () => {
  inspLoading.value = true
  try {
    const params: any = { page: inspFilter.page, pageSize: inspFilter.pageSize }
    if (props.configId) params.configId = props.configId
    if (inspFilter.status) params.status = inspFilter.status
    const res: any = await getQualityInspections(params)
    if (res?.list) {
      inspections.value = res.list
      inspTotal.value = res.total || 0
    } else {
      inspections.value = []
      inspTotal.value = 0
    }
  } catch {
    inspections.value = []
    inspTotal.value = 0
  } finally {
    inspLoading.value = false
  }
}

const handleRunInspection = async () => {
  if (!props.configId) {
    ElMessage.warning('请先在顶部选择企微配置')
    return
  }
  runningInspection.value = true
  try {
    const res: any = await runQualityInspection({ configId: props.configId })
    ElMessage.success(res?.message || '质检完成')
    fetchInspections()
    fetchStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '质检执行失败')
  } finally {
    runningInspection.value = false
  }
}

const handleDeleteInspection = async (id: number) => {
  try {
    await deleteQualityInspection(id)
    ElMessage.success('记录已删除')
    fetchInspections()
    fetchStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

// ==================== 复核 ====================
const reviewDialogVisible = ref(false)
const savingReview = ref(false)
const reviewForm = reactive({
  id: 0,
  fromUserId: '',
  fromUserName: '',
  messageCount: 0,
  score: 80,
  status: 'normal',
  remark: ''
})

const openReviewDialog = (insp: QualityInspection) => {
  reviewForm.id = insp.id
  reviewForm.fromUserId = insp.fromUserId
  reviewForm.fromUserName = insp.fromUserName || ''
  reviewForm.messageCount = insp.messageCount
  reviewForm.score = insp.score ?? 80
  reviewForm.status = insp.status || 'normal'
  reviewForm.remark = insp.remark || ''
  reviewDialogVisible.value = true
}

const handleSaveReview = async () => {
  savingReview.value = true
  try {
    await reviewQualityInspection(reviewForm.id, {
      status: reviewForm.status,
      score: reviewForm.score,
      remark: reviewForm.remark
    })
    ElMessage.success('复核已提交')
    reviewDialogVisible.value = false
    fetchInspections()
    fetchStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '复核失败')
  } finally {
    savingReview.value = false
  }
}

// ==================== 工具方法 ====================
const ruleTypeLabel = (type: string) => {
  const map: Record<string, string> = { response_time: '响应时长', msg_count: '消息数量', keyword: '关键词', emotion: '情绪分析' }
  return map[type] || type
}
const ruleTypeTag = (type: string) => {
  const map: Record<string, string> = { response_time: 'warning', msg_count: 'info', keyword: 'danger', emotion: 'success' }
  return (map[type] || '') as any
}
const statusLabel = (s: string) => {
  const map: Record<string, string> = { pending: '待质检', normal: '正常', excellent: '优秀', violation: '违规' }
  return map[s] || s
}
const statusTag = (s: string) => {
  const map: Record<string, string> = { pending: 'info', normal: '', excellent: 'success', violation: 'danger' }
  return (map[s] || 'info') as any
}
const scoreColor = (score: number | null | undefined) => {
  if (score == null) return '#c0c4cc'
  if (score >= 90) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}
const parseViolations = (v: string) => {
  try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr.join(', ') : v; } catch { return v; }
}
const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return '-'
  try { return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return String(d) }
}

// ==================== 初始化 ====================
const init = () => {
  fetchRules()
  fetchInspections()
  fetchStats()
}

onMounted(init)

defineExpose({ fetchRules, fetchInspections, fetchStats, init })
</script>

<style scoped lang="scss">
.quality-rules { padding: 0; }

.stats-cards {
  display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
}
.stat-card {
  flex: 1; min-width: 100px; padding: 14px 16px; background: #f5f7fa;
  border-radius: 8px; text-align: center; border: 1px solid #e4e7ed;
}
.stat-card-success { background: #f0f9eb; border-color: #e1f3d8; }
.stat-card-warning { background: #fdf6ec; border-color: #faecd8; }
.stat-card-danger { background: #fef0f0; border-color: #fde2e2; }
.stat-val { font-size: 22px; font-weight: 700; color: #303133; }
.stat-label { font-size: 12px; color: #909399; margin-top: 4px; }

.toolbar {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;
}

.condition-row {
  display: flex; align-items: center; gap: 10px;
  span { white-space: nowrap; font-size: 13px; color: #606266; }
}

.violation-text { color: #f56c6c; font-size: 13px; }
</style>

