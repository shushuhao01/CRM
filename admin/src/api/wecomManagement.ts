/**
 * Admin企微管理 API - V4.0重构
 */
import request from './request'

// ==================== 服务商应用管理 ====================

export const getSuiteConfig = () => request.get('/wecom-management/suite/config')
export const saveSuiteConfig = (data: any) => request.put('/wecom-management/suite/config', data)
export const testSuiteConnection = () => request.post('/wecom-management/suite/test-connection')
export const generateAuthLink = (data: any) => request.post('/wecom-management/suite/auth-link', data)
export const getSuiteAuths = (params?: any) => request.get('/wecom-management/suite/auths', { params })
export const getSuiteAuthDetail = (id: number) => request.get(`/wecom-management/suite/auths/${id}`)
export const bindSuiteAuthTenant = (id: number, data: { tenantId: string }) => request.post(`/wecom-management/suite/auths/${id}/bind-tenant`, data)
export const cancelSuiteAuth = (id: number) => request.delete(`/wecom-management/suite/auths/${id}`)
export const getSuiteCallbackLogs = (params?: any) => request.get('/wecom-management/suite/callback-logs', { params })

// ==================== 通知模板管理 ====================

export const getNotificationTemplates = () => request.get('/wecom-management/suite/notification-templates')
export const createNotificationTemplate = (data: any) => request.post('/wecom-management/suite/notification-templates', data)
export const updateNotificationTemplate = (id: number, data: any) => request.put(`/wecom-management/suite/notification-templates/${id}`, data)
export const deleteNotificationTemplate = (id: number) => request.delete(`/wecom-management/suite/notification-templates/${id}`)
export const toggleNotificationTemplate = (id: number) => request.patch(`/wecom-management/suite/notification-templates/${id}/toggle`)

// ==================== 会话存档代购 ====================

export const getPurchaseOrders = (params?: any) => request.get('/wecom-management/purchase-orders', { params })
export const getPurchaseOrderDetail = (id: number) => request.get(`/wecom-management/purchase-orders/${id}`)
export const fulfillPurchaseOrder = (id: number, data: any) => request.post(`/wecom-management/purchase-orders/${id}/fulfill`, data)
export const refundPurchaseOrder = (id: number, data?: any) => request.post(`/wecom-management/purchase-orders/${id}/refund`, data)
export const getPurchaseCostConfig = () => request.get('/wecom-management/purchase-cost')
export const savePurchaseCostConfig = (data: any) => request.put('/wecom-management/purchase-cost', data)
export const getSupplierConfig = () => request.get('/wecom-management/supplier-config')
export const saveSupplierConfig = (data: any) => request.put('/wecom-management/supplier-config', data)

// ==================== AI额度管理 ====================

export const getAdminAiModels = () => request.get('/wecom-management/ai/models')
export const createAdminAiModel = (data: any) => request.post('/wecom-management/ai/models', data)
export const updateAdminAiModel = (id: number, data: any) => request.put(`/wecom-management/ai/models/${id}`, data)
export const deleteAdminAiModel = (id: number) => request.delete(`/wecom-management/ai/models/${id}`)
export const testAdminAiModel = (id: number) => request.post(`/wecom-management/ai/models/${id}/test`)
export const getTenantAiQuotas = (params?: any) => request.get('/wecom-management/ai/tenant-quotas', { params })
export const adjustTenantAiQuota = (id: string, data: any) => request.put(`/wecom-management/ai/tenant-quotas/${id}`, data)
export const batchAssignAiQuota = (data: any) => request.post('/wecom-management/ai/tenant-quotas/batch', data)
export const getAiBillingConfig = () => request.get('/wecom-management/ai/billing')
export const saveAiBillingConfig = (data: any) => request.put('/wecom-management/ai/billing', data)
export const getAiUsageStats = (params?: any) => request.get('/wecom-management/ai/usage-stats', { params })
export const getAiUsageTop = (params?: any) => request.get('/wecom-management/ai/usage-stats/top', { params })
export const getAiUsageLogs = (params?: any) => request.get('/wecom-management/ai/usage-logs', { params })
export const getAiGlobalSettings = () => request.get('/wecom-management/ai/global-settings')
export const saveAiGlobalSettings = (data: any) => request.put('/wecom-management/ai/global-settings', data)

// ==================== 企微配额管理 ====================

export const getConfigQuotas = (params?: any) => request.get('/wecom-management/config-quotas', { params })
export const saveConfigQuota = (tenantId: string, data: any) => request.put(`/wecom-management/config-quotas/${tenantId}`, data)

// ==================== 获客助手用量 ====================

export const getAcquisitionUsage = (params?: any) => request.get('/wecom-management/acquisition-usage', { params })
export const getAcquisitionUsageDetail = (tenantId: string) => request.get(`/wecom-management/acquisition-usage/${tenantId}`)

// ==================== 数据统计 ====================

export const getDataStats = (params?: any) => request.get('/wecom-management/data-stats', { params })
export const getDataStatsTrends = (params?: any) => request.get('/wecom-management/data-stats/trends', { params })
export const getDataStatsRankings = (params?: any) => request.get('/wecom-management/data-stats/rankings', { params })
export const exportDataStats = (params?: any) => request.get('/wecom-management/data-stats/export', { params, responseType: 'blob' } as any)

// ==================== 操作日志 ====================

export const getAuditLogs = (params?: any) => request.get('/wecom-management/audit-log', { params })
export const exportAuditLogs = (params?: any) => request.get('/wecom-management/audit-log/export', { params, responseType: 'blob' } as any)

// ==================== 套餐与定价管理 ====================

export const getPricingConfig = () => request.get('/wecom-management/pricing-config')
export const savePricingConfig = (data: any) => request.put('/wecom-management/pricing-config', data)

// ==================== 小程序配置管理 ====================

export const getMpConfig = () => request.get('/wecom-management/suite/mp-config')
export const saveMpConfig = (data: any) => request.put('/wecom-management/suite/mp-config', data)
