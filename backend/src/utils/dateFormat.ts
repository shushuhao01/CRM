/**
 * 日期时间格式化工具
 * 统一处理日期格式，返回北京时间格式
 */

/**
 * 格式化日期时间为本地时间格式 (YYYY-MM-DD HH:mm:ss)
 * @param date 日期对象或日期字符串
 * @param showSeconds 是否显示秒数，默认true
 * @returns 格式化后的日期字符串
 */
export const formatDateTime = (date: Date | string | null | undefined, showSeconds: boolean = true): string => {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    if (showSeconds) {
      const seconds = String(d.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return ''
  }
}

/**
 * 格式化日期为本地日期格式 (YYYY-MM-DD)
 * @param date 日期对象或日期字符串
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  } catch {
    return ''
  }
}
