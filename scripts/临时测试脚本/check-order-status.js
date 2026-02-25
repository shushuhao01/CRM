/**
 * 检查订单的代收状态
 * 用法: node check-order-status.js ORD20260225262567
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const orderNumber = process.argv[2];

if (!orderNumber) {
  console.error('请提供订单号，例如: node check-order-status.js ORD20260225262567');
  process.exit(1);
}

// 数据库路径
const dbPath = path.join(__dirname, 'data', 'crm.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err);
    process.exit(1);
  }
  console.log('已连接到数据库:', dbPath);
});

// 先查看表结构
db.all("PRAGMA table_info(orders)", (err, columns) => {
  if (err) {
    console.error('查询表结构失败:', err);
    db.close();
    process.exit(1);
  }

  console.log('\n表结构中的字段:');
  const codFields = columns.filter(c => c.name.toLowerCase().includes('cod') || c.name.toLowerCase().includes('order'));
  codFields.forEach(c => console.log(`  - ${c.name} (${c.type})`));

  // 查询订单信息
  const query = `SELECT * FROM orders WHERE orderNo = ?`;

  db.get(query, [orderNumber], (err, row) => {
    if (err) {
      console.error('查询失败:', err);
      db.close();
      process.exit(1);
    }

    if (!row) {
      console.log(`\n订单 ${orderNumber} 不存在`);
      db.close();
      process.exit(0);
    }

    console.log('\n订单信息:');
    console.log('='.repeat(60));
    console.log('所有字段:');
    Object.keys(row).forEach(key => {
      console.log(`  ${key}: ${row[key]}`);
    });
    console.log('='.repeat(60));

    db.close();
  });
});
