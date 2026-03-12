/**
 * 模拟支付成功（开发环境测试用）
 * 用于手动更新订单状态，模拟支付成功
 */

const mysql = require('mysql2/promise')
const readline = require('readline')
require('dotenv').config({ path: '.env.local' })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function simulatePaymentSuccess() {
  try {
    console.log('🎯 模拟支付成功工具\n')

    // 获取订单号
    const orderNo = await question('请输入订单号（例如：PAY1772697489638D0Z9ZL）: ')

    if (!orderNo || !orderNo.startsWith('PAY')) {
      console.log('❌ 订单号格式不正确')
      rl.close()
      return
    }

    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    })

    console.log('\n✓ 数据库连接成功')

    // 查询订单信息
    const [orders] = await conn.query(
      'SELECT * FROM payment_orders WHERE order_no = ?',
      [orderNo]
    )

    if (orders.length === 0) {
      console.log('❌ 订单不存在')
      await conn.end()
      rl.close()
      return
    }

    const order = orders[0]
    console.log('\n📋 订单信息:')
    console.log(`  - 订单号: ${order.order_no}`)
    console.log(`  - 租户ID: ${order.tenant_id}`)
    console.log(`  - 套餐: ${order.package_name}`)
    console.log(`  - 金额: ¥${order.amount}`)
    console.log(`  - 当前状态: ${order.status}`)

    if (order.status === 'paid') {
      console.log('\n⚠️  订单已支付，无需重复操作')
      await conn.end()
      rl.close()
      return
    }

    // 确认操作
    const confirm = await question('\n是否确认模拟支付成功？(y/n): ')

    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 操作已取消')
      await conn.end()
      rl.close()
      return
    }

    console.log('\n🔄 正在更新订单状态...')

    // 更新订单状态为已支付
    await conn.query(
      'UPDATE payment_orders SET status = ?, paid_at = NOW(), updated_at = NOW() WHERE order_no = ?',
      ['paid', orderNo]
    )
    console.log('✓ 订单状态已更新为：已支付')

    // 更新租户状态
    if (order.tenant_id) {
      // 计算到期时间
      let expireDays = 30 // 默认30天
      if (order.billing_cycle === 'yearly') {
        expireDays = 365 // 年付365天
      }

      await conn.query(
        `UPDATE tenants
         SET status = ?,
             license_status = ?,
             activated_at = NOW(),
             expire_date = DATE_ADD(CURDATE(), INTERVAL ? DAY),
             updated_at = NOW()
         WHERE id = ?`,
        ['active', 'active', expireDays, order.tenant_id]
      )
      console.log('✓ 租户状态已激活')
      console.log(`✓ 到期时间已设置为：${expireDays}天后`)

      // 查询租户信息
      const [tenants] = await conn.query(
        'SELECT code, license_key, expire_date FROM tenants WHERE id = ?',
        [order.tenant_id]
      )

      if (tenants.length > 0) {
        const tenant = tenants[0]
        console.log('\n🎉 支付成功！租户信息:')
        console.log(`  - 租户编码: ${tenant.code}`)
        console.log(`  - 授权码: ${tenant.license_key}`)
        console.log(`  - 到期时间: ${tenant.expire_date}`)
      }
    }

    // 记录支付日志
    const { v4: uuidv4 } = require('uuid')
    await conn.query(
      `INSERT INTO payment_logs (id, order_id, order_no, action, pay_type, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), order.id, orderNo, 'simulate_pay', order.pay_type, 'success']
    )
    console.log('✓ 支付日志已记录')

    await conn.end()
    console.log('\n✅ 模拟支付成功完成！')
    console.log('\n💡 提示：')
    console.log('  1. 返回浏览器，支付页面会在3秒内自动检测到支付成功')
    console.log('  2. 页面将自动跳转到支付成功页面')
    console.log('  3. 如未自动跳转，请点击"我已完成支付"按钮')

    rl.close()
  } catch (error) {
    console.error('\n❌ 操作失败:', error.message)
    rl.close()
    process.exit(1)
  }
}

console.log('═'.repeat(60))
console.log('  模拟支付成功工具 - 开发环境专用')
console.log('═'.repeat(60))
console.log()

simulatePaymentSuccess()
