/**
 * 一次性修复脚本：修复通过官网注册的免费试用租户
 * - 生成授权码（如果缺失）
 * - 设置正确的到期时间
 * - 激活授权状态
 * - 创建默认管理员账号（如果缺失）
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const env = {};
  ['.env', '.env.local'].forEach(f => {
    const envPath = path.join(__dirname, f);
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const l = line.trim();
      if (!l || l.startsWith('#')) return;
      const eq = l.indexOf('=');
      if (eq > 0) env[l.slice(0, eq).trim()] = l.slice(eq + 1).trim();
    });
  });
  return env;
}

function generateLicenseKey() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `TENANT-${segments.join('-')}`;
}

async function main() {
  const env = loadEnv();
  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '3306'),
    user: env.DB_USERNAME || env.DB_USER || 'root',
    password: env.DB_PASSWORD || env.DB_PASS || '',
    database: env.DB_DATABASE || env.DB_NAME || 'crm'
  });

  console.log('=== 查找需要修复的免费试用租户（license_key为空 或 expire_date为空） ===');

  // 查找关联免费套餐但数据不完整的租户
  const [broken] = await conn.query(`
    SELECT t.id, t.name, t.code, t.phone, t.contact, t.email, t.license_key, t.license_status, t.expire_date, t.created_at, t.package_id,
           p.price, p.duration_days, p.is_trial
    FROM tenants t
    LEFT JOIN tenant_packages p ON t.package_id = p.id
    WHERE (p.price = 0 OR p.is_trial = 1)
      AND (t.license_key IS NULL OR t.expire_date IS NULL OR t.license_status = 'pending')
  `);

  if (broken.length === 0) {
    console.log('没有需要修复的租户');
    await conn.end();
    return;
  }

  console.log(`找到 ${broken.length} 个需要修复的租户：`);

  for (const tenant of broken) {
    console.log(`\n--- 修复租户: ${tenant.name} (${tenant.code}) ---`);
    const durationDays = tenant.duration_days || 7;

    // 1. 生成授权码（如果缺失）
    let licenseKey = tenant.license_key;
    if (!licenseKey) {
      licenseKey = generateLicenseKey();
      console.log(`  生成授权码: ${licenseKey}`);
    }

    // 2. 计算到期时间（从创建时间开始计算）
    let expireDate = tenant.expire_date;
    if (!expireDate) {
      const created = new Date(tenant.created_at);
      expireDate = new Date(created.getTime() + durationDays * 24 * 60 * 60 * 1000);
      console.log(`  设置到期时间: ${expireDate.toISOString().split('T')[0]} (${durationDays}天)`);
    }

    // 3. 更新租户记录
    await conn.query(
      `UPDATE tenants SET license_key = ?, license_status = 'active', expire_date = ? WHERE id = ?`,
      [licenseKey, expireDate, tenant.id]
    );
    console.log(`  ✅ 已更新租户: license_key=${licenseKey}, status=active`);

    // 4. 创建管理员账号（如果缺失）
    const [users] = await conn.query(
      'SELECT id FROM users WHERE tenant_id = ? AND role = ?', [tenant.id, 'admin']
    );

    if (users.length === 0 && tenant.phone) {
      const userId = uuidv4();
      const password = 'Aa123456';
      const hash = await bcrypt.hash(password, 12);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // 创建系统管理部
      const [existDept] = await conn.query(
        'SELECT id FROM departments WHERE name = ? AND tenant_id = ?',
        ['系统管理部', tenant.id]
      );
      let deptId;
      if (existDept.length > 0) {
        deptId = existDept[0].id;
      } else {
        deptId = `dept_sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await conn.query(
          `INSERT INTO departments (id, tenant_id, name, code, description, parent_id, manager_id, level, sort_order, status, member_count, created_at, updated_at)
           VALUES (?, ?, '系统管理部', 'SYS_ADMIN', '系统管理和维护部门', NULL, NULL, 1, 0, 'active', 0, ?, ?)`,
          [deptId, tenant.id, now, now]
        );
        console.log(`  创建系统管理部: ${deptId}`);
      }

      await conn.query(
        `INSERT INTO users (id, tenant_id, username, password, name, real_name, phone, email, role, role_id, department_id, department_name, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'admin', ?, '系统管理部', 'active', ?, ?)`,
        [userId, tenant.id, tenant.phone, hash, tenant.contact || '管理员', tenant.contact || '管理员', tenant.phone, tenant.email || null, deptId, now, now]
      );
      console.log(`  ✅ 创建管理员: 用户名=${tenant.phone}, 密码=${password}`);
    } else if (users.length > 0) {
      console.log(`  管理员已存在，跳过`);
    } else {
      console.log(`  ⚠️ 无手机号，跳过创建管理员`);
    }
  }

  console.log('\n=== 修复完成 ===');
  await conn.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });

