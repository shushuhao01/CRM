/**
 * 小程序路由 — 签名验证 + 链接过期逻辑单元测试
 * 因为 verifySign / isLinkExpired / validateMpSign 不导出，
 * 这里复制核心逻辑做独立单元测试。
 */
import crypto from 'crypto'

// ==================== 复制自 miniprogram/index.ts 的纯函数 ====================

function verifySign(tenantId: string, memberId: string, ts: string, sign: string): boolean {
  const secret = process.env.MP_FORM_SECRET || 'mp_default_secret_key_2026'
  const expected = crypto.createHash('md5')
    .update(tenantId + memberId + ts + secret)
    .digest('hex')
  return expected === sign
}

function isLinkExpired(ts: string): boolean {
  const expireDays = parseInt(process.env.MP_LINK_EXPIRE_DAYS || '7', 10)
  const now = Math.floor(Date.now() / 1000)
  const tsNum = parseInt(ts, 10)
  return (now - tsNum) > expireDays * 86400
}

// ==================== 测试 ====================

describe('miniprogram 签名验证', () => {
  const OLD_ENV = process.env

  beforeEach(() => { process.env = { ...OLD_ENV } })
  afterAll(() => { process.env = OLD_ENV })

  describe('verifySign', () => {
    it('正确签名 → true', () => {
      const tenantId = 't1'
      const memberId = 'm1'
      const ts = '1700000000'
      const secret = 'mp_default_secret_key_2026'
      const expected = crypto.createHash('md5')
        .update(tenantId + memberId + ts + secret)
        .digest('hex')

      expect(verifySign(tenantId, memberId, ts, expected)).toBe(true)
    })

    it('错误签名 → false', () => {
      expect(verifySign('t1', 'm1', '1700000000', 'wrong_sign')).toBe(false)
    })

    it('自定义 secret → 正确验签', () => {
      process.env.MP_FORM_SECRET = 'my_secret'
      const tenantId = 't2'
      const memberId = 'm2'
      const ts = '1700000000'
      const expected = crypto.createHash('md5')
        .update(tenantId + memberId + ts + 'my_secret')
        .digest('hex')

      expect(verifySign(tenantId, memberId, ts, expected)).toBe(true)
    })

    it('篡改任一参数 → false', () => {
      const ts = '1700000000'
      const sign = crypto.createHash('md5')
        .update('t1m1' + ts + 'mp_default_secret_key_2026')
        .digest('hex')

      expect(verifySign('t1', 'm1', ts, sign)).toBe(true)
      expect(verifySign('t2', 'm1', ts, sign)).toBe(false) // tenantId 篡改
      expect(verifySign('t1', 'm2', ts, sign)).toBe(false) // memberId 篡改
      expect(verifySign('t1', 'm1', '9999', sign)).toBe(false) // ts 篡改
    })
  })

  describe('isLinkExpired', () => {
    it('刚创建的链接 → 未过期', () => {
      const ts = String(Math.floor(Date.now() / 1000))
      expect(isLinkExpired(ts)).toBe(false)
    })

    it('8天前的链接(默认7天) → 已过期', () => {
      const ts = String(Math.floor(Date.now() / 1000) - 8 * 86400)
      expect(isLinkExpired(ts)).toBe(true)
    })

    it('6天前的链接(默认7天) → 未过期', () => {
      const ts = String(Math.floor(Date.now() / 1000) - 6 * 86400)
      expect(isLinkExpired(ts)).toBe(false)
    })

    it('自定义过期天数 → 按配置判断', () => {
      process.env.MP_LINK_EXPIRE_DAYS = '1'
      const ts = String(Math.floor(Date.now() / 1000) - 2 * 86400)
      expect(isLinkExpired(ts)).toBe(true)
    })

    it('过期天数设为30 → 20天前未过期', () => {
      process.env.MP_LINK_EXPIRE_DAYS = '30'
      const ts = String(Math.floor(Date.now() / 1000) - 20 * 86400)
      expect(isLinkExpired(ts)).toBe(false)
    })
  })
})
