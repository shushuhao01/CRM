const m = require('mysql2/promise');
(async () => {
  const c = await m.createConnection({host:'localhost',port:3306,user:'abc789',password:'YtZWJPF2bpsCscHX',database:'crm_local'});

  const [r] = await c.query("SHOW TABLES LIKE 'tenant_license_logs'");
  console.log('tenant_license_logs表:', r.length > 0 ? '存在' : '不存在');

  if (r.length > 0) {
    const [r2] = await c.query('DESCRIBE tenant_license_logs');
    console.log('表结构:', r2.map(x => x.Field).join(', '));
  }

  // 直接测试verify逻辑中的查询
  const [tenants] = await c.query(
    "SELECT t.*, p.name as package_name FROM tenants t LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE t.license_key = ?",
    ['TENANT-TEST-2026-DEMO-KEY1']
  );
  console.log('\n查询结果类型:', typeof tenants, Array.isArray(tenants));
  console.log('查询结果:', JSON.stringify(tenants, null, 2));

  // 测试解构方式
  const queryResult = await c.query(
    "SELECT id, name, license_key FROM tenants WHERE license_key = ?",
    ['TENANT-TEST-2026-DEMO-KEY1']
  );
  console.log('\n原始query结果类型:', typeof queryResult, Array.isArray(queryResult));
  console.log('原始query结果长度:', queryResult.length);
  console.log('queryResult[0]:', JSON.stringify(queryResult[0]));

  await c.end();
})();

