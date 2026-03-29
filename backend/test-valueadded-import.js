// 测试 valueAdded.ts 文件是否能正常编译
const { spawn } = require('child_process');

console.log('测试 valueAdded.ts 编译...\n');

const proc = spawn('npx', ['ts-node', '--transpile-only', '--print', 'src/routes/valueAdded.ts'], {
  cwd: __dirname,
  shell: true
});

let output = '';
let errorOutput = '';

proc.stdout.on('data', (data) => {
  output += data.toString();
});

proc.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.error(data.toString());
});

proc.on('close', (code) => {
  console.log(`\n退出码: ${code}`);
  if (code !== 0) {
    console.log('\n❌ 编译失败');
    if (errorOutput) {
      console.log('错误信息:', errorOutput);
    }
  } else {
    console.log('✅ 编译成功');
  }
  process.exit(code);
});

setTimeout(() => {
  console.log('\n超时，终止测试');
  proc.kill();
  process.exit(1);
}, 5000);
