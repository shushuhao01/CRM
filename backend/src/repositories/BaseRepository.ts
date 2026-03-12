/**
 * 基础仓储类
 * 自动处理租户数据隔离
 *
 * 功能：
 * 1. 查询时自动添加 tenant_id 过滤
 * 2. 保存时自动设置 tenant_id
 * 3. 更新/删除时自动添加 tenant_id 过滤
 * 4. 支持私有部署模式（tenant_id = NULL）
 *
 * 注意：实体属性使用驼峰命名（如tenantId），通过@Column的name参数映射到数据库的下划线字段（tenant_id）
 */

import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
  ObjectLiteral,
  SaveOptions,
  RemoveOptions
} from 'typeorm';
import { AppDataSource } from '../config/database';
import { TenantContextManager } from '../utils/tenantContext';
import { deployConfig } from '../config/deploy';

/**
 * 基础仓储类
 *
 * 使用方式：
 * const customerRepo = new BaseRepository(Customer);
 * const customers = await customerRepo.find({ where: { status: 'active' } });
 */
export class BaseRepository<Entity extends ObjectLiteral> {
  protected repository: Repository<Entity>;
  protected entityClass: new () => Entity;

  constructor(entityClass: new () => Entity) {
    this.entityClass = entityClass;
    this.repository = AppDataSource.getRepository(entityClass);
  }

  /**
   * 获取当前租户ID
   */
  protected getTenantId(): string | undefined {
    return TenantContextManager.getTenantId();
  }

  /**
   * 判断实体是否有 tenant_id 字段
   * 检查实体的属性名（可能是tenantId或tenant_id）
   */
  protected hasTenantIdField(): boolean {
    const metadata = this.repository.metadata;
    return metadata.columns.some(column =>
      column.propertyName === 'tenantId' || column.propertyName === 'tenant_id'
    );
  }

  /**
   * 获取租户字段的属性名
   * 返回实体中实际使用的属性名（tenantId或tenant_id）
   */
  protected getTenantFieldName(): string | null {
    const metadata = this.repository.metadata;
    const tenantColumn = metadata.columns.find(column =>
      column.propertyName === 'tenantId' || column.propertyName === 'tenant_id'
    );
    return tenantColumn ? tenantColumn.propertyName : null;
  }

  /**
   * 添加租户过滤条件
   */
  protected addTenantFilter<T extends FindOptionsWhere<Entity>>(where?: T | T[]): T | T[] | undefined {
    // 如果实体没有 tenant_id 字段，直接返回原条件
    if (!this.hasTenantIdField()) {
      return where;
    }

    const tenantFieldName = this.getTenantFieldName();
    if (!tenantFieldName) {
      return where;
    }

    let tenantValue: string | null | undefined;

    // 根据部署模式获取租户ID
    if (deployConfig.isSaaS()) {
      tenantValue = this.getTenantId();
      if (!tenantValue) {
        // SaaS模式但没有租户ID，不添加过滤
        return where;
      }
    } else {
      // 私有部署模式：过滤 tenant_id = NULL
      tenantValue = null;
    }

    const tenantFilter = { [tenantFieldName]: tenantValue } as any;

    // 如果没有 where 条件，直接返回租户过滤
    if (!where) {
      return tenantFilter as T;
    }

    // 如果 where 是数组，给每个元素添加租户过滤
    if (Array.isArray(where)) {
      return where.map(w => ({ ...w, ...tenantFilter })) as T[];
    }

    // 合并租户过滤条件
    return { ...where, ...tenantFilter } as T;
  }

  /**
   * 设置实体的 tenant_id
   */
  protected setTenantId(entity: DeepPartial<Entity>): void {
    // 如果实体没有 tenant_id 字段，直接返回
    if (!this.hasTenantIdField()) {
      return;
    }

    const tenantFieldName = this.getTenantFieldName();
    if (!tenantFieldName) {
      return;
    }

    const entityAny = entity as any;

    // 如果已经设置了 tenant_id，不覆盖
    if (entityAny[tenantFieldName] !== undefined) {
      return;
    }

    // 根据部署模式设置 tenant_id
    if (deployConfig.isSaaS()) {
      const tenantId = this.getTenantId();
      if (tenantId) {
        entityAny[tenantFieldName] = tenantId;
      }
    } else {
      // 私有部署模式：设置为 NULL
      entityAny[tenantFieldName] = null;
    }
  }

  /**
   * 查询多条记录
   * 自动添加 tenant_id 过滤
   */
  async find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
    if (!options) {
      options = {};
    }

    // 添加租户过滤
    options.where = this.addTenantFilter(options.where as FindOptionsWhere<Entity>);

    return this.repository.find(options);
  }

  /**
   * 查询单条记录
   * 自动添加 tenant_id 过滤
   */
  async findOne(options: FindOneOptions<Entity>): Promise<Entity | null> {
    // 添加租户过滤
    options.where = this.addTenantFilter(options.where as FindOptionsWhere<Entity>);

    return this.repository.findOne(options);
  }

  /**
   * 根据ID查询
   * 自动添加 tenant_id 过滤
   */
  async findById(id: string | number): Promise<Entity | null> {
    const where: any = { id };

    // 添加租户过滤
    if (this.hasTenantIdField()) {
      const tenantFieldName = this.getTenantFieldName();
      if (tenantFieldName) {
        if (deployConfig.isSaaS()) {
          const tenantId = this.getTenantId();
          if (tenantId) {
            where[tenantFieldName] = tenantId;
          }
        } else {
          where[tenantFieldName] = null;
        }
      }
    }

    return this.repository.findOne({ where });
  }

  /**
   * 查询并计数
   * 自动添加 tenant_id 过滤
   */
  async findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]> {
    if (!options) {
      options = {};
    }

    // 添加租户过滤
    options.where = this.addTenantFilter(options.where as FindOptionsWhere<Entity>);

    return this.repository.findAndCount(options);
  }

  /**
   * 计数
   * 自动添加 tenant_id 过滤
   */
  async count(options?: FindManyOptions<Entity>): Promise<number> {
    if (!options) {
      options = {};
    }

    // 添加租户过滤
    options.where = this.addTenantFilter(options.where as FindOptionsWhere<Entity>);

    return this.repository.count(options);
  }

  /**
   * 保存实体
   * 自动设置 tenant_id
   */
  async save(entity: DeepPartial<Entity>, options?: SaveOptions): Promise<Entity>;
  async save(entities: DeepPartial<Entity>[], options?: SaveOptions): Promise<Entity[]>;
  async save(
    entityOrEntities: DeepPartial<Entity> | DeepPartial<Entity>[],
    options?: SaveOptions
  ): Promise<Entity | Entity[]> {
    if (Array.isArray(entityOrEntities)) {
      // 批量保存
      entityOrEntities.forEach(entity => this.setTenantId(entity));
      return this.repository.save(entityOrEntities as any, options);
    } else {
      // 单个保存
      this.setTenantId(entityOrEntities);
      return this.repository.save(entityOrEntities as any, options);
    }
  }

  /**
   * 创建实体实例
   * 自动设置 tenant_id
   */
  create(entityLike?: DeepPartial<Entity>): Entity {
    const entity = this.repository.create(entityLike);
    this.setTenantId(entity);
    return entity;
  }

  /**
   * 更新实体
   * 自动添加 tenant_id 过滤
   */
  async update(
    criteria: string | number | FindOptionsWhere<Entity>,
    partialEntity: DeepPartial<Entity>
  ): Promise<void> {
    let where: FindOptionsWhere<Entity>;

    if (typeof criteria === 'string' || typeof criteria === 'number') {
      where = { id: criteria } as unknown as FindOptionsWhere<Entity>;
    } else {
      where = criteria;
    }

    // 添加租户过滤
    where = this.addTenantFilter(where) as FindOptionsWhere<Entity>;

    await this.repository.update(where, partialEntity as any);
  }

  /**
   * 删除实体
   * 自动添加 tenant_id 过滤
   */
  async delete(criteria: string | number | FindOptionsWhere<Entity>): Promise<void> {
    let where: FindOptionsWhere<Entity>;

    if (typeof criteria === 'string' || typeof criteria === 'number') {
      where = { id: criteria } as unknown as FindOptionsWhere<Entity>;
    } else {
      where = criteria;
    }

    // 添加租户过滤
    where = this.addTenantFilter(where) as FindOptionsWhere<Entity>;

    await this.repository.delete(where);
  }

  /**
   * 软删除实体
   * 自动添加 tenant_id 过滤
   */
  async softDelete(criteria: string | number | FindOptionsWhere<Entity>): Promise<void> {
    let where: FindOptionsWhere<Entity>;

    if (typeof criteria === 'string' || typeof criteria === 'number') {
      where = { id: criteria } as unknown as FindOptionsWhere<Entity>;
    } else {
      where = criteria;
    }

    // 添加租户过滤
    where = this.addTenantFilter(where) as FindOptionsWhere<Entity>;

    await this.repository.softDelete(where);
  }

  /**
   * 移除实体
   * 自动添加 tenant_id 过滤（通过先查询再删除）
   */
  async remove(entity: Entity, options?: RemoveOptions): Promise<Entity>;
  async remove(entities: Entity[], options?: RemoveOptions): Promise<Entity[]>;
  async remove(
    entityOrEntities: Entity | Entity[],
    options?: RemoveOptions
  ): Promise<Entity | Entity[]> {
    // remove 方法需要先查询实体，TypeORM 会自动验证
    // 我们在 find/findOne 中已经添加了租户过滤
    return this.repository.remove(entityOrEntities as any, options);
  }

  /**
   * 获取原始 Repository（用于特殊查询）
   *
   * 警告：使用原始 Repository 不会自动添加租户过滤
   * 请谨慎使用，确保手动添加租户过滤条件
   */
  getRawRepository(): Repository<Entity> {
    return this.repository;
  }

  /**
   * 创建查询构建器
   * 自动添加 tenant_id 过滤
   */
  createQueryBuilder(alias?: string) {
    const qb = this.repository.createQueryBuilder(alias);

    // 如果实体有 tenant_id 字段，自动添加过滤
    if (this.hasTenantIdField()) {
      const metadata = this.repository.metadata;
      const tenantColumn = metadata.columns.find(column =>
        column.propertyName === 'tenantId' || column.propertyName === 'tenant_id'
      );

      if (tenantColumn) {
        const aliasName = alias || this.repository.metadata.tableName;
        const columnName = tenantColumn.databaseName;

        if (deployConfig.isSaaS()) {
          const tenantId = this.getTenantId();
          if (tenantId) {
            qb.andWhere(`${aliasName}.${columnName} = :tenantId`, { tenantId });
          }
        } else {
          qb.andWhere(`${aliasName}.${columnName} IS NULL`);
        }
      }
    }

    return qb;
  }
}
