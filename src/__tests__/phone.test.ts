/**
 * phone.ts 手机号工具函数单元测试
 * maskPhone 依赖 Vue store，跳过；只测试纯函数
 */
import { describe, test, expect } from 'vitest'
import { isValidPhone, getPhoneCarrier } from '@/utils/phone'

describe('isValidPhone', () => {
  test('合法手机号 → true', () => {
    expect(isValidPhone('13800138000')).toBe(true)
    expect(isValidPhone('19912345678')).toBe(true)
    expect(isValidPhone('15000000000')).toBe(true)
  })
  test('12开头 → false', () => {
    expect(isValidPhone('12345678901')).toBe(false)
  })
  test('太短 → false', () => {
    expect(isValidPhone('1380013800')).toBe(false)
  })
  test('太长 → false', () => {
    expect(isValidPhone('138001380001')).toBe(false)
  })
  test('包含字母 → false', () => {
    expect(isValidPhone('1380013800a')).toBe(false)
  })
  test('空字符串 → false', () => {
    expect(isValidPhone('')).toBe(false)
  })
})

describe('getPhoneCarrier', () => {
  test('中国移动', () => {
    expect(getPhoneCarrier('13800138000')).toBe('中国移动')
    expect(getPhoneCarrier('18800000000')).toBe('中国移动')
    expect(getPhoneCarrier('19800000000')).toBe('中国移动')
  })
  test('中国联通', () => {
    expect(getPhoneCarrier('13000000000')).toBe('中国联通')
    expect(getPhoneCarrier('18500000000')).toBe('中国联通')
    expect(getPhoneCarrier('16600000000')).toBe('中国联通')
  })
  test('中国电信', () => {
    expect(getPhoneCarrier('13300000000')).toBe('中国电信')
    expect(getPhoneCarrier('18900000000')).toBe('中国电信')
    expect(getPhoneCarrier('19900000000')).toBe('中国电信')
  })
  test('空/短号码 → 未知', () => {
    expect(getPhoneCarrier('')).toBe('未知')
    expect(getPhoneCarrier('123')).toBe('未知')
  })
  test('不在列表中的号段 → 其他', () => {
    expect(getPhoneCarrier('14000000000')).toBe('其他')
  })
})
