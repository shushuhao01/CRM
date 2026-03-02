// 简单添加增值管理权限
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
    // 1. 获取财务管理父级ID
    const [financeParent] = await connection.query(`
      SELECT id FROM permissions WHERE code = 'finance' LIMIT 1
    `)

    let financeId = financeParent[0]?.id

    if (!financeId) {
      console.log('创建财务管理父级菜单...')
      const [result] = await connection.query(`
        INSERT INTO permissions (name, code, description, module, type, path, sort, status, parentId)
        VALUES ('财务管理', 'finance', '财务管理模块', 'finance', 'menu', '/finance', 70, 'active', NULL)
      `)
      financeId = result.insertId
      console.log(`✓ 创建成功，ID: ${financeId}`)
    } else {
      console.log(`✓ 财务管理已存在，ID: ${financeId}`)
    }

    // 2. 添加增值管理菜单
    console.log('\n添加增值管理菜单...')
    await connection.query(`
      INSERT IGNORE INTO permissions (name, code, description, module, type, path, sort, status, parentId)
      VALUES ('增值管理', 'finance.value_added', '增值管理菜单', 'finance', 'menu', '/finance/value-added-manage', 71, 'active', ?)
    `, [financeId])

    const [valueAddedMenu] = await connection.query(`
      SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1
    `)
    const valueAddedId = valueAddedMenu[0]?.id
    console.log(`✓ 增值管理菜单 ID: ${valueAddedId}`)

    // 3. 添加增值管理按钮权限
    console.log('\n添加增值管理按钮权限...')
    const valueAddedButtons = [
      ['查看增值订单', 'finance.value_added.view', '查看增值订单列表', 711],
      ['创建增值订单', 'finance.value_added.create', '创建新的增值订单', 712],
      ['编辑增值订单', 'finance.value_added.edit', '编辑增值订单信息', 713],
      ['删除增值订单', 'finance.value_added.delete', '删除增值订单', 714],
      ['批量操作订单', 'finance.value_added.batch', '批量处理增值订单', 715],
      ['导出订单数据', 'finance.value_added.export', '导出增值订单数据', 716],
      ['管理外包公司', 'finance.value_added.company', '管理外包公司信息', 717],
      ['配置价格档位', 'finance.value_added.price_tier', '配置外包公司价格档位', 718],
      ['配置状态选项', 'finance.value_added.status_config', '配置有效状态和结算状态选项', 719]
    ]

    for (const [name, code, desc, sort] of valueAddedButtons) {
      await connection.query(`
        INSERT IGNORE INTO permissions (name, code, description, module, type, sort, status, parentId)
        VALUES (?, ?, ?, 'finance', 'button', ?, 'active', ?)
      `, [name, code, desc, sort, valueAddedId])
    }
    console.log(`✓ 添加了 ${valueAddedButtons.length} 个按钮权限`)

    // 4. 添加结算报表菜单
    console.log('\n添加结算报表菜单...')
    await connection.query(`
      INSERT IGNORE INTO permissions (name, code, description, module, type, path, sort, status, parentId)
      VALUES ('结算报表', 'finance.settlement_report', '结算报表菜单', 'finance', 'menu', '/finance/settlement-report', 72, 'active', ?)
    `, [financeId])

    const [settlementMenu] = await connection.query(`
      SELECT id FROM permissions WHERE code = 'finance.settlement_report' LIMIT 1
    `)
    const settlementId = settlementMenu[0]?.id
    console.log(`✓ 结算报表菜单 ID: ${settlementId}`)

    // 5. 添加结算报表按钮权限
    console.log('\n添加结算报表按钮权限...')
    const settlementButtons = [
      ['查看结算报表', 'finance.settlement_report.view', '查看结算报表数据', 721],
      ['导出报表数据', 'finance.settlement_report.export', '导出结算报表数据', 722],
      ['查看统计图表', 'finance.settlement_report.charts', '查看结算统计图表', 723],
      ['查看公司排名', 'finance.settlement_report.ranking', '查看公司结算排名', 724]
    ]

    for (const [name, code, desc, sort] of settlementButtons) {
      await connection.query(`
        INSERT IGNORE INTO permissions (name, code, description, module, type, sort, status, parentId)
        VALUES (?, ?, ?, 'finance', 'button', ?, 'active', ?)
      `, [name, code, desc, sort, settlementId])
    }
    console.log(`✓ 添加了 ${settlementButtons.length} 个按钮权限`)

    // 6. 验证结果
    console.log('\n=== 验证结果 ===')
    const [result] = await connection.query(`
      SELECT code, name, type, sort
      FROM permissions
      WHERE code LIKE 'finance.value_added%' OR code LIKE 'finance.settlement_report%'
      ORDER BY sort
    `)

    console.log(`\n✓ 共添加 ${result.length} 条权限:\n`)
    result.forEach(p => console.log(`  ${p.sort}. ${p.name} (${p.code}) - ${p.type}`))

  } catch (error) {
    console.error('\n❌ 添加失败:', error.message)
  } finally {
    await connection.end()
  }
}

addPermissions()
