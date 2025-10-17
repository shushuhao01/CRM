# 宝塔面板 + MySQL 部署指南

## 一、宝塔面板环境准备

### 1. 服务器要求
- **操作系统**：CentOS 7+ / Ubuntu 18+ / Debian 9+
- **内存**：至少 1GB（推荐 2GB+）
- **硬盘**：至少 20GB 可用空间
- **网络**：公网IP，开放 80、443、8888 端口

### 2. 安装宝塔面板
```bash
# CentOS 安装命令
yum install -y wget && wget -O install.sh http://download.bt.cn/install/install_6.0.sh && sh install.sh

# Ubuntu/Debian 安装命令
wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh
```

### 3. 登录宝塔面板
- 安装完成后记录面板地址、用户名和密码
- 通过浏览器访问：`http://你的服务器IP:8888`
- 首次登录建议修改默认端口和密码

## 二、环境软件安装

### 1. 安装必要软件
在宝塔面板 → 软件商店 → 一键安装：
- **Nginx** 1.20+ （Web服务器）
- **MySQL** 8.0+ （数据库）
- **PHP** 8.0+ （可选，用于phpMyAdmin）
- **Node.js** 18+ （后端API服务）
- **PM2** 管理器（Node.js进程管理）

### 2. MySQL 配置优化
进入 MySQL 管理 → 配置修改：
```ini
[mysqld]
# 字符集配置
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 性能配置
innodb_buffer_pool_size = 256M
max_connections = 200
query_cache_size = 32M
query_cache_type = 1

# 时区配置
default-time-zone = '+08:00'

# 安全配置
sql_mode = STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO
```

## 三、数据库创建和配置

### 1. 创建数据库
1. 进入宝塔面板 → 数据库 → 添加数据库
2. 数据库名：`crm_system`
3. 用户名：`crm_user`（不要使用root）
4. 密码：生成强密码并记录
5. 访问权限：本地服务器（127.0.0.1）

### 2. 导入数据库结构
1. 点击数据库名称进入 phpMyAdmin
2. 选择 `crm_system` 数据库
3. 点击"导入"选项卡
4. 上传 `bt_panel_setup.sql` 文件
5. 点击"执行"完成导入

### 3. 验证数据库
执行以下SQL验证安装：
```sql
-- 检查表是否创建成功
SHOW TABLES;

-- 检查默认数据
SELECT * FROM departments;
SELECT * FROM users;
SELECT * FROM system_configs;

-- 检查字符集
SHOW VARIABLES LIKE 'character_set%';
```

## 四、后端API部署

### 1. 创建网站
1. 宝塔面板 → 网站 → 添加站点
2. 域名：`api.yourdomain.com`（或使用IP:端口）
3. 根目录：`/www/wwwroot/crm-api`
4. PHP版本：纯静态（不需要PHP）

### 2. 上传后端代码
```bash
# 进入网站根目录
cd /www/wwwroot/crm-api

# 上传后端代码（通过FTP或宝塔文件管理器）
# 或者使用Git克隆
git clone https://github.com/your-repo/crm-backend.git .

# 安装依赖
npm install

# 创建环境配置文件
cp .env.example .env
```

### 3. 配置环境变量
编辑 `.env` 文件：
```env
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=crm_system
DB_USER=crm_user
DB_PASSWORD=你的数据库密码

# 服务配置
PORT=3001
NODE_ENV=production

# JWT配置
JWT_SECRET=你的JWT密钥
JWT_EXPIRES_IN=7d

# 跨域配置
CORS_ORIGIN=https://your-frontend-domain.com

# 文件上传配置
UPLOAD_PATH=/www/wwwroot/crm-api/uploads
MAX_FILE_SIZE=10485760

# 邮件配置（可选）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-email-password
```

### 4. 使用PM2启动服务
```bash
# 安装PM2（如果未安装）
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs crm-api

# 设置开机自启
pm2 startup
pm2 save
```

### 5. Nginx反向代理配置
在宝塔面板 → 网站 → 你的API站点 → 配置文件，添加：
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 处理跨域
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
    add_header Access-Control-Allow-Headers 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization';
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

## 五、前端部署

### 1. 构建前端项目
```bash
# 在本地开发环境
npm run build

# 上传dist目录到服务器
# 目标路径：/www/wwwroot/your-domain.com
```

### 2. Nginx配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /www/wwwroot/your-domain.com;
    index index.html;
    
    # 前端路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 六、SSL证书配置

### 1. 申请免费SSL证书
1. 宝塔面板 → 网站 → 你的域名 → SSL
2. 选择"Let's Encrypt"免费证书
3. 填写邮箱，点击申请
4. 开启"强制HTTPS"

### 2. 证书自动续期
宝塔面板会自动处理证书续期，无需手动操作。

## 七、安全配置

### 1. 防火墙设置
宝塔面板 → 安全：
- 开放端口：80, 443, 8888（面板端口）
- 关闭不必要的端口
- 设置SSH端口（非22）

### 2. 数据库安全
- 不要使用root用户连接应用
- 设置强密码
- 定期备份数据库
- 限制远程访问

### 3. 文件权限
```bash
# 设置网站目录权限
chown -R www:www /www/wwwroot/
chmod -R 755 /www/wwwroot/

# 设置敏感文件权限
chmod 600 /www/wwwroot/crm-api/.env
```

## 八、监控和维护

### 1. 系统监控
宝塔面板 → 监控：
- CPU使用率
- 内存使用率
- 磁盘使用率
- 网络流量

### 2. 日志管理
- Nginx访问日志：`/www/wwwroot/logs/`
- MySQL错误日志：宝塔面板 → MySQL → 日志
- PM2应用日志：`pm2 logs`

### 3. 备份策略
宝塔面板 → 计划任务：
- 数据库备份：每日凌晨2点
- 网站文件备份：每周一次
- 备份保留：30天

### 4. 性能优化
- 启用Gzip压缩
- 配置浏览器缓存
- 使用CDN加速
- 定期清理日志文件

## 九、故障排除

### 1. 常见问题
**数据库连接失败**：
- 检查数据库服务状态
- 验证连接参数
- 查看MySQL错误日志

**API服务无法访问**：
- 检查PM2进程状态
- 查看应用日志
- 验证Nginx配置

**前端页面空白**：
- 检查构建文件是否完整
- 查看浏览器控制台错误
- 验证API接口连通性

### 2. 调试命令
```bash
# 检查服务状态
systemctl status nginx
systemctl status mysql
pm2 status

# 查看日志
tail -f /var/log/nginx/error.log
tail -f /var/log/mysql/error.log
pm2 logs crm-api

# 测试数据库连接
mysql -u crm_user -p crm_system

# 测试API接口
curl http://localhost:3001/api/health
```

## 十、联系支持

如果在部署过程中遇到问题：
1. 查看宝塔面板官方文档
2. 检查系统日志和错误信息
3. 参考本项目的技术文档
4. 联系技术支持团队

---

**重要提醒**：
- 部署前请备份现有数据
- 修改所有默认密码
- 定期更新系统和软件
- 监控系统性能和安全状态