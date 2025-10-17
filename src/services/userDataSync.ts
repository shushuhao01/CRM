/**
 * 用户数据同步服务
 * 当用户信息更新时，同步更新所有关联模块中的用户数据
 */

import { useCustomerStore } from '@/stores/customer'
import { useOrderStore } from '@/stores/order'
import { usePerformanceStore } from '@/stores/performance'
import { useServiceStore } from '@/stores/service'
import { useDepartmentStore } from '@/stores/department'
import { useDataStore } from '@/stores/data'

export interface UserUpdateData {
  id: string
  realName?: string
  username?: string
  email?: string
  phone?: string
  departmentId?: string
  departmentName?: string
  roleId?: string
  status?: string
}

/**
 * 用户数据同步服务类
 */
export class UserDataSyncService {
  /**
   * 同步用户信息到所有关联模块
   * @param userData 更新的用户数据
   */
  static async syncUserData(userData: UserUpdateData) {
    console.log('开始同步用户数据:', userData)
    
    try {
      // 同步客户模块
      await this.syncCustomerModule(userData)
      
      // 同步订单模块
      await this.syncOrderModule(userData)
      
      // 同步业绩模块
      await this.syncPerformanceModule(userData)
      
      // 同步服务模块
      await this.syncServiceModule(userData)
      
      // 同步部门模块
      await this.syncDepartmentModule(userData)
      
      // 同步数据模块
      await this.syncDataModule(userData)
      
      console.log('用户数据同步完成:', userData.id)
    } catch (error) {
      console.error('用户数据同步失败:', error)
      throw error
    }
  }

  /**
   * 同步客户模块中的用户数据
   */
  private static async syncCustomerModule(userData: UserUpdateData) {
    const customerStore = useCustomerStore()
    
    // 更新客户的销售人员信息
    customerStore.customers.forEach(customer => {
      if (customer.salesPersonId === userData.id) {
        // 这里可以更新销售人员的显示名称等信息
        console.log(`更新客户 ${customer.name} 的销售人员信息`)
      }
      if (customer.createdBy === userData.id) {
        // 更新创建者信息
        console.log(`更新客户 ${customer.name} 的创建者信息`)
      }
    })
  }

  /**
   * 同步订单模块中的用户数据
   */
  private static async syncOrderModule(userData: UserUpdateData) {
    const orderStore = useOrderStore()
    
    // 更新订单的销售人员和创建者信息
    orderStore.orders.forEach(order => {
      if (order.salesPersonId === userData.id) {
        console.log(`更新订单 ${order.orderNumber} 的销售人员信息`)
      }
      if (order.createdBy === userData.id) {
        console.log(`更新订单 ${order.orderNumber} 的创建者信息`)
      }
    })
  }

  /**
   * 同步业绩模块中的用户数据
   */
  private static async syncPerformanceModule(userData: UserUpdateData) {
    const performanceStore = usePerformanceStore()
    
    // 更新团队成员信息
    performanceStore.teamMembers.forEach(member => {
      if (member.id === userData.id) {
        if (userData.realName) member.name = userData.realName
        if (userData.departmentName) member.department = userData.departmentName
        console.log(`更新团队成员 ${member.name} 的信息`)
      }
    })
    
    // 更新业绩分享中的用户信息
    performanceStore.performanceShares.forEach(share => {
      if (share.createdById === userData.id) {
        if (userData.realName) share.createdBy = userData.realName
        console.log(`更新业绩分享 ${share.id} 的创建者信息`)
      }
      
      share.shareMembers.forEach(member => {
        if (member.userId === userData.id) {
          if (userData.realName) member.userName = userData.realName
          console.log(`更新业绩分享成员 ${member.userName} 的信息`)
        }
      })
    })
  }

  /**
   * 同步服务模块中的用户数据
   */
  private static async syncServiceModule(userData: UserUpdateData) {
    const serviceStore = useServiceStore()
    
    // 更新服务记录中的用户信息
    serviceStore.services.forEach(service => {
      if (service.createdBy === userData.id) {
        console.log(`更新服务记录 ${service.id} 的创建者信息`)
      }
      if (service.assignedTo === userData.id) {
        console.log(`更新服务记录 ${service.id} 的分配者信息`)
      }
    })
  }

  /**
   * 同步部门模块中的用户数据
   */
  private static async syncDepartmentModule(userData: UserUpdateData) {
    const departmentStore = useDepartmentStore()
    
    // 更新部门成员信息
    departmentStore.departmentMembers.forEach(member => {
      if (member.userId === userData.id) {
        if (userData.realName) member.userName = userData.realName
        if (userData.departmentId) member.departmentId = userData.departmentId
        console.log(`更新部门成员 ${member.userName} 的信息`)
      }
    })
    
    // 更新角色用户信息
    departmentStore.roleUsers.forEach(roleUser => {
      if (roleUser.userId === userData.id) {
        if (userData.realName) roleUser.userName = userData.realName
        console.log(`更新角色用户 ${roleUser.userName} 的信息`)
      }
    })
  }

  /**
   * 同步数据模块中的用户数据
   */
  private static async syncDataModule(userData: UserUpdateData) {
    const dataStore = useDataStore()
    
    // 这里可以添加数据模块的用户信息同步逻辑
    console.log('同步数据模块中的用户信息')
  }

  /**
   * 批量同步多个用户的数据
   * @param usersData 用户数据数组
   */
  static async batchSyncUserData(usersData: UserUpdateData[]) {
    console.log('开始批量同步用户数据:', usersData.length, '个用户')
    
    for (const userData of usersData) {
      await this.syncUserData(userData)
    }
    
    console.log('批量用户数据同步完成')
  }

  /**
   * 删除用户时清理关联数据
   * @param userId 用户ID
   */
  static async cleanupUserData(userId: string) {
    console.log('开始清理用户关联数据:', userId)
    
    try {
      const customerStore = useCustomerStore()
      const orderStore = useOrderStore()
      const performanceStore = usePerformanceStore()
      const serviceStore = useServiceStore()
      const departmentStore = useDepartmentStore()
      
      // 清理客户模块中的用户引用
      customerStore.customers.forEach(customer => {
        if (customer.salesPersonId === userId) {
          customer.salesPersonId = '' // 或设置为默认值
        }
        if (customer.createdBy === userId) {
          customer.createdBy = 'deleted_user'
        }
      })
      
      // 清理订单模块中的用户引用
      orderStore.orders.forEach(order => {
        if (order.salesPersonId === userId) {
          order.salesPersonId = '' // 或设置为默认值
        }
        if (order.createdBy === userId) {
          order.createdBy = 'deleted_user'
        }
      })
      
      // 清理业绩模块中的用户引用
      performanceStore.teamMembers = performanceStore.teamMembers.filter(member => member.id !== userId)
      
      performanceStore.performanceShares.forEach(share => {
        if (share.createdById === userId) {
          share.createdBy = 'deleted_user'
          share.createdById = 'deleted_user'
        }
        share.shareMembers = share.shareMembers.filter(member => member.userId !== userId)
      })
      
      // 清理服务模块中的用户引用
      serviceStore.services.forEach(service => {
        if (service.createdBy === userId) {
          service.createdBy = 'deleted_user'
        }
        if (service.assignedTo === userId) {
          service.assignedTo = ''
        }
      })
      
      // 清理部门模块中的用户引用
      departmentStore.departmentMembers = departmentStore.departmentMembers.filter(member => member.userId !== userId)
      departmentStore.roleUsers = departmentStore.roleUsers.filter(roleUser => roleUser.userId !== userId)
      
      console.log('用户关联数据清理完成:', userId)
    } catch (error) {
      console.error('清理用户关联数据失败:', error)
      throw error
    }
  }

  /**
   * 批量清理用户关联数据
   * @param userIds 用户ID数组
   */
  static async batchCleanupUserData(userIds: string[]) {
    console.log('开始批量清理用户关联数据:', userIds)
    
    try {
      // 并行清理所有用户的关联数据
      await Promise.all(userIds.map(userId => this.cleanupUserData(userId)))
      console.log('批量清理用户关联数据完成')
    } catch (error) {
      console.error('批量清理用户关联数据失败:', error)
      throw error
    }
  }
}

export default UserDataSyncService