/**
 * 简单诊断脚本 - 直接读取.env.production配置
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// 读取.env.production文件
function loadEnv() {
  const envPath = path.join(__dirname, '.env.production');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      env[key.trim()] = value;
    }
  });

  return env;
}

async function diagnose() {
  let connection;

  try {
    const env = loadEnv();

    console.log('=== 数据库配置 ===');
    console.log(`Host: ${env.DB_HOST}`);
    console.log(`Port: ${env.DB_PORT}`);
    console.log(`User: ${env.DB_USER}`);
    console.log(`Database: ${env.DB_NAME}`);
    console.log('');

    console.log('=== 连接数据库 ===');
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: parseInt(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME
    });

    console.log('✅ 连接成功\n');

    // 1. 检查表是否存在
    console.log('=== 1. 检查表 ===');
    const [tables] = await connection.query(`SHOW TABLES LIKE 'value_added_orders'`);
    if (tables.length === 0) {
      console.log('❌ 表 value_added_orders 不存在！');
      return;
    }
    console.log('✅ 表存在\n');

    // 2. 检查数据量
    console.log('=== 2. 数据量 ===');
    const [count] = await connection.query(`SELECT COUNT(*) as total FROM value_added_orders`);
    console.log(`总记录数: ${count[0].total}\n`);

    // 3. 测试简单查询
    console.log('=== 3. 测试查询 ===');
    try {
      const [result] = await connection.query(`
        SELECT * FROM value_added_orders
        ORDER BY created_at DESC
        LIMIT 1
      `);
      console.log('✅ 查询成功');
      if (result.length > 0) {
        console.log('字段:', Object.keys(result[0]).join(', '));
      }
    } catch (err) {
      console.log('❌ 查询失败:', err.message);
    }
    console.log('');

    // 4. 检查索引
    console.log('=== 4. 索引情况 ===');
    const [indexes] = await connection.query(`SHOW INDEX FROM value_added_orders`);
    const indexMap = new Map();
    indexes.forEach(idx => {
      if (!indexMap.has(idx.Key_name)) {
        indexMap.set(idx.Key_name, []);
      }
      indexMap.get(idx.Key_name).push(idx.Column_name);
    });

    console.log(`找到 ${indexMap.size} 个索引：`);
    indexMap.forEach((columns, name) => {
      console.log(`  - ${name}: ${columns.join(', ')}`);
    });
    console.log('');

    // 5. 检查 express_company 字段
    console.log('=== 5. 检查字段 ===');
    const [columns] = await connection.query(`DESCRIBE value_added_orders`);
    const hasExpressCompany = columns.some(col => col.Field === 'express_company');

    if (hasExpressCompany) {
      console.log('✅ express_company 字段存在');
    } else {
      console.log('❌ express_company 字段不存在！需要添加');
      console.log('\n执行以下SQL添加字段：');
      console.log('ALTER TABLE `value_added_orders` ADD COLUMN `express_company` VARCHAR(50) NULL AFTER `tracking_number`;');
    }
    console.log('');

    console.log('=== 诊断完成 ===');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n数据库权限问题！请检查：');
      console.error('1. .env.production 中的数据库密码是否正确');
      console.error('2. 数据库用户是否有访问权限');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnose().catch(console.error);
