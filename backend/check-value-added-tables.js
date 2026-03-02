// 检查增值管理相关表是否存在
const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  })

  console.log('=== 检查增值管理相关表 ===\n')

  try {
    // 检查所有相关表
    const tables = [
      'value_added_orders',
      'outsource_companies',
      'value_added_status_configs',
      'value_added_price_config',
      'value_added_remark_presets'
    ]

    for (const table of tables) {
      const [result] = await connection.query(`SHOW TABLES LIKE '${table}'`)
      if (result.length > 0) {
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`)
        console.log(`✓ ${table} (${count[0].count}条数据)`)
      } else {
        console.log(`✗ ${table} - 不存在`)
      }
    }

    // 检查 value_added_orders 表结构
    console.log('\n=== value_added_orders 表字段 ===')
    const [columns] = await connection.query(`SHOW COLUMNS FROM value_added_orders`)
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`)
    })

  } catch (error) {
    console.error('检查失败:', error.message)
  } finally {
    await connection.end()
  }
}

checkTables()
