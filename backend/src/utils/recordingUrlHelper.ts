import { Request } from 'express';

/**
 * 将数据库中的录音相对路径补全为客户端可访问的完整 URL
 */
export function resolvePublicRecordingUrl(
  req: Request,
  recordingUrl?: string | null
): string | null {
  if (!recordingUrl) return null;

  const url = String(recordingUrl).trim();
  if (!url) return null;

  const origin = `${req.protocol}://${req.get('host')}`;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (/localhost|127\.0\.0\.1/i.test(url)) {
      try {
        const parsed = new URL(url);
        return `${origin}${parsed.pathname}${parsed.search}`;
      } catch {
        return url.replace(/https?:\/\/[^/]+/i, origin);
      }
    }
    return url;
  }

  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}
