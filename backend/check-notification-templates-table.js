const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkNotificationTemplatesTable() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm'
    });

    console.log('✓ 数据库连接成功');

    // 检查表是否存在
    const [tables] = await conn.query('SHOW TABLES LIKE "notification_templates"');
    console.log('\nnotification_templates表存在:', tables.length > 0);

    if (tables.length > 0) {
      // 查看表结构
      const [columns] = await conn.query('DESCRIBE notification_templates');
      console.log('\n表结构:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
      });

      // 查看记录数
      const [countResult] = await conn.query('SELECT COUNT(*) as count FROM notification_templates');
      console.log(`\n记录数: ${countResult[0].count}`);
    } else {
      console.log('\n❌ 表不存在，需要创建');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

checkNotificationTemplatesTable();
