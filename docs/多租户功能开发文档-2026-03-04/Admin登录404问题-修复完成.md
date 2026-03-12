# Admin后台登录404问题 - 修复完成

## 问题描述

Admin后台管理系统登录时报错：
```
POST http://localhost:5174/api/v1/admin/auth/login 404 (Not Found)
Request failed with status code 404
```

## 根本原因

**admin/src/api/request.ts** 中硬编码了 `baseURL: '/api/v1/admin'`，没有使用环境变量。

这导致：
1. 即使修改 `.env` 文件也不会生效
2. Axios直接向前端服务器 (localhost:5174) 发送请求
3. Vite的proxy配置无法拦截请求

## 架构说明（重要！）

### 三个前端项目共用一个后端

```
Backend (后端)
└─ http://localhost:3000
   ├─ /api/v1/auth          (CRM登录)
   ├─ /api/v1/customers     (CRM业务)
   ├─ /api/v1/admin/*       (Admin后台)
   └─ /api/v1/public/*      (官网)

CRM前端 (:5173)
├─ Proxy: /api → :3000
└─ 请求: /api/v1/*

Admin后台 (:5174)
├─ Proxy: /api/v1/admin → :3000
└─ 请求: /api/v1/admin/*

官网 (:8080)
├─ Proxy: /api → :3000
└─ 请求: /api/v1/public/*
```

## 修复方案

### 1. 修改 admin/src/api/request.ts

**修改前：**
```typescript
const instance = axios.create({
  baseURL: '/api/v1/admin',  // ❌ 硬编码
  timeout: 30000
})
```

**修改后：**
```typescript
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1/admin',  // ✅ 使用环境变量
  timeout: 30000
})
```

### 2. 确认 admin/.env 配置

```env
# 开发环境配置
VITE_API_BASE_URL=/api/v1/admin
```

### 3. 确认 admin/vite.config.ts 的proxy配置

```typescript
server: {
  port: 5174,
  proxy: {
    '/api/v1/admin': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

## 工作流程

1. Admin前端发起请求: `/api/v1/admin/auth/login`
2. Vite proxy拦截: `/api/v1/admin/*`
3. 转发到后端: `http://localhost:3000/api/v1/admin/auth/login`
4. 后端处理并返回响应

## 验证步骤

1. 刷新浏览器页面 (http://localhost:5174)
2. 输入用户名和密码
3. 点击登录
4. 应该能正常登录或返回正确的错误信息（如用户名密码错误）

## 注意事项

⚠️ **重要提醒**：
- CRM项目 (端口5173) 是正常的，不要修改！
- Admin后台 (端口5174) 和官网 (端口8080) 都使用同一个后端 (端口3000)
- 修改前端配置后需要重启对应的前端服务
- 不要修改后端的路由配置，问题在前端

## 修复时间

2026-03-03 17:10

## 状态

✅ 已修复并重启Admin前端服务
