import { defineStore } from 'pinia'
import { wsService, type DialRequest } from '@/services/websocket'
import { reportCallEnd, uploadRecording } from '@/api/call'

export interface CurrentCall {
  callId: string
  phoneNumber: string
  customerName?: string
  customerId?: string
  status: 'dialing' | 'ringing' | 'connected' | 'ended'
  startTime: string
  connectTime?: string
  duration: number
  hasRecording: boolean
}

interface CallState {
  currentCall: CurrentCall | null
  isDialing: boolean
  recordingPath: string | null
}

export const useCallStore = defineStore('call', {
  state: (): CallState => ({
    currentCall: null,
    isDialing: false,
    recordingPath: null
  }),

  actions: {
    // 处理拨号请求
    handleDialRequest(data: DialRequest) {
      if (this.isDialing || this.currentCall) {
        // 正在通话中，拒绝新请求
        wsService.reportCallStatus(data.callId, 'rejected', {
          reason: 'busy'
        })
        return false
      }

      this.isDialing = true
      this.currentCall = {
        callId: data.callId,
        phoneNumber: data.phoneNumber,
        customerName: data.customerName,
        customerId: data.customerId,
        status: 'dialing',
        startTime: new Date().toISOString(),
        duration: 0,
        hasRecording: false
      }

      // 上报状态
      wsService.reportCallStatus(data.callId, 'dialing')

      return true
    },

    // 更新通话状态
    updateCallStatus(status: 'ringing' | 'connected') {
      if (!this.currentCall) return

      this.currentCall.status = status

      if (status === 'connected') {
        this.currentCall.connectTime = new Date().toISOString()
      }

      wsService.reportCallStatus(this.currentCall.callId, status)
    },

    // 通话结束
    async endCall(status: 'connected' | 'missed' | 'rejected' | 'busy' | 'failed') {
      if (!this.currentCall) return

      const call = this.currentCall
      const endTime = new Date().toISOString()

      // 计算通话时长
      let duration = 0
      if (call.connectTime) {
        duration = Math.floor(
          (new Date(endTime).getTime() - new Date(call.connectTime).getTime()) / 1000
        )
      }

      // 上报通话结束
      try {
        await reportCallEnd({
          callId: call.callId,
          status,
          startTime: call.startTime,
          endTime,
          duration,
          hasRecording: call.hasRecording
        })
      } catch (e) {
        console.error('上报通话结束失败:', e)
      }

      // 上传录音
      if (this.recordingPath && call.hasRecording) {
        try {
          await uploadRecording(call.callId, this.recordingPath)
          console.log('[CallStore] 录音上传成功')
          // 通知页面刷新通话记录
          uni.$emit('recording:uploaded', call.callId)
        } catch (e) {
          console.error('上传录音失败:', e)
        }
      }

      // 清理状态
      const callInfo = { ...this.currentCall, duration }
      this.currentCall = null
      this.isDialing = false
      this.recordingPath = null

      return callInfo
    },

    // 设置录音路径
    setRecordingPath(path: string) {
      this.recordingPath = path
      if (this.currentCall) {
        this.currentCall.hasRecording = true
      }
    },

    // 取消拨号
    cancelDial() {
      if (this.currentCall) {
        wsService.reportCallStatus(this.currentCall.callId, 'rejected', {
          reason: 'user_cancel'
        })
      }
      this.currentCall = null
      this.isDialing = false
    }
  }
})
