/**
 * 生产环境存储配置
 * 确保在宝塔面板部署后的稳定性
 */

export const STORAGE_CONFIG = {
  // 生产环境配置
  PRODUCTION: {
    // 数据版本，升级时需要更新
    VERSION: '1.0.0',
    
    // 数据过期时间（7天）
    TTL: 7 * 24 * 60 * 60 * 1000,
    
    // 自动保存间隔（5分钟）
    SAVE_INTERVAL: 5 * 60 * 1000,
    
    // 最大存储大小警告阈值（6MB）
    MAX_STORAGE_SIZE: 6 * 1024 * 1024,
    
    // 需要排除持久化的敏感字段
    EXCLUDE_FIELDS: [
      'password',
      'token',
      'secret',
      'privateKey',
      'sessionId'
    ]
  },
  
  // 开发环境配置
  DEVELOPMENT: {
    VERSION: '1.0.0-dev',
    TTL: 24 * 60 * 60 * 1000, // 1天
    SAVE_INTERVAL: 30 * 1000, // 30秒
    MAX_STORAGE_SIZE: 8 * 1024 * 1024, // 8MB
    EXCLUDE_FIELDS: []
  }
}

// 根据环境获取配置
export function getStorageConfig() {
  const isProduction = import.meta.env.PROD
  return isProduction ? STORAGE_CONFIG.PRODUCTION : STORAGE_CONFIG.DEVELOPMENT
}

// 存储键名映射
export const STORAGE_KEYS = {
  ORDERS: 'crm_store_orders',
  CUSTOMERS: 'crm_store_customers', 
  PERFORMANCE: 'crm_store_performance',
  DEPARTMENTS: 'crm_store_departments',
  SERVICES: 'crm_store_services',
  DATA: 'crm_store_data',
  NOTIFICATIONS: 'crm_store_notifications',
  USER_PREFERENCES: 'crm_user_preferences',
  SYSTEM_SETTINGS: 'crm_system_settings'
} as const

// 浏览器兼容性检查
export function checkBrowserCompatibility(): {
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  webSQL: boolean
} {
  return {
    localStorage: typeof Storage !== 'undefined' && !!window.localStorage,
    sessionStorage: typeof Storage !== 'undefined' && !!window.sessionStorage,
    indexedDB: typeof indexedDB !== 'undefined',
    webSQL: typeof openDatabase !== 'undefined'
  }
}

// 存储空间使用情况
export function getStorageUsage(): {
  used: number
  available: number
  percentage: number
} {
  try {
    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          used += key.length + value.length
        }
      }
    }
    
    // localStorage通常限制为5-10MB，这里假设10MB
    const total = 10 * 1024 * 1024
    const available = total - used
    const percentage = (used / total) * 100
    
    return {
      used,
      available,
      percentage
    }
  } catch (error) {
    console.error('获取存储使用情况失败:', error)
    return {
      used: 0,
      available: 0,
      percentage: 0
    }
  }
}