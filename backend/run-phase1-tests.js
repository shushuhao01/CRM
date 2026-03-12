/**
 * 第一阶段验收测试 - 一键运行所有测试
 *
 * 运行方式：
 * cd backend
 * npm run build
 * node run-phase1-tests.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 开始运行第一阶段验收测试...\n');
console.log('=' .repeat(80));
console.log('\n');

const tests = [
  {
    name: '任务1.1：租户实体测试',
    file: 'test-tenant-entity.js',
    description: '测试Tenant实体的创建、查询和方法'
  },
  {
    name: '任务1.2：租户配置实体测试',
    file: 'test-tenant-settings-entity.js',
    description: '测试TenantSettings实体的创建、查询和类型转换'
  },
  {
    name: '任务1.3：租户认证中间件测试',
    file: 'test-tenant-auth-middleware.js',
    description: '测试租户认证、验证和资源限制检查'
  },
  {
    name: '任务1.4：基础仓储类测试',
    file: 'test-base-repository-simple.js',
    description: '测试BaseRepository的租户数据隔离功能'
  }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

for (const test of tests) {
  console.log(`\n📝 运行测试：${test.name}`);
  console.log(`   描述：${test.description}`);
  console.log(`   文件：${test.file}`);
  console.log('-'.repeat(80));

  try {
    const startTime = Date.now();
    execSync(`node ${test.file}`, {
      cwd: __dirname,
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    const duration = Date.now() - startTime;

    console.log(`\n✅ 测试通过！耗时：${duration}ms`);
    passedTests++;
    results.push({
      name: test.name,
      status: '✅ 通过',
      duration: `${duration}ms`
    });
  } catch (error) {
    console.log(`\n❌ 测试失败！`);
    failedTests++;
    results.push({
      name: test.name,
      status: '❌ 失败',
      duration: '-'
    });
  }

  totalTests++;
  console.log('='.repeat(80));
}

// 打印测试总结
console.log('\n\n');
console.log('📊 测试总结');
console.log('='.repeat(80));
console.log('\n');

// 打印测试结果表格
console.log('测试结果：');
console.log('-'.repeat(80));
results.forEach((result, index) => {
  console.log(`${index + 1}. ${result.name}`);
  console.log(`   状态：${result.status}`);
  console.log(`   耗时：${result.duration}`);
  console.log('');
});

console.log('-'.repeat(80));
console.log(`\n总测试数：${totalTests}`);
console.log(`通过：${passedTests} ✅`);
console.log(`失败：${failedTests} ❌`);
console.log(`通过率：${((passedTests / totalTests) * 100).toFixed(2)}%`);
console.log('\n');

// 打印验收结论
if (failedTests === 0) {
  console.log('🎉 恭喜！所有测试通过！');
  console.log('✅ 第一阶段验收通过，可以进入第二阶段开发！');
  console.log('\n');
  console.log('下一步：任务2.1 - 修改用户实体添加 tenant_id');
  console.log('预计时间：1小时');
  console.log('\n');
  process.exit(0);
} else {
  console.log('⚠️ 部分测试失败，请检查并修复问题后重新运行测试。');
  console.log('\n');
  console.log('失败的测试：');
  results.filter(r => r.status.includes('失败')).forEach(r => {
    console.log(`  - ${r.name}`);
  });
  console.log('\n');
  process.exit(1);
}
