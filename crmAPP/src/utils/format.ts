/**
 * 格式化工具函数
 */

// 格式化电话号码（隐藏中间4位）
export const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 7) return phone
  return phone.replace(/(\d{3})\d{4}(\d+)/, '$1****$2')
}

// 格式化电话号码（添加空格）
export const formatPhone = (phone: string): string => {
  if (!phone) return ''
  // 11位手机号格式化为 xxx xxxx xxxx
  if (phone.length === 11) {
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')
  }
  return phone
}

// 格式化通话时长（秒 -> 分秒）
export const formatDuration = (seconds: number): string => {
  if (seconds < 0) seconds = 0

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`
  }
  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

// 格式化通话时长（秒 -> MM:SS）
export const formatDurationTimer = (seconds: number): string => {
  if (seconds < 0) seconds = 0

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 格式化日期时间
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-'

  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 格式化日期
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'

  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return '今天'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }

  const month = date.getMonth() + 1
  const day = date.getDate()

  // 如果是今年，不显示年份
  if (date.getFullYear() === today.getFullYear()) {
    return `${month}月${day}日`
  }

  return `${date.getFullYear()}年${month}月${day}日`
}

// 格式化时间
export const formatTime = (dateStr: string): string => {
  if (!dateStr) return '-'

  const date = new Date(dateStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${hours}:${minutes}`
}

// 格式化相对时间
export const formatRelativeTime = (dateStr: string): string => {
  if (!dateStr) return '-'

  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return '刚刚'
  }
  if (minutes < 60) {
    return `${minutes}分钟前`
  }
  if (hours < 24) {
    return `${hours}小时前`
  }
  if (days < 7) {
    return `${days}天前`
  }

  return formatDate(dateStr)
}

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
