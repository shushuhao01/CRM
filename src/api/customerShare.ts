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
    try {
      const response = await api.get<{ list: CustomerShareInfo[] }>('/customer-share/history')
      return response.data?.list || []
    } catch (error) {
      console.error('[CustomerShare] API获取分享历史失败:', error)
      return []
    }
  },

  // 分享客户
  async shareCustomer(request: ShareRequest): Promise<{ success: boolean; message: string; data?: CustomerShareInfo }> {
    // 🔥 强制使用真实API，不使用localStorage
    try {
      const response = await api.post<CustomerShareInfo>('/customer-share/share', request)
      return { success: true, message: '客户分享成功', data: response.data }
    } catch (error: any) {
      console.error('[CustomerShare] API分享失败:', error)
      return { success: false, message: error?.response?.data?.message || error?.message || '分享失败' }
    }
  },

  // 回收客户
  async recallCustomer(request: RecallRequest): Promise<{ success: boolean; message: string }> {
    try {
      await api.post('/customer-share/recall', request)
      return { success: true, message: '客户回收成功' }
    } catch (error: any) {
      console.error('[CustomerShare] API回收失败:', error)
      return { success: false, message: error?.response?.data?.message || error?.message || '回收失败' }
    }
  },

  // 获取我分享的客户
  async getMySharedCustomers(): Promise<CustomerShareInfo[]> {
    try {
      const response = await api.get<CustomerShareInfo[]>('/customer-share/my-shared')
      return response.data || []
    } catch (error) {
      console.error('[CustomerShare] 获取我分享的客户失败:', error)
      return []
    }
  },

  // 获取分享给我的客户
  async getSharedToMeCustomers(): Promise<CustomerShareInfo[]> {
    try {
      const response = await api.get<CustomerShareInfo[]>('/customer-share/shared-to-me')
      return response.data || []
    } catch (error) {
      console.error('[CustomerShare] 获取分享给我的客户失败:', error)
      return []
    }
  },

  // 获取可分享的用户列表
  async getShareableUsers(): Promise<Array<{ id: string; name: string; role: string }>> {
    try {
      const response = await api.get<Array<{ id: string; name: string; role: string }>>('/customer-share/shareable-users')
      return response.data || []
    } catch (error) {
      console.error('[CustomerShare] 获取可分享用户失败:', error)
      return []
    }
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
