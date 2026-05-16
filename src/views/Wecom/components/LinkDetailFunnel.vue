<template>
  <div class="link-detail-funnel">
    <!-- 6级漏斗图 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">转化漏斗</span></template>
      <div class="funnel-chart" v-loading="loading">
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
          <div v-if="idx < funnelLevels.length - 1" class="funnel-arrow">
            <span class="arrow-line" />
            <span class="arrow-loss-rate">
              {{ calcStageConversion(idx) }}%
            </span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 异常指标提示 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">异常指标检测</span></template>
      <div class="warning-cards">
        <div
          v-for="w in warnings"
          :key="w.label"
          class="warning-card"
          :class="w.level"
        >
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
import { ref, computed, watch } from 'vue'
import { getAcquisitionLinkFunnel } from '@/api/wecom'
import type { FunnelLevel } from '../types'

const props = defineProps<{
  linkId: number
  isDemoMode: boolean
}>()

const loading = ref(false)
const funnelLevels = ref<FunnelLevel[]>([])
const warnings = ref<Array<{ label: string; desc: string; level: string }>>([])

const funnelColors = [
  '#4C6EF5', '#6D8CF5', '#818CF8', '#A78BFA', '#C084FC', '#D946EF'
]

const maxCount = computed(() => Math.max(...funnelLevels.value.map(l => l.count), 1))

const calcFunnelWidth = (count: number) => {
  return Math.max((count / maxCount.value) * 100, 12)
}

const calcStageConversion = (idx: number) => {
  const current = funnelLevels.value[idx]?.count || 0
  const next = funnelLevels.value[idx + 1]?.count || 0
  if (!current) return 0
  return ((next / current) * 100).toFixed(1)
}

const fetchData = async () => {
  if (props.isDemoMode) return
  loading.value = true
  try {
    const res: any = await getAcquisitionLinkFunnel(props.linkId)
    const data = res?.data || res
    if (data) {
      funnelLevels.value = data.funnelLevels || []
      warnings.value = data.warnings || []
    }
  } catch (e) {
    console.error('[LinkDetailFunnel] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.linkId, () => fetchData(), { immediate: true })
</script>

<style scoped>
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 14px; color: #1F2937; }

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

.warning-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.warning-card {
  display: flex; gap: 12px; padding: 14px 16px; border-radius: 10px;
  border: 1px solid #E5E7EB;
}
.warning-card.ok { background: #ECFDF5; border-color: #A7F3D0; }
.warning-card.warn { background: #FFFBEB; border-color: #FDE68A; }
.warning-label { font-weight: 600; font-size: 13px; color: #1F2937; }
.warning-desc { font-size: 12px; color: #6B7280; margin-top: 2px; }
</style>
