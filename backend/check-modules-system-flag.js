const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  const [rows] = await conn.execute('SELECT id, name, code, is_system FROM modules ORDER BY sort_order');
  console.log('模块列表:');
  rows.forEach(r => {
    console.log(`  ${r.name} (${r.code}): is_system=${r.is_system}`);
  });

  await conn.end();
}

check().catch(console.error);
