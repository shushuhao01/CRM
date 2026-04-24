/**
 * 创建虚拟商品领取配置和邮箱配置表
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm_db'
  });

  console.log('创建 virtual_claim_settings 表...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS virtual_claim_settings (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) NOT NULL,
      delivery_mode VARCHAR(20) DEFAULT 'link' COMMENT '发货方式: link/manual',
      claim_link_expiry_days INT DEFAULT 30 COMMENT '链接有效天数',
      login_methods VARCHAR(50) DEFAULT 'password' COMMENT '登录方式: sms/password/sms,password',
      initial_password VARCHAR(100) DEFAULT '123456' COMMENT '初始登录密码',
      claim_page_notice TEXT COMMENT '领取页提示语',
      email_enabled TINYINT(1) DEFAULT 0 COMMENT '是否开启邮件',
      email_source VARCHAR(20) DEFAULT 'official' COMMENT '邮箱来源: official/custom',
      email_content_mode VARCHAR(20) DEFAULT 'link' COMMENT '邮件内容模式: link/content/both',
      email_auto_send TINYINT(1) DEFAULT 0 COMMENT '自动发送邮件',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='虚拟商品领取配置';
  `);

  console.log('创建 tenant_email_config 表...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS tenant_email_config (
      id VARCHAR(36) PRIMARY KEY,
      tenant_id VARCHAR(36) NOT NULL,
      smtp_host VARCHAR(200) NOT NULL COMMENT 'SMTP服务器',
      smtp_port INT DEFAULT 465 COMMENT 'SMTP端口',
      encryption VARCHAR(10) DEFAULT 'ssl' COMMENT '加密方式: ssl/tls/none',
      sender_email VARCHAR(200) NOT NULL COMMENT '发件邮箱',
      sender_password VARCHAR(500) NOT NULL COMMENT '邮箱密码/授权码',
      sender_name VARCHAR(100) DEFAULT '' COMMENT '发件人名称',
      is_verified TINYINT(1) DEFAULT 0 COMMENT '是否已验证',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户自定义邮箱配置';
  `);

  console.log('✅ 虚拟商品配置表创建完成');
  await connection.end();
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});

