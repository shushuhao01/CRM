<template>
  <div class="visit-charts">
    <el-row :gutter="12" class="stat-cards">
      <el-col v-for="c in cards" :key="c.label" :xs="12" :sm="8" :md="6" :lg="3">
        <div class="stat-card">
          <div class="stat-num">{{ c.value }}</div>
          <div class="stat-lbl">{{ c.label }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :md="16">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <span class="chart-title">访问趋势</span>
            <span class="chart-sub">{{ days }} 天 · PV / UV</span>
          </template>
          <div ref="trendRef" class="chart-box" v-loading="loading" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="chart-title">流量来源</span></template>
          <div ref="sourceRef" class="chart-box" v-loading="loading" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :md="16">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <span class="chart-title">时段分布（0-23 时）</span>
            <span class="chart-sub" v-if="summary.peakHourPv">高峰 {{ padHour(summary.peakHour) }} · {{ summary.peakHourPv }} 次</span>
          </template>
          <div ref="hourRef" class="chart-box" v-loading="loading" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="chart-title">设备类型</span></template>
          <div ref="deviceRef" class="chart-box" v-loading="loading" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="chart-title">操作系统</span></template>
          <div ref="osRef" class="chart-box" v-loading="loading" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="chart-title">浏览器</span></template>
          <div ref="browserRef" class="chart-box" v-loading="loading" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="chart-title">地域分布 Top 10</span></template>
          <div ref="regionRef" class="chart-box" v-loading="loading" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="chart-title">网络运营商 Top 10</span></template>
          <div ref="ispRef" class="chart-box" v-loading="loading" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="chart-title">热门页面 Top 10</span></template>
          <el-table :data="analytics?.pages || []" size="small" stripe>
            <el-table-column type="index" label="#" width="48" />
            <el-table-column label="页面路径" prop="path" min-width="160" show-overflow-tooltip />
            <el-table-column label="PV" prop="pv" width="80" align="right" />
            <el-table-column label="UV" prop="uv" width="80" align="right" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="chart-title">活跃 IP Top 50</span></template>
          <el-table :data="analytics?.ips || []" size="small" stripe height="330">
            <el-table-column type="index" label="#" width="48" />
            <el-table-column label="IP" prop="ip" min-width="130" />
            <el-table-column label="归属地" min-width="140">
              <template #default="{ row }">{{ [row.province, row.city].filter(Boolean).join(' ') || '-' }}</template>
            </el-table-column>
            <el-table-column label="运营商" prop="isp" min-width="90" show-overflow-tooltip />
            <el-table-column label="次数" prop="pv" width="70" align="right" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { NameValue, SiteAnalytics } from '@/api/site'
import {
  initChart,
  setChartOption,
  disposeChart,
  PALETTE,
  AXIS_TEXT,
  type EChartsOption,
  type EChartsInstance,
} from '@/utils/echarts'

const props = withDefaults(
  defineProps<{
    analytics: SiteAnalytics | null
    days?: number
    loading?: boolean
  }>(),
  { days: 30, loading: false },
)

const DEVICE_LABEL: Record<string, string> = {
  desktop: '桌面端',
  mobile: '移动端',
  tablet: '平板',
  bot: '机器人',
  unknown: '未知',
}
function deviceLabel(v: string): string {
  return DEVICE_LABEL[v] || v || '未知'
}

function padHour(h: number): string {
  return `${String(Number(h) || 0).padStart(2, '0')}:00`
}

const EMPTY_SUMMARY = {
  pv: 0, uv: 0, ips: 0, downloads: 0, buyClicks: 0, trialClicks: 0, registerUsers: 0,
  todayPv: 0, todayUv: 0, avgPv: 0, peakHour: 0, peakHourPv: 0,
}
const summary = computed(() => props.analytics?.summary ?? EMPTY_SUMMARY)
const cards = computed(() => {
  const s = summary.value
  return [
    { label: '今日访问 (PV)', value: s.todayPv },
    { label: '今日访客 (UV)', value: s.todayUv },
    { label: '区间访问 (PV)', value: s.pv },
    { label: '区间访客 (UV)', value: s.uv },
    { label: '独立 IP', value: s.ips },
    { label: '免费试用点击', value: s.trialClicks },
    { label: '注册用户数', value: s.registerUsers },
    { label: '日均访问', value: s.avgPv },
  ]
})

// ==================== 图表 ====================

const trendRef = ref<HTMLElement>()
const sourceRef = ref<HTMLElement>()
const hourRef = ref<HTMLElement>()
const deviceRef = ref<HTMLElement>()
const osRef = ref<HTMLElement>()
const browserRef = ref<HTMLElement>()
const regionRef = ref<HTMLElement>()
const ispRef = ref<HTMLElement>()

const charts: Record<string, EChartsInstance | null> = {}

function upsert(key: string, el: HTMLElement | undefined, option: EChartsOption) {
  if (!el) return
  if (!charts[key]) charts[key] = initChart(el, option)
  else setChartOption(charts[key], option)
}

function emptyOption(text = '暂无数据'): EChartsOption {
  return {
    title: { text, left: 'center', top: 'center', textStyle: { color: '#9CA3AF', fontSize: 13, fontWeight: 'normal' } },
  }
}

function pieOption(list: NameValue[]): EChartsOption {
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll', textStyle: { color: AXIS_TEXT, fontSize: 11 } },
    color: PALETTE,
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '44%'],
        data: list.map((x) => ({ name: x.name, value: x.value })),
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      },
    ],
  }
}

function hbarOption(list: NameValue[]): EChartsOption {
  if (!list.length) return emptyOption()
  const items = list.slice().reverse()
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 96, right: 32, top: 16, bottom: 16 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f2f7' } }, axisLabel: { color: AXIS_TEXT } },
    yAxis: {
      type: 'category',
      data: items.map((x) => x.name),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: AXIS_TEXT, fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: items.map((x) => x.value),
        barMaxWidth: 16,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#3A7AFE' }, { offset: 1, color: '#93B5FE' }],
          },
        },
      },
    ],
  }
}

function renderCharts() {
  const a = props.analytics
  if (!a) return

  if (!a.trend.dates.length) upsert('trend', trendRef.value, emptyOption())
  else {
    upsert('trend', trendRef.value, {
      tooltip: { trigger: 'axis' },
      legend: { data: ['访问量(PV)', '访客数(UV)'], top: 0, left: 'center', textStyle: { color: AXIS_TEXT } },
      grid: { left: 48, right: 24, top: 40, bottom: 24 },
      xAxis: {
        type: 'category', data: a.trend.dates, boundaryGap: false,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: AXIS_TEXT, fontSize: 11 },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f2f7' } }, axisLabel: { color: AXIS_TEXT } },
      series: [
        {
          name: '访问量(PV)', type: 'line', smooth: true, showSymbol: false, data: a.trend.pv,
          itemStyle: { color: '#3A7AFE' }, areaStyle: { color: 'rgba(58,122,254,0.12)' },
        },
        {
          name: '访客数(UV)', type: 'line', smooth: true, showSymbol: false, data: a.trend.uv,
          itemStyle: { color: '#22C55E' }, areaStyle: { color: 'rgba(34,197,94,0.10)' },
        },
      ],
    })
  }

  upsert('source', sourceRef.value, a.sources.length ? pieOption(a.sources) : emptyOption())

  const hourTotal = a.hours.pv.reduce((s, v) => s + v, 0)
  if (!hourTotal) upsert('hour', hourRef.value, emptyOption())
  else {
    upsert('hour', hourRef.value, {
      tooltip: { trigger: 'axis' },
      grid: { left: 44, right: 16, top: 24, bottom: 28 },
      xAxis: {
        type: 'category', data: a.hours.labels,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: AXIS_TEXT, fontSize: 10, interval: 2 },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f2f7' } }, axisLabel: { color: AXIS_TEXT } },
      series: [
        {
          name: '访问量', type: 'bar', data: a.hours.pv, barMaxWidth: 22,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: '#3A7AFE' }, { offset: 1, color: '#93B5FE' }],
            },
          },
        },
      ],
    })
  }

  const devices = a.devices.map((d) => ({ name: deviceLabel(d.name), value: d.value }))
  upsert('device', deviceRef.value, devices.length ? pieOption(devices) : emptyOption())
  upsert('os', osRef.value, a.os.length ? pieOption(a.os) : emptyOption())
  upsert('browser', browserRef.value, a.browsers.length ? pieOption(a.browsers) : emptyOption())
  upsert('region', regionRef.value, hbarOption(a.regions))
  upsert('isp', ispRef.value, hbarOption(a.isps))
}

/** 供父组件在容器由隐藏转为可见时手动触发重绘 */
function resize() {
  Object.values(charts).forEach((c) => c?.resize())
}

watch(
  () => props.analytics,
  async () => {
    await nextTick()
    renderCharts()
  },
)

onMounted(async () => {
  if (props.analytics) {
    await nextTick()
    renderCharts()
  }
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  Object.values(charts).forEach((c) => disposeChart(c))
})

defineExpose({ resize })
</script>

<style scoped lang="scss">
.stat-cards {
  margin-bottom: 4px;
}

.stat-card {
  background: #f7f9fc;
  border-radius: 8px;
  padding: 14px 10px;
  text-align: center;
  margin-bottom: 12px;

  .stat-num {
    font-size: 24px;
    font-weight: 700;
    color: var(--el-color-primary);
    line-height: 1.2;
  }

  .stat-lbl {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.chart-card {
  margin-bottom: 16px;

  .chart-title {
    font-weight: 600;
  }

  .chart-sub {
    margin-left: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.chart-box {
  height: 300px;
}
</style>
