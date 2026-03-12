const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local',
    multipleStatements: true
  });

  try {
    console.log('=== 执行年付配置数据库迁移 ===\n');

    // 1. 检查字段是否已存在
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM packages LIKE 'yearly_%'"
    );

    if (columns.length > 0) {
      console.log('✅ 年付配置字段已存在,跳过迁移');
      console.log('已存在的字段:', columns.map(c => c.Field).join(', '));
      await connection.end();
      return;
    }

    console.log('开始添加年付配置字段...\n');

    // 2. 添加字段
    await connection.query(`
      ALTER TABLE packages
      ADD COLUMN yearly_discount_rate DECIMAL(5, 2) DEFAULT 0.00 COMMENT '年付折扣率（0-100，例如20表示8折）' AFTER billing_cycle,
      ADD COLUMN yearly_bonus_months INT DEFAULT 0 COMMENT '年付赠送月数' AFTER yearly_discount_rate,
      ADD COLUMN yearly_price DECIMAL(10, 2) DEFAULT NULL COMMENT '年付价格（如果为NULL则自动计算）' AFTER yearly_bonus_months
    `);
    console.log('✅ 字段添加成功\n');

    // 3. 更新SaaS套餐的年付配置
    await connection.query(`
      UPDATE packages
      SET
        yearly_discount_rate = 16.67,
        yearly_bonus_months = 2,
        yearly_price = price * 10
      WHERE type = 'saas' AND billing_cycle = 'monthly' AND price > 0
    `);
    console.log('✅ SaaS套餐年付配置更新成功\n');

    // 4. 修正免费试用套餐的有效期为7天
    const [result] = await connection.query(`
      UPDATE packages
      SET duration_days = 7
      WHERE (code LIKE '%TRIAL%' OR is_trial = 1) AND price = 0
    `);
    console.log(`✅ 免费试用套餐有效期更新为7天 (影响${result.affectedRows}行)\n`);

    // 5. 验证结果
    const [saasPackages] = await connection.query(`
      SELECT
        name,
        code,
        price AS '月付价格',
        yearly_price AS '年付价格',
        yearly_bonus_months AS '赠送月数',
        duration_days AS '有效期(天)'
      FROM packages
      WHERE type = 'saas'
      ORDER BY sort_order
    `);

    console.log('=== SaaS套餐配置验证 ===');
    console.table(saasPackages);

    console.log('\n✅ 数据库迁移完成!');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

executeMigration().catch(err => {
  console.error('执行失败:', err);
  process.exit(1);
});
