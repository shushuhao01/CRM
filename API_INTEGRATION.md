# API集成说明

## 概述

本CRM系统已经从模拟数据迁移到真实API调用。系统现在支持：
- 真实后端API调用
- 开发环境下的Mock API（当后端不可用时）
- 灵活的环境配置

## 配置说明

### 环境变量

在项目根目录下有以下环境配置文件：

- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置

### API配置

主要配置项：
```
VITE_API_BASE_URL=http://localhost:3000/api  # API基础URL
```

## API端点

### 客户管理 (Customer)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/customers` | 获取客户列表 |
| POST | `/customers` | 创建新客户 |
| PUT | `/customers/:id` | 更新客户信息 |
| DELETE | `/customers/:id` | 删除客户 |
| GET | `/customers/:id` | 获取客户详情 |
| GET | `/customers/search` | 搜索客户 |

### 订单管理 (Order)

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/orders` | 获取订单列表 |
| POST | `/orders` | 创建新订单 |
| PUT | `/orders/:id` | 更新订单信息 |
| DELETE | `/orders/:id` | 删除订单 |
| GET | `/orders/:id` | 获取订单详情 |
| POST | `/orders/:id/audit` | 审核订单 |

## 数据格式

### 客户数据结构

```typescript
interface Customer {
  id: string
  name: string
  phone: string
  age: number
  address: string
  level: 'normal' | 'silver' | 'gold'
  salesPersonId: string
  orderCount: number
  createTime: string
  createdBy: string
  wechatId?: string
  email?: string
  company?: string
  position?: string
  source?: string
  tags?: string[]
  remarks?: string
}
```

### API响应格式

```typescript
interface ApiResponse<T> {
  code: number
  message: string
  data: T
  success: boolean
}
```

### 分页响应格式

```typescript
interface ListResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
```

## Mock API

当检测到以下条件时，系统会自动使用Mock API：
- 开发环境 (`import.meta.env.DEV` 为 true)
- API_BASE_URL 包含 `localhost` 或 `127.0.0.1`

Mock API提供了基本的CRUD操作和数据持久化（在内存中）。

## 错误处理

系统包含完整的错误处理机制：
- 网络错误处理
- API错误响应处理
- 超时处理
- 用户友好的错误提示

## 认证

API请求会自动包含认证token（如果存在）：
```
Authorization: Bearer <token>
```

Token从以下位置获取：
- localStorage.getItem('token')
- sessionStorage.getItem('token')

## 开发指南

### 添加新的API端点

1. 在 `src/api/config.ts` 中添加端点配置
2. 在对应的API文件中添加方法
3. 如需要，在Mock API中添加对应的模拟实现
4. 在Store中调用新的API方法

### 切换到真实API

1. 确保后端API服务正在运行
2. 更新 `.env.development` 中的 `VITE_API_BASE_URL`
3. 重启开发服务器

### 部署到生产环境

1. 更新 `.env.production` 中的 `VITE_API_BASE_URL`
2. 构建项目：`npm run build`
3. 部署构建产物

## 注意事项

1. 所有模拟数据已被移除，系统现在依赖API调用
2. 在没有后端的情况下，Mock API会提供基本功能
3. 生产环境必须配置正确的API地址
4. 确保后端API遵循文档中定义的数据格式