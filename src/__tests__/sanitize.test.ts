/**
 * sanitize.ts HTML净化工具单元测试
 */
import { describe, test, expect } from 'vitest'
import { escapeHtml, highlightText } from '@/utils/sanitize'

describe('escapeHtml', () => {
  test('空值 → 空字符串', () => {
    expect(escapeHtml('')).toBe('')
  })
  test('null / undefined → 空字符串', () => {
    expect(escapeHtml(null as any)).toBe('')
    expect(escapeHtml(undefined as any)).toBe('')
  })
  test('转义 &', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })
  test('转义 <>', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })
  test('转义引号', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
    expect(escapeHtml("'hi'")).toBe('&#x27;hi&#x27;')
  })
  test('转义反引号', () => {
    expect(escapeHtml('`code`')).toBe('&#x60;code&#x60;')
  })
  test('转义斜杠', () => {
    expect(escapeHtml('a/b')).toBe('a&#x2F;b')
  })
  test('转义等号', () => {
    expect(escapeHtml('a=b')).toBe('a&#x3D;b')
  })
  test('无特殊字符 → 不变', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
  test('综合 XSS payload', () => {
    const result = escapeHtml('<img src="x" onerror="alert(1)">')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).toContain('&lt;')
  })
})

describe('highlightText', () => {
  test('空文本 → 空', () => {
    expect(highlightText('', 'test')).toBe('')
  })
  test('空关键词 → 转义后的原文', () => {
    expect(highlightText('hello', '')).toBe('hello')
  })
  test('null 文本 → 空', () => {
    expect(highlightText(null as any, 'x')).toBe('')
  })
  test('关键词高亮', () => {
    const result = highlightText('hello world', 'world')
    expect(result).toContain('<mark class="highlight">world</mark>')
  })
  test('大小写不敏感', () => {
    const result = highlightText('Hello World', 'hello')
    expect(result).toContain('<mark class="highlight">Hello</mark>')
  })
  test('特殊字符安全', () => {
    const result = highlightText('a<b>c', 'b')
    // 原文应被转义
    expect(result).not.toContain('<b>')
    expect(result).toContain('&lt;')
  })
})
