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
    it('成功删除 → 返回各表删除行数之和', async () => {
      // 3 张表各自返回不同行数
      mockQuery.mockResolvedValueOnce({ affectedRows: 50 })
        .mockResolvedValueOnce({ affectedRows: 10 })
        .mockResolvedValueOnce({ affectedRows: 5 })
      const result = await dataCleanupService.cleanupOperationLogs(90)
      expect(result).toBe(65)
      expect(mockQuery).toHaveBeenCalledTimes(3)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('operation_logs'),
        [90]
      )
    })

    it('部分表不存在 → 跳过继续删除其他表', async () => {
      mockQuery.mockRejectedValueOnce(new Error("Table doesn't exist"))
        .mockResolvedValueOnce({ affectedRows: 20 })
        .mockResolvedValueOnce({ affectedRows: 3 })
      const result = await dataCleanupService.cleanupOperationLogs(90)
      expect(result).toBe(23)
      expect(mockQuery).toHaveBeenCalledTimes(3)
    })

    it('全部表异常 → 返回 0', async () => {
      mockQuery.mockRejectedValue(new Error('db error'))
      const result = await dataCleanupService.cleanupOperationLogs(90)
      expect(result).toBe(0)
    })

    it('无数据可删 → 返回 0', async () => {
      mockQuery.mockResolvedValue({ affectedRows: 0 })
      const result = await dataCleanupService.cleanupOperationLogs(90)
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

  // ==================== getOperationLogCleanupConfig ====================

  describe('getOperationLogCleanupConfig', () => {
    it('admin_system_config 存在 → 使用 SAAS 统一配置', async () => {
      mockQuery.mockResolvedValueOnce([{
        config_value: JSON.stringify({
          opLogAutoCleanup: true,
          opLogRetentionDays: '180'
        })
      }])
      const config = await dataCleanupService.getOperationLogCleanupConfig()
      expect(config.autoCleanup).toBe(true)
      expect(config.retentionDays).toBe(180)
    })

    it('admin_system_config 中清理关闭 → autoCleanup=false', async () => {
      mockQuery.mockResolvedValueOnce([{
        config_value: JSON.stringify({
          opLogAutoCleanup: false,
          opLogRetentionDays: '90'
        })
      }])
      const config = await dataCleanupService.getOperationLogCleanupConfig()
      expect(config.autoCleanup).toBe(false)
    })

    it('无 admin_system_config → 回退到 system_configs/oplog', async () => {
      // admin_system_config 查询返回空
      mockQuery.mockResolvedValueOnce([])
      // system_configs 查询
      mockQuery.mockResolvedValueOnce([
        { configKey: 'oplog_auto_cleanup', configValue: 'true' },
        { configKey: 'oplog_retention_days', configValue: '60' },
      ])
      const config = await dataCleanupService.getOperationLogCleanupConfig()
      expect(config.autoCleanup).toBe(true)
      expect(config.retentionDays).toBe(60)
    })

    it('两种配置都不存在 → 兜底环境变量', async () => {
      mockQuery.mockResolvedValueOnce([])  // admin
      mockQuery.mockResolvedValueOnce([])  // system_configs
      const OLD = process.env.LOG_RETENTION_DAYS
      process.env.LOG_RETENTION_DAYS = '30'
      const config = await dataCleanupService.getOperationLogCleanupConfig()
      expect(config.autoCleanup).toBe(true)
      expect(config.retentionDays).toBe(30)
      process.env.LOG_RETENTION_DAYS = OLD
    })

    it('admin_system_config 异常 → 继续回退', async () => {
      mockQuery.mockRejectedValueOnce(new Error('parse error'))
      mockQuery.mockResolvedValueOnce([])
      const OLD = process.env.LOG_RETENTION_DAYS
      process.env.LOG_RETENTION_DAYS = '7'
      const config = await dataCleanupService.getOperationLogCleanupConfig()
      expect(config.retentionDays).toBe(7)
      process.env.LOG_RETENTION_DAYS = OLD
    })
  })

  // ==================== runFullCleanup ====================

  describe('runFullCleanup', () => {
    it('autoCleanup 启用 → 执行全部清理', async () => {
      // getOperationLogCleanupConfig 查询
      mockQuery.mockResolvedValueOnce([{
        config_value: JSON.stringify({
          opLogAutoCleanup: true,
          opLogRetentionDays: '90'
        })
      }])
      // 子任务使用同一个 mockQuery
      mockQuery.mockResolvedValue({ affectedRows: 5 })
      await dataCleanupService.runFullCleanup()
      // 至少调用了配置查询 + 子任务查询
      expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(4)
    })

    it('autoCleanup 禁用 → 跳过全部清理', async () => {
      mockQuery.mockResolvedValueOnce([{
        config_value: JSON.stringify({
          opLogAutoCleanup: false,
          opLogRetentionDays: '90'
        })
      }])
      const callsBefore = mockQuery.mock.calls.length
      await dataCleanupService.runFullCleanup()
      // 只查询了配置，没有执行清理
      expect(mockQuery.mock.calls.length).toBe(callsBefore + 1)
    })
  })
})
