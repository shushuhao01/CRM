/**
 * 修复客服权限表的唯一约束
 * 将 user_id 全局唯一改为 (tenant_id, user_id) 复合唯一
 * 支持多租户环境下不同租户可以有相同 user_id 的客服配置
 *
 * 执行方式: node fix-customer-service-unique-constraint.js
 */
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// 读取 .env.local 配置
function loadEnv() {
  const envFile = path.join(__dirname, '.env.local');
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

async function fixConstraint() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('开始修复 customer_service_permissions 表约束...');

    // 1. 查找并删除 user_id 的全局唯一约束
    const [indexes] = await connection.query(
      `SHOW INDEX FROM customer_service_permissions WHERE Column_name = 'user_id' AND Non_unique = 0`
    );

    for (const idx of indexes) {
      if (idx.Key_name !== 'PRIMARY') {
        console.log(`  删除唯一索引: ${idx.Key_name}`);
        await connection.query(`ALTER TABLE customer_service_permissions DROP INDEX \`${idx.Key_name}\``);
      }
    }

    // 2. 添加 (tenant_id, user_id) 复合唯一约束
    try {
      await connection.query(
        `ALTER TABLE customer_service_permissions ADD UNIQUE INDEX idx_tenant_user (tenant_id, user_id)`
      );
      console.log('  已添加复合唯一索引: idx_tenant_user (tenant_id, user_id)');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('  复合唯一索引 idx_tenant_user 已存在，跳过');
      } else {
        throw e;
      }
    }

    console.log('✅ 修复完成！');
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    await connection.end();
  }
}

fixConstraint();

