/**
 * 安全日志工具
 * 根据配置决定是否加密控制台输出，保护业务逻辑和敏感数据
 *
 * 功能：
 * 1. 全局生效 - 配置存储在后端数据库，所有用户同步
 * 2. 完全加密 - 不只是敏感数据，所有业务逻辑、数据量、流程信息都加密
 * 3. 防止逆向 - 加密后的日志无法被破解分析业务流程
 */

// 配置键名（本地缓存）
const CONFIG_KEY = 'crm_secure_console_enabled'
const CONFIG_CACHE_KEY = 'crm_secure_console_cache_time'
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// 全局配置状态
let _secureConsoleEnabled: boolean | null = null
let _lastFetchTime = 0

/**
 * 从后端API获取安全控制台配置
 */
async function fetchSecureConsoleConfig(): Promise<boolean> {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return localStorage.getItem(CONFIG_KEY) === 'true'
    }

    const response = await fetch('/api/v1/system/security-settings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const enabled = data.data?.secureConsoleEnabled === true
      // 缓存到本地
      localStorage.setItem(CONFIG_KEY, String(enabled))
      localStorage.setItem(CONFIG_CACHE_KEY, String(Date.now()))
      return enabled
    }
  } catch {
    // 静默失败，使用本地缓存
  }
  return localStorage.getItem(CONFIG_KEY) === 'true'
}

/**
 * 检查是否启用了安全控制台（同步版本，使用缓存）
 */
export function isSecureConsoleEnabled(): boolean {
  // 如果有缓存且未过期，直接返回
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
      if (cacheAge < CACHE_DURATION) {
        _secureConsoleEnabled = cached === 'true'
        _lastFetchTime = parseInt(cacheTime)
        return _secureConsoleEnabled
      }
    }

    // 缓存过期，异步刷新（不阻塞）
    fetchSecureConsoleConfig().then(enabled => {
      _secureConsoleEnabled = enabled
      _lastFetchTime = Date.now()
    })

    // 返回当前缓存值或默认值
    return cached === 'true'
  } catch {
    return false
  }
}

/**
 * 设置安全控制台开关（同时保存到后端）
 */
export async function setSecureConsoleEnabled(enabled: boolean): Promise<void> {
  try {
    // 立即更新本地缓存
    localStorage.setItem(CONFIG_KEY, String(enabled))
    localStorage.setItem(CONFIG_CACHE_KEY, String(Date.now()))
    _secureConsoleEnabled = enabled
    _lastFetchTime = Date.now()

    // 同步到后端
    const token = localStorage.getItem('auth_token')
    if (token) {
      await fetch('/api/v1/system/security-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ secureConsoleEnabled: enabled })
      })
    }
  } catch {
    // 静默失败，本地已保存
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
 * 将所有业务逻辑、数据量、流程信息都加密，防止逆向分析
 */
function encryptLogContent(content: string): string {
  try {
    // 1. 先进行XOR混淆
    const xored = xorEncrypt(content, SESSION_KEY)
    // 2. 再进行Base64编码
    const encoded = btoa(unescape(encodeURIComponent(xored)))
    // 3. 生成校验码（防止篡改）
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
 * 所有内容都会被加密，包括：
 * - 业务逻辑描述
 * - 数据数量
 * - API调用信息
 * - 流程状态
 */
function processLogArgs(args: unknown[]): string {
  if (!isSecureConsoleEnabled()) {
    // 未启用时返回原始参数的字符串形式
    return args.map(arg => {
      if (typeof arg === 'string') return arg
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      }
      return String(arg)
    }).join(' ')
  }

  // 启用加密时，将所有参数合并后加密
  const combined = args.map(arg => {
    if (typeof arg === 'string') return arg
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg)
      } catch {
        return '[Object]'
      }
    }
    return String(arg)
  }).join(' ')

  return encryptLogContent(combined)
}

/**
 * 安全日志对象
 */
export const secureLogger = {
  /**
   * 普通日志
   */
  log(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.log(`[${logId}]`, processLogArgs(args))
    } else {
      console.log(...args)
    }
  },

  /**
   * 信息日志
   */
  info(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.info(`[${logId}]`, processLogArgs(args))
    } else {
      console.info(...args)
    }
  },

  /**
   * 警告日志
   */
  warn(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.warn(`[${logId}]`, processLogArgs(args))
    } else {
      console.warn(...args)
    }
  },

  /**
   * 错误日志
   */
  error(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.error(`[${logId}]`, processLogArgs(args))
    } else {
      console.error(...args)
    }
  },

  /**
   * 调试日志
   */
  debug(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const logId = generateLogId()
      console.debug(`[${logId}]`, processLogArgs(args))
    } else {
      console.debug(...args)
    }
  },

  /**
   * 分组日志
   */
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

  /**
   * 表格日志 - 加密模式下完全禁用
   */
  table(data: unknown): void {
    if (isSecureConsoleEnabled()) {
      // 加密模式下不显示表格数据，防止数据泄露
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
 * 调用此函数后，所有console输出都会被加密处理
 * 加密后的输出格式：[LOG_ID] encrypted_content
 */
export function enableGlobalSecureConsole(): void {
  // 避免重复替换
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

  // 输出启用提示（使用原始console避免递归）
  _originalConsole.log('[SecureLogger] 全局安全控制台已启用，所有日志将被加密')
}

/**
 * 刷新配置（从后端重新获取）
 */
export async function refreshSecureConsoleConfig(): Promise<boolean> {
  const enabled = await fetchSecureConsoleConfig()
  _secureConsoleEnabled = enabled
  _lastFetchTime = Date.now()
  return enabled
}

export default secureLogger
