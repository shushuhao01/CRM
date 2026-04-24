<template>
  <div class="group-card" @click="$emit('detail', group)">
    <div class="card-header">
      <el-icon :size="18" style="color: #4C6EF5"><ChatDotRound /></el-icon>
      <span class="card-name">{{ group.name || '未命名群' }}</span>
      <el-tag :type="group.status === 'normal' ? 'success' : 'danger'" size="small">
        {{ group.status === 'normal' ? '正常' : '解散' }}
      </el-tag>
    </div>
    <div class="card-info">
      <div class="info-row"><span class="label">群主:</span> {{ group.ownerUserName || group.ownerUserId || '-' }}</div>
      <div class="info-row"><span class="label">成员:</span> {{ group.memberCount || 0 }}人</div>
      <div class="info-row"><span class="label">今日消息:</span> <span class="msg-count">{{ group.todayMsgCount || 0 }}</span></div>
    </div>
    <!-- 活跃度进度条 -->
    <div class="activity-bar">
      <span class="act-label">活跃度</span>
      <el-progress :percentage="activityRate" :stroke-width="10" :color="activityColor" :text-inside="true" />
    </div>
    <!-- 7日消息迷你趋势 -->
    <div class="card-trend">
      <svg :width="trendWidth" height="28" viewBox="0 0 120 28">
        <polyline :points="trendPoints" fill="none" stroke="#4C6EF5" stroke-width="1.5" stroke-linejoin="round" />
      </svg>
    </div>
    <!-- 操作 -->
    <div class="card-actions">
      <el-button size="small" link type="primary" @click.stop="$emit('detail', group)">详情</el-button>
      <el-button size="small" link type="success" @click.stop="$emit('members', group)">成员</el-button>
      <el-button size="small" link @click.stop="$emit('stats', group)">统计</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'

const props = defineProps<{ group: any }>()
defineEmits(['detail', 'members', 'stats'])

const trendWidth = 120

const activityRate = computed(() => {
  return props.group.activityRate || 0
})

const activityColor = computed(() => {
  if (activityRate.value >= 70) return '#10B981'
  if (activityRate.value >= 40) return '#F59E0B'
  return '#EF4444'
})

// 7日趋势线
const trendData = computed(() => {
  if (props.group.trend7d && Array.isArray(props.group.trend7d)) return props.group.trend7d
  return Array.from({ length: 7 }, () => 0)
})

const trendPoints = computed(() => {
  const data = trendData.value
  const max = Math.max(...data, 1)
  const stepX = trendWidth / (data.length - 1 || 1)
  return data.map((v: number, i: number) => {
    const x = i * stepX
    const y = 26 - (v / max) * 24
    return `${x},${y}`
  }).join(' ')
})
</script>

<style scoped>
.group-card {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 12px;
  padding: 16px; cursor: pointer; transition: all 0.3s;
}
.group-card:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,0.1); }
.card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-name { font-weight: 600; font-size: 15px; color: #1F2937; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-info { margin-bottom: 10px; }
.info-row { font-size: 13px; color: #6B7280; margin-bottom: 4px; }
.info-row .label { color: #9CA3AF; }
.msg-count { font-weight: 700; color: #4C6EF5; }
.activity-bar { margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.act-label { font-size: 12px; color: #9CA3AF; white-space: nowrap; }
.card-trend { margin-bottom: 8px; overflow: hidden; }
.card-actions { display: flex; gap: 4px; justify-content: flex-end; }
</style>

