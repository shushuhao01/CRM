/**
 * 测试个人业绩客户明细权限过滤
 * 验证生产环境是否正确过滤客户数据
 */

const axios = require('axios');

// 配置
const PRODUCTION_URL = 'https://abc789.cn'; // 生产环境地址
const DEV_URL = 'http://localhost:3000'; // 开发环境地址

// 测试用户token（需要替换为实际的token）
const TEST_TOKEN = 'YOUR_TOKEN_HERE';

async function testCustomerFilter(baseURL, token) {
  console.log(`\n========== 测试环境: ${baseURL} ==========\n`);

  try {
    // 1. 测试不带onlyMine参数的客户列表（应该根据角色过滤）
    console.log('1. 测试默认客户列表（根据角色过滤）...');
    const response1 = await axios.get(`${baseURL}/api/v1/customers`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });

    console.log('   - 返回客户数:', response1.data.data.total);
    console.log('   - 客户列表:', response1.data.data.list.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      salesPersonId: c.salesPersonId,
      salesPersonName: c.salesPersonName
    })));

    // 2. 测试带onlyMine=true参数的客户列表（强制只查询当前用户的客户）
    console.log('\n2. 测试个人业绩客户明细（onlyMine=true）...');
    const response2 = await axios.get(`${baseURL}/api/v1/customers`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 10,
        onlyMine: true
      }
    });

    console.log('   - 返回客户数:', response2.data.data.total);
    console.log('   - 客户列表:', response2.data.data.list.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      salesPersonId: c.salesPersonId,
      salesPersonName: c.salesPersonName
    })));

    // 3. 对比两次查询结果
    console.log('\n3. 对比结果:');
    console.log('   - 默认查询客户数:', response1.data.data.total);
    console.log('   - onlyMine查询客户数:', response2.data.data.total);

    if (response2.data.data.total <= response1.data.data.total) {
      console.log('   ✅ onlyMine过滤正常工作');
    } else {
      console.log('   ❌ onlyMine过滤异常！返回了更多客户');
    }

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('个人业绩客户明细权限过滤测试');
  console.log('================================\n');

  // 检查是否提供了token
  if (TEST_TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('❌ 请先设置TEST_TOKEN变量为实际的用户token');
    console.log('\n获取token的方法:');
    console.log('1. 登录系统');
    console.log('2. 打开浏览器开发者工具 -> Application -> Local Storage');
    console.log('3. 找到 auth_token 的值');
    console.log('4. 将该值替换到脚本中的 TEST_TOKEN 变量\n');
    return;
  }

  // 测试开发环境
  await testCustomerFilter(DEV_URL, TEST_TOKEN);

  // 测试生产环境
  await testCustomerFilter(PRODUCTION_URL, TEST_TOKEN);

  console.log('\n========== 测试完成 ==========\n');
}

main();
