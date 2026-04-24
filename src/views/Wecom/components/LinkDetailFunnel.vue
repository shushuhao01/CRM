<template>
  <div class="link-detail-funnel">
    <!-- 6级漏斗图 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">🔽 转化漏斗</span></template>
      <div class="funnel-chart">
        <div
          v-for="(level, idx) in funnelLevels"
          :key="level.name"
          class="funnel-level"
        >
          <div class="funnel-bar-wrapper">
            <div
              class="funnel-bar"
              :style="{
                width: calcFunnelWidth(level.count) + '%',
                background: funnelColors[idx]
              }"
            >
              <span class="funnel-bar-text">{{ level.name }}</span>
            </div>
          </div>
          <div class="funnel-data">
            <span class="funnel-count">{{ level.count }}人</span>
            <span class="funnel-percent">{{ level.percent }}%</span>
            <span v-if="level.lossCount > 0" class="funnel-loss">
              流失 {{ level.lossCount }}
            </span>
          </div>
          <!-- 级间流失箭头 -->
          <div v-if="idx < funnelLevels.length - 1" class="funnel-arrow">
            <span class="arrow-line" />
            <span class="arrow-loss-rate">
              {{ calcStageConversion(idx) }}%
            </span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 对话深度比例 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">💬 对话深度比例</span></template>
      <div class="depth-bars">
        <div v-for="item in depthRatio" :key="item.label" class="depth-item">
          <span class="depth-label">{{ item.label }}</span>
          <div class="depth-track">
            <div
              class="depth-fill"
              :style="{ width: item.percent + '%', background: item.color }"
            />
          </div>
          <span class="depth-pct">{{ item.percent }}%</span>
        </div>
      </div>
    </el-card>

    <!-- 异常指标提示 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">⚠️ 异常指标检测</span></template>
      <div class="warning-cards">
        <div
          v-for="w in warnings"
          :key="w.label"
          class="warning-card"
          :class="w.level"
        >
          <div class="warning-icon">{{ w.level === 'ok' ? '✅' : '⚠️' }}</div>
          <div class="warning-content">
            <div class="warning-label">{{ w.label }}</div>
            <div class="warning-desc">{{ w.desc }}</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FunnelLevel } from '../types'

defineProps<{
  linkId: number
  isDemoMode: boolean
}>()

// 示例漏斗数据（6级）
const funnelLevels: FunnelLevel[] = [
  { name: '点击链接', count: 580, percent: 100, lossCount: 0 },
  { name: '成功添加', count: 156, percent: 26.9, lossCount: 424 },
  { name: '首次开口', count: 112, percent: 19.3, lossCount: 44 },
  { name: '有效沟通(≥5句)', count: 68, percent: 11.7, lossCount: 44 },
  { name: '关联CRM', count: 42, percent: 7.2, lossCount: 26 },
  { name: '成交', count: 18, percent: 3.1, lossCount: 24 },
]

const funnelColors = [
  '#4C6EF5', '#6D8CF5', '#818CF8', '#A78BFA', '#C084FC', '#D946EF'
]

const maxCount = computed(() => Math.max(...funnelLevels.map(l => l.count), 1))

const calcFunnelWidth = (count: number) => {
  return Math.max((count / maxCount.value) * 100, 12)
}

const calcStageConversion = (idx: number) => {
  const current = funnelLevels[idx].count
  const next = funnelLevels[idx + 1]?.count || 0
  if (!current) return 0
  return ((next / current) * 100).toFixed(1)
}

const depthRatio = [
  { label: '仅1句', percent: 16, color: '#EF4444' },
  { label: '2-3句', percent: 31, color: '#F59E0B' },
  { label: '4-5句', percent: 25, color: '#4C6EF5' },
  { label: '6-10句', percent: 20, color: '#10B981' },
  { label: '10句+', percent: 8, color: '#059669' },
]

const warnings = [
  { label: '点击→添加转化率', desc: '26.9%，低于行业均值30%，建议优化欢迎语和头像', level: 'warn' },
  { label: '开口率', desc: '71.8%，高于行业均值65%', level: 'ok' },
  { label: '有效沟通率', desc: '43.6%，处于正常范围', level: 'ok' },
  { label: '成交转化率', desc: '3.1%，低于目标5%，建议跟进话术优化', level: 'warn' },
]
</script>

<style scoped>
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 14px; color: #1F2937; }

/* 漏斗图 */
.funnel-chart { display: flex; flex-direction: column; gap: 4px; padding: 16px 0; }
.funnel-level { display: flex; flex-direction: column; align-items: center; position: relative; }
.funnel-bar-wrapper { width: 100%; display: flex; justify-content: center; }
.funnel-bar {
  height: 40px; border-radius: 6px; display: flex; align-items: center;
  justify-content: center; color: #fff; font-weight: 600; font-size: 13px;
  min-width: 80px; transition: width 0.5s ease;
}
.funnel-bar-text { white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.funnel-data {
  display: flex; gap: 16px; margin-top: 4px; font-size: 13px;
}
.funnel-count { font-weight: 700; color: #1F2937; }
.funnel-percent { color: #6B7280; }
.funnel-loss { color: #EF4444; font-size: 12px; }

.funnel-arrow {
  display: flex; align-items: center; gap: 8px; margin: 4px 0;
}
.arrow-line {
  width: 1px; height: 16px; background: #D1D5DB; display: inline-block;
}
.arrow-loss-rate { font-size: 11px; color: #9CA3AF; }

/* 对话深度 */
.depth-bars { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.depth-item { display: flex; align-items: center; gap: 12px; }
.depth-label { width: 60px; font-size: 13px; color: #4B5563; text-align: right; flex-shrink: 0; }
.depth-track { flex: 1; height: 20px; background: #F3F4F6; border-radius: 10px; overflow: hidden; }
.depth-fill { height: 100%; border-radius: 10px; min-width: 6px; transition: width 0.5s; }
.depth-pct { width: 40px; font-size: 13px; font-weight: 600; color: #4B5563; }

/* 异常提示 */
.warning-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.warning-card {
  display: flex; gap: 12px; padding: 14px 16px; border-radius: 10px;
  border: 1px solid #E5E7EB;
}
.warning-card.ok { background: #ECFDF5; border-color: #A7F3D0; }
.warning-card.warn { background: #FFFBEB; border-color: #FDE68A; }
.warning-icon { font-size: 20px; flex-shrink: 0; }
.warning-label { font-weight: 600; font-size: 13px; color: #1F2937; }
.warning-desc { font-size: 12px; color: #6B7280; margin-top: 2px; }
</style>

