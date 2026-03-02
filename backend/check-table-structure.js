const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm_dev.db');
const db = new sqlite3.Database(dbPath);

console.log('检查 value_added_orders 表结构:\n');

db.all(`PRAGMA table_info(value_added_orders)`, (err, columns) => {
  if (err) {
    console.error('错误:', err.message);
    db.close();
    return;
  }

  console.log('字段列表:');
  columns.forEach(col => {
    console.log(`  ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}`);
  });

  const hasExpressCompany = columns.some(col => col.name === 'express_company');
  console.log(`\nexpress_company 字段: ${hasExpressCompany ? '✅ 已存在' : '❌ 不存在'}`);

  db.close();
});
