/**
 * 修复 roles 表的唯一约束
 *
 * 问题：roles.code 有全局 UNIQUE 约束，导致不同租户不能有相同的角色代码
 * 修复：将 UNIQUE(code) 改为 UNIQUE(tenant_id, code)
 *
 * 使用方法：node fix-roles-unique-constraint.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixRolesUniqueConstraint() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm'
  });

  try {
    console.log('开始修复 roles 表唯一约束...');

    // 1. 检查 tenant_id 列是否存在
    const [cols] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'tenant_id'"
    );
    if (cols.length === 0) {
      console.log('  添加 tenant_id 列...');
      await connection.query("ALTER TABLE roles ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
    }

    // 2. 删除旧的全局 UNIQUE(code) 约束
    const [indexes] = await connection.query("SHOW INDEX FROM roles WHERE Column_name = 'code' AND Non_unique = 0");
    for (const idx of indexes) {
      if (idx.Key_name !== 'PRIMARY') {
        console.log(`  删除旧唯一索引: ${idx.Key_name}`);
        await connection.query(`ALTER TABLE roles DROP INDEX \`${idx.Key_name}\``);
      }
    }

    // 3. 创建新的复合唯一索引 (tenant_id, code)
    const [existingIdx] = await connection.query(
      "SHOW INDEX FROM roles WHERE Key_name = 'uk_tenant_code'"
    );
    if (existingIdx.length === 0) {
      console.log('  创建复合唯一索引 uk_tenant_code(tenant_id, code)...');
      await connection.query("ALTER TABLE roles ADD UNIQUE INDEX `uk_tenant_code` (`tenant_id`, `code`)");
    }

    // 4. 同样检查 name 列是否有全局唯一约束
    const [nameIndexes] = await connection.query("SHOW INDEX FROM roles WHERE Column_name = 'name' AND Non_unique = 0");
    for (const idx of nameIndexes) {
      if (idx.Key_name !== 'PRIMARY') {
        console.log(`  删除旧名称唯一索引: ${idx.Key_name}`);
        await connection.query(`ALTER TABLE roles DROP INDEX \`${idx.Key_name}\``);
      }
    }

    // 5. 创建复合唯一索引 (tenant_id, name)（如果需要）
    const [existingNameIdx] = await connection.query(
      "SHOW INDEX FROM roles WHERE Key_name = 'uk_tenant_name'"
    );
    if (existingNameIdx.length === 0) {
      console.log('  创建复合唯一索引 uk_tenant_name(tenant_id, name)...');
      await connection.query("ALTER TABLE roles ADD UNIQUE INDEX `uk_tenant_name` (`tenant_id`, `name`)");
    }

    // 6. 添加 tenant_id 索引
    const [tenantIdx] = await connection.query(
      "SHOW INDEX FROM roles WHERE Key_name = 'idx_roles_tenant_id'"
    );
    if (tenantIdx.length === 0) {
      console.log('  创建 tenant_id 索引...');
      await connection.query("ALTER TABLE roles ADD INDEX `idx_roles_tenant_id` (`tenant_id`)");
    }

    console.log('✅ roles 表唯一约束修复完成！');
    console.log('  - UNIQUE(code) → UNIQUE(tenant_id, code)');
    console.log('  - 不同租户现在可以有相同的角色代码');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    await connection.end();
  }
}

fixRolesUniqueConstraint();

