/**
 * 测试公开授权查询API
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function test() {
  console.log('========================================');
  console.log('🧪 公开授权查询API测试');
  console.log('========================================\n');

  // 测试1：查询不存在的授权码
  console.log('📋 测试1：查询不存在的授权码');
  try {
    const res = await axios.post(`${API_BASE}/public/license-query/verify`, {
      licenseKey: 'PRIVATE-XXXX-YYYY-ZZZZ-WWWW',
      machineId: 'TEST-MACHINE-001'
    });
    console.log('   结果:', res.data);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('   ✅ 正确返回404');
      console.log(`   - 消息: ${error.response.data.message}`);
    } else {
      console.log('   ❌ 错误:', error.response?.data || error.message);
    }
  }

  // 测试2：使用租户授权码（应该被拒绝）
  console.log('\n📋 测试2：使用租户授权码（应该被拒绝）');
  try {
    const res = await axios.post(`${API_BASE}/public/license-query/verify`, {
      licenseKey: 'TENANT-AAAA-BBBB-CCCC-DDDD'
    });
    console.log('   ❌ 应该被拒绝但通过了:', res.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ 正确拒绝');
      console.log(`   - 错误类型: ${error.response.data.errorType}`);
      console.log(`   - 消息: ${error.response.data.message}`);
    } else {
      console.log('   ⚠️  错误:', error.response?.data || error.message);
    }
  }

  // 测试3：批量查询
  console.log('\n📋 测试3：批量查询授权码');
  try {
    const res = await axios.post(`${API_BASE}/public/license-query/batch`, {
      licenseKeys: [
        'PRIVATE-AAAA-BBBB-CCCC-DDDD',
        'PRIVATE-XXXX-YYYY-ZZZZ-WWWW'
      ]
    });
    console.log('   ✅ 批量查询成功');
    res.data.data.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.licenseKey}: ${item.valid ? '有效' : item.message}`);
    });
  } catch (error) {
    console.log('   ❌ 错误:', error.response?.data || error.message);
  }

  // 测试4：批量查询包含非私有授权码
  console.log('\n📋 测试4：批量查询包含租户授权码（应该被拒绝）');
  try {
    const res = await axios.post(`${API_BASE}/public/license-query/batch`, {
      licenseKeys: [
        'TENANT-AAAA-BBBB-CCCC-DDDD',
        'PRIVATE-XXXX-YYYY-ZZZZ-WWWW'
      ]
    });
    console.log('   结果:', res.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('   ✅ 正确拒绝');
      console.log(`   - 消息: ${error.response.data.message}`);
    } else {
      console.log('   ⚠️  错误:', error.response?.data || error.message);
    }
  }

  console.log('\n========================================');
  console.log('✅ 测试完成');
  console.log('========================================\n');

  console.log('📖 API使用说明：\n');
  console.log('1️⃣  单个授权查询：');
  console.log('   POST /api/v1/public/license-query/verify');
  console.log('   Body: {');
  console.log('     "licenseKey": "PRIVATE-XXXX-XXXX-XXXX-XXXX",');
  console.log('     "machineId": "可选-用于机器绑定"');
  console.log('   }\n');

  console.log('2️⃣  批量授权查询：');
  console.log('   POST /api/v1/public/license-query/batch');
  console.log('   Body: {');
  console.log('     "licenseKeys": ["PRIVATE-...", "PRIVATE-..."]');
  console.log('   }\n');

  console.log('3️⃣  返回字段：');
  console.log('   - success: 请求是否成功');
  console.log('   - valid: 授权是否有效');
  console.log('   - message: 提示信息');
  console.log('   - licenseInfo: 授权详细信息（仅在有效时返回）');
  console.log('     * customerName: 客户名称');
  console.log('     * licenseType: 授权类型');
  console.log('     * maxUsers: 最大用户数');
  console.log('     * maxStorageGb: 最大存储空间');
  console.log('     * features: 功能列表');
  console.log('     * expiresAt: 到期时间');
  console.log('     * activatedAt: 激活时间\n');
}

test().catch(console.error);
