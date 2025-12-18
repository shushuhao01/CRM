/**
 * 安全日志工具
 * 根据配置决定是否加密控制台输出，保护业务逻辑和敏感数据
 *
 * 功能：
 * 1. 全局生效 - 配置存储在后端数据库，所有用户同步
 * 2. 完全加密 - 不只是敏感数据，所有业务逻辑、数据量、流程信息都加密
 * 3. 防止逆向 - 加密后的日志无法被破解分析业务流程
 * 4. 跨终端同步 - 所有用户登录时自动获取最新配置
 */

// 配置键名（本地缓存）
const CONFIG_KEY = 'crm_secure_console_enabled'
const CONFIG_CACHE_KEY = 'crm_secure_console_cache_time'
const CACHE_DURATION = 30 * 1000 // 30秒缓存（缩短以便更快同步）

// 全局配置状态
let _secureConsoleEnabled: boolean | null = null
let _lastFetchTime = 0
let _isFetching = false

/**
 * 从后端API获取安全控制台配置（公开接口，所有登录用户可访问）
 */
async function fetchSecureConsoleConfig(): Promise<boolean> {
  if (_isFetching) {
    return localStorage.getItem(CONFIG_KEY) === 'true'
  }

  _isFetching = true
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return false
    }

    // 使用公开的配置接口，所有登录用户都可以访问
    const response = await fetch('/api/v1/system/console-security-config', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const enabled = data.data?.secureConsoleEnabled === true
      // 缓存到本地
      localStorage.setItem(CONFIG_KEY, String(enabled))
      localStorage.setItem(CONFIG_CACHE_KEY, String(Date.now()))
      _secureConsoleEnabled = enabled
      _lastFetchTime = Date.now()
      return enabled
    }
  } catch {
    // 静默失败，使用本地缓存
  } finally {
    _isFetching = false
  }
  return localStorage.getItem(CONFIG_KEY) === 'true'
}

/**
 * 强制从服务器刷新配置（用于登录后调用）
 */
export async function refreshSecureConsoleConfig(): Promise<boolean> {
  // 清除缓存
  _secureConsoleEnabled = null
  _lastFetchTime = 0
  localStorage.removeItem(CONFIG_CACHE_KEY)

  // 重新获取
  return await fetchSecureConsoleConfig()
}

/**
 * 初始化安全控制台配置（应用启动时调用）
 */
export async function initSecureConsoleConfig(): Promise<void> {
  const token = localStorage.getItem('auth_token')
  if (token) {
    const enabled = await fetchSecureConsoleConfig()
    if (enabled) {
      enableGlobalSecureConsole()
    }
  }
}

/**
 * 检查是否启用了安全控制台（同步版本，使用缓存）
 */
export function isSecureConsoleEnabled(): boolean {
  // 如果有内存缓存且未过期，直接返回
  if (_secureConsoleEnabled !== null) {
    const now = Date.now()
    if (now - _lastFetchTime < CACHE_DURATION) {
      return _secureConsoleEnabled
    }
  }

  // 从localStorage读取缓存
  try {
    const cached = localStorage.getItem(CONFIG_KEY)
    const cacheTime = localStorage.getItem(CONFIG_CACHE_KEY)

    if (cached !== null && cacheTime) {
      const cacheAge = Date.now() - parseInt(cacheTime)
      // 使用较短的缓存时间以便更快同步
      if (cacheAge < CACHE_DURATION) {
        _secureConsoleEnabled = cached === 'true'
        _lastFetchTime = parseInt(cacheTime)
        return _secureConsoleEnabled
      }
    }

    // 缓存过期，异步刷新（不阻塞）
    fetchSecureConsoleConfig()

    // 返回当前缓存值或默认值
    return cached === 'true'
  } catch {
    return false
  }
}

/**
 * 设置安全控制台开关（同时保存到后端，仅管理员可用）
 */
export async function setSecureConsoleEnabled(enabled: boolean): Promise<void> {
  try {
    // 同步到后端
    const token = localStorage.getItem('auth_token')
    if (token) {
      const response = await fetch('/api/v1/system/security-settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ secureConsoleEnabled: enabled })
      })

      if (!response.ok) {
        throw new Error('保存失败')
      }
    }

    // 更新本地缓存
    localStorage.setItem(CONFIG_KEY, String(enabled))
    localStorage.setItem(CONFIG_CACHE_KEY, String(Date.now()))
    _secureConsoleEnabled = enabled
    _lastFetchTime = Date.now()
  } catch (error) {
    console.error('保存控制台加密配置失败:', error)
    throw error
  }
}

/**
 * 生成随机加密密钥（每次会话不同）
 */
const SESSION_KEY = Math.random().toString(36).substring(2, 15)

/**
 * 简单的XOR加密（混淆）
 */
function xorEncrypt(text: string, key: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

/**
 * 完全加密日志内容
 */
function encryptLogContent(content: string): string {
  try {
    const xored = xorEncrypt(content, SESSION_KEY)
    const encoded = btoa(encodeURIComponent(xored).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
    const checksum = content.length.toString(16).padStart(4, '0')
    return `${checksum}:${encoded}`
  } catch {
    return 'ERR'
  }
}

/**
 * 生成加密的日志标识
 */
function generateLogId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * 处理日志参数 - 完全加密模式
 */
function processLogArgs(args: unknown[]): string {
  if (!isSecureConsoleEnabled()) {
    return args
      .map(arg => {
        if (typeof arg === 'string') return arg
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join(' ')
  }

  const combined = args
    .map(arg => {
      if (typeof arg === 'string') return arg
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg)
        } catch {
          return '[Object]'
        }
      }
      return String(arg)
    })
    .join(' ')

  return encryptLogContent(combined)
}

/**
 * 安全日志对象
 */
export const secureLogger = {
  log(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.log(`[${logId}]`, processLogArgs(args))
    } else {
      console.log(...args)
    }
  },

  info(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.info(`[${logId}]`, processLogArgs(args))
    } else {
      console.info(...args)
    }
  },

  warn(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.warn(`[${logId}]`, processLogArgs(args))
    } else {
      console.warn(...args)
    }
  },

  error(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.error(`[${logId}]`, processLogArgs(args))
    } else {
      console.error(...args)
    }
  },

  debug(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.debug(`[${logId}]`, processLogArgs(args))
    } else {
      console.debug(...args)
    }
  },

  group(label: string): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.group(`[${logId}]`)
    } else {
      console.group(label)
    }
  },

  groupEnd(): void {
    console.groupEnd()
  },

  table(data: unknown): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.log(`[${logId}] [TABLE_DATA]`)
    } else {
      console.table(data)
    }
  }
}

// 保存原始console引用
let _originalConsole: {
  log: typeof console.log
  info: typeof console.info
  warn: typeof console.warn
  error: typeof console.error
  debug: typeof console.debug
  table: typeof console.table
} | null = null

/**
 * 全局替换console
 */
export function enableGlobalSecureConsole(): void {
  if (_originalConsole) return

  _originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
    table: console.table.bind(console)
  }

  console.log = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      _originalConsole!.log(`[${logId}]`, processLogArgs(args))
    } else {
      _originalConsole!.log(...args)
    }
  }

  console.info = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      _originalConsole!.info(`[${logId}]`, processLogArgs(args))
    } else {
      _originalConsole!.info(...args)
    }
  }

  console.warn = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      _originalConsole!.warn(`[${logId}]`, processLogArgs(args))
    } else {
      _originalConsole!.warn(...args)
    }
  }

  console.error = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      _originalConsole!.error(`[${logId}]`, processLogArgs(args))
    } else {
      _originalConsole!.error(...args)
    }
  }

  console.debug = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      _originalConsole!.debug(`[${logId}]`, processLogArgs(args))
    } else {
      _originalConsole!.debug(...args)
    }
  }

  console.table = (data: unknown) => {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      _originalConsole!.log(`[${logId}] [TABLE_DATA]`)
    } else {
      _originalConsole!.table(data)
    }
  }

  _originalConsole.log('[SecureLogger] 全局安全控制台已启用，所有日志将被加密')
}

export default secureLogger
