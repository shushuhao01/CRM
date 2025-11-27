// 直接测试bcrypt验证
const bcrypt = require('bcrypt');

const password = 'admin123';
const hash = '$2b$10$hAE0SUC2DZCRmtrmbaVIQON0pnRmiMfFN1lPnsZ2gw/dwv8/mze3e';

console.log('=== 直接测试bcrypt验证 ===\n');
console.log('密码:', password);
console.log('哈希:', hash);
console.log('');

bcrypt.compare(password, hash).then(result => {
  console.log('验证结果:', result ? '✅ 正确' : '❌ 错误');

  // 生成新的哈希看看
  return bcrypt.hash(password, 10);
}).then(newHash => {
  console.log('');
  console.log('新生成的哈希:', newHash);
  console.log('');

  // 验证新哈希
  return bcrypt.compare(password, newHash);
}).then(result => {
  console.log('新哈希验证结果:', result ? '✅ 正确' : '❌ 错误');
}).catch(err => {
  console.error('错误:', err);
});
