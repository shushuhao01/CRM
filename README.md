# 云客 CRM — 智能销售管理系统

> **v1.8.0** · 基于 Vue 3 + TypeScript + Node.js 的现代化 SaaS CRM 系统，专为中小企业私域销售管理设计。

界面简约大气，操作便捷，功能全面。支持 **SaaS 多租户** 和 **私有化部署** 两种模式。

---

## 目录

- [项目简介](#项目简介)
- [系统架构](#系统架构)
- [功能模块](#功能模块)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [开发命令](#开发命令)
- [生产部署](#生产部署)
- [环境变量说明](#环境变量说明)
- [数据库](#数据库)
- [脚本工具](#脚本工具)
- [文档索引](#文档索引)
- [许可证](#许可证)

---

## 项目简介

云客 CRM 是一套面向中小企业的全链路销售管理系统，涵盖 **客户管理、订单流转、财务代收、物流追踪、业绩考核、企业微信集成** 等核心场景。系统采用 Mono-repo 架构，包含以下子应用：

| 子应用 | 目录 | 说明 | 默认端口 |
|--------|------|------|----------|
| **CRM 主系统** | `src/` | 销售人员日常操作前端 | 5173 |
| **管理后台** | `admin/` | 运营方/超级管理员管理面板 | 5174 |
| **官方网站** | `website/` | 产品展示 & 租户注册 | 5175 |
| **H5 移动端** | `h5/` | 移动端适配页面 | 5176 |
| **后端 API** | `backend/` | RESTful API + WebSocket 服务 | 3000 |
| **企微侧边栏** | `wecom-program/` | Python 服务（企微会话存档 SDK） | — |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx 反向代理                        │
│   crm.domain.com  │ admin.domain.com │ www.domain.com       │
└────────┬──────────┴────────┬─────────┴────────┬─────────────┘
         │                   │                   │
    ┌────▼────┐        ┌─────▼─────┐       ┌────▼────┐
    │ CRM 前端 │        │ Admin 前端 │       │ 官网前端 │   H5 前端
    │ Vue 3    │        │ Vue 3     │       │ Vue 3   │   Vue 3
    └────┬────┘        └─────┬─────┘       └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │ /api/v1
                    ┌────────▼────────┐
                    │  Node.js 后端    │
                    │  Express + ORM  │
                    │  Socket.IO      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
        │  MySQL 8   │ │ 阿里云 OSS │ │ 第三方 API │
        │  MariaDB   │ │ 文件存储   │ │ 短信/快递  │
        └───────────┘ └───────────┘ └───────────┘
```

---

## 功能模块

### CRM 主系统

| 模块 | 功能 |
|------|------|
| **客户管理** | 客户信息 CRUD、分组 & 标签、跟进记录、客户分享/转移、隐私脱敏、客户公海 |
| **订单管理** | 订单创建与审核、审核工作流（待审核/通过/拒绝/撤销）、批量审核、订单状态流转 |
| **财务管理** | 代收管理（COD）、代收返款、改代收、代收取消申请、财务统计 |
| **物流管理** | 多快递公司对接（顺丰/圆通等）、物流轨迹实时追踪、批量发货、发货地址管理 |
| **产品管理** | 产品目录、分类管理、虚拟商品、产品库存 |
| **业绩管理** | 业绩目标设定、销售排行、业绩报表、佣金阶梯 |
| **数据分析** | 多维度仪表盘、ECharts 可视化、销售漏斗、趋势分析 |
| **通话管理** | 通话记录、录音管理、通话配置、Webhook 回调 |
| **短信管理** | 阿里云短信集成、短信模板、自动发送规则、短信配额/充值 |
| **消息通知** | 站内消息、通知订阅、消息已读状态 |
| **售后服务** | 售后工单、服务跟进、客服权限 |
| **系统设置** | 角色/权限管理、部门管理、用户管理、系统配置、操作日志 |

### 企业微信集成

| 模块 | 功能 |
|------|------|
| **客户同步** | 企微客户 ↔ CRM 客户自动匹配/同步 |
| **会话存档** | 聊天记录存档、合规审计 |
| **AI 助手** | AI 模型配置、智能质检、话术推荐 |
| **渠道活码** | 活码创建/统计、智能分配规则 |
| **客户群** | 群管理、群发消息、群欢迎语 |
| **企微收款** | 二维码收款、退款管理、收款记录 |
| **侧边栏应用** | 企微侧边栏嵌入 CRM 信息 |
| **话术库** | 快捷回复、话术分类、脚本管理 |
| **敏感词监控** | 敏感词规则、命中告警 |

### 管理后台（Admin）

- 租户管理 & SaaS 许可证签发
- 套餐/增值服务管理
- 全局系统配置
- 操作日志审计
- 公告管理

### 官方网站

- 产品介绍 & 功能展示
- 在线注册 & 套餐选购
- 帮助中心

---

## 技术栈

### 前端（CRM / Admin / Website / H5）

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.5+ | 渐进式 UI 框架 |
| TypeScript | 5.7+ | 类型安全 |
| Vite | 5.4+ | 构建 & 开发服务器 |
| Element Plus | 2.3+ | UI 组件库 |
| Pinia | 3.0+ | 状态管理 |
| Vue Router | 4.5+ | 路由管理 |
| ECharts | 5.6+ | 图表可视化 |
| Axios | 1.12+ | HTTP 客户端 |
| Socket.IO Client | 4.8+ | WebSocket 实时通信 |
| Sass | — | CSS 预处理器 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 22+ | JavaScript 运行时 |
| TypeScript | 5.7+ | 类型安全 |
| Express | 4.22+ | Web 框架 |
| TypeORM | 0.3+ | ORM（120+ 实体） |
| MySQL / MariaDB | 8.0+ / 10.6+ | 关系型数据库 |
| Socket.IO | 4.8+ | WebSocket 服务端 |
| Winston | 3.11+ | 日志系统 |
| JWT | — | 身份认证 |
| Helmet / CORS | — | 安全中间件 |
| Multer | — | 文件上传 |
| node-cron | — | 定时任务 |
| Nodemailer | — | 邮件发送 |

### 企微侧边栏服务

| 技术 | 用途 |
|------|------|
| Python | 企微会话存档 SDK |
| Docker | 容器化部署 |

### 部署 & 运维

| 技术 | 用途 |
|------|------|
| Nginx | 反向代理 & 静态文件托管 |
| PM2 | Node.js 进程管理 |
| 宝塔面板 | 服务器可视化管理 |
| Let's Encrypt | SSL 证书 |

---

## 项目结构

```
CRM/
├── src/                          # CRM 主系统前端
│   ├── api/                      #   API 接口定义
│   ├── components/               #   公共组件（DynamicTable 等）
│   ├── views/                    #   页面视图
│   │   ├── Customer/             #     客户管理
│   │   ├── Order/                #     订单管理 & 审核
│   │   ├── Finance/              #     财务管理 & 代收
│   │   ├── Logistics/            #     物流管理
│   │   ├── Product/              #     产品管理
│   │   ├── Performance/          #     业绩管理
│   │   ├── Data/                 #     数据分析
│   │   ├── Service/              #     售后服务
│   │   ├── Wecom/                #     企业微信（15+ 子模块）
│   │   ├── System/               #     系统设置
│   │   ├── Dashboard.vue         #     仪表盘
│   │   └── Login.vue             #     登录页
│   ├── stores/                   #   Pinia 状态管理
│   ├── router/                   #   路由配置
│   ├── services/                 #   业务服务层
│   └── utils/                    #   工具函数
│
├── backend/                      # 后端 API 服务
│   ├── src/
│   │   ├── entities/             #   TypeORM 实体（120+）
│   │   ├── routes/               #   路由（50+ 模块）
│   │   │   ├── orders/           #     订单相关路由
│   │   │   ├── customers/        #     客户相关路由
│   │   │   ├── logistics/        #     物流相关路由
│   │   │   ├── calls/            #     通话相关路由
│   │   │   ├── wecom/            #     企微相关路由（30+）
│   │   │   ├── admin/            #     管理后台 API（35+）
│   │   │   ├── mobile/           #     移动端 API
│   │   │   ├── public/           #     公开 API（注册/官网）
│   │   │   └── ...
│   │   ├── middleware/           #   中间件（鉴权/租户隔离等）
│   │   ├── config/              #   配置（数据库/日志/定时任务）
│   │   └── utils/               #   工具函数
│   ├── uploads/                 #   文件上传目录
│   ├── logs/                    #   日志输出
│   ├── ecosystem.config.js      #   PM2 进程配置
│   └── .env                     #   环境变量（部署时修改）
│
├── admin/                        # 管理后台前端
│   └── src/                     #   独立 Vue 3 项目
│
├── website/                      # 官方网站前端
│   └── src/                     #   独立 Vue 3 项目
│
├── h5/                           # H5 移动端前端
│   └── src/                     #   独立 Vue 3 项目
│
├── wecom-program/                # 企微侧边栏 Python 服务
│   ├── app.py                   #   主程序
│   ├── sdk/                     #   企微 SDK
│   └── Dockerfile               #   Docker 构建文件
│
├── database/                     # 数据库脚本
│   ├── schema.sql               #   完整建库 SQL
│   ├── migration-*.sql          #   增量迁移脚本
│   └── README.md                #   数据库文档
│
├── private-deploy/               # 私有部署资料
│   ├── multi-site-deploy-guide.md  # 多站点部署指南
│   ├── nginx.conf.template      #   Nginx 配置模板
│   ├── install.sh / install.bat #   一键安装脚本
│   └── init-mysql-database.js   #   数据库初始化
│
├── scripts/                      # 工具脚本
├── tests/                        # 测试用例
│
├── deploy.sh                     # Linux 一键部署脚本
├── build-all.sh                  # 全量构建脚本
├── build-local.bat / .sh         # 本地构建脚本
├── start-all-dev.ps1             # Windows 一键启动开发环境
├── start-dev-local.bat           # Windows 开发启动（bat）
├── nginx.conf.example            # Nginx 配置示例
│
├── package.json                  # 前端依赖 & 脚本
├── vite.config.ts                # Vite 配置
├── tsconfig.json                 # TypeScript 配置
├── eslint.config.ts              # ESLint 配置
└── vitest.config.ts              # Vitest 测试配置
```

---

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|----------|------|
| **Node.js** | 18+（后端推荐 22+） | JavaScript 运行时 |
| **npm** | 10+ | 包管理器 |
| **MySQL** | 8.0+ | 或 MariaDB 10.6+ |
| **Git** | — | 版本控制 |

> 企微侧边栏服务额外需要 **Python 3.8+** 和 **Docker**（可选）。

---

## 快速开始

### 一、克隆项目

```bash
git clone https://github.com/shushuhao01/CRM.git
cd CRM
```

### 二、一键安装所有依赖

**Windows:**
```bash
install-all-dependencies.bat
```

**手动安装:**
```bash
# CRM 主系统前端
npm install

# 后端
cd backend && npm install && cd ..

# 管理后台（可选）
cd admin && npm install && cd ..

# 官网（可选）
cd website && npm install && cd ..

# H5 移动端（可选）
cd h5 && npm install && cd ..
```

### 三、配置数据库

1. 创建 MySQL 数据库（字符集 `utf8mb4`）
2. 导入初始 Schema：
   ```bash
   mysql -u root -p your_database < database/schema.sql
   ```
3. 编辑 `backend/.env`，填写数据库连接信息：
   ```ini
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=your_database_name
   DB_USERNAME=your_database_user
   DB_PASSWORD=your_database_password
   ```

### 四、启动开发环境

**Windows 一键启动（推荐）:**
```powershell
.\start-all-dev.ps1
```

**手动启动:**
```bash
# 终端 1：启动后端（端口 3000）
cd backend
npm run dev

# 终端 2：启动 CRM 前端（端口 5173）
npm run dev

# 终端 3：启动管理后台（端口 5174，可选）
cd admin
npm run dev

# 终端 4：启动官网（端口 5175，可选）
cd website
npm run dev
```

### 五、检查服务状态

```powershell
.\check-ports.ps1
```

### 六、访问系统

| 服务 | 地址 |
|------|------|
| CRM 主系统 | http://localhost:5173 |
| 管理后台 | http://localhost:5174 |
| 官方网站 | http://localhost:5175 |
| 后端 API | http://localhost:3000/api/v1 |

---

## 开发命令

### CRM 前端（根目录）

```bash
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run lint             # ESLint 代码检查 & 自动修复
npm run test             # 运行 Vitest 单元测试
npm run test:watch       # 测试监听模式
npm run test:coverage    # 生成测试覆盖率报告
npm run type-check       # TypeScript 类型检查
```

### 后端（backend/）

```bash
npm run dev              # 启动开发服务器（nodemon 热重载）
npm run build            # 编译 TypeScript
npm start                # 启动生产服务
npm run start:prod       # PM2 生产模式启动
npm run lint             # ESLint 检查
npm run test             # 运行 Jest 测试
```

### SaaS 许可证管理（backend/）

```bash
npm run saas:keygen          # 生成 RSA 密钥对
npm run saas:license         # 签发许可证
npm run saas:license:verify  # 验证许可证
```

### 全量构建

```bash
# Linux / macOS
./build-all.sh

# Windows
build-local.bat
```

---

## 生产部署

### 部署方式

系统支持两种部署模式，通过环境变量 `DEPLOY_MODE` 切换：

| 模式 | 环境变量 | 说明 |
|------|----------|------|
| **SaaS 多租户** | `DEPLOY_MODE=saas` | 多租户共享实例，租户通过编码/授权码隔离 |
| **私有化部署** | `DEPLOY_MODE=private` | 单租户独立部署，需许可证激活 |

### 部署架构

生产环境采用 **Nginx + PM2** 多站点部署：

| 域名 | 指向 | 说明 |
|------|------|------|
| `crm.yourdomain.com` | `dist/` | CRM 主系统 |
| `www.yourdomain.com` | `website/dist/` | 官方网站 |
| `admin.yourdomain.com` | `admin/dist/` | 管理后台 |
| `crm.yourdomain.com/h5/` | `h5/dist/` | H5 移动端 |
| `crm.yourdomain.com/api/v1/` | `localhost:3000` | 后端 API（反向代理） |

### 快速部署

```bash
# 1. 上传代码到服务器
scp -r . root@your-server:/www/wwwroot/CRM/

# 2. 执行一键部署脚本
cd /www/wwwroot/CRM
chmod +x deploy.sh
./deploy.sh
```

### 详细部署文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 多站点部署指南 | [`private-deploy/multi-site-deploy-guide.md`](./private-deploy/multi-site-deploy-guide.md) | 宝塔面板 + Nginx 完整配置 |
| Nginx 配置模板 | [`private-deploy/nginx.conf.template`](./private-deploy/nginx.conf.template) | 四站点 Nginx 模板 |
| 一键安装脚本 | [`private-deploy/install.sh`](./private-deploy/install.sh) | Linux 自动化安装 |
| 数据库初始化 | [`private-deploy/init-mysql-database.js`](./private-deploy/init-mysql-database.js) | 自动建库建表 |
| SaaS 许可证指南 | [`private-deploy/SaaS-license-guide.md`](./private-deploy/SaaS-license-guide.md) | 许可证签发与管理 |
| 收款配置指南 | [`private-deploy/payment-config-guide.md`](./private-deploy/payment-config-guide.md) | 支付功能配置 |

---

## 环境变量说明

### 前端环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `VITE_API_BASE_URL` | API 基础路径 | `/api/v1` |
| `VITE_DEPLOY_MODE` | 部署模式 | `saas` / `private` |
| `VITE_APP_TITLE` | 应用标题 | `CRM系统` |

### 后端环境变量（`backend/.env`）

| 变量 | 说明 | 默认 |
|------|------|------|
| `PORT` | 服务端口 | `3000` |
| `DEPLOY_MODE` | 部署模式 | `saas` |
| `DB_TYPE` | 数据库类型 | `mysql` |
| `DB_HOST` / `DB_PORT` | 数据库地址 | `localhost:3306` |
| `DB_DATABASE` | 数据库名 | — |
| `DB_USERNAME` / `DB_PASSWORD` | 数据库凭证 | — |
| `JWT_SECRET` | JWT 签名密钥 | — |
| `CORS_ORIGIN` | 允许跨域的域名 | — |
| `ALIYUN_SMS_ACCESS_KEY_ID` | 阿里云短信 Key | — |
| `EXPRESS_API_KEY` | 快递100 API Key | — |

> 完整环境变量说明参见 `backend/.env` 文件注释。

---

## 数据库

- **ORM**：TypeORM，120+ 实体模型（位于 `backend/src/entities/`）
- **完整 Schema**：`database/schema.sql`
- **增量迁移**：`database/migration-*.sql`（按版本号排列）
- **文档**：[`database/README.md`](./database/README.md)

### 主要数据表

| 分类 | 核心表 |
|------|--------|
| 用户/租户 | `tenants`, `users`, `roles`, `departments`, `permissions` |
| 客户 | `customers`, `customer_groups`, `customer_tags`, `follow_ups` |
| 订单 | `orders`, `order_items`, `order_status_histories` |
| 产品 | `products`, `product_categories` |
| 物流 | `logistics_trackings`, `logistics_traces`, `sender_addresses` |
| 财务 | 订单代收字段（COD）、`cod_cancel_applications` |
| 企微 | `wecom_configs`, `wecom_customers`, `wecom_chat_records` 等 30+ 表 |
| 短信 | `sms_records`, `sms_templates`, `sms_auto_send_rules` |
| 系统 | `system_configs`, `operation_logs`, `messages`, `licenses` |

---

## 脚本工具

### 服务管理

| 脚本 | 平台 | 用途 |
|------|------|------|
| `start-all-dev.ps1` | Windows | 一键启动所有开发服务 |
| `start-dev-local.bat` | Windows | 启动本地开发环境 |
| `start-all-services.ps1` | Windows | 启动所有生产服务 |
| `stop-all-services.bat / .sh` | 通用 | 停止所有服务 |
| `restart-all-services.bat / .sh` | 通用 | 重启所有服务 |
| `restart-backend.bat` | Windows | 单独重启后端 |
| `check-ports.ps1` | Windows | 检查各服务端口状态 |
| `check-dev-environment.bat` | Windows | 检查开发环境就绪状态 |
| `check-services-status.sh` | Linux | 检查服务器服务状态 |

### 构建 & 部署

| 脚本 | 用途 |
|------|------|
| `build-all.sh` | 构建所有前端项目 |
| `build-local.bat / .sh` | 本地构建 |
| `deploy.sh` | Linux 服务器一键部署 |
| `deploy.ps1` | Windows 部署（含敏感信息，gitignored） |
| `install-all-dependencies.bat` | 一键安装所有子项目依赖 |
| `update.sh` | 服务器代码更新 & 重启 |

### 仓库同步

| 脚本 | 用途 |
|------|------|
| `sync-all.ps1` | 主仓库 → 子仓库全量同步 |
| `sync-repos-v2.ps1` | 仓库同步（v2 改进版） |
| `push-website-admin.ps1` | 推送 website/admin 到独立仓库 |
| `setup-remotes.ps1` | 配置 Git 远程仓库 |

---

## 文档索引

| 文档 | 路径 |
|------|------|
| 多站点部署指南 | `private-deploy/multi-site-deploy-guide.md` |
| Nginx 配置模板 | `private-deploy/nginx.conf.template` |
| SaaS 许可证指南 | `private-deploy/SaaS-license-guide.md` |
| 收款配置指南 | `private-deploy/payment-config-guide.md` |
| 数据库文档 | `database/README.md` |
| 宝塔面板部署 | `database/BT_PANEL_DEPLOYMENT_GUIDE.md` |
| 私有部署说明 | `private-deploy/README.md` |
| 编码规范 | `.coding-standards.md` |
| 开发指南 | `.dev-guide.md` |
| 开发规则 | `.dev-rules.md` |
| 企微侧边栏文档 | `wecom-program/README.md` |
| 管理后台文档 | `admin/README.md` |
| 官方网站文档 | `website/README.md` |

---

## 许可证

MIT License

---

## 技术支持

如有问题，请提交 [Issue](https://github.com/shushuhao01/CRM/issues) 或联系开发团队。
