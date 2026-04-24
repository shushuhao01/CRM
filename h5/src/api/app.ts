import api from './index'

/** 工作台首页数据 */
export function getHomeData() {
  return api.get('/app/home')
}

/** 数据统计 */
export function getStatsData(params: { period?: string }) {
  return api.get('/app/stats', { params })
}

/** 增强版详细统计（多维度图表数据） */
export function getStatsDetail() {
  return api.get('/app/stats-detail')
}

/** 个人信息 */
export function getProfile() {
  return api.get('/app/profile')
}

/** 最近动态 */
export function getActivities(params?: { page?: number; pageSize?: number }) {
  return api.get('/app/activities', { params })
}

/** 消息通知 */
export function getNotifications() {
  return api.get('/app/notifications')
}
