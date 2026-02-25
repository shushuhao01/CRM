# 客户保存问题诊断指南

## 问题描述
新增客户时，数据没有写入数据库。

## 已完成的修复
1. ✅ 前端 `Add.vue` 已修改为直接使用 `fetch('/api/v1/customers')` 调用API
2. ✅ 前端已重新构建（dist目录更新于 2025/12/6）

## 诊断步骤

### 步骤1：在浏览器控制台运行诊断脚本

登录系统后，打开浏览器开发者工具（F12），在控制台中粘贴并运行以下代码：

```javascript
// 快速诊断脚本
(async function() {
  const token = localStorage.getItem('auth_token');
  console.log('Token:', token ? '已获取' : '未找到');
  
  if (!token) {
    console.error('请先登录');
    return;
  }
  
  // 测试API连接
  try {
    const response = await fetch('/api/v1/customers?page=1&pageSize=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('API状态:', response.status);
    const data = await response.json();
    console.log('API响应:', data);
    
    if (data.success) {
      console.log('✅ API连接正常');
    } else {
      console.error('❌ API返回错误:', data.message);
    }
  } catch (error) {
    console.error('❌ API连接失败:', error.message);
  }
})();
```

### 步骤2：检查服务器后端状态

SSH登录服务器后，检查后端服务：

```bash
# 检查后端进程
pm2 status

# 查看后端日志
pm2 logs crm-backend --lines 50

# 检查端口监听
netstat -tlnp | grep 3001
```

### 步骤3：检查Nginx配置

确保Nginx正确代理API请求：

```bash
# 检查Nginx配置
cat /etc/nginx/sites-enabled/crm.conf

# 测试Nginx配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

### 步骤4：测试后端API直接访问

在服务器上直接测试后端API：

```bash
# 测试健康检查
curl http://localhost:3001/api/v1/health

# 测试客户列表（需要token）
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/customers
```

## 常见问题和解决方案

### 问题1：API返回401未授权
- 检查token是否有效
- 检查后端JWT配置

### 问题2：API返回500服务器错误
- 检查后端日志
- 检查数据库连接

### 问题3：API连接超时
- 检查Nginx代理配置
- 检查后端服务是否运行

### 问题4：数据库写入失败
- 检查数据库文件权限
- 检查磁盘空间

## 重新部署步骤

如果需要重新部署：

```bash
# 1. 本地构建前端
npm run build

# 2. 上传dist目录到服务器
scp -r dist/* user@server:/path/to/web/

# 3. 重启后端服务
pm2 restart crm-backend

# 4. 重启Nginx
systemctl restart nginx
```

## 联系支持

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整错误信息
2. 后端日志（pm2 logs）
3. Nginx错误日志（/var/log/nginx/error.log）
