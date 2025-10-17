import type { User } from '@/stores/user'

// 密码策略配置
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  expirationDays: 60, // 密码60天过期
  reminderDays: 7, // 过期前7天提醒
  defaultPassword: '123456' // 默认密码
}

// 密码验证结果
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

// 密码更改请求
export interface PasswordChangeRequest {
  userId: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// 密码重置请求
export interface PasswordResetRequest {
  userId: string
  newPassword: string
  resetByAdmin: boolean
  adminId?: string
}

class PasswordService {
  // 验证密码强度
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = []

    if (password.length < PASSWORD_POLICY.minLength) {
      errors.push(`密码长度至少${PASSWORD_POLICY.minLength}位`)
    }

    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母')
    }

    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母')
    }

    if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
      errors.push('密码必须包含数字')
    }

    if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码必须包含特殊字符')
    }

    if (password === PASSWORD_POLICY.defaultPassword) {
      errors.push('不能使用默认密码')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // 检查是否为默认密码
  isDefaultPassword(password: string): boolean {
    return password === PASSWORD_POLICY.defaultPassword
  }

  // 检查密码是否过期
  isPasswordExpired(user: User): boolean {
    if (!user.passwordLastChanged) {
      return true // 如果没有修改记录，认为已过期
    }

    const expirationDate = new Date(user.passwordLastChanged)
    expirationDate.setDate(expirationDate.getDate() + PASSWORD_POLICY.expirationDays)
    
    return new Date() > expirationDate
  }

  // 检查是否需要密码过期提醒
  needsPasswordReminder(user: User): boolean {
    if (!user.passwordLastChanged) {
      return true
    }

    const reminderDate = new Date(user.passwordLastChanged)
    reminderDate.setDate(reminderDate.getDate() + PASSWORD_POLICY.expirationDays - PASSWORD_POLICY.reminderDays)
    
    return new Date() > reminderDate && !this.isPasswordExpired(user)
  }

  // 计算密码剩余天数
  getPasswordRemainingDays(user: User): number {
    if (!user.passwordLastChanged) {
      return 0
    }

    const expirationDate = new Date(user.passwordLastChanged)
    expirationDate.setDate(expirationDate.getDate() + PASSWORD_POLICY.expirationDays)
    
    const today = new Date()
    const diffTime = expirationDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  // 更改密码
  async changePassword(request: PasswordChangeRequest): Promise<{ success: boolean; message: string }> {
    try {
      // 验证新密码
      const validation = this.validatePassword(request.newPassword)
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors.join(', ')
        }
      }

      // 验证确认密码
      if (request.newPassword !== request.confirmPassword) {
        return {
          success: false,
          message: '新密码和确认密码不匹配'
        }
      }

      // 调用真实的API
      try {
        const { apiService } = await import('./apiService')
        const response = await apiService.put('/profile/password', {
          currentPassword: request.currentPassword,
          newPassword: request.newPassword,
          confirmPassword: request.confirmPassword
        })

        // 更新用户密码信息
        this.updateUserPasswordInfo(request.userId || 'current', {
          isDefaultPassword: false,
          passwordLastChanged: new Date(),
          forcePasswordChange: false
        })

        return {
          success: true,
          message: response.message || '密码修改成功'
        }
      } catch (apiError: any) {
        // 如果API调用失败，返回错误信息
        const errorMessage = apiError.response?.data?.message || apiError.message || '密码修改失败'
        return {
          success: false,
          message: errorMessage
        }
      }
    } catch (error) {
      return {
        success: false,
        message: '密码修改失败，请稍后重试'
      }
    }
  }

  // 重置密码（管理员功能）- 使用请求对象
  async resetPassword(request: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
    try {
      // 验证新密码
      const validation = this.validatePassword(request.newPassword)
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors.join(', ')
        }
      }

      // 模拟API调用
      await this.simulateApiCall()

      // 更新用户密码信息
      this.updateUserPasswordInfo(request.userId, {
        isDefaultPassword: false,
        passwordLastChanged: new Date(),
        forcePasswordChange: true // 重置后强制用户下次登录时修改
      })

      return {
        success: true,
        message: '密码重置成功，用户下次登录时需要修改密码'
      }
    } catch (error) {
      return {
        success: false,
        message: '密码重置失败，请稍后重试'
      }
    }
  }

  // 重置密码（管理员功能）- 简化版本，自动生成临时密码
  async resetPasswordByAdmin(userId: string, adminId: string): Promise<{ success: boolean; message: string; tempPassword?: string }> {
    try {
      // 生成临时密码
      const tempPassword = this.generateTemporaryPassword()

      // 模拟API调用
      await this.simulateApiCall()

      // 更新用户密码信息
      this.updateUserPasswordInfo(userId, {
        isDefaultPassword: false,
        passwordLastChanged: new Date(),
        forcePasswordChange: true // 重置后强制用户下次登录时修改
      })

      return {
        success: true,
        message: '密码重置成功，用户下次登录时需要修改密码',
        tempPassword: tempPassword
      }
    } catch (error) {
      return {
        success: false,
        message: '密码重置失败，请稍后重试'
      }
    }
  }

  // 生成临时密码
  generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let result = ''
    
    // 确保包含各种字符类型
    result += 'A' // 大写字母
    result += 'a' // 小写字母
    result += '1' // 数字
    result += '!' // 特殊字符
    
    // 填充剩余位数
    for (let i = 4; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // 打乱字符顺序
    return result.split('').sort(() => Math.random() - 0.5).join('')
  }

  // 初始化用户密码信息
  initializeUserPasswordInfo(userId: string): void {
    const users = this.getStoredUsers()
    const user = users.find(u => u.id === userId)
    
    if (user && !user.passwordLastChanged) {
      user.isDefaultPassword = true
      user.passwordLastChanged = new Date()
      user.forcePasswordChange = true
      
      localStorage.setItem('users', JSON.stringify(users))
    }
  }

  // 更新用户密码信息
  private updateUserPasswordInfo(userId: string, updates: Partial<User>): void {
    const users = this.getStoredUsers()
    const userIndex = users.findIndex(u => u.id === userId)
    
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates }
      localStorage.setItem('users', JSON.stringify(users))
    }
  }

  // 获取存储的用户数据
  private getStoredUsers(): User[] {
    const stored = localStorage.getItem('users')
    return stored ? JSON.parse(stored) : []
  }

  // 模拟API调用
  private async simulateApiCall(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 1000)
    })
  }
}

export const passwordService = new PasswordService()