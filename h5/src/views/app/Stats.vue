<template>
  <div class="page-container">
    <!-- 周期快捷统计 -->
    <div class="card">
      <van-tabs v-model:active="period" @change="loadBasicStats" color="#6366f1" title-active-color="#6366f1">
        <van-tab title="今日" name="today" />
        <van-tab title="本周" name="week" />
        <van-tab title="本月" name="month" />
      </van-tabs>
      <van-loading v-if="basicLoading" size="24px" style="text-align:center;padding:20px;" />
      <div v-else class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">{{ basicStats.newCustomerCount ?? 0 }}</div>
          <div class="kpi-label">新增客户</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ basicStats.acquisitionCount ?? 0 }}</div>
          <div class="kpi-label">企业获客</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ basicStats.dealCount ?? 0 }}<small>单</small></div>
          <div class="kpi-label">成交订单</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value kpi-amount">¥{{ basicStats.dealAmount ?? '0' }}</div>
          <div class="kpi-label">业绩金额</div>
        </div>
      </div>
    </div>

    <!-- 客户总览 -->
    <div class="card">
      <div class="card-title">客户总览</div>
      <van-loading v-if="detailLoading" size="24px" style="text-align:center;padding:20px;" />
      <div v-else class="overview-grid">
        <div class="ov-item ov-total">
          <div class="ov-val">{{ detail.overview?.totalCustomers ?? 0 }}</div>
          <div class="ov-lbl">总客户</div>
        </div>
        <div class="ov-item ov-crm">
          <div class="ov-val">{{ detail.overview?.boundCrmCount ?? 0 }}</div>
          <div class="ov-lbl">已关联CRM</div>
        </div>
        <div class="ov-item ov-dealt">
          <div class="ov-val">{{ detail.overview?.dealtCount ?? 0 }}</div>
          <div class="ov-lbl">已成交</div>
        </div>
        <div class="ov-item ov-lost">
          <div class="ov-val">{{ detail.overview?.deletedCustomers ?? 0 }}</div>
          <div class="ov-lbl">已流失</div>
        </div>
      </div>
    </div>

    <!-- 近7天新增趋势 (曲线图) -->
    <div v-if="detail.trends?.length" class="card">
      <div class="card-title">近7天新增趋势</div>
      <div class="curve-chart-wrap">
        <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="curve-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.28" />
              <stop offset="100%" stop-color="#93c5fd" stop-opacity="0.03" />
            </linearGradient>
          </defs>
          <path :d="trendAreaPath" fill="url(#gradBlue)" />
          <path :d="trendLinePath" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-for="(pt, i) in trendPoints" :key="i" :cx="pt.x" :cy="pt.y" r="3" fill="#fff" stroke="#60a5fa" stroke-width="1.5" />
        </svg>
        <div class="curve-labels">
          <span v-for="item in detail.trends" :key="item.date">{{ item.date }}</span>
        </div>
        <div class="curve-values">
          <span v-for="(pt, i) in trendPoints" :key="i" :style="{ left: pt.x / svgW * 100 + '%' }">{{ detail.trends[i].count }}</span>
        </div>
      </div>
    </div>

    <!-- 近7天流失趋势 (曲线图) -->
    <div v-if="detail.lossTrends?.length" class="card">
      <div class="card-title">近7天流失趋势</div>
      <div class="curve-chart-wrap">
        <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="curve-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#fca5a5" stop-opacity="0.32" />
              <stop offset="100%" stop-color="#fecaca" stop-opacity="0.03" />
            </linearGradient>
          </defs>
          <path :d="lossAreaPath" fill="url(#gradRed)" />
          <path :d="lossLinePath" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-for="(pt, i) in lossPoints" :key="i" :cx="pt.x" :cy="pt.y" r="3" fill="#fff" stroke="#f87171" stroke-width="1.5" />
        </svg>
        <div class="curve-labels">
          <span v-for="item in detail.lossTrends" :key="item.date">{{ item.date }}</span>
        </div>
        <div class="curve-values curve-values--red">
          <span v-for="(pt, i) in lossPoints" :key="i" :style="{ left: pt.x / svgW * 100 + '%' }">{{ detail.lossTrends[i].count }}</span>
        </div>
      </div>
    </div>

    <!-- 性别分布 -->
    <div v-if="detail.genderData?.length" class="card">
      <div class="card-title">性别分布</div>
      <div class="dist-list">
        <div v-for="item in detail.genderData" :key="item.label" class="dist-item">
          <div class="dist-header">
            <span class="dist-label">{{ item.label }}</span>
            <span class="dist-count">{{ item.value }}人 ({{ getPercent(item.value, genderTotal) }}%)</span>
          </div>
          <div class="dist-bar-bg">
            <div class="dist-bar-fill" :style="{ width: getPercent(item.value, genderTotal) + '%', background: genderColors[item.label] || '#6366f1' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加方式分布 -->
    <div v-if="detail.addWayData?.length" class="card">
      <div class="card-title">添加渠道分布</div>
      <div class="dist-list">
        <div v-for="item in detail.addWayData" :key="item.label" class="dist-item">
          <div class="dist-header">
            <span class="dist-label">{{ item.label }}</span>
            <span class="dist-count">{{ item.value }}人 ({{ getPercent(item.value, addWayTotal) }}%)</span>
          </div>
          <div class="dist-bar-bg">
            <div class="dist-bar-fill" :style="{ width: getPercent(item.value, addWayTotal) + '%', background: channelColors[item.label] || '#8b5cf6' }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签Top10 -->
    <div v-if="detail.tagData?.length" class="card">
      <div class="card-title">标签 Top {{ detail.tagData.length }}</div>
      <div class="tag-cloud">
        <van-tag
          v-for="item in detail.tagData"
          :key="item.label"
          round
          size="medium"
          :color="getTagColor(item.label)"
          text-color="#fff"
          class="tag-item"
        >
          {{ item.label }} ({{ item.value }})
        </van-tag>
      </div>
    </div>

    <!-- 获客排行 -->
    <div v-if="basicStats.acquisitionRank?.length" class="card">
      <div class="card-title">获客排行</div>
      <div class="rank-list">
        <div v-for="(item, i) in basicStats.acquisitionRank" :key="i" class="rank-item">
          <div class="rank-medal" :class="'rank-' + (i + 1)">{{ i + 1 }}</div>
          <span class="rank-name">{{ item.name }}</span>
          <span class="rank-count">+{{ item.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getStatsData, getStatsDetail } from '@/api/app'

const period = ref('today')
const basicLoading = ref(true)
const detailLoading = ref(true)
const basicStats = ref<any>({})
const detail = ref<any>({})

const genderColors: Record<string, string> = { '男': '#3b82f6', '女': '#ec4899', '未知': '#9ca3af' }
const channelColors: Record<string, string> = {
  '扫描二维码': '#6366f1', '扫码添加': '#6366f1', '搜索手机号': '#10b981',
  '名片分享': '#f59e0b', '群聊': '#8b5cf6', '手机通讯录': '#14b8a6',
  '微信联系人': '#3b82f6', '内部共享': '#ec4899', '管理员分配': '#ef4444'
}
const tagColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4']

const genderTotal = computed(() => (detail.value.genderData || []).reduce((s: number, i: any) => s + i.value, 0) || 1)
const addWayTotal = computed(() => (detail.value.addWayData || []).reduce((s: number, i: any) => s + i.value, 0) || 1)

// SVG curve chart helpers
const svgW = 320
const svgH = 100
const svgPadX = 24
const svgPadTop = 8
const svgPadBot = 4

interface Pt { x: number; y: number }

function buildPoints(data: any[]): Pt[] {
  if (!data || data.length === 0) return []
  const max = Math.max(...data.map(d => d.count), 1)
  const usableW = svgW - svgPadX * 2
  const usableH = svgH - svgPadTop - svgPadBot
  return data.map((d, i) => ({
    x: svgPadX + (data.length > 1 ? i / (data.length - 1) : 0.5) * usableW,
    y: svgPadTop + usableH - (d.count / max) * usableH
  }))
}

function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M${pts[0].x},${pts[0].y}` : ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, pts.length - 1)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

function areaPath(pts: Pt[]): string {
  if (pts.length < 2) return ''
  const linePath = smoothPath(pts)
  return `${linePath} L${pts[pts.length - 1].x},${svgH} L${pts[0].x},${svgH} Z`
}

const trendPoints = computed(() => buildPoints(detail.value.trends || []))
const lossPoints = computed(() => buildPoints(detail.value.lossTrends || []))
const trendLinePath = computed(() => smoothPath(trendPoints.value))
const trendAreaPath = computed(() => areaPath(trendPoints.value))
const lossLinePath = computed(() => smoothPath(lossPoints.value))
const lossAreaPath = computed(() => areaPath(lossPoints.value))

function getPercent(val: number, total: number): string {
  return ((val / total) * 100).toFixed(1)
}

function getTagColor(label: string): string {
  const idx = (label.charCodeAt(0) || 0) % tagColors.length
  return tagColors[idx]
}

async function loadBasicStats() {
  basicLoading.value = true
  try {
    const { data } = await getStatsData({ period: period.value })
    if (data?.success) basicStats.value = data.data || {}
  } catch (e) {
    console.error('[Stats] basic error:', e)
  } finally {
    basicLoading.value = false
  }
}

async function loadDetailStats() {
  detailLoading.value = true
  try {
    const { data } = await getStatsDetail()
    if (data?.success) detail.value = data.data || {}
  } catch (e) {
    console.error('[Stats] detail error:', e)
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  loadBasicStats()
  loadDetailStats()
})
</script>

<style scoped>
/* KPI grid */
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.kpi-card {
  text-align: center; padding: 12px 8px;
  background: #f9fafb; border-radius: 10px;
}
.kpi-value { font-size: 24px; font-weight: 700; color: #1f2937; }
.kpi-value small { font-size: 13px; font-weight: 400; }
.kpi-amount { font-size: 18px; color: #ef4444; }
.kpi-label { font-size: 12px; color: #9ca3af; margin-top: 2px; }

/* 客户总览 */
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ov-item {
  text-align: center; padding: 14px 8px; border-radius: 10px;
}
.ov-total { background: #eff6ff; }
.ov-crm { background: #f0fdf4; }
.ov-dealt { background: #fefce8; }
.ov-lost { background: #fef2f2; }
.ov-val { font-size: 22px; font-weight: 700; color: #1f2937; }
.ov-lbl { font-size: 12px; color: #6b7280; margin-top: 2px; }

/* 曲线图 */
.curve-chart-wrap { position: relative; }
.curve-svg { width: 100%; height: 100px; display: block; }
.curve-labels {
  display: flex; justify-content: space-between;
  padding: 4px 8px 0; font-size: 10px; color: #9ca3af;
}
.curve-values {
  position: absolute; top: 0; left: 0; right: 0; height: 100px;
  pointer-events: none;
}
.curve-values span {
  position: absolute; transform: translate(-50%, -18px);
  font-size: 10px; font-weight: 600; color: #60a5fa;
}
.curve-values--red span { color: #f87171; }

/* 分布条 */
.dist-list { display: flex; flex-direction: column; gap: 12px; }
.dist-item {}
.dist-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.dist-label { font-size: 13px; color: #374151; }
.dist-count { font-size: 12px; color: #9ca3af; }
.dist-bar-bg { height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
.dist-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; min-width: 2px; }

/* 标签云 */
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-item { font-size: 13px !important; padding: 4px 12px !important; }

/* 排行 */
.rank-list { display: flex; flex-direction: column; gap: 10px; }
.rank-item { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.rank-medal {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff; background: #d1d5db;
}
.rank-1 { background: #f59e0b; }
.rank-2 { background: #9ca3af; }
.rank-3 { background: #d97706; }
.rank-name { flex: 1; color: #374151; }
.rank-count { color: #6366f1; font-weight: 600; }
</style>
