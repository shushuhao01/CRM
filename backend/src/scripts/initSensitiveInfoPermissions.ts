/**
 * 敏感信息权限表数据库自动修复
 *
 * 在后端启动时自动执行：
 * 1. 确保 sensitive_info_permissions 表有 tenant_id 列
 * 2. 修复唯一索引，包含 tenant_id
 * 3. 为无 tenant_id 的旧数据保留（NULL 表示全局默认）
 */

import { AppDataSource } from '../config/database';

// 默认敏感信息权限配置
const DEFAULT_INFO_TYPES = ['phone', 'id_card', 'email', 'wechat', 'address', 'bank', 'financial'];
const DEFAULT_ROLES = ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'];

// 默认权限：超级管理员和管理员有权限，其他角色无权限
function getDefaultPermission(roleCode: string): number {
  return (roleCode === 'super_admin' || roleCode === 'admin') ? 1 : 0;
}

export async function initSensitiveInfoPermissionsSchema(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log('🔧 [敏感信息权限] 检查数据库结构...');

    // 检查表是否存在
    const tblExists = await tableExists(queryRunner, 'sensitive_info_permissions');
    if (!tblExists) {
      // 表不存在，创建完整的表（含 tenant_id）
      console.log('  📦 sensitive_info_permissions: 创建表（含tenant_id）');
      await queryRunner.query(`
        CREATE TABLE \`sensitive_info_permissions\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
          \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID（NULL表示全局默认）',
          \`info_type\` VARCHAR(50) NOT NULL COMMENT '敏感信息类型',
          \`role_code\` VARCHAR(50) NOT NULL COMMENT '角色代码',
          \`has_permission\` TINYINT(1) DEFAULT 0 COMMENT '是否有权限: 0无权限, 1有权限',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          UNIQUE INDEX \`idx_tenant_info_role\` (\`tenant_id\`, \`info_type\`, \`role_code\`),
          INDEX \`idx_sip_tenant_id\` (\`tenant_id\`),
          INDEX \`idx_sip_info_type\` (\`info_type\`),
          INDEX \`idx_sip_role_code\` (\`role_code\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感信息权限配置表'
      `);

      // 插入全局默认数据（tenant_id = NULL）
      await insertDefaultPermissions(queryRunner, null);
      console.log('  ✅ sensitive_info_permissions: 表创建完成，含默认数据');
    } else {
      // 表已存在，检查是否有 tenant_id 列
      const hasTenantId = await columnExists(queryRunner, 'sensitive_info_permissions', 'tenant_id');
      if (!hasTenantId) {
        console.log('  ➕ sensitive_info_permissions: 添加 tenant_id 列');
        await queryRunner.query(
          `ALTER TABLE \`sensitive_info_permissions\` ADD COLUMN \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID（NULL表示全局默认）' AFTER \`id\``
        );

        // 删除旧的唯一索引（不含 tenant_id 的）
        await dropOldUniqueIndexes(queryRunner);

        // 创建新的联合唯一索引（含 tenant_id）
        const hasNewIdx = await indexExists(queryRunner, 'sensitive_info_permissions', 'idx_tenant_info_role');
        if (!hasNewIdx) {
          console.log('  🔄 sensitive_info_permissions: 创建联合唯一索引 (tenant_id, info_type, role_code)');
          await queryRunner.query(
            `CREATE UNIQUE INDEX \`idx_tenant_info_role\` ON \`sensitive_info_permissions\`(\`tenant_id\`, \`info_type\`, \`role_code\`)`
          );
        }

        // 添加 tenant_id 索引
        const hasTenantIdx = await indexExists(queryRunner, 'sensitive_info_permissions', 'idx_sip_tenant_id');
        if (!hasTenantIdx) {
          await queryRunner.query(
            `CREATE INDEX \`idx_sip_tenant_id\` ON \`sensitive_info_permissions\`(\`tenant_id\`)`
          );
        }

        console.log('  ✅ sensitive_info_permissions: tenant_id 列和索引添加完成');
      } else {
        // tenant_id 列已存在，确保唯一索引正确
        const hasNewIdx = await indexExists(queryRunner, 'sensitive_info_permissions', 'idx_tenant_info_role');
        if (!hasNewIdx) {
          // 先删除旧索引
          await dropOldUniqueIndexes(queryRunner);
          console.log('  🔄 sensitive_info_permissions: 创建联合唯一索引 (tenant_id, info_type, role_code)');
          await queryRunner.query(
            `CREATE UNIQUE INDEX \`idx_tenant_info_role\` ON \`sensitive_info_permissions\`(\`tenant_id\`, \`info_type\`, \`role_code\`)`
          );
        }
      }

      // 确保全局默认数据存在（tenant_id = NULL 的记录）
      await ensureDefaultPermissions(queryRunner);
    }

    console.log('✅ [敏感信息权限] 数据库结构检查完成');
  } catch (error) {
    console.error('❌ [敏感信息权限] 数据库修复失败:', (error as Error).message);
  } finally {
    await queryRunner.release();
  }
}

/**
 * 插入默认权限数据
 */
async function insertDefaultPermissions(queryRunner: any, tenantId: string | null): Promise<void> {
  let count = 0;
  for (const infoType of DEFAULT_INFO_TYPES) {
    for (const roleCode of DEFAULT_ROLES) {
      const hasPerm = getDefaultPermission(roleCode);
      try {
        if (tenantId === null) {
          await queryRunner.query(
            `INSERT IGNORE INTO \`sensitive_info_permissions\` (\`tenant_id\`, \`info_type\`, \`role_code\`, \`has_permission\`) VALUES (NULL, ?, ?, ?)`,
            [infoType, roleCode, hasPerm]
          );
        } else {
          await queryRunner.query(
            `INSERT IGNORE INTO \`sensitive_info_permissions\` (\`tenant_id\`, \`info_type\`, \`role_code\`, \`has_permission\`) VALUES (?, ?, ?, ?)`,
            [tenantId, infoType, roleCode, hasPerm]
          );
        }
        count++;
      } catch (_e) {
        // 忽略重复插入错误
      }
    }
  }
  if (count > 0) {
    console.log(`  📦 sensitive_info_permissions: 初始化了 ${count} 条默认权限记录 (tenant: ${tenantId || 'NULL/全局'})`);
  }
}

/**
 * 确保全局默认数据存在
 */
async function ensureDefaultPermissions(queryRunner: any): Promise<void> {
  // 检查 NULL tenant_id 的记录数
  const [result] = await queryRunner.query(
    `SELECT COUNT(*) AS cnt FROM \`sensitive_info_permissions\` WHERE \`tenant_id\` IS NULL`
  );
  const nullCount = result?.cnt || 0;

  if (nullCount < DEFAULT_INFO_TYPES.length * DEFAULT_ROLES.length) {
    console.log('  📦 sensitive_info_permissions: 补充全局默认权限数据');
    await insertDefaultPermissions(queryRunner, null);
  }
}

/**
 * 删除旧的不含 tenant_id 的唯一索引
 */
async function dropOldUniqueIndexes(queryRunner: any): Promise<void> {
  // 查找所有不含 tenant_id 的唯一索引（排除PRIMARY和已有的新索引）
  const indexes = await queryRunner.query(`
    SELECT DISTINCT s1.INDEX_NAME
    FROM information_schema.STATISTICS s1
    WHERE s1.TABLE_SCHEMA = DATABASE()
      AND s1.TABLE_NAME = 'sensitive_info_permissions'
      AND s1.NON_UNIQUE = 0
      AND s1.INDEX_NAME != 'PRIMARY'
      AND s1.INDEX_NAME != 'idx_tenant_info_role'
  `);

  for (const row of indexes) {
    const idxName = row.INDEX_NAME;
    console.log(`  🗑️ sensitive_info_permissions: 删除旧唯一索引 ${idxName}`);
    try {
      await queryRunner.query(`DROP INDEX \`${idxName}\` ON \`sensitive_info_permissions\``);
    } catch (_e) {
      console.warn(`  ⚠️ 删除索引 ${idxName} 失败，可能已被删除`);
    }
  }
}

// ========== 辅助函数 ==========

async function tableExists(queryRunner: any, tableName: string): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows[0]?.cnt > 0;
}

async function columnExists(queryRunner: any, tableName: string, columnName: string): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0]?.cnt > 0;
}

async function indexExists(queryRunner: any, tableName: string, indexName: string): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows[0]?.cnt > 0;
}

