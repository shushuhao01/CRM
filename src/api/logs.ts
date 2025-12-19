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

/**
 * 日志清理配置接口
 */
export interface LogCleanupConfig {
  autoCleanup: boolean
  retentionDays: number
  maxFileSizeMB: number
  cleanupTime: string
}

/**
 * 日志统计接口
 */
export interface LogStats {
  fileCount: number
  totalSize: string
  oldestLog: string
}

/**
 * 获取日志清理配置
 */
export const getLogConfig = (): Promise<{
  success: boolean
  data: LogCleanupConfig
}> => {
  return request({
    url: '/logs/config',
    method: 'get'
  })
}

/**
 * 保存日志清理配置
 */
export const saveLogConfig = (config: LogCleanupConfig): Promise<{
  success: boolean
  message: string
}> => {
  return request({
    url: '/logs/config',
    method: 'post',
    data: config
  })
}

/**
 * 获取日志统计
 */
export const getLogStats = (): Promise<{
  success: boolean
  data: LogStats
}> => {
  return request({
    url: '/logs/stats',
    method: 'get'
  })
}

/**
 * 清理过期日志
 */
export const cleanupOldLogs = (retentionDays: number): Promise<{
  success: boolean
  message: string
}> => {
  return request({
    url: `/logs/cleanup/${retentionDays}`,
    method: 'delete'
  })
}
