<template>
  <el-row :gutter="20" class="stats-row">
    <el-col :span="6">
      <el-card class="stat-card">
        <div class="stat-item">
          <div class="stat-icon"><el-icon><Phone /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.todayCalls }}</div>
            <div class="stat-label">{{ callsLabel }}</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card">
        <div class="stat-item">
          <div class="stat-icon"><el-icon><Timer /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">{{ formatDuration(statistics.totalDuration) }}</div>
            <div class="stat-label">通话时长</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card">
        <div class="stat-item">
          <div class="stat-icon"><el-icon><SuccessFilled /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.connectionRate }}%</div>
            <div class="stat-label">接通率</div>
          </div>
        </div>
      </el-card>
    </el-col>
    <el-col :span="6">
      <el-card class="stat-card">
        <div class="stat-item">
          <div class="stat-icon"><el-icon><User /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.activeUsers }}</div>
            <div class="stat-label">活跃用户</div>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Phone, Timer, SuccessFilled, User } from '@element-plus/icons-vue'
import { formatDuration } from './helpers'

const props = defineProps<{
  statistics: {
    todayCalls: number
    totalDuration: number
    connectionRate: number
    activeUsers: number
  }
  dateRange?: string[]
}>()

const callsLabel = computed(() => {
  if (props.dateRange && props.dateRange.length === 2 && props.dateRange[0]) {
    if (props.dateRange[0] === props.dateRange[1]) return `${props.dateRange[0]} 通话`
    return `${props.dateRange[0]}~${props.dateRange[1]} 通话`
  }
  return '今日通话'
})
</script>

<style scoped>
.stats-row { margin-bottom: 20px; }
.stat-card { height: 100px; transition: all 0.3s ease; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
.stat-card :deep(.el-card__body) { height: 100%; padding: 0; }
.stat-item { display: flex; align-items: center; height: 100%; padding: 0 20px; }
.stat-icon {
  width: 50px; height: 50px; border-radius: 10px;
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  display: flex; align-items: center; justify-content: center;
  margin-right: 16px; font-size: 20px; color: white;
}
.stat-content { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: #303133; line-height: 1; margin-bottom: 4px; }
.stat-label { font-size: 14px; color: #909399; }
</style>

