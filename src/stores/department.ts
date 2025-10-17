import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createPersistentStore } from '@/utils/storage'

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  parentId?: string | null
  sortOrder: number
  status: 'active' | 'inactive'
  memberCount: number
  createdAt: string
  updatedAt: string
  children?: Department[]
  statusLoading?: boolean
}

export interface DepartmentMember {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  departmentId: string
  position: string
  joinDate: string
  status: 'active' | 'inactive'
}

export interface DepartmentStats {
  totalDepartments: number
  activeDepartments: number
  totalMembers: number
  departmentsByType: Record<string, number>
}

export interface DepartmentRole {
  id: string
  name: string
  description: string
  departmentId: string
  departmentName?: string
  type: 'manager' | 'supervisor' | 'specialist' | 'member'
  permissions: string[]
  userCount: number
  createdAt: string
  updatedAt: string
}

export interface RoleUser {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  roleId: string
  assignedAt: string
  assignedBy: string
}

export const useDepartmentStore = createPersistentStore('department', () => {
  const departments = ref<Department[]>([])
  const members = ref<DepartmentMember[]>([])
  const roles = ref<DepartmentRole[]>([])
  const roleUsers = ref<RoleUser[]>([])
  const loading = ref(false)
  // 统计数据使用API获取的真实数据，同时保留计算属性作为备用
  const apiStats = ref<DepartmentStats>({
    totalDepartments: 0,
    activeDepartments: 0,
    totalMembers: 0,
    departmentsByType: {}
  })
  
  // 统计数据优先使用API数据，如果API数据为空则使用计算属性
  const stats = computed<DepartmentStats>(() => {
    // 如果API统计数据有效，使用API数据
    if (apiStats.value.totalDepartments > 0) {
      return apiStats.value
    }
    // 否则使用计算属性作为备用
    return {
      totalDepartments: departments.value.length,
      activeDepartments: departments.value.filter(d => d.status === 'active').length,
      totalMembers: members.value.filter(m => m.status === 'active').length,
      departmentsByType: departments.value.reduce((acc, dept) => {
        const type = dept.parentId ? '子部门' : '主部门'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  })

  // 初始化模拟数据（已移除，使用真实API数据）
  const initMockData = () => {
    // 不再初始化模拟数据，所有数据从API获取
  }

  // 获取部门树形结构
  const departmentTree = computed(() => {
    const buildTree = (parentId: string | null): Department[] => {
      return departments.value
        .filter(dept => dept.parentId === parentId)
        .sort((a, b) => a.sort - b.sort)
        .map(dept => ({
          ...dept,
          children: buildTree(dept.id)
        }))
    }
    return buildTree(null)
  })

  // 获取部门列表（扁平化）
  const departmentList = computed(() => {
    return departments.value.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.sort - b.sort
    })
  })

  // 根据ID获取部门
  const getDepartmentById = (id: string) => {
    return departments.value.find(dept => dept.id === id)
  }

  // 获取部门成员
  const getDepartmentMembers = (departmentId: string) => {
    return members.value.filter(member => member.departmentId === departmentId)
  }

  // 添加部门
  const addDepartment = async (department: Omit<Department, 'id' | 'createdAt' | 'updatedAt' | 'memberCount'>) => {
    loading.value = true
    try {
      const { createDepartment } = await import('@/api/department')
      const response = await createDepartment(department)
      const newDepartment = response.data
      departments.value.push(newDepartment)
      return newDepartment
    } catch (error) {
      console.error('创建部门失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 更新部门
  const updateDepartment = async (id: string, updates: Partial<Department>) => {
    loading.value = true
    try {
      const { updateDepartment: updateDepartmentAPI } = await import('@/api/department')
      const response = await updateDepartmentAPI(id, updates)
      const updatedDepartment = response.data
      
      const index = departments.value.findIndex(d => d.id === id)
      if (index !== -1) {
        departments.value[index] = updatedDepartment
      }
      return updatedDepartment
    } catch (error) {
      console.error('更新部门失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 更新部门状态
  const updateDepartmentStatus = async (id: string, status: 'active' | 'inactive') => {
    loading.value = true
    try {
      const { updateDepartmentStatus: updateDepartmentStatusAPI } = await import('@/api/department')
      const response = await updateDepartmentStatusAPI(id, status)
      const updatedDepartment = response.data
      
      const index = departments.value.findIndex(d => d.id === id)
      if (index !== -1) {
        departments.value[index] = updatedDepartment
      }
      return updatedDepartment
    } catch (error) {
      console.error('更新部门状态失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 删除部门
  const deleteDepartment = async (id: string) => {
    loading.value = true
    try {
      const { deleteDepartment: deleteDepartmentAPI } = await import('@/api/department')
      await deleteDepartmentAPI(id)
      
      const index = departments.value.findIndex(d => d.id === id)
      if (index !== -1) {
        departments.value.splice(index, 1)
        // 同时删除该部门的成员
        members.value = members.value.filter(m => m.departmentId !== id)
        return true
      }
      return false
    } catch (error) {
      console.error('删除部门失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 移动部门层级
  const moveDepartment = async (id: string, newParentId: string | null, newSort: number) => {
    loading.value = true
    try {
      const department = departments.value.find(dept => dept.id === id)
      if (department) {
        department.parentId = newParentId
        department.sort = newSort
        department.level = newParentId ? (getDepartmentById(newParentId)?.level || 0) + 1 : 1
        department.updatedAt = new Date().toISOString()
      }
    } finally {
      loading.value = false
    }
  }

  // 添加部门成员
  const addDepartmentMember = async (member: Omit<DepartmentMember, 'id' | 'joinedAt'>) => {
    loading.value = true
    try {
      const { addDepartmentMember: addDepartmentMemberAPI } = await import('@/api/department')
      const response = await addDepartmentMemberAPI(member.departmentId, member.userId, member.role)
      const newMember = response.data
      
      members.value.push(newMember)
      
      // 更新部门成员数量
      const dept = departments.value.find(d => d.id === member.departmentId)
      if (dept) {
        dept.memberCount = (dept.memberCount || 0) + 1
      }
      
      return newMember
    } catch (error) {
      console.error('添加部门成员失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 移除部门成员
  const removeDepartmentMember = async (departmentId: string, userId: string) => {
    loading.value = true
    try {
      const { removeDepartmentMember: removeDepartmentMemberAPI } = await import('@/api/department')
      await removeDepartmentMemberAPI(departmentId, userId)
      
      const index = members.value.findIndex(m => m.departmentId === departmentId && m.userId === userId)
      if (index !== -1) {
        members.value.splice(index, 1)
        
        // 更新部门成员数量
        const dept = departments.value.find(d => d.id === departmentId)
        if (dept && dept.memberCount > 0) {
          dept.memberCount -= 1
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('移除部门成员失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 更新部门权限
  const updateDepartmentPermissions = async (id: string, permissions: string[]) => {
    loading.value = true
    try {
      const department = departments.value.find(dept => dept.id === id)
      if (department) {
        department.permissions = [...permissions]
        department.updatedAt = new Date().toISOString()
      }
    } finally {
      loading.value = false
    }
  }

  // 批量更新部门权限
  const batchUpdatePermissions = async (updates: Array<{ id: string; permissions: string[] }>) => {
    loading.value = true
    try {
      updates.forEach(update => {
        const department = departments.value.find(dept => dept.id === update.id)
        if (department) {
          department.permissions = [...update.permissions]
          department.updatedAt = new Date().toISOString()
        }
      })
    } finally {
      loading.value = false
    }
  }

  // 复制权限配置
  const copyPermissions = async (fromId: string, toIds: string[]) => {
    loading.value = true
    try {
      const sourceDepartment = departments.value.find(dept => dept.id === fromId)
      if (sourceDepartment) {
        const permissions = [...sourceDepartment.permissions]
        toIds.forEach(toId => {
          const targetDepartment = departments.value.find(dept => dept.id === toId)
          if (targetDepartment) {
            targetDepartment.permissions = [...permissions]
            targetDepartment.updatedAt = new Date().toISOString()
          }
        })
      }
    } finally {
      loading.value = false
    }
  }

  // 获取权限统计
  const getPermissionStats = () => {
    const stats = {
      totalPermissions: 0,
      departmentPermissions: {} as Record<string, number>,
      permissionUsage: {} as Record<string, number>
    }

    departments.value.forEach(dept => {
      stats.totalPermissions += dept.permissions.length
      stats.departmentPermissions[dept.id] = dept.permissions.length
      
      dept.permissions.forEach(permission => {
        stats.permissionUsage[permission] = (stats.permissionUsage[permission] || 0) + 1
      })
    })

    return stats
  }

  // 角色管理方法
  const getRoleById = (id: string) => {
    return roles.value.find(role => role.id === id)
  }

  const getRolesByDepartment = (departmentId: string) => {
    return roles.value.filter(role => role.departmentId === departmentId)
  }

  const getRoleUsers = (roleId: string) => {
    return roleUsers.value.filter(ru => ru.roleId === roleId)
  }

  const addRole = async (role: Omit<DepartmentRole, 'id' | 'createdAt' | 'updatedAt' | 'userCount'>) => {
    loading.value = true
    try {
      const department = getDepartmentById(role.departmentId)
      const newRole: DepartmentRole = {
        ...role,
        id: Date.now().toString(),
        departmentName: department?.name || '',
        userCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      roles.value.push(newRole)
      return newRole
    } finally {
      loading.value = false
    }
  }

  const updateRole = async (id: string, updates: Partial<DepartmentRole>) => {
    loading.value = true
    try {
      const index = roles.value.findIndex(role => role.id === id)
      if (index !== -1) {
        roles.value[index] = {
          ...roles.value[index],
          ...updates,
          updatedAt: new Date().toISOString()
        }
        return roles.value[index]
      }
      throw new Error('角色不存在')
    } finally {
      loading.value = false
    }
  }

  const deleteRole = async (id: string) => {
    loading.value = true
    try {
      const index = roles.value.findIndex(role => role.id === id)
      if (index !== -1) {
        // 删除角色关联的用户
        roleUsers.value = roleUsers.value.filter(ru => ru.roleId !== id)
        roles.value.splice(index, 1)
      }
    } finally {
      loading.value = false
    }
  }

  const assignUserToRole = async (roleId: string, userId: string, userName: string, assignedBy: string = 'admin') => {
    loading.value = true
    try {
      // 检查是否已经分配
      const existing = roleUsers.value.find(ru => ru.roleId === roleId && ru.userId === userId)
      if (existing) {
        throw new Error('用户已分配到该角色')
      }

      const newRoleUser: RoleUser = {
        id: Date.now().toString(),
        userId,
        userName,
        roleId,
        assignedAt: new Date().toISOString(),
        assignedBy
      }
      roleUsers.value.push(newRoleUser)

      // 更新角色用户数量
      const role = roles.value.find(r => r.id === roleId)
      if (role) {
        role.userCount = getRoleUsers(roleId).length
      }

      return newRoleUser
    } finally {
      loading.value = false
    }
  }

  const removeUserFromRole = async (roleId: string, userId: string) => {
    loading.value = true
    try {
      const index = roleUsers.value.findIndex(ru => ru.roleId === roleId && ru.userId === userId)
      if (index !== -1) {
        roleUsers.value.splice(index, 1)

        // 更新角色用户数量
        const role = roles.value.find(r => r.id === roleId)
        if (role) {
          role.userCount = getRoleUsers(roleId).length
        }
      }
    } finally {
      loading.value = false
    }
  }

  const batchUpdateRolePermissions = async (roleIds: string[], permissions: string[]) => {
    loading.value = true
    try {
      roleIds.forEach(roleId => {
        const role = roles.value.find(r => r.id === roleId)
        if (role) {
          role.permissions = [...permissions]
          role.updatedAt = new Date().toISOString()
        }
      })
    } finally {
      loading.value = false
    }
  }

  // 获取部门数据（调用真实API）
  const fetchDepartments = async () => {
    loading.value = true
    try {
      const { getDepartmentList } = await import('@/api/department')
      const response = await getDepartmentList()
      departments.value = response.data || []
    } catch (error) {
      console.error('获取部门列表失败:', error)
      departments.value = []
    } finally {
      loading.value = false
    }
  }

  // 获取部门统计数据（调用真实API）
  const fetchDepartmentStats = async () => {
    try {
      const { getDepartmentStats } = await import('@/api/department')
      const response = await getDepartmentStats()
      if (response.data) {
        apiStats.value = response.data
        console.log('[DepartmentStore] 统计数据已更新:', response.data)
      }
    } catch (error) {
      console.error('获取部门统计数据失败:', error)
      // 如果API失败，保持使用计算属性
    }
  }

  // 获取部门成员数据
  const fetchDepartmentMembers = async () => {
    loading.value = true
    try {
      const { getDepartmentMembers: getDepartmentMembersAPI } = await import('@/api/department')
      const allMembers: DepartmentMember[] = []
      
      // 为每个部门获取成员数据
      for (const dept of departments.value) {
        try {
          const response = await getDepartmentMembersAPI(dept.id)
          allMembers.push(...(response.data || []))
        } catch (error) {
          console.warn(`获取部门 ${dept.name} 成员失败:`, error)
        }
      }
      
      members.value = allMembers
    } catch (error) {
      console.error('获取部门成员失败:', error)
      members.value = []
    } finally {
      loading.value = false
    }
  }

  // 获取部门角色数据
  const fetchDepartmentRoles = async () => {
    loading.value = true
    try {
      const { getDepartmentRoles: getDepartmentRolesAPI } = await import('@/api/department')
      const allRoles: DepartmentRole[] = []
      
      // 为每个部门获取角色数据
      for (const dept of departments.value) {
        try {
          const response = await getDepartmentRolesAPI(dept.id)
          allRoles.push(...(response.data || []))
        } catch (error) {
          console.warn(`获取部门 ${dept.name} 角色失败:`, error)
        }
      }
      
      roles.value = allRoles
    } catch (error) {
      console.error('获取部门角色失败:', error)
      roles.value = []
    } finally {
      loading.value = false
    }
  }

  // 初始化所有数据
  const initData = async () => {
    await fetchDepartments()
    await fetchDepartmentMembers()
    await fetchDepartmentRoles()
    await fetchDepartmentStats()
  }

  return {
    departments,
    members,
    roles,
    roleUsers,
    loading,
    stats,
    departmentTree,
    departmentList,
    getDepartmentById,
    getDepartmentMembers,
    addDepartment,
    updateDepartment,
    updateDepartmentStatus,
    deleteDepartment,
    moveDepartment,
    addDepartmentMember,
    removeDepartmentMember,
    updateDepartmentPermissions,
    batchUpdatePermissions,
    copyPermissions,
    getPermissionStats,
    getRoleById,
    getRolesByDepartment,
    getRoleUsers,
    addRole,
    updateRole,
    deleteRole,
    assignUserToRole,
    removeUserFromRole,
    batchUpdateRolePermissions,
    fetchDepartments,
    fetchDepartmentMembers,
    fetchDepartmentRoles,
    fetchDepartmentStats,
    initData,
    initMockData
  }
})