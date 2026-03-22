/**
 * 修复被锁定的账号 - 重置密码为 Aa123456 并解锁
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

async function fix() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('=== 修复被锁定的账号 ===\n');

  try {
    // 查找所有被锁定的管理员账号
    const [lockedUsers] = await connection.query(`
      SELECT
        u.id, u.username, u.password, u.tenant_id,
        t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.status = 'locked' AND u.role = 'admin'
    `);

    if (lockedUsers.length === 0) {
      console.log('没有被锁定的管理员账号');
      return;
    }

    console.log(`找到 ${lockedUsers.length} 个被锁定的管理员账号:\n`);

    const defaultPassword = 'Aa123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    for (const user of lockedUsers) {
      console.log(`处理账号: ${user.username} (${user.tenant_name})`);
      console.log(`  - 当前密码格式: ${user.password.startsWith('$2') ? 'bcrypt' : 'pbkdf2（错误）'}`);
      console.log(`  - 密码长度: ${user.password.length}`);

      // 更新密码并解锁
      await connection.query(`
        UPDATE users
        SET password = ?,
            status = 'active',
            login_fail_count = 0,
            locked_at = NULL
        WHERE id = ?
      `, [hashedPassword, user.id]);

      console.log(`  ✓ 已修复: 密码重置为 ${defaultPassword}，账号已解锁\n`);
    }

    console.log('所有被锁定账号已修复！');

  } catch (error) {
    console.error('修复失败:', error.message);
  } finally {
    await connection.end();
  }
}

fix();
