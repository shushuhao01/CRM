import { AppDataSource } from '../config/database'
import { v4 as uuidv4 } from 'uuid'
import { TenantContextManager } from '../utils/tenantContext'
import { deployConfig } from '../config/deploy'

import { log } from '../config/logger';
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
    log.info('[MessageCleanupService] 启动消息清理服务...')

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
    log.info('[MessageCleanupService] 消息清理服务已停止')
  }

  /**
   * 检查并执行清理
   * 🔥 租户隔离：SaaS模式下按租户独立执行清理
   */
  private async checkAndExecute() {
    if (this.isRunning) return

    try {
      if (deployConfig.isSaaS()) {
        // SaaS模式：遍历所有租户独立执行
        await this.executeForAllTenants()
      } else {
        // 私有模式：全局执行
        const config = await this.getConfig(null)
        if (!config || !config.enabled) return
        if (this.shouldExecuteNow(config)) {
          await this.executeCleanup(config, null)
        }
      }
    } catch (error) {
      log.error('[MessageCleanupService] 检查清理任务失败:', error)
    }
  }

  /**
   * 🔥 SaaS模式：遍历所有租户执行清理
   */
  private async executeForAllTenants() {
    try {
      // 查询所有有清理配置的租户
      const rows = await AppDataSource.query(
        `SELECT DISTINCT tenant_id FROM system_configs WHERE configKey = ? AND tenant_id IS NOT NULL`,
        [CONFIG_KEY]
      )

      // 也处理无租户ID的全局配置
      const tenantIds: (string | null)[] = rows.map((r: any) => r.tenant_id)
      if (tenantIds.length === 0) return

      for (const tenantId of tenantIds) {
        try {
          const config = await this.getConfig(tenantId)
          if (!config || !config.enabled) continue
          if (this.shouldExecuteNow(config)) {
            if (tenantId) {
              // 在租户上下文中执行
              await TenantContextManager.run({ tenantId }, async () => {
                await this.executeCleanup(config, tenantId)
              })
            } else {
              await this.executeCleanup(config, null)
            }
          }
        } catch (e) {
          log.error(`[MessageCleanupService] 租户 ${tenantId} 清理失败:`, e)
        }
      }
    } catch (error) {
      log.error('[MessageCleanupService] 遍历租户清理失败:', error)
    }
  }

  /**
   * 获取清理配置
   * 🔥 租户隔离：按租户读取独立配置
   */
  private async getConfig(tenantId: string | null): Promise<CleanupConfig | null> {
    try {
      let result
      if (tenantId) {
        result = await AppDataSource.query(
          `SELECT configValue FROM system_configs WHERE configKey = ? AND tenant_id = ?`,
          [CONFIG_KEY, tenantId]
        )
      } else {
        result = await AppDataSource.query(
          `SELECT configValue FROM system_configs WHERE configKey = ? AND tenant_id IS NULL`,
          [CONFIG_KEY]
        )
      }

      if (result[0]?.configValue) {
        return JSON.parse(result[0].configValue)
      }
      return null
    } catch (error) {
      log.error('[MessageCleanupService] 获取配置失败:', error)
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
   * 🔥 租户隔离：按租户ID过滤删除
   */
  private async executeCleanup(config: CleanupConfig, tenantId: string | null) {
    this.isRunning = true
    const label = tenantId ? `租户${tenantId}` : '全局'
    log.info(`[MessageCleanupService] 开始执行${label}自动清理，保留 ${config.retentionDays} 天...`)

    try {
      let result
      if (tenantId) {
        result = await AppDataSource.query(
          `DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY) AND tenant_id = ?`,
          [config.retentionDays, tenantId]
        )
      } else {
        result = await AppDataSource.query(
          `DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY) AND tenant_id IS NULL`,
          [config.retentionDays]
        )
      }

      const deletedCount = result.affectedRows || 0
      log.info(`[MessageCleanupService] ${label}自动清理完成，删除 ${deletedCount} 条记录`)

      // 记录清理历史（带租户ID）
      await AppDataSource.query(
        `INSERT INTO message_cleanup_history (id, cleanup_type, deleted_count, operator, remark, cleanup_time, tenant_id)
         VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
        [uuidv4(), 'auto', deletedCount, '系统', `自动清理 ${config.retentionDays} 天前的记录`, tenantId]
      )
    } catch (error) {
      log.error(`[MessageCleanupService] ${label}执行清理失败:`, error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 手动触发清理（供外部调用）
   * 🔥 租户隔离：按当前租户上下文过滤
   */
  async manualCleanup(days: number, operator: string, operatorId?: string): Promise<number> {
    try {
      const tenantId = TenantContextManager.getTenantId() || null

      let result
      if (tenantId) {
        result = await AppDataSource.query(
          `DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY) AND tenant_id = ?`,
          [days, tenantId]
        )
      } else {
        result = await AppDataSource.query(
          `DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [days]
        )
      }

      const deletedCount = result.affectedRows || 0

      // 记录清理历史（带租户ID）
      await AppDataSource.query(
        `INSERT INTO message_cleanup_history (id, cleanup_type, deleted_count, operator, operator_id, remark, cleanup_time, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [uuidv4(), 'manual', deletedCount, operator, operatorId, `手动清理 ${days} 天前的记录`, tenantId]
      )

      return deletedCount
    } catch (error) {
      log.error('[MessageCleanupService] 手动清理失败:', error)
      throw error
    }
  }
}

export const messageCleanupService = new MessageCleanupService()
export default messageCleanupService
