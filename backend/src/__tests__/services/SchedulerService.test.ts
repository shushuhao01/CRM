/**
 * SchedulerService 定时任务调度服务单元测试
 * 覆盖 start/stop、scheduleTask、triggerTask、getTasksStatus
 */

jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

const mockSchedule = jest.fn().mockReturnValue({ stop: jest.fn() })
jest.mock('node-cron', () => ({
  schedule: (...args: any[]) => mockSchedule(...args),
}))

jest.mock('../../services/LicenseExpirationReminderService', () => ({
  licenseExpirationReminderService: { runFullCheck: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../services/PaymentReminderService', () => ({
  paymentReminderService: { runFullCheck: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../services/DataCleanupService', () => ({
  dataCleanupService: { runFullCleanup: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../services/SubscriptionService', () => ({
  subscriptionService: {
    runAutoDeduct: jest.fn().mockResolvedValue(undefined),
    runDeductRetry: jest.fn().mockResolvedValue(undefined),
  }
}))
jest.mock('../../services/LogisticsAutoSyncService', () => ({
  logisticsAutoSyncService: { runAutoSync: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../services/WecomSyncScheduler', () => ({
  wecomSyncScheduler: { runAutoSync: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../services/OnlineSeatService', () => ({
  onlineSeatService: { cleanupExpiredSessions: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('../../services/CapacityService', () => ({
  capacityService: { expireCapacityOrders: jest.fn().mockResolvedValue(0) }
}))

import { licenseExpirationReminderService } from '../../services/LicenseExpirationReminderService'
import { dataCleanupService } from '../../services/DataCleanupService'

let schedulerService: any

beforeAll(async () => {
  const mod = await import('../../services/SchedulerService')
  schedulerService = mod.schedulerService
})

beforeEach(() => {
  jest.clearAllMocks()
  mockSchedule.mockReturnValue({ stop: jest.fn() })
})

describe('SchedulerService', () => {

  describe('start', () => {
    it('启动后注册多个定时任务', () => {
      schedulerService.start()
      // 9 个 scheduleTask 调用
      expect(mockSchedule).toHaveBeenCalledTimes(9)
      const status = schedulerService.getTasksStatus()
      expect(status.length).toBe(9)
    })
  })

  describe('stop', () => {
    it('停止所有任务并清空', () => {
      schedulerService.start()
      schedulerService.stop()
      const status = schedulerService.getTasksStatus()
      expect(status.length).toBe(0)
    })
  })

  describe('getTasksStatus', () => {
    it('返回所有任务名称和运行状态', () => {
      schedulerService.start()
      const status = schedulerService.getTasksStatus()
      expect(status.every((t: any) => t.running === true)).toBe(true)
      const names = status.map((t: any) => t.name)
      expect(names).toContain('license-expiration-check')
      expect(names).toContain('data-cleanup')
      expect(names).toContain('subscription-auto-deduct')
      expect(names).toContain('logistics-auto-sync')
      expect(names).toContain('online-seat-cleanup')
      expect(names).toContain('capacity-expire-check')
      schedulerService.stop()
    })
  })

  describe('triggerTask', () => {
    it('手动触发已知任务 → 返回 true', async () => {
      const result = await schedulerService.triggerTask('license-expiration-check')
      expect(result).toBe(true)
      expect(licenseExpirationReminderService.runFullCheck).toHaveBeenCalled()
    })

    it('手动触发 data-cleanup → 调用 runFullCleanup', async () => {
      const result = await schedulerService.triggerTask('data-cleanup')
      expect(result).toBe(true)
      expect(dataCleanupService.runFullCleanup).toHaveBeenCalled()
    })

    it('未知任务名 → 返回 false', async () => {
      const result = await schedulerService.triggerTask('nonexistent-task')
      expect(result).toBe(false)
    })

    it('任务执行异常 → 返回 false', async () => {
      (licenseExpirationReminderService.runFullCheck as jest.Mock).mockRejectedValueOnce(new Error('boom'))
      const result = await schedulerService.triggerTask('license-expiration-check')
      expect(result).toBe(false)
    })
  })
})
