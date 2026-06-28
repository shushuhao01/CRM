/**
 * PrivateTenantAssociationService - 私有部署租户数据自动关联服务
 *
 * 解决的核心问题：
 *   私有部署从旧版本升级到 v1.8 多租户架构后，旧数据 tenant_id = NULL，
 *   被 getTenantRepo() 过滤器排除，导致物流公司、角色权限等"看不见"。
 *
 * 工作原理：
 *   1. 仅在私有部署模式下运行（DEPLOY_MODE=private）
 *   2. 查找 tenants 表中唯一的活跃租户
 *   3. 遍历所有含 tenant_id 列的表，将 NULL 值更新为该租户ID
 *   4. 幂等执行：已有 tenant_id 的记录不受影响
 *   5. 通过 migration_history 记录执行状态，避免重复执行
 */

import { AppDataSource } from '../config/database';
import { log } from '../config/logger';

const MIGRATION_KEY = 'auto-private-tenant-association';

export class PrivateTenantAssociationService {

  /**
   * 指定租户ID执行关联（用于首次激活时调用）
   */
  static async runForTenant(tenantId: string): Promise<void> {
    return this.associateNullTenantData(tenantId, true);
  }

  /**
   * 自动检测租户并执行关联（用于系统启动时调用）
   */
  static async run(): Promise<void> {
    const deployMode = process.env.DEPLOY_MODE || 'private';
    if (deployMode !== 'private') return;

    try {
      // 检查是否已经执行过（幂等）
      const history = await AppDataSource.query(
        `SELECT id FROM migration_history WHERE filename = ? AND success = 1 LIMIT 1`,
        [MIGRATION_KEY]
      ).catch(() => []);

      if (history.length > 0) return;

      // 查找唯一的活跃租户
      const tenants = await AppDataSource.query(
        `SELECT id FROM tenants WHERE license_status = 'active' ORDER BY activated_at DESC LIMIT 2`
      ).catch(() => []);

      if (tenants.length === 0) {
        const anyTenant = await AppDataSource.query(
          `SELECT id FROM tenants ORDER BY created_at DESC LIMIT 1`
        ).catch(() => []);
        if (anyTenant.length === 0) {
          log.info('🔗 [租户关联] 暂无租户记录，跳过自动关联（激活后将自动执行）');
          return;
        }
        tenants.push(anyTenant[0]);
      }

      if (tenants.length > 1) {
        log.warn('🔗 [租户关联] 检测到多个活跃租户，跳过自动关联（仅适用于单租户私有部署）');
        return;
      }

      await this.associateNullTenantData(tenants[0].id, false);
    } catch (error: any) {
      log.error('🔗 [租户关联] 执行失败（不影响系统启动）:', error.message);
    }
  }

  private static async associateNullTenantData(tenantId: string, isActivation: boolean): Promise<void> {
    try {
      log.info(`🔗 [租户关联] 开始自动关联 tenant_id = ${tenantId} ...`);

      // 获取数据库中所有含 tenant_id 列的表
      const dbName = AppDataSource.options.database;
      const tablesWithTenantId = await AppDataSource.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = 'tenant_id'
         AND TABLE_NAME NOT IN ('tenants', 'licenses', 'system_license', 'migration_history')
         ORDER BY TABLE_NAME`,
        [dbName]
      );

      let totalUpdated = 0;
      let tablesFixed = 0;
      const errors: string[] = [];

      for (const row of tablesWithTenantId) {
        const tableName = row.TABLE_NAME;
        try {
          const result = await AppDataSource.query(
            `UPDATE \`${tableName}\` SET tenant_id = ? WHERE tenant_id IS NULL`,
            [tenantId]
          );
          const affected = result?.affectedRows || 0;
          if (affected > 0) {
            log.info(`  ✅ ${tableName}: ${affected} 条记录已关联`);
            totalUpdated += affected;
            tablesFixed++;
          }
        } catch (err: any) {
          // 唯一索引冲突等非致命错误，记录但继续
          if (err.code === 'ER_DUP_ENTRY') {
            log.warn(`  ⚠️ ${tableName}: 部分记录因唯一约束跳过`);
            // 逐条更新，跳过冲突的
            try {
              const nullRows = await AppDataSource.query(
                `SELECT id FROM \`${tableName}\` WHERE tenant_id IS NULL`
              );
              let fixed = 0;
              for (const r of nullRows) {
                try {
                  await AppDataSource.query(
                    `UPDATE \`${tableName}\` SET tenant_id = ? WHERE id = ?`,
                    [tenantId, r.id]
                  );
                  fixed++;
                } catch (_dupErr) {
                  // 跳过冲突记录
                }
              }
              if (fixed > 0) {
                log.info(`  ✅ ${tableName}: ${fixed}/${nullRows.length} 条记录已关联（跳过冲突）`);
                totalUpdated += fixed;
                tablesFixed++;
              }
            } catch (_batchErr) {
              errors.push(tableName);
            }
          } else {
            log.warn(`  ⚠️ ${tableName}: ${err.message}`);
            errors.push(tableName);
          }
        }
      }

      // 记录执行结果（仅启动时记录，防止重复执行；激活时每次都执行）
      if (!isActivation) {
        try {
          await AppDataSource.query(
            `INSERT INTO migration_history (filename, checksum, execution_time, success, error_message, executed_at)
             VALUES (?, ?, 0, 1, ?, NOW())`,
            [
              MIGRATION_KEY,
              tenantId,
              totalUpdated > 0
                ? `关联 ${tablesFixed} 个表共 ${totalUpdated} 条记录` + (errors.length > 0 ? `，${errors.length} 个表有错误` : '')
                : '所有表已关联，无需更新'
            ]
          );
        } catch (_e) {
          // migration_history 记录失败不阻塞
        }
      }

      if (totalUpdated > 0) {
        log.info(`🔗 [租户关联] ✅ 完成：${tablesFixed} 个表共 ${totalUpdated} 条记录已关联到租户`);
      } else {
        log.info('🔗 [租户关联] ✅ 所有数据已正确关联，无需更新');
      }

      if (errors.length > 0) {
        log.warn(`🔗 [租户关联] ⚠️ ${errors.length} 个表处理时有非致命错误: ${errors.join(', ')}`);
      }

    } catch (error: any) {
      log.error('🔗 [租户关联] 执行失败（不影响系统启动）:', error.message);
    }
  }
}

export const privateTenantAssociationService = PrivateTenantAssociationService;
