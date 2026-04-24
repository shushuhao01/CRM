const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
else dotenv.config({ path: path.join(__dirname, '.env') });

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
  });
  const [rows] = await c.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'wecom_%' ORDER BY TABLE_NAME");
  console.log('wecom表数量:', rows.length);
  rows.forEach(r => console.log(' -', r.TABLE_NAME));
  await c.end();
})();

