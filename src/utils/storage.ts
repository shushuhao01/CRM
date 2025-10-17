/**
 * 统一数据持久化工具
 * 提供自动保存和恢复功能，解决页面刷新后数据丢失问题
 * 针对宝塔面板部署环境优化
 */
import { defineStore } from 'pinia'
import { watch } from 'vue'
import { getStorageConfig } from '@/config/storage'

export interface StorageConfig {
  key: string
  version?: string
  ttl?: number // 过期时间（毫秒）
  compress?: boolean // 是否压缩
}

export class PersistentStorage {
  private static instance: PersistentStorage
  private storageKeys = new Set<string>()
  private isStorageAvailable: boolean

  static getInstance(): PersistentStorage {
    if (!PersistentStorage.instance) {
      PersistentStorage.instance = new PersistentStorage()
    }
    return PersistentStorage.instance
  }

  constructor() {
    this.isStorageAvailable = this.checkStorageAvailability()
  }

  /**
   * 检查localStorage是否可用
   */
  private checkStorageAvailability(): boolean {
    try {
      if (typeof Storage === 'undefined' || !window.localStorage) {
        console.warn('[Storage] localStorage不可用')
        return false
      }

      // 测试写入和读取
      const testKey = '__storage_test__'
      const testValue = 'test'
      localStorage.setItem(testKey, testValue)
      const retrieved = localStorage.getItem(testKey)
      localStorage.removeItem(testKey)
      
      if (retrieved !== testValue) {
        console.warn('[Storage] localStorage功能异常')
        return false
      }

      return true
    } catch (error) {
      console.warn('[Storage] localStorage不可用:', error)
      return false
    }
  }

  /**
   * 检查存储空间是否足够
   */
  private checkStorageQuota(data: string): boolean {
    try {
      // 估算当前使用的存储空间
      let currentSize = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key)
          if (value) {
            currentSize += key.length + value.length
          }
        }
      }

      // 使用配置文件中的存储限制
      const config = getStorageConfig()
      const maxSize = config.MAX_STORAGE_SIZE
      const newDataSize = data.length * 2 // UTF-16编码，每字符2字节
      
      if (currentSize + newDataSize > maxSize) {
        // 存储空间不足
        return false
      }

      return true
    } catch (error) {
      // 检查失败时允许继续尝试
      return true
    }
  }

  /**
   * 保存数据到localStorage
   */
  save<T>(config: StorageConfig, data: T): boolean {
    if (!this.isStorageAvailable) {
      console.warn(`[Storage] localStorage不可用，跳过保存 ${config.key}`)
      return false
    }

    try {
      const storageData = {
        data,
        timestamp: Date.now(),
        version: config.version || '1.0.0',
        ttl: config.ttl
      }

      const serialized = JSON.stringify(storageData)
      
      // 检查存储空间
      if (!this.checkStorageQuota(serialized)) {
        console.warn(`[Storage] 存储空间不足，尝试清理过期数据`)
        this.cleanupExpiredData()
        
        // 再次检查
        if (!this.checkStorageQuota(serialized)) {
          console.error(`[Storage] 存储空间仍然不足，无法保存 ${config.key}`)
          return false
        }
      }

      localStorage.setItem(config.key, serialized)
      this.storageKeys.add(config.key)
      
      console.log(`[Storage] 已保存数据到 ${config.key}`)
      return true
    } catch (error) {
      console.error(`[Storage] 保存数据失败 ${config.key}:`, error)
      
      // 如果是存储空间不足的错误，尝试清理
      if (error instanceof DOMException && error.code === 22) {
        console.warn(`[Storage] 存储空间不足，尝试清理数据`)
        this.cleanupExpiredData()
        
        // 重试一次
        try {
          localStorage.setItem(config.key, JSON.stringify({
            data,
            timestamp: Date.now(),
            version: config.version || '1.0.0',
            ttl: config.ttl
          }))
          this.storageKeys.add(config.key)
          console.log(`[Storage] 重试保存成功 ${config.key}`)
          return true
        } catch (retryError) {
          console.error(`[Storage] 重试保存仍然失败 ${config.key}:`, retryError)
        }
      }
      
      return false
    }
  }

  /**
   * 清理过期数据
   */
  private cleanupExpiredData(): void {
    try {
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('crm_store_')) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const storageData = JSON.parse(stored)
              if (storageData.ttl && Date.now() - storageData.timestamp > storageData.ttl) {
                keysToRemove.push(key)
              }
            }
          } catch (error) {
            // 如果解析失败，也标记为需要清理
            keysToRemove.push(key)
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        this.storageKeys.delete(key)
      })
      
      if (keysToRemove.length > 0) {
        console.log(`[Storage] 已清理 ${keysToRemove.length} 个过期数据`)
      }
    } catch (error) {
      console.error('[Storage] 清理过期数据失败:', error)
    }
  }

  /**
   * 从localStorage加载数据
   */
  load<T>(config: StorageConfig): T | null {
    if (!this.isStorageAvailable) {
      console.warn(`[Storage] localStorage不可用，跳过加载 ${config.key}`)
      return null
    }

    try {
      const stored = localStorage.getItem(config.key)
      if (!stored) {
        return null
      }

      let storageData: any
      try {
        storageData = JSON.parse(stored)
      } catch (parseError) {
        console.error(`[Storage] 数据格式错误，清除损坏数据 ${config.key}:`, parseError)
        this.remove(config.key)
        return null
      }

      // 验证数据结构
      if (!storageData || typeof storageData !== 'object' || !storageData.hasOwnProperty('data')) {
        console.warn(`[Storage] 数据结构无效，清除 ${config.key}`)
        this.remove(config.key)
        return null
      }
      
      // 检查版本
      if (config.version && storageData.version !== config.version) {
        console.warn(`[Storage] 版本不匹配，清除旧数据 ${config.key}`)
        this.remove(config.key)
        return null
      }

      // 检查过期时间
      if (storageData.ttl && Date.now() - storageData.timestamp > storageData.ttl) {
        console.warn(`[Storage] 数据已过期，清除 ${config.key}`)
        this.remove(config.key)
        return null
      }

      console.log(`[Storage] 已加载数据从 ${config.key}`)
      return storageData.data
    } catch (error) {
      console.error(`[Storage] 加载数据失败 ${config.key}:`, error)
      // 如果加载失败，尝试清除可能损坏的数据
      this.remove(config.key)
      return null
    }
  }

  /**
   * 删除数据
   */
  remove(key: string): void {
    localStorage.removeItem(key)
    this.storageKeys.delete(key)
    console.log(`[Storage] 已删除数据 ${key}`)
  }

  /**
   * 清除所有管理的数据
   */
  clear(): void {
    this.storageKeys.forEach(key => {
      localStorage.removeItem(key)
    })
    this.storageKeys.clear()
    console.log('[Storage] 已清除所有数据')
  }

  /**
   * 获取存储统计信息
   */
  getStats(): { keys: string[], totalSize: number } {
    let totalSize = 0
    const keys = Array.from(this.storageKeys)
    
    keys.forEach(key => {
      const data = localStorage.getItem(key)
      if (data) {
        totalSize += data.length
      }
    })

    return { keys, totalSize }
  }
}

export interface PersistentStoreOptions {
  version?: string
  ttl?: number
  saveInterval?: number // 自动保存间隔（毫秒）
  exclude?: string[] // 排除的字段
}

/**
 * 创建持久化存储的 Pinia store
 */
export function createPersistentStore<T extends Record<string, any>>(
  storeId: string,
  storeDefinition: () => T,
  options: PersistentStoreOptions = {}
) {
  return defineStore(storeId, () => {
    const config: StorageConfig = {
      key: `crm_store_${storeId}`,
      version: options.version || '1.0.0',
      ttl: options.ttl
    }

    const storage = PersistentStorage.getInstance()

    // 执行原始store定义
    const storeData = storeDefinition()

    // 尝试从localStorage恢复数据
    const savedData = storage.load<any>(config)
    if (savedData && typeof savedData === 'object') {
      try {
        // 恢复ref数据
        Object.keys(savedData).forEach(key => {
          if (storeData[key] && typeof storeData[key] === 'object' && 'value' in storeData[key]) {
            try {
              // 验证数据类型匹配
              const currentType = typeof storeData[key].value
              const savedType = typeof savedData[key]
              
              if (currentType === savedType || (Array.isArray(storeData[key].value) && Array.isArray(savedData[key]))) {
                storeData[key].value = savedData[key]
              } else {
                console.warn(`[Store] ${storeId}.${key} 数据类型不匹配，跳过恢复`)
              }
            } catch (restoreError) {
              console.warn(`[Store] 恢复字段 ${key} 失败:`, restoreError)
            }
          }
        })
        console.log(`[Store] 已恢复 ${storeId} 的数据`)
      } catch (error) {
        console.error(`[Store] ${storeId} 数据恢复过程中发生错误:`, error)
      }
    }

    // 保存数据到localStorage
    const saveToStorage = () => {
      try {
        const dataToSave: any = {}
        Object.keys(storeData).forEach(key => {
          // 只保存ref数据，跳过computed和方法
          if (storeData[key] && typeof storeData[key] === 'object' && 'value' in storeData[key]) {
            // 深拷贝数据，避免引用问题
            try {
              dataToSave[key] = JSON.parse(JSON.stringify(storeData[key].value))
            } catch (serializeError) {
              console.warn(`[Store] 序列化字段 ${key} 失败，跳过保存:`, serializeError)
            }
          }
        })

        if (options.exclude && options.exclude.length > 0) {
          options.exclude.forEach(field => {
            delete dataToSave[field]
          })
        }

        const success = storage.save(config, dataToSave)
        if (!success) {
          console.warn(`[Store] ${storeId} 数据保存失败`)
        }
      } catch (error) {
        console.error(`[Store] ${storeId} 保存过程中发生错误:`, error)
      }
    }

    // 监听数据变化并自动保存
    Object.keys(storeData).forEach(key => {
      if (storeData[key] && typeof storeData[key] === 'object' && 'value' in storeData[key]) {
        watch(storeData[key], () => {
          saveToStorage()
        }, { deep: true })
      }
    })

    // 设置定时保存
    if (options.saveInterval && options.saveInterval > 0) {
      setInterval(() => {
        saveToStorage()
      }, options.saveInterval)
    }

    return storeData
  })
}

// 导出单例实例
export const persistentStorage = PersistentStorage.getInstance()

// 存储键名常量
export const STORAGE_KEYS = {
  ORDERS: 'crm_store_orders',
  CUSTOMERS: 'crm_store_customers', 
  PERFORMANCE: 'crm_store_performance',
  DEPARTMENTS: 'crm_store_departments',
  SERVICES: 'crm_store_services',
  DATA: 'crm_store_data',
  NOTIFICATIONS: 'crm_store_notifications',
  PRODUCTS: 'crm_store_product' // 商品数据存储键名
} as const