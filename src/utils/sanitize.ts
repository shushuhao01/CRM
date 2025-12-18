/**
 * HTML内容净化工具
 * 防止XSS（跨站脚本攻击）
 */

// 允许的HTML标签白名单
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'u', 's', 'strong', 'em', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'pre', 'code',
  'hr'
]

// 允许的属性白名单
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  span: ['class', 'style'],
  div: ['class', 'style'],
  p: ['class', 'style'],
  table: ['class', 'style', 'border'],
  td: ['class', 'style', 'colspan', 'rowspan'],
  th: ['class', 'style', 'colspan', 'rowspan']
}

// 危险的CSS属性
const DANGEROUS_CSS = [
  'expression',
  'javascript:',
  'vbscript:',
  'behavior',
  '-moz-binding'
]

// 危险的URL协议
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'data:text/html',
  'data:application'
]

/**
 * 转义HTML特殊字符（完全转义，不保留任何HTML）
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return ''

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }

  return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char)
}

/**
 * 检查URL是否安全
 */
function isSafeUrl(url: string): boolean {
  if (!url) return true
  const lowerUrl = url.toLowerCase().trim()
  return !DANGEROUS_PROTOCOLS.some(protocol => lowerUrl.startsWith(protocol))
}

/**
 * 检查CSS是否安全
 */
function isSafeCss(css: string): boolean {
  if (!css) return true
  const lowerCss = css.toLowerCase()
  return !DANGEROUS_CSS.some(dangerous => lowerCss.includes(dangerous))
}

/**
 * 净化HTML内容（保留安全的HTML标签）
 * 用于富文本内容展示
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''

  // 创建一个临时DOM元素来解析HTML
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // 递归净化节点
  function sanitizeNode(node: Node): Node | null {
    // 文本节点直接返回
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode()
    }

    // 注释节点移除
    if (node.nodeType === Node.COMMENT_NODE) {
      return null
    }

    // 元素节点
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()

      // 检查标签是否在白名单中
      if (!ALLOWED_TAGS.includes(tagName)) {
        // 不在白名单中，只保留文本内容
        const textContent = document.createTextNode(element.textContent || '')
        return textContent
      }

      // 创建新的安全元素
      const newElement = document.createElement(tagName)

      // 处理属性
      const allowedAttrs = ALLOWED_ATTRS[tagName] || []
      for (const attr of Array.from(element.attributes)) {
        const attrName = attr.name.toLowerCase()

        // 检查属性是否在白名单中
        if (!allowedAttrs.includes(attrName)) continue

        const attrValue = attr.value

        // 检查href和src属性的URL安全性
        if ((attrName === 'href' || attrName === 'src') && !isSafeUrl(attrValue)) {
          continue
        }

        // 检查style属性的CSS安全性
        if (attrName === 'style' && !isSafeCss(attrValue)) {
          continue
        }

        // 对于a标签，强制添加安全属性
        if (tagName === 'a' && attrName === 'href') {
          newElement.setAttribute('rel', 'noopener noreferrer')
          newElement.setAttribute('target', '_blank')
        }

        newElement.setAttribute(attrName, attrValue)
      }

      // 递归处理子节点
      for (const child of Array.from(element.childNodes)) {
        const sanitizedChild = sanitizeNode(child)
        if (sanitizedChild) {
          newElement.appendChild(sanitizedChild)
        }
      }

      return newElement
    }

    return null
  }

  // 净化body内容
  const fragment = document.createDocumentFragment()
  for (const child of Array.from(doc.body.childNodes)) {
    const sanitizedChild = sanitizeNode(child)
    if (sanitizedChild) {
      fragment.appendChild(sanitizedChild)
    }
  }

  // 创建临时容器获取HTML字符串
  const container = document.createElement('div')
  container.appendChild(fragment)

  return container.innerHTML
}

/**
 * 高亮文本中的关键词（安全版本）
 * 先转义HTML，再添加高亮标签
 */
export function highlightText(text: string, keyword: string): string {
  if (!text || typeof text !== 'string') return ''
  if (!keyword || typeof keyword !== 'string') return escapeHtml(text)

  // 先转义HTML
  const escapedText = escapeHtml(text)
  const escapedKeyword = escapeHtml(keyword)

  // 创建正则表达式（忽略大小写）
  const regex = new RegExp(`(${escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')

  // 添加高亮标签
  return escapedText.replace(regex, '<mark class="highlight">$1</mark>')
}

/**
 * 截断HTML内容并保持安全
 */
export function truncateHtml(html: string, maxLength: number): string {
  if (!html || typeof html !== 'string') return ''

  // 先净化HTML
  const sanitized = sanitizeHtml(html)

  // 提取纯文本
  const doc = new DOMParser().parseFromString(sanitized, 'text/html')
  const textContent = doc.body.textContent || ''

  if (textContent.length <= maxLength) {
    return sanitized
  }

  // 截断并添加省略号
  return escapeHtml(textContent.substring(0, maxLength)) + '...'
}

export default {
  escapeHtml,
  sanitizeHtml,
  highlightText,
  truncateHtml
}
