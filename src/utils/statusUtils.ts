/**
 * 状态工具函数
 *
 * 提供状态相关的通用工具函数，包括状态名称转换、状态标签类型等
 *
 * 创建日期：2025-12-13
 */

// 账号状态代码到中文名称的映射
export const ACCOUNT_STATUS_NAME_MAP: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
  disabled: '禁用',
  locked: '锁定',
  pending: '待审核'
}

// 在职状态代码到中文名称的映射
export const EMPLOYMENT_STATUS_NAME_MAP: Record<string, string> = {
  active: '在职',
  resigned: '离职',
  leave: '休假',
  probation: '试用期'
}

// 通用状态代码到中文名称的映射
export const GENERAL_STATUS_NAME_MAP: Record<string, string> = {
  active: '正常',
  inactive: '停用',
  enabled: '启用',
  disabled: '禁用',
  pending: '待处理',
  completed: '已完成',
  cancelled: '已取消',
  draft: '草稿',
  published: '已发布',
  archived: '已归档'
}

// 账号状态标签类型映射
export const ACCOUNT_STATUS_TAG_TYPE_MAP: Record<string, string> = {
  active: 'success',
  inactive: 'danger',
  disabled: 'danger',
  locked: 'warning',
  pending: 'info'
}

// 在职状态标签类型映射
export const EMPLOYMENT_STATUS_TAG_TYPE_MAP: Record<string, string> = {
  active: 'success',
  resigned: 'info',
  leave: 'warning',
  probation: 'primary'
}

/**
 * 获取账号状态的中文显示名称
 * @param statusCode 状态代码（如 'active'）
 * @returns 中文名称（如 '启用'）
 */
export function getAccountStatusDisplayName(statusCode: string): string {
  return ACCOUNT_STATUS_NAME_MAP[statusCode] || statusCode
}

/**
 * 获取在职状态的中文显示名称
 * @param statusCode 状态代码（如 'active'）
 * @returns 中文名称（如 '在职'）
 */
export function getEmploymentStatusDisplayName(statusCode: string): string {
  return EMPLOYMENT_STATUS_NAME_MAP[statusCode] || statusCode
}

/**
 * 获取通用状态的中文显示名称
 * @param statusCode 状态代码
 * @returns 中文名称
 */
export function getStatusDisplayName(statusCode: string): string {
  return GENERAL_STATUS_NAME_MAP[statusCode] || statusCode
}

/**
 * 获取账号状态标签类型（用于el-tag的type属性）
 * @param statusCode 状态代码
 * @returns 标签类型
 */
export function getAccountStatusTagType(statusCode: string): string {
  return ACCOUNT_STATUS_TAG_TYPE_MAP[statusCode] || 'default'
}

/**
 * 获取在职状态标签类型（用于el-tag的type属性）
 * @param statusCode 状态代码
 * @returns 标签类型
 */
export function getEmploymentStatusTagType(statusCode: string): string {
  return EMPLOYMENT_STATUS_TAG_TYPE_MAP[statusCode] || 'default'
}

/**
 * 获取账号状态选项（用于下拉选择）
 * @returns 状态选项数组
 */
export function getAccountStatusOptions() {
  return [
    { value: 'active', label: '启用' },
    { value: 'inactive', label: '禁用' }
  ]
}

/**
 * 获取在职状态选项（用于下拉选择）
 * @returns 状态选项数组
 */
export function getEmploymentStatusOptions() {
  return [
    { value: 'active', label: '在职' },
    { value: 'resigned', label: '离职' }
  ]
}

/**
 * 检查账号是否为启用状态
 * @param statusCode 状态代码
 * @returns 是否启用
 */
export function isAccountActive(statusCode: string): boolean {
  return statusCode === 'active'
}

/**
 * 检查是否为在职状态
 * @param statusCode 状态代码
 * @returns 是否在职
 */
export function isEmploymentActive(statusCode: string): boolean {
  return statusCode === 'active'
}
