/**
 * 授权管理 API
 */
import { apiService } from '@/services/apiService'

// 检查系统激活状态
export const checkLicenseStatus = async () => {
  try {
    const response = await fetch('/api/v1/license/status')
    return await response.json()
  } catch (error) {
    console.error('检查授权状态失败:', error)
    return { success: true, data: { activated: true } } // 默认已激活，避免阻塞
  }
}

// 激活系统
export const activateLicense = async (licenseKey: string) => {
  const response = await fetch('/api/v1/license/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey })
  })
  return await response.json()
}

// 获取授权信息（需要登录）
export const getLicenseInfo = async () => {
  return await apiService.get('/license/info')
}
