/**
 * 短信额度增值服务 - 数据库迁移脚本
 * 创建 sms_quota_packages 和 sms_quota_orders 表
 *
 * 运行方式: node create-sms-quota-tables.js
 */
const path = require('path');
const fs = require('fs');

// 加载环境变量
const isProduction = process.env.NODE_ENV === 'production';
let envFile = '.env';
if (!isProduction) {
  const localEnvPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(localEnvPath)) {
    envFile = '.env.local';
  }
}
require('dotenv').config({ path: path.join(__dirname, envFile) });

const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_db',
    charset: 'utf8mb4'
  });

  console.log('✅ 数据库连接成功');

  // 1. 创建短信额度套餐表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS sms_quota_packages (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL COMMENT '套餐名称',
      sms_count INT NOT NULL COMMENT '短信条数',
      price DECIMAL(10,2) NOT NULL COMMENT '套餐价格(元)',
      unit_price DECIMAL(10,4) DEFAULT 0 COMMENT '单条价格(元)',
      description VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
      sort_order INT DEFAULT 0 COMMENT '排序权重',
      is_enabled TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度套餐';
  `);
  console.log('✅ sms_quota_packages 表创建成功');

  // 2. 创建短信额度购买订单表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS sms_quota_orders (
      id VARCHAR(36) PRIMARY KEY,
      order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
      tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
      package_id VARCHAR(36) DEFAULT NULL COMMENT '套餐ID',
      package_name VARCHAR(100) DEFAULT NULL COMMENT '套餐名称',
      sms_count INT DEFAULT 0 COMMENT '购买短信条数',
      amount DECIMAL(10,2) DEFAULT 0 COMMENT '支付金额',
      pay_type VARCHAR(20) DEFAULT NULL COMMENT '支付方式: wechat/alipay/bank',
      status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/paid/refunded/closed',
      qr_code TEXT DEFAULT NULL COMMENT '支付二维码',
      pay_url TEXT DEFAULT NULL COMMENT '支付链接',
      paid_at DATETIME DEFAULT NULL COMMENT '支付时间',
      buyer_id VARCHAR(36) DEFAULT NULL COMMENT '购买人ID',
      buyer_name VARCHAR(100) DEFAULT NULL COMMENT '购买人姓名',
      buyer_source VARCHAR(20) DEFAULT 'crm' COMMENT '购买来源: crm/member',
      refund_amount DECIMAL(10,2) DEFAULT 0 COMMENT '退款金额',
      refund_sms_count INT DEFAULT 0 COMMENT '退款短信条数',
      refund_at DATETIME DEFAULT NULL COMMENT '退款时间',
      refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
      refunded_by VARCHAR(100) DEFAULT NULL COMMENT '退款操作人',
      expire_time DATETIME DEFAULT NULL COMMENT '订单过期时间',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant_id (tenant_id),
      INDEX idx_order_no (order_no),
      INDEX idx_status (status),
      INDEX idx_paid_at (paid_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度购买订单';
  `);
  console.log('✅ sms_quota_orders 表创建成功');

  // 3. 插入默认套餐（可选）
  const [existing] = await connection.execute('SELECT COUNT(*) as cnt FROM sms_quota_packages');
  if (existing[0].cnt === 0) {
    const { v4: uuidv4 } = require('uuid');
    const defaultPackages = [
      { name: '体验包', smsCount: 100, price: 5.00, unitPrice: 0.0500, description: '适合小规模测试使用', sortOrder: 1 },
      { name: '基础包', smsCount: 500, price: 22.50, unitPrice: 0.0450, description: '适合小团队日常使用', sortOrder: 2 },
      { name: '标准包', smsCount: 2000, price: 80.00, unitPrice: 0.0400, description: '适合中型企业日常营销', sortOrder: 3 },
      { name: '旗舰包', smsCount: 10000, price: 350.00, unitPrice: 0.0350, description: '适合大批量短信营销推广', sortOrder: 4 },
    ];

    for (const pkg of defaultPackages) {
      await connection.execute(
        `INSERT INTO sms_quota_packages (id, name, sms_count, price, unit_price, description, sort_order, is_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), pkg.name, pkg.smsCount, pkg.price, pkg.unitPrice, pkg.description, pkg.sortOrder]
      );
    }
    console.log('✅ 已插入 4 个默认套餐');
  } else {
    console.log('ℹ️ 套餐表已有数据，跳过默认套餐插入');
  }

  await connection.end();
  console.log('\n🎉 短信额度数据库迁移完成！');
}

migrate().catch(err => {
  console.error('❌ 迁移失败:', err.message);
  process.exit(1);
});

