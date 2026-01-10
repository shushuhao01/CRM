// 套餐 API
const API_BASE = '/api/v1'

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
  sort_order: number
}

// 获取套餐列表
export async function getPackages(type?: 'saas' | 'private'): Promise<Package[]> {
  try {
    const url = type
      ? `${API_BASE}/public/packages?type=${type}`
      : `${API_BASE}/public/packages`

    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 0) {
      return data.data
    }
    return []
  } catch (error) {
    console.error('获取套餐列表失败:', error)
    return []
  }
}

// 获取单个套餐详情
export async function getPackageByCode(code: string): Promise<Package | null> {
  try {
    const response = await fetch(`${API_BASE}/public/packages/${code}`)
    const data = await response.json()

    if (data.code === 0) {
      return data.data
    }
    return null
  } catch (error) {
    console.error('获取套餐详情失败:', error)
    return null
  }
}

// 计算年付价格（8折）
export function getYearlyPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 0.8)
}

// 计算年付总价
export function getYearlyTotal(monthlyPrice: number): number {
  return getYearlyPrice(monthlyPrice) * 12
}

// 计算年付节省金额
export function getYearlySaving(monthlyPrice: number): number {
  return monthlyPrice * 12 - getYearlyTotal(monthlyPrice)
}
