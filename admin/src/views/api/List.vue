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
      <div class="chart-placeholder">
        <el-icon :size="48" color="#dcdfe6"><TrendCharts /></el-icon>
        <p>图表区域 - 可集成 ECharts</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, CircleCheck, Timer, Warning, TrendCharts } from '@element-plus/icons-vue'

const loading = ref(false)
const filterType = ref('')

const stats = reactive({ totalCalls: 1256800, successRate: 99.2, avgTime: 128, errorCount: 156 })

const tableData = ref([
  { id: 1, name: '快递100物流查询', type: '物流查询', provider: '快递100', callCount: 85600, successRate: 99.5, avgTime: 120, status: 'normal', lastCall: '2024-12-02 15:30:00' },
  { id: 2, name: '阿里云短信', type: '短信服务', provider: '阿里云', callCount: 32500, successRate: 99.8, avgTime: 85, status: 'normal', lastCall: '2024-12-02 15:28:00' },
  { id: 3, name: '微信支付', type: '支付接口', provider: '微信', callCount: 12800, successRate: 99.9, avgTime: 150, status: 'normal', lastCall: '2024-12-02 15:25:00' },
  { id: 4, name: '阿里云外呼', type: '外呼系统', provider: '阿里云', callCount: 8500, successRate: 98.5, avgTime: 200, status: 'normal', lastCall: '2024-12-02 15:20:00' }
])

const handleView = (row: any) => ElMessage.info(`查看接口 ${row.name}`)
const handleTest = (row: any) => { ElMessage.success(`测试接口 ${row.name} 成功`) }
const fetchData = () => { loading.value = true; setTimeout(() => { loading.value = false }, 500) }
onMounted(() => fetchData())
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
.chart-placeholder { height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f9f9f9; border-radius: 8px; color: #909399; }
</style>
