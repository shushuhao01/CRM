// 🔥 批次268：数据迁移服务，支持自动无缝切换
import { DataExportTool } from '@/utils/dataExport'

export interface MigrationConfig {
  apiBaseUrl: string
  enableAutoMigration: boolean
  migrationApiKey?: string
  fallbackToLocal: boolean
}

export interface MigrationStatus {
  isApiAvailable: boolean
  lastCheckTime: string
  migrationMode: 'local' | 'api' | 'hybrid'
  dataVersion: string
}

export class DataMigrationService {
  private config: MigrationConfig
  private status: MigrationStatus

  constructor() {
    this.config = this.loadMigrationConfig()
    this.status = this.loadMigrationStatus()
  }

  /**
   * 加载迁移配置
   */
  private loadMigrationConfig(): MigrationConfig {
    const configStr = localStorage.getItem('crm_migration_config')
    if (configStr) {
      try {
        return JSON.parse(configStr)
      } catch (error) {
        console.warn('[数据迁移] 配置解析失败:', error)
      }
    }

    // 默认配置
    return {
      apiBaseUrl: '',
      enableAutoMigration: false,
      fallbackToLocal: true
    }
  }

  /**
   * 加载迁移状态
   */
  private loadMigrationStatus(): MigrationStatus {
    const statusStr = localStorage.getItem('crm_migration_status')
    if (statusStr) {
      try {
        return JSON.parse(statusStr)
      } catch (error) {
        console.warn('[数据迁移] 状态解析失败:', error)
      }
    }

    // 默认状态
    return {
      isApiAvailable: false,
      lastCheckTime: new Date().toISOString(),
      migrationMode: 'local',
      dataVersion: '1.0.0'
    }
  }

  /**
   * 保存迁移配置
   */
  saveMigrationConfig(config: Partial<MigrationConfig>) {
    this.config = { ...this.config, ...config }
    localStorage.setItem('crm_migration_config', JSON.stringify(this.config))
    console.log('[数据迁移] 配置已保存:', this.config)
  }

  /**
   * 保存迁移状态
   */
  private saveMigrationStatus() {
    localStorage.setItem('crm_migration_status', JSON.stringify(this.status))
  }

  /**
   * 检查API可用性
   */
  async checkApiAvailability(): Promise<boolean> {
    if (!this.config.apiBaseUrl) {
      this.status.isApiAvailable = false
      this.status.migrationMode = 'local'
      this.saveMigrationStatus()
      return false
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.apiBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.migrationApiKey && {
            'Authorization': `Bearer ${this.config.migrationApiKey}`
          })
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const isAvailable = response.ok
      this.status.isApiAvailable = isAvailable
      this.status.lastCheckTime = new Date().toISOString()
      this.status.migrationMode = isAvailable ? 'api' : (this.config.fallbackToLocal ? 'local' : 'api')

      this.saveMigrationStatus()

      console.log('[数据迁移] API可用性检查:', {
        available: isAvailable,
        mode: this.status.migrationMode
      })

      return isAvailable
    } catch (error) {
      console.warn('[数据迁移] API检查失败:', error)
      this.status.isApiAvailable = false
      this.status.migrationMode = this.config.fallbackToLocal ? 'local' : 'api'
      this.saveMigrationStatus()
      return false
    }
  }

  /**
   * 自动迁移数据到API
   */
  async autoMigrateToApi(): Promise<{ success: boolean; message: string }> {
    if (!this.config.enableAutoMigration) {
      return { success: false, message: '自动迁移未启用' }
    }

    if (!this.config.apiBaseUrl) {
      return { success: false, message: 'API地址未配置' }
    }

    try {
      // 检查API可用性
      const isApiAvailable = await this.checkApiAvailability()
      if (!isApiAvailable) {
        return { success: false, message: 'API不可用' }
      }

      // 导出本地数据
      const exportTool = new DataExportTool()
      const exportResult = await exportTool.exportAllData()

      if (!exportResult.success || !exportResult.data) {
        return { success: false, message: '数据导出失败' }
      }

      // 上传数据到API
      const uploadResult = await this.uploadDataToApi(exportResult.data)

      if (uploadResult.success) {
        // 标记迁移完成
        this.status.migrationMode = 'api'
        this.status.dataVersion = exportResult.data.metadata?.version || '1.0.0'
        this.saveMigrationStatus()

        return { success: true, message: '数据迁移成功' }
      } else {
        return { success: false, message: uploadResult.message || '数据上传失败' }
      }
    } catch (error) {
      console.error('[数据迁移] 自动迁移失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '迁移过程中发生错误'
      }
    }
  }

  /**
   * 上传数据到API
   */
  private async uploadDataToApi(data: any): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/migration/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.migrationApiKey && {
            'Authorization': `Bearer ${this.config.migrationApiKey}`
          })
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[数据迁移] 数据上传成功:', result)
        return { success: true }
      } else {
        const error = await response.text()
        console.error('[数据迁移] 数据上传失败:', error)
        return { success: false, message: `上传失败: ${response.status}` }
      }
    } catch (error) {
      console.error('[数据迁移] 上传请求失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络请求失败'
      }
    }
  }

  /**
   * 获取当前迁移状态
   */
  getMigrationStatus(): MigrationStatus {
    return { ...this.status }
  }

  /**
   * 获取迁移配置
   */
  getMigrationConfig(): MigrationConfig {
    return { ...this.config }
  }

  /**
   * 初始化自动检查
   */
  initAutoCheck() {
    if (!this.config.enableAutoMigration) {
      return
    }

    // 页面加载时检查API可用性
    this.checkApiAvailability()

    // 定期检查API可用性（每5分钟）
    setInterval(() => {
      this.checkApiAvailability()
    }, 5 * 60 * 1000)

    console.log('[数据迁移] 自动检查已启动')
  }

  /**
   * 手动触发迁移
   */
  async triggerMigration(): Promise<{ success: boolean; message: string }> {
    console.log('[数据迁移] 手动触发迁移')
    return await this.autoMigrateToApi()
  }
}

// 创建全局实例
export const dataMigrationService = new DataMigrationService()
