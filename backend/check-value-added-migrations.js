// 检查增值管理相关的数据库迁移状态
const mysql = require('mysql2/promise')
require('dotenv').config({ path: '.env.local' })

async function checkMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  })

  console.log('=== 检查增值管理数据库迁移状态 ===\n')

  try {
    // 1. 检查状态配置表和数据
    console.log('1. 检查状态配置表...')
    const [statusConfigs] = await connection.query(`
      SELECT type, value, label, sort_order
      FROM value_added_status_configs
      ORDER BY type, sort_order
    `)
    console.log(`   ✓ 状态配置数量: ${statusConfigs.length}`)
    console.log('   配置详情:')
    statusConfigs.forEach(c => console.log(`     - ${c.type}: ${c.value} (${c.label})`))

    // 2. 检查外包公司表字段
    console.log('\n2. 检查外包公司表字段...')
    const [companyColumns] = await connection.query(`
      SHOW COLUMNS FROM outsource_companies
      WHERE Field IN ('sort_order', 'is_default', 'default_unit_price')
    `)
    console.log(`   字段状态:`)
    companyColumns.forEach(c => console.log(`     - ${c.Field}: ${c.Type}`))

    const hasDefaultUnitPrice = companyColumns.some(c => c.Field === 'default_unit_price')
    if (hasDefaultUnitPrice) {
      console.log('   ⚠ default_unit_price 字段仍存在，需要迁移到价格档位系统')
    }

    // 3. 检查价格档位表
    console.log('\n3. 检查价格档位表...')
    try {
      const [tierCount] = await connection.query(`
        SELECT COUNT(*) as count FROM value_added_price_config
      `)
      console.log(`   ✓ 价格档位数量: ${tierCount[0].count}`)

      const [tierDetails] = await connection.query(`
        SELECT c.company_name, t.tier_name, t.unit_price, t.pricing_type
        FROM value_added_price_config t
        JOIN outsource_companies c ON t.company_id = c.id
        ORDER BY c.sort_order, t.tier_order
      `)
      console.log('   档位详情:')
      tierDetails.forEach(t => console.log(`     - ${t.company_name}: ${t.tier_name} (¥${t.unit_price})`))
    } catch (e) {
      console.log('   ✗ 价格档位表不存在或查询失败')
    }

    // 4. 检查备注预设表
    console.log('\n4. 检查备注预设表...')
    try {
      const [presetCount] = await connection.query(`
        SELECT category, COUNT(*) as count
        FROM value_added_remark_presets
        GROUP BY category
      `)
      console.log('   备注预设统计:')
      presetCount.forEach(p => console.log(`     - ${p.category}: ${p.count}条`))
    } catch (e) {
      console.log('   ✗ 备注预设表不存在')
    }

    // 5. 检查订单表备注字段
    console.log('\n5. 检查订单表备注字段...')
    const [orderColumns] = await connection.query(`
      SHOW COLUMNS FROM value_added_orders WHERE Field = 'remark'
    `)
    if (orderColumns.length > 0) {
      console.log(`   ✓ remark 字段已存在: ${orderColumns[0].Type}`)
    } else {
      console.log('   ✗ remark 字段不存在')
    }

    // 6. 检查权限数据
    console.log('\n6. 检查增值管理权限...')
    const [permissions] = await connection.query(`
      SELECT code, name, type
      FROM permissions
      WHERE code LIKE 'finance.value_added%' OR code LIKE 'finance.settlement_report%'
      ORDER BY code
    `)
    console.log(`   ✓ 权限数量: ${permissions.length}`)
    if (permissions.length > 0) {
      console.log('   权限列表:')
      permissions.forEach(p => console.log(`     - ${p.code} (${p.type})`))
    }

  } catch (error) {
    console.error('检查失败:', error.message)
  } finally {
    await connection.end()
  }
}

checkMigrations()
