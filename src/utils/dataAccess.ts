import { useUserStore } from '@/stores/user'
import { DataScope, CustomerServiceType } from '@/services/permission'

/**
 * 数据访问控制工具类
 * 用于在组件中检查用户对特定数据的访问权限
 */
export class DataAccessControl {
  private userStore = useUserStore()

  /**
   * 检查用户是否可以访问指定数据
   * @param dataOwnerId 数据创建者ID
   * @param dataDepartmentId 数据所属部门ID
   * @returns 是否有访问权限
   */
  canAccessData(dataOwnerId?: string, dataDepartmentId?: string): boolean {
    return this.userStore.canAccessData(dataOwnerId, dataDepartmentId)
  }

  /**
   * 检查用户是否可以访问客户数据
   * @param customerId 客户ID
   * @param customerOwnerId 客户创建者ID
   * @param customerDepartmentId 客户所属部门ID
   * @returns 是否有访问权限
   */
  canAccessCustomer(customerId: string, customerOwnerId?: string, customerDepartmentId?: string): boolean {
    // 超级管理员可以访问所有客户
    if (this.userStore.isSuperAdmin) {
      return true
    }

    // 部门负责人可以访问部门内的客户
    if (this.userStore.isDepartmentManager) {
      const accessibleDepts = this.userStore.accessibleDepartments
      return customerDepartmentId ? accessibleDepts.includes(customerDepartmentId) : false
    }

    // 销售员只能访问自己创建的客户
    if (this.userStore.isSalesStaff) {
      return customerOwnerId === this.userStore.currentUser?.id
    }

    // 客服根据配置的权限访问客户
    if (this.userStore.isCustomerService) {
      return this.canAccessData(customerOwnerId, customerDepartmentId)
    }

    return false
  }

  /**
   * 检查用户是否可以访问订单数据
   * @param orderId 订单ID
   * @param orderOwnerId 订单创建者ID
   * @param orderDepartmentId 订单所属部门ID
   * @param orderType 订单类型（用于客服权限判断）
   * @returns 是否有访问权限
   */
  canAccessOrder(orderId: string, orderOwnerId?: string, orderDepartmentId?: string, orderType?: string): boolean {
    // 超级管理员可以访问所有订单
    if (this.userStore.isSuperAdmin) {
      return true
    }

    // 部门负责人可以访问部门内的订单
    if (this.userStore.isDepartmentManager) {
      const accessibleDepts = this.userStore.accessibleDepartments
      return orderDepartmentId ? accessibleDepts.includes(orderDepartmentId) : false
    }

    // 销售员只能访问自己创建的订单
    if (this.userStore.isSalesStaff) {
      return orderOwnerId === this.userStore.currentUser?.id
    }

    // 客服根据类型和配置的权限访问订单
    if (this.userStore.isCustomerService) {
      const user = this.userStore.currentUser
      if (!user?.customerServiceType) return false

      // 根据客服类型判断是否可以访问特定类型的订单
      switch (user.customerServiceType) {
        case CustomerServiceType.AFTER_SALES:
          return orderType === 'after_sales' || orderType === 'refund' || orderType === 'return'
        case CustomerServiceType.AUDIT:
          return orderType === 'pending_audit' || orderType === 'audit'
        case CustomerServiceType.LOGISTICS:
          return orderType === 'shipping' || orderType === 'logistics'
        case CustomerServiceType.PRODUCT:
          return true // 商品客服可以查看所有订单
        case CustomerServiceType.GENERAL:
          return this.canAccessData(orderOwnerId, orderDepartmentId)
        default:
          return false
      }
    }

    return false
  }

  /**
   * 检查用户是否可以访问业绩数据
   * @param performanceOwnerId 业绩数据所有者ID
   * @param performanceDepartmentId 业绩数据所属部门ID
   * @returns 是否有访问权限
   */
  canAccessPerformance(performanceOwnerId?: string, performanceDepartmentId?: string): boolean {
    // 超级管理员可以访问所有业绩数据
    if (this.userStore.isSuperAdmin) {
      return true
    }

    // 部门负责人可以访问部门内的业绩数据
    if (this.userStore.isDepartmentManager) {
      const accessibleDepts = this.userStore.accessibleDepartments
      return performanceDepartmentId ? accessibleDepts.includes(performanceDepartmentId) : false
    }

    // 销售员只能访问自己的业绩数据
    if (this.userStore.isSalesStaff) {
      return performanceOwnerId === this.userStore.currentUser?.id
    }

    // 客服一般不能访问业绩数据，除非有特殊配置
    if (this.userStore.isCustomerService) {
      return false
    }

    return false
  }

  /**
   * 获取用户可访问的数据过滤条件
   * @returns 数据过滤条件
   */
  getDataFilter(): {
    scope: DataScope
    ownerId?: string
    departmentIds?: string[]
  } {
    const user = this.userStore.currentUser
    if (!user) {
      return { scope: DataScope.SELF }
    }

    if (this.userStore.isSuperAdmin) {
      return { scope: DataScope.ALL }
    }

    if (this.userStore.isDepartmentManager) {
      return {
        scope: DataScope.DEPARTMENT,
        departmentIds: this.userStore.accessibleDepartments
      }
    }

    if (this.userStore.isSalesStaff) {
      return {
        scope: DataScope.SELF,
        ownerId: user.id
      }
    }

    if (this.userStore.isCustomerService) {
      return {
        scope: DataScope.CUSTOM,
        // 客服的过滤条件由具体的权限配置决定
      }
    }

    return { scope: DataScope.SELF, ownerId: user.id }
  }

  /**
   * 检查用户是否可以编辑指定数据
   * @param dataOwnerId 数据创建者ID
   * @param dataDepartmentId 数据所属部门ID
   * @returns 是否有编辑权限
   */
  canEditData(dataOwnerId?: string, dataDepartmentId?: string): boolean {
    // 超级管理员可以编辑所有数据
    if (this.userStore.isSuperAdmin) {
      return true
    }

    // 部门负责人可以编辑部门内的数据
    if (this.userStore.isDepartmentManager) {
      const accessibleDepts = this.userStore.accessibleDepartments
      return dataDepartmentId ? accessibleDepts.includes(dataDepartmentId) : false
    }

    // 销售员只能编辑自己创建的数据
    if (this.userStore.isSalesStaff) {
      return dataOwnerId === this.userStore.currentUser?.id
    }

    // 客服根据配置的权限编辑数据
    if (this.userStore.isCustomerService) {
      return this.canAccessData(dataOwnerId, dataDepartmentId)
    }

    return false
  }

  /**
   * 检查用户是否可以删除指定数据
   * @param dataOwnerId 数据创建者ID
   * @param dataDepartmentId 数据所属部门ID
   * @returns 是否有删除权限
   */
  canDeleteData(dataOwnerId?: string, dataDepartmentId?: string): boolean {
    // 超级管理员可以删除所有数据
    if (this.userStore.isSuperAdmin) {
      return true
    }

    // 部门负责人可以删除部门内的数据
    if (this.userStore.isDepartmentManager) {
      const accessibleDepts = this.userStore.accessibleDepartments
      return dataDepartmentId ? accessibleDepts.includes(dataDepartmentId) : false
    }

    // 销售员只能删除自己创建的数据
    if (this.userStore.isSalesStaff) {
      return dataOwnerId === this.userStore.currentUser?.id
    }

    // 客服一般不能删除数据
    if (this.userStore.isCustomerService) {
      return false
    }

    return false
  }
}

// 创建单例实例
export const dataAccessControl = new DataAccessControl()

// 导出便捷方法
export const {
  canAccessData,
  canAccessCustomer,
  canAccessOrder,
  canAccessPerformance,
  getDataFilter,
  canEditData,
  canDeleteData
} = dataAccessControl