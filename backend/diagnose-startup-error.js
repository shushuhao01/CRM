// 诊断后端启动错误
const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 开始诊断后端启动问题...\n');

const tsNode = spawn('npx', ['ts-node', '--transpile-only', 'src/app.ts'], {
  cwd: __dirname,
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

tsNode.stdout.on('data', (data) => {
  const output = data.toString();
  stdout += output;
  console.log('[STDOUT]', output);
});

tsNode.stderr.on('data', (data) => {
  const output = data.toString();
  stderr += output;
  console.error('[STDERR]', output);
});

tsNode.on('error', (error) => {
  console.error('❌ 进程启动错误:', error);
});

tsNode.on('close', (code) => {
  console.log(`\n📊 进程退出，退出码: ${code}`);

  if (code !== 0) {
    console.log('\n❌ 启动失败详情:');
    console.log('='.repeat(60));
    if (stderr) {
      console.log('错误输出:');
      console.log(stderr);
    }
    if (stdout) {
      console.log('\n标准输出:');
      console.log(stdout);
    }
  }

  process.exit(code);
});

// 10秒后如果还没退出，强制结束
setTimeout(() => {
  console.log('\n⏱️  10秒超时，强制结束诊断');
  tsNode.kill();
  process.exit(1);
}, 10000);
