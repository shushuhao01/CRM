# WebSocket实时推送功能说明

## 功能概述

本次更新实现了WebSocket实时推送功能，确保系统消息和第三方通知渠道都能实时推送到用户端。

## 核心特性

### 1. 实时消息推送
- 系统消息创建后立即通过WebSocket推送到目标用户
- 支持按用户ID、角色、部门定向推送
- 支持广播消息给所有在线用户

### 2. 第三方通知状态反馈
- 钉钉、企业微信等第三方通知发送后，状态实时反馈给用户
- 发送成功/失败都会通过WebSocket通知

### 3. 智能降级机制
- WebSocket连接失败时自动降级为HTTP轮询（每30秒）
- WebSocket连接成功后自动停止轮询

### 4. 桌面通知支持
- 支持浏览器桌面通知
- 紧急消息会持续显示直到用户处理

## 安装依赖

运行以下命令安装WebSocket依赖：

```bash
# Windows
install-websocket-deps.bat

# 或手动安装
cd backend && npm install socket.io
cd .. && npm install socket.io-client
```

## 技术架构

### 后端 (backend/src/services/WebSocketService.ts)
- 基于Socket.IO实现
- JWT Token认证
- 用户/角色/部门房间管理
- 消息推送API

### 前端 (src/services/webSocketService.ts)
- 自动连接/重连管理
- 消息事件订阅
- 桌面通知集成
- 状态管理集成

## 消息推送流程

```
1. 系统消息创建 (MessageController.sendSystemMessage)
   ↓
2. 保存到数据库
   ↓
3. WebSocket推送 (webSocketService.pushSystemMessage)
   ↓
4. 前端接收 (new_message事件)
   ↓
5. 更新本地状态 + 显示通知
```

## API说明

### 后端推送API

```typescript
// 推送给指定用户
webSocketService.sendToUser(userId, 'new_message', data)

// 推送给指定角色
webSocketService.sendToRole('admin', 'new_message', data)

// 推送给指定部门
webSocketService.sendToDepartment(departmentId, 'new_message', data)

// 广播给所有用户
webSocketService.broadcast('new_message', data)

// 推送系统消息（自动判断目标）
webSocketService.pushSystemMessage(message, { userId: 1 })
```

### 前端订阅API

```typescript
// 订阅新消息
webSocketService.onMessage((message) => {
  console.log('收到新消息:', message)
})

// 订阅连接状态
webSocketService.onStatusChange((status) => {
  console.log('连接状态:', status)
})

// 订阅未读数量
webSocketService.onUnreadCountChange((count) => {
  console.log('未读数量:', count)
})
```

## 注意事项

1. WebSocket服务需要socket.io依赖，未安装时会自动降级为HTTP轮询
2. 生产环境需要配置正确的CORS_ORIGIN
3. JWT_SECRET需要与认证服务保持一致

## 更新日期

2025-12-19
