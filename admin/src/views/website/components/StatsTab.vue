<template>
  <div class="site-tab" v-loading="loading">
    <!-- 概览卡片 -->
    <el-row :gutter="16">
      <el-col :span="4">
        <div class="stat-card">
          <div class="stat-label">累计 PV</div>
          <div class="stat-value">{{ overview.total.pv }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <div class="stat-label">累计 UV</div>
          <div class="stat-value">{{ overview.total.uv }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <div class="stat-label">独立 IP</div>
          <div class="stat-value">{{ overview.total.ipCount }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <div class="stat-label">今日 PV</div>
          <div class="stat-value">{{ overview.today.pv }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <div class="stat-label">今日 UV</div>
          <div class="stat-value">{{ overview.today.uv }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card">
          <div class="stat-label">趋势天数</div>
          <div class="stat-value">{{ overview.trend.length }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>热门页面 TOP10</template>
          <el-table :data="overview.topPages" size="small" border>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="path" label="页面" min-width="180" show-overflow-tooltip />
            <el-table-column prop="pv" label="PV" width="90" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>来源页面 TOP10</template>
          <el-table :data="overview.topReferers" size="small" border>
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="referer" label="来源" min-width="180" show-overflow-tooltip />
            <el-table-column prop="pv" label="PV" width="90" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>设备分布</template>
          <el-table :data="analytics.byDevice" size="small" border>
            <el-table-column prop="device" label="设备" min-width="100">
              <template #default="{ row }">{{ row.device || '未知' }}</template>
            </el-table-column>
            <el-table-column prop="pv" label="PV" width="90" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>页面类型分布</template>
          <el-table :data="analytics.byPageType" size="small" border>
            <el-table-column prop="pageType" label="类型" min-width="100">
              <template #default="{ row }">{{ row.pageType || '未知' }}</template>
            </el-table-column>
            <el-table-column prop="pv" label="PV" width="90" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>来源域名</template>
          <el-table :data="analytics.refererDomain" size="small" border>
            <el-table-column prop="domain" label="域名" min-width="120" show-overflow-tooltip />
            <el-table-column prop="pv" label="PV" width="90" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 访问日志 -->
    <el-card shadow="never" style="margin-top: 16px">
      <template #header>
        <div class="log-header">
          <span>访问日志</span>
          <div class="log-actions">
            <el-input v-model="visitQuery.path" placeholder="路径关键字" clearable style="width: 180px" @keyup.enter="searchVisits" />
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 260px"
            />
            <el-button type="primary" @click="searchVisits">查询</el-button>
            <el-button type="danger" plain @click="handleClear">清理90天前日志</el-button>
          </div>
        </div>
      </template>
      <el-table :data="visits" border stripe size="small">
        <el-table-column prop="path" label="路径" min-width="180" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="140" />
        <el-table-column prop="device" label="设备" width="90">
          <template #default="{ row }">{{ row.device || '-' }}</template>
        </el-table-column>
        <el-table-column prop="browser" label="浏览器" width="110">
          <template #default="{ row }">{{ row.browser || '-' }}</template>
        </el-table-column>
        <el-table-column prop="referer" label="来源" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.referer || '直接访问' }}</template>
        </el-table-column>
        <el-table-column label="访问时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="visitQuery.page"
        v-model:page-size="visitQuery.pageSize"
        :page-sizes="[10, 20, 50]"
        :total="visitTotal"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @current-change="loadVisits"
        @size-change="searchVisits"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { siteApi } from '@/api/site'

interface Overview {
  total: { pv: number; uv: number; ipCount: number }
  today: { pv: number; uv: number }
  trend: Array<{ date: string; pv: number; uv: number }>
  topPages: Array<{ path: string; pv: number }>
  topReferers: Array<{ referer: string; pv: number }>
}

interface Analytics {
  byDevice: Array<{ device: string | null; pv: number }>
  byPageType: Array<{ pageType: string | null; pv: number }>
  byReferer: Array<{ referer: string; pv: number }>
  refererDomain: Array<{ domain: string; pv: number }>
}

const loading = ref(false)

const overview = reactive<Overview>({
  total: { pv: 0, uv: 0, ipCount: 0 },
  today: { pv: 0, uv: 0 },
  trend: [],
  topPages: [],
  topReferers: []
})

const analytics = reactive<Analytics>({
  byDevice: [],
  byPageType: [],
  byReferer: [],
  refererDomain: []
})

const loadOverview = async () => {
  const res = await siteApi.getStatsOverview()
  const data = res.data as Overview | undefined
  if (data) {
    overview.total = data.total || { pv: 0, uv: 0, ipCount: 0 }
    overview.today = data.today || { pv: 0, uv: 0 }
    overview.trend = data.trend || []
    overview.topPages = data.topPages || []
    overview.topReferers = data.topReferers || []
  }
}

const loadAnalytics = async () => {
  const res = await siteApi.getAnalytics()
  const data = res.data as Analytics | undefined
  if (data) {
    analytics.byDevice = data.byDevice || []
    analytics.byPageType = data.byPageType || []
    analytics.byReferer = data.byReferer || []
    analytics.refererDomain = data.refererDomain || []
  }
}

const visits = ref<any[]>([])
const visitTotal = ref(0)
const dateRange = ref<[string, string] | null>(null)

const visitQuery = reactive({
  path: '',
  page: 1,
  pageSize: 20
})

const loadVisits = async () => {
  const res = await siteApi.getVisits({
    path: visitQuery.path || undefined,
    startDate: dateRange.value?.[0] || undefined,
    endDate: dateRange.value?.[1] || undefined,
    page: visitQuery.page,
    pageSize: visitQuery.pageSize
  })
  const data = res.data
  visits.value = data?.list || []
  visitTotal.value = data?.total || 0
}

const searchVisits = () => {
  visitQuery.page = 1
  loadVisits()
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm('确定清理 90 天前的访问日志吗？此操作不可恢复。', '清理确认', { type: 'warning' })
  } catch {
    return
  }
  await siteApi.clearStats(90)
  ElMessage.success('清理完成')
  loadOverview()
  loadVisits()
}

const load = async () => {
  loading.value = true
  try {
    await Promise.all([loadOverview(), loadAnalytics(), loadVisits()])
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const formatTime = (val?: string) => {
  if (!val) return '-'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(load)
</script>

<style scoped lang="scss">
.site-tab {
  padding: 8px 4px;
}

.stat-card {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  text-align: center;
  background: #fafbff;
}

.stat-label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

.stat-value {
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.log-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
