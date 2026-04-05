/**
 * Token 加密存储工具
 * 用于 crmAPP 中敏感数据（Token、用户信息）的加密存储
 * 使用设备唯一标识作为加密密钥，防止明文泄露
 */

/** 获取设备唯一标识作为加密密钥种子 */
function getDeviceKey(): string {
  // 优先使用已缓存的设备密钥
  try {
    const cachedKey = uni.getStorageSync('__device_key__')
    if (cachedKey) return cachedKey
  } catch (_e) {
    // ignore
  }

  // 生成设备密钥：基于设备信息 + 随机数
  let keySource = 'crm_app_default_key_2026'
  try {
    const systemInfo = uni.getSystemInfoSync()
    keySource = [
      systemInfo.brand || '',
      systemInfo.model || '',
      systemInfo.system || '',
      systemInfo.platform || '',
      systemInfo.screenWidth?.toString() || '',
      systemInfo.screenHeight?.toString() || '',
      // 加入随机因子，首次安装时生成
      Date.now().toString(36),
      Math.random().toString(36).substring(2, 10)
    ].join('_')
  } catch (_e) {
    keySource += '_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
  }

  // 简单哈希处理密钥（确保长度一致）
  const deviceKey = simpleHash(keySource)

  // 持久化设备密钥（设备密钥不加密存储，因为它本身就是派生的）
  try {
    uni.setStorageSync('__device_key__', deviceKey)
  } catch (_e) {
    // ignore
  }

  return deviceKey
}

/** 简单字符串哈希（生成固定长度密钥） */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // 转为16进制字符串，确保至少16位
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return hex + hex.split('').reverse().join('') // 16位密钥
}

/** XOR 加密/解密（对称操作） */
function xorCipher(data: string, key: string): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    result += String.fromCharCode(charCode)
  }
  return result
}

/** 将字符串转为 Base64（兼容 uni-app 环境） */
function toBase64(str: string): string {
  try {
    // uni-app 环境
    return uni.arrayBufferToBase64(
      new Uint8Array(Array.from(str).map(c => c.charCodeAt(0))).buffer
    )
  } catch (_e) {
    // 降级方案
    try {
      return btoa(unescape(encodeURIComponent(str)))
    } catch (_e2) {
      return str
    }
  }
}

/** 将 Base64 转为字符串（兼容 uni-app 环境） */
function fromBase64(base64: string): string {
  try {
    // uni-app 环境
    const arrayBuffer = uni.base64ToArrayBuffer(base64)
    const bytes = new Uint8Array(arrayBuffer)
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('')
  } catch (_e) {
    // 降级方案
    try {
      return decodeURIComponent(escape(atob(base64)))
    } catch (_e2) {
      return base64
    }
  }
}

/**
 * 加密数据
 * @param plainText 明文数据
 * @returns 加密后的字符串（Base64编码）
 */
export function encrypt(plainText: string): string {
  if (!plainText) return ''
  try {
    const key = getDeviceKey()
    const encrypted = xorCipher(plainText, key)
    // 添加校验前缀，用于解密时验证
    return 'ENC:' + toBase64(encrypted)
  } catch (_e) {
    console.warn('[Crypto] 加密失败，降级为明文存储')
    return plainText
  }
}

/**
 * 解密数据
 * @param encryptedText 加密后的数据
 * @returns 解密后的明文
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''
  try {
    // 检查是否为加密数据（带 ENC: 前缀）
    if (!encryptedText.startsWith('ENC:')) {
      // 兼容旧版明文数据，直接返回
      return encryptedText
    }
    const base64Data = encryptedText.substring(4)
    const key = getDeviceKey()
    const decoded = fromBase64(base64Data)
    return xorCipher(decoded, key)
  } catch (_e) {
    console.warn('[Crypto] 解密失败，返回原始数据')
    // 解密失败时返回原始数据（可能是旧版明文）
    return encryptedText.startsWith('ENC:') ? '' : encryptedText
  }
}

/**
 * 加密存储（替代 uni.setStorageSync）
 */
export function setEncryptedStorage(key: string, value: string): void {
  try {
    const encrypted = encrypt(value)
    uni.setStorageSync(key, encrypted)
  } catch (_e) {
    console.error('[Crypto] 加密存储失败:', key)
  }
}

/**
 * 解密读取（替代 uni.getStorageSync）
 */
export function getEncryptedStorage(key: string): string {
  try {
    const encrypted = uni.getStorageSync(key)
    if (!encrypted) return ''
    return decrypt(encrypted)
  } catch (_e) {
    console.error('[Crypto] 解密读取失败:', key)
    return ''
  }
}

