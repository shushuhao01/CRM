/**
 * 客户API诊断脚本
 * 在浏览器控制台中运行此脚本来测试API
 */

async function testCustomerAPI() {
  console.log('=== 开始客户API诊断 ===');

  // 1. 获取token
  const token = localStorage.getItem('auth_token');
  console.log('1. Token状态:', token ? '已获取 (' + token.substring(0, 20) + '...)' : '未找到');

  if (!token) {
    console.error('❌ 未找到auth_token，请先登录');
    return;
  }

  // 2. 测试获取客户列表
  console.log('\n2. 测试获取客户列表...');
  try {
    const listResponse = await fetch('/api/v1/customers?page=1&pageSize=5', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('   响应状态:', listResponse.status);
    const listData = await listResponse.json();
    console.log('   响应数据:', listData);

    if (listData.success) {
      console.log('   ✅ 获取客户列表成功，共', listData.data?.total || 0, '个客户');
    } else {
      console.error('   ❌ 获取客户列表失败:', listData.message);
    }
  } catch (error) {
    console.error('   ❌ 请求失败:', error.message);
  }

  // 3. 测试检查客户是否存在
  const testPhone = '13800138000';
  console.log('\n3. 测试检查客户是否存在 (手机号:', testPhone, ')...');
  try {
    const checkResponse = await fetch(`/api/v1/customers/check-exists?phone=${testPhone}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('   响应状态:', checkResponse.status);
    const checkData = await checkResponse.json();
    console.log('   响应数据:', checkData);

    if (checkData.success) {
      if (checkData.data) {
        console.log('   ⚠️ 客户已存在:', checkData.data.name);
      } else {
        console.log('   ✅ 客户不存在，可以创建');
      }
    } else {
      console.error('   ❌ 检查失败:', checkData.message);
    }
  } catch (error) {
    console.error('   ❌ 请求失败:', error.message);
  }

  // 4. 测试创建客户（使用测试数据）
  console.log('\n4. 测试创建客户...');
  const testCustomer = {
    name: '测试客户_' + Date.now(),
    phone: '1' + Math.floor(Math.random() * 9000000000 + 1000000000),
    age: 30,
    gender: 'male',
    height: 175,
    weight: 70,
    level: 'bronze',
    status: 'active',
    address: '测试地址',
    medicalHistory: '无',
    improvementGoals: ['减肥'],
    fanAcquisitionTime: new Date().toISOString().split('T')[0]
  };
  console.log('   测试数据:', testCustomer);

  try {
    const createResponse = await fetch('/api/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCustomer)
    });
    console.log('   响应状态:', createResponse.status);
    const createData = await createResponse.json();
    console.log('   响应数据:', createData);

    if (createResponse.ok && createData.success) {
      console.log('   ✅ 创建客户成功！');
      console.log('   新客户ID:', createData.data?.id);
      console.log('   新客户姓名:', createData.data?.name);

      // 5. 验证客户是否真的保存到数据库
      console.log('\n5. 验证客户是否保存到数据库...');
      const verifyResponse = await fetch(`/api/v1/customers/${createData.data.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const verifyData = await verifyResponse.json();

      if (verifyData.success && verifyData.data) {
        console.log('   ✅ 验证成功！客户已保存到数据库');
        console.log('   客户详情:', verifyData.data);
      } else {
        console.error('   ❌ 验证失败！客户可能未保存到数据库');
      }
    } else {
      console.error('   ❌ 创建客户失败:', createData.message);
    }
  } catch (error) {
    console.error('   ❌ 请求失败:', error.message);
    console.error('   错误详情:', error);
  }

  console.log('\n=== 诊断完成 ===');
}

// 运行诊断
testCustomerAPI();
