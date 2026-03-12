/**
 * 执行admin_users表更新迁移
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local',
    multipleStatements: true
  });

  try {
    console.log('开始执行admin_users表更新迁移...\n');

    // 检查并添加avatar字段
    const [avatarCol] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'crm_local' AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'avatar'"
    );
    if (avatarCol.length === 0) {
      await connection.query("ALTER TABLE admin_users ADD COLUMN avatar VARCHAR(255) COMMENT '头像' AFTER phone");
      console.log('✅ 添加avatar字段');
    } else {
      console.log('⏭️  avatar字段已存在');
    }

    // 检查并添加login_count字段
    const [loginCountCol] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'crm_local' AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'login_count'"
    );
    if (loginCountCol.length === 0) {
      await connection.query("ALTER TABLE admin_users ADD COLUMN login_count INT DEFAULT 0 COMMENT '登录次数' AFTER last_login_ip");
      console.log('✅ 添加login_count字段');
    } else {
      console.log('⏭️  login_count字段已存在');
    }

    // 更新status字段
    await connection.query("ALTER TABLE admin_users MODIFY COLUMN status ENUM('active', 'inactive', 'locked', 'disabled') DEFAULT 'active' COMMENT '状态'");
    console.log('✅ 更新status字段');

    // 创建admin_operation_logs表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_operation_logs (
        id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
        admin_id VARCHAR(36) NOT NULL COMMENT '管理员ID',
        admin_name VARCHAR(50) COMMENT '管理员名称',
        operation VARCHAR(100) NOT NULL COMMENT '操作类型',
        module VARCHAR(50) COMMENT '操作模块',
        description TEXT COMMENT '操作描述',
        request_method VARCHAR(10) COMMENT '请求方法',
        request_url VARCHAR(255) COMMENT '请求URL',
        request_params TEXT COMMENT '请求参数',
        response_status INT COMMENT '响应状态码',
        ip_address VARCHAR(50) COMMENT 'IP地址',
        user_agent TEXT COMMENT 'User Agent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_admin_id (admin_id),
        INDEX idx_operation (operation),
        INDEX idx_module (module),
        INDEX idx_created_at (created_at),
        INDEX idx_ip_address (ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作日志表'
    `);
    console.log('✅ 创建admin_operation_logs表');

    // 验证更新
    const [columns] = await connection.query('DESCRIBE admin_users');
    console.log(`\n📊 admin_users表字段 (${columns.length}个):`);
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });

    // 检查admin_operation_logs表
    const [logTables] = await connection.query("SHOW TABLES LIKE 'admin_operation_logs'");
    if (logTables.length > 0) {
      console.log('\n✅ admin_operation_logs表已创建');
    }

    console.log('\n✅ 迁移执行完成！');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

executeMigration().catch(console.error);
