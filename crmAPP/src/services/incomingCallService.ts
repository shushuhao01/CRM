/**
 * 来电检测服务（呼入）
 *
 * 使用 Android PhoneStateListener 监听来电：
 * - RINGING：上报后端 + 触发来电回调
 * - OFFHOOK：记录接通时间
 * - IDLE：通话结束上报 + 录音上传 + 跳转登记页
 */

import { wsService } from './websocket'
import { callStateService } from './callStateService'
import { reportIncomingCall, reportCallEnd, reportMissedCalls } from '@/api/call'
import { recordingService } from './recordingService'
import { useUserStore } from '@/stores/user'

export interface IncomingCallInfo {
  callerNumber: string
  callId?: string
  customerId?: string
  customerName?: string
  startTime: number
  connectTime?: number
}

type IncomingCallback = (info: IncomingCallInfo) => void
type IncomingEndCallback = (info: IncomingCallInfo, duration: number) => void

interface CallSettings {
  callNotify: boolean
  vibrate: boolean
  autoUploadRecording: boolean
}

class IncomingCallService {
  private listening = false
  private incomingCallbacks: IncomingCallback[] = []
  private incomingEndCallbacks: IncomingEndCallback[] = []
  private currentIncoming: IncomingCallInfo | null = null
  private hasReportedIncoming = false
  private confirmTimeout: ReturnType<typeof setTimeout> | null = null
  private lastPhoneState = 0 // 0=IDLE, 1=RINGING, 2=OFFHOOK
  private phoneStateListener: any = null
  private telephonyManager: any = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private usePolling = false
  private wakeLock: any = null
  private foregroundActive = false
  private missedSyncRunning = false
  private vibrateTimer: ReturnType<typeof setInterval> | null = null
  private ringtonePlayer: any = null

  startListening() {
    if (this.listening) {
      console.log('[IncomingCallService] 来电监听已在运行中')
      return
    }
    this.listening = true
    console.log('[IncomingCallService] 来电监听已启动')

    // #ifdef APP-PLUS
    // 先检查权限是否已授予，已有直接初始化，没有才请求（只弹系统对话框，不弹自定义弹窗）
    if (this.checkPhonePermissionGranted()) {
      this.initAndroidListener()
    } else {
      this.requestPhonePermissions().then((granted) => {
        if (granted) {
          this.initAndroidListener()
        } else {
          console.warn('[IncomingCallService] 电话权限未授予，启用轮询兜底')
          this.usePolling = true
          this.startPolling()
        }
      })
    }
    this.startForegroundKeepAlive()
    // #endif

    // 补录离线期间的未接来电
    this.syncMissedCallsFromCallLog()

    // 兼容 WebSocket 服务端推送的来电事件
    uni.$on('ws:incoming_call', (data: any) => {
      if (data?.callerNumber && !this.currentIncoming) {
        this.onRingingDetected(data.callerNumber)
      }
    })
  }

  stopListening() {
    this.listening = false
    this.clearConfirmTimeout()
    this.stopVibrateLoop()
    this.stopAndroidListener()
    // #ifdef APP-PLUS
    this.stopRingtone()
    this.stopForegroundKeepAlive()
    // #endif
    uni.$off('ws:incoming_call')
    console.log('[IncomingCallService] 来电监听已停止')
  }

  onIncoming(callback: IncomingCallback) {
    this.incomingCallbacks.push(callback)
  }

  onIncomingEnd(callback: IncomingEndCallback) {
    this.incomingEndCallbacks.push(callback)
  }

  /**
   * 处理后端 WebSocket 回传的来电确认（callId + 客户匹配结果）
   */
  handleIncomingCallConfirmed(data: {
    callId: string
    callerNumber?: string
    customerId?: string
    customerName?: string
  }) {
    console.log('[IncomingCallService] 来电已确认:', data)
    this.clearConfirmTimeout()

    if (!this.currentIncoming) {
      this.currentIncoming = {
        callerNumber: data.callerNumber || '',
        startTime: Date.now(),
      }
    }

    this.currentIncoming.callId = data.callId
    if (data.customerId) this.currentIncoming.customerId = String(data.customerId)
    if (data.customerName) this.currentIncoming.customerName = data.customerName

    uni.setStorageSync('currentIncomingCall', {
      callId: data.callId,
      callerNumber: this.currentIncoming.callerNumber,
      customerId: this.currentIncoming.customerId,
      customerName: this.currentIncoming.customerName,
      startTime: this.currentIncoming.startTime,
    })

    uni.$emit('incoming:call_confirmed', { ...this.currentIncoming })
  }

  getCurrentIncoming(): IncomingCallInfo | null {
    return this.currentIncoming ? { ...this.currentIncoming } : null
  }

  /**
   * 检查电话权限是否已授予（不弹窗）
   */
  checkPhonePermissionGranted(): boolean {
    // #ifdef APP-PLUS
    try {
      const main = plus.android.runtimeMainActivity()
      const pkgName = (main as any).getPackageName()
      const pm = (main as any).getPackageManager()
      // Java int 通过桥接可能是 Integer 对象，必须 Number() 转换
      return Number(pm.checkPermission('android.permission.READ_PHONE_STATE', pkgName)) === 0
    } catch (e) {
      try {
        const main = plus.android.runtimeMainActivity()
        return Number((main as any).checkCallingOrSelfPermission('android.permission.READ_PHONE_STATE')) === 0
      } catch (_e2) {
        console.warn('[IncomingCallService] 权限检查失败')
        return false
      }
    }
    // #endif
    // eslint-disable-next-line no-unreachable
    return true
  }

  /**
   * 公开的权限请求方法，供外部调用（如首页权限引导按钮）
   * @returns true=权限已授予, false=用户拒绝
   */
  async requestPermissions(): Promise<boolean> {
    // #ifdef APP-PLUS
    const granted = await this.requestPhonePermissions()
    if (granted && !this.listening) {
      this.startListening()
    } else if (granted && this.usePolling) {
      this.usePolling = false
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
      this.initAndroidListener()
    }
    return granted
    // #endif
    // eslint-disable-next-line no-unreachable
    return true
  }

  /**
   * 检查悬浮窗权限是否已授予
   */
  checkOverlayPermissionGranted(): boolean {
    // #ifdef APP-PLUS
    try {
      const Settings = plus.android.importClass('android.provider.Settings') as any
      const main = plus.android.runtimeMainActivity()
      return !!Settings.canDrawOverlays(main)
    } catch (e) {
      return false
    }
    // #endif
    // eslint-disable-next-line no-unreachable
    return true
  }

  // #ifdef APP-PLUS
  private openOverlayPermissionSettings() {
    try {
      const Intent = plus.android.importClass('android.content.Intent') as any
      const Settings = plus.android.importClass('android.provider.Settings') as any
      const Uri = plus.android.importClass('android.net.Uri') as any
      const main = plus.android.runtimeMainActivity()
      const intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
      intent.setData(Uri.parse('package:' + (main as any).getPackageName()))
      ;(main as any).startActivity(intent)
    } catch (e) {
      console.warn('[IncomingCallService] 跳转悬浮窗设置失败:', e)
      // 兜底：跳转到应用详情页
      this.openAppPermissionSettings()
    }
  }
  // #endif

  /**
   * 跳转到系统应用权限设置页
   */
  openAppPermissionSettings() {
    // #ifdef APP-PLUS
    try {
      const Intent = plus.android.importClass('android.content.Intent') as any
      const Settings = plus.android.importClass('android.provider.Settings') as any
      const Uri = plus.android.importClass('android.net.Uri') as any
      const main = plus.android.runtimeMainActivity()
      const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
      intent.setData(Uri.parse('package:' + (main as any).getPackageName()))
      ;(main as any).startActivity(intent)
    } catch (err) {
      console.warn('[IncomingCallService] 跳转设置失败:', err)
      uni.showToast({ title: '请手动进入系统设置 > 应用管理 > 云客CRM > 权限', icon: 'none', duration: 3000 })
    }
    // #endif
  }

  // #ifdef APP-PLUS
  private requestPhonePermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const permissions = [
          'android.permission.READ_PHONE_STATE',
          'android.permission.READ_CALL_LOG',
        ]
        // Android 12+ (API 31) 需要 READ_PHONE_NUMBERS 才能在 onCallStateChanged 中获取号码
        const Build = plus.android.importClass('android.os.Build') as any
        if (Build && Build.VERSION && Build.VERSION.SDK_INT >= 31) {
          permissions.push('android.permission.READ_PHONE_NUMBERS')
        }

        plus.android.requestPermissions(
          permissions,
          (e: any) => {
            const deniedAlways = e.deniedAlways || []
            const deniedPresent = e.deniedPresent || []
            const granted = e.granted || []

            console.log('[IncomingCallService] 权限申请结果:',
              'granted=', granted.length,
              'deniedPresent=', deniedPresent.length,
              'deniedAlways=', deniedAlways.length)

            if (deniedAlways.length > 0) {
              console.warn('[IncomingCallService] 以下权限被永久拒绝:', deniedAlways)
              // 不弹窗打扰用户，由首页权限横幅静默引导
            }

            // 至少 READ_PHONE_STATE 被授予才算成功
            const hasPhoneState = granted.some((p: string) =>
              p.includes('READ_PHONE_STATE')
            )
            resolve(hasPhoneState)
          },
          (e: any) => {
            console.error('[IncomingCallService] 权限申请异常:', e)
            resolve(false)
          }
        )
      } catch (e) {
        console.warn('[IncomingCallService] 权限申请调用失败:', e)
        resolve(false)
      }
    })
  }

  private initAndroidListener() {
    try {
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context') as any
      const TelephonyManager = plus.android.importClass('android.telephony.TelephonyManager') as any
      const PhoneStateListener = plus.android.importClass('android.telephony.PhoneStateListener') as any

      this.telephonyManager = (main as any).getSystemService(Context.TELEPHONY_SERVICE)
      const self = this

      this.phoneStateListener = plus.android.implements('android.telephony.PhoneStateListener', {
        onCallStateChanged(state: number, phoneNumber: string) {
          self.handleCallStateChange(state, phoneNumber || '')
        },
      })

      this.telephonyManager.listen(this.phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
      console.log('[IncomingCallService] PhoneStateListener 已注册')
    } catch (e) {
      console.warn('[IncomingCallService] PhoneStateListener 注册失败，启用轮询:', e)
      this.usePolling = true
      this.startPolling()
    }
  }

  private stopAndroidListener() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    if (this.telephonyManager && this.phoneStateListener) {
      try {
        const PhoneStateListener = plus.android.importClass('android.telephony.PhoneStateListener') as any
        this.telephonyManager.listen(this.phoneStateListener, PhoneStateListener.LISTEN_NONE)
      } catch (e) {
        console.warn('[IncomingCallService] 注销监听器失败:', e)
      }
    }
    this.phoneStateListener = null
    this.telephonyManager = null
  }

  private startPolling() {
    if (this.pollTimer) return
    this.pollTimer = setInterval(() => {
      if (!this.listening) return
      try {
        const main = plus.android.runtimeMainActivity()
        const Context = plus.android.importClass('android.content.Context') as any
        plus.android.importClass('android.telephony.TelephonyManager')
        const tm = (main as any).getSystemService((Context as any).TELEPHONY_SERVICE)
        const state = tm.getCallState()
        if (state !== this.lastPhoneState) {
          this.handleCallStateChange(state, this.currentIncoming?.callerNumber || '')
        }
      } catch (e) {
        console.error('[IncomingCallService] 轮询通话状态失败:', e)
      }
    }, 500)
  }
  // #endif

  private handleCallStateChange(state: number, phoneNumber: string) {
    // 仅在外呼正在通话中（offhook/ringing/dialing 且未 ended）时让 callStateService 处理
    // 避免外呼结束后状态残留导致来电永远被忽略
    const outboundCall = callStateService.getCurrentCall()
    if (outboundCall && callStateService.isInCall()) {
      this.lastPhoneState = state
      return
    }
    // 如果外呼已结束但 getCurrentCall 非空（残留），主动清理
    if (outboundCall && !callStateService.isInCall()) {
      console.log('[IncomingCallService] 检测到外呼状态残留，强制清理')
      callStateService.stopMonitoring()
    }

    const prevState = this.lastPhoneState
    this.lastPhoneState = state

    console.log('[IncomingCallService] 通话状态:', prevState, '->', state, phoneNumber)

    switch (state) {
      case 1: // RINGING
        if (phoneNumber) {
          this.onRingingDetected(phoneNumber)
        } else if (!this.currentIncoming) {
          // Android 10+ 可能不返回号码：先用"未知"触发来电流程，再异步尝试解析号码
          console.log('[IncomingCallService] RINGING 但无号码，先触发未知来电')
          this.onRingingDetected('未知来电')
          // 延迟 1 秒后尝试从通话记录补充号码
          setTimeout(() => {
            this.tryResolveCallerFromCallLog().then((num) => {
              if (num && this.currentIncoming && this.currentIncoming.callerNumber === '未知来电') {
                console.log('[IncomingCallService] 从通话记录补充来电号码:', num)
                this.currentIncoming.callerNumber = num
              }
            })
          }, 1000)
        }
        break

      case 2: // OFFHOOK
        // 接听后立即停止铃声和振动
        this.stopVibrateLoop()
        // #ifdef APP-PLUS
        this.stopRingtone()
        // #endif
        if (this.currentIncoming && !this.currentIncoming.connectTime) {
          this.currentIncoming.connectTime = Date.now()
          console.log('[IncomingCallService] 来电已接听')
        }
        break

      case 0: // IDLE
        // 挂断/结束后停止铃声和振动
        this.stopVibrateLoop()
        // #ifdef APP-PLUS
        this.stopRingtone()
        // #endif
        if (this.currentIncoming) {
          this.onIncomingCallEnded()
        }
        break
    }
  }

  private onRingingDetected(callerNumber: string) {
    if (this.currentIncoming?.callerNumber === callerNumber && this.hasReportedIncoming) {
      return
    }

    console.log('[IncomingCallService] 检测到来电:', callerNumber)

    this.currentIncoming = {
      callerNumber,
      startTime: Date.now(),
    }
    this.hasReportedIncoming = false

    this.triggerIncomingNotify(callerNumber)
    this.notifyIncomingCallbacks(this.currentIncoming)
    this.reportIncomingToServer(callerNumber)

    // 跳转到来电卡片页面，显示客户详情
    this.navigateToIncomingPage(callerNumber)
  }

  private navigateToIncomingPage(callerNumber: string) {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const currentRoute = (currentPage as any)?.route || ''
    if (currentRoute.includes('incoming-call') || currentRoute.includes('calling')) return

    const name = this.currentIncoming?.customerName || ''
    const cId = this.currentIncoming?.customerId || ''
    const callIdParam = this.currentIncoming?.callId || ''
    uni.navigateTo({
      url: `/pages/incoming-call/index?phone=${encodeURIComponent(callerNumber)}&name=${encodeURIComponent(name)}&customerId=${cId}&callId=${callIdParam}&state=ringing`,
      fail: (err) => {
        console.warn('[IncomingCallService] 跳转来电页面失败:', err)
      },
    })
  }

  private async onIncomingCallEnded() {
    if (!this.currentIncoming) return

    const info = { ...this.currentIncoming }
    const endTime = Date.now()

    let duration = 0
    if (info.connectTime) {
      duration = Math.floor((endTime - info.connectTime) / 1000)
    }

    const callId = info.callId || `IN-local-${info.startTime}`
    const status = duration > 0 ? 'connected' : 'missed'

    console.log('[IncomingCallService] 来电结束:', info.callerNumber, '时长:', duration)

    // WebSocket 通知
    wsService.reportCallEnd(callId, {
      status,
      phoneNumber: info.callerNumber,
      callType: 'inbound',
      startTime: new Date(info.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      hasRecording: false,
      endReason: 'system_hangup',
    })

    // HTTP 上报
    try {
      await reportCallEnd({
        callId,
        phoneNumber: info.callerNumber,
        callType: 'inbound',
        status,
        startTime: new Date(info.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration,
        hasRecording: false,
      })
    } catch (e) {
      console.error('[IncomingCallService] 上报通话结束失败:', e)
    }

    // 保存供登记页使用
    uni.setStorageSync('lastEndedCall', {
      callId,
      customerName: info.customerName,
      customerId: info.customerId,
      phoneNumber: info.callerNumber,
      duration,
      endTime: new Date(endTime).toISOString(),
      wasConnected: duration > 0,
      hasRecording: false,
      callType: 'inbound',
    })

    uni.removeStorageSync('currentIncomingCall')

    // 触发结束回调
    this.incomingEndCallbacks.forEach((cb) => {
      try {
        cb(info, duration)
      } catch (e) {
        console.error('[IncomingCallService] 结束回调错误:', e)
      }
    })

    uni.$emit('call:completed')

    // 重置状态
    this.currentIncoming = null
    this.hasReportedIncoming = false
    this.lastPhoneState = 0

    // 跳转登记页
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/call-ended/index?callId=${callId}&name=${encodeURIComponent(info.customerName || info.callerNumber)}&customerId=${info.customerId || ''}&duration=${duration}&hasRecording=false&callType=inbound`,
      })
    }, 300)

    // 异步处理录音
    this.processRecordingAsync(info, duration, endTime)
  }

  private async reportIncomingToServer(callerNumber: string) {
    if (this.hasReportedIncoming) return

    const userStore = useUserStore()
    const deviceId = userStore.deviceInfo?.deviceId

    if (wsService.isConnected && deviceId) {
      this.hasReportedIncoming = true
      wsService.send('INCOMING_CALL_DETECTED', { callerNumber, deviceId })

      // WS 确认超时则走 HTTP 备份
      this.confirmTimeout = setTimeout(() => {
        if (!this.currentIncoming?.callId) {
          console.log('[IncomingCallService] WS 确认超时，使用 HTTP 备份')
          this.hasReportedIncoming = false
          this.reportIncomingHttp(callerNumber)
        }
      }, 3000)
    } else {
      await this.reportIncomingHttp(callerNumber)
    }
  }

  private async reportIncomingHttp(callerNumber: string) {
    if (this.hasReportedIncoming && this.currentIncoming?.callId) return
    this.hasReportedIncoming = true

    try {
      const res = await reportIncomingCall({ callerNumber })
      const data = (res as any)?.data || res
      if (data?.callId) {
        this.handleIncomingCallConfirmed({
          callId: data.callId,
          callerNumber,
          customerId: data.customerId,
          customerName: data.customerName,
        })
      }
    } catch (e) {
      console.error('[IncomingCallService] HTTP 上报来电失败:', e)
      this.hasReportedIncoming = false
    }
  }

  private triggerIncomingNotify(callerNumber: string) {
    const settings = this.getCallSettings()

    // 持续振动：每隔 1.5 秒振动一次，模拟真实来电振动节奏
    if (settings.vibrate) {
      uni.vibrateLong({})
      this.stopVibrateLoop()
      this.vibrateTimer = setInterval(() => {
        if (!this.currentIncoming) {
          this.stopVibrateLoop()
          return
        }
        uni.vibrateLong({})
      }, 1500)
    }

    if (settings.callNotify) {
      // #ifdef APP-PLUS
      try {
        const displayName = this.currentIncoming?.customerName || callerNumber
        // 系统通知栏常驻通知
        plus.push.createMessage(
          `来电: ${displayName}`,
          JSON.stringify({ type: 'incoming_call', callerNumber }),
          { title: '客户来电', cover: false }
        )

        // 播放来电提示音
        this.playRingtone()
      } catch (e) {
        console.warn('[IncomingCallService] 本地通知失败:', e)
      }
      // #endif
    }
  }

  private stopVibrateLoop() {
    if (this.vibrateTimer) {
      clearInterval(this.vibrateTimer)
      this.vibrateTimer = null
    }
  }

  // #ifdef APP-PLUS
  private playRingtone() {
    this.stopRingtone()
    try {
      // 使用系统默认铃声
      const RingtoneManager = plus.android.importClass('android.media.RingtoneManager') as any
      const ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      const main = plus.android.runtimeMainActivity()
      const ringtone = RingtoneManager.getRingtone(main, ringtoneUri)
      if (ringtone) {
        ringtone.play()
        this.ringtonePlayer = ringtone
        console.log('[IncomingCallService] 来电铃声播放中')
      }
    } catch (e) {
      console.warn('[IncomingCallService] 播放铃声失败:', e)
    }
  }

  private stopRingtone() {
    try {
      if (this.ringtonePlayer) {
        if (this.ringtonePlayer.isPlaying && this.ringtonePlayer.isPlaying()) {
          this.ringtonePlayer.stop()
        }
        this.ringtonePlayer = null
      }
    } catch (e) {
      console.warn('[IncomingCallService] 停止铃声失败:', e)
    }
  }
  // #endif

  private notifyIncomingCallbacks(info: IncomingCallInfo) {
    this.incomingCallbacks.forEach((cb) => {
      try {
        cb(info)
      } catch (e) {
        console.error('[IncomingCallService] 回调错误:', e)
      }
    })
  }

  private async processRecordingAsync(
    info: IncomingCallInfo,
    duration: number,
    endTime: number
  ) {
    if (duration <= 0 || !info.callId) {
      console.log('[IncomingCallService] 未接通或无 callId，跳过录音')
      return
    }

    const settings = this.getCallSettings()
    if (!settings.autoUploadRecording) {
      console.log('[IncomingCallService] 自动上传已关闭，跳过录音')
      return
    }

    console.log('[IncomingCallService] 开始异步处理录音...')

    try {
      const result = await recordingService.processCallRecording({
        callId: info.callId,
        phoneNumber: info.callerNumber,
        startTime: info.startTime,
        endTime,
        duration,
      })

      if (result.found && result.uploaded) {
        console.log('[IncomingCallService] 录音上传成功:', result.recordingPath)
        wsService.reportCallEnd(info.callId, {
          status: 'connected',
          callType: 'inbound',
          duration,
          hasRecording: true,
        })
      }
    } catch (e) {
      console.error('[IncomingCallService] 录音处理失败:', e)
    }
  }

  private getCallSettings(): CallSettings {
    try {
      const raw = uni.getStorageSync('callSettings')
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          callNotify: parsed.callNotify !== false,
          vibrate: !!parsed.vibrate,
          autoUploadRecording: parsed.autoUploadRecording !== false,
        }
      }
    } catch (e) {
      console.error('[IncomingCallService] 读取设置失败:', e)
    }
    return { callNotify: true, vibrate: false, autoUploadRecording: true }
  }

  private clearConfirmTimeout() {
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout)
      this.confirmTimeout = null
    }
  }

  /**
   * Android 前台保活：WakeLock + 常驻通知，确保后台仍能检测来电
   */
  // #ifdef APP-PLUS
  private startForegroundKeepAlive() {
    if (this.foregroundActive) return

    try {
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context') as any
      const PowerManager = plus.android.importClass('android.os.PowerManager') as any

      const pm = (main as any).getSystemService(Context.POWER_SERVICE)
      if (pm && !this.wakeLock) {
        this.wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, 'CRM:IncomingCallListener')
        this.wakeLock.setReferenceCounted(false)
        this.wakeLock.acquire(10 * 60 * 1000)
        console.log('[IncomingCallService] WakeLock 已获取')
      }

      plus.push.createMessage(
        '来电监听运行中，可正常接收客户来电',
        JSON.stringify({ type: 'foreground_service' }),
        { title: 'CRM工作手机', cover: false }
      )

      this.foregroundActive = true
    } catch (e) {
      console.warn('[IncomingCallService] 前台保活启动失败:', e)
    }
  }

  private stopForegroundKeepAlive() {
    try {
      if (this.wakeLock) {
        if (this.wakeLock.isHeld && this.wakeLock.isHeld()) {
          this.wakeLock.release()
        }
        this.wakeLock = null
      }
    } catch (e) {
      console.warn('[IncomingCallService] 释放 WakeLock 失败:', e)
    }
    this.foregroundActive = false
  }

  /**
   * 从系统通话记录补报离线期间的未接来电
   */
  async syncMissedCallsFromCallLog() {
    if (this.missedSyncRunning) return

    const userStore = useUserStore()
    if (!userStore.isLoggedIn) return

    this.missedSyncRunning = true

    try {
      const calls = await this.readRecentCallLogEntries()
      if (calls.length === 0) return

      const lastSync = Number(uni.getStorageSync('lastMissedCallSyncAt') || 0)
      const since = lastSync > 0 ? lastSync : Date.now() - 24 * 60 * 60 * 1000
      const pending = calls.filter((c) => c.timestamp > since)

      if (pending.length === 0) return

      console.log('[IncomingCallService] 补报离线来电:', pending.length, '条')

      const res = await reportMissedCalls({
        calls: pending.map((c) => ({
          callerNumber: c.callerNumber,
          callTime: new Date(c.timestamp).toISOString(),
          duration: c.duration,
          callStatus: c.callStatus,
        })),
      })

      const data = (res as any)?.data || res
      if ((data?.created || 0) > 0) {
        uni.showToast({
          title: `已补录 ${data.created} 条离线来电`,
          icon: 'none',
          duration: 2500,
        })
      }

      uni.setStorageSync('lastMissedCallSyncAt', String(Date.now()))
    } catch (e) {
      console.warn('[IncomingCallService] 补报离线来电失败:', e)
    } finally {
      this.missedSyncRunning = false
    }
  }

  private readRecentCallLogEntries(): Promise<
    Array<{
      callerNumber: string
      timestamp: number
      duration: number
      callStatus: 'missed' | 'rejected' | 'connected' | 'busy'
    }>
  > {
    return new Promise((resolve) => {
      try {
        const main = plus.android.runtimeMainActivity()
        const CallLog = plus.android.importClass('android.provider.CallLog') as any
        const ContentResolver = (main as any).getContentResolver()

        const cursor = ContentResolver.query(
          CallLog.Calls.CONTENT_URI,
          ['number', 'type', 'date', 'duration'],
          null,
          null,
          'date DESC'
        )

        const results: Array<{
          callerNumber: string
          timestamp: number
          duration: number
          callStatus: 'missed' | 'rejected' | 'connected' | 'busy'
        }> = []

        if (!cursor) {
          resolve([])
          return
        }

        const maxRows = 30
        let count = 0

        while (cursor.moveToNext() && count < maxRows) {
          const number = String(cursor.getString(0) || '').trim()
          const type = Number(cursor.getInt(1))
          const date = Number(cursor.getLong(2))
          const duration = Number(cursor.getLong(3)) || 0

          if (!number || !date) continue

          let callStatus: 'missed' | 'rejected' | 'connected' | 'busy' = 'missed'
          if (type === CallLog.Calls.INCOMING_TYPE) {
            callStatus = duration > 0 ? 'connected' : 'missed'
          } else if (type === CallLog.Calls.MISSED_TYPE) {
            callStatus = 'missed'
          } else if (type === 5) {
            // REJECTED_TYPE (API 29+)
            callStatus = 'rejected'
          } else {
            continue
          }

          results.push({
            callerNumber: number,
            timestamp: date,
            duration,
            callStatus,
          })
          count++
        }

        cursor.close()
        resolve(results)
      } catch (e) {
        console.warn('[IncomingCallService] 读取通话记录失败:', e)
        resolve([])
      }
    })
  }
  // #endif

  // #ifdef APP-PLUS
  private async tryResolveCallerFromCallLog(): Promise<string> {
    return new Promise((resolve) => {
      try {
        const main = plus.android.runtimeMainActivity()
        const CallLog = plus.android.importClass('android.provider.CallLog') as any
        const ContentResolver = (main as any).getContentResolver()

        const cursor = ContentResolver.query(
          CallLog.Calls.CONTENT_URI,
          ['number', 'type', 'date'],
          `${CallLog.Calls.TYPE} = ?`,
          [String(CallLog.Calls.INCOMING_TYPE)],
          'date DESC'
        )

        if (cursor && cursor.moveToFirst()) {
          const number = cursor.getString(0)
          cursor.close()
          resolve(number || '')
        } else {
          resolve('')
        }
      } catch (e) {
        console.warn('[IncomingCallService] 读取通话记录失败:', e)
        resolve('')
      }
    })
  }
  // #endif
}

export const incomingCallService = new IncomingCallService()
export default incomingCallService
