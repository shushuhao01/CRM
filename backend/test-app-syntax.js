// 测试 app.ts 语法
const { execSync } = require('child_process');

console.log('测试 app.ts 语法检查...\n');

try {
  // 只编译不执行
  const output = execSync('npx tsc --noEmit --skipLibCheck src/app.ts', {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  console.log('✅ TypeScript 编译检查通过');
  if (output) {
    console.log('输出:', output);
  }
} catch (error) {
  console.error('❌ TypeScript 编译检查失败');
  console.error('错误:', error.stdout || error.stderr || error.message);
  process.exit(1);
}
