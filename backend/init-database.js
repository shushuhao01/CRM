const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 数据库配置
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '', // 请填入您的MySQL root密码
  charset: 'utf8mb4'
};

const DATABASE_NAME = 'crm_system';
const USER_NAME = 'crm_user';
const USER_PASSWORD = 'your_strong_password_here'; // 请设置强密码

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔗 连接到MySQL服务器...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 创建数据库
    console.log('📊 创建数据库...');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${DATABASE_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 ${DATABASE_NAME} 创建成功`);
    
    // 创建用户
    console.log('👤 创建数据库用户...');
    await connection.execute(`CREATE USER IF NOT EXISTS '${USER_NAME}'@'localhost' IDENTIFIED BY '${USER_PASSWORD}'`);
    await connection.execute(`GRANT ALL PRIVILEGES ON \`${DATABASE_NAME}\`.* TO '${USER_NAME}'@'localhost'`);
    await connection.execute('FLUSH PRIVILEGES');
    console.log(`✅ 用户 ${USER_NAME} 创建成功`);
    
    // 切换到新数据库
    await connection.execute(`USE \`${DATABASE_NAME}\``);
    
    // 读取并执行SQL文件（如果存在）
    const sqlFilePath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(sqlFilePath)) {
      console.log('📄 执行数据库架构文件...');
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      const statements = sqlContent.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.execute(statement);
        }
      }
      console.log('✅ 数据库架构创建成功');
    }
    
    console.log('🎉 数据库初始化完成！');
    console.log('');
    console.log('📋 数据库信息：');
    console.log(`   数据库名: ${DATABASE_NAME}`);
    console.log(`   用户名: ${USER_NAME}`);
    console.log(`   密码: ${USER_PASSWORD}`);
    console.log('');
    console.log('🔧 请更新 .env 文件中的数据库配置：');
    console.log(`   DB_HOST=localhost`);
    console.log(`   DB_PORT=3306`);
    console.log(`   DB_USERNAME=${USER_NAME}`);
    console.log(`   DB_PASSWORD=${USER_PASSWORD}`);
    console.log(`   DB_DATABASE=${DATABASE_NAME}`);
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 检查参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('CRM系统数据库初始化脚本');
  console.log('');
  console.log('使用方法:');
  console.log('  node init-database.js');
  console.log('');
  console.log('注意事项:');
  console.log('  1. 请先修改脚本中的数据库配置');
  console.log('  2. 确保MySQL服务已启动');
  console.log('  3. 确保有足够的权限创建数据库和用户');
  process.exit(0);
}

// 执行初始化
initDatabase();