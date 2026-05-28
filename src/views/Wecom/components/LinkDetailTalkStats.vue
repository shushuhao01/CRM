<template>
  <div class="link-detail-talk-stats">
    <!-- 3个统计卡片 -->
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
    </div>

    <!-- 成员开口排行 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">成员开口排行</span></template>
      <el-table :data="memberRanking" stripe size="small" v-loading="loading">
        <el-table-column label="排名" width="60" align="center">
          <template #default="{ $index }">
            <span :class="$index < 3 ? 'rank-top' : ''">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="成员" min-width="120" />
        <el-table-column prop="addCount" label="添加数" width="90" sortable align="center" />
        <el-table-column prop="talkedCount" label="已开口" width="90" sortable align="center" />
        <el-table-column label="开口率" width="100" sortable :sort-by="'talkRate'" align="center">
          <template #default="{ row }">
            <span :class="row.talkRate >= 70 ? 'text-success' : row.talkRate >= 40 ? 'text-warning' : 'text-danger'">
              {{ row.talkRate }}%
            </span>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="memberRanking.length === 0 && !loading" class="empty-hint">
        暂无数据，请先点击"同步数据"更新统计
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { getAcquisitionLinkStats, getContactWayStats } from '@/api/wecom'

const props = withDefaults(defineProps<{
  linkId: number
  isDemoMode: boolean
  type?: 'acquisition' | 'contactway'
}>(), { type: 'acquisition' })

const loading = ref(false)

const stats = reactive({
  totalAdd: 0,
  talked: 0,
  talkRate: 0,
})

const memberRanking = ref<any[]>([])

const fetchData = async () => {
  if (props.isDemoMode) return
  loading.value = true
  try {
    const res: any = props.type === 'contactway'
      ? await getContactWayStats(props.linkId)
      : await getAcquisitionLinkStats(props.linkId)
    const data = res?.data || res
    if (data) {
      stats.totalAdd = data.totalAdd || 0
      stats.talked = data.talked || 0
      stats.talkRate = data.talkRate || 0
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
.stat-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
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
.rank-top { font-weight: 700; color: #F59E0B; font-size: 16px; }
.empty-hint { text-align: center; padding: 20px 0; color: #9CA3AF; font-size: 13px; }
</style>
