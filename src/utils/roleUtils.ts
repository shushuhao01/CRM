/**
 * 角色工具函数
 *
 * 提供角色相关的通用工具函数，包括角色名称转换、角色标签类型等
 *
 * 创建日期：2025-12-13
 */

// 角色代码到中文名称的映射
export const ROLE_NAME_MAP: Record<string, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  department_manager: '部门经理',
  sales_staff: '销售员',
  customer_service: '客服'
}

// 中文名称到角色代码的映射（反向映射）
export const ROLE_CODE_MAP: Record<string, string> = {
  超级管理员: 'super_admin',
  管理员: 'admin',
  系统管理员: 'admin', // 兼容别名
  部门经理: 'department_manager',
  经理: 'department_manager', // 兼容别名
  销售员: 'sales_staff',
  销售: 'sales_staff', // 兼容别名
  客服: 'customer_service',
  客服人员: 'customer_service' // 兼容别名
}

// 角色标签类型映射
export const ROLE_TAG_TYPE_MAP: Record<string, string> = {
  super_admin: 'danger',
  admin: 'warning',
  department_manager: 'success',
  sales_staff: 'primary',
  customer_service: 'info'
}

/**
 * 获取角色的中文显示名称
 * @param roleCode 角色代码（如 'department_manager'）
 * @returns 中文名称（如 '部门经理'）
 */
export function getRoleDisplayName(roleCode: string): string {
  return ROLE_NAME_MAP[roleCode] || roleCode
}

/**
 * 获取角色代码（中文名称转英文代码）
 * @param roleName 角色中文名称（如 '部门经理'）
 * @returns 角色代码（如 'department_manager'）
 */
export function getRoleCode(roleName: string): string {
  return ROLE_CODE_MAP[roleName] || roleName
}

/**
 * 获取角色标签类型（用于el-tag的type属性）
 * @param roleCode 角色代码
 * @returns 标签类型
 */
export function getRoleTagType(roleCode: string): string {
  return ROLE_TAG_TYPE_MAP[roleCode] || 'info'
}

/**
 * 获取所有角色选项（用于下拉选择）
 * @returns 角色选项数组
 */
export function getRoleOptions() {
  return Object.entries(ROLE_NAME_MAP).map(([code, name]) => ({
    value: code,
    label: name
  }))
}

/**
 * 检查角色是否为管理员角色
 * @param roleCode 角色代码
 * @returns 是否为管理员角色
 */
export function isAdminRole(roleCode: string): boolean {
  return ['super_admin', 'admin'].includes(roleCode)
}

/**
 * 检查角色是否为销售相关角色
 * @param roleCode 角色代码
 * @returns 是否为销售相关角色
 */
export function isSalesRole(roleCode: string): boolean {
  return ['department_manager', 'sales_staff'].includes(roleCode)
}

/**
 * 检查角色是否为客服角色
 * @param roleCode 角色代码
 * @returns 是否为客服角色
 */
export function isServiceRole(roleCode: string): boolean {
  return roleCode === 'customer_service'
}

/**
 * 获取角色的权限级别（数字越小权限越高）
 * @param roleCode 角色代码
 * @returns 权限级别
 */
export function getRoleLevel(roleCode: string): number {
  const levelMap: Record<string, number> = {
    super_admin: 1,
    admin: 2,
    department_manager: 3,
    sales_staff: 4,
    customer_service: 4
  }
  return levelMap[roleCode] || 999
}
