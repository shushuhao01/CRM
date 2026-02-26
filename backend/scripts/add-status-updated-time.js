const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addStatusUpdatedTime() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    charset: 'utf8mb4'
  });

  try {
    console.log('连接到数据库:', process.env.DB_DATABASE);

    // 1. 添加字段
    console.log('\n1. 添加 status_updated_at 字段...');
    await connection.query(`
      ALTER TABLE \`orders\`
      ADD COLUMN \`status_updated_at\` TIMESTAMP NULL COMMENT '状态更新时间（记录最后一次状态变更的时间）' AFTER \`updated_at\`
    `);
    console.log('✓ 字段添加成功');

    // 2. 添加索引
    console.log('\n2. 添加索引...');
    await connection.query(`
      ALTER TABLE \`orders\`
      ADD INDEX \`idx_status_updated_at\` (\`status_updated_at\`)
    `);
    console.log('✓ 索引添加成功');

    // 3. 初始化数据 - 已签收的订单
    console.log('\n3. 初始化已签收订单的状态更新时间...');
    const [result1] = await connection.query(`
      UPDATE \`orders\`
      SET \`status_updated_at\` = \`delivered_at\`
      WHERE \`delivered_at\` IS NOT NULL
    `);
    console.log(`✓ 更新了 ${result1.affectedRows} 条已签收订单`);

    // 4. 初始化数据 - 已发货但未签收的订单
    console.log('\n4. 初始化已发货订单的状态更新时间...');
    const [result2] = await connection.query(`
      UPDATE \`orders\`
      SET \`status_updated_at\` = \`shipped_at\`
      WHERE \`shipped_at\` IS NOT NULL AND \`delivered_at\` IS NULL
    `);
    console.log(`✓ 更新了 ${result2.affectedRows} 条已发货订单`);

    // 5. 初始化数据 - 其他订单
    console.log('\n5. 初始化其他订单的状态更新时间...');
    const [result3] = await connection.query(`
      UPDATE \`orders\`
      SET \`status_updated_at\` = \`updated_at\`
      WHERE \`status_updated_at\` IS NULL
    `);
    console.log(`✓ 更新了 ${result3.affectedRows} 条其他订单`);

    // 6. 验证结果
    console.log('\n6. 验证结果...');
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(\`status_updated_at\`) as orders_with_status_time,
        COUNT(\`delivered_at\`) as delivered_orders,
        COUNT(\`shipped_at\`) as shipped_orders
      FROM \`orders\`
    `);
    console.log('统计信息:', stats[0]);

    // 7. 查看示例数据
    console.log('\n7. 示例数据（最新10条）:');
    const [samples] = await connection.query(`
      SELECT
        order_number,
        status,
        DATE_FORMAT(shipped_at, '%Y-%m-%d %H:%i:%s') as shipped_at,
        DATE_FORMAT(delivered_at, '%Y-%m-%d %H:%i:%s') as delivered_at,
        DATE_FORMAT(status_updated_at, '%Y-%m-%d %H:%i:%s') as status_updated_at
      FROM \`orders\`
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    console.table(samples);

    console.log('\n✅ 迁移完成！');
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addStatusUpdatedTime().catch(console.error);
