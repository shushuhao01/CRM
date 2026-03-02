/**
 * 诊断生产环境增值管理问题
 * 用于排查列表加载500错误
 */

const mysql = require('mysql2/promise');

async function diagnose() {
  let connection;

  try {
    // 连接生产环境数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm'
    });

    console.log('✅ 数据库连接成功\n');

    // 1. 检查表是否存在
    console.log('=== 1. 检查表结构 ===');
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'value_added_orders'
    `);

    if (tables.length === 0) {
      console.log('❌ 表 value_added_orders 不存在！');
      return;
    }
    console.log('✅ 表 value_added_orders 存在\n');

    // 2. 检查表结构
    console.log('=== 2. 检查字段结构 ===');
    const [columns] = await connection.query(`
      DESCRIBE value_added_orders
    `);

    console.log('表字段列表：');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('');

    // 3. 检查关键字段是否存在
    const requiredFields = [
      'id', 'order_id', 'order_number', 'customer_name', 'customer_phone',
      'tracking_number', 'express_company', 'order_status', 'order_date',
      'company_id', 'company_name', 'unit_price', 'status', 'settlement_status',
      'settlement_amount', 'created_at', 'updated_at'
    ];

    console.log('=== 3. 检查必需字段 ===');
    const existingFields = columns.map(col => col.Field);
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));

    if (missingFields.length > 0) {
      console.log('❌ 缺少字段：', missingFields.join(', '));
    } else {
      console.log('✅ 所有必需字段都存在\n');
    }

    // 4. 检查数据量
    console.log('=== 4. 检查数据量 ===');
    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total FROM value_added_orders
    `);
    console.log(`总记录数: ${countResult[0].total}\n`);

    // 5. 检查各状态数量
    console.log('=== 5. 检查状态分布 ===');
    const [statusResult] = await connection.query(`
      SELECT status, COUNT(*) as count
      FROM value_added_orders
      GROUP BY status
    `);
    console.log('状态分布：');
    statusResult.forEach(row => {
      console.log(`  - ${row.status || 'NULL'}: ${row.count}`);
    });
    console.log('');

    // 6. 测试查询（模拟前端请求）
    console.log('=== 6. 测试查询 ===');
    try {
      const [testResult] = await connection.query(`
        SELECT *
        FROM value_added_orders
        ORDER BY created_at DESC
        LIMIT 10
      `);
      console.log(`✅ 查询成功，返回 ${testResult.length} 条记录\n`);

      if (testResult.length > 0) {
        console.log('第一条记录示例：');
        const first = testResult[0];
        console.log(`  - ID: ${first.id}`);
        console.log(`  - 订单号: ${first.order_number}`);
        console.log(`  - 客户: ${first.customer_name}`);
        console.log(`  - 状态: ${first.status}`);
        console.log(`  - 结算状态: ${first.settlement_status}`);
        console.log(`  - 单价: ${first.unit_price}`);
        console.log(`  - 下单日期: ${first.order_date}`);
        console.log('');
      }
    } catch (queryError) {
      console.log('❌ 查询失败：', queryError.message);
      console.log('SQL错误：', queryError.sql);
    }

    // 7. 检查外键关联
    console.log('=== 7. 检查外包公司表 ===');
    const [companyTables] = await connection.query(`
      SHOW TABLES LIKE 'outsource_companies'
    `);

    if (companyTables.length === 0) {
      console.log('❌ 表 outsource_companies 不存在！');
    } else {
      console.log('✅ 表 outsource_companies 存在');

      const [companyCount] = await connection.query(`
        SELECT COUNT(*) as total FROM outsource_companies
      `);
      console.log(`外包公司数量: ${companyCount[0].total}\n`);
    }

    // 8. 检查索引
    console.log('=== 8. 检查索引 ===');
    const [indexes] = await connection.query(`
      SHOW INDEX FROM value_added_orders
    `);

    console.log('索引列表：');
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

    console.log('=== 诊断完成 ===');
    console.log('如果以上检查都正常，请查看后端日志获取详细错误信息');

  } catch (error) {
    console.error('❌ 诊断过程出错：', error.message);
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
