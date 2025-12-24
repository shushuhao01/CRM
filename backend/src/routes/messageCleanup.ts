import { Router, Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { authenticateToken, requireAdmin } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// 消息清理配置表名
const CONFIG_KEY = 'message_cleanup_config'

// 获取清理统计数据
router.get('/stats', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    let totalRecords = 0
    let expiredRecords = 0
    let oldestRecord = null
    let lastCleanup = null

    // 获取总记录数
    try {
      const totalResult = await AppDataSource.query(
        'SELECT COUNT(*) as count FROM notification_logs'
      )
      totalRecords = totalResult[0]?.count || 0
    } catch (_e) {
      // 表可能不存在，静默处理
    }

    // 获取配置中的保留天数
    let retentionDays = 30
    try {
      const configResult = await AppDataSource.query(
        `SELECT configValue FROM system_configs WHERE configKey = ?`,
        [CONFIG_KEY]
      )
      const config = configResult[0]?.configValue ? JSON.parse(configResult[0].configValue) : { retentionDays: 30 }
      retentionDays = config.retentionDays || 30
    } catch (_e) {
      // 配置不存在，使用默认值
    }

    // 获取可清理记录数（超过保留天数的记录）
    try {
      const expiredResult = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [retentionDays]
      )
      expiredRecords = expiredResult[0]?.count || 0
    } catch (_e) {
      // 表可能不存在，静默处理
    }

    // 获取最早记录时间
    try {
      const oldestResult = await AppDataSource.query(
        'SELECT MIN(created_at) as oldest FROM notification_logs'
      )
      oldestRecord = oldestResult[0]?.oldest
        ? new Date(oldestResult[0].oldest).toLocaleString('zh-CN')
        : null
    } catch (_e) {
      // 表可能不存在，静默处理
    }

    // 获取上次清理时间
    try {
      const lastCleanupResult = await AppDataSource.query(
        `SELECT cleanup_time FROM message_cleanup_history ORDER BY cleanup_time DESC LIMIT 1`
      )
      lastCleanup = lastCleanupResult[0]?.cleanup_time
        ? new Date(lastCleanupResult[0].cleanup_time).toLocaleString('zh-CN')
        : null
    } catch (_e) {
      // 表可能不存在，静默处理
    }

    res.json({
      totalRecords,
      expiredRecords,
      oldestRecord,
      lastCleanup
    })
  } catch (error: any) {
    console.error('获取清理统计失败:', error)
    // 静默返回默认值
    res.json({
      totalRecords: 0,
      expiredRecords: 0,
      oldestRecord: null,
      lastCleanup: null
    })
  }
})

// 获取清理配置
router.get('/config', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT configValue FROM system_configs WHERE configKey = ?`,
      [CONFIG_KEY]
    )

    if (result[0]?.configValue) {
      res.json(JSON.parse(result[0].configValue))
    } else {
      // 返回默认配置
      res.json({
        enabled: false,
        retentionDays: 30,
        cleanupMode: 'auto',
        cleanupTime: '02:00',
        cleanupFrequency: 'daily'
      })
    }
  } catch (error: any) {
    console.error('获取清理配置失败:', error)
    // 静默返回默认配置
    res.json({
      enabled: false,
      retentionDays: 30,
      cleanupMode: 'auto',
      cleanupTime: '02:00',
      cleanupFrequency: 'daily'
    })
  }
})

// 保存清理配置
router.post('/config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const config = req.body
    const configJson = JSON.stringify(config)

    // 检查配置是否存在
    const existing = await AppDataSource.query(
      `SELECT id FROM system_configs WHERE configKey = ?`,
      [CONFIG_KEY]
    )

    if (existing.length > 0) {
      await AppDataSource.query(
        `UPDATE system_configs SET configValue = ?, updatedAt = NOW() WHERE configKey = ?`,
        [configJson, CONFIG_KEY]
      )
    } else {
      await AppDataSource.query(
        `INSERT INTO system_configs (configKey, configValue, valueType, configGroup, description, isEnabled, isSystem, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, 'json', 'message_settings', '消息清理配置', 1, 0, 1, NOW(), NOW())`,
        [CONFIG_KEY, configJson]
      )
    }

    res.json({ message: '配置保存成功' })
  } catch (error: any) {
    console.error('保存清理配置失败:', error)
    res.status(500).json({ message: '保存配置失败: ' + (error.message || '未知错误') })
  }
})

// 执行手动清理
router.post('/execute', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { mode, days, beforeDate } = req.body
    const user = (req as any).user

    let deletedCount = 0
    let remark = ''

    if (mode === 'byDays') {
      if (!days || days < 1) {
        return res.status(400).json({ message: '请输入有效的保留天数' })
      }
      // 按天数清理
      const result = await AppDataSource.query(
        `DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days]
      )
      deletedCount = result.affectedRows || 0
      remark = `清理 ${days} 天前的记录`
    } else if (mode === 'byDate') {
      if (!beforeDate) {
        return res.status(400).json({ message: '请选择清理日期' })
      }
      // 按日期清理
      const result = await AppDataSource.query(
        `DELETE FROM notification_logs WHERE created_at < ?`,
        [beforeDate]
      )
      deletedCount = result.affectedRows || 0
      remark = `清理 ${beforeDate} 之前的记录`
    } else {
      return res.status(400).json({ message: '无效的清理模式' })
    }

    // 记录清理历史
    try {
      await AppDataSource.query(
        `INSERT INTO message_cleanup_history (id, cleanup_type, deleted_count, operator, operator_id, remark, cleanup_time)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), 'manual', deletedCount, user?.name || user?.username || '系统', user?.id, remark]
      )
    } catch (historyError) {
      console.error('记录清理历史失败:', historyError)
      // 不影响主流程
    }

    res.json({ deletedCount, message: `成功清理 ${deletedCount} 条记录` })
  } catch (error: any) {
    console.error('执行清理失败:', error)
    res.status(500).json({ message: '清理失败: ' + (error.message || '未知错误') })
  }
})

// 获取清理历史
router.get('/history', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT
        id,
        cleanup_type as cleanupType,
        deleted_count as deletedCount,
        operator,
        remark,
        DATE_FORMAT(cleanup_time, '%Y-%m-%d %H:%i:%s') as cleanupTime
       FROM message_cleanup_history
       ORDER BY cleanup_time DESC
       LIMIT 50`
    )

    res.json(result)
  } catch (error: any) {
    console.error('获取清理历史失败:', error)
    // 静默返回空数组
    res.json([])
  }
})

export default router
