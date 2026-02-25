const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm.db');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(orders)", (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log('Orders表所有字段:');
  rows.forEach(row => {
    console.log(`${row.cid}: ${row.name} (${row.type})`);
  });

  db.close();
});
