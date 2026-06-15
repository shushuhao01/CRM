import { defineStore } from 'pinia'
import { setEncryptedStorage, getEncryptedStorage } from '@/utils/crypto'

export interface UserInfo {
  id: string
  username: string
  realName: string
  department: string
  role: string
  tenantId?: string
  tenantName?: string
  tenantCode?: string
}

export interface DeviceInfo {
  deviceId: string
  phoneNumber?: string
  deviceName: string
  deviceModel: string
  osType: 'android' | 'ios'
  osVersion: string
  appVersion: string
}

interface UserState {
  token: string
  wsToken: string
  wsUrl: string
  userInfo: UserInfo | null
  deviceInfo: DeviceInfo | null
  isLoggedIn: boolean
  isBound: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: '',
    wsToken: '',
    wsUrl: '',
    userInfo: null,
    deviceInfo: null,
    isLoggedIn: false,
    isBound: false
  }),

  actions: {
    setLoginInfo(data: { token: string; expiresIn: number; user: UserInfo }) {
      this.token = data.token
      this.userInfo = data.user
      this.isLoggedIn = true

      setEncryptedStorage('token', data.token)
      setEncryptedStorage('userInfo', JSON.stringify(data.user))
      uni.setStorageSync('loginTimestamp', String(Date.now()))
    },

    // 设置WebSocket信息
    setWsInfo(wsToken: string, wsUrl: string) {
      this.wsToken = wsToken
      this.wsUrl = wsUrl
      setEncryptedStorage('wsToken', wsToken)
      // wsUrl 不需加密（非敏感数据）
      uni.setStorageSync('wsUrl', wsUrl)
    },

    // 设置设备绑定信息
    setDeviceInfo(deviceInfo: DeviceInfo) {
      this.deviceInfo = deviceInfo
      this.isBound = true
      // 设备信息非敏感，无需加密
      uni.setStorageSync('deviceInfo', JSON.stringify(deviceInfo))
    },

    // 清除设备绑定
    clearDeviceInfo() {
      this.deviceInfo = null
      this.isBound = false
      this.wsToken = ''
      this.wsUrl = ''
      uni.removeStorageSync('deviceInfo')
      uni.removeStorageSync('wsToken')
      uni.removeStorageSync('wsUrl')
    },

    // 退出登录
    logout() {
      this.token = ''
      this.wsToken = ''
      this.wsUrl = ''
      this.userInfo = null
      this.deviceInfo = null
      this.isLoggedIn = false
      this.isBound = false

      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
      uni.removeStorageSync('wsToken')
      uni.removeStorageSync('wsUrl')
      uni.removeStorageSync('deviceInfo')
      uni.removeStorageSync('savedUsername')
      uni.removeStorageSync('savedPassword')
    },

    restore() {
      try {
        const token = getEncryptedStorage('token')
        const userInfo = getEncryptedStorage('userInfo')
        const wsToken = getEncryptedStorage('wsToken')
        const wsUrl = uni.getStorageSync('wsUrl')
        const deviceInfo = uni.getStorageSync('deviceInfo')

        // 检查本地登录是否超过7天
        const loginTs = uni.getStorageSync('loginTimestamp')
        if (loginTs && token) {
          const elapsed = Date.now() - parseInt(loginTs)
          const sevenDays = 7 * 24 * 60 * 60 * 1000
          if (elapsed > sevenDays) {
            console.log('[User] 登录已过期（超过7天），需要重新登录')
            this.logout()
            return
          }
        }

        if (token) {
          this.token = token
          this.isLoggedIn = true
        }
        if (userInfo) {
          this.userInfo = JSON.parse(userInfo)
        }
        if (wsToken) {
          this.wsToken = wsToken
        }
        if (wsUrl) {
          this.wsUrl = wsUrl
        }
        if (deviceInfo) {
          this.deviceInfo = JSON.parse(deviceInfo)
          this.isBound = true
        }
      } catch (e) {
        console.error('恢复用户信息失败:', e)
      }
    }
  }
})
