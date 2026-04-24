import { Request } from 'express';

/**
 * 🔥 获取客户端真实IP地址
 * 优先级：X-Real-IP > X-Forwarded-For（第一个） > req.ip > req.socket.remoteAddress
 * 自动处理IPv6映射地址（::ffff:127.0.0.1 → 127.0.0.1）
 * 自动处理本地回环地址（::1 → 127.0.0.1）
 */
export function getClientIp(req: Request): string {
  let ip: string | undefined;

  // 1. X-Real-IP (nginx等反向代理设置)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    ip = xRealIp.trim();
  }

  // 2. X-Forwarded-For (取第一个IP，即客户端真实IP)
  if (!ip) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
      const forwarded = typeof xff === 'string' ? xff : xff[0];
      if (forwarded) {
        ip = forwarded.split(',')[0].trim();
      }
    }
  }

  // 3. req.ip (Express trust proxy 处理后的)
  if (!ip) {
    ip = req.ip;
  }

  // 4. socket.remoteAddress
  if (!ip) {
    ip = req.socket?.remoteAddress;
  }

  if (!ip) return '0.0.0.0';

  // 处理 IPv6 映射地址: ::ffff:192.168.1.1 → 192.168.1.1
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // 处理 IPv6 本地回环: ::1 → 127.0.0.1
  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  return ip;
}
