/**
 * 数据库迁移：orders表新增虚拟商品相关字段
 * 任务1.2 - 虚拟商品功能阶段1
 * 日期: 2026-04-20
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
  });

  try {
    console.log('=== 虚拟商品字段迁移：orders表 ===\n');

    const dbName = process.env.DB_DATABASE || process.env.DB_NAME || 'crm';

    const fieldsToAdd = [
      {
        name: 'order_product_type',
        sql: "ALTER TABLE orders ADD COLUMN order_product_type VARCHAR(20) DEFAULT 'physical' COMMENT '订单商品类型: physical-普通, virtual-虚拟, mixed-混合'"
      },
      {
        name: 'completion_source',
        sql: "ALTER TABLE orders ADD COLUMN completion_source VARCHAR(30) DEFAULT NULL COMMENT '完成来源: audit_auto_complete/virtual_delivery/logistics_delivery'"
      }
    ];

    for (const field of fieldsToAdd) {
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME = ?`,
        [dbName, field.name]
      );

      if (columns.length === 0) {
        await connection.execute(field.sql);
        console.log(`✅ 已添加 ${field.name} 列`);
      } else {
        console.log(`⏭️  ${field.name} 列已存在，跳过`);
      }
    }

    console.log('\n✅ orders表虚拟商品字段迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();

