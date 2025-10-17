/**
 * 数据备份服务
 * 支持将localStorage中的结构化数据备份到OSS，以及从OSS恢复数据
 */

import { useConfigStore } from '@/stores/config'
import { ossService } from './ossService'
import { ElMessage, ElMessageBox } from 'element-plus'

export interface BackupData {
  version: string
  timestamp: number
  data: {
    [key: string]: any
  }
  metadata: {
    userAgent: string
    url: string
    totalSize: number
    itemCount: number
  }
}

export interface BackupConfig {
  enabled: boolean
  autoBackupInterval: number // 自动备份间隔（小时）
  maxBackupCount: number // 最大备份数量
  backupPath: string // OSS备份路径
  includeStores: string[] // 包含的store
  excludeKeys: string[] // 排除的localStorage键
}

export interface BackupInfo {
  filename: string
  timestamp: number
  size: number
  version: string
  itemCount: number
}

class DataBackupService {
  private configStore = useConfigStore()
  private autoBackupTimer: number | null = null

  /**
   * 获取默认备份配置
   */
  getDefaultBackupConfig(): BackupConfig {
    return {
      enabled: false,
      autoBackupInterval: 24, // 24小时
      maxBackupCount: 30, // 保留30个备份
      backupPath: 'backups/data',
      includeStores: [
        'crm_store_customer',
        'crm_store_order',
        'crm_store_product',
        'crm_store_performance',
        'crm_store_department',
        'crm_store_service',
        'crm_store_config'
      ],
      excludeKeys: [
        'test_',
        'temp_',
        'cache_'
      ]
    }
  }

  /**
   * 获取当前备份配置
   */
  getBackupConfig(): BackupConfig {
    const saved = localStorage.getItem('crm_backup_config')
    if (saved) {
      try {
        return { ...this.getDefaultBackupConfig(), ...JSON.parse(saved) }
      } catch (error) {
        console.error('备份配置解析失败:', error)
      }
    }
    return this.getDefaultBackupConfig()
  }

  /**
   * 保存备份配置
   */
  saveBackupConfig(config: BackupConfig): void {
    localStorage.setItem('crm_backup_config', JSON.stringify(config))
    
    // 重新设置自动备份
    this.setupAutoBackup()
  }

  /**
   * 设置备份配置并重新启动自动备份
   */
  async setBackupConfig(config: BackupConfig): Promise<void> {
    // 保存配置
    this.saveBackupConfig(config)
    
    // 重新设置自动备份
    this.setupAutoBackup()
    
    console.log('备份配置已更新并重新启动自动备份')
  }

  /**
   * 收集需要备份的数据
   */
  private collectBackupData(config: BackupConfig): BackupData {
    const data: { [key: string]: any } = {}
    let totalSize = 0
    let itemCount = 0

    // 遍历localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      // 检查是否应该包含此键
      const shouldInclude = config.includeStores.some(store => key.startsWith(store)) ||
                           key.startsWith('crm_')

      // 检查是否应该排除此键
      const shouldExclude = config.excludeKeys.some(excludeKey => key.includes(excludeKey))

      if (shouldInclude && !shouldExclude) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            data[key] = JSON.parse(value)
            totalSize += key.length + value.length
            itemCount++
          }
        } catch (error) {
          console.warn(`备份数据时跳过无效键 ${key}:`, error)
        }
      }
    }

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      data,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        totalSize,
        itemCount
      }
    }
  }

  /**
   * 执行手动备份
   */
  async performManualBackup(): Promise<boolean> {
    try {
      if (!ossService.isOSSAvailable()) {
        ElMessage.error('OSS未配置或不可用，无法执行备份')
        return false
      }

      const config = this.getBackupConfig()
      const backupData = this.collectBackupData(config)
      
      // 生成备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${config.backupPath}/manual-backup-${timestamp}.json`
      
      // 转换为JSON字符串
      const jsonData = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      
      // 创建File对象
      const file = new File([blob], `manual-backup-${timestamp}.json`, {
        type: 'application/json'
      })

      // 上传到OSS
      const result = await ossService.uploadFile(file, filename)
      
      if (result.success) {
        // 记录最后备份时间
        localStorage.setItem('crm_last_backup_time', Date.now().toString())
        
        ElMessage.success(`手动备份成功！备份了 ${backupData.metadata.itemCount} 项数据`)
        
        // 清理旧备份
        await this.cleanupOldBackups(config)
        
        return true
      } else {
        ElMessage.error(`备份失败: ${result.error}`)
        return false
      }
    } catch (error) {
      console.error('手动备份失败:', error)
      ElMessage.error(`备份失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return false
    }
  }

  /**
   * 执行自动备份
   */
  async performAutoBackup(): Promise<boolean> {
    try {
      if (!ossService.isOSSAvailable()) {
        console.warn('OSS未配置或不可用，跳过自动备份')
        return false
      }

      const config = this.getBackupConfig()
      if (!config.enabled) {
        return false
      }

      const backupData = this.collectBackupData(config)
      
      // 生成备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${config.backupPath}/auto-backup-${timestamp}.json`
      
      // 转换为JSON字符串
      const jsonData = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      
      // 创建File对象
      const file = new File([blob], `auto-backup-${timestamp}.json`, {
        type: 'application/json'
      })

      // 上传到OSS
      const result = await ossService.uploadFile(file, filename)
      
      if (result.success) {
        // 记录最后备份时间
        localStorage.setItem('crm_last_backup_time', Date.now().toString())
        
        console.log(`自动备份成功！备份了 ${backupData.metadata.itemCount} 项数据`)
        
        // 清理旧备份
        await this.cleanupOldBackups(config)
        
        return true
      } else {
        console.error(`自动备份失败: ${result.error}`)
        return false
      }
    } catch (error) {
      console.error('自动备份失败:', error)
      return false
    }
  }

  /**
   * 获取备份列表
   */
  async getBackupList(): Promise<BackupInfo[]> {
    try {
      if (!ossService.isOSSAvailable()) {
        throw new Error('OSS未配置或不可用')
      }

      const config = this.getBackupConfig()
      
      // 使用OSS服务列出备份文件
      const result = await ossService.listFiles(config.backupPath, 1000)
      
      if (!result.success) {
        throw new Error(result.error || '获取备份列表失败')
      }

      // 过滤并转换备份文件信息
      const backupFiles = result.files?.filter(file => 
        file.key.endsWith('.json') && 
        (file.key.includes('manual-backup-') || file.key.includes('auto-backup-'))
      ) || []

      const backupList: BackupInfo[] = []

      for (const file of backupFiles) {
        try {
          // 从文件名提取时间戳
          const filename = file.key.split('/').pop() || file.key
          const timestampMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)
          
          let timestamp = file.lastModified.getTime()
          if (timestampMatch) {
            // 将文件名中的时间戳转换为Date
            const dateStr = timestampMatch[1].replace(/-/g, ':').replace('T', 'T').slice(0, -3) + ':' + timestampMatch[1].slice(-3)
            const parsedDate = new Date(dateStr.replace(/-/g, ':'))
            if (!isNaN(parsedDate.getTime())) {
              timestamp = parsedDate.getTime()
            }
          }

          backupList.push({
            filename: filename,
            timestamp,
            size: file.size,
            version: '1.0.0', // 默认版本，实际应该从文件内容读取
            itemCount: 0 // 默认值，实际应该从文件内容读取
          })
        } catch (error) {
          console.warn('解析备份文件信息失败:', file.key, error)
        }
      }

      // 按时间戳降序排序
      backupList.sort((a, b) => b.timestamp - a.timestamp)
      
      console.log(`获取到 ${backupList.length} 个备份文件`)
      return backupList
    } catch (error) {
      console.error('获取备份列表失败:', error)
      throw error
    }
  }

  /**
   * 从备份恢复数据
   */
  async restoreFromBackup(filename: string): Promise<boolean> {
    try {
      const confirmed = await ElMessageBox.confirm(
        '恢复备份将覆盖当前所有数据，此操作不可撤销。是否继续？',
        '确认恢复',
        {
          confirmButtonText: '确定恢复',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: false
        }
      )

      if (confirmed !== 'confirm') {
        return false
      }

      if (!ossService.isOSSAvailable()) {
        ElMessage.error('OSS未配置或不可用，无法恢复备份')
        return false
      }

      const config = this.getBackupConfig()
      const filePath = `${config.backupPath}/${filename}`

      // 从OSS下载备份文件
      const downloadResult = await ossService.downloadFile(filePath)
      
      if (!downloadResult.success) {
        ElMessage.error(`下载备份文件失败: ${downloadResult.error}`)
        return false
      }

      if (!downloadResult.content) {
        ElMessage.error('备份文件内容为空')
        return false
      }

      // 解析备份数据
      let backupData: BackupData
      try {
        backupData = JSON.parse(downloadResult.content)
      } catch (error) {
        ElMessage.error('备份文件格式错误，无法解析')
        return false
      }

      // 验证备份数据格式
      if (!backupData.data || !backupData.version || !backupData.timestamp) {
        ElMessage.error('备份文件格式不正确')
        return false
      }

      // 恢复localStorage数据
      let restoredCount = 0
      for (const [key, value] of Object.entries(backupData.data)) {
        try {
          if (typeof value === 'string') {
            localStorage.setItem(key, value)
          } else {
            localStorage.setItem(key, JSON.stringify(value))
          }
          restoredCount++
        } catch (error) {
          console.warn(`恢复数据项失败: ${key}`, error)
        }
      }

      // 更新恢复时间记录
      localStorage.setItem('crm_last_restore_time', Date.now().toString())
      localStorage.setItem('crm_last_restore_file', filename)

      ElMessage.success(`数据恢复成功！恢复了 ${restoredCount} 项数据，页面将自动刷新`)
      
      // 延迟刷新页面，让用户看到成功消息
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
      return true
    } catch (error) {
      if (error === 'cancel') {
        return false
      }
      console.error('恢复备份失败:', error)
      ElMessage.error(`恢复失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return false
    }
  }

  /**
   * 清理旧备份
   */
  private async cleanupOldBackups(config: BackupConfig): Promise<void> {
    try {
      if (config.maxBackupCount <= 0) {
        return
      }

      // 获取当前备份列表
      const backupList = await this.getBackupList()
      
      if (backupList.length <= config.maxBackupCount) {
        console.log(`当前备份数量 ${backupList.length}，未超过限制 ${config.maxBackupCount}，无需清理`)
        return
      }

      // 按时间排序，保留最新的备份
      const sortedBackups = backupList.sort((a, b) => b.timestamp - a.timestamp)
      const backupsToDelete = sortedBackups.slice(config.maxBackupCount)

      console.log(`开始清理 ${backupsToDelete.length} 个旧备份`)

      let deletedCount = 0
      for (const backup of backupsToDelete) {
        try {
          const filePath = `${config.backupPath}/${backup.filename}`
          const success = await ossService.deleteFile(filePath)
          
          if (success) {
            deletedCount++
            console.log(`删除旧备份成功: ${backup.filename}`)
          } else {
            console.warn(`删除旧备份失败: ${backup.filename}`)
          }
        } catch (error) {
          console.error(`删除备份文件失败: ${backup.filename}`, error)
        }
      }

      console.log(`清理旧备份完成，成功删除 ${deletedCount} 个文件`)
    } catch (error) {
      console.error('清理旧备份失败:', error)
    }
  }

  /**
   * 设置自动备份
   */
  setupAutoBackup(): void {
    // 清除现有定时器
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer)
      this.autoBackupTimer = null
    }

    const config = this.getBackupConfig()
    if (!config.enabled || config.autoBackupInterval <= 0) {
      return
    }

    // 设置新的定时器
    const intervalMs = config.autoBackupInterval * 60 * 60 * 1000 // 转换为毫秒
    this.autoBackupTimer = window.setInterval(() => {
      this.performAutoBackup()
    }, intervalMs)

    console.log(`自动备份已设置，间隔: ${config.autoBackupInterval} 小时`)
  }

  /**
   * 停止自动备份
   */
  stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer)
      this.autoBackupTimer = null
      console.log('自动备份已停止')
    }
  }

  /**
   * 初始化备份服务
   */
  initialize(): void {
    // 设置自动备份
    this.setupAutoBackup()
    
    // 监听页面卸载，停止定时器
    window.addEventListener('beforeunload', () => {
      this.stopAutoBackup()
    })
  }

  /**
   * 获取备份统计信息
   */
  getBackupStats(): {
    totalItems: number
    totalSize: string
    lastBackup: string | null
  } {
    const config = this.getBackupConfig()
    const backupData = this.collectBackupData(config)
    
    // 获取上次备份时间
    const lastBackupTime = localStorage.getItem('crm_last_backup_time')
    const lastBackup = lastBackupTime 
      ? new Date(parseInt(lastBackupTime)).toLocaleString()
      : null

    return {
      totalItems: backupData.metadata.itemCount,
      totalSize: this.formatFileSize(backupData.metadata.totalSize),
      lastBackup
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// 创建单例实例
export const dataBackupService = new DataBackupService()

// 在应用启动时初始化
dataBackupService.initialize()