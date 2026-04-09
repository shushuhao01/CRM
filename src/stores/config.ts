import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 系统配置接口
export interface SystemConfig {
  systemName: string
  systemVersion: string
  companyName: string
  contactPhone: string
  contactEmail: string
  websiteUrl: string
  companyAddress: string
  systemDescription: string
  systemLogo: string
  // 🔥 批次274新增：联系二维码（统一一个）
  contactQRCode?: string // 联系二维码
  contactQRCodeLabel?: string // 二维码标签（如：微信、企业微信等）
  // 🔥 批次275新增：用户协议
  userAgreement?: string // 用户使用协议
  privacyPolicy?: string // 用户隐私协议
  // 🔥 版权与备案信息
  copyrightText?: string // 版权文字
  icpNumber?: string // ICP备案号
  policeNumber?: string // 公安备案号
  techSupport?: string // 技术支持
}

// 安全配置接口
export interface SecurityConfig {
  passwordMinLength: number
  passwordComplexity: string[]
  passwordExpireDays: number
  loginFailLock: boolean
  maxLoginFails: number
  lockDuration: number
  sessionTimeout: number
  forceHttps: boolean
  ipWhitelist: string
}

// 商品配置接口
export interface ProductConfig {
  maxDiscountPercent: number
  adminMaxDiscount: number
  managerMaxDiscount: number
  salesMaxDiscount: number
  discountApprovalThreshold: number
  allowPriceModification: boolean
  priceModificationRoles: string[]
  enablePriceHistory: boolean
  pricePrecision: string
  enableInventory: boolean
  lowStockThreshold: number
  allowNegativeStock: boolean
  defaultCategory: string
  maxCategoryLevel: number
  enableCategoryCode: boolean
  // 权限配置
  enablePermissionControl: boolean
  costPriceViewRoles: string[]
  salesDataViewRoles: string[]
  stockInfoViewRoles: string[]
  operationLogsViewRoles: string[]
  sensitiveInfoHideMethod: string
}

// 应用主题配置
export interface ThemeConfig {
  primaryColor: string
  sidebarCollapsed: boolean
  language: string
  timezone: string
}

// 业绩分享配置接口
export interface PerformanceShareConfig {
  enabled: boolean // 是否启用业绩分享功能
  allowCopy: boolean // 是否允许复制
  allowDownload: boolean // 是否允许下载
  watermarkEnabled: boolean // 是否显示水印
  watermarkType: 'username' | 'account' | 'department' | 'phone' | 'custom' // 水印类型
  watermarkText: string // 自定义水印文字
}

// 短信配置接口
export interface SmsConfig {
  provider: string
  accessKey: string
  secretKey: string
  signName: string
  dailyLimit: number
  monthlyLimit: number
  enabled: boolean
  requireApproval: boolean
  testPhone: string
}

// 邮件配置接口
export interface EmailConfig {
  smtpHost: string
  smtpPort: number
  senderEmail: string
  senderName: string
  emailPassword: string
  enableSsl: boolean
  enableTls: boolean
  testEmail: string
}

// 通话配置接口
export interface CallConfig {
  sipServer: string
  sipPort: number
  sipUsername: string
  sipPassword: string
  sipTransport: string
  autoAnswer: boolean
  autoRecord: boolean
  qualityMonitoring: boolean
  incomingCallPopup: boolean
  maxCallDuration: number
  recordFormat: string
  recordQuality: string
  recordPath: string
  recordRetentionDays: number
  outboundPermission: string[]
  recordAccessPermission: string[]
  statisticsPermission: string[]
  numberRestriction: boolean
  allowedPrefixes: string
}

// 存储配置接口
export interface StorageConfig {
  storageType: 'local' | 'oss'
  localPath: string
  localDomain: string
  accessKey: string
  secretKey: string
  bucketName: string
  region: string
  customDomain: string
  maxFileSize: number
  allowedTypes: string
  // 图片压缩配置
  imageCompressEnabled: boolean
  imageCompressQuality: 'high' | 'medium' | 'low' | 'custom'
  imageCompressMaxWidth: number
  imageCompressCustomQuality: number
}

export const useConfigStore = defineStore('config', () => {
  // 系统基本配置
  const systemConfig = ref<SystemConfig>({
    systemName: 'CRM客户管理系统',
    systemVersion: '1.0.0',
    companyName: '示例科技有限公司',
    contactPhone: '400-123-4567',
    contactEmail: 'contact@example.com',
    websiteUrl: 'https://www.example.com',
    companyAddress: '北京市朝阳区示例大厦',
    systemDescription: '专业的客户关系管理系统，帮助企业提升客户服务质量和销售效率。',
    systemLogo: ''
  })

  // 功能开关（从Admin公共API获取）
  const featureFlags = ref<Record<string, boolean> | null>(null)


  // Admin下发配置（从Admin公开API获取）
  const adminDistributedConfig = ref<Record<string, any> | null>(null)

  // 配置锁定状态（被Admin管控时为true，CRM本地不可编辑）
  const configLocked = ref<Record<string, boolean>>({
    security: false,
    call: false,
    email: false,
    sms: false,
    storage: false,
  })
  // 平台配置覆盖状态（由Admin后台控制）
  const platformOverride = ref<{
    basic: boolean
    copyright: boolean
    agreement: boolean
    copyrightText: boolean  // 版权文字是否由管理后台配置
    techSupport: boolean    // 技术支持是否由管理后台配置
  }>({
    basic: false,
    copyright: false,
    agreement: false,
    copyrightText: false,
    techSupport: false
  })

  // Admin全局控制台加密开关（由管理后台全局控制，默认true）
  const adminConsoleEncryption = ref<boolean | null>(null)

  // 安全配置
  const securityConfig = ref<SecurityConfig>({
    passwordMinLength: 8,
    passwordComplexity: ['lowercase', 'number'],
    passwordExpireDays: 90,
    loginFailLock: true,
    maxLoginFails: 5,
    lockDuration: 30,
    sessionTimeout: 120,
    forceHttps: false,
    ipWhitelist: ''
  })

  // 商品配置
  const productConfig = ref<ProductConfig>({
    maxDiscountPercent: 30.0,
    adminMaxDiscount: 50.0,
    managerMaxDiscount: 30.0,
    salesMaxDiscount: 15.0,
    discountApprovalThreshold: 20.0,
    allowPriceModification: true,
    priceModificationRoles: ['admin', 'department_manager'],
    enablePriceHistory: true,
    pricePrecision: '2',
    enableInventory: true,
    lowStockThreshold: 10,
    allowNegativeStock: false,
    defaultCategory: '未分类',
    maxCategoryLevel: 3,
    enableCategoryCode: true,
    // 权限配置默认值
    enablePermissionControl: true,
    costPriceViewRoles: ['super_admin', 'admin', 'finance'],
    salesDataViewRoles: ['super_admin', 'admin', 'department_manager'],
    stockInfoViewRoles: ['super_admin', 'admin', 'department_manager', 'warehouse'],
    operationLogsViewRoles: ['super_admin', 'admin', 'audit'],
    sensitiveInfoHideMethod: 'eye_icon'
  })

  // 主题配置
  const themeConfig = ref<ThemeConfig>({
    primaryColor: '#409EFF',
    sidebarCollapsed: false,
    language: 'zh-CN',
    timezone: 'Asia/Shanghai'
  })

  // 短信配置
  const smsConfig = ref<SmsConfig>({
    provider: 'aliyun',
    accessKey: '',
    secretKey: '',
    signName: '',
    dailyLimit: 100,
    monthlyLimit: 3000,
    enabled: false,
    requireApproval: false,
    testPhone: ''
  })

  // 存储配置
  const storageConfig = ref<StorageConfig>({
    storageType: 'local',
    localPath: '/uploads',
    localDomain: 'http://localhost:3000',
    accessKey: '',
    secretKey: '',
    bucketName: '',
    region: '',
    customDomain: '',
    maxFileSize: 10,
    allowedTypes: 'jpg,png,gif,pdf,doc,docx,xls,xlsx',
    // 图片压缩配置
    imageCompressEnabled: true,
    imageCompressQuality: 'medium',
    imageCompressMaxWidth: 1200,
    imageCompressCustomQuality: 60
  })

  // 邮件配置
  const emailConfig = ref<EmailConfig>({
    smtpHost: '',
    smtpPort: 587,
    senderEmail: '',
    senderName: '',
    emailPassword: '',
    enableSsl: true,
    enableTls: false,
    testEmail: ''
  })

  // 通话配置
  const callConfig = ref<CallConfig>({
    sipServer: '',
    sipPort: 5060,
    sipUsername: '',
    sipPassword: '',
    sipTransport: 'UDP',
    autoAnswer: false,
    autoRecord: false,
    qualityMonitoring: false,
    incomingCallPopup: true,
    maxCallDuration: 3600,
    recordFormat: 'mp3',
    recordQuality: 'standard',
    recordPath: './recordings',
    recordRetentionDays: 90,
    outboundPermission: ['admin', 'manager', 'sales'],
    recordAccessPermission: ['admin', 'manager'],
    statisticsPermission: ['admin', 'manager'],
    numberRestriction: false,
    allowedPrefixes: ''
  })

  // 业绩分享配置
  const performanceShareConfig = ref<PerformanceShareConfig>({
    enabled: true,
    allowCopy: true,
    allowDownload: true,
    watermarkEnabled: true,
    watermarkType: 'account',
    watermarkText: ''
  })

  // 计算属性
  const isPasswordComplexityEnabled = computed(() => {
    return securityConfig.value.passwordComplexity.length > 0
  })

  const canUserModifyPrice = computed(() => {
    return (userRole: string) => {
      return productConfig.value.allowPriceModification &&
             productConfig.value.priceModificationRoles.includes(userRole)
    }
  })

  const getMaxDiscountForRole = computed(() => {
    return (userRole: string) => {
      switch (userRole) {
        case 'admin':
          return productConfig.value.adminMaxDiscount
        case 'department_manager':
          return productConfig.value.managerMaxDiscount
        case 'sales':
          return productConfig.value.salesMaxDiscount
        default:
          return 0
      }
    }
  })

  // 方法
  /**
   * 更新系统配置
   */
  const updateSystemConfig = (config: Partial<SystemConfig>) => {
    Object.assign(systemConfig.value, config)
    saveConfigToStorage('system', systemConfig.value)
  }

  /**
   * 更新安全配置
   */
  const updateSecurityConfig = (config: Partial<SecurityConfig>) => {
    Object.assign(securityConfig.value, config)
    saveConfigToStorage('security', securityConfig.value)
  }

  /**
   * 更新商品配置
   */
  const updateProductConfig = (config: Partial<ProductConfig>) => {
    Object.assign(productConfig.value, config)
    saveConfigToStorage('product', productConfig.value)
  }

  /**
   * 更新主题配置
   */
  const updateThemeConfig = (config: Partial<ThemeConfig>) => {
    Object.assign(themeConfig.value, config)
    saveConfigToStorage('theme', themeConfig.value)

    // 应用主题变更
    if (config.primaryColor) {
      document.documentElement.style.setProperty('--el-color-primary', config.primaryColor)
    }


  }



  /**
   * 初始化主题
   */
  const initTheme = () => {
    try {
      // 检查localStorage是否可用
      if (typeof localStorage === 'undefined') {
        console.warn('[Config] localStorage不可用，使用默认主题配置')
        updateThemeConfig({})
        return
      }

      // 从本地存储加载主题配置
      const themeConfigStr = localStorage.getItem('crm_config_theme')
      if (themeConfigStr) {
        try {
          const savedTheme = JSON.parse(themeConfigStr)
          Object.assign(themeConfig.value, savedTheme)
          console.log('[Config] 主题配置已从本地存储加载')
        } catch (error) {
          console.error('[Config] 解析主题配置失败:', error)
        }
      }

      // 应用当前主题配置
      updateThemeConfig({})
    } catch (error) {
      console.error('[Config] 初始化主题失败:', error)
      // 使用默认配置
      updateThemeConfig({})
    }
  }

  /**
   * 更新短信配置
   */
  const updateSmsConfig = (config: Partial<SmsConfig>) => {
    Object.assign(smsConfig.value, config)
    saveConfigToStorage('sms', smsConfig.value)
  }

  /**
   * 更新存储配置
   */
  const updateStorageConfig = (config: Partial<StorageConfig>) => {
    Object.assign(storageConfig.value, config)
    saveConfigToStorage('storage', storageConfig.value)
  }

  /**
   * 更新邮件配置
   */
  const updateEmailConfig = (config: Partial<EmailConfig>) => {
    Object.assign(emailConfig.value, config)
    saveConfigToStorage('email', emailConfig.value)
  }

  /**
   * 更新通话配置
   */
  const updateCallConfig = (config: Partial<CallConfig>) => {
    Object.assign(callConfig.value, config)
    saveConfigToStorage('call', callConfig.value)
  }

  /**
   * 更新业绩分享配置
   */
  const updatePerformanceShareConfig = (config: Partial<PerformanceShareConfig>) => {
    Object.assign(performanceShareConfig.value, config)
    saveConfigToStorage('performanceShare', performanceShareConfig.value)
  }

  /**
   * 保存配置到存储（生产环境调用API，开发环境使用localStorage）
   */
  const saveConfigToStorage = async (type: string, config: unknown) => {
    try {
      // 检测是否为生产环境
      const hostname = window.location.hostname
      const isProdEnv = (
        hostname.includes('yunkes.com') ||
        hostname.includes('abc789.cn') ||
        hostname.includes('vercel.app') ||
        hostname.includes('netlify.app') ||
        hostname.includes('railway.app') ||
        (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))
      )

      // 检查是否已登录（有token）
      const token = localStorage.getItem('auth_token')

      if (isProdEnv && token) {
        // 生产环境且已登录：调用API保存配置
        console.log(`[ConfigStore] 生产环境：保存${type}配置到数据库`)
        try {
          const { api } = await import('@/api/request')
          await api.post('/system/settings', { type, config })
          console.log(`[ConfigStore] ${type}配置保存到数据库成功`)
        } catch (_apiError) {
          // 静默降级到localStorage，不打印错误
          localStorage.setItem(`crm_config_${type}`, JSON.stringify(config))
        }
      } else {
        // 开发环境或未登录：使用localStorage
        localStorage.setItem(`crm_config_${type}`, JSON.stringify(config))
      }
    } catch (_error) {
      console.error('保存配置失败:', _error)
    }
  }

  /**
   * 从本地存储加载配置
   */
  const loadConfigFromStorage = () => {
    try {
      // 加载系统配置
      const systemConfigStr = localStorage.getItem('crm_config_system')
      if (systemConfigStr) {
        Object.assign(systemConfig.value, JSON.parse(systemConfigStr))
      } else {
        // 【批次202修复】首次加载时保存默认配置
        saveConfigToStorage('system', systemConfig.value)
      }

      // 加载安全配置
      const securityConfigStr = localStorage.getItem('crm_config_security')
      if (securityConfigStr) {
        Object.assign(securityConfig.value, JSON.parse(securityConfigStr))
      } else {
        // 【批次202修复】首次加载时保存默认配置
        saveConfigToStorage('security', securityConfig.value)
      }

      // 加载商品配置
      const productConfigStr = localStorage.getItem('crm_config_product')
      if (productConfigStr) {
        Object.assign(productConfig.value, JSON.parse(productConfigStr))
      } else {
        // 【批次202修复】首次加载时保存默认配置
        console.log('[配置初始化] 商品配置不存在,保存默认配置:', productConfig.value)
        saveConfigToStorage('product', productConfig.value)
      }

      // 加载主题配置
      const themeConfigStr = localStorage.getItem('crm_config_theme')
      if (themeConfigStr) {
        Object.assign(themeConfig.value, JSON.parse(themeConfigStr))
        // 应用主题
        updateThemeConfig({})
      } else {
        // 【批次202修复】首次加载时保存默认配置
        saveConfigToStorage('theme', themeConfig.value)
      }

      // 加载存储配置
      const storageConfigStr = localStorage.getItem('crm_config_storage')
      if (storageConfigStr) {
        Object.assign(storageConfig.value, JSON.parse(storageConfigStr))
      } else {
        // 【批次202修复】首次加载时保存默认配置
        saveConfigToStorage('storage', storageConfig.value)
      }

      // 加载业绩分享配置
      const performanceShareConfigStr = localStorage.getItem('crm_config_performanceShare')
      if (performanceShareConfigStr) {
        Object.assign(performanceShareConfig.value, JSON.parse(performanceShareConfigStr))
      } else {
        // 【批次202修复】首次加载时保存默认配置
        saveConfigToStorage('performanceShare', performanceShareConfig.value)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  /**
   * 重置配置到默认值
   */
  const resetConfig = (type: 'system' | 'security' | 'product' | 'theme' | 'sms' | 'all') => {
    if (type === 'system' || type === 'all') {
      systemConfig.value = {
        systemName: 'CRM客户管理系统',
        systemVersion: '1.0.0',
        companyName: '示例科技有限公司',
        contactPhone: '400-123-4567',
        contactEmail: 'contact@example.com',
        websiteUrl: 'https://www.example.com',
        companyAddress: '北京市朝阳区示例大厦',
        systemDescription: '专业的客户关系管理系统，帮助企业提升客户服务质量和销售效率。',
        systemLogo: ''
      }
      saveConfigToStorage('system', systemConfig.value)
    }

    if (type === 'security' || type === 'all') {
      securityConfig.value = {
        passwordMinLength: 8,
        passwordComplexity: ['lowercase', 'number'],
        passwordExpireDays: 90,
        loginFailLock: true,
        maxLoginFails: 5,
        lockDuration: 30,
        sessionTimeout: 120,
        forceHttps: false,
        ipWhitelist: ''
      }
      saveConfigToStorage('security', securityConfig.value)
    }

    if (type === 'product' || type === 'all') {
      productConfig.value = {
        maxDiscountPercent: 30.0,
        adminMaxDiscount: 50.0,
        managerMaxDiscount: 30.0,
        salesMaxDiscount: 15.0,
        discountApprovalThreshold: 20.0,
        allowPriceModification: true,
        priceModificationRoles: ['admin', 'department_manager'],
        enablePriceHistory: true,
        pricePrecision: '2',
        enableInventory: true,
        lowStockThreshold: 10,
        allowNegativeStock: false,
        defaultCategory: '未分类',
        maxCategoryLevel: 3,
        enableCategoryCode: true,
        // 【批次202修复】添加缺失的权限配置字段
        enablePermissionControl: true,
        costPriceViewRoles: ['super_admin', 'admin', 'finance'],
        salesDataViewRoles: ['super_admin', 'admin', 'department_manager'],
        stockInfoViewRoles: ['super_admin', 'admin', 'department_manager', 'warehouse'],
        operationLogsViewRoles: ['super_admin', 'admin', 'audit'],
        sensitiveInfoHideMethod: 'eye_icon'
      }
      saveConfigToStorage('product', productConfig.value)
    }

    if (type === 'theme' || type === 'all') {
      themeConfig.value = {
        primaryColor: '#409EFF',
        sidebarCollapsed: false,
        language: 'zh-CN',
        timezone: 'Asia/Shanghai'
      }
      saveConfigToStorage('theme', themeConfig.value)
      updateThemeConfig({})
    }

    if (type === 'sms' || type === 'all') {
      smsConfig.value = {
        provider: 'aliyun',
        accessKey: '',
        secretKey: '',
        signName: '',
        dailyLimit: 100,
        monthlyLimit: 3000,
        enabled: false,
        requireApproval: true,
        testPhone: ''
      }
      saveConfigToStorage('sms', smsConfig.value)
    }
  }

  /**
   * 重置系统配置
   */
  const resetSystemConfig = () => {
    resetConfig('system')
  }

  /**
   * 重置安全配置
   */
  const resetSecurityConfig = () => {
    resetConfig('security')
  }

  /**
   * 重置商品配置
   */
  const resetProductConfig = () => {
    resetConfig('product')
  }

  /**
   * 重置主题配置
   */
  const resetThemeConfig = () => {
    resetConfig('theme')
  }

  /**
   * 重置短信配置
   */
  const resetSmsConfig = () => {
    resetConfig('sms')
  }

  /**
   * 从API加载系统配置（所有用户可访问）
   * 优先从Admin平台配置加载，再从本地API加载
   * 未登录时自动使用公开API
   */
  const loadSystemConfigFromAPI = async () => {
    try {
      const { apiService } = await import('@/services/apiService')

      // 第一步：尝试从Admin平台配置加载（公开API，无需认证）
      try {
        const platformData = await apiService.get('/admin/public/system-config')
        if (platformData && typeof platformData === 'object') {
          // 提取并保存覆盖状态
          const { hasOverride, featureFlags: apiFeatureFlags, ...configData } = platformData as any
          // 设置功能开关
          if (apiFeatureFlags && typeof apiFeatureFlags === 'object') {
            // Support nested {saas:{...}, private:{...}} structure
            const deployMode = (import.meta.env.VITE_DEPLOY_MODE || 'saas') as string
            const modeKey = deployMode === 'private' ? 'private' : 'saas'
            if (apiFeatureFlags[modeKey] && typeof apiFeatureFlags[modeKey] === 'object') {
              featureFlags.value = apiFeatureFlags[modeKey] as Record<string, boolean>
            } else {
              featureFlags.value = apiFeatureFlags as Record<string, boolean>
            }
          }
          // 读取Admin全局控制台加密开关
          if ((platformData as any).enableConsoleEncryption !== undefined) {
            adminConsoleEncryption.value = !!(platformData as any).enableConsoleEncryption
            // 同步到localStorage供secureLogger同步读取
            localStorage.setItem('crm_admin_console_encryption', String(adminConsoleEncryption.value))
          }
          // 提取Admin下发配置
          const { distributedConfig: apiDistConfig } = platformData as any
          if (apiDistConfig && typeof apiDistConfig === 'object') {
            adminDistributedConfig.value = apiDistConfig
          }

          if (hasOverride) {
            platformOverride.value = {
              basic: hasOverride.basic || false,
              copyright: hasOverride.copyright || false,
              agreement: hasOverride.agreement || false,
              copyrightText: hasOverride.copyrightText || false,
              techSupport: hasOverride.techSupport || false
            }
          }
          // 将平台配置覆盖到系统配置上（仅覆盖已启用的字段）
          if (Object.keys(configData).length > 0) {
            Object.assign(systemConfig.value, configData)
          }
        }
      } catch {
        // Admin平台配置不可用（如未部署Admin后台），静默处理
      }

      // 第二步：从本地CRM API加载（未被平台覆盖的字段会被本地值补充）
      const token = localStorage.getItem('token')
      const endpoint = token ? '/system/basic-settings' : '/system/basic-settings/public'
      const apiData = await apiService.get(endpoint)

      if (apiData && typeof apiData === 'object') {
        // 如果平台有覆盖，只应用未被覆盖的字段
        if (platformOverride.value.basic || platformOverride.value.copyright || platformOverride.value.copyrightText || platformOverride.value.techSupport) {
          const localData = { ...(apiData as any) }
          // 平台已覆盖基本信息，不用本地值覆盖
          if (platformOverride.value.basic) {
            delete localData.systemName
            delete localData.systemVersion
            delete localData.companyName
            delete localData.contactPhone
            delete localData.contactEmail
            delete localData.websiteUrl
            delete localData.companyAddress
            delete localData.systemDescription
            delete localData.systemLogo
            delete localData.contactQRCode
            delete localData.contactQRCodeLabel
          }
          // 平台已覆盖版权信息，不用本地值覆盖
          if (platformOverride.value.copyright) {
            delete localData.icpNumber
            delete localData.policeNumber
          }
          // 版权文字和技术支持由管理后台单独控制
          if (platformOverride.value.copyrightText) {
            delete localData.copyrightText
          }
          if (platformOverride.value.techSupport) {
            delete localData.techSupport
          }
          // 应用剩余的本地字段
          if (Object.keys(localData).length > 0) {
            Object.assign(systemConfig.value, localData)
          }
        } else {
          // 平台没有任何覆盖，直接使用本地配置
          Object.assign(systemConfig.value, apiData)
        }
        saveConfigToStorage('system', systemConfig.value)
      }
    } catch (_error) {
      // 已登录接口失败时，尝试公开接口兜底
      try {
        const { apiService } = await import('@/services/apiService')
        const apiData = await apiService.get('/system/basic-settings/public')
        if (apiData && typeof apiData === 'object') {
          Object.assign(systemConfig.value, apiData)
          saveConfigToStorage('system', systemConfig.value)
        }
      } catch {
        // 静默处理错误
      }
    }
  }

  /**
   * 从API加载安全配置（仅管理员可访问）
   */
  const loadSecurityConfigFromAPI = async () => {
    try {
      // ✅ Admin下发配置优先: 如果Admin配置了该项，直接使用，锁定本地编辑
      if (adminDistributedConfig.value && adminDistributedConfig.value.security) {
        Object.assign(securityConfig.value, adminDistributedConfig.value.security)
        configLocked.value.security = true
        saveConfigToStorage('security', securityConfig.value)
        return
      }
      configLocked.value.security = false

      // 检查是否是管理员，非管理员静默跳过
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.role !== 'super_admin' && user.role !== 'admin') {
          // 非管理员静默跳过，不加载安全配置
          return
        }
      }

      const { apiService } = await import('@/services/apiService')
      const apiData = await apiService.get('/system/security-settings')

      if (apiData && typeof apiData === 'object') {
        Object.assign(securityConfig.value, apiData)
        saveConfigToStorage('security', securityConfig.value)
      }
    } catch (_error) {
      // 静默处理错误，不显示任何提示
    }
  }

  /**
   * 从API加载存储配置（所有用户可访问）
   */
  const loadStorageConfigFromAPI = async () => {
    try {
      // ✅ Admin下发配置优先: 如果Admin配置了该项，直接使用，锁定本地编辑
      if (adminDistributedConfig.value && adminDistributedConfig.value.storage) {
        Object.assign(storageConfig.value, adminDistributedConfig.value.storage)
        configLocked.value.storage = true
        saveConfigToStorage('storage', storageConfig.value)
        return
      }
      configLocked.value.storage = false

      const { apiService } = await import('@/services/apiService')
      const apiData = await apiService.get('/system/storage-settings')

      if (apiData && typeof apiData === 'object') {
        Object.assign(storageConfig.value, apiData)
        saveConfigToStorage('storage', storageConfig.value)
      }
    } catch (_error) {
      // 静默处理错误
    }
  }

  /**
   * 从API加载商品配置（所有用户可访问）
   */
  const loadProductConfigFromAPI = async () => {
    try {
      // ✅ Admin下发配置优先: 如果Admin配置了该项，直接使用，锁定本地编辑
      if (adminDistributedConfig.value && adminDistributedConfig.value.product) {
        Object.assign(productConfig.value, adminDistributedConfig.value.product)
        configLocked.value.product = true
        saveConfigToStorage('product', productConfig.value)
        return
      }
      configLocked.value.product = false

      const { apiService } = await import('@/services/apiService')
      // 使用公开API，所有已登录用户都可以访问
      const apiData = await apiService.get('/system/product-settings/public')

      if (apiData && typeof apiData === 'object') {
        // 只更新优惠折扣相关的配置
        if (apiData.maxDiscountPercent !== undefined) {
          productConfig.value.maxDiscountPercent = apiData.maxDiscountPercent
        }
        if (apiData.adminMaxDiscount !== undefined) {
          productConfig.value.adminMaxDiscount = apiData.adminMaxDiscount
        }
        if (apiData.managerMaxDiscount !== undefined) {
          productConfig.value.managerMaxDiscount = apiData.managerMaxDiscount
        }
        if (apiData.salesMaxDiscount !== undefined) {
          productConfig.value.salesMaxDiscount = apiData.salesMaxDiscount
        }
        if (apiData.discountApprovalThreshold !== undefined) {
          productConfig.value.discountApprovalThreshold = apiData.discountApprovalThreshold
        }
        if (apiData.allowPriceModification !== undefined) {
          productConfig.value.allowPriceModification = apiData.allowPriceModification
        }
        // 同步保存到localStorage作为缓存
        localStorage.setItem('crm_config_product', JSON.stringify(productConfig.value))
      }
    } catch (_error: unknown) {
      // 静默处理错误
    }
  }

  /**
   * 从API加载邮件配置（仅管理员可访问）
   */
  const loadEmailConfigFromAPI = async () => {
    try {
      // ✅ Admin下发配置优先: 如果Admin配置了该项，直接使用，锁定本地编辑
      if (adminDistributedConfig.value && adminDistributedConfig.value.email) {
        Object.assign(emailConfig.value, adminDistributedConfig.value.email)
        configLocked.value.email = true
        saveConfigToStorage('email', emailConfig.value)
        return
      }
      configLocked.value.email = false

      // 检查是否是管理员，非管理员静默跳过
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.role !== 'super_admin' && user.role !== 'admin') {
          return
        }
      }

      const { apiService } = await import('@/services/apiService')
      const apiData = await apiService.get('/system/email-settings')

      if (apiData && typeof apiData === 'object') {
        Object.assign(emailConfig.value, apiData)
        saveConfigToStorage('email', emailConfig.value)
      }
    } catch (_error) {
      // 静默处理错误
    }
  }

  /**
   * 从API加载短信配置（仅管理员可访问）
   */
  const loadSmsConfigFromAPI = async () => {
    try {
      // ✅ Admin下发配置优先: 如果Admin配置了该项，直接使用，锁定本地编辑
      if (adminDistributedConfig.value && adminDistributedConfig.value.sms) {
        Object.assign(smsConfig.value, adminDistributedConfig.value.sms)
        configLocked.value.sms = true
        saveConfigToStorage('sms', smsConfig.value)
        return
      }
      configLocked.value.sms = false

      // 检查是否是管理员，非管理员静默跳过
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.role !== 'super_admin' && user.role !== 'admin') {
          return
        }
      }

      const { apiService } = await import('@/services/apiService')
      const apiData = await apiService.get('/system/sms-settings')

      if (apiData && typeof apiData === 'object') {
        Object.assign(smsConfig.value, apiData)
        saveConfigToStorage('sms', smsConfig.value)
      }
    } catch (_error) {
      // 静默处理错误
    }
  }

  /**
   * 从API加载通话配置（仅管理员可访问）
   */
  const loadCallConfigFromAPI = async () => {
    try {
      // ✅ Admin下发配置优先: 如果Admin配置了该项，直接使用，锁定本地编辑
      if (adminDistributedConfig.value && adminDistributedConfig.value.call) {
        Object.assign(callConfig.value, adminDistributedConfig.value.call)
        configLocked.value.call = true
        saveConfigToStorage('call', callConfig.value)
        return
      }
      configLocked.value.call = false

      // 检查是否是管理员，非管理员静默跳过
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.role !== 'super_admin' && user.role !== 'admin') {
          return
        }
      }

      const { apiService } = await import('@/services/apiService')
      const apiData = await apiService.get('/system/call-settings')

      if (apiData && typeof apiData === 'object') {
        Object.assign(callConfig.value, apiData)
        saveConfigToStorage('call', callConfig.value)
      }
    } catch (_error) {
      // 静默处理错误
    }
  }

  /**
   * 初始化配置
   */
  const initConfig = async () => {
    // 🔥 公开页面不需要从API加载配置
    const isPublicPage = window.location.pathname.startsWith('/public-help')
    if (isPublicPage) {
      console.log('[ConfigStore] 公开页面，跳过API配置加载')
      loadConfigFromStorage()
      return
    }

    // 先从localStorage加载（快速显示）
    loadConfigFromStorage()
    // 然后从API获取最新配置（确保同步）
    await Promise.all([
      loadSystemConfigFromAPI(),
      loadSecurityConfigFromAPI(),
      loadStorageConfigFromAPI(),
      loadProductConfigFromAPI(),
      loadEmailConfigFromAPI(),
      loadSmsConfigFromAPI(),
      loadCallConfigFromAPI()
    ])
  }

  return {
    // 状态
    systemConfig,
    platformOverride,
    adminConsoleEncryption,
    featureFlags,
    adminDistributedConfig,
    configLocked,
    securityConfig,
    productConfig,
    themeConfig,
    smsConfig,
    storageConfig,
    emailConfig,
    callConfig,
    performanceShareConfig,

    // 计算属性
    isPasswordComplexityEnabled,
    canUserModifyPrice,
    getMaxDiscountForRole,

    // 方法
    updateSystemConfig,
    updateSecurityConfig,
    updateProductConfig,
    updateThemeConfig,
    initTheme,
    updateSmsConfig,
    updateStorageConfig,
    updateEmailConfig,
    updateCallConfig,
    updatePerformanceShareConfig,
    resetConfig,
    resetSystemConfig,
    resetSecurityConfig,
    resetProductConfig,
    resetThemeConfig,
    resetSmsConfig,
    loadSystemConfigFromAPI,
    loadSecurityConfigFromAPI,
    loadStorageConfigFromAPI,
    loadProductConfigFromAPI,
    loadEmailConfigFromAPI,
    loadSmsConfigFromAPI,
    loadCallConfigFromAPI,
    initConfig
  }
})
