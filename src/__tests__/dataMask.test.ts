/**
 * dataMask 数据脱敏工具单元测试
 */
import { describe, test, expect } from 'vitest'
import { maskPhone, displayPhone, maskIdCard, maskAddress } from '@/utils/dataMask'

describe('maskPhone 电话号码脱敏', () => {
  test('标准11位手机号脱敏', () => {
    expect(maskPhone('13812345678')).toBe('138****5678')
  })

  test('另一个手机号', () => {
    expect(maskPhone('15912349876')).toBe('159****9876')
  })

  test('短于11位的号码不脱敏', () => {
    expect(maskPhone('1381234')).toBe('1381234')
  })

  test('空字符串返回空字符串', () => {
    expect(maskPhone('')).toBe('')
  })

  test('null/undefined 安全处理', () => {
    expect(maskPhone(null as unknown as string)).toBeFalsy()
    expect(maskPhone(undefined as unknown as string)).toBeFalsy()
  })
})

describe('displayPhone 根据权限显示', () => {
  test('有权限时显示完整号码', () => {
    expect(displayPhone('13812345678', true)).toBe('13812345678')
  })

  test('无权限时显示脱敏号码', () => {
    expect(displayPhone('13812345678', false)).toBe('138****5678')
  })
})

describe('maskIdCard 身份证脱敏', () => {
  test('18位身份证脱敏', () => {
    expect(maskIdCard('110101199001011234')).toBe('110101********1234')
  })

  test('短于18位不脱敏', () => {
    expect(maskIdCard('1101011990')).toBe('1101011990')
  })

  test('空字符串返回空字符串', () => {
    expect(maskIdCard('')).toBe('')
  })
})

describe('maskAddress 地址脱敏', () => {
  test('含省市的地址脱敏', () => {
    const result = maskAddress('广东省深圳市南山区科技路100号')
    expect(result).toContain('广东')
    expect(result).toContain('***')
    expect(result).not.toContain('科技路')
  })

  test('空地址返回空', () => {
    expect(maskAddress('')).toBe('')
  })

  test('null 安全处理', () => {
    expect(maskAddress(null as unknown as string)).toBeFalsy()
  })
})

