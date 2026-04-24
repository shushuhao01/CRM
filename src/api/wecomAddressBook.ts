/**
 * 企微通讯录与绑定 API - V4.0新增
 */
import request from '@/utils/request'

// ==================== 组织架构 ====================

/** 获取部门树 */
export const getWecomDepartmentTree = (configId: number) => {
  return request.get('/wecom/address-book/departments', { params: { configId } })
}

/** 获取部门成员列表 */
export const getWecomDeptMembers = (deptId: number, configId: number) => {
  return request.get(`/wecom/address-book/dept/${deptId}/members`, { params: { configId } })
}

/** 设置部门映射 */
export const setDeptMapping = (id: number, data: { crmDeptId: string; crmDeptName: string }) => {
  return request.put(`/wecom/address-book/dept-mapping/${id}`, data)
}

/** 批量按名称自动映射 */
export const batchDeptMapping = (configId: number) => {
  return request.post('/wecom/address-book/batch-dept-mapping', { configId })
}

/** 同步部门 */
export const syncWecomDepartments = (configId: number) => {
  return request.post('/wecom/address-book/sync-departments', { configId })
}

/** 同步成员 */
export const syncWecomMembers = (configId: number) => {
  return request.post('/wecom/address-book/sync-members', { configId })
}

// ==================== 同步设置 ====================

/** 获取同步设置 */
export const getSyncSettings = (configId: number) => {
  return request.get('/wecom/address-book/sync-settings', { params: { configId } })
}

/** 保存同步设置 */
export const saveSyncSettings = (data: any) => {
  return request.put('/wecom/address-book/sync-settings', data)
}

// ==================== 同步日志 ====================

/** 获取同步日志 */
export const getSyncLogs = (params: { type?: string; range?: string; page?: number; pageSize?: number }) => {
  return request.get('/wecom/address-book/sync-logs', { params })
}

// ==================== 成员绑定列表 ====================

/** 获取绑定列表（带统计） */
export const getBindingList = (params: { configId?: number; page?: number; pageSize?: number }) => {
  return request.get('/wecom/address-book/bindings', { params })
}

// ==================== 自动匹配 ====================

/** 执行自动匹配 */
export const runAutoMatch = (configId?: number) => {
  return request.post('/wecom/customers/auto-match/run', { configId })
}

/** 获取待确认匹配列表 */
export const getAutoMatchPending = (params: { page?: number; pageSize?: number }) => {
  return request.get('/wecom/customers/auto-match/pending', { params })
}

/** 获取待匹配数量 */
export const getAutoMatchCount = () => {
  return request.get('/wecom/customers/auto-match/count', { showError: false } as any)
}

/** 确认匹配 */
export const confirmAutoMatch = (id: number) => {
  return request.post(`/wecom/customers/auto-match/${id}/confirm`)
}

/** 拒绝匹配 */
export const rejectAutoMatch = (id: number) => {
  return request.post(`/wecom/customers/auto-match/${id}/reject`)
}

