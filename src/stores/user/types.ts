/**
 * 用户Store - 类型定义
 * 从 user/index.ts 中提取，集中管理用户相关类型
 */
import type { UserRole, PermissionLevel, DataScope, CustomerServiceType, SensitiveInfoType } from '@/services/permission'

export interface User {
  id: string
  name: string
  email: string
  role: string // 'super_admin' | 'admin' | 'department_manager' | 'sales_staff' | 'customer_service' 或中文角色名
  department: string // 部门名称（用于显示）
  avatar?: string
  // 基本信息字段
  username?: string // 用户名（登录名）
  phone?: string // 手机号
  realName?: string // 真实姓名
  roleName?: string // 角色显示名称
  position?: string // 职位
  // 新增权限相关字段
  userRole?: UserRole
  permissionLevel?: PermissionLevel
  dataScope?: DataScope
  departmentId?: string // 部门ID（用于数据过滤）
  departmentName?: string // 部门名称（冗余字段，与department相同）
  departmentIds?: string[]
  customerServiceType?: CustomerServiceType
  sensitiveInfoAccess?: SensitiveInfoType[]
  // 密码相关字段
  isDefaultPassword?: boolean // 是否为默认密码
  passwordLastChanged?: Date // 密码最后修改时间
  passwordExpiresAt?: Date // 密码过期时间
  forcePasswordChange?: boolean // 是否强制修改密码
  // 账号状态
  status?: 'active' | 'disabled' | 'inactive'
  // 在职状态
  employmentStatus?: 'active' | 'resigned'
  resignedDate?: string // 离职日期
}

export interface PhoneViewSettings {
  enabled: boolean
  whitelist: string[] // 用户ID白名单
}

/**
 * 共享依赖接口 - 供 authActions / permissionHelpers 访问 store 的响应式状态
 */
export interface UserStoreDeps {
  currentUser: import('vue').Ref<User | null>
  token: import('vue').Ref<string>
  permissions: import('vue').Ref<string[]>
  isLoggedIn: import('vue').Ref<boolean>
  users: import('vue').Ref<User[]>
}

