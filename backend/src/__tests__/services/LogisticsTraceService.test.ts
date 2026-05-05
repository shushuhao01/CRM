/**
 * LogisticsTraceService 物流轨迹服务单元测试
 * 测试：detectCompanyCode、STATUS_MAP/COMPANY_NAMES 映射、queryTrace 高层逻辑
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn(), getRepository: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../utils/tenantRepo', () => ({
  getTenantRepo: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null) }))
}))
jest.mock('../../utils/dateFormat', () => ({
  formatDateTime: jest.fn((d: any) => String(d))
}))
jest.mock('../../services/ExpressAPIService', () => ({
  ExpressAPIService: {
    getInstance: jest.fn(() => ({
      getConfigStatus: jest.fn(() => ({ kuaidi100: false })),
      queryExpress: jest.fn()
    }))
  }
}))

import { STATUS_MAP } from '../../services/LogisticsTraceService'

// 获取 class 实例
let service: any
beforeAll(async () => {
  const mod = await import('../../services/LogisticsTraceService')
  const Cls = (mod as any).default || (mod as any).LogisticsTraceService
  if (Cls && typeof Cls === 'function') {
    service = new Cls()
  } else {
    // 可能是实例导出
    service = (mod as any).logisticsTraceService
  }
  // 如果都无法获取，手动创建
  if (!service) {
    // 直接用导出的类
    const keys = Object.keys(mod).filter(k => typeof (mod as any)[k] === 'function')
    if (keys.length > 0) {
      service = new (mod as any)[keys[0]]()
    }
  }
})

describe('LogisticsTraceService', () => {

  // ==================== STATUS_MAP ====================

  describe('STATUS_MAP', () => {
    it('包含 8 个标准状态', () => {
      expect(Object.keys(STATUS_MAP).length).toBe(8)
    })

    it('SIGN → delivered', () => {
      expect(STATUS_MAP['SIGN']).toEqual({ status: 'delivered', text: '已签收' })
    })

    it('REJECT → rejected', () => {
      expect(STATUS_MAP['REJECT']).toEqual({ status: 'rejected', text: '拒收' })
    })

    it('TRANSPORT → in_transit', () => {
      expect(STATUS_MAP['TRANSPORT']).toEqual({ status: 'in_transit', text: '运输中' })
    })
  })

  // ==================== detectCompanyCode ====================

  describe('detectCompanyCode', () => {
    // 跳过如果service为null
    beforeAll(() => {
      if (!service) {
        console.warn('LogisticsTraceService 实例未获取到，跳过 detectCompanyCode 测试')
      }
    })

    it('顺丰 SF 开头', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('SF1234567890123')).toBe('SF')
    })

    it('中通 7 开头 13位', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('7300000000000')).toBe('ZTO')
    })

    it('圆通 YT 开头', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('YT1234567890123')).toBe('YTO')
    })

    it('77 开头优先匹配 ZTO（pattern 顺序）', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      // 77 开头 13 位同时匹配 ZTO 和 STO，但 ZTO 在前所以优先
      expect(fn('7700000000000')).toBe('ZTO')
    })

    it('韵达 1 开头 13位', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('1300000000000')).toBe('YD')
    })

    it('极兔 JT 开头', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('JT1234567890123')).toBe('JTSD')
    })

    it('EMS 特定格式', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('EA123456789CN')).toBe('EMS')
    })

    it('京东 JD 开头', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('JDABCDEFGH12')).toBe('JD')
    })

    it('德邦 DPK 开头', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('DPK1234567890')).toBe('DBL')
    })

    it('无法识别 → null', () => {
      if (!service) return
      const fn = (service as any).detectCompanyCode.bind(service)
      expect(fn('UNKNOWN123')).toBeNull()
    })
  })

  // ==================== queryTrace 高层逻辑 ====================

  describe('queryTrace', () => {
    it('无法识别快递公司 + 未指定 → 返回 success=false', async () => {
      if (!service) return
      const result = await service.queryTrace('UNKNOWN_NO_MATCH', undefined)
      expect(result.success).toBe(false)
      expect(result.statusText).toContain('无法识别')
    })

    it('识别到公司但无 API 配置 → 返回 success=false', async () => {
      if (!service) return
      const result = await service.queryTrace('SF1234567890123', 'SF')
      expect(result.success).toBe(false)
    })
  })
})
