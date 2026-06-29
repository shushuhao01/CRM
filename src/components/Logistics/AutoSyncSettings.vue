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
        <div class="header-right">
          <slot name="before-batch-update"></slot>
          <el-button
            type="primary"
            :disabled="selectedCount === 0"
            @click="handleBatchUpdate"
            class="batch-update-btn"
          >
            <el-icon><Edit /></el-icon>
            批量更新状态 ({{ selectedCount }})
          </el-button>
          <el-switch
            v-model="enabled"
            @change="handleEnabledChange"
            active-text="启用"
            inactive-text="停用"
          />
        </div>
      </div>
    </template>

    <el-collapse-transition>
      <div v-show="!collapsed" class="settings-content">
        <div class="sync-description">
          <el-icon class="desc-icon"><InfoFilled /></el-icon>
          <p>{{ syncStatus.description || '物流状态自动同步服务：根据物流最新动态自动判断并更新订单状态（已发货→已签收/已拒收等）。启用后系统定时检测待同步订单，无需人工逐一操作。' }}</p>
        </div>

        <div class="sync-info-grid">
          <div class="sync-info-item">
            <span class="info-label">运行状态</span>
            <span class="info-value">
              <el-tag :type="syncStatus.isRunning ? 'success' : (enabled ? 'success' : 'info')" size="small" effect="dark">
                <el-icon v-if="syncStatus.isRunning" class="rotating"><Loading /></el-icon>
                {{ syncStatus.isRunning ? '同步执行中...' : (enabled ? '已启用' : '未启用') }}
              </el-tag>
            </span>
          </div>
          <div class="sync-info-item">
            <span class="info-label">最近一次同步</span>
            <span class="info-value">{{ syncStatus.lastSyncTime ? formatTime(syncStatus.lastSyncTime) : '从未执行' }}</span>
          </div>
          <div class="sync-info-item">
            <span class="info-label">上次启动时间</span>
            <span class="info-value">{{ syncStatus.lastStartTime ? formatTime(syncStatus.lastStartTime) : '-' }}</span>
          </div>
          <div class="sync-info-item">
            <span class="info-label">上次结束时间</span>
            <span class="info-value">{{ syncStatus.lastStopTime ? formatTime(syncStatus.lastStopTime) : '-' }}</span>
          </div>
          <div class="sync-info-item">
            <span class="info-label">累计同步数</span>
            <span class="info-value">{{ syncStatus.totalSynced || 0 }} 单</span>
          </div>
          <div class="sync-info-item">
            <span class="info-label">最近一次结果</span>
            <span class="info-value" v-if="syncStatus.lastSyncedCount > 0">
              处理 {{ syncStatus.lastSyncedCount }} 单，更新 {{ syncStatus.lastUpdatedCount }} 单
              <span v-if="syncStatus.lastErrorCount > 0" style="color: #f56c6c">，{{ syncStatus.lastErrorCount }} 个错误</span>
            </span>
            <span class="info-value" v-else>-</span>
          </div>
        </div>

        <div class="action-buttons">
          <el-button
            type="primary"
            @click="handleManualSync"
            :loading="manualSyncLoading"
          >
            <el-icon><Refresh /></el-icon>
            手动同步
          </el-button>
          <el-button @click="handleRefreshStatus">
            <el-icon><View /></el-icon>
            刷新状态
          </el-button>
        </div>
      </div>
    </el-collapse-transition>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, View, ArrowDown, ArrowUp, Edit, InfoFilled, Loading } from '@element-plus/icons-vue'
import request from '@/utils/request'

const selectedCount = inject<any>('selectedCount', ref(0))
const handleBatchUpdate = inject<any>('handleBatchUpdate', () => {
  ElMessage.warning('批量更新功能未初始化')
})

const collapsed = ref(true)
const enabled = ref(false)
const manualSyncLoading = ref(false)
const statusTimer = ref<ReturnType<typeof setInterval> | null>(null)

const syncStatus = reactive({
  isRunning: false,
  enabled: false,
  lastSyncTime: '' as string | null,
  lastStartTime: '' as string | null,
  lastStopTime: '' as string | null,
  totalSynced: 0,
  lastSyncedCount: 0,
  lastUpdatedCount: 0,
  lastErrorCount: 0,
  description: '',
})

onMounted(() => {
  refreshStatus()
  statusTimer.value = setInterval(refreshStatus, 30000)
})

onUnmounted(() => {
  if (statusTimer.value) clearInterval(statusTimer.value)
})

const refreshStatus = async () => {
  try {
    const res = await request.get('/logistics/auto-sync/status') as any
    if (res) {
      Object.assign(syncStatus, res)
      enabled.value = !!res.enabled
    }
  } catch { /* ignore */ }
}

const handleEnabledChange = async (val: boolean) => {
  if (val) {
    try {
      await ElMessageBox.confirm(
        '启用自动同步后，系统将根据物流最新动态自动判断并更新订单状态。\n\n' +
        '请注意：自动判断可能不完全准确（如签收人信息、拒收原因等），建议定期人工核实确认。',
        '自动同步提醒',
        { confirmButtonText: '了解并启用', cancelButtonText: '取消', type: 'warning' }
      )
      await request.post('/logistics/auto-sync/config', { enabled: true })
      ElMessage.success('自动同步已启用')
      refreshStatus()
    } catch {
      enabled.value = false
    }
  } else {
    try {
      await request.post('/logistics/auto-sync/config', { enabled: false })
    } catch { /* ignore */ }
    ElMessage.info('自动同步已停用')
    refreshStatus()
  }
}

const handleManualSync = async () => {
  manualSyncLoading.value = true
  try {
    const res = await request.post('/logistics/auto-sync/trigger') as any
    if (res) {
      ElMessage.success(`同步完成：处理 ${res?.totalProcessed || 0} 个订单，更新 ${res?.statusUpdated || 0} 个状态`)
    } else {
      ElMessage.warning('同步完成')
    }
    refreshStatus()
  } catch (error: any) {
    ElMessage.error('同步失败：' + (error?.message || '未知错误'))
  } finally {
    manualSyncLoading.value = false
  }
}

const handleRefreshStatus = () => {
  refreshStatus()
  ElMessage.success('状态已刷新')
}

const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  } catch {
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

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.batch-update-btn {
  margin-right: 10px;
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

.sync-description {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.desc-icon {
  color: #409eff;
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

.sync-description p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.sync-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.sync-info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.info-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  min-width: 90px;
}

.info-value {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.action-buttons {
  text-align: center;
}

.action-buttons .el-button {
  margin: 0 10px;
}

.rotating {
  animation: spin 1.5s linear infinite;
  margin-right: 4px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
