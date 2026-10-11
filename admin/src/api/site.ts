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

  // ==================== SEO 主动推送 ====================
  seoPush: (data?: { urls?: string[]; engine?: 'baidu' | 'indexnow' | 'all' }) =>
    request.post<any>('/site/seo-push', data || {})
}

export default siteApi
