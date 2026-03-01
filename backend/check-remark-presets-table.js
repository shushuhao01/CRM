/**
 * 检查备注预设表是否存在
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm_dev.db');
const db = new sqlite3.Database(dbPath);

console.log('检查数据库:', dbPath);
console.log('');

// 检查表是否存在
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='value_added_remark_presets'", (err, row) => {
  if (err) {
    console.error('❌ 查询失败:', err.message);
  } else {
    console.log('1. value_added_remark_presets 表:', row ? '✅ 存在' : '❌ 不存在');
  }

  // 检查remark字段
  db.all("PRAGMA table_info(value_added_orders)", (err, rows) => {
    if (err) {
      console.error('❌ 查询失败:', err.message);
    } else {
      const remarkField = rows.find(r => r.name === 'remark');
      console.log('2. value_added_orders.remark 字段:', remarkField ? '✅ 存在' : '❌ 不存在');
    }

    // 检查预设数据
    db.get('SELECT COUNT(*) as count FROM value_added_remark_presets', (err, row) => {
      if (err) {
        console.log('3. 预设数据数量: ❌ 表不存在或查询失败');
      } else {
        console.log('3. 预设数据数量:', row.count);

        // 按分类统计
        db.all('SELECT category, COUNT(*) as count FROM value_added_remark_presets GROUP BY category', (err, rows) => {
          if (!err && rows) {
            console.log('   - 分类统计:');
            rows.forEach(r => {
              console.log(`     ${r.category}: ${r.count}条`);
            });
          }

          db.close();
        });
      }
    });
  });
});
