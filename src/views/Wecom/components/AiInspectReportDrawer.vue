<template>
  <el-drawer v-model="visible" title="AI质检报告" size="580px" :before-close="handleClose">
    <template v-if="report">
      <div class="report-header">
        <div class="report-pair">
          <span class="report-employee">{{ report.employeeName }}</span>
          <span class="report-vs">与</span>
          <span class="report-customer">{{ report.customerName }}</span>
        </div>
        <div class="report-meta">
          <span>分析时间: {{ report.analyzedAt }}</span>
          <span>策略: {{ report.strategyName }}</span>
        </div>
      </div>

      <!-- 综合评分 -->
      <div class="score-section">
        <div class="score-ring">
          <el-progress
            type="circle"
            :percentage="report.totalScore"
            :width="120"
            :color="scoreColor"
            :stroke-width="10"
          >
            <template #default>
              <span class="score-num">{{ report.totalScore }}</span>
              <span class="score-unit">分</span>
            </template>
          </el-progress>
        </div>
        <el-tag :type="riskTagType" size="large" class="risk-tag">{{ riskLabel }}</el-tag>
      </div>

      <!-- 维度评分 -->
      <div class="dimension-section">
        <h4>维度评分</h4>
        <div class="dimension-list">
          <div v-for="dim in report.dimensions" :key="dim.name" class="dimension-item">
            <span class="dim-name">{{ dim.name }}</span>
            <el-progress
              :percentage="dim.score"
              :stroke-width="14"
              :text-inside="true"
              :color="dim.score >= 90 ? '#10B981' : dim.score >= 70 ? '#F59E0B' : '#EF4444'"
              :format="() => dim.score + '分'"
              style="flex: 1"
            />
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 亮点 -->
      <div v-if="report.highlights && report.highlights.length" class="feedback-section">
        <h4>亮点</h4>
        <div v-for="(h, i) in report.highlights" :key="i" class="feedback-item highlight">
          <el-icon color="#10B981"><CircleCheckFilled /></el-icon>
          <span>{{ h }}</span>
        </div>
      </div>

      <!-- 待改进 -->
      <div v-if="report.improvements && report.improvements.length" class="feedback-section">
        <h4>待改进</h4>
        <div v-for="(item, i) in report.improvements" :key="i" class="feedback-item improvement">
          <el-icon color="#F59E0B"><WarningFilled /></el-icon>
          <span>{{ item }}</span>
        </div>
      </div>

      <!-- 风险提示 -->
      <div v-if="report.risks && report.risks.length" class="feedback-section">
        <h4>风险提示</h4>
        <div v-for="(r, i) in report.risks" :key="i" class="feedback-item risk">
          <el-icon color="#EF4444"><CircleCloseFilled /></el-icon>
          <span>{{ r }}</span>
        </div>
      </div>

      <el-divider />

      <!-- AI建议 -->
      <div class="suggestion-section">
        <h4>AI建议</h4>
        <div class="suggestion-text">{{ report.suggestion }}</div>
      </div>
    </template>
    <el-empty v-else description="暂无报告数据" />
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheckFilled, WarningFilled, CircleCloseFilled } from '@element-plus/icons-vue'

export interface AiInspectReport {
  id: number
  employeeName: string
  customerName: string
  strategyName: string
  totalScore: number
  riskLevel: string
  analyzedAt: string
  dimensions: { name: string; score: number }[]
  highlights: string[]
  improvements: string[]
  risks: string[]
  suggestion: string
}

const visible = defineModel<boolean>({ default: false })

const props = defineProps<{
  report: AiInspectReport | null
}>()

const scoreColor = computed(() => {
  if (!props.report) return '#909399'
  if (props.report.totalScore >= 90) return '#10B981'
  if (props.report.totalScore >= 70) return '#F59E0B'
  return '#EF4444'
})

const riskLabel = computed(() => {
  if (!props.report) return '-'
  if (props.report.riskLevel === 'excellent') return '优秀'
  if (props.report.riskLevel === 'pass') return '合格'
  return '不合格'
})

const riskTagType = computed(() => {
  if (!props.report) return 'info' as const
  if (props.report.riskLevel === 'excellent') return 'success' as const
  if (props.report.riskLevel === 'pass') return 'warning' as const
  return 'danger' as const
})

const handleClose = () => { visible.value = false }
</script>

<style scoped>
.report-header { text-align: center; margin-bottom: 20px; }
.report-pair { font-size: 18px; font-weight: 600; color: #1F2937; }
.report-vs { margin: 0 8px; color: #9CA3AF; font-weight: 400; }
.report-meta { font-size: 12px; color: #9CA3AF; margin-top: 6px; display: flex; gap: 16px; justify-content: center; }

.score-section { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 24px; }
.score-num { font-size: 32px; font-weight: 700; color: #1F2937; }
.score-unit { font-size: 14px; color: #9CA3AF; margin-left: 2px; }
.risk-tag { font-size: 14px; font-weight: 600; }

.dimension-section h4, .feedback-section h4, .suggestion-section h4 {
  font-size: 15px; font-weight: 600; color: #1F2937; margin-bottom: 12px;
}
.dimension-list { display: flex; flex-direction: column; gap: 10px; }
.dimension-item { display: flex; align-items: center; gap: 12px; }
.dim-name { font-size: 13px; color: #4B5563; width: 70px; text-align: right; }

.feedback-section { margin-bottom: 16px; }
.feedback-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; font-size: 13px; color: #374151; line-height: 1.5; }
.feedback-item.highlight { background: #F0FDF4; }
.feedback-item.improvement { background: #FFFBEB; }
.feedback-item.risk { background: #FEF2F2; }

.suggestion-section { margin-bottom: 20px; }
.suggestion-text { font-size: 13px; color: #4B5563; line-height: 1.8; background: #F9FAFB; padding: 14px 18px; border-radius: 10px; border-left: 4px solid #7C3AED; }
</style>

