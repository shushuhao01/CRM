/**
 * 数据库迁移：创建企微快捷回复表
 * Phase 5: 微信客服增强
 */
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const localEnvPath = path.join(__dirname, '.env.local');
const envPath = fs.existsSync(localEnvPath) ? localEnvPath : path.join(__dirname, '.env');
dotenv.config({ path: envPath });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
  });

  console.log('[Migration] Creating wecom_quick_replies table...');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS wecom_quick_replies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL COMMENT '租户ID',
      category VARCHAR(50) DEFAULT 'enterprise' COMMENT '类别: enterprise(企业)/personal(个人)',
      group_name VARCHAR(100) NULL COMMENT '分组名称',
      title VARCHAR(200) NOT NULL COMMENT '快捷回复标题',
      content TEXT NOT NULL COMMENT '回复内容',
      shortcut VARCHAR(50) NULL COMMENT '快捷键/关键词触发',
      use_count INT DEFAULT 0 COMMENT '使用次数',
      is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
      sort_order INT DEFAULT 0 COMMENT '排序序号',
      created_by VARCHAR(50) NULL COMMENT '创建人',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      INDEX idx_tenant (tenant_id),
      INDEX idx_category (category),
      INDEX idx_group_name (group_name),
      INDEX idx_is_enabled (is_enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微快捷回复表'
  `);

  console.log('[Migration] wecom_quick_replies table created successfully.');
  await connection.end();
}

run().catch(err => {
  console.error('[Migration] Error:', err);
  process.exit(1);
});

