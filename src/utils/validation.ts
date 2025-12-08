/**
 * 数据验证工具
 * 提供各种数据验证和安全检查功能
 */

// 常用正则表达式
export const REGEX = {
  // 手机号（中国大陆）
  PHONE: /^1[3-9]\d{9}$/,
  // 邮箱
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  // 身份证号
  ID_CARD: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
  // 密码（8-20位，包含字母和数字）
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/,
  // 姓名（支持中文、英文、日文、韩文等多语言，2-50个字符）
  CHINESE_NAME: /^[\u4e00-\u9fa5a-zA-Z\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\s·.'-]{2,50}$/,
  // 数字
  NUMBER: /^\d+$/,
  // 小数
  DECIMAL: /^\d+(\.\d+)?$/,
  // URL
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  // IP地址
  IP: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
}

// 验证结果接口
export interface ValidationResult {
  valid: boolean
  message?: string
}

/**
 * 验证手机号
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) {
    return { valid: false, message: '手机号不能为空' }
  }
  if (!REGEX.PHONE.test(phone)) {
    return { valid: false, message: '请输入正确的手机号' }
  }
  return { valid: true }
}

/**
 * 验证邮箱
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { valid: false, message: '邮箱不能为空' }
  }
  if (!REGEX.EMAIL.test(email)) {
    return { valid: false, message: '请输入正确的邮箱地址' }
  }
  return { valid: true }
}

/**
 * 验证密码
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { valid: false, message: '密码不能为空' }
  }
  if (password.length < 8) {
    return { valid: false, message: '密码长度不能少于8位' }
  }
  if (password.length > 20) {
    return { valid: false, message: '密码长度不能超过20位' }
  }
  if (!REGEX.PASSWORD.test(password)) {
    return { valid: false, message: '密码必须包含字母和数字' }
  }
  return { valid: true }
}

/**
 * 验证中文姓名
 */
export const validateChineseName = (name: string): ValidationResult => {
  if (!name) {
    return { valid: false, message: '姓名不能为空' }
  }
  if (!REGEX.CHINESE_NAME.test(name)) {
    return { valid: false, message: '请输入正确的中文姓名（2-10个字符）' }
  }
  return { valid: true }
}

/**
 * 验证身份证号
 */
export const validateIdCard = (idCard: string): ValidationResult => {
  if (!idCard) {
    return { valid: false, message: '身份证号不能为空' }
  }
  if (!REGEX.ID_CARD.test(idCard)) {
    return { valid: false, message: '请输入正确的身份证号' }
  }

  // 验证校验位
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i]
  }

  const checkCode = checkCodes[sum % 11]
  if (checkCode !== idCard[17].toUpperCase()) {
    return { valid: false, message: '身份证号校验位错误' }
  }

  return { valid: true }
}

/**
 * 验证数字
 */
export const validateNumber = (value: string | number, min?: number, max?: number): ValidationResult => {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return { valid: false, message: '请输入有效的数字' }
  }

  if (min !== undefined && num < min) {
    return { valid: false, message: `数值不能小于${min}` }
  }

  if (max !== undefined && num > max) {
    return { valid: false, message: `数值不能大于${max}` }
  }

  return { valid: true }
}

/**
 * 验证字符串长度
 */
export const validateLength = (value: string, min?: number, max?: number): ValidationResult => {
  if (!value) {
    return { valid: false, message: '内容不能为空' }
  }

  if (min !== undefined && value.length < min) {
    return { valid: false, message: `长度不能少于${min}个字符` }
  }

  if (max !== undefined && value.length > max) {
    return { valid: false, message: `长度不能超过${max}个字符` }
  }

  return { valid: true }
}

/**
 * 验证URL
 */
export const validateUrl = (url: string): ValidationResult => {
  if (!url) {
    return { valid: false, message: 'URL不能为空' }
  }
  if (!REGEX.URL.test(url)) {
    return { valid: false, message: '请输入正确的URL地址' }
  }
  return { valid: true }
}

/**
 * XSS防护 - 清理HTML标签
 */
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div')
  div.textContent = html
  return div.innerHTML
}

/**
 * SQL注入防护 - 转义特殊字符
 */
export const escapeSql = (str: string): string => {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case '\0': return '\\0'
      case '\x08': return '\\b'
      case '\x09': return '\\t'
      case '\x1a': return '\\z'
      case '\n': return '\\n'
      case '\r': return '\\r'
      case '"':
      case "'":
      case '\\':
      case '%': return '\\' + char
      default: return char
    }
  })
}

/**
 * 验证文件类型
 */
export const validateFileType = (file: File, allowedTypes: string[]): ValidationResult => {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      message: `不支持的文件类型，仅支持：${allowedTypes.join(', ')}`
    }
  }
  return { valid: true }
}

/**
 * 验证文件大小
 */
export const validateFileSize = (file: File, maxSize: number): ValidationResult => {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1)
    return {
      valid: false,
      message: `文件大小不能超过${maxSizeMB}MB`
    }
  }
  return { valid: true }
}

/**
 * 批量验证
 */
export const validateBatch = (validations: (() => ValidationResult)[]): ValidationResult => {
  for (const validate of validations) {
    const result = validate()
    if (!result.valid) {
      return result
    }
  }
  return { valid: true }
}

/**
 * 表单验证规则生成器
 */
export const createFormRules = () => {
  return {
    required: (message = '此项为必填项') => ({
      required: true,
      message,
      trigger: 'blur'
    }),

    phone: (message = '请输入正确的手机号') => ({
      pattern: REGEX.PHONE,
      message,
      trigger: 'blur'
    }),

    email: (message = '请输入正确的邮箱地址') => ({
      pattern: REGEX.EMAIL,
      message,
      trigger: 'blur'
    }),

    password: (message = '密码必须包含字母和数字，长度8-20位') => ({
      pattern: REGEX.PASSWORD,
      message,
      trigger: 'blur'
    }),

    chineseName: (message = '请输入正确的姓名（2-50个字符）') => ({
      pattern: REGEX.CHINESE_NAME,
      message,
      trigger: 'blur'
    }),

    length: (min: number, max: number, message?: string) => ({
      min,
      max,
      message: message || `长度应在${min}-${max}个字符之间`,
      trigger: 'blur'
    }),

    number: (min?: number, max?: number) => ({
      type: 'number',
      min,
      max,
      message: `请输入${min !== undefined ? `${min}到` : ''}${max !== undefined ? max : ''}之间的数字`,
      trigger: 'blur'
    })
  }
}

// 导出表单规则生成器实例
export const formRules = createFormRules()
