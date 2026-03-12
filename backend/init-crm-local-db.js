require('dotenv').config({ path: '.env.local' });
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');

const dbPath = './data/crm_local.db';

// 删除旧数据库文件
if (fs.existsSync(dbPath)) {
  console.log('删除旧数据库文件...');
  fs.unlinkSync(dbPath);
}

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  synchronize: false,
  logging: false
});

async function initDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('='.repeat(80));
    console.log('初始化 crm_local.db 数据库');
    console.log('='.repeat(80));
    console.log();

    // 读取 schema 文件
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');

    // 将 MySQL 语法转换为 SQLite 语法
    console.log('1. 转换 SQL 语法...');

    // 移除 MySQL 特定的命令
    schema = schema.replace(/SET NAMES utf8mb4;/g, '');
    schema = schema.replace(/SET FOREIGN_KEY_CHECKS = 0;/g, '');
    schema = schema.replace(/SET FOREIGN_KEY_CHECKS = 1;/g, '');

    // 转换数据类型
    schema = schema.replace(/int\(11\)/gi, 'INTEGER');
    schema = schema.replace(/tinyint\(1\)/gi, 'INTEGER');
    schema = schema.replace(/varchar\((\d+)\)/gi, 'TEXT');
    schema = schema.replace(/decimal\((\d+),(\d+)\)/gi, 'REAL');
    schema = schema.replace(/datetime/gi, 'TEXT');
    schema = schema.replace(/timestamp/gi, 'TEXT');
    schema = schema.replace(/enum\([^)]+\)/gi, 'TEXT');
    schema = schema.replace(/json/gi, 'TEXT');

    // 移除 ENGINE 和 CHARSET
    schema = schema.replace(/ENGINE=InnoDB/gi, '');
    schema = schema.replace(/DEFAULT CHARSET=utf8mb4/gi, '');
    schema = schema.replace(/COLLATE=utf8mb4_unicode_ci/gi, '');
    schema = schema.replace(/COLLATE=utf8mb4_0900_ai_ci/gi, '');

    // 转换 AUTO_INCREMENT
    schema = schema.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');

    // 转换 CURRENT_TIMESTAMP
    schema = schema.replace(/DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/gi, 'DEFAULT CURRENT_TIMESTAMP');

    // 移除外键约束（SQLite 需要特殊处理）
    schema = schema.replace(/,\s*CONSTRAINT[^,]+FOREIGN KEY[^,]+REFERENCES[^,)]+/gi, '');

    // 移除 UNIQUE KEY 和 KEY 定义（保留在字段定义中的）
    schema = schema.replace(/,\s*UNIQUE KEY `[^`]+` \([^)]+\)/gi, '');
    schema = schema.replace(/,\s*KEY `[^`]+` \([^)]+\)/gi, '');

    // 分割成单独的语句
    const statements = schema.split(';').filter(stmt => {
      const trimmed = stmt.trim();
      return trimmed &&
             !trimmed.startsWith('--') &&
             !trimmed.startsWith('/*') &&
             trimmed.toUpperCase().includes('CREATE TABLE');
    });

    console.log(`2. 执行 ${statements.length} 个 CREATE TABLE 语句...`);
    console.log();

    let successCount = 0;
    let failCount = 0;

    for (const statement of statements) {
      try {
        // 提取表名
        const match = statement.match(/CREATE TABLE IF NOT EXISTS [`']?(\w+)[`']?/i);
        const tableName = match ? match[1] : 'unknown';

        await AppDataSource.query(statement + ';');
        console.log(`✓ ${tableName}`);
        successCount++;
      } catch (error) {
        const match = statement.match(/CREATE TABLE IF NOT EXISTS [`']?(\w+)[`']?/i);
        const tableName = match ? match[1] : 'unknown';
        console.log(`✗ ${tableName}: ${error.message}`);
        failCount++;
      }
    }

    console.log();
    console.log('3. 插入初始数据...');
    console.log();

    // 插入角色
    try {
      await AppDataSource.query(`
        INSERT OR IGNORE INTO roles (name, display_name, description, is_system) VALUES
        ('super_admin', '超级管理员', '系统超级管理员，拥有所有权限', 1),
        ('admin', '管理员', '系统管理员', 1),
        ('manager', '经理', '部门经理', 0),
        ('sales', '销售', '销售人员', 0),
        ('customer_service', '客服', '客户服务人员', 0)
      `);
      console.log('✓ 插入默认角色');
    } catch (error) {
      console.log('✗ 插入角色失败:', error.message);
    }

    // 插入权限
    try {
      await AppDataSource.query(`
        INSERT OR IGNORE INTO permissions (name, display_name, description, resource, action) VALUES
        ('user.view', '查看用户', '查看用户信息', 'user', 'view'),
        ('user.create', '创建用户', '创建新用户', 'user', 'create'),
        ('user.update', '更新用户', '更新用户信息', 'user', 'update'),
        ('user.delete', '删除用户', '删除用户', 'user', 'delete'),
        ('customer.view', '查看客户', '查看客户信息', 'customer', 'view'),
        ('customer.create', '创建客户', '创建新客户', 'customer', 'create'),
        ('customer.update', '更新客户', '更新客户信息', 'customer', 'update'),
        ('customer.delete', '删除客户', '删除客户', 'customer', 'delete'),
        ('order.view', '查看订单', '查看订单信息', 'order', 'view'),
        ('order.create', '创建订单', '创建新订单', 'order', 'create'),
        ('order.update', '更新订单', '更新订单信息', 'order', 'update'),
        ('order.delete', '删除订单', '删除订单', 'order', 'delete')
      `);
      console.log('✓ 插入默认权限');
    } catch (error) {
      console.log('✗ 插入权限失败:', error.message);
    }

    // 插入管理员用户
    try {
      await AppDataSource.query(`
        INSERT OR IGNORE INTO users (username, email, password, real_name, status) VALUES
        ('admin', 'admin@example.com', '$2b$10$rQZ8kHWKQVnqVQZ8kHWKQOvQZ8kHWKQVnqVQZ8kHWKQOvQZ8kHWKQO', '系统管理员', 'active')
      `);
      console.log('✓ 插入默认管理员用户');
    } catch (error) {
      console.log('✗ 插入用户失败:', error.message);
    }

    // 插入增值管理状态配置
    try {
      await AppDataSource.query(`
        INSERT OR IGNORE INTO value_added_status_configs (id, type, value, label, sort_order) VALUES
        ('vs-pending-001', 'validStatus', 'pending', '待处理', 1),
        ('vs-valid-001', 'validStatus', 'valid', '有效', 2),
        ('vs-invalid-001', 'validStatus', 'invalid', '无效', 3),
        ('vs-supplemented-001', 'validStatus', 'supplemented', '补单', 4),
        ('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', 1),
        ('ss-settled-001', 'settlementStatus', 'settled', '已结算', 2)
      `);
      console.log('✓ 插入增值管理状态配置');
    } catch (error) {
      console.log('✗ 插入状态配置失败:', error.message);
    }

    // 插入备注预设
    try {
      await AppDataSource.query(`
        INSERT OR IGNORE INTO value_added_remark_presets (id, remark_text, category, sort_order, is_active) VALUES
        ('preset-001', '七天未联系上', 'invalid', 1, 1),
        ('preset-002', '重大疾病', 'invalid', 2, 1),
        ('preset-003', '哺乳期孕期', 'invalid', 3, 1),
        ('preset-004', '退货', 'invalid', 4, 1),
        ('preset-005', '拒绝指导', 'invalid', 5, 1),
        ('preset-006', '以后再用', 'invalid', 6, 1),
        ('preset-007', '空号', 'invalid', 7, 1),
        ('preset-008', '其他原因', 'invalid', 8, 1)
      `);
      console.log('✓ 插入备注预设数据');
    } catch (error) {
      console.log('✗ 插入备注预设失败:', error.message);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('初始化完成！');
    console.log('='.repeat(80));
    console.log(`✓ 成功创建表: ${successCount}`);
    console.log(`✗ 失败: ${failCount}`);
    console.log();
    console.log('默认管理员账户：');
    console.log('  用户名: admin');
    console.log('  密码: admin123');
    console.log();

    // 验证表
    const tables = await AppDataSource.query(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `);

    console.log(`数据库共有 ${tables.length} 个表`);

    await AppDataSource.destroy();

  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
}

initDatabase();
