/**
 * validation.ts 表单验证工具单元测试
 */
import { describe, test, expect } from 'vitest'
import {
  REGEX,
  validatePhone,
  validateEmail,
  validatePassword,
  validateChineseName,
  validateIdCard,
  validateNumber,
  validateLength,
  validateUrl,
  escapeSql,
  validateBatch,
  createFormRules,
} from '@/utils/validation'

describe('REGEX 常量', () => {
  test('PHONE 匹配合法手机号', () => {
    expect(REGEX.PHONE.test('13800138000')).toBe(true)
    expect(REGEX.PHONE.test('19912345678')).toBe(true)
  })
  test('PHONE 拒绝非法手机号', () => {
    expect(REGEX.PHONE.test('12345678901')).toBe(false)
    expect(REGEX.PHONE.test('1380013800')).toBe(false)
    expect(REGEX.PHONE.test('abc')).toBe(false)
  })
  test('EMAIL 匹配合法邮箱', () => {
    expect(REGEX.EMAIL.test('a@b.com')).toBe(true)
    expect(REGEX.EMAIL.test('user.name+tag@example.co')).toBe(true)
  })
  test('IP 匹配合法IP', () => {
    expect(REGEX.IP.test('192.168.1.1')).toBe(true)
    expect(REGEX.IP.test('999.999.999.999')).toBe(false)
  })
})

describe('validatePhone', () => {
  test('空 → 失败', () => {
    expect(validatePhone('')).toEqual({ valid: false, message: '手机号不能为空' })
  })
  test('格式错误 → 失败', () => {
    expect(validatePhone('123')).toMatchObject({ valid: false })
  })
  test('正确 → 成功', () => {
    expect(validatePhone('13800138000')).toEqual({ valid: true })
  })
})

describe('validateEmail', () => {
  test('空 → 失败', () => {
    expect(validateEmail('')).toMatchObject({ valid: false })
  })
  test('格式错误 → 失败', () => {
    expect(validateEmail('not-an-email')).toMatchObject({ valid: false })
  })
  test('正确 → 成功', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true })
  })
})

describe('validatePassword', () => {
  test('空 → 失败', () => {
    expect(validatePassword('')).toMatchObject({ valid: false })
  })
  test('太短 → 失败', () => {
    expect(validatePassword('abc1')).toMatchObject({ valid: false })
  })
  test('太长 → 失败', () => {
    expect(validatePassword('a1' + 'x'.repeat(20))).toMatchObject({ valid: false })
  })
  test('无数字 → 失败', () => {
    expect(validatePassword('abcdefgh')).toMatchObject({ valid: false })
  })
  test('无字母 → 失败', () => {
    expect(validatePassword('12345678')).toMatchObject({ valid: false })
  })
  test('合法 → 成功', () => {
    expect(validatePassword('Abcd1234')).toEqual({ valid: true })
  })
})

describe('validateChineseName', () => {
  test('空 → 失败', () => {
    expect(validateChineseName('')).toMatchObject({ valid: false })
  })
  test('合法中文 → 成功', () => {
    expect(validateChineseName('张三')).toEqual({ valid: true })
  })
  test('合法英文 → 成功', () => {
    expect(validateChineseName('John')).toEqual({ valid: true })
  })
  test('单字符 → 失败', () => {
    expect(validateChineseName('张')).toMatchObject({ valid: false })
  })
})

describe('validateIdCard', () => {
  test('空 → 失败', () => {
    expect(validateIdCard('')).toMatchObject({ valid: false })
  })
  test('格式错误 → 失败', () => {
    expect(validateIdCard('12345')).toMatchObject({ valid: false })
  })
  test('校验位错误 → 失败', () => {
    // 110101199003070000 校验位应该不对
    expect(validateIdCard('110101199003070000')).toMatchObject({ valid: false })
  })
  test('合法身份证 → 成功', () => {
    // 110101199003070011：校验位 = checkCodes[154%11] = checkCodes[0] = '1'
    expect(validateIdCard('110101199003070011')).toEqual({ valid: true })
  })
})

describe('validateNumber', () => {
  test('NaN → 失败', () => {
    expect(validateNumber('abc')).toMatchObject({ valid: false })
  })
  test('小于 min → 失败', () => {
    expect(validateNumber(5, 10)).toMatchObject({ valid: false })
  })
  test('大于 max → 失败', () => {
    expect(validateNumber(100, 0, 50)).toMatchObject({ valid: false })
  })
  test('范围内 → 成功', () => {
    expect(validateNumber(25, 0, 50)).toEqual({ valid: true })
  })
  test('字符串数字 → 成功', () => {
    expect(validateNumber('42')).toEqual({ valid: true })
  })
})

describe('validateLength', () => {
  test('空 → 失败', () => {
    expect(validateLength('')).toMatchObject({ valid: false })
  })
  test('太短 → 失败', () => {
    expect(validateLength('ab', 3)).toMatchObject({ valid: false })
  })
  test('太长 → 失败', () => {
    expect(validateLength('abcdef', undefined, 3)).toMatchObject({ valid: false })
  })
  test('范围内 → 成功', () => {
    expect(validateLength('abc', 2, 5)).toEqual({ valid: true })
  })
})

describe('validateUrl', () => {
  test('空 → 失败', () => {
    expect(validateUrl('')).toMatchObject({ valid: false })
  })
  test('非法 → 失败', () => {
    expect(validateUrl('not-a-url')).toMatchObject({ valid: false })
  })
  test('合法 → 成功', () => {
    expect(validateUrl('https://example.com')).toEqual({ valid: true })
  })
})

describe('escapeSql', () => {
  test('转义单引号', () => {
    expect(escapeSql("O'Brien")).toBe("O\\'Brien")
  })
  test('转义换行', () => {
    expect(escapeSql('line1\nline2')).toBe('line1\\nline2')
  })
  test('无特殊字符 → 不变', () => {
    expect(escapeSql('hello')).toBe('hello')
  })
})

describe('validateBatch', () => {
  test('全通过 → 成功', () => {
    const result = validateBatch([
      () => validatePhone('13800138000'),
      () => validateEmail('a@b.com'),
    ])
    expect(result.valid).toBe(true)
  })
  test('第一个失败 → 返回第一个错误', () => {
    const result = validateBatch([
      () => validatePhone(''),
      () => validateEmail('a@b.com'),
    ])
    expect(result.valid).toBe(false)
    expect(result.message).toContain('手机号')
  })
})

describe('createFormRules', () => {
  test('required 规则', () => {
    const rules = createFormRules()
    const rule = rules.required()
    expect(rule.required).toBe(true)
    expect(rule.trigger).toBe('blur')
  })
  test('phone 规则含 pattern', () => {
    const rules = createFormRules()
    const rule = rules.phone()
    expect(rule.pattern).toBe(REGEX.PHONE)
  })
  test('length 规则', () => {
    const rules = createFormRules()
    const rule = rules.length(2, 10)
    expect(rule.min).toBe(2)
    expect(rule.max).toBe(10)
  })
})
