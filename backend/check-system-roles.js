/**
 * 检查数据库中的系统角色
 */

const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function checkSystemRoles() {
  let connection

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm_local'
    })

    console.log('✓ 数据库连接成功\n')

    // 查询所有角色
    const [roles] = await connection.execute(`
      SELECT
        id,
        code,
        name,
        is_system,
        JSON_LENGTH(permissions) as permission_count,
        created_at
      FROM roles
      ORDER BY is_system DESC, id ASC
    `)

    console.log('=== 数据库中的所有角色 ===')
    console.table(roles)

    // 查询系统角色
    const [systemRoles] = await connection.execute(`
      SELECT
        id,
        code,
        name,
        JSON_LENGTH(permissions) as permission_count
      FROM roles
      WHERE is_system = 1
      ORDER BY id ASC
    `)

    console.log('\n=== 系统预设角色 ===')
    console.table(systemRoles)

  } catch (error) {
    console.error('✗ 执行失败:', error.message)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

checkSystemRoles().catch(error => {
  console.error('脚本执行失败:', error)
  process.exit(1)
})
