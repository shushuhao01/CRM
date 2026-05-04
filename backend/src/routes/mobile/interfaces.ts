import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';
import { authenticateToken } from '../../middleware/auth';
import { tenantRawSQL } from '../../utils/tenantHelpers';

export function registerInterfacesRoutes(router: Router) {
router.get('/interfaces', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category, keyword, status, page = 1, pageSize = 10 } = req.query

    let whereClause = `WHERE 1=1`
    const params: any[] = []

    if (category) {
      whereClause += ` AND category = ?`
      params.push(category)
    }
    if (keyword) {
      whereClause += ` AND (name LIKE ? OR code LIKE ? OR endpoint LIKE ?)`
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }
    if (status === 'enabled') {
      whereClause += ` AND is_enabled = 1`
    } else if (status === 'disabled') {
      whereClause += ` AND is_enabled = 0`
    }

    // 获取总数
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM api_interfaces ${whereClause}`, params
    )
    const total = countResult[0]?.total || 0

    // 分页查询
    const offset = (Number(page) - 1) * Number(pageSize)
    const dataParams = [...params, Number(pageSize), offset]
    const interfaces = await AppDataSource.query(
      `SELECT * FROM api_interfaces ${whereClause} ORDER BY category, id LIMIT ? OFFSET ?`,
      dataParams
    )

    res.json({
      code: 200,
      success: true,
      data: {
        list: interfaces.map((item: any) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.description,
          category: item.category,
          endpoint: item.endpoint,
          method: item.method,
          isEnabled: item.is_enabled === 1,
          authRequired: item.auth_required === 1,
          rateLimit: item.rate_limit,
          lastCalledAt: item.last_called_at,
          callCount: item.call_count,
          successCount: item.success_count,
          failCount: item.fail_count,
          avgResponseTime: item.avg_response_time,
          successRate: item.call_count > 0
            ? Math.round((item.success_count / item.call_count) * 100)
            : 0
        })),
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    log.error('获取接口列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取接口列表失败'
    })
  }
})

router.put('/interfaces/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { isEnabled, rateLimit, description } = req.body

    const updates: string[] = []
    const params: any[] = []

    if (isEnabled !== undefined) {
      updates.push('is_enabled = ?')
      params.push(isEnabled ? 1 : 0)
    }
    if (rateLimit !== undefined) {
      updates.push('rate_limit = ?')
      params.push(rateLimit)
    }
    if (description !== undefined) {
      updates.push('description = ?')
      params.push(description)
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的内容'
      })
    }

    params.push(id)
    await AppDataSource.query(
      `UPDATE api_interfaces SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    )

    res.json({
      code: 200,
      success: true,
      message: '更新成功'
    })
  } catch (error) {
    log.error('更新接口状态失败:', error)
    res.status(500).json({
      success: false,
      message: '更新失败'
    })
  }
})

router.get('/interfaces/logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { interfaceCode, success, page = 1, pageSize = 20 } = req.query

    let query = `SELECT * FROM api_call_logs WHERE 1=1`
    let countQuery = `SELECT COUNT(*) as total FROM api_call_logs WHERE 1=1`
    const params: any[] = []

    if (interfaceCode) {
      query += ` AND (endpoint LIKE ? OR api_key = ?)`
      countQuery += ` AND (endpoint LIKE ? OR api_key = ?)`
      params.push(`%${interfaceCode}%`, interfaceCode)
    }
    if (success !== undefined) {
      if (success === 'true') {
        query += ` AND response_status < 400`
        countQuery += ` AND response_status < 400`
      } else {
        query += ` AND (response_status >= 400 OR response_status IS NULL)`
        countQuery += ` AND (response_status >= 400 OR response_status IS NULL)`
      }
    }

    // 获取总数
    const countResult = await AppDataSource.query(countQuery, params)
    const total = countResult[0]?.total || 0

    // 分页查询
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    const offset = (Number(page) - 1) * Number(pageSize)
    params.push(Number(pageSize), offset)

    const logs = await AppDataSource.query(query, params)

    res.json({
      code: 200,
      success: true,
      data: {
        logs: logs.map((logItem: any) => ({
          id: logItem.id,
          interfaceCode: logItem.api_key || logItem.endpoint,
          method: logItem.method,
          endpoint: logItem.endpoint,
          responseCode: logItem.response_status,
          responseTime: logItem.response_time,
          success: logItem.response_status != null && logItem.response_status < 400,
          errorMessage: logItem.error_message,
          clientIp: logItem.ip_address,
          userId: logItem.api_config_id,
          deviceId: null,
          createdAt: logItem.created_at
        })),
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    log.error('获取调用日志失败:', error)
    res.status(500).json({
      success: false,
      message: '获取日志失败'
    })
  }
})

router.get('/interfaces/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 总体统计（表可能不存在，独立 try-catch）
    let totalStats: any[] = [{}]
    try {
      totalStats = await AppDataSource.query(
        `SELECT
          COUNT(*) as totalInterfaces,
          SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabledCount,
          SUM(call_count) as totalCalls,
          SUM(success_count) as totalSuccess,
          SUM(fail_count) as totalFail
         FROM api_interfaces`
      )
    } catch (e: any) {
      log.warn('查询 api_interfaces 统计失败（表可能不存在）:', e.message)
    }

    // 今日调用统计
    let todayStats: any[] = [{}]
    try {
      todayStats = await AppDataSource.query(
        `SELECT
          COUNT(*) as todayCalls,
          SUM(CASE WHEN response_status IS NOT NULL AND response_status < 400 THEN 1 ELSE 0 END) as todaySuccess,
          AVG(response_time) as avgResponseTime
         FROM api_call_logs
         WHERE DATE(created_at) = CURDATE()`
      )
    } catch (e: any) {
      log.warn('查询 api_call_logs 统计失败（表可能不存在）:', e.message)
    }

    // 绑定设备统计
    let deviceStats: any[] = [{}]
    try {
      const tDev = tenantRawSQL()
      deviceStats = await AppDataSource.query(
        `SELECT
          COUNT(*) as totalDevices,
          SUM(CASE WHEN online_status = 'online' THEN 1 ELSE 0 END) as onlineDevices
         FROM work_phones
         WHERE status = 'active'${tDev.sql}`,
        [...tDev.params]
      )
    } catch (e: any) {
      log.warn('查询 work_phones 统计失败（表可能不存在）:', e.message)
    }

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

// 获取单个接口详情
router.get('/interfaces/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const rows = await AppDataSource.query('SELECT * FROM api_interfaces WHERE id = ?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '接口不存在' })
    }
    const item = rows[0]
    res.json({
      code: 200,
      success: true,
      data: {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        category: item.category,
        endpoint: item.endpoint,
        method: item.method,
        isEnabled: item.is_enabled === 1,
        authRequired: item.auth_required === 1,
        rateLimit: item.rate_limit,
        lastCalledAt: item.last_called_at,
        callCount: item.call_count,
        successCount: item.success_count,
        failCount: item.fail_count,
        avgResponseTime: item.avg_response_time,
        successRate: item.call_count > 0
          ? Math.round((item.success_count / item.call_count) * 100)
          : 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }
    })
  } catch (error) {
    log.error('获取接口详情失败:', error)
    res.status(500).json({ success: false, message: '获取接口详情失败' })
  }
})

router.post('/interfaces/:id/reset', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await AppDataSource.query(
      `UPDATE api_interfaces SET
       call_count = 0,
       success_count = 0,
       fail_count = 0,
       avg_response_time = 0,
       last_called_at = NULL,
       updated_at = NOW()
       WHERE id = ?`,
      [id]
    )

    res.json({
      code: 200,
      success: true,
      message: '统计已重置'
    })
  } catch (error) {
    log.error('重置统计失败:', error)
    res.status(500).json({
      success: false,
      message: '重置失败'
    })
  }
})

// 清理历史日志（保留最近N天，默认30天）
router.delete('/interfaces/logs/clear', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query
    const result = await AppDataSource.query(
      `DELETE FROM api_call_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [Number(days)]
    )
    const deleted = result?.affectedRows || 0
    res.json({
      code: 200,
      success: true,
      message: `已清理 ${deleted} 条历史日志`,
      data: { deleted }
    })
  } catch (error) {
    log.error('清理日志失败:', error)
    res.status(500).json({ success: false, message: '清理日志失败' })
  }
})
}
