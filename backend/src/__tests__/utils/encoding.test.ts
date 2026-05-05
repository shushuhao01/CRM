/**
 * encoding 编码工具函数单元测试
 */

import {
  safeJsonParse,
  safeJsonStringify,
  addCsvBom,
  encodeContentDisposition,
  decodeMulterFileName,
} from '../../utils/encoding'

// ==================== safeJsonParse ====================

describe('safeJsonParse', () => {
  it('合法 JSON → 解析结果', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 })
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3])
    expect(safeJsonParse('"hello"', '')).toBe('hello')
  })

  it('null → 返回默认值', () => {
    expect(safeJsonParse(null, { theme: 'light' })).toEqual({ theme: 'light' })
  })

  it('undefined → 返回默认值', () => {
    expect(safeJsonParse(undefined, [])).toEqual([])
  })

  it('空字符串 → 返回默认值', () => {
    expect(safeJsonParse('', 'fallback')).toBe('fallback')
  })

  it('"undefined" 字符串 → 返回默认值', () => {
    expect(safeJsonParse('undefined', 0)).toBe(0)
  })

  it('"null" 字符串 → 返回默认值', () => {
    expect(safeJsonParse('null', 'default')).toBe('default')
  })

  it('非法 JSON → 返回默认值（不抛异常）', () => {
    expect(safeJsonParse('{broken', {})).toEqual({})
    expect(safeJsonParse('not json at all', [])).toEqual([])
  })
})

// ==================== safeJsonStringify ====================

describe('safeJsonStringify', () => {
  it('普通对象 → JSON 字符串', () => {
    expect(safeJsonStringify({ a: 1, b: 'hello' })).toBe('{"a":1,"b":"hello"}')
  })

  it('数组 → JSON 字符串', () => {
    expect(safeJsonStringify([1, 2, 3])).toBe('[1,2,3]')
  })

  it('null → "null"', () => {
    expect(safeJsonStringify(null)).toBe('null')
  })

  it('循环引用 → 返回 fallback', () => {
    const obj: any = {}
    obj.self = obj
    expect(safeJsonStringify(obj)).toBe('{}')
    expect(safeJsonStringify(obj, '[]')).toBe('[]')
  })
})

// ==================== addCsvBom ====================

describe('addCsvBom', () => {
  it('添加 UTF-8 BOM 头', () => {
    const result = addCsvBom('Name,Age\n张三,25')
    expect(result.startsWith('\uFEFF')).toBe(true)
    expect(result).toBe('\uFEFFName,Age\n张三,25')
  })

  it('空字符串也添加 BOM', () => {
    expect(addCsvBom('')).toBe('\uFEFF')
  })
})

// ==================== encodeContentDisposition ====================

describe('encodeContentDisposition', () => {
  it('英文文件名', () => {
    const result = encodeContentDisposition('report.xlsx')
    expect(result).toContain('attachment')
    expect(result).toContain('report.xlsx')
  })

  it('中文文件名被编码', () => {
    const result = encodeContentDisposition('客户数据.xlsx')
    expect(result).toContain('attachment')
    expect(result).toContain(encodeURIComponent('客户数据.xlsx'))
    expect(result).toContain("filename*=UTF-8''")
  })

  it('type=inline', () => {
    const result = encodeContentDisposition('file.pdf', 'inline')
    expect(result).toContain('inline')
    expect(result).not.toContain('attachment')
  })

  it('默认 type=attachment', () => {
    const result = encodeContentDisposition('file.pdf')
    expect(result).toContain('attachment')
  })
})

// ==================== decodeMulterFileName ====================

describe('decodeMulterFileName', () => {
  it('ASCII 文件名 → 原样返回或转码后一致', () => {
    const result = decodeMulterFileName('report.xlsx')
    expect(result).toBeTruthy()
  })

  it('已是 UTF-8 的中文 → 转码处理', () => {
    const name = '客户报表.xlsx'
    const result = decodeMulterFileName(name)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('不含替换字符', () => {
    const result = decodeMulterFileName('test.csv')
    expect(result).not.toContain('\ufffd')
  })
})
