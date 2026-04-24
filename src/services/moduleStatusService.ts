/**
 * 模块状态服务
 * 用于获取和缓存管理后台设置的模块启用状态
 */
import request from '@/utils/request'

// 只在开发环境输出详细日志
const DEBUG = import.meta.env.DEV
const debugLog = (...args: any[]) => { if (DEBUG) console.log(...args) }

// 默认启用的所有模块列表(降级策略)
const DEFAULT_MODULES = [
  'dashboard',        // 数据看板 - 始终显示
  'customer',         // 客户管理
  'order',            // 订单管理
  'finance',          // 财务管理
  'logistics',        // 物流管理
  'service',          // 售后管理
  'data',             // 资料管理
  'performance',      // 业绩统计
  'product',          // 商品管理
  'service-management',// 服务管理(通话)
  'wecom',            // 企微管理
  'system'            // 系统管理
]

class ModuleStatusService {
  private enabledModules: Set<string> = new Set()
  private lastFetchTime = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
  private isInitialized = false
  private isFetching = false // 防止并发请求

  /**
   * 获取启用的模块列表
   */
  async getEnabledModules(): Promise<string[]> {
    const now = Date.now()

    // 如果缓存有效,直接返回
    if (this.isInitialized && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      debugLog('[ModuleStatus] 使用缓存的模块状态')
      return Array.from(this.enabledModules)
    }

    // 防止并发请求
    if (this.isFetching) {
      debugLog('[ModuleStatus] 正在获取模块状态,等待结果...')
      // 等待当前请求完成
      await this.waitForFetch()
      return Array.from(this.enabledModules)
    }

    this.isFetching = true

    try {
      debugLog('[ModuleStatus] ========== 开始获取模块状态 ==========')
      const response = await request.get('/system/modules/status') as any

      // 兼容两种响应格式：
      // 1. 响应拦截器已解包: response = { enabledModules: [...] }
      // 2. 原始格式: response = { success: true, data: { enabledModules: [...] } }
      let modules: string[] | undefined
      if (response?.enabledModules) {
        // 格式1：拦截器已解包，response 就是 data
        modules = response.enabledModules as string[]
        debugLog('[ModuleStatus] 检测到已解包格式，直接获取 enabledModules')
      } else if (response?.success && response?.data?.enabledModules) {
        // 格式2：原始完整格式
        modules = response.data.enabledModules as string[]
        debugLog('[ModuleStatus] 检测到原始格式，从 response.data 获取 enabledModules')
      }

      if (modules) {

        debugLog('[ModuleStatus] 提取的模块列表:', modules)
        debugLog('[ModuleStatus] 是否为数组:', Array.isArray(modules))
        debugLog('[ModuleStatus] 数组长度:', modules.length)

        // 验证返回的数据
        if (Array.isArray(modules) && modules.length > 0) {
          // 🔥 SaaS模式：如果有租户模块配置（登录时保存），做客户端侧交集过滤
          const tenantModulesStr = localStorage.getItem('tenantModules')
          if (tenantModulesStr) {
            try {
              const tenantModules: string[] = JSON.parse(tenantModulesStr)
              if (Array.isArray(tenantModules) && tenantModules.length > 0) {
                modules = modules.filter(id => id === 'dashboard' || tenantModules.includes(id))
                debugLog('[ModuleStatus] 租户模块过滤后:', modules)
              }
            } catch { /* ignore */ }
          }

          this.enabledModules = new Set(modules)
          this.lastFetchTime = now
          this.isInitialized = true

          debugLog('[ModuleStatus] ✅ 成功更新模块状态:', Array.from(this.enabledModules))
          debugLog('[ModuleStatus] ========== 模块状态获取完成 ==========')
          return Array.from(this.enabledModules)
        } else {
          console.warn('[ModuleStatus] ⚠️ API返回的模块列表为空,使用默认配置')
          return this.useDefaultModules()
        }
      } else {
        console.warn('[ModuleStatus] ⚠️ API响应格式不正确,使用默认配置')
        console.warn('[ModuleStatus] 响应对象:', response)
        return this.useDefaultModules()
      }
    } catch (error: any) {
      console.error('[ModuleStatus] ❌ 获取模块状态失败:', error.message || error)
      console.error('[ModuleStatus] 错误详情:', error)

      // 如果之前有缓存,继续使用旧缓存
      if (this.isInitialized && this.enabledModules.size > 0) {
        debugLog('[ModuleStatus] 使用旧缓存的模块状态')
        return Array.from(this.enabledModules)
      }

      // 否则使用默认配置
      return this.useDefaultModules()
    } finally {
      this.isFetching = false
    }
  }

  /**
   * 使用默认模块列表
   * @returns 默认模块ID数组
   */
  private useDefaultModules(): string[] {
    console.log('[ModuleStatus] 使用默认模块列表,保证系统可用')
    this.enabledModules = new Set(DEFAULT_MODULES)
    this.isInitialized = true
    this.lastFetchTime = Date.now()
    return Array.from(this.enabledModules)
  }

  /**
   * 等待当前请求完成
   */
  private async waitForFetch(): Promise<void> {
    let attempts = 0
    const maxAttempts = 50 // 最多等待5秒

    while (this.isFetching && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    if (attempts >= maxAttempts) {
      console.warn('[ModuleStatus] 等待超时,使用默认配置')
    }
  }

  /**
   * 检查指定模块是否启用
   * @param moduleKey 模块ID
   * @returns 是否启用
   */
  async isModuleEnabled(moduleKey: string): Promise<boolean> {
    const enabledModules = await this.getEnabledModules()
    return enabledModules.includes(moduleKey)
  }

  /**
   * 强制刷新模块状态
   */
  async refresh(): Promise<void> {
    console.log('[ModuleStatus] 强制刷新模块状态')
    this.lastFetchTime = 0
    this.isInitialized = false
    await this.getEnabledModules()
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    console.log('[ModuleStatus] 清除模块状态缓存')
    this.enabledModules.clear()
    this.lastFetchTime = 0
    this.isInitialized = false
    this.isFetching = false
  }

  /**
   * 获取缓存状态(用于调试)
   */
  getCacheStatus(): {
    isInitialized: boolean
    cacheAge: number
    modulesCount: number
    modules: string[]
  } {
    return {
      isInitialized: this.isInitialized,
      cacheAge: Date.now() - this.lastFetchTime,
      modulesCount: this.enabledModules.size,
      modules: Array.from(this.enabledModules)
    }
  }
}

// 导出单例
export const moduleStatusService = new ModuleStatusService()
export default moduleStatusService
