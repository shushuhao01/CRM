/**
 * customerCode 客户编码工具单元测试
 */
import { describe, test, expect } from 'vitest'
import { validateCustomerCode } from '@/utils/customerCode'

describe('validateCustomerCode 客户编码验证', () => {
  test('合法编码格式通过验证', () => {
    expect(validateCustomerCode('XH202604011234')).toBe(true)
  })

  test('另一个合法编码', () => {
    expect(validateCustomerCode('AB202512065678')).toBe(true)
  })

  test('小写字母不通过', () => {
    expect(validateCustomerCode('xh202604011234')).toBe(false)
  })

  test('缺少字母前缀不通过', () => {
    expect(validateCustomerCode('20260401123456')).toBe(false)
  })

  test('长度不足不通过', () => {
    expect(validateCustomerCode('XH20260401')).toBe(false)
  })

  test('长度超出不通过', () => {
    expect(validateCustomerCode('XH2026040112345')).toBe(false)
  })

  test('包含特殊字符不通过', () => {
    expect(validateCustomerCode('X!202604011234')).toBe(false)
  })

  test('空字符串不通过', () => {
    expect(validateCustomerCode('')).toBe(false)
  })
})

