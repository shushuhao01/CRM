/**
 * 测试短信模板配置功能
 */
const mysql = require('mysql2/promise')

async function testSmsTemplatesConfig() {
  console.log('=== 测试短信模板配置功能 ===\n')

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  })

  try {
    // 1. 检查 system_config 表中的 sms_config
    console.log('1. 检查短信配置...')
    const [rows] = await connection.query(
      `SELECT config_key, config_value FROM system_config WHERE config_key = 'sms_config'`
    )

    if (rows.length === 0) {
      console.log('❌ 未找到短信配置')
      return
    }

    const config = JSON.parse(rows[0].config_value)
    console.log('✅ 短信配置存在')
    console.log('配置内容:', JSON.stringify(config, null, 2))

    // 2. 验证配置结构
    console.log('\n2. 验证配置结构...')
    const requiredFields = ['enabled', 'accessKeyId', 'accessKeySecret', 'signName']
    const missingFields = requiredFields.filter(field => !(field in config))

    if (missingFields.length > 0) {
      console.log('❌ 缺少必需字段:', missingFields.join(', '))
    } else {
      console.log('✅ 基础配置字段完整')
    }

    // 3. 验证模板配置
    console.log('\n3. 验证模板配置...')
    if (!config.templates) {
      console.log('❌ 缺少 templates 字段')
    } else {
      console.log('✅ templates 字段存在')
      const templateTypes = [
        'VERIFY_CODE',
        'REGISTER_SUCCESS',
        'PAYMENT_SUCCESS',
        'RENEW_SUCCESS',
        'PACKAGE_CHANGE',
        'QUOTA_CHANGE',
        'ACCOUNT_SUSPEND',
        'ACCOUNT_RESUME',
        'ACCOUNT_CANCEL',
        'REFUND_SUCCESS',
        'EXPIRE_REMIND',
        'EXPIRED_NOTICE'
      ]

      console.log('\n模板配置状态:')
      templateTypes.forEach(type => {
        const code = config.templates[type]
        const status = code ? '✅ 已配置' : '⚠️  未配置'
        console.log(`  ${type}: ${status}${code ? ` (${code})` : ''}`)
      })
    }

    // 4. 测试配置更新
    console.log('\n4. 测试配置更新...')
    const testConfig = {
      ...config,
      templates: {
        ...config.templates,
        VERIFY_CODE: 'SMS_TEST_123456'
      }
    }

    await connection.query(
      `UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'sms_config'`,
      [JSON.stringify(testConfig)]
    )
    console.log('✅ 配置更新成功')

    // 验证更新
    const [updatedRows] = await connection.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_config'`
    )
    const updatedConfig = JSON.parse(updatedRows[0].config_value)

    if (updatedConfig.templates.VERIFY_CODE === 'SMS_TEST_123456') {
      console.log('✅ 配置更新验证成功')
    } else {
      console.log('❌ 配置更新验证失败')
    }

    // 恢复原配置
    await connection.query(
      `UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'sms_config'`,
      [JSON.stringify(config)]
    )
    console.log('✅ 已恢复原配置')

    console.log('\n=== 测试完成 ===')

  } catch (error) {
    console.error('测试失败:', error.message)
  } finally {
    await connection.end()
  }
}

testSmsTemplatesConfig().catch(console.error)
