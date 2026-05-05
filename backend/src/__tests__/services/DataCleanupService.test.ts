/**
 * DataCleanupService 数据清理服务单元测试
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

import { dataCleanupService } from '../../services/DataCleanupService'
import { AppDataSource } from '../../config/database'

const mockQuery = AppDataSource.query as jest.Mock

describe('DataCleanupService', () => {
  beforeEach(() => jest.clearAllMocks())

  // ==================== cleanupOperationLogs ====================

  describe('cleanupOperationLogs', () => {
    it('成功删除 → 返回删除行数', async () => {
      mockQuery.mockResolvedValue({ affectedRows: 50 })
      const result = await dataCleanupService.cleanupOperationLogs(90)
      expect(result).toBe(50)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('operation_logs'),
        [90]
      )
    })

    it('无数据可删 → 返回 0', async () => {
      mockQuery.mockResolvedValue({ affectedRows: 0 })
      const result = await dataCleanupService.cleanupOperationLogs()
      expect(result).toBe(0)
    })

    it('数据库异常 → 返回 0', async () => {
      mockQuery.mockRejectedValue(new Error('db error'))
      const result = await dataCleanupService.cleanupOperationLogs()
      expect(result).toBe(0)
    })
  })

  // ==================== cleanupSystemLogs ====================

  describe('cleanupSystemLogs', () => {
    it('成功删除 → 返回行数', async () => {
      mockQuery.mockResolvedValue({ affectedRows: 30 })
      const result = await dataCleanupService.cleanupSystemLogs(60)
      expect(result).toBe(30)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        [60]
      )
    })

    it('异常 → 返回 0', async () => {
      mockQuery.mockRejectedValue(new Error('fail'))
      expect(await dataCleanupService.cleanupSystemLogs()).toBe(0)
    })
  })

  // ==================== cleanupReadNotifications ====================

  describe('cleanupReadNotifications', () => {
    it('is_read 列存在 → 正常删除', async () => {
      mockQuery.mockResolvedValue({ affectedRows: 20 })
      const result = await dataCleanupService.cleanupReadNotifications(90)
      expect(result).toBe(20)
    })

    it('is_read 列不存在 → fallback 到 status 列', async () => {
      mockQuery
        .mockRejectedValueOnce(new Error('Unknown column'))
        .mockResolvedValueOnce({ affectedRows: 10 })
      const result = await dataCleanupService.cleanupReadNotifications(90)
      expect(result).toBe(10)
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it('两次 query 都失败 → 返回 0', async () => {
      mockQuery
        .mockRejectedValueOnce(new Error('err1'))
        .mockRejectedValueOnce(new Error('err2'))
      const result = await dataCleanupService.cleanupReadNotifications()
      expect(result).toBe(0)
    })
  })

  // ==================== runFullCleanup ====================

  describe('runFullCleanup', () => {
    it('执行三个清理任务', async () => {
      mockQuery.mockResolvedValue({ affectedRows: 5 })
      await dataCleanupService.runFullCleanup()
      // 至少调用了3次 query（每个子任务一次）
      expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(3)
    })

    it('使用 LOG_RETENTION_DAYS 环境变量', async () => {
      const OLD_ENV = process.env.LOG_RETENTION_DAYS
      process.env.LOG_RETENTION_DAYS = '30'
      mockQuery.mockResolvedValue({ affectedRows: 0 })

      await dataCleanupService.runFullCleanup()
      // 每个子任务应使用 30 天
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [30])

      process.env.LOG_RETENTION_DAYS = OLD_ENV
    })
  })
})
