/**
 * 财务管理API
 */
import api from '@/utils/request'

export interface PerformanceDataStatistics {
  shippedCount: number
  deliveredCount: number
  validCount: number
  coefficientSum: number
  estimatedCommission: number
}

export interface PerformanceManageStatistics {
  pendingCount: number
  processedCount: number
  validCount: number
  invalidCount: number
  totalCount: number
  coefficientSum: number
}

export interface PerformanceOrder {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  status: string
  trackingNumber: string
  latestLogisticsInfo?: string
  createdAt: string
  totalAmount: number
  createdByDepartmentId?: string
  createdByDepartmentName?: string
  createdByName: string
  createdBy: string
  performanceStatus: string
  performanceCoefficient: number
  performanceRemark?: string
  estimatedCommission: number
  performanceUpdatedAt?: string
}

export interface PerformanceConfig {
  id: number
  configType: string
  configValue: string
  configLabel: string
  sortOrder: number
  isActive: number
}

export interface CommissionLadder {
  id: number
  commissionType: 'amount' | 'count'
  departmentId?: string
  departmentName?: string
  minValue: number
  maxValue?: number
  commissionRate?: number
  commissionPerUnit?: number
  sortOrder: number
  isActive: number
}

export interface FinanceConfigData {
  statusConfigs: PerformanceConfig[]
  coefficientConfigs: PerformanceConfig[]
  remarkConfigs: PerformanceConfig[]
  amountLadders: CommissionLadder[]
  countLadders: CommissionLadder[]
  settings: Record<string, string>
}

export const financeApi = {
  // ==================== 绩效数据（只读） ====================

  /** 获取绩效数据统计 */
  getPerformanceDataStatistics: (params?: {
    startDate?: string
    endDate?: string
    departmentId?: string
    salesPersonId?: string
    performanceStatus?: string
    performanceCoefficient?: string
  }) =>
    api.get<{ success: boolean; data: PerformanceDataStatistics }>('/finance/performance-data/statistics', { params }),

  /** 获取绩效数据列表 */
  getPerformanceDataList: (params: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
    orderNumber?: string
    departmentId?: string
    salesPersonId?: string
    performanceStatus?: string
    performanceCoefficient?: string
  }) => api.get<{ success: boolean; data: { list: PerformanceOrder[]; total: number } }>('/finance/performance-data', { params }),

  // ==================== 绩效管理（可编辑） ====================

  /** 获取绩效管理统计 */
  getPerformanceManageStatistics: (params?: {
    startDate?: string
    endDate?: string
    departmentId?: string
    salesPersonId?: string
    performanceStatus?: string
    performanceCoefficient?: string
  }) =>
    api.get<{ success: boolean; data: PerformanceManageStatistics }>('/finance/performance-manage/statistics', { params }),

  /** 获取绩效管理列表 */
  getPerformanceManageList: (params: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
    orderNumber?: string
    departmentId?: string
    salesPersonId?: string
    performanceStatus?: string
    performanceCoefficient?: string
  }) => api.get<{ success: boolean; data: { list: PerformanceOrder[]; total: number } }>('/finance/performance-manage', { params }),

  /** 更新订单绩效 */
  updatePerformance: (orderId: string, data: {
    performanceStatus?: string
    performanceCoefficient?: number
    performanceRemark?: string
    startDate?: string
    endDate?: string
  }) => api.put<{ success: boolean; message: string }>(`/finance/performance/${orderId}`, data),

  /** 批量更新订单绩效 */
  batchUpdatePerformance: (data: {
    orderIds: string[]
    performanceStatus?: string
    performanceCoefficient?: number
    performanceRemark?: string
    startDate?: string
    endDate?: string
  }) => api.put<{ success: boolean; message: string; data: { updateCount: number } }>('/finance/performance/batch', data),

  // ==================== 配置管理 ====================

  /** 获取所有配置 */
  getConfig: () => api.get<{ success: boolean; data: FinanceConfigData }>('/finance/config'),

  /** 添加配置项 */
  addConfig: (data: { configType: string; configValue: string; configLabel?: string }) =>
    api.post<{ success: boolean; data: PerformanceConfig }>('/finance/config', data),

  /** 更新配置项 */
  updateConfig: (id: number, data: { configValue?: string; configLabel?: string; sortOrder?: number; isActive?: number }) =>
    api.put<{ success: boolean }>(`/finance/config/${id}`, data),

  /** 删除配置项 */
  deleteConfig: (id: number) => api.delete<{ success: boolean }>(`/finance/config/${id}`),

  // ==================== 计提阶梯管理 ====================

  /** 添加计提阶梯 */
  addLadder: (data: {
    commissionType: 'amount' | 'count'
    minValue: number
    maxValue?: number
    commissionRate?: number
    commissionPerUnit?: number
    departmentId?: string
    departmentName?: string
  }) => api.post<{ success: boolean; data: CommissionLadder }>('/finance/ladder', data),

  /** 更新计提阶梯 */
  updateLadder: (id: number, data: {
    minValue?: number
    maxValue?: number
    commissionRate?: number
    commissionPerUnit?: number
    sortOrder?: number
    isActive?: number
    departmentId?: string
    departmentName?: string
  }) => api.put<{ success: boolean }>(`/finance/ladder/${id}`, data),

  /** 删除计提阶梯 */
  deleteLadder: (id: number) => api.delete<{ success: boolean }>(`/finance/ladder/${id}`),

  /** 更新计提设置 */
  updateSetting: (settingKey: string, settingValue: string) =>
    api.put<{ success: boolean }>('/finance/setting', { settingKey, settingValue })
}

export default financeApi
