import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';
import { authenticateToken } from '../../middleware/auth';
import { checkStorageLimit } from '../../middleware/checkTenantLimits';
import { tenantRawSQL, getCurrentTenantIdSafe } from '../../utils/tenantHelpers';
import { logApiCall, uploadRecording, getUploadUrl } from './helpers';

export function registerCallsRoutes(router: Router) {
router.post('/call/status', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const { callId, status, timestamp } = req.body
    const deviceId = req.headers['x-device-id'] as string

    if (!callId || !status) {
      return res.status(400).json({
        success: false,
        message: '参数不完整',
        code: 'INVALID_PARAMS'
      })
    }

    // 更新通话记录状态
    const t = tenantRawSQL()
    await AppDataSource.query(
      `UPDATE call_records SET
       call_status = ?,
       start_time = CASE WHEN ? = 'connected' AND start_time IS NULL THEN NOW() ELSE start_time END,
       updated_at = NOW()
       WHERE id = ?${t.sql}`,
      [status, status, callId, ...t.params]
    )

    await logApiCall({
      interfaceCode: 'mobile_call_status',
      method: 'POST',
      endpoint: '/api/v1/mobile/call/status',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId: currentUser?.userId || currentUser?.id,
      deviceId
    })

    // 推送PC端
    if (global.webSocketService) {
      global.webSocketService.sendToUser(currentUser?.userId || currentUser?.id, 'CALL_STATUS_CHANGED', {
        callId, status, timestamp
      })
    }

    res.json({ success: true })
  } catch (error) {
    log.error('上报通话状态失败:', error)
    res.status(500).json({
      success: false,
      message: '上报失败',
      code: 'SERVER_ERROR'
    })
  }
})

router.post('/call/end', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id
    const { callId, phoneNumber, status, startTime: callStartTime, endTime, duration, hasRecording } = req.body
    const deviceId = req.headers['x-device-id'] as string

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: '通话ID不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 检查通话记录是否存在
    const t = tenantRawSQL()
    const existingRecords = await AppDataSource.query(
      `SELECT id, start_time FROM call_records WHERE id = ?${t.sql}`,
      [callId, ...t.params]
    )

    const callEndTime = endTime ? new Date(endTime) : new Date()
    const callDuration = duration || 0

    if (existingRecords.length > 0) {
      // 记录存在，更新它
      // 只有当原记录没有 start_time 且 APP 传来了有效的 startTime 时才更新
      const existingStartTime = existingRecords[0].start_time
      let finalStartTime = existingStartTime

      if (!existingStartTime && callStartTime) {
        finalStartTime = new Date(callStartTime)
      } else if (!existingStartTime && callDuration > 0) {
        // 如果没有开始时间，根据结束时间和时长计算
        finalStartTime = new Date(callEndTime.getTime() - callDuration * 1000)
      }

      await AppDataSource.query(
        `UPDATE call_records SET
         call_status = ?,
         start_time = COALESCE(start_time, ?),
         end_time = ?,
         duration = ?,
         has_recording = ?,
         updated_at = NOW()
         WHERE id = ?${t.sql}`,
        [
          status || 'connected',
          finalStartTime,
          callEndTime,
          callDuration,
          hasRecording ? 1 : 0,
          callId,
          ...t.params
        ]
      )
      log.info('[通话结束] 更新通话记录:', callId)
    } else {
      // 记录不存在，创建新记录
      log.info('[通话结束] 未找到现有记录，创建新记录')

      // 根据通话持续时间计算正确的开始时间
      let finalStartTime: Date
      if (callStartTime) {
        finalStartTime = new Date(callStartTime)
      } else if (callDuration > 0) {
        finalStartTime = new Date(callEndTime.getTime() - callDuration * 1000)
      } else {
        finalStartTime = callEndTime
      }

      const tenantId = getCurrentTenantIdSafe() || null
      await AppDataSource.query(
        `INSERT INTO call_records (id, user_id, customer_phone, call_type, call_status, duration, has_recording, start_time, end_time, created_at, updated_at, tenant_id)
         VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
        [callId, userId, phoneNumber || '', status || 'connected', callDuration, hasRecording ? 1 : 0, finalStartTime, callEndTime, tenantId]
      )
      log.info('[通话结束] 创建新通话记录:', callId)
    }

    await logApiCall({
      interfaceCode: 'mobile_call_end',
      method: 'POST',
      endpoint: '/api/v1/mobile/call/end',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId: currentUser?.userId || currentUser?.id,
      deviceId
    })

    // 推送PC端
    if (global.webSocketService) {
      global.webSocketService.sendToUser(currentUser?.userId || currentUser?.id, 'CALL_ENDED', {
        callId, status, duration, hasRecording
      })
    }

    res.json({
      success: true,
      data: {
        callId,
        recordingUploadUrl: `/api/v1/mobile/recording/upload`
      }
    })
  } catch (error) {
    log.error('上报通话结束失败:', error)
    res.status(500).json({
      success: false,
      message: '上报失败',
      code: 'SERVER_ERROR'
    })
  }
})

router.post('/call/followup', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id
    const userName = currentUser?.realName || currentUser?.username || '未知'

    const {
      callId,           // 通话ID
      notes,            // 通话备注
      tags,             // 快捷标签：['意向', '无意向', '再联系', '成交']
      intention,        // 客户意向：high/medium/low/none
      followUpRequired, // 是否需要跟进
      nextFollowUpDate, // 下次跟进时间
      customerId        // 客户ID（可选，用于更新客户信息）
    } = req.body

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: '通话ID不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 1. 更新通话记录
    const updateFields: string[] = ['updated_at = NOW()']
    const updateParams: any[] = []

    if (notes !== undefined) {
      updateFields.push('notes = ?')
      updateParams.push(notes)
    }
    if (tags !== undefined) {
      updateFields.push('call_tags = ?')
      updateParams.push(JSON.stringify(tags))
    }
    if (followUpRequired !== undefined) {
      updateFields.push('follow_up_required = ?')
      updateParams.push(followUpRequired ? 1 : 0)
    }

    const t = tenantRawSQL()
    updateParams.push(callId)
    await AppDataSource.query(
      `UPDATE call_records SET ${updateFields.join(', ')} WHERE id = ?${t.sql}`,
      [...updateParams, ...t.params]
    )

    // 2. 获取通话记录信息
    const callRecords = await AppDataSource.query(
      `SELECT customer_id, customer_name, customer_phone FROM call_records WHERE id = ?${t.sql}`,
      [callId, ...t.params]
    )
    const callRecord = callRecords[0]
    const actualCustomerId = customerId || callRecord?.customer_id

    // 3. 创建跟进记录
    if (notes || tags?.length > 0) {
      const followUpId = `followup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

      // 构建跟进内容
      let followUpContent = notes || ''
      if (tags?.length > 0) {
        followUpContent += followUpContent ? `\n标签: ${tags.join(', ')}` : `标签: ${tags.join(', ')}`
      }

      // 使用正确的字段名：customer_intent 而不是 intention，call_tags 存储标签
      const tenantId = getCurrentTenantIdSafe() || null
      await AppDataSource.query(
        `INSERT INTO follow_up_records
         (id, call_id, customer_id, customer_name, follow_up_type, content, customer_intent,
          call_tags, next_follow_up_date, status, user_id, user_name, created_at, updated_at, tenant_id)
         VALUES (?, ?, ?, ?, 'call', ?, ?, ?, ?, 'completed', ?, ?, NOW(), NOW(), ?)`,
        [
          followUpId,
          callId,
          actualCustomerId || '',
          callRecord?.customer_name || '',
          followUpContent,
          intention || null,
          tags?.length > 0 ? JSON.stringify(tags) : null,
          nextFollowUpDate ? new Date(nextFollowUpDate) : null,
          userId,
          userName,
          tenantId
        ]
      )
    }

    // 4. 更新客户信息（如果有客户ID）
    if (actualCustomerId) {
      const customerUpdates: string[] = ['last_contact_time = NOW()', 'updated_at = NOW()']
      const customerParams: any[] = []

      // 更新下次跟进时间
      if (nextFollowUpDate) {
        customerUpdates.push('next_follow_time = ?')
        customerParams.push(new Date(nextFollowUpDate))
      }

      // 更新客户标签（合并现有标签）
      if (tags?.length > 0) {
        // 获取现有标签
        const customers = await AppDataSource.query(
          `SELECT tags FROM customers WHERE id = ?${t.sql}`,
          [actualCustomerId, ...t.params]
        )
        let existingTags: string[] = []
        if (customers[0]?.tags) {
          try {
            existingTags = JSON.parse(customers[0].tags)
          } catch (_e) {
            existingTags = []
          }
        }

        // 合并标签（去重）
        const mergedTags = [...new Set([...existingTags, ...tags])]
        customerUpdates.push('tags = ?')
        customerParams.push(JSON.stringify(mergedTags))
      }

      // 更新跟进状态
      if (intention) {
        const statusMap: Record<string, string> = {
          'high': 'interested',
          'medium': 'following',
          'low': 'cold',
          'none': 'new'
        }
        customerUpdates.push('follow_status = ?')
        customerParams.push(statusMap[intention] || 'following')
      }

      customerParams.push(actualCustomerId)
      await AppDataSource.query(
        `UPDATE customers SET ${customerUpdates.join(', ')} WHERE id = ?${t.sql}`,
        [...customerParams, ...t.params]
      )
    }

    await logApiCall({
      interfaceCode: 'mobile_call_followup',
      method: 'POST',
      endpoint: '/api/v1/mobile/call/followup',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId
    })

    // 5. 推送PC端更新
    if (global.webSocketService) {
      global.webSocketService.sendToUser(userId, 'CALL_FOLLOWUP_UPDATED', {
        callId,
        customerId: actualCustomerId,
        notes,
        tags,
        intention,
        followUpRequired,
        nextFollowUpDate
      })
    }

    res.json({
      code: 200,
      success: true,
      message: '跟进记录已保存',
      data: {
        callId,
        customerId: actualCustomerId,
        synced: true
      }
    })
  } catch (error) {
    log.error('提交通话跟进失败:', error)
    await logApiCall({
      interfaceCode: 'mobile_call_followup',
      method: 'POST',
      endpoint: '/api/v1/mobile/call/followup',
      responseCode: 500,
      responseTime: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : '未知错误',
      clientIp: req.ip,
      userAgent: req.headers['user-agent']
    })
    res.status(500).json({
      success: false,
      message: '保存失败',
      code: 'SERVER_ERROR'
    })
  }
})

router.get('/call/:callId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params
    log.info('[Mobile API] 获取通话详情, callId:', callId)

    // 获取通话记录 - 简化查询，不依赖 customers 表
    const t = tenantRawSQL()
    const records = await AppDataSource.query(
      `SELECT * FROM call_records WHERE id = ?${t.sql}`,
      [callId, ...t.params]
    )

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: '通话记录不存在',
        code: 'NOT_FOUND'
      })
    }

    const record = records[0]

    // 尝试获取相关跟进记录
    let followUps: any[] = []
    try {
      followUps = await AppDataSource.query(
        `SELECT * FROM follow_up_records WHERE call_id = ?${t.sql} ORDER BY created_at DESC`,
        [callId, ...t.params]
      )
    } catch (_e) {
      log.info('[Mobile API] 获取跟进记录失败，可能表不存在')
    }

    // 解析 call_tags
    let callTags: string[] = []
    if (record.call_tags) {
      try {
        callTags = typeof record.call_tags === 'string' ? JSON.parse(record.call_tags) : record.call_tags
      } catch (_e) {
        callTags = []
      }
    }

    res.json({
      code: 200,
      success: true,
      data: {
        id: record.id,
        customerId: record.customer_id,
        customerName: record.customer_name,
        customerPhone: record.customer_phone, // 返回完整号码，前端自行脱敏显示
        callType: record.call_type,
        callStatus: record.call_status,
        startTime: record.start_time,
        endTime: record.end_time,
        duration: record.duration || 0,
        hasRecording: record.has_recording === 1,
        recordingUrl: record.recording_url,
        notes: record.notes,
        callTags: callTags,
        followUpRequired: record.follow_up_required === 1,
        userId: record.user_id,
        userName: record.user_name,
        createdAt: record.created_at,
        followUpRecords: followUps.map((f: any) => ({
          id: f.id,
          content: f.content,
          intention: f.customer_intent || f.intention,
          nextFollowUpDate: f.next_follow_up_date,
          userName: f.user_name,
          createdAt: f.created_at
        }))
      }
    })
  } catch (error: any) {
    log.error('获取通话详情失败:', error.message, error.stack)
    res.status(500).json({
      success: false,
      message: '获取失败: ' + error.message,
      code: 'SERVER_ERROR'
    })
  }
})

router.get('/calls', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id
    const { page = 1, pageSize = 20, callType, callStatus, startDate, endDate } = req.query

    log.info('[Mobile API] 获取通话记录, userId:', userId, 'params:', { page, pageSize, callType, callStatus, startDate, endDate })

    // 先检查表是否存在
    try {
      await AppDataSource.query(`SELECT 1 FROM call_records LIMIT 1`)
    } catch (tableError: any) {
      log.error('[Mobile API] call_records 表不存在或无法访问:', tableError.message)
      // 返回空数据而不是错误
      return res.json({
        code: 200,
        success: true,
        data: {
          records: [],
          total: 0,
          page: Number(page),
          pageSize: Number(pageSize)
        }
      })
    }

    const t = tenantRawSQL()
    let query = `SELECT * FROM call_records WHERE user_id = ?${t.sql}`
    let countQuery = `SELECT COUNT(*) as total FROM call_records WHERE user_id = ?${t.sql}`
    const params: any[] = [userId, ...t.params]

    if (callType) {
      query += ` AND call_type = ?`
      countQuery += ` AND call_type = ?`
      params.push(callType)
    }
    if (callStatus) {
      query += ` AND call_status = ?`
      countQuery += ` AND call_status = ?`
      params.push(callStatus)
    }
    if (startDate) {
      query += ` AND DATE(start_time) >= ?`
      countQuery += ` AND DATE(start_time) >= ?`
      params.push(startDate)
    }
    if (endDate) {
      query += ` AND DATE(start_time) <= ?`
      countQuery += ` AND DATE(start_time) <= ?`
      params.push(endDate)
    }

    // 获取总数
    const countResult = await AppDataSource.query(countQuery, params)
    const total = countResult[0]?.total || 0

    // 分页
    query += ` ORDER BY start_time DESC LIMIT ? OFFSET ?`
    const offset = (Number(page) - 1) * Number(pageSize)
    params.push(Number(pageSize), offset)

    const records = await AppDataSource.query(query, params)
    log.info('[Mobile API] 查询到通话记录:', records.length, '条')

    res.json({
      code: 200,
      success: true,
      data: {
        records: records.map((r: any) => ({
          id: r.id,
          customerId: r.customer_id,
          customerName: r.customer_name,
          customerPhone: r.customer_phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
          callType: r.call_type,
          callStatus: r.call_status,
          startTime: r.start_time,
          duration: r.duration,
          hasRecording: r.has_recording === 1,
          notes: r.notes,
          callTags: r.call_tags ? (typeof r.call_tags === 'string' ? JSON.parse(r.call_tags) : r.call_tags) : []
        })),
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error: any) {
    log.error('获取通话记录失败:', error.message, error.stack)
    res.status(500).json({
      success: false,
      message: '获取失败: ' + error.message,
      code: 'SERVER_ERROR'
    })
  }
})

router.delete('/unbind', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const { deviceId } = req.body
    const userId = currentUser?.userId || currentUser?.id

    // 查找设备
    const t = tenantRawSQL()
    let query = `SELECT id, device_id, user_id FROM work_phones WHERE user_id = ? AND status = 'active'${t.sql}`
    const params: any[] = [userId, ...t.params]

    if (deviceId) {
      query += ` AND device_id = ?`
      params.push(deviceId)
    }

    const devices = await AppDataSource.query(query, params)

    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到绑定的设备',
        code: 'DEVICE_NOT_FOUND'
      })
    }

    const device = devices[0]

    // 更新设备状态
    await AppDataSource.query(
      `UPDATE work_phones SET
       status = 'inactive',
       online_status = 'offline',
       updated_at = NOW()
       WHERE id = ?${t.sql}`,
      [device.id, ...t.params]
    )

    // 记录解绑日志
    const tenantId = getCurrentTenantIdSafe() || null
    await AppDataSource.query(
      `INSERT INTO device_bind_logs (user_id, device_id, action, ip_address, remark, tenant_id)
       VALUES (?, ?, 'unbind', ?, '用户主动解绑', ?)`,
      [userId, device.device_id, req.ip, tenantId]
    )

    await logApiCall({
      interfaceCode: 'mobile_unbind',
      method: 'DELETE',
      endpoint: '/api/v1/mobile/unbind',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId,
      deviceId: device.device_id
    })

    // 通知APP设备已解绑（通过用户ID发送，因为设备可能已离线）
    if (global.webSocketService) {
      global.webSocketService.sendToUser(userId, 'DEVICE_UNBIND', {
        deviceId: device.device_id,
        reason: '设备已被解绑'
      })
    }

    res.json({
      success: true,
      message: '设备已解绑'
    })
  } catch (error) {
    log.error('解绑设备失败:', error)
    // 打印详细错误信息
    if (error instanceof Error) {
      log.error('错误详情:', error.message, error.stack)
    }
    res.status(500).json({
      success: false,
      message: '解绑失败: ' + (error instanceof Error ? error.message : '未知错误'),
      code: 'SERVER_ERROR'
    })
  }
})

router.post('/recording/upload', authenticateToken, checkStorageLimit, uploadRecording.single('file'), async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const { callId, duration: _duration } = req.body
    const file = req.file

    if (!callId || !file) {
      return res.status(400).json({
        success: false,
        message: '参数不完整',
        code: 'INVALID_PARAMS'
      })
    }

    const tenantCode = (req as any).__tenantCode || null
    const recordingUrl = getUploadUrl(tenantCode, 'recordings', file.filename)

    // 更新通话记录
    const t = tenantRawSQL()
    await AppDataSource.query(
      `UPDATE call_records SET
       recording_url = ?,
       has_recording = 1,
       updated_at = NOW()
       WHERE id = ?${t.sql}`,
      [recordingUrl, callId, ...t.params]
    )

    await logApiCall({
      interfaceCode: 'mobile_recording_upload',
      method: 'POST',
      endpoint: '/api/v1/mobile/recording/upload',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId: currentUser?.userId || currentUser?.id
    })

    res.json({
      success: true,
      data: {
        recordingUrl,
        fileSize: file.size
      }
    })
  } catch (error) {
    log.error('上传录音失败:', error)
    res.status(500).json({
      success: false,
      message: '上传失败',
      code: 'SERVER_ERROR'
    })
  }
})
}
