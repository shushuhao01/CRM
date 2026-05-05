/**
 * orderStatusConfig.ts 订单状态配置单元测试
 */
import { describe, test, expect } from 'vitest'
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_TEXT,
  ORDER_STATUS_TAG_TYPE,
  getOrderStatusColor,
  getOrderStatusText,
  getOrderStatusTagType,
  getOrderStatusStyle,
} from '@/utils/orderStatusConfig'

describe('getOrderStatusColor', () => {
  test('已知状态 → 返回配置颜色', () => {
    expect(getOrderStatusColor('pending_audit')).toBe('#FA8C16')
    expect(getOrderStatusColor('shipped')).toBe('#36CFC9')
    expect(getOrderStatusColor('cancelled')).toBe('#808080')
  })
  test('未知状态 → 默认 #909399', () => {
    expect(getOrderStatusColor('nonexistent')).toBe('#909399')
  })
})

describe('getOrderStatusText', () => {
  test('已知状态 → 中文文本', () => {
    expect(getOrderStatusText('pending_audit')).toBe('待审核')
    expect(getOrderStatusText('shipped')).toBe('已发货')
    expect(getOrderStatusText('delivered')).toBe('已签收')
    expect(getOrderStatusText('cancelled')).toBe('已取消')
    expect(getOrderStatusText('draft')).toBe('草稿')
  })
  test('别名兼容', () => {
    expect(getOrderStatusText('signed')).toBe('已签收')
    expect(getOrderStatusText('delivering')).toBe('派送中')
    expect(getOrderStatusText('shipping')).toBe('运输中')
    expect(getOrderStatusText('picked')).toBe('已揽收')
  })
  test('未知状态 → 返回原值', () => {
    expect(getOrderStatusText('foo')).toBe('foo')
  })
  test('空字符串 → 未知', () => {
    expect(getOrderStatusText('')).toBe('未知')
  })
})

describe('getOrderStatusTagType', () => {
  test('已知 → tag 类型', () => {
    expect(getOrderStatusTagType('approved')).toBe('success')
    expect(getOrderStatusTagType('pending_audit')).toBe('warning')
    expect(getOrderStatusTagType('rejected')).toBe('danger')
    expect(getOrderStatusTagType('cancelled')).toBe('info')
    expect(getOrderStatusTagType('pending_shipment')).toBe('primary')
  })
  test('未知 → info', () => {
    expect(getOrderStatusTagType('nonexistent')).toBe('info')
  })
})

describe('getOrderStatusStyle', () => {
  test('已知状态 → 返回颜色样式对象', () => {
    const style = getOrderStatusStyle('shipped')
    expect(style.color).toBe('#36CFC9')
    expect(style.borderColor).toBe('#36CFC9')
    expect(style.backgroundColor).toBe('#36CFC920')
  })
  test('未知状态 → 默认灰色', () => {
    const style = getOrderStatusStyle('nonexistent')
    expect(style.color).toBe('#909399')
  })
})

describe('常量完整性', () => {
  test('TEXT 和 COLORS 的状态键基本一致', () => {
    const textKeys = Object.keys(ORDER_STATUS_TEXT)
    const colorKeys = Object.keys(ORDER_STATUS_COLORS)
    // 大部分键应该同时存在
    const commonKeys = textKeys.filter(k => colorKeys.includes(k))
    expect(commonKeys.length).toBeGreaterThan(20)
  })
  test('TAG_TYPE 覆盖主要状态', () => {
    expect(Object.keys(ORDER_STATUS_TAG_TYPE).length).toBeGreaterThan(20)
  })
})
