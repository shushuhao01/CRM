/**
 * CRM系统 - MySQL数据库自动初始化脚本
 * 用于私有部署时自动创建数据库、导入表结构、插入初始数据
 *
 * 使用方式：
 *   node init-mysql-database.js
 *
 * 环境变量（可通过 .env 文件或命令行参数设置）：
 *   DB_HOST - 数据库主机地址 (默认: localhost)
 *   DB_PORT - 数据库端口 (默认: 3306)
 *   DB_USERNAME - 数据库用户名 (默认: root)
 *   DB_PASSWORD - 数据库密码
 *   DB_DATABASE - 数据库名称 (默认: crm)
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = '') { console.log(`${color}${msg}${colors.reset}`); }
function logSuccess(msg) { log(`✅ ${msg}`, colors.green); }
function logError(msg) { log(`❌ ${msg}`, colors.red); }
function logWarn(msg) { log(`⚠️  ${msg}`, colors.yellow); }
function logInfo(msg) { log(`ℹ️  ${msg}`, colors.cyan); }
function logTitle(msg) { log(`\n${'='.repeat(60)}\n  ${msg}\n${'='.repeat(60)}`, colors.bold); }

// 读取用户输入
function askQuestion(question, defaultValue = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

// 密码输入（不回显）
function askPassword(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Windows 下 readline 无法隐藏输入，但足够使用
    rl.question(`${question}: `, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  logTitle('CRM 系统 - 数据库初始化向导');
  log('');
  logInfo('本脚本将为您完成以下操作：');
  log('  1. 连接MySQL数据库服务器');
  log('  2. 创建CRM数据库');
  log('  3. 导入数据库表结构');
  log('  4. 插入初始数据（角色、权限、默认管理员）');
  log('  5. 生成环境配置文件');
  log('');

  // ==================== Step 1: 收集数据库配置 ====================
  logTitle('Step 1: 数据库连接配置');

  const dbHost = process.env.DB_HOST || await askQuestion('MySQL主机地址', 'localhost');
  const dbPort = process.env.DB_PORT || await askQuestion('MySQL端口', '3306');
  const dbUser = process.env.DB_USERNAME || await askQuestion('MySQL用户名', 'root');
  const dbPass = process.env.DB_PASSWORD || await askPassword('MySQL密码');
  const dbName = process.env.DB_DATABASE || await askQuestion('数据库名称', 'crm');

  log('');
  logInfo(`连接配置: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

  // ==================== Step 2: 连接数据库服务器 ====================
  logTitle('Step 2: 连接数据库服务器');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(dbPort),
      user: dbUser,
      password: dbPass,
      multipleStatements: true,
      charset: 'utf8mb4',
    });
    logSuccess('MySQL数据库服务器连接成功');
  } catch (error) {
    logError(`无法连接MySQL服务器: ${error.message}`);
    logWarn('请检查：');
    log('  - MySQL服务是否已启动');
    log('  - 用户名和密码是否正确');
    log('  - 端口号是否正确');
    log('  - 防火墙是否允许连接');
    process.exit(1);
  }

  // ==================== Step 3: 创建数据库 ====================
  logTitle('Step 3: 创建数据库');

  try {
    // 检查数据库是否已存在
    const [databases] = await connection.query(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );

    if (databases.length > 0) {
      logWarn(`数据库 '${dbName}' 已存在`);
      const overwrite = await askQuestion('是否清空并重新初始化？(y/N)', 'N');
      if (overwrite.toLowerCase() !== 'y') {
        logInfo('保留现有数据库，跳过初始化');
        await connection.end();
        process.exit(0);
      }
      // 清空数据库
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      logInfo('已删除旧数据库');
    }

    await connection.query(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    logSuccess(`数据库 '${dbName}' 创建成功`);

    // 切换到新数据库
    await connection.query(`USE \`${dbName}\``);
  } catch (error) {
    logError(`创建数据库失败: ${error.message}`);
    await connection.end();
    process.exit(1);
  }

  // ==================== Step 4: 导入表结构 ====================
  logTitle('Step 4: 导入数据库表结构');

  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    logError(`找不到Schema文件: ${schemaPath}`);
    logWarn('请确保 database/schema.sql 文件存在');
    await connection.end();
    process.exit(1);
  }

  try {
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // 移除 DROP TABLE 语句（只在全新安装时执行创建）
    // 保留 CREATE TABLE IF NOT EXISTS

    // 按分号分割SQL语句
    const statements = schema.split(';').filter(stmt => {
      const trimmed = stmt.trim();
      return trimmed && !trimmed.startsWith('--') && trimmed.length > 5;
    });

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      try {
        await connection.query(trimmed + ';');
        // 提取表名
        const match = trimmed.match(/(?:CREATE TABLE|INSERT|ALTER|DROP|SET|UPDATE)\s+(?:IF NOT EXISTS\s+)?[`']?(\w+)[`']?/i);
        if (match && trimmed.toUpperCase().includes('CREATE TABLE')) {
          successCount++;
        }
      } catch (error) {
        const match = trimmed.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`']?(\w+)[`']?/i);
        if (match) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            skipCount++;
          } else {
            failCount++;
            logWarn(`  表 ${match[1]}: ${error.message.substring(0, 80)}`);
          }
        }
      }
    }

    logSuccess(`表结构导入完成: 成功${successCount}个, 跳过${skipCount}个, 失败${failCount}个`);
  } catch (error) {
    logError(`导入Schema失败: ${error.message}`);
    await connection.end();
    process.exit(1);
  }

  // ==================== Step 5: 插入初始数据 ====================
  logTitle('Step 5: 插入初始数据');

  // 5.1 创建默认管理员角色
  try {
    const roleId = generateUUID();
    await connection.query(`
      INSERT IGNORE INTO roles (id, name, code, description, level, is_system, role_type, data_scope, status, created_at, updated_at)
      VALUES (?, '系统管理员', 'super_admin', '拥有系统所有权限的超级管理员', 100, 1, 'system', 'all', 'active', NOW(), NOW())
    `, [roleId]);

    // 其他预设角色
    await connection.query(`
      INSERT IGNORE INTO roles (id, name, code, description, level, is_system, role_type, data_scope, status, created_at, updated_at) VALUES
      (?, '管理员', 'admin', '系统管理员，管理日常运营', 80, 1, 'system', 'all', 'active', NOW(), NOW()),
      (?, '经理', 'manager', '部门经理，管理部门团队', 60, 0, 'business', 'department', 'active', NOW(), NOW()),
      (?, '销售', 'sales', '销售人员，处理客户和订单', 40, 0, 'business', 'self', 'active', NOW(), NOW()),
      (?, '客服', 'customer_service', '客服人员，处理售后和咨询', 40, 0, 'business', 'self', 'active', NOW(), NOW())
    `, [generateUUID(), generateUUID(), generateUUID(), generateUUID()]);

    logSuccess('默认角色创建完成');
  } catch (error) {
    logWarn(`角色创建: ${error.message.substring(0, 80)}`);
  }

  // 5.2 默认管理员说明（不再预创建 admin/admin123）
  // 🔥 私有部署的管理员账号在首次激活授权码时自动创建
  // 用户名 = 购买时注册的手机号，密码 = Aa123456
  logInfo('默认管理员将在首次激活授权码时自动创建');
  log('');
  log(`  ${'─'.repeat(40)}`);
  log(`  📱 用户名: 购买时注册官网的手机号`, colors.cyan);
  log(`  🔑 密码:   Aa123456`, colors.cyan);
  log(`  ${'─'.repeat(40)}`);
  log('');
  logWarn('首次使用请在登录页输入授权码完成激活！');

  // 5.3 插入默认物流公司数据
  try {
    await connection.query(`
      INSERT IGNORE INTO logistics_companies (id, name, code, phone, website, is_default, status, sort_order, created_at, updated_at) VALUES
      (?, '顺丰速运', 'SF', '95338', 'https://www.sf-express.com', 0, 'active', 1, NOW(), NOW()),
      (?, '圆通速递', 'YTO', '95554', 'https://www.yto.net.cn', 0, 'active', 2, NOW(), NOW()),
      (?, '中通快递', 'ZTO', '95311', 'https://www.zto.com', 0, 'active', 3, NOW(), NOW()),
      (?, '韵达速递', 'YD', '95546', 'https://www.yundaex.com', 0, 'active', 4, NOW(), NOW()),
      (?, '申通快递', 'STO', '95543', 'https://www.sto.cn', 0, 'active', 5, NOW(), NOW()),
      (?, '极兔速递', 'JTSD', '400-626-6626', 'https://www.jtexpress.cn', 0, 'active', 6, NOW(), NOW()),
      (?, '中国邮政EMS', 'EMS', '11183', 'https://www.ems.com.cn', 0, 'active', 7, NOW(), NOW()),
      (?, '德邦快递', 'DBL', '95353', 'https://www.deppon.com', 0, 'active', 8, NOW(), NOW())
    `, [generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID(), generateUUID()]);
    logSuccess('默认物流公司数据插入完成');
  } catch (error) {
    logWarn(`物流公司数据: ${error.message.substring(0, 80)}`);
  }

  // 5.4 确保 system_license 表存在
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_license (
        id VARCHAR(36) PRIMARY KEY,
        license_key VARCHAR(255) NOT NULL,
        customer_name VARCHAR(200),
        license_type VARCHAR(50) DEFAULT 'perpetual',
        max_users INT DEFAULT 50,
        features TEXT,
        expires_at DATETIME,
        status VARCHAR(20) DEFAULT 'active',
        activated_at DATETIME,
        machine_id VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logSuccess('授权表检查完成');
  } catch (error) {
    logWarn(`授权表: ${error.message.substring(0, 60)}`);
  }

  await connection.end();

  // ==================== Step 6: 生成环境配置文件 ====================
  logTitle('Step 6: 生成环境配置文件');

  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const envContent = `# ==================== CRM 私有部署配置 ====================
# 自动生成时间: ${new Date().toLocaleString('zh-CN')}
# ⚠️ 请妥善保管此文件，不要泄露给他人

# 服务器配置
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# 部署模式: 私有部署
DEPLOY_MODE=private

# ==================== 数据库配置 ====================
DB_TYPE=mysql
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_DATABASE=${dbName}
DB_USERNAME=${dbUser}
DB_PASSWORD=${dbPass}
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00

# ==================== JWT 配置 ====================
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 加密配置
BCRYPT_ROUNDS=12

# ==================== CORS 配置 ====================
# 修改为您的实际域名或IP
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:80
CORS_CREDENTIALS=true

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# ==================== 日志配置 ====================
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# ==================== 安全配置 ====================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=3000
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_REQUESTS=50
HELMET_ENABLED=true
COMPRESSION_ENABLED=true

# ==================== 部署配置 ====================
BAOTA_PANEL=false
STATIC_PATH=../dist
UPLOAD_PATH=./uploads
ENABLE_ADMIN=false
`;

  const envPath = path.join(__dirname, '..', 'backend', '.env');
  // 不覆盖已有的 .env 文件
  if (fs.existsSync(envPath)) {
    const backup = envPath + '.backup.' + Date.now();
    fs.copyFileSync(envPath, backup);
    logInfo(`已备份原有 .env 文件到: ${path.basename(backup)}`);
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  logSuccess('环境配置文件已生成: backend/.env');

  // ==================== 完成 ====================
  logTitle('🎉 数据库初始化完成！');
  log('');
  log('  下一步操作：');
  log('  1. 安装后端依赖:  cd backend && npm install');
  log('  2. 构建后端:      cd backend && npm run build');
  log('  3. 构建前端:      npm run build');
  log('  4. 启动服务:      运行 install.bat 或 install.sh');
  log('');
  log(`  默认管理员: 授权激活后自动创建（手机号 / Aa123456）`);
  log('');
}

function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

main().catch(error => {
  logError(`初始化失败: ${error.message}`);
  process.exit(1);
});

