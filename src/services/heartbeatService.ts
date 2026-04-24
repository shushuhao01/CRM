/**
 * 在线席位心跳服务
 * 登录后每30秒向后端上报心跳，保持会话活跃
 * 🔥 始终发送心跳（含后台标签页），登录即占席位，关闭浏览器15分钟后释放
 * 🔥 支持检测被踢出/会话过期状态并强制重新登录
 */
import { api } from '@/api/request'
import { ElMessageBox } from 'element-plus'

const HEARTBEAT_INTERVAL = 30 * 1000 // 30秒

let timer: ReturnType<typeof setInterval> | null = null
let running = false
let kickedDialogShown = false

/** 发送一次心跳 */
async function sendHeartbeat(): Promise<void> {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      stop()
      return
    }
    const res = await api.post('/online-seat/heartbeat') as any
    // 🔥 检测被踢出状态
    if (res?.data?.kicked && !kickedDialogShown) {
      kickedDialogShown = true
      stop()
      showKickedDialog()
      return
    }
    // 🔥 检测会话过期（浏览器关闭超过15分钟后重新打开）
    if (res?.data?.expired && !kickedDialogShown) {
      kickedDialogShown = true
      stop()
      showExpiredDialog()
    }
  } catch (_e) {
    // 心跳失败不影响业务
  }
}

/** 显示被踢出提醒对话框 */
function showKickedDialog(): void {
  ElMessageBox.confirm(
    '您的会话已被管理员下线，可能是因为在线席位已满或管理员主动操作。',
    '已被下线',
    {
      confirmButtonText: '重新登录',
      cancelButtonText: '关闭',
      type: 'warning',
      closeOnClickModal: false,
      closeOnPressEscape: false
    }
  ).then(() => {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }).catch(() => {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }).finally(() => {
    kickedDialogShown = false
  })
}

/** 显示会话过期提醒对话框（浏览器关闭超过15分钟后重新打开） */
function showExpiredDialog(): void {
  ElMessageBox.confirm(
    '您的登录会话已过期（长时间未活动），请重新登录。如果在线席位已满，需等待其他成员下线后才能登录。',
    '会话已过期',
    {
      confirmButtonText: '重新登录',
      cancelButtonText: '关闭',
      type: 'info',
      closeOnClickModal: false,
      closeOnPressEscape: false
    }
  ).then(() => {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }).catch(() => {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }).finally(() => {
    kickedDialogShown = false
  })
}

/** 启动心跳 */
export function start(): void {
  if (running) return
  running = true
  kickedDialogShown = false

  // 首次立即发送
  sendHeartbeat()

  // 🔥 无论标签页是否在前台，都持续发送心跳保持会话存活
  // 登录即占席位，只有关闭浏览器（心跳停止）才释放
  timer = setInterval(() => {
    sendHeartbeat()
  }, HEARTBEAT_INTERVAL)

  // 页面从后台切换到前台时立即发送一次
  document.addEventListener('visibilitychange', onVisibilityChange)
}

/** 停止心跳 */
export function stop(): void {
  running = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible' && running) {
    sendHeartbeat()
  }
}

export default { start, stop }
