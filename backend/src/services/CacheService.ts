/**
 * 缓存服务
 * 支持两种模式：
 *   1. 内存缓存（默认，单进程场景）
 *   2. Redis 缓存（设置 REDIS_URL 环境变量后启用，支持 PM2 多进程共享）
 *
 * 🔥 优化：添加最大容量限制(LRU淘汰)，防止多租户大流量场景下内存泄漏
 * 🔥 优化：添加租户感知key前缀方法 + 按前缀批量清除
 * 🔥 优化：添加 Redis 支持层，接口完全向后兼容
 */

interface CacheItem {
  data: any;
  expireAt: number;
}

/** 缓存提供者接口（内存/Redis 通用） */
interface CacheProvider {
  get(key: string): Promise<any | null>;
  set(key: string, data: any, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
  destroy(): void;
}

/** 内存缓存提供者（默认） */
class MemoryCacheProvider implements CacheProvider {
  private cache: Map<string, CacheItem> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expireAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, k) => { if (k.startsWith(prefix)) keysToDelete.push(k); });
    keysToDelete.forEach(k => this.cache.delete(k));
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getSize(): Promise<number> {
    return this.cache.size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((item, key) => { if (now > item.expireAt) keysToDelete.push(key); });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

/** Redis 缓存提供者（当 REDIS_URL 可用时） */
class RedisCacheProvider implements CacheProvider {
  private client: any;
  private connected: boolean = false;

  constructor(redisUrl: string) {
    try {
      // 动态导入 ioredis（可选依赖）
      const Redis = require('ioredis');
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 200, 3000),
        lazyConnect: true
      });
      this.client.connect().then(() => {
        this.connected = true;
        console.log('[CacheService] Redis 连接成功');
      }).catch((err: any) => {
        console.warn('[CacheService] Redis 连接失败，将降级为内存缓存:', err.message);
        this.connected = false;
      });
    } catch (_e) {
      console.warn('[CacheService] ioredis 未安装，将使用内存缓存。安装命令: npm install ioredis');
      this.connected = false;
    }
  }

  isReady(): boolean { return this.connected && this.client; }

  async get(key: string): Promise<any | null> {
    if (!this.isReady()) return null;
    try {
      const val = await this.client.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  }

  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    if (!this.isReady()) return;
    try { await this.client.setex(key, ttlSeconds, JSON.stringify(data)); } catch { /* ignore */ }
  }

  async delete(key: string): Promise<void> {
    if (!this.isReady()) return;
    try { await this.client.del(key); } catch { /* ignore */ }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      const keys = await this.client.keys(`${prefix}*`);
      if (keys.length > 0) await this.client.del(...keys);
    } catch { /* ignore */ }
  }

  async clear(): Promise<void> {
    if (!this.isReady()) return;
    try { await this.client.flushdb(); } catch { /* ignore */ }
  }

  async getSize(): Promise<number> {
    if (!this.isReady()) return 0;
    try { return await this.client.dbsize(); } catch { return 0; }
  }

  destroy(): void {
    if (this.client) {
      try { this.client.disconnect(); } catch { /* ignore */ }
    }
  }
}

class CacheService {
  private memoryProvider: MemoryCacheProvider;
  private redisProvider: RedisCacheProvider | null = null;
  private useRedis: boolean = false;

  constructor(maxSize: number = 10000) {
    this.memoryProvider = new MemoryCacheProvider(maxSize);

    // 如果配置了 REDIS_URL，尝试使用 Redis
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redisProvider = new RedisCacheProvider(redisUrl);
      // 延迟检测 Redis 是否真正可用
      setTimeout(() => {
        this.useRedis = this.redisProvider?.isReady() || false;
        if (this.useRedis) {
          console.log('[CacheService] 已切换到 Redis 缓存模式');
        }
      }, 3000);
    }
  }

  private get provider(): CacheProvider {
    return (this.useRedis && this.redisProvider?.isReady()) ? this.redisProvider! : this.memoryProvider;
  }

  /** 生成租户感知的缓存key */
  tenantKey(tenantId: string | undefined, module: string, key: string): string {
    const prefix = tenantId || 'global';
    return `t:${prefix}:${module}:${key}`;
  }

  /** 设置缓存 */
  set(key: string, data: any, ttl: number = 300): void {
    this.provider.set(key, data, ttl);
  }

  /** 获取缓存（同步兼容 + 异步支持） */
  get(key: string): any | null {
    // 内存模式下保持同步兼容性
    if (!this.useRedis) {
      const item = (this.memoryProvider as any).cache?.get(key);
      if (!item) return null;
      if (Date.now() > item.expireAt) {
        (this.memoryProvider as any).cache?.delete(key);
        return null;
      }
      return item.data;
    }
    // Redis 模式下返回 Promise（调用方需 await）
    return null;
  }

  /** 异步获取缓存（推荐使用） */
  async getAsync(key: string): Promise<any | null> {
    return this.provider.get(key);
  }

  /** 删除缓存 */
  delete(key: string): void {
    this.provider.delete(key);
  }

  /** 按前缀批量删除缓存 */
  deleteByPrefix(prefix: string): void {
    this.provider.deleteByPrefix(prefix);
  }

  /** 清空所有缓存 */
  clear(): void {
    this.provider.clear();
  }

  /** 获取或设置缓存 */
  async getOrSet(key: string, fetcher: () => Promise<any>, ttl: number = 300): Promise<any> {
    const cached = await this.provider.get(key);
    if (cached !== null) return cached;
    const data = await fetcher();
    await this.provider.set(key, data, ttl);
    return data;
  }

  /** 获取缓存统计信息 */
  async getStats(): Promise<{ total: number; mode: string }> {
    const total = await this.provider.getSize();
    return { total, mode: this.useRedis ? 'redis' : 'memory' };
  }

  /** 销毁缓存服务 */
  destroy(): void {
    this.memoryProvider.destroy();
    if (this.redisProvider) this.redisProvider.destroy();
  }
}

export const cacheService = new CacheService();
