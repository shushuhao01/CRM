// 客户分享API服务
import { api } from './request'
import { isProduction } from '@/utils/env'

// 客户分享接口定义
export interface CustomerShareInfo {
  id: string
  customerId: string
  customerName: string
  sharedBy: string
  sharedByName: string
  sharedTo: string
  sharedToName: string
  shareTime: string
  timeLimit: number
  expireTime: string | null
  remark: string
  status: 'active' | 'expired' | 'recalled'
  recallTime?: string
  recallReason?: string
  originalOwner: string
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

// localStorage键名 - 开发环境使用
const SHARE_HISTORY_KEY = 'crm_customer_share_history'
const CUSTOMERS_KEY = 'crm_store_customer'
const USERS_KEY = 'crm_mock_users'

// 获取当前用户
const getCurrentUser = () => {
  let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
  if (!currentUser) {
    const possibleKeys = ['user', 'loginUser', 'authUser']
    for (const key of possibleKeys) {
      const userData = localStorage.getItem(key)
      if (userData) {
        try {
          currentUser = JSON.parse(userData)
          if (currentUser && currentUser.id) break
        } catch { continue }
      }
    }
  }
  return currentUser || { id: 'admin', name: '管理员', role: 'admin' }
}


// 客户分享API服务
export const customerShareApi = {
  // 获取分享历史
  async getShareHistory(): Promise<CustomerShareInfo[]> {
    if (isProduction()) {
      try {
        const response = await api.get<{ list: CustomerShareInfo[] }>('/customer-share/history')
        return response.data?.list || []
      } catch (error) {
        console.error('[CustomerShare] API获取分享历史失败:', error)
        return []
      }
    }
    // 开发环境使用localStorage
    try {
      const data = localStorage.getItem(SHARE_HISTORY_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('[CustomerShare] 获取分享历史失败:', error)
      return []
    }
  },

  // 分享客户
  async shareCustomer(request: ShareRequest): Promise<{ success: boolean; message: string; data?: CustomerShareInfo }> {
    if (isProduction()) {
      try {
        const response = await api.post<CustomerShareInfo>('/customer-share/share', request)
        return { success: true, message: '客户分享成功', data: response.data }
      } catch (error: any) {
        return { success: false, message: error?.message || '分享失败' }
      }
    }
    // 开发环境使用localStorage
    try {
      const currentUser = getCurrentUser()
      const customerStore = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '{"customers":[]}')
      const customers = customerStore.customers || []
      const customerIndex = customers.findIndex((c: { id: string }) => c.id === request.customerId)
      if (customerIndex === -1) return { success: false, message: '客户不存在' }

      const customer = customers[customerIndex]
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
      const targetUser = users.find((u: { id: string }) => u.id === request.sharedTo)
      if (!targetUser) return { success: false, message: '目标用户不存在' }

      const shareHistory = await this.getShareHistory()
      const existingShare = shareHistory.find(s =>
        s.customerId === request.customerId && s.sharedTo === request.sharedTo && s.status === 'active'
      )
      if (existingShare) return { success: false, message: '该客户已分享给此用户' }

      const expireTime = request.timeLimit === 0 ? null
        : new Date(Date.now() + request.timeLimit * 24 * 60 * 60 * 1000).toISOString()

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
        originalOwner: customer.salesPersonId
      }

      shareHistory.push(shareInfo)
      localStorage.setItem(SHARE_HISTORY_KEY, JSON.stringify(shareHistory))

      customer.shareInfo = { ...shareInfo, isShared: true }
      customer.salesPersonId = request.sharedTo
      customers[customerIndex] = customer
      customerStore.customers = customers
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customerStore))

      return { success: true, message: '客户分享成功', data: shareInfo }
    } catch (error) {
      console.error('[CustomerShare] 分享客户失败:', error)
      return { success: false, message: '分享失败' }
    }
  },

  // 回收客户
  async recallCustomer(request: RecallRequest): Promise<{ success: boolean; message: string }> {
    if (isProduction()) {
      try {
        await api.post('/customer-share/recall', request)
        return { success: true, message: '客户回收成功' }
      } catch (error: any) {
        return { success: false, message: error?.message || '回收失败' }
      }
    }
    // 开发环境使用localStorage
    try {
      const currentUser = getCurrentUser()
      const shareHistory = await this.getShareHistory()
      const shareRecord = shareHistory.find(s => s.id === request.shareId)
      if (!shareRecord) return { success: false, message: '分享记录不存在' }

      const canRecall = shareRecord.sharedBy === currentUser.id ||
        ['super_admin', 'admin', 'department_manager'].includes(currentUser.role)
      if (!canRecall) return { success: false, message: '没有权限回收此客户' }

      shareRecord.status = 'recalled'
      shareRecord.recallTime = new Date().toISOString()
      shareRecord.recallReason = request.recallReason

      const customerStore = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '{"customers":[]}')
      const customers = customerStore.customers || []
      const customerIndex = customers.findIndex((c: { id: string }) => c.id === shareRecord.customerId)
      if (customerIndex !== -1) {
        const customer = customers[customerIndex]
        customer.salesPersonId = shareRecord.originalOwner
        delete customer.shareInfo
        customers[customerIndex] = customer
      }

      localStorage.setItem(SHARE_HISTORY_KEY, JSON.stringify(shareHistory))
      customerStore.customers = customers
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customerStore))

      return { success: true, message: '客户回收成功' }
    } catch (error) {
      console.error('[CustomerShare] 回收客户失败:', error)
      return { success: false, message: '回收失败' }
    }
  },

  // 获取我分享的客户
  async getMySharedCustomers(): Promise<CustomerShareInfo[]> {
    if (isProduction()) {
      try {
        const response = await api.get<CustomerShareInfo[]>('/customer-share/my-shared')
        return response.data || []
      } catch (error) {
        console.error('[CustomerShare] 获取我分享的客户失败:', error)
        return []
      }
    }
    const currentUser = getCurrentUser()
    const shareHistory = await this.getShareHistory()
    return shareHistory.filter(s => s.sharedBy === currentUser.id && s.status === 'active')
  },

  // 获取分享给我的客户
  async getSharedToMeCustomers(): Promise<CustomerShareInfo[]> {
    if (isProduction()) {
      try {
        const response = await api.get<CustomerShareInfo[]>('/customer-share/shared-to-me')
        return response.data || []
      } catch (error) {
        console.error('[CustomerShare] 获取分享给我的客户失败:', error)
        return []
      }
    }
    const currentUser = getCurrentUser()
    const shareHistory = await this.getShareHistory()
    return shareHistory.filter(s => s.sharedTo === currentUser.id && s.status === 'active')
  },

  // 获取可分享的用户列表
  async getShareableUsers(): Promise<Array<{ id: string; name: string; role: string }>> {
    if (isProduction()) {
      try {
        const response = await api.get<Array<{ id: string; name: string; role: string }>>('/customer-share/shareable-users')
        return response.data || []
      } catch (error) {
        console.error('[CustomerShare] 获取可分享用户失败:', error)
        return []
      }
    }
    const currentUser = getCurrentUser()
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    return users.filter((u: { id: string; role: string }) =>
      u.id !== currentUser.id && ['sales_staff', 'department_manager', 'admin'].includes(u.role)
    )
  },

  // 自动回收过期分享
  async autoRecallExpiredShares(): Promise<number> {
    const shareHistory = await this.getShareHistory()
    const now = new Date()
    let expiredCount = 0

    for (const share of shareHistory) {
      if (share.status === 'active' && share.expireTime) {
        const expireTime = new Date(share.expireTime)
        if (now >= expireTime) {
          await this.recallCustomer({ shareId: share.id, recallReason: '分享时间到期，自动回收' })
          expiredCount++
        }
      }
    }
    return expiredCount
  }
}

export default customerShareApi
