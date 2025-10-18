# ⚡ Node.js 16快速部署指南

## 🎯 针对您的环境优化

**您的宝塔面板环境**：
- Node.js: 16.20.2 ✅
- NPM: 8.19.4 ✅  
- V8: 9.4.146.26 ✅

**项目兼容性**：已调整为完全支持Node.js 16版本

## 🚀 5步快速部署

### 第1步：上传项目文件 (2分钟)
```bash
# 将整个CRM目录上传到宝塔面板
# 目标路径: /www/wwwroot/crm
```

### 第2步：初始化数据库 (3分钟)
1. 登录宝塔面板 → 数据库 → phpMyAdmin
2. 选择数据库：`abc789_cn`
3. 点击"SQL"标签
4. 复制粘贴 `backend/database-schema.sql` 文件内容
5. 点击"执行"

### 第3步：配置Node.js项目 (2分钟)
1. 宝塔面板 → Node.js项目管理器
2. 添加项目：
   ```
   项目路径: /www/wwwroot/crm/backend
   启动文件: dist/app.js
   端口: 3000
   项目名称: crm-backend
   ```

### 第4步：安装依赖并启动 (3分钟)
在宝塔面板终端中执行：
```bash
cd /www/wwwroot/crm/backend

# Node.js 16兼容安装
npm install --production --legacy-peer-deps

# 启动服务
pm2 start dist/app.js --name crm-backend
pm2 save
```

### 第5步：配置网站和代理 (5分钟)
1. **添加站点**：
   - 域名：您的域名
   - 根目录：`/www/wwwroot/crm/dist`
   - PHP版本：纯静态

2. **配置反向代理**：
   在站点设置 → 反向代理中添加：
   ```
   代理名称: api
   目标URL: http://127.0.0.1:3000
   发送域名: $host
   代理目录: /api/
   ```

## ✅ 验证部署成功

### 检查服务状态
```bash
# 检查PM2状态
pm2 status

# 检查端口监听
netstat -tlnp | grep 3000

# 查看服务日志
pm2 logs crm-backend
```

### 测试网站功能
1. 访问您的域名
2. 应该看到CRM登录页面
3. 使用账户登录：
   - 用户名：`admin`
   - 密码：`admin123`

## 🔧 Node.js 16特殊优化

### 内存优化
```bash
# 如果遇到内存问题，设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=2048"

# 或在PM2中配置
pm2 start dist/app.js --name crm-backend --node-args="--max-old-space-size=2048"
```

### 性能优化
```bash
# 启用生产模式
export NODE_ENV=production

# 禁用开发工具
export NODE_OPTIONS="--no-deprecation --no-warnings"
```

## 🛠️ 常见问题快速解决

### 问题1：依赖安装失败
```bash
# 解决方案：使用兼容模式
npm install --production --legacy-peer-deps --no-audit

# 如果还是失败，尝试
npm cache clean --force
npm install --production --legacy-peer-deps
```

### 问题2：服务启动失败
```bash
# 检查错误日志
pm2 logs crm-backend

# 常见原因：端口被占用
sudo lsof -i :3000
sudo kill -9 [PID]

# 重新启动
pm2 restart crm-backend
```

### 问题3：数据库连接失败
```bash
# 检查数据库配置
cat /www/wwwroot/crm/backend/.env

# 确认数据库信息：
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=abc789_cn
# DB_USERNAME=abc789_cn
# DB_PASSWORD=pM8rpkQ22CS3
```

### 问题4：前端页面404
```bash
# 检查Nginx配置
nginx -t

# 确认网站根目录
ls -la /www/wwwroot/crm/dist/

# 应该看到 index.html 文件
```

## 📋 完整的Nginx配置示例

```nginx
server {
    listen 80;
    server_name 您的域名;
    root /www/wwwroot/crm/dist;
    index index.html;

    # 静态文件
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 上传文件代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🎉 部署完成检查清单

- [ ] 项目文件已上传到 `/www/wwwroot/crm`
- [ ] 数据库脚本执行成功，创建了11个表
- [ ] Node.js项目配置完成，端口3000
- [ ] 依赖安装成功（使用--legacy-peer-deps）
- [ ] PM2服务启动成功
- [ ] 网站配置完成，根目录指向dist
- [ ] 反向代理配置正确
- [ ] 网站可以正常访问
- [ ] 管理员账户可以正常登录

## 💡 Node.js 16性能提示

1. **内存管理**：Node.js 16的垃圾回收机制较新版本稍弱，建议设置合适的内存限制
2. **并发处理**：适当调整PM2实例数量，建议单实例运行
3. **缓存策略**：启用Nginx静态文件缓存，减少Node.js负载
4. **监控工具**：使用PM2 monit监控服务状态

---

**🎯 总部署时间：约15分钟**

**✨ 部署完成后，您的CRM系统将完美运行在Node.js 16环境中！**