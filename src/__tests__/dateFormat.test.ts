/**
 * dateFormat.ts 日期格式化工具单元测试
 */
import { describe, test, expect } from 'vitest'
import { formatDateTime, formatDate, formatDateLocal } from '@/utils/dateFormat'

describe('formatDateTime', () => {
  test('null → "-"', () => {
    expect(formatDateTime(null)).toBe('-')
  })
  test('undefined → "-"', () => {
    expect(formatDateTime(undefined)).toBe('-')
  })
  test('合法日期字符串 → 格式化', () => {
    const result = formatDateTime('2025-01-15T10:30:00')
    expect(result).toBeTruthy()
    expect(result).not.toBe('-')
    // 包含年月日时分信息
    expect(result).toContain('2025')
  })
  test('Date 对象 → 格式化', () => {
    const date = new Date(2025, 0, 15, 10, 30) // 2025-01-15 10:30
    const result = formatDateTime(date)
    expect(result).toContain('2025')
  })
  test('无效日期字符串 → 原值', () => {
    const result = formatDateTime('not-a-date')
    expect(result).toBe('not-a-date')
  })
})

describe('formatDate', () => {
  test('null → "-"', () => {
    expect(formatDate(null)).toBe('-')
  })
  test('合法日期 → 格式化', () => {
    const result = formatDate('2025-06-15')
    expect(result).toBeTruthy()
    expect(result).toContain('2025')
  })
  test('Date 对象 → 格式化', () => {
    const date = new Date(2025, 5, 15) // 2025-06-15
    const result = formatDate(date)
    expect(result).toContain('2025')
  })
  test('无效日期 → 原值', () => {
    expect(formatDate('invalid')).toBe('invalid')
  })
})

describe('formatDateLocal', () => {
  test('返回 YYYY-MM-DD 格式', () => {
    const date = new Date(2025, 0, 5) // 2025-01-05
    expect(formatDateLocal(date)).toBe('2025-01-05')
  })
  test('月/日补零', () => {
    const date = new Date(2025, 8, 3) // 2025-09-03
    expect(formatDateLocal(date)).toBe('2025-09-03')
  })
  test('年末日期', () => {
    const date = new Date(2025, 11, 31) // 2025-12-31
    expect(formatDateLocal(date)).toBe('2025-12-31')
  })
})
