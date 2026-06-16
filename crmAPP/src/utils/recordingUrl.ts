import { getEncryptedStorage } from '@/utils/crypto'
import { useServerStore } from '@/stores/server'

/**
 * 将数据库中的录音 URL 转为 APP 可播放的完整地址
 * - 相对路径拼接服务器 origin
 * - localhost 替换为 APP 配置的服务器地址
 * - stream 路径附加 JWT token（audio 无法带 header）
 */
export function buildPlayableRecordingUrl(rawUrl?: string | null): string {
  if (!rawUrl) return ''

  const serverStore = useServerStore()
  const serverOrigin = serverStore.serverOrigin
  let url = rawUrl.trim()

  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (serverOrigin && /localhost|127\.0\.0\.1/i.test(url)) {
      try {
        const parsed = new URL(url)
        const origin = new URL(serverOrigin)
        url = `${origin.protocol}//${origin.host}${parsed.pathname}${parsed.search}`
      } catch {
        url = url.replace(/https?:\/\/[^/]+/i, serverOrigin)
      }
    }
  } else if (serverOrigin) {
    url = `${serverOrigin}${url.startsWith('/') ? '' : '/'}${url}`
  }

  if (url.includes('/recordings/stream/')) {
    const token = getEncryptedStorage('token')
    if (token) {
      const sep = url.includes('?') ? '&' : '?'
      url = `${url}${sep}token=${encodeURIComponent(token)}`
    }
  }

  return url
}
