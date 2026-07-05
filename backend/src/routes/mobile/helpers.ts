/**
 * Mobile route shared helper functions
 */
import { Request } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createTenantDestination, getUploadUrl } from '../../utils/tenantUploadHelper';

// Re-export for convenience
export { getUploadUrl };

// 辅助函数：生成正确的 WebSocket URL
// 🔥 优先使用真实可用的 URL：环境变量 → 请求头 → localhost 兜底
export function generateWsUrl(req: Request): string {
  // 先尝试使用环境变量配置的服务器URL
  const envUrl = process.env.API_BASE_URL || process.env.SERVER_URL || ''

  // 🔥 关键修复：检测占位域名（模板中的示例域名），忽略不用，回退到请求头
  const placeholderDomains = [
    'your_api_domain.com',
    'yourdomain.com',
    'your_ip_or_domain',
    'localhost:3000'
  ]
  const isPlaceholder = placeholderDomains.some(d => envUrl.includes(d))

  // 使用有效的环境变量URL，否则从请求头推断
  let serverUrl = ''
  if (envUrl && !isPlaceholder) {
    serverUrl = envUrl
  } else {
    // 从请求头推断实际的服务器地址
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http'
    let host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000') as string
    // 去除可能的多值（x-forwarded-host 可能返回 "host1, host2"）
    host = host.split(',')[0].trim()
    serverUrl = `${protocol}://${host}`
  }

  // 转换为 WebSocket 协议
  let wsUrl = serverUrl
  if (wsUrl.startsWith('https://')) {
    wsUrl = wsUrl.replace('https://', 'wss://')
  } else if (wsUrl.startsWith('http://')) {
    wsUrl = wsUrl.replace('http://', 'ws://')
  } else if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
    wsUrl = process.env.NODE_ENV === 'production' ? `wss://${wsUrl}` : `ws://${wsUrl}`
  }

  if (!wsUrl.endsWith('/ws/mobile')) {
    wsUrl = wsUrl.replace(/\/$/, '') + '/ws/mobile'
  }

  return wsUrl
}

// 录音文件上传配置（SaaS模式按租户目录隔离）
const recordingStorage = multer.diskStorage({
  destination: createTenantDestination('recordings'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}_${uuidv4().substring(0, 8)}${ext}`)
  }
})
export const uploadRecording = multer({ storage: recordingStorage })

// 记录API调用日志
export async function logApiCall(data: {
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
    log.error('记录API调用日志失败:', error)
  }
}

