/**
 * 测试私有授权码错误提示
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function test() {
  console.log('========================================');
  console.log('🧪 测试私有授权码错误提示');
  console.log('========================================\n');

  // 测试1：使用私有授权码在租户系统激活
  console.log('📋 测试：在租户系统使用私有授权码');
  console.log('   授权码: PRIVATE-TEST-XXXX-YYYY-ZZZZ\n');

  try {
    const res = await axios.post(`${API_BASE}/tenant-license/verify`, {
      licenseKey: 'PRIVATE-TEST-XXXX-YYYY-ZZZZ'
    });
    console.log('   ❌ 应该报错但通过了:', res.data);
  } catch (error) {
    if (error.response) {
      console.log(`   ✅ 正确拒绝 (HTTP ${error.response.status})`);
      console.log(`   - 错误类型: ${error.response.data.errorType || '未设置'}`);
      console.log(`   - 错误提示: ${error.response.data.message}`);

      if (error.response.data.errorType === 'WRONG_LICENSE_TYPE') {
        console.log('\n   ✅ 错误类型标识正确！');
        console.log('   前端可以根据 errorType 显示更友好的提示');
      }
    } else {
      console.log('   ❌ 网络错误:', error.message);
    }
  }

  console.log('\n========================================');
  console.log('✅ 测试完成');
  console.log('========================================\n');
}

test().catch(console.error);
