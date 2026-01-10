/**
 * 模块状态服务
 * 用于获取和缓存管理后台设置的模块启用状态
 */
import request from '@/utils/request'

class ModuleStatusService {
  private enabledModules: Set<string> = new Set()
  private lastFetchTime = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
  private isInitialized = false

  /**
   * 获取启用的模块列表
   */
  async getEnabledModules(): Promise<string[]> {
    const now = Date.now()

    // 如果缓存有效，直接返回
    if (this.isInitialized && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return Array.from(this.enabledModules)
    }

    try {
      const response = await request.get('/system/modules/status') as any

      if (response.success && response.data?.enabledModules) {
        this.enabledModules = new Set(response.data.enabledModules as string[])
        this.lastFetchTime = now
        this.isInitialized = true

        console.log('[ModuleStatus] 已更新模块状态:', Array.from(this.enabledModules))
        return Array.from(this.enabledModules)
      }
    } catch (error) {
      console.warn('[ModuleStatus] 获取模块状态失败，使用默认配置:', error)
    }

    // 失败时返回所有模块（保证系统可用）
    const defaultModules = [
      'dashboard', 'customer', 'order', 'product', 'logistics',
      'performance', 'service', 'finance', 'data', 'serviceManagement', 'system'
    ]

    if (!this.isInitialized) {
      this.enabledModules = new Set(defaultModules)
      this.isInitialized = true
    }

    return Array.from(this.enabledModules)
  }

  /**
   * 检查指定模块是否启用
   */
  async isModuleEnabled(moduleKey: string): Promise<boolean> {
    const enabledModules = await this.getEnabledModules()
    return enabledModules.includes(moduleKey)
  }

  /**
   * 强制刷新模块状态
   */
  async refresh(): Promise<void> {
    this.lastFetchTime = 0
    await this.getEnabledModules()
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.enabledModules.clear()
    this.lastFetchTime = 0
    this.isInitialized = false
  }
}

// 导出单例
export const moduleStatusService = new ModuleStatusService()
export default moduleStatusService
