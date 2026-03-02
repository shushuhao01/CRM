// 为本地数据库添加增值管理权限
const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function addPermissions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  })

  console.log('=== 添加增值管理权限 ===\n')

  try {
    // 检查是否已存在
    const [existing] = await connection.query(`
      SELECT COUNT(*) as count FROM permissions
      WHERE code LIKE 'finance.value_added%' OR code LIKE 'finance.settlement_report%'
    `)

    if (existing[0].count > 0) {
      console.log(`✓ 权限已存在 (${existing[0].count}条)，跳过添加`)
      return
    }

    // 读取并执行SQL文件
    const fs = require('fs')
    const path = require('path')
    const sqlFile = path.join(__dirname, 'database-migrations', 'add-value-added-permissions.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')

    // 分割SQL语句并执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'))

    for (const statement of statements) {
      if (statement.includes('INSERT') || statement.includes('SET')) {
        try {
          await connection.query(statement)
        } catch (e) {
          // 忽略重复插入错误
          if (!e.message.includes('Duplicate')) {
            console.log(`⚠ 执行警告: ${e.message.substring(0, 100)}`)
          }
        }
      }
    }

    // 验证结果
    const [result] = await connection.query(`
      SELECT code, name, type
      FROM permissions
      WHERE code LIKE 'finance.value_added%' OR code LIKE 'finance.settlement_report%'
      ORDER BY code
    `)

    console.log(`✓ 成功添加 ${result.length} 条权限`)
    console.log('\n权限列表:')
    result.forEach(p => console.log(`  - ${p.code}: ${p.name} (${p.type})`))

  } catch (error) {
    console.error('❌ 添加失败:', error.message)
  } finally {
    await connection.end()
  }
}

addPermissions()
