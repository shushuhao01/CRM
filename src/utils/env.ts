/**
 * 环境检测工具
 * 用于判断当前运行环境，决定使用真实API还是本地存储
 */

/**
 * 检测是否为生产环境
 * 生产环境会调用真实API，开发环境使用localStorage
 */
export const isProduction = (): boolean => {
  const hostname = window.location.hostname
  return (
    hostname.includes('abc789.cn') ||
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app') ||
    hostname.includes('railway.app') ||
    (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))
  )
}

/**
 * 检测是否为开发环境
 */
export const isDevelopment = (): boolean => {
  return !isProduction()
}

/**
 * 获取当前环境名称
 */
export const getEnvironment = (): 'production' | 'development' => {
  return isProduction() ? 'production' : 'development'
}

/**
 * 日志输出（带环境标识）
 */
export const envLog = (module: string, message: string, ...args: unknown[]) => {
  const env = isProduction() ? '🌐 生产' : '💻 开发'
  console.log(`[${module}] ${env}: ${message}`, ...args)
}
