import request from '@/utils/request'

// 增值订单接口
export interface ValueAddedOrder {
  id: string
  orderNumber?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  trackingNumber?: string
  orderStatus?: string
  orderDate?: string
  companyId: string
  companyName: string
  unitPrice: number
  status: string
  settlementStatus: string
  settlementAmount: number
  settlementDate?: string
  settlementBatch?: string
  invalidReason?: string
  supplementOrderId?: string
  exportDate?: string
  exportBatch?: string
  remark?: string
  operatorId?: string
  operatorName?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

// 外包公司接口
export interface OutsourceCompany {
  id: string
  companyName: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  status: string
  defaultUnitPrice: number
  totalOrders: number
  validOrders: number
  invalidOrders: number
  totalAmount: number
  settledAmount: number
  remark?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

// 费用配置接口（新版多档位）
export interface PriceTier {
  id: string
  companyId: string
  tierName: string
  tierOrder: number
  pricingType: 'fixed' | 'percentage'
  unitPrice: number
  percentageRate: number
  baseAmountField: string
  startDate?: string
  endDate?: string
  isActive: number
  priority: number
  conditionRules?: string
  remark?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

// 旧版费用配置接口（保留兼容）
export interface PriceConfig {
  id: string
  configName: string
  companyId?: string
  companyName?: string
  unitPrice: number
  startDate?: string
  endDate?: string
  conditions?: any
  status: string
  remark?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

// 统计数据接口
export interface ValueAddedStats {
  all: { count: number; amount: number }
  pending: { count: number; amount: number }
  valid: { count: number; amount: number }
  invalid: { count: number; amount: number }
  unsettled: { count: number; amount: number }
  settled: { count: number; amount: number }
}

// 结算报表数据接口
export interface SettlementReportData {
  dailyData: Array<{ date: string; count: number; amount: number }>
  companyData: Array<{ companyId: string; companyName: string; count: number; amount: number }>
}

/**
 * 获取增值订单列表
 */
export function getValueAddedOrders(params: any) {
  return request({
    url: '/value-added/orders',
    method: 'get',
    params
  })
}

/**
 * 获取统计数据
 */
export function getValueAddedStats(params: any) {
  return request({
    url: '/value-added/stats',
    method: 'get',
    params
  })
}

/**
 * 创建增值订单
 */
export function createValueAddedOrder(data: any) {
  return request({
    url: '/value-added/orders',
    method: 'post',
    data
  })
}

/**
 * 批量处理订单
 */
export function batchProcessOrders(data: { ids: string[]; action: string; data?: any }) {
  return request({
    url: '/value-added/orders/batch-process',
    method: 'put',
    data
  })
}

/**
 * 获取外包公司列表
 */
export function getOutsourceCompanies(params: any) {
  return request({
    url: '/value-added/companies',
    method: 'get',
    params
  })
}

/**
 * 创建外包公司
 */
export function createOutsourceCompany(data: any) {
  return request({
    url: '/value-added/companies',
    method: 'post',
    data
  })
}

/**
 * 更新外包公司
 */
export function updateOutsourceCompany(id: string, data: any) {
  return request({
    url: `/value-added/companies/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除外包公司
 */
export function deleteOutsourceCompany(id: string) {
  return request({
    url: `/value-added/companies/${id}`,
    method: 'delete'
  })
}

/**
 * 获取费用配置列表
 */
export function getPriceConfigs(params: any) {
  return request({
    url: '/value-added/price-configs',
    method: 'get',
    params
  })
}

/**
 * 创建费用配置
 */
export function createPriceConfig(data: any) {
  return request({
    url: '/value-added/price-configs',
    method: 'post',
    data
  })
}

/**
 * 更新费用配置
 */
export function updatePriceConfig(id: string, data: any) {
  return request({
    url: `/value-added/price-configs/${id}`,
    method: 'put',
    data
  })
}

/**
 * 获取结算报表数据
 */
export function getSettlementReport(params: any) {
  return request({
    url: '/value-added/settlement-report',
    method: 'get',
    params
  })
}

// 状态配置接口
export interface StatusConfig {
  id: string
  type: string
  value: string
  label: string
  createdAt?: string
}

/**
 * 获取状态配置列表
 */
export function getValueAddedStatusConfigs() {
  return request({
    url: '/value-added/status-configs',
    method: 'get'
  })
}

/**
 * 添加状态配置
 */
export function addValueAddedStatusConfig(data: { type: string; value: string; label: string }) {
  return request({
    url: '/value-added/status-configs',
    method: 'post',
    data
  })
}

/**
 * 删除状态配置
 */
export function deleteValueAddedStatusConfig(id: string) {
  return request({
    url: `/value-added/status-configs/${id}`,
    method: 'delete'
  })
}


/**
 * 公司排序
 */
export function sortCompanies(data: { companies: Array<{ id: string; sortOrder: number }> }) {
  return request({
    url: '/value-added/companies/sort',
    method: 'put',
    data
  })
}

/**
 * 设置默认公司
 */
export function setDefaultCompany(id: string) {
  return request({
    url: `/value-added/companies/${id}/set-default`,
    method: 'put'
  })
}

/**
 * 批量修改订单公司
 */
export function batchUpdateOrderCompany(data: { ids: string[]; companyId: string; companyName: string; unitPrice?: number }) {
  return request({
    url: '/value-added/orders/batch-update-company',
    method: 'put',
    data
  })
}

/**
 * 修改单个订单公司
 */
export function updateOrderCompany(id: string, data: { companyId: string; companyName: string; unitPrice?: number }) {
  return request({
    url: `/value-added/orders/${id}/company`,
    method: 'put',
    data
  })
}

/**
 * ============================================
 * 价格档位管理 API（新版多档位系统）
 * ============================================
 */

/**
 * 获取公司的价格档位列表
 */
export function getCompanyPriceTiers(companyId: string) {
  return request({
    url: `/value-added/companies/${companyId}/price-tiers`,
    method: 'get'
  })
}

/**
 * 创建价格档位
 */
export function createPriceTier(companyId: string, data: Partial<PriceTier>) {
  return request({
    url: `/value-added/companies/${companyId}/price-tiers`,
    method: 'post',
    data
  })
}

/**
 * 更新价格档位
 */
export function updatePriceTier(companyId: string, tierId: string, data: Partial<PriceTier>) {
  return request({
    url: `/value-added/companies/${companyId}/price-tiers/${tierId}`,
    method: 'put',
    data
  })
}

/**
 * 删除价格档位
 */
export function deletePriceTier(companyId: string, tierId: string) {
  return request({
    url: `/value-added/companies/${companyId}/price-tiers/${tierId}`,
    method: 'delete'
  })
}

// ==================== 备注预设相关 ====================

export interface RemarkPreset {
  id: string
  remark_text: string
  category: 'invalid' | 'general'
  sort_order: number
  is_active: number
  usage_count: number
}

/**
 * 获取备注预设列表
 */
export const getRemarkPresets = (params?: { category?: string }) => {
  return request.get('/value-added/remark-presets', { params })
}

/**
 * 创建备注预设
 */
export const createRemarkPreset = (data: {
  remarkText: string
  category?: 'invalid' | 'general'
  sortOrder?: number
}) => {
  return request.post('/value-added/remark-presets', data)
}

/**
 * 更新备注预设
 */
export const updateRemarkPreset = (id: string, data: {
  remarkText?: string
  category?: 'invalid' | 'general'
  sortOrder?: number
  isActive?: boolean
}) => {
  return request.put(`/value-added/remark-presets/${id}`, data)
}

/**
 * 删除备注预设
 */
export const deleteRemarkPreset = (id: string) => {
  return request.delete(`/value-added/remark-presets/${id}`)
}

/**
 * 增加备注预设使用次数
 */
export const incrementRemarkPresetUsage = (id: string) => {
  return request.post(`/value-added/remark-presets/${id}/increment-usage`)
}
