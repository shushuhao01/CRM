import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';
import { authenticateToken } from '../../middleware/auth';
import { tenantRawSQL } from '../../utils/tenantHelpers';

export function registerStatsRoutes(router: Router) {
router.get('/stats/today', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id

    log.info('[Mobile API] 获取今日统计, userId:', userId)

    // 先检查表是否存在
    try {
      await AppDataSource.query(`SELECT 1 FROM call_records LIMIT 1`)
    } catch (tableError: any) {
      log.error('[Mobile API] call_records 表不存在:', tableError.message)
      // 返回空统计数据
      return res.json({
        code: 200,
        success: true,
        data: {
          totalCalls: 0,
          connectedCalls: 0,
          missedCalls: 0,
          inboundCalls: 0,
          outboundCalls: 0,
          totalDuration: 0,
          avgDuration: 0,
          connectRate: 0
        }
      })
    }

    const t = tenantRawSQL()
    const stats = await AppDataSource.query(
      `SELECT
        COUNT(*) as totalCalls,
        SUM(CASE WHEN call_status = 'connected' THEN 1 ELSE 0 END) as connectedCalls,
        SUM(CASE WHEN call_status IN ('missed', 'busy', 'failed', 'rejected') THEN 1 ELSE 0 END) as missedCalls,
        SUM(CASE WHEN call_type = 'inbound' THEN 1 ELSE 0 END) as inboundCalls,
        SUM(CASE WHEN call_type = 'outbound' THEN 1 ELSE 0 END) as outboundCalls,
        SUM(duration) as totalDuration,
        AVG(CASE WHEN call_status = 'connected' THEN duration ELSE NULL END) as avgDuration
       FROM call_records
       WHERE user_id = ? AND DATE(start_time) = CURDATE()${t.sql}`,
      [userId, ...t.params]
    )

    const stat = stats[0] || {}

    res.json({
      code: 200,
      success: true,
      data: {
        totalCalls: stat.totalCalls || 0,
        connectedCalls: stat.connectedCalls || 0,
        missedCalls: stat.missedCalls || 0,
        inboundCalls: stat.inboundCalls || 0,
        outboundCalls: stat.outboundCalls || 0,
        totalDuration: stat.totalDuration || 0,
        avgDuration: Math.round(stat.avgDuration || 0),
        connectRate: stat.totalCalls > 0
          ? Math.round((stat.connectedCalls / stat.totalCalls) * 100)
          : 0
      }
    })
  } catch (error: any) {
    log.error('获取今日统计失败:', error.message, error.stack)
    log.error('获取今日统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取失败',
      code: 'SERVER_ERROR'
    })
  }
})

router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id
    const { period = 'today' } = req.query

    log.info('[Mobile API] 获取统计, userId:', userId, 'period:', period)

    // 先检查表是否存在
    try {
      await AppDataSource.query(`SELECT 1 FROM call_records LIMIT 1`)
    } catch (tableError: any) {
      log.error('[Mobile API] call_records 表不存在:', tableError.message)
      return res.json({
        code: 200,
        success: true,
        data: {
          period,
          totalCalls: 0,
          connectedCalls: 0,
          missedCalls: 0,
          inboundCalls: 0,
          outboundCalls: 0,
          totalDuration: 0,
          avgDuration: 0,
          connectRate: 0
        }
      })
    }

    // 根据时间范围构建日期条件
    let dateCondition = 'DATE(start_time) = CURDATE()'
    if (period === 'week') {
      dateCondition = 'start_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)'
    } else if (period === 'month') {
      dateCondition = 'start_time >= DATE_FORMAT(CURDATE(), "%Y-%m-01")'
    }

    const t = tenantRawSQL()
    const stats = await AppDataSource.query(
      `SELECT
        COUNT(*) as totalCalls,
        SUM(CASE WHEN call_status = 'connected' THEN 1 ELSE 0 END) as connectedCalls,
        SUM(CASE WHEN call_status IN ('missed', 'busy', 'failed', 'rejected') THEN 1 ELSE 0 END) as missedCalls,
        SUM(CASE WHEN call_type = 'inbound' THEN 1 ELSE 0 END) as inboundCalls,
        SUM(CASE WHEN call_type = 'outbound' THEN 1 ELSE 0 END) as outboundCalls,
        SUM(duration) as totalDuration,
        AVG(CASE WHEN call_status = 'connected' THEN duration ELSE NULL END) as avgDuration
       FROM call_records
       WHERE user_id = ? AND ${dateCondition}${t.sql}`,
      [userId, ...t.params]
    )

    const stat = stats[0] || {}

    res.json({
      code: 200,
      success: true,
      data: {
        period,
        totalCalls: stat.totalCalls || 0,
        connectedCalls: stat.connectedCalls || 0,
        missedCalls: stat.missedCalls || 0,
        inboundCalls: stat.inboundCalls || 0,
        outboundCalls: stat.outboundCalls || 0,
        totalDuration: stat.totalDuration || 0,
        avgDuration: Math.round(stat.avgDuration || 0),
        connectRate: stat.totalCalls > 0
          ? Math.round((stat.connectedCalls / stat.totalCalls) * 100)
          : 0
      }
    })
  } catch (error: any) {
    log.error('获取统计失败:', error.message, error.stack)
    res.status(500).json({
      success: false,
      message: '获取失败: ' + error.message,
      code: 'SERVER_ERROR'
    })
  }
})

router.get('/interfaces/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 总体统计
    const totalStats = await AppDataSource.query(
      `SELECT
        COUNT(*) as totalInterfaces,
        SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabledCount,
        SUM(call_count) as totalCalls,
        SUM(success_count) as totalSuccess,
        SUM(fail_count) as totalFail
       FROM api_interfaces`
    )

    // 今日调用统计
    const todayStats = await AppDataSource.query(
      `SELECT
        COUNT(*) as todayCalls,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as todaySuccess,
        AVG(response_time) as avgResponseTime
       FROM api_call_logs
       WHERE DATE(created_at) = CURDATE()`
    )

    // 绑定设备统计
    const tDev = tenantRawSQL()
    const deviceStats = await AppDataSource.query(
      `SELECT
        COUNT(*) as totalDevices,
        SUM(CASE WHEN online_status = 'online' THEN 1 ELSE 0 END) as onlineDevices
       FROM work_phones
       WHERE status = 'active'${tDev.sql}`,
      [...tDev.params]
    )

    res.json({
      code: 200,
      success: true,
      data: {
        interfaces: {
          total: totalStats[0]?.totalInterfaces || 0,
          enabled: totalStats[0]?.enabledCount || 0,
          disabled: (totalStats[0]?.totalInterfaces || 0) - (totalStats[0]?.enabledCount || 0)
        },
        calls: {
          total: totalStats[0]?.totalCalls || 0,
          success: totalStats[0]?.totalSuccess || 0,
          fail: totalStats[0]?.totalFail || 0,
          successRate: totalStats[0]?.totalCalls > 0
            ? Math.round((totalStats[0]?.totalSuccess / totalStats[0]?.totalCalls) * 100)
            : 0
        },
        today: {
          calls: todayStats[0]?.todayCalls || 0,
          success: todayStats[0]?.todaySuccess || 0,
          avgResponseTime: Math.round(todayStats[0]?.avgResponseTime || 0)
        },
        devices: {
          total: deviceStats[0]?.totalDevices || 0,
          online: deviceStats[0]?.onlineDevices || 0
        }
      }
    })
  } catch (error) {
    log.error('获取接口统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取统计失败'
    })
  }
})
}
