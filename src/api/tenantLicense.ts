/**
 * 租户授权API - 用于CRM登录前的授权码验证
 * 注意：request拦截器会自动提取response.data.data，所以API函数收到的已经是内层data
 */
import request from '@/utils/request'

export interface TenantInfo {
  tenantId: string
  tenantCode: string
  tenantName: string
  packageName: string
  maxUsers: number
  expireDate: string | null
  features: string[] | null
  packageFeatures: string[] | null
  deployType?: 'private' | 'saas'  // 激活时由后端返回，标识部署模式
}

export interface VerifyResponse {
  success: boolean
  data?: TenantInfo
  message: string
}

export interface HeartbeatResponse {
  success: boolean
  valid: boolean
  message?: string
}

/**
 * 验证租户授权码（首次激活用）
 * 拦截器返回的是内层data（即TenantInfo对象），需要包装成VerifyResponse
 */
export const verifyTenantLicense = async (licenseKey: string): Promise<VerifyResponse> => {
  try {
    const data = await request.post('/tenant-license/verify', { licenseKey })
    const tenantData = data as unknown as TenantInfo
    return { success: true, data: tenantData, message: '验证成功' }
  } catch (e: any) {
    return { success: false, message: e?.message || '验证失败' }
  }
}

/**
 * 通过租户编码识别租户（日常登录用，员工输入短编码）
 */
export const verifyTenantCode = async (tenantCode: string): Promise<VerifyResponse> => {
  try {
    const data = await request.post('/tenant-license/verify-code', { tenantCode })
    const tenantData = data as unknown as TenantInfo
    return { success: true, data: tenantData, message: '验证成功' }
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || e?.message || '验证失败'
    const needActivation = e?.response?.data?.needActivation
    return { success: false, message: errMsg, needActivation } as any
  }
}

/**
 * 获取当前租户信息
 */
export const getTenantInfo = async (): Promise<TenantInfo | null> => {
  try {
    const data = await request.get('/tenant-license/info')
    return data as unknown as TenantInfo || null
  } catch {
    return null
  }
}

/**
 * 心跳检测 - 检查授权是否有效
 */
export const checkLicenseHeartbeat = async (): Promise<HeartbeatResponse> => {
  try {
    const data = await request.post('/tenant-license/heartbeat')
    return data as unknown as HeartbeatResponse
  } catch {
    return { success: true, valid: true }
  }
}

/**
 * 获取本地存储的租户信息
 */
export const getLocalTenantInfo = (): TenantInfo | null => {
  try {
    const data = localStorage.getItem('crm_tenant_info')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * 保存租户信息到本地
 */
export const saveLocalTenantInfo = (info: TenantInfo): void => {
  localStorage.setItem('crm_tenant_info', JSON.stringify(info))
}

/**
 * 清除本地租户信息
 */
export const clearLocalTenantInfo = (): void => {
  localStorage.removeItem('crm_tenant_info')
}

/**
 * 获取部署模式
 * 优先级：1. localStorage（激活时由授权码类型自动写入）
 *          2. VITE_DEPLOY_MODE 环境变量（打包/部署时设置）
 *          3. 默认 saas
 *
 * 这样无论安装包是否配置了 VITE_DEPLOY_MODE，
 * 只要客户输入的是 PRIVATE- 格式的授权码，就会自动识别为私有部署。
 */
export const getDeployMode = (): 'private' | 'saas' => {
  const stored = localStorage.getItem('crm_deploy_mode') as 'private' | 'saas' | null
  if (stored === 'private' || stored === 'saas') return stored
  return (import.meta.env.VITE_DEPLOY_MODE || 'saas') as 'private' | 'saas'
}

/**
 * 保存部署模式到本地（激活时由授权码类型自动调用）
 */
export const saveDeployMode = (mode: 'private' | 'saas'): void => {
  localStorage.setItem('crm_deploy_mode', mode)
}

/**
 * 是否为私有部署模式
 */
export const isPrivateMode = (): boolean => {
  return getDeployMode() === 'private'
}

/**
 * 检查是否需要授权验证
 */
export const needLicenseVerification = (): boolean => {
  return true
}

export interface CheckPrivateResponse {
  activated: boolean
  tenantId?: string
  tenantCode?: string
  tenantName?: string
  packageName?: string
  maxUsers?: number
  expireDate?: string | null
  features?: string[] | null
  packageFeatures?: string[] | null
  message?: string
}

/**
 * 检查私有部署激活状态
 * 拦截器返回的是 { activated: true/false, tenantId?, tenantCode?, ... }
 */
export const checkPrivateActivation = async (): Promise<CheckPrivateResponse> => {
  try {
    const data = await request.get('/tenant-license/check-private')
    return (data || { activated: false }) as unknown as CheckPrivateResponse
  } catch {
    return { activated: false }
  }
}
