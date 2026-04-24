/**
 * 会员中心 URL 工具
 * 统一获取会员中心链接，消除硬编码和重复逻辑
 *
 * SaaS 模式：自动从当前服务器域名推导官网会员中心地址
 * 私有部署：使用系统配置中的 websiteUrl（运营方预设）
 */

/**
 * 判断是否为占位符/无效 URL
 */
function isPlaceholderUrl(url: string): boolean {
  if (!url) return true
  const lower = url.trim().toLowerCase()
  return lower.includes('example.com') || lower === 'http://' || lower === 'https://'
}

/**
 * 确保 URL 有协议前缀（没有则补 https://）
 * 防止浏览器把裸域名当作相对路径，导致跳转到 CRM 内部
 */
function ensureAbsoluteUrl(url: string): string {
  if (!url) return ''
  const trimmed = url.trim()
  // 已有协议前缀
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  // 补全协议：生产环境默认 https，开发环境跟随当前页面协议
  const protocol = (typeof window !== 'undefined' && window.location?.protocol === 'http:') ? 'http' : 'https'
  return `${protocol}://${trimmed}`
}

/**
 * 从 localStorage 读取系统配置中的 websiteUrl
 */
function getConfiguredWebsiteUrl(): string {
  try {
    const configData = localStorage.getItem('crm_config_system')
    if (configData) {
      const config = JSON.parse(configData)
      const websiteUrl = config?.websiteUrl
      if (websiteUrl && !isPlaceholderUrl(websiteUrl)) {
        // 确保 URL 有协议前缀，去除尾部斜杠
        return ensureAbsoluteUrl(websiteUrl).replace(/\/+$/, '')
      }
    }
  } catch {
    // 静默处理
  }
  return ''
}

/**
 * 获取当前部署模式
 */
function getDeployMode(): 'private' | 'saas' {
  try {
    const stored = localStorage.getItem('crm_deploy_mode') as 'private' | 'saas' | null
    if (stored === 'private' || stored === 'saas') return stored
  } catch {
    // 静默处理
  }
  return 'saas'
}

/**
 * SaaS 模式下：根据当前 CRM 域名自动推导官网 URL
 *
 * 逻辑：
 * 1. 优先使用系统配置的 websiteUrl
 * 2. 如果未配置，根据当前域名推导：
 *    - 当前域名为 crm.xxx.com → 推导为 https://www.xxx.com  或 https://xxx.com
 *    - 当前域名为 xxx.com:5173 → 推导为 https://xxx.com:8080（开发环境）
 *    - 当前域名为 xxx.com → 直接使用当前 origin（CRM 和官网同域不同端口的情况交给 nginx 反代）
 */
function deriveWebsiteUrlFromOrigin(): string {
  try {
    const origin = window.location.origin
    const hostname = window.location.hostname
    const protocol = window.location.protocol

    // 开发环境端口映射: CRM 5173 → website 8080
    if (window.location.port === '5173') {
      return `${protocol}//${hostname}:8080`
    }

    // 如果 CRM 使用 crm. 子域名，推导为去掉 crm. 前缀或替换为 www.
    if (hostname.startsWith('crm.')) {
      const baseDomain = hostname.substring(4) // 去掉 'crm.'
      return `${protocol}//www.${baseDomain}`
    }

    // 其他情况：假设官网和 CRM 在同域名不同路径（由 nginx 反代），直接使用当前 origin
    return origin
  } catch {
    return ''
  }
}

/**
 * 获取会员中心基础 URL（不含路径）
 * SaaS 模式：优先配置 → 自动推导
 * 私有部署：仅使用配置
 */
export function getWebsiteBaseUrl(): string {
  const configuredUrl = getConfiguredWebsiteUrl()
  if (configuredUrl) {
    return configuredUrl
  }

  const deployMode = getDeployMode()
  if (deployMode === 'saas') {
    return deriveWebsiteUrlFromOrigin()
  }

  // 私有部署未配置 websiteUrl 时返回空
  return ''
}

/**
 * 获取会员中心登录页 URL
 */
export function getMemberCenterLoginUrl(): string {
  const baseUrl = getWebsiteBaseUrl()
  if (!baseUrl) return ''
  return baseUrl + '/member/login'
}

/**
 * 获取会员中心续费页 URL
 */
export function getMemberCenterRenewUrl(): string {
  const baseUrl = getWebsiteBaseUrl()
  if (!baseUrl) return ''
  return baseUrl + '/member/renew'
}

