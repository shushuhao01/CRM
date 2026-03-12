const mysql = require('mysql2/promise');

async function checkPackageStatus() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'crm_local'
  });

  const [rows] = await conn.execute('SELECT id, name, code, status FROM packages ORDER BY sort_order');

  console.log('\n套餐状态检查:\n');
  rows.forEach(r => {
    console.log(`${r.name} (${r.code}):`);
    console.log(`  status值: ${r.status}`);
    console.log(`  status类型: ${typeof r.status}`);
    console.log(`  是否为1: ${r.status === 1}`);
    console.log(`  是否为true: ${r.status === true}`);
    console.log('');
  });

  await conn.end();
}

checkPackageStatus().catch(console.error);
