/**
 * 检查增值管理相关表
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm_dev.db');
const db = new sqlite3.Database(dbPath);

console.log('检查增值管理相关表...');
console.log('');

db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%value%' ORDER BY name", (err, rows) => {
  if (err) {
    console.error('❌ 查询失败:', err.message);
  } else {
    console.log('找到的表:');
    if (rows.length === 0) {
      console.log('  (无)');
    } else {
      rows.forEach(row => {
        console.log('  -', row.name);
      });
    }
  }

  db.close();
});
