/**
 * 扩容管理 API
 */
const API_BASE = '/api/v1'

const TOKEN_KEY = 'member_token'

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: any = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

/**
 * 获取可用的扩容价格列表
 */
export async function getCapacityPrices(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/public/capacity/prices`)
    const data = await res.json()
    return data.code === 0 ? data.data : []
  } catch { return [] }
}

/**
 * 获取我的扩容信息（额度 + 订单）
 */
export async function getMyCapacity(page = 1, pageSize = 10): Promise<any> {
  try {
    const res = await authFetch(`${API_BASE}/public/capacity/my?page=${page}&pageSize=${pageSize}`)
    const data = await res.json()
    return data.code === 0 ? data.data : { capacity: { extraUsers: 0, extraStorageGb: 0 }, orders: { list: [], total: 0 } }
  } catch {
    return { capacity: { extraUsers: 0, extraStorageGb: 0 }, orders: { list: [], total: 0 } }
  }
}

/**
 * 创建扩容订单
 */
export async function createCapacityOrder(params: {
  type: 'user' | 'storage' | 'online_seat'
  quantity: number
  priceConfigId: string
  payType: 'wechat' | 'alipay'
}): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const res = await authFetch(`${API_BASE}/public/capacity/order`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
    const data = await res.json()
    return { success: data.code === 0, message: data.message, data: data.data }
  } catch {
    return { success: false, message: '创建失败' }
  }
}

