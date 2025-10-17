import { api } from './request'
import type { Department, DepartmentMember, DepartmentStats, DepartmentRole } from '@/stores/department'

// 部门相关API接口

/**
 * 获取部门列表
 */
export const getDepartmentList = () => {
  return api.get<Department[]>('/system/departments')
}

/**
 * 获取部门树形结构
 */
export const getDepartmentTree = () => {
  return api.get<Department[]>('/system/departments/tree')
}

/**
 * 根据ID获取部门详情
 */
export const getDepartmentById = (id: string) => {
  return api.get<Department>(`/system/departments/${id}`)
}

/**
 * 创建部门
 */
export const createDepartment = (data: Omit<Department, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>) => {
  return api.post<Department>('/system/departments', data)
}

/**
 * 更新部门
 */
export const updateDepartment = (id: string, data: Partial<Department>) => {
  return api.put<Department>(`/system/departments/${id}`, data)
}

/**
 * 删除部门
 */
export const deleteDepartment = (id: string) => {
  return api.delete<void>(`/system/departments/${id}`)
}

/**
 * 更新部门状态
 */
export const updateDepartmentStatus = (id: string, status: 'active' | 'inactive') => {
  return api.patch<Department>(`/system/departments/${id}/status`, { status })
}

/**
 * 获取部门成员列表
 */
export const getDepartmentMembers = (departmentId: string) => {
  return api.get<DepartmentMember[]>(`/system/departments/${departmentId}/members`)
}

/**
 * 添加部门成员
 */
export const addDepartmentMember = (departmentId: string, userId: string, role: string) => {
  return api.post<DepartmentMember>(`/system/departments/${departmentId}/members`, { userId, role })
}

/**
 * 移除部门成员
 */
export const removeDepartmentMember = (departmentId: string, userId: string) => {
  return api.delete<void>(`/system/departments/${departmentId}/members/${userId}`)
}

/**
 * 获取部门统计数据
 */
export const getDepartmentStats = () => {
  return api.get<DepartmentStats>('/system/departments/stats')
}

/**
 * 更新部门权限
 */
export const updateDepartmentPermissions = (id: string, permissions: string[]) => {
  return api.patch<Department>(`/system/departments/${id}/permissions`, { permissions })
}

/**
 * 批量更新部门权限
 */
export const batchUpdateDepartmentPermissions = (departmentIds: string[], permissions: string[]) => {
  return api.patch<void>('/system/departments/batch/permissions', { departmentIds, permissions })
}

/**
 * 移动部门
 */
export const moveDepartment = (id: string, newParentId: string | null) => {
  return api.patch<Department>(`/system/departments/${id}/move`, { newParentId })
}

/**
 * 获取部门角色列表
 */
export const getDepartmentRoles = (departmentId: string) => {
  return api.get<DepartmentRole[]>(`/system/departments/${departmentId}/roles`)
}

/**
 * 创建部门角色
 */
export const createDepartmentRole = (data: Omit<DepartmentRole, 'id' | 'createdAt' | 'updatedAt' | 'userCount'>) => {
  return api.post<DepartmentRole>('/system/department-roles', data)
}

/**
 * 更新部门角色
 */
export const updateDepartmentRole = (id: string, data: Partial<DepartmentRole>) => {
  return api.put<DepartmentRole>(`/system/department-roles/${id}`, data)
}

/**
 * 删除部门角色
 */
export const deleteDepartmentRole = (id: string) => {
  return api.delete<void>(`/system/department-roles/${id}`)
}

// 部门数据格式标准化工具函数

/**
 * 标准化部门数据格式
 */
export const normalizeDepartmentData = (department: any): Department => {
  return {
    id: department.id || department.departmentId || '',
    name: department.name || department.departmentName || '',
    code: department.code || department.departmentCode || '',
    description: department.description || '',
    parentId: department.parentId || department.parent_id || null,
    managerId: department.managerId || department.manager_id || null,
    managerName: department.managerName || department.manager_name || '',
    level: department.level || 1,
    sort: department.sort || department.sortOrder || 0,
    status: department.status || 'active',
    permissions: department.permissions || [],
    memberCount: department.memberCount || department.member_count || 0,
    createdAt: department.createdAt || department.created_at || new Date().toISOString(),
    updatedAt: department.updatedAt || department.updated_at || new Date().toISOString()
  }
}

/**
 * 标准化部门成员数据格式
 */
export const normalizeDepartmentMemberData = (member: any): DepartmentMember => {
  return {
    id: member.id || member.memberId || '',
    userId: member.userId || member.user_id || '',
    userName: member.userName || member.user_name || member.name || '',
    userAvatar: member.userAvatar || member.user_avatar || member.avatar || '',
    departmentId: member.departmentId || member.department_id || '',
    position: member.position || member.jobTitle || '',
    joinDate: member.joinDate || member.join_date || new Date().toISOString(),
    status: member.status || 'active'
  }
}

/**
 * 将部门数据转换为选项格式（用于下拉选择）
 */
export const departmentToOptions = (departments: Department[]) => {
  return departments
    .filter(dept => dept.status === 'active')
    .map(dept => ({
      label: dept.name,
      value: dept.id,
      code: dept.code,
      level: dept.level
    }))
}

/**
 * 获取部门层级路径
 */
export const getDepartmentPath = (departmentId: string, departments: Department[]): string[] => {
  const path: string[] = []
  let currentId = departmentId
  
  while (currentId) {
    const dept = departments.find(d => d.id === currentId)
    if (!dept) break
    
    path.unshift(dept.name)
    currentId = dept.parentId || ''
  }
  
  return path
}