# CRM 多站点部署指南（宝塔面板）

> 版本: v1.0 | 更新日期: 2026-04-25
> 适用: 宝塔面板 + Nginx + Node.js + PM2

---

## 一、项目架构总览

本项目包含 **4 个前端 + 1 个后端**，共需配置 **4 个域名**：

| 域名 | 用途 | 前端目录 | 说明 |
|------|------|---------|------|
| `crm.yunkes.com` | CRM 主应用 | `/www/wwwroot/CRM/dist` | 主要的 CRM 系统 |
| `yunkes.com` / `www.yunkes.com` | 官方网站 | `/www/wwwroot/CRM/website/dist` | 产品介绍、注册页 |
| `admin.yunkes.com` | 管理后台 | `/www/wwwroot/CRM/admin/dist` | 平台超管后台 |
| `api.yunkes.com` | API 接口 | 无（反向代理） | 直接代理到后端 3000 端口 |

**重要**: 所有前端都是纯静态文件（Vite 构建后的 HTML/JS/CSS），**不需要启动前端服务器**。
只需要 **1 个后端进程**（PM2 管理，端口 3000），Nginx 把各站点的 `/api` 请求代理过去即可。

---

## 二、部署前准备

### 2.1 确保后端已运行
```bash
cd /www/wwwroot/CRM/backend
pm2 status    # 确认 crm-backend 状态为 online
```

### 2.2 确保主站 CRM 已构建
```bash
# 如果已经通过 deploy.sh 部署过，dist 目录应该已存在
ls /www/wwwroot/CRM/dist/index.html
```

---

## 三、构建官网和管理后台

### 方式一：使用一键构建脚本（推荐）

项目根目录有 `build-all.sh` 脚本，一键构建所有前端：
```bash
cd /www/wwwroot/CRM
chmod +x build-all.sh
./build-all.sh
```

### 方式二：手动逐个构建

```bash
cd /www/wwwroot/CRM

# 1. 构建官网
cd website
npm install --registry https://registry.npmjs.org
npm run build
ls dist/index.html    # 验证构建成功

# 2. 构建管理后台
cd ../admin
npm install --registry https://registry.npmjs.org
npm run build
ls dist/index.html    # 验证构建成功

cd ..
```

---

## 四、宝塔面板添加站点

需要在宝塔面板 **网站 → 添加站点** 中创建 4 个站点。

### 4.1 站点 1：CRM 主应用（已完成）
- **域名**: `crm.yunkes.com`
- **根目录**: `/www/wwwroot/CRM/dist`
- **SSL**: 申请证书

### 4.2 站点 2：官方网站
- **域名**: `yunkes.com` 和 `www.yunkes.com`
- **根目录**: `/www/wwwroot/CRM/website/dist`
- **SSL**: 申请证书（两个域名都要）

### 4.3 站点 3：管理后台
- **域名**: `admin.yunkes.com`
- **根目录**: `/www/wwwroot/CRM/admin/dist`
- **SSL**: 申请证书

### 4.4 站点 4：API 接口
- **域名**: `api.yunkes.com`
- **根目录**: `/www/wwwroot/CRM/backend/public`（随意，主要靠反向代理）
- **SSL**: 申请证书

> **注意**: 先创建站点并申请好 SSL 证书，再修改 Nginx 配置！

---

## 五、Nginx 配置

每个站点创建后，在宝塔面板 **站点设置 → 配置文件** 中修改。

**关键原则**：
- 保留宝塔自动生成的 SSL 相关配置
- 只添加 `location` 块来处理 API 代理和前端路由
- 所有 API 请求都代理到 `http://127.0.0.1:3000`

### 5.1 crm.yunkes.com（CRM 主应用）

在宝塔自动生成的配置中，找到 `#PHP-INFO-START` 那段**删掉**，然后在 `#SSL-END` 后面添加：

```nginx
    # 文件上传大小
    client_max_body_size 50m;

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # 上传文件访问
    location /uploads/ {
        alias /www/wwwroot/CRM/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # 前端路由 (Vue Router history 模式)
    location / {
        try_files $uri $uri/ /index.html;
    }
```

### 5.2 yunkes.com / www.yunkes.com（官方网站）

同样删掉 PHP 配置，在 `#SSL-END` 后添加：

```nginx
    client_max_body_size 10m;

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
```

### 5.3 admin.yunkes.com（管理后台）

```nginx
    client_max_body_size 50m;

    # API 反向代理（管理后台 API 前缀 /api/v1/admin）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件
    location /uploads/ {
        alias /www/wwwroot/CRM/backend/uploads/;
        expires 7d;
    }

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
```

### 5.4 api.yunkes.com（API 接口）

```nginx
    client_max_body_size 50m;

    # 所有请求直接代理到后端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 86400;
    }
```

---

## 六、配置 CORS（后端 .env）

修改 `backend/.env` 中的 CORS 配置，添加所有域名：

```env
CORS_ORIGIN=https://crm.yunkes.com,https://yunkes.com,https://www.yunkes.com,https://admin.yunkes.com,https://api.yunkes.com
```

修改后重启后端：
```bash
pm2 restart crm-backend
```

---

## 七、验证部署

```bash
# 检查各站点是否可访问
curl -I https://crm.yunkes.com
curl -I https://yunkes.com
curl -I https://admin.yunkes.com
curl -I https://api.yunkes.com/api/v1/health
```

---

## 八、日常更新流程

```bash
cd /www/wwwroot/CRM

# 1. 保护本地 .env 配置
git stash

# 2. 拉取新代码
git pull origin main

# 3. 恢复 .env
git stash pop

# 4. 一键重新构建所有前端 + 重启后端
chmod +x build-all.sh
./build-all.sh
```

---

## 九、常见问题

### Q: 前端不需要启动服务器？
**不需要**。前端项目（CRM/官网/管理后台）都是纯静态页面，Vite 构建后输出到 `dist` 目录。
Nginx 直接作为 Web 服务器提供这些静态文件，不需要额外启动 Node.js 前端服务。

### Q: 为什么只需要一个后端进程？
三个前端应用共用同一个后端 API（端口 3000）。Nginx 把不同域名的 `/api` 请求都转发到同一个后端。

### Q: 构建报错 `.user.ini` 怎么办？
宝塔会在网站目录创建 `.user.ini` 文件，构建前需要解锁：
```bash
chattr -i /www/wwwroot/CRM/dist/.user.ini 2>/dev/null
rm -f /www/wwwroot/CRM/dist/.user.ini
# 其他 dist 目录同理
```

### Q: 构建报错 EACCES（esbuild / sass-embedded / dart 权限不足）？
`node_modules` 中的原生二进制文件（esbuild、dart-sass）在 Linux 上需要执行权限。
常见于：Windows 上 `npm install` 后同步到 Linux 服务器，或 `git clone` 后权限丢失。

**修复方法**（一次性给所有原生二进制加权限）：
```bash
# 根目录的原生二进制
chmod +x /www/wwwroot/CRM/node_modules/@esbuild/linux-x64/bin/esbuild
chmod +x /www/wwwroot/CRM/node_modules/sass-embedded-linux-x64/dart-sass/src/dart

# 如果子项目（admin/website）有自己的 node_modules，也需要执行：
# chmod +x /www/wwwroot/CRM/admin/node_modules/@esbuild/linux-x64/bin/esbuild
# chmod +x /www/wwwroot/CRM/website/node_modules/@esbuild/linux-x64/bin/esbuild
```

**如果 chmod 后仍然报错**，说明二进制是 Windows 版本，需要在服务器上重装：
```bash
cd /www/wwwroot/CRM
rm -rf node_modules
npm install --legacy-peer-deps --registry https://registry.npmmirror.com
# 重装后再 chmod +x 确保权限正确
chmod +x node_modules/@esbuild/linux-x64/bin/esbuild
chmod +x node_modules/sass-embedded-linux-x64/dart-sass/src/dart
```

### Q: SSL 证书怎么申请？
宝塔面板 → 网站 → 对应站点 → SSL → Let's Encrypt → 申请免费证书。
每个域名都需要单独申请。
