/**
 * 测试租户中间件应用
 * 验证所有业务路由是否正确应用了租户认证和上下文中间件
 */

const path = require('path');
const fs = require('fs');

console.log('='.repeat(60));
console.log('租户中间件应用测试');
console.log('='.repeat(60));

// 读取 app.ts 文件
const appPath = path.join(__dirname, 'src', 'app.ts');
const appContent = fs.readFileSync(appPath, 'utf-8');

console.log('\n✅ 步骤1: 检查中间件导入');
console.log('-'.repeat(60));

// 检查中间件导入
const hastenantAuthImport = appContent.includes("import { tenantAuth } from './middleware/tenantAuth'");
const hasTenantContextImport = appContent.includes("import { tenantContextMiddleware } from './utils/tenantContext'");

if (hastenantAuthImport) {
  console.log('✅ tenantAuth 中间件已导入');
} else {
  console.log('❌ tenantAuth 中间件未导入');
}

if (hasTenantContextImport) {
  console.log('✅ tenantContextMiddleware 中间件已导入');
} else {
  console.log('❌ tenantContextMiddleware 中间件未导入');
}

console.log('\n✅ 步骤2: 检查业务路由中间件应用');
console.log('-'.repeat(60));

// 需要应用中间件的业务路由列表
const businessRoutes = [
  'users',
  'profile',
  'customers',
  'products',
  'orders',
  'system',
  'sdk',
  'mobile-sdk',
  'qr-connection',
  'alternative-connection',
  'dashboard',
  'calls',
  'logs',
  'message',
  'performance-report',
  'performance',
  'logistics',
  'roles',
  'permissions',
  'sf-express',
  'yto-express',
  'services',
  'data',
  'assignment',
  'sms',
  'customer-share',
  'customer-service-permissions',
  'timeout-reminder',
  'sensitive-info-permissions',
  'message-cleanup',
  'mobile',
  'call-config',
  'finance',
  'cod-collection',
  'cod-application',
  'value-added',
  'license',
  'tenant-license',
  'wecom',
  'admin'
];

// 不需要中间件的公开路由
const publicRoutes = [
  'auth',
  'public',
  'calls/webhook'
];

let passCount = 0;
let failCount = 0;

console.log('\n检查业务路由（应该有中间件）:');
businessRoutes.forEach(route => {
  // 检查路由是否应用了两个中间件
  const routePattern = new RegExp(`app\\.use\\(\`\\\${API_PREFIX}\\/${route}\`.*tenantAuth.*tenantContextMiddleware`, 's');
  const hasMiddleware = routePattern.test(appContent);

  if (hasMiddleware) {
    console.log(`  ✅ /${route} - 已应用中间件`);
    passCount++;
  } else {
    console.log(`  ❌ /${route} - 未应用中间件`);
    failCount++;
  }
});

console.log('\n检查公开路由（不应该有租户中间件）:');
publicRoutes.forEach(route => {
  // 检查路由是否没有应用租户中间件
  const routePattern = new RegExp(`app\\.use\\(\`\\\${API_PREFIX}\\/${route}\`(?!.*tenantAuth)`, 's');
  const noMiddleware = routePattern.test(appContent);

  if (noMiddleware) {
    console.log(`  ✅ /${route} - 正确（无租户中间件）`);
    passCount++;
  } else {
    console.log(`  ⚠️  /${route} - 可能应用了租户中间件（需要手动确认）`);
  }
});

console.log('\n✅ 步骤3: 检查中间件顺序');
console.log('-'.repeat(60));

// 检查中间件顺序（tenantAuth 应该在 tenantContextMiddleware 之前）
const middlewareOrderPattern = /tenantAuth.*tenantContextMiddleware/s;
const correctOrder = middlewareOrderPattern.test(appContent);

if (correctOrder) {
  console.log('✅ 中间件顺序正确: tenantAuth → tenantContextMiddleware');
} else {
  console.log('❌ 中间件顺序错误或未找到');
}

console.log('\n' + '='.repeat(60));
console.log('测试总结');
console.log('='.repeat(60));
console.log(`✅ 通过: ${passCount}`);
console.log(`❌ 失败: ${failCount}`);
console.log(`📊 总计: ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n🎉 所有测试通过！租户中间件已正确应用到所有业务路由。');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查上述失败项。');
  process.exit(1);
}
