const fs = require('fs');
const path = require('path');

console.log('🔍 快速检查路由注册...\n');

const appFile = path.join(__dirname, 'src/app.ts');
const appContent = fs.readFileSync(appFile, 'utf8');

// 检查导入
console.log('📦 检查路由导入:');
if (appContent.includes("import valueAddedRoutes from './routes/valueAdded'")) {
  console.log('   ✅ valueAddedRoutes 已导入');
} else {
  console.log('   ❌ valueAddedRoutes 未导入');
}

// 检查注册
console.log('\n📝 检查路由注册:');
const registrations = appContent.match(/app\.use\(`\$\{API_PREFIX\}\/value-added`.*\)/g);
if (registrations && registrations.length > 0) {
  console.log(`   ✅ value-added 路由已注册 (${registrations.length}次)`);
  registrations.forEach((reg, index) => {
    console.log(`      ${index + 1}. ${reg}`);
  });

  if (registrations.length > 1) {
    console.log('   ⚠️  警告: 路由被注册了多次！');
  }
} else {
  console.log('   ❌ value-added 路由未注册');
}

// 检查路由文件是否存在
console.log('\n📁 检查路由文件:');
const routeFile = path.join(__dirname, 'src/routes/valueAdded.ts');
if (fs.existsSync(routeFile)) {
  console.log('   ✅ src/routes/valueAdded.ts 存在');
} else {
  console.log('   ❌ src/routes/valueAdded.ts 不存在');
}

console.log('\n✅ 检查完成！');
console.log('\n💡 下一步: 重启后端服务');
console.log('   npm run dev  (或 pm2 restart crm-backend)');
