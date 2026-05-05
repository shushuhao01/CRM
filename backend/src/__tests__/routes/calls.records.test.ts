/**
 * 通话记录统计路由 — 业务逻辑单元测试
 * 测试：角色数据权限、统计指标计算
 */

describe('calls/records 统计逻辑', () => {

  // ==================== 角色数据权限 ====================

  describe('角色数据权限', () => {
    function resolveCallScope(role: string, deptId: string) {
      if (['super_admin', 'admin'].includes(role)) return 'all'
      if (role === 'department_manager' && deptId) return 'department'
      return 'self'
    }

    it('super_admin → all', () => expect(resolveCallScope('super_admin', '')).toBe('all'))
    it('admin → all', () => expect(resolveCallScope('admin', '')).toBe('all'))
    it('department_manager + dept → department', () => expect(resolveCallScope('department_manager', 'd1')).toBe('department'))
    it('department_manager 无 dept → self', () => expect(resolveCallScope('department_manager', '')).toBe('self'))
    it('salesperson → self', () => expect(resolveCallScope('salesperson', 'd1')).toBe('self'))
  })

  // ==================== 统计指标计算 ====================

  describe('统计指标计算', () => {
    interface CallRecord {
      status: 'connected' | 'missed' | 'busy'
      direction: 'inbound' | 'outbound'
      duration: number
    }

    function calculateStats(records: CallRecord[]) {
      const total = records.length
      const connected = records.filter(r => r.status === 'connected').length
      const missed = records.filter(r => r.status === 'missed').length
      const incoming = records.filter(r => r.direction === 'inbound').length
      const outgoing = records.filter(r => r.direction === 'outbound').length
      const totalDuration = records.filter(r => r.status === 'connected').reduce((sum, r) => sum + r.duration, 0)
      const avgDuration = connected > 0 ? totalDuration / connected : 0
      const connectionRate = total > 0 ? connected / total : 0

      return { total, connected, missed, incoming, outgoing, totalDuration, avgDuration, connectionRate }
    }

    it('空记录 → 全部为 0', () => {
      const stats = calculateStats([])
      expect(stats.total).toBe(0)
      expect(stats.connectionRate).toBe(0)
    })

    it('全部接通', () => {
      const records: CallRecord[] = [
        { status: 'connected', direction: 'outbound', duration: 60 },
        { status: 'connected', direction: 'outbound', duration: 120 }
      ]
      const stats = calculateStats(records)
      expect(stats.total).toBe(2)
      expect(stats.connected).toBe(2)
      expect(stats.missed).toBe(0)
      expect(stats.totalDuration).toBe(180)
      expect(stats.avgDuration).toBe(90)
      expect(stats.connectionRate).toBe(1)
    })

    it('部分接通', () => {
      const records: CallRecord[] = [
        { status: 'connected', direction: 'outbound', duration: 30 },
        { status: 'missed', direction: 'inbound', duration: 0 },
        { status: 'busy', direction: 'outbound', duration: 0 }
      ]
      const stats = calculateStats(records)
      expect(stats.total).toBe(3)
      expect(stats.connected).toBe(1)
      expect(stats.missed).toBe(1)
      expect(stats.incoming).toBe(1)
      expect(stats.outgoing).toBe(2)
      expect(stats.connectionRate).toBeCloseTo(1 / 3)
    })

    it('全部未接', () => {
      const records: CallRecord[] = [
        { status: 'missed', direction: 'inbound', duration: 0 }
      ]
      const stats = calculateStats(records)
      expect(stats.connected).toBe(0)
      expect(stats.avgDuration).toBe(0)
      expect(stats.connectionRate).toBe(0)
    })
  })

  // ==================== 日期分组统计 ====================

  describe('日期分组', () => {
    function groupByDate(records: { date: string; count: number }[]): Record<string, number> {
      const result: Record<string, number> = {}
      for (const r of records) {
        result[r.date] = (result[r.date] || 0) + r.count
      }
      return result
    }

    it('单日', () => {
      expect(groupByDate([{ date: '2024-01-01', count: 5 }])).toEqual({ '2024-01-01': 5 })
    })

    it('多日', () => {
      const grouped = groupByDate([
        { date: '2024-01-01', count: 3 },
        { date: '2024-01-02', count: 7 },
        { date: '2024-01-01', count: 2 }
      ])
      expect(grouped['2024-01-01']).toBe(5)
      expect(grouped['2024-01-02']).toBe(7)
    })
  })
})
