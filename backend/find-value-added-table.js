const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const databases = [
  { name: 'crm.db', path: path.join(__dirname, 'data', 'crm.db') },
  { name: 'crm_dev.db', path: path.join(__dirname, 'data', 'crm_dev.db') },
  { name: 'crm_dev.sqlite', path: path.join(__dirname, 'database', 'crm_dev.sqlite') }
];

console.log('查找 value_added_orders 表...\n');

databases.forEach(dbInfo => {
  const db = new sqlite3.Database(dbInfo.path, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.log(`❌ ${dbInfo.name}: 无法打开 (${err.message})`);
      return;
    }

    db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='value_added_orders'`, (err, rows) => {
      if (err) {
        console.log(`❌ ${dbInfo.name}: 查询失败 (${err.message})`);
      } else if (rows.length > 0) {
        console.log(`✅ ${dbInfo.name}: 找到 value_added_orders 表`);

        // 检查字段
        db.all(`PRAGMA table_info(value_added_orders)`, (err, columns) => {
          if (!err) {
            const hasExpressCompany = columns.some(col => col.name === 'express_company');
            console.log(`   express_company 字段: ${hasExpressCompany ? '已存在' : '不存在'}`);

            // 检查记录数
            db.get(`SELECT COUNT(*) as count FROM value_added_orders`, (err, row) => {
              if (!err) {
                console.log(`   记录数: ${row.count}`);
              }
            });
          }
        });
      } else {
        console.log(`❌ ${dbInfo.name}: 未找到 value_added_orders 表`);
      }
      db.close();
    });
  });
});
