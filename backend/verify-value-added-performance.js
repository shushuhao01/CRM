/**
 * 增值管理性能验证脚本
 * 用于验证索引是否正确创建，以及查询性能
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

async function verifyPerformance() {
  let connection;

  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm'
    });

    console.log('✅ 数据库连接成功\n');

    // 1. 检查索引是否存在
    console.log('========== 第1步：检查索引 ==========');
    const [indexes] = await connection.query(`
      SELECT
        INDEX_NAME,
        COLUMN_NAME,
        SEQ_IN_INDEX,
        CARDINALITY,
        INDEX_TYPE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'value_added_orders'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [process.env.DB_NAME || 'crm']);

    const requiredIndexes = [
      'idx_order_id',
      'idx_order_date',
      'idx_order_status',
      'idx_customer_name',
      'idx_status_date',
      'idx_settlement_date',
      'idx_company_date'
    ];

    const existingIndexes = new Set(indexes.map(idx => idx.INDEX_NAME));

    console.log('已存在的索引：');
    requiredIndexes.forEach(indexName => {
      if (existingIndexes.has(indexName)) {
        console.log(`  ✅ ${indexName}`);
      } else {
        console.log(`  ❌ ${indexName} - 缺失！`);
      }
    });

    const missingIndexes = requiredIndexes.filter(idx => !existingIndexes.has(idx));
    if (missingIndexes.length > 0) {
      console.log('\n⚠️  警告：以下索引缺失，请执行优化SQL：');
      missingIndexes.forEach(idx => console.log(`  - ${idx}`));
      console.log('\n执行文件：backend/database-migrations/optimize-value-added-performance.sql\n');
    } else {
      console.log('\n✅ 所有必需索引已创建\n');
    }

    // 2. 检查表数据量
    console.log('========== 第2步：检查数据量 ==========');
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as total FROM value_added_orders'
    );
    const totalRecords = countResult[0].total;
    console.log(`总记录数：${totalRecords.toLocaleString()} 条\n`);

    // 3. 测试查询性能
    console.log('========== 第3步：测试查询性能 ==========');

    // 测试1：按状态查询
    console.log('测试1：按状态查询（标签页切换）');
    const start1 = Date.now();
    const [result1] = await connection.query(`
      SELECT * FROM value_added_orders
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    const time1 = Date.now() - start1;
    console.log(`  耗时：${time1}ms`);
    console.log(`  结果：${result1.length} 条记录`);
    console.log(`  评价：${time1 < 100 ? '✅ 优秀' : time1 < 500 ? '⚠️  一般' : '❌ 需要优化'}\n`);

    // 测试2：按日期范围查询
    console.log('测试2：按日期范围查询（日期筛选）');
    const start2 = Date.now();
    const [result2] = await connection.query(`
      SELECT * FROM value_added_orders
      WHERE order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY created_at DESC
      LIMIT 10
    `);
    const time2 = Date.now() - start2;
    console.log(`  耗时：${time2}ms`);
    console.log(`  结果：${result2.length} 条记录`);
    console.log(`  评价：${time2 < 100 ? '✅ 优秀' : time2 < 500 ? '⚠️  一般' : '❌ 需要优化'}\n`);

    // 测试3：复合条件查询
    console.log('测试3：复合条件查询（状态+日期）');
    const start3 = Date.now();
    const [result3] = await connection.query(`
      SELECT * FROM value_added_orders
      WHERE status = 'valid'
        AND order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY created_at DESC
      LIMIT 10
    `);
    const time3 = Date.now() - start3;
    console.log(`  耗时：${time3}ms`);
    console.log(`  结果：${result3.length} 条记录`);
    console.log(`  评价：${time3 < 100 ? '✅ 优秀' : time3 < 500 ? '⚠️  一般' : '❌ 需要优化'}\n`);

    // 测试4：按order_id查询（同步检查）
    if (totalRecords > 0) {
      console.log('测试4：按order_id查询（同步检查）');
      const [sampleOrder] = await connection.query(
        'SELECT order_id FROM value_added_orders WHERE order_id IS NOT NULL LIMIT 1'
      );
      if (sampleOrder.length > 0) {
        const orderId = sampleOrder[0].order_id;
        const start4 = Date.now();
        const [result4] = await connection.query(
          'SELECT * FROM value_added_orders WHERE order_id = ?',
          [orderId]
        );
        const time4 = Date.now() - start4;
        console.log(`  耗时：${time4}ms`);
        console.log(`  结果：${result4.length} 条记录`);
        console.log(`  评价：${time4 < 10 ? '✅ 优秀' : time4 < 50 ? '⚠️  一般' : '❌ 需要优化'}\n`);
      }
    }

    // 4. 分析执行计划
    console.log('========== 第4步：分析执行计划 ==========');
    const [explainResult] = await connection.query(`
      EXPLAIN SELECT * FROM value_added_orders
      WHERE status = 'pending'
        AND order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('查询执行计划：');
    explainResult.forEach(row => {
      console.log(`  类型：${row.type}`);
      console.log(`  可能的索引：${row.possible_keys || '无'}`);
      console.log(`  使用的索引：${row.key || '无'}`);
      console.log(`  扫描行数：${row.rows}`);
      console.log(`  额外信息：${row.Extra || '无'}\n`);
    });

    if (explainResult[0].key && explainResult[0].key.includes('idx_')) {
      console.log('✅ 查询正在使用索引，性能良好\n');
    } else {
      console.log('⚠️  警告：查询未使用索引，可能需要优化\n');
    }

    // 5. 总结
    console.log('========== 验证总结 ==========');
    const avgTime = (time1 + time2 + time3) / 3;

    if (missingIndexes.length === 0 && avgTime < 200) {
      console.log('✅ 性能优化已完成，系统运行良好！');
      console.log(`   平均查询时间：${avgTime.toFixed(0)}ms`);
      console.log(`   所有索引已创建`);
    } else if (missingIndexes.length > 0) {
      console.log('❌ 性能优化未完成，请执行以下操作：');
      console.log('   1. 执行 backend/database-migrations/optimize-value-added-performance.sql');
      console.log('   2. 重新运行此验证脚本');
    } else {
      console.log('⚠️  性能一般，建议：');
      console.log('   1. 检查数据量是否过大（建议 < 100万）');
      console.log('   2. 执行 ANALYZE TABLE value_added_orders');
      console.log('   3. 考虑增加服务器资源');
    }

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    console.error('\n请检查：');
    console.error('1. 数据库连接配置是否正确（.env.production）');
    console.error('2. 数据库是否可访问');
    console.error('3. value_added_orders 表是否存在');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行验证
console.log('========================================');
console.log('增值管理性能验证脚本');
console.log('========================================\n');

verifyPerformance().then(() => {
  console.log('\n========================================');
  console.log('验证完成');
  console.log('========================================\n');
  process.exit(0);
}).catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
