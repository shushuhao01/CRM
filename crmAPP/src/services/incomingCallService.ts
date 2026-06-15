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
import { reportIncomingCall, reportCallEnd } from '@/api/call'
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

  startListening() {
    if (this.listening) return
    this.listening = true
    console.log('[IncomingCallService] 来电监听已启动')

    // #ifdef APP-PLUS
    this.initAndroidListener()
    // #endif

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
    this.stopAndroidListener()
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

  // #ifdef APP-PLUS
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
    // 外呼由 callStateService 处理，避免重复
    if (callStateService.getCurrentCall()) {
      this.lastPhoneState = state
      return
    }

    const prevState = this.lastPhoneState
    this.lastPhoneState = state

    console.log('[IncomingCallService] 通话状态:', prevState, '->', state, phoneNumber)

    switch (state) {
      case 1: // RINGING
        if (phoneNumber) {
          this.onRingingDetected(phoneNumber)
        } else if (!this.currentIncoming) {
          // Android 10+ 可能不返回号码，尝试从通话记录获取
          this.tryResolveCallerFromCallLog().then((num) => {
            if (num) this.onRingingDetected(num)
          })
        }
        break

      case 2: // OFFHOOK
        if (this.currentIncoming && !this.currentIncoming.connectTime) {
          this.currentIncoming.connectTime = Date.now()
          console.log('[IncomingCallService] 来电已接听')
        }
        break

      case 0: // IDLE
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

    if (settings.vibrate) {
      uni.vibrateLong({})
    }

    if (settings.callNotify) {
      // #ifdef APP-PLUS
      try {
        const displayName = this.currentIncoming?.customerName || callerNumber
        plus.push.createMessage(
          `来电: ${displayName}`,
          JSON.stringify({ type: 'incoming_call', callerNumber }),
          { title: '客户来电', cover: false }
        )
      } catch (e) {
        console.warn('[IncomingCallService] 本地通知失败:', e)
      }
      // #endif
    }
  }

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
