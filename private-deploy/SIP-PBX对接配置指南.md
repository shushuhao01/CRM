# SIP/PBX 系统对接配置指南

> 版本: 1.8.0 | 更新日期: 2026-06-15  
> 适用系统: FreePBX / Asterisk / FusionPBX / 其他支持 HTTP Webhook 的 PBX

---

## 一、概述

CRM 系统通过两个 Webhook 接口接收 PBX/SIP 系统的呼入通知和通话状态变更：

| 接口 | URL | 说明 |
|------|-----|------|
| 呼入通知 | `POST {CRM_API}/api/v1/calls/webhook/sip/incoming` | PBX 收到来电时调用 |
| 状态更新 | `POST {CRM_API}/api/v1/calls/webhook/sip/status` | 通话接听/挂断/失败时调用 |

`{CRM_API}` 示例: `https://crm.example.com` 或 `http://192.168.1.100:3000`

---

## 二、安全配置

### 2.1 Webhook 密钥

在 CRM 后端 `.env` 文件中配置：

```env
SIP_WEBHOOK_SECRET=your-strong-random-secret-key
```

PBX 发送请求时需携带密钥，支持两种方式（任选其一）：

**方式A: HTTP Header（推荐）**
```
X-Webhook-Secret: your-strong-random-secret-key
```

**方式B: 请求体字段**
```json
{
  "secret": "your-strong-random-secret-key",
  "callerNumber": "13800138888",
  ...
}
```

> 若 `SIP_WEBHOOK_SECRET` 环境变量未设置，则跳过验证（仅限开发调试）。

### 2.2 网络安全建议

- 配置防火墙仅允许 PBX 服务器 IP 访问 Webhook 端口
- 生产环境务必使用 HTTPS
- 定期轮换 Webhook 密钥

---

## 三、接口详情

### 3.1 呼入通知 `/sip/incoming`

**请求方法**: `POST`  
**Content-Type**: `application/json`

**请求体**:
```json
{
  "callerNumber": "13800138888",       // 必填，主叫号码（客户号码）
  "calledNumber": "02188888888",       // 必填，被叫号码（企业DID号码）
  "callId": "sip-1717430400-abc123",   // 可选，PBX侧通话唯一ID
  "trunkId": "trunk-001",             // 可选，中继线路ID
  "trunkName": "主线路",              // 可选，中继线路名称
  "tenantCode": "company-a",          // 可选，SaaS模式下的租户编码
  "secret": "your-webhook-secret"     // 可选（如果不通过Header传递）
}
```

**成功响应** (200):
```json
{
  "success": true,
  "message": "呼入通知已处理",
  "data": {
    "callId": "SIP-IN-1717430400123-a1b2c3d",
    "customerName": "张三",
    "customerId": "cust_001",
    "assignedUserId": "user_sales01",
    "assignedUserName": "销售员A",
    "agentBusy": false
  }
}
```

**CRM处理逻辑**:
1. 根据主叫号码匹配客户信息
2. 根据被叫号码(DID)查找呼入路由 → 线路分配 → 客户专属销售（优先级递增）
3. 检查坐席状态：就绪时推送来电弹窗，忙碌时只记录不弹窗
4. 创建 `call_records` 记录（`call_type=inbound`, `call_status=ringing`）
5. 通过 WebSocket 推送 `CALL_INCOMING` 事件到 CRM 前端

### 3.2 通话状态更新 `/sip/status`

**请求方法**: `POST`  
**Content-Type**: `application/json`

**请求体**:
```json
{
  "callId": "SIP-IN-1717430400123-a1b2c3d",  // 必填，通话ID（来自 incoming 响应）
  "event": "answered",                         // 必填，事件类型
  "duration": 120,                             // 可选，通话时长(秒)
  "hangupCause": "normal",                     // 可选，挂断原因
  "recordingUrl": "https://pbx.example.com/recordings/xxx.wav",  // 可选
  "ringDuration": 8                            // 可选，振铃时长(秒)
}
```

**event 取值**:

| event | 说明 | CRM映射状态 |
|-------|------|------------|
| `ringing` | 振铃中 | `ringing` |
| `answered` | 已接听 | `connected` |
| `hangup` | 挂断 | `connected`(有时长) / `missed`(无时长) |
| `failed` | 呼叫失败 | `failed` |
| `busy` | 忙线 | `busy` |
| `no_answer` | 无人接听 | `missed` |

**成功响应** (200):
```json
{
  "success": true,
  "message": "状态已更新"
}
```

---

## 四、PBX 系统配置示例

### 4.1 FreePBX 配置

#### 方法1: 自定义 Destinations + AGI 脚本

1. **创建 AGI 脚本** `/var/lib/asterisk/agi-bin/crm_webhook.sh`:
```bash
#!/bin/bash
# CRM 呼入 Webhook 通知脚本

CRM_API="https://crm.example.com"
WEBHOOK_SECRET="your-strong-random-secret-key"

# 从 AGI 环境变量读取通话信息
read -r line
while [ "$line" != "" ]; do
    # 解析 AGI 变量
    if echo "$line" | grep -q "agi_callerid:"; then
        CALLER_NUMBER=$(echo "$line" | cut -d: -f2 | tr -d ' ')
    fi
    if echo "$line" | grep -q "agi_dnid:"; then
        CALLED_NUMBER=$(echo "$line" | cut -d: -f2 | tr -d ' ')
    fi
    if echo "$line" | grep -q "agi_uniqueid:"; then
        CALL_ID=$(echo "$line" | cut -d: -f2 | tr -d ' ')
    fi
    read -r line
done

# 发送呼入通知
curl -s -X POST "${CRM_API}/api/v1/calls/webhook/sip/incoming" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: ${WEBHOOK_SECRET}" \
  -d "{
    \"callerNumber\": \"${CALLER_NUMBER}\",
    \"calledNumber\": \"${CALLED_NUMBER}\",
    \"callId\": \"${CALL_ID}\",
    \"trunkId\": \"freepbx-main\",
    \"trunkName\": \"FreePBX主线路\"
  }" &

# AGI 正常退出
echo "EXEC NOOP \"CRM Webhook sent\""
```

2. **设置权限**:
```bash
chmod +x /var/lib/asterisk/agi-bin/crm_webhook.sh
chown asterisk:asterisk /var/lib/asterisk/agi-bin/crm_webhook.sh
```

3. **在 FreePBX 入站路由** 的 "Set Destination" 前添加自定义拨号计划:
   - 进入 **Admin → Custom Extensions** 或 **Settings → Custom Dialplan**
   - 添加到 `[from-did-custom]`:
```ini
exten => _X.,1,AGI(crm_webhook.sh)
exten => _X.,n,Return()
```

#### 方法2: Asterisk AMI 事件监听

编辑 `/etc/asterisk/manager.conf` 启用 AMI:
```ini
[crm_webhook]
secret = ami-secret-key
read = call,cdr
write = 
eventfilter = Event: Newchannel
eventfilter = Event: Hangup
```

使用 Node.js AMI 客户端监听并转发到 CRM Webhook（需独立进程）。

### 4.2 Asterisk (原生) 配置

在 `extensions.conf` 中配置呼入触发:

```ini
[incoming]
; 所有来电先通知 CRM，再转接分机
exten => _X.,1,NoOp(Incoming call from ${CALLERID(num)} to ${EXTEN})
exten => _X.,n,Set(CRM_RESPONSE=${CURL(https://crm.example.com/api/v1/calls/webhook/sip/incoming,callerNumber=${CALLERID(num)}&calledNumber=${EXTEN}&callId=${UNIQUEID}&secret=your-webhook-secret)})
exten => _X.,n,NoOp(CRM Response: ${CRM_RESPONSE})
exten => _X.,n,Goto(default,${EXTEN},1)

; 挂断时通知 CRM
exten => h,1,Set(DURATION=${CDR(duration)})
exten => h,n,Set(CRM_STATUS=${CURL(https://crm.example.com/api/v1/calls/webhook/sip/status,callId=${UNIQUEID}&event=hangup&duration=${DURATION}&hangupCause=${HANGUPCAUSE})})
```

> **注意**: Asterisk 的 `func_curl` 模块需要安装。运行 `module load func_curl.so` 或在 `modules.conf` 中添加 `load => func_curl.so`。

### 4.3 FusionPBX 配置

FusionPBX 支持 Lua 脚本处理来电事件：

1. **创建 Lua 脚本** `/usr/share/freeswitch/scripts/crm_incoming.lua`:

```lua
-- CRM 呼入 Webhook 通知
local api = freeswitch.API()
local caller_number = session:getVariable("caller_id_number")
local called_number = session:getVariable("destination_number")
local call_id = session:getVariable("uuid")

local crm_api = "https://crm.example.com"
local webhook_secret = "your-strong-random-secret-key"

local json_body = string.format(
  '{"callerNumber":"%s","calledNumber":"%s","callId":"%s","trunkId":"fusionpbx","trunkName":"FusionPBX","secret":"%s"}',
  caller_number, called_number, call_id, webhook_secret
)

-- 异步发送 HTTP 请求
local cmd = string.format(
  'curl -s -X POST "%s/api/v1/calls/webhook/sip/incoming" -H "Content-Type: application/json" -d \'%s\'',
  crm_api, json_body
)
os.execute(cmd .. " &")

freeswitch.consoleLog("INFO", "CRM Webhook sent for call " .. call_id .. "\n")
```

2. **在拨号计划中调用**: 进入 FusionPBX 管理面板 → Dialplan → Inbound Routes → 添加 Action:
   - Type: `lua`
   - Data: `crm_incoming.lua`
   - Order: 设为最小值（最先执行）

### 4.4 通用 HTTP 方式（适用于任何支持 Webhook 的 PBX）

如果 PBX 支持自定义 HTTP Webhook（如 3CX、Yeastar、华为 eSpace 等），直接配置：

- **URL**: `https://crm.example.com/api/v1/calls/webhook/sip/incoming`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`, `X-Webhook-Secret: your-secret`
- **Body**: 按照上述 JSON 格式映射 PBX 的字段

---

## 五、呼入路由配置（CRM 管理后台）

CRM 支持通过 `inbound_routes` 表配置 DID 号码到坐席的映射：

```sql
-- 示例：02188888001 直接分配给 user_sales01
INSERT INTO inbound_routes (id, name, did_number, route_type, target_user_id, is_enabled)
VALUES ('route_001', '销售热线', '02188888001', 'direct', 'user_sales01', 1);

-- 示例：02188888002 使用振铃组
INSERT INTO inbound_routes (id, name, did_number, route_type, target_group, queue_strategy, is_enabled)
VALUES ('route_002', '客服热线', '02188888002', 'ring_group', '["user_cs01","user_cs02","user_cs03"]', 'round_robin', 1);
```

**路由匹配优先级**（从高到低）：
1. `inbound_routes` 表中匹配的 DID 路由
2. `user_line_assignments` + `call_lines` 表中匹配的线路分配
3. 客户专属销售（`customers.sales_rep_id`）— 最终覆盖

---

## 六、对接验证清单

### 6.1 基础连通性测试

```bash
# 测试 Webhook 连通性（无密钥模式）
curl -X POST http://your-crm-server:3000/api/v1/calls/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 期望返回: {"success":true,"message":"回调接收成功",...}
```

### 6.2 呼入通知测试

```bash
# 模拟 SIP 呼入
curl -X POST http://your-crm-server:3000/api/v1/calls/webhook/sip/incoming \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-webhook-secret" \
  -d '{
    "callerNumber": "13800138888",
    "calledNumber": "02188888888",
    "callId": "test-call-001",
    "trunkId": "test-trunk",
    "trunkName": "测试线路"
  }'

# 验证:
# 1. 返回 success: true
# 2. CRM 前端收到来电弹窗（如果 assignedUserId 匹配当前登录用户）
# 3. 数据库 call_records 表新增一条 inbound 记录
```

### 6.3 状态更新测试

```bash
# 模拟接听
curl -X POST http://your-crm-server:3000/api/v1/calls/webhook/sip/status \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-webhook-secret" \
  -d '{"callId": "test-call-001", "event": "answered"}'

# 模拟挂断
curl -X POST http://your-crm-server:3000/api/v1/calls/webhook/sip/status \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-webhook-secret" \
  -d '{
    "callId": "test-call-001",
    "event": "hangup",
    "duration": 65,
    "hangupCause": "normal",
    "ringDuration": 8
  }'

# 验证:
# 1. call_records 中该记录 call_status 更新为 connected
# 2. duration、end_time、ring_duration 已填充
```

### 6.4 密钥验证测试

```bash
# 错误密钥应返回 403
curl -X POST http://your-crm-server:3000/api/v1/calls/webhook/sip/incoming \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wrong-key" \
  -d '{"callerNumber":"13800138888","calledNumber":"02188888888"}'

# 期望返回: {"success":false,"message":"Webhook密钥验证失败"}
```

### 6.5 端到端链路验证

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | PBX 收到外线来电 | PBX 触发 AGI/Lua/Webhook 脚本 |
| 2 | 脚本调用 `/sip/incoming` | CRM 返回 callId 和匹配信息 |
| 3 | CRM 推送 WebSocket | 前端弹出来电弹窗（含客户信息） |
| 4 | 坐席点击"接听" | 前端调用 `updateCallStatus(callId, 'connected')` |
| 5 | 通话进行中 | 前端显示通话计时器 |
| 6 | 通话结束，PBX 调用 `/sip/status` | CRM 更新通话记录（时长、录音等） |
| 7 | 坐席填写跟进记录 | 通话记录关联跟进信息 |

---

## 七、环境变量参考

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SIP_WEBHOOK_SECRET` | SIP Webhook 验证密钥 | `a1b2c3d4e5f6...` |
| `SERVER_URL` | CRM 服务器地址（供 APP 扫码等使用） | `https://crm.example.com` |

---

## 八、常见问题

**Q: PBX 调用 Webhook 返回 401/403？**  
A: 检查 `SIP_WEBHOOK_SECRET` 环境变量和请求中的密钥是否一致。

**Q: 来电弹窗不显示？**  
A: 确认 CRM 前端 WebSocket 连接正常，坐席状态为"就绪"，且 `assignedUserId` 与当前登录用户匹配。

**Q: 客户信息显示"未知来电"？**  
A: 主叫号码未匹配到客户表的 `phone` 或 `mobile` 字段，检查号码格式（是否含国际区号）。

**Q: 多租户场景下呼入无法匹配正确租户？**  
A: 在 Webhook 请求体中传入 `tenantCode` 字段，与 `tenants` 表的 `code` 列对应。
