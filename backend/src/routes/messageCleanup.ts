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
    // 获取总记录数
    const totalResult = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM notification_logs'
    )
    const totalRecords = totalResult[0]?.count || 0

    // 获取配置中的保留天数
    const configResult = await AppDataSource.query(
      `SELECT config_value FROM system_configs WHERE config_key = ?`,
      [CONFIG_KEY]
    )
    const config = configResult[0]?.config_value ? JSON.parse(configResult[0].config_value) : { retentionDays: 30 }
    const retentionDays = config.retentionDays || 30

    // 获取可清理记录数（超过保留天数的记录）
    const expiredResult = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [retentionDays]
    )
    const expiredRecords = expiredResult[0]?.count || 0

    // 获取最早记录时间
    const oldestResult = await AppDataSource.query(
      'SELECT MIN(created_at) as oldest FROM notification_logs'
    )
    const oldestRecord = oldestResult[0]?.oldest
      ? new Date(oldestResult[0].oldest).toLocaleString('zh-CN')
      : null

    // 获取上次清理时间
    const lastCleanupResult = await AppDataSource.query(
      `SELECT cleanup_time FROM message_cleanup_history ORDER BY cleanup_time DESC LIMIT 1`
    )
    const lastCleanup = lastCleanupResult[0]?.cleanup_time
      ? new Date(lastCleanupResult[0].cleanup_time).toLocaleString('zh-CN')
      : null

    res.json({
      totalRecords,
      expiredRecords,
      oldestRecord,
      lastCleanup
    })
  } catch (error: any) {
    console.error('获取清理统计失败:', error)
    res.status(500).json({ message: '获取统计数据失败', error: error.message })
  }
})

// 获取清理配置
router.get('/config', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_configs WHERE config_key = ?`,
      [CONFIG_KEY]
    )

    if (result[0]?.config_value) {
      res.json(JSON.parse(result[0].config_value))
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
    res.status(500).json({ message: '获取配置失败', error: error.message })
  }
})

// 保存清理配置
router.post('/config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const config = req.body
    const configJson = JSON.stringify(config)

    // 检查配置是否存在
    const existing = await AppDataSource.query(
      `SELECT id FROM system_configs WHERE config_key = ?`,
      [CONFIG_KEY]
    )

    if (existing.length > 0) {
      await AppDataSource.query(
        `UPDATE system_configs SET config_value = ?, updated_at = NOW() WHERE config_key = ?`,
        [configJson, CONFIG_KEY]
      )
    } else {
      await AppDataSource.query(
        `INSERT INTO system_configs (id, config_key, config_value, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [uuidv4(), CONFIG_KEY, configJson, '消息清理配置']
      )
    }

    res.json({ message: '配置保存成功' })
  } catch (error: any) {
    console.error('保存清理配置失败:', error)
    res.status(500).json({ message: '保存配置失败', error: error.message })
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
      // 按天数清理
      const result = await AppDataSource.query(
        `DELETE FROM notification_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days]
      )
      deletedCount = result.affectedRows || 0
      remark = `清理 ${days} 天前的记录`
    } else if (mode === 'byDate') {
      // 按日期清理
      const result = await AppDataSource.query(
        `DELETE FROM notification_logs WHERE created_at < ?`,
        [beforeDate]
      )
      deletedCount = result.affectedRows || 0
      remark = `清理 ${beforeDate} 之前的记录`
    }

    // 记录清理历史
    await AppDataSource.query(
      `INSERT INTO message_cleanup_history (id, cleanup_type, deleted_count, operator, operator_id, remark, cleanup_time)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), 'manual', deletedCount, user?.name || user?.username || '系统', user?.id, remark]
    )

    res.json({ deletedCount, message: `成功清理 ${deletedCount} 条记录` })
  } catch (error: any) {
    console.error('执行清理失败:', error)
    res.status(500).json({ message: '清理失败', error: error.message })
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
    res.status(500).json({ message: '获取历史失败', error: error.message })
  }
})

export default router
