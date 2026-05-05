/**
 * orderHelpers 工具函数单元测试
 * 仅测试纯函数部分（不依赖数据库的函数）
 */

// Mock dependencies that are imported at module level
jest.mock('../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../utils/tenantRepo', () => ({
  getTenantRepo: jest.fn()
}))

import {
  formatToBeijingTime,
  formatLocalDate,
  getStatusTitle,
  getActionTypeTitle,
  getAfterSalesTitle,
} from '../../routes/orders/orderHelpers'

// ==================== formatToBeijingTime ====================

describe('formatToBeijingTime', () => {
  it('null / undefined / 空 → 空字符串', () => {
    expect(formatToBeijingTime(null)).toBe('')
    expect(formatToBeijingTime(undefined)).toBe('')
    expect(formatToBeijingTime('')).toBe('')
  })

  it('无效日期字符串 → 空字符串', () => {
    expect(formatToBeijingTime('not-a-date')).toBe('')
  })

  it('Date 对象 → YYYY/MM/DD HH:mm:ss', () => {
    const d = new Date(2026, 0, 15, 14, 30, 45) // 2026-01-15 14:30:45
    const result = formatToBeijingTime(d)
    expect(result).toBe('2026/01/15 14:30:45')
  })

  it('日期字符串 → 格式化', () => {
    // 使用本地时间字符串确保一致
    const d = new Date(2026, 4, 5, 9, 5, 3)
    const result = formatToBeijingTime(d.toISOString())
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('月/日/时/分/秒前补零', () => {
    const d = new Date(2026, 0, 1, 1, 2, 3) // 2026-01-01 01:02:03
    expect(formatToBeijingTime(d)).toBe('2026/01/01 01:02:03')
  })
})

// ==================== formatLocalDate ====================

describe('formatLocalDate', () => {
  it('格式为 YYYY-MM-DD', () => {
    const d = new Date(2026, 11, 25) // 2026-12-25
    expect(formatLocalDate(d)).toBe('2026-12-25')
  })

  it('月/日前补零', () => {
    const d = new Date(2026, 0, 5) // 2026-01-05
    expect(formatLocalDate(d)).toBe('2026-01-05')
  })
})

// ==================== getStatusTitle ====================

describe('getStatusTitle', () => {
  const knownStatuses = [
    ['pending', '待确认'],
    ['pending_transfer', '待流转'],
    ['pending_audit', '待审核'],
    ['confirmed', '已确认'],
    ['paid', '已支付'],
    ['pending_shipment', '待发货'],
    ['shipped', '已发货'],
    ['delivered', '已签收'],
    ['completed', '已完成'],
    ['cancelled', '已取消'],
    ['refunded', '已退款'],
    ['audit_rejected', '审核拒绝'],
    ['rejected', '拒收'],
    ['rejected_returned', '拒收已退回'],
    ['logistics_returned', '物流退回'],
    ['logistics_cancelled', '物流取消'],
    ['package_exception', '包裹异常'],
    ['after_sales_created', '已建售后'],
  ]

  knownStatuses.forEach(([status, expected]) => {
    it(`${status} → ${expected}`, () => {
      expect(getStatusTitle(status)).toBe(expected)
    })
  })

  it('未知状态 → 原样返回', () => {
    expect(getStatusTitle('unknown_status')).toBe('unknown_status')
  })
})

// ==================== getActionTypeTitle ====================

describe('getActionTypeTitle', () => {
  it('create → 订单创建', () => {
    expect(getActionTypeTitle('create', 'pending')).toBe('订单创建')
  })

  it('edit → 编辑订单', () => {
    expect(getActionTypeTitle('edit', 'confirmed')).toBe('编辑订单')
  })

  it('submit_audit → 提交审核', () => {
    expect(getActionTypeTitle('submit_audit', '')).toBe('提交审核')
  })

  it('audit_approve → 审核通过', () => {
    expect(getActionTypeTitle('audit_approve', '')).toBe('审核通过')
  })

  it('audit_reject → 审核拒绝', () => {
    expect(getActionTypeTitle('audit_reject', '')).toBe('审核拒绝')
  })

  it('status_change → 使用 getStatusTitle', () => {
    expect(getActionTypeTitle('status_change', 'shipped')).toBe('已发货')
  })

  it('undefined → 默认为 status_change', () => {
    expect(getActionTypeTitle(undefined, 'completed')).toBe('已完成')
  })

  it('未知 actionType → fallback 到 getStatusTitle', () => {
    expect(getActionTypeTitle('unknown', 'paid')).toBe('已支付')
  })
})

// ==================== getAfterSalesTitle ====================

describe('getAfterSalesTitle', () => {
  it('return + pending → 退货申请 - 已提交', () => {
    expect(getAfterSalesTitle('return', 'pending')).toBe('退货申请 - 已提交')
  })

  it('exchange + processing → 换货申请 - 处理中', () => {
    expect(getAfterSalesTitle('exchange', 'processing')).toBe('换货申请 - 处理中')
  })

  it('repair + resolved → 维修申请 - 已解决', () => {
    expect(getAfterSalesTitle('repair', 'resolved')).toBe('维修申请 - 已解决')
  })

  it('refund + closed → 退款申请 - 已关闭', () => {
    expect(getAfterSalesTitle('refund', 'closed')).toBe('退款申请 - 已关闭')
  })

  it('未知类型 → 售后申请', () => {
    expect(getAfterSalesTitle('unknown', 'pending')).toBe('售后申请 - 已提交')
  })

  it('未知状态 → 原样返回', () => {
    expect(getAfterSalesTitle('return', 'custom_status')).toBe('退货申请 - custom_status')
  })
})
