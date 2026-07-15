/**
 * 日期时间格式化工具
 * 统一处理各种日期格式，转换为北京时间格式（Asia/Shanghai, UTC+8）
 * 所有日期显示与导出统一使用此工具，确保全系统时间一致
 */

const BEIJING_TZ = 'Asia/Shanghai'

/**
 * 将日期输入解析为 Date 对象
 * 支持：Date对象、ISO字符串、MySQL datetime、普通日期字符串
 */
const parseDate = (dateInput: Date | string | null | undefined): Date | null => {
  if (!dateInput) return null

  try {
    let date: Date

    if (dateInput instanceof Date) {
      date = dateInput
    } else if (typeof dateInput === 'string') {
      const str = dateInput.trim()
      if (!str) return null

      if (str.includes('T') && (str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str))) {
        // ISO 带时区：按 UTC/偏移正确解析
        date = new Date(str)
      } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
        // MySQL datetime "YYYY-MM-DD HH:mm:ss"：按北京时间理解（后端存的是东八区本地时间）
        date = new Date(str.replace(' ', 'T') + '+08:00')
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        // 纯日期：按北京时间当天 00:00
        date = new Date(str + 'T00:00:00+08:00')
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
 * 用 Intl 按北京时区格式化（不依赖浏览器本地时区）
 */
const formatParts = (date: Date, withTime: boolean, withSeconds: boolean): string => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: BEIJING_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          ...(withSeconds ? { second: '2-digit' } : {}),
          hour12: false
        }
      : {})
  }

  // 使用 en-CA 得到 YYYY-MM-DD，再拼时间；避免 zh-CN 的斜杠分隔
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''

  const ymd = `${get('year')}-${get('month')}-${get('day')}`
  if (!withTime) return ymd

  const h = get('hour')
  const m = get('minute')
  const s = get('second')
  return withSeconds ? `${ymd} ${h}:${m}:${s}` : `${ymd} ${h}:${m}`
}

/**
 * 格式化时间为北京时间格式 (YYYY-MM-DD HH:mm:ss)
 */
export const formatTime = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-'
  const date = parseDate(dateInput)
  if (!date) return dateInput?.toString() || '-'
  try {
    return formatParts(date, true, true)
  } catch {
    return dateInput?.toString() || '-'
  }
}

/**
 * 格式化日期为北京时间格式 (YYYY-MM-DD)
 */
export const formatDate = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-'
  const date = parseDate(dateInput)
  if (!date) return dateInput?.toString() || '-'
  try {
    return formatParts(date, false, false)
  } catch {
    return dateInput?.toString() || '-'
  }
}

/**
 * 格式化日期时间为北京时间
 * @param showSeconds 是否显示秒数，默认 true → YYYY-MM-DD HH:mm:ss；false → YYYY-MM-DD HH:mm
 */
export const formatDateTime = (dateInput: Date | string | null | undefined, showSeconds: boolean = true): string => {
  if (!dateInput) return '-'
  const date = parseDate(dateInput)
  if (!date) return dateInput?.toString() || '-'
  try {
    return formatParts(date, true, showSeconds)
  } catch {
    return dateInput?.toString() || '-'
  }
}
