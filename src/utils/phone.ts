import { useUserStore } from '@/stores/user'

/**
 * 手机号码加密显示
 * @param phone 手机号码
 * @param forceShow 强制显示完整号码（可选）
 * @returns 加密后的手机号码或完整号码
 */
export const maskPhone = (phone: string, forceShow: boolean = false): string => {
  if (!phone) {
    return ''
  }

  const userStore = useUserStore()
  
  // 强制显示或有查看权限时，显示完整号码
  if (forceShow || userStore.canViewPhone) {
    return phone
  }

  // 普通用户显示加密号码：138****5678
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 验证手机号码格式
 * @param phone 手机号码
 * @returns 是否为有效的手机号码
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

/**
 * 格式化手机号码显示（添加空格分隔）
 * @param phone 手机号码
 * @param masked 是否加密显示
 * @returns 格式化后的手机号码
 */
export const formatPhone = (phone: string, masked: boolean = true): string => {
  if (!phone) {
    return ''
  }

  const displayPhone = masked ? maskPhone(phone) : phone
  
  // 添加空格分隔：138 **** 5678 或 138 1234 5678
  return displayPhone.replace(/(\d{3})(\*{4}|\d{4})(\d{4})/, '$1 $2 $3')
}

/**
 * 获取手机号码的运营商信息
 * @param phone 手机号码
 * @returns 运营商名称
 */
export const getPhoneCarrier = (phone: string): string => {
  if (!phone || phone.length !== 11) {
    return '未知'
  }

  const prefix = phone.substring(0, 3)
  
  // 中国移动
  if (['134', '135', '136', '137', '138', '139', '147', '150', '151', '152', '157', '158', '159', '178', '182', '183', '184', '187', '188', '198'].includes(prefix)) {
    return '中国移动'
  }
  
  // 中国联通
  if (['130', '131', '132', '145', '155', '156', '166', '171', '175', '176', '185', '186', '196'].includes(prefix)) {
    return '中国联通'
  }
  
  // 中国电信
  if (['133', '149', '153', '173', '177', '180', '181', '189', '191', '193', '199'].includes(prefix)) {
    return '中国电信'
  }
  
  return '其他'
}