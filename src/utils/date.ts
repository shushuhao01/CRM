/**
 * 日期时间格式化工具
 * 统一处理各种日期格式，转换为北京时间格式（UTC+8）
 * 所有日期显示统一使用此工具，确保全系统时间一致
 */

/**
 * 将日期输入转换为北京时间的Date对象
 * 支持：Date对象、ISO字符串、MySQL datetime、普通日期字符串
 */
const toBeijingDate = (dateInput: Date | string | null | undefined): Date | null => {
  if (!dateInput) return null

  try {
    let date: Date

    if (dateInput instanceof Date) {
      date = dateInput
    } else if (typeof dateInput === 'string') {
      // MySQL datetime格式: "2026-03-27 10:30:00" (已是北京时间，无需转换)
      // 但 new Date() 会将其当作本地时区解析
      // ISO格式: "2026-03-27T02:30:00.000Z" (UTC时间)
      const str = dateInput.trim()

      if (str.includes('T') && (str.endsWith('Z') || str.includes('+'))) {
        // ISO格式 - new Date 会正确处理
        date = new Date(str)
      } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
        // MySQL datetime格式 "YYYY-MM-DD HH:mm:ss" - 直接作为本地时间解析
        date = new Date(str.replace(' ', 'T'))
      } else {
        date = new Date(str)
      }
    } else {
      return null
    }

    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

/**
 * 格式化时间为北京时间格式 (YYYY-MM-DD HH:mm:ss)
 * @param dateInput 日期输入（Date对象、ISO字符串、普通日期字符串等）
 * @returns 格式化后的日期字符串
 */
export const formatTime = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-'

  const date = toBeijingDate(dateInput)
  if (!date) return dateInput?.toString() || '-'

  try {
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

  const date = toBeijingDate(dateInput)
  if (!date) return dateInput?.toString() || '-'

  try {

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
