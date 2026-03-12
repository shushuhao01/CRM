/**
 * 租户上下文管理
 * 使用 AsyncLocalStorage 存储当前请求的租户信息
 * 让 BaseRepository 能够获取当前请求的 tenant_id
 */

import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import { deployConfig } from '../config/deploy';

/**
 * 租户上下文接口
 */
export interface TenantContext {
  tenantId?: string;
  userId?: string;
  userInfo?: any;
  tenantInfo?: any;
}

/**
 * AsyncLocalStorage 实例
 * 用于在异步调用链中传递租户上下文
 */
const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

/**
 * 租户上下文管理类
 */
export class TenantContextManager {
  /**
   * 设置租户上下文
   */
  static setContext(context: TenantContext): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, context);
    }
  }

  /**
   * 获取租户上下文
   */
  static getContext(): TenantContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * 获取当前租户ID
   */
  static getTenantId(): string | undefined {
    const context = asyncLocalStorage.getStore();
    return context?.tenantId;
  }

  /**
   * 获取当前用户ID
   */
  static getUserId(): string | undefined {
    const context = asyncLocalStorage.getStore();
    return context?.userId;
  }

  /**
   * 获取租户信息
   */
  static getTenantInfo(): any {
    const context = asyncLocalStorage.getStore();
    return context?.tenantInfo;
  }

  /**
   * 获取用户信息
   */
  static getUserInfo(): any {
    const context = asyncLocalStorage.getStore();
    return context?.userInfo;
  }

  /**
   * 清除租户上下文
   */
  static clear(): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.tenantId = undefined;
      store.userId = undefined;
      store.userInfo = undefined;
      store.tenantInfo = undefined;
    }
  }

  /**
   * 判断是否为租户请求
   */
  static isTenantRequest(): boolean {
    return !!this.getTenantId();
  }

  /**
   * 运行带上下文的函数
   */
  static run<T>(context: TenantContext, callback: () => T): T {
    return asyncLocalStorage.run(context, callback);
  }
}

/**
 * 租户上下文中间件
 * 在每个请求开始时设置租户上下文
 *
 * 使用方式：
 * app.use(tenantContextMiddleware);
 */
export const tenantContextMiddleware = (
  req: Request & { tenantId?: string; userId?: string; tenantInfo?: any; userInfo?: any },
  res: Response,
  next: NextFunction
) => {
  // 创建租户上下文
  const context: TenantContext = {
    tenantId: req.tenantId,
    userId: req.userId,
    tenantInfo: req.tenantInfo,
    userInfo: req.userInfo
  };

  // 在 AsyncLocalStorage 中运行后续中间件
  asyncLocalStorage.run(context, () => {
    next();
  });
};

/**
 * 获取当前租户ID（便捷函数）
 */
export const getCurrentTenantId = (): string | undefined => {
  return TenantContextManager.getTenantId();
};

/**
 * 获取当前用户ID（便捷函数）
 */
export const getCurrentUserId = (): string | undefined => {
  return TenantContextManager.getUserId();
};

/**
 * 判断是否为SaaS模式且有租户ID
 */
export const shouldFilterByTenant = (): boolean => {
  if (deployConfig.isSaaS()) {
    return !!TenantContextManager.getTenantId();
  }
  return false;
};

/**
 * 获取租户过滤条件
 * SaaS模式：返回 { tenant_id: tenantId } 或 { tenantId: tenantId }
 * 私有模式：返回 { tenant_id: null } 或 { tenantId: null }
 */
export const getTenantFilter = (): Record<string, string | null> | {} => {
  if (deployConfig.isSaaS()) {
    const tenantId = TenantContextManager.getTenantId();
    if (tenantId) {
      // 返回两种命名方式，让TypeORM自动匹配
      return { tenant_id: tenantId, tenantId: tenantId };
    }
    // SaaS模式但没有租户ID，返回空对象（不过滤）
    return {};
  } else {
    // 私有部署模式：只查询 tenant_id = NULL 的数据
    return { tenant_id: null, tenantId: null };
  }
};
