const mysql = require('mysql2/promise');

async function listDatabases() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX'
  });

  const [rows] = await connection.execute('SHOW DATABASES');
  console.log('可用的数据库:');
  rows.forEach(row => {
    console.log('  -', row.Database);
  });

  await connection.end();
}

listDatabases().catch(err => {
  console.error('错误:', err.message);
});
