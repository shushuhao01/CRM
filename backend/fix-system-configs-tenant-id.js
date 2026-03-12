require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function fixSystemConfigsTenantId() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'abc789',
    password: process.env.DB_PASSWORD || 'YtZWJPF2bpsCscHX',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('='.repeat(80));
  console.log('修复 system_configs 表 tenant_id 字段');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. 检查字段是否已存在
    console.log('1. 检查 tenant_id 字段是否存在...');
    const [fields] = await connection.query(`DESCRIBE system_configs`);
    const hasTenantId = fields.some(f => f.Field === 'tenant_id');

    if (hasTenantId) {
      console.log('✓ tenant_id 字段已存在，无需添加');
      await connection.end();
      return;
    }

    console.log('✗ tenant_id 字段不存在，开始添加...');
    console.log();

    // 2. 添加 tenant_id 字段
    console.log('2. 添加 tenant_id 字段...');
    await connection.query(`
      ALTER TABLE system_configs
      ADD COLUMN tenant_id VARCHAR(50) NULL COMMENT '租户ID' AFTER id
    `);
    console.log('✓ 成功添加 tenant_id 字段');
    console.log();

    // 3. 添加索引
    console.log('3. 添加索引...');
    await connection.query(`
      ALTER TABLE system_configs
      ADD INDEX idx_tenant_id (tenant_id)
    `);
    console.log('✓ 成功添加索引 idx_tenant_id');
    console.log();

    // 4. 验证
    console.log('4. 验证修改结果...');
    const [newFields] = await connection.query(`DESCRIBE system_configs`);
    const tenantIdField = newFields.find(f => f.Field === 'tenant_id');

    if (tenantIdField) {
      console.log('✓ 验证成功！');
      console.log('  字段信息:');
      console.log(`    - 字段名: ${tenantIdField.Field}`);
      console.log(`    - 类型: ${tenantIdField.Type}`);
      console.log(`    - 允许NULL: ${tenantIdField.Null}`);
      console.log(`    - 默认值: ${tenantIdField.Default}`);
    } else {
      console.log('✗ 验证失败：字段未成功添加');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('修复完成！');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('修复失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

fixSystemConfigsTenantId().catch(console.error);
