/**
 * 授权到期提醒功能测试
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testLicenseExpirationReminder() {
  console.log('\n========================================');
  console.log('授权到期提醒功能测试');
  console.log('========================================\n');

  try {
    // 方法1: 直接调用服务(需要在后端添加测试路由)
    console.log('测试方法: 手动触发定时任务\n');

    // 这里需要在后端添加一个测试路由来手动触发任务
    // 或者直接在数据库中创建测试数据

    console.log('步骤1: 创建测试租户数据');
    console.log('--------------------------------------');

    // 创建一个7天后到期的测试租户
    const testTenant = {
      name: '测试公司-7天后到期',
      expireDate: getDateAfterDays(7),
      status: 'active',
      licenseStatus: 'active'
    };

    console.log('测试租户信息:');
    console.log('  名称:', testTenant.name);
    console.log('  到期日期:', testTenant.expireDate);
    console.log('  状态:', testTenant.status);

    console.log('\n步骤2: 执行到期检查');
    console.log('--------------------------------------');
    console.log('提示: 需要在后端添加测试路由或直接调用服务');
    console.log('示例SQL:');
    console.log(`
INSERT INTO tenants (
  id, code, name, contact, phone, email,
  package_id, max_users, max_storage_gb, status, expire_date,
  license_key, license_status, created_at, updated_at
) VALUES (
  UUID(), 'TEST01', '测试公司-7天后到期', '测试联系人', '13800138000', 'test@example.com',
  (SELECT id FROM packages LIMIT 1), 10, 5, 'active', '${testTenant.expireDate}',
  'TEST-1234-5678-9ABC-DEF0', 'active', NOW(), NOW()
);
    `);

    console.log('\n步骤3: 查看通知发送记录');
    console.log('--------------------------------------');
    console.log('查询SQL:');
    console.log(`
SELECT * FROM notification_logs
WHERE template_code = 'license_expire_soon'
ORDER BY created_at DESC
LIMIT 10;
    `);

    console.log('\n步骤4: 验证通知内容');
    console.log('--------------------------------------');
    console.log('检查项:');
    console.log('  ✓ 邮件主题包含"授权即将到期"');
    console.log('  ✓ 邮件内容包含租户名称');
    console.log('  ✓ 邮件内容包含剩余天数');
    console.log('  ✓ 邮件内容包含续费链接');

    console.log('\n========================================');
    console.log('测试说明');
    console.log('========================================\n');

    console.log('自动测试方式:');
    console.log('1. 定时任务会在每天早上9点自动执行');
    console.log('2. 检查7天、3天、1天后到期的授权');
    console.log('3. 自动发送提醒通知\n');

    console.log('手动测试方式:');
    console.log('1. 在数据库中创建测试租户(到期日期设置为7天后)');
    console.log('2. 重启后端服务触发定时任务');
    console.log('3. 或者添加测试API手动触发\n');

    console.log('验证方式:');
    console.log('1. 查看后端日志: pm2 logs backend');
    console.log('2. 查看notification_logs表');
    console.log('3. 检查邮箱/手机是否收到通知\n');

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

function getDateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// 运行测试
testLicenseExpirationReminder();
