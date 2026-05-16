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
      <template #header><span class="section-title">开口时间分布</span></template>
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
      <template #header><span class="section-title">对话深度分布</span></template>
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
      <template #header><span class="section-title">成员开口排行</span></template>
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
import { ref, reactive, computed, watch } from 'vue'
import { getAcquisitionLinkStats } from '@/api/wecom'

const props = defineProps<{
  linkId: number
  isDemoMode: boolean
}>()

const loading = ref(false)

const stats = reactive({
  totalAdd: 0,
  talked: 0,
  talkRate: 0,
  avgTalkMinutes: 0
})

const timeDistribution = ref<Array<{ label: string; count: number }>>([])
const depthDistribution = ref<Array<{ label: string; count: number }>>([])
const memberRanking = ref<any[]>([])

const timeMaxCount = computed(() => Math.max(...timeDistribution.value.map(i => i.count), 1))
const depthMaxCount = computed(() => Math.max(...depthDistribution.value.map(i => i.count), 1))

const calcBarPercent = (count: number, max: number) => {
  return Math.min((count / max) * 100, 100)
}

const fetchData = async () => {
  if (props.isDemoMode) return
  loading.value = true
  try {
    const res: any = await getAcquisitionLinkStats(props.linkId)
    const data = res?.data || res
    if (data) {
      stats.totalAdd = data.totalAdd || 0
      stats.talked = data.talked || 0
      stats.talkRate = data.talkRate || 0
      stats.avgTalkMinutes = data.avgTalkMinutes || 0
      timeDistribution.value = data.timeDistribution || []
      depthDistribution.value = data.depthDistribution || []
      memberRanking.value = data.memberRanking || []
    }
  } catch (e) {
    console.error('[LinkDetailTalkStats] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.linkId, () => fetchData(), { immediate: true })
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
