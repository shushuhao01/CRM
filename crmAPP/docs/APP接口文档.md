# CRM手机APP接口文档

> 版本：v1.1  
> 更新日期：2025-12-26  
> 基础地址：`https://api.yourcrm.com`
> 
> **更新说明**：
> - 新增服务器连接测试接口 (Ping)
> - 完善设备绑定接口（支持两种绑定方式）
> - 新增通话统计、录音管理、跟进记录等完整接口
> - 补充外呼发起接口

---

## 一、通用说明

### 1.1 请求格式

```
Content-Type: application/json
Authorization: Bearer <token>  // 登录后的接口需要带上
```

### 1.2 响应格式

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}

// 错误响应
{
  "success": false,
  "message": "错误信息",
  "code": "ERROR_CODE"
}
```

### 1.3 错误码

| 错误码 | 说明 |
|-------|------|
| AUTH_FAILED | 认证失败，Token无效或过期 |
| DEVICE_NOT_BOUND | 设备未绑定 |
| DEVICE_BINDLIMIT | 设备绑定数量超限 |
| INVALID_PARAMS | 参数错误 |

---

## 二、认证接口

### 2.0 服务器连接测试（Ping）

用于APP测试服务器是否可连接，无需认证。

```
GET /api/v1/mobile/ping
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "message": "pong",
  "data": {
    "serverTime": "2025-12-26T10:30:00.000Z",
    "version": "1.0.0",
    "serverName": "CRM外呼系统"
  }
}
```

### 2.1 APP登录

用户在APP上登录，获取Token。

```
POST /api/v1/mobile/login
```

**请求参数**：
```json
{
  "username": "zhangsan",
  "password": "123456",
  "deviceInfo": {
    "deviceId": "设备唯一标识",
    "deviceName": "iPhone 15 Pro",
    "deviceModel": "Apple iPhone15,3",
    "osType": "ios",
    "osVersion": "17.0",
    "appVersion": "1.0.0"
  }
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "id": "user_001",
      "username": "zhangsan",
      "realName": "张三",
      "department": "销售部",
      "role": "sales_staff"
    }
  }
}
```

---

## 三、设备绑定接口

### 3.1 生成绑定二维码（PC端调用）

PC端生成二维码，供APP扫描绑定。

```
POST /api/v1/call-config/work-phones/qrcode
Authorization: Bearer <token>
```

**请求参数**：
```json
{
  "userId": "user_001"  // 可选，默认当前登录用户
}
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "data": {
    "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgA...",
    "connectionId": "bind_admin_1766672373918_8rbb5qex7",
    "expiresAt": "2025-12-25T14:24:33.918Z"
  }
}
```

**二维码内容（JSON格式）**：
```json
{
  "type": "work_phone_bind",
  "connectionId": "bind_admin_1766672373918_8rbb5qex7",
  "userId": "admin",
  "serverUrl": "http://localhost:3000",
  "expiresAt": 1766672673918
}
```

### 3.1.1 生成绑定二维码（移动端方式）

移动端APP登录后生成绑定二维码。

```
POST /api/v1/mobile/bindQRCode
Authorization: Bearer <token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "qrCodeData": {
      "action": "bind_device",
      "token": "uuid-bind-token",
      "serverUrl": "https://your-domain.com",
      "wsUrl": "wss://your-domain.com/ws/mobile",
      "userId": "user_001",
      "expiresAt": "2025-12-25T14:30:00.000Z"
    },
    "qrCodeImage": "data:image/png;base64,...",
    "expiresAt": "2025-12-25T14:30:00.000Z"
  }
}
```

### 3.2 检查绑定状态（PC端轮询）

PC端轮询检查绑定状态。

```
GET /api/v1/call-config/work-phones/bind-status/:connectionId
Authorization: Bearer <token>
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "data": {
    "status": "pending"  // pending | connected | expired
  }
}
```

绑定成功时：
```json
{
  "code": 200,
  "success": true,
  "data": {
    "status": "connected",
    "phone": {
      "id": 1,
      "phoneNumber": "13800138000",
      "deviceName": "iPhone 15 Pro",
      "deviceModel": "iPhone15,3"
    }
  }
}
```

### 3.3 扫码绑定设备（APP调用）

APP扫描二维码后，调用此接口完成绑定。支持两种绑定方式：

**方式一：通过 callConfig 路由绑定（推荐）**
```
POST /api/v1/call-config/work-phones/bind
```

**请求参数**：
```json
{
  "connectionId": "bind_admin_1766672373918_8rbb5qex7",
  "deviceInfo": {
    "phoneNumber": "13800138000",
    "deviceName": "iPhone 15 Pro",
    "deviceModel": "iPhone15,3",
    "deviceId": "uuid-device-id"
  }
}
```

**方式二：通过 mobile 路由绑定**
```
POST /api/v1/mobile/bind
```

**请求参数**：
```json
{
  "bindToken": "uuid-bind-token",
  "phoneNumber": "13800138000",
  "deviceInfo": {
    "deviceId": "uuid-device-id",
    "deviceName": "iPhone 15 Pro",
    "deviceModel": "iPhone15,3",
    "osType": "ios",
    "osVersion": "17.0",
    "appVersion": "1.0.0"
  }
}
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "message": "绑定成功",
  "data": {
    "phoneId": 1,
    "deviceId": "uuid-device-id",
    "userId": "user_001",
    "wsToken": "eyJhbGciOiJIUzI1NiIs...",
    "wsUrl": "wss://your-domain.com/ws/mobile"
  }
}
```

**错误响应**：
| 状态码 | 错误信息 |
|-------|---------|
| 400 | 缺少必要参数 |
| 400 | 绑定请求已过期 |
| 400 | 该手机号已绑定 |
| 404 | 绑定请求不存在或已过期 |

### 3.4 解绑设备

```
DELETE /api/v1/call-config/work-phones/:id
Authorization: Bearer <token>
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "message": "解绑成功"
}
```

### 3.5 获取已绑定的工作手机列表

```
GET /api/v1/call-config/work-phones
Authorization: Bearer <token>
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "data": [
    {
      "id": 1,
      "phoneNumber": "13800138000",
      "deviceName": "iPhone 15 Pro",
      "deviceModel": "iPhone15,3",
      "onlineStatus": "online",
      "isPrimary": true,
      "lastActiveAt": "2025-12-25T10:30:00Z",
      "createdAt": "2025-12-20T09:00:00Z"
    }
  ]
}
```

### 3.6 设置主要工作手机

```
PUT /api/v1/call-config/work-phones/:id/primary
Authorization: Bearer <token>
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "message": "已设为主要手机"
}
```

---

## 四、通话状态接口

### 4.1 上报通话状态（APP调用）

APP在通话状态变化时调用。

```
POST /api/v1/mobile/call/status
```

**请求参数**：
```json
{
  "callId": "call_20251225_abc123",
  "status": "connected",
  "timestamp": 1703491200000
}
```

**status 可选值**：
| 值 | 说明 |
|---|------|
| ringing | 对方振铃中 |
| connected | 已接通 |

**响应**：
```json
{
  "success": true
}
```

### 4.2 上报通话结束（APP调用）

通话结束后，APP调用此接口上报通话结果。

```
POST /api/v1/mobile/call/end
```

**请求参数**：
```json
{
  "callId": "call_20251225_abc123",
  "status": "connected",
  "startTime": "2025-12-25T10:30:00Z",
  "endTime": "2025-12-25T10:33:00Z",
  "duration": 180,
  "hasRecording": true
}
```

**status 可选值**：
| 值 | 说明 |
|---|------|
| connected | 已接通（有通话） |
| missed | 未接听 |
| busy | 对方忙线 |
| rejected | 对方拒接 |
| failed | 呼叫失败 |

**响应**：
```json
{
  "success": true,
  "data": {
    "callId": "call_20251225_abc123",
    "recordingUploadUrl": "https://api.yourcrm.com/api/v1/mobile/recording/upload"
  }
}
```

### 4.3 上传录音文件（APP调用）

```
POST /api/v1/mobile/recording/upload
Content-Type: multipart/form-data
```

**请求参数**：
| 字段 | 类型 | 说明 |
|-----|------|------|
| callId | string | 通话记录ID |
| file | File | 录音文件（mp3/m4a/wav） |
| duration | number | 录音时长（秒） |

**响应**：
```json
{
  "success": true,
  "data": {
    "recordingUrl": "https://api.yourcrm.com/recordings/2025/12/25/call_xxx.mp3",
    "fileSize": 1024000
  }
}
```

### 4.4 获取录音列表

```
GET /api/v1/calls/recordings
```

**请求参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| page | number | 页码，默认1 |
| pageSize | number | 每页数量，默认20 |
| callId | string | 通话ID（可选） |
| customerId | string | 客户ID（可选） |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

**响应**：
```json
{
  "success": true,
  "data": {
    "recordings": [
      {
        "id": "rec_001",
        "callId": "call_001",
        "customerName": "张三",
        "customerPhone": "138****5678",
        "userName": "销售员A",
        "fileName": "recording_001.mp3",
        "filePath": "/recordings/2025/12/25/recording_001.mp3",
        "fileUrl": "https://...",
        "fileSize": 1024000,
        "duration": 180,
        "format": "mp3",
        "storageType": "local",
        "createdAt": "2025-12-25T10:30:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 4.5 流式播放录音

```
GET /api/v1/calls/recordings/stream/{recordingPath}
```

**说明**：支持范围请求（Range），用于音频seek功能。

**响应头**：
```
Content-Type: audio/mpeg
Content-Disposition: inline; filename="recording.mp3"
Accept-Ranges: bytes
```

### 4.6 下载录音

```
GET /api/v1/calls/recordings/{id}/download
```

**响应**：
```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "filename": "recording_001.mp3"
  }
}
```

### 4.7 删除录音

```
DELETE /api/v1/calls/recordings/{id}
```

**响应**：
```json
{
  "success": true,
  "message": "录音删除成功"
}
```

### 4.8 获取录音存储统计

```
GET /api/v1/calls/recordings/stats
```

**响应**：
```json
{
  "success": true,
  "data": {
    "totalCount": 1500,
    "totalSize": 5368709120,
    "todayCount": 25,
    "todaySize": 89128960
  }
}
```


---

## 五、通话跟进接口

### 5.0 发起外呼

```
POST /api/v1/calls/outbound
Authorization: Bearer <token>
```

**请求参数**：
```json
{
  "customerId": "cust_001",
  "customerPhone": "13800138000",
  "customerName": "张三",
  "notes": "客户咨询产品"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "callId": "call_20251225_abc123",
    "status": "calling",
    "message": "正在呼叫..."
  }
}
```

### 5.1 提交通话跟进记录（APP调用）

通话结束后，APP调用此接口提交备注、标签等跟进信息。数据会同步到通话记录、跟进记录和客户信息。

```
POST /api/v1/mobile/call/followup
```

**请求参数**：
```json
{
  "callId": "call_20251225_abc123",
  "notes": "客户对产品感兴趣，需要发送报价单",
  "tags": ["意向", "需报价"],
  "intention": "high",
  "followUpRequired": true,
  "nextFollowUpDate": "2025-12-28T09:00:00Z",
  "customerId": "cust_001"
}
```

**参数说明**：
| 字段 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| callId | string | 是 | 通话记录ID |
| notes | string | 否 | 通话备注 |
| tags | string[] | 否 | 快捷标签：意向、无意向、再联系、成交等 |
| intention | string | 否 | 客户意向：high/medium/low/none |
| followUpRequired | boolean | 否 | 是否需要后续跟进 |
| nextFollowUpDate | string | 否 | 下次跟进时间（ISO格式） |
| customerId | string | 否 | 客户ID（用于更新客户信息） |

**响应**：
```json
{
  "code": 200,
  "success": true,
  "message": "跟进记录已保存",
  "data": {
    "callId": "call_20251225_abc123",
    "customerId": "cust_001",
    "synced": true
  }
}
```

**数据同步说明**：
- `call_records`表：更新notes和call_tags字段
- `follow_up_records`表：创建新的跟进记录
- `customers`表：更新tags、follow_status、last_contact_time、next_follow_time

### 5.2 获取通话详情（APP调用）

```
GET /api/v1/mobile/call/:callId
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "call_20251225_abc123",
    "customerId": "cust_001",
    "customerName": "张三",
    "customerPhone": "138****5678",
    "customerLevel": "vip",
    "customerTags": ["意向客户", "VIP"],
    "followStatus": "interested",
    "callType": "outbound",
    "callStatus": "connected",
    "startTime": "2025-12-25T10:30:00Z",
    "endTime": "2025-12-25T10:33:00Z",
    "duration": 180,
    "hasRecording": true,
    "recordingUrl": "/recordings/2025/12/25/call_xxx.mp3",
    "notes": "客户对产品感兴趣",
    "callTags": ["意向", "需报价"],
    "followUpRequired": true,
    "followUpRecords": [
      {
        "id": "followup_001",
        "content": "客户对产品感兴趣，需要发送报价单\n标签: 意向, 需报价",
        "intention": "high",
        "nextFollowUpDate": "2025-12-28T09:00:00Z",
        "userName": "张三",
        "createdAt": "2025-12-25T10:35:00Z"
      }
    ]
  }
}
```

### 5.3 获取通话记录列表（APP调用）

```
GET /api/v1/mobile/calls?page=1&pageSize=20&callType=outbound&startDate=2025-12-01&endDate=2025-12-25
```

**查询参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| page | number | 页码，默认1 |
| pageSize | number | 每页数量，默认20 |
| callType | string | 通话类型：outbound/inbound |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

**响应**：
```json
{
  "code": 200,
  "success": true,
  "data": {
    "records": [
      {
        "id": "call_001",
        "customerId": "cust_001",
        "customerName": "张三",
        "customerPhone": "138****5678",
        "callType": "outbound",
        "callStatus": "connected",
        "startTime": "2025-12-25T10:30:00Z",
        "duration": 180,
        "hasRecording": true,
        "notes": "客户对产品感兴趣",
        "callTags": ["意向"]
      }
    ],
    "total": 56,
    "page": 1,
    "pageSize": 20
  }
}
```

### 5.4 获取今日通话统计（APP调用）

```
GET /api/v1/mobile/stats/today
```

**响应**：
```json
{
  "code": 200,
  "success": true,
  "data": {
    "totalCalls": 12,
    "connectedCalls": 8,
    "missedCalls": 4,
    "inboundCalls": 3,
    "outboundCalls": 9,
    "totalDuration": 2700,
    "avgDuration": 225,
    "connectRate": 67
  }
}
```

### 5.5 获取通话统计数据（PC端/APP通用）

```
GET /api/v1/calls/statistics
```

**请求参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| startDate | string | 开始日期 YYYY-MM-DD |
| endDate | string | 结束日期 YYYY-MM-DD |
| userId | string | 用户ID（可选） |
| department | string | 部门（可选） |

**响应**：
```json
{
  "success": true,
  "data": {
    "totalCalls": 156,
    "connectedCalls": 120,
    "missedCalls": 36,
    "incomingCalls": 45,
    "outgoingCalls": 111,
    "totalDuration": 28800,
    "averageDuration": 185,
    "connectionRate": 77,
    "todayIncrease": 12,
    "dailyStats": [
      {
        "date": "2025-12-25",
        "calls": 15,
        "duration": 3600,
        "connectionRate": 80
      }
    ],
    "userStats": [
      {
        "userId": "user_001",
        "userName": "张三",
        "calls": 45,
        "duration": 9000,
        "connectionRate": 82
      }
    ]
  }
}
```

### 5.6 获取通话记录列表（PC端）

```
GET /api/v1/calls/records
```

**请求参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| page | number | 页码，默认1 |
| pageSize | number | 每页数量，默认20 |
| customerId | string | 客户ID（可选） |
| callType | string | 通话类型：inbound/outbound |
| callStatus | string | 通话状态：connected/missed/busy/failed |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| userId | string | 用户ID（可选） |
| keyword | string | 搜索关键词（客户名/电话/备注） |

**响应**：
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "call_001",
        "customerId": "cust_001",
        "customerName": "张三",
        "customerPhone": "138****5678",
        "callType": "outbound",
        "callStatus": "connected",
        "startTime": "2025-12-25T10:30:00Z",
        "endTime": "2025-12-25T10:33:00Z",
        "duration": 180,
        "hasRecording": true,
        "recordingUrl": "/recordings/...",
        "notes": "客户对产品感兴趣",
        "callTags": ["意向", "需报价"],
        "followUpRequired": true,
        "userId": "user_001",
        "userName": "销售员A",
        "department": "销售部",
        "createdAt": "2025-12-25T10:30:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 5.7 创建通话记录

```
POST /api/v1/calls/records
Authorization: Bearer <token>
```

**请求参数**：
```json
{
  "customerId": "cust_001",
  "customerName": "张三",
  "customerPhone": "13800138000",
  "callType": "outbound",
  "callStatus": "connected",
  "startTime": "2025-12-25T10:30:00Z",
  "endTime": "2025-12-25T10:33:00Z",
  "duration": 180,
  "notes": "客户咨询产品",
  "followUpRequired": false
}
```

**响应**：
```json
{
  "success": true,
  "message": "通话记录创建成功",
  "data": {
    "id": "call_20251225_abc123",
    ...
  }
}
```

### 5.8 更新通话记录

```
PUT /api/v1/calls/records/{id}
Authorization: Bearer <token>
```

**请求参数**：
```json
{
  "notes": "更新的备注",
  "callTags": ["意向", "需报价"],
  "followUpRequired": true
}
```

### 5.9 结束通话

```
PUT /api/v1/calls/records/{id}/end
Authorization: Bearer <token>
```

**请求参数**：
```json
{
  "endTime": "2025-12-25T10:33:00Z",
  "duration": 180,
  "notes": "通话备注",
  "followUpRequired": true
}
```

### 5.10 删除通话记录

```
DELETE /api/v1/calls/records/{id}
Authorization: Bearer <token>
```

### 5.11 获取跟进记录列表

```
GET /api/v1/calls/followups
```

**请求参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| page | number | 页码 |
| pageSize | number | 每页数量 |
| customerId | string | 客户ID |
| callId | string | 通话ID |
| status | string | 状态：pending/completed |
| priority | string | 优先级：high/medium/low |
| userId | string | 创建人ID |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

**响应**：
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "followup_001",
        "callId": "call_001",
        "customerId": "cust_001",
        "customerName": "张三",
        "type": "call",
        "content": "客户对产品感兴趣，需要发送报价单",
        "customerIntent": "high",
        "callTags": ["意向", "需报价"],
        "nextFollowUp": "2025-12-28T09:00:00Z",
        "priority": "high",
        "status": "pending",
        "createdBy": "user_001",
        "createdByName": "销售员A",
        "createdAt": "2025-12-25T10:35:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

### 5.12 创建跟进记录

```
POST /api/v1/calls/followups
Authorization: Bearer <token>
```

**请求参数**：
```json
{
  "callId": "call_001",
  "customerId": "cust_001",
  "customerName": "张三",
  "type": "call",
  "content": "客户对产品感兴趣",
  "customerIntent": "high",
  "callTags": ["意向", "需报价"],
  "nextFollowUpDate": "2025-12-28T09:00:00Z",
  "priority": "high",
  "status": "pending"
}
```

---

## 六、WebSocket通信

### 5.1 连接地址

```
wss://api.yourcrm.com/ws/mobile?token=<wsToken>
```

### 5.2 连接流程

```
1. APP绑定成功后获取 wsToken
2. 使用 wsToken 建立 WebSocket 连接
3. 连接成功后发送 DEVICE_ONLINE 消息
4. 保持心跳（每30秒发送一次）
5. 接收服务器推送的拨号指令
```

### 5.3 消息格式

所有消息都是JSON格式：

```json
{
  "type": "消息类型",
  "messageId": "唯一消息ID",
  "timestamp": 1703491200000,
  "data": { ... }
}
```

### 5.4 APP发送的消息

#### 5.4.1 设备上线

连接成功后立即发送：

```json
{
  "type": "DEVICE_ONLINE",
  "messageId": "msg_001",
  "timestamp": 1703491200000,
  "data": {
    "deviceId": "device_001",
    "appVersion": "1.0.0"
  }
}
```

#### 5.4.2 心跳

每30秒发送一次：

```json
{
  "type": "HEARTBEAT",
  "timestamp": 1703491200000
}
```

#### 5.4.3 通话状态变更

```json
{
  "type": "CALL_STATUS",
  "messageId": "msg_002",
  "timestamp": 1703491200000,
  "data": {
    "callId": "call_20251225_abc123",
    "status": "connected"
  }
}
```

#### 5.4.4 通话结束

```json
{
  "type": "CALL_END",
  "messageId": "msg_003",
  "timestamp": 1703491200000,
  "data": {
    "callId": "call_20251225_abc123",
    "status": "connected",
    "duration": 180,
    "hasRecording": true
  }
}
```

### 5.5 服务器推送的消息

#### 5.5.1 心跳响应

```json
{
  "type": "HEARTBEAT_ACK",
  "timestamp": 1703491200100
}
```

#### 5.5.2 拨号指令 ⭐重要

PC端点击拨打后，服务器推送此消息给APP：

```json
{
  "type": "DIAL_COMMAND",
  "messageId": "msg_dial_001",
  "timestamp": 1703491200000,
  "data": {
    "callId": "call_20251225_abc123",
    "customerPhone": "13912345678",
    "customerName": "张三",
    "customerId": "cust_001",
    "orderId": "order_001"
  }
}
```

**APP收到后应该**：
1. 保存 callId（用于后续上报）
2. 调用系统拨号器拨打 customerPhone
3. 开始监听通话状态

#### 5.5.3 取消拨号

```json
{
  "type": "CANCEL_DIAL",
  "messageId": "msg_cancel_001",
  "timestamp": 1703491200000,
  "data": {
    "callId": "call_20251225_abc123",
    "reason": "用户取消"
  }
}
```

#### 5.5.4 设备解绑通知

```json
{
  "type": "DEVICE_UNBIND",
  "messageId": "msg_unbind_001",
  "timestamp": 1703491200000,
  "data": {
    "reason": "管理员解绑"
  }
}
```

**APP收到后应该**：
1. 断开WebSocket连接
2. 清除本地登录状态
3. 跳转到登录/绑定页面

---

## 七、APP开发指南

### 7.1 核心流程

```
┌─────────────────────────────────────────────────────────────┐
│                      APP核心流程                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  启动APP                                                    │
│     │                                                       │
│     ▼                                                       │
│  检查是否已登录？ ──否──► 显示登录页面 ──► 登录成功          │
│     │是                                    │                │
│     ▼                                      │                │
│  检查是否已绑定？ ──否──► 显示扫码绑定页面 ◄┘                │
│     │是                                    │                │
│     ▼                                      │                │
│  建立WebSocket连接 ◄───────────────────────┘                │
│     │                                                       │
│     ▼                                                       │
│  显示主页（等待拨号指令）                                    │
│     │                                                       │
│     ▼                                                       │
│  收到 DIAL_COMMAND ──► 调起系统拨号 ──► 监听通话状态        │
│                                              │              │
│                                              ▼              │
│                                         通话结束            │
│                                              │              │
│                                              ▼              │
│                                    上报通话结果+上传录音     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Android关键代码示例

```kotlin
// 1. 调起系统拨号
fun dialPhone(phoneNumber: String) {
    val intent = Intent(Intent.ACTION_CALL)
    intent.data = Uri.parse("tel:$phoneNumber")
    startActivity(intent)
}

// 2. 监听通话状态
val phoneStateListener = object : PhoneStateListener() {
    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
        when (state) {
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                // 通话中
                sendCallStatus("connected")
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                // 通话结束
                sendCallEnd()
            }
        }
    }
}

// 3. WebSocket连接
val webSocket = OkHttpClient().newWebSocket(
    Request.Builder().url("wss://api.yourcrm.com/ws/mobile?token=$wsToken").build(),
    object : WebSocketListener() {
        override fun onMessage(webSocket: WebSocket, text: String) {
            val message = Gson().fromJson(text, WsMessage::class.java)
            when (message.type) {
                "DIAL_COMMAND" -> handleDialCommand(message.data)
                "HEARTBEAT_ACK" -> { /* 心跳响应 */ }
            }
        }
    }
)
```

### 7.3 iOS关键代码示例

```swift
// 1. 调起拨号（iOS只能跳转到拨号界面）
func dialPhone(phoneNumber: String) {
    if let url = URL(string: "tel://\(phoneNumber)") {
        UIApplication.shared.open(url)
    }
}

// 2. 监听通话状态（使用CallKit）
let callObserver = CXCallObserver()
callObserver.setDelegate(self, queue: nil)

func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
    if call.hasConnected && !call.hasEnded {
        sendCallStatus("connected")
    }
    if call.hasEnded {
        sendCallEnd()
    }
}

// 3. WebSocket连接
let webSocketTask = URLSession.shared.webSocketTask(with: URL(string: "wss://api.yourcrm.com/ws/mobile?token=\(wsToken)")!)
webSocketTask.resume()
```

---

## 八、测试说明

### 8.1 测试环境

```
测试服务器：https://test-api.yourcrm.com
测试账号：testuser / 123456
```

### 8.2 测试流程

1. 使用测试账号登录APP
2. 在PC端生成绑定二维码
3. APP扫码绑定
4. PC端点击拨打测试
5. 检查APP是否收到拨号指令
6. 检查通话记录是否正确上报

---

## 九、联系方式

如有接口问题，请联系：
- 后端开发：xxx@company.com
- 技术支持：xxx

