/**
 * 企业微信管理 API
 */
import request from '@/utils/request'

// ==================== 企微配置 ====================

/** 获取企微配置列表 */
export const getWecomConfigs = () => {
  return request.get('/wecom/configs')
}

/** 获取单个企微配置 */
export const getWecomConfig = (id: number) => {
  return request.get(`/wecom/configs/${id}`)
}

/** 创建企微配置 */
export const createWecomConfig = (data: {
  name: string
  corpId: string
  corpSecret: string
  agentId?: number
  callbackToken?: string
  encodingAesKey?: string
  callbackUrl?: string
  contactSecret?: string
  externalContactSecret?: string
  chatArchiveSecret?: string
  chatArchivePrivateKey?: string
  remark?: string
}) => {
  return request.post('/wecom/configs', data)
}

/** 更新企微配置 */
export const updateWecomConfig = (id: number, data: any) => {
  return request.put(`/wecom/configs/${id}`, data)
}

/** 删除企微配置 */
export const deleteWecomConfig = (id: number) => {
  return request.delete(`/wecom/configs/${id}`)
}

/** 测试企微配置连接 */
export const testWecomConnection = (id: number) => {
  return request.post(`/wecom/configs/${id}/test`)
}

// ==================== 企微联动 ====================

/** 获取企微通讯录部门列表 */
export const getWecomDepartments = (configId: number) => {
  return request.get(`/wecom/configs/${configId}/departments`)
}

/** 获取企微通讯录成员列表 */
export const getWecomUsers = (configId: number, departmentId?: number, fetchChild?: boolean) => {
  return request.get(`/wecom/configs/${configId}/users`, {
    params: { departmentId, fetchChild }
  })
}

/** 获取成员绑定列表 */
export const getWecomBindings = (params?: { configId?: number; crmUserId?: string }) => {
  return request.get('/wecom/bindings', { params })
}

/** 创建成员绑定 */
export const createWecomBinding = (data: {
  wecomConfigId: number
  wecomUserId: string
  wecomUserName?: string
  wecomAvatar?: string
  wecomDepartmentIds?: string
  crmUserId: string
  crmUserName?: string
}) => {
  return request.post('/wecom/bindings', data)
}

/** 解除成员绑定 */
export const deleteWecomBinding = (id: number) => {
  return request.delete(`/wecom/bindings/${id}`)
}

// ==================== 企业客户 ====================

/** 获取企业客户列表 */
export const getWecomCustomers = (params?: {
  configId?: number
  status?: string
  followUserId?: string
  keyword?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/customers', { params })
}

/** 获取客户统计数据 */
export const getWecomCustomerStats = (configId?: number) => {
  return request.get('/wecom/customers/stats', { params: { configId } })
}

/** 同步企微客户数据 */
export const syncWecomCustomers = (configId: number) => {
  return request.post('/wecom/customers/sync', { configId })
}

// ==================== 获客助手 ====================

/** 获取获客链接列表 */
export const getAcquisitionLinks = (configId?: number) => {
  return request.get('/wecom/acquisition-links', { params: { configId } })
}

/** 创建获客链接 */
export const createAcquisitionLink = (data: {
  wecomConfigId: number
  linkName: string
  userIds: string[]
  departmentIds?: number[]
  welcomeMsg?: string
  tagIds?: string[]
}) => {
  return request.post('/wecom/acquisition-links', data)
}

// ==================== 微信客服 ====================

/** 获取客服账号列表 */
export const getServiceAccounts = (configId?: number) => {
  return request.get('/wecom/service-accounts', { params: { configId } })
}

/** 创建客服账号 */
export const createServiceAccount = (data: {
  wecomConfigId: number
  name: string
  servicerUserIds?: string[]
  welcomeMsg?: string
}) => {
  return request.post('/wecom/service-accounts', data)
}

// ==================== 对外收款 ====================

/** 获取收款记录列表 */
export const getWecomPayments = (params?: {
  configId?: number
  userId?: string
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/payments', { params })
}
