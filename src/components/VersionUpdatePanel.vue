<template>
  <div class="version-update-container">
    <!-- 更新图标 -->
    <el-tooltip :content="hasUpdate ? '有新版本可用' : '系统版本'" placement="bottom" :disabled="dialogVisible">
      <div class="update-btn" :class="{ 'has-update': hasUpdate && !ignored }" @click="handleClick">
        <el-badge is-dot :hidden="!showDot" type="danger">
          <svg class="update-icon" :class="{ active: hasUpdate && !ignored }" viewBox="0 0 1024 1024" width="20" height="20">
            <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" fill="currentColor"/>
            <path d="M512 288c-17.7 0-32 14.3-32 32v224c0 8.5 3.4 16.6 9.4 22.6l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L544 530.7V320c0-17.7-14.3-32-32-32z" fill="currentColor"/>
            <path d="M512 192l-96 96h64v160h64V288h64z" fill="currentColor" transform="rotate(180, 512, 340)"/>
          </svg>
        </el-badge>
      </div>
    </el-tooltip>

    <!-- 版本详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="系统版本"
      width="600px"
      :close-on-click-modal="true"
      destroy-on-close
    >
      <!-- 当前版本 -->
      <div class="current-version-card">
        <div class="cv-label">当前版本</div>
        <div class="cv-value">v{{ currentVersion }}</div>
        <el-tag v-if="!hasUpdate" type="success" size="small">已是最新</el-tag>
        <el-tag v-else type="danger" size="small">有新版本</el-tag>
      </div>

      <!-- 新版本提示 -->
      <div v-if="hasUpdate && latestVersion" class="new-version-card">
        <div class="nv-header">
          <div class="nv-title">
            <span class="nv-version">v{{ latestVersion.version }}</span>
            <el-tag :type="getReleaseTag(latestVersion.releaseType)" size="small">
              {{ getReleaseLabel(latestVersion.releaseType) }}
            </el-tag>
          </div>
          <span class="nv-date">{{ formatDate(latestVersion.publishedAt) }}</span>
        </div>
        <div v-if="latestVersion.changelog" class="nv-changelog">
          <div class="nv-changelog-title">更新内容</div>
          <div class="nv-changelog-body">{{ latestVersion.changelog }}</div>
        </div>
        <div v-if="latestVersion.isForceUpdate" class="nv-force">
          <el-icon><WarningFilled /></el-icon>
          此为强制更新版本
        </div>

        <!-- 私有部署：显示更新按钮 -->
        <div v-if="isPrivateDeployment" class="nv-actions">
          <el-button type="primary" @click="handleUpdate" :loading="updating" :disabled="updating">
            {{ updating ? '更新中...' : '一键更新' }}
          </el-button>
          <el-button v-if="!ignored" size="small" text type="info" @click="handleIgnore">
            暂不更新
          </el-button>
          <span v-if="ignored" class="nv-ignored-tip">已忽略此版本提醒，仍可点击"一键更新"</span>
          <span v-else class="nv-actions-tip">更新过程中服务会短暂中断</span>
        </div>
        <!-- SaaS模式：只读提示 -->
        <div v-else class="nv-saas-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>SaaS 版本由平台统一管理更新，无需手动操作</span>
        </div>
      </div>

      <!-- 版本历史 -->
      <div class="history-section">
        <div class="history-title">版本历史</div>
        <div class="history-list" v-loading="historyLoading">
          <div v-for="item in historyList" :key="item.id" class="history-item">
            <div class="hi-header">
              <div class="hi-left">
                <span class="hi-version">v{{ item.version }}</span>
                <el-tag :type="getReleaseTag(item.releaseType)" size="small">
                  {{ getReleaseLabel(item.releaseType) }}
                </el-tag>
                <el-tag v-if="item.version === currentVersion" type="success" size="small" effect="plain">当前</el-tag>
              </div>
              <span class="hi-date">{{ formatDate(item.publishedAt) }}</span>
            </div>
            <div v-if="item.changelog" class="hi-changelog">{{ item.changelog }}</div>
          </div>
          <el-empty v-if="!historyLoading && historyList.length === 0" description="暂无版本记录" :image-size="60" />
        </div>
      </div>

      <!-- 更新进度 -->
      <div v-if="showProgress" class="update-progress-section">
        <el-divider content-position="left">更新进度</el-divider>
        <el-progress
          :percentage="updateProgress"
          :status="updateFailed ? 'exception' : (updateDone ? 'success' : undefined)"
          :stroke-width="16"
          :text-inside="true"
        />
        <div class="progress-step-text">{{ updateStep }}</div>
        <div class="progress-logs" ref="logRef">
          <div v-for="(log, i) in updateLogs" :key="i" class="plog" :class="'plog-' + log.level">
            <span class="plog-time">{{ fmtLogTime(log.time) }}</span>
            <span>{{ log.message }}</span>
          </div>
        </div>
        <div v-if="updateDone" class="progress-done">
          <el-button type="primary" size="small" @click="handleReload">刷新页面</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled, InfoFilled } from '@element-plus/icons-vue'
import { api } from '@/api/request'

// 状态
const dialogVisible = ref(false)
const hasUpdate = ref(false)
const currentVersion = ref('0.0.0')
const latestVersion = ref<any>(null)
const isPrivateDeployment = ref(false)
const updating = ref(false)
const ignored = ref(false)

// 红点显示逻辑：有更新且未忽略该版本
import { computed } from 'vue'
const showDot = computed(() => hasUpdate.value && !ignored.value)

// 历史
const historyLoading = ref(false)
const historyList = ref<any[]>([])

// 更新进度
const showProgress = ref(false)
const updateProgress = ref(0)
const updateStep = ref('')
const updateLogs = ref<any[]>([])
const updateDone = ref(false)
const updateFailed = ref(false)
const logRef = ref<HTMLElement | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
let eventSource: EventSource | null = null

// 辅助方法
const getReleaseTag = (type: string) => {
  const m: Record<string, string> = { major: 'danger', minor: 'success', patch: 'warning', beta: 'info' }
  return m[type] || 'info'
}
const getReleaseLabel = (type: string) => {
  const m: Record<string, string> = { major: '大版本', minor: '功能更新', patch: '补丁', beta: '测试版' }
  return m[type] || type
}
const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
}
const fmtLogTime = (t: string) => {
  if (!t) return ''
  return new Date(t).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// 检测部署模式
const detectDeployMode = () => {
  // 方式1：通过存储的租户信息判断
  try {
    const tenantInfo = localStorage.getItem('tenant_info')
    if (tenantInfo) {
      const info = JSON.parse(tenantInfo)
      if (info.deployType === 'private') {
        isPrivateDeployment.value = true
        return
      }
    }
  } catch {}

  // 方式2：检查 tenantId —— 无 tenantId 大概率是私有部署
  try {
    const user = localStorage.getItem('user')
    if (user) {
      const u = JSON.parse(user)
      if (!u.tenantId) {
        isPrivateDeployment.value = true
        return
      }
    }
  } catch {}

  isPrivateDeployment.value = false
}

// 检查更新
const checkUpdate = async () => {
  try {
    const res = await api.get<any>('/public/version-check/latest', {
      params: { currentVersion: currentVersion.value } as any
    })
    if (res.data) {
      hasUpdate.value = res.data.hasUpdate || false
      if (res.data.currentVersion) currentVersion.value = res.data.currentVersion
      latestVersion.value = res.data.latestVersion || null
      restoreIgnoredState()
    }
  } catch {}
}

// 获取当前版本
const getCurrentVersion = () => {
  try {
    // 从 configStore 或 localStorage 获取系统版本
    const configStr = localStorage.getItem('system_config')
    if (configStr) {
      const config = JSON.parse(configStr)
      if (config.systemVersion) {
        currentVersion.value = config.systemVersion
        return
      }
    }
  } catch {}
  currentVersion.value = '0.0.0'
}

// 加载历史
const loadHistory = async () => {
  historyLoading.value = true
  try {
    const res = await api.get<any>('/public/version-check/history', { params: { page: 1, pageSize: 20 } as any })
    if (res.data) {
      historyList.value = res.data.list || []
    }
  } catch {
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

// 点击图标
const handleClick = () => {
  dialogVisible.value = true
}

// 忽略此版本提醒（红点消失，但仍可手动更新）
const handleIgnore = () => {
  if (latestVersion.value) {
    localStorage.setItem('ignored_version', latestVersion.value.version)
    ignored.value = true
  }
}

// 恢复忽略状态（如果忽略的版本和最新版本一致则保持忽略）
const restoreIgnoredState = () => {
  const ignoredVer = localStorage.getItem('ignored_version')
  if (ignoredVer && latestVersion.value && ignoredVer === latestVersion.value.version) {
    ignored.value = true
  } else {
    ignored.value = false
  }
}

// 监听对话框打开，加载历史
watch(dialogVisible, (val) => {
  if (val) {
    checkUpdate()
    loadHistory()
  }
})

// 触发更新（仅私有部署）
const handleUpdate = async () => {
  if (!latestVersion.value) return

  try {
    await ElMessageBox.confirm(
      `将系统从 v${currentVersion.value} 更新到 v${latestVersion.value.version}？\n更新过程中服务会短暂中断。`,
      '确认更新',
      { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
    )
  } catch { return }

  updating.value = true
  showProgress.value = true
  updateProgress.value = 0
  updateStep.value = '启动更新...'
  updateLogs.value = []
  updateDone.value = false
  updateFailed.value = false

  try {
    // 调用CRM端系统更新接口（无需admin token，使用CRM用户token）
    const res = await api.post<any>('/system/update/start', { versionId: latestVersion.value.id } as any)
    if (res.data && res.data.id) {
      connectSSE(res.data.id)
    } else {
      throw new Error('启动更新失败')
    }
  } catch (e: any) {
    updating.value = false
    updateFailed.value = true
    updateStep.value = e.message || '更新失败'
    ElMessage.error(e.message || '更新失败')
  }
}

// SSE 实时日志
const connectSSE = (taskId: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
  const url = `${baseUrl}/system/update/task/${taskId}/logs`

  eventSource = new EventSource(url)
  eventSource.onmessage = (ev) => {
    try {
      const entry = JSON.parse(ev.data)
      updateLogs.value.push(entry)
      updateProgress.value = entry.progress || 0
      updateStep.value = entry.message || ''

      nextTick(() => {
        if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
      })

      if (entry.step === 'success') {
        updateDone.value = true
        updating.value = false
        closeSSE()
      } else if (entry.step === 'failed' || entry.step === 'rolled_back') {
        updateFailed.value = true
        updating.value = false
        closeSSE()
      }
    } catch {}
  }
  eventSource.onerror = () => {
    closeSSE()
  }
}

const closeSSE = () => {
  if (eventSource) { eventSource.close(); eventSource = null }
}

const handleReload = () => {
  window.location.reload()
}

onMounted(() => {
  detectDeployMode()
  getCurrentVersion()
  checkUpdate()
  pollTimer = setInterval(checkUpdate, 120000) // 2分钟轮询
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  closeSSE()
})
</script>

<style scoped>
.version-update-container {
  display: flex;
  align-items: center;
  margin-right: 16px;
}

.update-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.35;
}
.update-btn:hover {
  background-color: #f5f7fa;
  opacity: 1;
}
.update-btn.has-update {
  opacity: 1;
}
.update-icon { color: #909399; transition: color 0.3s; }
.update-icon.active { color: #409eff; }

/* 当前版本卡片 */
.current-version-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}
.cv-label { font-size: 13px; color: #909399; }
.cv-value { font-size: 16px; font-weight: 700; color: #303133; font-family: monospace; }

/* 新版本卡片 */
.new-version-card {
  padding: 14px 16px;
  border: 1px solid #409eff;
  border-radius: 8px;
  background: #ecf5ff;
  margin-bottom: 16px;
}
.nv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.nv-title { display: flex; align-items: center; gap: 8px; }
.nv-version { font-size: 16px; font-weight: 700; color: #303133; font-family: monospace; }
.nv-date { font-size: 12px; color: #909399; }
.nv-changelog { margin-top: 8px; }
.nv-changelog-title { font-size: 13px; font-weight: 500; color: #606266; margin-bottom: 4px; }
.nv-changelog-body {
  font-size: 13px; color: #606266; line-height: 1.7;
  white-space: pre-wrap; word-break: break-word;
  max-height: 160px; overflow-y: auto;
  background: rgba(255,255,255,0.7); padding: 8px 10px; border-radius: 4px;
}
.nv-force { display: flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 12px; color: #f56c6c; }
.nv-actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.nv-actions-tip { font-size: 12px; color: #909399; }
.nv-ignored-tip { font-size: 12px; color: #c0c4cc; font-style: italic; }
.nv-saas-tip {
  display: flex; align-items: center; gap: 6px;
  margin-top: 10px; font-size: 13px; color: #909399;
  padding: 8px 12px; background: #f5f7fa; border-radius: 6px;
}

/* 历史版本 */
.history-section { margin-top: 16px; }
.history-title { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 10px; }
.history-list { max-height: 300px; overflow-y: auto; }
.history-item { padding: 10px 0; border-bottom: 1px solid #f0f2f5; }
.history-item:last-child { border-bottom: none; }
.hi-header { display: flex; justify-content: space-between; align-items: center; }
.hi-left { display: flex; align-items: center; gap: 6px; }
.hi-version { font-weight: 600; color: #409eff; font-family: monospace; font-size: 13px; }
.hi-date { font-size: 12px; color: #c0c4cc; }
.hi-changelog { font-size: 12px; color: #606266; line-height: 1.5; margin-top: 4px; white-space: pre-wrap; }

/* 更新进度 */
.update-progress-section { margin-top: 8px; }
.progress-step-text { font-size: 13px; color: #606266; margin: 8px 0; }
.progress-logs {
  max-height: 200px; overflow-y: auto; background: #1e1e1e;
  border-radius: 6px; padding: 10px; font-family: monospace; font-size: 12px;
}
.plog { padding: 1px 0; line-height: 1.5; }
.plog-info { color: #c0c4cc; }
.plog-success { color: #67c23a; }
.plog-warn { color: #e6a23c; }
.plog-error { color: #f56c6c; }
.plog-time { color: #606266; margin-right: 8px; }
.progress-done { text-align: center; margin-top: 12px; }
</style>

