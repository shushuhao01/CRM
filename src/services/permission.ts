/**
 * 权限管理服务
 * 负责用户权限验证和敏感信息访问控制
 */

// 用户角色枚举
export enum UserRole {
  SUPER_ADMIN = 'super_admin',      // 超级管理员 - 拥有全部权限，可查看所有数据
  DEPARTMENT_MANAGER = 'department_manager', // 管理员（部门负责人） - 只能查看所属部门/小组的数据
  SALES_STAFF = 'sales_staff',      // 销售员 - 只能查看自己创建的数据
  CUSTOMER_SERVICE = 'customer_service', // 客服 - 由超级管理员分配指定权限范围
  WHITELIST_MEMBER = 'whitelist',   // 白名单成员（兼容旧版本）
  REGULAR_USER = 'regular'          // 普通用户（兼容旧版本）
}

// 权限级别枚举
export enum PermissionLevel {
  FULL_ACCESS = 'full',       // 完全访问（超级管理员）
  PARTIAL_ACCESS = 'partial', // 部分访问（白名单成员）
  RESTRICTED = 'restricted'   // 受限访问（普通用户）
}

// 敏感信息类型
export enum SensitiveInfoType {
  PHONE = 'phone',           // 手机号
  ID_CARD = 'id_card',       // 身份证号
  EMAIL = 'email',           // 邮箱
  WECHAT = 'wechat',         // 微信号
  ADDRESS = 'address',       // 地址
  BANK_ACCOUNT = 'bank',     // 银行账户
  FINANCIAL = 'financial'    // 财务信息
}

// 通话权限类型
export enum CallPermissionType {
  MAKE_CALL = 'make_call',           // 发起通话
  VIEW_RECORDS = 'view_records',     // 查看通话记录
  PLAY_RECORDING = 'play_recording', // 播放录音
  DOWNLOAD_RECORDING = 'download_recording', // 下载录音
  EDIT_RECORDS = 'edit_records',     // 编辑通话记录
  DELETE_RECORDS = 'delete_records', // 删除通话记录
  MANAGE_CONFIG = 'manage_config',   // 管理通话配置
  VIEW_STATISTICS = 'view_statistics' // 查看通话统计
}

// 数据范围控制枚举
export enum DataScope {
  ALL = 'all',                       // 全部数据（超级管理员）
  DEPARTMENT = 'department',         // 部门数据（部门负责人）
  SELF = 'self',                     // 个人数据（销售员）
  CUSTOM = 'custom'                  // 自定义范围（客服等特殊角色）
}

// 客服权限类型枚举
export enum CustomerServiceType {
  AFTER_SALES = 'after_sales',       // 售后客服 - 查看和处理所有售后订单
  AUDIT = 'audit',                   // 审核客服 - 查看和处理所有审核订单
  LOGISTICS = 'logistics',           // 物流客服 - 查看和处理所有物流订单
  PRODUCT = 'product',               // 商品客服 - 查看和处理所有商品列表
  GENERAL = 'general'                // 通用客服 - 由超级管理员自定义权限
}

// 用户权限信息接口
export interface UserPermission {
  userId: string
  role: UserRole
  permissions: PermissionLevel[]
  dataScope: DataScope // 数据范围控制
  departmentId?: string // 所属部门ID（部门负责人需要）
  departmentIds?: string[] // 可管理的部门ID列表（部门负责人可能管理多个部门）
  customerServiceType?: CustomerServiceType // 客服类型（客服角色需要）
  customPermissions?: string[] // 自定义权限列表（客服等特殊角色）
  whitelistTypes?: SensitiveInfoType[] // 白名单成员可访问的敏感信息类型
  callPermissions?: CallPermissionType[] // 通话相关权限
  expiresAt?: Date // 权限过期时间
}

// 权限检查结果
export interface PermissionCheckResult {
  hasAccess: boolean
  level: PermissionLevel
  reason?: string
}

export class PermissionService {
  private static instance: PermissionService
  private userPermissions: Map<string, UserPermission> = new Map()
  
  // 单例模式
  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService()
    }
    return PermissionService.instance
  }

  constructor() {
    this.initializeDefaultPermissions()
  }

  /**
   * 初始化默认权限配置
   */
  private initializeDefaultPermissions(): void {
    // 1. 超级管理员 - 拥有全部权限，可查看所有数据
    this.userPermissions.set('admin', {
      userId: 'admin',
      role: UserRole.SUPER_ADMIN,
      permissions: [PermissionLevel.FULL_ACCESS],
      dataScope: DataScope.ALL,
      whitelistTypes: Object.values(SensitiveInfoType),
      callPermissions: Object.values(CallPermissionType)
    })

    // 2. 管理员（部门负责人） - 只能查看所属部门/小组的数据
    this.userPermissions.set('manager', {
      userId: 'manager',
      role: UserRole.DEPARTMENT_MANAGER,
      permissions: [PermissionLevel.PARTIAL_ACCESS],
      dataScope: DataScope.DEPARTMENT,
      departmentId: 'dept_001', // 所属部门ID
      departmentIds: ['dept_001', 'dept_002'], // 可管理的部门列表
      whitelistTypes: [SensitiveInfoType.PHONE, SensitiveInfoType.EMAIL, SensitiveInfoType.WECHAT],
      callPermissions: [
        CallPermissionType.MAKE_CALL,
        CallPermissionType.VIEW_RECORDS,
        CallPermissionType.PLAY_RECORDING,
        CallPermissionType.DOWNLOAD_RECORDING,
        CallPermissionType.EDIT_RECORDS,
        CallPermissionType.VIEW_STATISTICS
      ]
    })

    // 3. 销售员 - 只能查看自己创建的数据
    this.userPermissions.set('sales001', {
      userId: 'sales001',
      role: UserRole.SALES_STAFF,
      permissions: [PermissionLevel.RESTRICTED],
      dataScope: DataScope.SELF,
      departmentId: 'dept_001',
      callPermissions: [
        CallPermissionType.MAKE_CALL,
        CallPermissionType.VIEW_RECORDS,
        CallPermissionType.PLAY_RECORDING
      ]
    })

    // 4. 售后客服 - 可查看和处理所有售后订单
    this.userPermissions.set('service_aftersales', {
      userId: 'service_aftersales',
      role: UserRole.CUSTOMER_SERVICE,
      permissions: [PermissionLevel.PARTIAL_ACCESS],
      dataScope: DataScope.CUSTOM,
      customerServiceType: CustomerServiceType.AFTER_SALES,
      customPermissions: ['service:view', 'service:process', 'service:edit'],
      callPermissions: [
        CallPermissionType.MAKE_CALL,
        CallPermissionType.VIEW_RECORDS,
        CallPermissionType.PLAY_RECORDING,
        CallPermissionType.EDIT_RECORDS
      ]
    })

    // 5. 审核客服 - 可查看和处理所有审核订单
    this.userPermissions.set('service_audit', {
      userId: 'service_audit',
      role: UserRole.CUSTOMER_SERVICE,
      permissions: [PermissionLevel.PARTIAL_ACCESS],
      dataScope: DataScope.CUSTOM,
      customerServiceType: CustomerServiceType.AUDIT,
      customPermissions: ['order:audit:view', 'order:audit:approve', 'order:audit:reject'],
      callPermissions: [
        CallPermissionType.MAKE_CALL,
        CallPermissionType.VIEW_RECORDS,
        CallPermissionType.PLAY_RECORDING
      ]
    })

    // 6. 物流客服 - 可查看和处理所有物流订单
    this.userPermissions.set('service_logistics', {
      userId: 'service_logistics',
      role: UserRole.CUSTOMER_SERVICE,
      permissions: [PermissionLevel.PARTIAL_ACCESS],
      dataScope: DataScope.CUSTOM,
      customerServiceType: CustomerServiceType.LOGISTICS,
      customPermissions: ['logistics:view', 'logistics:shipping:manage', 'logistics:tracking:update'],
      callPermissions: [
        CallPermissionType.MAKE_CALL,
        CallPermissionType.VIEW_RECORDS,
        CallPermissionType.PLAY_RECORDING
      ]
    })

    // 7. 商品客服 - 可查看和处理所有商品列表
    this.userPermissions.set('service_product', {
      userId: 'service_product',
      role: UserRole.CUSTOMER_SERVICE,
      permissions: [PermissionLevel.PARTIAL_ACCESS],
      dataScope: DataScope.CUSTOM,
      customerServiceType: CustomerServiceType.PRODUCT,
      customPermissions: ['product:view', 'product:edit', 'product:inventory:manage'],
      callPermissions: [
        CallPermissionType.MAKE_CALL,
        CallPermissionType.VIEW_RECORDS,
        CallPermissionType.PLAY_RECORDING
      ]
    })

    // 8. 通用客服 - 由超级管理员自定义权限
    this.userPermissions.set('service_general', {
      userId: 'service_general',
      role: UserRole.CUSTOMER_SERVICE,
      permissions: [PermissionLevel.PARTIAL_ACCESS],
      dataScope: DataScope.CUSTOM,
      customerServiceType: CustomerServiceType.GENERAL,
      customPermissions: [], // 由超级管理员配置
      callPermissions: [
        CallPermissionType.MAKE_CALL,
        CallPermissionType.VIEW_RECORDS,
        CallPermissionType.PLAY_RECORDING
      ]
    })
  }

  /**
   * 获取用户权限信息
   */
  public getUserPermission(userId: string): UserPermission | null {
    return this.userPermissions.get(userId) || null
  }

  /**
   * 检查用户是否有访问特定敏感信息的权限
   */
  public checkSensitiveInfoAccess(
    userId: string, 
    infoType: SensitiveInfoType
  ): PermissionCheckResult {
    const userPermission = this.getUserPermission(userId)
    
    if (!userPermission) {
      return {
        hasAccess: false,
        level: PermissionLevel.RESTRICTED,
        reason: '用户权限信息不存在'
      }
    }

    // 检查权限是否过期
    if (userPermission.expiresAt && userPermission.expiresAt < new Date()) {
      return {
        hasAccess: false,
        level: PermissionLevel.RESTRICTED,
        reason: '用户权限已过期'
      }
    }

    // 超级管理员拥有所有权限
    if (userPermission.role === UserRole.SUPER_ADMIN) {
      return {
        hasAccess: true,
        level: PermissionLevel.FULL_ACCESS
      }
    }

    // 白名单成员检查特定类型权限
    if (userPermission.role === UserRole.WHITELIST_MEMBER) {
      const hasTypeAccess = userPermission.whitelistTypes?.includes(infoType) || false
      return {
        hasAccess: hasTypeAccess,
        level: hasTypeAccess ? PermissionLevel.PARTIAL_ACCESS : PermissionLevel.RESTRICTED,
        reason: hasTypeAccess ? undefined : '该类型敏感信息不在白名单权限范围内'
      }
    }

    // 普通用户无权访问敏感信息
    return {
      hasAccess: false,
      level: PermissionLevel.RESTRICTED,
      reason: '普通用户无权访问敏感信息'
    }
  }

  /**
   * 检查用户是否为超级管理员
   */
  public isSuperAdmin(userId: string): boolean {
    const permission = this.getUserPermission(userId)
    return permission?.role === UserRole.SUPER_ADMIN
  }

  /**
   * 检查用户是否为白名单成员
   */
  public isWhitelistMember(userId: string): boolean {
    const permission = this.getUserPermission(userId)
    return permission?.role === UserRole.WHITELIST_MEMBER
  }

  /**
   * 检查用户通话权限
   */
  public checkCallPermission(
    userId: string, 
    permissionType: CallPermissionType
  ): PermissionCheckResult {
    const userPermission = this.getUserPermission(userId)
    
    if (!userPermission) {
      return {
        hasAccess: false,
        level: PermissionLevel.RESTRICTED,
        reason: '用户权限信息不存在'
      }
    }

    // 超级管理员拥有所有通话权限
    if (userPermission.role === UserRole.SUPER_ADMIN) {
      return {
        hasAccess: true,
        level: PermissionLevel.FULL_ACCESS
      }
    }

    // 检查用户是否有特定的通话权限
    const hasPermission = userPermission.callPermissions?.includes(permissionType) || false
    
    return {
      hasAccess: hasPermission,
      level: hasPermission ? PermissionLevel.PARTIAL_ACCESS : PermissionLevel.RESTRICTED,
      reason: hasPermission ? undefined : `缺少${permissionType}权限`
    }
  }

  /**
   * 批量检查通话权限
   */
  public batchCheckCallPermissions(
    userId: string, 
    permissionTypes: CallPermissionType[]
  ): Map<CallPermissionType, PermissionCheckResult> {
    const results = new Map<CallPermissionType, PermissionCheckResult>()
    
    for (const permissionType of permissionTypes) {
      results.set(permissionType, this.checkCallPermission(userId, permissionType))
    }
    
    return results
  }

  /**
   * 添加或更新用户权限
   */
  public setUserPermission(permission: UserPermission): void {
    this.userPermissions.set(permission.userId, permission)
  }

  /**
   * 移除用户权限
   */
  public removeUserPermission(userId: string): boolean {
    return this.userPermissions.delete(userId)
  }

  /**
   * 获取所有用户权限列表（仅超级管理员可用）
   */
  public getAllUserPermissions(requestUserId: string): UserPermission[] | null {
    if (!this.isSuperAdmin(requestUserId)) {
      return null
    }
    return Array.from(this.userPermissions.values())
  }

  /**
   * 批量设置客服权限
   */
  public batchSetCustomerServicePermissions(
    userIds: string[],
    serviceType: CustomerServiceType,
    dataScope: DataScope,
    customPermissions: string[] = [],
    departmentIds: string[] = []
  ): void {
    userIds.forEach(userId => {
      const permission: UserPermission = {
        userId,
        role: UserRole.CUSTOMER_SERVICE,
        permissions: [PermissionLevel.PARTIAL_ACCESS],
        dataScope,
        departmentId: departmentIds[0] || '',
        departmentIds,
        customerServiceType: serviceType,
        customPermissions,
        callPermissions: [
          CallPermissionType.MAKE_CALL,
          CallPermissionType.VIEW_RECORDS,
          CallPermissionType.PLAY_RECORDING
        ]
      }
      this.setUserPermission(permission)
    })
  }

  /**
   * 获取指定类型的客服列表
   */
  public getCustomerServicesByType(serviceType?: CustomerServiceType): Array<{
    userId: string
    permission: UserPermission
  }> {
    const result: Array<{ userId: string; permission: UserPermission }> = []
    
    this.userPermissions.forEach((permission, userId) => {
      if (permission.role === UserRole.CUSTOMER_SERVICE) {
        if (!serviceType || permission.customerServiceType === serviceType) {
          result.push({ userId, permission })
        }
      }
    })
    
    return result
  }

  /**
   * 检查客服是否有特定权限
   */
  public checkCustomerServicePermission(userId: string, permission: string): boolean {
    const userPermission = this.getUserPermission(userId)
    if (!userPermission || userPermission.role !== UserRole.CUSTOMER_SERVICE) {
      return false
    }

    // 检查自定义权限
    if (userPermission.customPermissions?.includes(permission)) {
      return true
    }

    // 根据客服类型检查默认权限
    switch (userPermission.customerServiceType) {
      case CustomerServiceType.AFTER_SALES:
        return this.checkAfterSalesPermission(permission)
      case CustomerServiceType.AUDIT:
        return this.checkAuditPermission(permission)
      case CustomerServiceType.LOGISTICS:
        return this.checkLogisticsPermission(permission)
      case CustomerServiceType.PRODUCT:
        return this.checkProductPermission(permission)
      case CustomerServiceType.GENERAL:
        return userPermission.customPermissions?.includes(permission) || false
      default:
        return false
    }
  }

  /**
   * 检查售后客服权限
   */
  private checkAfterSalesPermission(permission: string): boolean {
    const afterSalesPermissions = [
      'service:afterSales:view',
      'service:afterSales:edit',
      'order:list:view',
      'customer:list:view'
    ]
    return afterSalesPermissions.includes(permission)
  }

  /**
   * 检查审核客服权限
   */
  private checkAuditPermission(permission: string): boolean {
    const auditPermissions = [
      'order:audit:view',
      'order:audit:approve',
      'order:list:view',
      'customer:list:view'
    ]
    return auditPermissions.includes(permission)
  }

  /**
   * 检查物流客服权限
   */
  private checkLogisticsPermission(permission: string): boolean {
    const logisticsPermissions = [
      'logistics:shipping:view',
      'logistics:shipping:edit',
      'logistics:shipping:batchExport',
      'order:list:view'
    ]
    return logisticsPermissions.includes(permission)
  }

  /**
   * 检查商品客服权限
   */
  private checkProductPermission(permission: string): boolean {
    const productPermissions = [
      'product:list:view',
      'product:list:edit',
      'product:add:create',
      'product:inventory:manage',
      'order:list:view',
      'customer:list:view'
    ]
    return productPermissions.includes(permission)
  }

  /**
   * 更新客服权限配置
   */
  public updateCustomerServicePermission(
    userId: string,
    serviceType: CustomerServiceType,
    dataScope: DataScope,
    customPermissions: string[] = [],
    departmentIds: string[] = []
  ): boolean {
    const currentPermission = this.getUserPermission(userId)
    if (!currentPermission || currentPermission.role !== UserRole.CUSTOMER_SERVICE) {
      return false
    }

    const updatedPermission: UserPermission = {
      ...currentPermission,
      customerServiceType: serviceType,
      dataScope,
      customPermissions,
      departmentIds,
      departmentId: departmentIds[0] || currentPermission.departmentId
    }

    this.setUserPermission(updatedPermission)
    return true
  }

  /**
   * 获取客服可访问的数据范围
   */
  public getCustomerServiceDataScope(userId: string): {
    canAccessAll: boolean
    canAccessDepartments: string[]
    canAccessSelf: boolean
    customPermissions: string[]
  } {
    const permission = this.getUserPermission(userId)
    if (!permission || permission.role !== UserRole.CUSTOMER_SERVICE) {
      return {
        canAccessAll: false,
        canAccessDepartments: [],
        canAccessSelf: false,
        customPermissions: []
      }
    }

    return {
      canAccessAll: permission.dataScope === DataScope.ALL,
      canAccessDepartments: permission.departmentIds || [],
      canAccessSelf: permission.dataScope === DataScope.SELF,
      customPermissions: permission.customPermissions || []
    }
  }

  // ==================== 超级管理员专用方法 ====================

  /**
   * 批量设置用户权限（仅超级管理员可用）
   */
  public batchSetUserPermissions(
    operatorId: string,
    userPermissions: Array<{
      userId: string
      role: UserRole
      dataScope: DataScope
      departmentId?: string
      departmentIds?: string[]
      customerServiceType?: CustomerServiceType
      customPermissions?: string[]
    }>
  ): boolean {
    if (!this.isSuperAdmin(operatorId)) {
      console.warn('Only super admin can batch set user permissions')
      return false
    }

    try {
      userPermissions.forEach(({ userId, ...permissionData }) => {
        const newPermission: UserPermission = {
          userId,
          role: permissionData.role,
          permissions: [this.getPermissionLevelByRole(permissionData.role)],
          dataScope: permissionData.dataScope,
          departmentId: permissionData.departmentId,
          departmentIds: permissionData.departmentIds,
          customerServiceType: permissionData.customerServiceType,
          customPermissions: permissionData.customPermissions || []
        }
        this.setUserPermission(newPermission)
      })

      // 记录审计日志
      this.logPermissionAudit(operatorId, 'batch_assign', '', `批量设置${userPermissions.length}个用户权限`)
      return true
    } catch (error) {
      console.error('Batch set user permissions error:', error)
      return false
    }
  }

  /**
   * 创建角色权限模板（仅超级管理员可用）
   */
  public createRoleTemplate(
    operatorId: string,
    template: {
      name: string
      role: UserRole
      dataScope: DataScope
      permissions: string[]
      description?: string
    }
  ): boolean {
    if (!this.isSuperAdmin(operatorId)) {
      console.warn('Only super admin can create role templates')
      return false
    }

    try {
      const templateId = `template_${Date.now()}`
      const roleTemplates = this.getRoleTemplates()
      
      roleTemplates[templateId] = {
        id: templateId,
        name: template.name,
        role: template.role,
        dataScope: template.dataScope,
        permissions: template.permissions,
        description: template.description || '',
        createdBy: operatorId,
        createdAt: new Date().toISOString()
      }

      localStorage.setItem('crm_role_templates', JSON.stringify(roleTemplates))
      this.logPermissionAudit(operatorId, 'create_template', '', `创建角色模板: ${template.name}`)
      return true
    } catch (error) {
      console.error('Create role template error:', error)
      return false
    }
  }

  /**
   * 应用角色权限模板（仅超级管理员可用）
   */
  public applyRoleTemplate(
    operatorId: string,
    templateId: string,
    userIds: string[]
  ): boolean {
    if (!this.isSuperAdmin(operatorId)) {
      console.warn('Only super admin can apply role templates')
      return false
    }

    try {
      const templates = this.getRoleTemplates()
      const template = templates[templateId]
      
      if (!template) {
        console.warn('Role template not found:', templateId)
        return false
      }

      userIds.forEach(userId => {
        const newPermission: UserPermission = {
          userId,
          role: template.role,
          permissions: [this.getPermissionLevelByRole(template.role)],
          dataScope: template.dataScope,
          customPermissions: template.permissions
        }
        this.setUserPermission(newPermission)
      })

      this.logPermissionAudit(operatorId, 'apply_template', '', `应用模板 ${template.name} 到 ${userIds.length} 个用户`)
      return true
    } catch (error) {
      console.error('Apply role template error:', error)
      return false
    }
  }

  /**
   * 获取权限审计日志（仅超级管理员可用）
   */
  public getPermissionAuditLogs(
    operatorId: string,
    filters?: {
      startDate?: string
      endDate?: string
      action?: string
      targetUser?: string
      operator?: string
    }
  ): any[] {
    if (!this.isSuperAdmin(operatorId)) {
      console.warn('Only super admin can get audit logs')
      return []
    }

    try {
      const logs = JSON.parse(localStorage.getItem('crm_permission_audit_logs') || '[]')
      
      if (!filters) {
        return logs
      }

      return logs.filter((log: any) => {
        if (filters.startDate && log.timestamp < filters.startDate) return false
        if (filters.endDate && log.timestamp > filters.endDate) return false
        if (filters.action && log.action !== filters.action) return false
        if (filters.targetUser && !log.targetUser.includes(filters.targetUser)) return false
        if (filters.operator && !log.operator.includes(filters.operator)) return false
        return true
      })
    } catch (error) {
      console.error('Get audit logs error:', error)
      return []
    }
  }

  /**
   * 导出权限配置（仅超级管理员可用）
   */
  public exportPermissionConfig(operatorId: string): any {
    if (!this.isSuperAdmin(operatorId)) {
      console.warn('Only super admin can export permission config')
      return null
    }

    try {
      const config = {
        users: this.getAllUserPermissions(operatorId),
        templates: this.getRoleTemplates(),
        auditLogs: this.getPermissionAuditLogs(operatorId),
        exportedAt: new Date().toISOString(),
        exportedBy: operatorId
      }

      this.logPermissionAudit(operatorId, 'export_config', '', '导出权限配置')
      return config
    } catch (error) {
      console.error('Export permission config error:', error)
      return null
    }
  }

  /**
   * 导入权限配置（仅超级管理员可用）
   */
  public importPermissionConfig(
    operatorId: string,
    config: any,
    options?: {
      overwriteExisting?: boolean
      importUsers?: boolean
      importTemplates?: boolean
    }
  ): boolean {
    if (!this.isSuperAdmin(operatorId)) {
      console.warn('Only super admin can import permission config')
      return false
    }

    try {
      const { overwriteExisting = false, importUsers = true, importTemplates = true } = options || {}

      if (importUsers && config.users) {
        config.users.forEach((userPermission: UserPermission) => {
          if (overwriteExisting || !this.getUserPermission(userPermission.userId)) {
            this.setUserPermission(userPermission)
          }
        })
      }

      if (importTemplates && config.templates) {
        const existingTemplates = this.getRoleTemplates()
        const mergedTemplates = overwriteExisting 
          ? { ...existingTemplates, ...config.templates }
          : { ...config.templates, ...existingTemplates }
        
        localStorage.setItem('crm_role_templates', JSON.stringify(mergedTemplates))
      }

      this.logPermissionAudit(operatorId, 'import_config', '', '导入权限配置')
      return true
    } catch (error) {
      console.error('Import permission config error:', error)
      return false
    }
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 根据角色获取权限级别
   */
  private getPermissionLevelByRole(role: UserRole): PermissionLevel {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return PermissionLevel.FULL_ACCESS
      case UserRole.DEPARTMENT_MANAGER:
        return PermissionLevel.PARTIAL_ACCESS
      case UserRole.SALES_STAFF:
        return PermissionLevel.PARTIAL_ACCESS
      case UserRole.CUSTOMER_SERVICE:
        return PermissionLevel.PARTIAL_ACCESS
      case UserRole.WHITELIST_MEMBER:
        return PermissionLevel.PARTIAL_ACCESS
      case UserRole.REGULAR_USER:
        return PermissionLevel.RESTRICTED
      default:
        return PermissionLevel.RESTRICTED
    }
  }

  /**
   * 获取角色权限模板
   */
  private getRoleTemplates(): any {
    try {
      return JSON.parse(localStorage.getItem('crm_role_templates') || '{}')
    } catch (error) {
      console.error('Get role templates error:', error)
      return {}
    }
  }

  /**
   * 记录权限审计日志
   */
  private logPermissionAudit(
    operatorId: string,
    action: string,
    targetUserId: string,
    description: string
  ): void {
    try {
      const logs = JSON.parse(localStorage.getItem('crm_permission_audit_logs') || '[]')
      
      logs.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        operator: operatorId,
        action,
        targetUser: targetUserId,
        description,
        ipAddress: '127.0.0.1' // 在实际应用中应该获取真实IP
      })

      // 只保留最近1000条日志
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000)
      }

      localStorage.setItem('crm_permission_audit_logs', JSON.stringify(logs))
    } catch (error) {
      console.error('Log permission audit error:', error)
    }
  }

  /**
   * 批量检查多种敏感信息类型的访问权限
   */
  public batchCheckAccess(
    userId: string, 
    infoTypes: SensitiveInfoType[]
  ): Map<SensitiveInfoType, PermissionCheckResult> {
    const results = new Map<SensitiveInfoType, PermissionCheckResult>()
    
    for (const infoType of infoTypes) {
      results.set(infoType, this.checkSensitiveInfoAccess(userId, infoType))
    }
    
    return results
  }

  /**
   * 检查用户是否可以访问特定数据
   * @param userId 用户ID
   * @param dataOwnerId 数据所有者ID（创建者ID）
   * @param dataDepartmentId 数据所属部门ID
   * @returns 是否有访问权限
   */
  public checkDataAccess(
    userId: string, 
    dataOwnerId?: string, 
    dataDepartmentId?: string
  ): PermissionCheckResult {
    const userPermission = this.getUserPermission(userId)
    
    if (!userPermission) {
      return {
        hasAccess: false,
        level: PermissionLevel.RESTRICTED,
        reason: '用户权限信息不存在'
      }
    }

    // 超级管理员可以访问所有数据
    if (userPermission.dataScope === DataScope.ALL) {
      return {
        hasAccess: true,
        level: PermissionLevel.FULL_ACCESS
      }
    }

    // 用户可以访问自己创建的数据
    if (dataOwnerId === userId) {
      return {
        hasAccess: true,
        level: PermissionLevel.PARTIAL_ACCESS,
        reason: '访问个人数据'
      }
    }

    // 部门负责人特殊权限：可以查看所管理部门的所有成员数据
    if (dataOwnerId) {
      const managedDepartments = this.getUserManagedDepartments(userId)
      if (managedDepartments.length > 0) {
        // 获取数据所有者的部门信息
        const dataOwnerDepartment = this.getUserDepartment(dataOwnerId)
        if (dataOwnerDepartment) {
          // 检查数据所有者是否在负责人管理的部门或子部门中
          for (const managedDeptId of managedDepartments) {
            const accessibleDepartments = this.getSubDepartmentIds(managedDeptId)
            if (accessibleDepartments.includes(dataOwnerDepartment)) {
              return {
                hasAccess: true,
                level: PermissionLevel.PARTIAL_ACCESS,
                reason: '部门负责人权限：可查看部门成员数据'
              }
            }
          }
        }
      }
    }

    // 部门负责人只能访问所属部门的数据
    if (userPermission.dataScope === DataScope.DEPARTMENT) {
      if (!dataDepartmentId) {
        return {
          hasAccess: false,
          level: PermissionLevel.RESTRICTED,
          reason: '数据缺少部门信息'
        }
      }
      
      const canAccess = userPermission.departmentId === dataDepartmentId ||
                       userPermission.departmentIds?.includes(dataDepartmentId) || false
      
      return {
        hasAccess: canAccess,
        level: canAccess ? PermissionLevel.PARTIAL_ACCESS : PermissionLevel.RESTRICTED,
        reason: canAccess ? undefined : '无权访问其他部门的数据'
      }
    }

    // 销售员只能访问自己创建的数据
    if (userPermission.dataScope === DataScope.SELF) {
      if (!dataOwnerId) {
        return {
          hasAccess: false,
          level: PermissionLevel.RESTRICTED,
          reason: '数据缺少创建者信息'
        }
      }
      
      const canAccess = userId === dataOwnerId
      
      return {
        hasAccess: canAccess,
        level: canAccess ? PermissionLevel.PARTIAL_ACCESS : PermissionLevel.RESTRICTED,
        reason: canAccess ? undefined : '只能访问自己创建的数据'
      }
    }

    // 客服等自定义权限范围
    if (userPermission.dataScope === DataScope.CUSTOM) {
      // 根据客服类型判断权限
      if (userPermission.customerServiceType) {
        return this.checkCustomerServiceAccess(userPermission.customerServiceType)
      }
      
      return {
        hasAccess: false,
        level: PermissionLevel.RESTRICTED,
        reason: '自定义权限范围未配置'
      }
    }

    return {
      hasAccess: false,
      level: PermissionLevel.RESTRICTED,
      reason: '未知的数据范围类型'
    }
  }

  /**
   * 获取用户所属部门ID
   */
  private getUserDepartment(userId: string): string | null {
    const permission = this.getUserPermission(userId)
    return permission?.departmentId || null
  }

  /**
   * 检查客服权限
   */
  private checkCustomerServiceAccess(serviceType: CustomerServiceType): PermissionCheckResult {
    switch (serviceType) {
      case CustomerServiceType.AFTER_SALES:
        return {
          hasAccess: true,
          level: PermissionLevel.PARTIAL_ACCESS,
          reason: '售后客服权限：可查看和处理所有售后订单'
        }
      case CustomerServiceType.AUDIT:
        return {
          hasAccess: true,
          level: PermissionLevel.PARTIAL_ACCESS,
          reason: '审核客服权限：可查看和处理所有审核订单'
        }
      case CustomerServiceType.LOGISTICS:
        return {
          hasAccess: true,
          level: PermissionLevel.PARTIAL_ACCESS,
          reason: '物流客服权限：可查看和处理所有物流订单'
        }
      case CustomerServiceType.PRODUCT:
        return {
          hasAccess: true,
          level: PermissionLevel.PARTIAL_ACCESS,
          reason: '商品客服权限：可查看和处理所有商品列表'
        }
      case CustomerServiceType.GENERAL:
        return {
          hasAccess: true,
          level: PermissionLevel.PARTIAL_ACCESS,
          reason: '通用客服权限：由超级管理员配置'
        }
      default:
        return {
          hasAccess: false,
          level: PermissionLevel.RESTRICTED,
          reason: '未知的客服类型'
        }
    }
  }

  /**
   * 检查用户是否为部门负责人
   */
  public isDepartmentManager(userId: string): boolean {
    const permission = this.getUserPermission(userId)
    return permission?.role === UserRole.DEPARTMENT_MANAGER
  }

  /**
   * 检查用户是否为指定部门的负责人
   */
  public isDepartmentManagerOf(userId: string, departmentId?: string): boolean {
    // 从部门存储中获取部门信息
    const departmentStore = this.getDepartmentStore()
    if (!departmentStore) return false

    // 如果指定了部门ID，检查该部门的负责人
    if (departmentId) {
      const department = departmentStore.getDepartmentById(departmentId)
      return department?.managerId === userId
    }

    // 如果没有指定部门ID，检查用户是否为任何部门的负责人
    const departments = departmentStore.departments
    return departments.some(dept => dept.managerId === userId)
  }

  /**
   * 检查用户是否可以访问指定部门的数据
   */
  public canAccessDepartmentData(userId: string, targetDepartmentId: string): boolean {
    const permission = this.getUserPermission(userId)
    if (!permission) return false

    // 超级管理员可以访问所有部门数据
    if (permission.role === UserRole.SUPER_ADMIN) {
      return true
    }

    // 检查是否为目标部门的负责人
    if (this.isDepartmentManagerOf(userId, targetDepartmentId)) {
      return true
    }

    // 检查是否为目标部门的上级部门负责人
    const managedDepartments = this.getUserManagedDepartments(userId)
    for (const managedDeptId of managedDepartments) {
      const subDepartments = this.getSubDepartmentIds(managedDeptId)
      if (subDepartments.includes(targetDepartmentId)) {
        return true
      }
    }

    // 部门负责人可以访问本部门及子部门数据
    if (permission.role === UserRole.DEPARTMENT_MANAGER && permission.departmentId) {
      const accessibleDepartments = this.getSubDepartmentIds(permission.departmentId)
      return accessibleDepartments.includes(targetDepartmentId)
    }

    // 普通用户只能访问自己所在部门的数据
    return permission.departmentId === targetDepartmentId
  }

  /**
   * 获取用户管理的部门列表
   */
  public getUserManagedDepartments(userId: string): string[] {
    const departmentStore = this.getDepartmentStore()
    if (!departmentStore) return []

    const departments = departmentStore.departments
    return departments
      .filter(dept => dept.managerId === userId)
      .map(dept => dept.id)
  }

  /**
   * 获取部门存储实例（用于访问部门数据）
   */
  private getDepartmentStore(): any {
    try {
      // 动态导入部门存储，避免循环依赖
      const { useDepartmentStore } = require('@/stores/department')
      return useDepartmentStore()
    } catch (error) {
      console.warn('[Permission] 无法获取部门存储:', error)
      return null
    }
  }

  /**
   * 获取子部门ID列表
   */
  private getSubDepartmentIds(departmentId: string): string[] {
    const departmentStore = this.getDepartmentStore()
    if (!departmentStore) return [departmentId]

    const allDepartments = departmentStore.departments
    const subDepartments: string[] = [departmentId]
    
    // 递归查找子部门
    const findSubDepartments = (parentId: string) => {
      const children = allDepartments.filter(dept => dept.parentId === parentId)
      children.forEach(child => {
        subDepartments.push(child.id)
        findSubDepartments(child.id)
      })
    }
    
    findSubDepartments(departmentId)
    return subDepartments
  }

  /**
   * 获取用户可访问的数据范围
   */
  public getUserDataScope(userId: string): {
    scope: DataScope
    departmentIds: string[]
    description: string
  } {
    const permission = this.getUserPermission(userId)
    if (!permission) {
      return {
        scope: DataScope.SELF,
        departmentIds: [],
        description: '仅限个人数据'
      }
    }

    // 超级管理员可以访问所有数据
    if (permission.role === UserRole.SUPER_ADMIN) {
      return {
        scope: DataScope.ALL,
        departmentIds: [],
        description: '全部数据'
      }
    }

    // 检查是否为部门负责人
    const managedDepartments = this.getUserManagedDepartments(userId)
    if (managedDepartments.length > 0) {
      // 部门负责人可以访问所管理部门及其子部门的数据
      const allDepartmentIds = managedDepartments.reduce((acc, deptId) => {
        acc.push(deptId)
        acc.push(...this.getSubDepartmentIds(deptId))
        return acc
      }, [] as string[])
      
      return {
        scope: DataScope.DEPARTMENT,
        departmentIds: [...new Set(allDepartmentIds)], // 去重
        description: `管理部门及子部门数据 (${allDepartmentIds.length}个部门)`
      }
    }

    // 部门负责人角色但没有管理部门，或其他角色
    if (permission.role === UserRole.DEPARTMENT_MANAGER && permission.departmentId) {
      const departmentIds = this.getSubDepartmentIds(permission.departmentId)
      return {
        scope: DataScope.DEPARTMENT,
        departmentIds,
        description: `本部门及子部门数据 (${departmentIds.length}个部门)`
      }
    }

    // 普通用户只能访问个人数据
    return {
      scope: DataScope.SELF,
      departmentIds: permission.departmentId ? [permission.departmentId] : [],
      description: '仅限个人数据'
    }
  }

  /**
   * 检查用户是否为销售员
   */
  public isSalesStaff(userId: string): boolean {
    const permission = this.getUserPermission(userId)
    return permission?.role === UserRole.SALES_STAFF
  }

  /**
   * 检查用户是否为客服
   */
  public isCustomerService(userId: string): boolean {
    const permission = this.getUserPermission(userId)
    return permission?.role === UserRole.CUSTOMER_SERVICE
  }

  /**
   * 获取用户可访问的部门列表
   */
  public getAccessibleDepartments(userId: string): string[] {
    const permission = this.getUserPermission(userId)
    
    if (!permission) return []
    
    // 超级管理员可以访问所有部门
    if (permission.dataScope === DataScope.ALL) {
      return ['*'] // 表示所有部门
    }
    
    // 部门负责人可以访问管理的部门
    if (permission.dataScope === DataScope.DEPARTMENT) {
      const departments: string[] = []
      if (permission.departmentId) {
        departments.push(permission.departmentId)
      }
      if (permission.departmentIds) {
        departments.push(...permission.departmentIds)
      }
      return departments
    }
    
    return []
  }

  /**
   * 记录权限访问日志（用于审计）
   */
  public logAccess(
    userId: string, 
    infoType: SensitiveInfoType, 
    action: string, 
    result: boolean
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      infoType,
      action,
      result,
      userAgent: navigator.userAgent
    }
    
    // 在实际应用中，这里应该发送到后端进行持久化存储
    console.log('权限访问日志:', logEntry)
  }
}

// 导出单例实例
export const permissionService = PermissionService.getInstance()