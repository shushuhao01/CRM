# CRM 系统 - 私有部署指南

**版本**: 1.8.0  
**更新日期**: 2026-04-04  

---

## 📋 目录

1. [系统要求](#系统要求)
2. [方案一：Windows 本地部署（推荐新手）](#方案一windows-本地部署)
3. [方案二：Linux 服务器部署](#方案二linux-服务器部署)
4. [方案三：宝塔面板部署（推荐）](#方案三宝塔面板部署)
5. [首次使用配置](#首次使用配置)
6. [分享系统给团队成员](#分享系统给团队成员)
7. [常见问题](#常见问题)
8. [维护与升级](#维护与升级)
9. [支付配置](#支付配置)

---

## 系统要求

### 必需环境
| 软件 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 22.0+ | JavaScript 运行时 |
| npm | 10.0+ | 包管理器（随 Node.js 安装） |
| MySQL | 8.0+ | 数据库 |
| PM2 | 最新 | 进程管理器（脚本自动安装） |

### 硬件推荐
| 配置项 | 最低配置 | 推荐配置 |
|--------|----------|----------|
| CPU | 2核 | 4核+ |
| 内存 | 2GB | 4GB+ |
| 硬盘 | 10GB | 50GB+（含数据库和文件存储） |
| 带宽 | 1Mbps | 5Mbps+（多用户访问） |

### 支持的操作系统
- Windows 10/11、Windows Server 2019+
- Ubuntu 20.04+、CentOS 7+、Debian 10+
- macOS 12+

---

## 方案一：Windows 本地部署

### 步骤一：安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/) 下载 LTS 版本
2. 安装时勾选 "Add to PATH"
3. 打开命令提示符验证：
   ```cmd
   node -v
   npm -v
   ```

### 步骤二：安装 MySQL

1. 下载 [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
2. 安装时记住 root 密码
3. 确保 MySQL 服务已启动

### 步骤三：一键安装

```cmd
cd CRM-1.8.0\private-deploy
install.bat
```

按照向导提示输入数据库连接信息即可完成安装。

### 步骤四：访问系统

- 打开浏览器访问: `http://localhost:3000`
- 首次使用需在登录页输入授权码完成系统激活
- 激活后自动创建管理员账号：
  - 用户名：购买时注册官网的手机号
  - 密码：`Aa123456`
- **⚠️ 请登录后立即修改默认密码！**

---

## 方案二：Linux 服务器部署

### 步骤一：安装环境

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs mysql-server

# CentOS
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs mysql-server
sudo systemctl start mysqld
```

### 步骤二：上传项目文件

```bash
# 将项目压缩包上传到服务器
scp CRM-1.8.0.tar.gz user@server:/www/wwwroot/

# 在服务器上解压
cd /www/wwwroot/
tar -xzf CRM-1.8.0.tar.gz
cd CRM-1.8.0
```

### 步骤三：一键安装

```bash
cd private-deploy
chmod +x install.sh
./install.sh
```

### 步骤四：配置 Nginx（可选但推荐）

```bash
# 复制 Nginx 配置
sudo cp private-deploy/nginx.conf.template /etc/nginx/sites-available/crm.conf

# 修改域名和路径
sudo nano /etc/nginx/sites-available/crm.conf

# 启用配置
sudo ln -s /etc/nginx/sites-available/crm.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
```

---

## 方案三：宝塔面板部署

### 步骤一：安装宝塔面板环境

在宝塔面板中安装：
- **Nginx** (推荐 1.22+)
- **MySQL** 8.0
- **PM2管理器** (应用商店搜索安装)

### 步骤二：创建网站和数据库

1. **创建网站**：
   - 宝塔 → 网站 → 添加站点
   - 域名填写您的域名或 IP
   - PHP版本选择 "纯静态"
   - 创建数据库，记住数据库名、用户名、密码

2. **上传项目文件**：
   - 宝塔 → 文件 → 进入网站目录
   - 上传 CRM 项目压缩包并解压

### 步骤三：初始化数据库

```bash
cd /www/wwwroot/your-site/private-deploy
node init-mysql-database.js
```

输入宝塔创建的数据库信息。

### 步骤四：安装依赖并构建

```bash
cd /www/wwwroot/your-site/backend
npm install --production
npm run build

cd /www/wwwroot/your-site
npm install
npm run build
```

### 步骤五：配置 Nginx

1. 宝塔 → 网站 → 你的站点 → 设置 → 配置文件
2. 将 `private-deploy/nginx.conf.template` 的内容粘贴进去
3. 修改 `root` 路径和 `server_name`
4. 保存

### 步骤六：启动后端服务

**方式A：使用宝塔PM2管理器**
1. 宝塔 → PM2管理器
2. 添加项目：
   - 启动文件: `/www/wwwroot/your-site/backend/dist/app.js`
   - 项目名称: `crm-backend`
   - 运行目录: `/www/wwwroot/your-site/backend`

**方式B：命令行启动**
```bash
cd /www/wwwroot/your-site/backend
pm2 start dist/app.js --name crm-backend
pm2 save
pm2 startup  # 设置开机自启
```

### 步骤七：修改环境配置

编辑 `backend/.env`，确保配置正确：
```bash
# 宝塔面板需要设置为true
BAOTA_PANEL=true

# CORS 配置为您的所有域名
CORS_ORIGIN=https://crm.your-domain.com,https://your-domain.com,https://admin.your-domain.com
```

### 步骤八：配置系统URL（多域名部署必须）

如果使用多域名部署（如 CRM、官网、Admin 各一个域名），编辑 `backend/.env` 添加：
```bash
# ==================== 系统URL地址配置 ====================
# 影响：跨系统链接、邮件通知中的链接、支付回调、官网显示的CRM登录地址等
CRM_URL=https://crm.your-domain.com
WEBSITE_URL=https://your-domain.com
API_URL=https://api.your-domain.com
ADMIN_URL=https://admin.your-domain.com
RENEW_URL=https://your-domain.com/pricing
```

> 📌 **说明**：所有前端 API 请求使用相对路径（`/api/v1/...`），通过 Nginx 反向代理转发到后端，无需修改前端代码。以上 URL 仅影响跨系统之间的链接跳转（如官网上的"登录CRM"按钮、邮件中的链接等）。
>
> 📖 详细说明请参考 `docs/私有部署URL路由与多域名配置指南.md`

---

## 首次使用配置

### 1. 激活系统

- 访问系统地址（如 `http://your-domain.com`）
- 在登录页面，系统会自动展开授权码输入框
- 输入您购买时获得的授权码（格式：`PRIVATE-XXXX-XXXX-XXXX-XXXX`）
- 点击激活，系统会自动向运营管理后台验证授权码
- 验证通过后，系统自动创建默认管理员账号

### 2. 登录系统

- 激活成功后，使用以下默认管理员账号登录：
  - **用户名**：购买时注册官网使用的手机号
  - **密码**：`Aa123456`
- 如果不知道手机号，即为注册官网时使用的手机号

### 3. 修改密码

- 登录后点击右上角头像 → 修改密码
- **强烈建议设置复杂密码**

### 4. 创建部门

- 进入 设置 → 部门管理
- 创建公司的部门结构

### 5. 创建员工账号

- 进入 设置 → 用户管理
- 为每个员工创建账号，分配角色和部门

### 6. 系统授权（可选）

- 进入 设置 → 系统授权
- 输入授权码激活高级功能

---

## 分享系统给团队成员

### Windows 局域网访问

1. 查看本机IP地址：`ipconfig`
2. 将系统地址告诉团队成员：`http://192.168.x.x:3000`
3. 确保防火墙允许 3000 端口

### 外网访问

如果部署在有公网IP的服务器上，直接使用公网IP或域名访问即可。

### 分享方式建议

1. **企业微信/钉钉群发消息**：发送系统链接 + 员工各自的账号密码
2. **二维码**：将系统链接生成二维码，方便手机扫码访问
3. **内网穿透**（如需外网访问本地部署）：可使用 frp/ngrok 等工具

---

## 常见问题

### Q: 启动后访问不了？
- 检查后端是否启动：`pm2 list`
- 检查端口是否被占用：`netstat -tlnp | grep 3000`
- 检查防火墙是否放通端口

### Q: 数据库连接失败？
- 确认 MySQL 服务已启动
- 检查 `backend/.env` 中的数据库配置
- 确认数据库用户有正确的权限

### Q: 前端页面白屏？
- 确认前端已构建：检查 `dist/` 目录是否存在
- 检查 Nginx 配置中 `root` 路径是否正确
- 查看浏览器控制台错误信息

### Q: 如何更新系统？
- 备份数据库：`mysqldump -u user -p dbname > backup.sql`
- 上传新版本文件
- 安装依赖并构建
- 重启服务：`pm2 restart crm-backend`

---

## 维护与升级

### 数据库备份

```bash
# 手动备份
mysqldump -u root -p crm > crm_backup_$(date +%Y%m%d).sql

# 宝塔面板：数据库 → 备份
```

### 日志管理

```bash
# 查看后端日志
pm2 logs crm-backend

# 清理旧日志
pm2 flush
```

### 服务管理

```bash
pm2 list              # 查看所有服务
pm2 restart crm-backend  # 重启
pm2 stop crm-backend     # 停止
pm2 start crm-backend    # 启动
pm2 monit             # 实时监控
```

---

## 技术支持

如有问题，请联系技术支持团队。

> 📌 **重要提醒**：
> - 定期备份数据库
> - 及时修改默认密码
> - 保管好 `.env` 配置文件
> - 不要将 `.env` 文件泄露给他人

---

## 支付配置

如需为SaaS版本配置在线支付功能（微信支付、支付宝、对公转账），请参考：

📖 **[支付方式完整配置指南](./payment-config-guide.md)**

该文档包含：
- 微信支付V2/V3接口完整配置步骤
- 支付宝开放平台应用创建及密钥配置
- 对公转账账户信息配置及业务流程
- Nginx回调地址转发配置
- 常见问题排查

