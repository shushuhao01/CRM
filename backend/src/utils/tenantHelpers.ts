/**
 * 租户数据隔离辅助函数
 *
 * 提供三种 drop-in 方式为现有查询添加 tenant_id 过滤：
 * 1. withTenant(where)           - 用于 find/findOne/count 的 where 条件
 * 2. addTenantFilter(qb, alias)  - 用于 createQueryBuilder
 * 3. tenantRawSQL(prefix?)       - 用于 AppDataSource.query 原始SQL
 * 4. setTenantOnEntity(entity)   - 用于 save/create 前自动设置 tenant_id
 */

import { TenantContextManager } from './tenantContext';
import { deployConfig } from '../config/deploy';

/**
 * 获取当前租户ID
 * SaaS模式返回 tenantId，私有模式返回 undefined
 */
export function getCurrentTenantIdSafe(): string | undefined {
  if (deployConfig.isSaaS()) {
    return TenantContextManager.getTenantId();
  }
  return undefined;
}

/**
 * 为 TypeORM find/findOne/count 的 where 条件添加 tenant_id 过滤
 *
 * 用法：
 *   repo.find({ where: withTenant({ status: 'active' }) })
 *   repo.findOne({ where: withTenant({ id: someId }) })
 *   repo.count({ where: withTenant() })
 */
export function withTenant<T extends Record<string, any>>(where?: T): T {
  const tenantId = getCurrentTenantIdSafe();
  if (!tenantId) {
    return (where || {}) as T;
  }
  return { ...(where || {}), tenantId } as unknown as T;
}

/**
 * 为 TypeORM QueryBuilder 添加 tenant_id 过滤
 *
 * 用法：
 *   const qb = repo.createQueryBuilder('customer');
 *   addTenantFilter(qb, 'customer');
 *   qb.andWhere(...其他条件...)
 */
export function addTenantFilter(qb: any, alias: string): void {
  const tenantId = getCurrentTenantIdSafe();
  if (tenantId) {
    qb.andWhere(`${alias}.tenant_id = :_tenantId`, { _tenantId: tenantId });
  }
}

/**
 * 返回原始SQL的 tenant_id 过滤片段和参数
 *
 * 用法：
 *   const { sql, params } = tenantRawSQL('c.');
 *   AppDataSource.query(`SELECT * FROM customers c WHERE c.status = ? ${sql}`, [...otherParams, ...params])
 *
 *   // 无别名：
 *   const { sql, params } = tenantRawSQL();
 *   AppDataSource.query(`SELECT * FROM customers WHERE status = ? ${sql}`, [...otherParams, ...params])
 */
export function tenantRawSQL(prefix: string = ''): { sql: string; params: any[] } {
  const tenantId = getCurrentTenantIdSafe();
  if (tenantId) {
    return {
      sql: ` AND ${prefix}tenant_id = ?`,
      params: [tenantId]
    };
  }
  return { sql: '', params: [] };
}

/**
 * 返回原始SQL的 WHERE tenant_id 条件（用于作为第一个条件）
 *
 * 用法：
 *   const { sql, params } = tenantWhereSQL('c.');
 *   AppDataSource.query(`SELECT * FROM customers c ${sql}`, params)
 *   // 输出: SELECT * FROM customers c WHERE c.tenant_id = ?
 */
export function tenantWhereSQL(prefix: string = ''): { sql: string; params: any[] } {
  const tenantId = getCurrentTenantIdSafe();
  if (tenantId) {
    return {
      sql: `WHERE ${prefix}tenant_id = ?`,
      params: [tenantId]
    };
  }
  return { sql: '', params: [] };
}

/**
 * 在保存实体前设置 tenant_id
 *
 * 用法：
 *   const customer = new Customer();
 *   customer.name = '...';
 *   setTenantOnEntity(customer);
 *   await repo.save(customer);
 */
export function setTenantOnEntity(entity: any): void {
  const tenantId = getCurrentTenantIdSafe();
  if (tenantId && entity) {
    // 如果尚未设置 tenant_id，自动设置
    if (entity.tenantId === undefined || entity.tenantId === null) {
      entity.tenantId = tenantId;
    }
    // 兼容下划线命名
    if (entity.tenant_id === undefined || entity.tenant_id === null) {
      entity.tenant_id = tenantId;
    }
  }
}

/**
 * 批量设置实体的 tenant_id
 */
export function setTenantOnEntities(entities: any[]): void {
  entities.forEach(e => setTenantOnEntity(e));
}


