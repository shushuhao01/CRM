// 在浏览器控制台中运行此脚本来设置认证token

const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJkZXBhcnRtZW50SWQiOjEsImlhdCI6MTc2MDUwMjE2OCwiZXhwIjoxNzYzMDk0MTY4LCJhdWQiOiJjcm0tdXNlcnMiLCJpc3MiOiJjcm0tc3lzdGVtIn0.FO9mu_KlZXinCp6X-x35Yd86N1p7HrWn_5Ni3W1Tedw';

const USER_INFO = {
  id: 1,
  username: 'admin',
  realName: '系统管理员',
  email: 'admin@example.com',
  role: 'admin',
  departmentId: 1,
  department: {
    id: 1,
    name: '管理部',
    code: 'ADMIN'
  },
  permissions: ['*'],
  status: 'active'
};

// 设置认证token
localStorage.setItem('auth_token', VALID_TOKEN);
localStorage.setItem('user', JSON.stringify(USER_INFO));

// 确保不使用Mock API
localStorage.setItem('use_mock_api', 'false');

console.log('✅ 认证token已设置');
console.log('✅ 用户信息已设置');
console.log('✅ Mock API已禁用');
console.log('请刷新页面以应用更改');

// 自动刷新页面
setTimeout(() => {
  window.location.reload();
}, 1000);