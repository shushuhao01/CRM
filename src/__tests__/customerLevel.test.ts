/**
 * customerLevel.ts 客户等级工具函数单元测试
 */
import { describe, test, expect } from 'vitest'
import {
  CustomerLevel,
  getLevelLabel,
  getLevelType,
  getLevelColor,
  getLevelOptions,
  normalizeLevelValue,
} from '@/utils/customerLevel'

describe('getLevelLabel', () => {
  test('bronze → 铜牌客户', () => expect(getLevelLabel('bronze')).toBe('铜牌客户'))
  test('silver → 银牌客户', () => expect(getLevelLabel('silver')).toBe('银牌客户'))
  test('gold → 金牌客户', () => expect(getLevelLabel('gold')).toBe('金牌客户'))
  test('diamond → 钻石客户', () => expect(getLevelLabel('diamond')).toBe('钻石客户'))
  test('未知 → 默认铜牌', () => expect(getLevelLabel('unknown')).toBe('铜牌客户'))
})

describe('getLevelType', () => {
  test('gold → warning', () => expect(getLevelType('gold')).toBe('warning'))
  test('diamond → danger', () => expect(getLevelType('diamond')).toBe('danger'))
  test('silver → info', () => expect(getLevelType('silver')).toBe('info'))
  test('未知 → 空字符串', () => expect(getLevelType('unknown')).toBe(''))
})

describe('getLevelColor', () => {
  test('gold → #E6A23C', () => expect(getLevelColor('gold')).toBe('#E6A23C'))
  test('diamond → #F56C6C', () => expect(getLevelColor('diamond')).toBe('#F56C6C'))
  test('未知 → #909399', () => expect(getLevelColor('unknown')).toBe('#909399'))
})

describe('getLevelOptions', () => {
  test('返回4个选项', () => {
    const opts = getLevelOptions()
    expect(opts).toHaveLength(4)
    expect(opts[0]).toEqual({ label: '铜牌客户', value: CustomerLevel.BRONZE })
  })
})

describe('normalizeLevelValue', () => {
  test('中文 → 英文枚举', () => {
    expect(normalizeLevelValue('普通客户')).toBe(CustomerLevel.BRONZE)
    expect(normalizeLevelValue('金牌客户')).toBe(CustomerLevel.GOLD)
    expect(normalizeLevelValue('钻石客户')).toBe(CustomerLevel.DIAMOND)
    expect(normalizeLevelValue('银牌客户')).toBe(CustomerLevel.SILVER)
  })
  test('兼容旧数据', () => {
    expect(normalizeLevelValue('VIP客户')).toBe(CustomerLevel.GOLD)
    expect(normalizeLevelValue('SVIP客户')).toBe(CustomerLevel.DIAMOND)
    expect(normalizeLevelValue('白银客户')).toBe(CustomerLevel.SILVER)
    expect(normalizeLevelValue('normal')).toBe(CustomerLevel.BRONZE)
  })
  test('英文原值 → 原样返回', () => {
    expect(normalizeLevelValue('bronze')).toBe(CustomerLevel.BRONZE)
    expect(normalizeLevelValue('gold')).toBe(CustomerLevel.GOLD)
  })
  test('未知 → 默认 bronze', () => {
    expect(normalizeLevelValue('xyz')).toBe(CustomerLevel.BRONZE)
  })
})
