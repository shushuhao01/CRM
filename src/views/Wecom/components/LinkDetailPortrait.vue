<template>
  <div class="link-detail-portrait">
    <!-- 核心指标卡片 -->
    <div class="metric-cards">
      <div class="metric-card" v-for="m in coreMetrics" :key="m.label">
        <div class="metric-value" :style="{ color: m.color }">{{ m.value }}</div>
        <div class="metric-label">{{ m.label }}</div>
      </div>
    </div>

    <!-- 30天趋势折线图 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="section-header">
          <span class="section-title">📈 30天趋势</span>
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

    <!-- 客户画像 -->
    <div class="portrait-grid">
      <!-- 性别分布 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">👤 性别分布</span></template>
        <div class="pie-simple">
          <div v-for="item in genderData" :key="item.label" class="pie-item">
            <div class="pie-bar-track">
              <div class="pie-bar-fill" :style="{ width: item.percent + '%', background: item.color }" />
            </div>
            <span class="pie-label">{{ item.label }}</span>
            <span class="pie-pct">{{ item.percent }}%</span>
          </div>
        </div>
      </el-card>

      <!-- 来源设备 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">📱 来源设备</span></template>
        <div class="pie-simple">
          <div v-for="item in deviceData" :key="item.label" class="pie-item">
            <div class="pie-bar-track">
              <div class="pie-bar-fill" :style="{ width: item.percent + '%', background: item.color }" />
            </div>
            <span class="pie-label">{{ item.label }}</span>
            <span class="pie-pct">{{ item.percent }}%</span>
          </div>
        </div>
      </el-card>

      <!-- 标签分布 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">🏷️ 标签分布</span></template>
        <div class="tag-dist">
          <div v-for="tag in tagDistribution" :key="tag.name" class="tag-dist-item">
            <el-tag size="small" :type="tag.type">{{ tag.name }}</el-tag>
            <span class="tag-count">{{ tag.count }}</span>
          </div>
        </div>
      </el-card>

      <!-- 企业vs个人 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">🏢 客户类型</span></template>
        <div class="pie-simple">
          <div v-for="item in customerTypeData" :key="item.label" class="pie-item">
            <div class="pie-bar-track">
              <div class="pie-bar-fill" :style="{ width: item.percent + '%', background: item.color }" />
            </div>
            <span class="pie-label">{{ item.label }}</span>
            <span class="pie-pct">{{ item.percent }}%</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 时段热力图 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">🔥 添加时段热力图</span></template>
      <div class="heatmap">
        <div class="heatmap-header">
          <span class="heatmap-corner" />
          <span v-for="h in hours" :key="h" class="heatmap-hour">{{ h }}</span>
        </div>
        <div v-for="(dayRow, di) in heatmapData" :key="di" class="heatmap-row">
          <span class="heatmap-day">{{ weekdays[di] }}</span>
          <div
            v-for="(val, hi) in dayRow"
            :key="hi"
            class="heatmap-cell"
            :style="{ background: heatColor(val) }"
            :title="`${weekdays[di]} ${hours[hi]}:00 - ${val}人`"
          >
            {{ val || '' }}
          </div>
        </div>
        <div class="heatmap-legend">
          <span style="color:#9CA3AF">少</span>
          <div class="legend-gradient" />
          <span style="color:#9CA3AF">多</span>
        </div>
      </div>
    </el-card>

    <!-- 留存曲线 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">📊 留存曲线</span></template>
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
import { ref, computed } from 'vue'

defineProps<{
  linkId: number
  isDemoMode: boolean
}>()

const trendRange = ref('30d')

const coreMetrics = [
  { label: '累计添加', value: '156', color: '#1F2937' },
  { label: '日均添加', value: '5.2', color: '#4C6EF5' },
  { label: '获客成本', value: '¥18.5', color: '#F59E0B' },
  { label: '最高峰日', value: '04-12', color: '#10B981' },
  { label: '活跃时段', value: '10:00-11:00', color: '#7C3AED' },
]

// 30日趋势示例数据
const trendDataFull = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 3, 15 - 29 + i)
  return {
    date: d.toISOString().split('T')[0],
    add: Math.floor(Math.random() * 12 + 2),
    talk: Math.floor(Math.random() * 8 + 1),
    loss: Math.floor(Math.random() * 4),
  }
})

const displayTrend = computed(() => {
  return trendRange.value === '7d' ? trendDataFull.slice(-7) : trendDataFull
})

const trendMax = computed(() => {
  return Math.max(...displayTrend.value.map(d => Math.max(d.add, d.talk, d.loss)), 1)
})

const barHeight = (val: number, max: number) => {
  return Math.max((val / max) * 100, 2)
}

const genderData = [
  { label: '男性', percent: 58, color: '#4C6EF5' },
  { label: '女性', percent: 37, color: '#F472B6' },
  { label: '未知', percent: 5, color: '#D1D5DB' },
]

const deviceData = [
  { label: 'iOS', percent: 45, color: '#1F2937' },
  { label: 'Android', percent: 42, color: '#10B981' },
  { label: 'PC/其他', percent: 13, color: '#9CA3AF' },
]

const customerTypeData = [
  { label: '企业客户', percent: 35, color: '#4C6EF5' },
  { label: '个人客户', percent: 65, color: '#F59E0B' },
]

const tagDistribution = [
  { name: 'VIP客户', count: 28, type: 'danger' as const },
  { name: '意向客户', count: 45, type: 'warning' as const },
  { name: '潜在客户', count: 38, type: '' as const },
  { name: '电商行业', count: 22, type: 'success' as const },
  { name: '网站来源', count: 56, type: 'info' as const },
]

// 时段热力图
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const hours = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']

const heatmapData = [
  [1, 3, 8, 12, 5, 3, 6, 9, 7, 4, 2, 1, 0, 0],
  [0, 4, 10, 9, 4, 2, 7, 11, 8, 5, 3, 1, 0, 0],
  [2, 5, 7, 11, 6, 4, 8, 10, 6, 3, 2, 0, 0, 0],
  [1, 3, 9, 13, 5, 3, 5, 8, 9, 6, 2, 1, 0, 0],
  [0, 4, 11, 10, 7, 5, 9, 12, 7, 4, 1, 0, 0, 0],
  [0, 1, 3, 4, 2, 1, 2, 3, 2, 1, 0, 0, 0, 0],
  [0, 0, 2, 3, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0],
]

const heatmapMax = computed(() => Math.max(...heatmapData.flat(), 1))

const heatColor = (val: number) => {
  if (!val) return '#F9FAFB'
  const ratio = val / heatmapMax.value
  if (ratio > 0.7) return '#4C6EF5'
  if (ratio > 0.4) return '#93C5FD'
  if (ratio > 0.15) return '#BFDBFE'
  return '#DBEAFE'
}

// 留存数据
const retentionData = [
  { day: '1日', rate: 92 },
  { day: '3日', rate: 85 },
  { day: '7日', rate: 76 },
  { day: '14日', rate: 68 },
  { day: '30日', rate: 58 },
]

const retentionClass = (rate: number) => {
  if (rate >= 80) return 'ret-good'
  if (rate >= 60) return 'ret-medium'
  return 'ret-low'
}
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

/* 趋势图 */
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

/* 画像网格 */
.portrait-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

/* 简易分布条 */
.pie-simple { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.pie-item { display: flex; align-items: center; gap: 10px; }
.pie-bar-track { flex: 1; height: 18px; background: #F3F4F6; border-radius: 9px; overflow: hidden; }
.pie-bar-fill { height: 100%; border-radius: 9px; min-width: 4px; transition: width 0.5s; }
.pie-label { width: 60px; font-size: 13px; color: #4B5563; flex-shrink: 0; }
.pie-pct { width: 40px; font-size: 13px; font-weight: 600; color: #4B5563; }

/* 标签分布 */
.tag-dist { display: flex; flex-wrap: wrap; gap: 10px; padding: 8px 0; }
.tag-dist-item { display: flex; align-items: center; gap: 6px; }
.tag-count { font-size: 13px; font-weight: 600; color: #6B7280; }

/* 热力图 */
.heatmap { padding: 8px 0; overflow-x: auto; }
.heatmap-header { display: flex; gap: 2px; margin-bottom: 4px; }
.heatmap-corner { width: 36px; flex-shrink: 0; }
.heatmap-hour { width: 32px; text-align: center; font-size: 11px; color: #9CA3AF; flex-shrink: 0; }
.heatmap-row { display: flex; gap: 2px; margin-bottom: 2px; }
.heatmap-day { width: 36px; font-size: 12px; color: #6B7280; display: flex; align-items: center; flex-shrink: 0; }
.heatmap-cell {
  width: 32px; height: 28px; border-radius: 4px; display: flex; align-items: center;
  justify-content: center; font-size: 10px; color: #4B5563; cursor: pointer;
  transition: all 0.2s; flex-shrink: 0;
}
.heatmap-cell:hover { transform: scale(1.15); box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
.heatmap-legend { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: 12px; }
.legend-gradient {
  width: 120px; height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, #F9FAFB, #DBEAFE, #93C5FD, #4C6EF5);
}

/* 留存曲线 */
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

