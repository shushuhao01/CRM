/**
 * 全局配置服务
 * 管理超级管理员的全局配置，确保配置在所有用户间同步
 */
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from './apiService'
import { authApiService } from './authApiService'
import { shouldUseMockApi } from '@/api/mock'

export interface GlobalStorageConfig {
  mode: 'local' | 'api' | 'auto'
  autoSync: boolean
  syncInterval: number // 分钟
  apiEndpoint: string
  lastUpdatedBy: string
  lastUpdatedAt: string
  version: number
}

export interface GlobalConfigResponse {
  storageConfig: GlobalStorageConfig
}

export class GlobalConfigService {
  private static instance: GlobalConfigService
  
  // 全局配置状态
  public readonly config = ref<GlobalStorageConfig>({
    mode: 'local',
    autoSync: true,
    syncInterval: 30,
    apiEndpoint: '/api/v1',
    lastUpdatedBy: '',
    lastUpdatedAt: '',
    version: 1
  })

  // 服务状态
  public readonly status = reactive({
    loading: false,
    syncing: false,
    lastSyncAt: null as string | null,
    error: null as string | null
  })

  private syncTimer: number | null = null
  private readonly STORAGE_KEY = 'global_storage_config'
  private readonly SYNC_INTERVAL = 60000 // 1分钟检查一次

  private constructor() {
    this.loadLocalConfig()
    this.startPeriodicSync()
    this.setupConfigWatcher()
  }

  static getInstance(): GlobalConfigService {
    if (!GlobalConfigService.instance) {
      GlobalConfigService.instance = new GlobalConfigService()
    }
    return GlobalConfigService.instance
  }

  /**
   * 检查当前用户是否为超级管理员
   */
  private isSuperAdmin(): boolean {
    const user = authApiService.getLocalUserInfo()
    return user?.role === 'admin' || authApiService.hasRole('super_admin')
  }

  /**
   * 加载本地配置
   */
  private loadLocalConfig(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsedConfig = JSON.parse(stored)
        this.config.value = { ...this.config.value, ...parsedConfig }
        console.log('[GlobalConfig] 本地配置已加载:', this.config.value)
      }
    } catch (error) {
      console.error('[GlobalConfig] 加载本地配置失败:', error)
    }
  }

  /**
   * 保存配置到本地存储
   */
  private saveLocalConfig(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config.value))
      console.log('[GlobalConfig] 配置已保存到本地')
    } catch (error) {
      console.error('[GlobalConfig] 保存本地配置失败:', error)
    }
  }

  /**
   * 从服务器获取全局配置
   */
  async fetchGlobalConfig(): Promise<GlobalStorageConfig | null> {
    try {
      this.status.loading = true
      this.status.error = null

      // 在Mock API模式下，直接返回本地配置
      if (shouldUseMockApi()) {
        console.log('[GlobalConfig] Mock API模式 - 使用本地配置')
        this.status.lastSyncAt = new Date().toISOString()
        return this.config.value
      }

      const response = await apiService.get<GlobalConfigResponse>('/system/global-config')
      const serverConfig = response.storageConfig

      // 检查版本，如果服务器版本更新，则更新本地配置
      if (serverConfig.version > this.config.value.version) {
        this.config.value = serverConfig
        this.saveLocalConfig()
        console.log('[GlobalConfig] 全局配置已从服务器更新:', serverConfig)
        
        ElMessage.success('全局配置已更新')
      }

      this.status.lastSyncAt = new Date().toISOString()
      return serverConfig

    } catch (error) {
      console.warn('[GlobalConfig] 获取全局配置失败:', error)
      this.status.error = error instanceof Error ? error.message : '获取配置失败'
      return null
    } finally {
      this.status.loading = false
    }
  }

  /**
   * 更新全局配置（仅超级管理员）
   */
  async updateGlobalConfig(newConfig: Partial<GlobalStorageConfig>): Promise<boolean> {
    if (!this.isSuperAdmin()) {
      ElMessage.error('只有超级管理员可以修改全局配置')
      return false
    }

    try {
      this.status.syncing = true
      this.status.error = null

      const user = authApiService.getLocalUserInfo()
      const updatedConfig: GlobalStorageConfig = {
        ...this.config.value,
        ...newConfig,
        lastUpdatedBy: user?.realName || user?.username || '未知用户',
        lastUpdatedAt: new Date().toISOString(),
        version: this.config.value.version + 1
      }

      // 在Mock API模式下，只更新本地配置
      if (shouldUseMockApi()) {
        console.log('[GlobalConfig] Mock API模式 - 仅更新本地配置:', updatedConfig)
        this.config.value = updatedConfig
        this.saveLocalConfig()
        ElMessage.success('全局配置已更新（本地模式）')
        return true
      }

      // 发送到服务器
      await apiService.put('/system/global-config', {
        storageConfig: updatedConfig
      })

      // 更新本地配置
      this.config.value = updatedConfig
      this.saveLocalConfig()

      console.log('[GlobalConfig] 全局配置已更新:', updatedConfig)
      ElMessage.success('全局配置已更新并同步')

      return true

    } catch (error) {
      console.error('[GlobalConfig] 更新全局配置失败:', error)
      this.status.error = error instanceof Error ? error.message : '更新配置失败'
      ElMessage.error('更新全局配置失败: ' + this.status.error)
      return false
    } finally {
      this.status.syncing = false
    }
  }

  /**
   * 启动定期同步
   */
  private startPeriodicSync(): void {
    // 立即执行一次同步
    this.fetchGlobalConfig()

    // 设置定期同步
    this.syncTimer = window.setInterval(() => {
      this.fetchGlobalConfig()
    }, this.SYNC_INTERVAL)

    console.log('[GlobalConfig] 定期同步已启动')
  }

  /**
   * 停止定期同步
   */
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      console.log('[GlobalConfig] 定期同步已停止')
    }
  }

  /**
   * 设置配置监听器
   */
  private setupConfigWatcher(): void {
    watch(
      () => this.config.value,
      (newConfig) => {
        this.saveLocalConfig()
        console.log('[GlobalConfig] 配置已更新:', newConfig)
      },
      { deep: true }
    )
  }

  /**
   * 手动同步配置
   */
  async syncConfig(): Promise<void> {
    await this.fetchGlobalConfig()
  }

  /**
   * 重置配置为默认值（仅超级管理员）
   */
  async resetToDefault(): Promise<boolean> {
    if (!this.isSuperAdmin()) {
      ElMessage.error('只有超级管理员可以重置全局配置')
      return false
    }

    const defaultConfig: Partial<GlobalStorageConfig> = {
      mode: 'local',
      autoSync: true,
      syncInterval: 30,
      apiEndpoint: '/api/v1'
    }

    return await this.updateGlobalConfig(defaultConfig)
  }

  /**
   * 获取配置更新历史信息
   */
  getConfigInfo(): {
    lastUpdatedBy: string
    lastUpdatedAt: string
    version: number
    canModify: boolean
  } {
    return {
      lastUpdatedBy: this.config.value.lastUpdatedBy,
      lastUpdatedAt: this.config.value.lastUpdatedAt,
      version: this.config.value.version,
      canModify: this.isSuperAdmin()
    }
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopPeriodicSync()
  }
}

// 导出单例实例
export const globalConfigService = GlobalConfigService.getInstance()

// 页面卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalConfigService.destroy()
  })
}