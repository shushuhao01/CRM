## 🐧 纯Linux部署教程

适合有 Linux 服务器运维经验的用户，在 Ubuntu / CentOS / Debian 上使用纯命令行部署，无需安装宝塔面板。

---

### 📋 服务器要求

| 配置项 | 要求 |
|--------|------|
| 系统 | Ubuntu 20.04+ / CentOS 7.9+ / Debian 11+ |
| 配置 | 2核2G 起步（推荐 2核4G） |
| 权限 | root 或 sudo 权限 |
| 端口 | 80、443、22 需放行 |

---

### ⚡ 方式一：一键部署（推荐）

#### 第一步：SSH 连接并更新系统

**Ubuntu/Debian：**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git wget build-essential
```

**CentOS：**
```bash
sudo yum update -y
sudo yum install -y curl git wget gcc-c++ make
```

#### 第二步：安装 Node.js 20.x

推荐使用 nvm 安装：

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# 安装 Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# 验证安装
node -v   # 应显示 v20.x.x
npm -v    # 应显示 10.x.x
```

> 💡 nvm 下载慢可用国内镜像：`curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash`

**备用方法（NodeSource）：**

Ubuntu/Debian：
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

CentOS：
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

#### 第三步：安装 MySQL 8.0

> 📥 MySQL 官方下载页：[dev.mysql.com/downloads →](https://dev.mysql.com/downloads/mysql/)（Linux 服务器用命令安装更方便，见下方）

**Ubuntu/Debian：**
```bash
sudo apt install -y mysql-server
sudo systemctl enable mysql && sudo systemctl start mysql
sudo mysql_secure_installation
# 按提示设置 root 密码，其他全选 Y
```

**CentOS：**
```bash
sudo yum install -y mysql-server
sudo systemctl enable mysqld && sudo systemctl start mysqld
sudo mysql_secure_installation
```

> ⚠️ 请务必记住设置的 root 密码。

#### 第四步：创建数据库和用户

```sql
sudo mysql -u root -p

-- 在 MySQL 命令行中执行：
CREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY '你的安全密码';
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> ⚠️ 将 `'你的安全密码'` 替换为一个强密码（大小写字母+数字，至少12位）。

#### 第五步：下载项目代码并导入数据库

```bash
# 创建项目目录
sudo mkdir -p /www/wwwroot
cd /www/wwwroot

# Git 克隆（推荐，方便后续更新）
git clone https://github.com/shushuhao01/crm-system.git CRM
cd CRM

# 导入数据库结构
mysql -u crm_user -p crm_db < database/schema.sql
```

#### 第六步：配置后端环境变量

```bash
cd /www/wwwroot/CRM/backend
cp .env.example .env
nano .env   # 或使用 vim .env
```

修改关键配置：

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=crm_user
DB_PASSWORD=第四步设置的数据库密码
DB_DATABASE=crm_db
DB_CHARSET=utf8mb4
JWT_SECRET=执行 openssl rand -hex 32 生成随机字符串
JWT_EXPIRES_IN=7d
PORT=3000
```

> 💡 nano 编辑器：修改后按 `Ctrl+O` 保存，`Ctrl+X` 退出。

#### 第七步：执行一键部署脚本 ⚡

```bash
cd /www/wwwroot/CRM
chmod +x deploy.sh
./deploy.sh
```

脚本将自动完成：
- ✅ 环境检查
- ✅ npm 镜像加速
- ✅ 安装前端和后端依赖
- ✅ 构建前端项目
- ✅ PM2 启动后端 + 开机自启

> ⏱ 预计 20-30 分钟。

#### 第八步：安装 Nginx 并配置反向代理

**Ubuntu/Debian：**
```bash
sudo apt install -y nginx
sudo systemctl enable nginx && sudo systemctl start nginx
```

**CentOS：**
```bash
sudo yum install -y nginx
sudo systemctl enable nginx && sudo systemctl start nginx
```

创建站点配置文件：

```bash
sudo nano /etc/nginx/sites-available/crm
```

粘贴以下完整配置（将 `你的域名或IP` 替换为实际值）：

```nginx
# 上游后端服务
upstream crm_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name 你的域名或IP;
    root /www/wwwroot/CRM/dist;
    index index.html;

    # 前端路由支持（Vue 单页应用）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # WebSocket 实时通讯支持（消息推送、在线状态等）
    location /socket.io/ {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 文件上传/下载目录
    location /uploads/ {
        alias /www/wwwroot/CRM/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml application/xml+rss image/svg+xml;

    # 安全配置
    location ~ /\. { deny all; }
    location ~* \.(bak|sql|log|old|orig|swp)$ { deny all; }
    client_max_body_size 50M;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
}
```

启用站点：

```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

> ⚠️ CentOS 的配置文件放在 `/etc/nginx/conf.d/crm.conf`，不需要创建软链接。

#### 第九步：配置防火墙

**Ubuntu (ufw)：**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

**CentOS (firewalld)：**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

> 💡 云服务器还需在云控制台的「安全组」中放行 80 和 443 端口。

#### 第十步：访问系统并激活授权 🎉

1. 浏览器访问 `http://你的域名或IP`
2. 点击登录页左下角 🔑 图标 → 选择「私有部署」
3. 粘贴 **系统授权码** → 点击「激活」
4. **⚠️ 首次激活会显示管理员账号密码，仅展示一次，请立即保存！**
5. 登录后 **立即修改密码**

#### 第十一步：申请 SSL 证书（推荐）

**Ubuntu/Debian：**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

**CentOS：**
```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

> 💡 证书有效期90天，certbot 会自动续期。

---

### 📝 方式二：手动部署

```bash
cd /www/wwwroot/CRM

# 配置 npm 镜像
npm config set registry https://registry.npmmirror.com

# 安装前端依赖并构建
npm install
npm run build

# 安装后端依赖并构建
cd backend
npm install --production
npm run build

# 安装 PM2 并启动
sudo npm install -g pm2
pm2 start dist/server.js --name crm-backend
pm2 save
pm2 startup  # 按提示执行输出的命令
```

---

### ❓ 常见问题

**Q: nginx -t 提示 sites-enabled 目录不存在**
A: CentOS 系统请将配置文件放在 `/etc/nginx/conf.d/crm.conf`。

**Q: 浏览器访问服务器 IP 无响应**
A: ① 检查 Nginx：`sudo systemctl status nginx`；② 检查防火墙端口；③ 检查云安全组规则。

**Q: pm2 命令找不到**
A: 执行 `sudo npm install -g pm2` 安装。如果用 nvm，需确保 root 下也能访问 node。

