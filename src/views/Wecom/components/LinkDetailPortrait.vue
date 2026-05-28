<template>
  <div class="link-detail-portrait">
    <!-- 核心指标卡片 -->
    <div class="metric-cards" v-loading="loading">
      <div class="metric-card" v-for="m in coreMetrics" :key="m.label">
        <div class="metric-value" :style="{ color: m.color }">{{ m.value }}</div>
        <div class="metric-label">{{ m.label }}</div>
      </div>
    </div>

    <!-- 30天趋势 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="section-header">
          <span class="section-title">30天趋势</span>
          <el-radio-group v-model="trendRange" size="small">
            <el-radio-button label="7d">7天</el-radio-button>
            <el-radio-button label="30d">30天</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div class="trend-chart">
        <div class="trend-lines">
          <div v-for="(day, idx) in displayTrend" :key="idx" class="trend-column">
            <div class="trend-bars-stack">
              <div class="trend-bar add-bar" :style="{ height: barHeight(day.add, trendMax) + 'px' }" :title="'添加: ' + day.add" />
              <div class="trend-bar talk-bar" :style="{ height: barHeight(day.talk, trendMax) + 'px' }" :title="'开口: ' + day.talk" />
              <div class="trend-bar loss-bar" :style="{ height: barHeight(day.loss, trendMax) + 'px' }" :title="'流失: ' + day.loss" />
            </div>
            <span class="trend-date">{{ day.date.slice(5) }}</span>
          </div>
        </div>
        <div class="trend-legend">
          <span><span class="legend-dot" style="background:#10B981" /> 添加</span>
          <span><span class="legend-dot" style="background:#4C6EF5" /> 开口</span>
          <span><span class="legend-dot" style="background:#EF4444" /> 流失</span>
        </div>
      </div>
    </el-card>

    <!-- 留存曲线 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">留存曲线</span></template>
      <div class="retention-curve">
        <div v-for="r in retentionData" :key="r.day" class="retention-item">
          <div class="retention-bar-wrapper">
            <div class="retention-bar" :style="{ height: r.rate + '%' }" />
          </div>
          <span class="retention-day">{{ r.day }}</span>
          <span class="retention-rate" :class="retentionClass(r.rate)">{{ r.rate }}%</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getAcquisitionLinkPortrait, getContactWayPortrait } from '@/api/wecom'

const props = withDefaults(defineProps<{
  linkId: number
  isDemoMode: boolean
  type?: 'acquisition' | 'contactway'
}>(), { type: 'acquisition' })

const loading = ref(false)
const trendRange = ref('30d')

const coreMetrics = ref<Array<{ label: string; value: string; color: string }>>([])
const trendDataFull = ref<Array<{ date: string; add: number; talk: number; loss: number }>>([])
const retentionData = ref<Array<{ day: string; rate: number }>>([])

const displayTrend = computed(() => {
  return trendRange.value === '7d' ? trendDataFull.value.slice(-7) : trendDataFull.value
})

const trendMax = computed(() => {
  return Math.max(...displayTrend.value.map(d => Math.max(d.add, d.talk, d.loss)), 1)
})

const barHeight = (val: number, max: number) => {
  return Math.max((val / max) * 100, 2)
}

const retentionClass = (rate: number) => {
  if (rate >= 80) return 'ret-good'
  if (rate >= 60) return 'ret-medium'
  return 'ret-low'
}

const fetchData = async () => {
  if (props.isDemoMode) return
  loading.value = true
  try {
    const res: any = props.type === 'contactway'
      ? await getContactWayPortrait(props.linkId)
      : await getAcquisitionLinkPortrait(props.linkId)
    const data = res?.data || res
    if (data) {
      coreMetrics.value = data.coreMetrics || []
      trendDataFull.value = data.trend || []
      retentionData.value = data.retentionData || []
    }
  } catch (e) {
    console.error('[LinkDetailPortrait] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.linkId, () => fetchData(), { immediate: true })
</script>

<style scoped>
.metric-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
.metric-card {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 12px;
  padding: 14px 16px; text-align: center; transition: all 0.3s;
}
.metric-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.metric-value { font-size: 22px; font-weight: 700; }
.metric-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 14px; color: #1F2937; }
.section-header { display: flex; justify-content: space-between; align-items: center; }

.trend-chart { padding: 8px 0; }
.trend-lines {
  display: flex; gap: 2px; align-items: flex-end; overflow-x: auto;
  padding-bottom: 4px; min-height: 120px;
}
.trend-column { display: flex; flex-direction: column; align-items: center; min-width: 20px; flex: 1; }
.trend-bars-stack { display: flex; gap: 1px; align-items: flex-end; }
.trend-bar { width: 6px; border-radius: 2px 2px 0 0; min-height: 2px; cursor: pointer; transition: height 0.3s; }
.add-bar { background: #10B981; }
.talk-bar { background: #4C6EF5; }
.loss-bar { background: #EF4444; }
.trend-date { font-size: 9px; color: #9CA3AF; margin-top: 4px; white-space: nowrap; }
.trend-legend { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #6B7280; }
.legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }

.retention-curve { display: flex; gap: 24px; justify-content: center; padding: 16px 0; }
.retention-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.retention-bar-wrapper {
  width: 40px; height: 100px; background: #F3F4F6; border-radius: 6px;
  display: flex; align-items: flex-end; overflow: hidden;
}
.retention-bar {
  width: 100%; background: linear-gradient(180deg, #4C6EF5, #818CF8);
  border-radius: 6px 6px 0 0; transition: height 0.5s; min-height: 4px;
}
.retention-day { font-size: 12px; color: #6B7280; }
.retention-rate { font-size: 14px; font-weight: 700; }
.ret-good { color: #10B981; }
.ret-medium { color: #F59E0B; }
.ret-low { color: #EF4444; }
</style>
