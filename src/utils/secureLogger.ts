/**
 * 安全日志工具
 * 根据配置决定是否加密控制台输出，保护敏感数据
 */

// 敏感数据模式匹配
const SENSITIVE_PATTERNS = [
  // 订单号
  /\b(ORD|ORDER|DD)[A-Z0-9-]{6,20}\b/gi,
  // 手机号
  /\b1[3-9]\d{9}\b/g,
  // 邮箱
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // 身份证号
  /\b\d{17}[\dXx]\b/g,
  // 银行卡号
  /\b\d{16,19}\b/g,
  // 金额（带货币符号）
  /[¥$€£]\s*\d+(\.\d{1,2})?/g,
  // IP地址
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  // Token/密钥
  /\b(token|key|secret|password|pwd)[=:]\s*['"]?[A-Za-z0-9+/=_-]{8,}['"]?/gi,
  // UUID
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
]

// 配置键名
const CONFIG_KEY = 'crm_secure_console_enabled'

/**
 * 检查是否启用了安全控制台
 */
export function isSecureConsoleEnabled(): boolean {
  try {
    const value = localStorage.getItem(CONFIG_KEY)
    return value === 'true'
  } catch {
    return false
  }
}

/**
 * 设置安全控制台开关
 */
export function setSecureConsoleEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CONFIG_KEY, String(enabled))
    console.log(`[SecureLogger] 安全控制台已${enabled ? '启用' : '禁用'}`)
  } catch (error) {
    console.error('[SecureLogger] 保存配置失败:', error)
  }
}

/**
 * 对敏感数据进行脱敏处理
 */
function maskSensitiveData(text: string): string {
  let masked = text

  for (const pattern of SENSITIVE_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      if (match.length <= 4) {
        return '****'
      }
      // 保留前2位和后2位，中间用*替换
      const visibleStart = match.slice(0, 2)
      const visibleEnd = match.slice(-2)
      const maskedMiddle = '*'.repeat(Math.min(match.length - 4, 8))
      return `${visibleStart}${maskedMiddle}${visibleEnd}`
    })
  }

  return masked
}

/**
 * 加密日志内容（简单的Base64编码，生产环境可使用更强的加密）
 */
function encryptLogContent(content: string): string {
  try {
    // 先脱敏，再编码
    const masked = maskSensitiveData(content)
    return `[ENCRYPTED] ${btoa(encodeURIComponent(masked))}`
  } catch {
    return '[ENCRYPTED] <encoding failed>'
  }
}

/**
 * 处理日志参数
 */
function processLogArgs(args: unknown[]): unknown[] {
  if (!isSecureConsoleEnabled()) {
    return args
  }

  return args.map(arg => {
    if (typeof arg === 'string') {
      return maskSensitiveData(arg)
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        const jsonStr = JSON.stringify(arg)
        const masked = maskSensitiveData(jsonStr)
        return JSON.parse(masked)
      } catch {
        return '[Object - masked]'
      }
    }
    return arg
  })
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
      console.log('[SECURE]', ...processLogArgs(args))
    } else {
      console.log(...args)
    }
  },

  /**
   * 信息日志
   */
  info(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      console.info('[SECURE]', ...processLogArgs(args))
    } else {
      console.info(...args)
    }
  },

  /**
   * 警告日志
   */
  warn(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      console.warn('[SECURE]', ...processLogArgs(args))
    } else {
      console.warn(...args)
    }
  },

  /**
   * 错误日志（错误信息通常需要完整显示以便调试）
   */
  error(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      // 错误日志也进行脱敏，但保留错误结构
      console.error('[SECURE]', ...processLogArgs(args))
    } else {
      console.error(...args)
    }
  },

  /**
   * 调试日志
   */
  debug(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      console.debug('[SECURE]', ...processLogArgs(args))
    } else {
      console.debug(...args)
    }
  },

  /**
   * 完全加密的日志（用于高度敏感数据）
   */
  encrypted(...args: unknown[]): void {
    if (isSecureConsoleEnabled()) {
      const encrypted = args.map(arg => {
        if (typeof arg === 'string') {
          return encryptLogContent(arg)
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return encryptLogContent(JSON.stringify(arg))
          } catch {
            return '[ENCRYPTED] <object>'
          }
        }
        return arg
      })
      console.log('[ENCRYPTED]', ...encrypted)
    } else {
      console.log(...args)
    }
  },

  /**
   * 分组日志
   */
  group(label: string): void {
    if (isSecureConsoleEnabled()) {
      console.group('[SECURE] ' + maskSensitiveData(label))
    } else {
      console.group(label)
    }
  },

  groupEnd(): void {
    console.groupEnd()
  },

  /**
   * 表格日志
   */
  table(data: unknown): void {
    if (isSecureConsoleEnabled()) {
      if (Array.isArray(data)) {
        const maskedData = data.map(item => {
          if (typeof item === 'object' && item !== null) {
            try {
              const jsonStr = JSON.stringify(item)
              const masked = maskSensitiveData(jsonStr)
              return JSON.parse(masked)
            } catch {
              return item
            }
          }
          return item
        })
        console.table(maskedData)
      } else {
        console.log('[SECURE] [Table data masked]')
      }
    } else {
      console.table(data)
    }
  }
}

/**
 * 全局替换console（可选，谨慎使用）
 * 调用此函数后，所有console.log等调用都会经过安全处理
 */
export function enableGlobalSecureConsole(): void {
  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console)
  }

  console.log = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      originalConsole.log('[SECURE]', ...processLogArgs(args))
    } else {
      originalConsole.log(...args)
    }
  }

  console.info = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      originalConsole.info('[SECURE]', ...processLogArgs(args))
    } else {
      originalConsole.info(...args)
    }
  }

  console.warn = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      originalConsole.warn('[SECURE]', ...processLogArgs(args))
    } else {
      originalConsole.warn(...args)
    }
  }

  console.error = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      originalConsole.error('[SECURE]', ...processLogArgs(args))
    } else {
      originalConsole.error(...args)
    }
  }

  console.debug = (...args: unknown[]) => {
    if (isSecureConsoleEnabled()) {
      originalConsole.debug('[SECURE]', ...processLogArgs(args))
    } else {
      originalConsole.debug(...args)
    }
  }

  console.log('[SecureLogger] 全局安全控制台已启用')
}

export default secureLogger
