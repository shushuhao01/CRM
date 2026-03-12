<template>
  <view class="settings-page">
    <!-- 用户信息 -->
    <view class="user-section">
      <view class="avatar">
        <text>{{ userStore.userInfo?.realName?.charAt(0) || '?' }}</text>
      </view>
      <view class="info">
        <text class="name">{{ userStore.userInfo?.realName || '未登录' }}</text>
        <text class="dept">{{ userStore.userInfo?.department || '' }} · {{ userStore.userInfo?.role || '' }}</text>
      </view>
    </view>

    <!-- 设备信息 -->
    <view class="section">
      <text class="section-title">设备信息</text>
      <view class="setting-group">
        <view class="setting-item">
          <text class="label">📱 设备状态</text>
          <text class="value" :class="{ bound: userStore.isBound }">
            {{ userStore.isBound ? '已绑定' : '未绑定' }}
          </text>
        </view>
        <view class="setting-item">
          <text class="label">🔗 绑定账号</text>
          <text class="value">{{ userStore.userInfo?.username || '未绑定' }}</text>
        </view>
        <view class="setting-item">
          <text class="label">📡 通讯连接</text>
          <view class="connection-status">
            <view class="status-dot" :class="connectionStatus"></view>
            <text class="value" :class="connectionStatus">{{ connectionText }}</text>
            <button
              v-if="connectionStatus === 'disconnected' && userStore.isBound"
              class="btn-mini-reconnect"
              @tap="handleReconnect"
            >
              重连
            </button>
          </view>
        </view>
        <view class="setting-item" v-if="userStore.deviceInfo">
          <text class="label">📲 设备型号</text>
          <text class="value">{{ userStore.deviceInfo.deviceModel }}</text>
        </view>
      </view>
    </view>

    <!-- 通话设置 -->
    <view class="section">
      <text class="section-title">通话设置</text>
      <view class="setting-group">
        <view class="setting-item">
          <text class="label">🔔 来电提醒</text>
          <switch :checked="callSettings.callNotify" @change="updateSetting('callNotify', $event)" color="#34D399" />
        </view>
        <view class="setting-item">
          <text class="label">📳 振动提醒</text>
          <switch :checked="callSettings.vibrate" @change="updateSetting('vibrate', $event)" color="#34D399" />
        </view>
      </view>
    </view>

    <!-- 录音设置 -->
    <view class="section">
      <text class="section-title">录音设置</text>
      <view class="setting-group">
        <view class="setting-item">
          <text class="label">🎙️ 系统录音状态</text>
          <view class="recording-status">
            <view v-if="checkingRecording" class="checking-indicator">
              <text>检测中...</text>
            </view>
            <template v-else>
              <view class="status-dot" :class="recordingEnabled ? 'enabled' : 'disabled'"></view>
              <text class="value" :class="recordingEnabled ? 'enabled' : 'disabled'">
                {{ recordingEnabled ? '已开启' : '未开启' }}
              </text>
              <button class="btn-mini-refresh" @tap="handleRefreshRecordingStatus">
                刷新
              </button>
            </template>
          </view>
        </view>
        <view class="setting-item clickable" @tap="openRecordingSettings">
          <text class="label">⚙️ 开启系统录音</text>
          <text class="value">去设置</text>
          <text class="arrow">›</text>
        </view>
        <view class="setting-item" @tap="handleAutoUploadToggle">
          <text class="label">📤 自动上传录音</text>
          <view class="upload-status">
            <text v-if="callSettings.autoUploadRecording" class="lock-icon">🔒</text>
            <switch
              :checked="callSettings.autoUploadRecording"
              color="#34D399"
              :disabled="true"
            />
          </view>
        </view>
        <view class="setting-item clickable" v-if="callSettings.autoUploadRecording" @tap="showChangePassword">
          <text class="label">🔑 修改上传密码</text>
          <text class="value">点击修改</text>
          <text class="arrow">›</text>
        </view>
        <!-- 🔥 录音清理设置 -->
        <view class="setting-item">
          <text class="label">🗑️ 自动清理录音</text>
          <switch :checked="callSettings.autoCleanRecording" @change="updateSetting('autoCleanRecording', $event)" color="#34D399" />
        </view>
        <view class="setting-item" v-if="callSettings.autoCleanRecording">
          <text class="label">📅 保留天数</text>
          <picker :value="retentionDaysIndex" :range="retentionDaysOptions" @change="handleRetentionDaysChange">
            <text class="value picker-value">{{ callSettings.recordingRetentionDays || 3 }} 天</text>
          </picker>
        </view>
        <view class="setting-item clickable" @tap="handleManualCleanup">
          <text class="label">🧹 立即清理录音</text>
          <text class="value">{{ recordingStats.totalCount }} 个文件，{{ formatFileSize(recordingStats.totalSize) }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
      <view class="setting-tip">
        <text>💡 提示：开启手机系统的通话录音功能后，APP会自动扫描并上传录音文件。自动上传功能受密码保护，关闭需要输入密码或回答安全问题。开启自动清理后，超过保留天数的本地录音文件将被自动删除以节省存储空间。</text>
      </view>
    </view>

    <!-- 其他设置 -->
    <view class="section">
      <text class="section-title">其他设置</text>
      <view class="setting-group">
        <view class="setting-item clickable" @tap="goToServerConfig">
          <text class="label">🌐 服务器设置</text>
          <text class="value">{{ serverStore.displayUrl }}</text>
          <text class="arrow">›</text>
        </view>
        <view class="setting-item clickable" @tap="goToAbout">
          <text class="label">ℹ️ 关于</text>
          <text class="value">v1.0.0</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <button class="btn-unbind" @tap="handleUnbind" v-if="userStore.isBound">
        🔓 解绑设备
      </button>
      <button class="btn-logout" @tap="handleLogout">
        🚪 退出登录
      </button>
    </view>

    <!-- 密码设置弹窗 -->
    <view class="modal-overlay" v-if="showPasswordModal" @tap="closePasswordModal">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">{{ passwordModalTitle }}</text>

        <!-- 设置密码 -->
        <template v-if="passwordModalType === 'setup'">
          <text class="modal-desc">请设置4位数字密码，用于保护自动上传功能</text>
          <view class="password-input-group">
            <input
              type="number"
              v-model="newPassword"
              placeholder="请输入4位密码"
              maxlength="4"
              class="password-input"
            />
          </view>
          <view class="password-input-group">
            <input
              type="number"
              v-model="confirmPassword"
              placeholder="请确认密码"
              maxlength="4"
              class="password-input"
            />
          </view>
          <text class="modal-desc">设置安全问题（忘记密码时使用）</text>
          <view class="security-question">
            <text class="question-label">您的小学母校是？</text>
            <input
              type="text"
              v-model="securityAnswer"
              placeholder="请输入答案"
              class="answer-input"
            />
          </view>
        </template>

        <!-- 验证密码（关闭时） -->
        <template v-if="passwordModalType === 'verify'">
          <text class="modal-desc">请输入密码以关闭自动上传功能</text>
          <view class="password-input-group">
            <input
              type="number"
              v-model="inputPassword"
              placeholder="请输入4位密码"
              maxlength="4"
              class="password-input"
            />
          </view>
          <view class="forgot-password" @tap="showSecurityQuestion">
            <text>忘记密码？</text>
          </view>
        </template>

        <!-- 安全问题验证 -->
        <template v-if="passwordModalType === 'security'">
          <text class="modal-desc">请回答安全问题以重置密码</text>
          <view class="security-question">
            <text class="question-label">您的小学母校是？</text>
            <input
              type="text"
              v-model="inputSecurityAnswer"
              placeholder="请输入答案"
              class="answer-input"
            />
          </view>
        </template>

        <!-- 修改密码 -->
        <template v-if="passwordModalType === 'change'">
          <text class="modal-desc">请先输入当前密码</text>
          <view class="password-input-group">
            <input
              type="number"
              v-model="inputPassword"
              placeholder="当前密码"
              maxlength="4"
              class="password-input"
            />
          </view>
          <text class="modal-desc">设置新密码</text>
          <view class="password-input-group">
            <input
              type="number"
              v-model="newPassword"
              placeholder="新密码"
              maxlength="4"
              class="password-input"
            />
          </view>
          <view class="password-input-group">
            <input
              type="number"
              v-model="confirmPassword"
              placeholder="确认新密码"
              maxlength="4"
              class="password-input"
            />
          </view>
        </template>

        <view class="modal-buttons">
          <button class="btn-cancel" @tap="closePasswordModal">取消</button>
          <button class="btn-confirm" @tap="handlePasswordConfirm">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useServerStore } from '@/stores/server'
import { unbindDevice } from '@/api/auth'
import { wsService } from '@/services/websocket'
import { recordingService } from '@/services/recordingService'

const userStore = useUserStore()
const serverStore = useServerStore()

// 录音状态
const recordingEnabled = ref(false)
const checkingRecording = ref(false)
let autoCheckTimer: number | null = null

// 通话设置 - 从本地存储恢复
const callSettings = ref({
  callNotify: true,
  vibrate: false,
  autoUploadRecording: false,
  autoCleanRecording: false,
  recordingRetentionDays: 3
})

// 🔥 录音清理相关
const retentionDaysOptions = ['1', '2', '3', '5', '7', '14', '30']
const retentionDaysIndex = computed(() => {
  const days = String(callSettings.value.recordingRetentionDays || 3)
  const index = retentionDaysOptions.indexOf(days)
  return index >= 0 ? index : 2 // 默认3天
})
const recordingStats = ref({
  totalCount: 0,
  totalSize: 0,
  oldestDate: null as number | null,
  newestDate: null as number | null
})

// 密码相关
const showPasswordModal = ref(false)
const passwordModalType = ref<'setup' | 'verify' | 'security' | 'change'>('setup')
const passwordModalTitle = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const inputPassword = ref('')
const securityAnswer = ref('')
const inputSecurityAnswer = ref('')

// 存储的密码和安全问题答案
const storedPassword = ref('')
const storedSecurityAnswer = ref('')

// WebSocket 连接状态
const wsConnected = ref(false)

// 连接状态
const connectionStatus = computed(() => {
  if (!userStore.isBound) return 'unbound'
  if (wsConnected.value) return 'connected'
  return 'disconnected'
})

const connectionText = computed(() => {
  if (!userStore.isBound) return '未绑定'
  if (wsConnected.value) return '已连接'
  return '未连接'
})

// 加载设置
const loadSettings = () => {
  try {
    const saved = uni.getStorageSync('callSettings')
    if (saved) {
      callSettings.value = { ...callSettings.value, ...JSON.parse(saved) }
    }
    // 加载密码设置
    const passwordData = uni.getStorageSync('uploadPasswordData')
    if (passwordData) {
      const data = JSON.parse(passwordData)
      storedPassword.value = data.password || ''
      storedSecurityAnswer.value = data.securityAnswer || ''
    }
  } catch (e) {
    console.error('加载设置失败:', e)
  }
}

// 保存设置
const saveSettings = () => {
  try {
    uni.setStorageSync('callSettings', JSON.stringify(callSettings.value))
  } catch (e) {
    console.error('保存设置失败:', e)
  }
}

// 保存密码数据
const savePasswordData = () => {
  try {
    uni.setStorageSync('uploadPasswordData', JSON.stringify({
      password: storedPassword.value,
      securityAnswer: storedSecurityAnswer.value
    }))
  } catch (e) {
    console.error('保存密码失败:', e)
  }
}

// 更新单个设置
const updateSetting = (key: string, event: any) => {
  (callSettings.value as any)[key] = event.detail.value
  saveSettings()
}

// 处理自动上传开关点击
const handleAutoUploadToggle = () => {
  if (callSettings.value.autoUploadRecording) {
    // 当前是开启状态，需要验证密码才能关闭
    passwordModalType.value = 'verify'
    passwordModalTitle.value = '关闭自动上传'
    inputPassword.value = ''
    showPasswordModal.value = true
  } else {
    // 当前是关闭状态，需要设置密码才能开启
    passwordModalType.value = 'setup'
    passwordModalTitle.value = '开启自动上传'
    newPassword.value = ''
    confirmPassword.value = ''
    securityAnswer.value = ''
    showPasswordModal.value = true
  }
}

// 显示修改密码弹窗
const showChangePassword = () => {
  passwordModalType.value = 'change'
  passwordModalTitle.value = '修改密码'
  inputPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showPasswordModal.value = true
}

// 显示安全问题
const showSecurityQuestion = () => {
  passwordModalType.value = 'security'
  passwordModalTitle.value = '忘记密码'
  inputSecurityAnswer.value = ''
}

// 关闭密码弹窗
const closePasswordModal = () => {
  showPasswordModal.value = false
  newPassword.value = ''
  confirmPassword.value = ''
  inputPassword.value = ''
  securityAnswer.value = ''
  inputSecurityAnswer.value = ''
}

// 处理密码确认
const handlePasswordConfirm = () => {
  if (passwordModalType.value === 'setup') {
    // 设置密码
    if (newPassword.value.length !== 4) {
      uni.showToast({ title: '请输入4位密码', icon: 'none' })
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      uni.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
    if (!securityAnswer.value.trim()) {
      uni.showToast({ title: '请输入安全问题答案', icon: 'none' })
      return
    }

    // 保存密码和安全问题
    storedPassword.value = newPassword.value
    storedSecurityAnswer.value = securityAnswer.value.trim()
    savePasswordData()

    // 开启自动上传
    callSettings.value.autoUploadRecording = true
    saveSettings()

    closePasswordModal()
    uni.showToast({ title: '已开启自动上传', icon: 'success' })
  } else if (passwordModalType.value === 'verify') {
    // 验证密码
    if (inputPassword.value === storedPassword.value) {
      // 密码正确，关闭自动上传
      callSettings.value.autoUploadRecording = false
      saveSettings()
      closePasswordModal()
      uni.showToast({ title: '已关闭自动上传', icon: 'success' })
    } else {
      uni.showToast({ title: '密码错误', icon: 'none' })
    }
  } else if (passwordModalType.value === 'security') {
    // 验证安全问题
    if (inputSecurityAnswer.value.trim() === storedSecurityAnswer.value) {
      // 答案正确，关闭自动上传
      callSettings.value.autoUploadRecording = false
      saveSettings()
      closePasswordModal()
      uni.showToast({ title: '验证成功，已关闭自动上传', icon: 'success' })
    } else {
      uni.showToast({ title: '答案错误', icon: 'none' })
    }
  } else if (passwordModalType.value === 'change') {
    // 修改密码
    if (inputPassword.value !== storedPassword.value) {
      uni.showToast({ title: '当前密码错误', icon: 'none' })
      return
    }
    if (newPassword.value.length !== 4) {
      uni.showToast({ title: '请输入4位新密码', icon: 'none' })
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      uni.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }

    storedPassword.value = newPassword.value
    savePasswordData()
    closePasswordModal()
    uni.showToast({ title: '密码修改成功', icon: 'success' })
  }
}

// 自动检测录音状态
const autoCheckRecordingStatus = async () => {
  if (checkingRecording.value) return

  checkingRecording.value = true
  try {
    const hasPermission = await recordingService.checkPermissions()
    if (hasPermission) {
      const enabled = await recordingService.checkRecordingEnabled()
      recordingEnabled.value = enabled

      // 🔥 同时更新录音统计
      const stats = await recordingService.getRecordingStats()
      recordingStats.value = stats
    }
  } catch (e) {
    console.error('自动检测录音状态失败:', e)
  } finally {
    checkingRecording.value = false
  }
}

// 🔥 处理保留天数变更
const handleRetentionDaysChange = (e: any) => {
  const days = parseInt(retentionDaysOptions[e.detail.value])
  callSettings.value.recordingRetentionDays = days
  saveSettings()
}

// 🔥 手动清理录音
const handleManualCleanup = async () => {
  uni.showModal({
    title: '清理录音文件',
    content: `确定要清理 ${callSettings.value.recordingRetentionDays || 3} 天前的本地录音文件吗？\n\n已上传到服务器的录音不受影响。`,
    confirmText: '确定清理',
    confirmColor: '#EF4444',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '清理中...' })
        try {
          const result = await recordingService.cleanupExpiredRecordings(callSettings.value.recordingRetentionDays || 3)
          uni.hideLoading()

          if (result.success) {
            const freedMB = (result.freedSpace / 1024 / 1024).toFixed(2)
            uni.showModal({
              title: '清理完成',
              content: `已删除 ${result.deletedCount} 个录音文件\n释放空间: ${freedMB} MB`,
              showCancel: false
            })

            // 更新统计
            const stats = await recordingService.getRecordingStats()
            recordingStats.value = stats
          } else {
            uni.showToast({ title: '清理失败', icon: 'none' })
          }
        } catch (e) {
          uni.hideLoading()
          console.error('清理录音失败:', e)
          uni.showToast({ title: '清理失败', icon: 'none' })
        }
      }
    }
  })
}

// 🔥 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 🔥 手动刷新录音状态
const handleRefreshRecordingStatus = async () => {
  uni.showLoading({ title: '检测中...' })
  try {
    const hasPermission = await recordingService.checkPermissions()
    if (!hasPermission) {
      uni.hideLoading()
      uni.showModal({
        title: '权限不足',
        content: '请先授予APP存储权限，才能检测录音文件',
        confirmText: '去授权',
        success: (res) => {
          if (res.confirm) {
            // #ifdef APP-PLUS
            plus.runtime.openURL('app-settings:')
            // #endif
          }
        }
      })
      return
    }

    const enabled = await recordingService.checkRecordingEnabled()
    recordingEnabled.value = enabled
    uni.hideLoading()

    if (enabled) {
      uni.showToast({ title: '系统录音已开启', icon: 'success' })
    } else {
      uni.showModal({
        title: '系统录音未开启',
        content: '未检测到系统录音功能，请点击"去设置"开启手机的通话录音功能',
        showCancel: false,
        confirmText: '我知道了'
      })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('检测录音状态失败:', e)
    uni.showToast({ title: '检测失败', icon: 'none' })
  }
}

// 重新连接
const handleReconnect = () => {
  if (userStore.wsToken) {
    wsService.disconnect()
    setTimeout(() => {
      wsService.connect()
      uni.showToast({ title: '正在重连...', icon: 'none' })
    }, 500)
  } else {
    uni.showModal({
      title: '需要重新绑定',
      content: '连接凭证已失效，需要重新扫码绑定设备',
      confirmText: '去扫码',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/scan/index' })
        }
      }
    })
  }
}

// 页面显示时恢复状态
onShow(() => {
  if (!userStore.token) {
    userStore.restore()
  }
  wsConnected.value = wsService.isConnected
  // 自动检测录音状态
  autoCheckRecordingStatus()
})

onMounted(() => {
  loadSettings()
  // 监听 WebSocket 状态
  uni.$on('ws:connected', () => { wsConnected.value = true })
  uni.$on('ws:disconnected', () => { wsConnected.value = false })

  // 启动定时自动检测（每30秒检测一次）
  autoCheckTimer = setInterval(() => {
    autoCheckRecordingStatus()
  }, 30000) as unknown as number

  // 🔥 检查是否需要自动清理录音（每天检查一次）
  checkAndAutoCleanRecordings()
})

// 🔥 检查并自动清理录音
const checkAndAutoCleanRecordings = async () => {
  if (!callSettings.value.autoCleanRecording) return

  try {
    // 检查上次清理时间
    const lastCleanup = uni.getStorageSync('lastRecordingCleanup')
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    if (!lastCleanup || (now - parseInt(lastCleanup)) > oneDayMs) {
      console.log('[Settings] 执行自动录音清理')
      const result = await recordingService.cleanupExpiredRecordings(callSettings.value.recordingRetentionDays || 3)

      if (result.deletedCount > 0) {
        console.log(`[Settings] 自动清理完成: 删除 ${result.deletedCount} 个文件`)
      }

      // 记录清理时间
      uni.setStorageSync('lastRecordingCleanup', String(now))
    }
  } catch (e) {
    console.error('[Settings] 自动清理录音失败:', e)
  }
}

onUnmounted(() => {
  uni.$off('ws:connected')
  uni.$off('ws:disconnected')
  if (autoCheckTimer) {
    clearInterval(autoCheckTimer)
    autoCheckTimer = null
  }
})

// 服务器设置
const goToServerConfig = () => {
  uni.navigateTo({ url: '/pages/server-config/index' })
}

// 打开录音设置
const openRecordingSettings = async () => {
  // #ifdef APP-PLUS
  uni.showLoading({ title: '正在打开设置...' })

  try {
    const success = await recordingService.tryEnableSystemRecording()
    uni.hideLoading()

    // 获取设备品牌用于显示针对性提示
    const brand = recordingService.getDeviceBrand()
    let tipContent = ''

    if (brand.includes('xiaomi') || brand.includes('redmi')) {
      tipContent = '请在打开的页面中找到：\n通话录音 > 自动录音 > 开启'
    } else if (brand.includes('huawei') || brand.includes('honor')) {
      tipContent = '请在打开的页面中找到：\n通话自动录音 > 开启'
    } else if (brand.includes('oppo') || brand.includes('realme')) {
      tipContent = '请在打开的页面中找到：\n通话录音 > 自动录音 > 开启'
    } else if (brand.includes('vivo') || brand.includes('iqoo')) {
      tipContent = '请在打开的页面中找到：\n通话录音 > 自动录音 > 开启'
    } else {
      tipContent = '请在打开的页面中找到"通话录音"或"自动录音"选项并开启'
    }

    if (success) {
      // 成功跳转，显示操作提示
      uni.showModal({
        title: '开启通话录音',
        content: tipContent,
        showCancel: false,
        confirmText: '我知道了'
      })
    } else {
      // 跳转失败，显示手动设置指引
      let guide = '请手动进入手机设置开启通话录音功能：\n\n'

      if (brand.includes('xiaomi') || brand.includes('redmi')) {
        guide += '小米/红米手机：\n设置 > 应用设置 > 系统应用设置 > 电话 > 通话录音 > 自动录音'
      } else if (brand.includes('huawei') || brand.includes('honor')) {
        guide += '华为/荣耀手机：\n电话 > 更多 > 设置 > 通话自动录音'
      } else if (brand.includes('oppo') || brand.includes('realme')) {
        guide += 'OPPO/Realme手机：\n电话 > 设置 > 通话录音 > 自动录音'
      } else if (brand.includes('vivo') || brand.includes('iqoo')) {
        guide += 'VIVO/iQOO手机：\n电话 > 设置 > 通话录音 > 自动录音'
      } else {
        guide += '通用设置路径：\n电话/拨号 > 设置 > 通话录音 > 自动录音\n\n或在系统设置中搜索"通话录音"'
      }

      uni.showModal({
        title: '开启通话录音',
        content: guide,
        showCancel: false,
        confirmText: '我知道了'
      })
    }
  } catch (e) {
    uni.hideLoading()
    console.error('打开录音设置失败:', e)
    uni.showToast({ title: '打开设置失败', icon: 'none' })
  }
  // #endif

  // #ifndef APP-PLUS
  // 非 APP 环境显示提示
  uni.showModal({
    title: '提示',
    content: '此功能需要在手机APP中使用。\n\n请在真机上安装APP后，进入设置页面开启系统录音功能。',
    showCancel: false,
    confirmText: '我知道了'
  })
  // #endif
}

// 跳转到关于页面
const goToAbout = () => {
  uni.navigateTo({ url: '/pages/about/index' })
}

// 解绑设备
const handleUnbind = () => {
  uni.showModal({
    title: '确认解绑',
    content: '解绑后将无法接收PC端拨号指令，确定要解绑吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '解绑中...' })
        try {
          wsService.disconnect()
          await unbindDevice(userStore.deviceInfo?.deviceId)
          userStore.clearDeviceInfo()
          uni.hideLoading()
          uni.showToast({ title: '解绑成功', icon: 'success' })
        } catch (e: any) {
          uni.hideLoading()
          console.error('解绑失败:', e)
          userStore.clearDeviceInfo()
          uni.showToast({ title: '已解绑', icon: 'success' })
        }
      }
    }
  })
}

// 退出登录
const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        wsService.send('DEVICE_OFFLINE', {
          deviceId: userStore.deviceInfo?.deviceId,
          reason: 'logout'
        })
        wsService.disconnect()
        uni.removeStorageSync('currentCall')
        // 注意：不清除 callSettings 和 uploadPasswordData
        // 这样管理员设置的自动上传和密码会保留
        // 防止员工通过退出登录来绑过密码保护
        userStore.logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 180rpx;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;

  .user-section {
    display: flex;
    align-items: center;
    background: #fff;
    padding: 40rpx 32rpx;
    margin-bottom: 24rpx;

    .avatar {
      width: 100rpx;
      height: 100rpx;
      background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 24rpx;

      text {
        font-size: 44rpx;
        color: #fff;
        font-weight: bold;
      }
    }

    .info {
      .name {
        font-size: 36rpx;
        font-weight: 600;
        color: #1F2937;
        display: block;
      }

      .dept {
        font-size: 26rpx;
        color: #6B7280;
        margin-top: 8rpx;
        display: block;
      }
    }
  }

  .section {
    margin-bottom: 24rpx;

    .section-title {
      font-size: 26rpx;
      color: #6B7280;
      padding: 0 32rpx;
      margin-bottom: 12rpx;
      display: block;
    }
  }

  .setting-group {
    background: #fff;

    .setting-item {
      display: flex;
      align-items: center;
      padding: 28rpx 32rpx;
      border-bottom: 1rpx solid #F3F4F6;

      &:last-child {
        border-bottom: none;
      }

      &.clickable {
        &:active {
          background: #F9FAFB;
        }
      }

      .label {
        font-size: 30rpx;
        color: #1F2937;
        flex: 1;
      }

      .value {
        font-size: 28rpx;
        color: #6B7280;

        &.bound, &.connected, &.enabled {
          color: #10B981;
        }

        &.disconnected {
          color: #EF4444;
        }

        &.unbound, &.disabled {
          color: #F59E0B;
        }
      }

      .arrow {
        font-size: 32rpx;
        color: #D1D5DB;
        margin-left: 12rpx;
      }

      .picker-value {
        color: #3B82F6;
        text-decoration: underline;
      }

      .connection-status, .recording-status {
        display: flex;
        align-items: center;

        .status-dot {
          width: 16rpx;
          height: 16rpx;
          border-radius: 50%;
          margin-right: 12rpx;

          &.connected, &.enabled {
            background: #10B981;
          }

          &.disconnected, &.disabled {
            background: #F59E0B;
          }

          &.unbound {
            background: #9CA3AF;
          }
        }

        .btn-mini-reconnect {
          margin-left: 16rpx;
          padding: 8rpx 20rpx;
          font-size: 24rpx;
          color: #34D399;
          background: rgba(52, 211, 153, 0.1);
          border: 1rpx solid #34D399;
          border-radius: 24rpx;
          line-height: 1.2;
        }

        .btn-mini-refresh {
          margin-left: 16rpx;
          padding: 8rpx 20rpx;
          font-size: 24rpx;
          color: #3B82F6;
          background: rgba(59, 130, 246, 0.1);
          border: 1rpx solid #3B82F6;
          border-radius: 24rpx;
          line-height: 1.2;
        }

        .checking-indicator {
          text {
            font-size: 26rpx;
            color: #6B7280;
          }
        }
      }

      .upload-status {
        display: flex;
        align-items: center;

        .lock-icon {
          font-size: 28rpx;
          margin-right: 12rpx;
        }
      }
    }
  }

  .setting-tip {
    padding: 16rpx 32rpx;

    text {
      font-size: 24rpx;
      color: #6B7280;
      line-height: 1.6;
    }
  }

  .actions {
    padding: 48rpx 32rpx;

    button {
      width: 100%;
      height: 88rpx;
      border-radius: 16rpx;
      font-size: 30rpx;
      margin-bottom: 24rpx;
      border: none;

      &.btn-unbind {
        background: #fff;
        color: #F59E0B;
        border: 2rpx solid #F59E0B;
      }

      &.btn-logout {
        background: #fff;
        color: #EF4444;
        border: 2rpx solid #EF4444;
      }
    }
  }
}

// 密码弹窗样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 85%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;

  .modal-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #1F2937;
    text-align: center;
    display: block;
    margin-bottom: 24rpx;
  }

  .modal-desc {
    font-size: 28rpx;
    color: #6B7280;
    display: block;
    margin-bottom: 20rpx;
  }

  .password-input-group {
    margin-bottom: 20rpx;

    .password-input {
      width: 100%;
      height: 88rpx;
      background: #F3F4F6;
      border-radius: 12rpx;
      padding: 0 24rpx;
      font-size: 32rpx;
      text-align: center;
      letter-spacing: 16rpx;
      box-sizing: border-box;
    }
  }

  .security-question {
    margin-bottom: 24rpx;

    .question-label {
      font-size: 28rpx;
      color: #1F2937;
      display: block;
      margin-bottom: 12rpx;
    }

    .answer-input {
      width: 100%;
      height: 88rpx;
      background: #F3F4F6;
      border-radius: 12rpx;
      padding: 0 24rpx;
      font-size: 28rpx;
      box-sizing: border-box;
    }
  }

  .forgot-password {
    text-align: right;
    margin-bottom: 24rpx;

    text {
      font-size: 26rpx;
      color: #3B82F6;
    }
  }

  .modal-buttons {
    display: flex;
    gap: 24rpx;
    margin-top: 32rpx;

    button {
      flex: 1;
      height: 88rpx;
      border-radius: 16rpx;
      font-size: 30rpx;
      border: none;

      &.btn-cancel {
        background: #F3F4F6;
        color: #6B7280;
      }

      &.btn-confirm {
        background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
        color: #fff;
      }
    }
  }
}
</style>
