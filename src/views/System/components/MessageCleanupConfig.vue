<template>
  <div class="message-cleanup-config">
      <!-- 功能说明 -->
      <el-alert
        title="消息清理说明"
        type="info"
        :closable="false"
        show-icon
        class="info-alert"
      >
        <template #default>
          <p>系统会产生大量的消息通知记录，为避免数据库存储压力过大，建议定期清理过期的消息记录。</p>
          <p>清理范围包括：通知发送记录（notification_logs）表中的历史数据。</p>
        </template>
      </el-alert>

      <!-- 当前数据统计 -->
      <el-card class="stats-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span><el-icon><DataAnalysis /></el-icon> 当前数据统计</span>
            <el-button type="primary" link @click="loadStats" :loading="statsLoading">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value">{{ dataStats.totalRecords.toLocaleString() }}</div>
              <div class="stat-label">总记录数</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value warning">{{ dataStats.expiredRecords.toLocaleString() }}</div>
              <div class="stat-label">可清理记录</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value">{{ dataStats.oldestRecord || '-' }}</div>
              <div class="stat-label">最早记录时间</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value success">{{ dataStats.lastCleanup || '从未清理' }}</div>
              <div class="stat-label">上次清理时间</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 清理配置 -->
      <el-card class="config-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span><el-icon><Setting /></el-icon> 自动清理配置</span>
            <el-switch
              v-model="config.enabled"
              active-text="已启用"
              inactive-text="已禁用"
              @change="handleEnableChange"
            />
          </div>
        </template>

        <el-form
          ref="formRef"
          :model="config"
          :rules="rules"
          label-width="140px"
          :disabled="!config.enabled"
        >
          <el-form-item label="保留天数" prop="retentionDays">
            <el-input-number
              v-model="config.retentionDays"
              :min="7"
              :max="365"
              :step="1"
              controls-position="right"
            />
            <span class="form-tip">天（超过此天数的记录将被清理，最少7天）</span>
          </el-form-item>

          <el-form-item label="清理模式" prop="cleanupMode">
            <el-radio-group v-model="config.cleanupMode">
              <el-radio label="auto">过期自动清理</el-radio>
              <el-radio label="scheduled">定时清理</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="执行时间" prop="cleanupTime" v-if="config.cleanupMode === 'scheduled'">
            <el-time-picker
              v-model="config.cleanupTime"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="选择执行时间"
            />
            <span class="form-tip">建议选择凌晨低峰时段执行</span>
          </el-form-item>

          <el-form-item label="清理频率" prop="cleanupFrequency" v-if="config.cleanupMode === 'scheduled'">
            <el-select v-model="config.cleanupFrequency" placeholder="选择清理频率">
              <el-option label="每天" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveConfig" :loading="saving">
              <el-icon><Check /></el-icon> 保存配置
            </el-button>
            <el-button @click="resetConfig">
              <el-icon><RefreshLeft /></el-icon> 重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 手动清理 -->
      <el-card class="manual-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span><el-icon><Delete /></el-icon> 手动清理</span>
          </div>
        </template>

        <el-form label-width="140px">
          <el-form-item label="清理范围">
            <el-radio-group v-model="manualCleanup.mode">
              <el-radio label="byDays">按天数清理</el-radio>
              <el-radio label="byDate">按日期清理</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="保留天数" v-if="manualCleanup.mode === 'byDays'">
            <el-input-number
              v-model="manualCleanup.days"
              :min="1"
              :max="365"
              controls-position="right"
            />
            <span class="form-tip">天（将清理超过此天数的所有记录）</span>
          </el-form-item>

          <el-form-item label="清理日期之前" v-if="manualCleanup.mode === 'byDate'">
            <el-date-picker
              v-model="manualCleanup.beforeDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :disabled-date="disabledDate"
            />
            <span class="form-tip">将清理此日期之前的所有记录</span>
          </el-form-item>

          <el-form-item>
            <el-button type="danger" @click="executeManualCleanup" :loading="cleaning">
              <el-icon><Delete /></el-icon> 立即清理
            </el-button>
            <span class="warning-tip">
              <el-icon><Warning /></el-icon>
              清理操作不可恢复，请谨慎操作
            </span>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 清理历史 -->
      <el-card class="history-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span><el-icon><Document /></el-icon> 清理历史</span>
          </div>
        </template>
        <el-table :data="cleanupHistory" stripe v-loading="historyLoading">
          <el-table-column prop="cleanupTime" label="清理时间" width="180" />
          <el-table-column prop="cleanupType" label="清理类型" width="120">
            <template #default="{ row }">
              <el-tag :type="row.cleanupType === 'auto' ? 'success' : 'warning'" size="small">
                {{ row.cleanupType === 'auto' ? '自动清理' : '手动清理' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="deletedCount" label="清理数量" width="120" />
          <el-table-column prop="operator" label="操作人" width="120" />
          <el-table-column prop="remark" label="备注" />
        </el-table>
      </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DataAnalysis, Refresh, Setting, Check, RefreshLeft,
  Delete, Warning, Document
} from '@element-plus/icons-vue'
import api from '@/utils/request'

// 数据统计
const dataStats = ref({
  totalRecords: 0,
  expiredRecords: 0,
  oldestRecord: '',
  lastCleanup: ''
})
const statsLoading = ref(false)

// 配置
const config = reactive({
  enabled: false,
  retentionDays: 30,
  cleanupMode: 'auto' as 'auto' | 'scheduled',
  cleanupTime: '02:00',
  cleanupFrequency: 'daily' as 'daily' | 'weekly' | 'monthly'
})
const saving = ref(false)
const formRef = ref()

// 表单验证规则
const rules = {
  retentionDays: [
    { required: true, message: '请设置保留天数', trigger: 'blur' }
  ],
  cleanupMode: [
    { required: true, message: '请选择清理模式', trigger: 'change' }
  ]
}

// 手动清理
const manualCleanup = reactive({
  mode: 'byDays' as 'byDays' | 'byDate',
  days: 30,
  beforeDate: ''
})
const cleaning = ref(false)

// 清理历史
const cleanupHistory = ref<any[]>([])
const historyLoading = ref(false)

// 禁用未来日期
const disabledDate = (date: Date) => {
  return date.getTime() > Date.now()
}

// 加载统计数据
const loadStats = async () => {
  statsLoading.value = true
  try {
    const res = await api.get('/message-cleanup/stats')
    if (res.data) {
      dataStats.value = res.data
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  } finally {
    statsLoading.value = false
  }
}

// 加载配置
const loadConfig = async () => {
  try {
    const res = await api.get('/message-cleanup/config')
    if (res.data) {
      Object.assign(config, res.data)
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 加载清理历史
const loadHistory = async () => {
  historyLoading.value = true
  try {
    const res = await api.get('/message-cleanup/history')
    if (res.data) {
      cleanupHistory.value = res.data
    }
  } catch (error) {
    console.error('加载清理历史失败:', error)
  } finally {
    historyLoading.value = false
  }
}

// 启用状态变更
const handleEnableChange = async (enabled: boolean) => {
  if (enabled) {
    ElMessage.info('已启用自动清理，请配置清理规则后保存')
  }
}

// 保存配置
const saveConfig = async () => {
  if (!formRef.value) return
  await formRef.value.validate()

  saving.value = true
  try {
    await api.post('/message-cleanup/config', config)
    ElMessage.success('配置保存成功')
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 重置配置
const resetConfig = () => {
  loadConfig()
}

// 执行手动清理
const executeManualCleanup = async () => {
  let confirmMsg = ''
  if (manualCleanup.mode === 'byDays') {
    confirmMsg = `确定要清理 ${manualCleanup.days} 天前的所有消息记录吗？此操作不可恢复！`
  } else {
    confirmMsg = `确定要清理 ${manualCleanup.beforeDate} 之前的所有消息记录吗？此操作不可恢复！`
  }

  try {
    await ElMessageBox.confirm(confirmMsg, '确认清理', {
      confirmButtonText: '确定清理',
      cancelButtonText: '取消',
      type: 'warning'
    })

    cleaning.value = true
    const params = manualCleanup.mode === 'byDays'
      ? { mode: 'byDays', days: manualCleanup.days }
      : { mode: 'byDate', beforeDate: manualCleanup.beforeDate }

    const res = await api.post('/message-cleanup/execute', params)
    ElMessage.success(`清理完成，共删除 ${res.data?.deletedCount || 0} 条记录`)

    // 刷新数据
    loadStats()
    loadHistory()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '清理失败')
    }
  } finally {
    cleaning.value = false
  }
}

onMounted(() => {
  loadStats()
  loadConfig()
  loadHistory()
})
</script>

<style scoped>
.message-cleanup-config {
  padding: 0;
}

.info-alert {
  margin-bottom: 20px;
}

.info-alert p {
  margin: 4px 0;
  font-size: 13px;
}

.stats-card,
.config-card,
.manual-card,
.history-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header span {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.stat-item {
  text-align: center;
  padding: 16px 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.stat-value.warning {
  color: #e6a23c;
}

.stat-value.success {
  color: #67c23a;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.form-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 13px;
}

.warning-tip {
  margin-left: 16px;
  color: #f56c6c;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
