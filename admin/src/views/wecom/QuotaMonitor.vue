<template>
  <div class="page-container">
    <!-- 告警条 -->
    <div v-if="alerts.length > 0" style="margin-bottom: 16px">
      <el-alert
        v-for="(alert, idx) in alerts.slice(0, 5)"
        :key="idx"
        :title="alert.message"
        :type="alert.level === 'danger' ? 'error' : 'warning'"
        show-icon
        :closable="true"
        style="margin-bottom: 8px"
      />
      <el-text v-if="alerts.length > 5" type="warning" size="small">还有 {{ alerts.length - 5 }} 条告警...</el-text>
    </div>

    <!-- 总体统计 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="4" v-for="stat in summaryCards" :key="stat.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num" :style="{ color: stat.color }">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 整体用量进度 -->
    <el-card shadow="never" style="margin-bottom: 20px">
      <template #header>
        <div class="card-header">
          <span>整体席位用量</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span v-if="lastRefreshedAt" style="font-size:12px;color:#909399">
              上次刷新：{{ lastRefreshedAt }}
            </span>
            <el-tag type="info" size="small" style="cursor:default">
              <span v-if="countdown > 0">{{ Math.floor(countdown / 60) }}:{{ String(countdown % 60).padStart(2, '0') }} 后自动刷新</span>
              <span v-else>正在刷新...</span>
            </el-tag>
            <el-button @click="manualRefresh" :loading="loading" size="small">立即刷新</el-button>
          </div>
        </div>
      </template>
      <div style="display: flex; align-items: center; gap: 20px">
        <el-progress
          type="dashboard"
          :percentage="quotaData.summary?.overallUsagePercent || 0"
          :color="usageColors"
          :width="160"
        >
          <template #default="{ percentage }">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold">{{ percentage }}%</div>
              <div style="font-size: 12px; color: #909399">总体使用率</div>
            </div>
          </template>
        </el-progress>
        <div style="flex: 1">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="活跃租户">{{ quotaData.summary?.totalTenants || 0 }} 个</el-descriptions-item>
            <el-descriptions-item label="总席位">{{ quotaData.summary?.totalMaxUsers || 0 }} 人</el-descriptions-item>
            <el-descriptions-item label="已使用">{{ quotaData.summary?.totalUsedUsers || 0 }} 人</el-descriptions-item>
            <el-descriptions-item label="总消息数">{{ formatNumber(quotaData.summary?.totalMessages || 0) }} 条</el-descriptions-item>
            <el-descriptions-item label="总存储">{{ formatStorage(quotaData.summary?.totalStorageMB || 0) }}</el-descriptions-item>
            <el-descriptions-item label="超限租户">
              <span :style="{ color: (quotaData.overLimit?.length || 0) > 0 ? '#f56c6c' : '#67c23a', fontWeight: 600 }">
                {{ quotaData.overLimit?.length || 0 }} 个
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16">
      <!-- 用量排行 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>用量排行</span>
              <el-tag type="info" size="small">共 {{ topTotal }} 个租户</el-tag>
            </div>
          </template>
          <el-table :data="pagedTopUsage" stripe size="small" max-height="480" v-loading="loading">
            <el-table-column label="租户" min-width="140">
              <template #default="{ row }">
                <div>
                  <div style="font-weight: 500">{{ row.tenantName || '-' }}</div>
                  <div style="font-size: 11px; color: #909399">{{ row.tenantCode }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="席位" width="100" align="center">
              <template #default="{ row }">{{ row.usedUsers }}/{{ row.maxUsers }}</template>
            </el-table-column>
            <el-table-column label="使用率" width="160">
              <template #default="{ row }">
                <el-progress
                  :percentage="Math.min(row.usagePercent, 100)"
                  :color="row.usagePercent > 100 ? '#f56c6c' : row.usagePercent > 80 ? '#e6a23c' : '#67c23a'"
                  :stroke-width="12"
                  :text-inside="true"
                />
              </template>
            </el-table-column>
            <el-table-column label="消息数" width="90" align="center">
              <template #default="{ row }">{{ formatNumber(row.totalMessages || 0) }}</template>
            </el-table-column>
            <el-table-column label="存储" width="80" align="center">
              <template #default="{ row }">{{ formatStorage(row.totalStorageMB || 0) }}</template>
            </el-table-column>
          </el-table>
          <div style="margin-top: 12px; display: flex; justify-content: flex-end">
            <el-pagination
              v-model:current-page="topPage"
              v-model:page-size="topPageSize"
              :total="topTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              small
              @size-change="() => { topPage = 1 }"
              @current-change="() => {}"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 即将到期 + 超限列表 -->
      <el-col :span="10">
        <el-card shadow="never" style="margin-bottom: 16px">
          <template #header>
            <div class="card-header">
              <span>即将到期 (30天内)</span>
              <el-tag type="warning" size="small">{{ (quotaData.expiringSoon || []).length }} 个</el-tag>
            </div>
          </template>
          <div v-if="(quotaData.expiringSoon || []).length === 0" style="text-align: center; color: #c0c4cc; padding: 20px">
            暂无即将到期的租户 ✓
          </div>
          <div v-else>
            <div v-for="item in pagedExpiringSoon" :key="item.tenantId" class="expire-item">
              <div>
                <span style="font-weight: 500">{{ item.tenantName }}</span>
                <el-tag :type="item.daysRemaining <= 7 ? 'danger' : 'warning'" size="small" style="margin-left: 8px">
                  {{ item.daysRemaining }}天
                </el-tag>
              </div>
              <div style="font-size: 12px; color: #909399">
                到期: {{ item.expireDate }} · {{ item.maxUsers }}人
              </div>
            </div>
            <div v-if="(quotaData.expiringSoon || []).length > expirePageSize" style="margin-top: 8px; display: flex; justify-content: flex-end">
              <el-pagination
                v-model:current-page="expirePage"
                :page-size="expirePageSize"
                :total="(quotaData.expiringSoon || []).length"
                layout="prev, pager, next"
                small
              />
            </div>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>超限租户</span>
              <el-tag :type="(quotaData.overLimit || []).length > 0 ? 'danger' : 'success'" size="small">
                {{ (quotaData.overLimit || []).length }} 个
              </el-tag>
            </div>
          </template>
          <div v-if="(quotaData.overLimit || []).length === 0" style="text-align: center; color: #67c23a; padding: 20px">
            无超限租户 ✓
          </div>
          <div v-else>
            <div v-for="item in pagedOverLimit" :key="item.tenantId" class="expire-item" style="border-left-color: #f56c6c">
              <div>
                <span style="font-weight: 500">{{ item.tenantName }}</span>
                <el-tag type="danger" size="small" style="margin-left: 8px">
                  {{ item.usedUsers }}/{{ item.maxUsers }}
                </el-tag>
              </div>
              <div style="font-size: 12px; color: #f56c6c">
                超出 {{ item.usedUsers - item.maxUsers }} 个席位
              </div>
            </div>
            <div v-if="(quotaData.overLimit || []).length > overLimitPageSize" style="margin-top: 8px; display: flex; justify-content: flex-end">
              <el-pagination
                v-model:current-page="overLimitPage"
                :page-size="overLimitPageSize"
                :total="(quotaData.overLimit || []).length"
                layout="prev, pager, next"
                small
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const quotaData = ref<any>({})
const alerts = ref<any[]>([])
const lastRefreshedAt = ref('')
const POLL_INTERVAL = 5 * 60  // 5分钟，单位秒
const countdown = ref(POLL_INTERVAL)

let pollTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 用量排行分页
const topPage = ref(1)
const topPageSize = ref(10)
const topTotal = computed(() => (quotaData.value.topUsage || []).length)
const pagedTopUsage = computed(() => {
  const all = quotaData.value.topUsage || []
  const start = (topPage.value - 1) * topPageSize.value
  return all.slice(start, start + topPageSize.value)
})

// 即将到期分页
const expirePage = ref(1)
const expirePageSize = ref(10)
const pagedExpiringSoon = computed(() => {
  const all = quotaData.value.expiringSoon || []
  const start = (expirePage.value - 1) * expirePageSize.value
  return all.slice(start, start + expirePageSize.value)
})

// 超限分页
const overLimitPage = ref(1)
const overLimitPageSize = ref(10)
const pagedOverLimit = computed(() => {
  const all = quotaData.value.overLimit || []
  const start = (overLimitPage.value - 1) * overLimitPageSize.value
  return all.slice(start, start + overLimitPageSize.value)
})

const usageColors = [
  { color: '#67c23a', percentage: 60 },
  { color: '#e6a23c', percentage: 80 },
  { color: '#f56c6c', percentage: 100 }
]

const summaryCards = computed(() => [
  { label: '活跃租户', value: quotaData.value.summary?.totalTenants || 0, color: '#409eff' },
  { label: '总席位', value: quotaData.value.summary?.totalMaxUsers || 0, color: '#07c160' },
  { label: '已使用', value: quotaData.value.summary?.totalUsedUsers || 0, color: '#e6a23c' },
  { label: '总消息', value: formatNumber(quotaData.value.summary?.totalMessages || 0), color: '#409eff' },
  { label: '总存储', value: formatStorage(quotaData.value.summary?.totalStorageMB || 0), color: '#909399' },
  { label: '使用率', value: (quotaData.value.summary?.overallUsagePercent || 0) + '%', color: (quotaData.value.summary?.overallUsagePercent || 0) > 80 ? '#f56c6c' : '#67c23a' }
])

const formatNumber = (num: number) => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

const formatStorage = (mb: number) => {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + 'GB'
  return mb.toFixed(1) + 'MB'
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/quota-monitor')
    if (res.data) {
      quotaData.value = res.data
      alerts.value = res.data.alerts || []
      topPage.value = 1
    }
    lastRefreshedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (e) {
    console.error('Fetch quota data error:', e)
    ElMessage.error('额度数据加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const manualRefresh = () => {
  countdown.value = POLL_INTERVAL
  fetchData()
}

const startPolling = () => {
  // 倒计时 ticker
  countdownTimer = setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1)
  }, 1000)
  // 每5分钟自动刷新
  pollTimer = setInterval(() => {
    countdown.value = POLL_INTERVAL
    fetchData()
  }, POLL_INTERVAL * 1000)
}

onMounted(() => {
  fetchData()
  startPolling()
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.page-container { padding: 20px; }
.stat-card { text-align: center; }
.stat-num { font-size: 24px; font-weight: bold; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.expire-item {
  padding: 10px 12px;
  border-left: 3px solid #e6a23c;
  margin-bottom: 8px;
  background: #fafafa;
  border-radius: 4px;
}
</style>

