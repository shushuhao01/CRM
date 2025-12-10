import { request } from './request'

// 安全请求包装器：处理404等错误，返回空数组而不是抛出错误
const safeRequest = async (url: string, options: any, defaultValue: any = []) => {
  try {
    const response = await request(url, options)
    if (response && response.data !== undefined) {
      return response.data
    }
    return response || defaultValue
  } catch (error: any) {
    if (error?.message?.includes('404') ||
        error?.message?.includes('Not Found') ||
        error?.response?.status === 404) {
      console.log(`[API] ${url} 返回空数据（404）`)
      return defaultValue
    }
    throw error
  }
}

// 订单详情相关API - 始终从后端数据库获取数据
export const orderDetailApi = {
  // 获取订单状态历史
  getStatusHistory: async (orderId: string) => {
    console.log(`[API] 获取订单 ${orderId} 的状态历史`)
    return safeRequest(`/api/v1/orders/${orderId}/status-history`, {
      method: 'GET'
    }, [])
  },

  // 获取订单操作记录
  getOperationLogs: async (orderId: string) => {
    console.log(`[API] 获取订单 ${orderId} 的操作记录`)
    return safeRequest(`/api/v1/orders/${orderId}/operation-logs`, {
      method: 'GET'
    }, [])
  },

  // 获取订单售后历史
  getAfterSalesHistory: async (orderId: string) => {
    console.log(`[API] 获取订单 ${orderId} 的售后历史`)
    return safeRequest(`/api/v1/orders/${orderId}/after-sales`, {
      method: 'GET'
    }, [])
  }
}
