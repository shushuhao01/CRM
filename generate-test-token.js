import jwt from 'jsonwebtoken';

// 使用与后端相同的配置
const ACCESS_TOKEN_SECRET = 'your-secret-key';

// 创建测试用户payload
const payload = {
  userId: 1,
  username: 'admin',
  role: 'admin',
  departmentId: 1
};

// 生成token
const token = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
  expiresIn: '30d',
  issuer: 'crm-system',
  audience: 'crm-users'
});

console.log('Generated test token:');
console.log(token);

// 验证token
try {
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    issuer: 'crm-system',
    audience: 'crm-users'
  });
  console.log('\nToken verification successful:');
  console.log(decoded);
} catch (error) {
  console.error('Token verification failed:', error.message);
}