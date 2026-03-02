const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

const dbPath = path.join(__dirname, 'data', 'crm_dev.db');

async function migrate() {
  const db = new sqlite3.Database(dbPath);
  const dbRun = promisify(db.run.bind(db));
  const dbGet = promisify(db.get.bind(db));
  const dbAll = promisify(db.all.bind(db));

  try {
    console.log('='.repeat(60));
    console.log('增值管理物流公司字段迁移');
    console.log('='.repeat(60));
    console.log('数据库:', dbPath);
    console.log('='.repeat(60));

    // 1. 检查字段是否存在
    console.log('\n步骤1: 检查表结构...');
    const columns = await dbAll(`PRAGMA table_info(value_added_orders)`);
    const hasExpressCompany = columns.some(col => col.name === 'express_company');

    if (hasExpressCompany) {
      console.log('✅ express_company 字段已存在');
    } else {
      console.log('❌ express_company 字段不存在，开始添加...');

      // 2. 添加字段
      await dbRun(`
        ALTER TABLE value_added_orders
        ADD COLUMN express_company VARCHAR(50) NULL
      `);
      console.log('✅ express_company 字段添加成功');
    }

    // 3. 同步数据
    console.log('\n步骤2: 同步物流公司数据...');
    const result = await dbRun(`
      UPDATE value_added_orders
      SET express_company = (
        SELECT express_company
        FROM orders
        WHERE orders.id = value_added_orders.order_id
      )
      WHERE order_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = value_added_orders.order_id
          AND orders.express_company IS NOT NULL
        )
    `);
    console.log(`✅ 数据同步完成 (更新了 ${result?.changes || 0} 条记录)`);

    // 4. 验证结果
    console.log('\n步骤3: 验证结果...');
    const stats = await dbGet(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN express_company IS NOT NULL AND express_company != '' THEN 1 END) as synced
      FROM value_added_orders
    `);

    console.log(`  总记录数: ${stats.total}`);
    console.log(`  已同步物流公司: ${stats.synced}`);
    if (stats.total > 0) {
      console.log(`  同步率: ${((stats.synced / stats.total) * 100).toFixed(1)}%`);
    }

    // 5. 显示示例数据
    console.log('\n步骤4: 示例数据（前5条）...');
    const samples = await dbAll(`
      SELECT
        order_number,
        tracking_number,
        express_company
      FROM value_added_orders
      WHERE tracking_number IS NOT NULL
      LIMIT 5
    `);

    if (samples.length === 0) {
      console.log('  没有找到有物流单号的记录');
    } else {
      console.log('\n  订单号 | 物流单号 | 物流公司');
      console.log('  ' + '-'.repeat(60));
      samples.forEach(row => {
        console.log(`  ${row.order_number || 'N/A'} | ${row.tracking_number || 'N/A'} | ${row.express_company || '空'}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 迁移完成！');
    console.log('='.repeat(60));
    console.log('下一步操作:');
    console.log('1. 重启后端服务: npm run dev');
    console.log('2. 打开增值管理页面');
    console.log('3. 点击物流单号超链接测试弹窗');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

migrate().catch(err => {
  console.error('执行出错:', err);
  process.exit(1);
});
