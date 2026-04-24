/**
 * 企微管理 V4.0 数据库迁移脚本
 * 创建日期: 2026-04-15
 *
 * 新增表:
 *   - wecom_auto_match_suggestions (自动匹配建议)
 *   - wecom_group_templates (群模板)
 *   - wecom_acquisition_smart_rules (智能上下线规则)
 *   - wecom_contact_ways (活码)
 *   - wecom_contact_way_daily_stats (活码每日统计)
 *   - wecom_customer_events (客户事件)
 *   - wecom_ai_models (AI模型配置)
 *   - wecom_ai_agents (智能体配置)
 *   - wecom_ai_inspect_strategies (AI质检策略)
 *   - wecom_ai_inspect_results (AI质检结果)
 *   - wecom_knowledge_bases (知识库)
 *   - wecom_knowledge_entries (知识条目)
 *   - wecom_script_categories (话术分类)
 *   - wecom_scripts (话术)
 *   - wecom_ai_logs (AI调用日志)
 *   - wecom_sidebar_auth_codes (侧边栏授权码)
 *   - wecom_department_mappings (部门映射)
 *
 * 修改表:
 *   - wecom_configs 新增 auth_mode, auth_corp_name, auth_admin_user_id, auth_time
 */

const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env.database') });

async function getConnection() {
  let connection;
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (dbType === 'mysql') {
    const mysql = require('mysql2/promise');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm',
      charset: 'utf8mb4'
    });
    return { type: 'mysql', conn: connection };
  } else {
    const Database = require('better-sqlite3');
    const dbPath = process.env.DB_DATABASE || path.join(__dirname, '..', 'database', 'crm.db');
    connection = new Database(dbPath);
    connection.pragma('journal_mode = WAL');
    return { type: 'sqlite', conn: connection };
  }
}

async function runMySQLMigration(conn) {
  const tables = [
    // 1. 自动匹配建议表
    `CREATE TABLE IF NOT EXISTS wecom_auto_match_suggestions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      wecom_customer_id INT NOT NULL COMMENT '企微客户ID',
      crm_customer_id VARCHAR(50) NOT NULL COMMENT 'CRM客户ID',
      match_type ENUM('phone', 'name') NOT NULL DEFAULT 'phone' COMMENT '匹配方式',
      match_field VARCHAR(100) NULL COMMENT '匹配的值(如手机号)',
      confidence ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium' COMMENT '置信度',
      status ENUM('pending', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '状态',
      confirmed_by VARCHAR(50) NULL COMMENT '确认人',
      confirmed_at DATETIME NULL COMMENT '确认时间',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant_wecom_crm (tenant_id, wecom_customer_id, crm_customer_id),
      INDEX idx_tenant_status (tenant_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微自动匹配建议表'`,

    // 2. 群模板表
    `CREATE TABLE IF NOT EXISTS wecom_group_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      wecom_config_id INT NOT NULL COMMENT '企微配置ID',
      template_name VARCHAR(100) NOT NULL COMMENT '模板名称',
      group_name_prefix VARCHAR(100) NULL COMMENT '群名前缀',
      max_members INT DEFAULT 200 COMMENT '最大成员数',
      owner_user_id VARCHAR(100) NULL COMMENT '群主UserID',
      welcome_enabled TINYINT(1) DEFAULT 0 COMMENT '是否启用欢迎语',
      welcome_text TEXT NULL COMMENT '欢迎语内容',
      welcome_media_type ENUM('none','image','link','miniprogram') DEFAULT 'none' COMMENT '欢迎语附件类型',
      welcome_media_content JSON NULL COMMENT '欢迎语附件内容',
      anti_spam_enabled TINYINT(1) DEFAULT 0 COMMENT '是否启用防骚扰',
      anti_spam_rules JSON NULL COMMENT '防骚扰规则',
      notice_template TEXT NULL COMMENT '群公告模板',
      auto_tags JSON NULL COMMENT '自动标签',
      is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_config (tenant_id, wecom_config_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微群模板表'`,

    // 3. 智能上下线规则表
    `CREATE TABLE IF NOT EXISTS wecom_acquisition_smart_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      link_id INT NOT NULL COMMENT '获客链接ID',
      daily_limit_enabled TINYINT(1) DEFAULT 0,
      daily_limit_per_user INT DEFAULT 50,
      daily_limit_action ENUM('offline','reduce_weight') DEFAULT 'offline',
      work_time_enabled TINYINT(1) DEFAULT 0,
      work_time_start VARCHAR(10) DEFAULT '09:00',
      work_time_end VARCHAR(10) DEFAULT '18:00',
      work_days JSON NULL COMMENT '工作日[1,2,3,4,5]',
      slow_reply_enabled TINYINT(1) DEFAULT 0,
      slow_reply_minutes INT DEFAULT 30,
      slow_reply_action ENUM('offline','reduce_weight') DEFAULT 'offline',
      loss_rate_enabled TINYINT(1) DEFAULT 0,
      loss_rate_threshold INT DEFAULT 30,
      next_day_auto_online TINYINT(1) DEFAULT 1,
      next_day_online_time VARCHAR(10) DEFAULT '09:00',
      next_day_exclude_manual TINYINT(1) DEFAULT 0,
      next_day_exclude_loss_rate TINYINT(1) DEFAULT 0,
      schedule_enabled TINYINT(1) DEFAULT 0,
      schedule_config JSON NULL COMMENT '排班配置',
      dept_quota_enabled TINYINT(1) DEFAULT 0,
      dept_quotas JSON NULL COMMENT '部门配额配置',
      dept_overflow_enabled TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_link (tenant_id, link_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='获客助手智能上下线规则表'`,

    // 4. 活码表
    `CREATE TABLE IF NOT EXISTS wecom_contact_ways (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      wecom_config_id INT NOT NULL,
      config_id VARCHAR(100) NULL COMMENT '企微返回的config_id',
      name VARCHAR(200) NOT NULL COMMENT '活码名称',
      type INT DEFAULT 1 COMMENT '1=单人/多人 2=群聊',
      scene INT DEFAULT 2 COMMENT '1=小程序 2=二维码',
      style INT DEFAULT 0 COMMENT '样式0-3',
      state VARCHAR(100) NULL COMMENT '渠道标识',
      remark VARCHAR(500) NULL,
      skip_verify TINYINT(1) DEFAULT 1 COMMENT '跳过验证',
      user_ids JSON NULL COMMENT '接待成员列表',
      party_ids JSON NULL COMMENT '接待部门列表',
      is_temp TINYINT(1) DEFAULT 0 COMMENT '是否临时活码',
      qr_code VARCHAR(500) NULL COMMENT '二维码链接',
      welcome_enabled TINYINT(1) DEFAULT 0,
      welcome_config JSON NULL COMMENT '欢迎语配置',
      auto_tags JSON NULL COMMENT '自动标签',
      weight_mode ENUM('single','round_robin','weighted') DEFAULT 'single' COMMENT '分配模式',
      user_weights JSON NULL COMMENT '成员权重配置',
      smart_rule_id INT NULL COMMENT '智能规则ID',
      auto_group_enabled TINYINT(1) DEFAULT 0,
      auto_group_config JSON NULL COMMENT '自动建群配置',
      total_add_count INT DEFAULT 0 COMMENT '总添加数',
      total_loss_count INT DEFAULT 0 COMMENT '总流失数',
      is_enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_config (tenant_id, wecom_config_id),
      INDEX idx_config_id (config_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微活码表'`,

    // 5. 活码每日统计表
    `CREATE TABLE IF NOT EXISTS wecom_contact_way_daily_stats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      contact_way_id INT NOT NULL COMMENT '活码ID',
      stat_date DATE NOT NULL COMMENT '统计日期',
      add_count INT DEFAULT 0 COMMENT '添加数',
      loss_count INT DEFAULT 0 COMMENT '流失数',
      net_count INT DEFAULT 0 COMMENT '净增数',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_contact_date (tenant_id, contact_way_id, stat_date),
      INDEX idx_contact_way (contact_way_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活码每日统计表'`,

    // 6. 客户事件表
    `CREATE TABLE IF NOT EXISTS wecom_customer_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      wecom_config_id INT NOT NULL,
      external_user_id VARCHAR(100) NOT NULL,
      event_type ENUM('add','delete','tag','link','group_join','group_leave','crm_link') NOT NULL,
      event_detail JSON NULL COMMENT '事件详情',
      operator_id VARCHAR(100) NULL COMMENT '操作人',
      event_time DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant_external_time (tenant_id, external_user_id, event_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微客户事件表'`,

    // 7. AI模型配置表
    `CREATE TABLE IF NOT EXISTS wecom_ai_models (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      model_name VARCHAR(100) NOT NULL COMMENT '模型名称',
      provider ENUM('openai','azure','claude','deepseek','qwen','custom') NOT NULL DEFAULT 'openai',
      api_url VARCHAR(500) NULL COMMENT 'API地址',
      api_key VARCHAR(500) NULL COMMENT 'API密钥(加密)',
      model_id VARCHAR(100) NULL COMMENT '模型标识',
      temperature DECIMAL(3,2) DEFAULT 0.70,
      max_tokens INT DEFAULT 4096,
      top_p DECIMAL(3,2) DEFAULT 1.00,
      is_default TINYINT(1) DEFAULT 0,
      is_enabled TINYINT(1) DEFAULT 1,
      last_test_time DATETIME NULL,
      last_test_status VARCHAR(20) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI模型配置表'`,

    // 8. 智能体配置表
    `CREATE TABLE IF NOT EXISTS wecom_ai_agents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      agent_name VARCHAR(100) NOT NULL COMMENT '智能体名称',
      usages JSON NULL COMMENT '用途列表',
      model_id INT NULL COMMENT '关联AI模型ID',
      knowledge_base_ids JSON NULL COMMENT '关联知识库ID列表',
      system_prompt TEXT NULL COMMENT '系统提示词',
      max_msg_per_analysis INT DEFAULT 50,
      context_window INT DEFAULT 8000,
      output_format ENUM('json','text','markdown') DEFAULT 'json',
      retry_count INT DEFAULT 3,
      timeout_seconds INT DEFAULT 30,
      is_enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI智能体配置表'`,

    // 9. AI质检策略表
    `CREATE TABLE IF NOT EXISTS wecom_ai_inspect_strategies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      strategy_name VARCHAR(100) NOT NULL,
      detect_types JSON NULL COMMENT '检测类型',
      scope VARCHAR(20) DEFAULT 'all' COMMENT '适用范围',
      scope_config JSON NULL COMMENT '范围配置',
      max_score INT DEFAULT 100,
      deduct_rules JSON NULL COMMENT '扣分规则',
      risk_levels JSON NULL COMMENT '风险等级配置',
      ai_model_id INT NULL COMMENT '关联AI模型ID',
      prompt_template TEXT NULL COMMENT '提示词模板',
      is_enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI质检策略表'`,

    // 10. AI质检结果表
    `CREATE TABLE IF NOT EXISTS wecom_ai_inspect_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      strategy_id INT NULL COMMENT '策略ID',
      conversation_id VARCHAR(100) NULL COMMENT '会话ID',
      employee_user_id VARCHAR(100) NULL,
      employee_name VARCHAR(100) NULL,
      customer_user_id VARCHAR(100) NULL,
      customer_name VARCHAR(100) NULL,
      total_score INT NULL COMMENT '总分',
      dimension_scores JSON NULL COMMENT '维度评分',
      highlights JSON NULL COMMENT '亮点',
      improvements JSON NULL COMMENT '待改进',
      risks JSON NULL COMMENT '风险',
      ai_suggestion TEXT NULL COMMENT 'AI建议',
      risk_level ENUM('excellent','pass','fail') NULL COMMENT '风险等级',
      analyzed_msg_count INT NULL,
      analyzed_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant_strategy (tenant_id, strategy_id),
      INDEX idx_tenant_employee (tenant_id, employee_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI质检结果表'`,

    // 11. 知识库表
    `CREATE TABLE IF NOT EXISTS wecom_knowledge_bases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      document_count INT DEFAULT 0,
      entry_count INT DEFAULT 0,
      total_size BIGINT DEFAULT 0,
      index_status ENUM('pending','indexing','indexed','failed') DEFAULT 'pending',
      last_index_time DATETIME NULL,
      sync_crm_enabled TINYINT(1) DEFAULT 0,
      sync_crm_sources JSON NULL,
      sync_frequency ENUM('daily','manual') DEFAULT 'manual',
      is_enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库表'`,

    // 12. 知识条目表
    `CREATE TABLE IF NOT EXISTS wecom_knowledge_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      knowledge_base_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT NULL,
      tags JSON NULL,
      source_type ENUM('manual','document','crm_sync') DEFAULT 'manual',
      source_file VARCHAR(500) NULL,
      embedding TEXT NULL,
      is_enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_kb (tenant_id, knowledge_base_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识条目表'`,

    // 13. 话术分类表
    `CREATE TABLE IF NOT EXISTS wecom_script_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      name VARCHAR(100) NOT NULL,
      sort_order INT DEFAULT 0,
      is_enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='话术分类表'`,

    // 14. 话术表
    `CREATE TABLE IF NOT EXISTS wecom_scripts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      category_id INT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT NULL,
      shortcut VARCHAR(50) NULL COMMENT '快捷短语',
      attachments JSON NULL,
      tags JSON NULL,
      use_count INT DEFAULT 0,
      ai_rewrite_enabled TINYINT(1) DEFAULT 0,
      is_enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_category (tenant_id, category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='话术表'`,

    // 15. AI调用日志表
    `CREATE TABLE IF NOT EXISTS wecom_ai_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      agent_id INT NULL,
      agent_name VARCHAR(100) NULL,
      operation_type VARCHAR(50) NULL COMMENT '操作类型',
      target_description VARCHAR(500) NULL COMMENT '目标描述',
      input_tokens INT DEFAULT 0,
      output_tokens INT DEFAULT 0,
      total_tokens INT DEFAULT 0,
      duration_ms INT DEFAULT 0,
      status ENUM('success','fail','timeout') DEFAULT 'success',
      error_message TEXT NULL,
      request_payload TEXT NULL,
      response_payload TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_tenant_time (tenant_id, created_at),
      INDEX idx_tenant_agent (tenant_id, agent_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI调用日志表'`,

    // 16. 侧边栏授权码表
    `CREATE TABLE IF NOT EXISTS wecom_sidebar_auth_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      code VARCHAR(100) NOT NULL COMMENT '授权码',
      code_type ENUM('single','multi','permanent') DEFAULT 'single',
      max_uses INT DEFAULT 1,
      used_count INT DEFAULT 0,
      expire_at DATETIME NULL,
      created_by VARCHAR(50) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_code (code),
      INDEX idx_tenant (tenant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='侧边栏授权码表'`,

    // 17. 部门映射表
    `CREATE TABLE IF NOT EXISTS wecom_department_mappings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id VARCHAR(36) NULL,
      wecom_config_id INT NOT NULL,
      wecom_dept_id INT NOT NULL COMMENT '企微部门ID',
      wecom_dept_name VARCHAR(200) NULL,
      wecom_parent_id INT NULL COMMENT '企微父部门ID',
      crm_dept_id VARCHAR(50) NULL COMMENT 'CRM部门ID',
      crm_dept_name VARCHAR(200) NULL,
      member_count INT DEFAULT 0,
      last_sync_time DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant_config_dept (tenant_id, wecom_config_id, wecom_dept_id),
      INDEX idx_tenant_config (tenant_id, wecom_config_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门映射表'`
  ];

  // 已有表字段修改（使用安全方式，先检查列是否存在）
  const alterColumns = [
    { table: 'wecom_configs', column: 'auth_mode', definition: "VARCHAR(20) DEFAULT 'self_built' COMMENT '授权模式: third_party/self_built'" },
    { table: 'wecom_configs', column: 'auth_corp_name', definition: "VARCHAR(200) NULL COMMENT '授权企业名称'" },
    { table: 'wecom_configs', column: 'auth_admin_user_id', definition: "VARCHAR(100) NULL COMMENT '授权管理员UserID'" },
    { table: 'wecom_configs', column: 'auth_time', definition: "DATETIME NULL COMMENT '授权时间'" },
    { table: 'wecom_acquisition_links', column: 'welcome_config', definition: "JSON NULL COMMENT '欢迎语配置'" },
    { table: 'wecom_acquisition_links', column: 'auto_tags', definition: "JSON NULL COMMENT '自动标签配置'" },
    { table: 'wecom_acquisition_links', column: 'auto_group_config', definition: "JSON NULL COMMENT '自动建群配置'" },
    { table: 'wecom_acquisition_links', column: 'state', definition: "VARCHAR(100) NULL COMMENT '渠道标识'" }
  ];

  console.log('🚀 开始执行 V4.0 数据库迁移...\n');

  for (const sql of tables) {
    try {
      await conn.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`✅ 创建表: ${tableName}`);
    } catch (err) {
      console.error(`❌ 创建表失败:`, err.message);
    }
  }

  console.log('\n📝 执行字段修改...\n');

  for (const { table, column, definition } of alterColumns) {
    try {
      const [rows] = await conn.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      if (rows[0].cnt === 0) {
        await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`✅ ${table} 新增字段: ${column}`);
      } else {
        console.log(`⏭️ ${table}.${column} 已存在，跳过`);
      }
    } catch (err) {
      console.error(`❌ ${table}.${column} 修改失败:`, err.message);
    }
  }

  console.log('\n✅ V4.0 MySQL 数据库迁移完成!');
}

async function runSQLiteMigration(db) {
  console.log('🚀 开始执行 V4.0 SQLite 数据库迁移...\n');

  const tables = [
    `CREATE TABLE IF NOT EXISTS wecom_auto_match_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT,
      wecom_customer_id INTEGER NOT NULL,
      crm_customer_id TEXT NOT NULL,
      match_type TEXT NOT NULL DEFAULT 'phone',
      match_field TEXT,
      confidence TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      confirmed_by TEXT,
      confirmed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(tenant_id, wecom_customer_id, crm_customer_id)
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_group_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, wecom_config_id INTEGER NOT NULL,
      template_name TEXT NOT NULL, group_name_prefix TEXT, max_members INTEGER DEFAULT 200,
      owner_user_id TEXT, welcome_enabled INTEGER DEFAULT 0, welcome_text TEXT,
      welcome_media_type TEXT DEFAULT 'none', welcome_media_content TEXT,
      anti_spam_enabled INTEGER DEFAULT 0, anti_spam_rules TEXT,
      notice_template TEXT, auto_tags TEXT, is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_acquisition_smart_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, link_id INTEGER NOT NULL,
      daily_limit_enabled INTEGER DEFAULT 0, daily_limit_per_user INTEGER DEFAULT 50,
      daily_limit_action TEXT DEFAULT 'offline',
      work_time_enabled INTEGER DEFAULT 0, work_time_start TEXT DEFAULT '09:00',
      work_time_end TEXT DEFAULT '18:00', work_days TEXT,
      slow_reply_enabled INTEGER DEFAULT 0, slow_reply_minutes INTEGER DEFAULT 30,
      slow_reply_action TEXT DEFAULT 'offline',
      loss_rate_enabled INTEGER DEFAULT 0, loss_rate_threshold INTEGER DEFAULT 30,
      next_day_auto_online INTEGER DEFAULT 1, next_day_online_time TEXT DEFAULT '09:00',
      next_day_exclude_manual INTEGER DEFAULT 0, next_day_exclude_loss_rate INTEGER DEFAULT 0,
      schedule_enabled INTEGER DEFAULT 0, schedule_config TEXT,
      dept_quota_enabled INTEGER DEFAULT 0, dept_quotas TEXT, dept_overflow_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_contact_ways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, wecom_config_id INTEGER NOT NULL, config_id TEXT,
      name TEXT NOT NULL, type INTEGER DEFAULT 1, scene INTEGER DEFAULT 2,
      style INTEGER DEFAULT 0, state TEXT, remark TEXT, skip_verify INTEGER DEFAULT 1,
      user_ids TEXT, party_ids TEXT, is_temp INTEGER DEFAULT 0, qr_code TEXT,
      welcome_enabled INTEGER DEFAULT 0, welcome_config TEXT, auto_tags TEXT,
      weight_mode TEXT DEFAULT 'single', user_weights TEXT, smart_rule_id INTEGER,
      auto_group_enabled INTEGER DEFAULT 0, auto_group_config TEXT,
      total_add_count INTEGER DEFAULT 0, total_loss_count INTEGER DEFAULT 0,
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_contact_way_daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, contact_way_id INTEGER NOT NULL, stat_date TEXT NOT NULL,
      add_count INTEGER DEFAULT 0, loss_count INTEGER DEFAULT 0, net_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(tenant_id, contact_way_id, stat_date)
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_customer_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, wecom_config_id INTEGER NOT NULL,
      external_user_id TEXT NOT NULL, event_type TEXT NOT NULL,
      event_detail TEXT, operator_id TEXT, event_time TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_ai_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, model_name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'openai', api_url TEXT, api_key TEXT,
      model_id TEXT, temperature REAL DEFAULT 0.7, max_tokens INTEGER DEFAULT 4096,
      top_p REAL DEFAULT 1.0, is_default INTEGER DEFAULT 0, is_enabled INTEGER DEFAULT 1,
      last_test_time TEXT, last_test_status TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_ai_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, agent_name TEXT NOT NULL, usages TEXT, model_id INTEGER,
      knowledge_base_ids TEXT, system_prompt TEXT,
      max_msg_per_analysis INTEGER DEFAULT 50, context_window INTEGER DEFAULT 8000,
      output_format TEXT DEFAULT 'json', retry_count INTEGER DEFAULT 3,
      timeout_seconds INTEGER DEFAULT 30, is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_ai_inspect_strategies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, strategy_name TEXT NOT NULL, detect_types TEXT,
      scope TEXT DEFAULT 'all', scope_config TEXT, max_score INTEGER DEFAULT 100,
      deduct_rules TEXT, risk_levels TEXT, ai_model_id INTEGER, prompt_template TEXT,
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_ai_inspect_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, strategy_id INTEGER, conversation_id TEXT,
      employee_user_id TEXT, employee_name TEXT, customer_user_id TEXT, customer_name TEXT,
      total_score INTEGER, dimension_scores TEXT, highlights TEXT, improvements TEXT,
      risks TEXT, ai_suggestion TEXT, risk_level TEXT,
      analyzed_msg_count INTEGER, analyzed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_knowledge_bases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, name TEXT NOT NULL, description TEXT,
      document_count INTEGER DEFAULT 0, entry_count INTEGER DEFAULT 0,
      total_size INTEGER DEFAULT 0, index_status TEXT DEFAULT 'pending',
      last_index_time TEXT, sync_crm_enabled INTEGER DEFAULT 0, sync_crm_sources TEXT,
      sync_frequency TEXT DEFAULT 'manual', is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_knowledge_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, knowledge_base_id INTEGER NOT NULL, title TEXT NOT NULL,
      content TEXT, tags TEXT, source_type TEXT DEFAULT 'manual',
      source_file TEXT, embedding TEXT, is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_script_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0,
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, category_id INTEGER, title TEXT NOT NULL, content TEXT,
      shortcut TEXT, attachments TEXT, tags TEXT, use_count INTEGER DEFAULT 0,
      ai_rewrite_enabled INTEGER DEFAULT 0, is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_ai_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, agent_id INTEGER, agent_name TEXT,
      operation_type TEXT, target_description TEXT,
      input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success', error_message TEXT,
      request_payload TEXT, response_payload TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_sidebar_auth_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, code TEXT NOT NULL UNIQUE,
      code_type TEXT DEFAULT 'single', max_uses INTEGER DEFAULT 1,
      used_count INTEGER DEFAULT 0, expire_at TEXT, created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wecom_department_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT, wecom_config_id INTEGER NOT NULL,
      wecom_dept_id INTEGER NOT NULL, wecom_dept_name TEXT, wecom_parent_id INTEGER,
      crm_dept_id TEXT, crm_dept_name TEXT, member_count INTEGER DEFAULT 0,
      last_sync_time TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(tenant_id, wecom_config_id, wecom_dept_id)
    )`
  ];

  for (const sql of tables) {
    try {
      db.exec(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`✅ 创建表: ${tableName}`);
    } catch (err) {
      console.error(`❌ 创建表失败:`, err.message);
    }
  }

  // SQLite ALTER TABLE - 逐个添加列（SQLite不支持 IF NOT EXISTS 语法）
  const alterColumns = [
    { table: 'wecom_configs', column: 'auth_mode', type: "TEXT DEFAULT 'self_built'" },
    { table: 'wecom_configs', column: 'auth_corp_name', type: 'TEXT' },
    { table: 'wecom_configs', column: 'auth_admin_user_id', type: 'TEXT' },
    { table: 'wecom_configs', column: 'auth_time', type: 'TEXT' },
    { table: 'wecom_acquisition_links', column: 'welcome_config', type: 'TEXT' },
    { table: 'wecom_acquisition_links', column: 'auto_tags', type: 'TEXT' },
    { table: 'wecom_acquisition_links', column: 'auto_group_config', type: 'TEXT' },
    { table: 'wecom_acquisition_links', column: 'state', type: 'TEXT' }
  ];

  console.log('\n📝 执行字段修改...\n');
  for (const { table, column, type } of alterColumns) {
    try {
      // 先检查列是否存在
      const tableInfo = db.pragma(`table_info(${table})`);
      const exists = tableInfo.some(col => col.name === column);
      if (!exists) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`✅ ${table} 新增字段: ${column}`);
      } else {
        console.log(`⏭️ ${table}.${column} 已存在，跳过`);
      }
    } catch (err) {
      console.error(`❌ ${table}.${column} 修改失败:`, err.message);
    }
  }

  console.log('\n✅ V4.0 SQLite 数据库迁移完成!');
}

async function main() {
  try {
    const { type, conn } = await getConnection();
    console.log(`📦 数据库类型: ${type}\n`);

    if (type === 'mysql') {
      await runMySQLMigration(conn);
      await conn.end();
    } else {
      runSQLiteMigration(conn);
      conn.close();
    }
  } catch (err) {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
  }
}

main();

