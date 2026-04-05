<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-cards">
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card" style="--accent: #409eff">
          <div class="stat-icon">
            <el-icon :size="26"><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalCustomers?.total || 0 }}</div>
            <div class="stat-label">总客户数</div>
            <div class="stat-tags">
              <span class="tag-private">私有 {{ stats.totalCustomers?.private || 0 }}</span>
              <span class="tag-tenant">租户 {{ stats.totalCustomers?.tenant || 0 }}</span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card" style="--accent: #67c23a">
          <div class="stat-icon">
            <el-icon :size="26"><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.monthlyNew?.total || 0 }}</div>
            <div class="stat-label">本月新增</div>
            <div class="stat-tags">
              <span class="tag-private">私有 {{ stats.monthlyNew?.private || 0 }}</span>
              <span class="tag-tenant">租户 {{ stats.monthlyNew?.tenant || 0 }}</span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card" style="--accent: #e6a23c">
          <div class="stat-icon">
            <el-icon :size="26"><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activeCustomers?.total || 0 }}</div>
            <div class="stat-label">活跃客户</div>
            <div class="stat-tags">
              <span class="tag-private">私有 {{ stats.activeCustomers?.private || 0 }}</span>
              <span class="tag-tenant">租户 {{ stats.activeCustomers?.tenant || 0 }}</span>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card" style="--accent: #909399">
          <div class="stat-icon">
            <el-icon :size="26"><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.silentCustomers?.total || 0 }}</div>
            <div class="stat-label">沉默客户</div>
            <div class="stat-tags">
              <span class="tag-private">私有 {{ stats.silentCustomers?.private || 0 }}</span>
              <span class="tag-tenant">租户 {{ stats.silentCustomers?.tenant || 0 }}</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-section">
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="title">授权类型分布</span>
              <el-radio-group v-model="chartPeriod" size="small" @change="fetchLicenseTypeStats">
                <el-radio-button value="month">本月</el-radio-button>
                <el-radio-button value="lastMonth">上月</el-radio-button>
                <el-radio-button value="all">全部</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="pieChartRef" class="pie-chart-container"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="title">趋势分析</span>
              <el-radio-group v-model="trendPeriod" size="small" @change="fetchTrend">
                <el-radio-button value="month">本月</el-radio-button>
                <el-radio-button value="lastMonth">上月</el-radio-button>
                <el-radio-button value="all">全部</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="trend-chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 日常操作 + 最近活动 -->
    <el-row :gutter="20" class="bottom-section">
      <el-col :xs="24" :lg="8">
        <el-card class="quick-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="title">日常操作</span>
              <el-button type="primary" link size="small" @click="showQuickSettings = true">
                <el-icon><Setting /></el-icon>设置
              </el-button>
            </div>
          </template>
          <div class="quick-actions">
            <div
              v-for="item in visibleQuickActions"
              :key="item.key"
              class="quick-item"
              @click="router.push(item.path)"
            >
              <div class="quick-icon" :style="{ background: item.color }">
                <el-icon :size="20"><component :is="item.icon" /></el-icon>
              </div>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="16">
        <el-card class="activity-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="title">最近动态</span>
              <div class="header-actions">
                <el-button type="primary" link size="small" @click="fetchActivities">刷新</el-button>
                <el-button type="primary" link size="small" @click="router.push('/activities')">查看更多</el-button>
              </div>
            </div>
          </template>
          <div v-if="activities.length > 0" class="activity-timeline">
            <div v-for="item in activities" :key="item.id" class="activity-item">
              <div class="activity-dot" :style="{ background: item.color || '#409eff' }"></div>
              <div class="activity-content">
                <span class="activity-title">{{ item.title }}</span>
                <span class="activity-time">{{ formatDate(item.time) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无动态" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近日志 -->
    <el-card class="log-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">最近验证日志</span>
          <div class="log-header-right" v-if="recentLogs.length > 0">
            <el-button type="primary" link size="small" @click="router.push('/settings/operation-logs')">查看全部</el-button>
            <span class="log-total">共 {{ recentLogs.length }} 条</span>
          </div>
        </div>
      </template>
      <el-table :data="pagedLogs" stripe style="width: 100%">
        <el-table-column prop="customerType" label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.customerType === 'tenant'" type="warning" size="small" effect="plain">租户</el-tag>
            <el-tag v-else type="primary" size="small" effect="plain">私有</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户名称" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.customerName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="licenseKey" label="授权码" width="180">
          <template #default="{ row }">
            <el-tooltip :content="row.licenseKey" placement="top">
              <span class="license-key">{{ row.licenseKey ? row.licenseKey.slice(0, 16) + '...' : '-' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="80">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="result" label="结果" width="80">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="message" label="消息" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
      <div v-if="recentLogs.length === 0" class="empty-state">
        <el-empty description="暂无验证日志" />
      </div>
      <div v-else class="log-pagination">
        <el-pagination
          v-model:current-page="logPage"
          :page-size="logPageSize"
          :total="recentLogs.length"
          :pager-count="5"
          layout="prev, pager, next"
          small
          background
        />
      </div>
    </el-card>

    <!-- 日常操作设置对话框 -->
    <el-dialog v-model="showQuickSettings" title="自定义日常操作" width="480px" :close-on-click-modal="false">
      <p style="color: #909399; font-size: 13px; margin-bottom: 16px;">选择要在仪表盘显示的快捷操作项（最多8个）</p>
      <el-checkbox-group v-model="selectedQuickKeys">
        <div class="quick-settings-grid">
          <div v-for="item in allQuickActions" :key="item.key" class="quick-settings-item">
            <el-checkbox :label="item.key" :disabled="!selectedQuickKeys.includes(item.key) && selectedQuickKeys.length >= 8">
              <div class="quick-settings-label">
                <div class="quick-settings-icon" :style="{ background: item.color }">
                  <el-icon :size="14"><component :is="item.icon" /></el-icon>
                </div>
                <span>{{ item.label }}</span>
              </div>
            </el-checkbox>
          </div>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="resetQuickActions">恢复默认</el-button>
        <el-button type="primary" @click="saveQuickActions">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import * as echarts from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  Key, CircleCheck, Box, TrendCharts,
  Document, Warning, Upload, OfficeBuilding, Setting,
  User, Wallet, Connection, Menu as MenuIcon, GoodsFilled, DataAnalysis
} from '@element-plus/icons-vue'

echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const router = useRouter()

interface SubStat {
  total: number
  private: number
  tenant: number
}

interface DashboardStats {
  totalCustomers?: SubStat
  monthlyNew?: SubStat
  activeCustomers?: SubStat
  silentCustomers?: SubStat
}

const stats = ref<DashboardStats>({})
const recentLogs = ref<any[]>([])
const logPage = ref(1)
const logPageSize = 10
const pagedLogs = computed(() => {
  const start = (logPage.value - 1) * logPageSize
  return recentLogs.value.slice(start, start + logPageSize)
})

const chartPeriod = ref('month')
const trendPeriod = ref('month')
const growthData = ref({ licenses: 0, tenants: 0 })
const trendChartRef = ref<HTMLDivElement>()
const pieChartRef = ref<HTMLDivElement>()
let trendChartInstance: echarts.ECharts | null = null
let pieChartInstance: echarts.ECharts | null = null
const trendRawData = ref<any[]>([])
const activities = ref<any[]>([])
const licenseTypeData = ref<any>({ private: {}, tenant: {} })

// 日常操作设置
const showQuickSettings = ref(false)
const QUICK_ACTIONS_STORAGE_KEY = 'dashboard_quick_actions'
const DEFAULT_QUICK_KEYS = ['private-customers', 'tenant-customers', 'version-upload', 'payment-reports', 'modules', 'admins']

// 所有可选的快捷操作
const allQuickActions = [
  { key: 'private-customers', label: '私有客户', path: '/private-customers/list', icon: markRaw(Key), color: '#409eff' },
  { key: 'tenant-customers', label: '租户客户', path: '/tenant-customers/list', icon: markRaw(CircleCheck), color: '#67c23a' },
  { key: 'version-upload', label: '发布版本', path: '/versions/upload', icon: markRaw(Upload), color: '#9c27b0' },
  { key: 'payment-reports', label: '支付报表', path: '/payment/reports', icon: markRaw(Document), color: '#e6a23c' },
  { key: 'payment-list', label: '支付列表', path: '/payment/list', icon: markRaw(Wallet), color: '#ff9800' },
  { key: 'payment-config', label: '支付配置', path: '/payment/config', icon: markRaw(Setting), color: '#795548' },
  { key: 'modules', label: '模块管理', path: '/modules/list', icon: markRaw(MenuIcon), color: '#00bcd4' },
  { key: 'admins', label: '管理员', path: '/settings/admins', icon: markRaw(User), color: '#607d8b' },
  { key: 'versions', label: '版本列表', path: '/versions/list', icon: markRaw(Box), color: '#909399' },
  { key: 'customer-all', label: '所有客户', path: '/customer-management/all', icon: markRaw(User), color: '#3f51b5' },
  { key: 'renewal', label: '续费提醒', path: '/customer-management/renewal-reminders', icon: markRaw(Warning), color: '#f44336' },
  { key: 'packages', label: '套餐管理', path: '/package-management/packages', icon: markRaw(GoodsFilled), color: '#4caf50' },
  { key: 'api-list', label: '接口管理', path: '/api/list', icon: markRaw(Connection), color: '#673ab7' },
  { key: 'operation-logs', label: '操作日志', path: '/settings/operation-logs', icon: markRaw(DataAnalysis), color: '#ff5722' },
  { key: 'basic-settings', label: '基础配置', path: '/settings/basic', icon: markRaw(Setting), color: '#9e9e9e' }
]

const selectedQuickKeys = ref<string[]>([...DEFAULT_QUICK_KEYS])

// Load from localStorage
const loadQuickActions = () => {
  try {
    const stored = localStorage.getItem(QUICK_ACTIONS_STORAGE_KEY)
    if (stored) {
      const keys = JSON.parse(stored) as string[]
      if (Array.isArray(keys) && keys.length > 0) {
        selectedQuickKeys.value = keys
      }
    }
  } catch { /* use default */ }
}

const visibleQuickActions = computed(() => {
  return selectedQuickKeys.value
    .map(key => allQuickActions.find(a => a.key === key))
    .filter(Boolean) as typeof allQuickActions
})

const saveQuickActions = () => {
  localStorage.setItem(QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(selectedQuickKeys.value))
  showQuickSettings.value = false
}

const resetQuickActions = () => {
  selectedQuickKeys.value = [...DEFAULT_QUICK_KEYS]
}


const fetchStats = async () => {
  try {
    const res = await adminApi.getDashboardStats()
    stats.value = res.data
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const fetchLicenseTypeStats = async () => {
  try {
    const res = await adminApi.getLicenseTypeStats(chartPeriod.value)
    if (res.data) {
      licenseTypeData.value = res.data
      await nextTick()
      renderPieChart()
    }
  } catch (error) {
    console.error('获取授权类型统计失败', error)
  }
}

const renderPieChart = () => {
  if (!pieChartRef.value) return
  if (!pieChartInstance) {
    pieChartInstance = echarts.init(pieChartRef.value)
  }

  const priv = licenseTypeData.value?.private || {}
  const tenant = licenseTypeData.value?.tenant || {}

  // 构建饼图数据：私有 + 租户
  const pieData = [
    { name: '私有-试用', value: priv.trial || 0 },
    { name: '私有-月付', value: priv.monthly || 0 },
    { name: '私有-年付', value: priv.annual || 0 },
    { name: '私有-买断', value: priv.perpetual || 0 },
    { name: '租户-试用', value: tenant.trial || 0 },
    { name: '租户-月付', value: tenant.monthly || 0 },
    { name: '租户-年付', value: tenant.yearly || 0 },
    { name: '租户-买断', value: tenant.once || 0 },
    { name: '租户-其他', value: tenant.other || 0 }
  ].filter(item => item.value > 0)

  const total = pieData.reduce((sum, item) => sum + item.value, 0)

  // 颜色：私有系列用蓝色调，租户系列用绿色调
  const colorMap: Record<string, string> = {
    '私有-试用': '#a0cfff',
    '私有-月付': '#409eff',
    '私有-年付': '#337ecc',
    '私有-买断': '#1d5ba8',
    '租户-试用': '#b3e19d',
    '租户-月付': '#67c23a',
    '租户-年付': '#529b2e',
    '租户-买断': '#3e7c22',
    '租户-其他': '#c0c4cc'
  }

  pieChartInstance.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: ${params.value} (${params.percent}%)`
      }
    },
    legend: {
      orient: 'vertical',
      right: '2%',
      top: 'center',
      textStyle: { fontSize: 12, color: '#606266' },
      formatter: (name: string) => {
        const item = pieData.find(d => d.name === name)
        const percent = total > 0 ? Math.round(((item?.value || 0) / total) * 100) : 0
        return `${name}  ${item?.value || 0}  ${percent}%`
      }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['30%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        position: 'center',
        formatter: () => total > 0 ? `{total|${total}}\n{label|总计}` : '{label|暂无数据}',
        rich: {
          total: { fontSize: 22, fontWeight: 'bold', color: '#303133', lineHeight: 32 },
          label: { fontSize: 12, color: '#909399', lineHeight: 18 }
        }
      },
      emphasis: {
        label: { show: true, fontSize: 13 },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' }
      },
      data: pieData.length > 0
        ? pieData.map(item => ({ ...item, itemStyle: { color: colorMap[item.name] || '#c0c4cc' } }))
        : [{ name: '暂无数据', value: 1, itemStyle: { color: '#e8e8e8' } }]
    }]
  }, true)
}

const fetchTrend = async () => {
  try {
    const res = await adminApi.getDashboardTrend(undefined, trendPeriod.value)
    if (res.data) {
      trendRawData.value = res.data.trend || []
      growthData.value = res.data.growth || { licenses: 0, tenants: 0 }
      await nextTick()
      renderTrendChart()
    }
  } catch (error) {
    console.error('获取趋势数据失败', error)
  }
}

const renderTrendChart = () => {
  if (!trendChartRef.value) return
  if (!trendChartInstance) {
    trendChartInstance = echarts.init(trendChartRef.value)
  }
  const data = trendRawData.value
  const dates = data.map((d: any) => d.date.slice(5)) // MM-DD
  const licensesValues = data.map((d: any) => d.licenses || 0)
  const tenantsValues = data.map((d: any) => d.tenants || 0)

  trendChartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['新增私有授权', '新增租户授权'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 12, color: '#909399' }
    },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, color: '#909399' }, axisLine: { lineStyle: { color: '#e4e7ed' } } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11, color: '#909399' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        name: '新增私有授权',
        type: 'line',
        data: licensesValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#409eff' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409eff40' },
          { offset: 1, color: '#409eff05' }
        ]) },
        itemStyle: { color: '#409eff' }
      },
      {
        name: '新增租户授权',
        type: 'line',
        data: tenantsValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: '#67c23a' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#67c23a40' },
          { offset: 1, color: '#67c23a05' }
        ]) },
        itemStyle: { color: '#67c23a' }
      }
    ]
  }, true)
}

const fetchRecentLogs = async () => {
  try {
    const res = await adminApi.getRecentLogs()
    recentLogs.value = res.data || []
  } catch (error) {
    console.error('获取日志失败', error)
  }
}

const fetchActivities = async () => {
  try {
    const res = await adminApi.getDashboardActivities(6)
    activities.value = res.data || []
  } catch (error) {
    console.error('获取活动动态失败', error)
  }
}

const handleResize = () => {
  trendChartInstance?.resize()
  pieChartInstance?.resize()
}

const getActionLabel = (action: string) => {
  const map: Record<string, string> = {
    verify: '验证', activate: '激活', renew: '续期', revoke: '撤销', expire: '过期',
    generate: '生成', suspend: '暂停', resume: '恢复', register: '注册',
    create: '创建', update: '更新', delete: '删除', login: '登录',
    upgrade: '升级', reset_password: '重置密码', unlock_admin: '解锁管理员',
    enable: '启用', disable: '禁用', publish: '发布', upload: '上传',
    refund: '退款', close: '关闭', send: '发送', test: '测试'
  }
  return map[action] || action
}

const getActionType = (action: string) => {
  const map: Record<string, string> = {
    verify: '', activate: 'success', renew: 'warning', revoke: 'danger', expire: 'info',
    generate: 'success', suspend: 'danger', resume: 'success', register: 'success',
    create: 'success', update: 'warning', delete: 'danger', login: '',
    upgrade: 'warning', reset_password: 'warning', unlock_admin: 'success',
    enable: 'success', disable: 'danger', publish: '', upload: '',
    refund: 'danger', close: 'info', send: '', test: 'info'
  }
  return map[action] || ''
}

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

onMounted(() => {
  loadQuickActions()
  fetchStats()
  fetchTrend()
  fetchLicenseTypeStats()
  fetchRecentLogs()
  fetchActivities()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
  pieChartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.dashboard {
  min-height: 100%;
}

.stat-cards {
  margin-bottom: 20px;

  .el-col {
    margin-bottom: 20px;
  }
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, white) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }

  .stat-content {
    flex: 1;
    min-width: 0;

    .stat-value {
      font-size: 26px;
      font-weight: 700;
      color: #303133;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 13px;
      color: #909399;
      margin-top: 2px;
    }

    .stat-tags {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;

      .tag-private, .tag-tenant {
        font-size: 11px;
        padding: 1px 8px;
        border-radius: 10px;
        white-space: nowrap;
      }

      .tag-private {
        background: #ecf5ff;
        color: #409eff;
      }

      .tag-tenant {
        background: #f0f9eb;
        color: #67c23a;
      }
    }
  }
}

.chart-section {
  margin-bottom: 20px;

  .el-col {
    margin-bottom: 20px;
  }
}

.chart-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.pie-chart-container {
  height: 300px;
  width: 100%;
}

.trend-chart {
  height: 300px;
  width: 100%;
}

.log-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 0;
  }
}

.license-key {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #606266;
}

.empty-state {
  padding: 40px 0;
}

.log-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}

.log-total {
  font-size: 13px;
  color: #909399;
  font-weight: normal;
}

.log-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bottom-section {
  margin-bottom: 20px;

  .el-col {
    margin-bottom: 20px;
  }
}

.quick-card {
  border-radius: 12px;
  border: none;
  height: 100%;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #f5f7fa;
    transform: translateY(-2px);
  }

  .quick-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  span {
    font-size: 13px;
    color: #606266;
  }
}

.activity-card {
  border-radius: 12px;
  border: none;
  height: 100%;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.activity-timeline {
  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f8f8f8;

    &:last-child {
      border-bottom: none;
    }
  }

  .activity-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
  }

  .activity-title {
    font-size: 13px;
    color: #303133;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-time {
    font-size: 12px;
    color: #c0c4cc;
    margin-left: 12px;
    white-space: nowrap;
  }
}

/* Quick Actions Settings Dialog */
.quick-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.quick-settings-item {
  padding: 4px 0;
}

.quick-settings-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-settings-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

/* ====== 响应式适配 ====== */
@media screen and (max-width: 768px) {
  .stat-card {
    padding: 14px;

    .stat-icon {
      width: 40px;
      height: 40px;
    }

    .stat-content .stat-value {
      font-size: 20px;
    }

    .stat-content .stat-tags {
      gap: 4px;
    }
  }

  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .pie-chart-container {
    height: 260px;
  }

  .trend-chart {
    height: 260px;
  }

  .quick-settings-grid {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 480px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .quick-item {
    padding: 12px 4px;

    .quick-icon {
      width: 36px;
      height: 36px;
    }
  }

  .stat-card .stat-content .stat-tags {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
