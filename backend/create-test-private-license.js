/**
 * 创建测试用的私有授权码
 */
const { v4: uuidv4 } = require('uuid');
const path = require('path');

async function createTestLicense() {
  console.log('========================================');
  console.log('🔧 创建测试私有授权码');
  console.log('========================================\n');

  try {
    // 动态导入数据库配置
    const dbPath = path.join(__dirname, 'dist/config/database.js');
    const { AppDataSource } = require(dbPath);

    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ 数据库连接成功\n');
    }

    // 步骤1：创建私有客户
    console.log('📋 步骤1：创建测试私有客户');
    const customerId = uuidv4();
    const customerName = '测试私有客户-' + Date.now();

    await AppDataSource.query(
      `INSERT INTO private_customers (id, customer_name, contact_person, contact_phone, contact_email, industry, company_size, address, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [customerId, customerName, '测试联系人', '13800138000', 'test@example.com', '科技', '50-200人', '测试地址', '自动化测试创建']
    );
    console.log(`   ✅ 客户创建成功`);
    console.log(`   - 客户ID: ${customerId}`);
    console.log(`   - 客户名称: ${customerName}\n`);

    // 步骤2：生成私有授权码
    console.log('📋 步骤2：生成私有授权码');
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
    const licenseKey = `PRIVATE-${segments.join('-')}`;

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    await AppDataSource.query(
      `INSERT INTO licenses (id, license_key, customer_name, customer_type, private_customer_id, license_type, max_users, max_storage_gb, features, expires_at, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, 'private', ?, 'enterprise', 100, 100, '["all"]', ?, 'pending', '测试授权', NOW(), NOW())`,
      [licenseId, licenseKey, customerName, customerId, expiresAtStr]
    );

    console.log(`   ✅ 授权码生成成功`);
    console.log(`   - 授权码: ${licenseKey}`);
    console.log(`   - 授权ID: ${licenseId}`);
    console.log(`   - 最大用户数: 100`);
    console.log(`   - 到期时间: ${expiresAtStr}\n`);

    // 步骤3：测试公开API查询
    console.log('📋 步骤3：测试公开API查询');
    const axios = require('axios');
    const res = await axios.post(`http://localhost:3000/api/v1/public/license-query/verify`, {
      licenseKey: licenseKey,
      machineId: 'TEST-MACHINE-001'
    });

    if (res.data.success && res.data.valid) {
      console.log('   ✅ 查询成功');
      console.log(`   - 授权有效: ${res.data.valid}`);
      console.log(`   - 客户名称: ${res.data.licenseInfo.customerName}`);
      console.log(`   - 授权类型: ${res.data.licenseInfo.licenseType}`);
      console.log(`   - 最大用户数: ${res.data.licenseInfo.maxUsers}`);
      console.log(`   - 到期时间: ${res.data.licenseInfo.expiresAt}`);
    } else {
      console.log('   ❌ 授权无效:', res.data.message);
    }

    console.log('\n========================================');
    console.log('✅ 测试完成');
    console.log('========================================\n');

    console.log('🎯 可以使用以下授权码进行测试：');
    console.log(`   授权码: ${licenseKey}`);
    console.log('');
    console.log('📝 测试场景：');
    console.log('   1. 在租户系统登录页使用该授权码 → 应该提示"私有部署专用"');
    console.log('   2. 使用公开API查询该授权码 → 应该返回有效');
    console.log('   3. 在私有部署系统使用该授权码 → 应该能正常激活\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ 创建失败:', error.message);
    console.error(error);
  }
}

createTestLicense().catch(console.error);
