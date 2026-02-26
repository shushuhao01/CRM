const mysql = require('mysql2/promise');

async function testCustomRolePermissions() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('=== 测试自定义角色权限数据 ===\n');

    // 查询所有自定义角色
    const [rows] = await connection.execute(
      `SELECT
        id,
        name,
        code,
        roleType,
        permissions,
        updated_at
      FROM roles
      WHERE roleType = 'custom' OR roleType IS NULL
      ORDER BY updated_at DESC
      LIMIT 5`
    );

    if (rows.length === 0) {
      console.log('没有找到自定义角色');
      return;
    }

    console.log(`找到 ${rows.length} 个自定义角色:\n`);

    rows.forEach((row, index) => {
      console.log(`${index + 1}. 角色: ${row.name} (${row.code || 'N/A'})`);
      console.log(`   类型: ${row.roleType || '未设置'}`);
      console.log(`   更新时间: ${row.updated_at}`);

      if (row.permissions) {
        const permissions = Array.isArray(row.permissions)
          ? row.permissions
          : Object.values(row.permissions);

        console.log(`   权限数量: ${permissions.length}个`);

        if (permissions.length > 0) {
          console.log(`   权限列表:`);
          permissions.slice(0, 10).forEach((p, i) => {
            console.log(`     ${i + 1}. ${p}`);
          });
          if (permissions.length > 10) {
            console.log(`     ... 还有 ${permissions.length - 10} 个权限`);
          }
        } else {
          console.log(`   ⚠️ 权限列表为空`);
        }
      } else {
        console.log(`   ⚠️ 权限数据为 NULL`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

testCustomRolePermissions();
