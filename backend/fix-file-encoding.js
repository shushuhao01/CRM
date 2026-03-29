// 修复文件编码问题
const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/routes/admin/tenants.ts'
];

console.log('开始修复文件编码...\n');

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);

  try {
    // 读取文件内容（使用 latin1 编码读取，保留原始字节）
    const content = fs.readFileSync(filePath, 'latin1');

    // 重新以 UTF-8 编码写入
    fs.writeFileSync(filePath, content, 'utf8');

    console.log(`✅ 已修复: ${file}`);
  } catch (error) {
    console.error(`❌ 修复失败 ${file}:`, error.message);
  }
}

console.log('\n修复完成！');
