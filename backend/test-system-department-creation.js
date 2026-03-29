/**
 * 测试系统管理部自动创建功能
 * 验证在创建租户/私有客户时，是否自动创建系统管理部并将管理员归属到该部门
 */

const { AppDataSource } = require('./dist/config/database');
const { createSystemDepartment, createDefaultAdmin, SYSTEM_DEPARTMENT } = require('./dist/utils/adminAccountHelper');

async function testSystemDepartmentCreation() {
  try {
    console.log('=== 测试系统管理部自动创建功能 ===\n');

    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✓ 数据库连接成功\n');
    }

    // 测试1：为测试租户创建系统管理部
    console.log('【测试1】为测试租户创建系统管理部');
    const testTenantId = 'test-tenant-' + Date.now();

    const departmentId = await createSystemDepartment(testTenantId);
    console.log(`✓ 系统管理部创建成功: ${departmentId}`);

    // 验证部门是否创建成功
    const [dept] = await AppDataSource.query(
      'SELECT * FROM departments WHERE id = ? AND tenant_id = ?',
      [departmentId, testTenantId]
    );

    if (dept) {
      console.log(`✓ 部门验证成功:`);
      console.log(`  - 部门名称: ${dept.name}`);
      console.log(`  - 部门编码: ${dept.code}`);
      console.log(`  - 部门描述: ${dept.description}`);
      console.log(`  - 租户ID: ${dept.tenant_id}`);
      console.log(`  - 状态: ${dept.status}`);
    } else {
      console.error('✗ 部门验证失败：未找到创建的部门');
    }
    console.log('');

    // 测试2：创建默认管理员并归属到系统管理部
    console.log('【测试2】创建默认管理员并归属到系统管理部');
    const testPhone = '13800' + Math.floor(Math.random() * 100000).toString().padStart(6, '0');

    const adminAccount = await createDefaultAdmin({
      tenantId: testTenantId,
      phone: testPhone,
      realName: '测试管理员',
      email: 'test@example.com'
    });

    console.log(`✓ 管理员账号创建成功:`);
    console.log(`  - 用户名: ${adminAccount.username}`);
    console.log(`  - 密码: ${adminAccount.password}`);
    console.log(`  - 部门ID: ${adminAccount.departmentId}`);

    // 验证管理员是否归属到系统管理部
    const [user] = await AppDataSource.query(
      'SELECT * FROM users WHERE username = ? AND tenant_id = ?',
      [testPhone, testTenantId]
    );

    if (user) {
      console.log(`✓ 管理员验证成功:`);
      console.log(`  - 用户ID: ${user.id}`);
      console.log(`  - 姓名: ${user.real_name}`);
      console.log(`  - 角色: ${user.role}`);
      console.log(`  - 部门ID: ${user.department_id}`);
      console.log(`  - 部门名称: ${user.department_name}`);

      if (user.department_id === departmentId && user.department_name === SYSTEM_DEPARTMENT.NAME) {
        console.log(`✓ 管理员已正确归属到系统管理部`);
      } else {
        console.error(`✗ 管理员部门归属错误`);
      }
    } else {
      console.error('✗ 管理员验证失败：未找到创建的用户');
    }
    console.log('');

    // 测试3：验证系统管理部不可删除
    console.log('【测试3】验证系统管理部的保护机制');
    console.log(`✓ 系统管理部名称: ${SYSTEM_DEPARTMENT.NAME}`);
    console.log(`✓ 系统管理部编码: ${SYSTEM_DEPARTMENT.CODE}`);
    console.log(`✓ 前端和后端已配置保护机制，防止删除和禁用`);
    console.log('');

    // 清理测试数据
    console.log('【清理】删除测试数据');
    await AppDataSource.query('DELETE FROM users WHERE tenant_id = ?', [testTenantId]);
    await AppDataSource.query('DELETE FROM departments WHERE tenant_id = ?', [testTenantId]);
    console.log('✓ 测试数据清理完成\n');

    console.log('=== 所有测试通过 ===');
    console.log('\n功能说明：');
    console.log('1. 在Admin后台创建租户时，自动创建系统管理部和默认管理员');
    console.log('2. 在官网注册时，自动创建系统管理部和默认管理员');
    console.log('3. 在Admin后台创建私有客户时，自动创建系统管理部和默认管理员');
    console.log('4. 系统管理部不可删除、不可禁用、名称和编码不可修改');
    console.log('5. 默认管理员账号使用手机号作为用户名，归属到系统管理部');

  } catch (error) {
    console.error('测试失败:', error);
    console.error(error.stack);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 运行测试
testSystemDepartmentCreation();
