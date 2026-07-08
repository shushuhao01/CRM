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
      // 保留 savedUsername / savedPassword 以支持 silentReLogin 和记住密码功能
    },

    restore() {
      // 🔥 逐项独立恢复：任何一项损坏（如旧版加密的中文数据解密失败）
      // 都不能影响其他项，否则会连带丢失 wsToken/deviceInfo 导致要求重新扫码绑定
      let token = ''
      try {
        token = getEncryptedStorage('token')
      } catch (e) {
        console.error('[User] 恢复token失败:', e)
      }

      // 检查本地登录是否超过7天
      try {
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
      } catch (e) {
        console.error('[User] 检查登录时效失败:', e)
      }

      if (token) {
        this.token = token
        this.isLoggedIn = true
      }

      try {
        const userInfo = getEncryptedStorage('userInfo')
        if (userInfo) {
          this.userInfo = JSON.parse(userInfo)
        }
      } catch (e) {
        // 旧版加密对中文数据有损，解密后JSON损坏会走到这里；
        // 不中断恢复流程，由页面侧检测到 userInfo 缺失后静默重新登录补全
        console.error('[User] 恢复用户信息失败（可能是旧版加密数据损坏）:', e)
      }

      try {
        const wsToken = getEncryptedStorage('wsToken')
        if (wsToken) {
          this.wsToken = wsToken
        }
      } catch (e) {
        console.error('[User] 恢复wsToken失败:', e)
      }

      try {
        const wsUrl = uni.getStorageSync('wsUrl')
        if (wsUrl) {
          this.wsUrl = wsUrl
        }
      } catch (e) {
        console.error('[User] 恢复wsUrl失败:', e)
      }

      try {
        const deviceInfo = uni.getStorageSync('deviceInfo')
        if (deviceInfo) {
          this.deviceInfo = JSON.parse(deviceInfo)
          this.isBound = true
        }
      } catch (e) {
        console.error('[User] 恢复设备信息失败:', e)
      }
    }
  }
})
