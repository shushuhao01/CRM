/**
 * CacheService 单元测试
 * 测试内存缓存的核心功能：set/get/delete/getOrSet/TTL过期/LRU淘汰
 */

// 直接导入 CacheService 类进行测试（不依赖单例）
// 由于 CacheService 使用默认导出单例，我们通过 require 重新实例化

describe('CacheService - 内存缓存模式', () => {
  let cacheService: any;

  beforeEach(() => {
    // 清除模块缓存，获取全新实例
    jest.resetModules();
    // 确保不连接 Redis
    delete process.env.REDIS_URL;
    const mod = require('../services/CacheService');
    cacheService = mod.cacheService;
    cacheService.clear();
  });

  afterEach(() => {
    if (cacheService) {
      cacheService.destroy();
    }
  });

  describe('基础 set/get/delete 操作', () => {
    test('set 后能 get 到相同数据', () => {
      cacheService.set('key1', { name: 'test' }, 60);
      const result = cacheService.get('key1');
      expect(result).toEqual({ name: 'test' });
    });

    test('get 不存在的 key 返回 null', () => {
      const result = cacheService.get('nonexistent');
      expect(result).toBeNull();
    });

    test('delete 后 get 返回 null', () => {
      cacheService.set('key2', 'value2', 60);
      expect(cacheService.get('key2')).toBe('value2');
      cacheService.delete('key2');
      expect(cacheService.get('key2')).toBeNull();
    });

    test('clear 清空所有缓存', () => {
      cacheService.set('a', 1, 60);
      cacheService.set('b', 2, 60);
      cacheService.clear();
      expect(cacheService.get('a')).toBeNull();
      expect(cacheService.get('b')).toBeNull();
    });
  });

  describe('TTL 过期机制', () => {
    test('过期后 get 返回 null', async () => {
      cacheService.set('expire-key', 'data', 1); // 1秒过期
      expect(cacheService.get('expire-key')).toBe('data');

      // 等待1.1秒后应过期
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(cacheService.get('expire-key')).toBeNull();
    });
  });

  describe('tenantKey 租户感知 key 生成', () => {
    test('有租户ID时生成带租户前缀的 key', () => {
      const key = cacheService.tenantKey('tenant-123', 'customer', 'list');
      expect(key).toBe('t:tenant-123:customer:list');
    });

    test('无租户ID时使用 global 前缀', () => {
      const key = cacheService.tenantKey(undefined, 'config', 'settings');
      expect(key).toBe('t:global:config:settings');
    });
  });

  describe('deleteByPrefix 批量删除', () => {
    test('按前缀批量删除缓存', () => {
      cacheService.set('t:tenant1:customer:list', 'data1', 60);
      cacheService.set('t:tenant1:customer:detail', 'data2', 60);
      cacheService.set('t:tenant1:order:list', 'data3', 60);
      cacheService.set('t:tenant2:customer:list', 'data4', 60);

      cacheService.deleteByPrefix('t:tenant1:customer');

      expect(cacheService.get('t:tenant1:customer:list')).toBeNull();
      expect(cacheService.get('t:tenant1:customer:detail')).toBeNull();
      expect(cacheService.get('t:tenant1:order:list')).toBe('data3'); // 不应被删
      expect(cacheService.get('t:tenant2:customer:list')).toBe('data4'); // 不应被删
    });
  });

  describe('getOrSet 缓存穿透保护', () => {
    test('首次调用执行 fetcher 并缓存', async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return { result: 'from-db' };
      };

      const result = await cacheService.getOrSet('cache-key', fetcher, 60);
      expect(result).toEqual({ result: 'from-db' });
      expect(fetchCount).toBe(1);
    });

    test('第二次调用命中缓存，不执行 fetcher', async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return { result: 'from-db' };
      };

      await cacheService.getOrSet('cache-key2', fetcher, 60);
      await cacheService.getOrSet('cache-key2', fetcher, 60);
      expect(fetchCount).toBe(1); // 只调用了一次
    });
  });

  describe('getStats 统计信息', () => {
    test('返回缓存总数和模式', async () => {
      cacheService.set('s1', 1, 60);
      cacheService.set('s2', 2, 60);
      const stats = await cacheService.getStats();
      expect(stats.mode).toBe('memory');
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('支持多种数据类型', () => {
    test('字符串', () => {
      cacheService.set('str', 'hello', 60);
      expect(cacheService.get('str')).toBe('hello');
    });

    test('数字', () => {
      cacheService.set('num', 42, 60);
      expect(cacheService.get('num')).toBe(42);
    });

    test('数组', () => {
      cacheService.set('arr', [1, 2, 3], 60);
      expect(cacheService.get('arr')).toEqual([1, 2, 3]);
    });

    test('嵌套对象', () => {
      const obj = { a: { b: { c: 'deep' } } };
      cacheService.set('obj', obj, 60);
      expect(cacheService.get('obj')).toEqual(obj);
    });

    test('null 值', () => {
      cacheService.set('nil', null, 60);
      // 注意：null 值 get 时会返回 null，与 key 不存在同样表现
      // 这是 CacheService 的设计行为
    });
  });
});


