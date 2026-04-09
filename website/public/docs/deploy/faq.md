## ❓ 部署常见问题

---

### 安装相关

**Q: 提示 "node 不是内部或外部命令"**
A: Node.js 没有安装成功或没有添加到环境变量。请重新安装 Node.js，Windows 安装时勾选 "Add to PATH"。Linux 用户执行 `source ~/.bashrc` 或重新开一个终端。

**Q: npm install 速度很慢或一直超时**
A: 请设置国内镜像加速：
```bash
npm config set registry https://registry.npmmirror.com
```

**Q: npm install 报错 node-gyp 或 compilation error**
A: 缺少编译工具。Ubuntu 执行 `sudo apt install build-essential`，CentOS 执行 `sudo yum install gcc-c++ make`，Windows 安装时勾选 "Tools for Native Modules"。

---

### 数据库相关

**Q: 提示 "Access denied for user 'root'" 数据库连接失败**
A: 检查 `backend/.env` 中的 `DB_PASSWORD` 是否正确。如果是 MySQL 8.0 且使用 root 账号，可能需要执行 `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';`

**Q: 提示 "Unknown database 'crm_db'"**
A: 数据库还未创建。请先登录 MySQL 执行 `CREATE DATABASE crm_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

---

### 服务运行相关

**Q: 端口 3000 被占用**
A: 修改 `backend/.env` 中的 `PORT=3001`（或其他空闲端口），同时修改 Nginx 反向代理中的 `proxy_pass` 端口，然后重启服务。

**Q: 访问网站显示 502 Bad Gateway**
A: 后端服务可能未启动。执行 `pm2 list` 查看是否有 crm-backend 进程。如果没有：
```bash
cd /www/wwwroot/CRM/backend
pm2 start dist/server.js --name crm-backend
```

**Q: 访问显示空白页**
A: 检查 Nginx 网站根目录是否指向 `dist` 目录，以及 Nginx 配置中是否有 `try_files $uri $uri/ /index.html;`

**Q: PM2 服务异常**
A: 常用排查命令：
```bash
pm2 status        # 查看进程状态
pm2 logs          # 查看日志
pm2 restart all   # 重启所有服务
pm2 monit         # 实时监控
```

---

### 激活与授权相关

**Q: 授权码激活失败，提示"授权码验证失败"**
A: ① 检查授权码是否完整复制（注意前后不要有空格）；② 检查服务器是否能访问外网（授权需要在线验证）；③ 联系客服确认授权码状态。

**Q: 忘记了首次激活时的管理员密码**
A: 管理员密码仅首次激活展示一次，不会再次显示。可以通过以下方式重置：
```bash
cd /www/wwwroot/CRM/backend
node create-admin-user.js
```
或联系技术支持协助重置。

---

### 升级与维护

**Q: 如何升级系统？**
A: 升级步骤：
1. 备份数据库：`mysqldump -u root -p crm_db > backup_$(date +%Y%m%d).sql`
2. 备份当前代码目录
3. 拉取最新代码：`cd /www/wwwroot/CRM && git pull`（或下载新版本覆盖）
4. 重新安装依赖：`npm install && npm run build && cd backend && npm install && npm run build`
5. 重启服务：`pm2 restart all`

**Q: 如何备份数据？**
A: 建议定期备份：
```bash
# 数据库备份
mysqldump -u root -p crm_db > backup_$(date +%Y%m%d).sql

# 文件备份（上传的附件等）
tar -czf uploads_backup.tar.gz uploads/
```
建议配置 crontab 每日自动备份。

**Q: 如何配置域名和 HTTPS？**
A:
1. 将域名 DNS 解析到服务器 IP（添加 A 记录）
2. 修改 Nginx 配置中的 `server_name` 为您的域名
3. 申请 SSL 证书（宝塔面板或 certbot）
4. 重启 Nginx

**Q: 系统运行缓慢？**
A:
1. 检查服务器资源：`top` 或 `htop`
2. 检查 Node.js 进程：`pm2 monit`
3. 检查 MySQL 慢查询
4. 考虑升级服务器配置或增加内存
