/**
 * 快速测试数据库连接
 */
const mysql = require('mysql2/promise')
require('dotenv').config()

async function testConnection() {
  console.log('🔍 测试数据库连接...\n')

  console.log('📋 数据库配置:')
  console.log(`  主机: ${process.env.DB_HOST}`)
  console.log(`  端口: ${process.env.DB_PORT}`)
  console.log(`  数据库: ${process.env.DB_DATABASE}`)
  console.log(`  用户名: ${process.env.DB_USERNAME}`)
  console.log(`  密码: ${process.env.DB_PASSWORD ? '***' : '(空)'}\n`)

  try {
    console.log('🔗 尝试连接...')
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    })

    console.log('✅ 数据库连接成功！\n')

    // 测试查询
    const [rows] = await connection.query('SELECT 1 as test')
    console.log('✅ 测试查询成功:', rows)

    await connection.end()
    console.log('\n✅ 所有测试通过！后端服务应该可以正常启动。')

  } catch (error) {
    console.error('\n❌ 数据库连接失败！\n')
    console.error('错误信息:', error.message)
    console.error('错误代码:', error.code)

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 解决方案:')
      console.log('1. 检查MySQL服务是否运行')
      console.log('2. 验证用户名和密码是否正确')
      console.log('3. 创建数据库用户:')
      console.log(`   CREATE USER '${process.env.DB_USERNAME}'@'localhost' IDENTIFIED BY '${process.env.DB_PASSWORD}';`)
      console.log(`   GRANT ALL PRIVILEGES ON ${process.env.DB_DATABASE}.* TO '${process.env.DB_USERNAME}'@'localhost';`)
      console.log('   FLUSH PRIVILEGES;')
      console.log('\n或者临时使用root用户:')
      console.log('   修改 .env 文件中的 DB_USERNAME 和 DB_PASSWORD')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 解决方案:')
      console.log('1. 检查MySQL服务是否运行')
      console.log('2. 检查端口是否正确')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 解决方案:')
      console.log(`数据库 ${process.env.DB_DATABASE} 不存在，请创建:`)
      console.log(`   CREATE DATABASE ${process.env.DB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)
    }
  }
}

testConnection()
