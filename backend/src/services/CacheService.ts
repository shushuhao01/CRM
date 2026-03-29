/**
 * 缓存服务
 * 使用内存缓存，生产环境建议使用Redis
 * 🔥 优化：添加最大容量限制(LRU淘汰)，防止多租户大流量场景下内存泄漏
 */

interface CacheItem {
  data: any;
  expireAt: number;
}

class CacheService {
  private cache: Map<string, CacheItem> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    // 每5分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 过期时间（秒），默认5分钟
   */
  set(key: string, data: any, ttl: number = 300): void {
    // 🔥 LRU淘汰：超过最大容量时删除最早的条目
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    const expireAt = Date.now() + ttl * 1000;
    this.cache.set(key, { data, expireAt });
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期返回null
   */
  get(key: string): any | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now > item.expireAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[Cache] Cleaned up ${keysToDelete.length} expired items`);
    }
  }

  /**
   * 获取或设置缓存
   * @param key 缓存键
   * @param fetcher 数据获取函数
   * @param ttl 过期时间（秒）
   */
  async getOrSet(key: string, fetcher: () => Promise<any>, ttl: number = 300): Promise<any> {
    // 先尝试从缓存获取
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // 缓存不存在，执行fetcher获取数据
    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { total: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    this.cache.forEach(item => {
      if (now > item.expireAt) {
        expired++;
      }
    });

    return {
      total: this.cache.size,
      expired
    };
  }

  /**
   * 销毁缓存服务
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

export const cacheService = new CacheService();
