/**
 * 外呼配置管理 API
 *
 * 架构说明：
 * 1. 系统外呼线路/网络电话 - 管理员配置，全局生效，可分配给成员
 * 2. 工作手机外呼 - 员工自己扫码绑定，个人配置
 * 3. 拨打时优先级：工作手机已绑定 > 选择管理员配置的可用线路
 */

import request from '@/utils/request'

// 定义API响应类型
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}

// ==================== 类型定义 ====================

/** 全局配置 */
export interface GlobalCallConfig {
  default_call_method?: string
  call_timeout?: number
  max_retries?: number
  enable_recording?: boolean
  recording_storage?: string
  aliyun_config?: AliyunConfig
  tencent_config?: TencentConfig
  huawei_config?: HuaweiConfig
}

/** 阿里云配置 */
export interface AliyunConfig {
  accessKeyId?: string
  accessKeySecret?: string
  appId?: string
  callerNumber?: string
  region?: string
  enableRecording?: boolean
  recordingBucket?: string
  configured?: boolean
}

/** 腾讯云配置 */
export interface TencentConfig {
  secretId?: string
  secretKey?: string
  appId?: string
  callerNumber?: string
  region?: string
  configured?: boolean
}

/** 华为云配置 */
export interface HuaweiConfig {
  accessKey?: string
  secretKey?: string
  appId?: string
  callerNumber?: string
  region?: string
  configured?: boolean
}

/** 外呼线路 */
export interface CallLine {
  id: number
  name: string
  provider: 'aliyun' | 'tencent' | 'huawei' | 'custom'
  type: 'voip' | 'pstn' | 'sip'
  callerNumber?: string
  status: 'active' | 'inactive' | 'error'
  isEnabled: boolean
  maxConcurrent: number
  currentConcurrent: number
  dailyLimit: number
  dailyUsed: number
  totalCalls: number
  successRate: number
  sortOrder: number
  description?: string
  config?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

/** 用户线路分配 */
export interface UserLineAssignment {
  id: number
  userId: number
  userName: string
  lineId: number
  lineName: string
  provider: string
  callerNumber?: string
  isDefault: boolean
  dailyLimit: number
  isActive: boolean
  assignedBy?: number
  assignedAt?: string
  createdAt?: string
}

/** 工作手机 */
export interface WorkPhone {
  id: number
  phoneNumber: string
  deviceName?: string
  deviceModel?: string
  onlineStatus: 'online' | 'offline'
  isPrimary: boolean
  lastActiveAt?: string
}

/** 用户可用线路 */
export interface UserAvailableLines {
  assignedLines: Array<{
    id: number
    name: string
    provider: string
    type: string
    callerNumber?: string
    isDefault: boolean
    dailyLimit: number
  }>
  workPhones: WorkPhone[]
  hasAvailableMethod: boolean
}

/** 用户偏好设置 */
export interface UserCallPreference {
  preferMobile: boolean
  defaultLineId?: number
}

// ==================== 全局配置管理 (仅管理员) ====================

/**
 * 获取全局外呼配置
 */
export function getGlobalConfig(): Promise<ApiResponse<GlobalCallConfig>> {
  return request({
    url: '/call-config/global',
    method: 'get'
  })
}

/**
 * 更新全局外呼配置 (仅管理员)
 */
export function updateGlobalConfig(config: Partial<GlobalCallConfig>): Promise<ApiResponse> {
  return request({
    url: '/call-config/global',
    method: 'put',
    data: config
  })
}

// ==================== 外呼线路管理 (仅管理员) ====================

/**
 * 获取外呼线路列表
 */
export function getCallLines(): Promise<ApiResponse<CallLine[]>> {
  return request({
    url: '/call-config/lines',
    method: 'get'
  })
}

/**
 * 创建外呼线路 (仅管理员)
 */
export function createCallLine(data: Partial<CallLine>): Promise<ApiResponse<{ id: number }>> {
  return request({
    url: '/call-config/lines',
    method: 'post',
    data
  })
}

/**
 * 更新外呼线路 (仅管理员)
 */
export function updateCallLine(id: number, data: Partial<CallLine>): Promise<ApiResponse> {
  return request({
    url: `/call-config/lines/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除外呼线路 (仅管理员)
 */
export function deleteCallLine(id: number): Promise<ApiResponse> {
  return request({
    url: `/call-config/lines/${id}`,
    method: 'delete'
  })
}

// ==================== 用户线路分配 (仅管理员) ====================

/**
 * 获取用户线路分配列表
 */
export function getLineAssignments(params?: { userId?: number; lineId?: number }): Promise<ApiResponse<UserLineAssignment[]>> {
  return request({
    url: '/call-config/assignments',
    method: 'get',
    params
  })
}

/**
 * 分配线路给用户 (仅管理员)
 */
export function assignLineToUser(data: {
  userId: number
  lineId: number
  callerNumber?: string
  isDefault?: boolean
  dailyLimit?: number
}): Promise<ApiResponse> {
  return request({
    url: '/call-config/assignments',
    method: 'post',
    data
  })
}

/**
 * 取消用户线路分配 (仅管理员)
 */
export function removeLineAssignment(id: number): Promise<ApiResponse> {
  return request({
    url: `/call-config/assignments/${id}`,
    method: 'delete'
  })
}

// ==================== 用户可用线路查询 ====================

/**
 * 获取当前用户可用的外呼线路
 */
export function getMyAvailableLines(): Promise<ApiResponse<UserAvailableLines>> {
  return request({
    url: '/call-config/my-lines',
    method: 'get'
  })
}

// ==================== 用户个人偏好设置 ====================

/**
 * 获取用户个人外呼偏好
 */
export function getUserPreference(): Promise<ApiResponse<UserCallPreference>> {
  return request({
    url: '/call-config/preference',
    method: 'get'
  })
}

/**
 * 更新用户个人外呼偏好
 */
export function updateUserPreference(data: UserCallPreference): Promise<ApiResponse> {
  return request({
    url: '/call-config/preference',
    method: 'put',
    data
  })
}

// ==================== 工作手机管理 ====================

/**
 * 获取当前用户绑定的工作手机列表
 */
export function getMyWorkPhones(): Promise<ApiResponse<WorkPhone[]>> {
  return request({
    url: '/call-config/work-phones',
    method: 'get'
  })
}

/**
 * 生成工作手机绑定二维码
 */
export function generateWorkPhoneQRCode(): Promise<ApiResponse<{ qrCodeUrl: string; connectionId: string; expiresAt: string }>> {
  return request({
    url: '/call-config/work-phones/qrcode',
    method: 'post'
  })
}

/**
 * 检查工作手机绑定状态
 */
export function checkWorkPhoneBindStatus(connectionId: string): Promise<ApiResponse<{ status: 'pending' | 'connected' | 'expired'; phone?: WorkPhone }>> {
  return request({
    url: `/call-config/work-phones/bind-status/${connectionId}`,
    method: 'get'
  })
}

/**
 * 解绑工作手机
 */
export function unbindWorkPhone(phoneId: number | string): Promise<ApiResponse> {
  console.log('[API] unbindWorkPhone called with phoneId:', phoneId, 'type:', typeof phoneId)
  return request({
    url: `/call-config/work-phones/${phoneId}`,
    method: 'delete'
  })
}

/**
 * 设置主要工作手机
 */
export function setPrimaryWorkPhone(phoneId: number): Promise<ApiResponse> {
  return request({
    url: `/call-config/work-phones/${phoneId}/primary`,
    method: 'put'
  })
}


// ==================== 发起呼叫 ====================

/**
 * 通过工作手机发起呼叫
 * 后端会通过WebSocket通知APP发起呼叫
 */
export function initiateWorkPhoneCall(data: {
  workPhoneId: number | null
  targetPhone: string
  customerId?: string
  customerName?: string
  notes?: string
}): Promise<ApiResponse<{ callId: string; status: string }>> {
  return request({
    url: '/call-config/work-phones/call',
    method: 'post',
    data
  })
}

/**
 * 通过网络电话线路发起呼叫
 */
export function initiateNetworkCall(data: {
  lineId: number | null
  targetPhone: string
  customerId?: string
  customerName?: string
  notes?: string
}): Promise<ApiResponse<{ callId: string; status: string }>> {
  return request({
    url: '/call-config/lines/call',
    method: 'post',
    data
  })
}

/**
 * 结束通话
 */
export function endCall(callId: string, data?: {
  notes?: string
  duration?: number
}): Promise<ApiResponse> {
  return request({
    url: `/call-config/calls/${callId}/end`,
    method: 'post',
    data
  })
}

/**
 * 更新通话备注
 */
export function updateCallNotes(callId: string, notes: string): Promise<ApiResponse> {
  return request({
    url: `/calls/${callId}/notes`,
    method: 'put',
    data: { notes }
  })
}
