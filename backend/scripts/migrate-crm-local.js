/**
 * CRM Local 数据库迁移脚本
 * 用于执行多租户迁移并验证结果
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // 如果有密码，请在命令行参数中提供
  database: 'crm_local',
  charset: 'utf8mb4',
  multipleStatements: true
};

// 从命令行参数获取密码
if (process.argv[2]) {
  dbConfig.password = process.argv[2];
}

async function checkBackup() {
  const backupPath = 'D:\\kaifa\\backup\\crm_local_before_migration.sql';

  console.log('\n=== 第1步：检查备份文件 ===\n');

  if (fs.existsSync(backupPath)) {
    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ 备份文件已存在`);
    console.log(`   路径: ${backupPath}`);
    console.log(`   大小: ${sizeMB} MB`);
    console.log(`   创建时间: ${stats.mtime.toLocaleString('zh-CN')}`);
    return true;
  } else {
    console.log(`❌ 备份文件不存在`);
    console.log(`   请先执行备份命令：`);
    console.log(`   mysqldump -u root -p crm_local > D:\\kaifa\\backup\\crm_local_before_migration.sql`);
    return false;
  }
}

async function executeMigration(connection) {
  console.log('\n=== 第2步：执行数据库迁移 ===\n');

  const migrationPath = path.join(__dirname, '../database-migrations/add-tenant-support.sql');

  if (!fs.existsSync(migrationPath)) {
    console.log(`❌ 迁移脚本不存在: ${migrationPath}`);
    return false;
  }

  console.log(`📄 读取迁移脚本: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('⏳ 执行迁移脚本...');
    await connection.query(sql);
    console.log('✅ 迁移脚本执行成功！');
    return true;
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.sqlMessage) {
      console.error('   SQL错误:', error.sqlMessage);
    }
    return false;
  }
}

async function verifyTenantTables(connection) {
  console.log('\n=== 第3步：验证租户表 ===\n');

  try {
    // 检查 tenants 表
    const [tenants] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants'
    `, [dbConfig.database]);

    if (tenants[0].count > 0) {
      console.log('✅ tenants 表已创建');
    } else {
      console.log('❌ tenants 表不存在');
      return false;
    }

    // 检查 tenant_settings 表
    const [settings] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenant_settings'
    `, [dbConfig.database]);

    if (settings[0].count > 0) {
      console.log('✅ tenant_settings 表已创建');
    } else {
      console.log('❌ tenant_settings 表不存在');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    return false;
  }
}

async function verifyTenantIdFields(connection) {
  console.log('\n=== 第4步：验证 tenant_id 字段 ===\n');

  try {
    const [rows] = await connection.execute(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND COLUMN_NAME = 'tenant_id'
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

    console.log(`✅ 找到 ${rows.length} 个表包含 tenant_id 字段：\n`);

    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.TABLE_NAME}`);
    });

    console.log('');

    // 检查是否有足够的业务表
    if (rows.length >= 30) {
      console.log(`✅ 已成功为 ${rows.length} 个表添加 tenant_id 字段！`);
      return true;
    } else {
      console.log(`⚠️  预期至少30个表，实际找到 ${rows.length} 个`);
      return false;
    }

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    return false;
  }
}

async function verifyIndexes(connection) {
  console.log('\n=== 第5步：验证索引 ===\n');

  try {
    const [rows] = await connection.execute(`
      SELECT
        TABLE_NAME,
        INDEX_NAME,
        COUNT(*) as column_count
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND COLUMN_NAME = 'tenant_id'
      GROUP BY TABLE_NAME, INDEX_NAME
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

    console.log(`✅ 找到 ${rows.length} 个包含 tenant_id 的索引\n`);

    return true;
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    return false;
  }
}

async function testQueries(connection) {
  console.log('\n=== 第6步：测试查询功能 ===\n');

  try {
    // 测试查询用户
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✅ 用户表查询成功，共 ${users[0].count} 条记录`);

    // 测试查询客户
    const [customers] = await connection.execute('SELECT COUNT(*) as count FROM customers');
    console.log(`✅ 客户表查询成功，共 ${customers[0].count} 条记录`);

    // 测试查询订单
    const [orders] = await connection.execute('SELECT COUNT(*) as count FROM orders');
    console.log(`✅ 订单表查询成功，共 ${orders[0].count} 条记录`);

    console.log('\n✅ 所有查询功能正常！');

    return true;
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   CRM Local 多租户数据库迁移工具          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log(`数据库: ${dbConfig.database}`);
  console.log(`主机: ${dbConfig.host}`);
  console.log(`用户: ${dbConfig.user}\n`);

  // 第1步：检查备份
  const hasBackup = await checkBackup();
  if (!hasBackup) {
    console.log('\n⚠️  请先备份数据库再执行迁移！');
    process.exit(1);
  }

  let connection;

  try {
    // 连接数据库
    console.log('\n⏳ 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 第2步：执行迁移
    const migrationSuccess = await executeMigration(connection);
    if (!migrationSuccess) {
      console.log('\n❌ 迁移失败，请检查错误信息');
      process.exit(1);
    }

    // 第3步：验证租户表
    const tablesOk = await verifyTenantTables(connection);
    if (!tablesOk) {
      console.log('\n❌ 租户表验证失败');
      process.exit(1);
    }

    // 第4步：验证 tenant_id 字段
    const fieldsOk = await verifyTenantIdFields(connection);
    if (!fieldsOk) {
      console.log('\n⚠️  tenant_id 字段验证有警告');
    }

    // 第5步：验证索引
    await verifyIndexes(connection);

    // 第6步：测试查询
    const queriesOk = await testQueries(connection);
    if (!queriesOk) {
      console.log('\n❌ 查询测试失败');
      process.exit(1);
    }

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   ✅ 数据库迁移完成！                     ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log('下一步：');
    console.log('1. 启动后端服务: cd backend && npm run dev');
    console.log('2. 启动前端服务: npm run dev');
    console.log('3. 测试登录、查询等功能是否正常\n');

  } catch (error) {
    console.error('\n❌ 执行过程出错:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行主函数
main();
