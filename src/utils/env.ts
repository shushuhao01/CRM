/**
 * 环境检测和配置工具
 * 自动识别开发/生产环境，提供对应的配置
 */

export interface EnvConfig {
  isDevelopment: boolean
  isProduction: boolean
  apiBaseUrl: string
  storageType: 'localStorage' | 'database'
}

/**
 * 检测是否为开发环境
 */
export const isDevelopment = (): boolean => {
  const hostname = window.location.hostname
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('192.168') ||
    hostname.includes('dev.') ||
    hostname.includes('test.')
  )
}

/**
 * 检测是否为生产环境
 */
export const isProduction = (): boolean => {
  return !isDevelopment()
}

/**
 * 获取API基础URL
 */
export const getApiBaseUrl = (): string => {
  if (isDevelopment()) {
    return '/mock-api'
  }
  // 生产环境从环境变量读取，或使用默认值
  return import.meta.env.VITE_API_BASE_URL || 'https://your-domain.com/api'
}

/**
 * 获取存储类型
 */
export const getStorageType = (): 'localStorage' | 'database' => {
  return isDevelopment() ? 'localStorage' : 'database'
}

/**
 * 获取完整环境配置
 */
export const getEnvConfig = (): EnvConfig => {
  const dev = isDevelopment()
  return {
    isDevelopment: dev,
    isProduction: !dev,
    apiBaseUrl: getApiBaseUrl(),
    storageType: getStorageType()
  }
}

/**
 * 打印环境信息（调试用）
 */
export const logEnvInfo = (): void => {
  const config = getEnvConfig()
  console.log('=== 环境配置 ===')
  console.log('环境:', config.isDevelopment ? '开发环境' : '生产环境')
  console.log('API地址:', config.apiBaseUrl)
  console.log('存储方式:', config.storageType)
  console.log('主机名:', window.location.hostname)
}
