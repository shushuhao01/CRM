<template>
  <view class="home-page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-card-main">
        <view class="user-left">
          <view class="avatar">{{ userStore.userInfo?.realName?.charAt(0) || '?' }}</view>
          <view class="info">
            <text class="name">{{ userStore.userInfo?.realName || '未登录' }}</text>
            <text class="dept">{{ userStore.userInfo?.department || '' }}</text>
          </view>
        </view>
        <!-- 重连按钮在右侧 -->
        <view class="user-right" v-if="userStore.isBound && !wsConnected">
          <view class="reconnect-btn" @tap="handleReconnect">
            <view class="reconnect-icon-wrap">
              <text class="reconnect-svg">↺</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 状态信息在下方 -->
      <view class="user-card-footer">
        <view class="status-tag" :class="{ active: userStore.isBound }">
          <text class="status-icon">📱</text>
          <text class="status-label">{{ userStore.isBound ? '已绑定' : '未绑定' }}</text>
        </view>
        <view class="status-tag" :class="connectionStatus">
          <text class="status-icon">📡</text>
          <text class="status-label">{{ connectionText }}</text>
        </view>
      </view>
    </view>

    <!-- 权限状态卡片 -->
    <!-- #ifdef APP-PLUS -->
    <view class="perm-card" v-if="userStore.isLoggedIn">
      <view class="perm-header" @tap="permExpanded = !permExpanded">
        <view class="perm-header-left">
          <view class="perm-status-badge" :class="allPermissionsOk ? 'ok' : 'warn'">
            <text class="perm-badge-symbol">{{ allPermissionsOk ? '✓' : '!' }}</text>
          </view>
          <text class="perm-header-title">{{ allPermissionsOk ? '权限就绪，来电检测正常' : '部分权限未授权，来电检测受限' }}</text>
        </view>
        <view class="perm-header-right">
          <view class="perm-refresh-btn" :class="{ spinning: permScanning }" @tap.stop="handleRefreshPermissions">
            <text class="perm-refresh-icon">↻</text>
          </view>
          <text class="perm-expand-arrow">{{ permExpanded ? '▲' : '▼' }}</text>
        </view>
      </view>
      <view class="perm-list" v-if="permExpanded">
        <view
          class="perm-item"
          :class="{ clickable: !p.granted || p.special }"
          v-for="p in permissionList"
          :key="p.key"
          @tap="handlePermItemTap(p)"
          @longpress="!p.special && !p.granted ? handleManualConfirm(p) : null"
        >
          <text class="perm-status-dot" :class="p.granted ? 'granted' : 'denied'">●</text>
          <view class="perm-info">
            <text class="perm-name">{{ p.name }}</text>
            <text class="perm-purpose">{{ p.purpose }}</text>
          </view>
          <text v-if="p.special" class="perm-special-text" :class="{ 'special-ok': p.granted }">{{ p.statusText }}</text>
          <text v-else-if="p.granted" class="perm-granted-text">已授权</text>
          <text v-else class="perm-action-text">{{ p.actionText }}</text>
        </view>
        <view class="perm-tip" v-if="!allPermissionsOk">
          <text class="perm-tip-text">点击授权 · 如已授权但检测不到，长按可手动确认</text>
        </view>
      </view>
    </view>
    <!-- #endif -->

    <!-- 今日概览 -->
    <view class="section">
      <text class="section-title">今日概览</text>
      <view class="stats-card">
        <view class="stat-main">
          <text class="stat-number">{{ todayStats.totalCalls }}</text>
          <text class="stat-label">总通话</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-grid">
          <view class="stat-item">
            <text class="stat-value success">{{ todayStats.connectedCalls }}</text>
            <text class="stat-name">已接通</text>
          </view>
          <view class="stat-item">
            <text class="stat-value danger">{{ todayStats.missedCalls }}</text>
            <text class="stat-name">未接通</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ formatDuration(todayStats.totalDuration) }}</text>
            <text class="stat-name">总时长</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ todayStats.connectRate }}%</text>
            <text class="stat-name">接通率</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="section">
      <text class="section-title">快捷操作</text>
      <view class="quick-actions">
        <view class="action-item" @tap="handleScanBind" v-if="!userStore.isBound">
          <view class="action-icon scan">
            <view class="icon-inner">
              <view class="qi-scan">
                <view class="qi-scan-corner tl"></view>
                <view class="qi-scan-corner tr"></view>
                <view class="qi-scan-corner bl"></view>
                <view class="qi-scan-corner br"></view>
                <view class="qi-scan-line"></view>
              </view>
            </view>
          </view>
          <text class="action-text">扫码绑定</text>
        </view>
        <view class="action-item" @tap="handleDial">
          <view class="action-icon dial">
            <view class="icon-inner">
              <view class="qi-dial">
                <view class="qi-dial-dot" v-for="i in 9" :key="i"></view>
              </view>
            </view>
          </view>
          <text class="action-text">手动拨号</text>
        </view>
        <view class="action-item" @tap="handleRefresh">
          <view class="action-icon refresh">
            <view class="icon-inner">
              <text class="qi-refresh">↻</text>
            </view>
          </view>
          <text class="action-text">刷新数据</text>
        </view>
      </view>
    </view>

    <!-- 等待指令提示 -->
    <view class="waiting-card" v-if="userStore.isBound && wsConnected">
      <view class="waiting-animation">
        <view class="pulse-ring"></view>
        <view class="pulse-ring delay"></view>
        <view class="waiting-icon-inner">📡</view>
      </view>
      <text class="waiting-text">等待PC端拨号指令...</text>
      <text class="waiting-sub">保持APP在前台运行</text>
    </view>

    <!-- 未绑定提示 -->
    <view class="bind-card" v-else-if="!userStore.isBound">
      <view class="bind-icon">🔗</view>
      <text class="bind-title">设备未绑定</text>
      <text class="bind-desc">请在PC端生成二维码，然后扫码绑定设备</text>
      <button class="btn-bind" @tap="handleScanBind">扫码绑定设备</button>
    </view>

    <!-- 已绑定但未连接 -->
    <view class="bind-card" v-else>
      <view class="bind-icon">⚠️</view>
      <text class="bind-title">连接已断开</text>
      <text class="bind-desc">请点击重新连接或重新扫码绑定</text>
      <view class="bind-actions">
        <button class="btn-action primary" @tap="handleReconnect">重新连接</button>
        <button class="btn-action secondary" @tap="handleScanBind">重新扫码绑定</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useServerStore } from '@/stores/server'
import { getTodayStats, type TodayStats } from '@/api/call'
import { wsService } from '@/services/websocket'
import { callStateService } from '@/services/callStateService'
import { incomingCallService } from '@/services/incomingCallService'

const userStore = useUserStore()
const serverStore = useServerStore()
const wsConnected = ref(false)
const permExpanded = ref(false)
const permScanning = ref(false)

// 各权限的真实系统状态
const permPhoneState = ref(false)
const permCallLog = ref(false)
const permOverlay = ref(false)
const permMicrophone = ref(false)
const permNotification = ref(false)
const permAutoRecording = ref<boolean | null>(null) // null=检测中

// 手动确认覆盖（兜底方案）
const manualOverrides = ref<Record<string, boolean>>({})
const loadManualOverrides = () => {
  try {
    const raw = uni.getStorageSync('permManualOverrides')
    if (raw) manualOverrides.value = JSON.parse(raw)
  } catch (_e) { /* ignore */ }
}
const saveManualOverrides = () => {
  uni.setStorageSync('permManualOverrides', JSON.stringify(manualOverrides.value))
}
loadManualOverrides()

const allPermissionsOk = computed(() =>
  permPhoneState.value && permCallLog.value && permOverlay.value
)

// 综合判断：系统检测 或 手动确认
const isGranted = (key: string, detected: boolean) => detected || !!manualOverrides.value[key]

const permissionList = computed(() => [
  {
    key: 'phone',
    name: '电话',
    purpose: '检测来电状态',
    granted: isGranted('phone', permPhoneState.value),
    special: false,
    actionText: '授权',
    statusText: '',
    action: () => requestSinglePermission('android.permission.READ_PHONE_STATE')
  },
  {
    key: 'calllog',
    name: '通话记录',
    purpose: '获取来电号码、补录未接来电',
    granted: isGranted('calllog', permCallLog.value),
    special: false,
    actionText: '授权',
    statusText: '',
    action: () => requestSinglePermission('android.permission.READ_CALL_LOG')
  },
  {
    key: 'mic',
    name: '麦克风',
    purpose: '录音文件检测与上传',
    granted: isGranted('mic', permMicrophone.value),
    special: false,
    actionText: '授权',
    statusText: '',
    action: () => requestSinglePermission('android.permission.RECORD_AUDIO')
  },
  {
    key: 'overlay',
    name: '悬浮窗',
    purpose: '在其他应用上方弹出来电提醒',
    granted: isGranted('overlay', permOverlay.value),
    special: false,
    actionText: '去开启',
    statusText: '',
    action: handleGrantOverlay
  },
  {
    key: 'notification',
    name: '通知',
    purpose: '来电通知栏提醒',
    granted: isGranted('notification', permNotification.value),
    special: false,
    actionText: '去开启',
    statusText: '',
    action: () => incomingCallService.openAppPermissionSettings()
  },
  {
    key: 'autorecording',
    name: '通话自动录音',
    purpose: '系统级通话录音（非APP权限）',
    granted: permAutoRecording.value === true,
    special: true,
    actionText: '',
    statusText: permAutoRecording.value === null ? '检测中...' : (permAutoRecording.value ? '已开启' : '未开启'),
    action: handleOpenRecordingSetting
  }
])

/**
 * 从系统真实读取每个权限的授权状态
 */
const refreshPermissionStatus = () => {
  // #ifdef APP-PLUS
  if (!userStore.isLoggedIn) return
  try {
    const main = plus.android.runtimeMainActivity()

    // 实测方式：不靠 API 查询，直接尝试使用权限对应的功能
    // 能用 = 已授权，报 SecurityException = 未授权

    // 电话权限：尝试获取通话状态
    permPhoneState.value = testPhoneStatePerm(main)

    // 通话记录权限：尝试查询通话记录
    permCallLog.value = testCallLogPerm(main)

    // 麦克风权限：通过 requestPermissions 结果缓存 或 实际尝试
    permMicrophone.value = testMicrophonePerm(main)

    // 悬浮窗：特殊权限，Settings.canDrawOverlays 返回 boolean 没问题
    try {
      const Settings = plus.android.importClass('android.provider.Settings') as any
      permOverlay.value = !!Settings.canDrawOverlays(main)
    } catch (_e) {
      permOverlay.value = false
    }

    // 通知权限
    try {
      const Build = plus.android.importClass('android.os.Build') as any
      if (Build.VERSION.SDK_INT >= 33) {
        // Android 13+ 通知也通过实测
        const NotificationManager = plus.android.importClass('android.app.NotificationManager') as any
        const Context = plus.android.importClass('android.content.Context') as any
        const nm = (main as any).getSystemService(Context.NOTIFICATION_SERVICE)
        permNotification.value = !!nm.areNotificationsEnabled()
      } else {
        permNotification.value = true
      }
    } catch (_e) {
      permNotification.value = true
    }

    // 通话自动录音状态检测
    detectAutoRecording()

    // 有未授权的关键权限时自动展开
    if (!allPermissionsOk.value) {
      permExpanded.value = true
    }

    console.log('[Index] 权限实测结果:',
      'phone=' + permPhoneState.value,
      'calllog=' + permCallLog.value,
      'mic=' + permMicrophone.value,
      'overlay=' + permOverlay.value,
      'notification=' + permNotification.value)
  } catch (e) {
    console.warn('[Index] 权限状态检查失败:', e)
  }
  // #endif
}

// #ifdef APP-PLUS
/** 实测电话权限：尝试读取通话状态 */
const testPhoneStatePerm = (main: any): boolean => {
  try {
    const Context = plus.android.importClass('android.content.Context') as any
    const TelephonyManager = plus.android.importClass('android.telephony.TelephonyManager') as any
    const tm = (main as any).getSystemService(Context.TELEPHONY_SERVICE)
    tm.getCallState() // 如果没权限会抛 SecurityException
    return true
  } catch (e) {
    return false
  }
}

/** 实测通话记录权限：尝试查询通话记录 */
const testCallLogPerm = (main: any): boolean => {
  try {
    const CallLog = plus.android.importClass('android.provider.CallLog') as any
    const cr = (main as any).getContentResolver()
    const cursor = cr.query(
      CallLog.Calls.CONTENT_URI,
      ['_id'],
      null, null,
      'date DESC LIMIT 1'
    )
    if (cursor) {
      cursor.close()
    }
    // 没有抛异常说明有权限（即使结果为空）
    return true
  } catch (e) {
    const errMsg = String(e)
    if (errMsg.includes('SecurityException') || errMsg.includes('Permission') || errMsg.includes('permission')) {
      return false
    }
    // 其他异常（如 ContentResolver 调用问题）不代表没权限
    return true
  }
}

/** 实测麦克风权限：尝试创建录音器 */
const testMicrophonePerm = (main: any): boolean => {
  try {
    const AudioRecord = plus.android.importClass('android.media.AudioRecord') as any
    const AudioFormat = plus.android.importClass('android.media.AudioFormat') as any
    const MediaRecorder = plus.android.importClass('android.media.MediaRecorder') as any
    const sampleRate = 8000
    const bufSize = AudioRecord.getMinBufferSize(
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )
    if (Number(bufSize) <= 0) return true // 无法确定，假设有

    const recorder = new AudioRecord(
      MediaRecorder.AudioSource.MIC,
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      Number(bufSize)
    )
    const state = Number(recorder.getState())
    recorder.release()
    return state === 1 // AudioRecord.STATE_INITIALIZED
  } catch (e) {
    const errMsg = String(e)
    if (errMsg.includes('SecurityException') || errMsg.includes('Permission') || errMsg.includes('permission')) {
      return false
    }
    return true
  }
}
// #endif

/**
 * 检测系统通话自动录音是否开启
 */
const detectAutoRecording = () => {
  // #ifdef APP-PLUS
  permAutoRecording.value = null
  setTimeout(() => {
    try {
      const main = plus.android.runtimeMainActivity()
      const AudioManager = plus.android.importClass('android.media.AudioManager') as any
      const Context = plus.android.importClass('android.content.Context') as any
      const am = (main as any).getSystemService(Context.AUDIO_SERVICE)
      // 尝试多种方式检测
      let detected = false

      // 方式1: 检查系统属性 (部分厂商)
      try {
        const SystemProperties = plus.android.importClass('android.os.SystemProperties') as any
        if (SystemProperties) {
          const val = SystemProperties.get('persist.sys.call_recording', '')
          if (val === '1' || val === 'true') {
            detected = true
          }
        }
      } catch (_e) { /* 部分系统没有此属性 */ }

      // 方式2: 检查最近是否有通话录音文件生成
      if (!detected) {
        try {
          const Environment = plus.android.importClass('android.os.Environment') as any
          const File = plus.android.importClass('java.io.File') as any
          const extDir = Environment.getExternalStorageDirectory().getAbsolutePath()
          const recordPaths = [
            extDir + '/Recordings/Call',
            extDir + '/MIUI/sound_recorder/call_rec',
            extDir + '/Record/Call',
            extDir + '/Sounds/CallRecord',
            extDir + '/Music/Recordings/Call Recordings',
            extDir + '/PhoneRecord',
            extDir + '/call_rec',
          ]
          for (const p of recordPaths) {
            const dir = new File(p)
            if (dir.exists() && dir.isDirectory()) {
              const files = dir.listFiles()
              if (files && files.length > 0) {
                detected = true
                break
              }
            }
          }
        } catch (_e) { /* 存储访问可能失败 */ }
      }

      permAutoRecording.value = detected
    } catch (e) {
      console.warn('[Index] 录音状态检测失败:', e)
      permAutoRecording.value = false
    }
  }, 100)
  // #endif
}

/**
 * 权限项点击处理
 */
const handlePermItemTap = (p: any) => {
  if (p.special) {
    // 特殊项（通话自动录音），不管状态都可以点击
    p.action()
    return
  }
  if (p.granted) return // 已授权的不处理
  p.action()
}

/**
 * 单独申请某个权限（直接弹系统对话框，如果系统不弹则引导去设置）
 */
const requestSinglePermission = (permission: string) => {
  // #ifdef APP-PLUS
  plus.android.requestPermissions(
    [permission],
    (e: any) => {
      const granted = e.granted || []
      const deniedAlways = e.deniedAlways || []

      if (granted.length > 0) {
        uni.showToast({ title: '授权成功', icon: 'success' })
      } else if (deniedAlways.length > 0) {
        // 被永久拒绝，系统不会弹对话框，引导去设置
        uni.showModal({
          title: '需要手动开启',
          content: '该权限已被禁止，请在系统设置中手动开启',
          confirmText: '去设置',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              incomingCallService.openAppPermissionSettings()
            }
          }
        })
      }
      // 重新从系统读取真实状态
      setTimeout(() => refreshPermissionStatus(), 500)
    },
    (_e: any) => {
      setTimeout(() => refreshPermissionStatus(), 500)
    }
  )
  // #endif
}

/**
 * 长按手动确认已授权（兜底方案）
 */
const handleManualConfirm = (p: any) => {
  uni.showModal({
    title: '手动确认授权',
    content: `你确定已在系统设置中授予了「${p.name}」权限吗？\n\n确认后将标记为已授权。如果实际未授权，相关功能可能无法正常工作。`,
    confirmText: '确认已授权',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        manualOverrides.value[p.key] = true
        saveManualOverrides()
        uni.showToast({ title: '已手动确认', icon: 'success' })
      }
    }
  })
}

/**
 * 手动刷新按钮（带旋转动画）——同时清除手动覆盖，重新实测
 */
const handleRefreshPermissions = () => {
  if (permScanning.value) return
  permScanning.value = true
  // 清除手动覆盖，重新从系统实测
  manualOverrides.value = {}
  saveManualOverrides()
  refreshPermissionStatus()
  setTimeout(() => {
    permScanning.value = false
    uni.showToast({ title: '权限状态已刷新', icon: 'none', duration: 1500 })
  }, 800)
}

const handleGrantOverlay = () => {
  // #ifdef APP-PLUS
  try {
    const Intent = plus.android.importClass('android.content.Intent') as any
    const Settings = plus.android.importClass('android.provider.Settings') as any
    const Uri = plus.android.importClass('android.net.Uri') as any
    const main = plus.android.runtimeMainActivity()
    const intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
    intent.setData(Uri.parse('package:' + (main as any).getPackageName()))
    ;(main as any).startActivity(intent)
  } catch (_e) {
    incomingCallService.openAppPermissionSettings()
  }
  // #endif
}

const handleOpenRecordingSetting = () => {
  // #ifdef APP-PLUS
  uni.navigateTo({ url: '/pages/settings/index' })
  // #endif
}

const todayStats = ref<TodayStats>({
  totalCalls: 0,
  connectedCalls: 0,
  missedCalls: 0,
  inboundCalls: 0,
  outboundCalls: 0,
  totalDuration: 0,
  avgDuration: 0,
  connectRate: 0
})

const connectionStatus = computed(() => {
  if (wsConnected.value) return 'connected'
  if (serverStore.isConnected) return 'connecting'
  return 'disconnected'
})

const connectionText = computed(() => {
  if (wsConnected.value) return '已连接'
  if (serverStore.isConnected) return '连接中'
  return '未连接'
})

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const min = Math.floor(seconds / 60)
  return `${min}分`
}

const loadTodayStats = async () => {
  if (!userStore.token && !userStore.isLoggedIn) return
  try {
    const data = await getTodayStats()
    todayStats.value = data
  } catch (e: any) {
    if (!e.message?.includes('过期')) {
      console.error('加载统计失败:', e)
    }
  }
}

const handleScanBind = () => {
  uni.navigateTo({ url: '/pages/scan/index' })
}

const handleDial = () => {
  uni.navigateTo({ url: '/pages/dialpad/index' })
}

const handleRefresh = () => {
  loadTodayStats()
  uni.showToast({ title: '已刷新', icon: 'success' })
}

const handleReconnect = () => {
  if (userStore.wsToken) {
    uni.showToast({ title: '正在重连...', icon: 'none' })
    wsService.disconnect()
    setTimeout(() => {
      wsService.connect()
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

onMounted(() => {
  uni.$on('ws:connected', () => { wsConnected.value = true })
  uni.$on('ws:disconnected', () => { wsConnected.value = false })
  // 监听通话完成事件，刷新统计数据
  uni.$on('call:completed', () => {
    console.log('[Index] 收到通话完成事件，刷新统计数据')
    loadTodayStats()
  })
  // 监听需要重新绑定事件
  uni.$on('ws:need_rebind', (data: any) => {
    console.log('[Index] 收到需要重新绑定事件:', data)
    uni.showModal({
      title: '需要重新绑定',
      content: '连接凭证已失效或丢失，需要重新扫码绑定设备',
      confirmText: '去扫码',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/scan/index' })
        }
      }
    })
  })
})

onUnmounted(() => {
  uni.$off('ws:connected')
  uni.$off('ws:disconnected')
  uni.$off('call:completed')
  uni.$off('ws:need_rebind')
})

onShow(() => {
  userStore.restore()
  wsConnected.value = wsService.isConnected

  if (!userStore.token && !userStore.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }

  // 刷新权限状态（每次页面显示时检查，用户可能从设置页返回）
  refreshPermissionStatus()

  // 检查是否有未完成的通话需要填写跟进
  checkPendingCall()

  setTimeout(() => {
    loadTodayStats()
    // 只有在未连接时才尝试连接
    if (userStore.isBound && userStore.wsToken && !wsService.isConnected) {
      wsService.connect()
    }
  }, 200)
})

// 检查是否有未完成的通话
const checkPendingCall = () => {
  // 检查是否有刚结束的通话需要填写跟进
  const lastEndedCall = uni.getStorageSync('lastEndedCall')
  if (lastEndedCall && lastEndedCall.callId) {
    console.log('[Index] 发现未完成的通话记录:', lastEndedCall)

    // 清除记录
    uni.removeStorageSync('lastEndedCall')

    // 提示用户填写跟进
    uni.showModal({
      title: '通话已结束',
      content: `与${lastEndedCall.customerName || '客户'}的通话已结束，是否填写跟进记录？`,
      confirmText: '去填写',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({
            url: `/pages/call-ended/index?callId=${lastEndedCall.callId}&name=${encodeURIComponent(lastEndedCall.customerName || '')}&customerId=${lastEndedCall.customerId || ''}&duration=${lastEndedCall.duration || 0}&hasRecording=${lastEndedCall.hasRecording || false}`
          })
        }
      }
    })
  }

  // 检查是否有正在进行的通话（APP被切到后台后恢复）
  const currentCall = uni.getStorageSync('currentCall')
  if (currentCall && currentCall.callId) {
    // 检查通话状态服务是否还在监听
    if (!callStateService.isInCall()) {
      console.log('[Index] 发现未处理的通话记录，可能是APP被切到后台:', currentCall)

      // 计算通话时长
      const startTime = new Date(currentCall.startTime).getTime()
      const duration = Math.floor((Date.now() - startTime) / 1000)

      // 如果通话时间超过5分钟，可能是APP被切到后台后通话已结束
      if (duration > 300) {
        uni.removeStorageSync('currentCall')

        uni.showModal({
          title: '通话可能已结束',
          content: `与${currentCall.customerName || '客户'}的通话可能已结束，是否填写跟进记录？`,
          confirmText: '去填写',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: `/pages/call-ended/index?callId=${currentCall.callId}&name=${encodeURIComponent(currentCall.customerName || '')}&customerId=${currentCall.customerId || ''}&duration=${duration}&hasRecording=false`
              })
            }
          }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 200rpx;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.perm-card {
  background: #fff;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.perm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
}

.perm-header-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.perm-status-badge {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
  flex-shrink: 0;

  &.ok {
    background: #D1FAE5;
  }
  &.warn {
    background: #FEF3C7;
  }
}

.perm-badge-symbol {
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1;

  .ok & {
    color: #059669;
  }
  .warn & {
    color: #D97706;
  }
}

.perm-header-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.perm-header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.perm-refresh-btn {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #F3F4F6;
  margin-right: 24rpx;
  transition: background 0.2s;

  &:active {
    background: #E5E7EB;
  }

  &.spinning .perm-refresh-icon {
    animation: perm-spin 0.8s linear infinite;
  }
}

@keyframes perm-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.perm-refresh-icon {
  font-size: 30rpx;
  color: #6B7280;
}

.perm-expand-arrow {
  font-size: 22rpx;
  color: #999;
}

.perm-list {
  border-top: 1rpx solid #f0f0f0;
  padding: 8rpx 0;
}

.perm-item {
  display: flex;
  align-items: center;
  padding: 18rpx 28rpx;

  &.clickable:active {
    background: #F9FAFB;
  }
}

.perm-status-dot {
  font-size: 20rpx;
  margin-right: 16rpx;
  flex-shrink: 0;

  &.granted {
    color: #10B981;
  }
  &.denied {
    color: #EF4444;
  }
}

.perm-info {
  flex: 1;
  min-width: 0;
}

.perm-name {
  display: block;
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.perm-purpose {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 2rpx;
}

.perm-action-text {
  font-size: 24rpx;
  color: #3B82F6;
  font-weight: 600;
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  background: #EFF6FF;
  border-radius: 20rpx;
}

.perm-granted-text {
  font-size: 24rpx;
  color: #10B981;
  flex-shrink: 0;
}

.perm-special-text {
  font-size: 24rpx;
  color: #F59E0B;
  flex-shrink: 0;

  &.special-ok {
    color: #10B981;
  }
}

.perm-tip {
  padding: 12rpx 28rpx 16rpx;
  border-top: 1rpx solid #f5f5f5;
}

.perm-tip-text {
  font-size: 20rpx;
  color: #C0C0C0;
}

.user-card {
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  color: #fff;
}

.user-card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-left {
  display: flex;
  align-items: center;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  font-size: 36rpx;
  font-weight: bold;
}

.info .name {
  font-size: 36rpx;
  font-weight: 600;
  display: block;
}

.info .dept {
  font-size: 26rpx;
  opacity: 0.9;
  margin-top: 4rpx;
  display: block;
}

.user-right {
  display: flex;
  align-items: center;
}

.reconnect-btn {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(0.95);
  }

  .reconnect-icon-wrap {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reconnect-svg {
    font-size: 36rpx;
    color: #fff;
  }
}

.user-card-footer {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
  display: flex;
  gap: 40rpx;
}

.status-tag {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  padding: 10rpx 20rpx;
  border-radius: 20rpx;

  &.active, &.connected {
    background: rgba(255, 255, 255, 0.25);
  }

  &.disconnected {
    background: rgba(239, 68, 68, 0.3);
  }

  .status-icon {
    font-size: 24rpx;
    margin-right: 8rpx;
  }

  .status-label {
    font-size: 24rpx;
  }
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 16rpx;
  margin-left: 8rpx;
  display: block;
}

.stats-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.stat-main {
  text-align: center;
  padding-bottom: 24rpx;
}

.stat-number {
  font-size: 72rpx;
  font-weight: 700;
  color: #1F2937;
  display: block;
}

.stat-label {
  font-size: 26rpx;
  color: #6B7280;
  display: block;
}

.stat-divider {
  height: 1rpx;
  background: #f0f0f0;
  margin-bottom: 24rpx;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 600;
  color: #1F2937;
  display: block;

  &.success { color: #10B981; }
  &.danger { color: #EF4444; }
}

.stat-name {
  font-size: 22rpx;
  color: #6B7280;
  margin-top: 8rpx;
  display: block;
}

.quick-actions {
  display: flex;
  gap: 16rpx;
}

.action-item {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx 20rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  &:active {
    background: #f9fafb;
    transform: scale(0.98);
  }
}

.action-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14rpx;

  .icon-inner {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &.scan {
    background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%);
  }

  &.dial {
    background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
  }

  &.refresh {
    background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
  }
}

// 扫码图标
.qi-scan {
  width: 40rpx;
  height: 40rpx;
  position: relative;
}

.qi-scan-corner {
  position: absolute;
  width: 12rpx;
  height: 12rpx;
  border-color: #7C3AED;
  border-style: solid;
  border-width: 0;

  &.tl { top: 0; left: 0; border-top-width: 4rpx; border-left-width: 4rpx; border-radius: 4rpx 0 0 0; }
  &.tr { top: 0; right: 0; border-top-width: 4rpx; border-right-width: 4rpx; border-radius: 0 4rpx 0 0; }
  &.bl { bottom: 0; left: 0; border-bottom-width: 4rpx; border-left-width: 4rpx; border-radius: 0 0 0 4rpx; }
  &.br { bottom: 0; right: 0; border-bottom-width: 4rpx; border-right-width: 4rpx; border-radius: 0 0 4rpx 0; }
}

.qi-scan-line {
  position: absolute;
  top: 50%;
  left: 4rpx;
  right: 4rpx;
  height: 4rpx;
  background: #7C3AED;
  border-radius: 2rpx;
  transform: translateY(-50%);
}

// 拨号键盘图标
.qi-dial {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 4rpx;
  align-items: center;
  justify-content: center;
}

.qi-dial-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #059669;
}

// 刷新图标
.qi-refresh {
  font-size: 40rpx;
  font-weight: 300;
  color: #2563EB;
  line-height: 1;
}

.action-text {
  font-size: 26rpx;
  color: #1F2937;
}

.waiting-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.waiting-animation {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto 24rpx;
}

.pulse-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 4rpx solid #34D399;
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
  opacity: 0;

  &.delay {
    animation-delay: 1s;
  }
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.waiting-icon-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48rpx;
}

.waiting-text {
  font-size: 30rpx;
  color: #1F2937;
  display: block;
  margin-bottom: 8rpx;
}

.waiting-sub {
  font-size: 24rpx;
  color: #6B7280;
  display: block;
}

.bind-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.bind-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}

.bind-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F2937;
  display: block;
  margin-bottom: 12rpx;
}

.bind-desc {
  font-size: 26rpx;
  color: #6B7280;
  display: block;
  margin-bottom: 32rpx;
}

.btn-bind {
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  color: #fff;
  font-size: 30rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 20rpx;
  border: none;
  width: 80%;
  margin: 0 auto;
}

.bind-actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  width: 80%;
  margin: 0 auto;
}

.btn-action {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  border-radius: 20rpx;
  border: none;
  margin: 0;

  &.primary {
    background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
    color: #fff;
  }

  &.secondary {
    background: #f3f4f6;
    color: #6B7280;
    margin-top: 24rpx;

    &:active {
      background: #e5e7eb;
    }
  }
}

.btn-rebind {
  background: transparent;
  color: #6B7280;
  font-size: 28rpx;
  height: 72rpx;
  line-height: 72rpx;
  border: none;
  margin-top: 16rpx;
}
</style>
