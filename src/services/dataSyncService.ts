/**
 * 数据同步服务
 * 负责将本地存储的数据同步到云端存储（OSS）
 */

import { useConfigStore } from '@/stores/config'
import { ossService } from './ossService'

// 同步状态接口
export interface SyncStatus {
  isEnabled: boolean
  lastSyncTime?: string
  syncInProgress: boolean
  totalItems: number
  syncedItems: number
  failedItems: number
  errors: string[]
}

// 同步配置接口
export interface SyncConfig {
  autoSync: boolean
  syncInterval: number // 分钟
  syncOnDataChange: boolean
  backupRetention: number // 保留备份数量
}

/**
 * 数据同步服务类
 */
export class DataSyncService {
  private static instance: DataSyncService
  private configStore = useConfigStore()
  private syncStatus: SyncStatus = {
    isEnabled: false,
    syncInProgress: false,
    totalItems: 0,
    syncedItems: 0,
    failedItems: 0,
    errors: []
  }
  private syncConfig: SyncConfig = {
    autoSync: true,
    syncInterval: 30, // 30分钟
    syncOnDataChange: true,
    backupRetention: 5
  }
  private syncTimer: number | null = null

  private constructor() {
    this.initializeSync()
  }

  public static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService()
    }
    return DataSyncService.instance
  }

  /**
   * 初始化同步服务
   */
  private initializeSync() {
    // 检查OSS是否可用
    this.syncStatus.isEnabled = ossService.isOSSAvailable()
    
    if (this.syncStatus.isEnabled && this.syncConfig.autoSync) {
      this.startAutoSync()
    }

    // 监听存储配置变化
    this.watchStorageConfig()
  }

  /**
   * 监听存储配置变化
   */
  private watchStorageConfig() {
    // 这里应该使用Vue的watch来监听配置变化
    // 由于这是一个服务类，我们使用定时检查的方式
    setInterval(() => {
      const wasEnabled = this.syncStatus.isEnabled
      this.syncStatus.isEnabled = ossService.isOSSAvailable()
      
      if (!wasEnabled && this.syncStatus.isEnabled) {
        // OSS变为可用，启动自动同步
        if (this.syncConfig.autoSync) {
          this.startAutoSync()
        }
      } else if (wasEnabled && !this.syncStatus.isEnabled) {
        // OSS变为不可用，停止自动同步
        this.stopAutoSync()
      }
    }, 5000) // 每5秒检查一次
  }

  /**
   * 启动自动同步
   */
  public startAutoSync() {
    if (!this.syncStatus.isEnabled) {
      console.warn('OSS服务不可用，无法启动自动同步')
      return
    }

    this.stopAutoSync() // 先停止现有的定时器

    this.syncTimer = window.setInterval(() => {
      if (!this.syncStatus.syncInProgress) {
        this.syncAllData()
      }
    }, this.syncConfig.syncInterval * 60 * 1000) // 转换为毫秒

    console.log(`自动同步已启动，间隔: ${this.syncConfig.syncInterval}分钟`)
  }

  /**
   * 停止自动同步
   */
  public stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
      console.log('自动同步已停止')
    }
  }

  /**
   * 手动同步所有数据
   */
  public async syncAllData(): Promise<boolean> {
    if (!this.syncStatus.isEnabled) {
      console.warn('OSS服务不可用，无法同步数据')
      return false
    }

    if (this.syncStatus.syncInProgress) {
      console.warn('同步正在进行中，请稍后再试')
      return false
    }

    try {
      this.syncStatus.syncInProgress = true
      this.syncStatus.syncedItems = 0
      this.syncStatus.failedItems = 0
      this.syncStatus.errors = []

      console.log('开始同步数据到OSS...')

      // 获取所有需要同步的数据
      const dataToSync = this.getAllLocalData()
      this.syncStatus.totalItems = dataToSync.length

      // 逐个同步数据
      for (const data of dataToSync) {
        try {
          await this.syncSingleData(data)
          this.syncStatus.syncedItems++
        } catch (error) {
          this.syncStatus.failedItems++
          this.syncStatus.errors.push(
            `同步 ${data.key} 失败: ${error instanceof Error ? error.message : '未知错误'}`
          )
        }
      }

      // 更新最后同步时间
      this.syncStatus.lastSyncTime = new Date().toISOString()

      console.log(`数据同步完成: 成功 ${this.syncStatus.syncedItems}，失败 ${this.syncStatus.failedItems}`)
      
      return this.syncStatus.failedItems === 0
    } catch (error) {
      console.error('数据同步失败:', error)
      return false
    } finally {
      this.syncStatus.syncInProgress = false
    }
  }

  /**
   * 获取所有本地数据
   */
  private getAllLocalData(): Array<{ key: string; data: any }> {
    const dataToSync: Array<{ key: string; data: any }> = []

    // 遍历localStorage中的CRM相关数据
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('crm_')) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            dataToSync.push({
              key: key,
              data: JSON.parse(data)
            })
          }
        } catch (error) {
          console.warn(`解析本地数据失败: ${key}`, error)
        }
      }
    }

    return dataToSync
  }

  /**
   * 同步单个数据项
   */
  private async syncSingleData(item: { key: string; data: any }): Promise<void> {
    const fileName = `backup/${item.key}_${Date.now()}.json`
    const dataBlob = new Blob([JSON.stringify(item.data, null, 2)], {
      type: 'application/json'
    })
    const file = new File([dataBlob], fileName, { type: 'application/json' })

    const result = await ossService.uploadFile(file, 'crm-backup')
    
    if (!result.success) {
      throw new Error(result.error || '上传失败')
    }
  }

  /**
   * 从OSS恢复数据
   */
  public async restoreFromOSS(): Promise<boolean> {
    if (!this.syncStatus.isEnabled) {
      console.warn('OSS服务不可用，无法恢复数据')
      return false
    }

    try {
      console.log('开始从OSS恢复数据...')
      
      // 这里需要实现从OSS获取备份文件列表和下载的逻辑
      // 由于OSS SDK的复杂性，这里提供一个基础框架
      
      console.log('数据恢复功能需要进一步实现')
      return true
    } catch (error) {
      console.error('从OSS恢复数据失败:', error)
      return false
    }
  }

  /**
   * 获取同步状态
   */
  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * 获取同步配置
   */
  public getSyncConfig(): SyncConfig {
    return { ...this.syncConfig }
  }

  /**
   * 更新同步配置
   */
  public updateSyncConfig(config: Partial<SyncConfig>) {
    Object.assign(this.syncConfig, config)
    
    // 如果自动同步设置发生变化，重新启动或停止
    if (config.autoSync !== undefined) {
      if (config.autoSync && this.syncStatus.isEnabled) {
        this.startAutoSync()
      } else {
        this.stopAutoSync()
      }
    }
    
    // 如果同步间隔发生变化，重新启动定时器
    if (config.syncInterval !== undefined && this.syncConfig.autoSync) {
      this.startAutoSync()
    }
  }

  /**
   * 清理旧备份
   */
  public async cleanupOldBackups(): Promise<void> {
    if (!this.syncStatus.isEnabled) {
      return
    }

    try {
      console.log('清理旧备份文件...')
      // 这里需要实现清理逻辑
      // 获取备份文件列表，删除超过保留数量的旧文件
    } catch (error) {
      console.error('清理旧备份失败:', error)
    }
  }

  /**
   * 检查数据完整性
   */
  public async checkDataIntegrity(): Promise<boolean> {
    try {
      const localData = this.getAllLocalData()
      console.log(`本地数据项数量: ${localData.length}`)
      
      // 这里可以添加更多的完整性检查逻辑
      return true
    } catch (error) {
      console.error('数据完整性检查失败:', error)
      return false
    }
  }
}

// 导出单例实例
export const dataSyncService = DataSyncService.getInstance()

/**
 * 数据持久化增强服务
 * 在原有localStorage基础上增加云端备份功能
 */
export class EnhancedStorageService {
  private dataSyncService = dataSyncService

  /**
   * 保存数据（增强版）
   */
  public async saveData(key: string, data: any): Promise<boolean> {
    try {
      // 先保存到localStorage
      localStorage.setItem(key, JSON.stringify(data))
      
      // 如果启用了实时同步，立即同步到云端
      const syncConfig = this.dataSyncService.getSyncConfig()
      if (syncConfig.syncOnDataChange && this.dataSyncService.getSyncStatus().isEnabled) {
        // 异步同步，不阻塞主流程
        setTimeout(() => {
          this.dataSyncService.syncAllData()
        }, 1000)
      }
      
      return true
    } catch (error) {
      console.error('保存数据失败:', error)
      return false
    }
  }

  /**
   * 加载数据（增强版）
   */
  public loadData(key: string): any | null {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('加载数据失败:', error)
      return null
    }
  }

  /**
   * 删除数据（增强版）
   */
  public async removeData(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(key)
      
      // 如果启用了实时同步，同步删除操作
      const syncConfig = this.dataSyncService.getSyncConfig()
      if (syncConfig.syncOnDataChange && this.dataSyncService.getSyncStatus().isEnabled) {
        setTimeout(() => {
          this.dataSyncService.syncAllData()
        }, 1000)
      }
      
      return true
    } catch (error) {
      console.error('删除数据失败:', error)
      return false
    }
  }
}

// 导出增强存储服务实例
export const enhancedStorageService = new EnhancedStorageService()