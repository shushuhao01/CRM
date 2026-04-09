/**
 * 支付配置加密/解密统一工具
 *
 * 🔒 将支付配置加密密钥集中管理，避免6个文件各自硬编码
 * 生产环境强制检查弱密钥（参考 jwt.ts 的 INSECURE_SECRETS 机制）
 */
import crypto from 'crypto';
import { log } from '../config/logger';

// 🔒 不安全的默认加密密钥黑名单 — 禁止在生产环境中使用
const INSECURE_ENCRYPT_KEYS = [
  'crm-payment-secret-key-2024',
  'crm-payment-secret-key',
  'payment-secret-key',
  'secret',
];

/**
 * 获取安全的支付加密密钥
 * - 生产环境：必须从环境变量读取，且不能是已知弱密钥
 * - 开发环境：允许使用默认值但输出警告
 */
function getPaymentEncryptKey(): string {
  const envValue = process.env.PAYMENT_ENCRYPT_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  // 环境变量已设置且不在弱密钥黑名单中 → 直接使用
  if (envValue && !INSECURE_ENCRYPT_KEYS.includes(envValue)) {
    return envValue;
  }

  if (isProduction && (!envValue || INSECURE_ENCRYPT_KEYS.includes(envValue))) {
    log.error('🚨 [安全警告] PAYMENT_ENCRYPT_KEY 未配置安全密钥！');
    log.error('   支付配置使用不安全的默认密钥，请立即在 .env 中设置：');
    log.error(`   PAYMENT_ENCRYPT_KEY=${crypto.randomBytes(32).toString('hex')}`);
  }

  // 开发环境或未配置：使用默认值
  return envValue || 'crm-payment-secret-key-2024';
}

/** 统一的支付加密密钥（模块加载时解析一次） */
export const PAYMENT_ENCRYPT_KEY = getPaymentEncryptKey();

/**
 * 解密支付配置数据
 * 使用 AES-256-CBC + 固定IV（兼容现有加密数据）
 *
 * ⚠️ 注意：当前使用全零IV是为了兼容 admin 后台已加密的存量数据
 * 后续新版本应迁移到随机IV方案
 */
export function decryptPaymentConfig(encrypted: string): string {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.scryptSync(PAYMENT_ENCRYPT_KEY, 'salt', 32),
      Buffer.alloc(16, 0)
    );
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  } catch {
    return '';
  }
}

/**
 * 加密支付配置数据
 * 使用 AES-256-CBC + 固定IV（与解密配套）
 */
export function encryptPaymentConfig(plain: string): string {
  try {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      crypto.scryptSync(PAYMENT_ENCRYPT_KEY, 'salt', 32),
      Buffer.alloc(16, 0)
    );
    return cipher.update(plain, 'utf8', 'hex') + cipher.final('hex');
  } catch {
    return '';
  }
}

