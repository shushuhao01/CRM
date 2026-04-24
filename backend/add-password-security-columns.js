/**
 * 添加密码安全策略字段到 users 表
 * 运行: node add-password-security-columns.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm'
  });

  console.log('🔗 数据库连接成功');

  try {
    // 检查 password_last_changed 列是否存在
    const [cols1] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_last_changed'`
    );
    if (cols1.length === 0) {
      await connection.query(`ALTER TABLE users ADD COLUMN password_last_changed DATETIME NULL DEFAULT NULL`);
      console.log('✅ 已添加 password_last_changed 列');
    } else {
      console.log('⏭️ password_last_changed 列已存在');
    }

    // 检查 need_change_password 列是否存在
    const [cols2] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'need_change_password'`
    );
    if (cols2.length === 0) {
      await connection.query(`ALTER TABLE users ADD COLUMN need_change_password TINYINT NULL DEFAULT 1`);
      console.log('✅ 已添加 need_change_password 列');
    } else {
      console.log('⏭️ need_change_password 列已存在');
    }

    console.log('🎉 密码安全策略字段迁移完成');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();

