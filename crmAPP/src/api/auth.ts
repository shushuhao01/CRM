import { request } from '@/utils/request'
import type { UserInfo, DeviceInfo } from '@/stores/user'

// 登录响应
interface LoginResponse {
  token: string
  expiresIn: number
  user: UserInfo
}

// APP登录
export const login = (data: {
  username: string
  password: string
  deviceInfo?: Partial<DeviceInfo>
}): Promise<LoginResponse> => {
  return request({
    url: '/mobile/login',
    method: 'POST',
    data,
    showLoading: true,
    loadingText: '登录中...'
  })
}

// 绑定设备响应
interface BindResponse {
  deviceId: string
  userId: string
  wsToken: string
  wsUrl: string
}

// 扫码绑定设备
export const bindDevice = (data: {
  bindToken: string
  phoneNumber?: string
  deviceInfo: DeviceInfo
}): Promise<BindResponse> => {
  return request({
    url: '/mobile/bind',
    method: 'POST',
    data,
    showLoading: true,
    loadingText: '绑定中...'
  })
}

// 解绑设备
export const unbindDevice = (deviceId?: string): Promise<void> => {
  return request({
    url: '/mobile/unbind',
    method: 'DELETE',
    data: { deviceId },
    showLoading: true,
    loadingText: '解绑中...'
  })
}

// 获取设备状态
interface DeviceStatus {
  bound: boolean
  device: {
    id: number
    phoneNumber: string
    deviceId: string
    deviceName: string
    deviceModel: string
    osType: string
    osVersion: string
    appVersion: string
    onlineStatus: string
    lastActiveAt: string
    bindTime: string
  } | null
}

export const getDeviceStatus = (): Promise<DeviceStatus> => {
  return request({
    url: '/mobile/device/status',
    method: 'GET',
    showLoading: false
  })
}
