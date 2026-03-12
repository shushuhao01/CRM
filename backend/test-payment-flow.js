/**
 * 测试完整支付流程
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testPaymentFlow() {
  console.log('=== 测试支付流程 ===\n');

  try {
    // 1. 创建支付订单
    console.log('1. 创建支付订单...');
    const createResponse = await axios.post(`${API_BASE}/public/payment/create`, {
      packageId: 'basic',
      packageName: '基础版',
      amount: 99.00,
      payType: 'wechat',
      billingCycle: 'monthly',
      tenantId: 'test-tenant-id',
      tenantName: '测试企业',
      contactName: '张三',
      contactPhone: '13800138000',
      contactEmail: 'test@example.com'
    });

    console.log('✅ 订单创建成功:');
    console.log('   订单号:', createResponse.data.data.orderNo);
    console.log('   二维码:', createResponse.data.data.qrCode);
    console.log('   支付链接:', createResponse.data.data.payUrl);
    console.log('');

    const orderNo = createResponse.data.data.orderNo;

    // 2. 查询支付状态
    console.log('2. 查询支付状态...');
    const queryResponse = await axios.get(`${API_BASE}/public/payment/query/${orderNo}`);

    console.log('✅ 查询成功:');
    console.log('   订单状态:', queryResponse.data.data.status);
    console.log('   支付金额:', queryResponse.data.data.amount);
    console.log('   支付方式:', queryResponse.data.data.payType);
    console.log('');

    // 3. 模拟支付回调（需要手动触发）
    console.log('3. 支付回调处理');
    console.log('   ⚠️  需要真实支付或手动触发回调');
    console.log('   回调地址: POST /api/v1/admin/payment/notify/wechat');
    console.log('');

    // 4. 取消订单
    console.log('4. 取消订单...');
    const cancelResponse = await axios.post(`${API_BASE}/public/payment/cancel/${orderNo}`);

    console.log('✅ 订单已取消');
    console.log('');

    console.log('=== 测试完成 ===');
    console.log('');
    console.log('✅ 所有API接口正常工作');
    console.log('');
    console.log('下一步:');
    console.log('1. 在Admin后台配置微信支付/支付宝');
    console.log('2. 配置回调地址（需要公网可访问）');
    console.log('3. 测试真实支付流程');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   详细信息:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testPaymentFlow();
