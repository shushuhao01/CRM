// 测试增值管理路由是否正确加载
const path = require('path');

console.log('=== 测试增值管理路由加载 ===\n');

try {
  // 1. 检查路由文件是否存在
  const routePath = path.join(__dirname, 'src/routes/valueAdded.ts');
  const fs = require('fs');

  if (fs.existsSync(routePath)) {
    console.log('✅ 路由文件存在:', routePath);
  } else {
    console.log('❌ 路由文件不存在:', routePath);
  }

  // 2. 检查实体文件
  const entities = [
    'ValueAddedOrder.ts',
    'ValueAddedPriceConfig.ts',
    'OutsourceCompany.ts',
    'ValueAddedStatusConfig.ts'
  ];

  console.log('\n检查实体文件:');
  entities.forEach(entity => {
    const entityPath = path.join(__dirname, 'src/entities', entity);
    if (fs.existsSync(entityPath)) {
      console.log(`✅ ${entity}`);
    } else {
      console.log(`❌ ${entity} 不存在`);
    }
  });

  // 3. 检查app.ts中的路由注册
  const appPath = path.join(__dirname, 'src/app.ts');
  const appContent = fs.readFileSync(appPath, 'utf8');

  console.log('\n检查app.ts路由注册:');
  if (appContent.includes("import valueAddedRoutes from './routes/valueAdded'")) {
    console.log('✅ 路由已导入');
  } else {
    console.log('❌ 路由未导入');
  }

  if (appContent.includes("app.use(`${API_PREFIX}/value-added`, valueAddedRoutes)")) {
    console.log('✅ 路由已注册');
  } else {
    console.log('❌ 路由未注册');
  }

  console.log('\n=== 测试完成 ===');
  console.log('\n如果所有检查都通过，请重启后端服务：');
  console.log('npm run dev');

} catch (error) {
  console.error('测试出错:', error.message);
}
