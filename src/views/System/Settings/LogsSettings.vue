<template>
  <div>
    <!-- 日志清理配置 -->
    <el-card class="setting-card" style="margin-bottom: 16px;">
      <template #header>
        <div class="card-header">
          <span>日志清理配置</span>
          <el-button @click="handleSaveLogConfig" type="primary" :loading="logConfigLoading">
            保存配置
          </el-button>
        </div>
      </template>

      <el-form :model="logCleanupConfig" label-width="140px" class="setting-form">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="自动清理">
              <el-switch v-model="logCleanupConfig.autoCleanup" active-text="启用" inactive-text="禁用" />
              <span class="form-tip">启用后将自动清理过期日志</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="日志保留天数">
              <el-input-number v-model="logCleanupConfig.retentionDays" :min="1" :max="365" :disabled="!logCleanupConfig.autoCleanup" />
              <span class="form-tip">天（超过此天数的日志将被清理）</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="单文件大小限制">
              <el-input-number v-model="logCleanupConfig.maxFileSizeMB" :min="1" :max="100" />
              <span class="form-tip">MB（超过此大小将自动轮转）</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="清理时间">
              <el-time-picker v-model="logCleanupConfig.cleanupTime" format="HH:mm" value-format="HH:mm" placeholder="选择清理时间" :disabled="!logCleanupConfig.autoCleanup" />
              <span class="form-tip">每天在此时间执行清理</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="日志存储统计">
              <div class="log-stats">
                <el-tag type="info" size="large">日志文件数: {{ logStats.fileCount }} 个</el-tag>
                <el-tag type="warning" size="large">总大小: {{ logStats.totalSize }}</el-tag>
                <el-tag type="success" size="large">最早日志: {{ logStats.oldestLog || '无' }}</el-tag>
                <el-button type="info" size="small" @click="refreshLogStats" :loading="logStatsLoading">刷新统计</el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="手动清理">
              <el-button type="warning" @click="cleanupOldLogs" :loading="cleanupLoading">清理过期日志</el-button>
              <el-button type="danger" @click="clearLogs">清空所有日志</el-button>
              <span class="form-tip">清理过期日志将删除超过保留天数的日志文件</span>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 日志列表 -->
    <el-card class="setting-card">
      <template #header>
        <div class="card-header logs-header">
          <span>系统日志</span>
          <div class="logs-filter-bar">
            <el-date-picker v-model="logDateRange" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width: 220px;" value-format="YYYY-MM-DD" clearable size="default" @change="handleLogFilterChange" />
            <el-select v-model="logLevelFilter" placeholder="级别" style="width: 100px;" clearable @change="handleLogFilterChange">
              <el-option label="全部" value="" />
              <el-option label="ERROR" value="ERROR" />
              <el-option label="WARN" value="WARN" />
              <el-option label="INFO" value="INFO" />
              <el-option label="DEBUG" value="DEBUG" />
            </el-select>
            <el-input v-model="logSearchKeyword" placeholder="搜索日志..." style="width: 180px;" clearable @input="handleLogFilterChange">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button @click="refreshLogs" :loading="logsLoading" type="primary">刷新日志</el-button>
          </div>
        </div>
      </template>

      <div class="logs-container">
        <el-table :data="paginatedLogs" v-loading="logsLoading" style="width: 100%" :max-height="500" stripe>
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">{{ formatTimestamp(row.timestamp) }}</template>
          </el-table-column>
          <el-table-column prop="level" label="级别" width="100">
            <template #default="{ row }">
              <el-tag :type="getLogLevelType(row.level)" size="small">{{ row.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="module" label="模块" width="120" />
          <el-table-column prop="message" label="消息" show-overflow-tooltip />
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="showLogDetails(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="logs-pagination">
          <span class="logs-total">共 {{ filteredLogs.length }} 条记录</span>
          <el-pagination
            v-model:current-page="logPagination.currentPage"
            v-model:page-size="logPagination.pageSize"
            :page-sizes="[20, 50, 100]"
            :total="filteredLogs.length"
            layout="sizes, prev, pager, next, jumper"
            @size-change="handleLogPageSizeChange"
            @current-change="handleLogPageChange"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import * as logsApi from '@/api/logs'
import type { SystemLog } from '@/api/logs'

// ── 状态 ──
const logsLoading = ref(false)
const logPagination = ref({ currentPage: 1, pageSize: 20 })
const logDateRange = ref<string[]>([])
const logSearchKeyword = ref('')
const systemLogs = ref<SystemLog[]>([])
const logLevelFilter = ref('')
const logConfigLoading = ref(false)
const logStatsLoading = ref(false)
const cleanupLoading = ref(false)

const logCleanupConfig = ref({
  autoCleanup: true,
  retentionDays: 7,
  maxFileSizeMB: 20,
  cleanupTime: '03:00'
})

const logStats = ref({
  fileCount: 0,
  totalSize: '0 MB',
  oldestLog: ''
})

// ── Computed ──
const filteredLogs = computed(() => {
  let logs = systemLogs.value
  if (logLevelFilter.value) {
    logs = logs.filter(log => log.level === logLevelFilter.value)
  }
  if (logDateRange.value && logDateRange.value.length === 2) {
    const startDate = new Date(logDateRange.value[0])
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(logDateRange.value[1])
    endDate.setHours(23, 59, 59, 999)
    logs = logs.filter(log => {
      const logDate = new Date(log.timestamp)
      return logDate >= startDate && logDate <= endDate
    })
  }
  if (logSearchKeyword.value) {
    const keyword = logSearchKeyword.value.toLowerCase()
    logs = logs.filter(log =>
      log.message.toLowerCase().includes(keyword) ||
      (log.module && log.module.toLowerCase().includes(keyword)) ||
      (log.details && log.details.toLowerCase().includes(keyword))
    )
  }
  return logs
})

const paginatedLogs = computed(() => {
  const start = (logPagination.value.currentPage - 1) * logPagination.value.pageSize
  return filteredLogs.value.slice(start, start + logPagination.value.pageSize)
})

// ── 方法 ──
const formatTimestamp = (timestamp: Date | string) => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

const getLogLevelType = (level: string) => {
  const map: Record<string, string> = { ERROR: 'danger', WARN: 'warning', INFO: 'success', DEBUG: 'info' }
  return map[level] || ''
}

const refreshLogs = async () => {
  try {
    logsLoading.value = true
    const response = await logsApi.getSystemLogs({ limit: 100 })
    if (response.success && response.data) {
      systemLogs.value = response.data
      if (response.data.length > 0) ElMessage.success(`已刷新 ${response.data.length} 条日志`)
    } else {
      systemLogs.value = []
    }
  } catch (_error) {
    console.log('[系统日志] 暂无日志或获取失败')
    systemLogs.value = []
  } finally {
    logsLoading.value = false
  }
}

const clearLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有系统日志吗？此操作不可恢复。', '确认清空', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    const response = await logsApi.clearSystemLogs()
    if (response.success) {
      systemLogs.value = []
      ElMessage.success(response.message)
      refreshLogStats()
    } else {
      ElMessage.error('清空日志失败')
    }
  } catch (error) {
    if (error !== 'cancel') { console.error('清空日志失败:', error); ElMessage.error('清空日志失败') }
  }
}

const handleSaveLogConfig = async () => {
  try {
    logConfigLoading.value = true
    const response = await logsApi.saveLogConfig(logCleanupConfig.value)
    if (response.success) ElMessage.success('日志清理配置保存成功')
    else ElMessage.error(response.message || '保存失败')
  } catch (_error) {
    ElMessage.error('保存日志配置失败')
  } finally {
    logConfigLoading.value = false
  }
}

const refreshLogStats = async () => {
  try {
    logStatsLoading.value = true
    const response = await logsApi.getLogStats()
    if (response.success && response.data) logStats.value = response.data
  } catch (_error) {
    console.log('[日志统计] 获取失败')
  } finally {
    logStatsLoading.value = false
  }
}

const cleanupOldLogs = async () => {
  try {
    await ElMessageBox.confirm(`确定要清理超过 ${logCleanupConfig.value.retentionDays} 天的日志吗？`, '确认清理', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    cleanupLoading.value = true
    const response = await logsApi.cleanupOldLogs(logCleanupConfig.value.retentionDays)
    if (response.success) {
      ElMessage.success(response.message || '清理完成')
      refreshLogs()
      refreshLogStats()
    } else {
      ElMessage.error(response.message || '清理失败')
    }
  } catch (error) {
    if (error !== 'cancel') { console.error('清理日志失败:', error); ElMessage.error('清理日志失败') }
  } finally {
    cleanupLoading.value = false
  }
}

const loadLogConfig = async () => {
  try {
    const response = await logsApi.getLogConfig()
    if (response.success && response.data) logCleanupConfig.value = { ...logCleanupConfig.value, ...response.data }
  } catch (_error) {
    console.log('[日志配置] 加载失败，使用默认配置')
  }
}

const showLogDetails = (log: SystemLog) => {
  const levelColors: Record<string, string> = { ERROR: '#f56c6c', WARN: '#e6a23c', INFO: '#409eff', DEBUG: '#909399' }
  const levelColor = levelColors[log.level] || '#909399'
  const detailsHtml = `
    <div style="text-align: left; font-size: 13px; line-height: 1.8;">
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
        <div style="margin-bottom: 6px;"><strong>时间：</strong>${formatTimestamp(log.timestamp)}</div>
        <div style="margin-bottom: 6px;"><strong>级别：</strong><span style="color: ${levelColor}; font-weight: bold;">${log.level}</span></div>
        <div style="margin-bottom: 6px;"><strong>模块：</strong>${log.module || '-'}</div>
        <div><strong>消息：</strong>${log.message}</div>
      </div>
      <div>
        <strong>详细信息：</strong>
        <div style="margin-top: 8px; padding: 12px; background: #f5f7fa; border-radius: 4px; font-family: monospace; white-space: pre-wrap; max-height: 300px; overflow-y: auto; word-break: break-all;">${log.details || '无详细信息'}</div>
      </div>
    </div>`
  ElMessageBox.alert(detailsHtml, '日志详情', { confirmButtonText: '确定', dangerouslyUseHTMLString: true, customStyle: { width: '600px' } })
}

const handleLogPageSizeChange = (size: number) => { logPagination.value.pageSize = size; logPagination.value.currentPage = 1 }
const handleLogPageChange = (page: number) => { logPagination.value.currentPage = page }
const handleLogFilterChange = () => { logPagination.value.currentPage = 1 }

// ── 初始化 ──
onMounted(() => {
  loadLogConfig()
  refreshLogs()
  refreshLogStats()
})
</script>

<style scoped>
.log-stats {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.logs-filter-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.logs-container {
  min-height: 200px;
}

.logs-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.logs-total {
  color: #909399;
  font-size: 13px;
}
</style>

