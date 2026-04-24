/**
 * 数据库迁移：创建虚拟商品库存相关表
 * 任务1.3~1.7 - 虚拟商品功能阶段1
 * 包含：card_key_inventory, resource_inventory, virtual_delivery_records, virtual_claim_settings, tenant_email_config
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
    console.log('=== 虚拟商品库存表迁移 ===\n');

    // 任务1.3 卡密库存表
    console.log('创建 card_key_inventory 表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS card_key_inventory (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        product_id VARCHAR(36) NOT NULL COMMENT '关联商品ID',
        card_key VARCHAR(255) NOT NULL COMMENT '卡密编码',
        status VARCHAR(20) DEFAULT 'unused' COMMENT '状态: unused-未使用, reserved-已预占, used-已使用, claimed-已领取, expired-已过期, voided-已作废',
        order_id VARCHAR(36) DEFAULT NULL COMMENT '关联订单ID（发货后填充）',
        reserved_order_id VARCHAR(36) DEFAULT NULL COMMENT '预占订单ID（下单时填充）',
        claim_token VARCHAR(100) DEFAULT NULL COMMENT '客户领取令牌',
        claim_method VARCHAR(20) DEFAULT NULL COMMENT '领取方式: customer_self/member_send/email_send',
        claimed_at DATETIME DEFAULT NULL COMMENT '客户领取时间',
        usage_instructions TEXT DEFAULT NULL COMMENT '使用说明',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_tenant_card_key (tenant_id, card_key),
        INDEX idx_product_status (product_id, status),
        INDEX idx_order_id (order_id),
        INDEX idx_claim_token (claim_token),
        INDEX idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='卡密库存表'
    `);
    console.log('✅ card_key_inventory 表创建成功');

    // 任务1.4 资源库存表
    console.log('创建 resource_inventory 表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS resource_inventory (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        product_id VARCHAR(36) NOT NULL COMMENT '关联商品ID',
        resource_link VARCHAR(500) NOT NULL COMMENT '资源链接',
        resource_password VARCHAR(100) DEFAULT NULL COMMENT '提取码',
        resource_description TEXT DEFAULT NULL COMMENT '资源说明',
        status VARCHAR(20) DEFAULT 'unused' COMMENT '状态: unused/reserved/used/claimed/expired/voided',
        order_id VARCHAR(36) DEFAULT NULL COMMENT '关联订单ID',
        reserved_order_id VARCHAR(36) DEFAULT NULL COMMENT '预占订单ID',
        claim_token VARCHAR(100) DEFAULT NULL COMMENT '客户领取令牌',
        claim_method VARCHAR(20) DEFAULT NULL COMMENT '领取方式',
        claimed_at DATETIME DEFAULT NULL COMMENT '客户领取时间',
        usage_instructions TEXT DEFAULT NULL COMMENT '使用说明',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_status (product_id, status),
        INDEX idx_order_id (order_id),
        INDEX idx_claim_token (claim_token),
        INDEX idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='网盘资源库存表'
    `);
    console.log('✅ resource_inventory 表创建成功');

    // 任务1.5 虚拟商品发货记录表
    console.log('创建 virtual_delivery_records 表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS virtual_delivery_records (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
        delivery_type VARCHAR(20) NOT NULL COMMENT '发货类型: none/card_key/resource_link',
        card_key_content TEXT DEFAULT NULL COMMENT '卡密内容',
        resource_link VARCHAR(500) DEFAULT NULL COMMENT '资源链接',
        resource_password VARCHAR(100) DEFAULT NULL COMMENT '提取码',
        remark TEXT DEFAULT NULL COMMENT '备注',
        operator_id VARCHAR(36) NOT NULL COMMENT '操作人ID',
        operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
        delivered_at DATETIME NOT NULL COMMENT '发货时间',
        email_sent TINYINT(1) DEFAULT 0 COMMENT '是否已发送邮件',
        email_sent_at DATETIME DEFAULT NULL COMMENT '邮件发送时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='虚拟商品发货记录表'
    `);
    console.log('✅ virtual_delivery_records 表创建成功');

    // 任务1.6 虚拟商品领取配置表
    console.log('创建 virtual_claim_settings 表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS virtual_claim_settings (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        delivery_mode VARCHAR(20) DEFAULT 'link' COMMENT '发货方式: link/manual',
        claim_link_expiry_days INT DEFAULT 30 COMMENT '领取链接有效天数',
        login_methods VARCHAR(50) DEFAULT 'sms' COMMENT '登录方式: sms,password',
        initial_password VARCHAR(255) DEFAULT NULL COMMENT '初始登录密码',
        claim_page_notice TEXT DEFAULT NULL COMMENT '领取页面提示语',
        email_enabled TINYINT(1) DEFAULT 0 COMMENT '是否开启邮件发送',
        email_source VARCHAR(20) DEFAULT 'official' COMMENT '邮箱来源: official/custom',
        email_content_mode VARCHAR(20) DEFAULT 'link' COMMENT '邮件模式: link/content/both',
        email_auto_send TINYINT(1) DEFAULT 0 COMMENT '自动发送邮件',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='虚拟商品领取配置表'
    `);
    console.log('✅ virtual_claim_settings 表创建成功');

    // 任务1.7 租户自定义邮箱配置表
    console.log('创建 tenant_email_config 表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tenant_email_config (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
        smtp_host VARCHAR(100) NOT NULL COMMENT 'SMTP服务器',
        smtp_port INT DEFAULT 465 COMMENT 'SMTP端口',
        encryption VARCHAR(10) DEFAULT 'ssl' COMMENT '加密方式: ssl/tls/none',
        sender_email VARCHAR(200) NOT NULL COMMENT '发件邮箱',
        sender_password VARCHAR(500) NOT NULL COMMENT '邮箱密码（加密存储）',
        sender_name VARCHAR(100) DEFAULT NULL COMMENT '发件人名称',
        is_verified TINYINT(1) DEFAULT 0 COMMENT '是否已验证',
        verified_at DATETIME DEFAULT NULL COMMENT '验证时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户自定义邮箱配置表'
    `);
    console.log('✅ tenant_email_config 表创建成功');

    console.log('\n✅ 全部虚拟商品库存表迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();

