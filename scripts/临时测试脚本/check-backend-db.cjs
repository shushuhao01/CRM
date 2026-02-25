// 检查后端实际使用的数据库类型
require('dotenv').config({ path: './backend/.env' });

console.log('=== 后端数据库配置检查 ===\n');

const dbType = process.env.DB_TYPE || (process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite');
const isProduction = process.env.NODE_ENV === 'production';

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_TYPE:', process.env.DB_TYPE);
console.log('计算后的 dbType:', dbType);
console.log('isProduction:', isProduction);
console.log('');

if (dbType === 'mysql') {
  console.log('✅ 后端将使用 MySQL');
  console.log('MySQL配置:');
  console.log('  Host:', process.env.DB_HOST);
  console.log('  Port:', process.env.DB_PORT);
  console.log('  Database:', process.env.DB_DATABASE || process.env.DB_NAME);
  console.log('  Username:', process.env.DB_USERNAME || process.env.DB_USER);
} else {
  console.log('❌ 后端将使用 SQLite');
  console.log('SQLite路径: data/crm.db');
}
