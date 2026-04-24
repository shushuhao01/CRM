/**
 * 企微客户群管理 API (V2.0)
 */
import request from '@/utils/request'

/** 获取客户群列表 */
export const getWecomCustomerGroups = (params: {
  configId?: number
  keyword?: string
  status?: string
  ownerUserId?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/customer-groups', { params, showError: false } as any)
}

/** 获取客户群详情 */
export const getWecomCustomerGroupDetail = (id: number) => {
  return request.get(`/wecom/customer-groups/${id}`)
}

/** 获取客户群统计 */
export const getWecomCustomerGroupStats = (configId?: number) => {
  return request.get('/wecom/customer-groups/stats/summary', { params: { configId }, showError: false } as any)
}

/** 同步客户群 */
export const syncWecomCustomerGroups = (configId: number) => {
  return request.post('/wecom/customer-groups/sync', { configId })
}

// ==================== 群模板 API ====================

/** 获取群模板列表 */
export const getGroupTemplates = (params?: { configId?: number }) => {
  return request.get('/wecom/group-templates', { params, showError: false } as any)
}

/** 创建群模板 */
export const createGroupTemplate = (data: any) => {
  return request.post('/wecom/group-templates', data)
}

/** 更新群模板 */
export const updateGroupTemplate = (id: number, data: any) => {
  return request.put(`/wecom/group-templates/${id}`, data)
}

/** 删除群模板 */
export const deleteGroupTemplate = (id: number) => {
  return request.delete(`/wecom/group-templates/${id}`)
}

// ==================== 入群欢迎语 API ====================

/** 获取欢迎语列表 */
export const getGroupWelcomes = (params?: { configId?: number }) => {
  return request.get('/wecom/group-welcomes', { params, showError: false } as any)
}

/** 创建欢迎语 */
export const createGroupWelcome = (data: any) => {
  return request.post('/wecom/group-welcomes', data)
}

/** 更新欢迎语 */
export const updateGroupWelcome = (id: number, data: any) => {
  return request.put(`/wecom/group-welcomes/${id}`, data)
}

/** 删除欢迎语 */
export const deleteGroupWelcome = (id: number) => {
  return request.delete(`/wecom/group-welcomes/${id}`)
}

// ==================== 防骚扰规则 API ====================

/** 获取防骚扰规则列表 */
export const getAntiSpamRules = (params?: { configId?: number }) => {
  return request.get('/wecom/anti-spam-rules', { params, showError: false } as any)
}

/** 创建防骚扰规则 */
export const createAntiSpamRule = (data: any) => {
  return request.post('/wecom/anti-spam-rules', data)
}

/** 更新防骚扰规则 */
export const updateAntiSpamRule = (id: number, data: any) => {
  return request.put(`/wecom/anti-spam-rules/${id}`, data)
}

/** 删除防骚扰规则 */
export const deleteAntiSpamRule = (id: number) => {
  return request.delete(`/wecom/anti-spam-rules/${id}`)
}

// ==================== 群发消息 API ====================

/** 获取群发任务列表 */
export const getGroupBroadcasts = (params?: { configId?: number }) => {
  return request.get('/wecom/group-broadcasts', { params, showError: false } as any)
}

/** 创建群发任务 */
export const createGroupBroadcast = (data: any) => {
  return request.post('/wecom/group-broadcasts', data)
}

/** 取消群发任务 */
export const cancelGroupBroadcast = (id: number) => {
  return request.put(`/wecom/group-broadcasts/${id}/cancel`)
}

/** 删除群发任务 */
export const deleteGroupBroadcast = (id: number) => {
  return request.delete(`/wecom/group-broadcasts/${id}`)
}

/** 获取群发详情 */
export const getGroupBroadcastDetail = (id: number) => {
  return request.get(`/wecom/group-broadcasts/${id}`)
}

// ==================== 群数据统计 API ====================

/** 获取群趋势数据 */
export const getGroupStatsTrend = (params: { configId?: number; dateRange?: string; startDate?: string; endDate?: string }) => {
  return request.get('/wecom/customer-groups/stats/trend', { params, showError: false } as any)
}

/** 获取群活跃排行 */
export const getGroupStatsRank = (params: { configId?: number; dateRange?: string }) => {
  return request.get('/wecom/customer-groups/stats/rank', { params, showError: false } as any)
}

// ==================== 标签 API ====================

/** 获取企微标签列表 */
export const getWecomCorpTags = (configId?: number) => {
  return request.get('/wecom/corp-tags', { params: { configId }, showError: false } as any)
}

// ==================== 群成员操作 API ====================

/** 踢出群成员（企微API: groupchat/member/del，仅限外部客户） */
export const kickGroupMember = (chatId: string, userIds: string[]) => {
  return request.post('/wecom/customer-groups/kick-member', { chatId, userIds })
}

