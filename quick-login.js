// 快速登录脚本 - 在浏览器控制台中运行
// 这将自动设置认证token并刷新页面

console.log('🔄 开始快速登录...');

// 清除旧的认证信息
localStorage.removeItem('auth_token');
localStorage.removeItem('refresh_token');
localStorage.removeItem('user');

// 调用登录API获取新的token
fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
    })
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        // 设置认证token
        localStorage.setItem('auth_token', data.tokens.accessToken);
        localStorage.setItem('refresh_token', data.tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        console.log('✅ 登录成功!');
        console.log('✅ Token已设置');
        console.log('✅ 用户信息已保存');
        console.log('🔄 正在刷新页面...');
        
        // 刷新页面
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } else {
        console.error('❌ 登录失败:', data.message);
    }
})
.catch(error => {
    console.error('❌ 登录请求失败:', error);
    console.log('💡 请确保后端服务器正在运行');
});