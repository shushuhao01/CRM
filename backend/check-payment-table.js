require('dotenv').config()
const mysql = require('mysql2/promise')

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
  })

  console.log('=== payment_orders 表列 ===')
  try {
    const [cols] = await c.query('SHOW COLUMNS FROM payment_orders')
    cols.forEach(col => console.log(`  ${col.Field} (${col.Type})`))
    console.log(`  共 ${cols.length} 列`)
  } catch (e) {
    console.log('  表不存在:', e.message)
  }

  console.log('\n=== payment_logs 表 ===')
  try {
    const [cols] = await c.query('SHOW COLUMNS FROM payment_logs')
    console.log(`  共 ${cols.length} 列`)
  } catch (e) {
    console.log('  表不存在:', e.message)
  }

  console.log('\n=== payment_configs 表 ===')
  try {
    const [cols] = await c.query('SHOW COLUMNS FROM payment_configs')
    console.log(`  共 ${cols.length} 列`)
  } catch (e) {
    console.log('  表不存在:', e.message)
  }

  // 检查是否有旧列名
  try {
    const [cols] = await c.query('SHOW COLUMNS FROM payment_orders')
    const colNames = cols.map(c => c.Field)
    const hasOld = colNames.includes('payment_method') || colNames.includes('payment_status')
    const hasNew = colNames.includes('pay_type') && colNames.includes('status')
    console.log('\n=== 诊断 ===')
    console.log('  有旧列名(payment_method/payment_status):', hasOld)
    console.log('  有新列名(pay_type/status):', hasNew)
    
    const required = ['tenant_name','package_name','pay_type','status','contact_name','contact_phone','trade_no','qr_code','pay_url','expire_time','refund_amount','billing_cycle','bonus_months']
    const missing = required.filter(r => !colNames.includes(r))
    if (missing.length > 0) {
      console.log('  缺失列:', missing.join(', '))
    } else {
      console.log('  所有必需列都存在 ✓')
    }
  } catch (e) {}

  await c.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
