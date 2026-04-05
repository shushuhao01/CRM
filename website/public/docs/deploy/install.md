## 安装步骤

### 1. 准备工作

- 准备符合要求的服务器（参考"环境要求"）
- 安装必要的软件环境（Node.js、MySQL、Nginx、PM2）
- 获取安装包和私有部署授权码

### 2. 安装数据库

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入数据库结构
mysql -u root -p crm < database/schema.sql
```

### 3. 配置应用

1. 解压安装包到服务器目录
2. 进入后端目录，复制环境配置文件：
   ```bash
   cd backend
   cp .env.example .env
   ```
3. 编辑 `.env` 文件，配置数据库连接、端口等参数

### 4. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 构建前端（如需要）
cd ..
npm install
npm run build
```

### 5. 启动服务

使用 PM2 进程管理器启动后端服务：

```bash
cd backend
pm2 start ecosystem.config.js
```

查看服务运行状态：
```bash
pm2 status
pm2 logs
```

### 6. 配置 Nginx

配置反向代理，将域名指向应用端口：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 7. 配置 SSL（推荐）

建议配置 HTTPS 以确保数据传输安全，可使用 Let's Encrypt 免费证书。
