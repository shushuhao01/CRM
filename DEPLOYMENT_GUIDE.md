# CRM系统生产环境部署指南

## 📋 部署前准备

### 服务器环境
- **操作系统**: CentOS 7.9.2009 x86_64
- **服务器**: 阿里云服务器（已配置）
- **管理面板**: 宝塔面板（已安装）
- **域名**: abc789.cn（已配置SSL证书）

### 软件要求
- Node.js 16+ 
- MySQL 5.7+ / MariaDB
- Nginx
- PM2
- Git

### 本地准备
- ✅ 前端已构建完成 (`dist/` 目录)
- ✅ 后端已编译完成 (`backend/dist/` 目录)
- ✅ 配置文件已准备 (`.env.production`)
- ✅ 部署脚本已创建

## 🚀 部署步骤

### 第零步：准备CentOS 7环境（首次部署）

如果是首次在服务器部署，请先运行环境准备脚本：

1. **上传环境准备脚本**
   ```bash
   # 上传 centos7-setup.sh 到服务器
   scp centos7-setup.sh root@your-server-ip:/root/
   ```

2. **运行环境准备**
   ```bash
   chmod +x /root/centos7-setup.sh
   bash /root/centos7-setup.sh
   ```

3. **验证环境**
   ```bash
   node -v    # 检查Node.js版本
   pm2 -v     # 检查PM2版本
   systemctl status nginx mysqld  # 检查服务状态
   ```

### 第一步：上传文件到服务器

1. **压缩项目文件**
   ```bash
   # 在本地项目根目录执行
   tar -czf crm-system.tar.gz dist/ backend/ nginx.conf deploy.sh
   ```

2. **上传到服务器**
   - 使用宝塔面板文件管理器上传 `crm-system.tar.gz`
   - 或使用 SCP/SFTP 工具上传

3. **解压文件**
   ```bash
   cd /www/wwwroot
   tar -xzf crm-system.tar.gz
   ```

### 第二步：配置数据库

1. **在宝塔面板创建数据库**
   - 数据库名：`crm_system`
   - 用户名：`crm_user`
   - 密码：设置强密码

2. **或使用初始化脚本**
   ```bash
   cd /www/wwwroot/backend
   # 先编辑 init-database.js 中的数据库配置
   node init-database.js
   ```

### 第三步：配置后端环境

1. **编辑环境变量**
   ```bash
   cd /www/wwwroot/backend
   cp .env.production .env
   nano .env
   ```

2. **更新数据库配置**
   ```env
   # 数据库配置
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=crm_user
   DB_PASSWORD=your_database_password
   DB_DATABASE=crm_system
   
   # JWT密钥（请生成新的）
   JWT_SECRET=your_super_secret_jwt_key_here
   
   # 其他配置根据需要调整
   ```

3. **安装依赖并启动**
   ```bash
   npm install --production
   
   # 创建必要目录
   mkdir -p logs uploads/avatars
   
   # 使用PM2启动
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

### 第四步：配置Nginx

1. **在宝塔面板添加站点**
   - 域名：`abc789.cn`
   - 根目录：`/www/wwwroot/abc789.cn`

2. **配置Nginx反向代理**
   - 复制 `nginx.conf` 内容到宝塔面板的Nginx配置
   - 或直接替换站点配置文件

3. **重启Nginx**
   ```bash
   nginx -t  # 测试配置
   systemctl reload nginx
   ```

### 第五步：部署前端

1. **复制前端文件**
   ```bash
   cp -r /www/wwwroot/dist/* /www/wwwroot/abc789.cn/
   chown -R www:www /www/wwwroot/abc789.cn
   chmod -R 755 /www/wwwroot/abc789.cn
   ```

### 第六步：测试部署

1. **检查后端服务**
   ```bash
   pm2 status
   pm2 logs crm-api
   curl http://localhost:3000/api/v1/health
   ```

2. **检查前端访问**
   - 访问：https://abc789.cn
   - 检查控制台是否有错误

3. **测试API连接**
   - 尝试登录系统
   - 检查网络请求是否正常

## 🔧 常见问题解决

### 数据库连接失败
```bash
# 检查MySQL服务状态
systemctl status mysql

# 检查数据库用户权限
mysql -u root -p
SHOW GRANTS FOR 'crm_user'@'localhost';
```

### PM2服务启动失败
```bash
# 查看详细日志
pm2 logs crm-api --lines 50

# 重启服务
pm2 restart crm-api

# 检查端口占用
netstat -tlnp | grep 3000
```

### Nginx配置错误
```bash
# 测试配置文件
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log
```

### 前端页面空白
1. 检查浏览器控制台错误
2. 确认API地址配置正确
3. 检查静态资源路径

## 📊 监控和维护

### 日志查看
```bash
# 后端日志
pm2 logs crm-api

# Nginx访问日志
tail -f /var/log/nginx/access.log

# Nginx错误日志
tail -f /var/log/nginx/error.log
```

### 性能监控
```bash
# PM2监控
pm2 monit

# 系统资源
htop
df -h
```

### 备份策略
```bash
# 数据库备份
mysqldump -u crm_user -p crm_system > backup_$(date +%Y%m%d).sql

# 文件备份
tar -czf backup_$(date +%Y%m%d).tar.gz /www/wwwroot/abc789.cn /www/wwwroot/backend
```

## 🔄 更新部署

### 更新前端
```bash
# 备份当前版本
cp -r /www/wwwroot/abc789.cn /www/backup/frontend_$(date +%Y%m%d)

# 部署新版本
cp -r /path/to/new/dist/* /www/wwwroot/abc789.cn/
```

### 更新后端
```bash
# 备份当前版本
cp -r /www/wwwroot/backend /www/backup/backend_$(date +%Y%m%d)

# 停止服务
pm2 stop crm-api

# 部署新版本
cp -r /path/to/new/backend/* /www/wwwroot/backend/
cd /www/wwwroot/backend
npm install --production

# 重启服务
pm2 start crm-api
```

## 📞 技术支持

如果在部署过程中遇到问题，请检查：
1. 服务器系统日志
2. 应用程序日志
3. 网络连接状态
4. 防火墙设置

部署完成后，您的CRM系统将在 https://abc789.cn 上运行！