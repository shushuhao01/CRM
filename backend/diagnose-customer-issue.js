// 诊断客户新增后列表看不到的问题
const mysql = require('mysql2/promise');

async function main() {
  console.log('=== 开始诊断客户问题 ===');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'abc789',
      password: 'YtZWJPF2bpsCscHX',
      database: 'abc789'
    });
    console.log('数据库连接成功 (abc789)');
  } catch (e) {
    console.log('abc789数据库连接失败:', e.message);
    try {
      conn = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'abc789',
        password: 'YtZWJPF2bpsCscHX',
        database: 'crm_local'
      });
      console.log('数据库连接成功 (crm_local)');
    } catch (e2) {
      console.error('两个数据库都连接失败:', e2.message);
      return;
    }
  }

  try {
    // 1. 查看所有可用数据库
    const [dbs] = await conn.execute('SHOW DATABASES');
    console.log('\n可用数据库:', dbs.map(d => d.Database).join(', '));

    // 2. 查询目标手机号的客户
    console.log('\n=== 查询手机号 15815897364 ===');
    const [rows] = await conn.execute(
      'SELECT id, name, phone, tenant_id, created_by, sales_person_id, created_at, status FROM customers WHERE phone LIKE ?',
      ['%15815897364%']
    );
    console.log('查询结果数量:', rows.length);
    if (rows.length > 0) {
      rows.forEach((r, i) => {
        console.log(`  客户${i+1}:`, JSON.stringify(r, null, 2));
      });
    } else {
      console.log('  ❌ 数据库中没有找到该手机号的客户！');
    }

    // 3. 查看客户表总数和最近5条记录
    const [total] = await conn.execute('SELECT COUNT(*) as total FROM customers');
    console.log('\n客户总数:', total[0].total);

    const [recent] = await conn.execute(
      'SELECT id, name, phone, tenant_id, created_by, sales_person_id, created_at FROM customers ORDER BY created_at DESC LIMIT 5'
    );
    console.log('\n最近5条客户记录:');
    recent.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.name} | 电话: ${r.phone} | 租户: ${r.tenant_id} | 创建人: ${r.created_by} | 销售: ${r.sales_person_id} | 时间: ${r.created_at}`);
    });

    // 4. 查看所有租户
    try {
      const [tenants] = await conn.execute('SELECT id, company_name, status FROM tenants LIMIT 10');
      console.log('\n租户列表:');
      tenants.forEach(t => {
        console.log(`  ID: ${t.id} | 公司: ${t.company_name} | 状态: ${t.status}`);
      });
    } catch (e) {
      console.log('\n无tenants表或查询失败:', e.message);
    }

    // 5. 查看用户信息
    const [users] = await conn.execute(
      'SELECT id, name, real_name, role, tenant_id, department_id FROM users LIMIT 10'
    );
    console.log('\n用户列表:');
    users.forEach(u => {
      console.log(`  ID: ${u.id} | 姓名: ${u.real_name || u.name} | 角色: ${u.role} | 租户: ${u.tenant_id} | 部门: ${u.department_id}`);
    });

    // 6. 检查不同tenant_id的客户分布
    const [tenantDist] = await conn.execute(
      'SELECT tenant_id, COUNT(*) as cnt FROM customers GROUP BY tenant_id'
    );
    console.log('\n客户按租户分布:');
    tenantDist.forEach(t => {
      console.log(`  租户ID: ${t.tenant_id} => ${t.cnt} 个客户`);
    });

  } catch (e) {
    console.error('查询失败:', e.message);
  } finally {
    await conn.end();
  }
}

main();

