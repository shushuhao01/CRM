/**
 * 会员中心 API
 */
const API_BASE = '/api/v1'

// Token 管理
const TOKEN_KEY = 'member_token'
const TENANT_KEY = 'member_tenant'

export function getMemberToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setMemberToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearMemberToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TENANT_KEY)
}

export function getMemberTenant(): any {
  const data = localStorage.getItem(TENANT_KEY)
  return data ? JSON.parse(data) : null
}

export function setMemberTenant(tenant: any): void {
  localStorage.setItem(TENANT_KEY, JSON.stringify(tenant))
}

export function isMemberLoggedIn(): boolean {
  return !!getMemberToken()
}

// 带认证的请求封装
async function memberFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getMemberToken()
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(url, { ...options, headers })
}

/**
 * 会员登录
 */
export async function memberLogin(params: {
  phone: string
  loginType: 'password' | 'sms_code'
  password?: string
  code?: string
  tenantId?: string
}): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const res = await fetch(`${API_BASE}/public/member/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    const data = await res.json()
    if (data.code === 0 && data.data?.token) {
      setMemberToken(data.data.token)
      setMemberTenant({
        id: data.data.tenantId,
        name: data.data.tenantName,
        code: data.data.tenantCode,
        phone: data.data.phone
      })
    }
    return { success: data.code === 0, message: data.message, data: data.data }
  } catch {
    return { success: false, message: '网络错误，请稍后重试' }
  }
}

/**
 * 🔒 多租户选择登录（验证码多租户选择后使用selectToken完成登录）
 */
export async function selectTenantLogin(params: {
  phone: string
  selectToken: string
  tenantId: string
}): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const res = await fetch(`${API_BASE}/public/member/select-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    const data = await res.json()
    if (data.code === 0 && data.data?.token) {
      setMemberToken(data.data.token)
      setMemberTenant({
        id: data.data.tenantId,
        name: data.data.tenantName,
        code: data.data.tenantCode,
        phone: data.data.phone
      })
    }
    return { success: data.code === 0, message: data.message, data: data.data }
  } catch {
    return { success: false, message: '网络错误' }
  }
}

/**
 * 发送验证码
 */
export async function memberSendCode(phone: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/public/member/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    const data = await res.json()
    return { success: data.code === 0, message: data.message }
  } catch {
    return { success: false, message: '发送失败' }
  }
}

/**
 * 设置/重置密码
 */
export async function memberSetPassword(phone: string, code: string, password: string, tenantId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/public/member/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, password, tenantId })
    })
    const data = await res.json()
    return { success: data.code === 0, message: data.message }
  } catch {
    return { success: false, message: '操作失败' }
  }
}

/**
 * 获取会员资料
 */
export async function getMemberProfile(): Promise<any> {
  try {
    const res = await memberFetch(`${API_BASE}/public/member/profile`)
    if (res.status === 401) {
      clearMemberToken()
      return null
    }
    const data = await res.json()
    return data.code === 0 ? data.data : null
  } catch {
    return null
  }
}

/**
 * 修改会员资料
 */
export async function updateMemberProfile(params: {
  name?: string; contact?: string; email?: string
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await memberFetch(`${API_BASE}/public/member/profile`, {
      method: 'PUT',
      body: JSON.stringify(params)
    })
    const data = await res.json()
    return { success: data.code === 0, message: data.message }
  } catch {
    return { success: false, message: '修改失败' }
  }
}

/**
 * 查询账单
 */
export async function getMemberBills(page: number = 1, pageSize: number = 20, filters?: {
  orderNo?: string; startDate?: string; endDate?: string
}): Promise<any> {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (filters?.orderNo) params.set('orderNo', filters.orderNo)
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)
    const res = await memberFetch(`${API_BASE}/public/member/bills?${params.toString()}`)
    const data = await res.json()
    return data.code === 0 ? data.data : { list: [], total: 0, page, pageSize }
  } catch {
    return { list: [], total: 0, page, pageSize }
  }
}

/**
 * 获取授权信息（支持日志分页）
 */
export async function getMemberLicense(logPage: number = 1, logPageSize: number = 10): Promise<any> {
  try {
    const res = await memberFetch(`${API_BASE}/public/member/license?logPage=${logPage}&logPageSize=${logPageSize}`)
    const data = await res.json()
    return data.code === 0 ? data.data : null
  } catch {
    return null
  }
}

/**
 * 修改密码（已登录）
 */
export async function changeMemberPassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await memberFetch(`${API_BASE}/public/member/change-password`, {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    })
    const data = await res.json()
    return { success: data.code === 0, message: data.message }
  } catch {
    return { success: false, message: '操作失败' }
  }
}

/**
 * 退出登录
 */
export function memberLogout(): void {
  clearMemberToken()
}

