/**
 * 检查生产环境索引和性能
 * 评估是否需要添加索引，以及当前查询速度
 */

require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');

async function checkIndexesAndPerformance() {
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

    // 1. 检查当前索引
    console.log('=== 1. 当前索引情况 ===');
    const [indexes] = await connection.query(`
      SHOW INDEX FROM value_added_orders
    `);

    const indexMap = new Map();
    indexes.forEach(idx => {
      if (!indexMap.has(idx.Key_name)) {
        indexMap.set(idx.Key_name, {
          columns: [],
          unique: idx.Non_unique === 0,
          type: idx.Index_type
        });
      }
      indexMap.get(idx.Key_name).columns.push(idx.Column_name);
    });

    console.log(`找到 ${indexMap.size} 个索引：\n`);
    indexMap.forEach((info, indexName) => {
      const uniqueStr = info.unique ? ' (UNIQUE)' : '';
      console.log(`  ${indexName}${uniqueStr}: ${info.columns.join(', ')} [${info.type}]`);
    });
    console.log('');

    // 2. 检查数据量
    console.log('=== 2. 数据量统计 ===');
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'valid' THEN 1 END) as valid,
        COUNT(CASE WHEN status = 'invalid' THEN 1 END) as invalid,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM value_added_orders
    `);

    console.log(`总记录数: ${stats[0].total}`);
    console.log(`  - 待处理: ${stats[0].pending}`);
    console.log(`  - 有效: ${stats[0].valid}`);
    console.log(`  - 无效: ${stats[0].invalid}`);
    console.log(`数据时间范围: ${stats[0].earliest} ~ ${stats[0].latest}`);
    console.log('');

    // 3. 性能测试 - 基本查询
    console.log('=== 3. 性能测试 ===\n');

    // 测试1：简单查询
    console.log('测试1：简单分页查询');
    let start = Date.now();
    await connection.query(`
      SELECT * FROM value_added_orders
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log(`  耗时: ${Date.now() - start}ms`);

    // 测试2：状态筛选
    console.log('测试2：状态筛选查询');
    start = Date.now();
    await connection.query(`
      SELECT * FROM value_added_orders
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log(`  耗时: ${Date.now() - start}ms`);

    // 测试3：日期筛选
    console.log('测试3：日期筛选查询');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    start = Date.now();
    await connection.query(`
      SELECT * FROM value_added_orders
      WHERE order_date BETWEEN ? AND ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [startOfMonth, endOfMonth]);
    console.log(`  耗时: ${Date.now() - start}ms`);

    // 测试4：复合条件查询
    console.log('测试4：复合条件查询（状态+日期）');
    start = Date.now();
    await connection.query(`
      SELECT * FROM value_added_orders
      WHERE status = 'pending'
      AND order_date BETWEEN ? AND ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [startOfMonth, endOfMonth]);
    console.log(`  耗时: ${Date.now() - start}ms`);

    // 测试5：关键词搜索
    console.log('测试5：关键词搜索');
    start = Date.now();
    await connection.query(`
      SELECT * FROM value_added_orders
      WHERE customer_name LIKE '%张%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log(`  耗时: ${Date.now() - start}ms`);

    // 测试6：统计查询
    console.log('测试6：统计查询');
    start = Date.now();
    await connection.query(`
      SELECT status, COUNT(*) as count, SUM(unit_price) as amount
      FROM value_added_orders
      GROUP BY status
    `);
    console.log(`  耗时: ${Date.now() - start}ms\n`);

    // 4. 性能评估
    console.log('=== 4. 性能评估 ===\n');

    const totalRecords = stats[0].total;
    let recommendation = '';

    if (totalRecords < 1000) {
      recommendation = '✅ 数据量较小（<1000条），无需添加索引';
    } else if (totalRecords < 10000) {
      recommendation = '⚠️  数据量中等（1000-10000条），建议添加常用查询字段的索引';
    } else {
      recommendation = '🔥 数据量较大（>10000条），强烈建议添加索引以提升性能';
    }

    console.log(recommendation);
    console.log('');

    // 5. 索引建议
    console.log('=== 5. 索引建议 ===\n');

    const recommendedIndexes = [
      { name: 'idx_order_id', columns: ['order_id'], reason: '用于同步检查，避免重复插入' },
      { name: 'idx_status', columns: ['status'], reason: '用于标签页筛选（待处理/有效/无效）' },
      { name: 'idx_order_date', columns: ['order_date'], reason: '用于日期筛选' },
      { name: 'idx_created_at', columns: ['created_at'], reason: '用于排序' },
      { name: 'idx_status_date', columns: ['status', 'order_date'], reason: '用于状态+日期复合查询' },
      { name: 'idx_company_id', columns: ['company_id'], reason: '用于公司筛选' }
    ];

    const existingIndexNames = Array.from(indexMap.keys());

    console.log('推荐的索引：\n');
    recommendedIndexes.forEach(idx => {
      const exists = existingIndexNames.some(name =>
        name === idx.name ||
        indexMap.get(name)?.columns.join(',') === idx.columns.join(',')
      );

      const status = exists ? '✅ 已存在' : '❌ 缺失';
      console.log(`${status} ${idx.name}`);
      console.log(`   字段: ${idx.columns.join(', ')}`);
      console.log(`   用途: ${idx.reason}`);
      console.log('');
    });

    // 6. 生成索引SQL
    console.log('=== 6. 添加缺失索引的SQL ===\n');

    const missingIndexes = recommendedIndexes.filter(idx => {
      return !existingIndexNames.some(name =>
        name === idx.name ||
        indexMap.get(name)?.columns.join(',') === idx.columns.join(',')
      );
    });

    if (missingIndexes.length === 0) {
      console.log('✅ 所有推荐的索引都已存在，无需添加\n');
    } else {
      console.log('复制以下SQL到宝塔phpMyAdmin执行（逐条执行）：\n');
      console.log('```sql');
      missingIndexes.forEach(idx => {
        const columns = idx.columns.map(c => `\`${c}\``).join(', ');
        console.log(`ALTER TABLE \`value_added_orders\` ADD INDEX \`${idx.name}\` (${columns});`);
      });
      console.log('```\n');
    }

    // 7. 性能优化建议
    console.log('=== 7. 性能优化建议 ===\n');

    if (totalRecords > 10000) {
      console.log('🔥 数据量较大，建议：');
      console.log('  1. 添加上述缺失的索引');
      console.log('  2. 定期清理过期数据（如6个月前的已结算订单）');
      console.log('  3. 考虑数据归档策略');
      console.log('  4. 使用分页查询，避免一次性加载大量数据');
    } else if (totalRecords > 1000) {
      console.log('⚠️  数据量中等，建议：');
      console.log('  1. 添加常用查询字段的索引');
      console.log('  2. 监控查询性能，如果超过100ms考虑优化');
    } else {
      console.log('✅ 数据量较小，当前性能应该足够');
      console.log('  建议：继续监控，数据量增长后再考虑添加索引');
    }

    console.log('\n=== 检查完成 ===');

  } catch (error) {
    console.error('\n❌ 检查过程出错：', error.message);
    console.error('错误详情：', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 运行检查
checkIndexesAndPerformance().catch(console.error);
