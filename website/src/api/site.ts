/**
 * 官网内容 API
 * 对接后端 /api/v1/public/site/*
 * 用于官网展示文章、公告(更新日志)、案例、帮助文档、导航菜单与站点设置
 */
const API_BASE = '/api/v1'

export interface SiteNavItem {
  id: string
  parentId?: string
  name: string
  url?: string
  icon?: string
  target: string
  groupName: string
  sort: number
  isVisible: number
  isExternal: number
}

export interface SiteArticleItem {
  id: string
  title: string
  slug?: string
  category?: string
  cover?: string
  summary?: string
  tags?: string
  author?: string
  viewCount?: number
  isTop?: number
  publishedAt?: string
  updatedAt?: string
}

export interface SiteArticleDetail extends SiteArticleItem {
  content?: string
  source?: string
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  prev?: { id: string; title: string; slug?: string } | null
  next?: { id: string; title: string; slug?: string } | null
}

export interface SiteNoticeItem {
  id: string
  title: string
  slug?: string
  summary?: string
  isTop?: number
  publishedAt?: string
  updatedAt?: string
}

export interface SiteNoticeDetail extends SiteNoticeItem {
  content?: string
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
}

export interface SiteCaseItem {
  id: string
  title: string
  slug?: string
  clientName?: string
  industry?: string
  cover?: string
  summary?: string
  tags?: string
  viewCount?: number
  isTop?: number
  publishedAt?: string
}

export interface SiteCaseDetail extends SiteCaseItem {
  content?: string
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
}

export interface SiteDocItem {
  id: string
  title: string
  slug?: string
  category?: string
  parentId?: string
  summary?: string
  sort?: number
  viewCount?: number
  updatedAt?: string
}

export interface SiteDocDetail extends SiteDocItem {
  content?: string
  siblings?: { id: string; title: string; slug?: string; category?: string }[]
}

export interface PagedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface SitePublicSettings {
  siteName?: string
  siteUrl?: string
  siteLogo?: string
  siteFavicon?: string
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  icpNumber?: string
  policeNumber?: string
  copyright?: string
  contactPhone?: string
  contactEmail?: string
  websiteUrl?: string
  crmUrl?: string
}

/** 通用 GET 请求（返回 data，失败返回 null） */
async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}/public/site${path}`)
    const res = await response.json()
    if (res && res.success && res.data !== undefined) return res.data as T
    return null
  } catch (error) {
    console.error('官网内容请求失败:', path, error)
    return null
  }
}

/** 站点设置（SEO/基础信息） */
export function getSiteSettings() {
  return apiGet<SitePublicSettings>('/settings')
}

/** 文章列表 */
export function getArticles(
  params: { category?: string; keyword?: string; page?: number; pageSize?: number } = {}
) {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  const q = qs.toString()
  return apiGet<PagedResult<SiteArticleItem>>(`/articles${q ? `?${q}` : ''}`)
}

/** 文章详情 */
export function getArticle(slugOrId: string) {
  return apiGet<SiteArticleDetail>(`/articles/${encodeURIComponent(slugOrId)}`)
}

/** 公告(更新日志)列表 */
export function getNotices(params: { page?: number; pageSize?: number } = {}) {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  const q = qs.toString()
  return apiGet<PagedResult<SiteNoticeItem>>(`/notices${q ? `?${q}` : ''}`)
}

/** 公告(更新日志)详情 */
export function getNotice(slugOrId: string) {
  return apiGet<SiteNoticeDetail>(`/notices/${encodeURIComponent(slugOrId)}`)
}

/** 案例列表 */
export function getCases(params: { industry?: string; page?: number; pageSize?: number } = {}) {
  const qs = new URLSearchParams()
  if (params.industry) qs.set('industry', params.industry)
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  const q = qs.toString()
  return apiGet<PagedResult<SiteCaseItem>>(`/cases${q ? `?${q}` : ''}`)
}

/** 案例详情 */
export function getCase(slugOrId: string) {
  return apiGet<SiteCaseDetail>(`/cases/${encodeURIComponent(slugOrId)}`)
}

/** 帮助文档列表 */
export function getDocs(params: { category?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  const q = qs.toString()
  return apiGet<SiteDocItem[]>(`/docs${q ? `?${q}` : ''}`)
}

/** 帮助文档详情 */
export function getDoc(slugOrId: string) {
  return apiGet<SiteDocDetail>(`/docs/${encodeURIComponent(slugOrId)}`)
}

/** 导航菜单 */
export function getSiteNav(group: 'header' | 'footer') {
  return apiGet<SiteNavItem[]>(`/nav?group=${group}`)
}

export interface ChannelResolveResult {
  code: string
  name: string
  channel: string
  targetPath: string
}

/** 渠道编码归一化（与后端保持一致：去空格 + 转小写 + 限长 32） */
export function normalizeChannel(v: unknown): string {
  return String(v ?? '').trim().toLowerCase().slice(0, 32)
}

const CH_COOKIE = 'ch_ref'
const CH_TTL_DAYS = 30

/** 写入渠道来源 Cookie（30 天归因窗口，path=/ 全站可用） */
export function setChannelCookie(code: string): void {
  if (typeof document === 'undefined') return
  const c = normalizeChannel(code)
  if (!c) return
  const maxAge = CH_TTL_DAYS * 24 * 60 * 60
  document.cookie = `${CH_COOKIE}=${encodeURIComponent(c)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

/** 读取渠道来源 Cookie */
export function getChannelCode(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${CH_COOKIE}=([^;]+)`))
  return m ? normalizeChannel(decodeURIComponent(m[1])) : ''
}

/** 解析当前渠道码：URL ?ch= 优先（并写入 Cookie），其次读取 Cookie */
export function resolveChannelCode(): string {
  if (typeof window === 'undefined') return ''
  try {
    const fromUrl = normalizeChannel(new URLSearchParams(window.location.search).get('ch'))
    if (fromUrl) {
      setChannelCookie(fromUrl)
      return fromUrl
    }
  } catch {
    // 忽略 URL 解析异常
  }
  return getChannelCode()
}

/** 生成 / 读取本地访客标识（用于 UV 去重，仅存浏览器本地） */
export function getVisitorId(): string {
  if (typeof localStorage === 'undefined') return ''
  try {
    let id = localStorage.getItem('crm_vid')
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('crm_vid', id)
    }
    return id
  } catch {
    return ''
  }
}

/** 渠道短链解析：命中返回跳转信息，否则返回 null */
export function resolveChannel(code: string): Promise<ChannelResolveResult | null> {
  return apiGet<ChannelResolveResult>(`/channel/resolve/${encodeURIComponent(normalizeChannel(code))}`)
}

/**
 * 访问上报（静默，失败不影响页面）
 * 服务端会依据 UA 自动解析设备 / 系统 / 浏览器，前端只需上报 type/path/visitorId/channelCode
 */
export function trackPageVisit(payload: {
  type?: 'pv' | 'hb' | 'uv' | 'download' | 'buy'
  path?: string
  referer?: string
  visitorId?: string
  channelCode?: string
}): void {
  try {
    fetch(`${API_BASE}/public/site/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {})
  } catch {
    /* 忽略埋点错误 */
  }
}

/** 页面访问埋点：携带路径 / 来源 / 访客标识 / 渠道码（失败不影响前台） */
export function trackPageview(path: string): void {
  if (typeof window === 'undefined') return
  trackPageVisit({
    type: 'pv',
    path: path || window.location.pathname + window.location.search,
    referer: document.referrer || '',
    visitorId: getVisitorId(),
    channelCode: resolveChannelCode()
  })
}

/** 在线心跳：停留页面期间定期上报，供后台「实时在线」统计（不计入 PV，失败不影响前台） */
export function sendHeartbeat(): void {
  if (typeof window === 'undefined') return
  trackPageVisit({ type: 'hb', visitorId: getVisitorId() })
}

/** 转化埋点：下载 / 购买点击（自动带上访客标识与渠道码，失败不影响前台） */
export function trackEvent(type: 'download' | 'buy'): void {
  if (typeof window === 'undefined') return
  trackPageVisit({ type, visitorId: getVisitorId(), channelCode: resolveChannelCode() })
}

/** 详情页 SEO：设置浏览器标题与 meta 描述/关键词 */
export function applySeoMeta(options: { title?: string; description?: string; keywords?: string }) {
  if (options.title) document.title = options.title
  const setMeta = (name: string, content?: string) => {
    if (!content) return
    let el = document.querySelector(`meta[name="${name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', name)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }
  setMeta('description', options.description)
  setMeta('keywords', options.keywords)
}
