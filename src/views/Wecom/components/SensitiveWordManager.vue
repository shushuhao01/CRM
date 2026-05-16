<template>
  <div class="sensitive-word-manager">
    <!-- 会话存档状态检测 -->
    <el-alert v-if="archiveStatus === 'unchecked'" type="info" :closable="false" style="margin-bottom: 16px">正在检测会话存档状态...</el-alert>
    <el-alert v-else-if="archiveStatus === 'disabled'" type="warning" :closable="false" style="margin-bottom: 16px" show-icon>
      <template #title><span style="font-weight:600">会话存档未开启</span></template>
      <div>敏感词扫描依赖会话存档数据，请先前往 <el-button type="primary" link @click="$emit('goArchiveSettings')">会话存档设置</el-button> 开启后再使用。</div>
    </el-alert>

    <template v-if="archiveStatus === 'enabled'">
      <!-- 统计汇总卡片 -->
      <div class="stat-cards-row">
        <div class="stat-card-item">
          <div class="stat-card-value">{{ sensitiveWords.length }}</div>
          <div class="stat-card-label">敏感词数量</div>
        </div>
        <div class="stat-card-item warn">
          <div class="stat-card-value">{{ scanResult?.scanned || 0 }}</div>
          <div class="stat-card-label">已扫描记录</div>
        </div>
        <div class="stat-card-item danger">
          <div class="stat-card-value">{{ scanResult?.marked || 0 }}</div>
          <div class="stat-card-label">标记敏感</div>
        </div>
        <div class="stat-card-item">
          <div class="stat-card-value">{{ sensitiveRate }}</div>
          <div class="stat-card-label">敏感比率</div>
        </div>
        <div class="stat-card-item info">
          <div class="stat-card-value">{{ hitTotal }}</div>
          <div class="stat-card-label">触发记录</div>
        </div>
      </div>

      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button type="warning" @click="scanSensitiveWordsHandler" :loading="scanningSensitiveWords">扫描聊天记录</el-button>
        <el-button type="primary" @click="showWordDialog = true">新建敏感词</el-button>
        <el-button @click="showWordListDialog = true">敏感词表 ({{ sensitiveWords.length }})</el-button>
        <div style="flex: 1" />
        <el-select v-model="hitDateRange" placeholder="时间范围" style="width: 120px" @change="fetchHitRecords">
          <el-option label="今日" value="today" />
          <el-option label="近7天" value="7d" />
          <el-option label="近30天" value="30d" />
          <el-option label="全部" value="all" />
        </el-select>
      </div>

      <!-- 触发记录列表 -->
      <el-table :data="hitRecords" v-loading="hitLoading" stripe>
        <el-table-column label="触发内容" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="hit-content">{{ parseContent(row.content) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发送方" width="110">
          <template #default="{ row }">
            <span>{{ row.fromUserName || row.fromUserId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="接收方" width="110">
          <template #default="{ row }">
            <span>{{ parseToUser(row.toUserIds) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="消息类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.msgType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatMsgTime(row.msgTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewContext(row)">查看上下文</el-button>
            <el-button type="danger" link size="small" @click="handleMarkAudit(row)">标记审计</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-bar">
        <span class="page-total">共 {{ hitTotal }} 条触发记录</span>
        <el-pagination
          v-model:current-page="hitPage"
          v-model:page-size="hitPageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="hitTotal"
          layout="sizes, prev, pager, next, jumper"
          small
          background
          @current-change="fetchHitRecords"
          @size-change="() => { hitPage = 1; fetchHitRecords() }"
        />
      </div>
    </template>

    <!-- 新建敏感词弹窗 -->
    <el-dialog v-model="showWordDialog" title="新建敏感词" width="500px">
      <el-input v-model="newWordsText" type="textarea" :rows="6" placeholder="每行输入一个敏感词" />
      <div class="templates-section">
        <div class="templates-title">常用模板（点击添加）</div>
        <div class="templates-tags">
          <el-tag v-for="w in commonWords" :key="w" size="small" class="tag-clickable" @click="addWord(w)">+ {{ w }}</el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="showWordDialog = false">取消</el-button>
        <el-button type="primary" @click="saveNewWords" :loading="savingSensitiveWords">保存</el-button>
      </template>
    </el-dialog>

    <!-- 敏感词表弹窗 -->
    <el-dialog v-model="showWordListDialog" title="敏感词列表" width="600px">
      <el-table :data="triggerStats" stripe size="small" max-height="400" v-loading="triggerLoading">
        <el-table-column label="敏感词" min-width="120">
          <template #default="{ row }"><el-tag type="danger" size="small" effect="plain">{{ row.word }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="triggerCount" label="触发次数" width="100" sortable />
        <el-table-column prop="lastTriggeredAt" label="最近触发" width="160" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }"><el-button type="danger" link size="small" @click="removeWord(row.word)">删除</el-button></template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showWordListDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 审计标记弹窗 -->
    <el-dialog v-model="showAuditDialog" title="标记审计" width="480px">
      <el-form label-width="80px">
        <el-form-item label="触发内容"><div class="audit-preview">{{ auditTarget?.content ? parseContent(auditTarget.content) : '-' }}</div></el-form-item>
        <el-form-item label="风险类型">
          <el-select v-model="auditForm.riskType" style="width: 100%">
            <el-option label="敏感词" value="sensitive_word" />
            <el-option label="合规问题" value="compliance" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="auditForm.remark" type="textarea" :rows="2" placeholder="审计备注" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAuditDialog = false">取消</el-button>
        <el-button type="danger" @click="submitAudit" :loading="submittingAudit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getSensitiveWords, saveSensitiveWords, scanChatRecordsForSensitiveWords,
  getSensitiveWordTriggerStats, getSensitiveHitRecords, getChatArchiveStatus, createAuditMark
} from '@/api/wecom'

defineOptions({ name: 'SensitiveWordManager' })
const props = defineProps<{ configId: number | null }>()
defineEmits<{ (e: 'goArchiveSettings'): void }>()

const archiveStatus = ref<'unchecked' | 'enabled' | 'disabled'>('unchecked')
const sensitiveWords = ref<string[]>([])
const savingSensitiveWords = ref(false)
const scanningSensitiveWords = ref(false)
const scanResult = ref<{ scanned: number; marked: number } | null>(null)

const showWordDialog = ref(false)
const showWordListDialog = ref(false)
const newWordsText = ref('')

const hitLoading = ref(false)
const hitRecords = ref<any[]>([])
const hitTotal = ref(0)
const hitPage = ref(1)
const hitPageSize = ref(10)
const hitDateRange = ref('7d')

const triggerLoading = ref(false)
const triggerStats = ref<any[]>([])

const showAuditDialog = ref(false)
const submittingAudit = ref(false)
const auditTarget = ref<any>(null)
const auditForm = ref({ riskType: 'sensitive_word', remark: '' })

const commonWords = ['退款', '投诉', '举报', '骗子', '垃圾', '工商', '消协', '315', '律师', '法院', '报警', '私下转账', '个人账户', '红包', '返现', '回扣']

const sensitiveRate = computed(() => {
  if (!scanResult.value || !scanResult.value.scanned) return '0%'
  return ((scanResult.value.marked / scanResult.value.scanned) * 100).toFixed(1) + '%'
})

const parseContent = (content: string) => {
  if (!content) return '-'
  try { const obj = JSON.parse(content); return obj.text || obj.content || content } catch { return content }
}
const parseToUser = (ids: string) => {
  if (!ids) return '-'
  try { const arr = JSON.parse(ids); return Array.isArray(arr) ? arr.join(', ') : ids } catch { return ids }
}
const formatMsgTime = (t: number) => t ? new Date(t).toLocaleString('zh-CN') : '-'

const checkArchiveStatus = async () => {
  try {
    const res: any = await getChatArchiveStatus()
    const data = res?.data || res
    archiveStatus.value = (data?.enabled || data?.isEnabled || data?.authorized) ? 'enabled' : 'disabled'
  } catch { archiveStatus.value = 'enabled' }
}

const fetchSensitiveWords = async () => {
  try {
    const res: any = await getSensitiveWords()
    const data = res?.data || res
    sensitiveWords.value = Array.isArray(data) ? data : []
  } catch { /* ignore */ }
}

const addWord = (w: string) => {
  const lines = newWordsText.value.trim() ? newWordsText.value.trim().split('\n') : []
  if (!lines.includes(w)) { lines.push(w); newWordsText.value = lines.join('\n') }
}

const saveNewWords = async () => {
  const newWords = newWordsText.value.split('\n').map(w => w.trim()).filter(Boolean)
  const merged = [...new Set([...sensitiveWords.value, ...newWords])]
  savingSensitiveWords.value = true
  try {
    await saveSensitiveWords(merged)
    sensitiveWords.value = merged
    ElMessage.success(`已保存 ${merged.length} 个敏感词`)
    showWordDialog.value = false
    newWordsText.value = ''
    fetchTriggerStats()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  finally { savingSensitiveWords.value = false }
}

const removeWord = async (word: string) => {
  const updated = sensitiveWords.value.filter(w => w !== word)
  try {
    await saveSensitiveWords(updated)
    sensitiveWords.value = updated
    ElMessage.success(`已删除敏感词「${word}」`)
    fetchTriggerStats()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

const scanSensitiveWordsHandler = async () => {
  scanningSensitiveWords.value = true
  scanResult.value = null
  try {
    const res: any = await scanChatRecordsForSensitiveWords(props.configId || undefined)
    const data = res?.data || res
    scanResult.value = { scanned: data?.scanned || 0, marked: data?.marked || 0 }
    ElMessage.success(data?.message || res?.message || '扫描完成')
    fetchHitRecords()
    fetchTriggerStats()
  } catch (e: any) { ElMessage.error(e?.message || '扫描失败') }
  finally { scanningSensitiveWords.value = false }
}

const fetchHitRecords = async () => {
  hitLoading.value = true
  try {
    const params: any = { page: hitPage.value, pageSize: hitPageSize.value }
    if (props.configId) params.configId = props.configId
    if (hitDateRange.value !== 'all') {
      const now = new Date()
      if (hitDateRange.value === 'today') params.startDate = now.toISOString().split('T')[0]
      else if (hitDateRange.value === '7d') params.startDate = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]
      else if (hitDateRange.value === '30d') params.startDate = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]
    }
    const res: any = await getSensitiveHitRecords(params)
    const data = res?.data || res
    hitRecords.value = data?.list || []
    hitTotal.value = data?.total || 0
  } catch { hitRecords.value = []; hitTotal.value = 0 }
  finally { hitLoading.value = false }
}

const fetchTriggerStats = async () => {
  triggerLoading.value = true
  try {
    const params: any = { page: 1, pageSize: 100 }
    if (props.configId) params.configId = props.configId
    const res: any = await getSensitiveWordTriggerStats(params)
    const data = res?.data || res
    triggerStats.value = data?.list || []
  } catch { triggerStats.value = [] }
  finally { triggerLoading.value = false }
}

const handleViewContext = (row: any) => {
  ElMessage.info(`请在「聊天会话」Tab中查找成员 ${row.fromUserName || row.fromUserId} 的会话`)
}

const handleMarkAudit = (row: any) => {
  auditTarget.value = row
  auditForm.value = { riskType: 'sensitive_word', remark: '' }
  showAuditDialog.value = true
}

const submitAudit = async () => {
  if (!props.configId || !auditTarget.value) return
  submittingAudit.value = true
  try {
    await createAuditMark({
      wecomConfigId: props.configId,
      chatRecordId: auditTarget.value.id,
      fromUserId: auditTarget.value.fromUserId,
      toUserId: parseToUser(auditTarget.value.toUserIds),
      msgContent: parseContent(auditTarget.value.content),
      msgType: auditTarget.value.msgType,
      msgTime: auditTarget.value.msgTime,
      riskType: auditForm.value.riskType,
      riskLevel: 'medium',
      remark: auditForm.value.remark,
    })
    ElMessage.success('审计标记已提交')
    showAuditDialog.value = false
  } catch (e: any) { ElMessage.error(e?.response?.data?.message || '标记失败') }
  finally { submittingAudit.value = false }
}

onMounted(async () => {
  await checkArchiveStatus()
  if (archiveStatus.value === 'enabled') {
    fetchSensitiveWords()
    fetchHitRecords()
    fetchTriggerStats()
  }
})

defineExpose({ fetchSensitiveWords })
</script>

<style scoped>
.stat-cards-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card-item { background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; padding: 16px; text-align: center; transition: all 0.2s; }
.stat-card-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-card-value { font-size: 24px; font-weight: 700; color: #1F2937; }
.stat-card-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.stat-card-item.warn .stat-card-value { color: #F59E0B; }
.stat-card-item.danger .stat-card-value { color: #EF4444; }
.stat-card-item.info .stat-card-value { color: #4C6EF5; }

.action-bar { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.hit-content { font-size: 13px; color: #374151; }

.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 8px 0; }
.page-total { font-size: 13px; color: #9CA3AF; }

.templates-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid #F3F4F6; }
.templates-title { font-size: 13px; font-weight: 600; color: #6B7280; margin-bottom: 8px; }
.templates-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-clickable { cursor: pointer; transition: all 0.15s; }
.tag-clickable:hover { transform: scale(1.05); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }

.audit-preview { background: #F9FAFB; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #4B5563; max-height: 80px; overflow: auto; }
</style>
