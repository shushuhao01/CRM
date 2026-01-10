/**
 * 租户授权API - 用于CRM登录前的授权码验证
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
 * 验证租户授权码
 * @param licenseKey 授权码
 */
export const verifyTenantLicense = async (licenseKey: string): Promise<VerifyResponse> => {
  const response = await request.post('/tenant-license/verify', { licenseKey })
  return response as unknown as VerifyResponse
}

/**
 * 获取当前租户信息
 */
export const getTenantInfo = async (): Promise<TenantInfo | null> => {
  try {
    const response = await request.get('/tenant-license/info')
    return (response as any)?.data || null
  } catch {
    return null
  }
}

/**
 * 心跳检测 - 检查授权是否有效
 */
export const checkLicenseHeartbeat = async (): Promise<HeartbeatResponse> => {
  try {
    const response = await request.post('/tenant-license/heartbeat')
    return response as unknown as HeartbeatResponse
  } catch {
    return { success: true, valid: true } // 出错时不阻断用户
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
 * 检查是否需要授权验证
 * 私有部署模式不需要授权验证
 */
export const needLicenseVerification = (): boolean => {
  // 检查环境变量或配置
  const deployMode = import.meta.env.VITE_DEPLOY_MODE || 'saas'
  return deployMode === 'saas'
}
