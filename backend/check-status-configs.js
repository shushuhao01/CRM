const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_db'
  });

  console.log('=== 状态配置表数据 ===');
  const [rows] = await conn.execute('SELECT id, tenant_id, type, value, label, sort_order FROM value_added_status_configs ORDER BY type, sort_order');
  console.log('总记录数:', rows.length);
  rows.forEach(r => console.log(JSON.stringify(r)));

  console.log('\n=== 备注预设表 ===');
  try {
    const [remarks] = await conn.execute('SELECT id, tenant_id, remark_text, category, sort_order, usage_count FROM value_added_remark_presets ORDER BY category, sort_order LIMIT 20');
    console.log('备注预设记录数:', remarks.length);
    remarks.forEach(r => console.log(JSON.stringify(r)));
  } catch (e) {
    console.log('备注预设表不存在或查询失败:', e.message);
  }

  console.log('\n=== 查看所有租户 ===');
  const [tenants] = await conn.execute('SELECT DISTINCT tenant_id FROM value_added_status_configs');
  console.log('租户列表:', tenants.map(t => t.tenant_id));

  await conn.end();
}

check().catch(e => console.error('Error:', e.message));


