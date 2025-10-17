/**
 * 部门权限服务 - 处理部门权限继承和优先级关系
 * 
 * 权限优先级规则：
 * 1. 个人权限 > 部门权限 > 角色权限
 * 2. 部门负责人拥有部门所有权限 + 查看部门全部成员数据的特殊权限
 * 3. 部门权限可以继承给部门成员，但成员可以被额外赋予其他权限
 * 4. 子部门可以继承父部门的权限（可选）
 */

import permissionService from './permissionService'

// 部门权限配置接口
export interface DepartmentPermissionConfig {
  departmentId: string
  permissions: string[]  // 部门基础权限列表
  inheritFromParent: boolean  // 是否继承父部门权限
  managerExtraPermissions: string[]  // 部门负责人额外权限
  dataScope: 'department' | 'self' | 'all'  // 数据范围：部门、个人、全部
  createdAt: Date
  updatedAt: Date
}

// 用户权限计算结果
export interface UserPermissionResult {
  userId: string
  departmentId: string
  roleId: string
  finalPermissions: string[]  // 最终权限列表
  permissionSources: {
    role: string[]  // 来自角色的权限
    department: string[]  // 来自部门的权限
    personal: string[]  // 个人额外权限
    manager: string[]  // 部门负责人权限
  }
  dataScope: 'department' | 'self' | 'all'
  isDepartmentManager: boolean
}

interface Department {
  id: string
  name: string
  parentId?: string
  children?: Department[]
}

interface UserInfo {
  departmentId: string
  roleId: string
  isManager: boolean
}

class DepartmentPermissionService {
  private departmentPermissions: Map<string, DepartmentPermissionConfig>
  private userDepartmentCache: Map<string, any>

  constructor() {
    this.departmentPermissions = new Map()  // 存储部门权限配置
    this.userDepartmentCache = new Map()  // 缓存用户部门关系
  }

  /**
   * 设置部门权限配置
   */
  async setDepartmentPermissions(departmentId: string, config: Partial<DepartmentPermissionConfig>): Promise<DepartmentPermissionConfig> {
    const permissionConfig: DepartmentPermissionConfig = {
      departmentId,
      permissions: config.permissions || [],
      inheritFromParent: config.inheritFromParent || false,
      managerExtraPermissions: config.managerExtraPermissions || [
        'data.department.view_all',  // 查看部门全部数据
        'performance.department.view_all',  // 查看部门全部绩效
        'customer.department.view_all'  // 查看部门全部客户
      ],
      dataScope: config.dataScope || 'department',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.departmentPermissions.set(departmentId, permissionConfig)
    
    // 这里应该调用后端API保存配置
    // await this.saveDepartmentPermissionsToServer(permissionConfig)
    
    return permissionConfig
  }

  /**
   * 获取部门权限配置
   */
  getDepartmentPermissions(departmentId: string): DepartmentPermissionConfig {
    return this.departmentPermissions.get(departmentId) || {
      departmentId,
      permissions: [],
      inheritFromParent: false,
      managerExtraPermissions: [],
      dataScope: 'self',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * 计算部门的完整权限（包括继承的权限）
   */
  async calculateDepartmentFullPermissions(departmentId: string, departmentTree: Department[]): Promise<string[]> {
    const config = this.getDepartmentPermissions(departmentId)
    let fullPermissions = [...config.permissions]

    // 如果启用了父部门权限继承
    if (config.inheritFromParent) {
      const department = this.findDepartmentInTree(departmentTree, departmentId)
      if (department && department.parentId) {
        const parentPermissions = await this.calculateDepartmentFullPermissions(
          department.parentId, 
          departmentTree
        )
        // 合并权限，去重
        fullPermissions = [...new Set([...fullPermissions, ...parentPermissions])]
      }
    }

    return fullPermissions
  }

  /**
   * 计算用户的最终权限
   */
  async calculateUserFinalPermissions(userId: string, userInfo: UserInfo, departmentTree: Department[]): Promise<UserPermissionResult> {
    const { departmentId, roleId, isManager } = userInfo
    
    // 1. 获取角色权限
    const rolePermissions = await permissionService.getRolePermissions(roleId) || []
    
    // 2. 获取部门权限
    const departmentPermissions = await this.calculateDepartmentFullPermissions(departmentId, departmentTree)
    
    // 3. 获取个人额外权限
    const personalPermissions = await permissionService.getUserPersonalPermissions(userId) || []
    
    // 4. 获取部门负责人权限
    let managerPermissions: string[] = []
    if (isManager) {
      const deptConfig = this.getDepartmentPermissions(departmentId)
      managerPermissions = deptConfig.managerExtraPermissions
    }

    // 5. 合并所有权限，优先级：个人 > 部门负责人 > 部门 > 角色
    const finalPermissions = [
      ...new Set([
        ...rolePermissions,
        ...departmentPermissions,
        ...managerPermissions,
        ...personalPermissions
      ])
    ]

    // 6. 确定数据范围
    let dataScope: 'department' | 'self' | 'all' = 'self'  // 默认只能查看自己的数据
    
    if (isManager) {
      const deptConfig = this.getDepartmentPermissions(departmentId)
      dataScope = deptConfig.dataScope === 'all' ? 'all' : 'department'
    } else {
      // 普通成员根据部门配置确定数据范围
      const deptConfig = this.getDepartmentPermissions(departmentId)
      if (deptConfig.dataScope === 'department' && departmentPermissions.length > 0) {
        dataScope = 'department'
      }
    }

    return {
      userId,
      departmentId,
      roleId,
      finalPermissions,
      permissionSources: {
        role: rolePermissions,
        department: departmentPermissions,
        personal: personalPermissions,
        manager: managerPermissions
      },
      dataScope,
      isDepartmentManager: isManager
    }
  }

  /**
   * 在部门树中查找指定部门
   */
  private findDepartmentInTree(departmentTree: Department[], departmentId: string): Department | null {
    for (const dept of departmentTree) {
      if (dept.id === departmentId) {
        return dept
      }
      if (dept.children) {
        const found = this.findDepartmentInTree(dept.children, departmentId)
        if (found) return found
      }
    }
    return null
  }

  /**
   * 检查用户是否有指定权限
   */
  async hasPermission(userId: string, permissionCode: string, userInfo: UserInfo, departmentTree: Department[]): Promise<boolean> {
    const userPermissions = await this.calculateUserFinalPermissions(userId, userInfo, departmentTree)
    return userPermissions.finalPermissions.includes(permissionCode)
  }

  /**
   * 检查用户是否可以访问指定数据
   */
  async canAccessData(userId: string, dataOwnerId: string, dataDepartmentId: string, userInfo: UserInfo): Promise<boolean> {
    const { departmentId, isManager } = userInfo
    
    // 1. 如果是数据所有者，可以访问
    if (userId === dataOwnerId) {
      return true
    }

    // 2. 如果是部门负责人，可以访问部门内数据
    if (isManager && departmentId === dataDepartmentId) {
      return true
    }

    // 3. 根据部门权限配置检查
    const deptConfig = this.getDepartmentPermissions(departmentId)
    
    if (deptConfig.dataScope === 'all') {
      return true  // 可以访问所有数据
    }
    
    if (deptConfig.dataScope === 'department' && departmentId === dataDepartmentId) {
      return true  // 可以访问同部门数据
    }

    return false  // 只能访问自己的数据
  }

  /**
   * 获取用户可访问的数据范围过滤条件
   */
  async getDataScopeFilter(userId: string, userInfo: UserInfo): Promise<{ type: 'all' | 'department' | 'self', value?: string }> {
    const { departmentId, isManager } = userInfo
    
    // 部门负责人根据部门配置确定数据范围
    if (isManager) {
      const deptConfig = this.getDepartmentPermissions(departmentId)
      if (deptConfig.dataScope === 'all') {
        return { type: 'all' }
      }
      return { type: 'department', value: departmentId }
    }

    // 普通成员根据部门权限确定
    const deptConfig = this.getDepartmentPermissions(departmentId)
    if (deptConfig.dataScope === 'department') {
      return { type: 'department', value: departmentId }
    }

    return { type: 'self', value: userId }
  }

  /**
   * 批量设置部门权限
   */
  async batchSetDepartmentPermissions(configs: Array<{ departmentId: string, config: Partial<DepartmentPermissionConfig> }>): Promise<DepartmentPermissionConfig[]> {
    const results: DepartmentPermissionConfig[] = []
    
    for (const { departmentId, config } of configs) {
      const result = await this.setDepartmentPermissions(departmentId, config)
      results.push(result)
    }
    
    return results
  }

  /**
   * 获取部门权限继承链
   */
  async getDepartmentPermissionChain(departmentId: string, departmentTree: Department[]): Promise<Array<{ departmentId: string, permissions: string[], inherited: boolean }>> {
    const chain: Array<{ departmentId: string, permissions: string[], inherited: boolean }> = []
    
    const department = this.findDepartmentInTree(departmentTree, departmentId)
    if (!department) return chain

    // 当前部门权限
    const currentConfig = this.getDepartmentPermissions(departmentId)
    chain.push({
      departmentId,
      permissions: currentConfig.permissions,
      inherited: false
    })

    // 如果启用继承，递归获取父部门权限
    if (currentConfig.inheritFromParent && department.parentId) {
      const parentChain = await this.getDepartmentPermissionChain(department.parentId, departmentTree)
      chain.push(...parentChain.map(item => ({ ...item, inherited: true })))
    }

    return chain
  }

  /**
   * 清除部门权限缓存
   */
  clearCache(): void {
    this.userDepartmentCache.clear()
  }

  /**
   * 导出部门权限配置
   */
  exportDepartmentPermissions(): Array<DepartmentPermissionConfig> {
    return Array.from(this.departmentPermissions.values())
  }

  /**
   * 导入部门权限配置
   */
  async importDepartmentPermissions(configs: DepartmentPermissionConfig[]): Promise<void> {
    for (const config of configs) {
      this.departmentPermissions.set(config.departmentId, config)
    }
  }
}

export default new DepartmentPermissionService()