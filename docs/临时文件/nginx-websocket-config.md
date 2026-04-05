# Nginx WebSocket 配置

## 问题
APP 端 WebSocket 连接失败，错误：`[WebSocket] 连接错误:, {}`

## 解决方案

在 Nginx 配置中添加 WebSocket 代理支持。

### 1. 找到你的 Nginx 配置文件

通常在 `/www/server/panel/vhost/nginx/abc789.cn.conf` 或类似位置。

### 2. 添加 WebSocket 代理配置

在 `server` 块中添加以下配置：

```nginx
server {
    listen 443 ssl http2;
    server_name abc789.cn;
    
    # SSL 配置（保持原有配置）
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 前端静态文件
    location / {
        root /www/wwwroot/abc789.cn/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # ⭐ WebSocket 代理 - 关键配置
    location /ws/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # WebSocket 必需的头部
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置（WebSocket 需要长连接）
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 3600s;  # 1小时，保持长连接
    }
    
    # Socket.IO 代理（PC端使用）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 3600s;
    }
}
```

### 3. 测试并重载 Nginx

```bash
# 测试配置
nginx -t

# 重载配置
nginx -s reload
```

### 4. 验证 WebSocket 连接

在浏览器控制台中测试：

```javascript
const ws = new WebSocket('wss://abc789.cn/ws/mobile?token=test');
ws.onopen = () => console.log('连接成功');
ws.onerror = (e) => console.log('连接失败', e);
ws.onclose = (e) => console.log('连接关闭', e.code, e.reason);
```

### 5. 检查后端日志

```bash
# 查看后端日志
pm2 logs

# 或者
tail -f /www/wwwroot/abc789.cn/backend/logs/app.log
```

## 常见问题

### 1. 502 Bad Gateway
- 检查后端服务是否运行：`pm2 status`
- 检查端口是否正确：`netstat -tlnp | grep 3000`

### 2. 连接立即关闭
- 检查 Nginx 是否配置了 `proxy_read_timeout`
- 检查防火墙是否允许 WebSocket 连接

### 3. SSL 证书问题
- 确保证书有效且未过期
- APP 端需要信任服务器证书
