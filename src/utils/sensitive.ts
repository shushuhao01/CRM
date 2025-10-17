/**
 * 敏感信息加密工具函数
 */

/**
 * 加密微信号
 * @param wechat - 微信号
 * @returns 加密后的微信号
 */
export function maskWechat(wechat: string): string {
  if (!wechat || typeof wechat !== 'string') {
    return wechat || ''
  }
  
  const len = wechat.length
  if (len <= 2) {
    return wechat
  } else if (len <= 4) {
    return wechat.charAt(0) + '*'.repeat(len - 2) + wechat.charAt(len - 1)
  } else {
    // 显示前2位和后2位，中间用*号替换
    return wechat.substring(0, 2) + '*'.repeat(len - 4) + wechat.substring(len - 2)
  }
}

/**
 * 加密邮箱
 * @param email - 邮箱地址
 * @returns 加密后的邮箱
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return email || ''
  }
  
  const atIndex = email.indexOf('@')
  if (atIndex === -1) {
    return email
  }
  
  const username = email.substring(0, atIndex)
  const domain = email.substring(atIndex)
  
  if (username.length <= 2) {
    return username + domain
  } else if (username.length <= 4) {
    return username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1) + domain
  } else {
    // 显示前2位和后1位，中间用*号替换
    return username.substring(0, 2) + '*'.repeat(username.length - 3) + username.charAt(username.length - 1) + domain
  }
}

/**
 * 检查用户是否有查看敏感信息的权限
 * @param user - 用户信息
 * @returns 是否有权限
 */
export function canViewSensitiveInfo(user: any): boolean {
  if (!user) return false
  
  // 超级管理员 - 支持多种角色判断方式
  if (user.role === 'admin' || user.role === 'super_admin' || user.isSuperAdmin) {
    return true
  }
  
  // 白名单成员（可以通过用户的特殊标识或权限列表判断）
  if (user.permissions && user.permissions.includes('view_sensitive_info')) {
    return true
  }
  
  // 白名单用户ID列表（可以根据实际需求配置）
  const whitelistUserIds = ['admin', 'manager'] // 这里可以配置白名单用户ID
  if (whitelistUserIds.includes(user.id) || whitelistUserIds.includes(user.username)) {
    return true
  }
  
  return false
}

/**
 * 根据权限显示敏感信息
 * @param value - 原始值
 * @param user - 用户信息
 * @param type - 信息类型 ('wechat', 'email')
 * @returns 处理后的值
 */
export function displaySensitiveInfo(value: string, user: any, type: 'wechat' | 'email'): string {
  if (!value) return value
  
  if (canViewSensitiveInfo(user)) {
    return value // 有权限，显示原始值
  }
  
  // 无权限，显示加密值
  switch (type) {
    case 'wechat':
      return maskWechat(value)
    case 'email':
      return maskEmail(value)
    default:
      return value
  }
}