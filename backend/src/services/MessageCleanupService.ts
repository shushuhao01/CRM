import { AppDataSource } from '../config/database'
import { v4 as uuidv4 } from 'uuid'

const CONFIG_KEY = 'message_cleanup_config'

interface CleanupConfig {
  enabled: boolean
  retentionDays: number
  cleanupMode: 'auto' | 'scheduled'
  cleanupTime: string
  cleanupFrequency: 'daily' | 'weekly' | 'monthly'
}

class MessageCleanupService {
  private timer: NodeJS.Timeout | null = null
  private isRunning = false

  /**
   * 启动清理服务
   */
  async start() {
    console.log('[MessageCleanupService] 启动消息清理服务...')

    // 每分钟检查一次是否需要执行清理
    this.timer = setInterval(() => {
      this.checkAndExecute()
    }, 60 * 1000) // 每分钟检查

    // 启动时立即检查一次
    this.checkAndExecute()
  }

  /**
   * 停止清理服务
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    console.log('[MessageCleanupService] 消息清理服务已停止')
  }

  /**
   * 检查并执行清理
   */
  private async checkAndExecute() {
    if (this.isRunning) return

    try {
      const config = await this.getConfig()
      if (!config || !config.enabled) return

      const shouldExecute = this.shouldExecuteNow(config)
      if (shouldExecute) {
        await this.executeCleanup(config)
      }
    } catch (error) {
      console.error('[MessageCleanupService] 检查清理任务失败:', error)
    }
  }

  /**
   * 获取清理配置
   */
  private async getConfig(): Promise<CleanupConfig | null> {
    try {
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_configs WHERE config_key = ?`,
        [CONFIG_KEY]
      )

      if (result[0]?.config_value) {
        return JSON.parse(result[0].config_value)
      }
      return null
    } catch (error) {
      console.error('[MessageCleanupService] 获取配置失败:', error)
      return null
    }
  }

  /**
   * 判断是否应该执行清理
   */
  private shouldExecuteNow(config: CleanupConfig): boolean {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    // 自动模式：每天凌晨2点执行
    if (config.cleanupMode === 'auto') {
      return currentTime === '02:00'
    }

    // 定时模式：按配置的时间执行
    if (config.cleanupMode === 'scheduled') {
      if (currentTime !== config.cleanupTime) return false

      const dayOfWeek = now.getDay()
      const dayOfMonth = now.getDate()

      switch (config.cleanupFrequency) {
        case 'daily':
          return true
        case 'weekly':
          return dayOfWeek === 0 // 每周日
        case 'monthly':
          return dayOfMonth === 1 // 每月1号
        default:
          return false
      }
    }

    return false
  }

  /**
   * 执行清理
   */
  private async executeCleanup(config: CleanupConfig) {
    this.isRunning = true
    console.log(`[MessageCleanupService] 开始执行自动清理，保留 ${config.retentionDays} 天内的记录...`)

    try {
      // 删除过期记录
      const result = await AppDataSource.query(
        `DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [config.retentionDays]
      )

      const deletedCount = result.affectedRows || 0
      console.log(`[MessageCleanupService] 自动清理完成，删除 ${deletedCount} 条记录`)

      // 记录清理历史
      await AppDataSource.query(
        `INSERT INTO message_cleanup_history (id, cleanup_type, deleted_count, operator, remark, cleanup_time)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), 'auto', deletedCount, '系统', `自动清理 ${config.retentionDays} 天前的记录`]
      )
    } catch (error) {
      console.error('[MessageCleanupService] 执行清理失败:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 手动触发清理（供外部调用）
   */
  async manualCleanup(days: number, operator: string, operatorId?: string): Promise<number> {
    try {
      const result = await AppDataSource.query(
        `DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days]
      )

      const deletedCount = result.affectedRows || 0

      // 记录清理历史
      await AppDataSource.query(
        `INSERT INTO message_cleanup_history (id, cleanup_type, deleted_count, operator, operator_id, remark, cleanup_time)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), 'manual', deletedCount, operator, operatorId, `手动清理 ${days} 天前的记录`]
      )

      return deletedCount
    } catch (error) {
      console.error('[MessageCleanupService] 手动清理失败:', error)
      throw error
    }
  }
}

export const messageCleanupService = new MessageCleanupService()
export default messageCleanupService
