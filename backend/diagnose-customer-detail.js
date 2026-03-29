// 详细诊断客户新增问题
const mysql = require('mysql2/promise');

async function main() {
  console.log('=== 详细诊断客户问题 ===');

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    // 1. 查询所有用户（不限制数量）
    const [users] = await conn.execute(
      'SELECT id, name, real_name, role, tenant_id, status FROM users ORDER BY tenant_id'
    );
    console.log('\n=== 所有用户 ===');
    users.forEach(u => {
      console.log('  ' + u.id + ' | ' + (u.real_name || u.name) + ' | ' + u.role + ' | 租户: ' + u.tenant_id + ' | 状态: ' + u.status);
    });

    // 2. 查询所有客户（不限制）
    const [customers] = await conn.execute(
      'SELECT id, name, phone, tenant_id, created_by, sales_person_id, status, created_at FROM customers ORDER BY created_at DESC'
    );
    console.log('\n=== 所有客户 (' + customers.length + ' 条) ===');
    customers.forEach(c => {
      console.log('  ' + c.name + ' | 电话: ' + c.phone + ' | 租户: ' + c.tenant_id + ' | 创建人: ' + c.created_by + ' | 销售: ' + c.sales_person_id + ' | 状态: ' + c.status + ' | 时间: ' + c.created_at);
    });

    // 3. 检查tenants表
    try {
      const [tenants] = await conn.execute('SELECT * FROM tenants');
      console.log('\n=== 租户表 ===');
      tenants.forEach(t => {
        console.log('  ' + JSON.stringify(t));
      });
    } catch (e) {
      console.log('\n=== 租户表结构 ===');
      const [cols] = await conn.execute('DESCRIBE tenants');
      console.log('  列:', cols.map(c => c.Field).join(', '));
      const [tenants2] = await conn.execute('SELECT * FROM tenants LIMIT 5');
      tenants2.forEach(t => {
        console.log('  ' + JSON.stringify(t));
      });
    }

    // 4. 检查是否有手机号包含15815897364的任何记录
    const [phoneSearch] = await conn.execute(
      "SELECT * FROM customers WHERE phone LIKE '%158%'"
    );
    console.log('\n=== 包含158的手机号客户 ===');
    console.log('  数量:', phoneSearch.length);
    phoneSearch.forEach(c => {
      console.log('  ' + c.name + ' | ' + c.phone + ' | 租户: ' + c.tenant_id);
    });

    // 5. 检查customers表索引
    const [indexes] = await conn.execute('SHOW INDEX FROM customers');
    console.log('\n=== customers表索引 ===');
    indexes.forEach(idx => {
      console.log('  ' + idx.Key_name + ' | 列: ' + idx.Column_name + ' | 唯一: ' + (idx.Non_unique === 0 ? '是' : '否'));
    });

    // 6. 检查customers表结构中的phone列
    const [phoneCol] = await conn.execute("SHOW COLUMNS FROM customers LIKE 'phone'");
    console.log('\n=== phone列定义 ===');
    console.log('  ', JSON.stringify(phoneCol[0]));

    // 7. 检查是否存在phone唯一约束
    const [uniqueIndexes] = await conn.execute(
      "SELECT CONSTRAINT_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'customers' AND TABLE_SCHEMA = 'crm_local'"
    );
    console.log('\n=== customers表约束 ===');
    uniqueIndexes.forEach(idx => {
      console.log('  约束: ' + idx.CONSTRAINT_NAME + ' | 列: ' + idx.COLUMN_NAME);
    });

    // 8. 检查最近的数据库错误日志（如果有）
    console.log('\n=== 诊断总结 ===');
    console.log('数据库: crm_local');
    console.log('客户总数:', customers.length);
    console.log('用户总数:', users.length);

    // 检查是否有用户ID和客户创建人匹配的问题
    const userIds = new Set(users.map(u => u.id));
    const orphanedCustomers = customers.filter(c => !userIds.has(c.created_by));
    if (orphanedCustomers.length > 0) {
      console.log('\n⚠️ 创建人ID在用户表中不存在的客户:');
      orphanedCustomers.forEach(c => {
        console.log('  ' + c.name + ' | 创建人ID: ' + c.created_by);
      });
    }

  } catch (e) {
    console.error('查询失败:', e.message);
  } finally {
    await conn.end();
  }
}

main();

