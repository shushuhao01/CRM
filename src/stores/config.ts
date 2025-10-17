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
    allowedTypes: 'jpg,png,gif,pdf,doc,docx,xls,xlsx'
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
    // 从本地存储加载主题配置
    const themeConfigStr = localStorage.getItem('crm_config_theme')
    if (themeConfigStr) {
      try {
        const savedTheme = JSON.parse(themeConfigStr)
        Object.assign(themeConfig.value, savedTheme)
      } catch (error) {
        console.error('加载主题配置失败:', error)
      }
    }
    
    // 应用当前主题配置
    updateThemeConfig({})
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
   * 保存配置到本地存储
   */
  const saveConfigToStorage = (type: string, config: unknown) => {
    try {
      localStorage.setItem(`crm_config_${type}`, JSON.stringify(config))
    } catch (error) {
      console.error('保存配置失败:', error)
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
      }

      // 加载安全配置
      const securityConfigStr = localStorage.getItem('crm_config_security')
      if (securityConfigStr) {
        Object.assign(securityConfig.value, JSON.parse(securityConfigStr))
      }

      // 加载商品配置
      const productConfigStr = localStorage.getItem('crm_config_product')
      if (productConfigStr) {
        Object.assign(productConfig.value, JSON.parse(productConfigStr))
      }

      // 加载主题配置
      const themeConfigStr = localStorage.getItem('crm_config_theme')
      if (themeConfigStr) {
        Object.assign(themeConfig.value, JSON.parse(themeConfigStr))
        // 应用主题
        updateThemeConfig({})
      }

      // 加载存储配置
      const storageConfigStr = localStorage.getItem('crm_config_storage')
      if (storageConfigStr) {
        Object.assign(storageConfig.value, JSON.parse(storageConfigStr))
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
        priceModificationRoles: ['admin', 'manager'],
        enablePriceHistory: true,
        pricePrecision: '2',
        enableInventory: true,
        lowStockThreshold: 10,
        allowNegativeStock: false,
        defaultCategory: '未分类',
        maxCategoryLevel: 3,
        enableCategoryCode: true
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
   * 初始化配置
   */
  const initConfig = () => {
    loadConfigFromStorage()
  }

  return {
    // 状态
    systemConfig,
    securityConfig,
    productConfig,
    themeConfig,
    smsConfig,
    storageConfig,
    
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
    resetConfig,
    resetSystemConfig,
    resetSecurityConfig,
    resetProductConfig,
    resetThemeConfig,
    resetSmsConfig,
    initConfig
  }
})