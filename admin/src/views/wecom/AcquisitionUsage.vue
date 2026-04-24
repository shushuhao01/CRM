<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>获客助手用量</span>
          <div style="display: flex; gap: 8px">
            <el-input v-model="searchKeyword" placeholder="搜索租户" clearable size="small" style="width: 180px" @keyup.enter="fetchData" />
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" size="small" style="width: 240px" @change="fetchData" />
            <el-button type="primary" size="small" @click="fetchData" :loading="loading">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- 统计卡片 -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" style="color: #409eff">{{ stats.monthAdded?.toLocaleString() || 0 }}</div>
            <div class="stat-label">本月总添加</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" style="color: #67c23a">{{ stats.activeLinks || 0 }}</div>
            <div class="stat-label">活跃链接</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" style="color: #e6a23c">{{ stats.activeTenants || 0 }}</div>
            <div class="stat-label">活跃租户</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" style="color: #909399">{{ stats.avgConversion || '0%' }}</div>
            <div class="stat-label">平均转化率</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 趋势图 -->
      <el-card shadow="never" style="margin-bottom: 20px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span style="font-size: 14px; font-weight: 600">获客趋势</span>
            <el-radio-group v-model="trendPeriod" size="small" @change="fetchData">
              <el-radio-button label="7d">7天</el-radio-button>
              <el-radio-button label="30d">30天</el-radio-button>
            </el-radio-group>
          </div>
        </template>
        <div v-if="trendData.length === 0" style="height: 160px; display: flex; align-items: center; justify-content: center; color: #c0c4cc">
          暂无趋势数据
        </div>
        <div v-else style="height: 160px">
          <svg viewBox="0 0 800 150" width="100%" height="150" style="overflow: visible">
            <defs>
              <linearGradient id="acqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#67c23a" stop-opacity="0.2" />
                <stop offset="100%" stop-color="#67c23a" stop-opacity="0.02" />
              </linearGradient>
            </defs>
            <line v-for="i in 4" :key="'g'+i" x1="40" :y1="5 + (i - 1) * 40" x2="790" :y2="5 + (i - 1) * 40" stroke="#f0f0f0" stroke-width="1" />
            <polygon :points="trendAreaPts" fill="url(#acqGrad)" />
            <polyline :points="trendLinePts" fill="none" stroke="#67c23a" stroke-width="2" stroke-linejoin="round" />
            <circle v-for="(p, i) in trendPts" :key="'d'+i" :cx="p.x" :cy="p.y" r="3" fill="#67c23a" />
            <text v-for="(p, i) in trendXLabels" :key="'xl'+i" :x="p.x" y="148" text-anchor="middle" font-size="10" fill="#909399">{{ p.label }}</text>
          </svg>
        </div>
      </el-card>

      <!-- 租户用量列表 -->
      <el-table :data="pagedUsageList" v-loading="loading" stripe>
        <el-table-column label="排名" width="55" align="center">
          <template #default="{ $index }">
            <span :style="{ fontWeight: ($index + (page-1)*pageSize) < 3 ? '700' : 'normal', color: ($index + (page-1)*pageSize) < 3 ? '#f56c6c' : '#303133' }">{{ $index + 1 + (page-1)*pageSize }}</span>
          </template>
        </el-table-column>
        <el-table-column label="租户" min-width="130">
          <template #default="{ row }">{{ row.tenantName || row.tenantId }}</template>
        </el-table-column>
        <el-table-column label="链接数 / 配额" min-width="160">
          <template #default="{ row }">
            <div v-if="row.quota === -1 || row.quota === 0">
              <span style="font-weight:600">{{ row.linkCount }}</span>
              <span style="font-size:11px;color:#909399;margin-left:4px">/ 无限制</span>
            </div>
            <div v-else>
              <div style="display:flex;align-items:center;gap:6px">
                <span :style="{ fontWeight:600, color: row.linkCount >= row.quota ? '#f56c6c' : '#303133' }">{{ row.linkCount }}/{{ row.quota }}</span>
                <el-tag v-if="row.linkCount >= row.quota" type="danger" size="small" effect="dark">超限</el-tag>
                <el-tag v-else-if="row.quota > 0 && row.linkCount / row.quota >= 0.8" type="warning" size="small">即满</el-tag>
              </div>
              <el-progress
                :percentage="Math.min(Math.round(row.linkCount / row.quota * 100), 100)"
                :stroke-width="5"
                :show-text="false"
                :color="row.linkCount >= row.quota ? '#f56c6c' : (row.linkCount / row.quota >= 0.8 ? '#e6a23c' : '#67c23a')"
                style="margin-top:4px"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="本月添加" width="100" align="right" sortable sort-by="monthAdded">
          <template #default="{ row }">{{ row.monthAdded?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="本月流失" width="100" align="right">
          <template #default="{ row }">{{ row.monthLost?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="净增长" width="100" align="right" sortable sort-by="netGrowth">
          <template #default="{ row }">
            <span :style="{ color: row.netGrowth > 0 ? '#67c23a' : row.netGrowth < 0 ? '#f56c6c' : '#909399' }">
              {{ row.netGrowth > 0 ? '+' : '' }}{{ row.netGrowth?.toLocaleString() }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="转化率" width="90" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.conversionRate > 20 ? '#67c23a' : row.conversionRate > 10 ? '#e6a23c' : '#f56c6c' }">{{ row.conversionRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="openQuotaDialog(row)">配额</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="() => { page = 1 }"
          @current-change="() => {}"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer v-model="showDetailDrawer" :title="`获客详情: ${detailTarget?.tenantName || ''}`" size="500px">
      <template v-if="detailTarget">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
          <el-descriptions-item label="租户">{{ detailTarget.tenantName }}</el-descriptions-item>
          <el-descriptions-item label="链接数">{{ detailTarget.linkCount }}</el-descriptions-item>
          <el-descriptions-item label="本月添加">{{ detailTarget.monthAdded }}</el-descriptions-item>
          <el-descriptions-item label="本月流失">{{ detailTarget.monthLost }}</el-descriptions-item>
          <el-descriptions-item label="净增长">
            <span :style="{ color: detailTarget.netGrowth > 0 ? '#67c23a' : '#f56c6c' }">{{ detailTarget.netGrowth }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="转化率">{{ detailTarget.conversionRate }}%</el-descriptions-item>
        </el-descriptions>
        <el-alert type="info" :closable="false" description="详细获客链接维度数据，请在CRM端企微获客助手模块查看" show-icon />
      </template>
    </el-drawer>

    <!-- 配额设置弹窗 -->
    <el-dialog v-model="showQuotaDialog" :title="`获客助手配额: ${quotaTarget?.tenantName || ''}`" width="400px" destroy-on-close>
      <el-form label-width="120px" style="margin-top:8px">
        <el-form-item label="当前链接数">
          <span style="font-weight:600;color:#409eff">{{ quotaTarget?.linkCount || 0 }} 条</span>
        </el-form-item>
        <el-form-item label="链接数上限">
          <div style="display:flex;align-items:center;gap:8px">
            <el-input-number v-model="quotaFormValue" :min="-1" :max="9999" :step="10" style="width:150px" controls-position="right" />
            <span style="font-size:12px;color:#909399">-1 = 无限制</span>
          </div>
          <div style="margin-top:6px;font-size:12px;color:#86909c;line-height:1.6">
            设置该租户可创建的获客助手链接数上限。<br>
            达到上限后，租户将无法继续创建新的获客链接。
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showQuotaDialog = false">取消</el-button>
        <el-button type="primary" @click="saveQuota" :loading="savingQuota">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAcquisitionUsage, saveConfigQuota } from '@/api/wecomManagement'

const loading = ref(false)
const usageList = ref<any[]>([])
const searchKeyword = ref('')
const dateRange = ref<string[] | null>(null)
const trendPeriod = ref('30d')
const stats = ref<any>({ monthAdded: 0, activeLinks: 0, activeTenants: 0, avgConversion: '0%' })
const showDetailDrawer = ref(false)
const detailTarget = ref<any>(null)
const page = ref(1)
const pageSize = ref(10)
const showQuotaDialog = ref(false)
const quotaTarget = ref<any>(null)
const quotaFormValue = ref(-1)
const savingQuota = ref(false)


// Trend chart data (derived from usageList sorted by monthAdded)
const trendData = computed(() => usageList.value.filter((r: any) => r.monthAdded > 0).slice(0, 15))

const trendPts = computed(() => {
  const data = trendData.value.map((r: any) => r.monthAdded || 0)
  if (!data.length) return []
  const maxVal = Math.max(...data, 1)
  return data.map((v: number, i: number) => ({
    x: 40 + (i / Math.max(data.length - 1, 1)) * 750,
    y: 125 - (v / maxVal) * 115
  }))
})
const trendLinePts = computed(() => trendPts.value.map((p: any) => `${p.x},${p.y}`).join(' '))
const trendAreaPts = computed(() => {
  const pts = trendPts.value
  if (!pts.length) return ''
  return pts.map((p: any) => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length - 1].x},125 ${pts[0].x},125`
})
const trendXLabels = computed(() => {
  return trendData.value.map((r: any, i: number) => ({
    x: 40 + (i / Math.max(trendData.value.length - 1, 1)) * 750,
    label: (r.tenantName || '').substring(0, 4)
  }))
})

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      keyword: searchKeyword.value || undefined,
      period: trendPeriod.value
    }
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res: any = await getAcquisitionUsage(params)
    const list = Array.isArray(res) ? res : (res?.data || [])
    usageList.value = list.sort((a: any, b: any) => (b.monthAdded || 0) - (a.monthAdded || 0))
    stats.value = res?.stats || {
      monthAdded: list.reduce((s: number, r: any) => s + (r.monthAdded || 0), 0),
      activeLinks: list.reduce((s: number, r: any) => s + (r.linkCount || 0), 0),
      activeTenants: list.filter((r: any) => r.monthAdded > 0).length,
      avgConversion: list.length ? Math.round(list.reduce((s: number, r: any) => s + (r.conversionRate || 0), 0) / list.length) + '%' : '0%'
    }
  } catch {
    usageList.value = []
    ElMessage.error('获客用量数据加载失败，请稍后重试')
  }
  loading.value = false
}

const viewDetail = (row: any) => {
  detailTarget.value = row
  showDetailDrawer.value = true
}

const openQuotaDialog = (row: any) => {
  quotaTarget.value = row
  quotaFormValue.value = row.quota ?? -1
  showQuotaDialog.value = true
}

const saveQuota = async () => {
  if (!quotaTarget.value) return
  savingQuota.value = true
  try {
    await saveConfigQuota(quotaTarget.value.tenantId, { acquisitionLinkQuota: quotaFormValue.value })
    ElMessage.success('获客助手配额已保存')
    showQuotaDialog.value = false
    // 更新本地列表中的 quota 值（避免重新请求）
    const item = usageList.value.find((r: any) => r.tenantId === quotaTarget.value.tenantId)
    if (item) item.quota = quotaFormValue.value
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
  savingQuota.value = false
}

const pagedUsageList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return usageList.value.slice(start, end)
})
const total = computed(() => usageList.value.length)

onMounted(fetchData)
</script>

<style scoped>
.page-container { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 600; }
.stat-card { text-align: center; }
.stat-num { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
</style>

