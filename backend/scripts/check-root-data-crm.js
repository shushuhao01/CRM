const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/crm.db');
console.log('数据库路径:', dbPath);

const db = new sqlite3.Database(dbPath);

console.log('\n=== 检查根目录data/crm.db数据库 ===\n');

// 查看表结构
db.all(`PRAGMA table_info(customers)`, (err, columns) => {
  if (err) {
    console.error('查询表结构失败:', err);
    db.close();
    return;
  }

  console.log('customers表结构:');
  const columnNames = columns.map(c => `${c.name}(${c.type})`).join(', ');
  console.log(columnNames);

  // 查询客户
  db.all(`SELECT * FROM customers ORDER BY created_at DESC LIMIT 10`, (err, rows) => {
    if (err) {
      console.error('\n查询失败:', err);
      db.close();
      return;
    }

    console.log('\n最近10条客户记录:');
    if (rows && rows.length > 0) {
      rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ID: ${row.id} (类型: ${typeof row.id}, 格式: ${String(row.id).includes('-') ? 'UUID' : 'INTEGER'})`);
        console.log(`   姓名: ${row.name}`);
        console.log(`   电话: ${row.phone || '无'}`);
        console.log(`   创建时间: ${row.created_at}`);
      });
    } else {
      console.log('没有客户记录');
    }

    // 检查总数
    db.get('SELECT COUNT(*) as total FROM customers', (err, result) => {
      if (err) {
        console.error('统计失败:', err);
      } else {
        console.log(`\n客户总数: ${result.total}`);
      }

      // 检查customer_shares表
      db.all(`PRAGMA table_info(customer_shares)`, (err, shareColumns) => {
        if (err || !shareColumns || shareColumns.length === 0) {
          console.log('\n⚠️  customer_shares表不存在！这就是问题所在！');
          console.log('需要创建customer_shares表才能使用分享功能。');
        } else {
          console.log('\ncustomer_shares表结构:');
          const shareColumnNames = shareColumns.map(c => `${c.name}(${c.type})`).join(', ');
          console.log(shareColumnNames);

          // 查询分享记录
          db.all(`SELECT * FROM customer_shares LIMIT 5`, (err, shares) => {
            if (!err && shares) {
              console.log(`\n分享记录数: ${shares.length}`);
              if (shares.length > 0) {
                console.table(shares);
              }
            }
          });
        }

        db.close();
        console.log('\n=== 查询完成 ===');
      });
    });
  });
});
