// 管理员用户
export interface AdminUser {
  id: string
  username: string
  name?: string
  email: string
  phone?: string
  role: 'super_admin' | 'admin' | 'operator'
  roleId?: string | null
  permissions?: string[]
  status: 'active' | 'inactive'
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// 管理后台角色
export interface AdminRole {
  id: string
  name: string
  code: string
  description?: string
  permissions: string[]
  isSystem: number
  status: 'active' | 'disabled'
  userCount?: number
  createdAt?: string
  updatedAt?: string
}

// 权限树节点
export interface PermissionTreeNode {
  code: string
  name: string
  children?: PermissionTreeNode[]
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

// ============ Admin API 参数类型定义 ============

/** 通用分页查询参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  keyword?: string
  search?: string
}

/** 授权列表查询参数 */
export interface LicenseListParams extends PaginationParams {
  status?: string
  license_type?: string
  deployment_type?: string
}

/** 生成/创建授权码参数 */
export interface GenerateLicenseData {
  customer_name: string
  customer_contact: string
  license_type: 'perpetual' | 'subscription' | 'trial'
  deployment_type: 'private' | 'saas'
  max_users: number
  user_limit_mode?: 'total' | 'online'
  max_online_seats?: number
  features: string[]
  start_date: string
  end_date?: string | null
  notes?: string
}

/** 更新授权码参数 */
export interface UpdateLicenseData {
  customer_name?: string
  customer_contact?: string
  max_users?: number
  user_limit_mode?: 'total' | 'online'
  max_online_seats?: number
  features?: string[]
  end_date?: string | null
  notes?: string
  status?: string
  memberPassword?: string
  crmPassword?: string
  [key: string]: any
}

/** 授权日志查询参数 */
export interface LogListParams extends PaginationParams {
  action?: string
  startDate?: string
  endDate?: string
}

/** 账单查询参数 */
export interface BillListParams extends PaginationParams {
  status?: string
  startDate?: string
  endDate?: string
}

/** 租户列表查询参数 */
export interface TenantListParams extends PaginationParams {
  status?: string
  packageId?: string
}

/** 创建租户参数 */
export interface CreateTenantData {
  companyName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  packageId: string
  maxUsers?: number
  userLimitMode?: 'total' | 'online'
  maxOnlineSeats?: number
  expireDate: string
  features?: string[]
  notes?: string
}

/** 更新租户参数 */
export interface UpdateTenantData {
  companyName?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  maxUsers?: number
  features?: string[]
  notes?: string
  status?: string
  memberPassword?: string
  crmPassword?: string
  [key: string]: any
}

/** 套餐查询参数 */
export interface PackageListParams extends PaginationParams {
  status?: string
}

/** 创建/更新套餐参数 */
export interface PackageData {
  name: string
  code?: string
  description?: string
  monthlyPrice: number
  yearlyPrice?: number
  maxUsers: number
  userLimitMode?: 'total' | 'online'
  maxOnlineSeats?: number
  features: string[]
  sortOrder?: number
  status?: string
  yearlyDiscount?: number
  yearlyBonusMonths?: number
  fixedYearlyPrice?: number
}

/** 版本列表查询参数 */
export interface VersionListParams extends PaginationParams {
  status?: string
  version_type?: string
}

/** 创建/更新版本参数 */
export interface CreateVersionData {
  version_number: string
  version_type: 'major' | 'minor' | 'patch' | 'hotfix'
  release_notes: string
  download_url?: string
  min_required_version?: string
  is_mandatory?: boolean
}

/** 管理员用户查询参数 */
export interface AdminUserListParams extends PaginationParams {
  role?: string
  status?: string
}

/** 创建管理员参数 */
export interface CreateAdminUserData {
  username: string
  password: string
  name?: string
  email?: string
  role?: string
  roleId?: string | null
}

/** 更新管理员参数 */
export interface UpdateAdminUserData {
  name?: string
  email?: string
  phone?: string
  role?: string
  roleId?: string | null
  status?: string
  password?: string
}

/** 角色查询参数 */
export interface AdminRoleListParams {
  keyword?: string
  status?: string
}

/** 创建/更新角色参数 */
export interface AdminRoleData {
  name: string
  code?: string
  description?: string
  permissions: string[]
  status?: string
}

/** 修改密码参数 */
export interface ChangePasswordData {
  oldPassword?: string
  newPassword: string
}

/** 系统设置参数 */
export interface SystemSettingsData {
  siteName?: string
  siteDescription?: string
  copyright?: string
  icp?: string
  logo?: string
  [key: string]: string | number | boolean | undefined
}

/** 操作日志查询参数 */
export interface OperationLogParams extends PaginationParams {
  action?: string
  module?: string
  startDate?: string
  endDate?: string
}

/** 模块查询参数 */
export interface ModuleListParams extends PaginationParams {
  status?: string
  category?: string
}

/** 创建/更新模块参数 */
export interface ModuleData {
  name: string
  code: string
  description?: string
  category?: string
  icon?: string
  sortOrder?: number
  status?: string
  config?: Record<string, unknown>
}

/** 模块配置参数 */
export interface ModuleConfigData {
  [key: string]: string | number | boolean | Record<string, unknown>
}

/** API配置查询参数 */
export interface ApiConfigListParams extends PaginationParams {
  status?: string
}

/** 创建/更新API配置参数 */
export interface ApiConfigData {
  name: string
  description?: string
  endpoint?: string
  method?: string
  rateLimit?: number
  status?: string
}

/** API调用日志查询参数 */
export interface ApiCallLogParams extends PaginationParams {
  startDate?: string
  endDate?: string
  success?: boolean
}

/** 通知模板查询参数 */
export interface NotificationTemplateListParams extends PaginationParams {
  type?: string
  status?: string
}

/** 创建/更新通知模板参数 */
export interface NotificationTemplateData {
  name: string
  code: string
  type: string
  subject?: string
  content: string
  variables?: string[]
  status?: string
}

/** 测试通知模板参数 */
export interface TestNotificationTemplateData {
  recipient: string
  variables?: Record<string, string>
}

