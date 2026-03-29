/**
 * 安全日志工具
 * 根据配置决定是否加密控制台输出，保护业务逻辑和敏感数据
 *
 * 权限优先级（新逻辑）：
 * 1. Admin后台启用加密 → 全局强制加密，租户不可关闭（按钮锁定）
 * 2. Admin后台未启用/未配置 → 租户可自行控制（默认仍是加密启用）
 * 3. 系统初始化 → 一律默认加密（新租户 = 加密启用）
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
 * 检查Admin后台是否强制启用加密（同步读取localStorage缓存）
 * 用于CRM面板判断是否锁定加密开关
 */
export function isAdminForcedEncryption(): boolean {
  try {
    const adminGlobal = localStorage.getItem('crm_admin_console_encryption')
    return adminGlobal === 'true'
  } catch {
    return false
  }
}

/**
 * 主动从后端API查询管理后台加密强制状态
 * 调用 GET /api/v1/system/admin-encryption-status
 * 适用于 SaaS 和私有部署，确保与管理后台实时同步
 */
async function fetchAdminEncryptionStatus(): Promise<void> {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    const response = await fetch('/api/v1/system/admin-encryption-status', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      const forced = data.data?.adminForcedEncryption === true
      // 同步到localStorage，供 isAdminForcedEncryption() 和 isSecureConsoleEnabled() 读取
      localStorage.setItem('crm_admin_console_encryption', String(forced))
      // 同步到configStore（避免缓存滞后导致面板状态不一致）
      try {
        const { useConfigStore } = await import('@/stores/config')
        const configStore = useConfigStore()
        if (configStore.adminConsoleEncryption !== forced) {
          configStore.adminConsoleEncryption = forced
        }
      } catch {
        // configStore 未初始化时静默忽略
      }
    }
  } catch {
    // 查询失败不影响，保持上一次的缓存值
  }
}

/**
 * 从后端API获取租户级安全控制台配置
 */
async function fetchSecureConsoleConfig(): Promise<boolean> {
  if (_isFetching) {
    // 正在加载中，先返回已知状态
    if (isAdminForcedEncryption()) return true
    const cached = localStorage.getItem(CONFIG_KEY)
    return cached !== null ? cached === 'true' : true // 无缓存时默认启用
  }

  _isFetching = true
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return true // 未登录时默认启用加密
    }

    // 获取租户级配置
    const response = await fetch('/api/v1/system/console-security-config', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      // 后端有明确返回值时使用后端值，否则默认启用
      const tenantSetting = data.data?.secureConsoleEnabled !== false
      // 缓存租户级设置到本地
      localStorage.setItem(CONFIG_KEY, String(tenantSetting))
      localStorage.setItem(CONFIG_CACHE_KEY, String(Date.now()))
      _secureConsoleEnabled = tenantSetting
      _lastFetchTime = Date.now()
      return tenantSetting
    }
  } catch {
    // 静默失败，使用本地缓存
  } finally {
    _isFetching = false
  }
  const cached = localStorage.getItem(CONFIG_KEY)
  return cached !== null ? cached === 'true' : true // 无缓存时默认启用
}

/**
 * 强制从服务器刷新所有配置（登录后调用）
 * 同时刷新：1.管理后台强制状态  2.租户级加密设置
 *
 * 关键逻辑：检测admin从"强制启用"→"不强制"的转换
 * 转换时自动重置租户加密设置为默认ON（之前的OFF在admin强制期间已过时）
 */
export async function refreshSecureConsoleConfig(): Promise<boolean> {
  // 📌 在刷新前记住当前admin强制状态（用于检测转换）
  const wasAdminForcing = localStorage.getItem('crm_admin_console_encryption') === 'true'

  // 清除租户级缓存
  _secureConsoleEnabled = null
  _lastFetchTime = 0
  localStorage.removeItem(CONFIG_CACHE_KEY)

  // 并行刷新：管理后台状态 + 租户设置
  const [, tenantSetting] = await Promise.all([
    fetchAdminEncryptionStatus(),
    fetchSecureConsoleConfig()
  ])

  const isNowForcing = isAdminForcedEncryption()

  // 🔄 检测admin从"强制启用"→"不强制"的转换
  // 此时租户可能有旧的OFF设置（在admin强制前/期间设置的），需要重置为默认ON
  // 租户之后可以自行手动关闭
  if (wasAdminForcing && !isNowForcing) {
    // 重置本地缓存为默认ON
    _secureConsoleEnabled = true
    _lastFetchTime = Date.now()
    localStorage.setItem(CONFIG_KEY, 'true')
    localStorage.setItem(CONFIG_CACHE_KEY, String(Date.now()))
    // 同步重置到后端（确保下次刷新也是ON）
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        await fetch('/api/v1/system/security-settings', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ secureConsoleEnabled: true })
        })
      }
    } catch {
      // 后端保存失败不影响本地状态，本地已重置为true
    }
    return true
  }

  // 最终结果：Admin强制启用 → true; 否则使用租户设置
  return isNowForcing || tenantSetting
}

/**
 * 初始化安全控制台配置（应用启动时调用）
 * 系统默认一律加密 → 始终启用全局控制台替换
 * 运行时由 isSecureConsoleEnabled() 实时判断是否加密输出
 */
export async function initSecureConsoleConfig(): Promise<void> {
  // 系统默认加密：始终启用全局控制台替换
  enableGlobalSecureConsole()

  // 获取最新配置（不影响默认加密行为）
  const token = localStorage.getItem('auth_token')
  if (token) {
    try {
      // 同时获取管理后台状态和租户设置
      await Promise.all([
        fetchAdminEncryptionStatus(),
        fetchSecureConsoleConfig()
      ])
    } catch {
      // 获取失败不影响，默认保持加密
    }
  }
}

/**
 * 检查是否启用了安全控制台（同步版本，使用缓存）
 *
 * 新优先级逻辑：
 * 1. Admin后台启用加密 → 强制返回true（租户不可覆盖）
 * 2. Admin后台未启用/未配置 → 使用租户自己的设置
 * 3. 租户无设置（新租户） → 默认返回true（系统初始化=加密）
 */
export function isSecureConsoleEnabled(): boolean {
  // 第一优先级：Admin后台强制启用加密 → 全局生效，租户不可关闭
  try {
    const adminGlobal = localStorage.getItem('crm_admin_console_encryption')
    if (adminGlobal === 'true') {
      return true // Admin强制启用，租户无法覆盖
    }
  } catch {
    // 静默处理
  }

  // 第二优先级：使用租户自己的设置（Admin未强制时）
  // 如果有内存缓存且未过期，直接返回
  if (_secureConsoleEnabled !== null) {
    const now = Date.now()
    if (now - _lastFetchTime < CACHE_DURATION) {
      return _secureConsoleEnabled
    }
  }

  // 从localStorage读取租户级缓存
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

    // 返回当前缓存值，无缓存时默认启用（新租户=加密）
    return cached !== null ? cached === 'true' : true
  } catch {
    return true // 异常时默认启用加密
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
