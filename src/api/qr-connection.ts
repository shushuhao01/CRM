import { request } from './request'

export interface QRConnectionData {
  connectionId: string
  qrData: string
  expiresAt: string
  permissions: string[]
}

export interface ConnectedDevice {
  id: string
  deviceId: string
  deviceName: string
  lastConnected: string
  status: 'online' | 'offline'
  permissions: string[]
}

export interface ConnectionStatus {
  status: 'pending' | 'connected' | 'expired'
  createdAt: string
  expiresAt: string
  deviceInfo?: any
}

// 生成连接二维码
export const generateQRCode = (data: {
  userId: string
  permissions?: string[]
}) => {
  return request.post<QRConnectionData>('/qr-connection/generate', data)
}

// 获取连接状态
export const getConnectionStatus = (connectionId: string) => {
  return request.get<ConnectionStatus>(`/qr-connection/status/${connectionId}`)
}

// 断开设备连接
export const disconnectDevice = (connectionId: string, deviceId?: string) => {
  return request.delete(`/qr-connection/disconnect/${connectionId}`, {
    data: { deviceId }
  })
}

// 获取已连接设备列表
export const getConnectedDevices = (userId?: string) => {
  return request.get<ConnectedDevice[]>('/qr-connection/devices', {
    params: { userId }
  })
}

// 重新连接设备
export const reconnectDevice = (data: {
  deviceId: string
  connectionToken: string
}) => {
  return request.post('/qr-connection/reconnect', data)
}