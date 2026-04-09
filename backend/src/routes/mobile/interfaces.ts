import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';
import { authenticateToken } from '../../middleware/auth';
import { tenantRawSQL } from '../../utils/tenantHelpers';

export function registerInterfacesRoutes(router: Router) {
router.get('/interfaces', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category } = req.query

    let query = `SELECT * FROM api_interfaces WHERE 1=1`
    const params: any[] = []

    if (category) {
      query += ` AND category = ?`
      params.push(category)
    }

    query += ` ORDER BY category, id`

    const interfaces = await AppDataSource.query(query, params)

    res.json({
      code: 200,
      success: true,
      data: interfaces.map((item: any) => ({
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
      }))
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
      query += ` AND interface_code = ?`
      countQuery += ` AND interface_code = ?`
      params.push(interfaceCode)
    }
    if (success !== undefined) {
      query += ` AND success = ?`
      countQuery += ` AND success = ?`
      params.push(success === 'true' ? 1 : 0)
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
        logs: logs.map((log: any) => ({
          id: log.id,
          interfaceCode: log.interface_code,
          method: log.method,
          endpoint: log.endpoint,
          responseCode: log.response_code,
          responseTime: log.response_time,
          success: log.success === 1,
          errorMessage: log.error_message,
          clientIp: log.client_ip,
          userId: log.user_id,
          deviceId: log.device_id,
          createdAt: log.created_at
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
}
