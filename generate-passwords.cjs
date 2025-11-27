const bcrypt = require('bcrypt');

const accounts = [
  { username: 'superadmin', password: 'super123456' },
  { username: 'admin', password: 'admin123' },
  { username: 'manager', password: 'manager123' },
  { username: 'sales', password: 'sales123' },
  { username: 'service', password: 'service123' }
];

async function generatePasswords() {
  console.log('-- 重置预设账号密码的SQL命令\n');
  console.log('USE crm_db;\n');

  for (const account of accounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);
    console.log(`-- ${account.username} / ${account.password}`);
    console.log(`UPDATE users SET password = '${hashedPassword}' WHERE username = '${account.username}';`);
    console.log('');
  }

  console.log('-- 验证更新');
  console.log('SELECT username, password FROM users WHERE username IN (\'superadmin\', \'admin\', \'manager\', \'sales\', \'service\');\n');
}

generatePasswords().catch(console.error);
