import { log } from '../config/logger';
/**
 * 验证码服务
 * 用于存储和验证手机验证码
 *
 * 注意：当前使用内存存储，生产环境建议使用Redis
 */

interface CodeData {
  code: string
  phone: string
  createdAt: number
  expiresAt: number
}

class VerificationCodeService {
  // 内存存储（生产环境建议使用Redis）
  private codeStore: Map<string, CodeData> = new Map()

  // 验证码有效期（5分钟）
  private readonly CODE_EXPIRY = 5 * 60 * 1000

  // 发送间隔（60秒）
  private readonly SEND_INTERVAL = 60 * 1000

  /**
   * 存储验证码
   */
  async saveCode(phone: string, code: string): Promise<void> {
    const now = Date.now()
    const codeData: CodeData = {
      code,
      phone,
      createdAt: now,
      expiresAt: now + this.CODE_EXPIRY
    }

    this.codeStore.set(phone, codeData)

    // 自动清理过期验证码
    setTimeout(() => {
      this.codeStore.delete(phone)
    }, this.CODE_EXPIRY)

    log.info(`[VerificationCode] 验证码已保存: ${phone} (有效期5分钟)`)
  }

  /**
   * 验证验证码
   */
  async verifyCode(phone: string, code: string): Promise<{
    valid: boolean
    message?: string
  }> {
    const codeData = this.codeStore.get(phone)

    if (!codeData) {
      return {
        valid: false,
        message: '验证码不存在或已过期'
      }
    }

    // 检查是否过期
    if (Date.now() > codeData.expiresAt) {
      this.codeStore.delete(phone)
      return {
        valid: false,
        message: '验证码已过期'
      }
    }

    // 验证码匹配
    if (codeData.code !== code) {
      return {
        valid: false,
        message: '验证码错误'
      }
    }

    // 验证成功，删除验证码（防止重复使用）
    this.codeStore.delete(phone)

    log.info(`[VerificationCode] 验证成功: ${phone}`)
    return {
      valid: true
    }
  }

  /**
   * 检查是否可以发送验证码（防刷）
   */
  async canSendCode(phone: string): Promise<{
    canSend: boolean
    message?: string
    remainingSeconds?: number
  }> {
    const codeData = this.codeStore.get(phone)

    if (!codeData) {
      return { canSend: true }
    }

    const timeSinceLastSend = Date.now() - codeData.createdAt

    if (timeSinceLastSend < this.SEND_INTERVAL) {
      const remainingSeconds = Math.ceil((this.SEND_INTERVAL - timeSinceLastSend) / 1000)
      return {
        canSend: false,
        message: `请${remainingSeconds}秒后再试`,
        remainingSeconds
      }
    }

    return { canSend: true }
  }

  /**
   * 清理过期验证码（定时任务）
   */
  cleanExpiredCodes(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [phone, codeData] of this.codeStore.entries()) {
      if (now > codeData.expiresAt) {
        this.codeStore.delete(phone)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      log.info(`[VerificationCode] 清理了 ${cleanedCount} 个过期验证码`)
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalCodes: number
    validCodes: number
    expiredCodes: number
  } {
    const now = Date.now()
    let validCodes = 0
    let expiredCodes = 0

    for (const codeData of this.codeStore.values()) {
      if (now <= codeData.expiresAt) {
        validCodes++
      } else {
        expiredCodes++
      }
    }

    return {
      totalCodes: this.codeStore.size,
      validCodes,
      expiredCodes
    }
  }
}

// 创建单例
export const verificationCodeService = new VerificationCodeService()

// 定时清理过期验证码（每分钟执行一次）
setInterval(() => {
  verificationCodeService.cleanExpiredCodes()
}, 60 * 1000)
