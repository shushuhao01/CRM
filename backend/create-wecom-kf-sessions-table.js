/**
 * 数据库迁移：创建企微客服会话记录表
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

  console.log('[Migration] Creating wecom_kf_sessions table...');

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS wecom_kf_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL COMMENT '租户ID',
      wecom_config_id INT NOT NULL COMMENT '企微配置ID',
      open_kf_id VARCHAR(100) NOT NULL COMMENT '客服账号ID',
      external_userid VARCHAR(100) NOT NULL COMMENT '客户external_userid',
      customer_name VARCHAR(200) NULL COMMENT '客户名称',
      servicer_userid VARCHAR(100) NULL COMMENT '接待人员userid',
      servicer_name VARCHAR(200) NULL COMMENT '接待人员名称',
      session_status VARCHAR(20) DEFAULT 'open' COMMENT '会话状态: open/closed/timeout',
      msg_count INT DEFAULT 0 COMMENT '消息总数',
      first_response_time INT NULL COMMENT '首次响应时长(秒)',
      avg_response_time INT NULL COMMENT '平均响应时长(秒)',
      satisfaction TINYINT NULL COMMENT '满意度评分(1-5)',
      last_msg_content TEXT NULL COMMENT '最后一条消息内容',
      last_msg_time DATETIME NULL COMMENT '最后消息时间',
      session_start_time DATETIME NULL COMMENT '会话开始时间',
      session_end_time DATETIME NULL COMMENT '会话结束时间',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      INDEX idx_tenant_config (tenant_id, wecom_config_id),
      INDEX idx_open_kf_id (open_kf_id),
      INDEX idx_session_status (session_status),
      INDEX idx_servicer_userid (servicer_userid),
      INDEX idx_session_start_time (session_start_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客服会话记录表'
  `);

  console.log('[Migration] wecom_kf_sessions table created successfully.');
  await connection.end();
}

run().catch(err => {
  console.error('[Migration] Error:', err);
  process.exit(1);
});

