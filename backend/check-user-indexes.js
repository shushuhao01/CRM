const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  // 查看users表的索引
  const [indexes] = await conn.query('SHOW INDEX FROM users WHERE Key_name != "PRIMARY"');
  console.log('=== users表索引 ===');
  indexes.forEach(idx => {
    console.log(`  ${idx.Key_name}: ${idx.Column_name} (${idx.Non_unique ? '非唯一' : '唯一'})`);
  });

  // 查看现有users数据
  const [users] = await conn.query('SELECT id, tenant_id, username, role, status FROM users LIMIT 20');
  console.log('\n=== users表数据 ===');
  users.forEach(u => {
    console.log(`  ID: ${u.id?.substring(0,20)}... | tenant_id: ${u.tenant_id || 'NULL'} | username: ${u.username} | role: ${u.role} | status: ${u.status}`);
  });

  // 查看tenants数据
  const [tenants] = await conn.query('SELECT id, name, code, license_key, license_status, status FROM tenants LIMIT 10');
  console.log('\n=== tenants表数据 ===');
  tenants.forEach(t => {
    console.log(`  ID: ${t.id?.substring(0,20)}... | name: ${t.name} | code: ${t.code} | key: ${t.license_key?.substring(0,15)}... | status: ${t.status} | license: ${t.license_status}`);
  });

  await conn.end();
})();

