# 文件上传和部署操作指南

## 📦 准备上传文件

### 第一步：打包需要上传的文件

在本地项目根目录执行以下命令：

```bash
# Windows PowerShell
Compress-Archive -Path dist,backend,*.sh,*.conf,*.md -DestinationPath crm-system.zip

# 或者手动选择以下文件/文件夹打包：
# - dist/ (前端构建文件)
# - backend/ (后端源码)
# - deploy.sh (部署脚本)
# - centos7-setup.sh (环境准备脚本)
# - nginx.conf (Nginx配置模板)
# - bt-panel-config.md (宝塔配置指南)
# - DEPLOYMENT_GUIDE.md (部署指南)
```

### 第二步：上传文件到服务器

#### 方法一：使用宝塔面板文件管理器

1. **登录宝塔面板**
   - 访问：http://your-server-ip:8888
   - 输入用户名和密码

2. **上传文件**
   - 点击左侧菜单 "文件"
   - 进入 `/root` 目录
   - 点击 "上传" 按钮
   - 选择 `crm-system.zip` 文件上传

3. **解压文件**
   - 右键点击 `crm-system.zip`
   - 选择 "解压"
   - 解压到当前目录

#### 方法二：使用SCP命令（推荐）

```bash
# 从本地上传到服务器
scp crm-system.zip root@your-server-ip:/root/

# 登录服务器
ssh root@your-server-ip

# 解压文件
cd /root
unzip crm-system.zip
```

## 🔧 执行部署步骤

### 第一步：准备环境（首次部署）

```bash
# 给脚本执行权限
chmod +x centos7-setup.sh deploy.sh

# 运行环境准备脚本
./centos7-setup.sh
```

**预期输出：**
```
🔧 CentOS 7 环境准备开始...
✅ 系统版本: CentOS Linux release 7.9.2009 (Core)
📦 更新系统包...
🛠️ 安装基础工具...
📦 安装Node.js...
✅ Node.js安装完成: v18.x.x
📦 安装PM2...
✅ PM2安装完成: 5.x.x
🎉 CentOS 7 环境准备完成！
```

### 第二步：配置数据库

1. **在宝塔面板创建数据库**
   - 按照 `bt-panel-config.md` 指南操作
   - 记录数据库连接信息

2. **编辑后端环境变量**
   ```bash
   cd /root/backend
   cp .env.production .env
   nano .env
   ```

3. **更新数据库配置**
   ```env
   # 数据库配置
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=crm_user
   DB_PASSWORD=your_database_password_here
   DB_DATABASE=crm_system
   
   # JWT密钥（请生成新的强密钥）
   JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
   
   # 其他配置
   NODE_ENV=production
   PORT=3000
   API_PREFIX=/api/v1
   CORS_ORIGIN=https://abc789.cn
   ```

### 第三步：初始化数据库

```bash
# 编辑数据库初始化脚本
nano init-database.js

# 修改数据库配置部分：
# const DB_CONFIG = {
#   host: 'localhost',
#   port: 3306,
#   user: 'root',
#   password: 'your_mysql_root_password', // 填入MySQL root密码
#   charset: 'utf8mb4'
# };

# 运行初始化脚本
node init-database.js
```

### 第四步：执行部署

```bash
# 运行部署脚本
./deploy.sh
```

**预期输出：**
```
🚀 开始部署CRM系统到CentOS 7服务器...
🔍 检查系统环境...
✅ 系统: CentOS Linux release 7.9.2009 (Core)
🔧 检查必要服务...
✅ Node.js版本: v18.x.x
📦 创建备份...
🎨 部署前端...
⚙️ 部署后端...
📦 安装后端依赖...
🔥 配置防火墙...
✅ 防火墙规则已添加
🔒 配置SELinux...
✅ SELinux配置完成
🔄 启动后端服务...
✅ 部署完成！
```

### 第五步：配置Nginx

1. **在宝塔面板配置站点**
   - 按照 `bt-panel-config.md` 指南
   - 添加站点 abc789.cn
   - 配置SSL证书
   - 更新Nginx配置

2. **测试Nginx配置**
   ```bash
   nginx -t
   systemctl reload nginx
   ```

## 🔍 部署验证

### 检查服务状态

```bash
# 检查PM2进程
pm2 status
pm2 logs crm-api

# 检查端口监听
netstat -tlnp | grep 3000

# 检查Nginx状态
systemctl status nginx

# 检查MySQL状态
systemctl status mysqld
```

### 测试API连接

```bash
# 测试后端健康检查
curl http://localhost:3000/api/v1/health

# 测试通过域名访问
curl https://abc789.cn/api/v1/health
```

### 测试前端访问

1. **浏览器访问**
   - 打开：https://abc789.cn
   - 检查页面是否正常加载
   - 检查浏览器控制台是否有错误

2. **测试登录功能**
   - 使用默认账号登录
   - 检查API请求是否正常

## 🚨 常见问题排查

### 后端服务启动失败

```bash
# 查看详细错误日志
pm2 logs crm-api --lines 50

# 检查环境变量
cat /www/wwwroot/crm-backend/.env

# 手动启动测试
cd /www/wwwroot/crm-backend
npm start
```

### 数据库连接失败

```bash
# 测试数据库连接
mysql -u crm_user -p crm_system

# 检查MySQL服务
systemctl status mysqld
systemctl restart mysqld
```

### Nginx配置错误

```bash
# 测试配置文件
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log
tail -f /www/wwwlogs/abc789.cn.error.log
```

### 防火墙问题

```bash
# 检查防火墙状态
firewall-cmd --list-all

# 临时关闭防火墙测试
systemctl stop firewalld

# 重新添加规则
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

## 📊 监控和维护

### 日常监控命令

```bash
# 查看系统资源
htop
df -h
free -h

# 查看服务状态
pm2 monit
systemctl status nginx mysqld

# 查看日志
pm2 logs crm-api
tail -f /www/wwwlogs/abc789.cn.log
```

### 备份命令

```bash
# 数据库备份
mysqldump -u crm_user -p crm_system > /www/backup/crm_db_$(date +%Y%m%d).sql

# 文件备份
tar -czf /www/backup/crm_files_$(date +%Y%m%d).tar.gz /www/wwwroot/abc789.cn /www/wwwroot/crm-backend
```

完成以上步骤后，您的CRM系统就成功部署在CentOS 7服务器上了！