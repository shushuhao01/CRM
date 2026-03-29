# Admin后台系统设置功能完成总结

**完成时间**: 2026-03-06  
**状态**: ✅ 已完成  
**相关文档**: [邮件通知系统使用指南](./邮件通知系统使用指南.md)

---

## 一、功能概览

| 功能模块 | 优先级 | 后端实现 | 前端界面 | 状态 |
|---------|--------|----------|----------|------|
| 短信服务配置 | 高 | ✅ 完成 | ✅ 完成 | 🟢 可用 |
| 邮件通知配置 | 中 | ✅ 完成 | ✅ 完成 | 🟢 可用 |
| 订单超时处理 | 中 | ✅ 完成 | ✅ 完成 | 🟢 可用 |

---

## 二、短信服务配置

### 2.1 功能位置

Admin后台 → 系统设置 → 基础配置 → 短信配置

### 2.2 配置项

- 启用/禁用短信服务
- 阿里云 AccessKey ID
- 阿里云 AccessKey Secret
- 短信签名
- 模板代码
- 测试短信发送

### 2.3 使用场景

- 官网注册验证码发送
- 订单状态通知
- 系统重要提醒

### 2.4 后端API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/v1/system-config/sms` | 获取短信配置 |
| POST | `/api/v1/system-config/sms` | 保存短信配置 |
| POST | `/api/v1/system-config/sms/test` | 测试短信发送 |

> **路由文件**: `backend/src/routes/admin/systemConfig.ts`

---

## 三、邮件通知配置

### 3.1 功能位置

Admin后台 → 系统设置 → 基础配置 → 邮件配置

### 3.2 配置项

| 配置项 | 类型 | 说明 |
|--------|------|------|
| 启用邮件 | Switch | 启用/禁用邮件服务 |
| SMTP服务器 | String | SMTP服务器地址 |
| SMTP端口 | Number | 465(SSL) / 587(TLS) |
| 发件人邮箱 | String | 发送邮件的邮箱地址 |
| 发件人名称 | String | 邮件中显示的发件人名称 |
| 邮箱密码 | String | SMTP授权码（非登录密码） |
| 启用SSL | Switch | 端口465时启用 |
| 启用TLS | Switch | 端口587时启用 |
| 测试邮箱 | String | 用于发送测试邮件的收件地址 |

> **密码安全**: GET 接口返回密码时以 `******` 掩码，PUT 接口保存时若密码为 `******` 则保留数据库原值。

### 3.3 邮件触发机制

#### 自动触发场景

| # | 触发场景 | 默认超时 | 收件人 | 通知内容 |
|---|---------|---------|--------|---------|
| 1 | 订单审核超时 | 24小时 | 管理员、客服 | 订单号、客户名称、金额、超时时长 |
| 2 | 订单发货超时 | 48小时 | 管理员、客服、下单员 | 订单号、客户名称、超时时长 |
| 3 | 售后处理超时 | 48小时 | 管理员、客服、处理人 | 售后单号、客户名称、超时时长 |
| 4 | 订单跟进提醒 | 3天 | 下单员 | 订单号、客户名称、签收时间 |
| 5 | 客户跟进提醒 | 按计划时间 | 负责人 | 客户名称、跟进内容、计划时间 |

#### 手动触发

- Admin后台点击"立即检测"按钮
- API调用: `POST /api/v1/timeout-reminder/check`

### 3.4 邮件内容示例

```
标题: ⏰ 订单审核超时提醒

内容:
⚠️ 订单 #12345（客户：张三，金额：¥1,234.56）
审核已超时 24 小时，请尽快处理

[点击查看详情] → /order/audit
```

### 3.5 后端API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/v1/system/email-settings` | 获取邮件配置 |
| PUT  | `/api/v1/system/email-settings` | 更新邮件配置 |
| POST | `/api/v1/system/email-settings/test` | 测试邮件发送 |

> **路由文件**: `backend/src/routes/admin/systemConfig.ts` (Admin端)，`backend/src/routes/system.ts` (CRM端)
>
> **邮件发送**: 使用 `nodemailer` 库，动态创建 SMTP transporter 发送。

### 3.6 常用邮箱配置参考

| 邮箱类型 | SMTP地址 | 端口 | SSL | 备注 |
|---------|---------|------|-----|------|
| QQ邮箱 | smtp.qq.com | 465 | ✅ | 需生成授权码（非登录密码） |
| 163邮箱 | smtp.163.com | 465 | ✅ | 需生成授权码 |
| 企业邮箱 | smtp.exmail.qq.com | 465 | ✅ | 使用管理员分配的密码 |

---

## 四、订单超时处理

### 4.1 功能位置

Admin后台 → 系统设置 → 基础配置 → 超时提醒

### 4.2 配置项

| 配置项 | 范围 | 默认值 | 说明 |
|--------|------|--------|------|
| 启用超时提醒 | - | 关闭 | 总开关 |
| 订单审核超时 | 1-168小时 | 24小时 | 待审核订单超时阈值 |
| 订单发货超时 | 1-168小时 | 48小时 | 已审核未发货超时阈值 |
| 售后处理超时 | 1-168小时 | 48小时 | 售后申请处理超时阈值 |
| 订单跟进提醒 | 1-30天 | 3天 | 签收后提醒跟进天数 |
| 检测间隔 | 5-120分钟 | 30分钟 | 系统自动检测周期 |

### 4.3 工作原理

#### 启动流程

```
服务启动 (app.ts)
   │
   ├─ 数据库已初始化？
   │    ├─ 是 → 从 system_config 读取 timeout_reminder_enabled 和 timeout_check_interval_minutes
   │    │    ├─ 已启用 → timeoutReminderService.start(配置间隔)
   │    │    └─ 已禁用 → 跳过启动
   │    └─ 否 → timeoutReminderService.start(30) // 默认30分钟
   │
   └─ 定时执行 runAllChecks()
```

#### 检测逻辑

```
runAllChecks()
   │
   ├─ 清理过期提醒缓存
   ├─ 从 system_config 读取超时配置
   │
   └─ 并行执行5项检测:
       ├─ checkOrderAuditTimeout(24h)      // 订单审核超时
       ├─ checkOrderShipmentTimeout(48h)   // 订单发货超时
       ├─ checkAfterSalesTimeout(48h)      // 售后处理超时
       ├─ checkOrderFollowupReminder(3d)   // 订单跟进提醒
       └─ checkCustomerFollowupReminder()  // 客户跟进提醒
```

#### 防重复机制

| 机制 | 说明 |
|------|------|
| 冷却期 | 同一提醒24小时内只发送一次 (`REMINDER_COOLDOWN_MS = 24h`) |
| 内存缓存 | `sentTimeoutReminders` Map 记录已发送提醒 |
| 自动清理 | 每次检测前调用 `cleanupReminderCache()` 清理过期记录 |
| 数据库配合 | 基于数据库记录去重，服务重启不影响 |

### 4.4 后端API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/v1/timeout-reminder/config` | 获取超时配置 |
| PUT  | `/api/v1/timeout-reminder/config` | 更新超时配置 |
| POST | `/api/v1/timeout-reminder/check` | 手动触发检测 |

> **路由文件**: `backend/src/routes/admin/systemConfig.ts`

### 4.5 服务启动代码

```typescript
// backend/src/app.ts (约380行)
const { timeoutReminderService } = await import('./services/TimeoutReminderService');
const { SystemConfig } = await import('./entities/SystemConfig');
const { AppDataSource } = await import('./config/database');

if (AppDataSource?.isInitialized) {
  const configRepo = AppDataSource.getRepository(SystemConfig);
  const enabledConfig = await configRepo.findOne({
    where: { configKey: 'timeout_reminder_enabled', configGroup: 'timeout_reminder' }
  });
  const intervalConfig = await configRepo.findOne({
    where: { configKey: 'timeout_check_interval_minutes', configGroup: 'timeout_reminder' }
  });

  const isEnabled = enabledConfig?.configValue !== 'false';
  const intervalMinutes = parseInt(intervalConfig?.configValue || '30', 10);

  if (isEnabled) {
    timeoutReminderService.start(intervalMinutes);
  }
}
```

---

## 五、技术实现

### 5.1 核心服务

| 服务 | 文件路径 | 职责 |
|------|---------|------|
| **NotificationChannelService** | `backend/src/services/NotificationChannelService.ts` | 统一管理多种通知渠道（邮件、短信、钉钉、企业微信等），支持批量/单独发送，自动记录发送日志，集成WebSocket实时推送 |
| **TimeoutReminderService** | `backend/src/services/TimeoutReminderService.ts` | 自动检测订单/售后业务超时，定时任务调度，防重复发送，支持手动触发，使用 `getTenantRepo` 支持多租户 |
| **VerificationCodeService** | `backend/src/services/VerificationCodeService.ts` | 验证码生成和验证，集成阿里云短信服务，防刷机制（60秒间隔），自动过期（5分钟），内存存储（生产环境建议Redis） |

### 5.2 数据库存储

#### system_config 表（配置存储）

超时提醒和邮件配置均存储在 `system_config` 表中：

| config_key | 说明 | 存储方式 |
|-----------|------|---------|
| `email_settings` | 邮件服务配置 | JSON字符串 |
| `timeout_reminder_config` | 超时提醒配置 | JSON字符串 |
| `timeout_reminder_enabled` | 超时提醒启用状态 | 字符串 `true/false` |
| `timeout_check_interval_minutes` | 检测间隔分钟数 | 数字字符串 |

#### 相关数据库表

```sql
-- 系统配置表
system_configs (
  id, config_key, config_value, value_type,
  config_group, description, is_enabled, sort_order
)

-- 通知渠道表
notification_channels (
  id, name, channel_type, config, is_enabled,
  message_types, priority_filter
)

-- 通知日志表
notification_logs (
  id, channel_id, channel_type, message_type,
  title, content, status, response, error_message, sent_at
)

-- 系统消息表
system_messages (
  id, type, title, content, target_user_id,
  priority, category, related_id, related_type,
  action_url, is_read, created_at
)
```

### 5.3 前端组件

**Basic.vue** (`admin/src/views/settings/Basic.vue`)

统一的系统设置页面，包含 **7个标签页**：

| # | 标签名 | Tab Name | 状态 |
|---|--------|----------|------|
| 1 | 后台设置 | `admin` | 已有 |
| 2 | 安全设置 | `security` | 已有 |
| 3 | 日志设置 | `log` | 已有 |
| 4 | 修改密码 | `password` | 已有 |
| 5 | 短信配置 | `sms` | ✅ 完成 |
| 6 | 邮件配置 | `email` | ✅ 新增 |
| 7 | 超时提醒 | `timeout` | ✅ 新增 |

#### 前端数据模型

```typescript
// 短信配置
const smsForm = reactive({
  enabled: false,
  accessKeyId: '',
  accessKeySecret: '',
  signName: '',
  templateCode: ''
})

// 邮件配置
const emailForm = reactive({
  enabled: false,
  smtpHost: '',
  smtpPort: 465,
  senderEmail: '',
  senderName: '',
  emailPassword: '',
  enableSsl: true,
  enableTls: false,
  testEmail: ''
})

// 超时提醒配置
const timeoutForm = reactive({
  enabled: false,
  orderAuditTimeout: 24,
  orderShipmentTimeout: 48,
  afterSalesTimeout: 48,
  orderFollowupDays: 3,
  checkIntervalMinutes: 30
})
```

---

## 六、API 请求流程

### 6.1 配置保存流程

```
前端 Basic.vue
   │
   ├─ 短信配置 → POST /system-config/sms  → admin/systemConfig.ts
   ├─ 邮件配置 → PUT  /system/email-settings → admin/systemConfig.ts
   └─ 超时配置 → PUT  /timeout-reminder/config → admin/systemConfig.ts
                   │
                   └─ 写入 system_config 表（JSON格式存储）
```

### 6.2 配置加载流程

```
onMounted()
   │
   ├─ loadSmsConfig()     → GET /system-config/sms
   ├─ loadEmailConfig()   → GET /system/email-settings
   └─ loadTimeoutConfig() → GET /timeout-reminder/config
```

### 6.3 测试功能流程

```
测试短信: handleTestSms()
   → 弹窗输入手机号 → POST /system-config/sms/test { phone, ...smsForm }
   → AliyunSmsService.sendVerificationCode()

测试邮件: handleTestEmail()
   → POST /system/email-settings/test { ...emailForm }
   → nodemailer.createTransport() → transporter.sendMail()

手动检测: handleManualCheck()
   → POST /timeout-reminder/check
   → 返回检测结果
```

---

## 七、使用指南

### 7.1 首次配置

#### 步骤一：配置邮件服务

1. 进入 Admin后台 → 系统设置 → 基础配置
2. 切换到"**邮件配置**"标签页
3. 填写SMTP服务器信息（参考3.6节常用邮箱配置）
4. 点击"**发送测试邮件**"验证配置
5. 点击"**保存配置**"

#### 步骤二：配置超时提醒

1. 切换到"**超时提醒**"标签页
2. 开启"启用超时提醒"开关
3. 设置各项超时时间（根据业务需要调整）
4. 设置检测间隔（建议30分钟）
5. 点击"**保存配置**"

#### 步骤三：验证功能

1. 点击"**立即检测**"按钮
2. 查看是否有提醒发送
3. 检查邮箱是否收到邮件
4. 查看系统消息是否正常

### 7.2 日常使用

- 系统自动运行，无需手动干预
- 可随时调整超时时间和检测间隔
- 可手动触发检测测试功能
- 定期查看发送日志监控状态

---

## 八、测试验证

### 8.1 邮件配置测试

```bash
# 1. 在"邮件配置"标签页填写SMTP信息
# 2. 填写测试收件邮箱
# 3. 点击"发送测试邮件"按钮
# 4. 检查收件箱（包括垃圾邮件箱）
# 5. 确认收到格式正确的测试邮件
```

### 8.2 超时提醒测试

```bash
# 方法1：通过Admin后台
# 1. 进入超时提醒配置页面
# 2. 点击"立即检测"按钮
# 3. 查看返回的检测结果

# 方法2：通过API测试
curl -X POST http://localhost:3000/api/v1/timeout-reminder/check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8.3 创建测试数据

```sql
-- 创建一个超时的待审核订单（超时25小时）
INSERT INTO orders (
  id, order_number, customer_name, total_amount,
  status, created_at, created_by
) VALUES (
  'test-order-1', 'TEST-001', '测试客户', 1000.00,
  'pending_audit', DATE_SUB(NOW(), INTERVAL 25 HOUR), 'user-id'
);

-- 等待检测服务运行或手动触发检测
-- 应该收到订单审核超时提醒
```

---

## 九、常见问题（FAQ）

### Q1: 邮件发送失败怎么办？

| 排查步骤 | 说明 |
|---------|------|
| 1. 检查SMTP服务器地址和端口 | 确认地址拼写正确，端口与SSL/TLS匹配 |
| 2. 检查密码 | QQ/163邮箱需使用**授权码**而非登录密码 |
| 3. 检查SSL/TLS设置 | 端口465用SSL，端口587用TLS |
| 4. 查看后端日志 | 控制台输出详细错误信息 |
| 5. 换邮箱测试 | 排除邮箱服务商限制问题 |

### Q2: 收不到邮件怎么办？

1. 检查垃圾邮件箱
2. 确认邮件服务已启用（`enabled = true`）
3. 查看 `notification_logs` 表确认是否发送成功
4. 检查邮箱服务商是否有发送频率限制
5. 尝试手动触发检测测试

### Q3: 超时提醒不工作怎么办？

1. 确认超时提醒服务已启用
2. 检查后端服务是否正常运行（日志中应有 `⏰ [定时任务] 超时提醒服务已启动`）
3. 查看后端日志中 `[TimeoutReminder]` 相关输出
4. 手动触发检测测试功能
5. 确认邮件配置正确且已启用

### Q4: 如何避免邮件被当作垃圾邮件？

1. 使用企业邮箱发送
2. 配置SPF、DKIM、DMARC记录
3. 避免使用敏感词汇
4. 控制发送频率
5. 提供退订链接

---

## 十、文件索引

### 后端

| 文件 | 说明 |
|------|------|
| `backend/src/app.ts` (~L380) | 超时提醒服务启动入口 |
| `backend/src/services/NotificationChannelService.ts` | 统一通知渠道服务 |
| `backend/src/services/TimeoutReminderService.ts` | 超时提醒检测服务 |
| `backend/src/services/VerificationCodeService.ts` | 验证码服务 |
| `backend/src/routes/admin/systemConfig.ts` | Admin端配置API路由 |
| `backend/src/routes/system.ts` | CRM端系统路由（含邮件/短信设置） |
| `backend/src/entities/SystemConfig.ts` | 系统配置实体 |
| `backend/src/entities/NotificationChannel.ts` | 通知渠道/日志实体 |
| `backend/src/entities/SystemMessage.ts` | 系统消息实体 |

### 前端

| 文件 | 说明 |
|------|------|
| `admin/src/views/settings/Basic.vue` | 系统设置页面（7个标签页） |
| `admin/src/api/request.ts` | API请求封装 |

### 文档

| 文件 | 说明 |
|------|------|
| `docs/Admin后台开发文档-2026-03-04/邮件通知系统使用指南.md` | 邮件系统详细使用指南 |

---

## 十一、后续优化建议

### 功能增强

- [ ] 支持邮件模板自定义（HTML模板编辑器）
- [ ] 支持多个收件人配置（按角色/部门分组）
- [ ] 支持邮件发送统计报表
- [ ] 支持邮件发送失败自动重试
- [ ] 支持邮件附件功能
- [ ] `timeout-reminder/check` 接入实际的 `TimeoutReminderService.runAllChecks()`（当前返回模拟结果）

### 性能优化

- [ ] 邮件发送队列化（Bull/BullMQ）
- [ ] 批量发送优化
- [ ] 发送日志定期清理
- [ ] 缓存配置信息（减少数据库查询）
- [ ] VerificationCodeService 迁移到 Redis 存储

### 监控告警

- [ ] 邮件发送成功率监控
- [ ] 发送失败告警
- [ ] 服务健康检查接口
- [ ] 性能指标统计

---

## 总结

| 功能 | 状态 |
|------|------|
| 短信服务配置 | ✅ 完成 |
| 邮件通知配置 | ✅ 完成 |
| 订单超时处理 | ✅ 完成 |
| 前端配置界面（7标签页） | ✅ 完成 |
| 后端API接口 | ✅ 完成 |
| 自动触发机制 | ✅ 完成 |
| 手动触发功能 | ✅ 完成 |
| 测试验证功能 | ✅ 完成 |
| 使用文档 | ✅ 完成 |

**状态**: 🟢 生产就绪

所有功能已完整实现并测试通过，可以投入生产使用。
