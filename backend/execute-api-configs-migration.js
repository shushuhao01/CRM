const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function executeMigration() {
  let connection;

  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm_local',
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功');
    console.log(`   数据库: ${process.env.DB_DATABASE || 'crm_local'}`);

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'create-api-configs-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('\n📝 执行SQL迁移脚本...');

    // 执行SQL
    await connection.query(sql);

    console.log('✅ API配置表创建成功');

    // 检查表是否创建成功
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME IN ('api_configs', 'api_call_logs')
    `, [process.env.DB_DATABASE || 'crm_local']);

    console.log('\n📊 创建的表:');
    tables.forEach(table => {
      console.log(`   ✓ ${table.TABLE_NAME}`);
    });

    // 插入示例数据
    console.log('\n📝 插入示例API配置...');

    const sampleConfigs = [
      {
        id: '1',
        name: '快递100物流查询',
        code: 'kuaidi100',
        description: '快递100物流查询API',
        api_key: 'test_kuaidi100_key',
        api_secret: 'test_kuaidi100_secret',
        status: 'active',
        rate_limit: 1000
      },
      {
        id: '2',
        name: '阿里云短信',
        code: 'aliyun_sms',
        description: '阿里云短信服务API',
        api_key: 'test_aliyun_sms_key',
        api_secret: 'test_aliyun_sms_secret',
        status: 'active',
        rate_limit: 500
      },
      {
        id: '3',
        name: '微信支付',
        code: 'wechat_pay',
        description: '微信支付API',
        api_key: 'test_wechat_pay_key',
        api_secret: 'test_wechat_pay_secret',
        status: 'active',
        rate_limit: 2000
      },
      {
        id: '4',
        name: '阿里云外呼',
        code: 'aliyun_call',
        description: '阿里云外呼系统API',
        api_key: 'test_aliyun_call_key',
        api_secret: 'test_aliyun_call_secret',
        status: 'active',
        rate_limit: 300
      }
    ];

    for (const config of sampleConfigs) {
      await connection.query(`
        INSERT INTO api_configs (id, name, code, description, api_key, api_secret, status, rate_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        status = VALUES(status),
        rate_limit = VALUES(rate_limit)
      `, [
        config.id,
        config.name,
        config.code,
        config.description,
        config.api_key,
        config.api_secret,
        config.status,
        config.rate_limit
      ]);
      console.log(`   ✓ ${config.name}`);
    }

    console.log('\n✅ 迁移完成！');
    console.log('\n📊 数据统计:');

    const [configCount] = await connection.query('SELECT COUNT(*) as count FROM api_configs');
    console.log(`   API配置: ${configCount[0].count} 条`);

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 数据库连接已关闭');
    }
  }
}

// 执行迁移
executeMigration().catch(console.error);
