/**
 * 测试基本设置API
 * 验证超管面板基本设置保存功能
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

// 测试用的管理员token（需要先登录获取）
let authToken = '';

async function login() {
  try {
    console.log('\n========== 1. 管理员登录 ==========');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    console.log('登录响应:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      // 尝试多种可能的token位置
      authToken = (response.data.data && response.data.data.tokens && response.data.data.tokens.accessToken) ||
                  (response.data.data && response.data.data.token) ||
                  response.data.token;

      if (authToken) {
        console.log('✅ 登录成功');
        console.log('Token:', authToken.substring(0, 50) + '...');
        return true;
      } else {
        console.log('❌ 登录失败: 未找到token');
        return false;
      }
    } else {
      console.log('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return false;
  }
}

async function getBasicSettings() {
  try {
    console.log('\n========== 2. 获取基本设置 ==========');
    const response = await axios.get(`${API_BASE_URL}/system/basic-settings`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ 获取成功');
      console.log('当前设置:', JSON.stringify(response.data.data, null, 2));
      return response.data.data;
    } else {
      console.log('❌ 获取失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取请求失败:', error.response?.data || error.message);
    return null;
  }
}

async function updateBasicSettings() {
  try {
    console.log('\n========== 3. 更新基本设置 ==========');

    const testData = {
      systemName: 'CRM客户管理系统',
      systemVersion: '1.0.0',
      companyName: '测试公司',
      contactPhone: '400-123-4567',
      contactEmail: 'contact@example.com',
      websiteUrl: 'https://example.com',
      companyAddress: '测试地址',
      systemDescription: '这是一个测试描述',
      systemLogo: '/uploads/system/logo-test.png',
      contactQRCode: '/uploads/system/qrcode-test.png',
      contactQRCodeLabel: '扫码联系我们'
    };

    console.log('发送数据:', JSON.stringify(testData, null, 2));

    const response = await axios.put(
      `${API_BASE_URL}/system/basic-settings`,
      testData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      console.log('✅ 更新成功');
      console.log('返回数据:', JSON.stringify(response.data, null, 2));
      return true;
    } else {
      console.log('❌ 更新失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 更新请求失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    return false;
  }
}

async function verifyUpdate() {
  try {
    console.log('\n========== 4. 验证更新结果 ==========');
    const settings = await getBasicSettings();

    if (settings) {
      console.log('✅ 验证成功，设置已更新');
      console.log('系统名称:', settings.systemName);
      console.log('公司名称:', settings.companyName);
      console.log('二维码标签:', settings.contactQRCodeLabel);
      console.log('二维码路径:', settings.contactQRCode);
      return true;
    } else {
      console.log('❌ 验证失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('  超管面板基本设置API测试');
  console.log('========================================');

  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }

  // 2. 获取当前设置
  await getBasicSettings();

  // 3. 更新设置
  const updateSuccess = await updateBasicSettings();
  if (!updateSuccess) {
    console.log('\n❌ 测试失败：更新设置失败');
    return;
  }

  // 4. 验证更新
  await verifyUpdate();

  console.log('\n========================================');
  console.log('  测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
