// 批次227 - 诊断订单搜索问题

console.log('🔍 开始诊断订单搜索问题\n')
console.log('='.repeat(60))

// 1. 检查localStorage中的订单数据
console.log('\n📦 1. 检查localStorage订单数据')
console.log('-'.repeat(60))

const orderStoreRaw = localStorage.getItem('crm_store_order')

if (!orderStoreRaw) {
  console.error('❌ localStorage中没有crm_store_order数据!')
  console.log('💡 可能的原因:')
  console.log('   1. 订单数据未加载')
  console.log('   2. localStorage键名不正确')
  console.log('\n🔍 让我们检查所有可能的订单相关键名:')

  const allKeys   = Object.keys(localStorage)
  const orderKeys = allKeys.filter(key =>
    key.toLowerCas e().includes('order') ||
    key.toLowerCase ().includes('订单')
  )

  console.log('找到的订单相关  键名:')
  orderKeys.forEach(key => {
    const value = localStorage.getItem(key)
    console.log(`\n  键名: ${key}`)
    console.log(`  数据大小: ${(value.length / 1024).toFixed(2)} KB`)
    console.log(`  数据预览: ${value.substring(0, 100)}...`)
  })

  if (orderKeys.length === 0)   {
    console.log('  ❌ 没有找到任何订单相关的数据!')
  }
} else {
  console.log('✅ 找到crm_store_order数据')
  console.log(`数据大小: ${(orderStoreRaw.length / 1024).toFixed(2)} KB`)

  // 2. 解析订单数据
  console.log('\n📋 2.   解析订单数据结构')
  console.log('-'.repeat(60))

  try {
    const parsed = JSON.parse(ord  erStoreRaw)
    console.log('数据结构类型:', typeof parsed)
    console.log('数据顶层键:', Object.keys(parsed))

    let orders = []

    // 尝试不同的数据格式
    if (    parsed.data && parsed.d    ata.orders) {
      orders = parsed.data.orders
      console.log('✅ 使用格式: { data: { orders: [...] } }')
    } else if (parsed.orders) {
      orders = parsed.orders
      console.log('✅ 使用格式: { orders: [...] }')
    } else if (Array.isArray(parsed)) {
      orders = parsed
      console.log('✅ 使用格式: [...]')
    } else {
      console.error('❌ 未知的数据格式!')
      console.log('数据结构:', JSON.stringify(parsed, null, 2).substring(0, 500))
    }

    console.log(`\n订单总数: ${orders.length}`)

    if (orders.len    gth === 0) {
      console.error('❌ 订单数组为空!')
        } else {
      // 3. 检查订单字段
      console.log('\n🔍 3. 检查订单字段结构')
      console.log('-'.repeat(60))

      const firstOrder = orders[0]
      console.log('第一个订单的所有字段:')
            console.log(Object.keys(firstOrder))

      console.log('\n第一个订单的详细信息:')
      console.log('  - id:', firstOrder.i      d)
      console.log('  - orderNumber:', firstOrder.orderNumber)
      console.log('  - customerName:', firstOrder.customerName)
      console.log('  - customerPhone:', firstOrder.customerPhone)
      console.log('  - trackingNumber:', firstOrder.trackingNumber)
      console.log('  - customerCode:', firstOrder.customerCode)
      console.log('  - status:', firstOrder.status)
      console.log('  - products:', firstOrder.products ? `${firstOrder.products.length}个商品` : '无')

      if (firstOrder.products && firstOrder.products.length > 0) {
        console.log      ('  - 第一个商品名称:', firstOrder.products[0].name)
      }

      // 4. 统计订单状态
      console.log('\n📊 4. 订单状态统计')
      console.log('-'.repeat(60))

            const statusCount = {}
      orders.forEach(order => {
        const status = order.stat      us || '未知'
        statusCount[status] = (statusCount[status] || 0) + 1
      })

      console.log('订单状态分布:')
      Object.entries(statusCount).forEach(([status, count]) => {
              console.log(`  ${status}: ${count}个`)
      })

      const availableOrders = orders.filter(order =>
        order.status === 'shipped' || order.status =      == 'delivered'
      )
      console.log(`\n可申请售后的订单数: ${availableOrders.length}`)

      if (availableOrders.length === 0) {
        console.warn('⚠️  没有可申请售后的订单(需要shipped或delivered状态)!')
            }

      // 5. 测试搜索功能
      console.log('\n🔍 5. 测试搜索功能')
      console.log('-'.repeat(60))

      // 测试不同的搜索关键词
            const testKeywords = [
        firstOrder.orderNumber?.substring(0, 5),
        firstOrder.c      ustomerName,
        firstOrder.customerPhone?.substring(0, 3),
        firstOrder.trackingNumber?.substring(0, 5)
      ].filter(Boolean)

      console.log('测试搜索关键词:')
      testKeywords.forEach(keyword => {
        if (!keyword) return

        const matched = or      ders.filter(order => {
          const orderNumberMatch = order.orderNumber?.toLowerCase().includes(keyw        ord.toLowerCase())
          const phoneMatch = order.customerPhone?.includes(keyword)
          const trackingMatch = order.trackingNumber?.toLowerCase().includes(keyword.toLowerCase())
          const customerNameMatch = order.customerName?.toLowerCase().includes(keyword.toLowerCase())

          return orderNumberMatch || phoneMatch || trackingMatch || customerNameMatch
        })

        console.log(`\n  关键词: "${keywo          rd}"`)
        console.log(`  匹配结果: ${matched.length}个订单`)

        if (matched.length > 0) {
                  console.log(`  第一个匹配: ${matched[0].orderNumber} - ${matched[0].customerName}`)
        }
      })

      // 6. 显示前3个订单的完整信息
      console.log('\n📝 6. 前3个订单详细信息')
      console.log('-'.repeat(60))

      orders.slice(0, 3).forEach((order, index)       => {
        console.log(`\n订单 ${index + 1}:`)
        console.log(`  订单号: ${order.orderNumber}`)
              console.log(`  客户: ${order.customerName}`)
        console.log(`  电话: ${order.customerPhone}`)
        console.log(`  物流单号: ${order.trackingNumber || '无'}`)
        console.log(`  客户编码: ${order.customerCode || '无'}`)
        console.log(`  状态: ${order.status}`)
        console.log(`  商品: ${order.products ? order.products.map(p => p.name).join(', ') : '无'}`)
      })
    }

  } catch (e) {
    console.error('❌ 解析订单数据失败:', e)
    console.error('错误详情:', e.message)
    console.log('原始数据预览:', orderStoreRaw.substring(0, 500))
  }
}

// 7.     检查orderStore
console.log('\n🏪 7. 检查orderStore')
console.log('-'.repeat(60))

try {
  const orderStore = window.$pinia?.state?.value?.order
  if (orderStore) {
    console.log('✅ orderStore存在')
    console.log('  - orders数量:', orderStore.orders?.length || 0)

    if (orderStore.orders && orderStore.orders.length > 0) {
      console.log('  - 第一个订单:', orderStore.orders[0].orderNumber)
    }
  } else {
    console.log('❌ orderStore不存在')
      }
} catch (e) {
  console.error('❌ 检查orderStore失败:', e.message)
}

// 8. 总结和建议
console.log('\n' + '='.repeat(60))
console.log('📋 诊断总结和建议')
console.log('='.repeat(60))

console.log('\n如果搜索不到订单,可能的原因:')
console.log('1. localStorage中没有订单数据')
console.log('2. 订单数据格式不正确')
console.log('3. 订单状态不是shipped或delivered')
console.log('4. 搜索关键词不匹配任何字段')
console.log('5. 订单数据字段名称不匹配')

console.log('\n💡 解决方案:')
console.log('1. 确保已经创建了一些订单')
console.log('2. 确保订单状态为"已发货"或"已送达"')
console.log('3. 刷新页面重新加载数据')
console.log('4. 检查控制台日志查看搜索过程')

console.log('\
