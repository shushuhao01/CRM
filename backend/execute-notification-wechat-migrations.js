const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function executeMigrations() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local',
    multipleStatements: true
  });

  try {
    console.log('开始执行通知模板和微信公众号系统迁移...\n');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'production-notification-wechat-complete.sql');
    const sql = await fs.readFile(sqlFile, 'utf8');

    // 执行SQL
    console.log('执行SQL脚本...');
    await connection.query(sql);
    console.log('✓ SQL脚本执行成功\n');

    // 验证表是否创建成功
    console.log('验证表创建情况...');
    const tables = [
      'notification_templates',
      'wechat_followers',
      'wechat_message_logs',
      'wechat_official_account_config',
      'wechat_qrcode_scenes'
    ];

    for (const table of tables) {
      const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✓ ${table} 表已创建`);

        // 获取表结构
        const [columns] = await connection.query(`DESCRIBE ${table}`);
        console.log(`  - 字段数: ${columns.length}`);
      } else {
        console.log(`✗ ${table} 表创建失败`);
      }
    }

    // 检查默认数据
    console.log('\n检查默认数据...');
    const [configRows] = await connection.query('SELECT COUNT(*) as count FROM wechat_official_account_config');
    console.log(`✓ 微信公众号配置记录数: ${configRows[0].count}`);

    console.log('\n✓ 所有迁移执行完成！');
    console.log('\n下一步:');
    console.log('1. 在Admin后台配置微信公众号信息');
    console.log('2. 配置通知模板');
    console.log('3. 将 production-notification-wechat-complete.sql 在生产环境执行');

  } catch (error) {
    console.error('执行迁移时出错:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

executeMigrations();
