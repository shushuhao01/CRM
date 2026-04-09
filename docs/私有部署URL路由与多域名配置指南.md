# 私有部署 URL 路由与多域名配置指南

**日期**: 2026-04-05  
**版本**: 1.8.0  
**适用**: 运营开发者 / 私有部署客户

---

## 一、整体架构：请求是怎么找到后端的？

### 核心原理

所有前端（CRM / 官网 / Admin）的 API 请求都使用 **相对路径**，不包含域名：

```
CRM前端:    请求 /api/v1/tenant-license/heartbeat
官网前端:    请求 /api/v1/public/website-config
Admin前端:  请求 /api/v1/admin/tenants
```

**关键点**：浏览器会自动把相对路径拼接到当前页面的域名上。所以：

- 用户访问 `https://crm.yunkes.com` → 前端请求自动发到 `https://crm.yunkes.com/api/v1/...`
- 用户访问 `https://yunkes.com` → 前端请求自动发到 `https://yunkes.com/api/v1/...`
- 用户访问 `https://admin.yunkes.com` → 前端请求自动发到 `https://admin.yunkes.com/api/v1/...`

然后 **Nginx 反向代理** 把每个域名的 `/api/` 请求都转发到同一个后端 `127.0.0.1:3000`。

### 完整请求流程图

```
用户浏览器
    │
    │ 访问 https://crm.yunkes.com
    ▼
┌─────────────────────────────────────┐
│ Nginx (监听 crm.yunkes.com:443)     │
│                                     │
│ location / {                        │
│   → 返回 CRM 前端静态文件 (dist/)   │
│ }                                   │
│                                     │
│ location /api/ {                    │
│   → proxy_pass http://127.0.0.1:3000│  ← 转发给后端
│ }                                   │
│                                     │
│ location /socket.io/ {              │
│   → WebSocket 代理到后端            │
│ }                                   │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ Node.js 后端 (端口 3000)            │
│                                     │
│ /api/v1/tenant-license/heartbeat    │ ← 心跳检测
│ /api/v1/license/status              │ ← 私有部署授权状态
│ /api/v1/license/sync                │ ← 同步授权信息
│ /api/v1/public/website-config       │ ← 返回系统URL等配置
│ /api/v1/system/basic-settings       │ ← 系统基本设置
│ /api/v1/admin/tenants               │ ← Admin管理接口
│ ...                                 │
└─────────────────────────────────────┘
```

### 同理，官网和Admin的请求路径

```
用户访问 https://yunkes.com/pricing
    ↓
Nginx (yunkes.com) → 返回官网静态页面
    ↓
页面JS请求 /api/v1/public/website-config
    ↓
Nginx → proxy_pass → 127.0.0.1:3000
    ↓
后端返回 { crmUrl: "https://crm.yunkes.com", websiteUrl: "https://yunkes.com", ... }
    ↓
官网前端用 crmUrl 显示"登录CRM系统"的链接
```

---

## 二、各功能的请求路由详解

### 2.1 心跳检测（License Heartbeat）

| 项目 | 说明 |
|------|------|
| **触发位置** | CRM 前端 `src/services/licenseHeartbeatService.ts` |
| **SaaS模式** | `POST /api/v1/tenant-license/heartbeat` |
| **私有部署** | `GET /api/v1/license/status` |
| **请求方式** | 相对路径，自动走当前域名 → Nginx → 后端 |
| **频率** | 每5分钟一次 |
| **失败处理** | 网络错误只记录日志，不阻断用户 |

### 2.2 授权激活检查

| 项目 | 说明 |
|------|------|
| **触发位置** | CRM 前端登录页 |
| **接口** | `POST /api/v1/license/activate`（私有部署）或 `POST /api/v1/tenant-license/verify`（SaaS）|
| **请求方式** | 相对路径，自动走当前域名 |

### 2.3 用户认证

| 项目 | 说明 |
|------|------|
| **登录** | `POST /api/v1/auth/login` |
| **Token验证** | 每个请求头携带 `Authorization: Bearer <token>` |
| **Token过期** | 后端返回 401 → 前端弹窗提示重新登录 |

### 2.4 会员中心续费路径

| 项目 | 说明 |
|------|------|
| **读取位置** | `localStorage.getItem('crm_config_system')` → `websiteUrl` |
| **拼接逻辑** | `websiteUrl + '/member/login'` |
| **数据来源** | 后端系统设置 → CRM前端存储到 localStorage |
| **使用场景** | 授权到期弹窗中的"去会员中心续费"链接 |

### 2.5 跨系统链接（动态URL）

| 项目 | 数据来源 | 使用位置 |
|------|----------|----------|
| CRM登录地址 | `SITE_CONFIG.CRM_URL` | 官网导航栏、支付成功页、邮件通知 |
| 官网地址 | `SITE_CONFIG.WEBSITE_URL` | CRM系统授权设置页、续费入口 |
| Admin地址 | `SITE_CONFIG.ADMIN_URL` | 管理相关链接 |
| 续费地址 | `SITE_CONFIG.RENEW_URL` | 授权到期邮件通知 |

---

## 三、当前部署域名配置

你当前的部署使用以下域名：

| 系统 | 域名 | 说明 |
|------|------|------|
| CRM系统 | `https://crm.yunkes.com` | 员工日常使用 |
| 官网 | `https://yunkes.com` | 公开官网、会员中心、注册、定价 |
| API | `https://api.yunkes.com` | 后端API（可与CRM共用同一后端） |
| 管理后台 | `https://admin.yunkes.com` | 平台管理 |

对应的后端配置文件 `backend/.env`：

```bash
CRM_URL=https://crm.yunkes.com
WEBSITE_URL=https://yunkes.com
API_URL=https://api.yunkes.com
ADMIN_URL=https://admin.yunkes.com
RENEW_URL=https://yunkes.com/pricing
```

---

## 四、部署新域名的完整步骤

假设一个新的运营方要使用域名 `newcrm.example.com` 系列部署：

### Step 1: 修改后端环境变量（唯一需要改代码的地方）

编辑 `backend/.env`：

```bash
# ==================== 系统URL地址配置 ====================
CRM_URL=https://crm.example.com
WEBSITE_URL=https://example.com
API_URL=https://api.example.com
ADMIN_URL=https://admin.example.com
RENEW_URL=https://example.com/pricing

# CORS配置（需包含所有系统域名）
CORS_ORIGIN=https://crm.example.com,https://example.com,https://admin.example.com
```

> **💡 重要**：只需改这一个文件！不需要修改任何前端代码。

### Step 2: 配置 Nginx（每个域名一个 server 块）

#### CRM系统域名
```nginx
server {
    listen 443 ssl http2;
    server_name crm.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /www/wwwroot/crm/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }
}
```

#### 官网域名
```nginx
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /www/wwwroot/crm/website/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Admin管理后台域名
```nginx
server {
    listen 443 ssl http2;
    server_name admin.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /www/wwwroot/crm/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Step 3: 构建前端（不需要修改前端代码）

```bash
# CRM前端构建
cd /www/wwwroot/crm
npm install && npm run build

# 官网构建
cd website
npm install && npm run build

# Admin构建
cd ../admin
npm install && npm run build
```

前端构建产物中 **不包含任何域名**，所有 API 请求都是相对路径 `/api/v1/...`。

### Step 4: 重启后端

```bash
cd backend
pm2 restart crm-backend
```

### Step 5: 验证

```bash
# 检查后端健康
curl https://api.example.com/health

# 检查配置API返回的URL
curl https://example.com/api/v1/public/website-config
# 应返回: { crmUrl: "https://crm.example.com", websiteUrl: "https://example.com", ... }
```

---

## 五、动态化架构图（数据流向）

```
┌────────────────────────────────────────────────────────────┐
│              backend/.env  (环境变量)                        │
│  CRM_URL / WEBSITE_URL / API_URL / ADMIN_URL / RENEW_URL   │
└─────────┬──────────────────────────────────────────────────┘
          │ process.env 读取
          ▼
┌────────────────────────────────────────────────────────────┐
│         backend/src/config/sites.ts  (配置中心)             │
│  SITE_CONFIG = { CRM_URL, WEBSITE_URL, API_URL, ... }      │
└────┬──────────┬──────────┬──────────┬──────────────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
 ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────────────┐
 │邮件通知│ │支付回调│ │创建租户│ │ GET /public/          │
 │模板    │ │页面    │ │返回    │ │ website-config        │
 │        │ │        │ │loginUrl│ │ → 返回crmUrl等给前端  │
 └────────┘ └────────┘ └────────┘ └──────────┬───────────┘
                                              │
                    ┌─────────────────────────┼─────────────┐
                    ▼                         ▼             ▼
            ┌──────────────┐  ┌────────────────┐  ┌──────────────┐
            │  官网前端     │  │  CRM前端        │  │  Admin前端   │
            │              │  │                 │  │              │
            │ Navbar: 登录 │  │ 续费链接:       │  │ 创建租户:    │
            │ → crmUrl     │  │ websiteUrl +    │  │ loginUrl     │
            │              │  │ /member/login   │  │ 由后端返回   │
            │ 支付成功:    │  │                 │  │              │
            │ → crmUrl     │  │ 心跳/授权检查:  │  │              │
            │              │  │ → 相对路径/api  │  │              │
            └──────────────┘  └─────────────────┘  └──────────────┘
```

---

## 六、为什么不需要修改前端代码？

### 前端 API 请求方式

**CRM 前端** (`src/utils/request.ts`):
```typescript
baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
```
生产环境 `.env.production` 设置:
```
VITE_API_BASE_URL=/api/v1
```
→ 使用相对路径 `/api/v1`，浏览器自动拼接当前域名

**官网前端** (`website/src/api/website-config.ts`):
```typescript
const API_BASE = '/api/v1'
const response = await fetch(`${API_BASE}/public/website-config`)
```
→ 也是相对路径

**Admin 前端** (`.env.production`):
```
VITE_API_BASE_URL=/api/admin
```
→ 也是相对路径

### 关键总结

| 类型 | 路径方式 | 域名怎么来 |
|------|----------|------------|
| 同系统API请求 | 相对路径 `/api/v1/...` | 浏览器自动用当前域名 |
| 跨系统链接 | `SITE_CONFIG` 动态返回 | 后端环境变量配置 |
| 心跳检测 | 相对路径 `/api/v1/...` | 浏览器自动用当前域名 |
| 授权检查 | 相对路径 `/api/v1/...` | 浏览器自动用当前域名 |
| 会员中心跳转 | `websiteUrl + /member/login` | 后端系统设置配置 |
| WebSocket | 从 `VITE_API_BASE_URL` 推导 | 浏览器自动用当前域名 |

---

## 七、单域名部署（简化模式）

如果不想使用多域名，也可以把所有系统部署在同一个域名下：

```
https://my-crm.com/         → CRM前端
https://my-crm.com/website/ → 官网（需要修改构建base）
https://my-crm.com/admin/   → Admin后台（需要修改构建base）
```

此时后端 `.env` 配置：
```bash
CRM_URL=https://my-crm.com
WEBSITE_URL=https://my-crm.com/website
ADMIN_URL=https://my-crm.com/admin
```

但推荐使用多域名部署，更清晰且无需修改前端构建配置。

---

## 八、常见问题

### Q1: 换了域名，CRM系统里的"会员中心续费"链接不对？
**A**: 检查 CRM 系统设置 → 基本信息 → 网站地址（`websiteUrl`），改为新的官网域名。这个值存在数据库的 `system_config` 表中。

### Q2: 官网上"登录CRM系统"按钮指向错误地址？
**A**: 检查后端 `backend/.env` 中的 `CRM_URL` 是否正确设置。官网通过 `GET /api/v1/public/website-config` 获取这个值。

### Q3: 部署后 API 请求 404？
**A**: 检查 Nginx 配置中 `location /api/` 的 `proxy_pass` 是否正确指向后端端口（默认 `http://127.0.0.1:3000`）。

### Q4: 部署后出现 CORS 跨域错误？
**A**: 确保后端 `backend/.env` 中 `CORS_ORIGIN` 包含了所有系统的域名（CRM、官网、Admin）。

### Q5: 心跳检测失败？
**A**: 心跳使用相对路径请求，只要 Nginx 的 `/api/` 代理配置正确，心跳就能正常工作。检查 `pm2 logs crm-backend` 查看后端日志。

### Q6: 需要改前端代码吗？
**A**: **完全不需要**。所有 API 请求使用相对路径，跨系统链接从后端动态获取。只需要改后端 `.env` 环境变量和 Nginx 配置。

---

## 九、配置清单速查

新部署时需要修改的文件：

| 文件 | 需改什么 | 说明 |
|------|----------|------|
| `backend/.env` | `CRM_URL`, `WEBSITE_URL`, `API_URL`, `ADMIN_URL`, `RENEW_URL` | 系统URL地址 |
| `backend/.env` | `CORS_ORIGIN` | 添加所有域名 |
| `backend/.env` | `DB_*` | 数据库连接 |
| `backend/.env` | `JWT_SECRET` | 安全密钥 |
| Nginx 配置 | `server_name`, `root`, `proxy_pass` | 每个域名一个配置块 |
| `website/public/sitemap.xml` | 域名替换 | SEO 静态文件（非必需） |
| `website/index.html` | `<link rel="canonical">`, `og:url` | SEO 元标签（非必需） |

