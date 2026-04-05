<template>
  <div class="version-update-container">
    <el-popover
      trigger="click"
      placement="bottom-end"
      :width="420"
      popper-class="version-update-popover"
      @show="onPopoverShow"
    >
      <template #reference>
        <el-tooltip content="版本更新" placement="bottom">
          <div class="update-trigger">
            <el-badge is-dot :hidden="!hasUpdate" type="danger">
              <svg class="update-icon" :class="{ 'has-update': hasUpdate }" viewBox="0 0 1024 1024" width="20" height="20">
                <path d="M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zM368 744c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V280c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v464zm192-168c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V280c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v296zm192 72c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V280c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v368z" fill="currentColor"/>
              </svg>
            </el-badge>
          </div>
        </el-tooltip>
      </template>

      <!-- 弹窗内容 -->
      <div class="pop-header">
        <span class="pop-title">系统更新</span>
        <el-tag v-if="hasUpdate" type="danger" size="small" effect="dark" round>有新版本</el-tag>
        <el-tag v-else type="info" size="small" effect="plain" round>已是最新</el-tag>
      </div>

      <div class="version-current">
        <div class="version-label">当前版本</div>
        <div class="version-value">v{{ currentVersion }}</div>
      </div>

      <div v-if="latestVersion" class="version-latest" :class="{ 'is-new': hasUpdate }">
        <div class="version-latest-header">
          <div>
            <span class="version-label">最新版本</span>
            <span class="version-value">v{{ latestVersion.version }}</span>
          </div>
          <el-tag :type="getReleaseTypeTag(latestVersion.releaseType)" size="small">
            {{ getReleaseTypeLabel(latestVersion.releaseType) }}
          </el-tag>
        </div>
        <div v-if="latestVersion.publishedAt" class="version-date">
          发布于 {{ formatTime(latestVersion.publishedAt) }}
        </div>
        <div v-if="latestVersion.changelog" class="version-changelog">
          <div class="changelog-title">更新内容：</div>
          <div class="changelog-content">{{ latestVersion.changelog }}</div>
        </div>
        <div v-if="latestVersion.isForceUpdate" class="force-update-tip">
          <el-icon><WarningFilled /></el-icon>
          <span>此版本为强制更新</span>
        </div>
      </div>

      <div v-if="!latestVersion && !hasUpdate" class="no-version-tip">暂无已发布版本</div>

      <div class="pop-actions">
        <el-button v-if="hasUpdate" type="primary" size="small" @click="handleStartUpdate" :loading="updating">
          {{ updating ? '更新中...' : '立即更新' }}
        </el-button>
        <el-button size="small" @click="showHistoryDialog = true">查看历史版本</el-button>
      </div>
    </el-popover>

    <!-- 历史版本对话框 -->
    <el-dialog v-model="showHistoryDialog" title="版本更新历史" width="650px" destroy-on-close>
      <div class="history-list" v-loading="historyLoading">
        <div v-for="item in historyList" :key="item.id" class="history-item">
          <div class="history-item-header">
            <div class="history-version">
              <span class="version-tag">v{{ item.version }}</span>
              <el-tag :type="getReleaseTypeTag(item.releaseType)" size="small">
                {{ getReleaseTypeLabel(item.releaseType) }}
              </el-tag>
              <el-tag v-if="item.version === currentVersion" type="success" size="small" effect="plain">当前版本</el-tag>
            </div>
            <span class="history-date">{{ formatTime(item.publishedAt) }}</span>
          </div>
          <div v-if="item.changelog" class="history-changelog">{{ item.changelog }}</div>
        </div>
        <el-empty v-if="!historyLoading && historyList.length === 0" description="暂无版本记录" :image-size="80" />
      </div>
    </el-dialog>

    <!-- 更新进度对话框 -->
    <el-dialog v-model="showProgressDialog" title="系统更新" width="600px" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="updateComplete || updateFailed">
      <div class="update-progress">
        <el-progress :percentage="updateProgress" :status="updateFailed ? 'exception' : (updateComplete ? 'success' : undefined)" :stroke-width="18" :text-inside="true" />
        <div class="progress-step">
          <el-icon v-if="!updateFailed && !updateComplete" class="is-loading"><Loading /></el-icon>
          <span>{{ updateStepText }}</span>
        </div>
        <div class="progress-logs" ref="logContainerRef">
          <div v-for="(entry, idx) in updateLogs" :key="idx" class="log-entry" :class="'level-' + entry.level">
            <span class="log-time">{{ formatLogTime(entry.time) }}</span>
            <span class="log-msg">{{ entry.message }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button v-if="updateComplete" type="primary" @click="handleReload">刷新页面</el-button>
        <el-button v-if="updateFailed" type="warning" @click="showProgressDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled, Loading } from '@element-plus/icons-vue'
import request from '@/api/request'

const hasUpdate = ref(false)
const currentVersion = ref('0.0.0')
const latestVersion = ref<any>(null)
const updating = ref(false)

const showHistoryDialog = ref(false)
const historyLoading = ref(false)
const historyList = ref<any[]>([])

const showProgressDialog = ref(false)
const updateProgress = ref(0)
const updateStepText = ref('')
const updateLogs = ref<any[]>([])
const updateComplete = ref(false)
const updateFailed = ref(false)
const logContainerRef = ref<HTMLElement | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
let eventSource: EventSource | null = null

const getReleaseTypeTag = (type: string) => {
  const map: Record<string, string> = { major: 'danger', minor: 'success', patch: 'warning', beta: 'info' }
  return map[type] || 'info'
}
const getReleaseTypeLabel = (type: string) => {
  const map: Record<string, string> = { major: '大版本', minor: '功能更新', patch: '补丁修复', beta: '测试版' }
  return map[type] || type
}
const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
}
const formatLogTime = (time: string) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const checkForUpdate = async () => {
  try {
    const res = await request.get('/update-tasks/check')
    if (res.data) {
      hasUpdate.value = res.data.hasUpdate || false
      currentVersion.value = res.data.currentVersion || '0.0.0'
      latestVersion.value = res.data.latestVersion || null
    }
  } catch {
    // 静默
  }
}

const loadHistory = async () => {
  historyLoading.value = true
  try {
    const res = await request.get('/update-tasks/version-history', { params: { page: 1, pageSize: 50 } })
    if (res.data) {
      historyList.value = res.data.list || []
    }
  } catch {
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

const onPopoverShow = () => {
  checkForUpdate()
}

watch(showHistoryDialog, (val) => {
  if (val) loadHistory()
})

const handleStartUpdate = async () => {
  if (!latestVersion.value) return
  try {
    await ElMessageBox.confirm(
      `确认将系统从 v${currentVersion.value} 更新到 v${latestVersion.value.version}？\n\n更新过程中服务会短暂中断，请在低峰时段执行。`,
      '确认更新', { confirmButtonText: '确认更新', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  updating.value = true
  updateProgress.value = 0
  updateStepText.value = '正在启动更新...'
  updateLogs.value = []
  updateComplete.value = false
  updateFailed.value = false
  showProgressDialog.value = true

  try {
    const res = await request.post('/update-tasks/start', { versionId: latestVersion.value.id })
    if (res.data) {
      connectSSE(res.data.id)
    }
  } catch (error: any) {
    updating.value = false
    updateFailed.value = true
    updateStepText.value = '更新启动失败'
    ElMessage.error(error.message || '启动更新失败')
  }
}

const connectSSE = (taskId: string) => {
  const sseUrl = `/api/v1/admin/update-tasks/${taskId}/logs`
  eventSource = new EventSource(sseUrl)
  eventSource.onmessage = (event) => {
    try {
      const entry = JSON.parse(event.data)
      updateLogs.value.push(entry)
      updateProgress.value = entry.progress || 0
      updateStepText.value = entry.message || ''
      nextTick(() => { if (logContainerRef.value) logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight })
      if (entry.step === 'success') { updateComplete.value = true; updating.value = false; closeSSE() }
      else if (entry.step === 'failed' || entry.step === 'rolled_back') { updateFailed.value = true; updating.value = false; closeSSE() }
    } catch {}
  }
  eventSource.onerror = () => { closeSSE() }
}

const closeSSE = () => { if (eventSource) { eventSource.close(); eventSource = null } }

const handleReload = () => { window.location.reload() }

onMounted(() => {
  checkForUpdate()
  pollTimer = setInterval(checkForUpdate, 60000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  closeSSE()
})
</script>

<style scoped>
.version-update-container { display: inline-flex; align-items: center; margin-right: 12px; }
.update-trigger { cursor: pointer; padding: 6px 8px; border-radius: 6px; transition: background 0.2s; display: flex; align-items: center; }
.update-trigger:hover { background: rgba(64,158,255,0.1); }
.update-icon { color: #909399; transition: color 0.3s; }
.update-icon.has-update { color: #409eff; }
.pop-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid #ebeef5; margin-bottom: 12px; }
.pop-title { font-size: 15px; font-weight: 600; color: #303133; }
.version-current { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f5f7fa; border-radius: 6px; margin-bottom: 10px; }
.version-label { font-size: 13px; color: #909399; }
.version-value { font-size: 14px; font-weight: 600; color: #303133; font-family: monospace; }
.version-latest { padding: 10px 12px; border-radius: 6px; border: 1px solid #ebeef5; margin-bottom: 12px; }
.version-latest.is-new { border-color: #409eff; background: #ecf5ff; }
.version-latest-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.version-date { font-size: 12px; color: #909399; margin-bottom: 6px; }
.version-changelog { margin-top: 8px; }
.changelog-title { font-size: 12px; color: #606266; font-weight: 500; margin-bottom: 4px; }
.changelog-content { font-size: 12px; color: #606266; line-height: 1.6; max-height: 120px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; background: rgba(255,255,255,0.6); padding: 6px 8px; border-radius: 4px; }
.force-update-tip { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 12px; color: #f56c6c; }
.no-version-tip { text-align: center; padding: 16px 0; color: #909399; font-size: 13px; }
.pop-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 10px; border-top: 1px solid #ebeef5; }
.history-list { max-height: 500px; overflow-y: auto; }
.history-item { padding: 12px 0; border-bottom: 1px solid #f0f2f5; }
.history-item:last-child { border-bottom: none; }
.history-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.history-version { display: flex; align-items: center; gap: 8px; }
.version-tag { font-family: monospace; font-weight: 600; color: #409eff; font-size: 14px; }
.history-date { font-size: 12px; color: #909399; }
.history-changelog { font-size: 13px; color: #606266; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.update-progress { padding: 8px 0; }
.progress-step { display: flex; align-items: center; gap: 8px; margin: 12px 0; font-size: 14px; color: #606266; }
.progress-logs { max-height: 300px; overflow-y: auto; background: #1e1e1e; border-radius: 6px; padding: 12px; margin-top: 12px; font-family: monospace; font-size: 12px; }
.log-entry { padding: 2px 0; line-height: 1.6; color: #c0c4cc; }
.log-entry.level-success { color: #67c23a; }
.log-entry.level-warn { color: #e6a23c; }
.log-entry.level-error { color: #f56c6c; }
.log-time { color: #606266; margin-right: 8px; }
</style>

<style>
.version-update-popover { padding: 14px 16px !important; }
</style>


