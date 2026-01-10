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
  duration_days: number
  max_users: number
  max_storage_gb: number
  features: string[]
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
