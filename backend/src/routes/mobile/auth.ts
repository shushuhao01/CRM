import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';
import { authenticateToken } from '../../middleware/auth';
import { JwtConfig } from '../../config/jwt';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { tenantRawSQL, getCurrentTenantIdSafe } from '../../utils/tenantHelpers';
import { deployConfig } from '../../config/deploy';
import { generateWsUrl, logApiCall } from './helpers';

export function registerAuthRoutes(router: Router) {
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

router.post('/login', async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const { username, password, tenantId, deviceInfo: _deviceInfo } = req.body

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    // 🔥 安全修复：SaaS模式下强制要求租户编码，防止跨租户登录
    if (deployConfig.isSaaS() && !tenantId) {
      return res.status(400).json({
        success: false,
        message: 'SaaS模式下必须提供租户编码才能登录',
        code: 'TENANT_REQUIRED'
      })
    }

    // 查询用户（支持租户隔离）
    let userQuery = `SELECT id, username, password, real_name, department_id, role, status, tenant_id
       FROM users WHERE username = ? AND status = 'active'`
    const queryParams: any[] = [username]

    // SaaS模式：按租户过滤
    if (tenantId) {
      userQuery += ` AND tenant_id = ?`
      queryParams.push(tenantId)
    }

    const users = await AppDataSource.query(userQuery, queryParams)

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

    // 生成Token - 使用 JwtConfig 确保与认证中间件兼容
    // 🔥 修复：JWT中包含tenantId，确保后续API请求有租户隔离
    const token = JwtConfig.generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.department_id,
      tenantId: user.tenant_id || undefined
    })

    // 获取部门信息
    let departmentName = ''
    if (user.department_id) {
      const deptT = user.tenant_id ? { sql: ' AND tenant_id = ?', params: [user.tenant_id] } : { sql: '', params: [] }
      const depts = await AppDataSource.query(
        `SELECT name FROM departments WHERE id = ?${deptT.sql}`,
        [user.department_id, ...deptT.params]
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
          role: user.role,
          tenantId: user.tenant_id || null
        }
      }
    })
  } catch (error) {
    log.error('APP登录失败:', error)
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
    const tenantId = getCurrentTenantIdSafe() || null
    await AppDataSource.query(
      `INSERT INTO work_phones (user_id, bind_token, bind_token_expires, status, created_at, tenant_id)
       VALUES (?, ?, ?, 'inactive', NOW(), ?)
       ON DUPLICATE KEY UPDATE bind_token = ?, bind_token_expires = ?`,
      [userId, bindToken, expiresAt, tenantId, bindToken, expiresAt]
    )

    // 构建二维码数据 - 使用辅助函数生成正确的WebSocket URL
    const serverUrl = process.env.API_BASE_URL || `http://${req.headers.host}`
    const wsUrl = generateWsUrl(req)

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
    log.error('生成绑定二维码失败:', error)
    res.status(500).json({
      success: false,
      message: '生成二维码失败',
      code: 'SERVER_ERROR'
    })
  }
})

router.post('/bind', async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const { bindToken, phoneNumber, deviceInfo } = req.body

    log.info('收到绑定请求:', { bindToken, phoneNumber, deviceInfo })

    if (!bindToken) {
      return res.status(400).json({
        success: false,
        message: '绑定Token不能为空',
        code: 'INVALID_PARAMS'
      })
    }

    let record: any = null
    let userId: string = ''

    // 从 device_bind_logs 表查找（connectionId）
    log.info('查询 device_bind_logs 表, bindToken:', bindToken)
    const bindLogs = await AppDataSource.query(
      `SELECT id, user_id, tenant_id FROM device_bind_logs
       WHERE connection_id = ? AND status = 'pending' AND expires_at > NOW()`,
      [bindToken]
    )
    log.info('device_bind_logs 查询结果:', bindLogs)

    if (bindLogs.length > 0) {
      const bindLog = bindLogs[0]
      userId = bindLog.user_id
      const logTenantId = bindLog.tenant_id // 从绑定记录继承租户ID
      log.info('找到绑定记录, userId:', userId, 'tenantId:', logTenantId)

      // 检查用户是否已有 work_phones 记录
      const existingPhones = await AppDataSource.query(
        `SELECT id FROM work_phones WHERE user_id = ?${logTenantId ? ' AND tenant_id = ?' : ''}`,
        logTenantId ? [userId, logTenantId] : [userId]
      )
      log.info('现有手机记录:', existingPhones)

      if (existingPhones.length > 0) {
        record = existingPhones[0]
        log.info('使用现有记录:', record)
      } else {
        // 创建新的 work_phones 记录
        log.info('创建新的work_phones记录...')
        const tempPhoneNumber = `temp_${Date.now()}`
        try {
          const insertResult = await AppDataSource.query(
            `INSERT INTO work_phones (user_id, phone_number, status, online_status, created_at, updated_at, tenant_id)
             VALUES (?, ?, 'inactive', 'offline', NOW(), NOW(), ?)`,
            [userId, tempPhoneNumber, logTenantId || null]
          )
          log.info('插入结果:', insertResult)
          record = { id: insertResult.insertId, user_id: userId }
        } catch (insertError) {
          log.error('创建work_phones记录失败:', insertError)
          throw insertError
        }
      }

      // 更新 device_bind_logs 状态
      log.info('更新device_bind_logs状态...')
      await AppDataSource.query(
        `UPDATE device_bind_logs SET status = 'connected', phone_id = ? WHERE id = ?`,
        [record.id, bindLog.id]
      )
      log.info('device_bind_logs状态更新成功')
    }

    if (!record) {
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

    const deviceId = deviceInfo?.deviceId || uuidv4()
    // 如果没有提供手机号，使用设备ID作为临时标识
    const finalPhoneNumber = phoneNumber || deviceInfo?.phoneNumber || `device_${deviceId.substring(0, 8)}`

    // 更新设备信息 - 只使用基本字段
    log.info('更新设备信息, record.id:', record.id)
    try {
      await AppDataSource.query(
        `UPDATE work_phones SET
         phone_number = ?,
         device_id = ?,
         device_name = ?,
         device_model = ?,
         status = 'active',
         online_status = 'offline',
         last_active_at = NOW(),
         updated_at = NOW()
         WHERE id = ?`,
        [
          finalPhoneNumber,
          deviceId,
          deviceInfo?.deviceName || '未知设备',
          deviceInfo?.deviceModel || '',
          record.id
        ]
      )
      log.info('设备信息更新成功，online_status 设置为 offline，等待 WebSocket 连接后更新为 online')
    } catch (updateError) {
      log.error('更新设备信息失败:', updateError)
      throw updateError
    }

    // 记录绑定日志
    try {
      await AppDataSource.query(
        `INSERT INTO device_bind_logs
         (user_id, device_id, phone_number, device_name, device_model, action, ip_address, status, created_at, tenant_id)
         VALUES (?, ?, ?, ?, ?, 'bind', ?, 'connected', NOW(), ?)`,
        [
          userId,
          deviceId,
          finalPhoneNumber,
          deviceInfo?.deviceName || '',
          deviceInfo?.deviceModel || '',
          req.ip || '',
          (bindLogs.length > 0 ? bindLogs[0].tenant_id : null) || null
        ]
      )
    } catch (logError) {
      // 忽略日志记录错误
      log.warn('记录绑定日志失败:', logError)
    }

    // 生成WebSocket Token
    const wsToken = jwt.sign(
      { userId, deviceId, source: 'mobile_ws' },
      process.env.JWT_SECRET || 'crm-secret-key',
      { expiresIn: '30d' }
    )

    // 使用辅助函数生成正确的WebSocket URL
    const wsUrl = generateWsUrl(req)
    log.info('[Mobile Bind] 生成的 wsUrl:', wsUrl)

    await logApiCall({
      interfaceCode: 'mobile_binddevice',
      method: 'POST',
      endpoint: '/api/v1/mobile/bind',
      responseCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      userId: String(userId),
      deviceId
    })

    // 通知PC端设备已绑定
    if (global.webSocketService) {
      global.webSocketService.sendToUser(Number(userId), 'DEVICE_BOUND', {
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
        userId,
        wsToken,
        wsUrl
      }
    })
  } catch (error) {
    log.error('设备绑定失败:', error)
    // 打印详细错误信息
    if (error instanceof Error) {
      log.error('错误详情:', error.message, error.stack)
    }
    res.status(500).json({
      success: false,
      message: '设备绑定失败: ' + (error instanceof Error ? error.message : '未知错误'),
      code: 'SERVER_ERROR'
    })
  }
})

router.get('/device/status', authenticateToken, async (req: Request, res: Response) => {
  const startTime = Date.now()
  try {
    const currentUser = (req as any).user
    const userId = (req.query.userId as string) || currentUser?.userId || currentUser?.id

    const t = tenantRawSQL()
    const devices = await AppDataSource.query(
      `SELECT id, phone_number, device_id, device_name, device_model,
              os_type, os_version, app_version, online_status,
              last_active_at, created_at as bind_time
       FROM work_phones
       WHERE user_id = ? AND status = 'active'${t.sql}`,
      [userId, ...t.params]
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
    log.error('获取设备状态失败:', error)
    res.status(500).json({
      success: false,
      message: '获取设备状态失败',
      code: 'SERVER_ERROR'
    })
  }
})
}
