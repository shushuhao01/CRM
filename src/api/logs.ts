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
export const getSystemLogs = async (params?: {
  limit?: number
  level?: string
}): Promise<LogsResponse> => {
  const response = await request<LogsResponse>('/logs/system', {
    method: 'GET',
    params
  })
  return response as unknown as LogsResponse
}

/**
 * 清空系统日志
 */
export const clearSystemLogs = async (): Promise<{
  success: boolean
  message: string
  clearedFiles: number
}> => {
  const response = await request('/logs/clear', {
    method: 'DELETE'
  })
  return response as unknown as { success: boolean; message: string; clearedFiles: number }
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
export const getLogConfig = async (): Promise<{
  success: boolean
  data: LogCleanupConfig
}> => {
  const response = await request('/logs/config', {
    method: 'GET'
  })
  return response as unknown as { success: boolean; data: LogCleanupConfig }
}

/**
 * 保存日志清理配置
 */
export const saveLogConfig = async (config: LogCleanupConfig): Promise<{
  success: boolean
  message: string
}> => {
  const response = await request('/logs/config', {
    method: 'POST',
    data: config as unknown as Record<string, unknown>
  })
  return response as unknown as { success: boolean; message: string }
}

/**
 * 获取日志统计
 */
export const getLogStats = async (): Promise<{
  success: boolean
  data: LogStats
}> => {
  const response = await request('/logs/stats', {
    method: 'GET'
  })
  return response as unknown as { success: boolean; data: LogStats }
}

/**
 * 清理过期日志
 */
export const cleanupOldLogs = async (retentionDays: number): Promise<{
  success: boolean
  message: string
}> => {
  const response = await request(`/logs/cleanup/${retentionDays}`, {
    method: 'DELETE'
  })
  return response as unknown as { success: boolean; message: string }
}
