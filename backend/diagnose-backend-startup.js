/**
 * 后端服务启动诊断脚本
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 开始诊断后端服务启动问题...\n');

// 启动后端服务并捕获所有输出
const backend = spawn('npx', ['ts-node', 'src/app.ts'], {
  cwd: path.join(__dirname),
  env: { ...process.env, NODE_ENV: 'development' },
  shell: true
});

let output = '';
let errorOutput = '';

backend.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log(text);
});

backend.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  console.error('❌ 错误输出:', text);
});

backend.on('error', (error) => {
  console.error('❌ 进程错误:', error);
});

backend.on('close', (code) => {
  console.log(`\n进程退出，退出码: ${code}`);

  if (code !== 0) {
    console.log('\n📋 完整错误输出:');
    console.log(errorOutput);

    console.log('\n📋 完整标准输出:');
    console.log(output);

    console.log('\n💡 可能的问题:');
    if (errorOutput.includes('ECONNREFUSED') || errorOutput.includes('connect')) {
      console.log('   - 数据库连接失败，请检查数据库配置');
    }
    if (errorOutput.includes('Cannot find module')) {
      console.log('   - 缺少依赖模块，请运行 npm install');
    }
    if (errorOutput.includes('SyntaxError') || errorOutput.includes('TypeError')) {
      console.log('   - 代码语法错误或类型错误');
    }
    if (errorOutput.includes('port') || errorOutput.includes('EADDRINUSE')) {
      console.log('   - 端口被占用，请检查是否有其他服务在运行');
    }
  }

  process.exit(code);
});

// 10秒后如果还没启动成功，强制退出
setTimeout(() => {
  console.log('\n⏱️ 10秒超时，强制退出');
  backend.kill();
  process.exit(1);
}, 10000);
