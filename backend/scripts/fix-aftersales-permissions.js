const mysql = require('mysql2/promise');

async function fixAfterSalesPermissions() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('=== 修复售后管理权限ID不匹配问题 ===\n');
    console.log('将 afterSales 改为 aftersale（与权限树保持一致）\n');

    // 查询修复前的数据
    console.log('修复前的权限数据：\n');
    const [beforeRows] = await connection.execute(
      `SELECT id, name, code, permissions FROM roles WHERE code IN ('department_manager', 'sales_staff') ORDER BY id`
    );

    beforeRows.forEach(row => {
      const permissions = Array.isArray(row.permissions) ? row.permissions : Object.values(row.permissions);
      console.log(`${row.name}: ${permissions.length}个权限`);
      const afterSalesPerms = permissions.filter(p => p.includes('afterSales'));
      if (afterSalesPerms.length > 0) {
        console.log(`  包含 afterSales 的权限: ${afterSalesPerms.join(', ')}`);
      }
    });

    console.log('\n开始修复...\n');

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
        'aftersale.data', 'aftersale.data.view', 'aftersale.data.analysis',
        'data', 'data.search', 'data.search.basic', 'data.search.advanced',
        'finance', 'finance.performance_data', 'finance.performance_data.view',
        'finance.cod_application', 'finance.cod_application.view', 'finance.cod_application.create'
      )
      WHERE code = 'department_manager'
    `);
    console.log('✅ 部门经理权限已修复');

    // 修复销售员
    await connection.execute(`
      UPDATE roles
      SET permissions = JSON_ARRAY(
        'dashboard', 'dashboard.view',
        'customer', 'customer.list', 'customer.list.view',
        'customer.add', 'customer.add.create',
        'order', 'order.list', 'order.list.view', 'order.list.edit',
        'order.add', 'order.add.create',
        'communication', 'communication.call', 'communication.call.view', 'communication.call.make',
        'performance', 'performance.personal', 'performance.personal.view',
        'performance.team', 'performance.team.view',
        'logistics', 'logistics.list', 'logistics.list.view',
        'logistics.track', 'logistics.track.view',
        'aftersale', 'aftersale.list', 'aftersale.list.view',
        'aftersale.add', 'aftersale.add.create',
        'data', 'data.search', 'data.search.basic',
        'finance', 'finance.performance_data', 'finance.performance_data.view',
        'finance.cod_application', 'finance.cod_application.view', 'finance.cod_application.create'
      )
      WHERE code = 'sales_staff'
    `);
    console.log('✅ 销售员权限已修复');

    // 查询修复后的数据
    console.log('\n修复后的权限数据：\n');
    const [afterRows] = await connection.execute(
      `SELECT id, name, code, permissions FROM roles WHERE code IN ('department_manager', 'sales_staff') ORDER BY id`
    );

    afterRows.forEach(row => {
      const permissions = Array.isArray(row.permissions) ? row.permissions : Object.values(row.permissions);
      console.log(`${row.name}: ${permissions.length}个权限`);
      const aftersalePerms = permissions.filter(p => p.includes('aftersale'));
      if (aftersalePerms.length > 0) {
        console.log(`  包含 aftersale 的权限: ${aftersalePerms.join(', ')}`);
      }
    });

    console.log('\n✅ 修复完成！');
    console.log('\n请刷新浏览器查看效果。');

  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await connection.end();
  }
}

fixAfterSalesPermissions();
