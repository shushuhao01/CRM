/**
 * 编码与 JSON 安全处理工具（前端）
 *
 * @description 提供 JSON 安全解析、文件下载、URL 编码等工具函数
 * @see .coding-standards.md 第八章
 */

/**
 * 安全 JSON 解析 —— 失败时返回默认值，不会抛异常
 *
 * @example
 * const config = safeJsonParse<AppConfig>(localStorage.getItem('config'), { theme: 'light' });
 */
export function safeJsonParse<T = unknown>(
  str: string | null | undefined,
  defaultValue: T
): T {
  if (!str || str === 'undefined' || str === 'null') {
    return defaultValue
  }
  try {
    return JSON.parse(str)
  } catch {
    console.warn(`[safeJsonParse] 解析失败: ${str.substring(0, 200)}`)
    return defaultValue
  }
}

/**
 * 安全 JSON 序列化 —— 处理循环引用等异常情况
 */
export function safeJsonStringify(
  obj: unknown,
  fallback: string = '{}'
): string {
  try {
    return JSON.stringify(obj)
  } catch {
    console.warn('[safeJsonStringify] 序列化失败')
    return fallback
  }
}

/**
 * URL 安全编码（中文及特殊字符）
 *
 * @example
 * const url = `/api/search?keyword=${safeEncodeURIComponent('中文关键词')}`;
 */
export function safeEncodeURIComponent(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  )
}

/**
 * 下载 Blob 文件并指定文件名
 *
 * @example
 * const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 * downloadBlob(blob, '客户报表.xlsx');
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * 从 axios 响应头中提取文件名（处理中文编码）
 *
 * @example
 * const fileName = extractFileName(response.headers['content-disposition'], '默认文件名.xlsx');
 */
export function extractFileName(
  contentDisposition: string | undefined,
  fallback: string = 'download'
): string {
  if (!contentDisposition) return fallback

  // 优先匹配 filename*=UTF-8''xxx 格式
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/i)
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      // 解码失败则继续尝试其他格式
    }
  }

  // 匹配 filename="xxx" 格式
  const quotedMatch = contentDisposition.match(/filename="(.+?)"/)
  if (quotedMatch) {
    try {
      return decodeURIComponent(quotedMatch[1])
    } catch {
      return quotedMatch[1]
    }
  }

  // 匹配 filename=xxx 格式（无引号）
  const plainMatch = contentDisposition.match(/filename=([^\s;]+)/)
  if (plainMatch) {
    try {
      return decodeURIComponent(plainMatch[1])
    } catch {
      return plainMatch[1]
    }
  }

  return fallback
}

