<template>
  <div class="page-container">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #409eff 0%, #79bbff 100%)">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalCalls.toLocaleString() }}</div>
            <div class="stat-label">总调用次数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #67c23a 0%, #95d475 100%)">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.successRate }}%</div>
            <div class="stat-label">成功率</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #e6a23c 0%, #f3d19e 100%)">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.avgTime }}ms</div>
            <div class="stat-label">平均响应</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f56c6c 0%, #fab6b6 100%)">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.errorCount }}</div>
            <div class="stat-label">错误次数</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 接口列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>接口列表</span>
          <div class="header-actions">
            <el-select v-model="filterType" placeholder="接口类型" style="width: 150px" clearable>
              <el-option label="物流查询" value="logistics" />
              <el-option label="短信服务" value="sms" />
              <el-option label="支付接口" value="payment" />
              <el-option label="外呼系统" value="call" />
              <el-option label="其他" value="other" />
            </el-select>
            <el-button :icon="Refresh" circle @click="fetchData" :loading="loading" style="margin-left: 8px;" />
          </div>
        </div>
      </template>

      <el-table :data="filteredTableData" v-loading="loading" stripe>
        <el-table-column prop="name" label="接口名称" min-width="180">
          <template #default="{ row }">
            <div>
              <strong>{{ row.name }}</strong>
              <div style="font-size: 12px; color: #909399;">{{ row.code }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="typeLabel" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getTypeTagType(row.typeKey)">{{ row.typeLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="provider" label="服务商" width="120" />
        <el-table-column prop="callCount" label="调用次数" width="100" align="right">
          <template #default="{ row }">{{ row.callCount.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="successRate" label="成功率" width="100">
          <template #default="{ row }">
            <span :class="getSuccessRateClass(row.successRate)">
              {{ row.successRate }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="avgTime" label="平均响应" width="100">
          <template #default="{ row }">
            <span :class="getAvgTimeClass(row.avgTime)">{{ row.avgTime }}ms</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastCall" label="最后调用" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">详情</el-button>
            <el-button link type="success" @click="handleTest(row)">测试</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && filteredTableData.length === 0" description="暂无接口配置" />
    </el-card>

    <!-- 调用趋势 -->
    <el-card shadow="never" class="chart-card">
      <template #header><span>调用趋势（近7天）</span></template>
      <div v-if="trendLoading" style="height: 300px; display: flex; align-items: center; justify-content: center;">
        <el-text type="info">加载中...</el-text>
      </div>
      <div v-else-if="hasTrendData" ref="trendChartRef" class="trend-chart-area"></div>
      <el-empty v-else description="暂无调用数据" :image-size="120" style="height: 300px;" />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="接口详情" width="560px">
      <div v-if="currentDetail" class="detail-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="接口名称">{{ currentDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="接口代码">
            <el-tag size="small" type="info">{{ currentDetail.code }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="接口描述">{{ currentDetail.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="接口类型">
            <el-tag size="small" :type="getTypeTagType(currentDetail.typeKey)">{{ currentDetail.typeLabel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="服务商">{{ currentDetail.provider }}</el-descriptions-item>
          <el-descriptions-item label="API Key">
            <code style="font-size: 12px; background: #f5f7fa; padding: 2px 6px; border-radius: 3px;">{{ currentDetail.apiKey || '-' }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="速率限制">{{ currentDetail.rateLimit }} 次/小时</el-descriptions-item>
          <el-descriptions-item label="调用次数">{{ currentDetail.callCount.toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="成功率">
            <span :class="getSuccessRateClass(currentDetail.successRate)">{{ currentDetail.successRate }}%</span>
          </el-descriptions-item>
          <el-descriptions-item label="平均响应">{{ currentDetail.avgTime }}ms</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentDetail.status === 'active' ? 'success' : 'danger'" size="small">
              {{ currentDetail.status === 'active' ? '正常' : '停用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后调用">{{ currentDetail.lastCall }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, CircleCheck, Timer, Warning, Refresh } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const loading = ref(false)
const trendLoading = ref(false)
const filterType = ref('')
const trendChartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

const detailVisible = ref(false)
const currentDetail = ref<any>(null)

const stats = reactive({ totalCalls: 0, successRate: 0, avgTime: 0, errorCount: 0 })
const allTableData = ref<any[]>([])
const trendData = ref<any[]>([])

// ======== 类型/服务商映射 ========
const TYPE_KEYWORDS: [string, string, string][] = [
  ['kuaidi', '物流查询', 'logistics'],
  ['logistics', '物流查询', 'logistics'],
  ['sms', '短信服务', 'sms'],
  ['pay', '支付接口', 'payment'],
  ['wechat_pay', '支付接口', 'payment'],
  ['alipay', '支付接口', 'payment'],
  ['call', '外呼系统', 'call'],
  ['email', '邮件服务', 'email'],
]

const PROVIDER_KEYWORDS: [string, string][] = [
  ['kuaidi', '快递100'],
  ['aliyun', '阿里云'],
  ['tencent', '腾讯云'],
  ['wechat', '微信'],
  ['alipay', '支付宝'],
]

function resolveType(code: string): { label: string; key: string } {
  const lower = (code || '').toLowerCase()
  for (const [kw, label, key] of TYPE_KEYWORDS) {
    if (lower.includes(kw)) return { label, key }
  }
  return { label: '其他', key: 'other' }
}

function resolveProvider(code: string, name: string): string {
  const lower = (code || '').toLowerCase()
  for (const [kw, provider] of PROVIDER_KEYWORDS) {
    if (lower.includes(kw)) return provider
  }
  if (name.includes('快递100')) return '快递100'
  if (name.includes('阿里') || name.includes('Aliyun')) return '阿里云'
  if (name.includes('腾讯') || name.includes('Tencent')) return '腾讯云'
  if (name.includes('微信') || name.includes('WeChat')) return '微信'
  return '-'
}

// ======== 筛选 ========
const filteredTableData = computed(() => {
  if (!filterType.value) return allTableData.value
  return allTableData.value.filter(item => item.typeKey === filterType.value)
})

const hasTrendData = computed(() => trendData.value.some(t => t.count > 0))

// ======== 样式辅助 ========
function getTypeTagType(key: string) {
  const map: Record<string, string> = {
    logistics: '', sms: 'success', payment: 'warning', call: 'danger', email: 'info'
  }
  return map[key] || 'info'
}

function getSuccessRateClass(rate: number) {
  if (rate >= 99) return 'text-success'
  if (rate >= 95) return 'text-warning'
  if (rate > 0) return 'text-danger'
  return ''
}

function getAvgTimeClass(time: number) {
  if (time === 0) return ''
  if (time <= 200) return 'text-success'
  if (time <= 1000) return 'text-warning'
  return 'text-danger'
}

// ======== 数据获取 ========
const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminApi.getApiConfigs() as any
    const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])

    const items = rawList.map((item: any) => {
      const typeInfo = resolveType(item.code || '')
      return {
        id: item.id,
        name: item.name || item.code,
        code: item.code,
        description: item.description || '',
        typeLabel: typeInfo.label,
        typeKey: typeInfo.key,
        provider: resolveProvider(item.code || '', item.name || ''),
        callCount: 0,
        successRate: 0,
        avgTime: 0,
        status: item.status || 'active',
        lastCall: item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString('zh-CN') : '从未调用',
        apiKey: item.apiKey || '-',
        rateLimit: item.rateLimit || 1000
      }
    })

    // 并行获取每条API的统计信息
    await Promise.allSettled(items.map(async (item: any) => {
      try {
        const statRes = await adminApi.getApiStatistics(item.id) as any
        if (statRes?.data) {
          item.callCount = Number(statRes.data.totalCalls) || 0
          item.successRate = parseFloat(statRes.data.successRate) || 0
          item.avgTime = Number(statRes.data.avgTime) || 0
        }
      } catch { /* 忽略单项失败 */ }
    }))

    allTableData.value = items
  } catch (error: any) {
    console.error('获取API配置列表失败:', error)
  } finally {
    loading.value = false
  }

  await fetchStatistics()
  await fetchTrends()
}

const fetchStatistics = async () => {
  try {
    const res = await adminApi.getApiGlobalStatistics() as any
    if (res?.data) {
      stats.totalCalls = Number(res.data.totalCalls) || 0
      stats.successRate = parseFloat(res.data.successRate) || 0
      stats.avgTime = Number(res.data.avgTime) || 0
      stats.errorCount = Number(res.data.errorCount) || 0
    }
  } catch (error) {
    console.warn('获取统计信息失败:', error)
  }
}

const fetchTrends = async () => {
  trendLoading.value = true
  try {
    const res = await adminApi.getApiTrends() as any
    if (res?.data && Array.isArray(res.data)) {
      trendData.value = res.data
    } else {
      trendData.value = []
    }
  } catch (error) {
    console.warn('获取趋势数据失败:', error)
    trendData.value = []
  } finally {
    trendLoading.value = false
    await nextTick()
    renderTrendChart()
  }
}

// ======== 图表 ========
const renderTrendChart = () => {
  if (!trendChartRef.value || !hasTrendData.value) return

  if (!chartInstance) {
    chartInstance = echarts.init(trendChartRef.value)
  }

  const dates = trendData.value.map(t => {
    const d = new Date(t.date)
    return (d.getMonth() + 1) + '-' + d.getDate()
  })
  const successValues = trendData.value.map(t => t.successCount || 0)
  const errorValues = trendData.value.map(t => t.errorCount || 0)

  chartInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['成功', '失败'], top: 0, right: 20, textStyle: { color: '#909399' } },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#909399' },
      axisLine: { lineStyle: { color: '#e4e7ed' } }
    },
    yAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: '#909399' },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: [
      {
        name: '成功', type: 'bar', stack: 'total', data: successValues, barWidth: 28,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#67c23a' }, { offset: 1, color: '#95d475' }
          ])
        }
      },
      {
        name: '失败', type: 'bar', stack: 'total', data: errorValues, barWidth: 28,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#f56c6c' }, { offset: 1, color: '#fab6b6' }
          ])
        }
      }
    ]
  })
}

const handleResize = () => { chartInstance?.resize() }

// ======== 操作 ========
const handleView = (row: any) => {
  currentDetail.value = row
  detailVisible.value = true
}

const handleTest = async (row: any) => {
  try {
    ElMessage.info(`正在测试接口 ${row.name}...`)
    const startTime = Date.now()
    await adminApi.getApiConfig(row.id)
    const elapsed = Date.now() - startTime
    ElMessage.success(`接口 ${row.name} 连通正常，响应 ${elapsed}ms`)
  } catch (error: any) {
    ElMessage.error(`接口 ${row.name} 测试失败：${error.message || '连接异常'}`)
  }
}

// ======== 生命周期 ========
onMounted(async () => {
  await fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-row { margin-bottom: 0; }

.stat-card {
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  padding: 20px;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  flex-shrink: 0;
}

.stat-info {
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #303133;
  }
  .stat-label {
    font-size: 14px;
    color: #909399;
    margin-top: 4px;
  }
}

.table-card, .chart-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; align-items: center; }

.text-success { color: #67c23a; font-weight: 600; }
.text-warning { color: #e6a23c; font-weight: 600; }
.text-danger { color: #f56c6c; font-weight: 600; }

.trend-chart-area { height: 300px; width: 100%; }

.detail-content {
  :deep(.el-descriptions__label) {
    width: 100px;
    font-weight: 600;
  }
}

@media screen and (max-width: 768px) {
  .stat-card { padding: 12px 16px; }
  .stat-icon { width: 40px; height: 40px; font-size: 18px; }
  .stat-info .stat-value { font-size: 18px; }
}
</style>
