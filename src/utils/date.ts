/**
 * 日期时间格式化工具
 * 统一处理各种日期格式，转换为北京时间格式
 */

/**
 * 格式化时间为北京时间格式 (YYYY-MM-DD HH:mm:ss)
 * @param dateInput 日期输入（Date对象、ISO字符串、普通日期字符串等）
 * @returns 格式化后的日期字符串
 */
export const formatTime = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-'

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return dateInput?.toString() || '-'

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return dateInput?.toString() || '-'
  }
}

/**
 * 格式化日期为北京时间格式 (YYYY-MM-DD)
 * @param dateInput 日期输入
 * @returns 格式化后的日期字符串
 */
export const formatDate = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-'

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return dateInput?.toString() || '-'

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  } catch {
    return dateInput?.toString() || '-'
  }
}

/**
 * 格式化日期时间为友好格式
 * @param dateInput 日期输入
 * @param showSeconds 是否显示秒数
 * @returns 格式化后的日期字符串
 */
export const formatDateTime = (dateInput: Date | string | null | undefined, showSeconds: boolean = true): string => {
  return showSeconds ? formatTime(dateInput) : formatTime(dateInput).slice(0, 16)
}
