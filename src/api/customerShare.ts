// 客户分享API服务
// 注意: 此服务设计为可无缝切换到后端API
// 当后端API就绪时,只需修改方法实现,接口保持不变

// 客户分享接口定义
// 此接口与后端API数据结构保持一致,便于后续切换
export interface CustomerShareInfo {
  id: string
  customerId: string
  customerName: string
  sharedBy: string
  sharedByName: string
  sharedTo: string
  sharedToName: string
  shareTime: string
  timeLimit: number // 天数,0表示永久
  expireTime: string | null
  remark: string
  status: 'active' | 'expired' | 'recalled' // 分享状态
  recallTime?: string
  recallReason?: string
  originalOwner: string // 原负责人ID
}

export interface ShareRequest {
  customerId: string
  sharedTo: string
  timeLimit: number
  remark: string
}

export interface RecallRequest {
  shareId: string
  recallReason: string
}

// 客户分享API服务类
// 设计说明:
// 1. 当前使用localStorage模拟后端存储
// 2. 所有方法返回Promise,与真实API调用保持一致
// 3. 数据结构完全符合RESTful API规范
// 4. 切换到真实API时,只需修改方法内部实现,不影响调用方
class CustomerShareApiService {
  // localStorage键名 - 生产环境切换到API后可删除
  private shareHistoryKey = 'crm_customer_share_history'
  private customersKey = 'crm_store_customer' // 使用与customerStore相同的键名
  private usersKey = 'crm_mock_users'

  // API基础URL - 生产环境时启用
  // private baseURL = '/api/customer-share'

  // 获取分享历史
  async getShareHistory(): Promise<CustomerShareInfo[]> {
    try {
      const data = localStorage.getItem(this.shareHistoryKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('[CustomerShare] 获取分享历史失败:', error)
      return []
    }
  }

  // 分享客户
  async shareCustomer(request: ShareRequest): Promise<{ success: boolean; message: string; data?: CustomerShareInfo }> {
    try {
      // 获取当前用户 - 兼容多种存储方式
      let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')

      // 如果currentUser不存在,尝试从其他可能的键获取
      if (!currentUser) {
        const possibleKeys = ['user', 'loginUser', 'authUser']
        for (const key of possibleKeys) {
          const userData = localStorage.getItem(key)
          if (userData) {
            try {
              currentUser = JSON.parse(userData)
              if (currentUser && currentUser.id) break
            } catch (_e) {
              continue
            }
          }
        }
      }

      // 如果还是没有用户,使用默认管理员
      if (!currentUser || !currentUser.id) {
        console.warn('[CustomerShare] 未找到当前用户,使用默认管理员')
        currentUser = {
          id: 'admin',
          name: '管理员',
          role: 'admin'
        }
      }

      console.log('[CustomerShare] 当前用户:', currentUser)

      // 获取客户数据 - 适配crm_store_customer的数据结构
      const customerStore = JSON.parse(localStorage.getItem(this.customersKey) || '{"customers":[]}')
      const customers = customerStore.customers || []
      const customerIndex = customers.findIndex((c: { id: string }) => c.id === request.customerId)
      if (customerIndex === -1) {
        return { success: false, message: '客户不存在' }
      }

      const customer = customers[customerIndex]

      // 获取目标用户
      const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]')
      const targetUser = users.find((u: { id: string; name: string }) => u.id === request.sharedTo)
      if (!targetUser) {
        return { success: false, message: '目标用户不存在' }
      }

      // 检查是否已经分享给该用户
      const shareHistory = await this.getShareHistory()
      const existingShare = shareHistory.find(s =>
        s.customerId === request.customerId &&
        s.sharedTo === request.sharedTo &&
        s.status === 'active'
      )
      if (existingShare) {
        return { success: false, message: '该客户已分享给此用户' }
      }

      // 计算到期时间
      const expireTime = request.timeLimit === 0
        ? null
        : new Date(Date.now() + request.timeLimit * 24 * 60 * 60 * 1000).toISOString()

      // 创建分享记录
      const shareInfo: CustomerShareInfo = {
        id: `share_${Date.now()}`,
        customerId: request.customerId,
        customerName: customer.name,
        sharedBy: currentUser.id,
        sharedByName: currentUser.name,
        sharedTo: request.sharedTo,
        sharedToName: targetUser.name,
        shareTime: new Date().toISOString(),
        timeLimit: request.timeLimit,
        expireTime,
        remark: request.remark,
        status: 'active',
        originalOwner: customer.salesPersonId // 保存原负责人
      }

      // 保存分享记录
      shareHistory.push(shareInfo)
      localStorage.setItem(this.shareHistoryKey, JSON.stringify(shareHistory))

      // 更新客户的分享信息
      customer.shareInfo = {
        ...shareInfo,
        isShared: true
      }

      // 更新客户负责人为分享接收人
      customer.salesPersonId = request.sharedTo

      // 保存客户数据 - 适配crm_store_customer的数据结构
      customers[customerIndex] = customer
      customerStore.customers = customers
      localStorage.setItem(this.customersKey, JSON.stringify(customerStore))

      console.log('[CustomerShare] 客户分享成功:', shareInfo)
      return { success: true, message: '客户分享成功', data: shareInfo }
    } catch (error) {
      console.error('[CustomerShare] 分享客户失败:', error)
      return { success: false, message: '分享失败' }
    }
  }

  // 回收客户
  async recallCustomer(request: RecallRequest): Promise<{ success: boolean; message: string }> {
    try {
      // 获取当前用户 - 兼容多种存储方式
      let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')

      if (!currentUser) {
        const possibleKeys = ['user', 'loginUser', 'authUser']
        for (const key of possibleKeys) {
          const userData = localStorage.getItem(key)
          if (userData) {
            try {
              currentUser = JSON.parse(userData)
              if (currentUser && currentUser.id) break
            } catch (_e) {
              continue
            }
          }
        }
      }

      if (!currentUser || !currentUser.id) {
        currentUser = {
          id: 'admin',
          name: '管理员',
          role: 'admin'
        }
      }

      // 获取分享历史
      const shareHistory = await this.getShareHistory()
      const shareRecord = shareHistory.find(s => s.id === request.shareId)
      if (!shareRecord) {
        return { success: false, message: '分享记录不存在' }
      }

      // 检查权限(只有分享人或管理员可以回收)
      const canRecall = shareRecord.sharedBy === currentUser.id ||
                       ['super_admin', 'admin', 'department_manager'].includes(currentUser.role)
      if (!canRecall) {
        return { success: false, message: '没有权限回收此客户' }
      }

      // 更新分享记录状态
      shareRecord.status = 'recalled'
      shareRecord.recallTime = new Date().toISOString()
      shareRecord.recallReason = request.recallReason

      // 获取客户数据 - 适配crm_store_customer的数据结构
      const customerStore = JSON.parse(localStorage.getItem(this.customersKey) || '{"customers":[]}')
      const customers = customerStore.customers || []
      const customerIndex = customers.findIndex((c: { id: string }) => c.id === shareRecord.customerId)
      if (customerIndex !== -1) {
        const customer = customers[customerIndex]
        // 恢复原负责人
        customer.salesPersonId = shareRecord.originalOwner
        // 清除分享信息
        delete customer.shareInfo
        customers[customerIndex] = customer
      }

      // 保存数据 - 适配crm_store_customer的数据结构
      localStorage.setItem(this.shareHistoryKey, JSON.stringify(shareHistory))
      customerStore.customers = customers
      localStorage.setItem(this.customersKey, JSON.stringify(customerStore))

      console.log('[CustomerShare] 客户回收成功:', shareRecord)
      return { success: true, message: '客户回收成功' }
    } catch (error) {
      console.error('[CustomerShare] 回收客户失败:', error)
      return { success: false, message: '回收失败' }
    }
  }

  // 自动回收过期分享
  async autoRecallExpiredShares(): Promise<number> {
    try {
      const shareHistory = await this.getShareHistory()
      const now = new Date()
      let expiredCount = 0

      for (const share of shareHistory) {
        if (share.status === 'active' && share.expireTime) {
          const expireTime = new Date(share.expireTime)
          if (now >= expireTime) {
            // 自动回收
            await this.recallCustomer({
              shareId: share.id,
              recallReason: '分享时间到期，自动回收'
            })
            expiredCount++
          }
        }
      }

      if (expiredCount > 0) {
        console.log(`[CustomerShare] 自动回收了 ${expiredCount} 个过期分享`)
      }

      return expiredCount
    } catch (error) {
      console.error('[CustomerShare] 自动回收失败:', error)
      return 0
    }
  }

  // 获取我分享的客户
  async getMySharedCustomers(): Promise<CustomerShareInfo[]> {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
      if (!currentUser) return []

      const shareHistory = await this.getShareHistory()
      return shareHistory.filter(s => s.sharedBy === currentUser.id && s.status === 'active')
    } catch (error) {
      console.error('[CustomerShare] 获取我分享的客户失败:', error)
      return []
    }
  }

  // 获取分享给我的客户
  async getSharedToMeCustomers(): Promise<CustomerShareInfo[]> {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
      if (!currentUser) return []

      const shareHistory = await this.getShareHistory()
      return shareHistory.filter(s => s.sharedTo === currentUser.id && s.status === 'active')
    } catch (error) {
      console.error('[CustomerShare] 获取分享给我的客户失败:', error)
      return []
    }
  }

  // 获取可分享的用户列表
  async getShareableUsers(): Promise<Array<{ id: string; name: string; role: string }>> {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
      if (!currentUser) return []

      const users = JSON.parse(localStorage.getItem(this.usersKey) || '[]')
      // 排除当前用户,只返回销售人员和管理人员
      return users.filter((u: { id: string; role: string }) =>
        u.id !== currentUser.id &&
        ['sales_staff', 'department_manager', 'admin'].includes(u.role)
      )
    } catch (error) {
      console.error('[CustomerShare] 获取可分享用户失败:', error)
      return []
    }
  }
}

// 导出API服务实例
export const customerShareApi = new CustomerShareApiService()

// 导出默认实例
export default customerShareApi
