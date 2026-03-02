/**
 * 检查本地开发环境的增值管理表索引
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'crm.db');
const db = new sqlite3.Database(dbPath);

console.log('=== 检查本地开发环境数据库索引 ===\n');

// 检查 value_added_orders 表的索引
db.all(`
  SELECT name, sql
  FROM sqlite_master
  WHERE type = 'index'
  AND tbl_name = 'value_added_orders'
  ORDER BY name
`, (err, indexes) => {
  if (err) {
    console.error('❌ 查询索引失败:', err.message);
    db.close();
    return;
  }

  console.log(`找到 ${indexes.length} 个索引：\n`);

  if (indexes.length === 0) {
    console.log('⚠️  警告：表中没有任何索引！');
  } else {
    indexes.forEach((idx, i) => {
      console.log(`${i + 1}. ${idx.name}`);
      if (idx.sql) {
        console.log(`   ${idx.sql}\n`);
      } else {
        console.log(`   (系统自动创建的索引)\n`);
      }
    });
  }

  // 检查表结构
  console.log('\n=== 检查表结构 ===\n');
  db.all(`PRAGMA table_info(value_added_orders)`, (err, columns) => {
    if (err) {
      console.error('❌ 查询表结构失败:', err.message);
      db.close();
      return;
    }

    console.log('表字段列表：');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });

    // 测试查询性能
    console.log('\n=== 测试查询性能 ===\n');

    const startTime = Date.now();
    db.all(`
      SELECT COUNT(*) as total
      FROM value_added_orders
      WHERE status = 'pending'
    `, (err, result) => {
      const queryTime = Date.now() - startTime;

      if (err) {
        console.error('❌ 查询失败:', err.message);
      } else {
        console.log(`✅ 查询成功: ${result[0].total} 条待处理记录`);
        console.log(`⏱️  查询耗时: ${queryTime}ms`);
      }

      db.close();
      console.log('\n数据库连接已关闭');
    });
  });
});
