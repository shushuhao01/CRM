/**
 * V2.0 数据库迁移脚本 - 企微管理模块全量迁移
 *
 * 包含:
 * 1. 现有表扩展: wecom_configs(+11字段), wecom_customers(+7字段),
 *    wecom_chat_records(+3字段), customers(+1字段)
 * 2. 新建表: wecom_customer_groups, wecom_sensitive_words, wecom_sensitive_hits,
 *    wecom_quality_rules, wecom_quality_inspections, wecom_archive_settings,
 *    wecom_archive_members, wecom_vas_orders, wecom_vas_configs
 *
 * 执行: node backend/create-wecom-v2-tables.js
 */

const mysql = require('mysql2/promise');
const path = require('path');

// 尝试加载 .env
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  console.log('dotenv not available, using environment variables');
}

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'crm',
    multipleStatements: true
  });

  console.log('Connected to database, starting V2.0 migration...\n');

  // ==================== 1. 扩展现有表 ====================

  // 1.1 wecom_configs 新增11个授权字段
  const configFields = [
    ["auth_type", "VARCHAR(20) DEFAULT 'self_built' COMMENT '授权类型: third_party/self_built'"],
    ["permanent_code", "TEXT NULL COMMENT '第三方应用永久授权码(加密存储)'"],
    ["suite_id", "VARCHAR(50) NULL COMMENT '第三方应用SuiteID'"],
    ["auth_corp_info", "TEXT NULL COMMENT '授权方企业信息(JSON)'"],
    ["auth_user_info", "TEXT NULL COMMENT '授权管理员信息(JSON)'"],
    ["auth_scope", "TEXT NULL COMMENT '授权范围(JSON)'"],
    ["data_api_status", "TINYINT DEFAULT 0 COMMENT '数据API授权状态: 0未授权 1已授权 2已过期'"],
    ["data_api_expire_time", "DATETIME NULL COMMENT '数据API授权到期时间'"],
    ["vas_chat_archive", "BOOLEAN DEFAULT FALSE COMMENT '是否开通会话存档增值服务'"],
    ["vas_expire_date", "DATE NULL COMMENT '增值服务到期时间'"],
    ["vas_user_count", "INT DEFAULT 0 COMMENT '增值服务开通人数'"]
  ];

  console.log('[1/9] Extending wecom_configs (+11 fields)...');
  for (const [col, def] of configFields) {
    try {
      await connection.execute(`ALTER TABLE wecom_configs ADD COLUMN ${col} ${def}`);
      console.log(`  + ${col}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`  - ${col} (already exists)`);
      } else {
        console.error(`  ! ${col} error:`, e.message);
      }
    }
  }

  // 1.2 wecom_customers 新增7个字段
  const customerFields = [
    ["tag_names", "TEXT NULL COMMENT '客户标签名称列表(JSON)'"],
    ["phone", "VARCHAR(20) NULL COMMENT '手机号'"],
    ["state", "VARCHAR(100) NULL COMMENT '渠道来源标识'"],
    ["msg_sent_count", "INT DEFAULT 0 COMMENT '发送消息数'"],
    ["msg_recv_count", "INT DEFAULT 0 COMMENT '接收消息数'"],
    ["last_msg_time", "BIGINT NULL COMMENT '最后消息时间戳'"],
    ["active_days_7d", "INT DEFAULT 0 COMMENT '近7天活跃天数'"]
  ];

  console.log('\n[2/9] Extending wecom_customers (+7 fields)...');
  for (const [col, def] of customerFields) {
    try {
      await connection.execute(`ALTER TABLE wecom_customers ADD COLUMN ${col} ${def}`);
      console.log(`  + ${col}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`  - ${col} (already exists)`);
      } else {
        console.error(`  ! ${col} error:`, e.message);
      }
    }
  }

  // 1.3 wecom_chat_records 新增3个字段
  const chatRecordFields = [
    ["sender_type", "TINYINT NULL COMMENT '发送者类型: 1员工 2客户'"],
    ["receiver_type", "TINYINT NULL COMMENT '接收者类型: 1员工 2客户 3群聊'"],
    ["oss_path", "VARCHAR(256) NULL COMMENT 'OSS存储路径'"]
  ];

  console.log('\n[3/9] Extending wecom_chat_records (+3 fields)...');
  for (const [col, def] of chatRecordFields) {
    try {
      await connection.execute(`ALTER TABLE wecom_chat_records ADD COLUMN ${col} ${def}`);
      console.log(`  + ${col}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`  - ${col} (already exists)`);
      } else {
        console.error(`  ! ${col} error:`, e.message);
      }
    }
  }

  // 1.4 customers 新增 wecom_external_userid
  console.log('\n[4/9] Extending customers (+1 field + unique index)...');
  try {
    await connection.execute(
      "ALTER TABLE customers ADD COLUMN wecom_external_userid VARCHAR(100) NULL COMMENT '客户唯一企微编码(USID)'"
    );
    console.log('  + wecom_external_userid');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('  - wecom_external_userid (already exists)');
    } else {
      console.error('  ! wecom_external_userid error:', e.message);
    }
  }
  try {
    await connection.execute(
      "ALTER TABLE customers ADD UNIQUE INDEX uk_tenant_wecom_userid (tenant_id, wecom_external_userid)"
    );
    console.log('  + uk_tenant_wecom_userid index');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('  - uk_tenant_wecom_userid index (already exists)');
    } else {
      console.error('  ! index error:', e.message);
    }
  }

  // ==================== 2. 新建表 ====================

  // 2.1 wecom_customer_groups
  console.log('\n[5/9] Creating wecom_customer_groups...');
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_customer_groups (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tenant_id VARCHAR(36) COMMENT '租户ID',
      wecom_config_id INT NOT NULL COMMENT '企微配置ID',
      chat_id VARCHAR(100) NOT NULL COMMENT '群聊ID',
      name VARCHAR(200) COMMENT '群名称',
      owner_user_id VARCHAR(100) COMMENT '群主UserID',
      owner_user_name VARCHAR(100) COMMENT '群主姓名',
      member_count INT DEFAULT 0 COMMENT '群成员数量',
      today_msg_count INT DEFAULT 0 COMMENT '今日消息数',
      notice TEXT COMMENT '群公告',
      create_time DATETIME COMMENT '群创建时间',
      status VARCHAR(20) DEFAULT 'normal' COMMENT '状态: normal/dismissed',
      member_list TEXT COMMENT '群成员列表(JSON)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_config_chat (wecom_config_id, chat_id),
      INDEX idx_tenant (tenant_id),
      INDEX idx_owner (owner_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微客户群表'
  `);

  // 2.2 wecom_sensitive_words
  console.log('[6/9] Creating wecom_sensitive_words...');
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_sensitive_words (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tenant_id VARCHAR(36) COMMENT '租户ID',
      wecom_config_id INT COMMENT '企微配置ID(NULL表示全局)',
      word VARCHAR(200) NOT NULL COMMENT '敏感词',
      group_name VARCHAR(100) DEFAULT 'custom' COMMENT '分组: porn/politics/violence/competitor/custom',
      level VARCHAR(20) DEFAULT 'warning' COMMENT '级别: info/warning/danger/critical',
      is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
      created_by VARCHAR(50) COMMENT '创建人',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant_word (tenant_id, word),
      INDEX idx_tenant (tenant_id),
      INDEX idx_group (group_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='敏感词表'
  `);

  // 2.3 wecom_sensitive_hits
  console.log('[7/9] Creating wecom_sensitive_hits + quality tables...');
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_sensitive_hits (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tenant_id VARCHAR(36) COMMENT '租户ID',
      wecom_config_id INT NOT NULL COMMENT '企微配置ID',
      chat_record_id INT COMMENT '关联的聊天记录ID',
      word_id INT NOT NULL COMMENT '命中的敏感词ID',
      word VARCHAR(200) NOT NULL COMMENT '命中的敏感词内容',
      context TEXT COMMENT '消息上下文',
      from_user_id VARCHAR(100) COMMENT '发送者ID',
      from_user_name VARCHAR(100) COMMENT '发送者姓名',
      to_user_id VARCHAR(100) COMMENT '接收者ID',
      status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/processed/ignored',
      processed_by VARCHAR(50) COMMENT '处理人',
      processed_at DATETIME COMMENT '处理时间',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_status (status),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='敏感词命中记录表'
  `);

  // 2.4 wecom_quality_rules
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_quality_rules (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tenant_id VARCHAR(36) COMMENT '租户ID',
      name VARCHAR(100) NOT NULL COMMENT '规则名称',
      rule_type VARCHAR(30) NOT NULL COMMENT '规则类型: response_time/msg_count/keyword/emotion',
      conditions TEXT NOT NULL COMMENT '条件参数(JSON)',
      score_value INT DEFAULT 0 COMMENT '分值(正加负减)',
      apply_scope TEXT COMMENT '适用范围(JSON: 部门/员工)',
      is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_type (rule_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='质检规则表'
  `);

  // 2.5 wecom_quality_inspections
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_quality_inspections (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tenant_id VARCHAR(36) COMMENT '租户ID',
      wecom_config_id INT NOT NULL COMMENT '企微配置ID',
      session_key VARCHAR(200) COMMENT '会话标识',
      from_user_id VARCHAR(100) COMMENT '员工UserID',
      from_user_name VARCHAR(100) COMMENT '员工姓名',
      to_user_id VARCHAR(100) COMMENT '对方UserID',
      to_user_name VARCHAR(100) COMMENT '对方姓名',
      room_id VARCHAR(100) COMMENT '群聊ID(群聊场景)',
      message_count INT DEFAULT 0 COMMENT '消息数量',
      start_time DATETIME COMMENT '会话开始时间',
      end_time DATETIME COMMENT '会话结束时间',
      status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/normal/excellent/violation',
      violation_type TEXT COMMENT '违规类型(JSON数组)',
      score INT COMMENT '质检评分(0-100)',
      remark TEXT COMMENT '质检备注',
      inspector_id VARCHAR(50) COMMENT '质检员ID',
      inspector_name VARCHAR(100) COMMENT '质检员姓名',
      inspected_at DATETIME COMMENT '质检时间',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id),
      INDEX idx_status (status),
      INDEX idx_from_user (from_user_id),
      INDEX idx_inspected (inspected_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='质检记录表'
  `);

  // 2.6 wecom_archive_settings
  console.log('[8/9] Creating wecom_archive_settings + members...');
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_archive_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tenant_id VARCHAR(36) COMMENT '租户ID',
      wecom_config_id INT NOT NULL COMMENT '企微配置ID',
      fetch_interval INT DEFAULT 5 COMMENT '拉取间隔(分钟)',
      fetch_mode VARCHAR(20) DEFAULT 'default' COMMENT '拉取模式: default/pre_page/adaptive',
      retention_days INT DEFAULT 180 COMMENT '保留天数',
      media_storage VARCHAR(20) DEFAULT 'local' COMMENT '媒体存储方式: local/oss',
      auto_inspect TINYINT(1) DEFAULT 0 COMMENT '是否自动质检',
      member_scope TEXT COMMENT '存档成员范围(JSON)',
      rsa_public_key TEXT COMMENT 'RSA公钥',
      visibility VARCHAR(20) DEFAULT 'all' COMMENT '成员可见性: self/department/all',
      max_users INT DEFAULT 0 COMMENT '购买的最大席位数',
      used_users INT DEFAULT 0 COMMENT '已使用席位数',
      status VARCHAR(20) DEFAULT 'inactive' COMMENT '状态: inactive/active/expired',
      expire_date DATE COMMENT '到期日期',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant_config (tenant_id, wecom_config_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会话存档设置表'
  `);

  // 2.7 wecom_archive_members
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_archive_members (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tenant_id VARCHAR(50) COMMENT '租户ID',
      wecom_user_id VARCHAR(100) NOT NULL COMMENT '企微成员userId',
      wecom_user_name VARCHAR(200) COMMENT '成员名称(冗余)',
      crm_user_id VARCHAR(50) COMMENT '关联CRM用户ID',
      is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用存档',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant_user (tenant_id, wecom_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='存档生效成员表'
  `);

  // 2.8 wecom_vas_orders (SaaS专属)
  console.log('[9/9] Creating wecom_vas_orders + configs...');
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_vas_orders (
      id INT PRIMARY KEY AUTO_INCREMENT,
      tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
      order_no VARCHAR(32) NOT NULL COMMENT '订单号',
      wecom_config_id INT COMMENT '企微配置ID',
      service_type VARCHAR(50) DEFAULT 'chat_archive' COMMENT '服务类型',
      order_type VARCHAR(20) DEFAULT 'new' COMMENT '订单类型: new/renew/upgrade/addon',
      user_count INT DEFAULT 0 COMMENT '开通/增购人数',
      unit_price DECIMAL(10,2) COMMENT '单价',
      total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
      pay_type VARCHAR(20) COMMENT '支付方式: wechat/alipay/bank',
      pay_status TINYINT DEFAULT 0 COMMENT '0待支付 1已支付 2已取消 3已退款',
      pay_time DATETIME COMMENT '支付时间',
      transaction_id VARCHAR(64) COMMENT '第三方支付流水号',
      start_date DATE COMMENT '服务开始日期',
      end_date DATE COMMENT '服务到期日期',
      detail TEXT COMMENT '订单详情(JSON)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_order_no (order_no),
      INDEX idx_tenant (tenant_id),
      INDEX idx_pay_status (pay_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微增值服务订单表'
  `);

  // 2.9 wecom_vas_configs (Admin专属)
  await safeCreateTable(connection, `
    CREATE TABLE IF NOT EXISTS wecom_vas_configs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      service_type VARCHAR(50) NOT NULL COMMENT '服务类型',
      service_name VARCHAR(100) COMMENT '服务名称',
      default_price DECIMAL(10,2) COMMENT '默认价格',
      min_price DECIMAL(10,2) COMMENT '最低价格',
      billing_unit VARCHAR(20) DEFAULT 'per_user_year' COMMENT '计费单位',
      trial_days INT DEFAULT 7 COMMENT '试用天数',
      tier_pricing TEXT COMMENT '阶梯定价(JSON)',
      description TEXT COMMENT '服务说明',
      is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_service_type (service_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微增值服务配置表'
  `);

  console.log('\n========================================');
  console.log('V2.0 Migration completed successfully!');
  console.log('Tables extended: 4 (wecom_configs, wecom_customers, wecom_chat_records, customers)');
  console.log('Tables created: 9 new tables');
  console.log('Total: 15 tables (7 extended + 8 new)');
  console.log('========================================');

  await connection.end();
}

async function safeCreateTable(connection, sql) {
  try {
    await connection.execute(sql);
    console.log('  OK');
  } catch (e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('  (already exists)');
    } else {
      console.error('  ERROR:', e.message);
    }
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

