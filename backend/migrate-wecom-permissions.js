// 迁移脚本：为 department_manager 和 sales_staff 角色添加企微管理权限
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const WECOM_PERMISSIONS = [
  'wecom', 'wecom.customer', 'wecom.customer.view',
  'wecom.customer_group', 'wecom.customer_group.view',
  'wecom.chat_archive', 'wecom.chat_archive.view'
];

const ROLES_TO_UPDATE = ['department_manager', 'sales_staff'];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  for (const roleCode of ROLES_TO_UPDATE) {
    const [rows] = await conn.query('SELECT permissions FROM roles WHERE code = ?', [roleCode]);
    if (rows.length === 0) {
      console.log(`Role ${roleCode} not found, skipping`);
      continue;
    }

    let perms = rows[0].permissions;
    if (typeof perms === 'string') perms = JSON.parse(perms);
    if (!Array.isArray(perms)) perms = [];

    let added = 0;
    for (const p of WECOM_PERMISSIONS) {
      if (!perms.includes(p)) {
        perms.push(p);
        added++;
      }
    }

    if (added > 0) {
      await conn.query('UPDATE roles SET permissions = ? WHERE code = ?', [JSON.stringify(perms), roleCode]);
      console.log(`Updated ${roleCode}: added ${added} wecom permissions`);
    } else {
      console.log(`${roleCode}: already has all wecom permissions`);
    }
  }

  await conn.end();
  console.log('Done!');
})().catch(e => { console.error(e.message); process.exit(1); });

