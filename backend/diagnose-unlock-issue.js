/**
 * 诊断解锁账号问题
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

console.log('环境变量检查:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USERNAME:', process.env.DB_USERNAME);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***已设置***' : '未设置');

async function diagnose() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('=== 诊断解锁账号问题 ===\n');

  try {
    // 1. 查看所有租户及其管理员账号
    console.log('1. 租户及管理员账号状态：');
    const [tenants] = await connection.query(`
      SELECT
        t.id, t.name, t.code, t.license_key,
        u.id as user_id, u.username, u.role, u.status,
        u.login_fail_count, u.locked_at, u.tenant_id
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    console.table(tenants);

    // 2. 查看被锁定的账号
    console.log('\n2. 被锁定的管理员账号：');
    const [lockedUsers] = await connection.query(`
      SELECT
        u.id, u.username, u.role, u.status, u.login_fail_count,
        u.locked_at, u.tenant_id, t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.status = 'locked' AND u.role = 'admin'
    `);
    console.table(lockedUsers);

    // 3. 查看最近的登录失败记录
    console.log('\n3. 最近的登录失败记录（如果有login_logs表）：');
    try {
      const [loginLogs] = await connection.query(`
        SELECT * FROM login_logs
        WHERE result = 'failed'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.table(loginLogs);
    } catch (e) {
      console.log('login_logs表不存在，跳过');
    }

    // 4. 检查users表结构
    console.log('\n4. users表结构（关键字段）：');
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM users
      WHERE Field IN ('id', 'username', 'password', 'role', 'status', 'login_fail_count', 'locked_at', 'tenant_id', 'salt')
    `);
    console.table(columns);

    // 5. 查看最近创建的租户管理员
    console.log('\n5. 最近创建的租户管理员（最近3个）：');
    const [recentAdmins] = await connection.query(`
      SELECT
        u.id, u.username, u.role, u.status, u.login_fail_count,
        u.created_at, u.tenant_id, t.name as tenant_name,
        LEFT(u.password, 10) as password_prefix
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.role = 'admin'
      ORDER BY u.created_at DESC
      LIMIT 3
    `);
    console.table(recentAdmins);

    // 6. 检查是否有密码为空或异常的管理员
    console.log('\n6. 密码异常的管理员账号：');
    const [abnormalPasswords] = await connection.query(`
      SELECT
        u.id, u.username, u.role, u.status, u.tenant_id,
        CASE
          WHEN u.password IS NULL THEN '密码为NULL'
          WHEN u.password = '' THEN '密码为空字符串'
          WHEN LENGTH(u.password) < 20 THEN CONCAT('密码太短(', LENGTH(u.password), '字符)')
          ELSE '正常'
        END as password_status,
        t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.role = 'admin'
      HAVING password_status != '正常'
    `);
    if (abnormalPasswords.length > 0) {
      console.table(abnormalPasswords);
    } else {
      console.log('✓ 所有管理员账号密码正常');
    }

  } catch (error) {
    console.error('诊断失败:', error.message);
  } finally {
    await connection.end();
  }
}

diagnose();
