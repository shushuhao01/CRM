# 云客 CRM — 私有部署交付指南

**版本**: 1.8.0  
**文档日期**: 2026-04-29  
**机密等级**: 🟡 运营方内部文档（不随交付包分发）

---

## 目录

1. [交付概述](#1-交付概述)
2. [交付内容清单](#2-交付内容清单)
3. [不交付内容（重要）](#3-不交付内容重要)
4. [方式一：源码交付](#4-方式一源码交付)
5. [方式二：Docker 容器交付](#5-方式二docker-容器交付)
6. [方式三：预构建压缩包交付](#6-方式三预构建压缩包交付)
7. [环境变量配置说明](#7-环境变量配置说明)
8. [客户侧部署流程](#8-客户侧部署流程)
9. [许可证与激活](#9-许可证与激活)
10. [交付检查清单](#10-交付检查清单)
11. [售后与升级](#11-售后与升级)

---

## 1. 交付概述

### 1.1 私有部署 vs SaaS

| 项目 | SaaS 版本 | 私有部署版本 |
|------|-----------|-------------|
| 部署位置 | 我方服务器 | 客户自有服务器 |
| 部署模式 | `DEPLOY_MODE=saas` | `DEPLOY_MODE=private` |
| 数据存储 | 多租户共享数据库 | 客户独立数据库 |
| 官网/Admin | 我方运营 | **不交付** |
| 系统激活 | 租户注册 | 授权码激活（回调我方验证） |
| 升级方式 | 我方统一升级 | 客户手动更新或远程协助 |

### 1.2 交付方式对比

| 交付方式 | 适用场景 | 技术门槛 | 优点 | 缺点 |
|----------|---------|---------|------|------|
| **源码交付**（GitHub） | 有开发能力的客户 | 高 | 可二次开发 | 需要构建环境 |
| **Docker 容器交付** | 推荐大多数客户 | 低 | 一键部署、环境一致 | 需要 Docker |
| **预构建压缩包** | 无 Docker 环境的客户 | 中 | 免构建 | 需手动配置 Nginx |

---

## 2. 交付内容清单

### 2.1 核心交付物

```
CRM-private-v1.8.0/
├── src/                          # CRM 前端源码
├── backend/                      # 后端 API 源码
│   ├── src/                     #   TypeScript 源码
│   ├── package.json
│   ├── tsconfig.json
│   ├── ecosystem.config.js      #   PM2 配置
│   └── .env                     #   环境变量模板（占位符）
├── database/                     # 数据库脚本
│   ├── schema.sql               #   完整建库 SQL
│   └── migration-*.sql          #   增量迁移
├── private-deploy/               # 部署工具
│   ├── README.md                #   部署指南（面向客户）
│   ├── install.sh               #   Linux 一键安装
│   ├── install.bat              #   Windows 一键安装
│   ├── init-mysql-database.js   #   数据库初始化
│   ├── nginx.conf.template      #   Nginx 配置模板
│   └── multi-site-deploy-guide.md  # 多站点部署指南
├── public/                       # 静态资源
├── docker/                       # Docker 部署文件（容器交付时包含）
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── .env.example
├── package.json                  # 前端依赖
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.ts
├── index.html
├── env.d.ts
├── nginx.conf.example           # Nginx 示例
└── deploy.sh                    # 部署脚本
```

### 2.2 预构建交付物（方式三额外包含）

```
CRM-private-v1.8.0/
├── dist/                         # CRM 前端构建产物（已构建好）
├── backend/dist/                 # 后端编译产物（已编译好）
└── ...（同上，但客户无需执行 npm install / npm run build）
```

---

## 3. 不交付内容（重要）

以下内容 **绝对不能** 包含在交付包中：

| 排除项 | 原因 |
|--------|------|
| `website/` | 官方网站（SaaS 运营方专属，含注册/套餐页面） |
| `admin/` | 管理后台（运营方超管面板，含租户管理/许可证签发） |
| `h5/` | H5 移动端（暂不交付，独立产品线） |
| `crmAPP/` | APP 应用（独立仓库，不含在交付中） |
| `wecom-program/` | 企微侧边栏 Python 服务（需独立部署，按需交付） |
| `docs/` | 内部开发文档 |
| `重要文档/` | 内部分析报告 |
| `tests/` | 测试用例（客户不需要） |
| `scripts/` | 开发工具脚本 |
| `.git/` | Git 历史（源码交付用独立仓库） |
| `backend/scripts/generate-saas-license.js` | 🔴 SaaS 许可证签发脚本（含 RSA 私钥） |
| `private-deploy/SaaS-license-guide.md` | SaaS 许可证文档（运营方专属） |
| `private-deploy/delivery-guide.md` | 本文档（运营方内部） |
| `private-deploy/clean-for-delivery.bat` | 清理脚本（运营方工具） |
| `private-deploy/payment-config-guide.md` | 收款配置（运营方专属） |
| `private-deploy/central-server-callback-guide.md` | 中心服务器回调（运营方专属） |
| `sync-*.ps1` / `push-*.ps1` / `backup-*.ps1` | 仓库同步/备份脚本 |
| `setup-remotes.ps1` / `create-release-package.ps1` | 开发脚本 |
| `deploy.ps1` / `start-backend-dev.ps1` | Windows 开发脚本 |
| `check-ports.ps1` / `check-dev-environment.bat` | 开发工具 |
| `start-all-dev.ps1` / `start-dev-concurrent.bat` | 开发启动脚本 |
| `.coding-standards.md` / `.dev-guide.md` / `.dev-rules.md` | 开发规范 |
| `vitest.config.ts` | 测试配置 |
| `data/` | 本地开发数据库 |
| 所有 `*.log` 文件 | 日志 |
| `node_modules/` | 依赖目录（客户自行安装） |
| `MP_verify_*.txt` / `WW_verify_*.txt` | 我方微信验证文件 |

---

## 4. 方式一：源码交付

### 4.1 GitHub 交付仓库准备

使用独立的 GitHub 仓库交付源码（不是开发主仓库）。

**仓库结构建议：**
```
github.com/your-org/crm-private-deploy
├── main 分支 → 最新稳定版
├── release/v1.8.0 分支 → 版本快照
└── tags: v1.8.0, v1.8.1, ...
```

### 4.2 源码打包脚本

在项目根目录执行 `private-deploy/build-delivery-package.sh`，脚本会自动：

1. 创建临时目录
2. 复制交付文件（排除不交付项）
3. 重置 `backend/.env` 为模板占位符
4. 设置 `DEPLOY_MODE=private`
5. 打包为 `CRM-private-v1.8.0.tar.gz`

```bash
cd private-deploy
chmod +x build-delivery-package.sh
./build-delivery-package.sh
```

### 4.3 推送到交付仓库

```bash
# 初次推送
cd /tmp/CRM-private-v1.8.0
git init
git remote add origin git@github.com:your-org/crm-private-deploy.git
git add .
git commit -m "release: v1.8.0 私有部署版本"
git tag v1.8.0
git push -u origin main --tags

# 后续更新
# 先用打包脚本生成新版本，然后覆盖仓库内容
```

### 4.4 客户获取方式

```bash
# 客户克隆
git clone https://github.com/your-org/crm-private-deploy.git CRM
cd CRM

# 或下载指定版本
git clone -b v1.8.0 --depth 1 https://github.com/your-org/crm-private-deploy.git CRM
```

---

## 5. 方式二：Docker 容器交付

### 5.1 架构说明

```
┌──────────────────────────────────────────┐
│           docker-compose.yml             │
│                                          │
│  ┌─────────────┐  ┌──────────────────┐   │
│  │  crm-web    │  │  crm-api         │   │
│  │  (Nginx)    ├──►  (Node.js)       │   │
│  │  :80 / :443 │  │  :3000           │   │
│  └─────────────┘  └────────┬─────────┘   │
│                            │             │
│                   ┌────────▼─────────┐   │
│                   │  crm-db          │   │
│                   │  (MySQL 8)       │   │
│                   │  :3306           │   │
│                   └──────────────────┘   │
│                                          │
│  Volumes:                                │
│    crm-db-data    → MySQL 数据持久化     │
│    crm-uploads    → 上传文件持久化       │
│    crm-logs       → 日志持久化           │
└──────────────────────────────────────────┘
```

### 5.2 容器组成

| 容器 | 基础镜像 | 职责 | 端口 |
|------|---------|------|------|
| `crm-web` | `nginx:alpine` | 前端静态文件 + API 反向代理 | 80 / 443 |
| `crm-api` | `node:22-alpine` | 后端 API 服务 | 3000（内部） |
| `crm-db` | `mysql:8.0` | MySQL 数据库 | 3306（内部） |

### 5.3 构建 Docker 镜像

```bash
# 在项目根目录执行
cd docker

# 构建所有镜像
docker-compose build

# 或分别构建
docker build -f Dockerfile.backend -t crm-api:1.8.0 ..
docker build -f Dockerfile.frontend -t crm-web:1.8.0 ..
```

### 5.4 导出镜像（离线交付）

如果客户服务器无法访问公网 Docker Registry：

```bash
# 导出为 tar 文件
docker save crm-api:1.8.0 crm-web:1.8.0 mysql:8.0 | gzip > crm-docker-v1.8.0.tar.gz

# 客户侧导入
docker load < crm-docker-v1.8.0.tar.gz
```

### 5.5 推送到 Docker Registry（在线交付）

```bash
# 推送到 Docker Hub 或私有 Registry
docker tag crm-api:1.8.0 your-registry/crm-api:1.8.0
docker tag crm-web:1.8.0 your-registry/crm-web:1.8.0
docker push your-registry/crm-api:1.8.0
docker push your-registry/crm-web:1.8.0
```

### 5.6 客户侧启动

```bash
# 1. 创建部署目录
mkdir -p /opt/crm && cd /opt/crm

# 2. 复制 docker-compose.yml 和 .env
# （从交付包或 Registry 获取）

# 3. 修改 .env 文件
#    设置数据库密码、JWT密钥、域名等

# 4. 启动
docker-compose up -d

# 5. 初始化数据库（首次）
docker exec crm-api node private-deploy/init-mysql-database.js --auto

# 6. 查看状态
docker-compose ps
docker-compose logs -f
```

---

## 6. 方式三：预构建压缩包交付

适用于客户不使用 Docker、也不想自行构建的场景。

### 6.1 打包流程

```bash
# 1. 在开发机上构建
npm install && npm run build              # CRM 前端
cd backend && npm install && npm run build  # 后端

# 2. 运行交付打包脚本
cd private-deploy
./build-delivery-package.sh --prebuilt

# 生成：CRM-private-v1.8.0-prebuilt.tar.gz
# 包含 dist/ 和 backend/dist/，客户只需安装后端依赖
```

### 6.2 客户侧部署

```bash
# 解压
tar -xzf CRM-private-v1.8.0-prebuilt.tar.gz
cd CRM-private-v1.8.0

# 只需安装后端运行时依赖
cd backend
npm install --production

# 配置 .env 并启动
./private-deploy/install.sh
```

---

## 7. 环境变量配置说明

### 7.1 交付时的 backend/.env 模板

交付包中的 `backend/.env` 必须只含占位符，不能包含真实值：

```ini
# ==================== CRM 系统环境配置 ====================
# ⚠️ 部署时请将所有 your_xxx 占位符替换为实际值

# 服务器配置
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# ⚠️ 私有部署模式（勿改）
DEPLOY_MODE=private

# ==================== 数据库配置 ====================
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00

# ==================== JWT 配置 ====================
# ⚠️ 请生成独立密钥: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 加密配置
BCRYPT_ROUNDS=12

# ==================== CORS 配置 ====================
CORS_ORIGIN=https://crm.your-domain.com
CORS_CREDENTIALS=true

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# ==================== 日志配置 ====================
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# ==================== 安全配置 ====================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=3000
HELMET_ENABLED=true
COMPRESSION_ENABLED=true

# ==================== 部署配置 ====================
BAOTA_PANEL=false
STATIC_PATH=../dist
UPLOAD_PATH=./uploads
```

### 7.2 前端环境变量

交付包中的 `.env.production` 内容：

```ini
VITE_API_BASE_URL=/api/v1
NODE_ENV=production
VITE_DEPLOY_MODE=private
```

> 前端使用相对路径 `/api/v1`，通过 Nginx 反向代理，无需修改。

---

## 8. 客户侧部署流程

### 8.1 Docker 部署（推荐）

```
客户收到交付物 → 修改 .env → docker-compose up -d → 浏览器访问 → 输入授权码激活 → 完成
```

**详细步骤：**

1. **安装 Docker 和 Docker Compose**
   ```bash
   # CentOS
   yum install -y docker-ce docker-compose-plugin
   systemctl start docker && systemctl enable docker
   
   # Ubuntu
   apt-get install -y docker.io docker-compose-v2
   systemctl start docker && systemctl enable docker
   ```

2. **上传并解压交付包**
   ```bash
   mkdir -p /opt/crm && cd /opt/crm
   tar -xzf crm-docker-v1.8.0.tar.gz
   ```

3. **修改环境配置**
   ```bash
   cp .env.example .env
   nano .env
   # 修改: MYSQL_ROOT_PASSWORD, JWT_SECRET, CORS_ORIGIN 等
   ```

4. **启动服务**
   ```bash
   docker-compose up -d
   ```

5. **验证**
   ```bash
   docker-compose ps         # 确认 3 个容器都 running
   curl http://localhost/api/v1/health  # 健康检查
   ```

6. **访问系统**
   - 浏览器打开 `http://服务器IP` 或绑定的域名
   - 输入授权码激活
   - 使用默认管理员账号登录

### 8.2 源码 / 压缩包部署

参见 `private-deploy/README.md`（随交付包分发的面向客户文档）。

---

## 9. 许可证与激活

### 9.1 激活流程

```
客户部署完成 → 打开登录页 → 输入授权码
      ↓
CRM后端 → 调用运营方中心服务器验证授权码
      ↓
验证通过 → 自动创建管理员账号 → 系统可用
```

### 9.2 授权码格式

```
PRIVATE-XXXX-XXXX-XXXX-XXXX
```

### 9.3 授权码签发

在运营方管理后台（admin.yourdomain.com）签发：
- 管理后台 → 租户管理 → 创建私有部署租户 → 生成授权码
- 设置有效期、功能模块、用户数限制等

### 9.4 离线激活（可选）

如客户服务器无法访问公网，可提供离线激活码（通过 SaaS 许可证脚本生成）。

---

## 10. 交付检查清单

### 10.1 打包前检查

- [ ] `DEPLOY_MODE` 设为 `private`
- [ ] `backend/.env` 所有值为占位符（无真实密码/密钥）
- [ ] `.env.production` 中 `VITE_DEPLOY_MODE=private`
- [ ] `backend/scripts/generate-saas-license.js` **已排除**
- [ ] `website/`、`admin/`、`h5/`、`crmAPP/` **已排除**
- [ ] `docs/`、`重要文档/`、`tests/`、`scripts/` **已排除**
- [ ] `.git/` 目录 **已排除**（源码交付用独立仓库）
- [ ] `node_modules/` **已排除**
- [ ] 无 `*.log` 文件
- [ ] 无 `data/*.db` 本地数据库
- [ ] 无 `MP_verify_*.txt` / `WW_verify_*.txt` 验证文件
- [ ] 无 `sync-*.ps1`、`backup-*.ps1`、`deploy.ps1` 等开发脚本
- [ ] 无 `.coding-standards.md`、`.dev-guide.md`、`.dev-rules.md`
- [ ] `database/schema.sql` 包含最新表结构
- [ ] `private-deploy/install.sh` 可正常执行

### 10.2 Docker 镜像检查

- [ ] `crm-web` 容器能正常访问前端页面
- [ ] `crm-api` 容器 `/api/v1/health` 返回 200
- [ ] `crm-db` 容器 MySQL 服务正常
- [ ] `docker-compose up -d` 全部 3 个容器 running
- [ ] 上传文件持久化（重启容器后文件仍在）
- [ ] 数据库数据持久化（重启容器后数据仍在）
- [ ] 日志正常输出到 volume

### 10.3 功能验证

- [ ] 授权码激活流程正常
- [ ] 管理员登录成功
- [ ] 客户管理 CRUD 正常
- [ ] 订单创建/审核流程正常
- [ ] 文件上传/下载正常
- [ ] WebSocket 连接正常（消息通知）
- [ ] 前端路由刷新不 404

---

## 11. 售后与升级

### 11.1 版本升级流程

**Docker 交付：**
```bash
# 客户拉取新镜像
docker-compose pull
docker-compose up -d

# 如有数据库迁移
docker exec crm-api node -e "require('./dist/migration-runner.js').run()"
```

**源码交付：**
```bash
# 客户拉取新代码
git pull origin main

# 重新构建
npm install && npm run build
cd backend && npm install && npm run build

# 执行数据库迁移
mysql -u user -p dbname < database/migration-v1.8.1.sql

# 重启服务
pm2 restart crm-backend
```

### 11.2 数据库迁移

每次升级附带增量迁移 SQL：
```
database/migration-v1.8.1.sql
database/migration-v1.9.0.sql
...
```

客户按版本顺序执行即可。

### 11.3 技术支持

- 提供部署文档 + FAQ
- 远程协助部署（按需收费）
- 系统故障远程排查

---

## 附录 A：交付物文件大小参考

| 交付物 | 预估大小 |
|--------|----------|
| 源码包（不含 node_modules） | ~15 MB |
| 预构建包（含 dist） | ~30 MB |
| Docker 镜像包（3 个镜像） | ~500 MB |
| Docker 镜像包（含 MySQL 镜像） | ~800 MB |

## 附录 B：私有部署与 SaaS 代码差异

私有部署版本的代码与 SaaS 版本 **完全相同**，区别仅在环境变量：

| 环境变量 | SaaS | 私有部署 |
|----------|------|----------|
| `DEPLOY_MODE` | `saas` | `private` |
| `VITE_DEPLOY_MODE` | `saas` | `private` |

系统根据 `DEPLOY_MODE` 自动切换行为：
- **saas**: 登录页显示租户编码输入框、多租户数据隔离
- **private**: 登录页显示授权码激活入口、单租户模式
