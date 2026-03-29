/**
 * 测试公开授权查询API
 * 验证私有部署系统能否正确查询授权信息
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// 测试用例
async function runTests() {
  console.log('========================================');
  console.log('🧪 公开授权查询API测试');
  console.log('========================================\n');

  // 测试1：查询有效的私有授权码
  console.log('📋 测试1：查询有效的私有授权码');
  try {
    // 先获取一个私有授权码
    const licenses = await axios.get(`${API_BASE}/admin/licenses`, {
      params: { customerType: 'private', status: 'active' },
      headers: { Authorization: 'Bearer admin-token-placeholder' }
    }).catch(() => ({ data: { data: { list: [] } } }));

    const privateLicense = licenses.data?.data?.list?.[0];

    if (privateLicense) {
      console.log(`   使用授权码: ${privateLicense.license_key}`);

      const res = await axios.post(`${API_BASE}/public/license-query/verify`, {
        licenseKey: privateLicense.license_key,
        machineId: 'TEST-MACHINE-001'
      });

      if (res.data.success && res.data.valid) {
        console.log('   ✅ 查询成功');
        console.log(`   - 客户名称: ${res.data.licenseInfo.customerName}`);
        console.log(`   - 授权类型: ${res.data.licenseInfo.licenseType}`);
        console.log(`   - 最大用户数: ${res.data.licenseInfo.maxUsers}`);
        console.log(`   - 到期时间: ${res.data.licenseInfo.expiresAt || '永久'}`);
      } else {
        console.log('   ❌ 授权无效:', res.data.message);
      }
    } else {
      console.log('   ⚠️  未找到私有授权码，跳过测试');
    }
  } catch (error) {
    console.log('   ❌ 测试失败:', error.response?.data?.message || error.message);
  }

  console.log('\n📋 测试2：查询不存在的授权码');
  try {
    const res = await axios.post(`${API_BASE}/public/license-query/verify`, {
      licenseKey: 'PRIVATE-XXXX-XXXX-XXXX-XXXX'
    });
    console.log('   结果:', res.data);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('   ✅ 正确返回404:', error.response.data.message);
    } else {
      console.log('   ❌ 错误:', error.response?.data?.message || error.message);
    }
  }

  console.log('\n📋 测试3：使用租户授权码（应该被拒绝）');
  try {
    const res = await axios.post(`${API_BASE}/public/license-query/verify`, {
      licenseKey: 'TENANT-AAAA-BBBB-CCCC-DDDD'
    });
    console.log('   ❌ 应该被拒绝但通过了:', res.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ 正确拒绝:', error.response.data.message);
    } else {
      console.log('   ⚠️  错误:', error.response?.data?.message || error.message);
    }
  }

  console.log('\n📋 测试4：批量查询授权码');
  try {
    const res = await axios.post(`${API_BASE}/public/license-query/batch`, {
      licenseKeys: [
        'PRIVATE-AAAA-BBBB-CCCC-DDDD',
        'PRIVATE-XXXX-YYYY-ZZZZ-WWWW'
      ]
    });
    console.log('   ✅ 批量查询成功');
    console.log('   结果:', JSON.stringify(res.data.data, null, 2));
  } catch (error) {
    console.log('   ❌ 测试失败:', error.response?.data?.message || error.message);
  }

  console.log('\n========================================');
  console.log('✅ 测试完成');
  console.log('========================================\n');

  console.log('📖 API使用说明：');
  console.log('');
  console.log('1. 单个授权查询：');
  console.log('   POST /api/v1/public/license-query/verify');
  console.log('   Body: { licenseKey: "PRIVATE-XXXX-...", machineId: "可选" }');
  console.log('');
  console.log('2. 批量授权查询：');
  console.log('   POST /api/v1/public/license-query/batch');
  console.log('   Body: { licenseKeys: ["PRIVATE-...", "PRIVATE-..."] }');
  console.log('');
  console.log('3. 返回字段：');
  console.log('   - valid: 授权是否有效');
  console.log('   - licenseInfo: 授权详细信息（客户名、类型、用户数、到期时间等）');
  console.log('');
}

runTests().catch(console.error);
