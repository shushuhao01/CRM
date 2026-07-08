/**
 * 通用敏感配置加密工具（外呼服务商 AccessKey 等）
 *
 * - 密文带 "enc:" 前缀标记，兼容存量明文数据（无前缀原样返回）
 * - 复用支付配置的 AES-256-CBC 密钥体系（PAYMENT_ENCRYPT_KEY）
 * - 前端展示统一用掩码，保存时收到掩码则保留原密文不变
 */
import { encryptPaymentConfig, decryptPaymentConfig } from './paymentCrypto';

const ENC_PREFIX = 'enc:';

/** 返回给前端的密钥掩码 */
export const SECRET_MASK = '********';

/** 判断是否为前端回传的掩码值（未修改密钥） */
export function isMaskedSecret(value: unknown): boolean {
  return typeof value === 'string' && /^\*{4,}$/.test(value);
}

/** 加密敏感值（已加密的原样返回，幂等） */
export function encryptSecret(plain: string): string {
  if (!plain || plain.startsWith(ENC_PREFIX)) return plain;
  const encrypted = encryptPaymentConfig(plain);
  return encrypted ? ENC_PREFIX + encrypted : plain;
}

/** 解密敏感值（明文存量数据原样返回，向后兼容） */
export function decryptSecret(value: string): string {
  if (!value) return '';
  if (!value.startsWith(ENC_PREFIX)) return value;
  return decryptPaymentConfig(value.slice(ENC_PREFIX.length));
}
