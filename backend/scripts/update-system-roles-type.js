/**
 * 更新系统预设角色的类型为 'system'
 * 适用于 MySQL 数据库
 */
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// 优先加载 .env.local，如果不存在则加载 .env.development
const localEnvPath = path.join(__dirname, '../.env.local');
const devEnvPath = path.join(__dirname, '../.env.development');
const envPath = fs.existsSync(localEnvPath) ? localEnvPath : devEnvPath;

require('dotenv').config({ path: envPath });

console.log('📄 使用配置文件:', envPath);

// 系统预设角色列表
const SYSTEM_ROLES = ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'];

async function updateSystemRolesType() {
  let connection;

  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
    };

    console.log('📦 连接 MySQL 数据库...');
    console.log('   Host:', dbConfig.host);
    console.log('   Port:', dbConfig.port);
    console.log('   User:', dbConfig.user);
    console.log('   Database:', dbConfig.database);

    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);

    console.log('✅ 数据库连接成功\n');

    // 1. 检查 roleType 字段是否存在
    console.log('🔍 检查 roleType 字段是否存在...');
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM roles LIKE 'roleType'"
    );

    if (columns.length === 0) {
      console.log('⚠️  roleType 字段不存在，开始添加...');

      // 添加 roleType 字段
      await connection.query(
        "ALTER TABLE roles ADD COLUMN roleType VARCHAR(20) DEFAULT 'custom' AFTER status"
      );

      console.log('✅ roleType 字段添加成功\n');
    } else {
      console.log('✅ roleType 字段已存在\n');
    }

    // 2. 更新系统预设角色的类型
    console.log('🔄 开始更新系统预设角色类型...');

    const [result] = await connection.query(
      'UPDATE roles SET roleType = ? WHERE code IN (?)',
      ['system', SYSTEM_ROLES]
    );

    console.log(`✅ 成功更新 ${result.affectedRows} 个角色的类型\n`);

    // 3. 验证更新结果
    console.log('🔍 验证更新结果...\n');

    const [rows] = await connection.query(
      'SELECT id, name, code, roleType, status FROM roles WHERE code IN (?) ORDER BY FIELD(code, ?, ?, ?, ?, ?)',
      [SYSTEM_ROLES, ...SYSTEM_ROLES]
    );

    console.log('📊 系统预设角色列表:');
    console.log('┌────┬─────────────────────┬──────────────────────┬──────────────┬────────┐');
    console.log('│ ID │ 角色名称            │ 角色编码             │ 角色类型     │ 状态   │');
    console.log('├────┼─────────────────────┼──────────────────────┼──────────────┼────────┤');

    rows.forEach(row => {
      const id = String(row.id).padEnd(2, ' ');
      const name = row.name.padEnd(20, ' ');
      const code = row.code.padEnd(20, ' ');
      const roleType = (row.roleType || 'custom').padEnd(12, ' ');
      const status = row.status.padEnd(6, ' ');
      console.log(`│ ${id} │ ${name}│ ${code}│ ${roleType}│ ${status}│`);
    });

    console.log('└────┴─────────────────────┴──────────────────────┴──────────────┴────────┘\n');

    // 检查是否所有角色都更新成功
    const allSystem = rows.every(row => row.roleType === 'system');

    if (allSystem) {
      console.log('✅ 所有系统预设角色的类型都已正确设置为 system');
    } else {
      console.log('⚠️  部分角色的类型未正确设置:');
      rows.filter(row => row.roleType !== 'system').forEach(row => {
        console.log(`  - ${row.name} (${row.code}): ${row.roleType}`);
      });
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 数据库连接已关闭');
    }
    console.log('🎉 脚本执行完成！');
  }
}

// 执行脚本
updateSystemRolesType();
