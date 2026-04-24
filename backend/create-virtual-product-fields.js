/**
 * 数据库迁移：products表新增虚拟商品相关字段
 * 任务1.1 - 虚拟商品功能阶段1
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
    console.log('=== 虚拟商品字段迁移：products表 ===\n');

    const dbName = process.env.DB_DATABASE || process.env.DB_NAME || 'crm';

    const fieldsToAdd = [
      {
        name: 'product_type',
        sql: "ALTER TABLE products ADD COLUMN product_type VARCHAR(20) DEFAULT 'physical' COMMENT '商品类型: physical-普通商品, virtual-虚拟商品'"
      },
      {
        name: 'virtual_delivery_type',
        sql: "ALTER TABLE products ADD COLUMN virtual_delivery_type VARCHAR(20) DEFAULT NULL COMMENT '虚拟发货方式: none-无需发货, card_key-卡密发货, resource_link-网盘资源'"
      },
      {
        name: 'card_key_template',
        sql: "ALTER TABLE products ADD COLUMN card_key_template TEXT DEFAULT NULL COMMENT '卡密模板说明'"
      },
      {
        name: 'resource_link_template',
        sql: "ALTER TABLE products ADD COLUMN resource_link_template TEXT DEFAULT NULL COMMENT '资源链接模板'"
      },
      {
        name: 'virtual_content_encrypt',
        sql: "ALTER TABLE products ADD COLUMN virtual_content_encrypt TINYINT(1) DEFAULT 0 COMMENT '虚拟内容是否加密显示'"
      }
    ];

    for (const field of fieldsToAdd) {
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = ?`,
        [dbName, field.name]
      );

      if (columns.length === 0) {
        await connection.execute(field.sql);
        console.log(`✅ 已添加 ${field.name} 列`);
      } else {
        console.log(`⏭️  ${field.name} 列已存在，跳过`);
      }
    }

    console.log('\n✅ products表虚拟商品字段迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();

