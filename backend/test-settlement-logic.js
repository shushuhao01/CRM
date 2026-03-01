/**
 * 测试结算状态业务逻辑
 *
 * 业务规则：
 * 1. 结算状态"已结算"只能在有效状态为"有效"时选择
 * 2. 未结算时实际结算金额显示0，已结算时显示单价
 * 3. 单价映射：待分配=0，分配公司=公司默认单价
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';
let authToken = '';

// 登录获取token
async function login() {
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    authToken = res.data.data.token;
    console.log('✅ 登录成功');
    return true;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

// 获取订单列表
async function getOrders() {
  try {
    const res = await axios.get(`${API_BASE}/value-added/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, pageSize: 5 }
    });
    return res.data.data?.list || res.data.list || [];
  } catch (error) {
    console.error('❌ 获取订单失败:', error.response?.data || error.message);
    return [];
  }
}

// 测试1：尝试将非"有效"状态的订单设置为"已结算"（应该失败）
async function testRule1(orderId) {
  console.log('\n📋 测试规则1：非"有效"状态不能设置为"已结算"');

  try {
    // 先设置为"待处理"状态
    await axios.put(`${API_BASE}/value-added/orders/batch-process`, {
      ids: [orderId],
      action: 'updateStatus',
      data: { status: 'pending' }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✓ 订单状态设置为"待处理"');

    // 尝试设置为"已结算"（应该失败）
    try {
      await axios.put(`${API_BASE}/value-added/orders/batch-process`, {
        ids: [orderId],
        action: 'updateSettlementStatus',
        data: { settlementStatus: 'settled' }
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('  ❌ 测试失败：应该拒绝设置为已结算');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('  ✅ 测试通过：正确拒绝了非有效状态设置为已结算');
        console.log('     错误信息:', error.response.data.message);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('  ❌ 测试失败:', error.response?.data || error.message);
  }
}

// 测试2：有效状态为"有效"时可以设置为"已结算"
async function testRule2(orderId) {
  console.log('\n📋 测试规则2："有效"状态可以设置为"已结算"');

  try {
    // 先设置为"有效"状态
    await axios.put(`${API_BASE}/value-added/orders/batch-process`, {
      ids: [orderId],
      action: 'updateStatus',
      data: { status: 'valid' }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✓ 订单状态设置为"有效"');

    // 设置为"已结算"（应该成功）
    await axios.put(`${API_BASE}/value-added/orders/batch-process`, {
      ids: [orderId],
      action: 'updateSettlementStatus',
      data: { settlementStatus: 'settled' }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✅ 测试通过：成功设置为已结算');

    // 验证实际结算金额
    const orders = await getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      console.log(`  ✓ 单价: ¥${order.unitPrice}`);
      console.log(`  ✓ 实际结算: ¥${order.settlementAmount}`);
      if (Number(order.settlementAmount) === Number(order.unitPrice)) {
        console.log('  ✅ 实际结算金额 = 单价（正确）');
      } else {
        console.log('  ❌ 实际结算金额不等于单价（错误）');
      }
    }
  } catch (error) {
    console.error('  ❌ 测试失败:', error.response?.data || error.message);
  }
}

// 测试3：未结算时实际结算金额为0
async function testRule3(orderId) {
  console.log('\n📋 测试规则3：未结算时实际结算金额为0');

  try {
    // 设置为"未结算"
    await axios.put(`${API_BASE}/value-added/orders/batch-process`, {
      ids: [orderId],
      action: 'updateSettlementStatus',
      data: { settlementStatus: 'unsettled' }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✓ 订单设置为"未结算"');

    // 验证实际结算金额
    const orders = await getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      console.log(`  ✓ 结算状态: ${order.settlementStatus}`);
      console.log(`  ✓ 实际结算: ¥${order.settlementAmount}`);
      if (Number(order.settlementAmount) === 0) {
        console.log('  ✅ 实际结算金额 = 0（正确）');
      } else {
        console.log('  ❌ 实际结算金额不为0（错误）');
      }
    }
  } catch (error) {
    console.error('  ❌ 测试失败:', error.response?.data || error.message);
  }
}

// 测试4：改为非"有效"状态时，自动将结算状态改为"未结算"
async function testRule4(orderId) {
  console.log('\n📋 测试规则4：改为非"有效"状态时自动取消结算');

  try {
    // 先设置为"有效"+"已结算"
    await axios.put(`${API_BASE}/value-added/orders/batch-process`, {
      ids: [orderId],
      action: 'updateStatus',
      data: { status: 'valid' }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    await axios.put(`${API_BASE}/value-added/orders/batch-process`, {
      ids: [orderId],
      action: 'updateSettlementStatus',
      data: { settlementStatus: 'settled' }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✓ 订单设置为"有效"+"已结算"');

    // 改为"无效"状态
    await axios.put(`${API_BASE}/value-added/orders/batch-process`, {
      ids: [orderId],
      action: 'updateStatus',
      data: { status: 'invalid' }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('  ✓ 订单状态改为"无效"');

    // 验证结算状态
    const orders = await getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      console.log(`  ✓ 有效状态: ${order.status}`);
      console.log(`  ✓ 结算状态: ${order.settlementStatus}`);
      console.log(`  ✓ 实际结算: ¥${order.settlementAmount}`);
      if (order.settlementStatus === 'unsettled' && Number(order.settlementAmount) === 0) {
        console.log('  ✅ 自动改为"未结算"且金额为0（正确）');
      } else {
        console.log('  ❌ 未自动改为"未结算"（错误）');
      }
    }
  } catch (error) {
    console.error('  ❌ 测试失败:', error.response?.data || error.message);
  }
}

// 主测试流程
async function runTests() {
  console.log('🚀 开始测试结算状态业务逻辑\n');

  if (!await login()) {
    console.log('\n❌ 无法登录，测试终止');
    return;
  }

  const orders = await getOrders();
  if (orders.length === 0) {
    console.log('\n❌ 没有找到订单数据，测试终止');
    return;
  }

  const testOrderId = orders[0].id;
  console.log(`\n📦 使用测试订单: ${orders[0].orderNumber} (ID: ${testOrderId})`);

  await testRule1(testOrderId);
  await testRule2(testOrderId);
  await testRule3(testOrderId);
  await testRule4(testOrderId);

  console.log('\n✅ 所有测试完成！');
}

runTests().catch(console.error);
