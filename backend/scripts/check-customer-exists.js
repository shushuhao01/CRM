const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/crm_dev.sqlite');
console.log('数据库路径:', dbPath);

const db = new sqlite3.Database(dbPath);

console.log('\n=== 检查客户数据库 ===\n');

// 先查看表结构
db.all(`PRAGMA table_info(customers)`, (err, columns) => {
  if (err) {
    console.error('查询表结构失败:', err);
    db.close();
    return;
  }

  console.log('customers表结构:');
  const columnNames = columns.map(c => c.name).join(', ');
  console.log('列名:', columnNames);

  // 使用SELECT *查询
  db.all(`
    SELECT * FROM customers
    ORDER BY createdAt DESC
    LIMIT 10
  `, (err, rows) => {
    if (err) {
      console.error('\n查询失败:', err);
      db.close();
      return;
    }

    console.log('\n最近10条客户记录:');
    if (rows && rows.length > 0) {
      console.table(rows);

      console.log('\n客户ID格式分析:');
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id} (类型: ${typeof row.id})`);
        console.log(`   客户: ${row.name}`);
        console.log(`   格式: ${String(row.id).includes('-') ? 'UUID' : 'INTEGER/其他'}`);
        console.log('');
      });
    } else {
      console.log('没有客户记录');
    }

    // 检查客户总数
    db.get('SELECT COUNT(*) as total FROM customers', (err, result) => {
      if (err) {
        console.error('统计失败:', err);
      } else {
        console.log(`客户总数: ${result.total}`);
      }

      db.close();
      console.log('\n=== 查询完成 ===');
    });
  });
});
