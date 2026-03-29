/**
 * 一次性脚本：为私有部署套餐初始化年度授权价
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 手动解析 .env
function loadEnv() {
  const env = {};
  // 先读 .env，再读 .env.local 覆盖
  ['.env', '.env.local'].forEach(f => {
    const envPath = path.join(__dirname, f);
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const l = line.trim();
      if (!l || l.startsWith('#')) return;
      const eq = l.indexOf('=');
      if (eq > 0) env[l.slice(0, eq).trim()] = l.slice(eq + 1).trim();
    });
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const config = {
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USERNAME || env.DB_USER || 'root',
    password: env.DB_PASSWORD || env.DB_PASS || '',
    database: env.DB_DATABASE || env.DB_NAME || 'crm'
  };
  console.log('Connecting to', config.host + ':' + config.port, 'db=' + config.database);

  const conn = await mysql.createConnection(config);
  console.log('DB connected');

  const [before] = await conn.query(
    'SELECT id, name, type, price, yearly_price FROM tenant_packages WHERE type = ?', ['private']
  );
  console.log('Current private packages:');
  before.forEach(p => console.log('  ' + p.name + ': price=' + p.price + ' yearly_price=' + p.yearly_price));

  const [result] = await conn.query(
    "UPDATE tenant_packages SET yearly_price = ROUND(price * 0.38, -2) WHERE type = 'private' AND price > 0 AND (yearly_price IS NULL OR yearly_price = 0)"
  );
  console.log('Updated ' + result.affectedRows + ' rows');

  const [after] = await conn.query(
    'SELECT id, name, type, price, yearly_price FROM tenant_packages WHERE type = ?', ['private']
  );
  console.log('After update:');
  after.forEach(p => console.log('  ' + p.name + ': price=' + p.price + ' yearly_price=' + p.yearly_price));

  await conn.end();
  console.log('Done');
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
