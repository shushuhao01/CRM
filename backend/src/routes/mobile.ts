/**
 * 移动端APP对接接口
 * 用于工作手机外呼功能
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { authenticateToken } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import QRCode from 'qrcode'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

const router = Router()

// ==================== 服务器连接测试（无需认证）====================

/**
 * 服务器连接测试 (Ping)
 * GET /api/v1/mobile/ping
 * 用于APP测试服务器是否可连接，无需认证
 */
router.get('/ping', (req: Request, res: Response) => {
  res.json({
    code: 200,
    success: true,
    message: 'pong',
    data: {
      serverTime: new Date().toISOString(),
      version: '1.0.0',
      serverName: process.env.SERVER_NAME || 'CRM外呼系统'
    }
  })
})

// 录音文件上传配置
const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/recordings')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}_${uuidv4().substring(0, 8)}${ext}`)
  }
})
const uploadRecording = multer({ storage: recordingStorage })

// ==================== 辅助函数 ====================

// 记录API调用日志
async function logApiCall(data: {
  interfaceCode: string
  method: string
  endpoint: string
  requestParams?: string
  responseCode: number
  responseTime: number
  success: boolean
  errorMessage?: string
  clientIp?: string
  userAgent?: string
  userId?: string
  deviceId?: string
}) {
  try {
    await AppDataSource.query(
      `INSERT INTO api_call_logs
       (interface_code, method, endpoint, request_params, response_code, response_time, success, error_message, client_ip, user_agent, user_id, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.interfaceCode,
        data.method,
        data.endpoint,
        data.requestParams,
        data.responseCode,
        data.responseTime,
        data.success ? 1 : 0,
        data.errorMessage,
        data.clientIp,
        data.userAgent,
        data.userId,
        data.deviceId
      ]
    )

    // 更新接口统计
    await AppDataSource.query(
      `UPDATE api_interfaces SET
       call_count = call_count + 1,
       success_count = success_count + ?,
       fail_count = fail_count + ?,
       last_called_at = NOW(),
       avg_response_time = (avg_response_time * call_count + ?) / (call_count + 1)
       WHERE code = ?`,
      [data.success ? 1 : 0, data.success ? 0 : 1, data.responseTime, data.interfaceCode]
    )
  } catch (error) {
    console.error('记录API调用日志失败:', error)
  }
}


// ==================== APP登录接口 ====================

/**
 * APP登录
 * POST /api/v1/mobile/login
 */
router.post('/login', async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const { username, password, deviceInfo: _deviceInfo } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 查询用户
    const users = await AppDataSource.query(
      `SELECT id, username, password, real_name, department_id, role, status
       FROM users WHERE username = ? AND status = 'active'`,
      [username]
    )

    if (users.length === 0) {
      await logApiCall({
        interfaceCode: 'mobile_login',
        method: 'POST',
        endpoint: '/api/v1/mobile/login',
        responseCode: 401,
        responseTime: Date.now() - startTime,
        success: false,
        errorMessage: '用户不存在',
        clientIp: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        code: 'AUTH_FAILED'
      })
    }

    const user = users[0]

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      await logApiCall({
        interfaceCode: 'mobile_login',
        method: 'POST',
        endpoint: '/api/v1/mobile/login',
        responseCode: 401,
        responseTime: Date.now() - startTime,
        success: false,
        errorMessage: '密码错误',
        clientIp: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        code: 'AUTH_FAILED'
      })
    }

    // 生成Token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, source: 'mobile' },
      process.env.JWT_SECRET || 'crm-secret-key',
      { expiresIn: '7d' }
    )

    // 获取部门信息
    let departmentName = ''
    if (user.department_id) {
      const depts = await AppDataSource.query(
        `SELECT name FROM departments WHERE id = ?`,
        [user.department_id]
      )
      departmentName = depts[0]?.name || ''
    }

    await logApiCall({
      interfaceCode: 'mobile_login',
      method: 'POST',
      endpoint: '/api/v1/mobile/login',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId: user.id
    })

    res.json({
      success: true,
      data: {
        token,
        expiresIn: 604800, // 7天
        user: {
          id: user.id,
          username: user.username,
          realName: user.real_name,
          department: departmentName,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('APP登录失败:', error)
    await logApiCall({
      interfaceCode: 'mobile_login',
      method: 'POST',
      endpoint: '/api/v1/mobile/login',
      responseCode: 500,
      responseTime: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : '未知错误',
      clientIp: req.ip,
      userAgent: req.headers['user-agent']
    })
    res.status(500).json({
      success: false,
      message: '登录失败',
      code: 'SERVER_ERROR'
    })
  }
})


// ==================== 设备绑定接口 ====================

/**
 * 生成绑定二维码（PC端调用）
 * POST /api/v1/mobile/bindQRCode
 */
router.post('/bindQRCode', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const userId = req.body.userId || currentUser?.userId || currentUser?.id

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 生成绑定Token（5分钟有效）
    const bindToken = uuidv4()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    // 保存绑定Token到数据库
    await AppDataSource.query(
      `INSERT INTO work_phones (user_id, bind_token, bind_token_expires, status, created_at)
       VALUES (?, ?, ?, 'inactive', NOW())
       ON DUPLICATE KEY UPDATE bind_token = ?, bind_token_expires = ?`,
      [userId, bindToken, expiresAt, bindToken, expiresAt]
    )

    // 构建二维码数据
    const serverUrl = process.env.API_BASE_URL || `http://${req.headers.host}`
    const wsUrl = serverUrl.replace('http', 'ws') + '/ws/mobile'

    const qrCodeData = {
      action: 'bind_device',
      token: bindToken,
      serverUrl,
      wsUrl,
      userId,
      expiresAt: expiresAt.toISOString()
    }

    // 生成二维码图片
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
      width: 256,
      margin: 2
    })

    await logApiCall({
      interfaceCode: 'mobile_bindqrcode',
      method: 'POST',
      endpoint: '/api/v1/mobile/bindQRCode',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId
    })

    res.json({
      success: true,
      data: {
        qrCodeData,
        qrCodeImage,
        expiresAt: expiresAt.toISOString()
      }
    })
  } catch (error) {
    console.error('生成绑定二维码失败:', error)
    res.status(500).json({
      success: false,
      message: '生成二维码失败',
      code: 'SERVER_ERROR'
    })
  }
})

/**
 * 扫码绑定设备（APP调用）
 * POST /api/v1/mobile/bind
 */
router.post('/bind', async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const { bindToken, phoneNumber, deviceInfo } = req.body

    if (!bindToken) {
      return res.status(400).json({
        success: false,
        message: '绑定Token不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 验证绑定Token
    const records = await AppDataSource.query(
      `SELECT id, user_id FROM work_phones
       WHERE bind_token = ? AND bind_token_expires > NOW()`,
      [bindToken]
    )

    if (records.length === 0) {
      await logApiCall({
        interfaceCode: 'mobile_binddevice',
        method: 'POST',
        endpoint: '/api/v1/mobile/bind',
        responseCode: 400,
        responseTime: Date.now() - startTime,
        success: false,
        errorMessage: '绑定Token无效或已过期',
        clientIp: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(400).json({
        success: false,
        message: '二维码已过期，请重新生成',
        code: 'TOKEN_EXPIRED'
      })
    }

    const record = records[0]
    const deviceId = deviceInfo?.deviceId || uuidv4()

    // 更新设备信息
    await AppDataSource.query(
      `UPDATE work_phones SET
       phone_number = ?,
       device_id = ?,
       device_name = ?,
       device_model = ?,
       os_type = ?,
       os_version = ?,
       app_version = ?,
       status = 'active',
       online_status = 'online',
       last_active_at = NOW(),
       bind_token = NULL,
       bind_token_expires = NULL,
       updated_at = NOW()
       WHERE id = ?`,
      [
        phoneNumber,
        deviceId,
        deviceInfo?.deviceName || '未知设备',
        deviceInfo?.deviceModel || '',
        deviceInfo?.osType || 'android',
        deviceInfo?.osVersion || '',
        deviceInfo?.appVersion || '1.0.0',
        record.id
      ]
    )

    // 记录绑定日志
    await AppDataSource.query(
      `INSERT INTO device_bind_logs
       (user_id, device_id, phone_number, device_name, device_model, os_type, os_version, app_version, action, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'binddevice', ?)`,
      [
        record.user_id,
        deviceId,
        phoneNumber,
        deviceInfo?.deviceName,
        deviceInfo?.deviceModel,
        deviceInfo?.osType,
        deviceInfo?.osVersion,
        deviceInfo?.appVersion,
        req.ip
      ]
    )

    // 生成WebSocket Token
    const wsToken = jwt.sign(
      { userId: record.user_id, deviceId, source: 'mobile_ws' },
      process.env.JWT_SECRET || 'crm-secret-key',
      { expiresIn: '30d' }
    )

    const serverUrl = process.env.API_BASE_URL || `http://${req.headers.host}`
    const wsUrl = serverUrl.replace('http', 'ws') + '/ws/mobile'

    await logApiCall({
      interfaceCode: 'mobile_binddevice',
      method: 'POST',
      endpoint: '/api/v1/mobile/bind',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId: record.user_id,
      deviceId
    })

    // 通知PC端设备已绑定
    if (global.webSocketService) {
      global.webSocketService.sendToUser(record.user_id, 'DEVICE_BOUND', {
        deviceId,
        deviceName: deviceInfo?.deviceName,
        phoneNumber
      })
    }

    res.json({
      success: true,
      message: '设备绑定成功',
      data: {
        deviceId,
        userId: record.user_id,
        wsToken,
        wsUrl
      }
    })
  } catch (error) {
    console.error('设备绑定失败:', error)
    res.status(500).json({
      success: false,
      message: '设备绑定失败',
      code: 'SERVER_ERROR'
    })
  }
})


/**
 * 解绑设备
 * DELETE /api/v1/mobile/unbind
 */
router.delete('/unbind', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const { deviceId } = req.body
    const userId = currentUser?.userId || currentUser?.id

    // 查找设备
    let query = `SELECT id, device_id, user_id FROM work_phones WHERE user_id = ? AND status = 'active'`
    const params: any[] = [userId]

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
       WHERE id = ?`,
      [device.id]
    )

    // 记录解绑日志
    await AppDataSource.query(
      `INSERT INTO device_bind_logs (user_id, device_id, action, ip_address, remark)
       VALUES (?, ?, 'unbind', ?, '用户主动解绑')`,
      [userId, device.device_id, req.ip]
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
    console.error('解绑设备失败:', error)
    res.status(500).json({
      success: false,
      message: '解绑失败',
      code: 'SERVER_ERROR'
    })
  }
})

/**
 * 获取设备状态
 * GET /api/v1/mobile/device/status
 */
router.get('/device/status', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const userId = (req.query.userId as string) || currentUser?.userId || currentUser?.id

    const devices = await AppDataSource.query(
      `SELECT id, phone_number, device_id, device_name, device_model,
              os_type, os_version, app_version, online_status,
              last_active_at, created_at as bind_time
       FROM work_phones
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    )

    await logApiCall({
      interfaceCode: 'mobile_device_status',
      method: 'GET',
      endpoint: '/api/v1/mobile/device/status',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId
    })

    if (devices.length === 0) {
      return res.json({
        success: true,
        data: {
          bound: false,
          device: null
        }
      })
    }

    const device = devices[0]
    res.json({
      success: true,
      data: {
        bound: true,
        device: {
          id: device.id,
          phoneNumber: device.phone_number ?
            device.phone_number.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
          deviceId: device.device_id,
          deviceName: device.device_name,
          deviceModel: device.device_model,
          osType: device.os_type,
          osVersion: device.os_version,
          appVersion: device.app_version,
          onlineStatus: device.online_status,
          lastActiveAt: device.last_active_at,
          bindTime: device.bind_time
        }
      }
    })
  } catch (error) {
    console.error('获取设备状态失败:', error)
    res.status(500).json({
      success: false,
      message: '获取设备状态失败',
      code: 'SERVER_ERROR'
    })
  }
})


// ==================== 通话状态接口 ====================

/**
 * 上报通话状态（APP调用）
 * POST /api/v1/mobile/call/status
 */
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
    await AppDataSource.query(
      `UPDATE call_records SET
       call_status = ?,
       start_time = CASE WHEN ? = 'connected' AND start_time IS NULL THEN NOW() ELSE start_time END,
       updated_at = NOW()
       WHERE id = ?`,
      [status, status, callId]
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
    console.error('上报通话状态失败:', error)
    res.status(500).json({
      success: false,
      message: '上报失败',
      code: 'SERVER_ERROR'
    })
  }
})

/**
 * 上报通话结束（APP调用）
 * POST /api/v1/mobile/call/end
 */
router.post('/call/end', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const { callId, status, startTime: callStartTime, endTime, duration, hasRecording } = req.body
    const deviceId = req.headers['x-device-id'] as string

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: '通话ID不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 更新通话记录
    await AppDataSource.query(
      `UPDATE call_records SET
       call_status = ?,
       start_time = ?,
       end_time = ?,
       duration = ?,
       has_recording = ?,
       updated_at = NOW()
       WHERE id = ?`,
      [
        status || 'connected',
        callStartTime ? new Date(callStartTime) : null,
        endTime ? new Date(endTime) : new Date(),
        duration || 0,
        hasRecording ? 1 : 0,
        callId
      ]
    )

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
    console.error('上报通话结束失败:', error)
    res.status(500).json({
      success: false,
      message: '上报失败',
      code: 'SERVER_ERROR'
    })
  }
})

/**
 * 上传录音文件（APP调用）
 * POST /api/v1/mobile/recording/upload
 */
router.post('/recording/upload', authenticateToken, uploadRecording.single('file'), async (req: Request, res: Response) => {
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

    const recordingUrl = `/uploads/recordings/${file.filename}`

    // 更新通话记录
    await AppDataSource.query(
      `UPDATE call_records SET
       recording_url = ?,
       has_recording = 1,
       updated_at = NOW()
       WHERE id = ?`,
      [recordingUrl, callId]
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
    console.error('上传录音失败:', error)
    res.status(500).json({
      success: false,
      message: '上传失败',
      code: 'SERVER_ERROR'
    })
  }
})


// ==================== 通话跟进接口 ====================

/**
 * 提交通话跟进记录（APP调用）
 * POST /api/v1/mobile/call/followup
 *
 * 通话结束后，APP端提交备注、标签等跟进信息
 * 数据会同步到：
 * 1. call_records表 - 更新通话备注和标签
 * 2. follow_up_records表 - 创建跟进记录
 * 3. customers表 - 更新客户标签和最后联系时间
 */
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

    updateParams.push(callId)
    await AppDataSource.query(
      `UPDATE call_records SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    )

    // 2. 获取通话记录信息
    const callRecords = await AppDataSource.query(
      `SELECT customer_id, customer_name, customer_phone FROM call_records WHERE id = ?`,
      [callId]
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

      await AppDataSource.query(
        `INSERT INTO follow_up_records
         (id, call_id, customer_id, customer_name, follow_up_type, content, intention,
          next_follow_up_date, status, user_id, user_name, created_at)
         VALUES (?, ?, ?, ?, 'call', ?, ?, ?, 'completed', ?, ?, NOW())`,
        [
          followUpId,
          callId,
          actualCustomerId,
          callRecord?.customer_name,
          followUpContent,
          intention || null,
          nextFollowUpDate ? new Date(nextFollowUpDate) : null,
          userId,
          userName
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
          `SELECT tags FROM customers WHERE id = ?`,
          [actualCustomerId]
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
        `UPDATE customers SET ${customerUpdates.join(', ')} WHERE id = ?`,
        customerParams
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
    console.error('提交通话跟进失败:', error)
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

/**
 * 获取通话详情（APP调用）
 * GET /api/v1/mobile/call/:callId
 */
router.get('/call/:callId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { callId } = req.params

    // 获取通话记录
    const records = await AppDataSource.query(
      `SELECT cr.*,
              c.name as customer_full_name, c.level as customer_level,
              c.tags as customer_tags, c.follow_status
       FROM call_records cr
       LEFT JOIN customers c ON cr.customer_id = c.id
       WHERE cr.id = ?`,
      [callId]
    )

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: '通话记录不存在',
        code: 'NOT_FOUND'
      })
    }

    const record = records[0]

    // 获取相关跟进记录
    const followUps = await AppDataSource.query(
      `SELECT * FROM follow_up_records WHERE call_id = ? ORDER BY created_at DESC`,
      [callId]
    )

    res.json({
      code: 200,
      success: true,
      data: {
        id: record.id,
        customerId: record.customer_id,
        customerName: record.customer_name,
        customerPhone: record.customer_phone,
        customerLevel: record.customer_level,
        customerTags: record.customer_tags ? JSON.parse(record.customer_tags) : [],
        followStatus: record.follow_status,
        callType: record.call_type,
        callStatus: record.call_status,
        startTime: record.start_time,
        endTime: record.end_time,
        duration: record.duration,
        hasRecording: record.has_recording === 1,
        recordingUrl: record.recording_url,
        notes: record.notes,
        callTags: record.call_tags ? JSON.parse(record.call_tags) : [],
        followUpRequired: record.follow_up_required === 1,
        userId: record.user_id,
        userName: record.user_name,
        createdAt: record.created_at,
        followUpRecords: followUps.map((f: any) => ({
          id: f.id,
          content: f.content,
          intention: f.intention,
          nextFollowUpDate: f.next_follow_up_date,
          userName: f.user_name,
          createdAt: f.created_at
        }))
      }
    })
  } catch (error) {
    console.error('获取通话详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取失败',
      code: 'SERVER_ERROR'
    })
  }
})

/**
 * 获取通话记录列表（APP调用）
 * GET /api/v1/mobile/calls
 */
router.get('/calls', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id
    const { page = 1, pageSize = 20, callType, startDate, endDate } = req.query

    let query = `SELECT * FROM call_records WHERE user_id = ?`
    let countQuery = `SELECT COUNT(*) as total FROM call_records WHERE user_id = ?`
    const params: any[] = [userId]

    if (callType) {
      query += ` AND call_type = ?`
      countQuery += ` AND call_type = ?`
      params.push(callType)
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
          callTags: r.call_tags ? JSON.parse(r.call_tags) : []
        })),
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('获取通话记录失败:', error)
    res.status(500).json({
      success: false,
      message: '获取失败',
      code: 'SERVER_ERROR'
    })
  }
})

/**
 * 获取今日通话统计（APP调用）
 * GET /api/v1/mobile/stats/today
 */
router.get('/stats/today', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user
    const userId = currentUser?.userId || currentUser?.id

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
       WHERE user_id = ? AND DATE(start_time) = CURDATE()`,
      [userId]
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
  } catch (error) {
    console.error('获取今日统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取失败',
      code: 'SERVER_ERROR'
    })
  }
})


// ==================== 接口管理 ====================

/**
 * 获取API接口列表
 * GET /api/v1/mobile/interfaces
 */
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
    console.error('获取接口列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取接口列表失败'
    })
  }
})

/**
 * 更新接口状态
 * PUT /api/v1/mobile/interfaces/:id
 */
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
    console.error('更新接口状态失败:', error)
    res.status(500).json({
      success: false,
      message: '更新失败'
    })
  }
})

/**
 * 获取接口调用日志
 * GET /api/v1/mobile/interfaces/logs
 */
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
    console.error('获取调用日志失败:', error)
    res.status(500).json({
      success: false,
      message: '获取日志失败'
    })
  }
})

/**
 * 获取接口统计数据
 * GET /api/v1/mobile/interfaces/stats
 */
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
    const deviceStats = await AppDataSource.query(
      `SELECT
        COUNT(*) as totalDevices,
        SUM(CASE WHEN online_status = 'online' THEN 1 ELSE 0 END) as onlineDevices
       FROM work_phones
       WHERE status = 'active'`
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
    console.error('获取接口统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取统计失败'
    })
  }
})

/**
 * 重置接口统计
 * POST /api/v1/mobile/interfaces/:id/reset
 */
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
    console.error('重置统计失败:', error)
    res.status(500).json({
      success: false,
      message: '重置失败'
    })
  }
})

export default router
