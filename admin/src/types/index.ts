// 管理员用户
export interface AdminUser {
  id: string
  username: string
  email: string
  role: 'super_admin' | 'admin' | 'operator'
  status: 'active' | 'inactive'
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// 授权码
export interface License {
  id: string
  license_key: string
  customer_name: string
  customer_contact: string
  license_type: 'perpetual' | 'subscription' | 'trial'
  deployment_type: 'private' | 'saas'
  max_users: number
  features: string[]
  start_date: string
  end_date: string | null
  status: 'active' | 'inactive' | 'expired' | 'revoked'
  hardware_fingerprint: string | null
  last_verified_at: string | null
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
}

// 版本
export interface Version {
  id: string
  version_number: string
  version_type: 'major' | 'minor' | 'patch' | 'hotfix'
  release_notes: string
  download_url: string | null
  file_hash: string | null
  min_required_version: string | null
  is_mandatory: boolean
  status: 'draft' | 'published' | 'deprecated'
  published_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// 授权日志
export interface LicenseLog {
  id: number
  license_id: number
  action: string
  ip_address: string | null
  user_agent: string | null
  request_data: Record<string, any> | null
  response_data: Record<string, any> | null
  created_at: string
}

// 仪表盘统计
export interface DashboardStats {
  totalLicenses: number
  activeLicenses: number
  expiringLicenses: number
  totalVersions: number
  recentLogs: LicenseLog[]
  licensesByType: { type: string; count: number }[]
  licensesByStatus: { status: string; count: number }[]
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// API响应
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 登录表单
export interface LoginForm {
  username: string
  password: string
}

// 授权表单
export interface LicenseForm {
  customer_name: string
  customer_contact: string
  license_type: 'perpetual' | 'subscription' | 'trial'
  deployment_type: 'private' | 'saas'
  max_users: number
  features: string[]
  start_date: string
  end_date: string | null
  notes: string
}

// 版本表单
export interface VersionForm {
  version_number: string
  version_type: 'major' | 'minor' | 'patch' | 'hotfix'
  release_notes: string
  download_url: string
  min_required_version: string
  is_mandatory: boolean
}
