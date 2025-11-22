import request from '@/utils/request'

// 顺丰配置接口
export interface SFExpressConfig {
  appId: string
  checkWord: string
  apiUrl: string
  enabled?: boolean
}

// 物流轨迹查询参数
export interface TrackQueryParams {
  trackingNumber: string
  orderNumber?: string
}

// 物流轨迹结果
export interface TrackResult {
  success: boolean
  data: {
    routes: Array<{
      acceptTime: string
      acceptAddress: string
      remark: string
      opCode: string
    }>
  }
}

/**
 * 测试连接
 */
export const testConnection = (config: SFExpressConfig) => {
  return request({
    url: '/api/v1/sf-express/test-connection',
    method: 'post',
    data: config
  })
}

/**
 * 保存配置
 */
export const saveConfig = (config: SFExpressConfig) => {
  return request({
    url: '/api/v1/sf-express/config',
    method: 'post',
    data: config
  })
}

/**
 * 获取配置
 */
export const getConfig = () => {
  return request({
    url: '/api/v1/sf-express/config',
    method: 'get'
  })
}

/**
 * 查询物流轨迹
 */
export const queryTrack = (params: TrackQueryParams): Promise<TrackResult> => {
  return request({
    url: '/api/v1/sf-express/track',
    method: 'post',
    data: params
  })
}

/**
 * 订单筛选
 */
export const filterOrders = (params: any) => {
  return request({
    url: '/api/v1/sf-express/filter-orders',
    method: 'post',
    data: params
  })
}

/**
 * 创建顺丰订单
 */
export const createSFOrder = (orderData: any) => {
  return request({
    url: '/api/v1/sf-express/create-order',
    method: 'post',
    data: orderData
  })
}
