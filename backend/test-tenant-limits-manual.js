/**
 * 租户套餐限制功能手动验证指南
 *
 * 本文档提供手动测试步骤，验证以下功能：
 * 1. ✅ 过期时间检查 - tenantAuth中间件已添加
 * 2. ✅ 用户数限制检查 - checkUserLimit中间件已应用到用户创建路由
 * 3. ✅ 存储空间限制检查 - checkStorageLimit中间件已应用到上传路由
 * 4. ✅ 用户创建后自动更新统计 - UserController已添加updateTenantUserCount调用
 * 5. ✅ 文件上传后自动更新统计 - handleImageUpload已添加updateTenantStorage调用
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local'
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

async function checkImplementation() {
  log('\n租户套餐限制功能实现检查', 'info');
  log('='.repeat(60), 'info');

  const checks = [];

  // 检查1: tenantAuth.ts 是否包含过期检查
  log('\n检查1: 过期时间检查', 'info');
  const fs = require('fs');
  const tenantAuthContent = fs.readFileSync('./src/middleware/tenantAuth.ts', 'utf8');

  if (tenantAuthContent.includes('expireDate') && tenantAuthContent.includes('已过期')) {
    checks.push({ name: '过期时间检查', status: 'passed', detail: 'tenantAuth中间件已添加过期检查逻辑' });
    log('✅ tenantAuth中间件已添加过期检查逻辑', 'success');
  } else {
    checks.push({ name: '过期时间检查', status: 'failed', detail: 'tenantAuth中间件缺少过期检查' });
    log('❌ tenantAuth中间件缺少过期检查', 'error');
  }

  // 检查2: users.ts 是否应用了checkUserLimit中间件
  log('\n检查2: 用户数限制中间件', 'info');
  const usersRouteContent = fs.readFileSync('./src/routes/users.ts', 'utf8');

  if (usersRouteContent.includes('checkUserLimit') && usersRouteContent.includes('tenantAuth')) {
    checks.push({ name: '用户数限制中间件', status: 'passed', detail: 'users.ts已应用checkUserLimit和tenantAuth中间件' });
    log('✅ users.ts已应用checkUserLimit和tenantAuth中间件', 'success');
  } else {
    checks.push({ name: '用户数限制中间件', status: 'failed', detail: 'users.ts缺少中间件' });
    log('❌ users.ts缺少中间件', 'error');
  }

  // 检查3: system.ts 是否应用了checkStorageLimit中间件
  log('\n检查3: 存储空间限制中间件', 'info');
  const systemRouteContent = fs.readFileSync('./src/routes/system.ts', 'utf8');

  const uploadRoutes = ['upload-avatar', 'upload-order-image', 'upload-service-image', 'upload-product-image', 'upload-image'];
  let allRoutesHaveMiddleware = true;

  for (const route of uploadRoutes) {
    const routeRegex = new RegExp(`router\\.post\\(['"].*${route}.*checkStorageLimit`, 's');
    if (!routeRegex.test(systemRouteContent)) {
      allRoutesHaveMiddleware = false;
      log(`⚠️  ${route} 路由缺少checkStorageLimit中间件`, 'warning');
    }
  }

  if (allRoutesHaveMiddleware && systemRouteContent.includes('checkStorageLimit')) {
    checks.push({ name: '存储空间限制中间件', status: 'passed', detail: '所有上传路由已应用checkStorageLimit中间件' });
    log('✅ 所有上传路由已应用checkStorageLimit中间件', 'success');
  } else {
    checks.push({ name: '存储空间限制中间件', status: 'warning', detail: '部分上传路由可能缺少中间件' });
    log('⚠️  部分上传路由可能缺少中间件', 'warning');
  }

  // 检查4: UserController 是否调用updateTenantUserCount
  log('\n检查4: 用户统计更新', 'info');
  const userControllerContent = fs.readFileSync('./src/controllers/UserController.ts', 'utf8');

  if (userControllerContent.includes('updateTenantUserCount') && userControllerContent.includes('decrementTenantUserCount')) {
    checks.push({ name: '用户统计更新', status: 'passed', detail: 'UserController已添加用户统计更新逻辑' });
    log('✅ UserController已添加用户统计更新逻辑', 'success');
  } else {
    checks.push({ name: '用户统计更新', status: 'failed', detail: 'UserController缺少统计更新' });
    log('❌ UserController缺少统计更新', 'error');
  }

  // 检查5: system.ts handleImageUpload 是否调用updateTenantStorage
  log('\n检查5: 存储统计更新', 'info');

  if (systemRouteContent.includes('updateTenantStorage')) {
    checks.push({ name: '存储统计更新', status: 'passed', detail: 'handleImageUpload已添加存储统计更新逻辑' });
    log('✅ handleImageUpload已添加存储统计更新逻辑', 'success');
  } else {
    checks.push({ name: '存储统计更新', status: 'failed', detail: 'handleImageUpload缺少统计更新' });
    log('❌ handleImageUpload缺少统计更新', 'error');
  }

  // 打印总结
  log('\n' + '='.repeat(60), 'info');
  log('实现检查总结', 'info');
  log('='.repeat(60), 'info');

  const passed = checks.filter(c => c.status === 'passed').length;
  const failed = checks.filter(c => c.status === 'failed').length;
  const warnings = checks.filter(c => c.status === 'warning').length;

  log(`\n✅ 通过: ${passed}`, 'success');
  checks.filter(c => c.status === 'passed').forEach(c => {
    log(`  - ${c.name}: ${c.detail}`, 'success');
  });

  if (warnings > 0) {
    log(`\n⚠️  警告: ${warnings}`, 'warning');
    checks.filter(c => c.status === 'warning').forEach(c => {
      log(`  - ${c.name}: ${c.detail}`, 'warning');
    });
  }

  if (failed > 0) {
    log(`\n❌ 失败: ${failed}`, 'error');
    checks.filter(c => c.status === 'failed').forEach(c => {
      log(`  - ${c.name}: ${c.detail}`, 'error');
    });
  }

  log('\n' + '='.repeat(60), 'info');

  if (failed === 0 && warnings === 0) {
    log('🎉 所有实现检查通过！', 'success');
  } else if (failed === 0) {
    log('✅ 核心功能已实现，有少量警告', 'success');
  } else {
    log('❌ 部分功能实现不完整', 'error');
  }

  // 数据库检查
  log('\n\n数据库字段检查', 'info');
  log('='.repeat(60), 'info');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 检查tenants表字段
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'crm_local' AND TABLE_NAME = 'tenants'
      AND COLUMN_NAME IN ('expire_date', 'max_users', 'max_storage_gb', 'user_count', 'used_storage_mb')
      ORDER BY COLUMN_NAME
    `);

    log('\ntenants表关键字段:', 'info');
    columns.forEach(col => {
      log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`, 'info');
    });

    if (columns.length === 5) {
      log('\n✅ 数据库字段完整', 'success');
    } else {
      log(`\n❌ 数据库字段不完整，期望5个，实际${columns.length}个`, 'error');
    }

  } finally {
    await connection.end();
  }

  // 手动测试指南
  log('\n\n手动测试指南', 'info');
  log('='.repeat(60), 'info');

  log('\n要完整测试租户限制功能，请按以下步骤操作：', 'info');
  log('\n1. 过期时间检查:', 'warning');
  log('   - 在Admin后台创建一个租户，设置过期时间为昨天', 'info');
  log('   - 使用该租户的用户登录CRM系统', 'info');
  log('   - 尝试访问任何API，应该返回403错误："租户已过期"', 'info');

  log('\n2. 用户数限制检查:', 'warning');
  log('   - 在Admin后台创建一个租户，设置max_users=2', 'info');
  log('   - 创建一个管理员用户（user_count=1）', 'info');
  log('   - 登录后尝试创建第1个用户，应该成功', 'info');
  log('   - 检查数据库：user_count应该变为2', 'info');
  log('   - 尝试创建第2个用户，应该返回403错误："用户数已达上限"', 'info');

  log('\n3. 存储空间限制检查:', 'warning');
  log('   - 在Admin后台创建一个租户，设置max_storage_gb=0.001 (1MB)', 'info');
  log('   - 登录后上传一个小文件（<1MB），应该成功', 'info');
  log('   - 检查数据库：used_storage_mb应该增加', 'info');
  log('   - 尝试上传一个大文件（>1MB），应该返回403错误："存储空间不足"', 'info');

  log('\n' + '='.repeat(60), 'info');
}

checkImplementation().catch(console.error);
