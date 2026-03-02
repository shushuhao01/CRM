/**
 * 执行增值管理物流公司字段迁移
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'crm_dev.db');
const sqlPath = path.join(__dirname, 'database-migrations', 'add-express-company-to-value-added.sql');

console.log('='.repeat(60));
console.log('执行增值管理物流公司字段迁移');
console.log('='.repeat(60));
console.log('数据库:', dbPath);
console.log('SQL文件:', sqlPath);
console.log('='.repeat(60));

// 读取SQL文件
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

// 分割SQL语句（按分号分割，忽略注释）
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

const db = new sqlite3.Database(dbPath);

let successCount = 0;
let errorCount = 0;

// 串行执行SQL语句
db.serialize(() => {
  statements.forEach((sql, index) => {
    // 跳过纯注释行
    if (sql.startsWith('--') || sql.match(/^\/\*/)) {
      return;
    }

    console.log(`\n执行语句 ${index + 1}/${statements.length}:`);
    console.log(sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));

    db.run(sql, (err) => {
      if (err) {
        // 如果是字段已存在的错误，视为成功
        if (err.message.includes('duplicate column name')) {
          console.log('⚠️  字段已存在，跳过');
          successCount++;
        } else {
          console.error('❌ 执行失败:', err.message);
          errorCount++;
        }
      } else {
        console.log('✅ 执行成功');
        successCount++;
      }

      // 最后一条语句执行完毕
      if (index === statements.length - 1) {
        console.log('\n' + '='.repeat(60));
        console.log('迁移完成');
        console.log('='.repeat(60));
        console.log(`成功: ${successCount} 条`);
        console.log(`失败: ${errorCount} 条`);
        console.log('='.repeat(60));

        // 验证结果
        db.all(`PRAGMA table_info(value_added_orders)`, (err, columns) => {
          if (err) {
            console.error('❌ 验证失败:', err.message);
            db.close();
            return;
          }

          const expressCompanyColumn = columns.find(col => col.name === 'express_company');
          if (expressCompanyColumn) {
            console.log('✅ express_company 字段已成功添加');
            console.log('   类型:', expressCompanyColumn.type);
            console.log('   可空:', expressCompanyColumn.notnull === 0 ? '是' : '否');

            // 检查数据同步情况
            db.get(`
              SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN express_company IS NOT NULL AND express_company != '' THEN 1 END) as synced
              FROM value_added_orders
            `, (err, row) => {
              if (err) {
                console.error('❌ 查询失败:', err.message);
              } else {
                console.log(`\n数据同步情况:`);
                console.log(`   总记录数: ${row.total}`);
                console.log(`   已同步物流公司: ${row.synced}`);

                if (row.total > 0 && row.synced === 0) {
                  console.log('\n⚠️  物流公司数据尚未同步');
                  console.log('   建议: 重启后端服务，系统会自动同步');
                } else if (row.synced > 0) {
                  console.log(`\n✅ 已同步 ${row.synced} 条记录的物流公司信息`);
                }
              }

              console.log('\n' + '='.repeat(60));
              console.log('下一步操作:');
              console.log('1. 重启后端服务: npm run dev');
              console.log('2. 打开增值管理页面测试物流弹窗');
              console.log('='.repeat(60));

              db.close();
            });
          } else {
            console.log('❌ express_company 字段添加失败');
            db.close();
          }
        });
      }
    });
  });
});
