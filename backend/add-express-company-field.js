/**
 * 为增值订单表添加物流公司字段
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm_dev.db');

console.log('数据库路径:', dbPath);
console.log('开始执行迁移...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('✅ 数据库连接成功\n');

  // 执行迁移
  addField();
});

function addField() {
  console.log('步骤1: 添加 express_company 字段...');

  db.run(`
    ALTER TABLE value_added_orders
    ADD COLUMN express_company VARCHAR(50) NULL
  `, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ express_company 字段已存在\n');
        syncData();
      } else {
        console.error('❌ 添加字段失败:', err.message);
        db.close();
        process.exit(1);
      }
    } else {
      console.log('✅ express_company 字段添加成功\n');
      syncData();
    }
  });
}

function syncData() {
  console.log('步骤2: 从订单表同步物流公司数据...');

  db.run(`
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
  `, function(err) {
    if (err) {
      console.error('❌ 同步数据失败:', err.message);
      db.close();
      process.exit(1);
    } else {
      console.log(`✅ 数据同步完成 (更新了 ${this.changes} 条记录)\n`);
      verifyResult();
    }
  });
}

function verifyResult() {
  console.log('步骤3: 验证结果...');

  db.get(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN express_company IS NOT NULL AND express_company != '' THEN 1 END) as synced
    FROM value_added_orders
  `, (err, row) => {
    if (err) {
      console.error('❌ 验证失败:', err.message);
      db.close();
      process.exit(1);
    }

    console.log(`  总记录数: ${row.total}`);
    console.log(`  已同步物流公司: ${row.synced}`);
    if (row.total > 0) {
      console.log(`  同步率: ${((row.synced / row.total) * 100).toFixed(1)}%`);
    }

    // 显示示例数据
    showSampleData();
  });
}

function showSampleData() {
  console.log('\n步骤4: 显示示例数据（前5条）...');

  db.all(`
    SELECT
      order_number,
      tracking_number,
      express_company
    FROM value_added_orders
    WHERE tracking_number IS NOT NULL
    LIMIT 5
  `, (err, rows) => {
    if (err) {
      console.error('❌ 查询失败:', err.message);
    } else if (rows.length === 0) {
      console.log('  没有找到有物流单号的记录');
    } else {
      console.log('\n  订单号 | 物流单号 | 物流公司');
      console.log('  ' + '-'.repeat(60));
      rows.forEach(row => {
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

    db.close(() => {
      process.exit(0);
    });
  });
}
