/**
 * 企微管理模块 — 共享工具函数
 * 从 ChatArchive.vue 提取，供多个子组件复用
 */
import { formatDateTime } from '@/utils/date'

/** 格式化消息时间戳为完整时间字符串 */
export const formatMsgTime = (msgTime: number | string): string => {
  if (!msgTime) return '-'
  const ts = typeof msgTime === 'string' ? parseInt(msgTime) : msgTime
  return formatDateTime(new Date(ts).toISOString())
}

/** 格式化会话列表侧边栏中的相对时间（今天/昨天/日期） */
export const formatConvTime = (msgTime: number | string): string => {
  if (!msgTime) return ''
  const ts = typeof msgTime === 'string' ? parseInt(msgTime) : msgTime
  const date = new Date(ts)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

/** 短时间（仅时:分），用于气泡消息内联时间 */
export const formatMsgTimeShort = (msgTime: number | string): string => {
  if (!msgTime) return ''
  const ts = typeof msgTime === 'string' ? parseInt(msgTime) : msgTime
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/** 消息类型 → 中文文本 */
export const getMsgTypeText = (type: string): string => {
  const map: Record<string, string> = {
    text: '文本', image: '图片', voice: '语音', video: '视频', file: '文件',
    link: '链接', weapp: '小程序', chatrecord: '聊天记录', location: '位置',
    meta: '会话元数据'
  }
  return map[type] || type
}

/** 提取文本消息内容（兼容 JSON 字符串和对象，支持企微解密明文格式） */
export const getTextContent = (content: any): string => {
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      return extractText(parsed)
    } catch {
      return content
    }
  }
  return extractText(content)
}

/** 从解析后的对象中提取文本（支持企微格式 {text:{content:"..."}} 和简单格式） */
function extractText(obj: any): string {
  if (!obj) return ''
  // 企微解密格式: { text: { content: "hello" } }
  if (obj.text && typeof obj.text === 'object' && obj.text.content) return obj.text.content
  // 简单格式: { text: "hello" }
  if (typeof obj.text === 'string') return obj.text
  // 通用格式: { content: "hello" }
  if (typeof obj.content === 'string') return obj.content
  // 企微专区消息格式：存储了 secretKey + 消息类型描述
  // 根据企微安全机制，消息明文需通过企微客户端的「会话展示组件」查看
  if (obj.secretKey !== undefined) {
    return obj.msgTypeDesc ? `[${obj.msgTypeDesc}]` : `[${obj.msgtype || '消息'}]`
  }
  // 旧版加密占位格式（兼容）
  if (obj.type === 'encrypted') {
    return obj.msgtype ? `[${obj.msgtype}]` : '[需在企微客户端查看]'
  }
  return JSON.stringify(obj)
}

/** 获取 meta 类型消息的摘要文字 */
export const getMetaSummary = (content: any): string => {
  if (typeof content === 'object' && content?.summary) return content.summary
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      return parsed.summary || '会话元数据'
    } catch { return '会话元数据' }
  }
  return '会话元数据'
}

/** 获取 meta 类型消息的同意状态 */
export const getMetaAgreed = (content: any): boolean => {
  if (typeof content === 'object') return !!content?.agreed
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content)
      return !!parsed.agreed
    } catch { return false }
  }
  return false
}

/** 格式化 toUserIds 为逗号分隔字符串 */
export const formatToUsers = (toUserIds: any): string => {
  if (Array.isArray(toUserIds)) return toUserIds.join(', ')
  if (typeof toUserIds === 'string') {
    try {
      const parsed = JSON.parse(toUserIds)
      if (Array.isArray(parsed)) return parsed.join(', ')
    } catch {}
    return toUserIds
  }
  return '-'
}

/** 获取 toUserIds 的第一个用户 ID */
export const getFirstToUser = (toUserIds: any): string => {
  if (Array.isArray(toUserIds) && toUserIds.length > 0) return toUserIds[0]
  if (typeof toUserIds === 'string') {
    try {
      const parsed = JSON.parse(toUserIds)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]
    } catch {}
    return toUserIds
  }
  return ''
}

/** 高亮搜索关键词（XSS安全） */
export const highlightText = (text: string, keyword: string): string => {
  if (!text || !keyword) return text || ''
  // 先转义HTML实体防止XSS
  const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safeText.replace(new RegExp(escaped, 'gi'), `<mark style="background:#ffd54f;padding:0 2px">$&</mark>`)
}

/** 日期分割线文字（今天/昨天/x月x日/完整日期） */
export const getDateDividerText = (msgTime: number | string): string => {
  if (!msgTime) return ''
  const ts = typeof msgTime === 'string' ? parseInt(msgTime) : msgTime
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return '今天'
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return '昨天'
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  }
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

