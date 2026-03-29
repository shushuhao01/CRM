/**
 * 测试私有授权码完整流程
 * 1. 创建私有客户
 * 2. 生成私有授权码
 * 3. 测试在租户系统使用（应该报错）
 * 4. 测试公开API查询
 * 5. 测试私有部署激活
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('========================================');
  console.log('🧪 私有授权码完整流程测试');
  console.log('========================================\n');

  let customerId, licenseKey;

  // 步骤1：创建测试私有客户
  console.log('📋 步骤1：创建测试私有客户');
  try {
    const res = await axios.post(`${API_BASE}/admin/private-customers`, {
      customerName: '测试私有客户-' + Date.now(),
      contactPerson: '张三',
      contactPhone: '13800138000',
      contactEmail: 'test@example.com',
      industry: '科技',
      companySize: '50-200人',
      address: '测试地址',
      notes: '自动化测试创建'
    }, {
      headers: { Authorization: 'Bearer admin-token-placeholder' }
    }).catch(err => {
      // 如果认证失败，尝试直接插入数据库
      return null;
    });

    if (res?.data?.success) {
      customerId = res.data.data.id;
      console.log(`   ✅ 创建成功，客户ID: ${customerId}`);
    } else {
      // 直接插入数据库
      const dbPath = require('path').join(__dirname, 'dist/config/database.js');
      const { AppDataSource } = require(dbPath);
      await AppDataSource.initialize().catch(() => {});
      customerId = uuidv4();
      await AppDataSource.query(
        `INSERT INTO private_customers (id, customer_name, contact_person, contact_phone, contact_email, industry, company_size, address, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [customerId, '测试私有客户-' + Date.now(), '张三', '13800138000', 'test@example.com', '科技', '50-200人', '测试地址', '自动化测试']
      );
      console.log(`   ✅ 直接创建成功，客户ID: ${customerId}`);
    }
  } catch (error) {
    console.log('   ❌ 创建失败:', error.message);
    return;
  }

  // 步骤2：生成私有授权码
  console.log('\n📋 步骤2：生成私有授权码');
  try {
    const { AppDataSource } = require('./src/config/database');
    await AppDataSource.initialize().catch(() => {});

    const licenseId = uuidv4();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];
    for (let i = 0; i < 4; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }
    licenseKey = `PRIVATE-${segments.join('-')}`;

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    await AppDataSource.query(
      `INSERT INTO licenses (id, license_key, customer_name, customer_type, private_customer_id, license_type, max_users, max_storage_gb, features, expires_at, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, 'private', ?, 'enterprise', 100, 100, '["all"]', ?, 'pending', '测试授权', NOW(), NOW())`,
      [licenseId, licenseKey, '测试私有客户', customerId, expiresAtStr]
    );

    console.log(`   ✅ 生成成功: ${licenseKey}`);
    console.log(`   - 授权ID: ${licenseId}`);
    console.log(`   - 最大用户数: 100`);
    console.log(`   - 到期时间: ${expiresAtStr}`);
  } catch (error) {
    console.log('   ❌ 生成失败:', error.message);
    return;
  }

  // 步骤3：测试在租户系统使用（应该报错并提示清晰）
  console.log('\n📋 步骤3：在租户系统使用私有授权码（应该报错）');
  try {
    const res = await axios.post(`${API_BASE}/tenant-license/verify`, {
      licenseKey: licenseKey
    });
    console.log('   ❌ 应该报错但通过了:', res.data);
  } catch (error) {
    if (error.response?.status === 404) {
      const errData = error.response.data;
      console.log('   ✅ 正确拒绝');
      console.log(`   - 错误类型: ${errData.errorType}`);
      console.log(`   - 错误提示: ${errData.message}`);

      if (errData.errorType === 'WRONG_LICENSE_TYPE') {
        console.log('   ✅ 错误类型标识正确');
      } else {
        console.log('   ⚠️  错误类型标识缺失或不正确');
      }
    } else {
      console.log('   ⚠️  错误:', error.response?.data?.message || error.message);
    }
  }

  // 步骤4：测试公开API查询
  console.log('\n📋 步骤4：使用公开API查询授权信息');
  try {
    const res = await axios.post(`${API_BASE}/public/license-query/verify`, {
      licenseKey: licenseKey,
      machineId: 'TEST-MACHINE-001'
    });

    if (res.data.success && res.data.valid) {
      console.log('   ✅ 查询成功');
      console.log(`   - 授权有效: ${res.data.valid}`);
      console.log(`   - 客户名称: ${res.data.licenseInfo.customerName}`);
      console.log(`   - 最大用户数: ${res.data.licenseInfo.maxUsers}`);
      console.log(`   - 功能列表: ${JSON.stringify(res.data.licenseInfo.features)}`);
    } else {
      console.log('   ❌ 授权无效:', res.data.message);
    }
  } catch (error) {
    console.log('   ❌ 查询失败:', error.response?.data?.message || error.message);
  }

  // 步骤5：测试私有部署激活（在tenantLicense路由中）
  console.log('\n📋 步骤5：测试私有部署激活');
  try {
    const res = await axios.post(`${API_BASE}/tenant-license/verify`, {
      licenseKey: licenseKey
    });

    if (res.data.success && res.data.data) {
      console.log('   ✅ 激活成功');
      console.log(`   - 租户ID: ${res.data.data.tenantId}`);
      console.log(`   - 租户编码: ${res.data.data.tenantCode}`);
      console.log(`   - 租户名称: ${res.data.data.tenantName}`);
      console.log(`   - 部署类型: ${res.data.data.deployType}`);
      console.log(`   - 最大用户数: ${res.data.data.maxUsers}`);
    } else {
      console.log('   ❌ 激活失败:', res.data.message);
    }
  } catch (error) {
    console.log('   ❌ 激活失败:', error.response?.data?.message || error.message);
  }

  // 步骤6：测试check-private接口
  console.log('\n📋 步骤6：测试私有部署激活状态检查');
  try {
    const res = await axios.get(`${API_BASE}/tenant-license/check-private`);

    if (res.data.success && res.data.data.activated) {
      console.log('   ✅ 已激活');
      console.log(`   - 租户名称: ${res.data.data.tenantName}`);
      console.log(`   - 租户编码: ${res.data.data.tenantCode}`);
      console.log(`   - 部署类型: ${res.data.data.deployType}`);
    } else {
      console.log('   ⚠️  未激活或无激活租户');
    }
  } catch (error) {
    console.log('   ❌ 检查失败:', error.response?.data?.message || error.message);
  }

  console.log('\n========================================');
  console.log('🎉 所有测试完成');
  console.log('========================================\n');
}

runTests().catch(console.error);
