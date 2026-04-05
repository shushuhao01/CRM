/**
 * TenantContextManager 单元测试
 * 测试 AsyncLocalStorage 租户上下文管理
 */
import { TenantContextManager } from '../utils/tenantContext';

describe('TenantContextManager', () => {
  describe('run() 上下文隔离', () => {
    test('在 run 内部能获取到租户ID', () => {
      TenantContextManager.run({ tenantId: 'tenant-abc' }, () => {
        expect(TenantContextManager.getTenantId()).toBe('tenant-abc');
      });
    });

    test('在 run 外部获取不到租户ID', () => {
      TenantContextManager.run({ tenantId: 'tenant-xyz' }, () => {
        // 内部可以获取
        expect(TenantContextManager.getTenantId()).toBe('tenant-xyz');
      });
      // 外部获取不到
      expect(TenantContextManager.getTenantId()).toBeUndefined();
    });

    test('嵌套 run 上下文隔离', () => {
      TenantContextManager.run({ tenantId: 'outer' }, () => {
        expect(TenantContextManager.getTenantId()).toBe('outer');

        TenantContextManager.run({ tenantId: 'inner' }, () => {
          expect(TenantContextManager.getTenantId()).toBe('inner');
        });

        // 回到外层上下文
        expect(TenantContextManager.getTenantId()).toBe('outer');
      });
    });
  });

  describe('setContext / getContext', () => {
    test('在 run 中设置和获取完整上下文', () => {
      TenantContextManager.run({ tenantId: 't1' }, () => {
        TenantContextManager.setContext({
          tenantId: 't1',
          userId: 'u1',
          userInfo: { name: 'Test User' }
        });

        const ctx = TenantContextManager.getContext();
        expect(ctx?.tenantId).toBe('t1');
        expect(ctx?.userId).toBe('u1');
        expect(ctx?.userInfo?.name).toBe('Test User');
      });
    });
  });

  describe('isTenantRequest', () => {
    test('有租户ID时返回 true', () => {
      TenantContextManager.run({ tenantId: 'some-tenant' }, () => {
        expect(TenantContextManager.isTenantRequest()).toBe(true);
      });
    });

    test('无租户ID时返回 false', () => {
      TenantContextManager.run({}, () => {
        expect(TenantContextManager.isTenantRequest()).toBe(false);
      });
    });
  });

  describe('clear', () => {
    test('清除后获取不到租户ID', () => {
      TenantContextManager.run({ tenantId: 'tenant-clear', userId: 'user-1' }, () => {
        expect(TenantContextManager.getTenantId()).toBe('tenant-clear');
        TenantContextManager.clear();
        expect(TenantContextManager.getTenantId()).toBeUndefined();
        expect(TenantContextManager.getUserId()).toBeUndefined();
      });
    });
  });

  describe('异步上下文传递', () => {
    test('在 async/await 中保持上下文', async () => {
      await TenantContextManager.run({ tenantId: 'async-tenant' }, async () => {
        // 模拟异步操作
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(TenantContextManager.getTenantId()).toBe('async-tenant');

        // 再次异步
        await Promise.resolve();
        expect(TenantContextManager.getTenantId()).toBe('async-tenant');
      });
    });
  });
});

