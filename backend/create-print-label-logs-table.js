/**
 * 创建面单打印记录表 - 本地数据库迁移脚本
 */
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm_local.db');
console.log('数据库路径:', dbPath);

const createSQL = `
CREATE TABLE IF NOT EXISTS print_label_logs (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(36),
  order_id VARCHAR(50) NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  tracking_number VARCHAR(100),
  logistics_company_code VARCHAR(50),
  logistics_company_name VARCHAR(100),
  template_id VARCHAR(100),
  template_name VARCHAR(200),
  printer_name VARCHAR(200),
  print_copies INTEGER DEFAULT 1,
  print_type VARCHAR(10) DEFAULT 'single',
  print_status VARCHAR(20) DEFAULT 'success',
  auto_shipped INTEGER DEFAULT 1,
  receiver_name VARCHAR(100),
  receiver_phone VARCHAR(50),
  receiver_address VARCHAR(500),
  operator_id VARCHAR(50),
  operator_name VARCHAR(100),
  print_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

try {
  const sqlite3 = require('better-sqlite3');
  const db = sqlite3(dbPath);
  db.exec(createSQL);
  console.log('✅ print_label_logs 表创建成功 (better-sqlite3)');
  db.close();
} catch(e) {
  console.log('better-sqlite3 失败:', e.message);
  try {
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);
    db.run(createSQL, (err) => {
      if (err) console.log('❌ 创建失败:', err.message);
      else console.log('✅ print_label_logs 表创建成功 (sqlite3)');
      db.close();
    });
  } catch(e2) {
    console.log('sqlite3 也失败:', e2.message);
    console.log('请手动在MySQL中执行 database/schema.sql 中的 print_label_logs 建表语句');
  }
}

