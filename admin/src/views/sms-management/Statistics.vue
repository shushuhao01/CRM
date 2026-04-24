<template>
  <div class="sms-statistics">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2>统计总览</h2>
        <p class="header-desc">全平台短信用量统计与趋势分析</p>
      </div>
      <el-button @click="loadStatistics" :loading="loading">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <!-- 核心指标 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon total-icon">
              <el-icon :size="28"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalSent }}</div>
              <div class="stat-label">累计发送量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon today-icon">
              <el-icon :size="28"><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.todaySent }}</div>
              <div class="stat-label">今日发送</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon month-icon">
              <el-icon :size="28"><DataLine /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.monthSent }}</div>
              <div class="stat-label">本月发送</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon template-icon">
              <el-icon :size="28"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalTemplates }}</div>
              <div class="stat-label">模板总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细统计 -->
    <el-row :gutter="16">
      <!-- 模板状态分布 -->
      <el-col :span="12">
        <el-card class="detail-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">模板状态分布</span>
            </div>
          </template>
          <div class="stats-grid">
            <div class="stat-row">
              <span class="stat-row-label">预设模板</span>
              <span class="stat-row-value">{{ stats.presetTemplates }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-row-label">待审核</span>
              <el-tag type="warning" size="small">{{ stats.pendingCount }}</el-tag>
            </div>
            <div v-for="item in stats.templateStats" :key="item.status" class="stat-row">
              <span class="stat-row-label">{{ getStatusLabel(item.status) }}</span>
              <span class="stat-row-value">{{ item.count }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-row-label">发送记录总数</span>
              <span class="stat-row-value">{{ stats.totalRecords }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 近7天趋势 -->
      <el-col :span="12">
        <el-card class="detail-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">近7天发送趋势</span>
            </div>
          </template>
          <div class="trend-chart">
            <div v-if="stats.dailyStats.length > 0" class="bar-chart">
              <div v-for="day in stats.dailyStats" :key="day.date" class="bar-item">
                <div class="bar-value">{{ day.count }}</div>
                <div class="bar-fill" :style="{ height: getBarHeight(day.count) + '%' }"></div>
                <div class="bar-label">{{ formatDate(day.date) }}</div>
              </div>
            </div>
            <el-empty v-else description="暂无数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Refresh, ChatDotRound, Calendar, DataLine, Document } from '@element-plus/icons-vue'
import { smsManagementApi } from '@/api/smsManagement'

const loading = ref(false)

const stats = reactive({
  totalSent: 0,
  todaySent: 0,
  monthSent: 0,
  totalTemplates: 0,
  presetTemplates: 0,
  pendingCount: 0,
  totalRecords: 0,
  templateStats: [] as { status: string; count: number }[],
  dailyStats: [] as { date: string; count: number }[]
})

const statusLabelMap: Record<string, string> = {
  pending_admin: '待管理员审核',
  pending_vendor: '待服务商审核',
  active: '已激活',
  rejected: '已拒绝',
  withdrawn: '已撤销',
  pending: '待审核',
  approved: '已通过'
}
const getStatusLabel = (s: string) => statusLabelMap[s] || s

const getBarHeight = (count: number) => {
  const maxVal = Math.max(...stats.dailyStats.map(d => Number(d.count) || 0), 1)
  return Math.max((Number(count) / maxVal) * 100, 5)
}

const formatDate = (d: string) => {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const loadStatistics = async () => {
  loading.value = true
  try {
    const res = await smsManagementApi.getStatistics()
    if (res.data) {
      Object.assign(stats, res.data)
    }
  } catch (e) {
    console.error('加载统计数据失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadStatistics() })
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;

  h2 {
    margin: 0 0 4px 0;
    font-size: 20px;
    color: #303133;
  }

  .header-desc {
    margin: 0;
    font-size: 13px;
    color: #909399;
  }
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.total-icon {
    background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
    color: #fff;
  }

  &.today-icon {
    background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
    color: #fff;
  }

  &.month-icon {
    background: linear-gradient(135deg, #e6a23c 0%, #f5ba62 100%);
    color: #fff;
  }

  &.template-icon {
    background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%);
    color: #fff;
  }
}

.stat-info {
  .stat-number {
    font-size: 28px;
    font-weight: 700;
    color: #303133;
  }

  .stat-label {
    font-size: 13px;
    color: #909399;
  }
}

.detail-card {
  border-radius: 12px;
  min-height: 320px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.stats-grid {
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }
  }

  .stat-row-label {
    font-size: 14px;
    color: #606266;
  }

  .stat-row-value {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.trend-chart {
  height: 240px;
  display: flex;
  align-items: flex-end;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  width: 100%;
  height: 220px;
  padding-bottom: 30px;
  position: relative;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  height: 100%;
  justify-content: flex-end;
}

.bar-value {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.bar-fill {
  width: 36px;
  background: linear-gradient(180deg, #409eff 0%, #66b1ff 100%);
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  min-height: 4px;
}

.bar-label {
  font-size: 11px;
  color: #909399;
  margin-top: 8px;
  position: absolute;
  bottom: -24px;
}
</style>

