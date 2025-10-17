import { request } from '@/utils/request'

// 蓝牙连接相关API
export const startBluetoothService = (data: { deviceName?: string }) => {
  return request({
    url: '/alternative-connection/bluetooth/start',
    method: 'post',
    data
  })
}

export const stopBluetoothService = () => {
  return request({
    url: '/alternative-connection/bluetooth/stop',
    method: 'post'
  })
}

export const getBluetoothStatus = () => {
  return request({
    url: '/alternative-connection/bluetooth/status',
    method: 'get'
  })
}

export const pairBluetoothDevice = (data: { pairingCode: string; deviceInfo: any }) => {
  return request({
    url: '/alternative-connection/bluetooth/pair',
    method: 'post',
    data
  })
}

// 同网络连接相关API
export const startNetworkDiscovery = (data: { port?: number; broadcastInterval?: number }) => {
  return request({
    url: '/alternative-connection/network/start',
    method: 'post',
    data
  })
}

export const stopNetworkDiscovery = () => {
  return request({
    url: '/alternative-connection/network/stop',
    method: 'post'
  })
}

export const getNetworkStatus = () => {
  return request({
    url: '/alternative-connection/network/status',
    method: 'get'
  })
}

export const connectNetworkDevice = (data: { deviceInfo: any }) => {
  return request({
    url: '/alternative-connection/network/connect',
    method: 'post',
    data
  })
}

// 数字配对相关API
export const startDigitalPairing = (data: { expireTime?: number }) => {
  return request({
    url: '/alternative-connection/digital/start',
    method: 'post',
    data
  })
}

export const stopDigitalPairing = () => {
  return request({
    url: '/alternative-connection/digital/stop',
    method: 'post'
  })
}

export const getDigitalPairingStatus = () => {
  return request({
    url: '/alternative-connection/digital/status',
    method: 'get'
  })
}

export const pairWithCode = (data: { pairingCode: string; deviceInfo: any }) => {
  return request({
    url: '/alternative-connection/digital/pair',
    method: 'post',
    data
  })
}

export const generatePairingCode = () => {
  return request({
    url: '/alternative-connection/digital/generate-code',
    method: 'post'
  })
}

// 通用连接管理API
export const getAllConnectedDevices = () => {
  return request({
    url: '/alternative-connection/devices',
    method: 'get'
  })
}

export const disconnectDevice = (deviceId: string) => {
  return request({
    url: `/alternative-connection/devices/${deviceId}`,
    method: 'delete'
  })
}

export const getConnectionStatistics = () => {
  return request({
    url: '/alternative-connection/statistics',
    method: 'get'
  })
}