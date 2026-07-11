import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';
import { authenticateToken } from '../../middleware/auth';
import { checkStorageLimit } from '../../middleware/checkTenantLimits';
import { tenantRawSQL, getCurrentTenantIdSafe } from '../../utils/tenantHelpers';
import { logApiCall, uploadRecording, getUploadUrl } from './helpers';
import { messageService } from '../../services/messageService';
import { resolvePublicRecordingUrl } from '../../utils/recordingUrlHelper';
import { resolveTenantCode, getUploadDir } from '../../utils/tenantUploadHelper';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export function registerCallsRoutes(router: Router) {
router.post('/call/status', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id
    const { callId, status, timestamp, phoneNumber } = req.body
    const deviceId = req.headers['x-device-id'] as string

    if (!status) {
      return res.status(400).json({
        success: false,
        message: '状态不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 更新通话记录状态
    const t = tenantRawSQL()
    let resolvedCallId = callId

    if (callId) {
      // 有 callId 直接更新
      await AppDataSource.query(
        `UPDATE call_records SET
         call_status = ?,
         start_time = CASE WHEN ? = 'connected' AND start_time IS NULL THEN NOW() ELSE start_time END,
         updated_at = NOW()
         WHERE id = ?${t.sql}`,
        [status, status, callId, ...t.params]
      )
    } else if (phoneNumber && phoneNumber !== '未知来电') {
      // 无 callId 但有号码：查找该用户最近的 ringing 状态呼入记录
      const recentRecords = await AppDataSource.query(
        `SELECT id FROM call_records
         WHERE user_id = ? AND call_type = 'inbound' AND call_status = 'ringing'
         ${t.sql}
         ORDER BY created_at DESC LIMIT 1`,
        [String(userId), ...t.params]
      )
      if (recentRecords.length > 0) {
        resolvedCallId = recentRecords[0].id
        await AppDataSource.query(
          `UPDATE call_records SET
           call_status = ?,
           start_time = CASE WHEN ? = 'connected' AND start_time IS NULL THEN NOW() ELSE start_time END,
           updated_at = NOW()
           WHERE id = ?`,
          [status, status, resolvedCallId]
        )
      }
    }

    await logApiCall({
      interfaceCode: 'mobile_call_status',
      method: 'POST',
      endpoint: '/api/v1/mobile/call/status',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId,
      deviceId
    })

    // 无论 callId 是否匹配到记录，都转发状态给CRM端（让弹窗关闭）
    if (global.webSocketService) {
      global.webSocketService.sendToUser(userId, 'CALL_STATUS_CHANGED', {
        callId: resolvedCallId || '',
        status,
        phoneNumber: phoneNumber || '',
        timestamp: timestamp || new Date().toISOString()
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
    let existingRecords = await AppDataSource.query(
      `SELECT id, start_time FROM call_records WHERE id = ?${t.sql}`,
      [callId, ...t.params]
    )

    // 🔥 去重（与WS通道 handleCallEnded 一致）：APP传来的callId在库中不存在时，
    // 先按"同用户+同号码（或号码未知）+10分钟内的呼入记录"匹配已有记录并复用其id。
    // 否则WS通道按号码更新了原记录、HTTP通道又插入新记录 → 一通电话出现两条记录
    let resolvedCallId = callId
    if (existingRecords.length === 0) {
      try {
        const tm = tenantRawSQL()
        let matched: any[] = []
        if (phoneNumber && phoneNumber !== '未知来电') {
          matched = await AppDataSource.query(
            `SELECT id, start_time FROM call_records
             WHERE user_id = ? AND call_type = 'inbound'
               AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
               AND (customer_phone = ? OR customer_phone IS NULL OR customer_phone = '' OR customer_phone = '未知来电')
               ${tm.sql}
             ORDER BY created_at DESC LIMIT 1`,
            [String(userId), phoneNumber, ...tm.params]
          )
        } else {
          // 号码未知：只匹配"号码同样未知"的最近呼入记录（防串号）
          matched = await AppDataSource.query(
            `SELECT id, start_time FROM call_records
             WHERE user_id = ? AND call_type = 'inbound'
               AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
               AND (customer_phone IS NULL OR customer_phone = '' OR customer_phone = '未知来电')
               ${tm.sql}
             ORDER BY created_at DESC LIMIT 1`,
            [String(userId), ...tm.params]
          )
        }
        if (matched.length > 0) {
          resolvedCallId = matched[0].id
          existingRecords = matched
          log.info(`[通话结束] callId ${callId} 不存在，按号码匹配到已有记录 ${resolvedCallId}，复用更新`)
        }
      } catch (dedupeErr) {
        log.warn('[通话结束] 按号码匹配已有记录失败:', dedupeErr)
      }
    }

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
          resolvedCallId,
          ...t.params
        ]
      )
      log.info('[通话结束] 更新通话记录:', resolvedCallId)
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

      const tenantId = getCurrentTenantIdSafe() || currentUser?.tenantId || (req as any).tenantId || null
      const callType = req.body.callType || 'outbound'
      // 补充操作人姓名，避免CRM通话记录显示"系统"
      let userName = ''
      try {
        const userInfo = await AppDataSource.query(
          `SELECT name, real_name FROM users WHERE id = ? LIMIT 1`, [String(userId)]
        )
        userName = userInfo[0]?.real_name || userInfo[0]?.name || ''
      } catch (_e) { /* 忽略 */ }
      await AppDataSource.query(
        `INSERT INTO call_records (id, user_id, user_name, customer_phone, call_type, call_status, call_method, duration, has_recording, start_time, end_time, created_at, updated_at, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, 'mobile', ?, ?, ?, ?, NOW(), NOW(), ?)`,
        [resolvedCallId, userId, userName, phoneNumber || '', callType, status || 'connected', callDuration, hasRecording ? 1 : 0, finalStartTime, callEndTime, tenantId]
      )
      log.info('[通话结束] 创建新通话记录:', resolvedCallId)
    }

    // 通话结束后，如果号码有效，重新匹配客户信息并更新通话记录
    if (phoneNumber && phoneNumber !== '未知来电' && phoneNumber !== '') {
      try {
        const normalizedNum = phoneNumber.replace(/[\s\-()]/g, '').replace(/^(\+?86)?0?/, '')
        const possibleNums = [phoneNumber, normalizedNum, `+86${normalizedNum}`, `86${normalizedNum}`, `0${normalizedNum}`]
        const placeholders = possibleNums.map(() => '?').join(',')
        // 备用号码存在 other_phones JSON 数组中（customers 表没有 mobile 列）
        const otherPhonesCond = possibleNums.map(() => 'JSON_CONTAINS(c.other_phones, JSON_QUOTE(?))').join(' OR ')
        const t2 = tenantRawSQL()
        const customers = await AppDataSource.query(
          `SELECT id, name FROM customers c
           WHERE (REPLACE(REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '(', ''), ')', '') IN (${placeholders})
                  OR ${otherPhonesCond}
                 )${t2.sql}
           LIMIT 1`,
          [...possibleNums, ...possibleNums, ...t2.params]
        )
        if (customers.length > 0) {
          await AppDataSource.query(
            `UPDATE call_records SET customer_id = ?, customer_name = ?, customer_phone = ?, updated_at = NOW() WHERE id = ?${t2.sql}`,
            [customers[0].id, customers[0].name, phoneNumber, resolvedCallId, ...t2.params]
          )
          log.info('[通话结束] 重新匹配客户信息成功:', customers[0].name)
        }
      } catch (matchErr) {
        log.warn('[通话结束] 重新匹配客户信息失败:', matchErr)
      }
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
        callId: resolvedCallId, status, duration, hasRecording
      })
    }

    // 发送系统消息通知成员
    try {
      const tenantId = getCurrentTenantIdSafe() || ''
      const callRecords = await AppDataSource.query(
        `SELECT customer_name, customer_phone, call_type FROM call_records WHERE id = ?${t.sql}`,
        [resolvedCallId, ...t.params]
      )
      const record = callRecords[0] || {}
      const callType = record.call_type || req.body.callType || 'outbound'
      const customerName = record.customer_name || ''
      const callerNumber = phoneNumber || record.customer_phone || ''
      const displayName =
        customerName && customerName !== '未知来电' ? customerName : callerNumber

      await messageService.sendMessage({
        type: 'call_completed',
        title: callType === 'inbound' ? '呼入通话已结束' : '外呼通话已结束',
        content: `${displayName} 通话${callDuration}秒${hasRecording ? '（有录音）' : ''}`,
        targetUserId: String(userId),
        priority: 'normal',
        category: '通话通知',
        relatedType: 'call',
        relatedId: resolvedCallId,
        ...(tenantId ? { tenantId } : {}),
      } as any)
    } catch (msgErr) {
      log.warn('[通话结束] 发送系统消息失败:', msgErr)
    }

    res.json({
      success: true,
      data: {
        // 返回最终生效的记录ID（可能与APP传来的不同），APP需用它做录音上传关联
        callId: resolvedCallId,
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

router.post('/call/incoming', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id
    const { callerNumber } = req.body
    const deviceId = req.headers['x-device-id'] as string

    if (!callerNumber) {
      return res.status(400).json({
        success: false,
        message: '来电号码不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 查找客户信息
    let customerId = null
    let customerName = '未知来电'
    let customerLevel = null
    let company = null
    let lastCallTime = null

    try {
      const t = tenantRawSQL()
      // 规范化号码并生成多种可能的格式进行匹配
      const normalizedNumber = callerNumber.replace(/[\s\-()]/g, '').replace(/^(\+?86)?0?/, '')
      const possibleNumbers = [callerNumber, normalizedNumber, `+86${normalizedNumber}`, `86${normalizedNumber}`, `0${normalizedNumber}`]
      const placeholders = possibleNumbers.map(() => '?').join(',')
      // 备用号码存在 other_phones JSON 数组中（customers 表没有 mobile 列）
      const otherPhonesCond = possibleNumbers.map(() => 'JSON_CONTAINS(c.other_phones, JSON_QUOTE(?))').join(' OR ')
      const customers = await AppDataSource.query(
        `SELECT c.id, c.name, c.level, c.company,
                (SELECT MAX(start_time) FROM call_records WHERE customer_id = c.id) as last_call
         FROM customers c
         WHERE (REPLACE(REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '(', ''), ')', '') IN (${placeholders})
                OR ${otherPhonesCond}
               )${t.sql}
         LIMIT 1`,
        [...possibleNumbers, ...possibleNumbers, ...t.params]
      )
      if (customers.length > 0) {
        customerId = customers[0].id
        customerName = customers[0].name
        customerLevel = customers[0].level
        company = customers[0].company
        lastCallTime = customers[0].last_call
      }
    } catch (err) {
      log.warn('[呼入上报] 查询客户信息失败:', err)
    }

    // 区分：新客户（号码有效但系统中不存在）/ 未知来电（号码未获取到）
    const hasValidNumber = !!callerNumber && callerNumber !== '未知来电'
    const isNewCustomer = hasValidNumber && !customerId
    if (isNewCustomer) {
      customerName = '新客户'
    }

    // 创建或复用呼入通话记录
    // 🔥 与WS通道保持一致：120秒内已有"响铃中"的记录（APP可能先经WS报"未知来电"，
    // 3秒未确认后走HTTP备份报真实号码），复用并更新号码，避免产生重复记录、
    // 旧记录停留在"未知来电"
    let callId = `IN-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    let isUpdate = false
    const tenantId = getCurrentTenantIdSafe() || null
    try {
      const existing = await AppDataSource.query(
        `SELECT id, customer_phone FROM call_records
         WHERE user_id = ? AND call_type = 'inbound'
           AND call_status = 'ringing'
           AND created_at > DATE_SUB(NOW(), INTERVAL 120 SECOND)
         ORDER BY created_at DESC LIMIT 1`,
        [String(userId)]
      )
      if (existing.length > 0) {
        const prevPhone = existing[0].customer_phone || ''
        const prevValid = prevPhone && prevPhone !== '未知来电'
        const currValid = callerNumber && callerNumber !== '未知来电'
        // 🔒 防串号：仅允许 a)旧记录号码未知+本次有效号码（补号场景）
        //   或 b)号码相同的重复上报（WS+HTTP双通道）时复用；
        // 旧记录已有有效号码而本次未知/不同 → 新的一通来电，不复用
        const canReuse = (!prevValid) || (currValid && prevPhone === callerNumber)
        if (canReuse) {
          callId = existing[0].id
          isUpdate = true
        }
      }
    } catch (_e) { /* 忽略 */ }

    // 获取用户姓名
    let userName = ''
    try {
      const userInfo = await AppDataSource.query(
        `SELECT name, real_name FROM users WHERE id = ? LIMIT 1`, [userId]
      )
      userName = userInfo[0]?.real_name || userInfo[0]?.name || ''
    } catch (_e) {
      // 忽略
    }

    if (isUpdate) {
      await AppDataSource.query(
        `UPDATE call_records SET
         customer_id = ?, customer_name = ?, customer_phone = ?, updated_at = NOW()
         WHERE id = ?`,
        [customerId, customerName, callerNumber, callId]
      )
    } else {
      await AppDataSource.query(
        `INSERT INTO call_records
         (id, customer_id, customer_name, customer_phone, call_type, call_status,
          call_method, user_id, user_name, start_time, created_at, tenant_id)
         VALUES (?, ?, ?, ?, 'inbound', 'ringing', 'mobile', ?, ?, NOW(), NOW(), ?)`,
        [callId, customerId, customerName, callerNumber, String(userId), userName, tenantId]
      )
    }

    // 推送CRM端来电通知
    if (global.webSocketService) {
      global.webSocketService.sendToUser(userId, 'CALL_INCOMING', {
        callId,
        callerNumber,
        callSource: 'mobile',
        customerInfo: {
          customerId,
          customerName,
          customerLevel,
          company,
          lastCallTime,
          isNewCustomer
        },
        deviceInfo: { deviceId },
        timestamp: new Date().toISOString()
      })
    }

    await logApiCall({
      interfaceCode: 'mobile_call_incoming',
      method: 'POST',
      endpoint: '/api/v1/mobile/call/incoming',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId,
      deviceId
    })

    res.json({
      success: true,
      data: {
        callId,
        customerId,
        customerName,
        customerLevel,
        lastCallTime
      }
    })
  } catch (error) {
    log.error('上报呼入来电失败:', error)
    res.status(500).json({
      success: false,
      message: '上报失败',
      code: 'SERVER_ERROR'
    })
  }
})

/**
 * 批量上报离线期间的未接/来电（APP 启动时从 CallLog 补录）
 * POST /api/v1/mobile/call/missed-calls
 */
router.post('/call/missed-calls', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id
    const { calls } = req.body as {
      calls?: Array<{
        callerNumber: string
        callTime: string
        duration?: number
        callStatus?: 'missed' | 'rejected' | 'connected' | 'busy'
      }>
    }

    if (!Array.isArray(calls) || calls.length === 0) {
      return res.json({ success: true, data: { created: 0, skipped: 0 } })
    }

    const t = tenantRawSQL()
    const tenantId = getCurrentTenantIdSafe() || null
    let created = 0
    let skipped = 0
    const newMissedNumbers: string[] = []

    let userName = ''
    try {
      const userInfo = await AppDataSource.query(
        `SELECT name, real_name FROM users WHERE id = ? LIMIT 1`,
        [userId]
      )
      userName = userInfo[0]?.real_name || userInfo[0]?.name || ''
    } catch (_e) {
      // ignore
    }

    for (const item of calls) {
      const callerNumber = String(item.callerNumber || '').trim()
      const callTime = item.callTime
      if (!callerNumber || !callTime) {
        skipped++
        continue
      }

      const callDate = new Date(callTime)
      if (isNaN(callDate.getTime())) {
        skipped++
        continue
      }

      const existing = await AppDataSource.query(
        `SELECT id FROM call_records
         WHERE user_id = ? AND customer_phone = ?
         AND ABS(TIMESTAMPDIFF(SECOND, start_time, ?)) < 120${t.sql}
         LIMIT 1`,
        [String(userId), callerNumber, callDate, ...t.params]
      )

      if (existing.length > 0) {
        skipped++
        continue
      }

      let customerId = null
      let customerName = '未知来电'
      try {
        const customers = await AppDataSource.query(
          `SELECT id, name FROM customers c
           WHERE (c.phone = ? OR JSON_CONTAINS(c.other_phones, JSON_QUOTE(?)))${t.sql}
           LIMIT 1`,
          [callerNumber, callerNumber, ...t.params]
        )
        if (customers.length > 0) {
          customerId = customers[0].id
          customerName = customers[0].name
        }
      } catch (_e) {
        // ignore
      }

      const status = item.callStatus || 'missed'
      const callId = `IN-MISSED-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const duration = Number(item.duration) || 0

      await AppDataSource.query(
        `INSERT INTO call_records
         (id, customer_id, customer_name, customer_phone, call_type, call_status,
          call_method, user_id, user_name, start_time, end_time, duration, created_at, tenant_id)
         VALUES (?, ?, ?, ?, 'inbound', ?, 'mobile', ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          callId,
          customerId,
          customerName,
          callerNumber,
          status,
          String(userId),
          userName,
          callDate,
          callDate,
          duration,
          tenantId
        ]
      )

      created++
      if (status === 'missed' || status === 'rejected') {
        newMissedNumbers.push(callerNumber)
      }
    }

    if (created > 0 && newMissedNumbers.length > 0 && global.webSocketService) {
      global.webSocketService.sendToUser(userId, 'CALL_MISSED', {
        count: newMissedNumbers.length,
        numbers: newMissedNumbers.slice(0, 5),
        message: `您有 ${newMissedNumbers.length} 个未接来电已补录`,
        timestamp: new Date().toISOString()
      })
    }

    if (created > 0) {
      try {
        await messageService.sendMessage({
          type: 'call_missed',
          title: '未接来电补录',
          content: `已补录 ${created} 条离线期间的通话记录${newMissedNumbers.length > 0 ? `，其中 ${newMissedNumbers.length} 个未接` : ''}`,
          targetUserId: String(userId),
          tenantId: tenantId || undefined
        })
      } catch (_e) {
        // ignore message failure
      }
    }

    res.json({
      success: true,
      data: { created, skipped }
    })
  } catch (error: any) {
    log.error('补录未接来电失败:', error.message)
    res.status(500).json({
      success: false,
      message: '补录失败',
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
        recordingUrl: resolvePublicRecordingUrl(req, record.recording_url),
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

/**
 * 把录音URL关联到通话记录（多重兜底）：
 * 1. 按 callId 直接更新
 * 2. callId 匹配不到时，按"同用户+同号码+2小时内"的最近记录匹配（防串人：号码必须一致）
 * 返回最终关联到的记录id，关联失败返回 null
 */
async function attachRecordingToCall(
  callId: string,
  recordingUrl: string,
  userId: string,
  phoneNumber?: string
): Promise<string | null> {
  const t = tenantRawSQL()
  const result = await AppDataSource.query(
    `UPDATE call_records SET
     recording_url = ?,
     has_recording = 1,
     updated_at = NOW()
     WHERE id = ?${t.sql}`,
    [recordingUrl, callId, ...t.params]
  )
  const affected = Number(result?.affectedRows ?? result?.changedRows ?? 0)
  if (affected > 0) return callId

  // 🔥 兜底：callId 匹配不到（APP本地ID/记录被合并等），按号码+用户+时间窗匹配。
  // 号码必须精确一致才关联，宁可不关联也绝不串到别人的通话
  if (phoneNumber && phoneNumber !== '未知来电') {
    const tm = tenantRawSQL()
    const matched = await AppDataSource.query(
      `SELECT id FROM call_records
       WHERE user_id = ? AND customer_phone = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)
         AND (recording_url IS NULL OR recording_url = '')
         ${tm.sql}
       ORDER BY created_at DESC LIMIT 1`,
      [String(userId), phoneNumber, ...tm.params]
    )
    if (matched.length > 0) {
      const fallbackId = matched[0].id
      await AppDataSource.query(
        `UPDATE call_records SET recording_url = ?, has_recording = 1, updated_at = NOW() WHERE id = ?`,
        [recordingUrl, fallbackId]
      )
      log.info(`[录音上传] callId ${callId} 未匹配，按号码兜底关联到记录 ${fallbackId}`)
      return fallbackId
    }
  }
  log.warn(`[录音上传] 录音已保存但未关联到通话记录: callId=${callId}, phone=${phoneNumber || '无'}`)
  return null
}

router.post('/recording/upload', authenticateToken, checkStorageLimit, uploadRecording.single('file'), async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const { callId, phoneNumber, duration: _duration } = req.body
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
    const userId = String(currentUser?.userId || currentUser?.id)

    const attachedCallId = await attachRecordingToCall(callId, recordingUrl, userId, phoneNumber)

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

    if (!attachedCallId) {
      return res.json({
        success: false,
        message: '录音已保存但未找到对应的通话记录',
        code: 'CALL_RECORD_NOT_FOUND'
      })
    }

    res.json({
      success: true,
      data: {
        callId: attachedCallId,
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

/**
 * base64 JSON 方式上传录音（兜底通道）
 * multipart 上传可能被反向代理/网关拦截或改写导致失败，
 * 此接口走与其他业务API完全相同的 JSON 通道，保证可达
 */
router.post('/recording/upload-base64', authenticateToken, checkStorageLimit, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const { callId, fileName, base64, phoneNumber } = req.body || {}

    if (!callId || !base64) {
      return res.status(400).json({
        success: false,
        message: '参数不完整',
        code: 'INVALID_PARAMS'
      })
    }

    // 解码并落盘（与multer上传相同的租户目录结构）
    const raw = String(base64).replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(raw, 'base64')
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, message: '文件内容为空', code: 'INVALID_PARAMS' })
    }
    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: '文件过大', code: 'FILE_TOO_LARGE' })
    }

    const tenantCode = await resolveTenantCode(req)
    const dir = getUploadDir(tenantCode, 'recordings')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const ext = (path.extname(String(fileName || '')) || '.amr').toLowerCase()
    const safeExt = /^\.[a-z0-9]{1,6}$/.test(ext) ? ext : '.amr'
    const filename = `${Date.now()}_${uuidv4().substring(0, 8)}${safeExt}`
    fs.writeFileSync(path.join(dir, filename), buffer)

    const recordingUrl = getUploadUrl(tenantCode, 'recordings', filename)
    const userId = String(currentUser?.userId || currentUser?.id)
    const attachedCallId = await attachRecordingToCall(callId, recordingUrl, userId, phoneNumber)

    await logApiCall({
      interfaceCode: 'mobile_recording_upload_base64',
      method: 'POST',
      endpoint: '/api/v1/mobile/recording/upload-base64',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId: currentUser?.userId || currentUser?.id
    })

    if (!attachedCallId) {
      return res.json({
        success: false,
        message: '录音已保存但未找到对应的通话记录',
        code: 'CALL_RECORD_NOT_FOUND'
      })
    }

    res.json({
      success: true,
      data: {
        callId: attachedCallId,
        recordingUrl,
        fileSize: buffer.length
      }
    })
  } catch (error) {
    log.error('base64上传录音失败:', error)
    res.status(500).json({
      success: false,
      message: '上传失败',
      code: 'SERVER_ERROR'
    })
  }
})
}
