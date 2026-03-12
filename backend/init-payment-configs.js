/**
 * 初始化支付配置（开发环境测试用）
 */
const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function initPaymentConfigs() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    })

    console.log('✓ 数据库连接成功')

    // 启用微信支付（开发模式）
    await conn.query(`
      INSERT INTO payment_configs (id, pay_type, enabled, config_data, created_at, updated_at)
      VALUES ('wechat-test', 'wechat', 1, 'MOCK_CONFIG', NOW(), NOW())
      ON DUPLICATE KEY UPDATE enabled=1, updated_at=NOW()
    `)
    console.log('✓ 微信支付已启用')

    // 启用支付宝支付（开发模式）
    await conn.query(`
      INSERT INTO payment_configs (id, pay_type, enabled, config_data, created_at, updated_at)
      VALUES ('alipay-test', 'alipay', 1, 'MOCK_CONFIG', NOW(), NOW())
      ON DUPLICATE KEY UPDATE enabled=1, updated_at=NOW()
    `)
    console.log('✓ 支付宝支付已启用')

    // 启用对公转账（开发模式）
    await conn.query(`
      INSERT INTO payment_configs (id, pay_type, enabled, config_data, created_at, updated_at)
      VALUES ('bank-test', 'bank', 1, 'MOCK_CONFIG', NOW(), NOW())
      ON DUPLICATE KEY UPDATE enabled=1, updated_at=NOW()
    `)
    console.log('✓ 对公转账已启用')

    await conn.end()
    console.log('\n✅ 支付配置初始化完成')
  } catch (error) {
    console.error('❌ 初始化失败:', error.message)
    process.exit(1)
  }
}

initPaymentConfigs()
