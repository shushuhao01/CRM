import { defineStore } from 'pinia'

export interface ServerInfo {
  host: string
  protocol: 'http' | 'https'
  port?: number
  lastUsed: string
  name?: string
}

interface ServerState {
  currentServer: ServerInfo | null
  serverHistory: ServerInfo[]
  isConnected: boolean
  isChecking: boolean
}

export const useServerStore = defineStore('server', {
  state: (): ServerState => ({
    currentServer: null,
    serverHistory: [],
    isConnected: false,
    isChecking: false
  }),

  getters: {
    // 获取API基础地址
    apiBaseUrl(): string {
      if (!this.currentServer) return ''
      const { protocol, host, port } = this.currentServer
      const portStr = port ? `:${port}` : ''
      return `${protocol}://${host}${portStr}/api/v1`
    },

    // 获取WebSocket地址
    wsUrl(): string {
      if (!this.currentServer) return ''
      const { protocol, host, port } = this.currentServer
      const wsProtocol = protocol === 'https' ? 'wss' : 'ws'
      const portStr = port ? `:${port}` : ''
      return `${wsProtocol}://${host}${portStr}`
    },

    // 显示用的服务器地址
    displayUrl(): string {
      if (!this.currentServer) return '未配置'
      const { host, port } = this.currentServer
      return port ? `${host}:${port}` : host
    }
  },

  actions: {
    // 解析用户输入的服务器地址
    parseServerInput(input: string): ServerInfo {
      let host = input.trim()
      let protocol: 'http' | 'https' = 'https'
      let port: number | undefined

      // 移除协议前缀
      if (host.startsWith('https://')) {
        host = host.replace('https://', '')
        protocol = 'https'
      } else if (host.startsWith('http://')) {
        host = host.replace('http://', '')
        protocol = 'http'
      }

      // 移除路径
      host = host.split('/')[0]

      // 解析端口
      if (host.includes(':')) {
        const parts = host.split(':')
        host = parts[0]
        port = parseInt(parts[1])
      }

      // 本地IP使用http
      if (host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          host === 'localhost' ||
          host.startsWith('172.')) {
        protocol = 'http'
      }

      return {
        host,
        protocol,
        port,
        lastUsed: new Date().toISOString()
      }
    },

    // 测试服务器连接
    async testConnection(serverInfo: ServerInfo): Promise<boolean> {
      this.isChecking = true

      const { protocol, host, port } = serverInfo
      const portStr = port ? `:${port}` : ''
      const url = `${protocol}://${host}${portStr}/api/v1/mobile/ping`

      try {
        const res: any = await new Promise((resolve, reject) => {
          uni.request({
            url,
            method: 'GET',
            timeout: 5000,
            success: resolve,
            fail: reject
          })
        })

        this.isChecking = false
        return res.statusCode === 200
      } catch (e) {
        this.isChecking = false
        return false
      }
    },

    // 设置当前服务器
    async setServer(input: string): Promise<{ success: boolean; message: string }> {
      const serverInfo = this.parseServerInput(input)

      // 测试连接
      const connected = await this.testConnection(serverInfo)
      if (!connected) {
        return { success: false, message: '无法连接到服务器，请检查地址是否正确' }
      }

      // 保存当前服务器
      this.currentServer = serverInfo
      this.isConnected = true

      // 更新历史记录
      this.addToHistory(serverInfo)

      // 持久化
      this.saveToStorage()

      return { success: true, message: '服务器配置成功' }
    },

    // 添加到历史记录
    addToHistory(serverInfo: ServerInfo) {
      // 移除已存在的相同服务器
      this.serverHistory = this.serverHistory.filter(
        s => s.host !== serverInfo.host || s.port !== serverInfo.port
      )

      // 添加到开头
      this.serverHistory.unshift(serverInfo)

      // 最多保留5条
      if (this.serverHistory.length > 5) {
        this.serverHistory = this.serverHistory.slice(0, 5)
      }
    },

    // 从历史记录选择
    async selectFromHistory(serverInfo: ServerInfo): Promise<boolean> {
      const connected = await this.testConnection(serverInfo)
      if (connected) {
        serverInfo.lastUsed = new Date().toISOString()
        this.currentServer = serverInfo
        this.isConnected = true
        this.addToHistory(serverInfo)
        this.saveToStorage()
        return true
      }
      return false
    },

    // 保存到本地存储
    saveToStorage() {
      if (this.currentServer) {
        uni.setStorageSync('currentServer', JSON.stringify(this.currentServer))
      }
      uni.setStorageSync('serverHistory', JSON.stringify(this.serverHistory))
    },

    // 从本地存储恢复
    restoreFromStorage() {
      try {
        const current = uni.getStorageSync('currentServer')
        const history = uni.getStorageSync('serverHistory')

        if (current) {
          this.currentServer = JSON.parse(current)
        }
        if (history) {
          this.serverHistory = JSON.parse(history)
        }
      } catch (e) {
        console.error('恢复服务器配置失败:', e)
      }
    },

    // 清除服务器配置
    clearServer() {
      this.currentServer = null
      this.isConnected = false
      uni.removeStorageSync('currentServer')
    }
  }
})
