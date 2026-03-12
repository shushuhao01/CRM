/**
 * 授权管理API测试脚本
 *
 * 测试所有授权管理相关的API接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/admin';
let authToken = '';
let testLicenseId = '';

// 测试配置
const testData = {
  admin: {
    username: 'admin',
    password: 'admin123'
  },
  license: {
    customerName: '测试客户公司',
    customerContact: '张三',
    customerPhone: '13800138000',
    customerEmail: 'test@example.com',
    licenseType: 'trial',
    maxUsers: 20,
    maxStorageGb: 10,
    features: ['订单管理', '客户管理', '商品管理'],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后
    notes: '测试授权'
  }
};

// 辅助函数：发送请求
async function request(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    throw error;
  }
}

// 测试函数
async function runTests() {
  console.log('🚀 开始测试授权管理API\n');
  console.log('='.repeat(60));

  try {
    // 1. 管理员登录
    console.log('\n📝 测试1: 管理员登录');
    const loginResult = await request('POST', '/auth/login', testData.admin);
    if (loginResult.success) {
      authToken = loginResult.data.token;
      console.log('✅ 登录成功');
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
    } else {
      console.log('❌ 登录失败:', loginResult.message);
      return;
    }

    // 2. 创建授权
    console.log('\n📝 测试2: 创建授权');
    const createResult = await request('POST', '/licenses', testData.license);
    if (createResult.success) {
      testLicenseId = createResult.data.id;
      console.log('✅ 创建成功');
      console.log(`   授权ID: ${createResult.data.id}`);
      console.log(`   授权码: ${createResult.data.licenseKey}`);
      console.log(`   客户名称: ${createResult.data.customerName}`);
      console.log(`   授权类型: ${createResult.data.licenseType}`);
      console.log(`   状态: ${createResult.data.status}`);
    } else {
      console.log('❌ 创建失败:', createResult.message);
    }

    // 3. 获取授权列表
    console.log('\n📝 测试3: 获取授权列表');
    const listResult = await request('GET', '/licenses?page=1&pageSize=10');
    if (listResult.success) {
      console.log('✅ 获取成功');
      console.log(`   总数: ${listResult.data.total}`);
      console.log(`   当前页: ${listResult.data.page}`);
      console.log(`   每页数量: ${listResult.data.pageSize}`);
      console.log(`   列表数量: ${listResult.data.list.length}`);
    } else {
      console.log('❌ 获取失败:', listResult.message);
    }

    // 4. 获取授权详情
    console.log('\n📝 测试4: 获取授权详情');
    const detailResult = await request('GET', `/licenses/${testLicenseId}`);
    if (detailResult.success) {
      console.log('✅ 获取成功');
      console.log(`   授权ID: ${detailResult.data.id}`);
      console.log(`   授权码: ${detailResult.data.licenseKey}`);
      console.log(`   客户名称: ${detailResult.data.customerName}`);
      console.log(`   最大用户数: ${detailResult.data.maxUsers}`);
      console.log(`   最大存储: ${detailResult.data.maxStorageGb}GB`);
    } else {
      console.log('❌ 获取失败:', detailResult.message);
    }

    // 5. 更新授权
    console.log('\n📝 测试5: 更新授权');
    const updateResult = await request('PUT', `/licenses/${testLicenseId}`, {
      maxUsers: 50,
      notes: '测试授权 - 已更新'
    });
    if (updateResult.success) {
      console.log('✅ 更新成功');
      console.log(`   最大用户数: ${updateResult.data.maxUsers}`);
      console.log(`   备注: ${updateResult.data.notes}`);
    } else {
      console.log('❌ 更新失败:', updateResult.message);
    }

    // 6. 激活授权
    console.log('\n📝 测试6: 激活授权');
    const activateResult = await request('POST', `/licenses/${testLicenseId}/activate`, {
      machineId: 'TEST-MACHINE-001'
    });
    if (activateResult.success) {
      console.log('✅ 激活成功');
      console.log(`   状态: ${activateResult.data.status}`);
      console.log(`   激活时间: ${activateResult.data.activatedAt}`);
      console.log(`   机器码: ${activateResult.data.machineId}`);
    } else {
      console.log('❌ 激活失败:', activateResult.message);
    }

    // 7. 验证授权
    console.log('\n📝 测试7: 验证授权');
    const licenseKey = detailResult.data.licenseKey;
    const verifyResult = await request('POST', '/licenses/verify', {
      licenseKey,
      machineId: 'TEST-MACHINE-001'
    });
    if (verifyResult.success) {
      console.log('✅ 验证成功');
      console.log(`   授权有效: ${verifyResult.success}`);
      console.log(`   消息: ${verifyResult.message}`);
    } else {
      console.log('⚠️  验证结果:', verifyResult.message);
    }

    // 8. 获取授权日志
    console.log('\n📝 测试8: 获取授权日志');
    const logsResult = await request('GET', `/licenses/${testLicenseId}/logs?page=1&pageSize=10`);
    if (logsResult.success) {
      console.log('✅ 获取成功');
      console.log(`   日志总数: ${logsResult.data.total}`);
      console.log(`   日志列表:`);
      logsResult.data.list.slice(0, 5).forEach((log, index) => {
        console.log(`      ${index + 1}. ${log.action} - ${log.result} - ${log.message}`);
      });
    } else {
      console.log('❌ 获取失败:', logsResult.message);
    }

    // 9. 续期授权
    console.log('\n📝 测试9: 续期授权');
    const renewResult = await request('POST', `/licenses/${testLicenseId}/renew`, {
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90天后
    });
    if (renewResult.success) {
      console.log('✅ 续期成功');
      console.log(`   新到期时间: ${renewResult.data.expiresAt}`);
    } else {
      console.log('❌ 续期失败:', renewResult.message);
    }

    // 10. 获取授权统计
    console.log('\n📝 测试10: 获取授权统计');
    const statsResult = await request('GET', '/licenses/statistics');
    if (statsResult.success) {
      console.log('✅ 获取成功');
      console.log(`   总数: ${statsResult.data.total}`);
      console.log(`   激活: ${statsResult.data.active}`);
      console.log(`   待激活: ${statsResult.data.pending}`);
      console.log(`   已过期: ${statsResult.data.expired}`);
      console.log(`   已撤销: ${statsResult.data.revoked}`);
    } else {
      console.log('❌ 获取失败:', statsResult.message);
    }

    // 11. 停用授权
    console.log('\n📝 测试11: 停用授权');
    const deactivateResult = await request('POST', `/licenses/${testLicenseId}/deactivate`, {
      reason: '测试停用'
    });
    if (deactivateResult.success) {
      console.log('✅ 停用成功');
      console.log(`   状态: ${deactivateResult.data.status}`);
    } else {
      console.log('❌ 停用失败:', deactivateResult.message);
    }

    // 12. 删除授权（可选，取消注释以执行）
    // console.log('\n📝 测试12: 删除授权');
    // const deleteResult = await request('DELETE', `/licenses/${testLicenseId}`);
    // if (deleteResult.success) {
    //   console.log('✅ 删除成功');
    // } else {
    //   console.log('❌ 删除失败:', deleteResult.message);
    // }

    // 测试总结
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试完成！');
    console.log('\n📊 测试总结:');
    console.log(`   测试授权ID: ${testLicenseId}`);
    console.log(`   测试授权码: ${licenseKey}`);
    console.log('\n💡 提示:');
    console.log('   - 可以在Admin后台查看创建的测试授权');
    console.log('   - 测试授权未被删除，可用于前端测试');
    console.log('   - 如需删除，取消注释测试12');

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    if (error.response) {
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行测试
console.log('授权管理API测试');
console.log('确保后端服务运行在 http://localhost:3000');
console.log('');

runTests().catch(console.error);
