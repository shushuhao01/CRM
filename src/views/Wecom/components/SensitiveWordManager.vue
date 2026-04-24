<template>
  <div class="sensitive-word-manager">
    <!-- 会话存档未开启提示 -->
    <el-alert
      v-if="archiveStatus === 'unchecked'"
      type="info"
      :closable="false"
      style="margin-bottom: 16px"
    >
      正在检测会话存档状态...
    </el-alert>
    <el-alert
      v-else-if="archiveStatus === 'disabled'"
      type="warning"
      :closable="false"
      style="margin-bottom: 16px"
      show-icon
    >
      <template #title>
        <span style="font-weight:600">会话存档未开启</span>
      </template>
      <div>
        敏感词扫描依赖会话存档数据，请先前往
        <el-button type="primary" link @click="$emit('goArchiveSettings')">会话存档设置</el-button>
        开启后再使用此功能。
      </div>
    </el-alert>

    <!-- 正常内容区域（仅在会话存档开启后显示） -->
    <template v-if="archiveStatus === 'enabled'">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        配置敏感词后，可自动扫描聊天记录中包含敏感词的消息并标记。支持按时间范围筛选统计触发次数。
      </el-alert>

      <el-row :gutter="20">
        <!-- 左侧：敏感词编辑 -->
        <el-col :span="10">
          <el-card shadow="never" class="sw-card">
            <template #header>
              <div class="sw-card-header">
                <span class="sw-card-title">📝 敏感词列表</span>
                <el-tag size="small" type="info">{{ sensitiveWords.length }} 个</el-tag>
              </div>
            </template>
            <el-input
              v-model="sensitiveWordsText"
              type="textarea"
              :rows="14"
              placeholder="每行输入一个敏感词，例如：&#10;退款&#10;投诉&#10;骗子&#10;举报"
            />
            <div class="sw-actions">
              <el-button type="primary" @click="saveSensitiveWordsHandler" :loading="savingSensitiveWords">
                💾 保存敏感词
              </el-button>
              <el-button type="warning" @click="scanSensitiveWordsHandler" :loading="scanningSensitiveWords">
                🔍 扫描聊天记录
              </el-button>
            </div>

            <!-- 常用模板 -->
            <div class="sw-templates">
              <div class="sw-templates-title">常用敏感词模板（点击添加）</div>
              <div class="sw-templates-tags">
                <el-tag
                  v-for="word in commonSensitiveWords"
                  :key="word"
                  size="small"
                  class="sw-tag-clickable"
                  @click="addSensitiveWord(word)"
                >+ {{ word }}</el-tag>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：统计和触发记录 -->
        <el-col :span="14">
          <!-- 扫描结果概览 -->
          <el-card shadow="never" class="sw-card" style="margin-bottom:16px">
            <template #header>
              <span class="sw-card-title">📊 扫描结果概览</span>
            </template>
            <div v-if="scanResult" class="sw-scan-stats">
              <div class="sw-scan-stat">
                <div class="sw-scan-val">{{ scanResult.scanned }}</div>
                <div class="sw-scan-label">已扫描记录</div>
              </div>
              <div class="sw-scan-stat">
                <div class="sw-scan-val text-danger">{{ scanResult.marked }}</div>
                <div class="sw-scan-label">标记敏感</div>
              </div>
              <div class="sw-scan-stat">
                <div class="sw-scan-val">{{ scanResult.scanned > 0 ? ((scanResult.marked / scanResult.scanned) * 100).toFixed(1) + '%' : '0%' }}</div>
                <div class="sw-scan-label">敏感比率</div>
              </div>
            </div>
            <div v-else class="sw-scan-empty">
              保存敏感词后点击"扫描聊天记录"开始检测
            </div>
          </el-card>

          <!-- 触发次数统计 -->
          <el-card shadow="never" class="sw-card">
            <template #header>
              <div class="sw-card-header">
                <span class="sw-card-title">🔥 敏感词触发统计</span>
              </div>
            </template>

            <!-- 日期筛选 -->
            <div class="sw-filter-bar">
              <div class="sw-quick-dates">
                <el-button
                  v-for="opt in triggerDateOptions"
                  :key="opt.value"
                  :type="triggerDateRange === opt.value ? 'primary' : 'default'"
                  size="small"
                  @click="handleTriggerDateChange(opt.value)"
                >{{ opt.label }}</el-button>
              </div>
              <el-date-picker v-model="triggerStartDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" size="small" style="width:130px" />
              <span style="color:#909399;font-size:12px">至</span>
              <el-date-picker v-model="triggerEndDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" size="small" style="width:130px" />
              <el-button type="primary" size="small" @click="handleCustomTriggerQuery" :disabled="!triggerStartDate || !triggerEndDate">查询</el-button>
            </div>

            <!-- 触发排行表 -->
            <el-table :data="triggerStats" stripe size="small" max-height="360" v-loading="triggerLoading">
              <el-table-column label="排名" width="55" align="center">
                <template #default="{ $index }">
                  <span :class="['trigger-rank', (triggerPage - 1) * triggerPageSize + $index < 3 ? 'top' : '']">{{ (triggerPage - 1) * triggerPageSize + $index + 1 }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="word" label="敏感词" min-width="100">
                <template #default="{ row }">
                  <el-tag type="danger" size="small" effect="plain">{{ row.word }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="triggerCount" label="触发次数" width="100" sortable />
              <el-table-column prop="lastTriggeredAt" label="最近触发" width="140" />
              <el-table-column label="趋势" width="80" align="center">
                <template #default="{ row }">
                  <span v-if="row.trend > 0" style="color:#EF4444;font-weight:600">↑{{ row.trend }}</span>
                  <span v-else-if="row.trend < 0" style="color:#10B981;font-weight:600">↓{{ Math.abs(row.trend) }}</span>
                  <span v-else style="color:#909399">-</span>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="sw-pagination" v-if="triggerTotal > 0">
              <el-pagination
                v-model:current-page="triggerPage"
                v-model:page-size="triggerPageSize"
                :total="triggerTotal"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next"
                small
                @size-change="fetchTriggerStats"
                @current-change="fetchTriggerStats"
              />
            </div>
            <div v-if="triggerStats.length === 0 && !triggerLoading" style="text-align:center;padding:20px;color:#909399;font-size:13px">
              暂无触发数据，扫描后将自动统计
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getSensitiveWords,
  saveSensitiveWords,
  scanChatRecordsForSensitiveWords,
  getSensitiveWordTriggerStats,
  getChatArchiveStatus
} from '@/api/wecom'
import type { ScanResult } from '../types'

defineOptions({ name: 'SensitiveWordManager' })

const props = defineProps<{
  configId: number | null
}>()

defineEmits<{
  (e: 'goArchiveSettings'): void
}>()

// 会话存档状态
const archiveStatus = ref<'unchecked' | 'enabled' | 'disabled'>('unchecked')

const sensitiveWords = ref<string[]>([])
const sensitiveWordsText = ref('')
const savingSensitiveWords = ref(false)
const scanningSensitiveWords = ref(false)
const scanResult = ref<ScanResult | null>(null)

// 触发统计 - 带分页
const triggerDateRange = ref('7d')
const triggerStartDate = ref('')
const triggerEndDate = ref('')
const triggerLoading = ref(false)
const triggerStats = ref<any[]>([])
const triggerPage = ref(1)
const triggerPageSize = ref(10)
const triggerTotal = ref(0)

const triggerDateOptions = [
  { label: '今日', value: 'today' },
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
]

const commonSensitiveWords = [
  '退款', '投诉', '举报', '骗子', '垃圾', '骗人',
  '工商', '消协', '315', '律师', '法院', '报警',
  '私下转账', '个人账户', '红包', '返现', '回扣'
]

/** 检查会话存档是否开启 */
const checkArchiveStatus = async () => {
  archiveStatus.value = 'unchecked'
  try {
    const res: any = await getChatArchiveStatus()
    if (res && (res.enabled || res.isEnabled || res.status === 'enabled' || res.authorized === true)) {
      archiveStatus.value = 'enabled'
    } else {
      archiveStatus.value = 'disabled'
    }
  } catch {
    // 接口异常时默认认为已开启，避免阻断使用
    archiveStatus.value = 'enabled'
  }
}

const fetchSensitiveWords = async () => {
  try {
    const res: any = await getSensitiveWords()
    const words = Array.isArray(res) ? res : []
    sensitiveWords.value = words
    sensitiveWordsText.value = words.join('\n')
  } catch (e) {
    console.error('[SensitiveWordManager] Fetch sensitive words error:', e)
  }
}

const addSensitiveWord = (word: string) => {
  const current = sensitiveWordsText.value.trim()
  const lines = current ? current.split('\n') : []
  if (!lines.includes(word)) {
    lines.push(word)
    sensitiveWordsText.value = lines.join('\n')
  }
}

const saveSensitiveWordsHandler = async () => {
  const words = sensitiveWordsText.value
    .split('\n')
    .map(w => w.trim())
    .filter(Boolean)

  savingSensitiveWords.value = true
  try {
    const res: any = await saveSensitiveWords(words)
    sensitiveWords.value = Array.isArray(res) ? res : words
    ElMessage.success('已保存 ' + words.length + ' 个敏感词')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    savingSensitiveWords.value = false
  }
}

const scanSensitiveWordsHandler = async () => {
  scanningSensitiveWords.value = true
  scanResult.value = null
  try {
    const res: any = await scanChatRecordsForSensitiveWords(props.configId || undefined)
    scanResult.value = {
      scanned: res?.scanned || 0,
      marked: res?.marked || 0
    }
    ElMessage.success(res?.message || '扫描完成')
    triggerPage.value = 1
    fetchTriggerStats()
  } catch (e: any) {
    ElMessage.error(e.message || '扫描失败')
  } finally {
    scanningSensitiveWords.value = false
  }
}

const handleTriggerDateChange = (val: string) => {
  triggerDateRange.value = val
  triggerStartDate.value = ''
  triggerEndDate.value = ''
  triggerPage.value = 1
  fetchTriggerStats()
}

const handleCustomTriggerQuery = () => {
  triggerDateRange.value = 'custom'
  triggerPage.value = 1
  fetchTriggerStats()
}

/** 从后端API获取真实触发统计数据（分页） */
const fetchTriggerStats = async () => {
  triggerLoading.value = true
  try {
    const params: Record<string, any> = {
      page: triggerPage.value,
      pageSize: triggerPageSize.value
    }
    if (props.configId) {
      params.configId = props.configId
    }
    if (triggerDateRange.value === 'custom' && triggerStartDate.value && triggerEndDate.value) {
      params.startDate = triggerStartDate.value
      params.endDate = triggerEndDate.value
    } else if (triggerDateRange.value !== 'custom') {
      params.dateRange = triggerDateRange.value
    }

    const res: any = await getSensitiveWordTriggerStats(params)
    if (res && res.list) {
      triggerStats.value = res.list
      triggerTotal.value = res.total || 0
    } else if (Array.isArray(res)) {
      triggerStats.value = res
      triggerTotal.value = res.length
    } else {
      triggerStats.value = []
      triggerTotal.value = 0
    }
  } catch {
    triggerStats.value = []
    triggerTotal.value = 0
  } finally {
    triggerLoading.value = false
  }
}

onMounted(async () => {
  await checkArchiveStatus()
  if (archiveStatus.value === 'enabled') {
    fetchSensitiveWords()
    fetchTriggerStats()
  }
})

defineExpose({ fetchSensitiveWords })
</script>

<style scoped lang="scss">
.sensitive-word-manager {
  .sw-card { border-radius: 10px; }
  .sw-card-header { display: flex; align-items: center; justify-content: space-between; }
  .sw-card-title { font-size: 15px; font-weight: 600; color: #1F2937; }
}

.sw-actions {
  display: flex; gap: 10px; margin-top: 14px;
}

.sw-templates {
  margin-top: 18px; padding-top: 14px; border-top: 1px solid #f0f1f3;
}
.sw-templates-title {
  font-size: 13px; font-weight: 600; color: #606266; margin-bottom: 10px;
}
.sw-templates-tags {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.sw-tag-clickable {
  cursor: pointer; transition: all 0.15s;
  &:hover { transform: scale(1.05); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
}

.sw-scan-stats {
  display: flex; gap: 16px;
}
.sw-scan-stat {
  flex: 1; text-align: center; padding: 12px; background: #f9fafb; border-radius: 8px;
}
.sw-scan-val { font-size: 22px; font-weight: 700; color: #1F2937; }
.sw-scan-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.sw-scan-empty { color: #909399; font-size: 13px; text-align: center; padding: 20px 0; }
.text-danger { color: #EF4444 !important; }

.sw-filter-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;
  padding: 10px 12px; background: #f9fafb; border-radius: 8px;
}
.sw-quick-dates {
  display: flex; gap: 4px;
}

.sw-pagination {
  margin-top: 12px; display: flex; justify-content: flex-end;
}

.trigger-rank {
  display: inline-block; width: 20px; height: 20px; line-height: 20px; text-align: center;
  border-radius: 50%; font-size: 11px; font-weight: 700; color: #606266; background: #f0f2f5;
}
.trigger-rank.top { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: #fff; }
</style>
