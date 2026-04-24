/**
 * 添加会话存档授权字段到 tenants 和 licenses 表
 * 运行: cd backend && node add-chat-archive-auth-column.js
 */
const mysql = require('mysql2/promise');

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USERNAME || process.env.DB_USER || 'abc789',
      password: process.env.DB_PASSWORD || 'YtZWJPF2bpsCscHX',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm_local'
    });

    console.log('✅ 数据库连接成功');

    // === 1. tenants 表添加 wecom_chat_archive_auth 字段 ===
    const [tenantCols] = await connection.query(
      "SHOW COLUMNS FROM tenants LIKE 'wecom_chat_archive_auth'"
    );
    if (tenantCols.length === 0) {
      await connection.query(
        "ALTER TABLE tenants ADD COLUMN wecom_chat_archive_auth TINYINT(1) NOT NULL DEFAULT 0 COMMENT '会话存档功能授权(0=未授权,1=已授权)'"
      );
      console.log('✅ tenants 表已添加 wecom_chat_archive_auth 字段');
    } else {
      console.log('⚠️  tenants 表已存在 wecom_chat_archive_auth 字段');
    }

    // === 2. licenses 表添加 wecom_chat_archive_auth 字段 ===
    const [licenseCols] = await connection.query(
      "SHOW COLUMNS FROM licenses LIKE 'wecom_chat_archive_auth'"
    );
    if (licenseCols.length === 0) {
      await connection.query(
        "ALTER TABLE licenses ADD COLUMN wecom_chat_archive_auth TINYINT(1) NOT NULL DEFAULT 0 COMMENT '会话存档功能授权(0=未授权,1=已授权)'"
      );
      console.log('✅ licenses 表已添加 wecom_chat_archive_auth 字段');
    } else {
      console.log('⚠️  licenses 表已存在 wecom_chat_archive_auth 字段');
    }

    console.log('\n✅ 迁移完成！');
    console.log('   - tenants.wecom_chat_archive_auth: 控制SaaS租户的会话存档授权');
    console.log('   - licenses.wecom_chat_archive_auth: 控制私有客户的会话存档授权');

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main();

