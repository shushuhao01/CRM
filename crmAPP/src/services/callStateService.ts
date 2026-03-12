/**
 * 通话状态监听服务
 *
 * 用于监听系统通话状态变化，实现：
 * 1. 检测通话接通 - 开始计时
 * 2. 检测通话挂断 - 自动结束并上传录音
 * 3. 自动扫描系统通话录音并上传
 */

import { wsService } from './websocket'
import { reportCallEnd } from '@/api/call'
import { recordingService } from './recordingService'

// 通话状态
export type CallState = 'idle' | 'dialing' | 'ringing' | 'offhook' | 'ended'

// 当前通话信息
interface CurrentCallInfo {
  callId: string
  phoneNumber: string
  customerName?: string
  customerId?: string
  startTime: number
  connectTime?: number
  state: CallState
  recordingPath?: string
}

class CallStateService {
  private currentCall: CurrentCallInfo | null = null
  private stateCheckTimer: number | null = null
  private lastPhoneState: number = 0 // 0=IDLE, 1=RINGING, 2=OFFHOOK
  private isMonitoring = false

  // 回调函数
  private onStateChangeCallback: ((state: CallState, callInfo: CurrentCallInfo | null) => void) | null = null
  private onCallEndCallback: ((callInfo: CurrentCallInfo, duration: number) => void) | null = null

  /**
   * 开始监听通话状态
   */
  startMonitoring(callInfo: {
    callId: string
    phoneNumber: string
    customerName?: string
    customerId?: string
  }) {
    console.log('[CallStateService] 开始监听通话状态:', callInfo)

    this.currentCall = {
      ...callInfo,
      startTime: Date.now(),
      state: 'dialing'
    }

    this.isMonitoring = true
    this.lastPhoneState = 0

    // 启动状态检测
    this.startStateCheck()
  }

  /**
   * 停止监听
   */
  stopMonitoring() {
    console.log('[CallStateService] 停止监听')
    this.isMonitoring = false
    this.stopStateCheck()
    this.currentCall = null
  }

  /**
   * 启动状态检测定时器
   */
  private startStateCheck() {
    this.stopStateCheck()

    // 每500ms检测一次通话状态
    this.stateCheckTimer = setInterval(() => {
      this.checkPhoneState()
    }, 500) as unknown as number
  }

  /**
   * 停止状态检测
   */
  private stopStateCheck() {
    if (this.stateCheckTimer) {
      clearInterval(this.stateCheckTimer)
      this.stateCheckTimer = null
    }
  }

  /**
   * 检测系统通话状态
   */
  private checkPhoneState() {
    if (!this.isMonitoring || !this.currentCall) return

    // #ifdef APP-PLUS
    try {
      // 使用 Android 原生 API 获取通话状态
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context')
      plus.android.importClass('android.telephony.TelephonyManager')

      const telephonyManager = (main as any).getSystemService((Context as any).TELEPHONY_SERVICE)
      const callState = telephonyManager.getCallState()

      // callState: 0=IDLE, 1=RINGING, 2=OFFHOOK
      if (callState !== this.lastPhoneState) {
        console.log('[CallStateService] 通话状态变化:', this.lastPhoneState, '->', callState)
        this.handleStateChange(callState)
        this.lastPhoneState = callState
      }
    } catch (e) {
      console.error('[CallStateService] 获取通话状态失败:', e)
    }
    // #endif
  }

  /**
   * 处理状态变化
   */
  private handleStateChange(newState: number) {
    if (!this.currentCall) return

    const oldState = this.currentCall.state

    switch (newState) {
      case 0: // IDLE - 通话结束
        if (oldState !== 'idle' && oldState !== 'ended') {
          this.currentCall.state = 'ended'
          this.onCallEnded()
        }
        break

      case 1: // RINGING - 响铃中
        if (oldState === 'dialing') {
          this.currentCall.state = 'ringing'
          this.notifyStateChange('ringing')
        }
        break

      case 2: // OFFHOOK - 通话中（接通）
        if (oldState !== 'offhook') {
          this.currentCall.state = 'offhook'
          this.currentCall.connectTime = Date.now()
          this.notifyStateChange('offhook')

          // 通知WebSocket通话已接通
          wsService.reportCallStatus(this.currentCall.callId, 'connected')
        }
        break
    }
  }

  /**
   * 通话结束处理
   */
  private async onCallEnded() {
    if (!this.currentCall) return

    console.log('[CallStateService] 通话结束')

    // 计算通话时长
    let duration = 0
    if (this.currentCall.connectTime) {
      duration = Math.floor((Date.now() - this.currentCall.connectTime) / 1000)
    }

    const callInfo = { ...this.currentCall }
    const endTime = Date.now()

    // 通知状态变化
    this.notifyStateChange('ended')

    // 先通过WebSocket通知服务器通话结束（不等待录音）
    wsService.reportCallEnd(callInfo.callId, {
      status: duration > 0 ? 'connected' : 'missed',
      startTime: new Date(callInfo.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      hasRecording: false, // 先标记为无录音，后续找到再更新
      endReason: 'system_hangup',
    })

    // 上报通话结束到API
    try {
      await reportCallEnd({
        callId: callInfo.callId,
        status: duration > 0 ? 'connected' : 'missed',
        startTime: new Date(callInfo.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration,
        hasRecording: false,
      })
    } catch (e) {
      console.error('[CallStateService] 上报通话结束失败:', e)
    }

    // 触发回调
    if (this.onCallEndCallback) {
      this.onCallEndCallback(callInfo, duration)
    }

    // 保存通话信息供跟进页面使用
    uni.setStorageSync('lastEndedCall', {
      callId: callInfo.callId,
      customerName: callInfo.customerName,
      customerId: callInfo.customerId,
      phoneNumber: callInfo.phoneNumber,
      duration,
      endTime: new Date(endTime).toISOString(),
      wasConnected: duration > 0,
      hasRecording: false, // 先标记为无录音
    })

    // 停止监听
    this.stopMonitoring()

    // 跳转到通话结束页面
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/call-ended/index?callId=${callInfo.callId}&name=${encodeURIComponent(callInfo.customerName || '')}&customerId=${callInfo.customerId || ''}&duration=${duration}&hasRecording=false`,
      })
    }, 300)

    // 异步处理录音（在后台进行，不阻塞用户操作）
    this.processRecordingAsync(callInfo, duration, endTime)
  }

  /**
   * 异步处理录音文件
   */
  private async processRecordingAsync(
    callInfo: CurrentCallInfo,
    duration: number,
    endTime: number
  ) {
    if (duration <= 0) {
      console.log('[CallStateService] 通话未接通，跳过录音处理')
      return
    }

    // 检查是否开启了自动上传
    try {
      const callSettings = uni.getStorageSync('callSettings')
      if (callSettings) {
        const settings = JSON.parse(callSettings)
        if (!settings.autoUploadRecording) {
          console.log('[CallStateService] 自动上传已关闭，跳过录音处理')
          return
        }
      }
    } catch (e) {
      console.error('[CallStateService] 读取设置失败:', e)
    }

    console.log('[CallStateService] 开始异步处理录音...')

    try {
      // 使用录音服务查找并上传录音
      const result = await recordingService.processCallRecording({
        callId: callInfo.callId,
        phoneNumber: callInfo.phoneNumber,
        startTime: callInfo.startTime,
        endTime: endTime,
        duration: duration,
      })

      if (result.found && result.uploaded) {
        console.log('[CallStateService] 录音处理成功:', result.recordingPath)

        // 通知服务器录音已上传
        wsService.reportCallEnd(callInfo.callId, {
          status: 'connected',
          startTime: new Date(callInfo.startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration,
          hasRecording: true,
          recordingPath: result.recordingPath,
          endReason: 'recording_uploaded',
        })

        // 显示成功提示
        uni.showToast({
          title: '录音已上传',
          icon: 'success',
          duration: 2000,
        })
      } else if (result.found) {
        console.log('[CallStateService] 找到录音但上传失败')
        uni.showToast({
          title: '录音上传失败',
          icon: 'none',
          duration: 2000,
        })
      } else {
        console.log('[CallStateService] 未找到录音文件')
        // 不显示提示，可能是用户没有开启系统录音
      }
    } catch (e) {
      console.error('[CallStateService] 录音处理失败:', e)
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(state: CallState) {
    if (this.onStateChangeCallback && this.currentCall) {
      this.onStateChangeCallback(state, this.currentCall)
    }
  }

  /**
   * 设置状态变化回调
   */
  onStateChange(callback: (state: CallState, callInfo: CurrentCallInfo | null) => void) {
    this.onStateChangeCallback = callback
  }

  /**
   * 设置通话结束回调
   */
  onCallEnd(callback: (callInfo: CurrentCallInfo, duration: number) => void) {
    this.onCallEndCallback = callback
  }

  /**
   * 获取当前通话信息
   */
  getCurrentCall(): CurrentCallInfo | null {
    return this.currentCall
  }

  /**
   * 获取当前通话时长（秒）
   */
  getCurrentDuration(): number {
    if (!this.currentCall || !this.currentCall.connectTime) return 0
    return Math.floor((Date.now() - this.currentCall.connectTime) / 1000)
  }

  /**
   * 是否正在通话中
   */
  isInCall(): boolean {
    return this.isMonitoring && this.currentCall !== null &&
           (this.currentCall.state === 'offhook' || this.currentCall.state === 'ringing' || this.currentCall.state === 'dialing')
  }
}

// 导出单例
export const callStateService = new CallStateService()
export default callStateService
