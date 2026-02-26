const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data/crm.db');
const db = new sqlite3.Database(dbPath);

console.log('=== ORDERS 表结构 ===\n');

db.all("PRAGMA table_info(orders)", (err, rows) => {
  if (err) {
    console.error('错误:', err);
    return;
  }

  console.log('字段列表：');
  rows.forEach(row => {
    console.log(`${row.name.padEnd(25)} ${row.type.padEnd(20)} ${row.notnull ? 'NOT NULL' : 'NULL'.padEnd(8)} ${row.dflt_value || ''}`);
  });

  console.log('\n=== COD_CANCEL_APPLICATIONS 表结构 ===\n');

  db.all("PRAGMA table_info(cod_cancel_applications)", (err, rows) => {
    if (err) {
      console.error('错误:', err);
      db.close();
      return;
    }

    console.log('字段列表：');
    rows.forEach(row => {
      console.log(`${row.name.padEnd(25)} ${row.type.padEnd(20)} ${row.notnull ? 'NOT NULL' : 'NULL'.padEnd(8)} ${row.dflt_value || ''}`);
    });

    db.close();
  });
});
