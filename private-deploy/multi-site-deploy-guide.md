# CRM 多站点部署指南（宝塔面板）

> 版本: v1.2 | 更新日期: 2026-04-27
> 适用: 宝塔面板 + Nginx + Node.js + PM2

---

## 一、项目架构总览

本项目包含 **4 个前端 + 1 个H5应用 + 1 个后端**，共需配置 **4 个域名**：

| 域名 | 用途 | 前端目录 | 说明 |
|------|------|---------|------|
| `crm.yunkes.com` | CRM 主应用 | `/www/wwwroot/CRM/dist` | 主要的 CRM 系统 |
| `crm.yunkes.com/h5/` | 企微H5移动端 | `/www/wwwroot/CRM/h5/dist` | 企微内置H5应用（应用主页/侧边栏） |
| `yunkes.com` / `www.yunkes.com` | 官方网站 | `/www/wwwroot/CRM/website/dist` | 产品介绍、注册页 |
| `admin.yunkes.com` | 管理后台 | `/www/wwwroot/CRM/admin/dist` | 平台超管后台 |
| `api.yunkes.com` | API 接口 | 无（反向代理） | 直接代理到后端 3000 端口 |

**重要**: 所有前端都是纯静态文件（Vite 构建后的 HTML/JS/CSS），**不需要启动前端服务器**。
只需要 **1 个后端进程**（PM2 管理，端口 3000），Nginx 把各站点的 `/api` 请求代理过去即可。

> **H5应用说明**: H5移动端应用部署在 CRM 主站的 `/h5/` 路径下，不需要单独域名。
> 在企微服务商后台配置「应用主页」和「桌面端独立主页」时，地址填写 `https://crm.yunkes.com/h5/`。
> H5使用 Hash 路由模式，实际首页为 `https://crm.yunkes.com/h5/#/app/home`。

### 1.1 中央服务器回调架构

**私有部署客户的 CRM 后端** 会主动向我们的中央服务器发起 **出站HTTP请求**，共12类：

| 分类 | 回调项 | 目标地址 |
|------|--------|----------|
| 授权 | 授权码激活、心跳(30分钟)、手动同步 | `api.yunkes.com/api/v1/admin/verify/license` |
| 配置 | 系统配置/功能开关/公告/版本更新 | `api.yunkes.com/api/v1/admin/public/system-config` |
| 企微 | 套餐定价、会话存档代购、AI额度 | `api.yunkes.com/api/v1/admin/wecom-management/*` |
| 短信 | 短信额度/模板 | `api.yunkes.com/api/v1/admin/sms-quota` |
| 获客 | 获客助手用量 | `api.yunkes.com/api/v1/admin/wecom-management/acquisition-usage` |
| 企微回调 | Suite回调(企微推送) | `api.yunkes.com/api/v1/wecom/suite/callback` |

> 这些都是**后端进程直接发出的出站请求**，不经过Nginx，因此Nginx不需要专门配置。
> 但私有部署服务器的防火墙出站规则必须放行 `api.yunkes.com:443`。
> 详见: `private-deploy/central-server-callback-guide.md`

---

## 二、部署前准备

### 2.1 确保后端已运行
```bash
cd /www/wwwroot/CRM/backend
pm2 status    # 确认 crm-backend 状态为 online
```

### 2.2 确保主站 CRM 已构建
```bash
# 如果已经通过 deploy.sh 部署过，dist 目录应该已存在
ls /www/wwwroot/CRM/dist/index.html
```

---

## 三、构建官网和管理后台

### 方式一：使用一键构建脚本（推荐）

项目根目录有 `build-all.sh` 脚本，一键构建所有前端：
```bash
cd /www/wwwroot/CRM
chmod +x build-all.sh
./build-all.sh
```

### 方式二：手动逐个构建

```bash
cd /www/wwwroot/CRM

# 1. 构建官网
cd website
npm install --registry https://registry.npmjs.org
npm run build
ls dist/index.html    # 验证构建成功

# 2. 构建管理后台
cd ../admin
npm install --registry https://registry.npmjs.org
npm run build
ls dist/index.html    # 验证构建成功

# 3. 构建H5企微移动端应用
cd ../h5
npm install --registry https://registry.npmjs.org
npx vite build        # 跳过类型检查直接构建
ls dist/index.html    # 验证构建成功

cd ..
```

> **注意**: H5构建使用 `npx vite build` 而非 `npm run build`，因为 `npm run build` 包含 `vue-tsc` 类型检查，
> 可能因 Vant 组件类型兼容性问题报错。直接使用 `npx vite build` 可跳过类型检查正常构建。

---

## 四、宝塔面板添加站点

需要在宝塔面板 **网站 → 添加站点** 中创建 4 个站点。

### 4.1 站点 1：CRM 主应用（已完成）
- **域名**: `crm.yunkes.com`
- **根目录**: `/www/wwwroot/CRM/dist`
- **SSL**: 申请证书

### 4.2 站点 2：官方网站
- **域名**: `yunkes.com` 和 `www.yunkes.com`
- **根目录**: `/www/wwwroot/CRM/website/dist`
- **SSL**: 申请证书（两个域名都要）

### 4.3 站点 3：管理后台
- **域名**: `admin.yunkes.com`
- **根目录**: `/www/wwwroot/CRM/admin/dist`
- **SSL**: 申请证书

### 4.4 站点 4：API 接口
- **域名**: `api.yunkes.com`
- **根目录**: `/www/wwwroot/CRM/backend/public`（随意，主要靠反向代理）
- **SSL**: 申请证书

> **注意**: 先创建站点并申请好 SSL 证书，再修改 Nginx 配置！

---

## 五、Nginx 配置

每个站点创建后，在宝塔面板 **站点设置 → 配置文件** 中修改。

**关键原则（每个站点都要做）**：
1. **修改 `root` 目录** — 宝塔默认指向 `public`，必须改为对应的 `dist` 目录
2. **修改 `index` 行** — 删除 `index.php` 和 `default.php` 等 PHP 相关文件名，只保留 `index.html index.htm`
3. **删除** `#PHP-INFO-START` 到 `#PHP-INFO-END` 之间的 PHP 配置（整段删掉，含注释行）
4. **删除** 宝塔自动生成的静态资源缓存规则（否则会导致上传图片无法显示，详见下方说明）
5. **删除** `#ERROR-PAGE-START` 到 `#ERROR-PAGE-END` 之间的错误页规则（避免与我们的路由冲突）
6. 保留宝塔自动生成的 SSL 相关配置（`#SSL-START` 到 `#SSL-END` 之间的内容）
7. 保留宝塔的证书验证（`#CERT-APPLY-CHECK`）、敏感文件/目录、`.well-known`、日志等规则
8. 所有 API 请求都代理到 `http://127.0.0.1:3000`

> **⚠️ 常见踩坑：宝塔默认生成的 root 和 PHP 配置会导致 500 错误**
>
> 宝塔创建站点后默认配置是：
> ```nginx
> root /www/wwwroot/CRM/website/public;                    # ❌ 应该是 dist
> index index.php index.html index.htm default.php ...;    # ❌ 删掉 PHP 相关
> include enable-php-82.conf;                              # ❌ 整段删除
> ```
> 如果不修改，会导致 **500 内部服务器错误**（PHP-FPM 处理静态页面失败）。

> **❗ 重要：必须删除宝塔默认的静态资源缓存规则**
>
> 宝塔面板创建站点后会自动添加如下规则：
> ```nginx
> location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$
> {
>     expires      30d;
>     error_log /dev/null;
>     access_log /dev/null;
> }
> location ~ .*\.(js|css)?$
> {
>     expires      12h;
>     error_log /dev/null;
>     access_log /dev/null;
> }
> ```
> **这两条规则必须删除！** 原因：Nginx 正则 location 优先于普通前缀 location，
> 当请求 `/uploads/products/xxx.jpg` 时，正则规则 `\.(jpg)$` 会先匹配，
> 将请求导向前端 dist 目录，而非后端 uploads 目录，导致 **404 图片加载失败**。
>
> 即使我们的配置使用了 `^~`（优先前缀匹配），为了安全起见仍建议删除这些规则。

### 5.1 crm.yunkes.com（CRM 主应用）

在宝塔自动生成的配置中：
1. **修改 `root`** 为 `/www/wwwroot/CRM/dist`（宝塔默认可能是 `public`）
2. **修改 `index`** 为 `index.html index.htm`（删掉 `index.php`、`default.php` 等）
3. **删除** `#PHP-INFO-START` 到 `#PHP-INFO-END` 之间的全部内容
4. **删除** `#ERROR-PAGE-START` 到 `#ERROR-PAGE-END` 之间的全部内容
5. **删除** `location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$` 和 `location ~ .*\.(js|css)?$` 这两条规则（含大括号内容）
6. 在 `#SSL-END` 后面添加以下内容：

```nginx
    # 文件上传大小
    client_max_body_size 50m;

    # 企业微信/微信验证文件（必须在 try_files 之前，否则会被回退到 index.html 导致 404）
    # root 指向项目根目录，确保验证文件不会因前端 dist 重建而丢失
    location ~* ^/(WW_verify_|MP_verify_).*\.txt$ {
        root /www/wwwroot/CRM;
        default_type text/plain;
    }

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

    # WebSocket
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

    # 上传文件访问（^~ 确保优先于任何正则匹配，防止图片请求被截获）
    location ^~ /uploads/ {
        alias /www/wwwroot/CRM/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
        add_header Access-Control-Allow-Origin *;
    }

    # 通话录音文件
    location ^~ /recordings/ {
        alias /www/wwwroot/CRM/backend/recordings/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # H5移动端
    location /h5/ {
        alias /www/wwwroot/CRM/h5/dist/;
        try_files $uri $uri/ /h5/index.html;
    }

    # 前端路由 (Vue Router history 模式)
    location / {
        try_files $uri $uri/ /index.html;
    }
```

### 5.2 yunkes.com / www.yunkes.com（官方网站）

在宝塔自动生成的配置中：
1. **修改 `root`** 为 `/www/wwwroot/CRM/website/dist`（⚠️ 宝塔默认是 `public`，必须改！）
2. **修改 `index`** 为 `index.html index.htm`（删掉 `index.php`、`default.php` 等）
3. **删除** `#PHP-INFO-START` 到 `#PHP-INFO-END` 之间的全部内容（不删会导致 500 错误）
4. **删除** `#ERROR-PAGE-START` 到 `#ERROR-PAGE-END` 之间的全部内容
5. **删除** 静态资源缓存规则（`gif|jpg|jpeg|png` 和 `js|css` 那两条，不删会导致图片 404）
6. 在 `#SSL-END` 后添加：

```nginx
    client_max_body_size 10m;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # 企业微信/微信验证文件（必须在 try_files 之前，否则会被回退到 index.html 导致 404）
    # root 指向项目根目录，确保验证文件不会因前端 dist 重建而丢失
    location ~* ^/(WW_verify_|MP_verify_).*\.txt$ {
        root /www/wwwroot/CRM;
        default_type text/plain;
    }

    # ❗ 上传文件访问（客服二维码、公众号二维码等由管理后台上传的图片）
    # ^~ 确保优先于任何正则匹配，防止宝塔静态资源缓存规则截获导致 404
    location ^~ /uploads/ {
        alias /www/wwwroot/CRM/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
        add_header Access-Control-Allow-Origin *;
    }

    # API 反向代理（官网注册、联系表单、系统配置等接口）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端构建产物缓存（带 hash 的 assets 文件）
    location ^~ /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
```

### 5.3 admin.yunkes.com（管理后台）

在宝塔自动生成的配置中：
1. **修改 `root`** 为 `/www/wwwroot/CRM/admin/dist`（宝塔默认是 `public`，必须改！）
2. **修改 `index`** 为 `index.html index.htm`（删掉 `index.php`、`default.php` 等）
3. **删除** `#PHP-INFO-START` 到 `#PHP-INFO-END` 之间的全部内容
4. **删除** `#ERROR-PAGE-START` 到 `#ERROR-PAGE-END` 之间的全部内容
5. **删除** 静态资源缓存规则（`gif|jpg|jpeg|png` 和 `js|css` 那两条）
6. 在 `#SSL-END` 后添加：

```nginx
    client_max_body_size 50m;

    # 企业微信/微信验证文件（必须在 try_files 之前，否则会被回退到 index.html 导致 404）
    # root 指向项目根目录，确保验证文件不会因前端 dist 重建而丢失
    location ~* ^/(WW_verify_|MP_verify_).*\.txt$ {
        root /www/wwwroot/CRM;
        default_type text/plain;
    }

    # API 反向代理（管理后台 API 前缀 /api/v1/admin）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    # WebSocket（管理后台实时通知）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # 上传文件（^~ 确保优先于正则匹配）
    location ^~ /uploads/ {
        alias /www/wwwroot/CRM/backend/uploads/;
        expires 7d;
        add_header Cache-Control "public";
        add_header Access-Control-Allow-Origin *;
    }

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
```

### 5.4 api.yunkes.com（API 接口）

```nginx
    client_max_body_size 50m;

    # 所有请求直接代理到后端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 86400;
    }
```

---

## 六、配置 CORS（后端 .env）

修改 `backend/.env` 中的 CORS 配置，添加所有域名：

```env
CORS_ORIGIN=https://crm.yunkes.com,https://yunkes.com,https://www.yunkes.com,https://admin.yunkes.com,https://api.yunkes.com
```

修改后重启后端：
```bash
pm2 restart crm-backend
```

---

## 七、验证部署

```bash
# 检查各站点是否可访问
curl -I https://crm.yunkes.com
curl -I https://yunkes.com
curl -I https://admin.yunkes.com
curl -I https://api.yunkes.com/api/v1/health
```

---

## 八、日常更新流程

```bash
cd /www/wwwroot/CRM

# 1. 保护本地 .env 配置
git stash

# 2. 拉取新代码
git pull origin main

# 3. 恢复 .env
git stash pop

# 4. 一键重新构建所有前端（含H5）+ 重启后端
chmod +x build-all.sh
./build-all.sh
# 或使用 deploy.sh（已包含H5构建步骤）
# chmod +x deploy.sh && ./deploy.sh
```

---

## 九、常见问题

### Q: 前端不需要启动服务器？
**不需要**。前端项目（CRM/官网/管理后台）都是纯静态页面，Vite 构建后输出到 `dist` 目录。
Nginx 直接作为 Web 服务器提供这些静态文件，不需要额外启动 Node.js 前端服务。

### Q: 为什么只需要一个后端进程？
三个前端应用共用同一个后端 API（端口 3000）。Nginx 把不同域名的 `/api` 请求都转发到同一个后端。

### Q: 构建报错 `.user.ini` 怎么办？
宝塔会在网站目录创建 `.user.ini` 文件，构建前需要解锁：
```bash
chattr -i /www/wwwroot/CRM/dist/.user.ini 2>/dev/null
rm -f /www/wwwroot/CRM/dist/.user.ini
# 其他 dist 目录同理
```

### Q: 构建报错 EACCES（esbuild / sass-embedded / dart 权限不足）？
`node_modules` 中的原生二进制文件（esbuild、dart-sass）在 Linux 上需要执行权限。
常见于：Windows 上 `npm install` 后同步到 Linux 服务器，或 `git clone` 后权限丢失。

**修复方法**（一次性给所有原生二进制加权限）：
```bash
# 根目录的原生二进制
chmod +x /www/wwwroot/CRM/node_modules/@esbuild/linux-x64/bin/esbuild
chmod +x /www/wwwroot/CRM/node_modules/sass-embedded-linux-x64/dart-sass/src/dart

# 如果子项目（admin/website）有自己的 node_modules，也需要执行：
# chmod +x /www/wwwroot/CRM/admin/node_modules/@esbuild/linux-x64/bin/esbuild
# chmod +x /www/wwwroot/CRM/website/node_modules/@esbuild/linux-x64/bin/esbuild
```

**如果 chmod 后仍然报错**，说明二进制是 Windows 版本，需要在服务器上重装：
```bash
cd /www/wwwroot/CRM
rm -rf node_modules
npm install --legacy-peer-deps --registry https://registry.npmmirror.com
# 重装后再 chmod +x 确保权限正确
chmod +x node_modules/@esbuild/linux-x64/bin/esbuild
chmod +x node_modules/sass-embedded-linux-x64/dart-sass/src/dart
```

### Q: SSL 证书怎么申请？
宝塔面板 → 网站 → 对应站点 → SSL → Let's Encrypt → 申请免费证书。
每个域名都需要单独申请。

### Q: 上传的图片显示不出来（加载失败）？
这是宝塔面板默认静态资源缓存规则导致的。检查方法：

1. **宝塔面板 → 网站 → 对应站点 → 配置文件**
2. 搜索 `gif|jpg|jpeg|png`，如果找到以下规则：
```nginx
location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$
{
    expires      30d;
    error_log /dev/null;
    access_log /dev/null;
}
```
3. **删除这些规则**，然后确保 `/uploads/` 使用了 `^~` 修饰符
4. 保存并重载 nginx：`nginx -t && nginx -s reload`

**原理**：Nginx 正则 location (`~`) 优先于普通前缀 location。
宝塔的 `\.(jpg)$` 规则会截获 `/uploads/xxx.jpg` 请求，将其导向前端 dist 目录，文件不存在则返回 404。
使用 `^~` 修饰符可让前缀匹配优先于正则，确保上传文件正确服务。

### Q: 配置后出现 500 内部服务器错误？
最常见原因是 **PHP 配置未删除** 或 **root 目录错误**。排查步骤：

1. 检查 `root` 是否指向正确的 `dist` 目录（不是 `public`）：
   - CRM: `/www/wwwroot/CRM/dist`
   - 官网: `/www/wwwroot/CRM/website/dist`
   - 管理后台: `/www/wwwroot/CRM/admin/dist`
2. 检查是否删除了 `#PHP-INFO-START` 到 `#PHP-INFO-END` 之间的内容（特别是 `include enable-php-XX.conf;`）
3. 检查 `index` 行是否还包含 `index.php`、`default.php` 等 PHP 文件名
4. 查看错误日志：`tail -20 /www/wwwlogs/对应域名.error.log`

### Q: 官网/管理后台上传的图片（二维码等）显示不出来？
除了上面提到的静态资源缓存规则外，还要确保**每个需要显示上传图片的站点**都配置了 `/uploads/` 映射：
```nginx
location ^~ /uploads/ {
    alias /www/wwwroot/CRM/backend/uploads/;
    expires 7d;
    add_header Cache-Control "public";
    add_header Access-Control-Allow-Origin *;
}
```
所有上传文件都存储在后端的 `backend/uploads/` 目录，CRM、官网、管理后台三个站点都需要这条规则。
