/**
 * 超时提醒API
 */

import { api as request } from './request'

export interface TimeoutConfig {
  orderAuditTimeout: number      // 订单审核超时（小时）
  orderShipmentTimeout: number   // 发货超时（小时）
  afterSalesTimeout: number      // 售后处理超时（小时）
  orderFollowupDays: number      // 订单跟进提醒（天）
  isEnabled: boolean             // 是否启用
  checkIntervalMinutes?: number  // 检测间隔（分钟）
}

export interface CheckResult {
  orderAuditTimeoutCount: number
  orderShipmentTimeoutCount: number
  afterSalesTimeoutCount: number
  orderFollowupCount: number
  totalSent: number
}

export const timeoutReminderApi = {
  /**
   * 获取超时提醒配置
   */
  getConfig: async (): Promise<{ success: boolean; data: TimeoutConfig }> => {
    return request.get('/timeout-reminder/config')
  },

  /**
   * 更新超时提醒配置
   */
  updateConfig: async (config: Partial<TimeoutConfig>): Promise<{ success: boolean; message: string }> => {
    return request.put('/timeout-reminder/config', config)
  },

  /**
   * 手动触发超时检测
   */
  manualCheck: async (): Promise<{ success: boolean; message: string; data: CheckResult }> => {
    return request.post('/timeout-reminder/check')
  },

  /**
   * 获取服务状态
   */
  getStatus: async (): Promise<{ success: boolean; data: { isRunning: boolean; config: TimeoutConfig; lastCheckTime: string } }> => {
    return request.get('/timeout-reminder/status')
  }
}

export default timeoutReminderApi
