/**
 * 日期时间格式化工具
 * 统一处理各种日期格式，转换为友好的本地时间格式
 */

/**
 * 格式化日期时间为友好格式
 * 支持ISO格式、普通格式等多种输入
 * @param dateInput 日期输入（Date对象、ISO字符串、普通日期字符串等）
 * @param showSeconds 是否显示秒数，默认false
 * @returns 格式化后的日期字符串
 */
export const formatDateTime = (dateInput: Date | string | null | undefined, showSeconds: boolean = false): string => {
  if (!dateInput) return '-'

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return dateInput?.toString() || '-'

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' })
    }

    return date.toLocaleString('zh-CN', options)
  } catch {
    return dateInput?.toString() || '-'
  }
}

/**
 * 格式化日期为友好格式 (YYYY/MM/DD)
 * @param dateInput 日期输入
 * @returns 格式化后的日期字符串
 */
export const formatDate = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-'

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return dateInput?.toString() || '-'

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return dateInput?.toString() || '-'
  }
}

/**
 * 格式化日期为 YYYY-MM-DD 格式（本地时区，不进行UTC转换）
 * 用于日期筛选等场景，避免时区转换导致的日期偏移问题
 * @param date 日期对象
 * @returns YYYY-MM-DD 格式的日期字符串
 */
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
