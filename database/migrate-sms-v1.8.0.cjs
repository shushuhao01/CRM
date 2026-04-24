/**
 * 短信管理模块 v1.8.0 数据库迁移脚本
 * 本地执行：node database/migrate-sms-v1.8.0.js
 *
 * 迁移内容：
 * 1. sms_templates 新增8个字段 + status字段类型变更
 * 2. sms_records 新增 sender_phone 字段
 * 3. 新建 sms_quota_packages 表
 * 4. 新建 sms_quota_orders 表
 * 5. 插入默认套餐数据
 */
const path = require('path');
const fs = require('fs');

// 加载环境变量
const backendDir = path.join(__dirname, '..', 'backend');
let envFile = '.env.local';
const localEnvPath = path.join(backendDir, envFile);
if (!fs.existsSync(localEnvPath)) {
  envFile = '.env';
}
require(path.join(backendDir, 'node_modules', 'dotenv')).config({ path: path.join(backendDir, envFile) });

const mysql = require(path.join(backendDir, 'node_modules', 'mysql2', 'promise'));

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local',
    charset: 'utf8mb4'
  });

  console.log('✅ 数据库连接成功:', process.env.DB_DATABASE);

  // ============================================================
  // 1. sms_templates: status 从 ENUM 改为 VARCHAR(20)
  // ============================================================
  try {
    const [cols] = await connection.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates' AND COLUMN_NAME = 'status'"
    );
    if (cols.length > 0 && cols[0].COLUMN_TYPE.includes('enum')) {
      await connection.query(
        "ALTER TABLE `sms_templates` MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'pending_admin' COMMENT '审核状态: pending_admin/pending_vendor/active/rejected/withdrawn/deleted'"
      );
      console.log('✅ sms_templates.status: ENUM → VARCHAR(20) 完成');
      // 旧数据兼容: pending → pending_admin, approved → active
      await connection.query("UPDATE `sms_templates` SET `status` = 'pending_admin' WHERE `status` = 'pending'");
      await connection.query("UPDATE `sms_templates` SET `status` = 'active' WHERE `status` = 'approved'");
      console.log('✅ sms_templates 旧状态数据迁移完成');
    } else {
      console.log('ℹ️  sms_templates.status 已经是 VARCHAR 类型，跳过');
    }
  } catch (e) {
    console.log('ℹ️  sms_templates.status 变更跳过:', e.message);
  }

  // ============================================================
  // 2. sms_templates: 新增8个字段（逐个检查避免重复添加）
  // ============================================================
  const newTemplateColumns = [
    { name: 'vendor_template_code', sql: "ADD COLUMN `vendor_template_code` VARCHAR(100) NULL COMMENT '服务商模板CODE' AFTER `is_system`" },
    { name: 'vendor_status', sql: "ADD COLUMN `vendor_status` VARCHAR(20) NULL COMMENT '服务商审核状态' AFTER `vendor_template_code`" },
    { name: 'vendor_submit_at', sql: "ADD COLUMN `vendor_submit_at` TIMESTAMP NULL COMMENT '提交服务商时间' AFTER `vendor_status`" },
    { name: 'vendor_reject_reason', sql: "ADD COLUMN `vendor_reject_reason` TEXT NULL COMMENT '服务商拒绝原因' AFTER `vendor_submit_at`" },
    { name: 'admin_reviewer', sql: "ADD COLUMN `admin_reviewer` VARCHAR(50) NULL COMMENT '管理后台审核人' AFTER `vendor_reject_reason`" },
    { name: 'admin_review_at', sql: "ADD COLUMN `admin_review_at` TIMESTAMP NULL COMMENT '管理后台审核时间' AFTER `admin_reviewer`" },
    { name: 'admin_review_note', sql: "ADD COLUMN `admin_review_note` TEXT NULL COMMENT '管理后台审核备注/拒绝原因' AFTER `admin_review_at`" },
    { name: 'is_preset', sql: "ADD COLUMN `is_preset` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为后台预设模板: 0=租户自建, 1=预设' AFTER `admin_review_note`" },
  ];

  for (const col of newTemplateColumns) {
    try {
      const [exists] = await connection.query(
        "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates' AND COLUMN_NAME = ?",
        [col.name]
      );
      if (exists.length === 0) {
        await connection.query(`ALTER TABLE \`sms_templates\` ${col.sql}`);
        console.log(`✅ sms_templates.${col.name} 字段添加成功`);
      } else {
        console.log(`ℹ️  sms_templates.${col.name} 字段已存在，跳过`);
      }
    } catch (e) {
      console.log(`⚠️  sms_templates.${col.name} 添加失败:`, e.message);
    }
  }

  // ============================================================
  // 3. sms_records: 新增 sender_phone 字段
  // ============================================================
  try {
    const [exists] = await connection.query(
      "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND COLUMN_NAME = 'sender_phone'"
    );
    if (exists.length === 0) {
      await connection.query(
        "ALTER TABLE `sms_records` ADD COLUMN `sender_phone` VARCHAR(20) NULL COMMENT '发送人手机号' AFTER `remark`"
      );
      console.log('✅ sms_records.sender_phone 字段添加成功');
    } else {
      console.log('ℹ️  sms_records.sender_phone 字段已存在，跳过');
    }
  } catch (e) {
    console.log('⚠️  sms_records.sender_phone 添加失败:', e.message);
  }

  // ============================================================
  // 4. 创建 sms_quota_packages 表
  // ============================================================
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`sms_quota_packages\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL COMMENT '套餐名称',
        \`sms_count\` INT NOT NULL COMMENT '短信条数',
        \`price\` DECIMAL(10,2) NOT NULL COMMENT '套餐价格(元)',
        \`unit_price\` DECIMAL(10,4) DEFAULT 0 COMMENT '单条价格(元)',
        \`description\` VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
        \`sort_order\` INT DEFAULT 0 COMMENT '排序权重',
        \`is_enabled\` TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度套餐'
    `);
    console.log('✅ sms_quota_packages 表创建成功（或已存在）');
  } catch (e) {
    console.log('⚠️  sms_quota_packages 创建失败:', e.message);
  }

  // ============================================================
  // 5. 创建 sms_quota_orders 表
  // ============================================================
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`sms_quota_orders\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`order_no\` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
        \`tenant_id\` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        \`tenant_name\` VARCHAR(200) DEFAULT NULL COMMENT '租户名称',
        \`package_id\` VARCHAR(36) DEFAULT NULL COMMENT '套餐ID',
        \`package_name\` VARCHAR(100) DEFAULT NULL COMMENT '套餐名称',
        \`sms_count\` INT DEFAULT 0 COMMENT '购买短信条数',
        \`amount\` DECIMAL(10,2) DEFAULT 0 COMMENT '支付金额',
        \`pay_type\` VARCHAR(20) DEFAULT NULL COMMENT '支付方式: wechat/alipay/bank',
        \`status\` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/paid/refunded/closed',
        \`qr_code\` TEXT DEFAULT NULL COMMENT '支付二维码',
        \`pay_url\` TEXT DEFAULT NULL COMMENT '支付链接',
        \`paid_at\` DATETIME DEFAULT NULL COMMENT '支付时间',
        \`buyer_id\` VARCHAR(36) DEFAULT NULL COMMENT '购买人ID',
        \`buyer_name\` VARCHAR(100) DEFAULT NULL COMMENT '购买人姓名',
        \`buyer_source\` VARCHAR(20) DEFAULT 'crm' COMMENT '购买来源: crm/member',
        \`refund_amount\` DECIMAL(10,2) DEFAULT 0 COMMENT '退款金额',
        \`refund_sms_count\` INT DEFAULT 0 COMMENT '退款短信条数',
        \`refund_at\` DATETIME DEFAULT NULL COMMENT '退款时间',
        \`refund_reason\` VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
        \`refunded_by\` VARCHAR(100) DEFAULT NULL COMMENT '退款操作人',
        \`expire_time\` DATETIME DEFAULT NULL COMMENT '订单过期时间',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX \`idx_sms_quota_orders_tenant_id\` (\`tenant_id\`),
        INDEX \`idx_sms_quota_orders_order_no\` (\`order_no\`),
        INDEX \`idx_sms_quota_orders_status\` (\`status\`),
        INDEX \`idx_sms_quota_orders_paid_at\` (\`paid_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度购买订单'
    `);
    console.log('✅ sms_quota_orders 表创建成功（或已存在）');
  } catch (e) {
    console.log('⚠️  sms_quota_orders 创建失败:', e.message);
  }

  // ============================================================
  // 6. 兼容旧表补充 tenant_name 字段
  // ============================================================
  try {
    const [exists] = await connection.query(
      "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_quota_orders' AND COLUMN_NAME = 'tenant_name'"
    );
    if (exists.length === 0) {
      await connection.query(
        "ALTER TABLE `sms_quota_orders` ADD COLUMN `tenant_name` VARCHAR(200) DEFAULT NULL COMMENT '租户名称' AFTER `tenant_id`"
      );
      console.log('✅ sms_quota_orders.tenant_name 字段补充成功');
    }
  } catch (e) { /* 已存在则跳过 */ }

  // ============================================================
  // 7. 插入默认套餐数据
  // ============================================================
  try {
    const [existing] = await connection.query('SELECT COUNT(*) as cnt FROM sms_quota_packages');
    if (existing[0].cnt === 0) {
      const { v4: uuidv4 } = require(path.join(backendDir, 'node_modules', 'uuid'));
      const defaultPackages = [
        { name: '体验包', smsCount: 100, price: 5.00, unitPrice: 0.0500, description: '适合小规模测试使用', sortOrder: 1 },
        { name: '基础包', smsCount: 500, price: 22.50, unitPrice: 0.0450, description: '适合小团队日常使用', sortOrder: 2 },
        { name: '标准包', smsCount: 2000, price: 80.00, unitPrice: 0.0400, description: '适合中型企业日常营销', sortOrder: 3 },
        { name: '旗舰包', smsCount: 10000, price: 350.00, unitPrice: 0.0350, description: '适合大批量短信营销推广', sortOrder: 4 },
      ];
      for (const pkg of defaultPackages) {
        await connection.query(
          'INSERT INTO sms_quota_packages (id, name, sms_count, price, unit_price, description, sort_order, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
          [uuidv4(), pkg.name, pkg.smsCount, pkg.price, pkg.unitPrice, pkg.description, pkg.sortOrder]
        );
      }
      console.log('✅ 已插入 4 个默认短信额度套餐');
    } else {
      console.log('ℹ️  套餐表已有数据，跳过默认套餐插入');
    }
  } catch (e) {
    console.log('⚠️  默认套餐插入失败:', e.message);
  }

  // ============================================================
  // 8. 验证结果
  // ============================================================
  console.log('\n====== 迁移结果验证 ======');

  const [smsTables] = await connection.query("SHOW TABLES LIKE 'sms%'");
  console.log('SMS相关表:', smsTables.map(r => Object.values(r)[0]).join(', '));

  const [templateCols] = await connection.query("SHOW COLUMNS FROM sms_templates");
  console.log('sms_templates字段:', templateCols.map(c => c.Field).join(', '));

  const [recordCols] = await connection.query("SHOW COLUMNS FROM sms_records");
  console.log('sms_records字段:', recordCols.map(c => c.Field).join(', '));

  const [pkgCount] = await connection.query("SELECT COUNT(*) as cnt FROM sms_quota_packages");
  console.log('sms_quota_packages 套餐数量:', pkgCount[0].cnt);

  const [pkgList] = await connection.query("SELECT name, sms_count, price FROM sms_quota_packages ORDER BY sort_order");
  for (const p of pkgList) {
    console.log(`  - ${p.name}: ${p.sms_count}条 / ¥${p.price}`);
  }

  await connection.end();
  console.log('\n🎉 短信管理模块 v1.8.0 数据库迁移全部完成！');
}

migrate().catch(err => {
  console.error('❌ 迁移失败:', err.message);
  process.exit(1);
});

