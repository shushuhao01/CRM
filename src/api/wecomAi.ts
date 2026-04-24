/**
 * 企微AI助手 API - V4.0新增
 */
import request from '@/utils/request'

// ==================== AI模型 ====================

export const getAiModels = () => {
  return request.get('/wecom/ai/models')
}

export const createAiModel = (data: any) => {
  return request.post('/wecom/ai/models', data)
}

export const updateAiModel = (id: number, data: any) => {
  return request.put(`/wecom/ai/models/${id}`, data)
}

export const deleteAiModel = (id: number) => {
  return request.delete(`/wecom/ai/models/${id}`)
}

export const testAiModel = (id: number) => {
  return request.post(`/wecom/ai/models/${id}/test`)
}

export const setDefaultAiModel = (id: number) => {
  return request.put(`/wecom/ai/models/${id}/default`)
}

// ==================== 智能体 ====================

export const getAiAgents = () => {
  return request.get('/wecom/ai/agents')
}

export const createAiAgent = (data: any) => {
  return request.post('/wecom/ai/agents', data)
}

export const updateAiAgent = (id: number, data: any) => {
  return request.put(`/wecom/ai/agents/${id}`, data)
}

export const deleteAiAgent = (id: number) => {
  return request.delete(`/wecom/ai/agents/${id}`)
}

// ==================== 知识库 ====================

export const getKnowledgeBases = () => {
  return request.get('/wecom/ai/knowledge-bases')
}

export const createKnowledgeBase = (data: any) => {
  return request.post('/wecom/ai/knowledge-bases', data)
}

export const updateKnowledgeBase = (id: number, data: any) => {
  return request.put(`/wecom/ai/knowledge-bases/${id}`, data)
}

export const deleteKnowledgeBase = (id: number) => {
  return request.delete(`/wecom/ai/knowledge-bases/${id}`)
}

export const getKnowledgeEntries = (kbId: number, params?: { page?: number; pageSize?: number; keyword?: string }) => {
  return request.get(`/wecom/ai/knowledge-bases/${kbId}/entries`, { params })
}

export const createKnowledgeEntry = (kbId: number, data: any) => {
  return request.post(`/wecom/ai/knowledge-bases/${kbId}/entries`, data)
}

export const updateKnowledgeEntry = (id: number, data: any) => {
  return request.put(`/wecom/ai/knowledge-entries/${id}`, data)
}

export const deleteKnowledgeEntry = (id: number) => {
  return request.delete(`/wecom/ai/knowledge-entries/${id}`)
}

export const reindexKnowledgeBase = (id: number) => {
  return request.post(`/wecom/ai/knowledge-bases/${id}/reindex`)
}

export const uploadKnowledgeDocument = (kbId: number, formData: FormData) => {
  return request.post(`/wecom/ai/knowledge-bases/${kbId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const syncKnowledgeCrm = (id: number) => {
  return request.post(`/wecom/ai/knowledge-bases/${id}/sync-crm`)
}

// ==================== 话术分类 ====================

export const getScriptCategories = () => {
  return request.get('/wecom/ai/script-categories')
}

export const createScriptCategory = (data: any) => {
  return request.post('/wecom/ai/script-categories', data)
}

export const updateScriptCategory = (id: number, data: any) => {
  return request.put(`/wecom/ai/script-categories/${id}`, data)
}

export const deleteScriptCategory = (id: number) => {
  return request.delete(`/wecom/ai/script-categories/${id}`)
}

// ==================== 话术管理 ====================

export const getScripts = (params?: { categoryId?: number; page?: number; pageSize?: number; keyword?: string }) => {
  return request.get('/wecom/ai/scripts', { params })
}

export const createScript = (data: any) => {
  return request.post('/wecom/ai/scripts', data)
}

export const updateScript = (id: number, data: any) => {
  return request.put(`/wecom/ai/scripts/${id}`, data)
}

export const deleteScript = (id: number) => {
  return request.delete(`/wecom/ai/scripts/${id}`)
}

export const incrementScriptUseCount = (id: number) => {
  return request.put(`/wecom/ai/scripts/${id}/use-count`)
}

export const aiRewriteScript = (id: number, data?: { customerProfile?: any }) => {
  return request.post(`/wecom/ai/scripts/${id}/ai-rewrite`, data)
}

// ==================== AI自动标签规则 ====================

export const getAiTagRules = () => {
  return request.get('/wecom/ai/tag-rules')
}

export const createAiTagRule = (data: any) => {
  return request.post('/wecom/ai/tag-rules', data)
}

export const updateAiTagRule = (id: number, data: any) => {
  return request.put(`/wecom/ai/tag-rules/${id}`, data)
}

export const deleteAiTagRule = (id: number) => {
  return request.delete(`/wecom/ai/tag-rules/${id}`)
}

export const getAiTagRuleHits = (id: number, params?: { page?: number; pageSize?: number }) => {
  return request.get(`/wecom/ai/tag-rules/${id}/hits`, { params })
}

export const triggerAiTagRule = (data: { conversationContent: string; ruleId?: number }) => {
  return request.post('/wecom/ai/tag-rules/trigger', data)
}

// ==================== AI日志 ====================

export const getAiLogs = (params: { page?: number; pageSize?: number; agentId?: number; status?: string; operationType?: string }) => {
  return request.get('/wecom/ai/logs', { params })
}

export const getAiLogDetail = (id: number) => {
  return request.get(`/wecom/ai/logs/${id}`)
}

export const getAiLogStats = () => {
  return request.get('/wecom/ai/logs/stats')
}

export const exportAiLogs = (params: { agentId?: number; status?: string; operationType?: string; startDate?: string; endDate?: string }) => {
  return request.get('/wecom/ai/logs/export', { params, responseType: 'blob' })
}

// ==================== AI质检 ====================

export const getAiInspectStrategies = () => {
  return request.get('/wecom/ai-inspect/strategies')
}

export const createAiInspectStrategy = (data: any) => {
  return request.post('/wecom/ai-inspect/strategies', data)
}

export const updateAiInspectStrategy = (id: number, data: any) => {
  return request.put(`/wecom/ai-inspect/strategies/${id}`, data)
}

export const deleteAiInspectStrategy = (id: number) => {
  return request.delete(`/wecom/ai-inspect/strategies/${id}`)
}

export const getAiInspectResults = (params: { page?: number; pageSize?: number; riskLevel?: string }) => {
  return request.get('/wecom/ai-inspect/results', { params })
}

export const getAiInspectResultDetail = (id: number) => {
  return request.get(`/wecom/ai-inspect/results/${id}`)
}

export const runAiInspect = (data: { conversationId: string; strategyId?: number }) => {
  return request.post('/wecom/ai-inspect/analyze', data)
}

export const batchAiInspect = (data: { conversationIds: string[]; strategyId?: number }) => {
  return request.post('/wecom/ai-inspect/batch-analyze', data)
}

export const getAiInspectSummary = () => {
  return request.get('/wecom/ai-inspect/summary')
}

// ==================== 群模板 ====================

export const getGroupTemplates = () => {
  return request.get('/wecom/group-templates')
}

export const createGroupTemplate = (data: any) => {
  return request.post('/wecom/group-templates', data)
}

export const updateGroupTemplate = (id: number, data: any) => {
  return request.put(`/wecom/group-templates/${id}`, data)
}

export const deleteGroupTemplate = (id: number) => {
  return request.delete(`/wecom/group-templates/${id}`)
}

// ==================== 会话轨迹 ====================

export const getCustomerTimeline = (externalUserId: string, params?: { configId?: number; page?: number; pageSize?: number }) => {
  return request.get(`/wecom/timeline/${externalUserId}`, { params })
}

// ==================== AI使用量 & 套餐订单 ====================

export const getAiUsageOverview = () => {
  return request.get('/wecom/ai/usage-overview')
}

export const getAiPackages = () => {
  return request.get('/wecom/ai/packages')
}

export const getAiOrders = (params?: { page?: number; pageSize?: number }) => {
  return request.get('/wecom/ai/orders', { params })
}

export const createAiOrder = (data: { packageId: string; packageName: string; calls: number; price: number; payType?: string }) => {
  return request.post('/wecom/ai/orders', data)
}

export const checkAiOrderStatus = (orderNo: string) => {
  return request.get(`/wecom/ai/orders/${orderNo}/status`)
}

export const getAiModelUsage = (params?: { startDate?: string; endDate?: string; page?: number; pageSize?: number }) => {
  return request.get('/wecom/ai/model-usage', { params })
}

export const getAiUsageTrend = (params?: { startDate?: string; endDate?: string }) => {
  return request.get('/wecom/ai/usage-trend', { params })
}
