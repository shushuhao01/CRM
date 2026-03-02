/**
 * 诊断生产环境增值管理500错误的详细脚本
 * 这个脚本会模拟后端的查询逻辑,找出具体问题
 */

require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');

async function diagnose() {
  let connection;

  try {
    console.log('=== 连接生产环境数据库 ===\n');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm'
    });

    console.log('✅ 数据库连接成功\n');

    // 1. 检查表是否存在
    console.log('=== 1. 检查表是否存在 ===');
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'value_added_orders'
    `);

    if (tables.length === 0) {
      console.log('❌ 表 value_added_orders 不存在！');
      return;
    }
    console.log('✅ 表存在\n');

    // 2. 检查索引
    console.log('=== 2. 检查索引 ===');
    const [indexes] = await connection.query(`
      SHOW INDEX FROM value_added_orders
    `);

    console.log(`找到 ${indexes.length} 个索引：`);
    const indexMap = new Map();
    indexes.forEach(idx => {
      if (!indexMap.has(idx.Key_name)) {
        indexMap.set(idx.Key_name, []);
      }
      indexMap.get(idx.Key_name).push(idx.Column_name);
    });

    indexMap.forEach((columns, indexName) => {
      console.log(`  - ${indexName}: ${columns.join(', ')}`);
    });
    console.log('');

    // 3. 检查数据量
    console.log('=== 3. 检查数据量 ===');
    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total FROM value_added_orders
    `);
    console.log(`总记录数: ${countResult[0].total}\n`);

    // 4. 测试基本查询
    console.log('=== 4. 测试基本查询 ===');
    try {
      const [basicResult] = await connection.query(`
        SELECT * FROM value_added_orders
        ORDER BY created_at DESC
        LIMIT 1
      `);
      console.log('✅ 基本查询成功');
      if (basicResult.length > 0) {
        console.log('第一条记录字段：', Object.keys(basicResult[0]).join(', '));
      }
      console.log('');
    } catch (err) {
      console.log('❌ 基本查询失败:', err.message);
      console.log('');
    }

    // 5. 测试带条件的查询（模拟前端请求）
    console.log('=== 5. 测试带条件的查询 ===');
    try {
      const [condResult] = await connection.query(`
        SELECT * FROM value_added_orders
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.log(`✅ 条件查询成功，返回 ${condResult.length} 条记录\n`);
    } catch (err) {
      console.log('❌ 条件查询失败:', err.message);
      console.log('SQL:', err.sql);
      console.log('');
    }

    // 6. 测试日期筛选查询
    console.log('=== 6. 测试日期筛选查询 ===');
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [dateResult] = await connection.query(`
        SELECT COUNT(*) as count FROM value_added_orders
        WHERE order_date BETWEEN ? AND ?
      `, [startOfMonth, endOfMonth]);

      console.log(`✅ 日期筛选成功，本月记录数: ${dateResult[0].count}\n`);
    } catch (err) {
      console.log('❌ 日期筛选失败:', err.message);
      console.log('');
    }

    // 7. 测试关键词搜索
    console.log('=== 7. 测试关键词搜索 ===');
    try {
      const [searchResult] = await connection.query(`
        SELECT COUNT(*) as count FROM value_added_orders
        WHERE order_number LIKE '%test%'
        OR customer_phone LIKE '%test%'
        OR tracking_number LIKE '%test%'
        OR customer_name LIKE '%test%'
      `);
      console.log(`✅ 关键词搜索成功，匹配记录数: ${searchResult[0].count}\n`);
    } catch (err) {
      console.log('❌ 关键词搜索失败:', err.message);
      console.log('');
    }

    // 8. 测试完整的分页查询（模拟实际请求）
    console.log('=== 8. 测试完整的分页查询 ===');
    try {
      // 先获取总数
      const [totalResult] = await connection.query(`
        SELECT COUNT(*) as total FROM value_added_orders
        WHERE status = 'pending'
      `);

      // 再获取分页数据
      const [pageResult] = await connection.query(`
        SELECT * FROM value_added_orders
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 10 OFFSET 0
      `);

      console.log(`✅ 分页查询成功`);
      console.log(`   总数: ${totalResult[0].total}`);
      console.log(`   返回: ${pageResult.length} 条记录\n`);
    } catch (err) {
      console.log('❌ 分页查询失败:', err.message);
      console.log('');
    }

    // 9. 检查是否有NULL值导致问题
    console.log('=== 9. 检查NULL值情况 ===');
    const [nullCheck] = await connection.query(`
      SELECT
        SUM(CASE WHEN order_number IS NULL THEN 1 ELSE 0 END) as null_order_number,
        SUM(CASE WHEN customer_name IS NULL THEN 1 ELSE 0 END) as null_customer_name,
        SUM(CASE WHEN customer_phone IS NULL THEN 1 ELSE 0 END) as null_customer_phone,
        SUM(CASE WHEN tracking_number IS NULL THEN 1 ELSE 0 END) as null_tracking_number,
        SUM(CASE WHEN express_company IS NULL THEN 1 ELSE 0 END) as null_express_company,
        SUM(CASE WHEN company_name IS NULL THEN 1 ELSE 0 END) as null_company_name
      FROM value_added_orders
    `);

    console.log('NULL值统计：');
    Object.entries(nullCheck[0]).forEach(([field, count]) => {
      if (count > 0) {
        console.log(`  ⚠️  ${field}: ${count} 条记录`);
      }
    });
    console.log('');

    // 10. 检查数据类型问题
    console.log('=== 10. 检查数据类型 ===');
    const [typeCheck] = await connection.query(`
      SELECT
        unit_price,
        settlement_amount,
        typeof(unit_price) as unit_price_type,
        typeof(settlement_amount) as settlement_amount_type
      FROM value_added_orders
      LIMIT 1
    `);

    if (typeCheck.length > 0) {
      console.log('数据类型示例：');
      console.log(`  unit_price: ${typeCheck[0].unit_price} (${typeof typeCheck[0].unit_price})`);
      console.log(`  settlement_amount: ${typeCheck[0].settlement_amount} (${typeof typeCheck[0].settlement_amount})`);
    }
    console.log('');

    console.log('=== 诊断完成 ===');
    console.log('\n如果所有测试都通过，问题可能在：');
    console.log('1. TypeORM 查询构建器的语法问题');
    console.log('2. 实体映射问题');
    console.log('3. 同步函数中的 Order 实体导入问题');
    console.log('4. 数据序列化问题');
    console.log('\n建议：查看生产环境后端日志获取详细错误堆栈');

  } catch (error) {
    console.error('\n❌ 诊断过程出错：', error.message);
    console.error('错误详情：', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 运行诊断
diagnose().catch(console.error);
