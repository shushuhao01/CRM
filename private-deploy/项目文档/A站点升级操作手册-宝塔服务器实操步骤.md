# A 站点升级操作手册 — 宝塔服务器实操步骤

> 文档性质：**可直接执行的操作手册**
> 编写日期：2026-06-28
> 适用对象：A 站点服务器（Ubuntu 24 / 宝塔面板 / 2核 1.6GB / 39GB）
> 前提条件：A 站点已有 git 仓库，通过 git pull 更新代码

---

## 执行顺序总览

```
备份数据库 → 停PM2 → git pull → 删多余目录 → 加swap
    → 构建前端 → 构建后端 → 改.env → 启动PM2(512M)
    → 装pm2-logrotate → 改Nginx → 浏览器验证
```

预计耗时：30-60 分钟（含 npm install 时间）

---

## 第1步：备份数据库

```bash
# SSH 登录 A 站点服务器

# 备份数据库（替换为实际的库名和密码）
mysqldump -uroot -p --single-transaction 你的数据库名 | gzip > /root/backup_a_$(date +%F).sql.gz

# 确认备份文件存在且大小合理
ls -lh /root/backup_a_*.sql.gz
```

⚠️ **不做备份不动手！** 这是唯一的保命绳。

---

## 第2步：停止旧后端服务

```bash
pm2 stop all
```

此时网站暂时不可用（用户看到 502），这是正常的。

---

## 第3步：拉取最新代码

```bash
# 进入项目目录（替换为实际路径）
cd /www/wwwroot/你的项目目录

# 保护本地 .env 配置不被覆盖
git stash

# 拉取最新代码
git pull origin main

# 恢复 .env
git stash pop
```

如果 `git stash pop` 有冲突，不要慌：
```bash
# 查看冲突文件
git status

# 通常是 backend/.env 冲突，直接用本地的：
git checkout --ours backend/.env
git add backend/.env
```

---

## 第4步：删除不需要的项目目录

A 站点是私有部署自用 CRM，不需要官网、管理后台等。

```bash
# 确保在项目根目录
cd /www/wwwroot/你的项目目录

# 删除官网
rm -rf website

# 删除管理后台
rm -rf admin

# 删除H5移动端（除非使用企业微信侧边栏）
rm -rf h5

# 删除前端源码（服务器不需要）
rm -rf src

# 删除根目录的前端 node_modules（节省空间，后面会重装）
rm -rf node_modules

# 确认删除后的剩余目录
ls
# 应该只剩：dist/  backend/  .git/  package.json  .env.production  等
```

---

## 第5步：添加 Swap（虚拟内存扩展）

> Swap 是用硬盘模拟内存。1.6GB 物理内存跑新版必须加 swap，否则会 OOM 崩溃。
> 这一步只需执行一次，后续升级不用重复。

```bash
# 先检查是否已有 swap
free -h
# 如果 Swap 行显示 0B，需要添加

# 创建 4GB swap 文件
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 写入开机自动挂载（永久生效）
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

# 验证
free -h
# 应看到：
# Mem:  1.6Gi  ...
# Swap: 4.0Gi  0B  4.0Gi
```

---

## 第6步：构建前端

### 方案A：在服务器上构建（推荐，一步到位）

```bash
cd /www/wwwroot/你的项目目录

# 安装前端依赖
npm install --registry https://registry.npmmirror.com

# 修改前端部署模式为私有部署
sed -i 's/VITE_DEPLOY_MODE=saas/VITE_DEPLOY_MODE=private/' .env.production

# 构建前端（生成 dist/ 目录）
npm run build

# 验证构建成功
ls dist/index.html

# 构建完毕后删除前端依赖（节省 300MB+ 空间）
rm -rf node_modules
```

> 如果服务器构建时内存不足报错（有了 swap 通常不会），改用方案B。

### 方案B：本地 Windows 构建后上传

```bash
# 在本地开发机执行：
# 1. 修改 .env.production 中 VITE_DEPLOY_MODE=private
# 2. npm run build
# 3. 通过宝塔面板「文件」上传 dist/ 目录到 A 站点对应位置
```

---

## 第7步：安装后端依赖 + 构建后端

```bash
cd /www/wwwroot/你的项目目录/backend

# 确认 Node 版本
node --version
# 需要 >= 22，如果不够：宝塔 → 软件商店 → Node.js版本管理器 → 安装 22.x

# 安装后端生产依赖（不装开发依赖，节省空间）
npm ci --omit=dev --registry https://registry.npmmirror.com

# 构建后端（TypeScript 编译为 JavaScript）
npm run build

# 验证构建成功
ls dist/app.js
```

---

## 第8步：配置后端 .env

```bash
cd /www/wwwroot/你的项目目录/backend

# 用 nano 或宝塔面板编辑 .env
nano .env
```

**必须检查/修改的配置项：**

```ini
# ======= 核心（必须改）=======
DEPLOY_MODE=private

# ======= 数据库（保持原来的，不要动）=======
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=原来的库名
DB_USERNAME=原来的用户名
DB_PASSWORD=原来的密码
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00

# ======= JWT（保持原来的，不要动）=======
JWT_SECRET=原来的值不要改

# ======= CORS（改为 A 站点域名）=======
CORS_ORIGIN=https://你的A站点域名

# ======= 授权（需要从B站点获取）=======
LICENSE_KEY=PRIVATE-XXXX-XXXX-XXXX-XXXX
LICENSE_SERVER=https://api.yunkes.com
CENTRAL_ADMIN_URL=https://admin.yunkes.com

# ======= 连接池（小服务器调小）=======
DB_CONNECTION_LIMIT=20

# ======= 自动迁移（默认开启，不用写也行）=======
# AUTO_MIGRATION=true
```

保存退出。

---

## 第9步：启动后端（带内存限制）

```bash
cd /www/wwwroot/你的项目目录/backend

# 清除旧的 PM2 进程
pm2 delete all

# 启动后端，限制最大 512MB 内存
pm2 start dist/app.js --name crm-backend --max-memory-restart 512M

# 立即查看启动日志（重点看自动迁移输出）
pm2 logs crm-backend --lines 200
```

**正常的日志应该显示：**

```
╔══════════════════════════════════════════════════╗
║       数据库自动迁移服务启动                      ║
╚══════════════════════════════════════════════════╝
📦 [自动迁移] 首次执行，开始备份当前数据库结构...
✅ [自动迁移] 结构备份完成
🔍 [自动迁移] 扫描 192 个实体，检查缺失表...
  📦 新建表: tenants
  📦 新建表: licenses
  ...
✅ [自动迁移] 新建了 XX 张表
  ➕ 补字段: customers.tenant_id
  ➕ 补字段: orders.tenant_id
  ...
✅ [自动迁移] 补全了 XX 个字段
📋 [自动迁移] 发现 11 个待执行的SQL迁移文件
  ✅ 迁移完成: ...
╔══════════════════════════════════════════════════╗
║  自动迁移完成                                    ║
╚══════════════════════════════════════════════════╝
✅ 数据库连接成功
🚀 服务器启动成功，端口: 3000
```

看到这些就说明升级成功。

```bash
# 确认运行正常
pm2 status

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup
# 按照终端提示执行输出的那行命令
```

---

## 第10步：安装 PM2 日志自动清理

```bash
# 安装日志轮转模块
pm2 install pm2-logrotate

# 配置参数
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# 验证
pm2 conf pm2-logrotate
```

---

## 第11步：检查/修改 Nginx 配置

宝塔面板 → 网站 → A 站点 → 配置文件

**需要确认有以下配置（没有就加上）：**

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
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_buffering off;
    }

    # WebSocket（新版必须加！旧版没有这个）
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
    location ^~ /uploads/ {
        alias /www/wwwroot/你的项目目录/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
        add_header Access-Control-Allow-Origin *;
    }

    # 录音文件
    location ^~ /recordings/ {
        alias /www/wwwroot/你的项目目录/backend/recordings/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # 前端路由（Vue Router history 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }
```

**必须删除的（如果有）：**
- `#PHP-INFO-START` 到 `#PHP-INFO-END` 之间的内容
- `location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$` 那段
- `location ~ .*\.(js|css)?$` 那段

```bash
# 验证并重载
nginx -t && nginx -s reload
```

---

## 第12步：浏览器验证

1. 打开 `https://你的A站点域名`
2. 首次会看到**授权码输入框** → 输入从 B 站点获取的授权码
3. 激活成功后 → **用原来的老账号登录**（不要用激活生成的新账号）
4. 检查：
   - [ ] 客户列表数据是否正常
   - [ ] 订单列表是否正常
   - [ ] 上传的图片/文件是否能显示
   - [ ] 新功能（如 SKU 商品管理）是否可用

```bash
# 服务器上确认资源状态
free -h        # 内存+swap 使用情况
pm2 monit      # 进程 CPU/内存实时监控
pm2 logs       # 查看有无报错
```

---

## 出问题时回滚

```bash
# 1. 停新版
pm2 stop crm-backend

# 2. 恢复数据库（如果数据有问题才需要）
gunzip < /root/backup_a_YYYY-MM-DD.sql.gz | mysql -uroot -p 你的数据库名

# 3. 回退代码到旧版本
cd /www/wwwroot/你的项目目录
git checkout 78d5e63b    # 旧版本 commit

# 4. 重新启动旧版后端
cd backend
npm run build
pm2 start dist/app.js --name crm-backend
```

---

## 注意事项清单

- ✅ 不要修改 `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD`（保持旧库连接）
- ✅ 不要修改 `JWT_SECRET`（改了全员掉线）
- ✅ `DEPLOY_MODE` 必须改为 `private`
- ✅ 前端 `.env.production` 的 `VITE_DEPLOY_MODE` 必须是 `private`
- ❌ 不要把旧数据的 tenant_id 批量改成某个租户 ID
- ❌ 不要用激活产生的新管理员账号操作（看到的是空数据）
- ❌ 不要从 Windows 直接上传 node_modules（bcrypt 等原生模块不兼容）
