/**
 * sensitive.ts 敏感信息加密工具单元测试
 */
import { describe, test, expect } from 'vitest'
import { maskWechat, maskEmail, canViewSensitiveInfo, displaySensitiveInfo } from '@/utils/sensitive'

describe('maskWechat', () => {
  test('空值 → 空字符串', () => {
    expect(maskWechat('')).toBe('')
  })
  test('2位 → 不脱敏', () => {
    expect(maskWechat('ab')).toBe('ab')
  })
  test('3位 → 首尾+中间*', () => {
    expect(maskWechat('abc')).toBe('a*c')
  })
  test('4位 → 首尾+中间**', () => {
    expect(maskWechat('abcd')).toBe('a**d')
  })
  test('长微信号 → 前2后2+中间*', () => {
    expect(maskWechat('wxid_abcdef')).toBe('wx*******ef')
  })
})

describe('maskEmail', () => {
  test('空值 → 空字符串', () => {
    expect(maskEmail('')).toBe('')
  })
  test('无@ → 原样返回', () => {
    expect(maskEmail('noatsign')).toBe('noatsign')
  })
  test('短用户名 ≤2 → 不脱敏', () => {
    expect(maskEmail('ab@test.com')).toBe('ab@test.com')
  })
  test('用户名3-4位 → 首尾+中间*', () => {
    expect(maskEmail('abcd@test.com')).toBe('a**d@test.com')
  })
  test('长用户名 → 前2后1+中间*', () => {
    expect(maskEmail('username@test.com')).toBe('us*****e@test.com')
  })
})

describe('canViewSensitiveInfo', () => {
  test('null → false', () => {
    expect(canViewSensitiveInfo(null)).toBe(false)
  })
  test('admin → true', () => {
    expect(canViewSensitiveInfo({ role: 'admin' })).toBe(true)
  })
  test('super_admin → true', () => {
    expect(canViewSensitiveInfo({ role: 'super_admin' })).toBe(true)
  })
  test('isSuperAdmin → true', () => {
    expect(canViewSensitiveInfo({ isSuperAdmin: true })).toBe(true)
  })
  test('有 view_sensitive_info 权限 → true', () => {
    expect(canViewSensitiveInfo({ permissions: ['view_sensitive_info'] })).toBe(true)
  })
  test('白名单 username → true', () => {
    expect(canViewSensitiveInfo({ username: 'admin' })).toBe(true)
  })
  test('普通用户无权限 → false', () => {
    expect(canViewSensitiveInfo({ role: 'sales', permissions: [] })).toBe(false)
  })
})

describe('displaySensitiveInfo', () => {
  test('有权限 → 原值', () => {
    expect(displaySensitiveInfo('wxid_abc', { role: 'admin' }, 'wechat')).toBe('wxid_abc')
  })
  test('无权限 + wechat → 脱敏', () => {
    expect(displaySensitiveInfo('wxid_abcdef', { role: 'sales' }, 'wechat')).toBe('wx*******ef')
  })
  test('无权限 + email → 脱敏', () => {
    expect(displaySensitiveInfo('username@test.com', { role: 'sales' }, 'email')).toBe('us*****e@test.com')
  })
  test('空值 → 返回空', () => {
    expect(displaySensitiveInfo('', { role: 'sales' }, 'wechat')).toBe('')
  })
})
