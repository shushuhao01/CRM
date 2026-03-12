import { Request, Response, NextFunction } from 'express';
import { ApiConfig } from '../entities/ApiConfig';

// 存储API调用计数的内存缓存
// 格式: { apiKey: { count: number, resetTime: number } }
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

/**
 * API速率限制中间件
 */
export const apiRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiConfig = (req as any).apiConfig as ApiConfig;

    if (!apiConfig) {
      res.status(401).json({
        code: 401,
        message: '未认证的API请求'
      });
      return;
    }

    const apiKey = apiConfig.apiKey;
    const rateLimit = apiConfig.rateLimit;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1小时的毫秒数

    // 获取或初始化速率限制记录
    let record = rateLimitCache.get(apiKey);

    if (!record || now > record.resetTime) {
      // 创建新的记录或重置过期的记录
      record = {
        count: 0,
        resetTime: now + oneHour
      };
      rateLimitCache.set(apiKey, record);
    }

    // 检查是否超过速率限制
    if (record.count >= rateLimit) {
      const resetIn = Math.ceil((record.resetTime - now) / 1000 / 60); // 剩余分钟数
      res.status(429).json({
        code: 429,
        message: `API调用次数已达上限（${rateLimit}次/小时）`,
        resetIn: `${resetIn}分钟后重置`
      });
      return;
    }

    // 增加调用计数
    record.count++;

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', rateLimit.toString());
    res.setHeader('X-RateLimit-Remaining', (rateLimit - record.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    next();
  } catch (error: any) {
    console.error('API速率限制检查失败:', error);
    res.status(500).json({
      code: 500,
      message: 'API速率限制检查失败',
      error: error.message
    });
  }
};

/**
 * 清理过期的速率限制记录（定期调用）
 */
export const cleanupRateLimitCache = (): void => {
  const now = Date.now();
  for (const [apiKey, record] of rateLimitCache.entries()) {
    if (now > record.resetTime) {
      rateLimitCache.delete(apiKey);
    }
  }
};

// 每小时清理一次过期记录
setInterval(cleanupRateLimitCache, 60 * 60 * 1000);
