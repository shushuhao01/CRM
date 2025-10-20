# 宝塔面板GitHub代码获取指南

## 🎯 概述

本指南详细介绍如何在宝塔面板环境下从GitHub获取最新的CRM系统代码，并进行数据库一键部署。

## 📋 前置准备

### 1. 宝塔面板环境要求
- **宝塔面板** 7.7.0 或更高版本
- **Node.js** v22.19.0（软件商店安装）
- **MySQL** 8.0+（软件商店安装）
- **PM2管理器**（软件商店安装）
- **Git**（通常已预装）

### 2. GitHub仓库信息
- **仓库地址**: `https://github.com/shushuhao01/CRM.git`
- **主分支**: `main`
- **最新功能**: 数据库一键部署

## 🚀 方法一：宝塔面板界面操作（推荐新手）

### 步骤1：创建网站目录

1. 登录宝塔面板
2. 点击左侧菜单 **"网站"**
3. 点击 **"添加站点"**
4. 填写信息：
   - **域名**: 填写你的域名（如：`crm.yourdomain.com`）
   - **根目录**: `/www/wwwroot/CRM`
   - **FTP**: 不创建
   - **数据库**: 暂时不创建（稍后用脚本创建）
   - **PHP版本**: 纯静态
5. 点击 **"提交"**

### 步骤2：通过文件管理器获取代码

1. 点击左侧菜单 **"文件"**
2. 进入 `/www/wwwroot/` 目录
3. 删除刚创建的 `CRM` 文件夹（如果存在）
4. 点击 **"远程下载"**
5. 填写下载信息：
   - **URL**: `https://github.com/shushuhao01/CRM/archive/refs/heads/main.zip`
   - **下载到**: `/www/wwwroot/`
   - **文件名**: `CRM-main.zip`
6. 点击 **"确定下载"**
7. 下载完成后，右键点击 `CRM-main.zip` → **"解压"**
8. 解压后将 `CRM-main` 文件夹重命名为 `CRM`

### 步骤3：设置文件权限

1. 右键点击 `CRM` 文件夹 → **"权限"**
2. 设置权限为 `755`
3. 勾选 **"应用到子目录"**
4. 点击 **"确定"**

## 🔧 方法二：SSH命令行操作（推荐有经验用户）

### 步骤1：连接SSH

1. 宝塔面板 → **"终端"** → **"SSH终端"**
2. 或使用第三方SSH工具连接服务器

### 步骤2：获取代码

```bash
# 进入网站根目录
cd /www/wwwroot/

# 如果已存在CRM目录，先删除
rm -rf CRM

# 克隆最新代码
git clone https://github.com/shushuhao01/CRM.git

# 进入项目目录
cd CRM

# 查看最新提交信息
git log --oneline -5
```

### 步骤3：设置权限

```bash
# 设置文件所有者
chown -R www:www /www/wwwroot/CRM

# 设置执行权限
chmod +x *.sh
chmod +x test-db.sh
chmod +x db-deploy.sh
```

## 🗄️ 数据库一键部署

### 方法A：完整一键部署（推荐）

```bash
# 进入项目目录
cd /www/wwwroot/CRM

# 运行完整部署脚本
./start.sh
```

**操作步骤**：
1. 脚本会检测环境并询问数据库配置
2. 选择 **"1"** 进行数据库一键部署
3. 按提示输入数据库信息：
   - 数据库主机：`localhost`
   - 数据库端口：`3306`
   - 数据库名：`crm_system`（或自定义）
   - 用户名：`root`（或自定义）
   - 密码：输入MySQL root密码
4. 脚本自动创建数据库、导入表结构、构建前端、启动后端

### 方法B：单独数据库部署

```bash
# 只部署数据库
./db-deploy.sh
```

### 方法C：手动配置数据库

1. **在宝塔面板创建数据库**：
   - 宝塔面板 → **"数据库"** → **"添加数据库"**
   - 数据库名：`crm_system`
   - 用户名：`crm_user`
   - 密码：设置强密码

2. **配置环境变量**：
```bash
# 复制配置模板
cp backend/.env.database backend/.env

# 编辑配置文件
nano backend/.env
```

3. **手动导入SQL**：
```bash
# 导入数据库结构
mysql -u crm_user -p crm_system < backend/database-init.sql
```

## 🌐 配置Nginx反向代理

### 步骤1：网站设置

1. 宝塔面板 → **"网站"** → 找到你的站点 → **"设置"**
2. 点击 **"反向代理"** 标签
3. 点击 **"添加反向代理"**

### 步骤2：添加API代理

填写代理信息：
- **代理名称**: `CRM-API`
- **目标URL**: `http://127.0.0.1:3000`
- **发送域名**: `$host`
- **内容替换**: 留空

### 步骤3：配置代理规则

在 **"配置文件"** 中添加：

```nginx
location /api {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_http_version 1.1;
    
    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# 静态文件缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🧪 验证部署结果

### 1. 检查服务状态

```bash
# 查看PM2服务状态
pm2 list

# 查看后端日志
pm2 logs crm-backend

# 测试数据库连接
./test-db.sh
```

### 2. 检查网站访问

1. 访问你的域名，应该能看到CRM登录页面
2. 使用默认账户登录：
   - **用户名**: `admin`
   - **密码**: `admin123`

### 3. 检查API接口

```bash
# 测试健康检查接口
curl http://localhost:3000/health

# 或通过域名测试
curl https://yourdomain.com/api/health
```

## 🔄 代码更新流程

### 自动更新（推荐）

```bash
# 进入项目目录
cd /www/wwwroot/CRM

# 拉取最新代码
git pull origin main

# 重新构建和部署
./start.sh
```

### 手动更新

1. **备份当前配置**：
```bash
cp backend/.env backend/.env.backup
```

2. **获取最新代码**：
```bash
git fetch origin
git reset --hard origin/main
```

3. **恢复配置**：
```bash
cp backend/.env.backup backend/.env
```

4. **重新部署**：
```bash
./start.sh
```

## 🔍 常见问题解决

### 1. Git命令不存在

```bash
# CentOS/RHEL
yum install git -y

# Ubuntu/Debian
apt-get install git -y
```

### 2. 权限问题

```bash
# 重新设置权限
chown -R www:www /www/wwwroot/CRM
chmod +x /www/wwwroot/CRM/*.sh
```

### 3. Node.js版本问题

1. 宝塔面板 → **"软件商店"** → **"运行环境"**
2. 找到 **"Node.js版本管理器"**
3. 安装 **Node.js v22.19.0**
4. 设置为默认版本

### 4. 数据库连接失败

```bash
# 检查MySQL服务
systemctl status mysql

# 重启MySQL服务
systemctl restart mysql

# 检查防火墙
firewall-cmd --list-ports
```

### 5. 端口冲突

```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 修改端口（在.env文件中）
PORT=3001
```

## 📊 监控和维护

### 1. 设置监控

1. 宝塔面板 → **"监控"**
2. 添加进程监控：`pm2`
3. 添加端口监控：`3000`

### 2. 定期备份

```bash
# 创建备份脚本
cat > /www/backup/crm-backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u crm_user -p'your_password' crm_system > /www/backup/crm_db_$DATE.sql
tar -czf /www/backup/crm_files_$DATE.tar.gz /www/wwwroot/CRM
EOF

chmod +x /www/backup/crm-backup.sh
```

### 3. 设置定时任务

1. 宝塔面板 → **"计划任务"**
2. 添加Shell脚本任务
3. 执行周期：每天凌晨2点
4. 脚本内容：`/www/backup/crm-backup.sh`

## 🎉 部署完成检查清单

- [ ] GitHub代码已成功获取
- [ ] 文件权限设置正确
- [ ] 数据库创建并导入成功
- [ ] 环境变量配置正确
- [ ] 前端构建完成
- [ ] 后端服务启动（PM2）
- [ ] Nginx反向代理配置
- [ ] 网站可正常访问
- [ ] API接口响应正常
- [ ] 默认账户可登录
- [ ] 监控和备份已设置

## 📞 技术支持

如遇问题，请按以下顺序排查：

1. 查看本文档对应章节
2. 运行 `./test-db.sh` 检查数据库
3. 查看PM2日志：`pm2 logs crm-backend`
4. 查看Nginx错误日志
5. 提交Issue到GitHub仓库

---

✅ **恭喜！您已成功在宝塔面板部署CRM系统！**

**GitHub仓库**: https://github.com/shushuhao01/CRM.git  
**最新提交**: feat: 添加数据库一键部署功能