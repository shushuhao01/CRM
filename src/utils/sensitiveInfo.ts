/**
 * 敏感信息处理工具类（TypeScript版本）
 * 集成权限控制系统 - 从数据库API获取权限配置
 */

import { SensitiveInfoType, PermissionLevel } from '@/services/permission'
import { useUserStore } from '@/stores/user'
import { sensitiveInfoPermissionService } from '@/services/sensitiveInfoPermissionService'

// 重新导出类型，供其他模块使用
export { SensitiveInfoType, PermissionLevel } from '@/services/permission'

// 敏感信息掩码配置
interface MaskConfig {
  showStart: number  // 显示开头字符数
  showEnd: number    // 显示结尾字符数
  maskChar: string   // 掩码字符
  minLength: number  // 最小长度才进行掩码
}

// 默认掩码配置
const DEFAULT_MASK_CONFIGS: Record<SensitiveInfoType, MaskConfig> = {
  [SensitiveInfoType.PHONE]: {
    showStart: 3,
    showEnd: 4,
    maskChar: '*',
    minLength: 7
  },
  [SensitiveInfoType.ID_CARD]: {
    showStart: 4,
    showEnd: 4,
    maskChar: '*',
    minLength: 8
  },
  [SensitiveInfoType.EMAIL]: {
    showStart: 2,
    showEnd: 0, // 邮箱特殊处理
    maskChar: '*',
    minLength: 5
  },
  [SensitiveInfoType.WECHAT]: {
    showStart: 2,
    showEnd: 2,
    maskChar: '*',
    minLength: 4
  },
  [SensitiveInfoType.ADDRESS]: {
    showStart: 6,
    showEnd: 0,
    maskChar: '*',
    minLength: 10
  },
  [SensitiveInfoType.BANK_ACCOUNT]: {
    showStart: 4,
    showEnd: 4,
    maskChar: '*',
    minLength: 8
  },
  [SensitiveInfoType.FINANCIAL]: {
    showStart: 0,
    showEnd: 0,
    maskChar: '*',
    minLength: 1
  }
}

// 敏感信息类型到数据库字段的映射
const INFO_TYPE_TO_DB_KEY: Record<SensitiveInfoType, string> = {
  [SensitiveInfoType.PHONE]: 'phone',
  [SensitiveInfoType.ID_CARD]: 'id_card',
  [SensitiveInfoType.EMAIL]: 'email',
  [SensitiveInfoType.WECHAT]: 'wechat',
  [SensitiveInfoType.ADDRESS]: 'address',
  [SensitiveInfoType.BANK_ACCOUNT]: 'bank',
  [SensitiveInfoType.FINANCIAL]: 'financial'
}

export class SensitiveInfoProcessor {
  /**
   * 通用掩码处理函数
   */
  private static applyMask(value: string, config: MaskConfig): string {
    if (!value || value.length < config.minLength) {
      return value
    }

    const { showStart, showEnd, maskChar } = config
    const totalShow = showStart + showEnd

    if (value.length <= totalShow) {
      return value
    }

    const start = value.substring(0, showStart)
    const end = showEnd > 0 ? value.substring(value.length - showEnd) : ''
    const maskLength = value.length - totalShow

    return start + maskChar.repeat(maskLength) + end
  }

  /**
   * 手机号掩码处理
   */
  public static maskPhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return phone || ''
    }

    // 移除所有非数字字符
    const cleanPhone = phone.replace(/\D/g, '')

    if (cleanPhone.length === 11) {
      // 中国大陆手机号：显示前3位和后4位
      return cleanPhone.substring(0, 3) + '****' + cleanPhone.substring(7)
    } else if (cleanPhone.length >= 7) {
      // 其他格式：使用默认配置
      return SensitiveInfoProcessor.applyMask(cleanPhone, DEFAULT_MASK_CONFIGS[SensitiveInfoType.PHONE])
    }

    return phone
  }

  /**
   * 身份证号掩码处理
   */
  public static maskIdCard(idCard: string): string {
    if (!idCard || typeof idCard !== 'string') {
      return idCard || ''
    }

    return SensitiveInfoProcessor.applyMask(idCard, DEFAULT_MASK_CONFIGS[SensitiveInfoType.ID_CARD])
  }

  /**
   * 邮箱掩码处理
   */
  public static maskEmail(email: string): string {
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
      return email
    } else if (username.length <= 4) {
      return username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1) + domain
    } else {
      // 显示前2位和后1位，中间用*号替换
      return username.substring(0, 2) + '*'.repeat(username.length - 3) + username.charAt(username.length - 1) + domain
    }
  }

  /**
   * 微信号掩码处理
   */
  public static maskWechat(wechat: string): string {
    if (!wechat || typeof wechat !== 'string') {
      return wechat || ''
    }

    return SensitiveInfoProcessor.applyMask(wechat, DEFAULT_MASK_CONFIGS[SensitiveInfoType.WECHAT])
  }

  /**
   * 地址掩码处理
   */
  public static maskAddress(address: string): string {
    if (!address || typeof address !== 'string') {
      return address || ''
    }

    if (address.length <= 10) {
      return address
    }

    // 显示前6个字符，后面用*替换
    return address.substring(0, 6) + '*'.repeat(Math.min(address.length - 6, 8))
  }

  /**
   * 银行账户掩码处理
   */
  public static maskBankAccount(account: string): string {
    if (!account || typeof account !== 'string') {
      return account || ''
    }

    return SensitiveInfoProcessor.applyMask(account, DEFAULT_MASK_CONFIGS[SensitiveInfoType.BANK_ACCOUNT])
  }

  /**
   * 财务信息掩码处理（完全隐藏）
   */
  public static maskFinancial(value: string): string {
    if (!value || typeof value !== 'string') {
      return value || ''
    }

    return '***'
  }

  /**
   * 根据信息类型选择对应的掩码方法
   */
  public static maskByType(value: string, type: SensitiveInfoType): string {
    switch (type) {
      case SensitiveInfoType.PHONE:
        return SensitiveInfoProcessor.maskPhone(value)
      case SensitiveInfoType.ID_CARD:
        return SensitiveInfoProcessor.maskIdCard(value)
      case SensitiveInfoType.EMAIL:
        return SensitiveInfoProcessor.maskEmail(value)
      case SensitiveInfoType.WECHAT:
        return SensitiveInfoProcessor.maskWechat(value)
      case SensitiveInfoType.ADDRESS:
        return SensitiveInfoProcessor.maskAddress(value)
      case SensitiveInfoType.BANK_ACCOUNT:
        return SensitiveInfoProcessor.maskBankAccount(value)
      case SensitiveInfoType.FINANCIAL:
        return SensitiveInfoProcessor.maskFinancial(value)
      default:
        return value
    }
  }

  /**
   * 根据用户权限显示敏感信息
   * 从数据库API获取的权限配置决定是否显示完整信息
   */
  public static displaySensitiveInfo(
    value: string,
    type: SensitiveInfoType,
    _userId?: string
  ): string {
    if (!value) return value

    // 获取当前用户角色
    let userRole: string | null = null

    try {
      const userStore = useUserStore()
      userRole = userStore.currentUser?.role || null
    } catch (_error) {
      console.warn('无法获取当前用户信息，使用受限模式显示敏感信息')
    }

    // 如果没有用户角色，使用掩码显示
    if (!userRole) {
      return SensitiveInfoProcessor.maskByType(value, type)
    }

    // 将敏感信息类型转换为数据库字段名
    const dbKey = SensitiveInfoProcessor.typeToDbKey(type)

    // 使用新的权限服务检查权限（从数据库API获取）
    const hasAccess = sensitiveInfoPermissionService.hasPermission(userRole, dbKey)

    if (hasAccess) {
      return value // 有权限，显示完整信息
    }

    // 无权限，显示掩码
    return SensitiveInfoProcessor.maskByType(value, type)
  }

  /**
   * 将SensitiveInfoType转换为数据库字段名
   */
  private static typeToDbKey(type: SensitiveInfoType): string {
    const mapping: Record<SensitiveInfoType, string> = {
      [SensitiveInfoType.PHONE]: 'phone',
      [SensitiveInfoType.ID_CARD]: 'id_card',
      [SensitiveInfoType.EMAIL]: 'email',
      [SensitiveInfoType.WECHAT]: 'wechat',
      [SensitiveInfoType.ADDRESS]: 'address',
      [SensitiveInfoType.BANK_ACCOUNT]: 'bank',
      [SensitiveInfoType.FINANCIAL]: 'financial'
    }
    return mapping[type] || type.toString()
  }

  /**
   * 批量处理敏感信息
   */
  public static batchDisplaySensitiveInfo(
    data: Record<string, unknown>,
    typeMapping: Record<string, SensitiveInfoType>,
    userId?: string
  ): Record<string, unknown> {
    const result = { ...data }

    for (const [field, type] of Object.entries(typeMapping)) {
      if (result[field]) {
        result[field] = SensitiveInfoProcessor.displaySensitiveInfo(result[field], type, userId)
      }
    }

    return result
  }

  /**
   * 检查用户是否有查看特定敏感信息的权限
   */
  public static canViewSensitiveInfo(type: SensitiveInfoType, _userId?: string): boolean {
    // 获取当前用户角色
    let userRole: string | null = null

    try {
      const userStore = useUserStore()
      userRole = userStore.currentUser?.role || null
    } catch (_error) {
      return false
    }

    if (!userRole) return false

    // 将敏感信息类型转换为数据库字段名
    const dbKey = SensitiveInfoProcessor.typeToDbKey(type)

    // 使用新的权限服务检查权限
    return sensitiveInfoPermissionService.hasPermission(userRole, dbKey)
  }

  /**
   * 获取用户对敏感信息的访问级别
   */
  public static getAccessLevel(type: SensitiveInfoType, _userId?: string): PermissionLevel {
    // 获取当前用户角色
    let userRole: string | null = null

    try {
      const userStore = useUserStore()
      userRole = userStore.currentUser?.role || null
    } catch (_error) {
      return PermissionLevel.RESTRICTED
    }

    if (!userRole) return PermissionLevel.RESTRICTED

    // 将敏感信息类型转换为数据库字段名
    const dbKey = SensitiveInfoProcessor.typeToDbKey(type)

    // 使用新的权限服务检查权限
    const hasAccess = sensitiveInfoPermissionService.hasPermission(userRole, dbKey)

    return hasAccess ? PermissionLevel.FULL_ACCESS : PermissionLevel.RESTRICTED
  }
}

// 导出便捷函数
export const {
  maskPhone,
  maskEmail,
  maskIdCard,
  maskWechat,
  maskAddress,
  maskBankAccount,
  maskFinancial,
  displaySensitiveInfo,
  canViewSensitiveInfo,
  getAccessLevel,
  maskByType,
  batchDisplaySensitiveInfo
} = SensitiveInfoProcessor

// 为了兼容性，提供别名导出
export const displaySensitiveInfoNew = SensitiveInfoProcessor.displaySensitiveInfo
