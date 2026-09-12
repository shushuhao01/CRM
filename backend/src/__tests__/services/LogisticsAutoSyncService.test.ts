/**
 * LogisticsAutoSyncService 单元测试
 *
 * 重点验证：
 * - detectLogisticsStatus 检测优先级（退回 > 拒收 > 签收）
 * - mapLogisticsToOrderStatus 对三个非终态（拒收 rejected / 包裹异常 package_exception / 状态异常 abnormal）
 *   以及已发货 shipped 的映射是否完整，确保它们后续物流更新时仍能同步到终态（签收 / 拒收已退回）
 * - 终态订单不再参与同步
 */

jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn(), getRepository: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../utils/operationLogWriter', () => ({
  translateStatus: jest.fn((s: string) => s),
  translateLogisticsStatus: jest.fn((s: string) => s)
}))
jest.mock('../../services/LogisticsTraceService', () => ({
  logisticsTraceService: { queryTrace: jest.fn() }
}))
jest.mock('../../utils/tenantContext', () => ({
  TenantContextManager: { run: jest.fn((_ctx: any, fn: any) => fn()) }
}))
jest.mock('../../config/deploy', () => ({
  deployConfig: { isSaaS: jest.fn(() => false) }
}))

import {
  detectLogisticsStatus,
  mapLogisticsToOrderStatus
} from '../../services/LogisticsAutoSyncService'

/** 非终态订单状态（应继续参与自动同步） */
const NON_TERMINAL = ['shipped', 'rejected', 'package_exception', 'abnormal']

/** 终态订单状态（不应再被同步覆盖） */
const TERMINAL = [
  'delivered', 'rejected_returned', 'cancelled', 'after_sales_created',
  'logistics_cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected'
]

describe('detectLogisticsStatus', () => {
  it('退回优先于签收："退回签收" 判定为 returned', () => {
    expect(detectLogisticsStatus('快件已退回签收')).toBe('returned')
  })

  it('拒收优先于签收："客户拒收" 判定为 rejected', () => {
    expect(detectLogisticsStatus('客户拒收，快件已签收')).toBe('rejected')
  })

  it('正常签收判定为 delivered', () => {
    expect(detectLogisticsStatus('快件已签收，本人签收')).toBe('delivered')
  })

  it('派送异常判定为 exception', () => {
    expect(detectLogisticsStatus('派送异常，电话无人接听')).toBe('exception')
  })

  it('在途判定为 in_transit', () => {
    expect(detectLogisticsStatus('快件已离开转运中心')).toBe('in_transit')
  })

  it('空描述返回 unknown', () => {
    expect(detectLogisticsStatus('')).toBe('unknown')
  })
})

describe('mapLogisticsToOrderStatus', () => {
  describe('非终态订单 + 物流已签收 → 已签收', () => {
    it.each(NON_TERMINAL)('%s → delivered', (current) => {
      expect(mapLogisticsToOrderStatus('delivered', current)).toBe('delivered')
    })
  })

  describe('非终态订单 + 物流退回 → 拒收已退回', () => {
    it.each(NON_TERMINAL)('%s → rejected_returned', (current) => {
      expect(mapLogisticsToOrderStatus('returned', current)).toBe('rejected_returned')
    })
  })

  describe('非终态订单 + 物流拒收 → 拒收', () => {
    it.each(['shipped', 'package_exception', 'abnormal'])('%s → rejected', (current) => {
      expect(mapLogisticsToOrderStatus('rejected', current)).toBe('rejected')
    })

    it('rejected 保持原状（不重复更新）', () => {
      expect(mapLogisticsToOrderStatus('rejected', 'rejected')).toBeNull()
    })
  })

  describe('物流异常 → 包裹异常', () => {
    it('shipped → package_exception', () => {
      expect(mapLogisticsToOrderStatus('exception', 'shipped')).toBe('package_exception')
    })

    it('package_exception 保持原状', () => {
      expect(mapLogisticsToOrderStatus('exception', 'package_exception')).toBeNull()
    })

    it('abnormal 保持原状（不跨状态改判）', () => {
      expect(mapLogisticsToOrderStatus('exception', 'abnormal')).toBeNull()
    })
  })

  describe('在途物流状态不更新订单状态', () => {
    it.each(['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'unknown'])(
      '%s 返回 null',
      (logistics) => {
        expect(mapLogisticsToOrderStatus(logistics, 'shipped')).toBeNull()
      }
    )
  })

  describe('终态订单不再参与同步', () => {
    it.each(TERMINAL)('%s 对任何物流状态都返回 null', (current) => {
      expect(mapLogisticsToOrderStatus('delivered', current)).toBeNull()
      expect(mapLogisticsToOrderStatus('returned', current)).toBeNull()
      expect(mapLogisticsToOrderStatus('rejected', current)).toBeNull()
      expect(mapLogisticsToOrderStatus('exception', current)).toBeNull()
    })
  })

  describe('回归：状态异常 abnormal 必须可持续同步到终态', () => {
    it('状态异常 + 后续签收 → 已签收', () => {
      expect(mapLogisticsToOrderStatus('delivered', 'abnormal')).toBe('delivered')
    })

    it('状态异常 + 后续退回 → 拒收已退回', () => {
      expect(mapLogisticsToOrderStatus('returned', 'abnormal')).toBe('rejected_returned')
    })

    it('包裹异常 + 后续签收 → 已签收', () => {
      expect(mapLogisticsToOrderStatus('delivered', 'package_exception')).toBe('delivered')
    })

    it('拒收 + 后续重新派送签收 → 已签收', () => {
      expect(mapLogisticsToOrderStatus('delivered', 'rejected')).toBe('delivered')
    })
  })
})
