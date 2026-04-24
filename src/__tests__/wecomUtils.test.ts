/**
 * 企微管理 API 工具函数单元测试
 * Phase 11: 前端逻辑测试
 */
import { describe, test, expect } from 'vitest'

// ==================== 企微配置状态映射测试 ====================

const getStatusType = (status: string) =>
  ({ connected: 'success', failed: 'danger', pending: 'info' }[status] || 'info') as string

const getStatusText = (status: string) =>
  ({ connected: '已连接', failed: '连接失败', pending: '待测试' }[status] || '未知')

describe('企微配置 - 状态映射', () => {
  test('connected → success / 已连接', () => {
    expect(getStatusType('connected')).toBe('success')
    expect(getStatusText('connected')).toBe('已连接')
  })

  test('failed → danger / 连接失败', () => {
    expect(getStatusType('failed')).toBe('danger')
    expect(getStatusText('failed')).toBe('连接失败')
  })

  test('pending → info / 待测试', () => {
    expect(getStatusType('pending')).toBe('info')
    expect(getStatusText('pending')).toBe('待测试')
  })

  test('unknown → info / 未知', () => {
    expect(getStatusType('unknown')).toBe('info')
    expect(getStatusText('unknown')).toBe('未知')
  })

  test('空字符串 → info / 未知', () => {
    expect(getStatusType('')).toBe('info')
    expect(getStatusText('')).toBe('未知')
  })
})

// ==================== 席位百分比计算测试 ====================

function calcSeatPercent(used: number, max: number): number {
  if (!max) return 0
  return Math.min(100, Math.round(used / max * 100))
}

function calcSeatBarClass(percent: number): string {
  if (percent >= 100) return 'full'
  if (percent >= 90) return 'warn'
  return 'normal'
}

describe('席位用量计算', () => {
  test('0/10 = 0%', () => {
    expect(calcSeatPercent(0, 10)).toBe(0)
  })

  test('5/10 = 50%', () => {
    expect(calcSeatPercent(5, 10)).toBe(50)
  })

  test('10/10 = 100%', () => {
    expect(calcSeatPercent(10, 10)).toBe(100)
  })

  test('超出上限 15/10 → capped at 100%', () => {
    expect(calcSeatPercent(15, 10)).toBe(100)
  })

  test('max=0 → 0%', () => {
    expect(calcSeatPercent(5, 0)).toBe(0)
  })

  test('进度条类名: <90% → normal', () => {
    expect(calcSeatBarClass(50)).toBe('normal')
    expect(calcSeatBarClass(89)).toBe('normal')
  })

  test('进度条类名: 90% → warn', () => {
    expect(calcSeatBarClass(90)).toBe('warn')
    expect(calcSeatBarClass(99)).toBe('warn')
  })

  test('进度条类名: 100% → full', () => {
    expect(calcSeatBarClass(100)).toBe('full')
  })
})

// ==================== VAS 价格计算测试 ====================

interface TierPricing {
  min: number
  max: number
  price: number
}

function calcVasPrice(userCount: number, tiers: TierPricing[], defaultPrice: number): number {
  for (const tier of tiers) {
    if (userCount >= tier.min && userCount <= tier.max) {
      return tier.price * userCount
    }
  }
  return defaultPrice * userCount
}

describe('VAS价格计算', () => {
  const tiers: TierPricing[] = [
    { min: 1, max: 10, price: 100 },
    { min: 11, max: 50, price: 80 },
    { min: 51, max: 200, price: 60 },
  ]

  test('5人 → 100*5 = 500', () => {
    expect(calcVasPrice(5, tiers, 50)).toBe(500)
  })

  test('30人 → 80*30 = 2400', () => {
    expect(calcVasPrice(30, tiers, 50)).toBe(2400)
  })

  test('100人 → 60*100 = 6000', () => {
    expect(calcVasPrice(100, tiers, 50)).toBe(6000)
  })

  test('超出所有区间 → 使用默认价格', () => {
    expect(calcVasPrice(300, tiers, 50)).toBe(15000) // 50*300
  })

  test('空阶梯 → 使用默认价格', () => {
    expect(calcVasPrice(10, [], 99)).toBe(990)
  })
})

// ==================== 敏感词匹配测试 ====================

function matchSensitiveWords(text: string, words: string[]): string[] {
  return words.filter(w => text.includes(w))
}

describe('敏感词匹配', () => {
  const words = ['赌博', '违法', '代开发票', '刷单']

  test('无命中', () => {
    expect(matchSensitiveWords('你好，请问有什么帮助？', words)).toEqual([])
  })

  test('命中1个', () => {
    expect(matchSensitiveWords('有没有刷单的渠道', words)).toEqual(['刷单'])
  })

  test('命中多个', () => {
    expect(matchSensitiveWords('赌博违法内容', words)).toEqual(['赌博', '违法'])
  })

  test('空文本', () => {
    expect(matchSensitiveWords('', words)).toEqual([])
  })

  test('空词库', () => {
    expect(matchSensitiveWords('任何文本', [])).toEqual([])
  })
})

// ==================== 可见性文本映射 ====================

function visibilityText(v: string): string {
  const map: Record<string, string> = { self: '仅查看自己', department: '查看本部门', all: '查看全部' }
  return map[v] || '查看全部'
}

describe('可见性文本映射', () => {
  test('self → 仅查看自己', () => {
    expect(visibilityText('self')).toBe('仅查看自己')
  })

  test('department → 查看本部门', () => {
    expect(visibilityText('department')).toBe('查看本部门')
  })

  test('all → 查看全部', () => {
    expect(visibilityText('all')).toBe('查看全部')
  })

  test('undefined → 查看全部(默认)', () => {
    expect(visibilityText('')).toBe('查看全部')
  })
})

// ==================== 日期格式化测试 ====================

function formatWecomDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('日期格式化', () => {
  test('ISO日期字符串', () => {
    expect(formatWecomDate('2026-04-13T10:30:00Z')).toBe('2026-04-13')
  })

  test('空字符串 → "-"', () => {
    expect(formatWecomDate('')).toBe('-')
  })

  test('无效日期 → "-"', () => {
    expect(formatWecomDate('invalid')).toBe('-')
  })
})

// ==================== 企微配置列表过滤逻辑 ====================

describe('配置列表过滤', () => {
  const configs = [
    { id: 1, name: '主企业', authType: 'self_built', connectionStatus: 'connected', isEnabled: true },
    { id: 2, name: '分公司', authType: 'third_party', connectionStatus: 'connected', isEnabled: true },
    { id: 3, name: '测试', authType: 'self_built', connectionStatus: 'failed', isEnabled: false },
  ]

  test('过滤已连接', () => {
    const connected = configs.filter(c => c.connectionStatus === 'connected')
    expect(connected.length).toBe(2)
  })

  test('过滤已启用', () => {
    const enabled = configs.filter(c => c.isEnabled)
    expect(enabled.length).toBe(2)
  })

  test('过滤第三方应用', () => {
    const thirdParty = configs.filter(c => c.authType === 'third_party')
    expect(thirdParty.length).toBe(1)
    expect(thirdParty[0].name).toBe('分公司')
  })

  test('空列表', () => {
    const empty: any[] = []
    expect(empty.filter(c => c.isEnabled).length).toBe(0)
  })
})

