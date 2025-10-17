# 宝塔面板配置指南

## 📊 数据库配置

### 第一步：在宝塔面板创建数据库

1. **登录宝塔面板**
   - 访问：http://your-server-ip:8888
   - 使用您的宝塔账号密码登录

2. **创建数据库**
   - 点击左侧菜单 "数据库"
   - 点击 "添加数据库"
   - 填写以下信息：
     ```
     数据库名：crm_system
     用户名：crm_user
     密码：设置一个强密码（建议16位以上）
     访问权限：本地服务器
     字符集：utf8mb4
     ```
   - 点击 "提交" 创建

3. **记录数据库信息**
   ```
   数据库地址：localhost
   端口：3306
   数据库名：crm_system
   用户名：crm_user
   密码：[您设置的密码]
   ```

### 第二步：配置站点

1. **添加站点**
   - 点击左侧菜单 "网站"
   - 点击 "添加站点"
   - 填写信息：
     ```
     域名：abc789.cn
     根目录：/www/wwwroot/abc789.cn
     FTP：不创建
     数据库：不创建（已单独创建）
     PHP版本：纯静态
     ```

2. **配置SSL证书**
   - 在站点列表中找到 abc789.cn
   - 点击 "设置"
   - 选择 "SSL" 标签
   - 如果已有证书，选择对应证书
   - 开启 "强制HTTPS"

3. **配置反向代理**
   - 在站点设置中选择 "反向代理"
   - 点击 "添加反向代理"
   - 配置：
     ```
     代理名称：CRM-API
     目标URL：http://127.0.0.1:3000
     发送域名：$host
     代理目录：/api
     ```

## 🔧 Node.js 环境配置

### 安装 Node.js 管理器

1. **在宝塔面板安装 Node.js**
   - 点击左侧菜单 "软件商店"
   - 搜索 "Node.js版本管理器"
   - 点击安装

2. **安装 Node.js 18**
   - 安装完成后，点击 "设置"
   - 选择安装 Node.js 18.x 版本
   - 设置为默认版本

3. **安装 PM2**
   - 在 Node.js 管理器中
   - 点击 "模块管理"
   - 安装 PM2 模块

## 🌐 Nginx 配置

### 方法一：使用宝塔面板配置

1. **编辑站点配置**
   - 在网站列表中点击站点名称
   - 选择 "配置文件"
   - 替换为以下配置：

```nginx
server {
    listen 80;
    server_name abc789.cn www.abc789.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name abc789.cn www.abc789.cn;
    
    # SSL配置
    ssl_certificate /www/server/panel/vhost/cert/abc789.cn/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/abc789.cn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 网站根目录
    root /www/wwwroot/abc789.cn;
    index index.html index.htm;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # API反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # 文件上传代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 前端路由处理
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # 禁止访问敏感文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(sql|log|env)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # 日志配置
    access_log /www/wwwlogs/abc789.cn.log;
    error_log /www/wwwlogs/abc789.cn.error.log;
}
```

2. **重载Nginx配置**
   - 点击 "保存"
   - 在宝塔面板首页点击 "重载配置"

## 🔒 安全配置

### 防火墙设置

1. **在宝塔面板配置防火墙**
   - 点击左侧菜单 "安全"
   - 添加以下端口规则：
     ```
     端口：3000  协议：TCP  策略：放行  备注：CRM后端API
     端口：80    协议：TCP  策略：放行  备注：HTTP
     端口：443   协议：TCP  策略：放行  备注：HTTPS
     端口：22    协议：TCP  策略：放行  备注：SSH
     端口：8888  协议：TCP  策略：放行  备注：宝塔面板
     ```

### SSH安全

1. **修改SSH端口**（可选）
   - 在 "安全" 页面
   - 点击 "SSH安全"
   - 修改默认端口22为其他端口

2. **禁用root登录**（可选）
   - 创建普通用户
   - 禁用root直接登录

## 📋 配置检查清单

- [ ] 数据库创建完成
- [ ] 站点添加完成
- [ ] SSL证书配置
- [ ] Node.js环境安装
- [ ] PM2安装完成
- [ ] Nginx配置更新
- [ ] 防火墙规则设置
- [ ] 反向代理配置

完成以上配置后，就可以开始部署CRM系统了！