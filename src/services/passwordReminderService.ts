import { passwordService } from './passwordService'
import type { User } from '@/stores/user'

export interface ReminderConfig {
  enabled: boolean
  minInterval: number // 最小间隔时间（毫秒）
  maxInterval: number // 最大间隔时间（毫秒）
  maxRemindersPerDay: number // 每日最大提醒次数
}

class PasswordReminderService {
  private timerId: number | null = null
  private reminderCount = 0
  private lastReminderDate = ''
  private config: ReminderConfig = {
    enabled: true,
    minInterval: 2 * 60 * 60 * 1000, // 最少2小时
    maxInterval: 6 * 60 * 60 * 1000, // 最多6小时
    maxRemindersPerDay: 3 // 每日最多3次
  }

  private onReminderCallback: (() => void) | null = null

  /**
   * 启动密码提醒定时器
   */
  startReminder(user: User, onReminder: () => void) {
    if (!this.config.enabled || !user) return

    this.onReminderCallback = onReminder
    this.resetDailyCountIfNeeded()
    
    // 如果今日已达到最大提醒次数，则不再设置定时器
    if (this.reminderCount >= this.config.maxRemindersPerDay) {
      return
    }

    this.scheduleNextReminder(user)
  }

  /**
   * 停止密码提醒定时器
   */
  stopReminder() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.onReminderCallback = null
  }

  /**
   * 安排下一次提醒
   */
  private scheduleNextReminder(user: User) {
    // 检查用户是否需要密码提醒
    if (!passwordService.needsPasswordReminder(user)) {
      return
    }

    // 生成随机间隔时间
    const randomInterval = Math.floor(
      Math.random() * (this.config.maxInterval - this.config.minInterval) + this.config.minInterval
    )

    this.timerId = window.setTimeout(() => {
      this.handleReminder(user)
    }, randomInterval)

    console.log(`下次密码提醒将在 ${Math.round(randomInterval / 1000 / 60)} 分钟后触发`)
  }

  /**
   * 处理提醒逻辑
   */
  private handleReminder(user: User) {
    this.resetDailyCountIfNeeded()

    // 检查是否已达到每日最大提醒次数
    if (this.reminderCount >= this.config.maxRemindersPerDay) {
      console.log('今日密码提醒次数已达上限')
      return
    }

    // 检查用户是否仍需要提醒
    if (!passwordService.needsPasswordReminder(user)) {
      return
    }

    // 检查今日是否已设置不再提醒
    const dontRemindTodayKey = `password_reminder_${user.id}_${new Date().toDateString()}`
    const dontRemindToday = localStorage.getItem(dontRemindTodayKey) === 'true'
    
    if (!dontRemindToday) {
      // 触发提醒回调
      if (this.onReminderCallback) {
        this.onReminderCallback()
        this.reminderCount++
        this.saveReminderState()
      }
    }

    // 安排下一次提醒
    this.scheduleNextReminder(user)
  }

  /**
   * 重置每日计数（如果是新的一天）
   */
  private resetDailyCountIfNeeded() {
    const today = new Date().toDateString()
    if (this.lastReminderDate !== today) {
      this.reminderCount = 0
      this.lastReminderDate = today
      this.saveReminderState()
    }
  }

  /**
   * 保存提醒状态到本地存储
   */
  private saveReminderState() {
    const state = {
      reminderCount: this.reminderCount,
      lastReminderDate: this.lastReminderDate
    }
    localStorage.setItem('passwordReminderState', JSON.stringify(state))
  }

  /**
   * 从本地存储加载提醒状态
   */
  private loadReminderState() {
    try {
      const stateStr = localStorage.getItem('passwordReminderState')
      if (stateStr) {
        const state = JSON.parse(stateStr)
        this.reminderCount = state.reminderCount || 0
        this.lastReminderDate = state.lastReminderDate || ''
      }
    } catch (error) {
      console.error('加载密码提醒状态失败:', error)
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ReminderConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ReminderConfig {
    return { ...this.config }
  }

  /**
   * 获取今日提醒次数
   */
  getTodayReminderCount(): number {
    this.resetDailyCountIfNeeded()
    return this.reminderCount
  }

  /**
   * 初始化服务
   */
  init() {
    this.loadReminderState()
    this.resetDailyCountIfNeeded()
  }
}

export const passwordReminderService = new PasswordReminderService()