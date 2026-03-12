/**
 * 后端服务启动诊断脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 后端服务启动诊断\n');

// 1. 检查环境变量文件
console.log('1️⃣ 检查环境变量文件');
const envFiles = ['.env', '.env.development', '.env.local'];
envFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} 存在`);
  } else {
    console.log(`   ❌ ${file} 不存在`);
  }
});

// 2. 检查关键文件
console.log('\n2️⃣ 检查关键文件');
const keyFiles = [
  'src/app.ts',
  'src/config/database.ts',
  'src/config/logger.ts',
  'src/routes/admin/index.ts',
  'src/routes/admin/licenses.ts',
  'src/controllers/admin/LicenseController.ts',
  'src/services/LicenseService.ts'
];

keyFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} 存在`);
  } else {
    console.log(`   ❌ ${file} 不存在`);
  }
});

// 3. 检查node_modules
console.log('\n3️⃣ 检查依赖包');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('   ✅ node_modules 存在');

  // 检查关键依赖
  const keyDeps = ['express', 'typeorm', 'mysql2', 'ts-node', 'typescript'];
  keyDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      console.log(`   ✅ ${dep} 已安装`);
    } else {
      console.log(`   ❌ ${dep} 未安装`);
    }
  });
} else {
  console.log('   ❌ node_modules 不存在，需要运行 npm install');
}

// 4. 检查TypeScript配置
console.log('\n4️⃣ 检查TypeScript配置');
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  console.log('   ✅ tsconfig.json 存在');
} else {
  console.log('   ❌ tsconfig.json 不存在');
}

// 5. 检查package.json
console.log('\n5️⃣ 检查package.json');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  console.log('   ✅ package.json 存在');
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (pkg.scripts && pkg.scripts.dev) {
      console.log(`   ✅ dev脚本: ${pkg.scripts.dev}`);
    } else {
      console.log('   ❌ dev脚本未定义');
    }
  } catch (e) {
    console.log('   ❌ package.json 解析失败');
  }
} else {
  console.log('   ❌ package.json 不存在');
}

console.log('\n✅ 诊断完成！');
console.log('\n建议：');
console.log('1. 如果缺少依赖，运行: npm install');
console.log('2. 如果缺少.env文件，复制.env.example并配置');
console.log('3. 检查数据库连接配置');
console.log('4. 尝试运行: npm run dev');
