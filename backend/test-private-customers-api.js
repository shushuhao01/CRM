/**
 * 私有客户API测试脚本
 * 测试私有客户管理的所有API接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let authToken = '';
let testCustomerId = '';
let testLicenseId = '';

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// 请求拦截器：添加认证token
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// 测试函数
async function runTests() {
  console.log('========================================');
  console.log('私有客户API测试');
  console.log('========================================\n');

  try {
    // 1. 管理员登录
    console.log('【测试1】管理员登录...');
    const loginRes = await api.post('/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    authToken = loginRes.data.data.token;
    console.log('✅ 登录成功\n');

    // 2. 创建私有客户
    console.log('【测试2】创建私有客户...');
    const createRes = await api.post('/private-customers', {
      // 客户信息
      customerName: `测试私有客户-${Date.now()}`,
      contactPerson: '张经理',
      contactPhone: '13800138000',
      contactEmail: 'zhang@example.com',
      companyAddress: '北京市朝阳区xxx大厦',
      industry: '互联网',
      companySize: '50-200人',
      deploymentType: 'on-premise',
      notes: 'API测试创建的客户',
      // 授权配置
      licenseType: 'annual',
      maxUsers: 100,
      maxStorageGb: 50,
      features: ['订单管理', '客户管理', '财务管理', '数据分析'],
      expiresAt: '2027-03-04',
    });
    testCustomerId = createRes.data.data.customer.id;
    testLicenseId = createRes.data.data.license.id;
    console.log('✅ 创建成功');
    console.log(`   客户ID: ${testCustomerId}`);
    console.log(`   授权码: ${createRes.data.data.license.license_key}\n`);

    // 3. 获取私有客户列表
    console.log('【测试3】获取私有客户列表...');
    const listRes = await api.get('/private-customers', {
      params: { page: 1, pageSize: 10 },
    });
    console.log('✅ 获取成功');
    console.log(`   总数: ${listRes.data.data.total}`);
    console.log(`   当前页: ${listRes.data.data.list.length} 条\n`);

    // 4. 搜索私有客户
    console.log('【测试4】搜索私有客户...');
    const searchRes = await api.get('/private-customers', {
      params: { keyword: '测试' },
    });
    console.log('✅ 搜索成功');
    console.log(`   找到: ${searchRes.data.data.total} 条\n`);

    // 5. 获取私有客户详情
    console.log('【测试5】获取私有客户详情...');
    const detailRes = await api.get(`/private-customers/${testCustomerId}`);
    console.log('✅ 获取成功');
    console.log(`   客户名称: ${detailRes.data.data.customer.customer_name}`);
    console.log(`   当前授权: ${detailRes.data.data.currentLicense ? '有' : '无'}`);
    console.log(`   授权历史: ${detailRes.data.data.licenseHistory.length} 条`);
    console.log(`   操作日志: ${detailRes.data.data.logs.length} 条\n`);

    // 6. 更新私有客户信息
    console.log('【测试6】更新私有客户信息...');
    const updateRes = await api.put(`/private-customers/${testCustomerId}`, {
      contactPerson: '李经理',
      notes: '已更新联系人',
    });
    console.log('✅ 更新成功\n');

    // 7. 获取客户的所有授权
    console.log('【测试7】获取客户的所有授权...');
    const licensesRes = await api.get(`/private-customers/${testCustomerId}/licenses`);
    console.log('✅ 获取成功');
    console.log(`   授权数量: ${licensesRes.data.data.total}\n`);

    // 8. 为客户生成新授权
    console.log('【测试8】为客户生成新授权...');
    const newLicenseRes = await api.post(`/private-customers/${testCustomerId}/licenses`, {
      licenseType: 'perpetual',
      maxUsers: 200,
      maxStorageGb: 100,
      features: ['订单管理', '客户管理', '财务管理', '数据分析', '绩效管理'],
      notes: '升级为永久版',
    });
    console.log('✅ 生成成功');
    console.log(`   新授权码: ${newLicenseRes.data.data.license_key}\n`);

    // 9. 按行业筛选
    console.log('【测试9】按行业筛选...');
    const industryRes = await api.get('/private-customers', {
      params: { industry: '互联网' },
    });
    console.log('✅ 筛选成功');
    console.log(`   找到: ${industryRes.data.data.total} 条\n`);

    // 10. 删除私有客户（清理测试数据）
    console.log('【测试10】删除私有客户...');
    try {
      await api.delete(`/private-customers/${testCustomerId}`);
      console.log('❌ 删除失败（预期：有有效授权无法删除）\n');
    } catch (error) {
      console.log('✅ 删除失败（预期行为：有有效授权无法删除）\n');
    }

    console.log('========================================');
    console.log('测试完成！');
    console.log('========================================');
    console.log(`\n测试客户ID: ${testCustomerId}`);
    console.log('注意：测试数据未清理，请手动删除或保留用于查看\n');
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

// 运行测试
runTests();
