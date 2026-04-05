/**
 * 订阅管理 API
 */
import { getMemberToken } from './member'

const API_BASE = '/api/v1'

async function subFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getMemberToken()
  const headers: any = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

/**
 * 创建订阅（发起签约）
 */
export async function createSubscription(params: {
  packageId: number
  channel: 'wechat' | 'alipay'
  billingCycle?: 'monthly' | 'yearly'
}): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const res = await subFetch(`${API_BASE}/public/subscription/create`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
    const data = await res.json()
    return { success: data.code === 0, message: data.message, data: data.data }
  } catch {
    return { success: false, message: '网络错误' }
  }
}

/**
 * 查询订阅状态
 */
export async function getSubscriptionStatus(): Promise<any> {
  try {
    const res = await subFetch(`${API_BASE}/public/subscription/status`)
    const data = await res.json()
    return data.code === 0 ? data.data : null
  } catch {
    return null
  }
}

/**
 * 取消订阅
 */
export async function cancelSubscription(subscriptionId: string): Promise<{ success: boolean; message: string; effectiveDate?: string }> {
  try {
    const res = await subFetch(`${API_BASE}/public/subscription/cancel`, {
      method: 'POST',
      body: JSON.stringify({ subscriptionId })
    })
    const data = await res.json()
    return { success: data.code === 0, message: data.message, effectiveDate: data.data?.effectiveDate }
  } catch {
    return { success: false, message: '操作失败' }
  }
}

/**
 * 模拟签约成功（开发环境）
 */
export async function mockSignSubscription(subscriptionId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/public/subscription/mock-sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId })
    })
    const data = await res.json()
    return { success: data.code === 0, message: data.message }
  } catch {
    return { success: false, message: '操作失败' }
  }
}

