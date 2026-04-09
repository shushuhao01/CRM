/**
 * 直接通过数据库为测试租户创建CRM管理员
 * 使用方法: cd backend && cross-env DOTENV_CONFIG_PATH=.env.local node -r dotenv/config test-init-admin.js
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const TIANHUAN_TENANT_ID = '8a5fbe74-e0ff-4cd4-8403-b80ea748ae10';

async function main() {
  // 读取数据库配置
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'abc789',
    password: process.env.DB_PASSWORD || 'YtZWJPF2bpsCscHX',
    database: process.env.DB_DATABASE || 'crm_local',
  };

  console.log('连接数据库:', dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.database);
  const conn = await mysql.createConnection(dbConfig);

  try {
    // 1. 先激活天环租户授权
    console.log('\n--- 激活天环租户 ---');
    await conn.execute(
      "UPDATE tenants SET status = 'active', license_status = 'active' WHERE id = ?",
      [TIANHUAN_TENANT_ID]
    );

    const [tenants] = await conn.execute('SELECT id, name, code, license_key, license_status, status FROM tenants WHERE id = ?', [TIANHUAN_TENANT_ID]);
    if (tenants.length > 0) {
      const t = tenants[0];
      console.log('天环状态:', JSON.stringify(t));
    }

    // 2. 检查是否已有管理员
    console.log('\n--- 检查CRM用户 ---');
    const [users] = await conn.execute('SELECT id, username, name, role, status FROM users WHERE tenant_id = ?', [TIANHUAN_TENANT_ID]);
    console.log('天环已有用户:', users.length);
    users.forEach(u => console.log('  -', u.username, u.name, u.role, u.status));

    // 3. 创建系统管理部(如果不存在)
    console.log('\n--- 创建部门 ---');
    const [existingDepts] = await conn.execute(
      "SELECT id FROM departments WHERE name = '系统管理部' AND tenant_id = ?",
      [TIANHUAN_TENANT_ID]
    );
    let deptId;
    if (existingDepts.length > 0) {
      deptId = existingDepts[0].id;
      console.log('系统管理部已存在:', deptId);
    } else {
      deptId = 'dept_sys_' + Date.now();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await conn.execute(
        "INSERT INTO departments (id, tenant_id, name, code, description, level, sort_order, status, member_count, created_at, updated_at) VALUES (?, ?, '系统管理部', 'SYS_ADMIN', '系统管理', 1, 0, 'active', 0, ?, ?)",
        [deptId, TIANHUAN_TENANT_ID, now, now]
      );
      console.log('系统管理部创建成功:', deptId);
    }

    // 4. 创建管理员(如果不存在)
    if (!users.find(u => u.username === '13800138001')) {
      console.log('\n--- 创建天环管理员 ---');
      const userId = uuidv4();
      const password = 'Aa123456';
      const hash = await bcrypt.hash(password, 12);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await conn.execute(
        `INSERT INTO users (id, tenant_id, username, password, name, real_name, phone, email, role, role_id, department_id, department_name, status, created_at, updated_at)
         VALUES (?, ?, '13800138001', ?, '张天环', '张天环', '13800138001', 'tianhuan@test.com', 'admin', 'admin', ?, '系统管理部', 'active', ?, ?)`,
        [userId, TIANHUAN_TENANT_ID, hash, deptId, now, now]
      );
      console.log('管理员创建成功: 13800138001 / Aa123456, id=' + userId);
    } else {
      console.log('管理员已存在: 13800138001');
      // 重置密码确保可以登录
      const hash = await bcrypt.hash('Aa123456', 12);
      await conn.execute(
        "UPDATE users SET password = ?, status = 'active' WHERE username = '13800138001' AND tenant_id = ?",
        [hash, TIANHUAN_TENANT_ID]
      );
      console.log('密码已重置为 Aa123456');
    }

    // 5. 验证
    console.log('\n--- 验证结果 ---');
    const [finalUsers] = await conn.execute('SELECT id, username, name, role, status FROM users WHERE tenant_id = ?', [TIANHUAN_TENANT_ID]);
    console.log('天环最终用户列表:');
    finalUsers.forEach(u => console.log('  -', u.username, u.name, u.role, u.status));

    // 6. 同样处理深圳平安(私有部署, tenantId=null)
    console.log('\n--- 深圳平安(私有) ---');
    const [pinganUsers] = await conn.execute("SELECT id, username, name, role, status FROM users WHERE tenant_id IS NULL AND username = '13900139001'");
    if (pinganUsers.length === 0) {
      // 创建平安管理员(私有模式, tenant_id=NULL)
      const userId2 = uuidv4();
      const hash2 = await bcrypt.hash('Aa123456', 12);
      const now2 = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // 先创建部门
      const deptId2 = 'dept_sys_pa_' + Date.now();
      await conn.execute(
        "INSERT INTO departments (id, tenant_id, name, code, description, level, sort_order, status, member_count, created_at, updated_at) VALUES (?, NULL, '系统管理部', 'SYS_ADMIN_PA', '系统管理', 1, 0, 'active', 0, ?, ?)",
        [deptId2, now2, now2]
      ).catch(() => console.log('平安部门可能已存在'));

      await conn.execute(
        `INSERT INTO users (id, tenant_id, username, password, name, real_name, phone, email, role, role_id, status, created_at, updated_at)
         VALUES (?, NULL, '13900139001', ?, '李平安', '李平安', '13900139001', 'pingan@test.com', 'admin', 'admin', 'active', ?, ?)`,
        [userId2, hash2, now2, now2]
      );
      console.log('平安管理员创建成功: 13900139001 / Aa123456');
    } else {
      console.log('平安管理员已存在');
      const hash2 = await bcrypt.hash('Aa123456', 12);
      await conn.execute("UPDATE users SET password = ?, status = 'active' WHERE username = '13900139001' AND tenant_id IS NULL", [hash2]);
      console.log('密码已重置');
    }

    console.log('\n=== 完成! 可以用以下账号登录CRM ===');
    console.log('天环(SaaS): 13800138001 / Aa123456, tenantId=' + TIANHUAN_TENANT_ID);
    console.log('平安(私有): 13900139001 / Aa123456, 无需tenantId');

  } finally {
    await conn.end();
  }
}

main().catch(e => console.error('Error:', e));

