import request from './request'

export interface Package {
  id: number
  name: string
  code: string
  type: 'saas' | 'private'
  description: string
  price: number
  original_price: number
  billing_cycle: 'monthly' | 'yearly' | 'once'
  yearly_discount_rate: number
  yearly_bonus_months: number
  yearly_price: number | null
  subscription_enabled: boolean
  subscription_channels: 'wechat' | 'alipay' | 'all'
  subscription_billing_cycle: 'monthly' | 'yearly' | 'both'
  subscription_discount_rate: number
  duration_days: number
  max_users: number
  max_storage_gb: number
  user_limit_mode: 'total' | 'online' | 'both'
  max_online_seats: number
  features: string[]
  modules: string[]
  is_trial: boolean
  is_recommended: boolean
  is_visible: boolean
  sort_order: number
  status: boolean
}

// 获取套餐列表
export function getPackages(params?: { type?: string; status?: number }) {
  return request.get<Package[]>('/packages', { params })
}

// 创建套餐
export function createPackage(data: Partial<Package>) {
  return request.post('/packages', data)
}

// 更新套餐
export function updatePackage(id: number, data: Partial<Package>) {
  return request.put(`/packages/${id}`, data)
}

// 删除套餐
export function deletePackage(id: number) {
  return request.delete(`/packages/${id}`)
}
