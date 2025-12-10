import { request } from './request'

// 安全请求包装器：处理404等错误，返回空数组而不是抛出错误
const safeRequest = async (url: string, options: any, defaultValue: any = []) => {
  try {
    const response = await request(url, options)
    // 处理不同的响应格式
    if (response && response.data !== undefined) {
      return response.data
    }
    return response || defaultValue
  } catch (error: any) {
    // 如果是404错误（API端点不存在或数据不存在），返回默认值而不是抛出错误
    if (error?.message?.includes('404') ||
        error?.message?.includes('API端点不存在') ||
        error?.message?.includes('Not Found') ||
        error?.response?.status === 404) {
      console.log(`[API] ${url} 返回空数据（404）`)
      return defaultValue
    }
    // 其他错误继续抛出
    throw error
  }
}

// 客户详情相关API - 始终从后端数据库获取数据
export const customerDetailApi = {
  // 获取客户订单历史
  getCustomerOrders: async (customerId: string) => {
    console.log(`[API] 获取客户 ${customerId} 的订单历史`)
    return safeRequest(`/api/v1/customers/${customerId}/orders`, {
      method: 'GET'
    }, [])
  },

  // 获取客户售后记录
  getCustomerServices: async (customerId: string) => {
    console.log(`[API] 获取客户 ${customerId} 的售后记录`)
    return safeRequest(`/api/v1/customers/${customerId}/services`, {
      method: 'GET'
    }, [])
  },

  // 获取客户通话记录
  getCustomerCalls: async (customerId: string) => {
    console.log(`[API] 获取客户 ${customerId} 的通话记录`)
    return safeRequest(`/api/v1/customers/${customerId}/calls`, {
      method: 'GET'
    }, [])
  },

  // 获取客户跟进记录
  getCustomerFollowUps: async (customerId: string) => {
    console.log(`[API] 获取客户 ${customerId} 的跟进记录`)
    return safeRequest(`/api/v1/customers/${customerId}/followups`, {
      method: 'GET'
    }, [])
  },

  // 获取客户标签
  getCustomerTags: async (customerId: string) => {
    console.log(`[API] 获取客户 ${customerId} 的标签`)
    return safeRequest(`/api/v1/customers/${customerId}/tags`, {
      method: 'GET'
    }, [])
  },

  // 添加跟进记录
  addFollowUp: async (customerId: string, followUpData: any) => {
    console.log(`[API] 为客户 ${customerId} 添加跟进记录`)
    const response = await request(`/api/v1/customers/${customerId}/followups`, {
      method: 'POST',
      data: followUpData
    })
    return response?.data || response
  },

  // 更新跟进记录
  updateFollowUp: async (customerId: string, followUpId: string, followUpData: any) => {
    console.log(`[API] 更新客户 ${customerId} 的跟进记录 ${followUpId}`)
    const response = await request(`/api/v1/customers/${customerId}/followups/${followUpId}`, {
      method: 'PUT',
      data: followUpData
    })
    return response?.data || response
  },

  // 删除跟进记录
  deleteFollowUp: async (customerId: string, followUpId: string) => {
    console.log(`[API] 删除客户 ${customerId} 的跟进记录 ${followUpId}`)
    const response = await request(`/api/v1/customers/${customerId}/followups/${followUpId}`, {
      method: 'DELETE'
    })
    return response?.data || { success: true }
  },

  // 添加客户标签
  addCustomerTag: async (customerId: string, tagData: any) => {
    console.log(`[API] 为客户 ${customerId} 添加标签`)
    const response = await request(`/api/v1/customers/${customerId}/tags`, {
      method: 'POST',
      data: tagData
    })
    return response?.data || response
  },

  // 删除客户标签
  removeCustomerTag: async (customerId: string, tagId: string) => {
    console.log(`[API] 删除客户 ${customerId} 的标签 ${tagId}`)
    const response = await request(`/api/v1/customers/${customerId}/tags/${tagId}`, {
      method: 'DELETE'
    })
    return response?.data || { success: true }
  },

  // 获取客户疾病史
  getCustomerMedicalHistory: async (customerId: string) => {
    console.log(`[API] 获取客户 ${customerId} 的疾病史`)
    return safeRequest(`/api/v1/customers/${customerId}/medical-history`, {
      method: 'GET'
    }, [])
  },

  // 添加疾病史记录
  addMedicalHistory: async (customerId: string, medicalData: any) => {
    console.log(`[API] 为客户 ${customerId} 添加疾病史`)
    const response = await request(`/api/v1/customers/${customerId}/medical-history`, {
      method: 'POST',
      data: medicalData
    })
    return response?.data || response
  }
}
