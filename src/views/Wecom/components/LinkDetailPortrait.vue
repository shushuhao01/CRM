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
        <svg :viewBox="`0 0 ${svgWidth} ${svgHeight + 20}`" class="trend-svg" preserveAspectRatio="none">
          <path :d="trendPath('add')" fill="none" stroke="#10B981" stroke-width="2" />
          <path :d="trendAreaPath('add')" fill="rgba(16,185,129,0.08)" />
          <path :d="trendPath('talk')" fill="none" stroke="#4C6EF5" stroke-width="2" />
          <path :d="trendAreaPath('talk')" fill="rgba(76,110,245,0.08)" />
          <path :d="trendPath('loss')" fill="none" stroke="#EF4444" stroke-width="2" />
          <path :d="trendAreaPath('loss')" fill="rgba(239,68,68,0.05)" />
          <circle v-for="(pt, i) in trendPoints('add')" :key="'a'+i" :cx="pt.x" :cy="pt.y" r="3" fill="#10B981" />
          <circle v-for="(pt, i) in trendPoints('talk')" :key="'t'+i" :cx="pt.x" :cy="pt.y" r="3" fill="#4C6EF5" />
          <circle v-for="(pt, i) in trendPoints('loss')" :key="'l'+i" :cx="pt.x" :cy="pt.y" r="3" fill="#EF4444" />
        </svg>
        <div class="trend-dates">
          <span v-for="(day, idx) in displayTrendDates" :key="idx">{{ day }}</span>
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
      <div class="retention-chart">
        <svg :viewBox="`0 0 ${retSvgW} ${retSvgH + 30}`" class="retention-svg">
          <line x1="0" :y1="retSvgH" :x2="retSvgW" :y2="retSvgH" stroke="#E5E7EB" stroke-width="1" />
          <path :d="retentionPath" fill="none" stroke="#4C6EF5" stroke-width="2.5" stroke-linecap="round" />
          <path :d="retentionAreaPath" fill="rgba(76,110,245,0.1)" />
          <g v-for="(pt, i) in retentionPoints" :key="i">
            <circle :cx="pt.x" :cy="pt.y" r="4" fill="#fff" stroke="#4C6EF5" stroke-width="2" />
            <text :x="pt.x" :y="retSvgH + 16" text-anchor="middle" font-size="11" fill="#6B7280">{{ retentionData[i]?.day }}</text>
            <text :x="pt.x" :y="retSvgH + 28" text-anchor="middle" font-size="11" font-weight="600" :fill="retColor(retentionData[i]?.rate)">{{ retentionData[i]?.rate }}%</text>
          </g>
        </svg>
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

const svgWidth = 700
const svgHeight = 140

const displayTrend = computed(() => {
  return trendRange.value === '7d' ? trendDataFull.value.slice(-7) : trendDataFull.value
})

const trendMax = computed(() => {
  return Math.max(...displayTrend.value.map(d => Math.max(d.add, d.talk, d.loss)), 1)
})

const displayTrendDates = computed(() => {
  const data = displayTrend.value
  if (data.length <= 7) return data.map(d => d.date.slice(5))
  const step = Math.ceil(data.length / 7)
  return data.filter((_, i) => i % step === 0 || i === data.length - 1).map(d => d.date.slice(5))
})

function trendPoints(field: 'add' | 'talk' | 'loss') {
  const data = displayTrend.value
  if (!data.length) return []
  const stepX = svgWidth / Math.max(data.length - 1, 1)
  return data.map((d, i) => ({
    x: i * stepX,
    y: svgHeight - (d[field] / trendMax.value) * (svgHeight - 10)
  }))
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

function trendPath(field: 'add' | 'talk' | 'loss'): string {
  return smoothPath(trendPoints(field))
}

function trendAreaPath(field: 'add' | 'talk' | 'loss'): string {
  const pts = trendPoints(field)
  if (pts.length < 2) return ''
  const linePath = smoothPath(pts)
  return `${linePath} L ${pts[pts.length - 1].x} ${svgHeight} L ${pts[0].x} ${svgHeight} Z`
}

// 留存曲线
const retSvgW = 400
const retSvgH = 120

const retentionPoints = computed(() => {
  const data = retentionData.value
  if (!data.length) return []
  const stepX = retSvgW / Math.max(data.length - 1, 1)
  return data.map((d, i) => ({
    x: i * stepX,
    y: retSvgH - (d.rate / 100) * (retSvgH - 10)
  }))
})

const retentionPath = computed(() => smoothPath(retentionPoints.value))

const retentionAreaPath = computed(() => {
  const pts = retentionPoints.value
  if (pts.length < 2) return ''
  return `${smoothPath(pts)} L ${pts[pts.length - 1].x} ${retSvgH} L ${pts[0].x} ${retSvgH} Z`
})

function retColor(rate: number) {
  if (rate >= 80) return '#10B981'
  if (rate >= 60) return '#F59E0B'
  return '#EF4444'
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
.trend-svg { width: 100%; height: 160px; }
.trend-dates { display: flex; justify-content: space-between; font-size: 10px; color: #9CA3AF; padding: 4px 0; }
.trend-legend { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #6B7280; }
.legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }

.retention-chart { padding: 16px 24px; display: flex; justify-content: center; }
.retention-svg { width: 100%; max-width: 500px; height: 170px; }
</style>
