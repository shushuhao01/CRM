## 🚀 宝塔面板部署教程

宝塔面板部署是**最简单的服务器部署方式**，提供可视化界面管理服务器，无需手动敲命令。适合绝大多数用户。

---

### 📋 服务器最低配置

| 配置项 | 要求 |
|--------|------|
| CPU | 2核及以上 |
| 内存 | 2GB 及以上（推荐 4GB） |
| 硬盘 | 40GB 及以上 SSD |
| 系统 | Ubuntu 22.04 / CentOS 7.9+ |
| 带宽 | 3Mbps 及以上 |

---

### ⚡ 完整部署步骤

#### 第一步：购买云服务器（已有可跳过）

**推荐云服务商：**

| 服务商 | 购买链接 | 特点 |
|--------|---------|------|
| **阿里云** | [**ECS 云服务器 →**](https://www.aliyun.com/minisite/goods) | 国内最大，新用户有折扣 |
| **腾讯云** | [**轻量应用服务器 →**](https://cloud.tencent.com/act/pro/lighthouse) | 性价比高，新用户优惠大 |
| **华为云** | [**弹性云服务器 →**](https://www.huaweicloud.com/product/ecs.html) | 大品牌可选 |

**购买步骤：**

1. 打开上方链接，注册并完成实名认证
2. 选择 **云服务器 ECS** 或 **轻量应用服务器**
3. 地域选择离用户最近的（如华南、华东等）
4. **配置选择**：2核 2G 起步（推荐 2核 4G）
5. **操作系统选择**：**Ubuntu 22.04 LTS**（推荐）或 CentOS 7.9
6. **系统盘**：40GB SSD 起步
7. **带宽**：3Mbps 起步（按量付费更划算）
8. 购买完成后，进入**云控制台**：
   - 找到服务器的 **公网 IP 地址** — 记下来
   - 设置 **root 登录密码**（如果还没设置）

9. **⚠️ 重要：开放安全组端口**

在云控制台找到「安全组」或「防火墙」，添加以下规则：

| 端口 | 用途 | 协议 |
|------|------|------|
| 22 | SSH 远程连接 | TCP |
| 80 | HTTP 网站访问 | TCP |
| 443 | HTTPS 安全访问 | TCP |
| 8888 | 宝塔面板访问 | TCP |
| 3000 | CRM后端服务（可选） | TCP |

#### 第二步：SSH 连接服务器

> 需要一个 SSH 工具来远程连接服务器，就像远程操作服务器的"遥控器"。

| 工具 | 下载地址 | 适用系统 |
|------|---------|---------|
| **FinalShell** | [**点击下载 →**](https://www.hostbuf.com/t/988.html) | Windows（推荐新手） |
| **Xshell** | [**家庭版免费 →**](https://www.xshell.com/zh/free-for-home-school/) | Windows |
| **终端** | 系统自带 | macOS |

**使用 FinalShell 连接（以 Windows 为例）：**

1. 安装并打开 FinalShell
2. 点击左上角「**+**」→ 选择「**SSH连接**」
3. 填写：
   - 名称：`我的CRM服务器`
   - 主机：`你的服务器公网IP`
   - 端口：`22`
   - 用户名：`root`
   - 密码：`你设置的root密码`
4. 点击「确定」→ 双击连接

**macOS 用户：**

```bash
ssh root@你的服务器IP
# 输入服务器密码（输入时不会显示字符，属于正常现象）
```

> ✅ 看到类似 `root@ubuntu:~#` 的提示符，说明连接成功！

#### 第三步：安装宝塔面板

SSH 连接成功后，复制以下命令粘贴到终端，回车执行：

**Ubuntu / Debian 系统：**
```bash
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

**CentOS 系统：**
```bash
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec
```

安装过程约 2-5 分钟，中途提示 `Do you want to install Bt-Panel to the /www directory now?(y/n)` 输入 **y** 回车。

> ⚠️ **超级重要**：安装完成后终端会显示面板地址、用户名和密码，**请立即截图或复制保存！** 格式类似：
> ```
> ================================================
> 面板地址: http://你的IP:8888/xxxxxx
> 用户名: xxxxxxxx
> 密码: xxxxxxxx
> ================================================
> ```
>
> 如果不小心关了，可以用命令重新查看：`bt default`

#### 第四步：登录宝塔面板并安装软件

1. 在浏览器中打开上一步显示的面板地址（如 `http://你的IP:8888/xxxxxx`）
2. 输入用户名和密码登录
3. 首次登录需要**绑定宝塔账号**（免费注册一个即可）
4. 进入面板后，弹出推荐安装套件，点击「**取消**」，我们手动选择
5. 进入左侧菜单「**软件商店**」，搜索并安装以下软件：

| 软件 | 版本 | 安装方式 |
|------|------|---------|
| **Nginx** | 1.22 或 1.24 | 极速安装 |
| **MySQL** | 8.0 | 极速安装 |
| **PM2管理器** | 最新版 | 极速安装 |

6. 安装 PM2 管理器后，进入 PM2 管理器 → 「**Node版本**」→ 选择 **v20.x** → 点击「**安装**」

> ⏱ Nginx + MySQL 安装约 5-15 分钟，Node.js 安装约 3-5 分钟。

> 💡 也可以通过命令行安装 Node.js（在宝塔面板左侧「终端」中执行）：
> ```bash
> # 方式一：通过 nvm 安装（推荐）
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
> source ~/.bashrc
> nvm install 20
> nvm alias default 20
>
> # 方式二：国内镜像安装 nvm
> curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash
> source ~/.bashrc
> nvm install 20
> nvm alias default 20
> ```

#### 第五步：创建数据库

1. 在宝塔面板左侧菜单点击「**数据库**」
2. 点击右上角「**添加数据库**」
3. 填写信息：

| 项目 | 填写内容 |
|------|---------|
| 数据库名 | `crm_db` |
| 用户名 | `crm_user` |
| 密码 | 点击「**随机**」自动生成 |
| 访问权限 | 选择「**本地服务器**」 |

4. 点击「**提交**」

> ⚠️ **请立即复制保存数据库用户名和密码！** 后续配置 `.env` 文件需要使用。

5. **导入数据库结构**：
   - 在数据库列表中找到 `crm_db`
   - 点击右侧「**导入**」
   - 点击「从本地上传」→ 选择项目中的 `database/schema.sql` 文件
   - 点击「导入」

> 💡 如果项目还没上传，可以先跳过导入步骤，在第七步上传代码后再回来导入。

#### 第六步：添加站点

1. 点击左侧「**网站**」→「**添加站点**」
2. 填写信息：

| 项目 | 填写内容 |
|------|---------|
| 域名 | 填写你的域名（如 `crm.yourdomain.com`）；如果没有域名，填服务器 **公网 IP** |
| 根目录 | `/www/wwwroot/CRM/dist` |
| FTP | 不创建 |
| 数据库 | 不创建（已在上一步创建） |
| PHP版本 | 选「**纯静态**」 |

3. 点击「**提交**」

#### 第七步：上传项目代码

**方式一（推荐）：Git 克隆**

在宝塔面板左侧「**终端**」中执行：

```bash
cd /www/wwwroot
git clone https://github.com/shushuhao01/crm-system.git CRM
cd CRM
```

**方式二：手动上传**

在宝塔面板「**文件**」中：
1. 导航到 `/www/wwwroot`
2. 点击「**上传**」→ 选择项目压缩包（.zip 或 .tar.gz）
3. 上传完成后，右键压缩包 →「**解压**」
4. 确保解压后目录为 `/www/wwwroot/CRM`

#### 第八步：配置后端环境变量

在宝塔面板「**文件**」中导航到 `/www/wwwroot/CRM/backend`：

1. 找到 `.env.example`，右键「**复制**」→ 粘贴后重命名为 `.env`
2. 双击 `.env` 文件编辑，填写以下内容：

```bash
# 数据库配置 - 填写第五步创建的数据库信息
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=crm_user
DB_PASSWORD=第五步生成的数据库密码
DB_DATABASE=crm_db
DB_CHARSET=utf8mb4

# JWT 密钥 - 用终端命令 openssl rand -hex 32 生成
JWT_SECRET=用下面的命令生成一个随机字符串粘贴到这里
JWT_EXPIRES_IN=7d

# 服务端口
PORT=3000
```

> 💡 **生成 JWT_SECRET 的方法**：在宝塔终端执行 `openssl rand -hex 32`，复制输出的随机字符串粘贴到 JWT_SECRET 后面。

#### 第九步：安装依赖 + 构建 + 启动（一键脚本）⚡

**方式一：一键部署脚本（推荐）**

在宝塔终端中执行：

```bash
cd /www/wwwroot/CRM
chmod +x deploy.sh
./deploy.sh
```

脚本将自动完成：
- ✅ 环境检查（Node.js版本、内存、磁盘空间）
- ✅ 配置 npm 国内镜像加速
- ✅ 安装前端和后端依赖
- ✅ 构建前端项目
- ✅ 使用 PM2 启动后端服务
- ✅ 配置开机自启动

> ⏱ 预计总耗时 20-30 分钟，请耐心等待。

**方式二：手动逐步执行**

如果一键脚本出问题，按以下步骤手动操作：

```bash
# 进入项目目录
cd /www/wwwroot/CRM

# 1. 配置 npm 国内镜像
npm config set registry https://registry.npmmirror.com

# 2. 安装前端依赖（约5-8分钟）
npm install

# 3. 构建前端（约5-10分钟）
npm run build

# 4. 安装后端依赖（约3-5分钟）
cd backend
npm install

# 5. 构建后端
npm run build

# 6. 安装 PM2（进程管理器，保持服务不掉线）
npm install -g pm2

# 7. 用 PM2 启动后端
pm2 start dist/server.js --name crm-backend

# 8. 保存 PM2 进程列表 + 开机自启
pm2 save
pm2 startup
# ⚠️ pm2 startup 会输出一条命令，复制那条命令再执行一次！
```

> 💡 常用 PM2 命令：
> - `pm2 list` — 查看所有进程
> - `pm2 logs crm-backend` — 查看日志
> - `pm2 restart crm-backend` — 重启服务
> - `pm2 stop crm-backend` — 停止服务

#### 第十步：配置 Nginx（⭐ 关键步骤）

1. 在宝塔面板左侧点击「**网站**」
2. 找到第六步添加的站点，点击右侧「**设置**」
3. 点击左侧「**配置文件**」
4. **全选删除**原有内容，将以下完整配置**复制粘贴**进去
5. 把配置中的 `your-domain.com` 替换为**你的实际域名**（如果用 IP 访问就改为 `_`）
6. 点击「**保存**」

**📋 完整 Nginx 配置文件（直接复制）：**

```nginx
# ============================================
# 云客CRM Nginx 完整配置
# ============================================
# 使用说明：
#   1. 将 your-domain.com 替换为你的实际域名
#   2. 如果使用IP访问，将 server_name 改为 _
#   3. 将此配置粘贴到宝塔网站配置中保存即可
# ============================================

# 上游后端服务（连接池优化）
upstream crm_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;

    # ========== ⚠️ 修改这里：替换为你的域名 ==========
    server_name your-domain.com www.your-domain.com;
    # 如果没有域名，使用IP访问，改为：server_name _;

    # ========== ⚠️ 修改这里：确认项目路径正确 ==========
    root /www/wwwroot/CRM/dist;
    index index.html;

    # 访问日志和错误日志
    access_log /www/wwwlogs/crm.access.log;
    error_log /www/wwwlogs/crm.error.log;

    # ==========================================
    # 前端静态文件（Vue/React 单页应用路由支持）
    # ==========================================
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ==========================================
    # 后端 API 反向代理
    # ==========================================
    location /api/ {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # 超时设置（防止大文件上传或长请求超时）
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;

        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 16k;
    }

    # ==========================================
    # WebSocket 实时通讯支持（消息推送、在线状态等）
    # ==========================================
    location /socket.io/ {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket 长连接超时（24小时）
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # ==========================================
    # 文件上传/下载目录
    # ==========================================
    location /uploads/ {
        alias /www/wwwroot/CRM/uploads/;
        expires 30d;
        add_header Cache-Control "public";

        # 防止执行上传的文件
        location ~* \.(php|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }

    # ==========================================
    # 静态资源缓存（提升加载速度）
    # ==========================================
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webp|avif)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ==========================================
    # Gzip 压缩（减小传输体积，加快加载）
    # ==========================================
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # ==========================================
    # 安全配置
    # ==========================================
    # 禁止访问隐藏文件（.env、.git 等敏感文件）
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # 禁止访问备份文件
    location ~* \.(bak|sql|log|old|orig|swp)$ {
        deny all;
    }

    # 上传文件大小限制（支持上传最大 50MB 文件）
    client_max_body_size 50M;

    # 安全响应头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
}

# ============================================
# HTTPS 配置（在宝塔面板申请SSL证书后自动生效）
# 如需手动配置，取消下方注释并修改域名和证书路径
# ============================================
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name your-domain.com www.your-domain.com;
#
#     # SSL 证书路径（宝塔面板申请后会自动填写）
#     ssl_certificate /www/server/panel/vhost/cert/your-domain.com/fullchain.pem;
#     ssl_certificate_key /www/server/panel/vhost/cert/your-domain.com/privkey.pem;
#
#     # SSL 安全配置
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4;
#     ssl_prefer_server_ciphers on;
#     ssl_session_cache shared:SSL:10m;
#     ssl_session_timeout 10m;
#
#     # 以下配置同 HTTP（复制上方 root 到最后即可）
#     root /www/wwwroot/CRM/dist;
#     index index.html;
#
#     location / { try_files $uri $uri/ /index.html; }
#     location /api/ { proxy_pass http://crm_backend; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; proxy_connect_timeout 60s; proxy_send_timeout 120s; proxy_read_timeout 120s; }
#     location /socket.io/ { proxy_pass http://crm_backend; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $host; proxy_read_timeout 86400s; }
#     location /uploads/ { alias /www/wwwroot/CRM/uploads/; expires 30d; }
#
#     gzip on; gzip_vary on; gzip_min_length 1024; gzip_proxied any; gzip_comp_level 6;
#     gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml application/xml+rss image/svg+xml;
#     client_max_body_size 50M;
# }

# HTTP 自动跳转 HTTPS（启用 SSL 后取消注释）
# server {
#     listen 80;
#     server_name your-domain.com www.your-domain.com;
#     return 301 https://$server_name$request_uri;
# }
```

> ⚠️ 保存后如果宝塔提示 Nginx 配置检测失败，检查是否有语法错误。也可以在终端执行 `nginx -t` 查看具体报错位置。

#### 第十一步：访问系统并激活授权 🎉

1. 浏览器访问您的域名 `http://your-domain.com` 或 `http://服务器IP`
2. 在登录页面点击左下角的 🔑 图标
3. 选择「私有部署」，粘贴 **系统授权码**，点击「激活」
4. **⚠️ 首次激活会显示管理员账号密码，请立即保存！仅展示一次！**
5. 登录后请 **立即修改密码**

#### 第十二步：申请 SSL 证书（推荐）

> 启用 HTTPS 可以加密数据传输，浏览器不再显示"不安全"提示。需要域名已完成 ICP 备案。

1. 在宝塔面板「**网站**」→ 找到站点 → 点击「**设置**」
2. 点击左侧「**SSL**」→ 选择「**Let's Encrypt**」
3. 勾选你的域名，点击「**申请**」
4. 申请成功后，开启「**强制 HTTPS**」

> ⚠️ 申请 SSL 需要：① 域名已备案；② DNS 已解析到服务器 IP；③ 80 端口已开放。

---

### 🔄 后续更新升级

```bash
cd /www/wwwroot/CRM

# 拉取最新代码
git pull origin main

# 重新构建前端
npm install
npm run build

# 重新构建后端
cd backend
npm install
npm run build

# 重启后端服务
pm2 restart crm-backend
```

---

### ❓ 常见问题

**Q: 宝塔面板安装后无法打开**
A: ① 确认云服务器安全组已放行 8888 端口；② 在 SSH 终端执行 `bt default` 重新查看面板地址和密码。

**Q: PM2 管理器中找不到 Node.js 20 版本**
A: 在终端手动安装：`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && source ~/.bashrc && nvm install 20`

**Q: 访问网站显示 502 Bad Gateway**
A: 后端服务可能未启动。在终端执行 `pm2 list` 查看。如果没有进程，执行 `cd /www/wwwroot/CRM/backend && pm2 start dist/server.js --name crm-backend`。

**Q: 访问显示空白页**
A: ① 检查网站根目录是否指向 `/www/wwwroot/CRM/dist`；② Nginx 配置中是否有 `try_files $uri $uri/ /index.html;`；③ 检查 dist 目录下是否有 index.html 文件。

**Q: WebSocket 连接失败（实时消息不推送）**
A: 检查 Nginx 配置中是否正确配置了 `/socket.io/` 的 WebSocket 代理，特别是 `proxy_set_header Upgrade` 和 `Connection "upgrade"` 这两行。

**Q: 上传文件失败，提示文件过大**
A: 检查 Nginx 配置中 `client_max_body_size` 是否设置（默认 50M）。如果需要更大，改为 `100M` 或 `200M`。

**Q: npm install 报错或速度极慢**
A: 先设置国内镜像 `npm config set registry https://registry.npmmirror.com`，如果仍有问题，尝试删除 `node_modules` 和 `package-lock.json` 后重试。
