/**
 * 管理后台 - 官网管理 API
 * 对应后端 /api/v1/admin/site/*
 */
import request from './request'

export interface PagedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 官网文章/公告 */
export interface SiteArticle {
  id: string
  type: 'article' | 'notice'
  title: string
  slug?: string
  category?: string
  cover?: string
  summary?: string
  content?: string
  tags?: string
  author?: string
  source?: string
  status: 'draft' | 'published'
  isTop: number
  isRecommend: number
  viewCount: number
  sort: number
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

/** 官网客户案例 */
export interface SiteCase {
  id: string
  title: string
  slug?: string
  clientName?: string
  industry?: string
  cover?: string
  summary?: string
  content?: string
  tags?: string
  status: 'draft' | 'published'
  isTop: number
  isRecommend: number
  viewCount: number
  sort: number
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

/** 官网帮助文档 */
export interface SiteDoc {
  id: string
  title: string
  slug?: string
  category?: string
  parentId?: string
  summary?: string
  content?: string
  sort: number
  status: 'draft' | 'published'
  viewCount: number
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

/** 官网导航菜单 */
export interface SiteNav {
  id: string
  parentId?: string
  name: string
  url?: string
  icon?: string
  target: '_self' | '_blank'
  groupName: 'header' | 'footer'
  sort: number
  isVisible: number
  isExternal: number
  createdAt: string
  updatedAt: string
}

/** 通用名称-数值对（用于饼图/柱状图维度） */
export interface NameValue {
  name: string
  value: number
}

/** 官网访问明细 */
export interface SiteVisitLog {
  id: string
  visitDate: string
  visitHour: number
  ip: string
  country: string
  province: string
  city: string
  isp: string
  device: string
  os: string
  browser: string
  source: string
  referer: string
  path: string
  visitorId: string
  channelCode: string
  userAgent: string
  createdAt: string
}

/** 官网多维流量分析结果 */
export interface SiteAnalytics {
  range: { days: number; start: string; end: string }
  summary: {
    pv: number
    uv: number
    ips: number
    downloads: number
    buyClicks: number
    todayPv: number
    todayUv: number
    avgPv: number
    peakHour: number
    peakHourPv: number
  }
  trend: { dates: string[]; pv: number[]; uv: number[] }
  hours: { labels: string[]; pv: number[] }
  sources: NameValue[]
  devices: NameValue[]
  os: NameValue[]
  browsers: NameValue[]
  regions: NameValue[]
  isps: NameValue[]
  pages: { path: string; pv: number; uv: number }[]
  ips: { ip: string; province: string; city: string; isp: string; pv: number; lastPath: string; lastTime: string }[]
  daily: { date: string; pv: number; uv: number; downloads: number; buyClicks: number }[]
}

/** 渠道链接（含完整推广短链地址） */
export interface ChannelLink {
  id: string
  code: string
  name: string
  channel: string
  targetPath: string
  remark: string | null
  enabled: number
  clickCount: number
  uniqueClickCount: number
  createdAt: string
  updatedAt: string
  shortUrl: string
}

/** 渠道新建 / 更新入参 */
export interface ChannelPayload {
  name: string
  code?: string
  channel?: string
  targetPath?: string
  remark?: string | null
  enabled?: number
}

/** 渠道访问明细查询参数 */
export type ChannelVisitQuery = {
  page?: number
  pageSize?: number
  ip?: string
  path?: string
  device?: string
  source?: string
  keyword?: string
  start?: string
  end?: string
}

/** 官网媒体库文件（富文本素材库） */
export interface SiteMedia {
  id: string
  filename: string
  path: string
  size: number
  mime?: string
  width?: number
  height?: number
  uploadedBy?: string
  createdAt: string
}

export const siteApi = {
  // ==================== 站点设置 ====================
  getSettings: () => request.get<Record<string, string>>('/site/settings'),
  updateSettings: (data: Record<string, any>) => request.put<Record<string, string>>('/site/settings', data),

  // ==================== 文章 / 公告 ====================
  getArticles: (params?: { type?: string; status?: string; keyword?: string; category?: string; page?: number; pageSize?: number }) =>
    request.get<PagedResult<SiteArticle>>('/site/articles', { params }),
  getArticle: (id: string) => request.get<SiteArticle>(`/site/articles/${id}`),
  createArticle: (data: Partial<SiteArticle>) => request.post<SiteArticle>('/site/articles', data),
  updateArticle: (id: string, data: Partial<SiteArticle>) => request.put<SiteArticle>(`/site/articles/${id}`, data),
  removeArticle: (id: string) => request.delete(`/site/articles/${id}`),

  // ==================== 案例 ====================
  getCases: (params?: { status?: string; keyword?: string; industry?: string; page?: number; pageSize?: number }) =>
    request.get<PagedResult<SiteCase>>('/site/cases', { params }),
  getCase: (id: string) => request.get<SiteCase>(`/site/cases/${id}`),
  createCase: (data: Partial<SiteCase>) => request.post<SiteCase>('/site/cases', data),
  updateCase: (id: string, data: Partial<SiteCase>) => request.put<SiteCase>(`/site/cases/${id}`, data),
  removeCase: (id: string) => request.delete(`/site/cases/${id}`),

  // ==================== 帮助文档 ====================
  getDocs: (params?: { status?: string; keyword?: string; category?: string; page?: number; pageSize?: number }) =>
    request.get<PagedResult<SiteDoc>>('/site/docs', { params }),
  getDoc: (id: string) => request.get<SiteDoc>(`/site/docs/${id}`),
  createDoc: (data: Partial<SiteDoc>) => request.post<SiteDoc>('/site/docs', data),
  updateDoc: (id: string, data: Partial<SiteDoc>) => request.put<SiteDoc>(`/site/docs/${id}`, data),
  removeDoc: (id: string) => request.delete(`/site/docs/${id}`),

  // ==================== 导航菜单 ====================
  getNav: (params?: { group?: string }) => request.get<SiteNav[]>('/site/nav', { params }),
  createNav: (data: Partial<SiteNav>) => request.post<SiteNav>('/site/nav', data),
  updateNav: (id: string, data: Partial<SiteNav>) => request.put<SiteNav>(`/site/nav/${id}`, data),
  removeNav: (id: string) => request.delete(`/site/nav/${id}`),

  // ==================== 访问统计 ====================
  getStatsOverview: () => request.get<any>('/site/stats/overview'),
  getVisits: (params?: { path?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
    request.get<PagedResult<any>>('/site/stats/visits', { params }),
  getAnalytics: () => request.get<any>('/site/stats/analytics'),
  clearStats: (days = 90) => request.delete('/site/stats/clear', { params: { days } }),

  // ==================== 流量分析 / 访问明细 ====================
  /** 多维流量分析（趋势/来源/设备/系统/浏览器/地域/运营商/页面/IP） */
  getTrafficAnalytics: (days = 30, start?: string, end?: string) =>
    request.get<SiteAnalytics>('/site/analytics', { params: { days, start, end } }),
  /** 实时在线访客数（最近 N 分钟内有访问行为） */
  getOnline: (minutes = 5) => request.get<{ online: number; minutes: number }>('/site/online', { params: { minutes } }),
  /** 访问明细分页查询 */
  getVisitLogs: (params?: {
    page?: number
    pageSize?: number
    ip?: string
    path?: string
    device?: string
    source?: string
    keyword?: string
    start?: string
    end?: string
  }) => request.get<PagedResult<SiteVisitLog>>('/site/visits', { params }),

  // ==================== 渠道链接（推广短链） ====================
  getChannels: (params?: { page?: number; pageSize?: number; keyword?: string }) =>
    request.get<PagedResult<ChannelLink>>('/site/channels', { params }),
  createChannel: (data: ChannelPayload) => request.post<ChannelLink>('/site/channels', data),
  updateChannel: (id: string, data: Partial<ChannelPayload>) => request.put<ChannelLink>(`/site/channels/${id}`, data),
  removeChannel: (id: string) => request.delete(`/site/channels/${id}`),
  getChannelAnalytics: (code: string, days = 30, start?: string, end?: string) =>
    request.get<SiteAnalytics>(`/site/channels/${encodeURIComponent(code)}/analytics`, { params: { days, start, end } }),
  getChannelVisits: (code: string, params?: ChannelVisitQuery) =>
    request.get<PagedResult<SiteVisitLog>>(`/site/channels/${encodeURIComponent(code)}/visits`, { params }),
  getChannelQrcode: (code: string) =>
    request.get<{ code: string; url: string; dataUrl: string }>(`/site/channels/${encodeURIComponent(code)}/qrcode`),

  // ==================== SEO 主动推送 ====================
  seoPush: (data?: { urls?: string[]; engine?: 'baidu' | 'indexnow' | 'all' }) =>
    request.post<any>('/site/seo-push', data || {}),

  // ==================== 媒体库（富文本素材库） ====================
  getMediaList: (params?: { page?: number; pageSize?: number; keyword?: string }) =>
    request.get<PagedResult<SiteMedia>>('/site/media', { params }),
  uploadSiteImage: (formData: FormData) =>
    request.post<SiteMedia>('/site/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteMedia: (id: string) => request.delete(`/site/media/${id}`)
}

export default siteApi
