// 自动登录脚本 - 在浏览器控制台中执行
// 使用admin账号自动登录

function autoLogin() {
    console.log('开始自动登录...');
    
    // 等待页面加载完成
    setTimeout(() => {
        // 查找用户名输入框
        const usernameInput = document.querySelector('input[type="text"]') || 
                             document.querySelector('input[placeholder*="用户名"]') ||
                             document.querySelector('input[placeholder*="账号"]') ||
                             document.querySelector('#username') ||
                             document.querySelector('[name="username"]');
        
        // 查找密码输入框
        const passwordInput = document.querySelector('input[type="password"]') ||
                             document.querySelector('#password') ||
                             document.querySelector('[name="password"]');
        
        // 查找登录按钮
        const loginButton = document.querySelector('button[type="submit"]') ||
                           document.querySelector('button:contains("登录")') ||
                           document.querySelector('.login-btn') ||
                           document.querySelector('button');
        
        if (usernameInput && passwordInput) {
            console.log('找到登录表单，开始填充...');
            
            // 填充用户名
            usernameInput.value = 'admin';
            usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
            usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // 填充密码
            passwordInput.value = 'admin123';
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log('表单填充完成，准备提交...');
            
            // 提交表单
            setTimeout(() => {
                if (loginButton) {
                    console.log('点击登录按钮...');
                    loginButton.click();
                } else {
                    // 尝试提交表单
                    const form = document.querySelector('form');
                    if (form) {
                        console.log('提交表单...');
                        form.submit();
                    } else {
                        console.log('未找到登录按钮或表单');
                    }
                }
            }, 500);
            
        } else {
            console.log('未找到登录表单元素');
            console.log('用户名输入框:', usernameInput);
            console.log('密码输入框:', passwordInput);
        }
    }, 1000);
}

// 执行自动登录
autoLogin();

// 登录成功后，等待3秒然后跳转到业绩分析页面
setTimeout(() => {
    console.log('尝试跳转到业绩分析页面...');
    window.location.hash = '#/performance/analysis';
}, 5000);