/**
 * 创建寄件人/退货地址表 - 本地SQLite和MySQL兼容
 * 执行: node create-sender-addresses-table.js
 */
require('dotenv').config({ path: '.env.local' });
const { DataSource } = require('typeorm');

async function createTable() {
  // 自动检测数据库类型
  const isMySQL = process.env.DB_HOST && process.env.DB_HOST !== '';

  let dataSource;

  if (isMySQL) {
    dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm',
      synchronize: false,
      logging: false
    });
  } else {
    dataSource = new DataSource({
      type: 'sqlite',
      database: './data/crm_local.db',
      synchronize: false,
      logging: false
    });
  }

  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    if (isMySQL) {
      await dataSource.query(`
        CREATE TABLE IF NOT EXISTS sender_addresses (
          id VARCHAR(50) PRIMARY KEY COMMENT '地址ID',
          tenant_id VARCHAR(36) NULL COMMENT '租户ID',
          type VARCHAR(20) NOT NULL DEFAULT 'sender' COMMENT '类型: sender=寄件人, return=退货地址',
          name VARCHAR(50) NOT NULL COMMENT '联系人姓名',
          phone VARCHAR(20) NOT NULL COMMENT '联系电话',
          province VARCHAR(50) NULL COMMENT '省',
          city VARCHAR(50) NULL COMMENT '市',
          district VARCHAR(50) NULL COMMENT '区/县',
          address VARCHAR(500) NOT NULL COMMENT '详细地址',
          full_address VARCHAR(600) NULL COMMENT '完整地址(省市区+详细)',
          is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认: 0否 1是',
          sort_order INT DEFAULT 0 COMMENT '排序',
          remark TEXT NULL COMMENT '备注',
          linked_service_types JSON NULL COMMENT '关联售后类型',
          created_by VARCHAR(50) NULL COMMENT '创建人ID',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          INDEX idx_sender_addresses_tenant_type (tenant_id, type),
          INDEX idx_sender_addresses_tenant_default (tenant_id, type, is_default)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='寄件人/退货地址表';
      `);
    } else {
      await dataSource.query(`
        CREATE TABLE IF NOT EXISTS sender_addresses (
          id TEXT PRIMARY KEY,
          tenant_id TEXT,
          type TEXT NOT NULL DEFAULT 'sender',
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          province TEXT,
          city TEXT,
          district TEXT,
          address TEXT NOT NULL,
          full_address TEXT,
          is_default INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          remark TEXT,
          linked_service_types TEXT,
          created_by TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    console.log('✅ sender_addresses 表创建成功');

    // 验证
    if (isMySQL) {
      const result = await dataSource.query('DESCRIBE sender_addresses');
      console.log(`表字段数: ${result.length}`);
    } else {
      const result = await dataSource.query("SELECT name FROM sqlite_master WHERE type='table' AND name='sender_addresses'");
      console.log('表存在:', result.length > 0);
    }

    await dataSource.destroy();
    console.log('完成');
  } catch (error) {
    console.error('执行失败:', error.message);
    process.exit(1);
  }
}

createTable();

