# CRM 系统 — 私有部署指南

**版本**: 1.8.0  
**更新日期**: 2026-04-29  

---

## 📋 目录

1. [部署方案选择](#部署方案选择)
2. [系统要求](#系统要求)
3. [方案一：Docker 部署（推荐）](#方案一docker-部署推荐)
4. [方案二：宝塔面板部署](#方案二宝塔面板部署)
5. [方案三：Linux 手动部署](#方案三linux-手动部署)
6. [方案四：Windows 本地部署](#方案四windows-本地部署)
7. [首次使用 — 激活与初始化](#首次使用--激活与初始化)
8. [日常使用指南](#日常使用指南)
9. [维护与运维](#维护与运维)
10. [系统升级](#系统升级)
11. [常见问题](#常见问题)
12. [技术支持](#技术支持)

---

## 部署方案选择

| 方案 | 适合场景 | 难度 | 所需时间 |
|------|---------|------|---------|
| **Docker 部署**（推荐） | 有 Linux 服务器 | ⭐ 简单 | 约 10 分钟 |
| 宝塔面板部署 | 已有宝塔面板的服务器 | ⭐⭐ 中等 | 约 30 分钟 |
| Linux 手动部署 | 有运维经验的团队 | ⭐⭐⭐ 较难 | 约 45 分钟 |
| Windows 本地部署 | 本地试用/小团队 | ⭐⭐ 中等 | 约 30 分钟 |

> 💡 **没有运维经验？直接选方案一 Docker 部署，只需要复制粘贴几条命令即可完成。**

---

## 系统要求

### 硬件推荐

| 配置项 | 最低配置 | 推荐配置 |
|--------|----------|----------|
| CPU | 2 核 | 4 核+ |
| 内存 | 2 GB | 4 GB+ |
| 硬盘 | 10 GB | 50 GB+（含数据库和文件） |
| 带宽 | 1 Mbps | 5 Mbps+（多用户访问） |

### 支持的操作系统

- Ubuntu 20.04+、CentOS 7+、Debian 10+（Docker / 手动部署）
- Windows 10/11、Windows Server 2019+（本地部署）

---

## 方案一：Docker 部署（推荐）

> 🐳 Docker 部署是最简单的方式，包含前端、后端、数据库三个容器，一键启动，无需手动安装 Node.js、MySQL、Nginx。

### 你会得到什么

交付包内容：

```
crm-docker-v1.8.0/
├── docker-compose.yml          # 容器编排配置（核心文件）
├── .env.example                # 环境变量模板
├── crm-web-1.8.0.tar           # 前端镜像（Nginx）
├── crm-api-1.8.0.tar           # 后端镜像（Node.js）
├── mysql-8.0.tar               # 数据库镜像
└── README.txt                  # 快速入门说明
```

或者如果服务器能访问公网，也可以通过 Docker Registry 在线拉取镜像。

---

### 第一步：安装 Docker

> 如果服务器已安装 Docker，直接跳到[第二步](#第二步上传交付包到服务器)。

**Ubuntu / Debian：**

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker 并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

**CentOS 7/8：**

```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker 并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

> 📌 如果 `docker compose` 命令不存在，可能需要单独安装：
> ```bash
> sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
> sudo chmod +x /usr/local/bin/docker-compose
> ```
> 之后命令使用 `docker-compose`（带横杠）代替 `docker compose`。

---

### 第二步：上传交付包到服务器

**方式 A：离线安装（推荐，无需服务器联网）**

在您的电脑上，将交付包上传到服务器：

```bash
# 在您的电脑上执行（将 your-server-ip 替换为服务器IP）
scp crm-docker-v1.8.0.tar.gz root@your-server-ip:/opt/
```

或使用 FTP / 宝塔面板文件管理上传到 `/opt/` 目录。

在服务器上解压：

```bash
cd /opt
tar -xzf crm-docker-v1.8.0.tar.gz
cd crm-docker-v1.8.0
```

**方式 B：在线拉取（服务器可联网）**

如已提供 Registry 地址，直接创建目录并下载配置文件：

```bash
mkdir -p /opt/crm && cd /opt/crm
# 将交付的 docker-compose.yml 和 .env.example 放到此目录
```

---

### 第三步：导入 Docker 镜像（离线安装）

> 如果使用在线拉取方式，跳过此步。

```bash
# 导入三个镜像
docker load < crm-web-1.8.0.tar
docker load < crm-api-1.8.0.tar
docker load < mysql-8.0.tar

# 验证镜像已导入
docker images
```

正常输出：
```
REPOSITORY    TAG       SIZE
crm-web       1.8.0     50MB
crm-api       1.8.0     300MB
mysql         8.0       550MB
```

---

### 第四步：修改配置文件（重要！）

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env     # 或使用 vi .env
```

**必须修改的配置项（标⚠️的必改）：**

```ini
# ==================== 端口配置 ====================
# 浏览器访问端口（默认80，如有冲突改为其他如 8080）
WEB_PORT=80

# ==================== ⚠️ 数据库密码（必须修改！） ====================
# MySQL root 密码
MYSQL_ROOT_PASSWORD=这里输入一个强密码

# 应用数据库密码
DB_PASSWORD=这里输入另一个强密码

# 应用数据库名和用户名（可保持默认）
DB_DATABASE=crm
DB_USERNAME=crm

# ==================== ⚠️ JWT 密钥（必须修改！） ====================
# 用于用户登录加密，请生成随机字符串
# 生成方法：在终端执行下面这条命令，把输出结果粘贴到下面
#   openssl rand -hex 32
JWT_SECRET=这里粘贴第一个随机字符串
JWT_REFRESH_SECRET=这里粘贴第二个随机字符串

# Token 过期时间（可保持默认）
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ==================== CORS 配置 ====================
# 允许访问的域名（如果用IP访问，设为 * 即可）
# 如果绑定了域名，改为: https://crm.your-domain.com
CORS_ORIGIN=*

# ==================== 日志 ====================
LOG_LEVEL=info
```

> 💡 **快速生成密钥命令**（复制粘贴到终端执行）：
> ```bash
> echo "JWT_SECRET=$(openssl rand -hex 32)"
> echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
> echo "MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)"
> echo "DB_PASSWORD=$(openssl rand -hex 16)"
> ```
> 将输出结果粘贴到 `.env` 文件对应位置。

---

### 第五步：启动系统

```bash
# 启动所有容器（后台运行）
docker compose up -d
```

首次启动需要等待约 **30-60 秒**（MySQL 初始化建表）。

查看启动状态：

```bash
docker compose ps
```

正常输出（三个容器都是 `running` 状态）：

```
NAME       IMAGE            STATUS                    PORTS
crm-web    crm-web:1.8.0    Up 30 seconds (healthy)   0.0.0.0:80->80/tcp
crm-api    crm-api:1.8.0    Up 30 seconds (healthy)   3000/tcp
crm-db     mysql:8.0        Up 30 seconds (healthy)   3306/tcp
```

> ⚠️ 如果某个容器状态不是 `running`，查看日志排查：
> ```bash
> docker compose logs crm-api    # 查看后端日志
> docker compose logs crm-db     # 查看数据库日志
> docker compose logs crm-web    # 查看前端日志
> ```

---

### 第六步：验证系统运行

```bash
# 1. 检查后端 API 健康状态
curl http://localhost/api/v1/health

# 正常应返回类似：{"status":"ok","timestamp":"..."}
```

```bash
# 2. 检查前端页面
curl -s -o /dev/null -w "%{http_code}" http://localhost/

# 正常应返回：200
```

---

### 第七步：打开浏览器访问

在浏览器地址栏输入：

```
http://服务器IP地址
```

例如服务器 IP 为 `123.45.67.89`，则访问 `http://123.45.67.89`。

如果修改了 `WEB_PORT`（比如改为 8080），则访问 `http://123.45.67.89:8080`。

> 看到登录页面即表示部署成功！接下来请跳到 [首次使用 — 激活与初始化](#首次使用--激活与初始化) 完成系统激活。

---

### Docker 绑定域名（可选）

如果您有域名，需要配置 DNS 解析后再配置 HTTPS：

**1. 配置 DNS 解析：**

在域名服务商处添加 A 记录，将域名指向服务器 IP。

**2. 安装 SSL 证书（Let's Encrypt 免费证书）：**

```bash
# 安装 certbot
sudo apt install -y certbot   # Ubuntu/Debian
# 或
sudo yum install -y certbot   # CentOS

# 申请证书（将 crm.your-domain.com 换成您的域名）
sudo certbot certonly --standalone -d crm.your-domain.com

# 证书文件位于：
#   /etc/letsencrypt/live/crm.your-domain.com/fullchain.pem
#   /etc/letsencrypt/live/crm.your-domain.com/privkey.pem
```

**3. 修改 docker-compose.yml 挂载证书：**

在 `crm-web` 服务的 `volumes` 下添加：

```yaml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

并在 `ports` 中添加 443 端口：

```yaml
ports:
  - "80:80"
  - "443:443"
```

**4. 修改 .env 中的 CORS：**

```ini
CORS_ORIGIN=https://crm.your-domain.com
```

**5. 重启容器：**

```bash
docker compose down
docker compose up -d
```

---

### Docker 常用管理命令速查

```bash
# ==================== 基本操作 ====================
docker compose up -d          # 启动所有容器（后台运行）
docker compose down           # 停止并删除所有容器（数据不会丢失）
docker compose restart        # 重启所有容器
docker compose ps             # 查看容器运行状态

# ==================== 单个服务操作 ====================
docker compose restart crm-api   # 仅重启后端
docker compose restart crm-web   # 仅重启前端
docker compose restart crm-db    # 仅重启数据库

# ==================== 查看日志 ====================
docker compose logs -f           # 查看所有日志（实时跟踪）
docker compose logs -f crm-api   # 仅查看后端日志
docker compose logs --tail 100 crm-api  # 查看最近100行

# ==================== 进入容器 ====================
docker exec -it crm-api sh      # 进入后端容器
docker exec -it crm-db mysql -u root -p  # 进入MySQL命令行

# ==================== 资源占用 ====================
docker stats                     # 实时查看CPU/内存占用
```

---

## 方案二：宝塔面板部署

### 步骤 1：安装宝塔面板环境

在宝塔面板中安装：
- **Nginx** (推荐 1.22+)
- **MySQL** 8.0
- **PM2 管理器** (应用商店搜索安装)

### 步骤 2：创建网站和数据库

1. 宝塔 → 网站 → 添加站点
   - 域名填写您的域名或 IP
   - PHP 版本选择 "纯静态"
   - 创建数据库，记住数据库名、用户名、密码

2. 宝塔 → 文件 → 进入网站目录 → 上传 CRM 项目压缩包并解压

### 步骤 3：初始化数据库

```bash
cd /www/wwwroot/your-site/private-deploy
node init-mysql-database.js
```

按提示输入宝塔创建的数据库信息。

### 步骤 4：安装依赖并构建

```bash
# 安装并构建后端
cd /www/wwwroot/your-site/backend
npm install --production
npm run build

# 安装并构建前端
cd /www/wwwroot/your-site
npm install
npm run build
```

### 步骤 5：配置 Nginx

1. 宝塔 → 网站 → 你的站点 → 设置 → 配置文件
2. 将 `private-deploy/nginx.conf.template` 的内容粘贴进去
3. 修改 `root` 路径为你的网站目录下的 `dist` 文件夹
4. 修改 `server_name` 为你的域名
5. 保存

### 步骤 6：启动后端服务

**方式 A：宝塔 PM2 管理器（推荐）**

1. 宝塔 → PM2 管理器
2. 添加项目：
   - 启动文件：`/www/wwwroot/your-site/backend/dist/app.js`
   - 项目名称：`crm-backend`
   - 运行目录：`/www/wwwroot/your-site/backend`

**方式 B：命令行**

```bash
cd /www/wwwroot/your-site/backend
pm2 start dist/app.js --name crm-backend
pm2 save
pm2 startup
```

### 步骤 7：修改环境配置

编辑 `backend/.env`：

```ini
DEPLOY_MODE=private
BAOTA_PANEL=true
CORS_ORIGIN=https://crm.your-domain.com
```

> 详细 Nginx 多站点配置请参考 `multi-site-deploy-guide.md`。

---

## 方案三：Linux 手动部署

### 步骤 1：安装环境

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs mysql-server nginx

# CentOS
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs mysql-server nginx
sudo systemctl start mysqld
```

### 步骤 2：上传并解压

```bash
scp CRM-private-v1.8.0.tar.gz user@server:/www/wwwroot/
ssh user@server
cd /www/wwwroot/
tar -xzf CRM-private-v1.8.0.tar.gz
cd CRM-private-v1.8.0
```

### 步骤 3：一键安装

```bash
cd private-deploy
chmod +x install.sh
./install.sh
```

脚本自动完成：数据库初始化 → 安装依赖 → 构建 → PM2 启动。

### 步骤 4：配置 Nginx

```bash
sudo cp private-deploy/nginx.conf.template /etc/nginx/sites-available/crm.conf
sudo nano /etc/nginx/sites-available/crm.conf
# 修改 server_name 和 root 路径
sudo ln -s /etc/nginx/sites-available/crm.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

---

## 方案四：Windows 本地部署

### 步骤 1：安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/) 下载 22.x LTS 版本
2. 安装时勾选 "Add to PATH"
3. 打开命令提示符验证：`node -v` 和 `npm -v`

### 步骤 2：安装 MySQL

1. 下载 [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) 8.0
2. 安装时记住 root 密码
3. 确保 MySQL 服务已启动

### 步骤 3：一键安装

```cmd
cd CRM-private-v1.8.0\private-deploy
install.bat
```

### 步骤 4：访问

浏览器打开 `http://localhost:3000`

---

## 首次使用 — 激活与初始化

> 无论使用哪种部署方案，部署完成后都需要按以下步骤完成激活。

### 1. 打开系统

在浏览器中输入系统地址：

| 部署方式 | 访问地址 |
|---------|---------|
| Docker 部署 | `http://服务器IP` 或 `http://服务器IP:端口` |
| 宝塔 / Nginx 部署 | `http://你的域名` |
| Windows 本地 | `http://localhost:3000` |

### 2. 激活系统

首次打开登录页面，系统会自动展开授权码输入区域：

```
┌──────────────────────────────────┐
│         CRM 智能销售系统          │
│                                  │
│  ┌────────────────────────────┐  │
│  │  授权码: PRIVATE-XXXX-...  │  │
│  └────────────────────────────┘  │
│       [ 激活系统 ]                │
│                                  │
└──────────────────────────────────┘
```

1. 在输入框中输入购买时获得的授权码
   - 格式：`PRIVATE-XXXX-XXXX-XXXX-XXXX`
2. 点击 **"激活系统"** 按钮
3. 等待 2-3 秒，系统自动验证并完成激活
4. 激活成功后页面会提示管理员账号信息

> ⚠️ 激活需要服务器能访问互联网（系统会联网验证授权码）。
> 如服务器无法联网，请联系技术支持获取离线激活码。

### 3. 首次登录

激活成功后，使用默认管理员账号登录：

| 项目 | 值 |
|------|---|
| **用户名** | 购买时注册官网的手机号 |
| **密码** | `Aa123456` |

> ⚠️ **请登录后立即修改默认密码！** 点击右上角头像 → 修改密码。

### 4. 初始化系统设置

登录后按以下顺序初始化：

**第一步：创建部门结构**

```
设置 → 部门管理 → 添加部门
```

创建公司的组织架构，例如：
```
公司总部
├── 销售一部
├── 销售二部
├── 客服部
└── 财务部
```

**第二步：设置角色权限**

```
设置 → 角色管理
```

系统预置了以下角色：
- **管理员** — 所有权限
- **销售经理** — 管理本部门
- **销售员** — 日常操作
- **财务** — 财务相关模块

可根据需要新增或修改角色。

**第三步：创建员工账号**

```
设置 → 用户管理 → 添加用户
```

为每位员工创建账号，设置：
- 用户名（手机号或自定义）
- 密码
- 所属部门
- 角色

**第四步：配置产品库（如需要）**

```
产品管理 → 产品列表 → 添加产品
```

**第五步：配置短信（如需要）**

```
设置 → 短信配置
```

需要阿里云短信服务的 Access Key、签名和模板。

---

## 日常使用指南

### 功能导航

| 功能 | 入口 | 说明 |
|------|------|------|
| 仪表盘 | 首页 | 查看销售数据概览、待办事项 |
| 客户管理 | 左侧菜单 → 客户 | 添加/编辑/跟进客户 |
| 订单管理 | 左侧菜单 → 订单 | 创建订单、审核、发货 |
| 财务管理 | 左侧菜单 → 财务 | 代收管理、财务统计 |
| 物流管理 | 左侧菜单 → 物流 | 发货、物流跟踪 |
| 数据分析 | 左侧菜单 → 数据 | 业绩报表、趋势分析 |
| 通话管理 | 左侧菜单 → 通话 | 通话记录、录音 |
| 系统设置 | 左侧菜单 → 设置 | 用户/角色/部门管理 |

### 分享给团队成员

1. 将系统地址发给团队成员
2. 提供各自的账号和初始密码
3. 提醒首次登录后修改密码

> 企业微信/钉钉群发消息是最便捷的方式。

---

## 维护与运维

### 数据库备份

**Docker 方式：**

```bash
# 手动备份（在部署目录下执行）
docker exec crm-db mysqldump -u root -p'你的root密码' crm > backup_$(date +%Y%m%d).sql

# 恢复备份
docker exec -i crm-db mysql -u root -p'你的root密码' crm < backup_20260429.sql
```

**宝塔 / 手动部署方式：**

```bash
# 手动备份
mysqldump -u root -p crm > backup_$(date +%Y%m%d).sql

# 宝塔面板：数据库 → 备份
```

> 📌 **强烈建议**：配置定时备份，每天至少一次。

**设置 Docker 自动每日备份：**

```bash
# 创建备份脚本
cat > /opt/crm/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/crm/backups"
mkdir -p $BACKUP_DIR
docker exec crm-db mysqldump -u root -p'你的root密码' crm | gzip > "$BACKUP_DIR/crm_$(date +%Y%m%d_%H%M%S).sql.gz"
# 保留最近30天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF
chmod +x /opt/crm/backup.sh

# 添加定时任务（每天凌晨3点执行）
echo "0 3 * * * /opt/crm/backup.sh" | crontab -
```

### 日志管理

**Docker 方式：**

```bash
docker compose logs -f crm-api      # 实时查看后端日志
docker compose logs --tail 200       # 最近200行
docker compose logs --since 1h       # 最近1小时
```

**PM2 方式（宝塔 / 手动部署）：**

```bash
pm2 logs crm-backend       # 实时查看
pm2 flush                  # 清理旧日志
```

### 服务管理

**Docker 方式：**

```bash
docker compose ps               # 查看状态
docker compose restart           # 重启全部
docker compose restart crm-api   # 仅重启后端
docker compose down              # 停止（数据不丢失）
docker compose up -d             # 重新启动
docker stats                     # 查看资源占用
```

**PM2 方式（宝塔 / 手动部署）：**

```bash
pm2 list                    # 查看所有服务
pm2 restart crm-backend     # 重启
pm2 stop crm-backend        # 停止
pm2 monit                   # 实时监控
```

### 文件上传存储位置

| 部署方式 | 上传文件路径 |
|---------|-------------|
| Docker | Docker volume `crm-uploads`（自动持久化） |
| 宝塔 / 手动 | `backend/uploads/` |

---

## 系统升级

### Docker 升级方式

当收到新版本交付包后：

```bash
cd /opt/crm

# 1. 备份数据库（重要！）
docker exec crm-db mysqldump -u root -p'密码' crm > backup_before_upgrade.sql

# 2. 停止当前容器
docker compose down

# 3. 导入新镜像
docker load < crm-web-1.9.0.tar
docker load < crm-api-1.9.0.tar

# 4. 更新 docker-compose.yml 中的版本号（如需要）
nano docker-compose.yml
# 将 image: crm-web:1.8.0 改为 crm-web:1.9.0
# 将 image: crm-api:1.8.0 改为 crm-api:1.9.0

# 5. 执行数据库迁移（如有）
# 升级说明中会注明是否需要执行迁移SQL
docker compose up -d crm-db
docker exec -i crm-db mysql -u root -p'密码' crm < migration-v1.9.0.sql

# 6. 启动新版本
docker compose up -d

# 7. 验证
docker compose ps
curl http://localhost/api/v1/health
```

### 宝塔 / 手动部署升级方式

```bash
# 1. 备份数据库
mysqldump -u root -p crm > backup_before_upgrade.sql

# 2. 上传新版本文件并解压（覆盖旧文件）

# 3. 执行数据库迁移（如有）
mysql -u root -p crm < database/migration-v1.9.0.sql

# 4. 重新构建
cd backend && npm install --production && npm run build && cd ..
npm install && npm run build

# 5. 重启
pm2 restart crm-backend
```

---

## 常见问题

### Q: Docker 启动后容器一直 restarting？

```bash
# 查看具体错误日志
docker compose logs crm-api
docker compose logs crm-db
```

常见原因：
- `.env` 中的密码含特殊字符（建议只用字母数字）
- 端口被占用（改 `.env` 中的 `WEB_PORT`）
- 内存不足（至少需要 2GB）

### Q: 访问显示 502 Bad Gateway？

后端容器未就绪。等待 30 秒后重试，或检查后端日志：
```bash
docker compose logs crm-api
```

### Q: 访问显示空白页？

- Docker 部署：`docker compose restart crm-web`
- 其他方式：确认 `dist/` 目录存在，Nginx 配置中 `root` 路径正确

### Q: 数据库连接失败？

- Docker：确认 `.env` 中的 `DB_PASSWORD` 和 `MYSQL_ROOT_PASSWORD` 已设置
- 其他：确认 MySQL 服务已启动，`backend/.env` 配置正确

### Q: 上传文件 / 图片不显示？

- Docker：确认 `crm-uploads` volume 存在，`docker volume ls` 查看
- 其他：确认 `backend/uploads/` 目录有写权限，Nginx 配置了 `/uploads/` 路径

### Q: 如何修改访问端口？

- Docker：编辑 `.env` 中的 `WEB_PORT=新端口`，然后 `docker compose down && docker compose up -d`
- 其他：修改 Nginx 配置中的 `listen` 端口

### Q: 如何查看系统版本？

登录系统后，点击左下角的版本号；或访问 `http://系统地址/api/v1/health`。

### Q: 忘记管理员密码？

联系技术支持进行密码重置。

---

## 技术支持

如遇部署或使用问题，请联系技术支持团队，并提供以下信息以便快速定位：

1. **部署方式**：Docker / 宝塔 / 手动
2. **服务器系统**：如 CentOS 7、Ubuntu 22.04
3. **错误截图**或日志：
   - Docker：`docker compose logs crm-api > error.log 2>&1`
   - PM2：`pm2 logs crm-backend --lines 100 > error.log`
4. **浏览器控制台报错**（按 F12 → Console）

> 📌 **重要提醒**：
> - 定期备份数据库（建议每天自动备份）
> - 及时修改默认密码
> - 保管好 `.env` 配置文件，不要泄露给无关人员
> - 定期查看系统日志，关注异常情况

