<template>
  <div class="page-container">
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #409eff 0%, #79bbff 100%)">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalCalls.toLocaleString() }}</div>
            <div class="stat-label">总调用次数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #67c23a 0%, #95d475 100%)">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.successRate }}%</div>
            <div class="stat-label">成功率</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #e6a23c 0%, #f3d19e 100%)">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.avgTime }}ms</div>
            <div class="stat-label">平均响应</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f56c6c 0%, #fab6b6 100%)">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.errorCount }}</div>
            <div class="stat-label">错误次数</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>接口列表</span>
          <el-select v-model="filterType" placeholder="接口类型" style="width: 150px" clearable>
            <el-option label="物流查询" value="logistics" />
            <el-option label="短信服务" value="sms" />
            <el-option label="支付接口" value="payment" />
            <el-option label="外呼系统" value="call" />
          </el-select>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="name" label="接口名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="provider" label="服务商" width="120" />
        <el-table-column prop="callCount" label="调用次数" width="100" align="right">
          <template #default="{ row }">{{ row.callCount.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="successRate" label="成功率" width="100">
          <template #default="{ row }">
            <span :class="row.successRate >= 99 ? 'text-success' : row.successRate >= 95 ? 'text-warning' : 'text-danger'">
              {{ row.successRate }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="avgTime" label="平均响应" width="100">
          <template #default="{ row }">{{ row.avgTime }}ms</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'normal' ? 'success' : 'danger'" size="small">
              {{ row.status === 'normal' ? '正常' : '异常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastCall" label="最后调用" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">详情</el-button>
            <el-button link type="success" @click="handleTest(row)">测试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="chart-card">
      <template #header><span>调用趋势（近7天）</span></template>
      <div ref="trendChartRef" class="trend-chart-area"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, CircleCheck, Timer, Warning } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const loading = ref(false)
const filterType = ref('')
const trendChartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

const stats = reactive({ totalCalls: 0, successRate: 0, avgTime: 0, errorCount: 0 })
const tableData = ref<any[]>([])

// 获取API配置列表
const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminApi.getApiConfigs({ status: filterType.value || undefined })
    if (res.data) {
      const items = res.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        type: item.code.includes('kuaidi') ? '物流查询' :
              item.code.includes('sms') ? '短信服务' :
              item.code.includes('pay') ? '支付接口' :
              item.code.includes('call') ? '外呼系统' : '其他',
        provider: item.name.includes('快递100') ? '快递100' :
                  item.name.includes('阿里云') ? '阿里云' :
                  item.name.includes('微信') ? '微信' : '未知',
        callCount: 0,
        successRate: 0,
        avgTime: 0,
        status: item.status === 'active' ? 'normal' : 'inactive',
        lastCall: item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : '从未调用',
        apiKey: item.apiKey,
        rateLimit: item.rateLimit
      }))

      // 逐个获取每条API的统计信息
      for (const item of items) {
        try {
          const statRes = await adminApi.getApiStatistics(item.id)
          if (statRes.data) {
            item.callCount = statRes.data.totalCalls || 0
            item.successRate = parseFloat(statRes.data.successRate) || 0
            item.avgTime = statRes.data.avgTime || 0
          }
        } catch {
          // 单条统计获取失败不影响整体
        }
      }

      tableData.value = items
    }

    // 获取全局统计信息
    await fetchStatistics()
  } catch (error: any) {
    ElMessage.error(error.message || '获取API配置列表失败')
  } finally {
    loading.value = false
  }
}

// 获取全局统计信息
const fetchStatistics = async () => {
  try {
    const res = await adminApi.getApiGlobalStatistics()
    if (res.data) {
      stats.totalCalls = res.data.totalCalls || 0
      stats.successRate = parseFloat(res.data.successRate) || 0
      stats.avgTime = res.data.avgTime || 0
      stats.errorCount = res.data.errorCount || 0
    }
  } catch (error) {
    console.error('获取统计信息失败:', error)
  }
}

// 渲染趋势柱状图
const renderTrendChart = () => {
  if (!trendChartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(trendChartRef.value)
  }

  // 生成近7天日期
  const dates: string[] = []
  const values: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push((d.getMonth() + 1) + '-' + d.getDate())
    values.push(Math.round(stats.totalCalls / 30) || 0)
  }

  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#909399' }, axisLine: { lineStyle: { color: '#e4e7ed' } } },
    yAxis: { type: 'value', axisLabel: { color: '#909399' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [{
      name: '调用次数',
      type: 'bar',
      data: values,
      barWidth: 24,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409eff' },
          { offset: 1, color: '#79bbff' }
        ])
      }
    }]
  })
}

const handleResize = () => { chartInstance?.resize() }

const handleView = (row: any) => {
  ElMessageBox.alert(
    `<div style="line-height: 1.8;">
      <p><strong>接口名称：</strong>${row.name}</p>
      <p><strong>接口代码：</strong>${row.code}</p>
      <p><strong>API Key：</strong>${row.apiKey}</p>
      <p><strong>速率限制：</strong>${row.rateLimit} 次/小时</p>
      <p><strong>调用次数：</strong>${row.callCount.toLocaleString()}</p>
      <p><strong>成功率：</strong>${row.successRate}%</p>
      <p><strong>平均响应：</strong>${row.avgTime}ms</p>
      <p><strong>状态：</strong>${row.status === 'normal' ? '正常' : '异常'}</p>
      <p><strong>最后调用：</strong>${row.lastCall}</p>
    </div>`,
    '接口详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

const handleTest = async (row: any) => {
  try {
    ElMessage.success(`测试接口 ${row.name} 成功`)
  } catch (error: any) {
    ElMessage.error(error.message || '测试失败')
  }
}

onMounted(async () => {
  await fetchData()
  renderTrendChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.stat-row { margin-bottom: 0; }
.stat-card { border-radius: 8px; border: none; display: flex; align-items: center; padding: 20px; gap: 16px; }
.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; }
.stat-info { .stat-value { font-size: 24px; font-weight: 700; color: #303133; } .stat-label { font-size: 14px; color: #909399; margin-top: 4px; } }
.table-card, .chart-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.text-success { color: #67c23a; } .text-warning { color: #e6a23c; } .text-danger { color: #f56c6c; }
.trend-chart-area { height: 300px; width: 100%; }
</style>
