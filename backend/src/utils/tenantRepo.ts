/**
 * 租户感知仓储工具
 *
 * 替代 AppDataSource.getRepository(Entity) 的 drop-in 方案
 * 自动为所有查询添加 tenant_id 过滤，为所有写入自动设置 tenant_id
 *
 * 用法:
 *   // 替换前:
 *   const repo = AppDataSource.getRepository(Customer);
 *
 *   // 替换后:
 *   const repo = getTenantRepo(Customer);
 *
 *   // 所有后续操作自动带租户过滤:
 *   repo.find({ where: { status: 'active' } })  // 自动添加 tenant_id 条件
 *   repo.save(entity)                            // 自动设置 tenant_id
 *   repo.createQueryBuilder('c')                 // 自动添加 WHERE tenant_id = ?
 */

import { Repository, FindManyOptions, FindOneOptions, FindOptionsWhere, DeepPartial, ObjectLiteral, SaveOptions } from 'typeorm';
import { AppDataSource } from '../config/database';
import { TenantContextManager } from './tenantContext';
import { deployConfig } from '../config/deploy';

// 需要租户隔离的实体表名列表
const TENANT_ENTITIES = new Set([
  'customers', 'orders', 'order_items', 'products', 'product_categories',
  'departments', 'roles', 'permissions', 'users',
  'follow_up_records', 'call_records', 'customer_tags', 'customer_groups',
  'customer_shares', 'after_sales_services', 'service_records',
  'logistics', 'performance_records', 'performance_metrics',
  'system_configs', 'department_order_limits', 'sms_records',
  'notifications', 'operation_logs', 'system_messages',
  'outsource_companies', 'cod_cancel_applications', 'customer_assignments',
  'value_added_orders', 'value_added_price_config', 'value_added_status_configs',
  'role_permissions', 'payment_orders', 'payment_records',
  'data_records', 'customer_service_permissions', 'sensitive_info_permissions',
]);

/**
 * 检查实体是否需要租户隔离
 */
function needsTenantIsolation(repository: Repository<any>): boolean {
  const tableName = repository.metadata.tableName;
  if (TENANT_ENTITIES.has(tableName)) return true;
  // 额外检查: 实体是否有 tenant_id 列
  return repository.metadata.columns.some(col =>
    col.propertyName === 'tenantId' || col.databaseName === 'tenant_id'
  );
}

/**
 * 获取当前租户ID
 */
function getCurrentTenantId(): string | undefined {
  if (deployConfig.isSaaS()) {
    return TenantContextManager.getTenantId();
  }
  return undefined;
}

/**
 * 合并租户条件到 where 子句
 */
function mergeTenantWhere<T>(where: any, tenantId: string): any {
  if (!where) return { tenantId };
  if (Array.isArray(where)) {
    return where.map(w => ({ ...w, tenantId }));
  }
  return { ...where, tenantId };
}

/**
 * 获取带租户隔离的仓储
 *
 * 这是一个 Proxy 包装器，拦截所有 Repository 方法调用，
 * 自动注入 tenant_id 过滤和写入
 */
export function getTenantRepo<Entity extends ObjectLiteral>(
  entityClass: new () => Entity
): Repository<Entity> {
  const repo = AppDataSource.getRepository(entityClass);

  // 检查是否需要租户隔离
  if (!needsTenantIsolation(repo)) {
    return repo; // 不需要隔离，直接返回原始仓储
  }

  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    return repo; // 无租户上下文，直接返回（超管等场景）
  }

  // 使用 Proxy 拦截所有方法调用
  return new Proxy(repo, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      // 拦截查询方法
      if (prop === 'find') {
        return async (options?: FindManyOptions<Entity>) => {
          options = options || {};
          options.where = mergeTenantWhere(options.where, tenantId);
          return target.find(options);
        };
      }

      if (prop === 'findOne') {
        return async (options: FindOneOptions<Entity>) => {
          options.where = mergeTenantWhere(options.where, tenantId);
          return target.findOne(options);
        };
      }

      if (prop === 'findOneBy') {
        return async (where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]) => {
          return target.findOneBy(mergeTenantWhere(where, tenantId));
        };
      }

      if (prop === 'findBy') {
        return async (where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]) => {
          return target.findBy(mergeTenantWhere(where, tenantId));
        };
      }

      if (prop === 'findAndCount') {
        return async (options?: FindManyOptions<Entity>) => {
          options = options || {};
          options.where = mergeTenantWhere(options.where, tenantId);
          return target.findAndCount(options);
        };
      }

      if (prop === 'count') {
        return async (options?: FindManyOptions<Entity>) => {
          options = options || {};
          options.where = mergeTenantWhere(options.where, tenantId);
          return target.count(options);
        };
      }

      if (prop === 'countBy') {
        return async (where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]) => {
          return target.countBy(mergeTenantWhere(where, tenantId));
        };
      }

      // 拦截保存方法 - 自动设置 tenant_id
      if (prop === 'save') {
        return async (entityOrEntities: any, options?: SaveOptions) => {
          if (Array.isArray(entityOrEntities)) {
            entityOrEntities.forEach((e: any) => {
              if (e.tenantId === undefined || e.tenantId === null) {
                e.tenantId = tenantId;
              }
            });
          } else if (entityOrEntities) {
            if (entityOrEntities.tenantId === undefined || entityOrEntities.tenantId === null) {
              entityOrEntities.tenantId = tenantId;
            }
          }
          return target.save(entityOrEntities, options);
        };
      }

      if (prop === 'create') {
        return (entityLike?: DeepPartial<Entity>) => {
          const entity = target.create(entityLike);
          (entity as any).tenantId = tenantId;
          return entity;
        };
      }

      // 拦截 createQueryBuilder - 自动添加 WHERE 条件
      if (prop === 'createQueryBuilder') {
        return (alias?: string) => {
          const qb = target.createQueryBuilder(alias);
          if (alias) {
            qb.andWhere(`${alias}.tenant_id = :_tid`, { _tid: tenantId });
          } else {
            qb.andWhere(`tenant_id = :_tid`, { _tid: tenantId });
          }
          return qb;
        };
      }

      // 拦截 update - 添加租户条件
      if (prop === 'update') {
        return async (criteria: any, partialEntity: any) => {
          if (typeof criteria === 'string' || typeof criteria === 'number') {
            criteria = { id: criteria, tenantId } as any;
          } else if (typeof criteria === 'object' && !Array.isArray(criteria)) {
            criteria = { ...criteria, tenantId };
          }
          return target.update(criteria, partialEntity);
        };
      }

      // 拦截 delete - 添加租户条件
      if (prop === 'delete') {
        return async (criteria: any) => {
          if (typeof criteria === 'string' || typeof criteria === 'number') {
            criteria = { id: criteria, tenantId } as any;
          } else if (typeof criteria === 'object' && !Array.isArray(criteria)) {
            criteria = { ...criteria, tenantId };
          }
          return target.delete(criteria);
        };
      }

      // 拦截 softDelete
      if (prop === 'softDelete') {
        return async (criteria: any) => {
          if (typeof criteria === 'string' || typeof criteria === 'number') {
            criteria = { id: criteria, tenantId } as any;
          } else if (typeof criteria === 'object' && !Array.isArray(criteria)) {
            criteria = { ...criteria, tenantId };
          }
          return target.softDelete(criteria);
        };
      }

      // 其他方法直接透传
      if (typeof original === 'function') {
        return original.bind(target);
      }
      return original;
    }
  });
}

/**
 * 获取原始SQL的租户过滤条件
 * 用于 AppDataSource.query() 的场景
 *
 * @param prefix 表别名前缀，如 'c.' 或 'o.'
 * @returns { sql: string, params: any[] }
 *
 * 用法:
 *   const t = tenantSQL('c.');
 *   const [rows] = await AppDataSource.query(
 *     `SELECT * FROM customers c WHERE c.status = ? ${t.sql}`,
 *     ['active', ...t.params]
 *   );
 */
export function tenantSQL(prefix: string = ''): { sql: string; params: any[] } {
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    return { sql: ` AND ${prefix}tenant_id = ?`, params: [tenantId] };
  }
  return { sql: '', params: [] };
}

/**
 * 获取租户 WHERE 子句（作为第一个条件）
 */
export function tenantWHERE(prefix: string = ''): { sql: string; params: any[] } {
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    return { sql: `WHERE ${prefix}tenant_id = ?`, params: [tenantId] };
  }
  return { sql: '', params: [] };
}

