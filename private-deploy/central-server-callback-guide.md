# 私有部署 - 中央服务器回调配置指南

**版本**: 1.8.0  
**更新日期**: 2026-04-27  

---

## 概述

私有部署的 CRM 系统需要与云客中央服务器保持通信，以实现授权管控、配置同步、公告推送等功能。本文档列出所有需要回调中央服务器的场景，以及相关配置方法。

**中央服务器域名（固定，不会变更）：**

| 服务 | 域名 | 用途 |
|------|------|------|
| API后端 | `api.yunkes.com` | 所有API回调请求 |
| 管理后台 | `admin.yunkes.com` | 管理后台界面 |
| 官网 | `yunkes.com` | 云客官网 |
| CRM主应用 | `crm.yunkes.com` | SaaS版CRM |

---

## 回调项目清单（共12类）

### 一、授权与安全（3项）

| # | 功能 | 方法 | 端点 | 触发时机 | 说明 |
|---|------|------|------|----------|------|
| 1 | 授权码激活 | POST | `/api/v1/admin/verify/license` | 用户首次输入授权码 | 发送 licenseKey + machineId |
| 2 | 授权心跳同步 | POST | `/api/v1/admin/verify/license` | 每30分钟自动执行 | 同步 maxUsers、过期时间、功能权限、用户限制模式等 |
| 3 | 手动同步授权 | POST | `/api/v1/admin/verify/license` | 用户点击"同步"按钮 | 立即刷新授权状态 |

> 这3项是**最核心**的回调，确保我们能控制私有部署客户的授权状态、用户数限制、过期管理等。

### 二、系统配置（3项）

| # | 功能 | 方法 | 端点 | 触发时机 | 说明 |
|---|------|------|------|----------|------|
| 4 | 系统配置同步 | GET | `/api/v1/admin/public/system-config` | CRM前端每次加载 | 获取品牌名称、Logo、版权信息、功能开关、控制台加密等 |
| 5 | 系统公告 | GET | `/api/v1/admin/announcements` | CRM前端定期拉取 | 接收管理后台发布的系统级通知公告 |
| 6 | 版本更新检查 | GET | `/api/v1/admin/verify/version` | 系统启动时/定期 | 获取最新版本号、更新日志、下载地址 |

### 三、企微管理（3项）

| # | 功能 | 方法 | 端点 | 触发时机 | 说明 |
|---|------|------|------|----------|------|
| 7 | 企微套餐与定价 | GET | `/api/v1/admin/wecom-management/pricing-config` | CRM企微设置页面 | 获取企微服务套餐价格配置 |
| 8 | 会话存档代购 | GET/POST | `/api/v1/admin/wecom-management/purchase-orders` | 购买会话存档时 | 代购订单创建与查询 |
| 9 | AI助手额度 | GET | `/api/v1/admin/wecom-management/ai/*` | AI功能使用时 | 模型列表、租户额度、计费配置 |

### 四、短信服务（1项）

| # | 功能 | 方法 | 端点 | 触发时机 | 说明 |
|---|------|------|------|----------|------|
| 10 | 短信额度与模板 | GET | `/api/v1/admin/sms-quota` | 短信功能使用时 | 查询全局短信模板和额度分配 |

### 五、获客助手（1项）

| # | 功能 | 方法 | 端点 | 触发时机 | 说明 |
|---|------|------|------|----------|------|
| 11 | 获客助手用量 | GET | `/api/v1/admin/wecom-management/acquisition-usage` | 获客助手统计 | 获客助手使用量统计 |

### 六、企微服务商回调（1项）

| # | 功能 | 方法 | 端点 | 触发时机 | 说明 |
|---|------|------|------|----------|------|
| 12 | 企微Suite回调 | POST | `/api/v1/wecom/suite/callback` | 企微服务器推送 | 回调URL固定指向中央服务器，接收 suite_ticket 等 |

> ⚠️ 企微服务商应用的回调URL **必须** 指向 `https://api.yunkes.com/api/v1/wecom/suite/callback`，因为 suite_ticket 由企微定时推送到固定URL。

---

## 环境变量配置

在 `backend/.env` 中添加以下配置（通常使用默认值即可）：

```bash
# ==================== 私有部署中央服务器配置 ====================
# 默认指向云客官方服务器，通常无需修改
CENTRAL_API_URL=https://api.yunkes.com
CENTRAL_ADMIN_URL=https://admin.yunkes.com
CENTRAL_WEBSITE_URL=https://yunkes.com
CENTRAL_CRM_URL=https://crm.yunkes.com
```

---

## 网络要求

私有部署服务器必须能访问以下地址：

```
api.yunkes.com:443    (HTTPS)
```

可通过以下命令验证连通性：

```bash
curl -s https://api.yunkes.com/api/v1/admin/verify/version
```

如果返回 JSON 数据，说明连接正常。

---

## 防火墙规则

如私有部署服务器有出站防火墙限制，需放行以下规则：

| 方向 | 目标地址 | 端口 | 协议 | 说明 |
|------|----------|------|------|------|
| 出站 | api.yunkes.com | 443 | HTTPS | 所有API回调 |
| 出站 | qyapi.weixin.qq.com | 443 | HTTPS | 企微API（如使用企微功能） |

---

## 离线降级策略

当中央服务器不可达时，系统采取以下降级策略：

| 功能 | 降级行为 |
|------|----------|
| 授权心跳 | 使用本地缓存的授权信息，离线模式正常运行 |
| 系统配置 | 使用本地数据库中的配置 |
| 公告/版本 | 静默跳过，不影响使用 |
| 企微套餐/AI | 使用本地缓存数据 |

> **重要**：离线模式下授权码激活无法完成，首次部署时必须确保网络连通。

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `backend/src/config/centralServer.ts` | 中央服务器配置定义（含完整清单文档） |
| `backend/src/services/CentralServerService.ts` | 统一通信服务 |
| `backend/src/services/LicenseService.ts` | 授权验证服务 |
| `backend/src/services/LicenseSyncScheduler.ts` | 授权心跳定时任务（30分钟/次） |
| `backend/src/config/deploy.ts` | 部署模式配置 |
| `backend/.env.example` | 环境变量模板 |
