/**
 * API接口管理相关接口
 */
import request from '@/utils/request'

// 获取接口列表
export function getApiInterfaces(params?: { category?: string }) {
  return request({
    url: '/mobile/interfaces',
    method: 'get',
    params
  })
}

// 更新接口状态
export function updateApiInterface(id: number, data: {
  isEnabled?: boolean
  rateLimit?: number
  description?: string
}) {
  return request({
    url: `/mobile/interfaces/${id}`,
    method: 'put',
    data
  })
}

// 获取接口调用日志
export function getApiCallLogs(params: {
  interfaceCode?: string
  success?: string
  page?: number
  pageSize?: number
}) {
  return request({
    url: '/mobile/interfaces/logs',
    method: 'get',
    params
  })
}

// 获取接口统计数据
export function getApiStats() {
  return request({
    url: '/mobile/interfaces/stats',
    method: 'get'
  })
}

// 重置接口统计
export function resetApiStats(id: number) {
  return request({
    url: `/mobile/interfaces/${id}/reset`,
    method: 'post'
  })
}

// 获取设备状态
export function getDeviceStatus(userId?: string) {
  return request({
    url: '/mobile/device/status',
    method: 'get',
    params: { userId }
  })
}

// 生成绑定二维码
export function generateBindQRCode(userId?: string) {
  return request({
    url: '/mobile/bindQRCode',
    method: 'post',
    data: { userId }
  })
}

// 解绑设备
export function unbindDevice(deviceId?: string) {
  return request({
    url: '/mobile/unbind',
    method: 'delete',
    data: { deviceId }
  })
}
