/**
 * API健康检查通知服务
 * 负责管理API健康检查失败时的通知逻辑
 * 只对超级管理员显示，并支持"今天不再提醒"和"一个月不再提醒"功能
 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'

export interface NotificationPreference {
  userId: string
  suppressUntil: number | null // 抑制提醒直到此时间戳
  suppressType: 'none' | 'today' | 'month' // 抑制类型
  lastNotificationTime: number | null // 上次通知时间
}

export class HealthCheckNotificationService {
  private static instance: HealthCheckNotificationService
  private readonly STORAGE_KEY = 'health_check_notification_preferences'
  private preferences = ref<Map<string, NotificationPreference>>(new Map())

  constructor() {
    this.loadPreferences()
  }

  static getInstance(): HealthCheckNotificationService {
    if (!HealthCheckNotificationService.instance) {
      HealthCheckNotificationService.instance = new HealthCheckNotificationService()
    }
    return HealthCheckNotificationService.instance
  }

  /**
   * 检查是否应该显示健康检查失败通知
   */
  shouldShowNotification(userId: string): boolean {
    const userStore = useUserStore()
    
    // 只对超级管理员显示通知
    if (!userStore.isSuperAdmin) {
      return false
    }

    const preference = this.preferences.value.get(userId)
    if (!preference) {
      return true // 首次显示
    }

    const now = Date.now()
    
    // 检查是否在抑制期内
    if (preference.suppressUntil && now < preference.suppressUntil) {
      return false
    }

    // 检查是否需要重置抑制状态
    if (preference.suppressUntil && now >= preference.suppressUntil) {
      this.resetSuppression(userId)
    }

    return true
  }

  /**
   * 显示API健康检查失败通知
   */
  async showHealthCheckFailureNotification(error: string): Promise<void> {
    const userStore = useUserStore()
    const userId = userStore.currentUser?.id

    if (!userId || !this.shouldShowNotification(userId)) {
      return
    }

    try {
      const result = await ElMessageBox({
        title: 'API健康检查失败',
        message: `
          <div style="margin-bottom: 15px;">
            <p style="color: #E6A23C; font-weight: bold;">⚠️ API服务连接失败</p>
            <p style="color: #666; margin: 8px 0;">错误信息: ${error}</p>
            <p style="color: #666; margin: 8px 0;">系统已自动切换到本地存储模式，数据功能不受影响。</p>
            <p style="color: #909399; font-size: 12px;">注: 只有超级管理员才能看到此提醒</p>
          </div>
        `,
        dangerouslyUseHTMLString: true,
        showCancelButton: true,
        confirmButtonText: '我知道了',
        cancelButtonText: '提醒选项',
        distinguishCancelAndClose: true,
        type: 'warning'
      })

      // 用户点击"我知道了"
      this.updateLastNotificationTime(userId)
      
    } catch (action) {
      if (action === 'cancel') {
        // 用户点击"提醒选项"，显示提醒偏好设置
        await this.showNotificationPreferences(userId)
      }
      // 其他情况（如点击关闭按钮）不做处理
    }
  }

  /**
   * 显示通知偏好设置对话框
   */
  private async showNotificationPreferences(userId: string): Promise<void> {
    try {
      const result = await ElMessageBox({
        title: '通知偏好设置',
        message: `
          <div style="margin-bottom: 15px;">
            <p style="margin-bottom: 12px;">选择API健康检查失败通知的提醒频率:</p>
          </div>
        `,
        dangerouslyUseHTMLString: true,
        showCancelButton: true,
        confirmButtonText: '今天不再提醒',
        cancelButtonText: '一个月不再提醒',
        distinguishCancelAndClose: true,
        type: 'info'
      })

      // 用户选择"今天不再提醒"
      this.setSuppression(userId, 'today')
      ElMessage.success('已设置今天不再提醒API健康检查失败')
      
    } catch (action) {
      if (action === 'cancel') {
        // 用户选择"一个月不再提醒"
        this.setSuppression(userId, 'month')
        ElMessage.success('已设置一个月内不再提醒API健康检查失败')
      }
    }
  }

  /**
   * 设置抑制提醒
   */
  private setSuppression(userId: string, type: 'today' | 'month'): void {
    const now = Date.now()
    let suppressUntil: number

    if (type === 'today') {
      // 今天不再提醒：到今天23:59:59
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      suppressUntil = tomorrow.getTime()
    } else {
      // 一个月不再提醒：30天后
      suppressUntil = now + (30 * 24 * 60 * 60 * 1000)
    }

    const preference: NotificationPreference = {
      userId,
      suppressUntil,
      suppressType: type,
      lastNotificationTime: now
    }

    this.preferences.value.set(userId, preference)
    this.savePreferences()
  }

  /**
   * 重置抑制状态
   */
  private resetSuppression(userId: string): void {
    const preference = this.preferences.value.get(userId)
    if (preference) {
      preference.suppressUntil = null
      preference.suppressType = 'none'
      this.preferences.value.set(userId, preference)
      this.savePreferences()
    }
  }

  /**
   * 更新最后通知时间
   */
  private updateLastNotificationTime(userId: string): void {
    const preference = this.preferences.value.get(userId) || {
      userId,
      suppressUntil: null,
      suppressType: 'none',
      lastNotificationTime: null
    }

    preference.lastNotificationTime = Date.now()
    this.preferences.value.set(userId, preference)
    this.savePreferences()
  }

  /**
   * 加载用户偏好设置
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        const preferencesMap = new Map<string, NotificationPreference>()
        
        Object.entries(data).forEach(([userId, preference]) => {
          preferencesMap.set(userId, preference as NotificationPreference)
        })
        
        this.preferences.value = preferencesMap
        console.log('[HealthCheckNotification] 偏好设置已加载')
      }
    } catch (error) {
      console.error('[HealthCheckNotification] 加载偏好设置失败:', error)
    }
  }

  /**
   * 保存用户偏好设置
   */
  private savePreferences(): void {
    try {
      const data: Record<string, NotificationPreference> = {}
      this.preferences.value.forEach((preference, userId) => {
        data[userId] = preference
      })
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
      console.log('[HealthCheckNotification] 偏好设置已保存')
    } catch (error) {
      console.error('[HealthCheckNotification] 保存偏好设置失败:', error)
    }
  }

  /**
   * 获取用户的通知偏好
   */
  getUserPreference(userId: string): NotificationPreference | null {
    return this.preferences.value.get(userId) || null
  }

  /**
   * 清除所有偏好设置（用于测试或重置）
   */
  clearAllPreferences(): void {
    this.preferences.value.clear()
    localStorage.removeItem(this.STORAGE_KEY)
    console.log('[HealthCheckNotification] 所有偏好设置已清除')
  }
}

// 导出单例实例
export const healthCheckNotificationService = HealthCheckNotificationService.getInstance()