const mysql = require('mysql2/promise');

async function checkRolePermissions() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('=== 查询部门经理和销售员的权限数据 ===\n');

    const [rows] = await connection.execute(
      `SELECT
        id,
        name,
        code,
        roleType,
        permissions
      FROM roles
      WHERE code IN ('department_manager', 'sales_staff')
      ORDER BY id`
    );

    rows.forEach(row => {
      console.log(`角色: ${row.name} (${row.code})`);
      console.log(`类型: ${row.roleType}`);
      console.log(`权限数据类型: ${typeof row.permissions}`);
      console.log(`权限原始数据:`, row.permissions);

      if (row.permissions) {
        let permissions = [];

        // 判断数据类型并解析
        if (typeof row.permissions === 'string') {
          // 如果是字符串，尝试解析JSON或按逗号分隔
          try {
            permissions = JSON.parse(row.permissions);
          } catch (e) {
            permissions = row.permissions.split(',');
          }
        } else if (Array.isArray(row.permissions)) {
          // 如果已经是数组
          permissions = row.permissions;
        } else if (typeof row.permissions === 'object') {
          // 如果是对象，转换为数组
          permissions = Object.values(row.permissions);
        }

        console.log(`权限数量: ${permissions.length}个`);
        console.log(`\n权限列表:`);
        permissions.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p}`);
        });
      } else {
        console.log(`权限数量: 0个`);
        console.log(`权限列表: 无`);
      }
      console.log('\n' + '='.repeat(80) + '\n');
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkRolePermissions();
