import { request } from './request'

export interface SystemLog {
  id: string
  timestamp: string
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  module: string
  message: string
  details: string
}

export interface LogsResponse {
  success: boolean
  data: SystemLog[]
  total: number
}

/**
 * 获取系统日志
 */
export const getSystemLogs = (params?: {
  limit?: number
  level?: string
}): Promise<LogsResponse> => {
  return request({
    url: '/logs/system',
    method: 'get',
    params
  })
}

/**
 * 清空系统日志
 */
export const clearSystemLogs = (): Promise<{
  success: boolean
  message: string
  clearedFiles: number
}> => {
  return request({
    url: '/logs/clear',
    method: 'delete'
  })
}