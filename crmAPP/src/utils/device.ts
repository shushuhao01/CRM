/**
 * 设备相关工具函数
 */

// 获取设备信息
export const getDeviceInfo = () => {
  const systemInfo = uni.getSystemInfoSync()

  return {
    deviceId: systemInfo.deviceId || `device_${Date.now()}`,
    deviceName: systemInfo.deviceModel || '未知设备',
    deviceModel: systemInfo.deviceModel || '',
    osType: (systemInfo.platform === 'ios' ? 'ios' : 'android') as 'ios' | 'android',
    osVersion: systemInfo.system || '',
    appVersion: '1.0.0',
    screenWidth: systemInfo.screenWidth,
    screenHeight: systemInfo.screenHeight
  }
}

// 检查权限
export const checkPermission = async (scope: string): Promise<boolean> => {
  return new Promise((resolve) => {
    uni.authorize({
      scope,
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
}

// 请求权限
export const requestPermission = async (scope: string, tip: string): Promise<boolean> => {
  const hasPermission = await checkPermission(scope)

  if (hasPermission) return true

  return new Promise((resolve) => {
    uni.showModal({
      title: '权限申请',
      content: tip,
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          uni.openSetting({
            success: (settingRes) => {
              resolve(settingRes.authSetting[scope] === true)
            },
            fail: () => resolve(false)
          })
        } else {
          resolve(false)
        }
      }
    })
  })
}

// 请求所有必要权限
export const requestAllPermissions = async (): Promise<boolean> => {
  const permissions = [
    { scope: 'scope.camera', tip: '需要相机权限用于扫描二维码' },
    { scope: 'scope.record', tip: '需要录音权限用于通话录音' }
  ]

  for (const { scope, tip } of permissions) {
    const granted = await requestPermission(scope, tip)
    if (!granted) {
      return false
    }
  }

  return true
}

// 拨打电话
export const makePhoneCall = (phoneNumber: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    plus.device.dial(phoneNumber, false)
    resolve(true)
    // #endif

    // #ifndef APP-PLUS
    uni.makePhoneCall({
      phoneNumber,
      success: () => resolve(true),
      fail: () => resolve(false)
    })
    // #endif
  })
}

// 振动
export const vibrate = (type: 'short' | 'long' = 'short') => {
  if (type === 'short') {
    uni.vibrateShort({ type: 'medium' })
  } else {
    uni.vibrateLong({})
  }
}
