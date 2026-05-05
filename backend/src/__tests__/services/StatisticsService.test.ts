/**
 * StatisticsService 统计服务单元测试
 * 覆盖 getDashboardStats、getTenantStats、getRevenueStats、getUserStats、getTrendAnalysis
 */

const mockCount = jest.fn()
const mockGetCount = jest.fn()
const mockGetRawMany = jest.fn()
const mockGetRawOne = jest.fn()
const mockQB: any = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  clone: jest.fn(),
  getCount: mockGetCount,
  getRawMany: mockGetRawMany,
  getRawOne: mockGetRawOne,
}
mockQB.clone.mockReturnValue(mockQB)

const mockRepo = {
  count: mockCount,
  createQueryBuilder: jest.fn().mockReturnValue(mockQB),
}

jest.mock('../../config/database', () => ({
  AppDataSource: {
    query: jest.fn(),
    getRepository: jest.fn().mockReturnValue({
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    }),
  }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
// 绕过 CacheService — 直接执行 factory
jest.mock('../../services/CacheService', () => ({
  cacheService: {
    getOrSet: jest.fn((_key: string, factory: () => any) => factory()),
  }
}))

import { AppDataSource } from '../../config/database'

const mockQuery = AppDataSource.query as jest.Mock
const mockGetRepository = AppDataSource.getRepository as jest.Mock

let StatisticsService: any

beforeAll(async () => {
  // 配置 getRepository 返回我们的 mockRepo
  mockGetRepository.mockReturnValue(mockRepo)
  const mod = await import('../../services/StatisticsService')
  StatisticsService = mod.statisticsService
})

beforeEach(() => {
  jest.clearAllMocks()
  mockGetRepository.mockReturnValue(mockRepo)
  mockQB.clone.mockReturnValue(mockQB)
  mockRepo.createQueryBuilder.mockReturnValue(mockQB)
})

describe('StatisticsService', () => {

  describe('getDashboardStats', () => {
    it('查询成功 → 返回完整统计结构', async () => {
      // tenantRepo.count x3
      mockCount
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(8)   // active
        .mockResolvedValueOnce(2)   // expired
      // newTenantsThisMonth
      mockGetCount.mockResolvedValueOnce(3)
      // licenseRepo.count x4
      mockCount
        .mockResolvedValueOnce(20)  // total
        .mockResolvedValueOnce(15)  // active
        .mockResolvedValueOnce(3)   // expired
        .mockResolvedValueOnce(2)   // trial
      // expiringLicenses
      mockGetCount.mockResolvedValueOnce(1)
      // revenue SQL x4
      mockQuery
        .mockResolvedValueOnce([{ total: 99800 }])
        .mockResolvedValueOnce([{ total: 5000 }])
        .mockResolvedValueOnce([{ total: 100 }])
        .mockResolvedValueOnce([{ total: 4000 }])
      // orders SQL x3
      mockQuery
        .mockResolvedValueOnce([{ c: 200 }])
        .mockResolvedValueOnce([{ c: 50 }])
        .mockResolvedValueOnce([{ c: 150 }])
      // privateRepo.count x2
      mockCount
        .mockResolvedValueOnce(300)
        .mockResolvedValueOnce(280)

      const stats = await StatisticsService.getDashboardStats()
      expect(stats).toBeDefined()
      expect(stats.tenants.total).toBe(10)
      expect(stats.tenants.active).toBe(8)
      expect(stats.licenses.total).toBe(20)
      expect(stats.revenue.total).toBe(99800)
      expect(stats.orders.total).toBe(200)
      expect(stats.privateCustomers.total).toBe(300)
    })

    it('收入 null → 默认 0', async () => {
      mockCount.mockResolvedValue(0)
      mockGetCount.mockResolvedValue(0)
      mockQuery.mockResolvedValue([{ total: null, c: 0 }])

      const stats = await StatisticsService.getDashboardStats()
      expect(stats.revenue.total).toBe(0)
      expect(stats.revenue.today).toBe(0)
    })
  })

  describe('getTenantStats', () => {
    it('正常返回 → 包含 total/active/expired/suspended/byPackage', async () => {
      mockGetCount
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(80)   // active
        .mockResolvedValueOnce(10)   // expired
        .mockResolvedValueOnce(5)    // suspended
      mockGetRawMany.mockResolvedValueOnce([{ packageName: '基础版', count: 50 }])

      const stats = await StatisticsService.getTenantStats({})
      expect(stats.total).toBe(100)
      expect(stats.active).toBe(80)
      expect(stats.byPackage).toHaveLength(1)
    })

    it('DB 异常 → 返回全零', async () => {
      mockGetCount.mockRejectedValue(new Error('fail'))

      const stats = await StatisticsService.getTenantStats({})
      expect(stats.total).toBe(0)
      expect(stats.byPackage).toEqual([])
    })
  })

  describe('getRevenueStats', () => {
    it('按天分组 → 正常返回', async () => {
      mockQuery
        .mockResolvedValueOnce([{ total: 50000, count: 100 }])
        .mockResolvedValueOnce([{ payType: 'wechat', amount: 30000, count: 60 }])
        .mockResolvedValueOnce([{ date: '2024-06-01', amount: 1000, count: 5 }])

      const stats = await StatisticsService.getRevenueStats({ groupBy: 'day' })
      expect(stats.total).toBe(50000)
      expect(stats.count).toBe(100)
      expect(stats.byPayType).toHaveLength(1)
      expect(stats.trend).toHaveLength(1)
    })
  })

  describe('getUserStats', () => {
    it('正常返回', async () => {
      mockGetRawOne.mockResolvedValueOnce({ totalUsers: 500, avgUsers: 10.5, maxUsers: 50 })

      const stats = await StatisticsService.getUserStats({})
      expect(stats.totalUsers).toBe(500)
      expect(stats.maxUsers).toBe(50)
    })

    it('DB 异常 → 返回默认值', async () => {
      mockGetRawOne.mockRejectedValue(new Error('fail'))

      const stats = await StatisticsService.getUserStats({})
      expect(stats.totalUsers).toBe(0)
      expect(stats.avgUsers).toBe('0.00')
    })
  })

  describe('getTrendAnalysis', () => {
    it('正常返回 revenueTrend + tenantTrend', async () => {
      mockQuery.mockResolvedValueOnce([{ date: '2024-06-01', amount: 1000 }])
      mockGetRawMany.mockResolvedValueOnce([{ date: '2024-06-01', count: 2 }])

      const stats = await StatisticsService.getTrendAnalysis(30)
      expect(stats.revenueTrend).toHaveLength(1)
      expect(stats.tenantTrend).toHaveLength(1)
    })
  })
})
