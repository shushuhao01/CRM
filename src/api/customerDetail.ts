import { request } from './request'
import { isDevelopment } from '@/utils/env'

// 安全请求包装器：处理404等错误，返回空数组而不是抛出错误
const safeRequest = async (url: string, options: any, defaultValue: any = []) => {
  try {
    return await request(url, options)
  } catch (error: any) {
    // 如果是404错误（API端点不存在或数据不存在），返回默认值而不是抛出错误
    if (error?.message?.includes('404') ||
        error?.message?.includes('API端点不存在') ||
        error?.message?.includes('Not Found')) {
      console.log(`[API] ${url} 返回空数据（404）`)
      return defaultValue
    }
    // 其他错误继续抛出
    throw error
  }
}

// 客户详情相关API
export const customerDetailApi = {
  // 获取客户订单历史
  getCustomerOrders: async (customerId: string) => {
    if (isDevelopment()) {
      // Mock模式：从localStorage获取
      const orders = JSON.parse(localStorage.getItem('crm_orders') || '[]')
      return orders.filter((order: any) => order.customerId === customerId)
    } else {
      // 生产模式：调用后端API，404时返回空数组
      return safeRequest(`/api/customers/${customerId}/orders`, {
        method: 'GET'
      }, [])
    }
  },

  // 获取客户售后记录
  getCustomerServices: async (customerId: string) => {
    if (isDevelopment()) {
      // Mock模式：从localStorage获取
      const services = JSON.parse(localStorage.getItem('crm_services') || '[]')
      return services.filter((service: any) => service.customerId === customerId)
    } else {
      // 生产模式：调用后端API，404时返回空数组
      return safeRequest(`/api/customers/${customerId}/services`, {
        method: 'GET'
      }, [])
    }
  },

  // 获取客户通话记录
  getCustomerCalls: async (customerId: string) => {
    if (isDevelopment()) {
      // Mock模式：从localStorage获取
      const calls = JSON.parse(localStorage.getItem('crm_calls') || '[]')
      return calls.filter((call: any) => call.customerId === customerId)
    } else {
      // 生产模式：调用后端API，404时返回空数组
      return safeRequest(`/api/customers/${customerId}/calls`, {
        method: 'GET'
      }, [])
    }
  },

  // 获取客户跟进记录
  getCustomerFollowUps: async (customerId: string) => {
    if (isDevelopment()) {
      // Mock模式：从localStorage获取
      const followUps = JSON.parse(localStorage.getItem('crm_followups') || '[]')
      return followUps.filter((followUp: any) => followUp.customerId === customerId)
    } else {
      // 生产模式：调用后端API，404时返回空数组
      return safeRequest(`/api/customers/${customerId}/followups`, {
        method: 'GET'
      }, [])
    }
  },

  // 获取客户标签
  getCustomerTags: async (customerId: string) => {
    if (isDevelopment()) {
      // Mock模式：从localStorage获取
      const customers = JSON.parse(localStorage.getItem('crm_customers') || '[]')
      const customer = customers.find((c: any) => c.id === customerId)
      return customer?.tags || []
    } else {
      // 生产模式：调用后端API，404时返回空数组
      return safeRequest(`/api/customers/${customerId}/tags`, {
        method: 'GET'
      }, [])
    }
  },

  // 添加跟进记录
  addFollowUp: async (customerId: string, followUpData: any) => {
    if (isDevelopment()) {
      // Mock模式：保存到localStorage
      const followUps = JSON.parse(localStorage.getItem('crm_followups') || '[]')
      const newFollowUp = {
        id: `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        ...followUpData,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      followUps.push(newFollowUp)
      localStorage.setItem('crm_followups', JSON.stringify(followUps))
      return newFollowUp
    } else {
      // 生产模式：调用后端API
      return request(`/api/customers/${customerId}/followups`, {
        method: 'POST',
        data: followUpData
      })
    }
  },

  // 更新跟进记录
  updateFollowUp: async (customerId: string, followUpId: string, followUpData: any) => {
    if (isDevelopment()) {
      // Mock模式：更新localStorage
      const followUps = JSON.parse(localStorage.getItem('crm_followups') || '[]')
      const index = followUps.findIndex((f: any) => f.id === followUpId)
      if (index > -1) {
        followUps[index] = {
          ...followUps[index],
          ...followUpData,
          updateTime: new Date().toISOString()
        }
        localStorage.setItem('crm_followups', JSON.stringify(followUps))
        return followUps[index]
      }
      throw new Error('跟进记录不存在')
    } else {
      // 生产模式：调用后端API
      return request(`/api/customers/${customerId}/followups/${followUpId}`, {
        method: 'PUT',
        data: followUpData
      })
    }
  },

  // 删除跟进记录
  deleteFollowUp: async (customerId: string, followUpId: string) => {
    if (isDevelopment()) {
      // Mock模式：从localStorage删除
      const followUps = JSON.parse(localStorage.getItem('crm_followups') || '[]')
      const filteredFollowUps = followUps.filter((f: any) => f.id !== followUpId)
      localStorage.setItem('crm_followups', JSON.stringify(filteredFollowUps))
      return { success: true }
    } else {
      // 生产模式：调用后端API
      return request(`/api/customers/${customerId}/followups/${followUpId}`, {
        method: 'DELETE'
      })
    }
  },

  // 添加客户标签
  addCustomerTag: async (customerId: string, tagData: any) => {
    if (isDevelopment()) {
      // Mock模式：更新localStorage中的客户标签
      const customers = JSON.parse(localStorage.getItem('crm_customers') || '[]')
      const customerIndex = customers.findIndex((c: any) => c.id === customerId)
      if (customerIndex > -1) {
        if (!customers[customerIndex].tags) {
          customers[customerIndex].tags = []
        }
        const newTag = {
          id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...tagData
        }
        customers[customerIndex].tags.push(newTag)
        localStorage.setItem('crm_customers', JSON.stringify(customers))
        return newTag
      }
      throw new Error('客户不存在')
    } else {
      // 生产模式：调用后端API
      return request(`/api/customers/${customerId}/tags`, {
        method: 'POST',
        data: tagData
      })
    }
  },

  // 删除客户标签
  removeCustomerTag: async (customerId: string, tagId: string) => {
    if (isDevelopment()) {
      // Mock模式：从localStorage删除标签
      const customers = JSON.parse(localStorage.getItem('crm_customers') || '[]')
      const customerIndex = customers.findIndex((c: any) => c.id === customerId)
      if (customerIndex > -1 && customers[customerIndex].tags) {
        customers[customerIndex].tags = customers[customerIndex].tags.filter(
          (tag: unknown) => tag.id !== tagId
        )
        localStorage.setItem('crm_customers', JSON.stringify(customers))
        return { success: true }
      }
      throw new Error('客户或标签不存在')
    } else {
      // 生产模式：调用后端API
      return request(`/api/customers/${customerId}/tags/${tagId}`, {
        method: 'DELETE'
      })
    }
  }
}
