const mysql = require('mysql2/promise');

async function removeInvalidPermission() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('=== 移除无效的权限ID ===\n');
    console.log('移除 aftersale.data.analysis（权限树中不存在）\n');

    // 修复部门经理
    await connection.execute(`
      UPDATE roles
      SET permissions = JSON_ARRAY(
        'dashboard', 'dashboard.view', 'dashboard.export',
        'customer', 'customer.list', 'customer.list.view', 'customer.list.edit', 'customer.list.export', 'customer.list.import',
        'customer.add', 'customer.add.create',
        'order', 'order.list', 'order.list.view', 'order.list.edit',
        'order.add', 'order.add.create',
        'communication', 'communication.call', 'communication.call.view', 'communication.call.make', 'communication.call.record',
        'performance', 'performance.personal', 'performance.personal.view',
        'performance.team', 'performance.team.view',
        'performance.analysis', 'performance.analysis.view',
        'performance.share', 'performance.share.view',
        'logistics', 'logistics.list', 'logistics.list.view',
        'logistics.track', 'logistics.track.view',
        'aftersale', 'aftersale.list', 'aftersale.list.view',
        'aftersale.add', 'aftersale.add.create',
        'aftersale.data', 'aftersale.data.view',
        'data', 'data.search', 'data.search.basic', 'data.search.advanced',
        'finance', 'finance.performance_data', 'finance.performance_data.view',
        'finance.cod_application', 'finance.cod_application.view', 'finance.cod_application.create'
      )
      WHERE code = 'department_manager'
    `);
    console.log('✅ 部门经理权限已修复（移除 aftersale.data.analysis）');

    // 查询修复后的数据
    console.log('\n修复后的权限数据：\n');
    const [afterRows] = await connection.execute(
      `SELECT id, name, code, permissions FROM roles WHERE code = 'department_manager'`
    );

    afterRows.forEach(row => {
      const permissions = Array.isArray(row.permissions) ? row.permissions : Object.values(row.permissions);
      console.log(`${row.name}: ${permissions.length}个权限`);
    });

    console.log('\n✅ 修复完成！');

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await connection.end();
  }
}

removeInvalidPermission();
