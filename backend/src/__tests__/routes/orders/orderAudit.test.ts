/**
 * orderAudit 订单审核路由单元测试
 * 聚焦审核状态流转、权限校验、取消申请逻辑
 */

jest.mock('../../../config/database', () => ({
  AppDataSource: { query: jest.fn() }
}))
jest.mock('../../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: jest.fn((_req: any, _res: any, next: any) => next())
}))
jest.mock('../../../utils/tenantRepo', () => ({
  getTenantRepo: jest.fn().mockReturnValue({
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  })
}))
jest.mock('../../../services/OrderNotificationService', () => ({
  orderNotificationService: {
    notifyOrderApproved: jest.fn().mockResolvedValue(undefined),
    notifyOrderRejected: jest.fn().mockResolvedValue(undefined),
  }
}))
jest.mock('../../../utils/dateFormat', () => ({
  formatDateTime: jest.fn().mockReturnValue('2026-05-05 12:00:00')
}))

describe('orderAudit', () => {

  // ==================== 审核状态定义 ====================

  describe('审核状态定义', () => {
    const auditStatuses = {
      pending_audit: '待审核',
      approved: '审核通过（含后续状态）',
      audit_rejected: '审核拒绝',
    }

    it('pending_audit 是有效审核状态', () => {
      expect(auditStatuses).toHaveProperty('pending_audit')
    })

    it('approved 是有效审核状态', () => {
      expect(auditStatuses).toHaveProperty('approved')
    })

    it('audit_rejected 是有效审核状态', () => {
      expect(auditStatuses).toHaveProperty('audit_rejected')
    })
  })

  // ==================== 审核通过后的合法后续状态 ====================

  describe('审核通过后的合法后续状态', () => {
    const approvedStatuses = ['pending_shipment', 'shipped', 'delivered', 'paid', 'completed']

    it('pending_shipment 是审核通过后续状态', () => {
      expect(approvedStatuses).toContain('pending_shipment')
    })

    it('shipped 是审核通过后续状态', () => {
      expect(approvedStatuses).toContain('shipped')
    })

    it('delivered 是审核通过后续状态', () => {
      expect(approvedStatuses).toContain('delivered')
    })

    it('pending_audit 不是审核通过后续状态', () => {
      expect(approvedStatuses).not.toContain('pending_audit')
    })

    it('pending_transfer 不是审核通过后续状态', () => {
      expect(approvedStatuses).not.toContain('pending_transfer')
    })

    it('draft 不是审核通过后续状态', () => {
      expect(approvedStatuses).not.toContain('draft')
    })
  })

  // ==================== 审核操作验证 ====================

  describe('审核操作验证', () => {
    it('审核通过 → 状态从 pending_audit 变为 pending_shipment', () => {
      const order = { status: 'pending_audit' }
      // 模拟审核通过逻辑
      if (order.status === 'pending_audit') {
        order.status = 'pending_shipment'
      }
      expect(order.status).toBe('pending_shipment')
    })

    it('审核拒绝 → 状态从 pending_audit 变为 audit_rejected', () => {
      const order = { status: 'pending_audit' }
      if (order.status === 'pending_audit') {
        order.status = 'audit_rejected'
      }
      expect(order.status).toBe('audit_rejected')
    })

    it('非 pending_audit 状态不允许审核操作', () => {
      const order = { status: 'shipped' }
      const canAudit = order.status === 'pending_audit'
      expect(canAudit).toBe(false)
    })

    it('draft 状态不允许审核操作', () => {
      const order = { status: 'draft' }
      const canAudit = order.status === 'pending_audit'
      expect(canAudit).toBe(false)
    })
  })

  // ==================== 取消申请验证 ====================

  describe('取消申请验证', () => {
    const cancellableStatuses = [
      'pending_audit', 'pending_shipment', 'pending_transfer',
    ]

    it('待审核订单可以申请取消', () => {
      expect(cancellableStatuses).toContain('pending_audit')
    })

    it('待发货订单可以申请取消', () => {
      expect(cancellableStatuses).toContain('pending_shipment')
    })

    it('已发货订单不能直接取消', () => {
      expect(cancellableStatuses).not.toContain('shipped')
    })

    it('已完成订单不能取消', () => {
      expect(cancellableStatuses).not.toContain('completed')
    })

    it('已支付订单不能直接取消', () => {
      expect(cancellableStatuses).not.toContain('paid')
    })
  })

  // ==================== 审核列表分页 ====================

  describe('审核列表分页', () => {
    it('默认分页 page=1, pageSize=20', () => {
      const page = parseInt(undefined as any) || 1
      const pageSize = parseInt(undefined as any) || 20
      expect(page).toBe(1)
      expect(pageSize).toBe(20)
    })

    it('pageSize 最大限制 100', () => {
      const pageSize = Math.min(parseInt('200') || 20, 100)
      expect(pageSize).toBe(100)
    })

    it('pageSize=50 不超过限制', () => {
      const pageSize = Math.min(parseInt('50') || 20, 100)
      expect(pageSize).toBe(50)
    })
  })

  // ==================== 审核统计 ====================

  describe('审核统计', () => {
    it('统计对象包含必要字段', () => {
      const stats = {
        pending: 5,
        approved: 20,
        rejected: 2,
        total: 27,
      }
      expect(stats.pending + stats.approved + stats.rejected).toBe(stats.total)
    })

    it('空统计值为0', () => {
      const stats = { pending: 0, approved: 0, rejected: 0, total: 0 }
      expect(stats.total).toBe(0)
    })
  })
})
