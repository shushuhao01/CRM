/**
 * 测试创建外包公司功能
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// 测试用户登录信息（需要根据实际情况修改）
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

async function testCreateCompany() {
  try {
    console.log('=== 测试创建外包公司 ===\n');

    // 1. 登录获取token
    console.log('1. 登录...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    const token = loginRes.data.data.token;
    console.log('✓ 登录成功\n');

    // 2. 创建公司
    console.log('2. 创建公司...');
    const companyData = {
      companyName: '测试公司' + Date.now(),
      contactPerson: '张三',
      contactPhone: '13800138000',
      contactEmail: 'test@example.com',
      address: '测试地址',
      remark: '这是一个测试公司'
    };

    const createRes = await axios.post(
      `${API_BASE}/value-added/companies`,
      companyData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✓ 创建成功');
    console.log('返回数据:', JSON.stringify(createRes.data, null, 2));
    console.log('\n公司ID:', createRes.data.data.id);
    console.log('公司名称:', createRes.data.data.companyName);

    // 3. 验证公司列表
    console.log('\n3. 验证公司列表...');
    const listRes = await axios.get(
      `${API_BASE}/value-added/companies`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const createdCompany = listRes.data.data.find(c => c.id === createRes.data.data.id);
    if (createdCompany) {
      console.log('✓ 在列表中找到新创建的公司');
      console.log('公司信息:', JSON.stringify(createdCompany, null, 2));
    } else {
      console.log('✗ 未在列表中找到新创建的公司');
    }

    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCreateCompany();
