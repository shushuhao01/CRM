/**
 * 订单设置数据库自动修复
 *
 * 在后端启动时自动执行：
 * 1. 确保 department_order_limits 表有 tenant_id 列
 * 2. 确保 payment_method_options 表有 tenant_id 和 is_system 列
 * 3. 确保 system_configs 表唯一索引包含 tenant_id
 * 4. 初始化预设支付方式数据
 */

import { AppDataSource } from '../config/database';

export async function initOrderSettingsSchema(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    console.log('🔧 [订单设置] 检查数据库结构...');

    // ========== 1. 修复 department_order_limits 表 ==========
    const dolTableExists = await tableExists(queryRunner, 'department_order_limits');
    if (!dolTableExists) {
      // 表不存在，创建完整的表
      console.log('  📦 department_order_limits: 创建表');
      await queryRunner.query(`
        CREATE TABLE \`department_order_limits\` (
          \`id\` VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
          \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID',
          \`department_id\` VARCHAR(50) NOT NULL COMMENT '部门ID',
          \`department_name\` VARCHAR(100) NULL COMMENT '部门名称',
          \`order_count_enabled\` TINYINT(1) DEFAULT 0 COMMENT '是否启用下单次数限制',
          \`max_order_count\` INT DEFAULT 0 COMMENT '最大下单次数',
          \`single_amount_enabled\` TINYINT(1) DEFAULT 0 COMMENT '是否启用单笔金额限制',
          \`max_single_amount\` DECIMAL(12,2) DEFAULT 0 COMMENT '单笔最大金额',
          \`total_amount_enabled\` TINYINT(1) DEFAULT 0 COMMENT '是否启用累计金额限制',
          \`max_total_amount\` DECIMAL(12,2) DEFAULT 0 COMMENT '累计最大金额',
          \`is_enabled\` TINYINT(1) DEFAULT 1 COMMENT '配置是否启用',
          \`remark\` TEXT NULL COMMENT '备注',
          \`created_by\` VARCHAR(50) NULL COMMENT '创建人ID',
          \`created_by_name\` VARCHAR(50) NULL COMMENT '创建人姓名',
          \`updated_by\` VARCHAR(50) NULL COMMENT '更新人ID',
          \`updated_by_name\` VARCHAR(50) NULL COMMENT '更新人姓名',
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE INDEX \`idx_tenant_department\` (\`tenant_id\`, \`department_id\`),
          INDEX \`idx_dol_tenant_id\` (\`tenant_id\`),
          INDEX \`idx_is_enabled\` (\`is_enabled\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门下单限制配置表'
      `);
    } else {
      // 表存在，修复列和索引
      const hasTenantId = await columnExists(queryRunner, 'department_order_limits', 'tenant_id');
      if (!hasTenantId) {
        console.log('  ➕ department_order_limits: 添加 tenant_id 列');
        await queryRunner.query(`ALTER TABLE \`department_order_limits\` ADD COLUMN \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID' AFTER \`id\``);
      }

      // 删除所有仅含 department_id 的唯一索引（无论名称是什么）
      await dropUniqueIndexOnColumn(queryRunner, 'department_order_limits', 'department_id');

      // 创建新的联合唯一索引
      const hasNewIdx = await indexExists(queryRunner, 'department_order_limits', 'idx_tenant_department');
      if (!hasNewIdx) {
        console.log('  🔄 department_order_limits: 创建联合唯一索引 (tenant_id, department_id)');
        await queryRunner.query(`CREATE UNIQUE INDEX \`idx_tenant_department\` ON \`department_order_limits\`(\`tenant_id\`, \`department_id\`)`);
      }
    }

    // ========== 2. 修复 payment_method_options 表 ==========
    const pmoTableExists = await tableExists(queryRunner, 'payment_method_options');
    if (pmoTableExists) {
      // 添加 tenant_id 列
      const hasTenantId = await columnExists(queryRunner, 'payment_method_options', 'tenant_id');
      if (!hasTenantId) {
        console.log('  ➕ payment_method_options: 添加 tenant_id 列');
        await queryRunner.query(`ALTER TABLE \`payment_method_options\` ADD COLUMN \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID（NULL表示全局预设）' AFTER \`id\``);
      }

      // 添加 is_system 列
      const hasIsSystem = await columnExists(queryRunner, 'payment_method_options', 'is_system');
      if (!hasIsSystem) {
        console.log('  ➕ payment_method_options: 添加 is_system 列');
        await queryRunner.query(`ALTER TABLE \`payment_method_options\` ADD COLUMN \`is_system\` TINYINT(1) DEFAULT 0 COMMENT '是否系统预设（不可删除）' AFTER \`is_enabled\``);
      }

      // 修复唯一索引 - 删除仅含 value 列的旧唯一索引
      await dropUniqueIndexOnColumn(queryRunner, 'payment_method_options', 'value');
      const hasNewIdx = await indexExists(queryRunner, 'payment_method_options', 'idx_tenant_value');
      if (!hasNewIdx) {
        await queryRunner.query(`CREATE UNIQUE INDEX \`idx_tenant_value\` ON \`payment_method_options\`(\`tenant_id\`, \`value\`)`);
      }

      // 初始化预设支付方式
      await initPresetPaymentMethods(queryRunner);
    }

    // ========== 3. 修复 system_configs 表唯一索引 ==========
    const scTableExists = await tableExists(queryRunner, 'system_configs');
    if (scTableExists) {
      // 确保 tenant_id 列存在
      const hasTenantId = await columnExists(queryRunner, 'system_configs', 'tenant_id');
      if (!hasTenantId) {
        console.log('  ➕ system_configs: 添加 tenant_id 列');
        await queryRunner.query(`ALTER TABLE \`system_configs\` ADD COLUMN \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID' AFTER \`id\``);
      }

      // 修复唯一索引 - 删除不含 tenant_id 的旧唯一索引
      const oldIdxNames = ['idx_config_key_group', 'configKey', 'idx_configKey_configGroup'];
      for (const idxName of oldIdxNames) {
        const hasOld = await indexExists(queryRunner, 'system_configs', idxName);
        if (hasOld) {
          console.log(`  🗑️ system_configs: 删除旧索引 ${idxName}`);
          await queryRunner.query(`DROP INDEX \`${idxName}\` ON \`system_configs\``);
        }
      }
      const hasNewIdx = await indexExists(queryRunner, 'system_configs', 'idx_tenant_config_key_group');
      if (!hasNewIdx) {
        await queryRunner.query(`CREATE UNIQUE INDEX \`idx_tenant_config_key_group\` ON \`system_configs\`(\`tenant_id\`, \`configKey\`, \`configGroup\`)`);
      }
    }

    console.log('✅ [订单设置] 数据库结构检查完成');
  } catch (error) {
    console.error('❌ [订单设置] 数据库结构修复失败:', error);
  } finally {
    await queryRunner.release();
  }
}

/**
 * 初始化预设支付方式（全局可见，tenant_id = NULL）
 */
async function initPresetPaymentMethods(queryRunner: any): Promise<void> {
  const presets = [
    { id: 'pm_wechat', label: '微信支付', value: 'wechat', sortOrder: 1 },
    { id: 'pm_alipay', label: '支付宝支付', value: 'alipay', sortOrder: 2 },
    { id: 'pm_bank', label: '银行转账', value: 'bank_transfer', sortOrder: 3 },
    { id: 'pm_unionpay', label: '云闪付', value: 'unionpay', sortOrder: 4 },
    { id: 'pm_cod', label: '货到付款', value: 'cod', sortOrder: 5 },
    { id: 'pm_other', label: '其他', value: 'other', sortOrder: 6 },
  ];

  let insertedCount = 0;
  for (const preset of presets) {
    // 检查是否已存在（按id检查）
    const [existing] = await queryRunner.query(
      `SELECT id FROM payment_method_options WHERE id = ?`,
      [preset.id]
    );
    if (!existing) {
      await queryRunner.query(
        `INSERT INTO payment_method_options (id, tenant_id, label, value, sort_order, is_enabled, is_system) VALUES (?, NULL, ?, ?, ?, 1, 1)`,
        [preset.id, preset.label, preset.value, preset.sortOrder]
      );
      insertedCount++;
    } else {
      // 确保已有的预设标记为系统预设且 tenant_id = NULL
      await queryRunner.query(
        `UPDATE payment_method_options SET is_system = 1, tenant_id = NULL WHERE id = ?`,
        [preset.id]
      );
    }
  }

  if (insertedCount > 0) {
    console.log(`  📦 payment_method_options: 初始化了 ${insertedCount} 个预设支付方式`);
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

/**
 * 删除仅含指定列的唯一索引（无论索引名称是什么）
 * 用于处理旧表中索引名称不确定的情况
 */
async function dropUniqueIndexOnColumn(queryRunner: any, tableName: string, columnName: string): Promise<void> {
  // 查找所有仅包含指定列的唯一索引
  const indexes = await queryRunner.query(`
    SELECT DISTINCT s1.INDEX_NAME
    FROM information_schema.STATISTICS s1
    WHERE s1.TABLE_SCHEMA = DATABASE()
      AND s1.TABLE_NAME = ?
      AND s1.NON_UNIQUE = 0
      AND s1.INDEX_NAME != 'PRIMARY'
      AND s1.INDEX_NAME NOT LIKE 'idx_tenant%'
      AND (SELECT COUNT(*) FROM information_schema.STATISTICS s2
           WHERE s2.TABLE_SCHEMA = DATABASE() AND s2.TABLE_NAME = s1.TABLE_NAME
           AND s2.INDEX_NAME = s1.INDEX_NAME) = 1
      AND s1.COLUMN_NAME = ?
  `, [tableName, columnName]);

  for (const row of indexes) {
    const idxName = row.INDEX_NAME;
    console.log(`  🗑️ ${tableName}: 删除旧唯一索引 ${idxName}`);
    await queryRunner.query(`DROP INDEX \`${idxName}\` ON \`${tableName}\``);
  }
}

