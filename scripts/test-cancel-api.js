/**
 * 测试取消订单 API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// 测试获取待审核的取消订单
async function testPendingCancelOrders() {
  try {
    console.log('\n=== 测试获取待审核的取消订单 ===');
    const response = await axios.get(`${API_BASE}/orders/pending-cancel`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // 需要替换为实际的 token
      }
    });

    console.log('✅ API 调用成功');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    console.log('订单数量:', response.data.data?.length || 0);

    if (response.data.data && response.data.data.length > 0) {
      console.log('\n待审核订单列表:');
      response.data.data.forEach((order, index) => {
        console.log(`${index + 1}. 订单号: ${order.orderNumber}`);
        console.log(`   客户: ${order.customerName}`);
        console.log(`   状态: ${order.status}`);
        console.log(`   取消原因: ${order.cancelReason}`);
        console.log(`   申请时间: ${order.cancelRequestTime}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ API 调用失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 测试获取已审核的取消订单
async function testAuditedCancelOrders() {
  try {
    console.log('\n=== 测试获取已审核的取消订单 ===');
    const response = await axios.get(`${API_BASE}/orders/audited-cancel`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // 需要替换为实际的 token
      }
    });

    console.log('✅ API 调用成功');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    console.log('订单数量:', response.data.data?.length || 0);
  } catch (error) {
    console.error('❌ API 调用失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
async function runTests() {
  await testPendingCancelOrders();
  await testAuditedCancelOrders();
}

runTests();
