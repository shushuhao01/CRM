/**
 * 官网配置 API
 * 从管理后台获取动态配置（版权/备案/联系方式/客服等）
 */
const API_BASE = '/api/v1'

export interface WebsiteConfig {
  copyrightText: string
  icpNumber: string
  policeNumber: string
  techSupport: string
  companyName: string
  companyAddress: string
  systemDescription: string
  contactPhone: string
  contactEmail: string
  customerServiceUrl: string
  serviceQRCode: string
  servicePhone: string
  serviceEmail: string
  workingHours: string
  brandSlogan: string
  contactQRCodeLabel: string
}

// 内存缓存
let cachedConfig: WebsiteConfig | null = null
let fetchPromise: Promise<WebsiteConfig> | null = null

export async function getWebsiteConfig(): Promise<WebsiteConfig> {
  // 已有缓存直接返回
  if (cachedConfig) return cachedConfig

  // 防止重复请求
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/public/website-config`)
      const res = await response.json()
      if (res.success && res.data) {
        cachedConfig = res.data as WebsiteConfig
        return cachedConfig
      }
    } catch (error) {
      console.error('获取官网配置失败:', error)
    }
    // 返回空默认值
    return {} as WebsiteConfig
  })()

  const result = await fetchPromise
  fetchPromise = null
  return result
}

