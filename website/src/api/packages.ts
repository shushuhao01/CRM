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
  yearly_discount_rate: number
  yearly_bonus_months: number
  yearly_price: number | null
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

// 计算年付月价（优先使用后端配置的年付价格，否则根据折扣率或赠送月数计算）
export function getYearlyPrice(monthlyPrice: number, pkg?: Package): number {
  if (pkg) {
    // 优先使用后端配置的年付总价
    if (pkg.yearly_price && pkg.yearly_price > 0) {
      return Math.round(pkg.yearly_price / 12)
    }
    // 其次根据赠送月数计算：付10个月享12+N个月
    if (pkg.yearly_bonus_months > 0) {
      const payMonths = 12 - pkg.yearly_bonus_months
      return Math.round((monthlyPrice * payMonths) / 12)
    }
    // 再次根据折扣率计算
    if (pkg.yearly_discount_rate > 0) {
      return Math.round(monthlyPrice * (1 - pkg.yearly_discount_rate / 100))
    }
  }
  // 兜底：默认8折
  return Math.round(monthlyPrice * 0.8)
}

// 计算年付总价
export function getYearlyTotal(monthlyPrice: number, pkg?: Package): number {
  if (pkg) {
    if (pkg.yearly_price && pkg.yearly_price > 0) {
      return Math.round(pkg.yearly_price)
    }
    if (pkg.yearly_bonus_months > 0) {
      return monthlyPrice * (12 - pkg.yearly_bonus_months)
    }
    if (pkg.yearly_discount_rate > 0) {
      return Math.round(monthlyPrice * 12 * (1 - pkg.yearly_discount_rate / 100))
    }
  }
  return getYearlyPrice(monthlyPrice) * 12
}

// 计算年付节省金额
export function getYearlySaving(monthlyPrice: number, pkg?: Package): number {
  return monthlyPrice * 12 - getYearlyTotal(monthlyPrice, pkg)
}

// 获取年付优惠描述文本
export function getYearlyPromoText(pkg: Package): string {
  if (pkg.yearly_bonus_months > 0) {
    return `送${pkg.yearly_bonus_months}个月`
  }
  if (pkg.yearly_discount_rate > 0) {
    const discount = Math.round(10 - pkg.yearly_discount_rate / 10)
    return `${discount}折优惠`
  }
  if (pkg.yearly_price && pkg.yearly_price > 0) {
    const saving = pkg.price * 12 - pkg.yearly_price
    if (saving > 0) return `省¥${Math.round(saving)}`
  }
  return '省20%'
}
