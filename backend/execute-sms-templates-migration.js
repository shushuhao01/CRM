/**
 * 执行短信模板CODE配置迁移
 */
const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

async function main() {
  let connection
  try {
    // 读取.env文件获取数据库配置
    const envPath = path.join(__dirname, '.env.local')
    const envContent = fs.existsSync(envPath)
      ? fs.readFileSync(envPath, 'utf8')
      : fs.readFileSync(path.join(__dirname, '.env'), 'utf8')

    const dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crm_local',
      multipleStatements: true
    }

    // 从.env解析数据库配置
    envContent.split('\n').forEach(line => {
      if (line.startsWith('DB_HOST=')) dbConfig.host = line.split('=')[1].trim()
      if (line.startsWith('DB_USER=')) dbConfig.user = line.split('=')[1].trim()
      if (line.startsWith('DB_PASSWORD=')) dbConfig.password = line.split('=')[1].trim()
      if (line.startsWith('DB_NAME=')) dbConfig.database = line.split('=')[1].trim()
    })

    console.log(`📦 连接数据库: ${dbConfig.database}@${dbConfig.host}`)

    connection = await mysql.createConnection(dbConfig)

    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'database-migrations', 'add-sms-template-codes.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('🔄 执行迁移...')
    await connection.query(sql)

    // 验证结果
    const [rows] = await connection.query(
      "SELECT config_key, config_value FROM system_config WHERE config_key = 'sms_config'"
    )

    if (rows.length > 0) {
      console.log('✅ 迁移成功!')
      console.log('📋 当前配置:')
      const config = JSON.parse(rows[0].config_value)
      console.log('  - 基础配置:', {
        enabled: config.enabled,
        accessKeyId: config.accessKeyId ? '已配置' : '未配置',
        signName: config.signName || '未配置'
      })
      console.log('  - 模板CODE配置:')
      Object.keys(config.templates || {}).forEach(key => {
        console.log(`    ${key}: ${config.templates[key] || '未配置'}`)
      })
    } else {
      console.log('⚠️  配置未找到，请检查')
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error.message)
    process.exit(1)
  } finally {
    if (connection) await connection.end()
  }
}

main()
