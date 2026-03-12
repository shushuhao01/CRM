# Admin后台登录问题修复说明

## 问题描述
Admin后台管理系统无法登录，提示"API端点不存在"。

## 问题原因
在 `backend/src/routes/admin/index.ts` 中，systemConfig路由的注册方式有误：

```typescript
// 错误的写法
router.use('/', systemConfigRouter);
```

这会导致systemConfig路由拦截所有路径（包括 `/auth`），使得auth登录路由无法被访问。

## 修复方案
将systemConfig路由的注册改为：

```typescript
// 正确的写法
router.use(systemConfigRouter);
```

## 修复步骤

1. 已修改 `backend/src/routes/admin/index.ts` 文件
2. 需要重启后端服务以使更改生效

## 手动重启后端服务

请按以下步骤操作：

### 方法1：使用命令行
```bash
# 1. 停止所有占用3000端口的进程
# Windows PowerShell:
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# 2. 进入backend目录并启动
cd backend
npm run dev
```

### 方法2：使用任务管理器
1. 打开任务管理器（Ctrl+Shift+Esc）
2. 找到所有名为"node.exe"的进程
3. 结束这些进程
4. 在backend目录运行 `npm run dev`

## 验证修复

重启后端后，测试admin登录API：

```bash
curl -X POST http://localhost:3000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
```

应该返回登录成功或用户名密码错误，而不是404。

## 注意事项

- Admin后台的API端点是 `/api/v1/admin/*`
- Admin前端配置文件 `admin/.env` 和 `admin/src/api/request.ts` 中的baseURL应该匹配
- 当前配置：
  - `.env`: `/api/admin`  
  - `request.ts`: `/api/v1/admin` ✅ 正确

## 后续建议

如果问题仍然存在，请检查：
1. 后端是否成功重启
2. 是否有多个node进程在运行
3. 端口3000是否被正确释放
