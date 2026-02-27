/**
 * 检查本地 MySQL 数据库是否存在业绩分享相关表
 * 执行：node backend/scripts/check-performance-tables.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function checkTables() {
  let connection;

  try {
    console.log('='.repeat(60));
    console.log('检查本地 MySQL 数据库中的业绩分享表');
    console.log('='.repeat(60));
    console.log();

    // 从环境变量读取数据库配置
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm_local'
    };

    console.log('📊 数据库配置:');
    console.log(`   主机: ${dbConfig.host}`);
    console.log(`   端口: ${dbConfig.port}`);
    console.log(`   用户: ${dbConfig.user}`);
    console.log(`   数据库: ${dbConfig.database}`);
    console.log();

    // 连接数据库
    console.log('🔌 正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    console.log();

    // 检查 performance_shares 表
    console.log('🔍 检查表: performance_shares');
    const [sharesCheck] = await connection.query(
      `SELECT COUNT(*) as count
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'performance_shares'`,
      [dbConfig.database]
    );

    const sharesExists = sharesCheck[0].count > 0;

    if (sharesExists) {
      console.log('   ✅ 表存在');

      // 查看表结构
      const [sharesColumns] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'performance_shares'
         ORDER BY ORDINAL_POSITION`,
        [dbConfig.database]
      );

      console.log(`   📋 字段数量: ${sharesColumns.length}`);

      // 查看数据量
      const [sharesCount] = await connection.query(
        'SELECT COUNT(*) as total FROM performance_shares'
      );
      console.log(`   📊 数据量: ${sharesCount[0].total} 条记录`);
    } else {
      console.log('   ❌ 表不存在');
    }
    console.log();

    // 检查 performance_share_members 表
    console.log('🔍 检查表: performance_share_members');
    const [membersCheck] = await connection.query(
      `SELECT COUNT(*) as count
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'performance_share_members'`,
      [dbConfig.database]
    );

    const membersExists = membersCheck[0].count > 0;

    if (membersExists) {
      console.log('   ✅ 表存在');

      // 查看表结构
      const [membersColumns] = await connection.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'performance_share_members'
         ORDER BY ORDINAL_POSITION`,
        [dbConfig.database]
      );

      console.log(`   📋 字段数量: ${membersColumns.length}`);

      // 查看数据量
      const [membersCount] = await connection.query(
        'SELECT COUNT(*) as total FROM performance_share_members'
      );
      console.log(`   📊 数据量: ${membersCount[0].total} 条记录`);
    } else {
      console.log('   ❌ 表不存在');
    }
    console.log();

    // 总结
    console.log('='.repeat(60));
    console.log('📋 检查结果总结');
    console.log('='.repeat(60));

    if (sharesExists && membersExists) {
      console.log('✅ 两个表都存在，业绩分享功能应该正常工作');
      console.log();
      console.log('💡 如果仍然报错，可能是：');
      console.log('   1. 表结构不完整');
      console.log('   2. 数据格式问题');
      console.log('   3. 权限问题');
    } else if (!sharesExists && !membersExists) {
      console.log('❌ 两个表都不存在');
      console.log();
      console.log('💡 解决方案：');
      console.log('   执行创建脚本: scripts/create-performance-shares-tables-dev.sql');
      console.log('   或在 Navicat 中手动执行该脚本');
    } else {
      console.log('⚠️  只有部分表存在，数据不完整');
      console.log();
      console.log(`   performance_shares: ${sharesExists ? '✅ 存在' : '❌ 不存在'}`);
      console.log(`   performance_share_members: ${membersExists ? '✅ 存在' : '❌ 不存在'}`);
      console.log();
      console.log('💡 建议：删除已存在的表，重新执行完整的创建脚本');
    }

    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ 检查失败:', error.message);
    console.error();

    if (error.code === 'ECONNREFUSED') {
      console.error('💡 可能的原因：');
      console.error('   1. MySQL 服务未启动');
      console.error('   2. 数据库配置错误（检查 backend/.env.local）');
      console.error('   3. 端口被占用');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 可能的原因：');
      console.error('   1. 数据库用户名或密码错误');
      console.error('   2. 用户没有访问权限');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 可能的原因：');
      console.error('   1. 数据库不存在');
      console.error('   2. 数据库名称配置错误');
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行检查
checkTables();
