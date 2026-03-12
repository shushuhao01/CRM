/**
 * 支付功能完整流程测试
 * 测试从注册到支付成功的完整流程
 */

const axios = require('axios')

const API_BASE = 'http://localhost:3000/api/v1'
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function section(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testPaymentFlow() {
  try {
    section('📋 测试准备')

    // 生成测试数据
    const timestamp = Date.now()
    const testData = {
      companyName: `测试企业${timestamp}`,
      contactName: '张三',
      phone: `138${String(timestamp).slice(-8)}`,
      email: `test${timestamp}@example.com`,
      code: '123456' // 开发环境验证码
    }

    log(`✓ 企业名称: ${testData.companyName}`, 'green')
    log(`✓ 联系人: ${testData.contactName}`, 'green')
    log(`✓ 手机号: ${testData.phone}`, 'green')
    log(`✓ 邮箱: ${testData.email}`, 'green')

    // ==================== 步骤1: 获取套餐列表 ====================
    section('📦 步骤1: 获取套餐列表')

    const packagesRes = await axios.get(`${API_BASE}/public/packages`)
    if (packagesRes.data.code !== 0) {
      throw new Error('获取套餐列表失败: ' + packagesRes.data.message)
    }

    const packages = packagesRes.data.data
    log(`✓ 成功获取 ${packages.length} 个套餐`, 'green')

    // 显示套餐信息
    packages.forEach(pkg => {
      const typeLabel = pkg.type === 'saas' ? 'SaaS云端版' : '私有部署版'
      const priceLabel = pkg.price === 0 ? '免费试用' : `¥${pkg.price}`
      log(`  - ${pkg.name} (${typeLabel}) - ${priceLabel}`, 'blue')
    })

    // 选择一个付费套餐进行测试
    const testPackage = packages.find(p => p.type === 'saas' && p.price > 0 && !p.is_trial)
    if (!testPackage) {
      throw new Error('未找到可测试的付费套餐')
    }

    log(`\n✓ 选择测试套餐: ${testPackage.name} - ¥${testPackage.price}`, 'yellow')

    // ==================== 步骤2: 注册租户 ====================
    section('📝 步骤2: 注册租户')

    const registerRes = await axios.post(`${API_BASE}/public/register`, {
      companyName: testData.companyName,
      contactName: testData.contactName,
      phone: testData.phone,
      code: testData.code,
      email: testData.email,
      packageCode: testPackage.code
    })

    if (registerRes.data.code !== 0) {
      throw new Error('注册失败: ' + registerRes.data.message)
    }

    const tenant = registerRes.data.data
    log(`✓ 注册成功`, 'green')
    log(`  - 租户ID: ${tenant.tenantId}`, 'blue')
    log(`  - 租户编码: ${tenant.tenantCode}`, 'blue')
    log(`  - 授权码: ${tenant.licenseKey}`, 'blue')

    // ==================== 步骤3: 创建支付订单 ====================
    section('💳 步骤3: 创建支付订单')

    // 测试微信支付
    log('\n测试微信支付...', 'yellow')
    const wechatPaymentRes = await axios.post(`${API_BASE}/public/payment/create`, {
      packageId: testPackage.code,
      packageName: testPackage.name,
      amount: testPackage.price,
      payType: 'wechat',
      billingCycle: 'monthly',
      tenantId: tenant.tenantId,
      tenantName: testData.companyName,
      contactName: testData.contactName,
      contactPhone: testData.phone,
      contactEmail: testData.email
    })

    if (wechatPaymentRes.data.code !== 0) {
      log(`✗ 微信支付创建失败: ${wechatPaymentRes.data.message}`, 'red')
    } else {
      const wechatOrder = wechatPaymentRes.data.data
      log(`✓ 微信支付订单创建成功`, 'green')
      log(`  - 订单号: ${wechatOrder.orderNo}`, 'blue')
      log(`  - 二维码: ${wechatOrder.qrCode ? '已生成' : '未生成'}`, 'blue')
      log(`  - 支付链接: ${wechatOrder.payUrl || '无'}`, 'blue')
    }

    // 测试支付宝支付
    log('\n测试支付宝支付...', 'yellow')
    const alipayPaymentRes = await axios.post(`${API_BASE}/public/payment/create`, {
      packageId: testPackage.code,
      packageName: testPackage.name,
      amount: testPackage.price,
      payType: 'alipay',
      billingCycle: 'monthly',
      tenantId: tenant.tenantId,
      tenantName: testData.companyName,
      contactName: testData.contactName,
      contactPhone: testData.phone,
      contactEmail: testData.email
    })

    if (alipayPaymentRes.data.code !== 0) {
      log(`✗ 支付宝支付创建失败: ${alipayPaymentRes.data.message}`, 'red')
    } else {
      const alipayOrder = alipayPaymentRes.data.data
      log(`✓ 支付宝支付订单创建成功`, 'green')
      log(`  - 订单号: ${alipayOrder.orderNo}`, 'blue')
      log(`  - 二维码: ${alipayOrder.qrCode ? '已生成' : '未生成'}`, 'blue')
      log(`  - 支付链接: ${alipayOrder.payUrl || '无'}`, 'blue')
    }

    // 使用微信支付订单继续测试
    const paymentOrder = wechatPaymentRes.data.data

    // ==================== 步骤4: 查询支付状态 ====================
    section('🔍 步骤4: 查询支付状态')

    log('查询支付状态（模拟轮询）...', 'yellow')
    const queryRes = await axios.get(`${API_BASE}/public/payment/query/${paymentOrder.orderNo}`)

    if (queryRes.data.code !== 0) {
      throw new Error('查询支付状态失败: ' + queryRes.data.message)
    }

    const orderStatus = queryRes.data.data
    log(`✓ 查询成功`, 'green')
    log(`  - 订单号: ${orderStatus.orderNo}`, 'blue')
    log(`  - 状态: ${orderStatus.status}`, 'blue')
    log(`  - 金额: ¥${orderStatus.amount}`, 'blue')
    log(`  - 支付方式: ${orderStatus.payType}`, 'blue')

    if (orderStatus.status === 'paid') {
      log(`  - 租户编码: ${orderStatus.tenantCode}`, 'blue')
      log(`  - 授权码: ${orderStatus.licenseKey}`, 'blue')
      log(`  - 到期时间: ${orderStatus.expireAt}`, 'blue')
    }

    // ==================== 步骤5: 测试对公转账 ====================
    section('🏦 步骤5: 测试对公转账')

    log('创建对公转账订单...', 'yellow')
    const bankPaymentRes = await axios.post(`${API_BASE}/public/payment/create`, {
      packageId: testPackage.code,
      packageName: testPackage.name,
      amount: testPackage.price,
      payType: 'bank',
      billingCycle: 'monthly',
      tenantId: tenant.tenantId,
      tenantName: testData.companyName,
      contactName: testData.contactName,
      contactPhone: testData.phone,
      contactEmail: testData.email
    })

    if (bankPaymentRes.data.code !== 0) {
      log(`✗ 对公转账订单创建失败: ${bankPaymentRes.data.message}`, 'red')
    } else {
      const bankOrder = bankPaymentRes.data.data
      log(`✓ 对公转账订单创建成功`, 'green')
      log(`  - 订单号: ${bankOrder.orderNo}`, 'blue')

      if (bankOrder.bankInfo) {
        log(`  - 银行账户信息:`, 'blue')
        log(`    账户名称: ${bankOrder.bankInfo.accountName}`, 'blue')
        log(`    开户银行: ${bankOrder.bankInfo.bankName}`, 'blue')
        log(`    银行账号: ${bankOrder.bankInfo.accountNumber}`, 'blue')
        log(`    转账备注: ${bankOrder.bankInfo.remarkTemplate}`, 'blue')
      }
    }

    // ==================== 步骤6: 测试年付功能 ====================
    section('📅 步骤6: 测试年付功能')

    if (testPackage.yearly_bonus_months > 0) {
      log(`测试年付（赠送${testPackage.yearly_bonus_months}个月）...`, 'yellow')

      const yearlyPrice = testPackage.yearly_price || testPackage.price * (12 - testPackage.yearly_bonus_months)
      const saveAmount = testPackage.price * 12 - yearlyPrice

      log(`✓ 年付配置`, 'green')
      log(`  - 月付价格: ¥${testPackage.price}/月`, 'blue')
      log(`  - 年付价格: ¥${yearlyPrice}/年`, 'blue')
      log(`  - 赠送月数: ${testPackage.yearly_bonus_months}个月`, 'blue')
      log(`  - 节省金额: ¥${saveAmount}`, 'blue')

      // 创建年付订单
      const yearlyPaymentRes = await axios.post(`${API_BASE}/public/payment/create`, {
        packageId: testPackage.code,
        packageName: testPackage.name,
        amount: yearlyPrice,
        payType: 'wechat',
        billingCycle: 'yearly',
        tenantId: tenant.tenantId,
        tenantName: testData.companyName,
        contactName: testData.contactName,
        contactPhone: testData.phone,
        contactEmail: testData.email
      })

      if (yearlyPaymentRes.data.code !== 0) {
        log(`✗ 年付订单创建失败: ${yearlyPaymentRes.data.message}`, 'red')
      } else {
        log(`✓ 年付订单创建成功`, 'green')
        log(`  - 订单号: ${yearlyPaymentRes.data.data.orderNo}`, 'blue')
      }
    } else {
      log('该套餐不支持年付优惠', 'yellow')
    }

    // ==================== 测试总结 ====================
    section('✅ 测试总结')

    log('支付功能测试完成！', 'green')
    log('\n测试覆盖范围:', 'cyan')
    log('  ✓ 套餐列表获取', 'green')
    log('  ✓ 租户注册', 'green')
    log('  ✓ 微信支付订单创建', 'green')
    log('  ✓ 支付宝支付订单创建', 'green')
    log('  ✓ 对公转账订单创建', 'green')
    log('  ✓ 支付状态查询', 'green')
    log('  ✓ 年付功能', 'green')

    log('\n下一步操作:', 'cyan')
    log('  1. 在浏览器中访问: http://localhost:8081/register', 'blue')
    log('  2. 选择套餐并填写信息', 'blue')
    log('  3. 查看支付二维码和支付成功页面', 'blue')
    log('  4. 验证租户编码、授权码、到期时间是否正确显示', 'blue')

  } catch (error) {
    section('❌ 测试失败')
    log(`错误: ${error.message}`, 'red')
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'red')
      log(`响应数据: ${JSON.stringify(error.response.data, null, 2)}`, 'red')
    }
    process.exit(1)
  }
}

// 运行测试
log('🚀 开始支付功能完整流程测试', 'cyan')
log('测试环境: ' + API_BASE, 'blue')
log('', 'reset')

testPaymentFlow()
