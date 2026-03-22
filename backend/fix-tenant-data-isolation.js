/**
 * 租户数据隔离修复迁移脚本
 *
 * 修复内容：
 * 1. 为已有的租户创建默认管理员用户（admin/admin123，bcrypt加密）
 * 2. 验证唯一索引 uk_tenant_username 是否存在
 * 3. 确保不同租户的admin用户不冲突
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  console.log('🔧 开始租户数据隔离修复...\n');

  try {
    // 1. 查询所有租户
    const [tenants] = await conn.query(
      'SELECT id, name, code, contact, phone, email, license_status, status FROM tenants'
    );
    console.log(`📋 找到 ${tenants.length} 个租户\n`);

    // 2. 为每个租户创建默认管理员用户
    const hashedPassword = await bcrypt.hash('admin123', 12);

    for (const tenant of tenants) {
      console.log(`  处理租户: ${tenant.name} (${tenant.code})`);

      // 检查是否已有该租户的admin用户
      const [existingAdmins] = await conn.query(
        'SELECT id, username FROM users WHERE tenant_id = ? AND username = ?',
        [tenant.id, 'admin']
      );

      if (existingAdmins.length > 0) {
        console.log(`    ✅ 已存在管理员用户，跳过`);
        continue;
      }

      // 创建管理员用户
      const userId = uuidv4();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await conn.query(
        `INSERT INTO users (
          id, tenant_id, username, password, name, real_name, email, phone,
          role, role_id, status, employment_status, login_fail_count, login_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, tenant.id, 'admin', hashedPassword,
          tenant.contact || '系统管理员', tenant.contact || '系统管理员',
          tenant.email || null, tenant.phone || null,
          'admin', 'admin', 'active', 'active', 0, 0,
          now, now
        ]
      );

      console.log(`    ✅ 已创建管理员用户 (admin/admin123) - ID: ${userId}`);
    }

    // 3. 验证索引
    console.log('\n📊 验证索引...');
    const [indexes] = await conn.query('SHOW INDEX FROM users WHERE Key_name = "uk_tenant_username"');
    if (indexes.length > 0) {
      console.log('  ✅ uk_tenant_username 唯一索引存在 (tenant_id + username)');
    } else {
      console.log('  ⚠️ uk_tenant_username 索引不存在，创建中...');
      try {
        await conn.query('CREATE UNIQUE INDEX uk_tenant_username ON users(tenant_id, username)');
        console.log('  ✅ 已创建 uk_tenant_username 唯一索引');
      } catch (e) {
        console.log('  ℹ️ 索引可能已存在或有冲突:', e.message);
      }
    }

    // 4. 显示最终的用户数据
    console.log('\n📋 修复后的用户数据:');
    const [allUsers] = await conn.query(
      'SELECT id, tenant_id, username, role, status FROM users ORDER BY tenant_id IS NULL DESC, tenant_id, username'
    );
    allUsers.forEach(u => {
      const tenantLabel = u.tenant_id
        ? tenants.find(t => t.id === u.tenant_id)?.name || u.tenant_id.substring(0, 8)
        : '无(开发数据)';
      console.log(`  ${u.username.padEnd(15)} | 租户: ${tenantLabel.padEnd(15)} | 角色: ${u.role.padEnd(20)} | 状态: ${u.status}`);
    });

    console.log('\n✅ 租户数据隔离修复完成！');
    console.log('\n📌 提醒：');
    console.log('  - 每个租户的默认管理员账号: admin / admin123');
    console.log('  - 不同租户可以有相同的用户名（admin），通过tenant_id区分');
    console.log('  - 登录时前端会传递tenantId，后端按tenantId+username查询用户');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
})();

