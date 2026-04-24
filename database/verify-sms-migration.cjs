const path = require('path');
const bd = path.join(__dirname, '..', 'backend');
require(path.join(bd, 'node_modules', 'dotenv')).config({ path: path.join(bd, '.env.local') });
const mysql = require(path.join(bd, 'node_modules', 'mysql2', 'promise'));

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  const [t] = await c.query("SHOW TABLES LIKE 'sms%'");
  console.log('SMS tables:', t.map(r => Object.values(r)[0]));

  const [p] = await c.query('SELECT name, sms_count, price FROM sms_quota_packages ORDER BY sort_order');
  console.log('Packages:', JSON.stringify(p));

  const [cols] = await c.query("SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates' AND COLUMN_NAME = 'status'");
  console.log('sms_templates.status type:', cols[0]?.COLUMN_TYPE);

  await c.end();
})();

