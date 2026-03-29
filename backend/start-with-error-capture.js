// 启动后端并捕获完整错误信息
const { spawn } = require('child_process');

console.log('🚀 启动后端服务（捕获错误模式）...\n');

const proc = spawn('npx', ['ts-node', '--transpile-only', 'src/app.ts'], {
  cwd: __dirname,
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' }
});

let hasOutput = false;

proc.stdout.on('data', (data) => {
  hasOutput = true;
  console.log('[输出]', data.toString());
});

proc.stderr.on('data', (data) => {
  hasOutput = true;
  console.error('[错误]', data.toString());
});

proc.on('error', (error) => {
  console.error('❌ 进程错误:', error);
});

proc.on('close', (code) => {
  console.log(`\n进程退出，退出码: ${code}`);
  if (code !== 0 && !hasOutput) {
    console.log('⚠️  没有捕获到任何输出，可能是静默崩溃');
  }
});

// 15秒后检查状态
setTimeout(() => {
  if (!hasOutput) {
    console.log('\n⚠️  15秒内没有任何输出，可能启动成功或静默失败');
    console.log('请检查端口 3000 是否有服务在运行');
  }
  proc.kill();
}, 15000);
