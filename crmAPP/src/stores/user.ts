import { defineStore } from 'pinia'

export interface UserInfo {
  id: string
  username: string
  realName: string
  department: string
  role: string
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
    // 设置登录信息
    setLoginInfo(data: { token: string; expiresIn: number; user: UserInfo }) {
      this.token = data.token
      this.userInfo = data.user
      this.isLoggedIn = true

      // 持久化存储
      uni.setStorageSync('token', data.token)
      uni.setStorageSync('userInfo', JSON.stringify(data.user))
    },

    // 设置WebSocket信息
    setWsInfo(wsToken: string, wsUrl: string) {
      this.wsToken = wsToken
      this.wsUrl = wsUrl
      uni.setStorageSync('wsToken', wsToken)
      uni.setStorageSync('wsUrl', wsUrl)
    },

    // 设置设备绑定信息
    setDeviceInfo(deviceInfo: DeviceInfo) {
      this.deviceInfo = deviceInfo
      this.isBound = true
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
    },

    // 从本地存储恢复
    restore() {
      try {
        const token = uni.getStorageSync('token')
        const userInfo = uni.getStorageSync('userInfo')
        const wsToken = uni.getStorageSync('wsToken')
        const wsUrl = uni.getStorageSync('wsUrl')
        const deviceInfo = uni.getStorageSync('deviceInfo')

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
