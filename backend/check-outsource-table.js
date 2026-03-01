/**
 * 检查outsource_companies表
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm.db');
const db = new sqlite3.Database(dbPath);

console.log('检查outsource_companies表...\n');

// 检查表是否存在
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='outsource_companies'", (err, row) => {
  if (err) {
    console.error('查询失败:', err);
    return;
  }

  if (!row) {
    console.log('❌ outsource_companies表不存在！');
    db.close();
    return;
  }

  console.log('✅ outsource_companies表存在');

  // 查看表结构
  db.all("PRAGMA table_info(outsource_companies)", (err, columns) => {
    if (err) {
      console.error('获取表结构失败:', err);
      db.close();
      return;
    }

    console.log('\n表结构:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });

    // 查看数据
    db.all("SELECT * FROM outsource_companies", (err, rows) => {
      if (err) {
        console.error('查询数据失败:', err);
      } else {
        console.log(`\n数据条数: ${rows.length}`);
        if (rows.length > 0) {
          console.log('\n数据示例:');
          console.log(JSON.stringify(rows[0], null, 2));
        }
      }

      db.close();
    });
  });
});
