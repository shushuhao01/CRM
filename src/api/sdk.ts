import { request } from './request'

export interface SDKInfo {
  platform: string
  fileName: string
  fileSize?: number
  fileSizeFormatted?: string
  lastModified?: string
  version?: string
  buildType?: string
  packageType?: string
  supportedSystems?: string
  available: boolean
  downloadUrl?: string
  message?: string
  error?: string
}

export interface SDKListResponse {
  success: boolean
  data: SDKInfo[]
}

export interface SDKInfoResponse {
  success: boolean
  data: SDKInfo
}

/**
 * 获取所有可用SDK列表
 */
export const getSDKList = (): Promise<SDKListResponse> => {
  return request.get('/sdk/list')
}

/**
 * 获取指定平台SDK信息
 */
export const getSDKInfo = (platform: 'android' | 'ios'): Promise<SDKInfoResponse> => {
  return request.get(`/mobile-sdk/info`).then(response => {
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data[platform]
      }
    }
    return response
  })
}

/**
 * 下载SDK文件
 */
export const downloadSDK = async (platform: 'android' | 'ios'): Promise<{
  success: boolean
  message?: string
  error?: string
}> => {
  try {
    // 使用真实的APK文件路径
    let downloadUrl: string
    let fileName: string
    
    if (platform === 'android') {
      downloadUrl = '/api/v1/mobile-sdk/download/android'
      fileName = 'CRM-Mobile-SDK-v2.1.3.apk'
    } else {
      // iOS暂时使用PWA方式
      downloadUrl = '/mobile-sdk/'
      fileName = 'CRM-Mobile-SDK-PWA'
    }
    
    // 创建下载链接并触发下载
    const link = document.createElement('a')
    link.href = downloadUrl
    if (platform === 'android') {
      link.download = fileName
    } else {
      link.target = '_blank'
    }
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    return {
      success: true,
      message: platform === 'android' 
        ? 'Android APK 下载已开始，请在下载完成后安装' 
        : 'iOS PWA 应用已打开，请按照页面指引安装'
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '下载失败'
    }
  }
}

/**
 * 检查SDK安装状态（模拟实现）
 */
export const checkSDKInstallStatus = async (platform: 'android' | 'ios'): Promise<{
  installed: boolean
  version?: string
  lastCheck: string
}> => {
  // 这里是模拟实现，实际项目中需要通过设备检测或用户反馈来确定
  // 可以通过localStorage存储用户的安装状态
  const storageKey = `sdk_install_status_${platform}`
  const stored = localStorage.getItem(storageKey)
  
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // 如果解析失败，返回默认状态
    }
  }
  
  // 默认未安装状态
  return {
    installed: false,
    lastCheck: new Date().toISOString()
  }
}

/**
 * 更新SDK安装状态
 */
export const updateSDKInstallStatus = (
  platform: 'android' | 'ios', 
  installed: boolean, 
  version?: string
): void => {
  const storageKey = `sdk_install_status_${platform}`
  const status = {
    installed,
    version,
    lastCheck: new Date().toISOString()
  }
  
  localStorage.setItem(storageKey, JSON.stringify(status))
}

/**
 * 模拟SDK连接测试
 */
export const testSDKConnection = async (platform: 'android' | 'ios'): Promise<{
  success: boolean
  connected: boolean
  message: string
  details?: {
    deviceInfo?: string
    networkStatus?: string
    permissions?: string[]
  }
}> => {
  // 检查是否已安装
  const installStatus = await checkSDKInstallStatus(platform)
  
  if (!installStatus.installed) {
    return {
      success: false,
      connected: false,
      message: '请先安装SDK'
    }
  }
  
  // 模拟连接测试（实际项目中需要真实的设备通信）
  return new Promise((resolve) => {
    setTimeout(() => {
      const isConnected = Math.random() > 0.3 // 70% 成功率
      
      if (isConnected) {
        resolve({
          success: true,
          connected: true,
          message: '设备连接成功',
          details: {
            deviceInfo: `${platform === 'android' ? 'Android' : 'iOS'} 设备`,
            networkStatus: '网络连接正常',
            permissions: ['麦克风权限', '通话权限', '网络权限']
          }
        })
      } else {
        resolve({
          success: true,
          connected: false,
          message: '设备连接失败，请检查网络和权限设置'
        })
      }
    }, 2000) // 模拟2秒的连接测试时间
  })
}