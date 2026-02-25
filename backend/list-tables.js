const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/crm.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('所有表:');
  rows.forEach(r => console.log('  -', r.name));
  db.close();
});
