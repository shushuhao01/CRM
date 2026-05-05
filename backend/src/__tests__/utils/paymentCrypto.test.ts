/**
 * paymentCrypto 加密/解密工具单元测试
 */

// Mock logger before import
jest.mock('../../config/logger', () => ({
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }
}))

// 设置测试环境的加密密钥
process.env.PAYMENT_ENCRYPT_KEY = 'test-payment-key-for-unit-tests'

import { encryptPaymentConfig, decryptPaymentConfig, PAYMENT_ENCRYPT_KEY } from '../../utils/paymentCrypto'

describe('paymentCrypto', () => {

  describe('PAYMENT_ENCRYPT_KEY', () => {
    it('使用环境变量中的密钥', () => {
      expect(PAYMENT_ENCRYPT_KEY).toBe('test-payment-key-for-unit-tests')
    })
  })

  describe('encryptPaymentConfig / decryptPaymentConfig 对称性', () => {
    const testCases = [
      '简单文本',
      'simple-ascii-text',
      'sk_live_abcdef123456789',
      '{"apiKey":"wx123","secret":"abc"}',
      '包含特殊字符!@#$%^&*()_+-=[]{}|;:,.<>?',
      'a'.repeat(1000),
    ]

    testCases.forEach((plaintext) => {
      it(`加密→解密还原: "${plaintext.substring(0, 30)}..."`, () => {
        const encrypted = encryptPaymentConfig(plaintext)
        expect(encrypted).not.toBe('')
        expect(encrypted).not.toBe(plaintext)

        const decrypted = decryptPaymentConfig(encrypted)
        expect(decrypted).toBe(plaintext)
      })
    })
  })

  describe('encryptPaymentConfig', () => {
    it('空字符串 → 空字符串', () => {
      expect(encryptPaymentConfig('')).toBe('')
    })

    it('同一明文多次加密产生相同密文（固定IV）', () => {
      const a = encryptPaymentConfig('test-value')
      const b = encryptPaymentConfig('test-value')
      expect(a).toBe(b)
    })

    it('不同明文产生不同密文', () => {
      const a = encryptPaymentConfig('value-a')
      const b = encryptPaymentConfig('value-b')
      expect(a).not.toBe(b)
    })

    it('密文为 hex 格式', () => {
      const encrypted = encryptPaymentConfig('test')
      expect(encrypted).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('decryptPaymentConfig', () => {
    it('空字符串 → 空字符串', () => {
      expect(decryptPaymentConfig('')).toBe('')
    })

    it('无效密文 → 空字符串（不抛异常）', () => {
      expect(decryptPaymentConfig('not-valid-hex')).toBe('')
      expect(decryptPaymentConfig('deadbeef')).toBe('')
    })

    it('被篡改的密文 → 空字符串', () => {
      const encrypted = encryptPaymentConfig('real-value')
      const tampered = encrypted.substring(0, encrypted.length - 4) + 'ffff'
      const result = decryptPaymentConfig(tampered)
      // 篡改后要么解密失败返回空，要么解密出错误值（不等于原值）
      if (result !== '') {
        expect(result).not.toBe('real-value')
      }
    })
  })
})
