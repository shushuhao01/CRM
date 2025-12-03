import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createPersistentStore } from '@/utils/storage'

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  parentId?: string | null
  level: number
  managerId?: string | null
  managerName?: string
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

    // 确保departments.value和members.value是数组
    const departmentsArray = Array.isArray(departments.value) ? departments.value : []
    const membersArray = Array.isArray(members.value) ? members.value : []

    // 否则使用计算属性作为备用
    return {
      totalDepartments: departmentsArray.length,
      activeDepartments: departmentsArray.filter(d => d.status === 'active').length,
      totalMembers: membersArray.filter(m => m.status === 'active').length,
      departmentsByType: departmentsArray.reduce((acc, dept) => {
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
    // 确保departments.value是数组
    if (!Array.isArray(departments.value)) {
      return []
    }

    const buildTree = (parentId: string | null): Department[] => {
      return departments.value
        .filter(dept => {
          // 处理各种空值情况：null, undefined, '', '0', 'null'
          const deptParentId = dept.parentId
          const isRootLevel = !deptParentId || deptParentId === 'null' || deptParentId === '0'

          if (parentId === null) {
            // 查找根级部门
            return isRootLevel
          } else {
            // 查找指定父级的子部门
            return deptParentId === parentId
          }
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(dept => ({
          ...dept,
          children: buildTree(dept.id)
        }))
    }
    return buildTree(null)
  })

  // 获取部门列表（扁平化）
  const departmentList = computed(() => {
    // 确保departments.value是数组
    if (!Array.isArray(departments.value)) {
      return []
    }

    return departments.value.sort((a, b) => {
      // 使用sortOrder字段进行排序
      return (a.sortOrder || 0) - (b.sortOrder || 0)
    })
  })

  // 根据ID获取部门
  const getDepartmentById = (id: string) => {
    return departments.value.find(dept => dept.id === id)
  }

  // 获取部门成员（从API获取真实数据）
  const getDepartmentMembers = (departmentId: string): DepartmentMember[] => {
    // 【生产环境修复】不再从localStorage读取，返回空数组
    // 实际数据应该通过API调用 fetchDepartmentMembers() 获取
    console.log('[部门Store] getDepartmentMembers已废弃，请使用fetchDepartmentMembers')
    return members.value.filter(m => m.departmentId === departmentId)
  }

  // 从API获取部门成员
  const fetchDepartmentMembers = async (departmentId: string): Promise<DepartmentMember[]> => {
    try {
      const { getDepartmentMembers: getDepartmentMembersAPI } = await import('@/api/department')
      const response = await getDepartmentMembersAPI(departmentId)
      const apiMembers = response.data || []

      // 更新store中的members
      members.value = [
        ...members.value.filter(m => m.departmentId !== departmentId),
        ...apiMembers
      ]

      console.log(`[部门Store] 从API获取部门${departmentId}的成员:`, apiMembers.length, '个')
      return apiMembers
    } catch (error) {
      console.error('[部门Store] 从API获取部门成员失败:', error)
      return []
    }
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

      // 【生产环境修复】负责人名称应该从API响应中获取，不再从localStorage读取
      // API应该返回完整的部门信息，包括managerName

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

  // 【生产环境修复】不再从localStorage获取用户数据
  // managerName应该由API直接返回
  const enrichDepartmentsWithManagerNames = async (depts: Department[]) => {
    // 生产环境下，managerName应该由API直接返回，不需要额外处理
    if (import.meta.env.PROD) {
      return depts
    }

    // 开发环境下，如果需要从localStorage获取
    try {
      const usersStr = localStorage.getItem('crm_mock_users')
      if (!usersStr) return depts

      const users = JSON.parse(usersStr)

      return depts.map(dept => {
        if (dept.managerId) {
          const manager = users.find((u: unknown) => String(u.id) === String(dept.managerId))
          if (manager) {
            return {
              ...dept,
              managerName: manager.realName || manager.username
            }
          }
        }
        return dept
      })
    } catch (error) {
      console.error('[DepartmentStore] 开发环境：设置负责人名称失败:', error)
      return depts
    }
  }

  const fetchDepartments = async () => {
    loading.value = true
    try {
      console.log('[DepartmentStore] 开始获取部门数据...')

      // 【生产环境修复】生产环境直接调用API，不使用localStorage
      if (import.meta.env.PROD) {
        const { getDepartmentList } = await import('@/api/department')
        console.log('[DepartmentStore] 生产环境：调用API获取部门数据')
        const response = await getDepartmentList()
        console.log('[DepartmentStore] API响应:', response)

        if (response && response.data) {
          const depts = Array.isArray(response.data) ? response.data : []
          departments.value = depts
          console.log('[DepartmentStore] 生产环境：部门数据已更新:', departments.value.length, '个部门')
        } else {
          departments.value = []
          console.log('[DepartmentStore] 生产环境：API响应无数据')
        }
        return
      }

      // 开发环境：先尝试从localStorage读取
      const localDeptsStr = localStorage.getItem('crm_mock_departments')
      if (localDeptsStr) {
        let localDepts = JSON.parse(localDeptsStr)
        localDepts = await enrichDepartmentsWithManagerNames(localDepts)
        departments.value = localDepts
        console.log('[DepartmentStore] 开发环境：从localStorage加载部门数据:', departments.value.length, '个部门')
        loading.value = false
        return
      }

      // 开发环境：localStorage没有数据，调用API
      const { getDepartmentList } = await import('@/api/department')
      console.log('[DepartmentStore] 开发环境：调用API获取部门数据')
      const response = await getDepartmentList()
      console.log('[DepartmentStore] API响应:', response)

      if (response && response.data) {
        let depts = Array.isArray(response.data) ? response.data : []
        depts = await enrichDepartmentsWithManagerNames(depts)
        departments.value = depts
      } else {
        departments.value = []
      }

      console.log('[DepartmentStore] 开发环境：部门数据已更新:', departments.value.length, '个部门')
    } catch (error) {
      console.error('[DepartmentStore] 获取部门列表失败:', error)

      // 【生产环境修复】生产环境下API失败不降级到localStorage
      if (import.meta.env.PROD) {
        console.error('[DepartmentStore] 生产环境：API失败，无法获取部门数据')
        departments.value = []
        return
      }

      // 开发环境：API失败时，尝试从localStorage读取
      const localDeptsStr = localStorage.getItem('crm_mock_departments')
      if (localDeptsStr) {
        let localDepts = JSON.parse(localDeptsStr)
        localDepts = await enrichDepartmentsWithManagerNames(localDepts)
        departments.value = localDepts
        console.log('[DepartmentStore] 开发环境：API失败，从localStorage加载部门数据:', departments.value.length, '个部门')
      } else {
        departments.value = []
      }
    } finally {
      loading.value = false
    }
  }

  // 获取部门统计数据（调用真实API）
  const fetchDepartmentStats = async () => {
    try {
      const { getDepartmentStats } = await import('@/api/department')
      const response = await getDepartmentStats()
      console.log('[DepartmentStore] 统计API响应:', response)

      if (response && response.data) {
        apiStats.value = {
          totalDepartments: response.data.totalDepartments || 0,
          activeDepartments: response.data.activeDepartments || 0,
          totalMembers: response.data.totalMembers || 0,
          departmentsByType: response.data.departmentsByType || {}
        }
        console.log('[DepartmentStore] 统计数据已更新:', apiStats.value)
      } else {
        console.log('[DepartmentStore] 统计API无数据，使用计算属性')
      }
    } catch (error) {
      console.error('获取部门统计数据失败:', error)
      // 如果API失败，保持使用计算属性
      console.log('[DepartmentStore] 统计API失败，使用计算属性')
    }
  }

  // 获取所有部门的成员数据
  const fetchAllDepartmentMembers = async () => {
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
      console.error('获取所有部门成员失败:', error)
      members.value = []
    } finally {
      loading.value = false
    }
  }

  // 获取部门角色数据（按需加载单个部门的角色）
  const fetchDepartmentRoles = async (departmentId?: string) => {
    // 如果没有指定部门ID，不做任何操作（避免循环请求导致429）
    if (!departmentId) {
      console.log('[部门Store] fetchDepartmentRoles: 跳过批量加载，改为按需加载')
      return
    }

    loading.value = true
    try {
      const { getDepartmentRoles: getDepartmentRolesAPI } = await import('@/api/department')
      const response = await getDepartmentRolesAPI(departmentId)
      const deptRoles = response.data || []

      // 更新指定部门的角色数据
      roles.value = [
        ...roles.value.filter(r => r.departmentId !== departmentId),
        ...deptRoles
      ]
    } catch (error) {
      console.warn(`获取部门 ${departmentId} 角色失败:`, error)
    } finally {
      loading.value = false
    }
  }

  // 更新部门成员数量（从localStorage的users数据同步）
  const updateDepartmentMemberCount = async (departmentId: string) => {
    const dept = departments.value.find(d => d.id === departmentId)
    if (dept) {
      const members = getDepartmentMembers(departmentId)
      dept.memberCount = members.length
      dept.updatedAt = new Date().toISOString()
      console.log(`[部门Store] 更新部门${departmentId}成员数:`, dept.memberCount)
    }
  }

  // 同步所有部门的成员数量（从localStorage的crm_mock_users数据）
  const syncAllDepartmentMemberCounts = () => {
    // 【生产环境修复】生产环境不从localStorage同步
    if (import.meta.env.PROD) {
      console.log('[部门Store] 生产环境：跳过localStorage同步，使用API数据')
      return
    }

    try {
      console.log('[部门Store] 开发环境：开始同步所有部门成员数量...')
      const usersStr = localStorage.getItem('crm_mock_users')
      if (!usersStr) {
        console.log('[部门Store] 开发环境：未找到crm_mock_users数据')
        return
      }

      const users = JSON.parse(usersStr)
      console.log('[部门Store] 用户总数:', users.length)

      // 统计每个部门的活跃成员数
      const departmentMemberCounts: Record<string, number> = {}
      users.forEach((user: unknown) => {
        if (user.departmentId && user.status === 'active') {
          const deptId = String(user.departmentId)
          departmentMemberCounts[deptId] = (departmentMemberCounts[deptId] || 0) + 1
        }
      })

      console.log('[部门Store] 部门成员统计:', departmentMemberCounts)

      // 更新crm_mock_departments中的成员数
      const deptsStr = localStorage.getItem('crm_mock_departments')
      if (deptsStr) {
        const depts = JSON.parse(deptsStr)
        let updated = false

        depts.forEach((dept: unknown) => {
          const newCount = departmentMemberCounts[String(dept.id)] || 0
          if (dept.memberCount !== newCount) {
            console.log(`[部门Store] 更新部门${dept.name}(${dept.id})成员数: ${dept.memberCount} -> ${newCount}`)
            dept.memberCount = newCount
            dept.updatedAt = new Date().toISOString()
            updated = true
          }
        })

        if (updated) {
          localStorage.setItem('crm_mock_departments', JSON.stringify(depts))
          console.log('[部门Store] 已保存更新到localStorage')
        }
      }

      // 同时更新store中的departments
      departments.value.forEach(dept => {
        const newCount = departmentMemberCounts[String(dept.id)] || 0
        if (dept.memberCount !== newCount) {
          dept.memberCount = newCount
          dept.updatedAt = new Date().toISOString()
        }
      })

      console.log('[部门Store] 所有部门成员数量同步完成')
    } catch (error) {
      console.error('[部门Store] 同步部门成员数量失败:', error)
    }
  }

  // 初始化所有数据
  const initData = async () => {
    await fetchDepartments()
    // 不再批量获取所有部门的成员和角色，改为按需加载
    // await fetchDepartmentMembers()  // 按需加载
    // await fetchDepartmentRoles()    // 按需加载
    await fetchDepartmentStats()
    // 同步部门成员数量（生产环境跳过）
    syncAllDepartmentMemberCounts()
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
    fetchAllDepartmentMembers,
    fetchDepartmentRoles,
    fetchDepartmentStats,
    updateDepartmentMemberCount,
    syncAllDepartmentMemberCounts,
    initData,
    initMockData
  }
})
