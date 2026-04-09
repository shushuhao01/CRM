// 文件复制脚本 - 将测试文件统一复制到 tests 目录
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const testsDir = path.join(root, 'tests');

const filesToCopy = [
  // 阶段1文件
  { src: 'test-phase1-report.md', from: root },
  { src: 'test-phase1-result.json', from: root },
  { src: 'test-phase1-output.txt', from: root },
  // 阶段2-3文件
  { src: 'test-phase2-3-report.md', from: root },
  { src: 'test-phase2-3-result.json', from: root },
  { src: 'test-phase2-3-output.txt', from: root },
  // 其他输出文件
  { src: 'test-create-admins-output.txt', from: root },
  { src: 'test-init-output.txt', from: root },
  { src: 'test-result.txt', from: root },
  // 测试计划文档
  { src: 'CRM系统全流程测试计划-v1.0.md', from: root },
  { src: 'CRM测试数据详细规划.md', from: root },
  // 后端测试脚本
  { src: 'test-phase1.js', from: path.join(root, 'backend') },
  { src: 'test-phase2-3.js', from: path.join(root, 'backend') },
  { src: 'test-create-admins.js', from: path.join(root, 'backend') },
  { src: 'test-init-admin.js', from: path.join(root, 'backend') },
];

let copied = 0, skipped = 0;
filesToCopy.forEach(({ src, from }) => {
  const srcPath = path.join(from, src);
  const destPath = path.join(testsDir, src);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log('[OK] ' + src);
    copied++;
  } else {
    console.log('[--] ' + src + ' (not found)');
    skipped++;
  }
});
console.log('\nDone: copied=' + copied + ', skipped=' + skipped);

