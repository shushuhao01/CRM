/**
 * 客户编码生成工具
 */

/**
 * 获取已存在的所有客户编码
 */
function getExistingCodes(): Set<string> {
  try {
    const customers = JSON.parse(localStorage.getItem('crm_store_customer') || '[]')
    return new Set(customers.map((c: { code?: string }) => c.code).filter(Boolean))
  } catch {
    return new Set()
  }
}

/**
 * 生成客户编码（保证唯一性）
 * 格式：2个随机字母 + 当天日期(YYYYMMDD) + 4位随机数字
 * 例如：XH202512064521
 */
export function generateCustomerCode(): string {
  const existingCodes = getExistingCodes()
  let code = ''
  let attempts = 0
  const maxAttempts = 100 // 防止无限循环

  do {
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')

    // 生成2个随机字母前缀
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let letterPrefix = ''
    for (let i = 0; i < 2; i++) {
      letterPrefix += letters.charAt(Math.floor(Math.random() * letters.length))
    }

    // 生成4位随机数字
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString()

    code = `${letterPrefix}${year}${month}${day}${randomDigits}`
    attempts++
  } while (existingCodes.has(code) && attempts < maxAttempts)

  // 如果尝试多次仍重复，添加时间戳毫秒确保唯一
  if (existingCodes.has(code)) {
    const ms = Date.now().toString().slice(-3)
    code = code.slice(0, -3) + ms
  }

  return code
}

/**
 * 验证客户编码格式
 * @param code 客户编码
 * @returns 是否为有效格式
 */
export function validateCustomerCode(code: string): boolean {
  // 格式：2个字母 + 日期(8位数字YYYYMMDD) + 4位随机数字 = 共14位
  const pattern = /^[A-Z]{2}\d{12}$/
  return pattern.test(code)
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // 使用现代 Clipboard API
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // 降级方案：使用 document.execCommand
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      return result
    }
  } catch (error) {
    console.error('复制到剪贴板失败:', error)
    return false
  }
}
