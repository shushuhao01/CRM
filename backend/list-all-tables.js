/**
 * 列出所有表
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm_dev.db');
const db = new sqlite3.Database(dbPath);

console.log('数据库路径:', dbPath);
console.log('');
console.log('所有表:');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
  if (err) {
    console.error('❌ 查询失败:', err.message);
  } else {
    if (rows.length === 0) {
      console.log('  (无表)');
    } else {
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.name}`);
      });
      console.log('');
      console.log('总计:', rows.length, '个表');
    }
  }

  db.close();
});
