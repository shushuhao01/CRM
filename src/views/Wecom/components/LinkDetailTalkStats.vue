<template>
  <div class="link-detail-talk-stats">
    <!-- 4个统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalAdd }}</div>
        <div class="stat-label">总添加</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-success">{{ stats.talked }}</div>
        <div class="stat-label">已开口</div>
      </div>
      <div class="stat-card">
        <div class="stat-value text-primary">{{ stats.talkRate }}%</div>
        <div class="stat-label">开口率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.avgTalkMinutes }}分钟</div>
        <div class="stat-label">平均开口时长</div>
      </div>
    </div>

    <!-- 开口时间分布 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">⏱️ 开口时间分布</span></template>
      <div class="h-bar-chart">
        <div v-for="item in timeDistribution" :key="item.label" class="h-bar-item">
          <span class="h-bar-label">{{ item.label }}</span>
          <div class="h-bar-track">
            <div class="h-bar-fill" :style="{ width: calcBarPercent(item.count, timeMaxCount) + '%' }" />
          </div>
          <span class="h-bar-count">{{ item.count }}</span>
        </div>
      </div>
    </el-card>

    <!-- 对话深度分布 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">💬 对话深度分布</span></template>
      <div class="h-bar-chart">
        <div v-for="item in depthDistribution" :key="item.label" class="h-bar-item">
          <span class="h-bar-label">{{ item.label }}</span>
          <div class="h-bar-track">
            <div class="h-bar-fill depth-fill" :style="{ width: calcBarPercent(item.count, depthMaxCount) + '%' }" />
          </div>
          <span class="h-bar-count">{{ item.count }}</span>
        </div>
      </div>
    </el-card>

    <!-- 成员开口排行 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">🏆 成员开口排行</span></template>
      <el-table :data="memberRanking" stripe size="small">
        <el-table-column prop="name" label="成员" min-width="100" />
        <el-table-column prop="addCount" label="添加数" width="90" sortable />
        <el-table-column prop="talkedCount" label="已开口" width="90" sortable />
        <el-table-column label="开口率" width="100" sortable :sort-by="'talkRate'">
          <template #default="{ row }">
            <span :class="row.talkRate >= 70 ? 'text-success' : row.talkRate >= 40 ? 'text-warning' : 'text-danger'">
              {{ row.talkRate }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="平均开口时长" width="120">
          <template #default="{ row }">{{ row.avgMinutes }}分钟</template>
        </el-table-column>
        <el-table-column label="平均对话句数" width="120">
          <template #default="{ row }">{{ row.avgSentences }}句</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'

defineProps<{
  linkId: number
  isDemoMode: boolean
}>()

// 示例统计数据
const stats = reactive({
  totalAdd: 156,
  talked: 112,
  talkRate: 71.8,
  avgTalkMinutes: 4.2
})

const timeDistribution = [
  { label: '<1分钟', count: 45 },
  { label: '1-5分钟', count: 32 },
  { label: '5-30分钟', count: 20 },
  { label: '30分-1时', count: 10 },
  { label: '>1小时', count: 5 },
]

const depthDistribution = [
  { label: '1句', count: 18 },
  { label: '2-3句', count: 35 },
  { label: '4-5句', count: 28 },
  { label: '6-10句', count: 22 },
  { label: '10句以上', count: 9 },
]

const memberRanking = [
  { name: '王销售', addCount: 52, talkedCount: 42, talkRate: 80.8, avgMinutes: 3.5, avgSentences: 6.2 },
  { name: '陈经理', addCount: 48, talkedCount: 35, talkRate: 72.9, avgMinutes: 5.1, avgSentences: 8.4 },
  { name: '张客服', addCount: 35, talkedCount: 22, talkRate: 62.9, avgMinutes: 4.8, avgSentences: 5.7 },
  { name: '李主管', addCount: 21, talkedCount: 13, talkRate: 61.9, avgMinutes: 3.2, avgSentences: 4.1 },
]

const timeMaxCount = computed(() => Math.max(...timeDistribution.map(i => i.count), 1))
const depthMaxCount = computed(() => Math.max(...depthDistribution.map(i => i.count), 1))

const calcBarPercent = (count: number, max: number) => {
  return Math.min((count / max) * 100, 100)
}
</script>

<style scoped>
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 12px;
  padding: 16px 20px; text-align: center; transition: all 0.3s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-value { font-size: 26px; font-weight: 700; color: #1F2937; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.text-success { color: #10B981; }
.text-primary { color: #4C6EF5; }
.text-warning { color: #F59E0B; }
.text-danger { color: #EF4444; }

.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 14px; color: #1F2937; }

/* 横向柱状图 */
.h-bar-chart { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.h-bar-item { display: flex; align-items: center; gap: 12px; }
.h-bar-label { width: 90px; font-size: 13px; color: #4B5563; text-align: right; flex-shrink: 0; }
.h-bar-track { flex: 1; height: 22px; background: #F3F4F6; border-radius: 11px; overflow: hidden; }
.h-bar-fill {
  height: 100%; border-radius: 11px; min-width: 6px;
  background: linear-gradient(90deg, #4C6EF5, #818CF8);
  transition: width 0.5s ease;
}
.depth-fill { background: linear-gradient(90deg, #10B981, #6EE7B7); }
.h-bar-count { width: 40px; font-size: 13px; font-weight: 600; color: #4C6EF5; }
</style>

