/**
 * 客户编码生成工具
 */

/**
 * 生成客户编码
 * 格式：2个随机字母 + 年月日时分 + 4位随机字符
 * 例如：XH202509281102
 */
export function generateCustomerCode(): string {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = now.getMinutes().toString().padStart(2, '0')
  
  // 生成2个随机字母前缀
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let letterPrefix = ''
  for (let i = 0; i < 2; i++) {
    letterPrefix += letters.charAt(Math.floor(Math.random() * letters.length))
  }
  
  // 生成4位随机字符（字母+数字）
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomSuffix = ''
  for (let i = 0; i < 4; i++) {
    randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return `${letterPrefix}${year}${month}${day}${hour}${minute}`
}

/**
 * 验证客户编码格式
 * @param code 客户编码
 * @returns 是否为有效格式
 */
export function validateCustomerCode(code: string): boolean {
  // 格式：2个字母 + 年月日时分（12位数字）
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