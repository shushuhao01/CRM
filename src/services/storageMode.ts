/**
 * 存储模式管理服务
 * 实现localStorage和API之间的无缝切换
 */
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService } from './apiService'
import { authApiService } from './authApiService'
import { healthCheckNotificationService } from './healthCheckNotificationService'

export type StorageMode = 'local' | 'api'

export interface StorageModeConfig {
  mode: StorageMode
  autoSync: boolean
  syncInterval: number // 自动同步间隔（分钟）
  fallbackToLocal: boolean // API失败时是否回退到本地存储
  showModeIndicator: boolean // 是否显示模式指示器
}

export interface StorageModeStatus {
  currentMode: StorageMode
  apiAvailable: boolean
  lastSyncTime: number | null
  syncInProgress: boolean
  errorCount: number
  lastError: string | null
}

export class StorageModeService {
  private static instance: StorageModeService
  private config = ref<StorageModeConfig>({
    mode: 'local',
    autoSync: false,
    syncInterval: 5,
    fallbackToLocal: true,
    showModeIndicator: true
  })

  private status = ref<StorageModeStatus>({
    currentMode: 'local',
    apiAvailable: false,
    lastSyncTime: null,
    syncInProgress: false,
    errorCount: 0,
    lastError: null
  })

  private syncTimer: number | null = null
  private healthCheckTimer: number | null = null

  constructor() {
    this.loadConfig()
    this.initializeMode()
    this.startHealthCheck()
    this.setupWatchers()
  }

  static getInstance(): StorageModeService {
    if (!StorageModeService.instance) {
      StorageModeService.instance = new StorageModeService()
    }
    return StorageModeService.instance
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return computed(() => this.config.value)
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return computed(() => this.status.value)
  }

  /**
   * 获取当前存储模式
   */
  getCurrentMode(): StorageMode {
    return this.status.value.currentMode
  }

  /**
   * 是否为API模式
   */
  isApiMode(): boolean {
    return this.status.value.currentMode === 'api'
  }

  /**
   * 是否为本地模式
   */
  isLocalMode(): boolean {
    return this.status.value.currentMode === 'local'
  }

  /**
   * API是否可用
   */
  isApiAvailable(): boolean {
    return this.status.value.apiAvailable
  }

  /**
   * 切换存储模式
   */
  async switchMode(mode: StorageMode, force: boolean = false): Promise<boolean> {
    try {
      console.log(`[StorageMode] 尝试切换到 ${mode} 模式`)

      // 如果切换到API模式，先检查API可用性和认证状态
      if (mode === 'api') {
        const apiAvailable = await this.checkApiHealth()
        if (!apiAvailable) {
          ElMessage.error('API服务不可用，无法切换到API模式')
          return false
        }

        const isAuthenticated = authApiService.isAuthenticated()
        if (!isAuthenticated) {
          ElMessage.error('用户未登录，无法切换到API模式')
          return false
        }
      }

      // 如果不是强制切换，询问用户确认
      if (!force) {
        const confirmResult = await ElMessageBox.confirm(
          `确定要切换到${mode === 'api' ? 'API' : '本地'}存储模式吗？`,
          '切换存储模式',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        if (confirmResult !== 'confirm') {
          return false
        }
      }

      // 执行模式切换
      const oldMode = this.status.value.currentMode
      this.status.value.currentMode = mode
      this.config.value.mode = mode

      // 保存配置
      this.saveConfig()

      // 重新启动同步定时器
      this.restartSyncTimer()

      ElMessage.success(`已切换到${mode === 'api' ? 'API' : '本地'}存储模式`)
      console.log(`[StorageMode] 模式切换成功: ${oldMode} -> ${mode}`)

      return true
    } catch (error) {
      console.error('[StorageMode] 模式切换失败:', error)
      ElMessage.error('模式切换失败')
      return false
    }
  }

  /**
   * 自动选择最佳模式
   */
  async autoSelectMode(): Promise<StorageMode> {
    try {
      // 检查API可用性
      const apiAvailable = await this.checkApiHealth()

      if (apiAvailable && authApiService.isAuthenticated()) {
        console.log('[StorageMode] API可用且已认证，选择API模式')
        await this.switchMode('api', true)
        return 'api'
      } else {
        console.log('[StorageMode] API不可用或未认证，选择本地模式')
        await this.switchMode('local', true)
        return 'local'
      }
    } catch (error) {
      console.error('[StorageMode] 自动选择模式失败:', error)
      await this.switchMode('local', true)
      return 'local'
    }
  }

  /**
   * 检查API健康状态
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const isHealthy = await apiService.healthCheck()
      this.status.value.apiAvailable = isHealthy

      if (isHealthy) {
        this.status.value.errorCount = 0
        this.status.value.lastError = null
      }

      return isHealthy
    } catch (error) {
      console.warn('[StorageMode] API健康检查失败:', error)
      this.status.value.apiAvailable = false
      this.status.value.errorCount++
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      this.status.value.lastError = errorMessage

      // 使用新的通知服务来处理错误提示（只对超级管理员显示）
      await healthCheckNotificationService.showHealthCheckFailureNotification(errorMessage)

      return false
    }
  }

  /**
   * 同步数据（从本地到API或从API到本地）
   */
  async syncData(direction: 'toApi' | 'toLocal' | 'auto' = 'auto'): Promise<boolean> {
    if (this.status.value.syncInProgress) {
      console.warn('[StorageMode] 同步正在进行中，跳过')
      return false
    }

    try {
      this.status.value.syncInProgress = true
      console.log(`[StorageMode] 开始数据同步: ${direction}`)

      // 根据方向执行同步
      let success = false

      if (direction === 'auto') {
        // 自动选择同步方向
        if (this.isApiMode() && this.isApiAvailable()) {
          success = await this.syncLocalToApi()
        } else if (this.isLocalMode()) {
          success = await this.syncApiToLocal()
        }
      } else if (direction === 'toApi') {
        success = await this.syncLocalToApi()
      } else if (direction === 'toLocal') {
        success = await this.syncApiToLocal()
      }

      if (success) {
        this.status.value.lastSyncTime = Date.now()
        ElMessage.success('数据同步成功')
      }

      return success
    } catch (error) {
      console.error('[StorageMode] 数据同步失败:', error)
      ElMessage.error('数据同步失败')
      return false
    } finally {
      this.status.value.syncInProgress = false
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<StorageModeConfig>): void {
    Object.assign(this.config.value, newConfig)
    this.saveConfig()

    // 重新启动定时器
    this.restartSyncTimer()

    console.log('[StorageMode] 配置已更新:', this.config.value)
  }

  /**
   * 获取模式指示器信息
   */
  getModeIndicator() {
    return computed(() => {
      const mode = this.status.value.currentMode
      const apiAvailable = this.status.value.apiAvailable
      const syncInProgress = this.status.value.syncInProgress

      return {
        text: mode === 'api' ? 'API模式' : '本地模式',
        color: mode === 'api' ? (apiAvailable ? 'success' : 'warning') : 'info',
        icon: mode === 'api' ? 'CloudUpload' : 'Folder',
        status: syncInProgress ? '同步中...' : (mode === 'api' && !apiAvailable ? '连接异常' : '正常'),
        showIndicator: this.config.value.showModeIndicator
      }
    })
  }

  /**
   * 初始化模式
   */
  private async initializeMode(): Promise<void> {
    try {
      // 根据配置的模式进行初始化
      const configMode = this.config.value.mode

      if (configMode === 'api') {
        // 检查API可用性
        const apiAvailable = await this.checkApiHealth()
        if (apiAvailable && authApiService.isAuthenticated()) {
          this.status.value.currentMode = 'api'
        } else {
          // 回退到本地模式
          this.status.value.currentMode = 'local'
          if (this.config.value.fallbackToLocal) {
            console.log('[StorageMode] API不可用，回退到本地模式')
          }
        }
      } else {
        this.status.value.currentMode = 'local'
      }

      // 启动自动同步
      this.restartSyncTimer()

      console.log(`[StorageMode] 初始化完成，当前模式: ${this.status.value.currentMode}`)
    } catch (error) {
      console.error('[StorageMode] 初始化失败:', error)
      this.status.value.currentMode = 'local'
    }
  }

  /**
   * 从本地同步到API
   */
  private async syncLocalToApi(): Promise<boolean> {
    // TODO: 实现具体的同步逻辑
    console.log('[StorageMode] 从本地同步到API')
    return true
  }

  /**
   * 从API同步到本地
   */
  private async syncApiToLocal(): Promise<boolean> {
    // TODO: 实现具体的同步逻辑
    console.log('[StorageMode] 从API同步到本地')
    return true
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheck(): void {
    // 🔥 批次271修复：将健康检查间隔从30秒改为12小时（43200000毫秒）
    // 每天只检查2次，避免频繁请求
    this.healthCheckTimer = window.setInterval(() => {
      this.checkApiHealth()
    }, 43200000) // 12小时 = 12 * 60 * 60 * 1000
  }

  /**
   * 重新启动同步定时器
   */
  private restartSyncTimer(): void {
    // 清除旧定时器
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }

    // 如果启用了自动同步，启动新定时器
    if (this.config.value.autoSync && this.config.value.syncInterval > 0) {
      const intervalMs = this.config.value.syncInterval * 60 * 1000
      this.syncTimer = window.setInterval(() => {
        this.syncData('auto')
      }, intervalMs)

      console.log(`[StorageMode] 自动同步定时器已启动，间隔: ${this.config.value.syncInterval}分钟`)
    }
  }

  /**
   * 设置监听器
   */
  private setupWatchers(): void {
    // 监听配置变化
    watch(this.config, () => {
      this.saveConfig()
    }, { deep: true })
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('storage_mode_config')
      if (stored) {
        const config = JSON.parse(stored)
        Object.assign(this.config.value, config)
      }
    } catch (error) {
      console.error('[StorageMode] 加载配置失败:', error)
    }
  }

  /**
   * 保存配置
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('storage_mode_config', JSON.stringify(this.config.value))
    } catch (error) {
      console.error('[StorageMode] 保存配置失败:', error)
    }
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }
}

// 导出单例实例
export const storageModeService = StorageModeService.getInstance()

// 页面卸载时清理定时器
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    storageModeService.destroy()
  })
}
