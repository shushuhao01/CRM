<template>
  <el-card class="auto-sync-settings">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <el-button 
            type="text" 
            @click="collapsed = !collapsed"
            class="collapse-btn"
          >
            <el-icon>
              <ArrowDown v-if="collapsed" />
              <ArrowUp v-else />
            </el-icon>
            <span>自动状态同步设置</span>
          </el-button>
        </div>
        <el-switch
          v-model="config.enabled"
          @change="handleEnabledChange"
          active-text="启用"
          inactive-text="停用"
        />
      </div>
    </template>

    <el-collapse-transition>
      <div v-show="!collapsed" class="settings-content">
      <el-form :model="config" label-width="120px" :disabled="!config.enabled">
        <el-form-item label="检测间隔">
          <el-input-number
            v-model="config.interval"
            :min="5"
            :max="1440"
            :step="5"
            @change="handleConfigChange"
          />
          <span class="form-text">分钟（建议30-60分钟）</span>
        </el-form-item>

        <el-form-item label="批处理大小">
          <el-input-number
            v-model="config.batchSize"
            :min="10"
            :max="200"
            :step="10"
            @change="handleConfigChange"
          />
          <span class="form-text">每次处理的订单数量</span>
        </el-form-item>

        <el-form-item label="重试次数">
          <el-input-number
            v-model="config.retryCount"
            :min="1"
            :max="10"
            @change="handleConfigChange"
          />
          <span class="form-text">失败时的重试次数</span>
        </el-form-item>

        <el-form-item label="同步范围">
          <el-checkbox-group v-model="syncOptions" @change="handleSyncOptionsChange">
            <el-checkbox label="performance">同步到业绩统计</el-checkbox>
            <el-checkbox label="orderList">同步到订单列表</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <div class="sync-status">
        <el-descriptions title="同步状态" :column="2" border>
          <el-descriptions-item label="服务状态">
            <el-tag :type="status.isRunning ? 'success' : 'info'">
              {{ status.isRunning ? '运行中' : '已停止' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后同步">
            {{ status.lastSyncTime ? formatTime(status.lastSyncTime) : '从未同步' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="action-buttons">
        <el-button
          type="primary"
          @click="handleManualSync"
          :loading="manualSyncLoading"
          :disabled="!config.enabled"
        >
          <el-icon><Refresh /></el-icon>
          手动同步
        </el-button>
        <el-button @click="handleRefreshStatus">
          <el-icon><View /></el-icon>
          刷新状态
        </el-button>
      </div>

      <!-- 同步日志 -->
      <div v-if="syncLogs.length > 0" class="sync-logs">
        <el-divider content-position="left">同步日志</el-divider>
        <el-timeline>
          <el-timeline-item
            v-for="(log, index) in syncLogs"
            :key="index"
            :timestamp="formatTime(log.time)"
            :type="log.success ? 'success' : 'danger'"
          >
            <div class="log-content">
              <div class="log-summary">
                {{ log.success ? '同步成功' : '同步失败' }}
                <span v-if="log.updatedCount > 0">
                  - 更新了 {{ log.updatedCount }} 个订单
                </span>
                <span v-if="log.errorCount > 0">
                  - {{ log.errorCount }} 个错误
                </span>
              </div>
              <div v-if="log.errors.length > 0" class="log-errors">
                <el-collapse>
                  <el-collapse-item title="查看错误详情">
                    <ul>
                      <li v-for="(error, idx) in log.errors" :key="idx">
                        {{ error }}
                      </li>
                    </ul>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
      </div>
    </el-collapse-transition>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, View, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { autoStatusSyncService, type AutoSyncConfig, type SyncResult } from '@/services/autoStatusSync'

// 响应式数据
const collapsed = ref(true) // 默认折叠状态
const config = reactive<AutoSyncConfig>({
  enabled: false,
  interval: 30,
  batchSize: 50,
  retryCount: 3,
  syncToPerformance: true,
  syncToOrderList: true
})

const status = reactive({
  isRunning: false,
  lastSyncTime: '',
  config: {} as AutoSyncConfig
})

const manualSyncLoading = ref(false)
const syncLogs = ref<SyncResult[]>([])
const statusTimer = ref<NodeJS.Timeout | null>(null)

// 计算属性
const syncOptions = computed({
  get: () => {
    const options = []
    if (config.syncToPerformance) options.push('performance')
    if (config.syncToOrderList) options.push('orderList')
    return options
  },
  set: (value: string[]) => {
    config.syncToPerformance = value.includes('performance')
    config.syncToOrderList = value.includes('orderList')
  }
})

// 初始化
onMounted(() => {
  loadConfig()
  refreshStatus()
  loadSyncLogs()
  
  // 定时刷新状态
  statusTimer.value = setInterval(refreshStatus, 30000) // 每30秒刷新一次
})

onUnmounted(() => {
  if (statusTimer.value) {
    clearInterval(statusTimer.value)
  }
})

// 加载配置
const loadConfig = () => {
  const serviceConfig = autoStatusSyncService.getConfig()
  Object.assign(config, serviceConfig)
}

// 刷新状态
const refreshStatus = () => {
  const serviceStatus = autoStatusSyncService.getStatus()
  Object.assign(status, serviceStatus)
}

// 加载同步日志
const loadSyncLogs = () => {
  const logs = localStorage.getItem('autoSyncLogs')
  if (logs) {
    try {
      syncLogs.value = JSON.parse(logs).slice(-10) // 只保留最近10条
    } catch (error) {
      console.error('加载同步日志失败:', error)
    }
  }
}

// 保存同步日志
const saveSyncLogs = () => {
  try {
    localStorage.setItem('autoSyncLogs', JSON.stringify(syncLogs.value))
  } catch (error) {
    console.error('保存同步日志失败:', error)
  }
}

// 处理启用状态变化
const handleEnabledChange = (enabled: boolean) => {
  autoStatusSyncService.updateConfig({ enabled })
  refreshStatus()
  
  if (enabled) {
    ElMessage.success('自动同步已启用')
  } else {
    ElMessage.info('自动同步已停用')
  }
}

// 处理配置变化
const handleConfigChange = () => {
  autoStatusSyncService.updateConfig(config)
  ElMessage.success('配置已保存')
}

// 处理同步选项变化
const handleSyncOptionsChange = () => {
  autoStatusSyncService.updateConfig({
    syncToPerformance: config.syncToPerformance,
    syncToOrderList: config.syncToOrderList
  })
  ElMessage.success('同步范围已更新')
}

// 手动同步
const handleManualSync = async () => {
  manualSyncLoading.value = true
  
  try {
    const result = await autoStatusSyncService.manualSync()
    
    // 添加到日志
    syncLogs.value.unshift(result)
    if (syncLogs.value.length > 10) {
      syncLogs.value = syncLogs.value.slice(0, 10)
    }
    saveSyncLogs()
    
    // 刷新状态
    refreshStatus()
    
    if (result.success) {
      ElMessage.success(`手动同步完成，更新了 ${result.updatedCount} 个订单`)
    } else {
      ElMessage.warning(`同步完成但有错误，更新了 ${result.updatedCount} 个订单，${result.errorCount} 个错误`)
    }
  } catch (error) {
    console.error('手动同步失败:', error)
    ElMessage.error(`手动同步失败: ${error}`)
  } finally {
    manualSyncLoading.value = false
  }
}

// 刷新状态
const handleRefreshStatus = () => {
  refreshStatus()
  ElMessage.success('状态已刷新')
}

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return timeStr
  }
}
</script>

<style scoped>
.auto-sync-settings {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  padding: 0;
  font-size: 14px;
  font-weight: 500;
}

.collapse-btn .el-icon {
  margin-right: 8px;
  transition: transform 0.3s ease;
}

.collapse-btn:hover {
  color: var(--el-color-primary);
}

.settings-content {
  padding: 10px 0;
}

.form-text {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sync-status {
  margin: 20px 0;
}

.action-buttons {
  margin: 20px 0;
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 10px;
}

.sync-logs {
  margin-top: 20px;
}

.log-content {
  padding: 5px 0;
}

.log-summary {
  font-weight: 500;
  margin-bottom: 5px;
}

.log-errors {
  margin-top: 10px;
}

.log-errors ul {
  margin: 0;
  padding-left: 20px;
}

.log-errors li {
  margin: 5px 0;
  font-size: 12px;
  color: var(--el-color-danger);
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
}
</style>