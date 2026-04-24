/**
 * 企微路由共享工具函数
 */

/**
 * 安全解析JSON
 */
export function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; }
  catch { return fallback; }
}

