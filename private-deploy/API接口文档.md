# CRM 系统 API 接口文档

> 版本：1.8.0 | 更新日期：2026-05-05 | 接口总数：约 1400+  
> API 前缀：`/api/v1`（可通过环境变量 `API_PREFIX` 自定义）  
> 认证方式：Bearer Token（JWT）| 部分公开接口无需认证

---

## 目录

1. [通用说明](#1-通用说明)
2. [认证模块 /auth](#2-认证模块-auth)
3. [用户管理 /users](#3-用户管理-users)
4. [个人中心 /profile](#4-个人中心-profile)
5. [客户管理 /customers](#5-客户管理-customers)
6. [产品管理 /products](#6-产品管理-products)
7. [订单管理 /orders](#7-订单管理-orders)
8. [售后服务 /services](#8-售后服务-services)
9. [仪表盘 /dashboard](#9-仪表盘-dashboard)
10. [绩效管理 /performance](#10-绩效管理-performance)
11. [财务管理 /finance](#11-财务管理-finance)
12. [通话系统 /calls](#12-通话系统-calls)
13. [物流管理 /logistics](#13-物流管理-logistics)
14. [短信服务 /sms](#14-短信服务-sms)
15. [企微集成 /wecom](#15-企微集成-wecom)
16. [小程序 /mp](#16-小程序-mp)
17. [移动端 /mobile](#17-移动端-mobile)
18. [系统设置 /system](#18-系统设置-system)
19. [数据管理 /data & /tenant-data](#19-数据管理-data--tenant-data)
20. [虚拟库存 /virtual-inventory](#20-虚拟库存-virtual-inventory)
21. [增值服务 /value-added](#21-增值服务-value-added)
22. [COD代收货款 /cod-collection & /cod-application](#22-cod代收货款)
23. [授权许可 /license & /tenant-license](#23-授权许可-license--tenant-license)
24. [角色权限 /roles & /permissions](#24-角色权限-roles--permissions)
25. [消息系统 /message](#25-消息系统-message)
26. [日志管理 /logs](#26-日志管理-logs)
27. [其他模块](#27-其他模块)
28. [管理后台 /admin](#28-管理后台-admin)
29. [公开接口 /public](#29-公开接口-public)

---

## 1. 通用说明

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| **Base URL** | `https://{domain}/api/v1` |
| **协议** | HTTPS（生产）/ HTTP（开发） |
| **数据格式** | JSON（`Content-Type: application/json`） |
| **字符编码** | UTF-8 |
| **认证** | `Authorization: Bearer {token}` |
| **多租户** | 通过 JWT 中的 `tenantId` 自动隔离，无需手动传递 |

### 1.2 通用响应格式

```json
// 成功
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}

// 分页
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}

// 失败
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

### 1.3 通用错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 410 | 资源已过期（如小程序链接过期） |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 1.4 通用分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页条数 |
| search | string | - | 关键词搜索 |

### 1.5 健康检查

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/health` | 无 | 服务健康检查 |
| GET | `/api/v1/health` | 无 | API 健康检查 |

---

## 2. 认证模块 /auth

> 路由前缀：`/api/v1/auth`  
> 源文件：`routes/auth.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/login` | 无 | 用户登录 |
| POST | `/refresh` | 无 | 刷新访问令牌 |
| GET | `/me` | ✅ | 获取当前用户信息 |
| PUT | `/me` | ✅ | 更新当前用户信息 |
| PUT | `/password` | ✅ | 修改密码 |
| POST | `/logout` | ✅ | 退出登录 |

### 登录请求示例

```json
POST /api/v1/auth/login
{
  "username": "admin",
  "password": "123456",
  "tenantId": "T260303A1B2",  // SaaS模式必填
  "rememberMe": true
}
```

### 登录响应

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "U001",
      "username": "admin",
      "realName": "管理员",
      "role": "admin",
      "tenantId": "T260303A1B2"
    }
  }
}
```

---

## 3. 用户管理 /users

> 路由前缀：`/api/v1/users`  
> 源文件：`routes/users.ts`  
> 权限要求：经理/管理员角色（部分接口）

| 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|
| GET | `/` | ✅ | 列表权限 | 获取用户列表（分页） |
| GET | `/check-username` | ✅ | 管理员 | 检查用户名是否可用 |
| GET | `/department-members` | ✅ | - | 获取部门成员列表 |
| GET | `/statistics` | ✅ | 管理员 | 用户统计数据 |
| GET | `/:id` | ✅ | 管理员 | 获取用户详情 |
| POST | `/` | ✅ | 管理员 | 创建用户 |
| PUT | `/:id` | ✅ | 管理员 | 更新用户信息 |
| DELETE | `/:id` | ✅ | 管理员 | 删除用户 |
| PATCH | `/:id/status` | ✅ | 管理员 | 更新用户状态（启用/禁用） |
| PATCH | `/:id/employment-status` | ✅ | 管理员 | 更新在职状态 |
| POST | `/:id/reset-password` | ✅ | 管理员 | 重置用户密码 |
| POST | `/:id/force-logout` | ✅ | 管理员 | 强制用户下线 |
| POST | `/:id/two-factor` | ✅ | 管理员 | 切换两步验证 |
| POST | `/:id/unlock` | ✅ | 管理员 | 解锁账户 |
| GET | `/:id/permissions` | ✅ | 管理员 | 获取用户权限列表 |

---

## 4. 个人中心 /profile

> 路由前缀：`/api/v1/profile`  
> 源文件：`routes/profile.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 获取个人资料 |
| PUT | `/` | ✅ | 更新个人资料 |
| PUT | `/password` | ✅ | 修改密码 |
| PUT | `/avatar` | ✅ | 更新头像 |
| GET | `/notifications` | ✅ | 获取个人通知 |
| PUT | `/notification-settings` | ✅ | 更新通知设置 |

---

## 5. 客户管理 /customers

> 路由前缀：`/api/v1/customers`  
> 源文件：`routes/customers/` 目录（core.ts、related.ts、tags.ts、groups.ts、logs.ts）

### 5.1 客户核心 CRUD

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 客户列表（分页、搜索、筛选） |
| GET | `/search` | ✅ | 客户搜索 |
| GET | `/check-exists` | ✅ | 检查客户是否存在（手机号查重） |
| POST | `/check-batch-phones` | ✅ | 批量手机号查重 |
| POST | `/batch-import` | ✅ | 批量导入客户 |
| GET | `/stats` | ✅ | 客户统计数据 |
| GET | `/:id` | ✅ | 获取客户详情 |
| POST | `/` | ✅ | 创建客户 |
| PUT | `/:id` | ✅ | 更新客户信息 |
| DELETE | `/:id` | ✅ | 删除客户 |

### 5.2 客户关联数据

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/:id/orders` | ✅ | 客户关联订单 |
| GET | `/:id/services` | ✅ | 客户关联售后 |
| GET | `/:id/calls` | ✅ | 客户通话记录 |
| GET | `/:id/followups` | ✅ | 客户跟进记录 |
| POST | `/:id/followups` | ✅ | 新增跟进记录 |
| PUT | `/:id/followups/:followUpId` | ✅ | 更新跟进记录 |
| DELETE | `/:id/followups/:followUpId` | ✅ | 删除跟进记录 |
| GET | `/:id/tags` | ✅ | 获取客户标签 |
| POST | `/:id/tags` | ✅ | 添加客户标签 |
| DELETE | `/:id/tags/:tagId` | ✅ | 移除客户标签 |
| GET | `/:id/medical-history` | ✅ | 获取病历 |
| POST | `/:id/medical-history` | ✅ | 新增病历 |
| GET | `/:id/addresses` | ✅ | 地址列表 |
| POST | `/:id/addresses` | ✅ | 新增地址 |
| PUT | `/:id/addresses/:addressId` | ✅ | 更新地址 |
| DELETE | `/:id/addresses/:addressId` | ✅ | 删除地址 |
| GET | `/:id/notes` | ✅ | 备注列表 |
| POST | `/:id/notes` | ✅ | 新增备注 |
| PUT | `/:id/notes/:noteId` | ✅ | 更新备注 |
| DELETE | `/:id/notes/:noteId` | ✅ | 删除备注 |
| GET | `/:id/stats` | ✅ | 客户统计概览 |
| GET | `/:id/logs` | ✅ | 操作日志 |
| POST | `/:id/logs` | ✅ | 记录操作日志 |

### 5.3 标签管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/tags` | ✅ | 标签列表 |
| POST | `/tags` | ✅ | 创建标签 |
| GET | `/tags/:id` | ✅ | 标签详情 |
| PUT | `/tags/:id` | ✅ | 更新标签 |
| DELETE | `/tags/:id` | ✅ | 删除标签 |

### 5.4 客户分组

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/groups` | ✅ | 分组列表 |
| POST | `/groups` | ✅ | 创建分组 |
| GET | `/groups/:id` | ✅ | 分组详情 |
| PUT | `/groups/:id` | ✅ | 更新分组 |
| DELETE | `/groups/:id` | ✅ | 删除分组 |

---

## 6. 产品管理 /products

> 路由前缀：`/api/v1/products`  
> 源文件：`routes/products.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 产品列表 |
| GET | `/categories` | ✅ | 产品分类列表 |
| GET | `/active` | ✅ | 在售产品列表 |
| GET | `/stats` | ✅ | 产品统计 |
| GET | `/export` | ✅ | 导出产品数据 |
| GET | `/:id` | ✅ | 产品详情 |
| POST | `/` | ✅ | 创建产品 |
| POST | `/import` | ✅ | 导入产品 |
| POST | `/categories` | ✅ | 创建分类 |
| PUT | `/:id` | ✅ | 更新产品 |
| PUT | `/categories/:id` | ✅ | 更新分类 |
| PUT | `/:id/status` | ✅ | 更新产品状态 |
| DELETE | `/:id` | ✅ | 删除产品 |
| DELETE | `/categories/:id` | ✅ | 删除分类 |
| 其他 | ... | ✅ | 库存管理、规格管理等（共22个接口） |

---

## 7. 订单管理 /orders

> 路由前缀：`/api/v1/orders`  
> 源文件：`routes/orders/` 目录（orderCrud.ts、orderShipping.ts、orderAudit.ts、index.ts）

### 7.1 订单 CRUD

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 订单列表（分页、多条件筛选） |
| GET | `/statistics` | ✅ | 订单统计数据 |
| GET | `/:id` | ✅ | 订单详情 |
| GET | `/:id/status-history` | ✅ | 订单状态变更历史 |
| GET | `/:id/operation-logs` | ✅ | 订单操作日志 |
| GET | `/:id/after-sales` | ✅ | 订单关联售后 |
| POST | `/` | ✅ | 创建订单 |
| PUT | `/:id` | ✅ | 更新订单 |
| PUT | `/:id/mark-type` | ✅ | 标记订单类型 |
| DELETE | `/:id` | ✅ | 删除订单 |
| POST | `/check-department-limit` | ✅ | 检查部门下单限额 |
| GET | `/transfer-config` | ✅ | 获取转单配置 |
| POST | `/check-transfer` | ✅ | 检查可转单 |

### 7.2 订单审核

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/:id/submit-audit` | ✅ | 提交审核 |
| POST | `/:id/audit` | ✅ | 审核订单（通过/驳回） |
| POST | `/:id/cancel-audit` | ✅ | 撤回审核 |
| GET | `/audit-list` | ✅ | 审核列表 |
| GET | `/audit-statistics` | ✅ | 审核统计 |
| POST | `/cancel-request` | ✅ | 申请取消订单 |
| GET | `/pending-cancel` | ✅ | 待处理取消申请 |
| GET | `/audited-cancel` | ✅ | 已审核取消记录 |

### 7.3 发货管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/shipping/pending` | ✅ | 待发货订单列表 |
| GET | `/shipping/shipped` | ✅ | 已发货订单列表 |
| GET | `/shipping/returned` | ✅ | 退货订单列表 |
| GET | `/shipping/cancelled` | ✅ | 已取消订单列表 |
| GET | `/shipping/draft` | ✅ | 草稿订单列表 |
| GET | `/shipping/statistics` | ✅ | 发货统计 |
| GET | `/by-tracking-no` | ✅ | 按物流单号查询 |

---

## 8. 售后服务 /services

> 路由前缀：`/api/v1/services`  
> 源文件：`routes/services.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 售后服务列表 |
| GET | `/:id` | ✅ | 售后详情 |
| POST | `/` | ✅ | 创建售后工单 |
| PUT | `/:id` | ✅ | 更新售后工单 |
| PUT | `/:id/status` | ✅ | 更新售后状态 |
| PUT | `/:id/assign` | ✅ | 指派处理人 |
| DELETE | `/:id` | ✅ | 删除售后工单 |
| GET | `/:id/follow-ups` | ✅ | 售后跟进记录 |
| POST | `/:id/follow-ups` | ✅ | 新增跟进记录 |
| PUT | `/:id/follow-ups/:followUpId` | ✅ | 更新跟进 |
| DELETE | `/:id/follow-ups/:followUpId` | ✅ | 删除跟进 |
| GET | `/:id/operation-logs` | ✅ | 售后操作日志 |
| GET | `/statistics` | ✅ | 售后统计（共13个接口） |

---

## 9. 仪表盘 /dashboard

> 路由前缀：`/api/v1/dashboard`  
> 源文件：`routes/dashboard.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/summary` | ✅ | 总览数据 |
| GET | `/sales-trend` | ✅ | 销售趋势 |
| GET | `/order-stats` | ✅ | 订单统计 |
| GET | `/customer-stats` | ✅ | 客户统计 |
| GET | `/top-products` | ✅ | 热销产品排行 |
| GET | `/recent-orders` | ✅ | 最近订单（共6个接口） |

---

## 10. 绩效管理 /performance

> 路由前缀：`/api/v1/performance`  
> 源文件：`routes/performance.ts`、`routes/performanceReport.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/summary` | ✅ | 绩效总览 |
| GET | `/rankings` | ✅ | 业绩排行榜 |
| GET | `/targets` | ✅ | 目标管理 |
| POST | `/targets` | ✅ | 设置目标 |
| PUT | `/targets/:id` | ✅ | 更新目标 |
| GET | `/reports` | ✅ | 绩效报表 |
| GET | `/export` | ✅ | 导出绩效数据 |
| GET | `/department` | ✅ | 部门绩效 |
| GET | `/individual` | ✅ | 个人绩效 |
| GET | `/trend` | ✅ | 绩效趋势（共17+7个接口） |

---

## 11. 财务管理 /finance

> 路由前缀：`/api/v1/finance`  
> 源文件：`routes/finance.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/overview` | ✅ | 财务总览 |
| GET | `/income` | ✅ | 收入明细 |
| GET | `/expenses` | ✅ | 支出明细 |
| GET | `/reconciliation` | ✅ | 对账管理 |
| GET | `/reports` | ✅ | 财务报表 |
| GET | `/export` | ✅ | 导出财务数据 |
| POST | `/records` | ✅ | 新增财务记录 |
| PUT | `/records/:id` | ✅ | 更新财务记录（共16个接口） |

---

## 12. 通话系统 /calls

> 路由前缀：`/api/v1/calls`  
> 源文件：`routes/calls/` 目录（records.ts、recordings.ts、followups.ts、config.ts、tasks.ts）  
> Webhook 前缀：`/api/v1/calls/webhook`

### 12.1 通话记录

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 通话记录列表 |
| GET | `/records` | ✅ | 通话记录（含筛选） |
| GET | `/records/:id` | ✅ | 通话详情 |
| GET | `/statistics` | ✅ | 通话统计 |
| POST | `/records` | ✅ | 新建通话记录 |
| PUT | `/records/:id` | ✅ | 更新通话记录 |
| PUT | `/records/:id/end` | ✅ | 结束通话 |
| PUT | `/:id/status` | ✅ | 更新通话状态 |
| PUT | `/:id/notes` | ✅ | 更新通话备注 |
| DELETE | `/records/:id` | ✅ | 删除通话记录 |
| POST | `/outbound` | ✅ | 发起外呼 |

### 12.2 录音管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/recordings` | ✅ | 录音列表 |
| GET | `/recordings/stream/*` | ✅ | 录音流式播放 |
| GET | `/recordings/:id/download` | ✅ | 下载录音 |
| GET | `/recordings/stats` | ✅ | 录音统计 |
| POST | `/recordings/upload` | ✅ | 上传录音 |
| DELETE | `/recordings/:id` | ✅ | 删除录音 |

### 12.3 外呼任务 & 线路管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/outbound-tasks` | ✅ | 外呼任务列表 |
| POST | `/outbound-tasks` | ✅ | 创建外呼任务 |
| PUT | `/outbound-tasks/:id` | ✅ | 更新外呼任务 |
| DELETE | `/outbound-tasks/:id` | ✅ | 删除外呼任务 |
| GET | `/lines` | ✅ | 线路列表 |
| POST | `/lines` | ✅ | 创建线路 |
| PUT | `/lines/:id` | ✅ | 更新线路 |
| DELETE | `/lines/:id` | ✅ | 删除线路 |
| POST | `/lines/:id/test` | ✅ | 测试线路连通性 |

### 12.4 通话配置 /call-config

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/config` | ✅ | 获取通话配置 |
| PUT | `/config` | ✅ | 更新通话配置 |
| POST | `/test-connection` | ✅ | 测试 SIP 连接 |
| GET | `/export` | ✅ | 导出配置（共25个接口） |

### 12.5 Webhook（无需认证）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/calls/webhook/...` | 无 | 通话状态回调（7个接口） |

---

## 13. 物流管理 /logistics

> 路由前缀：`/api/v1/logistics`  
> 源文件：`routes/logistics/` 目录

### 13.1 物流公司管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/companies/list` | ✅ | 物流公司列表 |
| GET | `/companies/active` | ✅ | 已启用公司 |
| GET | `/companies/export` | ✅ | 导出物流公司 |
| POST | `/companies` | ✅ | 新增物流公司 |
| POST | `/companies/import` | ✅ | 导入物流公司 |
| PUT | `/companies/:id` | ✅ | 更新物流公司 |
| PATCH | `/companies/:id/status` | ✅ | 启用/禁用 |
| DELETE | `/companies/:id` | ✅ | 删除物流公司 |

### 13.2 物流追踪

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/list` | ✅ | 物流单列表 |
| GET | `/trace/query` | ✅ | 查询物流轨迹 |
| POST | `/trace/batch-query` | ✅ | 批量查询轨迹 |
| POST | `/trace/refresh` | ✅ | 刷新物流状态 |
| POST | `/tracking` | ✅ | 创建物流追踪 |
| POST | `/batch-sync` | ✅ | 批量同步物流 |

### 13.3 物流状态更新

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/status-update/orders` | ✅ | 物流状态更新订单 |
| GET | `/status-update/summary` | ✅ | 物流更新汇总 |
| POST | `/order/status` | ✅ | 更新订单物流状态 |
| POST | `/order/batch-status` | ✅ | 批量更新状态 |
| POST | `/create-order` | ✅ | 创建物流订单（电子面单） |
| POST | `/auto-sync/trigger` | ✅ | 触发自动同步 |
| GET | `/auto-sync/status` | ✅ | 自动同步状态 |

### 13.4 寄件人地址

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/sender-addresses` | ✅ | 寄件人地址列表 |
| GET | `/sender-addresses/default` | ✅ | 默认地址 |
| POST | `/sender-addresses` | ✅ | 新增地址 |
| PUT | `/sender-addresses/:id` | ✅ | 更新地址 |
| DELETE | `/sender-addresses/:id` | ✅ | 删除地址 |
| PUT | `/sender-addresses/:id/set-default` | ✅ | 设为默认 |

### 13.5 快递对接

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/v1/sf-express/...` | ✅ | 顺丰速运接口（9个） |
| POST | `/api/v1/yto-express/...` | ✅ | 圆通速递接口（2个） |

---

## 14. 短信服务 /sms

> 路由前缀：`/api/v1/sms`  
> 源文件：`routes/sms.ts`、`routes/smsAutoSend.ts`、`routes/smsQuota.ts`

### 14.1 短信发送与模板

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/templates` | ✅ | 短信模板列表 |
| GET | `/templates/available` | ✅ | 可用模板 |
| GET | `/templates/my-applications` | ✅ | 我的模板申请 |
| POST | `/templates/apply` | ✅ | 申请短信模板 |
| POST | `/templates/:id/withdraw` | ✅ | 撤回模板申请 |
| DELETE | `/templates/:id` | ✅ | 删除模板 |
| POST | `/templates/:id/approve` | ✅ | 审批模板（管理员） |
| GET | `/records` | ✅ | 发送记录 |
| POST | `/send` | ✅ | 发送短信 |
| GET | `/statistics` | ✅ | 短信统计 |
| GET | `/variable-docs` | ✅ | 变量文档 |
| GET | `/customers/search` | ✅ | 搜索客户（发送用） |

### 14.2 自动发送规则

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/auto-send/trigger-events` | ✅ | 触发事件列表 |
| GET | `/auto-send/rules` | ✅ | 规则列表 |
| GET | `/auto-send/rules/:id` | ✅ | 规则详情 |
| POST | `/auto-send/rules` | ✅ | 创建规则 |
| PUT | `/auto-send/rules/:id` | ✅ | 更新规则 |
| DELETE | `/auto-send/rules/:id` | ✅ | 删除规则 |
| PATCH | `/auto-send/rules/:id/toggle` | ✅ | 启用/禁用规则 |
| GET | `/auto-send/rules/:id/records` | ✅ | 规则发送记录 |

### 14.3 短信额度

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/quota` | ✅ | 当前额度 |
| GET | `/quota/packages` | ✅ | 可购买套餐 |
| POST | `/quota/purchase` | ✅ | 购买额度 |
| GET | `/quota/order/:orderNo` | ✅ | 查询购买订单 |
| GET | `/quota/bills` | ✅ | 消费账单 |

---

## 15. 企微集成 /wecom

> 路由前缀：`/api/v1/wecom`  
> 源文件：`routes/wecom/` 目录（33个文件）  
> 说明：企业微信服务商应用集成，包含聊天存档、获客助手、AI 助手等

### 15.1 基础配置

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/config` | ✅ | 企微配置信息 |
| PUT | `/config` | ✅ | 更新企微配置 |
| POST | `/config/test-connection` | ✅ | 测试连接 |
| GET | `/binding/status` | ✅ | 绑定状态 |
| POST | `/binding/bindCorpId` | ✅ | 绑定企业ID |

### 15.2 聊天存档 /wecom/chat-archive

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/chat-archive/conversations` | ✅ | 会话列表 |
| GET | `/chat-archive/messages` | ✅ | 消息列表 |
| GET | `/chat-archive/statistics` | ✅ | 存档统计 |
| GET | `/chat-archive/search` | ✅ | 搜索消息 |
| POST | `/chat-archive/sync` | ✅ | 触发同步 |
| GET | `/chat-archive/settings` | ✅ | 存档设置 |
| PUT | `/chat-archive/settings` | ✅ | 更新设置（共14个接口） |

### 15.3 获客助手 /wecom/acquisition

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/acquisition/links` | ✅ | 获客链接列表 |
| POST | `/acquisition/links` | ✅ | 创建获客链接 |
| PUT | `/acquisition/links/:id` | ✅ | 更新链接 |
| DELETE | `/acquisition/links/:id` | ✅ | 删除链接 |
| GET | `/acquisition/statistics` | ✅ | 获客统计 |
| GET | `/acquisition/customers` | ✅ | 获客客户列表（共22个接口） |

### 15.4 AI 助手 /wecom/ai-assistant

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/ai-assistant/config` | ✅ | AI 配置 |
| PUT | `/ai-assistant/config` | ✅ | 更新 AI 配置 |
| POST | `/ai-assistant/chat` | ✅ | AI 对话 |
| GET | `/ai-assistant/history` | ✅ | 对话历史 |
| GET | `/ai-assistant/prompts` | ✅ | 提示词模板 |
| POST | `/ai-assistant/prompts` | ✅ | 创建提示词（共49个接口） |

### 15.5 客户联系 & 客户群

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/customer/list` | ✅ | 企微客户列表 |
| POST | `/customer/sync` | ✅ | 同步企微客户 |
| GET | `/customer-group/list` | ✅ | 客户群列表 |
| POST | `/customer-group/sync` | ✅ | 同步客户群（共11+8个接口） |

### 15.6 企微 H5 侧边栏

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/h5-auth/config` | 无 | H5 鉴权配置 |
| POST | `/h5-auth/login` | 无 | H5 登录 |
| GET | `/h5-app/customer/:externalUserId` | H5认证 | 获取客户信息 |
| POST | `/h5-app/mp-generate-card` | H5认证 | 生成小程序卡片 |
| GET | `/h5-app/orders` | H5认证 | 订单列表（共22+5个接口） |

### 15.7 其他企微模块

| 模块 | 接口数 | 说明 |
|------|--------|------|
| contactWay | 15 | 渠道活码管理 |
| pricing | 13 | 企微定价方案 |
| payment | 13 | 企微支付 |
| service | 13 | 企微客服 |
| sidebar | 17 | 侧边栏应用 |
| qualityInspection | 10 | 质量检测 |
| addressBook | 10 | 通讯录 |
| aiInspect | 9 | AI 质检 |
| groupBroadcast | 5 | 群发 |
| groupWelcome | 4 | 群欢迎语 |
| sensitiveWords | 3+4 | 敏感词管理 |
| seatManagement | 3 | 坐席管理 |
| scripts | 20 | 话术库 |
| callback | 4 | 回调处理 |
| suite-callback | 3 | 套件回调 |

---

## 16. 小程序 /mp

> 路由前缀：`/api/v1/mp`  
> 源文件：`routes/miniprogram/index.ts`  
> 说明：微信小程序客户自助填写功能

### 16.1 客户端接口（签名验证）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/form-config` | 签名 | 获取表单配置（字段、租户信息） |
| POST | `/submit-customer` | 签名 | 提交客户资料 |
| POST | `/get-phone` | 签名 | 微信手机号解密获取 |
| GET | `/address-streets` | 无 | 街道/乡镇列表（地址三级联动后） |

**签名参数说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tenantId | string | ✅ | 租户ID |
| memberId | string | ✅ | 成员ID |
| ts | string | ✅ | 时间戳 |
| sign | string | ✅ | MD5签名 = md5(tenantId + memberId + ts + secret) |

### 16.2 后台管理接口（JWT）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/generate-card` | ✅ | 生成小程序卡片参数 |
| POST | `/log-send` | ✅ | 记录卡片发送日志 |
| GET | `/collect-status` | ✅ | 客户填写状态 |
| GET | `/collect-stats` | ✅ | 采集统计 |
| GET | `/collect-records` | ✅ | 采集记录列表 |
| GET | `/phone-quota` | ✅ | 手机号获取额度 |
| GET | `/phone-quota/records` | ✅ | 额度使用记录 |
| POST | `/phone-quota/purchase` | ✅ | 购买额度 |
| GET | `/wxacode` | ✅ | 生成小程序码 |
| DELETE | `/upload-file` | ✅ | 删除上传文件 |

### 16.3 微信回调

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/callback` | 无 | 微信服务器验证（echostr） |
| POST | `/callback` | 无 | 微信事件推送回调 |

---

## 17. 移动端 /mobile

> 路由前缀：`/api/v1/mobile`  
> 源文件：`routes/mobile/` 目录

### 17.1 移动端认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/ping` | 无 | 连通测试 |
| POST | `/login` | 无 | 移动端登录 |
| POST | `/bind` | 无 | 设备绑定 |
| POST | `/bindQRCode` | ✅ | 二维码绑定 |
| GET | `/device/status` | ✅ | 设备状态 |

### 17.2 移动端通话

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/call/status` | ✅ | 上报通话状态 |
| POST | `/call/end` | ✅ | 结束通话 |
| POST | `/call/incoming` | ✅ | 上报来电 |
| POST | `/call/followup` | ✅ | 通话跟进 |
| GET | `/call/:callId` | ✅ | 通话详情 |
| GET | `/calls` | ✅ | 通话列表 |
| DELETE | `/unbind` | ✅ | 设备解绑 |
| POST | `/recording/upload` | ✅ | 上传录音 |

### 17.3 移动端统计

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/stats/today` | ✅ | 今日统计 |
| GET | `/stats` | ✅ | 历史统计 |

### 17.4 接口管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/interfaces` | ✅ | 接口列表 |
| GET | `/interfaces/:id` | ✅ | 接口详情 |
| PUT | `/interfaces/:id` | ✅ | 更新接口 |
| POST | `/interfaces/:id/reset` | ✅ | 重置接口 |
| GET | `/interfaces/logs` | ✅ | 接口日志 |
| GET | `/interfaces/stats` | ✅ | 接口统计 |

---

## 18. 系统设置 /system

> 路由前缀：`/api/v1/system`  
> 源文件：`routes/system/` 目录（systemSettings.ts、systemConfig.ts、systemUpdate.ts）

### 18.1 基础设置

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/basic-settings` | ✅ | 基础设置 |
| GET | `/basic-settings/public` | 无 | 公开基础设置（登录页） |
| PUT | `/basic-settings` | ✅ | 更新基础设置 |
| GET | `/global-config` | ✅ | 全局配置 |
| PUT | `/global-config` | ✅ | 更新全局配置 |
| GET | `/info` | ✅ | 系统信息 |

### 18.2 安全设置

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/security-settings` | ✅ | 安全设置 |
| PUT | `/security-settings` | ✅ | 更新安全设置 |
| GET | `/console-security-config` | ✅ | 控制台安全配置 |

### 18.3 模块开关

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/modules/status` | ✅ | 模块启用状态 |

### 18.4 文件上传

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/upload-config` | ✅ | 上传配置 |
| POST | `/upload-image` | ✅ | 上传系统图片 |
| POST | `/upload-product-image` | ✅ | 上传产品图片 |
| POST | `/upload-avatar` | ✅ | 上传头像 |
| POST | `/upload-order-image` | ✅ | 上传订单图片 |
| POST | `/upload-service-image` | ✅ | 上传售后图片 |
| DELETE | `/delete-image` | ✅ | 删除图片 |

### 18.5 业务配置

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/order-field-config` | ✅ | 订单字段配置 |
| PUT | `/order-field-config` | ✅ | 更新订单字段配置 |
| GET | `/customer-field-config` | ✅ | 客户字段配置 |
| PUT | `/customer-field-config` | ✅ | 更新客户字段配置 |
| GET | `/payment-methods` | ✅ | 支付方式列表 |
| POST | `/payment-methods` | ✅ | 新增支付方式 |
| PUT | `/payment-methods/:id` | ✅ | 更新支付方式 |
| DELETE | `/payment-methods/:id` | ✅ | 删除支付方式 |

### 18.6 通知/邮件/短信/存储设置

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/call-settings` | ✅ | 通话设置 |
| PUT | `/call-settings` | ✅ | 更新通话设置 |
| GET | `/email-settings` | ✅ | 邮件设置 |
| PUT | `/email-settings` | ✅ | 更新邮件设置 |
| POST | `/email-settings/test` | ✅ | 测试邮件发送 |
| GET | `/sms-settings` | ✅ | 短信设置 |
| PUT | `/sms-settings` | ✅ | 更新短信设置 |
| GET | `/storage-settings` | ✅ | 存储设置 |
| PUT | `/storage-settings` | ✅ | 更新存储设置 |
| POST | `/test-oss-connection` | ✅ | 测试OSS连接 |
| GET | `/product-settings` | ✅ | 产品设置 |
| PUT | `/product-settings` | ✅ | 更新产品设置 |
| GET | `/backup-settings` | ✅ | 备份设置 |
| PUT | `/backup-settings` | ✅ | 更新备份设置 |
| GET | `/agreement-settings` | ✅ | 协议设置 |
| PUT | `/agreement-settings` | ✅ | 更新协议设置 |

### 18.7 部门管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/departments` | ✅ | 部门列表 |
| GET | `/departments/tree` | ✅ | 部门树形结构 |
| GET | `/departments/stats` | ✅ | 部门统计 |
| GET | `/departments/:id` | ✅ | 部门详情 |
| POST | `/departments` | ✅ | 创建部门 |
| PUT | `/departments/:id` | ✅ | 更新部门 |
| PATCH | `/departments/:id/status` | ✅ | 更新部门状态 |
| GET | `/my-departments` | ✅ | 我的部门 |

### 18.8 数据备份

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/backup/list` | ✅ | 备份列表 |
| POST | `/backup/create` | ✅ | 创建备份 |
| GET | `/backup/download/:filename` | ✅ | 下载备份 |
| DELETE | `/backup/:filename` | ✅ | 删除备份 |
| GET | `/backup/status` | ✅ | 备份状态 |
| POST | `/backup/restore/:filename` | ✅ | 恢复备份 |
| DELETE | `/backup/cleanup` | ✅ | 清理过期备份 |

### 18.9 系统监控 & 更新

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/monitor` | ✅ | 系统监控面板 |
| GET | `/update/check` | ✅ | 检查更新 |
| POST | `/update/apply` | ✅ | 应用更新 |

---

## 19. 数据管理 /data & /tenant-data

> 源文件：`routes/data.ts`、`routes/tenantData.ts`

### 19.1 数据导入导出 /data

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/import/customers` | ✅ | 导入客户 |
| POST | `/import/products` | ✅ | 导入产品 |
| POST | `/import/orders` | ✅ | 导入订单 |
| GET | `/export/customers` | ✅ | 导出客户 |
| GET | `/export/products` | ✅ | 导出产品 |
| GET | `/export/orders` | ✅ | 导出订单 |
| GET | `/templates/:type` | ✅ | 下载导入模板（共11个接口） |

### 19.2 租户数据 /tenant-data

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/viewer` | ✅ | 数据查看器 |
| GET | `/exportable-tables` | ✅ | 可导出表列表 |
| POST | `/export` | ✅ | 导出数据 |
| GET | `/export/:jobId` | ✅ | 导出任务状态 |
| GET | `/export/:jobId/download` | ✅ | 下载导出文件 |
| POST | `/import` | ✅ | 导入数据 |
| GET | `/import/:jobId` | ✅ | 导入任务状态 |

---

## 20. 虚拟库存 /virtual-inventory

> 路由前缀：`/api/v1/virtual-inventory`、`/api/v1/virtual-delivery`、`/api/v1/settings`  
> 源文件：`routes/virtualInventory.ts`、`routes/virtualDelivery.ts`、`routes/virtualSettings.ts`、`routes/virtualClaim.ts`

### 20.1 卡密管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/card-keys` | ✅ | 卡密列表 |
| GET | `/card-keys/stats` | ✅ | 卡密统计 |
| GET | `/card-keys/:id` | ✅ | 卡密详情 |
| POST | `/card-keys` | ✅ | 添加卡密 |
| POST | `/card-keys/batch` | ✅ | 批量添加 |
| PUT | `/card-keys/:id` | ✅ | 更新卡密 |
| DELETE | `/card-keys/:id` | ✅ | 删除卡密 |
| POST | `/card-keys/reserve` | ✅ | 预留卡密 |
| POST | `/card-keys/release` | ✅ | 释放卡密 |

### 20.2 虚拟资源

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/resources` | ✅ | 资源列表 |
| GET | `/resources/stats` | ✅ | 资源统计 |
| POST | `/resources` | ✅ | 添加资源 |
| POST | `/resources/batch` | ✅ | 批量添加 |
| PUT | `/resources/:id` | ✅ | 更新资源 |
| DELETE | `/resources/:id` | ✅ | 删除资源（共23个接口） |

### 20.3 虚拟发货

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/virtual-delivery/` | 创建虚拟发货 |
| POST | `/virtual-delivery/batch` | 批量发货 |
| GET | `/virtual-delivery/:orderId` | 发货详情 |
| POST | `/virtual-delivery/:orderId/mark-member-send` | 标记已发 |

### 20.4 虚拟领取（公开）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/public/virtual-claim/info` | 无 | 领取页信息 |
| POST | `/public/virtual-claim/login` | 无 | 领取登录验证 |
| GET | `/public/virtual-claim/detail` | 无 | 领取详情 |
| POST | `/public/virtual-claim/confirm` | 无 | 确认领取 |
| POST | `/public/virtual-claim/send-sms` | 无 | 发送验证码 |

---

## 21. 增值服务 /value-added

> 路由前缀：`/api/v1/value-added`  
> 源文件：`routes/valueAdded/` 目录

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/companies` | ✅ | 增值公司列表 |
| POST | `/companies` | ✅ | 新增公司 |
| PUT | `/companies/:id` | ✅ | 更新公司 |
| DELETE | `/companies/:id` | ✅ | 删除公司 |
| GET | `/orders` | ✅ | 增值订单列表 |
| POST | `/orders` | ✅ | 创建订单 |
| PUT | `/orders/:id` | ✅ | 更新订单 |
| DELETE | `/orders/:id` | ✅ | 删除订单（共24+4个接口） |

---

## 22. COD代收货款

> 源文件：`routes/codCollection.ts`、`routes/codApplication.ts`

### /cod-collection（10个接口）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 代收货款列表 |
| GET | `/:id` | ✅ | 详情 |
| POST | `/` | ✅ | 创建代收记录 |
| PUT | `/:id` | ✅ | 更新 |
| DELETE | `/:id` | ✅ | 删除 |
| POST | `/:id/confirm` | ✅ | 确认收款 |
| GET | `/statistics` | ✅ | 统计数据 |

### /cod-application（9个接口）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 代收申请列表 |
| POST | `/` | ✅ | 新建申请 |
| PUT | `/:id` | ✅ | 更新申请 |
| POST | `/:id/approve` | ✅ | 审批 |

---

## 23. 授权许可 /license & /tenant-license

> 源文件：`routes/license.ts`、`routes/tenantLicense.ts`

### /license（4个接口）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/info` | ✅ | 当前授权信息 |
| GET | `/check` | ✅ | 检查授权状态 |
| POST | `/activate` | ✅ | 激活授权 |
| POST | `/verify` | ✅ | 验证授权码 |

### /tenant-license（6个接口）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/check-private` | ✅ | 检查私有部署授权 |
| POST | `/verify` | ✅ | 验证授权 |
| POST | `/verify-code` | ✅ | 验证授权码 |
| GET | `/info` | ✅ | 授权详情 |
| POST | `/heartbeat` | ✅ | 心跳上报 |
| GET | `/resource-usage` | ✅ | 资源使用情况 |

---

## 24. 角色权限 /roles & /permissions

> 源文件：`routes/roles.ts`、`routes/permissions.ts`

### /roles（11个接口）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 角色列表 |
| GET | `/:id` | ✅ | 角色详情 |
| POST | `/` | ✅ | 创建角色 |
| PUT | `/:id` | ✅ | 更新角色 |
| DELETE | `/:id` | ✅ | 删除角色 |

### /permissions（5个接口）

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/tree` | ✅ | 权限树 |
| GET | `/my` | ✅ | 我的权限 |

---

## 25. 消息系统 /message

> 路由前缀：`/api/v1/message`  
> 源文件：`routes/message.ts`、`routes/messageCleanup.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 消息列表 |
| GET | `/unread-count` | ✅ | 未读消息数 |
| GET | `/:id` | ✅ | 消息详情 |
| PUT | `/:id/read` | ✅ | 标记已读 |
| PUT | `/read-all` | ✅ | 全部标记已读 |
| DELETE | `/:id` | ✅ | 删除消息 |
| DELETE | `/` | ✅ | 批量删除（共38+5个接口） |

---

## 26. 日志管理 /logs

> 路由前缀：`/api/v1/logs`  
> 源文件：`routes/logs.ts`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/` | ✅ | 操作日志列表 |
| GET | `/statistics` | ✅ | 日志统计 |
| GET | `/export` | ✅ | 导出日志 |
| GET | `/types` | ✅ | 日志类型列表 |
| DELETE | `/cleanup` | ✅ | 清理过期日志（共7个接口） |

---

## 27. 其他模块

### 27.1 客户分配 /assignment

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/rules` | 分配规则列表 |
| POST | `/rules` | 创建分配规则 |
| PUT | `/rules/:id` | 更新规则 |
| POST | `/assign` | 执行分配 |

### 27.2 客户共享 /customer-share

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 共享列表 |
| POST | `/` | 创建共享 |
| DELETE | `/:id` | 取消共享 |
| GET | `/permissions` | 共享权限 |

### 27.3 超时提醒 /timeout-reminder

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/config` | 提醒配置 |
| PUT | `/config` | 更新配置 |
| POST | `/check` | 立即检查 |
| GET | `/status` | 检查状态 |

### 27.4 在线坐席 /online-seat

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 在线坐席列表 |
| POST | `/login` | 坐席签入 |
| POST | `/logout` | 坐席签出 |
| GET | `/status` | 坐席状态 |

### 27.5 SDK 连接

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| SDK | `/sdk` | PC SDK 接口（3个） |
| Mobile SDK | `/mobile-sdk` | 移动 SDK 接口（3个） |
| QR Connection | `/qr-connection` | 二维码连接（5个） |
| Alternative | `/alternative-connection` | 备用连接（16个） |

---

## 28. 管理后台 /admin

> 路由前缀：`/api/v1/admin`  
> 源文件：`routes/admin/` 目录（37个文件）  
> 说明：SaaS 管理后台接口，用于管理租户、授权、支付等

### 28.1 管理员认证

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/auth/captcha` | 无 | 获取验证码 |
| POST | `/auth/login` | 无 | 管理员登录 |
| GET | `/auth/profile` | ✅ | 管理员信息 |
| PUT | `/auth/password` | ✅ | 修改密码 |

### 28.2 租户管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/tenants` | ✅ | 租户列表 |
| GET | `/tenants/:id` | ✅ | 租户详情 |
| GET | `/tenants/:id/users` | ✅ | 租户用户列表 |
| POST | `/tenants` | ✅ | 创建租户 |
| PUT | `/tenants/:id` | ✅ | 更新租户 |
| DELETE | `/tenants/:id` | ✅ | 删除租户 |
| POST | `/tenants/:id/suspend` | ✅ | 暂停租户 |
| POST | `/tenants/:id/resume` | ✅ | 恢复租户 |
| POST | `/tenants/:id/renew` | ✅ | 续费 |
| POST | `/tenants/:id/regenerate-license` | ✅ | 重新生成授权 |
| POST | `/tenants/:id/cleanup-data` | ✅ | 清理数据 |
| GET | `/tenants/:id/wecom-stats` | ✅ | 企微统计 |

### 28.3 授权管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/licenses` | ✅ | 授权列表 |
| GET | `/licenses/stats` | ✅ | 授权统计 |
| GET | `/licenses/:id` | ✅ | 授权详情 |
| POST | `/licenses` | ✅ | 创建授权 |
| PUT | `/licenses/:id` | ✅ | 更新授权 |
| POST | `/licenses/:id/revoke` | ✅ | 吊销授权 |
| POST | `/licenses/:id/renew` | ✅ | 续费授权 |
| DELETE | `/licenses/:id` | ✅ | 删除授权 |

### 28.4 支付管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/payment/config` | ✅ | 支付配置 |
| POST | `/payment/config/wechat` | ✅ | 微信支付配置 |
| POST | `/payment/config/alipay` | ✅ | 支付宝配置 |
| GET | `/payment/orders` | ✅ | 支付订单列表 |
| GET | `/payment/stats` | ✅ | 支付统计 |
| POST | `/payment/orders/:id/confirm` | ✅ | 确认付款 |
| POST | `/payment/orders/:id/refund` | ✅ | 退款 |

### 28.5 版本管理

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/versions` | ✅ | 版本列表 |
| POST | `/versions` | ✅ | 创建版本 |
| POST | `/versions/:id/publish` | ✅ | 发布版本 |
| POST | `/upload/version-package` | ✅ | 上传版本包 |

### 28.6 企微服务商管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/wecom-management/overview` | 企微总览 |
| GET | `/wecom-management/suite/config` | 套件配置 |
| PUT | `/wecom-management/suite/config` | 更新套件 |
| GET | `/wecom-management/tenant-auth` | 租户授权列表 |
| GET | `/wecom-management/ai/*` | AI 模型管理（共84个接口） |

### 28.7 其他管理模块

| 模块 | 路径前缀 | 接口数 | 说明 |
|------|----------|--------|------|
| 公告管理 | `/announcements` | 6 | 系统公告 CRUD |
| 套餐管理 | `/packages` | 4 | 订阅套餐管理 |
| 角色管理 | `/roles` | 6 | 管理后台角色 |
| 统计报表 | `/statistics` | 5 | 仪表盘统计 |
| 管理员用户 | `/admin-users` | 10 | 管理员账户管理 |
| 模块管理 | `/modules` | 9 | 功能模块开关 |
| 客户管理 | `/customer-management` | 5 | 私有客户管理 |
| 通知管理 | `/notifications` | 14 | 通知渠道+规则 |
| 回收站 | `/recycle-bin` | 4 | 已删除数据恢复 |
| 短信管理 | `/sms-management` | 8 | 短信模板审核 |
| 数据导出 | `/export` | 4 | 各类数据导出 |
| 更新任务 | `/update-tasks` | 7 | 系统更新管理 |
| API 密钥 | `/api-configs` | 11 | API 调用配置 |

---

## 29. 公开接口 /public

> 路由前缀：`/api/v1/public`  
> 源文件：`routes/public/` 目录  
> 说明：无需 CRM 账户认证，部分接口需要会员认证（memberAuth）

### 29.1 注册与会员

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/register/send-code` | 无 | 发送注册验证码 |
| POST | `/register` | 无 | 注册账户 |
| POST | `/member/login` | 无 | 会员登录 |
| POST | `/member/select-tenant` | 无 | 选择租户 |
| GET | `/member/profile` | 会员 | 会员资料 |
| PUT | `/member/profile` | 会员 | 更新资料 |
| GET | `/member/license` | 会员 | 授权信息 |
| GET | `/member/bills` | 会员 | 账单列表 |

### 29.2 支付

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/payment/create` | 会员 | 创建支付订单 |
| GET | `/payment/methods` | 无 | 可用支付方式 |
| GET | `/payment/query/:orderNo` | 会员 | 查询订单状态 |
| POST | `/payment/wechat/notify` | 无 | 微信支付回调 |
| POST | `/payment/alipay/notify` | 无 | 支付宝回调 |

### 29.3 订阅

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/subscription/create` | 会员 | 创建订阅 |
| GET | `/subscription/status` | 会员 | 订阅状态 |
| POST | `/subscription/cancel` | 会员 | 取消订阅 |

### 29.4 其他公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/packages` | 套餐列表 |
| GET | `/version-check` | 版本检查 |
| GET | `/website-config` | 官网配置 |
| GET | `/license-query` | 授权查询 |

---

## 附录

### A. WebSocket 实时通信

| 服务 | 路径 | 协议 | 说明 |
|------|------|------|------|
| CRM WebSocket | `/ws` | Socket.IO | PC端实时推送（订单通知、消息提醒） |
| 移动端 WebSocket | `/mobile-ws` | 原生 WS | 移动APP实时推送 |

### B. 静态文件服务

| 路径 | 说明 |
|------|------|
| `/uploads/*` | 上传文件（图片、附件） |
| `/recordings/*` | 通话录音文件 |
| `/h5/*` | H5 侧边栏应用 |

### C. 环境变量配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `API_PREFIX` | /api/v1 | API路由前缀 |
| `DB_HOST` | localhost | 数据库地址 |
| `DB_PORT` | 3306 | 数据库端口 |
| `DB_DATABASE` | crm | 数据库名 |
| `DB_USERNAME` | root | 数据库用户 |
| `DB_PASSWORD` | - | 数据库密码 |
| `JWT_SECRET` | - | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | 24h | Token有效期 |
| `CORS_ORIGIN` | http://localhost:5173 | 允许的跨域源 |
| `MP_FORM_SECRET` | mp_default_secret_key_2026 | 小程序签名密钥 |
| `MP_APP_ID` | - | 小程序 AppID |
| `MP_APP_SECRET` | - | 小程序 AppSecret |
| `NODE_ENV` | development | 运行环境 |
| `DEPLOY_MODE` | private | 部署模式 (private/saas) |

### D. 角色权限说明

| 角色 | 标识 | 数据范围 |
|------|------|----------|
| 超级管理员 | super_admin | 全部数据 |
| 管理员 | admin | 全部数据 |
| 客服 | customer_service | 全部数据 |
| 经理 | manager | 本部门数据 |
| 销售员 | sales | 仅自己数据 |

---

> **文档说明**  
> 本文档基于源码自动提取生成，覆盖后端全部 **163 个路由文件、约 1400+ 个 API 接口**。  
> 各接口的详细请求/响应参数请参考对应源文件中的 Joi 验证规则和响应构造。  
> 如需 Swagger/OpenAPI 格式文档，可基于本文档进一步集成 `swagger-jsdoc` 自动生成。
