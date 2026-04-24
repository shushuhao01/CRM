# 云客CRM v1.8.0 — 完整技术分析与云服务器部署选购指南

> 生成时间：2026-04-23 | 版本：v1.8.0 | 分析范围：全项目所有子系统源码

---

## 目录

- [第一部分：项目代码规模](#第一部分项目代码规模)
- [第二部分：完整技术栈](#第二部分完整技术栈)
- [第三部分：系统架构与子系统详解](#第三部分系统架构与子系统详解)
- [第四部分：数据库设计](#第四部分数据库设计)
- [第五部分：SaaS 多租户架构](#第五部分saas-多租户架构)
- [第六部分：所有业务模块功能清单](#第六部分所有业务模块功能清单)
- [第七部分：部署架构与配置要求](#第七部分部署架构与配置要求)
- [第八部分：云服务器选购指南（阿里云 / 腾讯云 / 华为云对比）](#第八部分云服务器选购指南)
- [第九部分：SaaS 流畅运行保障措施](#第九部分saas-流畅运行保障措施)

---

# 第一部分：项目代码规模

## 1.1 代码行数统计

| 子系统 | 源文件数 | 代码行数 | 体积(KB) | 说明 |
|--------|---------|----------|----------|------|
| **CRM 主前端** (src/) | 532 | 270,566 | 9,594 | Vue3 SPA 应用 |
| **后端 API** (backend/src/) | 411 | 105,088 | 4,300 | Express + TypeORM |
| **Admin 管理后台** (admin/src/) | 93 | 33,948 | 1,370 | 平台管理后台 |
| **官网** (website/src/) | 47 | 19,619 | 742 | 营销官网 + 会员中心 |
| **H5 企微应用** (h5/src/) | 22 | 3,026 | 103 | 企微内嵌H5 |
| **企微数据程序** (wecom-program/) | 3 | ~130 | 4 | Python 微服务 |
| **数据库迁移脚本** (backend/*.js) | 40+ | ~6,000 | — | JS 迁移脚本 |
| **测试文件** (tests/) | 24+ | ~3,000 | — | 端到端 + 单元测试 |
| **部署/运维脚本** | 20+ | ~2,000 | — | Shell/Bat/PS1 |
| **合计** | **1,200+** | **~440,000** | **~16.5 MB** |  |

> **总结**：**44 万行级中大型商业 SaaS 系统**，相当于 3-5 人全栈团队 1.5-2 年的全职工程量。

## 1.2 模块数量统计

| 类别 | 数量 |
|------|------|
| 后端 API 路由文件 | **159** |
| 后端 Service（业务服务） | **58** |
| 后端 Controller（控制器） | **24**（11 核心 + 13 管理后台） |
| 后端 Middleware（中间件） | **13** |
| 数据库 Entity（表模型） | **118**（核心 73 + 企微 42 + 管理 3） |
| CRM 前端页面 (Views) | **228** |
| CRM 前端组件 (Components) | **128** |
| CRM 前端 API 模块 | **44** |
| CRM 前端 Store（Pinia 状态） | **21** |
| CRM 前端 Service | **33** |
| CRM 前端 Utils 工具库 | **48** |
| Admin 管理后台页面 | **74** |
| 官网页面 | **30** |
| H5 移动端页面 | **13** |
| 帮助文档组件 | **50**（内置帮助中心） |

---

# 第二部分：完整技术栈

## 2.1 前端技术（5 个独立前端应用）

| 技术 | 版本 | 用途 |
|------|------|------|
| **Vue 3** | ^3.5.18 | 核心框架，Composition API |
| **TypeScript** | ^5.7.2 | 全栈类型安全 |
| **Vite** | ^5.4.11 | 极速构建工具 |
| **Pinia** | ^3.0.3 | 状态管理（21 个 Store） |
| **Vue Router** | ^4.5.1 | 路由管理，懒加载 |
| **Element Plus** | ^2.3.14 | CRM/Admin 桌面端 UI 组件库 |
| **Vant 4** | ^4.8.11 | H5 移动端 UI 组件库 |
| **ECharts** | ^5.6.0 | 数据可视化/仪表盘图表 |
| **WangEditor** | ^5.1.23 | 富文本编辑器（公告/话术等） |
| **Axios** | ^1.12.2 | HTTP 请求封装 |
| **Socket.IO Client** | ^4.8.1 | 实时 WebSocket 通信 |
| **XLSX** | ^0.18.5 | Excel 导入导出 |
| **html2canvas** | ^1.4.1 | 页面截图/导出图片 |
| **QRCode** | ^1.5.4 | 二维码生成 |
| **JsBarcode** | ^3.12.3 | 条形码生成（物流面单） |
| **SortableJS** | ^1.15.6 | 拖拽排序 |
| **Sass** | 嵌入式 | CSS 预处理 |
| **Vitest** | ^4.1.2 | 单元测试框架 |

## 2.2 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | >=22.0.0 | 服务端运行时 |
| **Express** | ^4.22.1 | Web 框架 |
| **TypeScript** | ^5.7.2 | 类型安全 |
| **TypeORM** | ^0.3.28 | ORM 框架，Entity 管理 |
| **MySQL 2** | ^3.20.0 | MySQL 驱动 |
| **Socket.IO** | ^4.8.1 | WebSocket 实时推送服务端 |
| **ws** | ^8.18.3 | 轻量 WebSocket（移动端） |
| **JWT** | ^9.0.2 | Token 认证（双 Token） |
| **bcryptjs** | ^2.4.3 | 密码哈希（12 轮） |
| **Helmet** | ^7.1.0 | HTTP 安全头部 |
| **express-rate-limit** | ^7.1.5 | API 限流 |
| **express-validator** | ^7.0.1 | 请求参数校验 |
| **Joi** | ^17.11.0 | 数据验证 |
| **Winston** | ^3.11.0 | 结构化日志系统 |
| **Morgan** | ^1.10.0 | HTTP 请求日志 |
| **Multer** | ^1.4.5 | 文件上传处理 |
| **Ali-OSS** | ^6.23.0 | 阿里云对象存储 |
| **Nodemailer** | ^8.0.4 | SMTP 邮件发送 |
| **ExcelJS** | ^4.4.0 | 服务端 Excel 生成 |
| **node-cron** | ^4.2.1 | 定时任务调度 |
| **svg-captcha** | ^1.4.0 | 验证码生成 |
| **compression** | ^1.7.4 | Gzip 压缩 |
| **cors** | ^2.8.5 | 跨域控制 |
| **ioredis** | ^5.4.1 | Redis 缓存（可选） |
| **SQLite** | ^5.1.7 | 轻量数据库（备选） |
| **PM2** | 生产进程管理 | Cluster/Fork 模式 |
| **SWC** | ^1.15.21 | 高速 TypeScript 编译 |

## 2.3 企微数据智能程序

| 技术 | 说明 |
|------|------|
| **Python** | 会话智能分析（情感/意向/关键词） |
| **Docker** | 容器化部署到企微安全沙箱 |

## 2.4 数据库

| 项目 | 说明 |
|------|------|
| **MySQL 8.0+** | 主数据库 |
| **字符集** | utf8mb4（支持 Emoji） |
| **时区** | +08:00（北京时间） |
| **连接池** | 默认 50 连接，多租户可调至 100 |
| **ORM** | TypeORM（synchronize: false，手动迁移） |
| **Redis** | 可选缓存层，不配置自动降级内存缓存 |

---

# 第三部分：系统架构与子系统详解

## 3.1 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                      用户访问层 (Browser/App)                   │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│ CRM 主应用│ Admin后台│  官网     │ H5企微   │ 外呼助手APP      │
│ Vue3+EP  │ Vue3+EP  │ Vue3     │ Vue3+Vant│ Android/iOS     │
│ 228页面   │ 74页面   │ 30页面   │ 13页面   │ 原生应用         │
│ 128组件   │          │          │          │                  │
├──────────┴──────────┴──────────┴──────────┴──────────────────┤
│                      Nginx 反向代理 + SSL                      │
├─────────────────────────────────────────────────────────────── ┤
│                    Node.js 后端 (Express)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐    │
│  │ 159 路由  │ 58 服务  │ 24 控制器│ 13 中间件│ 10 工具  │    │
│  ├──────────┼──────────┼──────────┴──────────┴──────────┤    │
│  │ WebSocket│ 定时任务  │ SaaS 租户隔离 + 权限系统          │    │
│  │ (双通道) │ (11个)   │ AsyncLocalStorage + RBAC          │    │
│  └──────────┴──────────┴─────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────  ┤
│  MySQL 8.0+ (118张表)  │  Redis (可选)  │  Ali-OSS (文件)    │
└──────────────────────────────────────────────────────────────  ┘
```

## 3.2 五大前端子系统详解

### ① CRM 主应用（src/）— 核心业务系统

**规模**：532 文件 / 270,566 行 / 228 页面 / 128 组件

| 功能模块 | 关键页面 | 说明 |
|----------|---------|------|
| **登录/注册** | Login.vue (67K行级) | 登录、验证码、密码重置 |
| **仪表盘** | Dashboard.vue (110K行级) | 数据看板、图表统计、ECharts |
| **客户管理** | Add/List/Detail/Edit/Groups/Tags | 客户全生命周期、分组、标签、跟进 |
| **订单管理** | Add/List/Detail/Edit/Audit | 订单全流程、审核、状态历史 |
| **商品管理** | List/Detail/Edit/Analytics/Stock/Category | 商品、分类、库存、虚拟商品、卡密 |
| **物流管理** | List/Detail/Shipping/Track/StatusUpdate/Companies | 发货、物流追踪、快递公司、面单打印 |
| **财务管理** | PerformanceData/Manage/Settlement/COD/ValueAdded | 绩效、结算、代收、增值服务 |
| **绩效考核** | Analysis/Personal/Team/Product/Share | 个人/团队/商品维度绩效分析 |
| **售后服务** | Add/List/Detail/Edit/Data | 工单管理、跟进、数据统计 |
| **数据中心** | List/Search/Recycle/Archive | 数据查询、回收站、归档 |
| **短信管理** | SmsConfig/Templates/SendRecords/Statistics/Approval | 短信模板、发送、统计、审批 |
| **通话管理** | CallManagement/SmsManagement | 通话记录、录音管理 |
| **系统设置** | 14个设置页 + 用户/部门/角色/权限 | 全方位系统配置 |
| **企微SCRM** | 15个核心页 + 61个子组件 + 2个composable | 完整企微功能 |
| **帮助中心** | HelpCenter + 50个帮助文档组件 | 内置帮助系统 |
| **关于/版本** | About/VersionUpdatePanel | 版本信息、更新日志 |

### ② Admin 管理后台（admin/src/）— 平台运营管理

**规模**：93 文件 / 33,948 行 / 74 页面

| 功能模块 | 页面 | 说明 |
|----------|------|------|
| **数据看板** | Dashboard | 全平台租户数、订单数、收入统计 |
| **租户管理** | tenants/ (3页) + tenant-customers/ (14页) | 租户 CRUD、租户客户管理 |
| **授权管理** | licenses/ (3页) | 授权码生成、验证、RSA 签名 |
| **版本管理** | versions/ (3页) | 版本发布、更新日志 |
| **套餐管理** | modules/ (11页) | 套餐配置、模块开关、价格 |
| **支付管理** | payment/ (3页) | 支付订单、退款管理 |
| **短信管理** | sms-management/ (6页) | 短信配额、模板审核 |
| **私有客户** | private-customers/ (2页) | 私有部署客户管理 |
| **容量管理** | capacity/ (1页) | 存储/用户容量监控 |
| **企微管理** | wecom/ (17页) | 企微套件、定价、订单、配额、AI |
| **系统设置** | settings/ (7页) | API配置、通知模板、系统设置 |

### ③ 官网（website/src/）— 营销 + 会员中心

**规模**：47 文件 / 19,619 行 / 30 页面

| 功能模块 | 页面 | 说明 |
|----------|------|------|
| **营销页面** | Home/Features/Solutions/Pricing/About | 产品展示、功能介绍、解决方案、定价 |
| **注册支付** | Register/PaySuccess | 在线注册、套餐购买、支付成功 |
| **文档中心** | Docs/DocDetail | 帮助文档、API 文档 |
| **协议** | Agreement | 服务协议、隐私政策 |
| **会员中心** | member/ (20页) | 控制台、账单、续费、订阅、容量、密码、授权 |
| **企微服务** | member/wecom/ (8页) + WecomService | 企微增值服务购买 |
| **AI 助手** | member/AiAssistant | AI 功能入口 |
| **短信配额** | member/SmsQuota | 短信包购买 |

### ④ H5 企微应用（h5/src/）— 企微内嵌

**规模**：22 文件 / 3,026 行 / 13 页面

| 功能 | 说明 |
|------|------|
| 侧边栏应用 | 企微对话侧边栏内嵌，快捷下单 |
| 客户详情 | 企微内查看 CRM 客户信息 |
| 移动端适配 | Vant UI，触屏优化 |

### ⑤ 企微数据智能程序（wecom-program/）

| 功能 | 说明 |
|------|------|
| 会话智能分析 | 情感检测、意向识别、关键词提取 |
| Docker 部署 | 运行在企微安全沙箱环境 |
| HTTP 服务 | Python HTTPServer，端口 8080 |

## 3.3 后端 API 详细架构

### 路由模块（159 个路由文件）

| 模块 | 路由文件数 | 核心功能 |
|------|-----------|---------|
| **认证** | auth, profile | 登录/注册/JWT刷新/密码修改 |
| **用户/角色/权限** | users, roles, permissions | RBAC 权限管理 |
| **客户** | customers/ (6个) | 客户 CRUD、导入导出、共享 |
| **订单** | orders/ (5个) | 订单全流程、审核 |
| **商品** | products | 商品/分类管理 |
| **物流** | logistics/ (4个), sfExpress, ytoExpress | 物流全链路 |
| **财务** | finance, codCollection, codApplication | 财务/代收/申请 |
| **绩效** | performance, performanceReport | 绩效数据/报表 |
| **短信** | sms, smsAutoSend, smsQuota | 短信全模块 |
| **通话** | calls/ (6个), callWebhook, callConfig | 通话系统 |
| **售后** | services | 售后工单 |
| **通知/消息** | message, messageCleanup | 站内消息 |
| **数据** | data, tenantData | 数据中心/导出 |
| **系统** | system/ (5个), dashboard, logs | 系统配置/日志 |
| **增值服务** | valueAdded/ (4个) | 增值订单/价格 |
| **虚拟发货** | virtualInventory, virtualDelivery, virtualClaim, virtualSettings | 虚拟商品体系 |
| **SDK/连接** | sdk, mobile-sdk, qr-connection, alternative-connection | 多端连接 |
| **授权** | license, tenantLicense | 授权管理 |
| **企微** | wecom/ (32个) | 企微完整功能 |
| **管理后台** | admin/ (36个) | Admin API |
| **公开API** | public/ (12个) | 无需认证的公开接口 |
| **移动端** | mobile/ (6个) | 移动端专用 API |

### 企微路由详解（32 个文件）

| 路由文件 | 功能 |
|----------|------|
| config | 企微配置管理 |
| binding | 员工绑定 |
| addressBook | 通讯录同步 |
| customer | 企微客户管理 |
| customerGroup | 客户群管理 |
| acquisition | 获客链接/渠道活码 |
| contactWay | 联系方式管理 |
| chatArchive | 会话存档 |
| archiveSettings | 存档配置 |
| payment | 企微收付款 |
| service | 客服系统 |
| sidebar | 侧边栏应用 |
| scripts | 话术素材库 |
| qualityInspection | 质检合规 |
| sensitiveWords | 敏感词管理 |
| sensitiveWordGroups | 敏感词分组 |
| aiAssistant | AI 智能助手 |
| aiInspect | AI 质检 |
| autoMatch | 自动匹配 |
| groupTemplate | 群模板 |
| groupWelcome | 入群欢迎语 |
| groupBroadcast | 群发广播 |
| antiSpamRule | 防骚扰规则 |
| seatManagement | 坐席管理 |
| pricing | 企微定价 |
| timeline | 客户时间线 |
| h5-app | H5 应用接口 |
| h5-auth | H5 认证 |
| callback | 企微回调处理 |
| suite-callback | 服务商套件回调 |
| index | 路由聚合 |
| wecomHelpers | 工具函数 |

### 58 个后端 Service 列表

| Service | 职责 | 体积 |
|---------|------|------|
| SubscriptionService | 订阅/套餐管理 | 44KB |
| OrderNotificationService | 订单通知 | 51KB |
| LogisticsTraceService | 物流轨迹 | 49KB |
| PaymentService | 支付处理 | 37KB |
| TenantExportService | 租户数据导出 | 32KB |
| UpdateService | 系统更新 | 31KB |
| MemberService | 会员管理 | 29KB |
| TimeoutReminderService | 超时提醒 | 27KB |
| LogisticsAutoSyncService | 物流自动同步 | 26KB |
| WecomApiService | 企微API调用 | 25KB |
| PerformanceReportScheduler | 绩效报表调度 | 25KB |
| NotificationChannelService | 通知渠道 | 24KB |
| AdminNotificationService | 管理通知 | 23KB |
| WecomChatArchiveService | 会话存档 | 22KB |
| MobileWebSocketService | 移动WebSocket | 20KB |
| RecordingStorageService | 录音存储 | 19KB |
| NotificationTemplateService | 通知模板 | 18KB |
| WechatPayService | 微信支付 | 16KB |
| LicenseService | 授权管理 | 16KB |
| CapacityService | 容量管理 | 17KB |
| AlipayService | 支付宝支付 | 14KB |
| WebSocketService | PC WebSocket | 14KB |
| TenantImportService | 租户数据导入 | 14KB |
| PrivateCustomerService | 私有客户 | 14KB |
| sfExpressService | 顺丰对接 | 14KB |
| ExpressAPIService | 快递100 | 13KB |
| VersionService | 版本管理 | 12KB |
| AliyunCallService | 阿里云外呼 | 12KB |
| StatisticsService | 统计分析 | 11KB |
| SaaSGuardService | SaaS守护 | 10KB |
| SmsAutoSendService | 短信自动发 | 10KB |
| TenantService | 租户管理 | 9KB |
| LicenseExpirationReminder | 授权到期提醒 | 8KB |
| CacheService | 缓存服务 | 8KB |
| MessageCleanupService | 消息清理 | 8KB |
| AliyunSmsService | 阿里云短信 | 8KB |
| WecomSyncScheduler | 企微同步调度 | 8KB |
| AdminUserService | 管理员用户 | 8KB |
| ApiConfigService | API配置 | 7KB |
| PaymentReminderService | 付款提醒 | 7KB |
| SchedulerService | 调度管理 | 6KB |
| ytoExpressService | 圆通对接 | 6KB |
| VasExpiryCheckService | 增值到期检查 | 5KB |
| ModuleService | 模块管理 | 5KB |
| PackageService | 套餐管理 | 5KB |
| DataCleanupService | 数据清理 | 4KB |
| TenantLogService | 租户日志 | 4KB |
| VerificationCodeService | 验证码 | 4KB |
| WecomContactWayService | 联系方式 | 4KB |
| WecomAutoMatchService | 自动匹配 | 4KB |
| messageService | 消息服务 | 4KB |
| SystemSettingsService | 系统设置 | 3KB |
| WecomAddressBookService | 通讯录 | 2KB |
| LicenseSyncScheduler | 授权同步调度 | 2KB |
| WecomAiService | 企微AI | 2KB |
| WecomTimelineService | 客户时间线 | 1KB |
| WecomAiInspectService | AI质检 | 1KB |
| WecomGroupTemplateService | 群模板 | 1KB |

---

# 第四部分：数据库设计

## 4.1 118 张数据表分类

### CRM 核心表（73 张）

| 分类 | 表名 | 说明 |
|------|------|------|
| **用户权限** | User, Role, Permission, UserPermission, Department | 用户、角色、权限、部门 |
| **客户** | Customer, CustomerGroup, CustomerTag, CustomerShare, FollowUp, PrivateCustomer | 客户全维度 |
| **订单** | Order, OrderItem, OrderStatusHistory, CodCancelApplication | 订单体系 |
| **商品** | Product, ProductCategory | 商品分类 |
| **物流** | LogisticsTracking, LogisticsTrace, LogisticsCompany, LogisticsStatus, LogisticsApiConfig | 物流全链路 |
| **财务** | CommissionSetting, CommissionLadder, PerformanceConfig, PerformanceMetric, PerformanceReportConfig/Log, DepartmentOrderLimit | 财务绩效 |
| **短信** | SmsTemplate, SmsRecord, SmsAutoSendRule, SmsQuotaPackage, SmsQuotaOrder | 短信体系 |
| **通话** | Call | 通话记录 |
| **通知** | Notification, NotificationChannel/Log, NotificationTemplate, Announcement/Read, SystemMessage, MessageReadStatus, MessageSubscription, Message | 通知消息 |
| **售后** | AfterSalesService, ServiceRecord, ServiceFollowUp, ServiceOperationLog | 售后工单 |
| **系统** | SystemConfig, Log, OperationLog, RejectionReason, ImprovementGoal, PaymentMethodOption, OutsourceCompany, SenderAddress | 系统配置 |
| **增值/虚拟** | ValueAddedOrder, ValueAddedPriceConfig, ValueAddedStatusConfig | 增值服务 |
| **SaaS** | Tenant, TenantLog, TenantSettings, License, LicenseLog, Package, Version, Changelog, Module, ModuleConfig, AdminUser, AdminRole, AdminOperationLog, UpdateTask, MigrationHistory, ApiConfig, ApiCallLog, CustomerServicePermission, SensitiveInfoPermission | SaaS 平台 |

### 企微 SCRM 表（42 张）

| 分类 | 表名 | 说明 |
|------|------|------|
| **基础配置** | WecomConfig, WecomSuiteConfig, WecomSuiteCallbackLog, WecomSidebarAuthCode | 企业配置 |
| **通讯录** | WecomUserBinding, WecomDepartmentMapping | 员工/部门映射 |
| **客户** | WecomCustomer, WecomCustomerGroup, WecomCustomerEvent | 企微客户 |
| **获客** | WecomAcquisitionLink, WecomAcquisitionSmartRule, WecomContactWay, WecomContactWayDailyStat | 渠道活码 |
| **会话存档** | WecomChatRecord, WecomArchiveSetting, WecomArchiveMember, WecomAutoMatchSuggestion | 聊天记录 |
| **支付** | WecomPaymentRecord, WecomPaymentQrcode, WecomPaymentRefund | 收付款 |
| **客服** | WecomKfSession, WecomQuickReply, WecomServiceAccount | 客服会话 |
| **内容** | WecomScript, WecomScriptCategory, WecomGroupTemplate, WecomGroupWelcome, WecomGroupBroadcast | 素材/群管 |
| **合规** | WecomQualityRule, WecomQualityInspection, WecomSensitiveWord, WecomSensitiveHit, WecomAntiSpamRule | 质检合规 |
| **AI** | WecomAiModel, WecomAiAgent, WecomAiInspectStrategy, WecomAiInspectResult, WecomAiLog, WecomKnowledgeBase, WecomKnowledgeEntry | AI 智能 |
| **增值** | WecomVasOrder, WecomVasConfig | 增值服务 |

---

# 第五部分：SaaS 多租户架构

## 5.1 租户隔离模型

```
共享数据库 + tenant_id 行级隔离
       │
       ├── 每张表都有 tenant_id 字段
       ├── AsyncLocalStorage 全链路传递租户上下文
       ├── tenantAuth 中间件 → 解析 JWT → 注入 tenantId
       ├── tenantContextMiddleware → AsyncLocalStorage.run()
       ├── getTenantFilter() → 自动附加 WHERE tenant_id = ?
       └── shouldFilterByTenant() → SaaS 模式自动过滤
```

## 5.2 部署模式双轨制

| 模式 | 配置 | 说明 |
|------|------|------|
| **SaaS 模式** | `DEPLOY_MODE=saas` | 多租户共享，RSA 签名验证 |
| **私有部署** | `DEPLOY_MODE=private` | 单租户独占，授权码验证 |
| **自动降级** | SaaS 验证失败 → private | SaaSGuardService 控制 |

## 5.3 认证安全体系

| 层级 | 技术 | 说明 |
|------|------|------|
| 身份认证 | JWT 双 Token | Access 7d + Refresh 30d |
| 密码安全 | bcrypt 12 轮 | 支持强制修改、到期提醒 |
| 接口限流 | express-rate-limit | 全局 3000/15min，登录 50/15min |
| 安全头部 | Helmet | XSS/CSRF/Clickjacking 防护 |
| 请求校验 | express-validator + Joi | 参数白名单校验 |
| 跨域控制 | CORS 白名单 | 精确到域名 |
| 写入保护 | checkLicenseWrite | 过期阻止数据修改 |
| 租户限制 | checkTenantLimits | 用户数/存储空间限额 |
| 操作审计 | operationLogger | 全操作日志记录 |
| 验证码 | svg-captcha | 登录图形验证码 |
| API Key | apiKeyAuth | 第三方 API 调用认证 |

## 5.4 实时通信（双 WebSocket）

| 通道 | 技术 | 用途 |
|------|------|------|
| PC 端 | Socket.IO (WebSocketService) | 订单/消息/通知实时推送 |
| 移动端 | ws (MobileWebSocketService) | APP/SDK 实时通信 |

## 5.5 定时任务调度（11 个）

| 任务 | 服务 | 频率 |
|------|------|------|
| 授权过期提醒 | LicenseExpirationReminderService | 每日 |
| 授权同步 | LicenseSyncScheduler | 定时 |
| 物流自动同步 | LogisticsAutoSyncService | 定时 |
| 绩效报表 | PerformanceReportScheduler | 每周/月 |
| 短信自动发送 | SmsAutoSendService | 事件触发 |
| 消息清理 | MessageCleanupService | 每日 |
| 数据清理 | DataCleanupService | 每日 |
| 企微同步 | WecomSyncScheduler | 定时 |
| 增值到期检查 | VasExpiryCheckService | 每日 |
| 超时提醒 | TimeoutReminderService | 定时 |
| 付款提醒 | PaymentReminderService | 定时 |

---

# 第六部分：所有业务模块功能清单

## 6.1 CRM 客户管理

- 客户新增/编辑/详情/列表
- 客户分组管理（自定义分组规则）
- 客户标签管理（多标签）
- 客户跟进记录（跟进时间线）
- 客户共享/转移（跨部门/跨员工）
- 客户批量导入（Excel）
- 客户批量导出
- 客户回收站/归档
- 客户搜索（全字段搜索）
- 私海/公海池
- 客户详情多标签（订单、跟进、物流、通话、短信）

## 6.2 订单管理

- 订单新增（商品选择器、地址簿）
- 订单列表（多状态筛选）
- 订单详情（状态历史时间线）
- 订单编辑
- 订单审核（多级审核）
- COD 代收款管理
- COD 取消申请/审批
- 增值服务订单
- 订单导出 Excel
- 订单设置（字段配置、状态流转）

## 6.3 商品管理

- 商品新增/编辑/详情/列表
- 商品分类管理（树形）
- 库存管理
- 商品数据分析
- 虚拟商品管理
- 卡密管理
- 资源文件管理
- 虚拟发货设置

## 6.4 物流管理

- 发货管理（批量发货）
- 物流列表/详情
- 物流轨迹跟踪（自动同步）
- 物流状态更新
- 快递公司管理
- 顺丰 API 对接
- 圆通 API 对接
- 快递100 API 对接
- 物流面单打印（条形码）
- 发件人地址簿

## 6.5 财务管理

- 绩效数据统计
- 绩效管理（配置+计算）
- 结算报表
- 代收款管理
- 代收取消申请/审批
- 增值服务管理（88K 行级大页面）
- 佣金设置（阶梯佣金）

## 6.6 绩效考核

- 绩效分析看板（90K 行级）
- 个人绩效（114K 行级）
- 团队绩效（142K 行级，最大单页面）
- 商品维度绩效
- 绩效分享

## 6.7 短信系统

- 短信模板管理（42K）
- 短信发送记录
- 短信统计分析
- 短信配置
- 短信审批
- 短信自动发送规则
- 短信配额管理（购买/消耗）
- 阿里云短信 API 对接

## 6.8 通话系统

- 通话管理（120K 行级大页面）
- 通话配置（48K）
- Webhook 回调
- 录音管理/播放
- 阿里云外呼 API

## 6.9 企微 SCRM（完整模块）

- 企微配置/授权
- 通讯录同步（部门+员工映射）
- 企微客户管理
- 客户群管理
- 会话存档（聊天记录查看）
- 获客链接/渠道活码（智能分配）
- 联系方式管理
- 企微支付收款码
- 客服系统（会话+快捷回复）
- 侧边栏应用（153K 行级预览页）
- 话术素材库（分类管理）
- 群发广播
- 入群欢迎语
- 质检合规（规则+记录）
- 敏感词管理
- 防骚扰规则
- AI 智能助手
- AI 质检策略
- 知识库管理
- 企微增值服务购买
- 坐席管理
- 数据统计分析

## 6.10 系统管理

- 用户管理（123K 行级）
- 部门管理（组织架构树）
- 角色管理（RBAC）
- 权限配置（精细到按钮级）
- 系统设置 14 项：
  - 备份设置、通话设置、邮件设置、授权设置
  - 日志设置、移动端设置、监控设置、商品设置
  - 安全设置、短信设置、存储设置、协议设置
  - 系统入口分享、主设置页
- API 管理
- 消息管理
- 权限管理

## 6.11 帮助中心（50 个文档组件）

- 项目概览/架构/功能/配置/故障排除
- 11 个模块使用指南
- 5 个角色说明
- 5 个物流操作指南
- 5 个部署指南（私有/SaaS/数据库/Nginx/环境）
- APP 使用指南（5个）
- 通话配置指南
- FAQ（5个分类）

---

# 第七部分：部署架构与配置要求

## 7.1 域名规划（5 个域名）

| 域名 | 用途 | 端口/路径 |
|------|------|----------|
| `crm.你的域名.com` | CRM 主应用 | Nginx → 静态文件 |
| `api.你的域名.com` | 后端 API | Nginx → Node :3000 |
| `admin.你的域名.com` | Admin 管理后台 | Nginx → 静态文件 |
| `你的域名.com` | 官网 | Nginx → 静态文件 |
| `h5.你的域名.com` | H5 企微应用 | Nginx → 静态文件 |

> 所有域名必须配置 SSL 证书（推荐 Let's Encrypt 免费证书或阿里云免费证书）

## 7.2 Nginx 反向代理架构

```nginx
# API 服务
server {
    listen 443 ssl;
    server_name api.你的域名.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;      # WebSocket
        proxy_set_header Connection "upgrade";        # WebSocket
    }
}

# CRM 前端（SPA）
server {
    listen 443 ssl;
    server_name crm.你的域名.com;
    root /www/crm/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源长缓存
    location ~* \.(js|css|png|jpg|ico|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Admin / 官网 / H5 类似配置...
```

## 7.3 PM2 进程管理（生产）

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'crm-backend',
    script: './dist/app.js',
    instances: 2,             // 推荐 2-4 实例
    exec_mode: 'cluster',     // 集群模式
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 3000 },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    max_size: '50M',          // 日志轮转
    retain: 3,
    compress: true
  }]
};
```

## 7.4 第三方服务依赖

| 服务 | 用途 | 必要性 | 费用估算 |
|------|------|--------|---------|
| **MySQL 8.0+** | 主数据库 | 必须 | 自建免费 / 云 RDS 另算 |
| **Nginx** | 反代 + SSL | 必须 | 免费 |
| **PM2** | 进程管理 | 必须 | 免费 |
| **Let's Encrypt** | SSL 证书 | 必须 | 免费 |
| **阿里云 OSS** | 文件存储 | 推荐 | ~9元/月(40GB) |
| **Redis** | 缓存加速 | 推荐(200+租户) | 自建免费 / 云另算 |
| **阿里云短信** | 短信通知 | 按需 | 0.045元/条 |
| **微信支付** | 在线收款 | SaaS必须 | 0.6% 费率 |
| **支付宝** | 在线收款 | SaaS必须 | 0.6% 费率 |
| **快递100 API** | 物流查询 | 按需 | 免费额度/0.02元/次 |
| **企微开放平台** | 企微集成 | 企微模块必须 | 免费 |
| **SMTP 邮件** | 邮件通知 | 按需 | QQ 企业邮免费 |

---

# 第八部分：云服务器选购指南

## 8.1 三档部署方案

| 方案 | 适用规模 | 服务器配置 | 数据库 | 带宽 |
|------|---------|-----------|--------|------|
| **入门版** | ≤50 租户 / 300 用户 | 2 核 4G | 自建 MySQL | 5M |
| **标准版** | ≤200 租户 / 2000 用户 | 4 核 8G | 自建或云 RDS | 5-10M |
| **专业版** | ≤500+ 租户 / 5000+ 用户 | 8 核 16G | 云 RDS 主从 | 10-20M |

---

## 8.2 阿里云推荐方案（主推 ⭐）

### 方案 A：入门版（≤50 租户）

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| ECS 云服务器 | **通用算力型 u1 2核4G 5M带宽 80G ESSD** | **199 元/年** | 企业专享，续费同价 |
| MySQL | 自建（服务器内安装 MySQL 8.0） | 0 元 | 足够入门使用 |
| SSL 证书 | 免费证书（每域名1张） | 0 元 | 阿里云免费DV证书 |
| OSS 存储 | 标准存储 40GB | ~9 元/月 | 按量计费 |
| **年度总费用** | | **约 307 元/年** | |

### 方案 B：标准版（≤200 租户）⭐ 推荐

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| ECS 云服务器 | **通用算力型 u1 4核8G 5M带宽 20G ESSD** | **1,323 元/年** | 独享100%算力 |
| 数据盘 | ESSD 200G | ~480 元/年 | MySQL数据 + 上传文件 |
| MySQL | 自建（服务器内，分配 3G buffer_pool） | 0 元 | 或 RDS 2核4G 基础版 228元/年 |
| SSL 证书 | 免费证书 | 0 元 | |
| OSS 存储 | 标准存储 100GB | ~18 元/月 | |
| Redis | 自建（服务器内 512MB） | 0 元 | |
| **年度总费用** | | **约 2,019 元/年** | 自建DB |
| **年度总费用** | | **约 2,247 元/年** | 云RDS |

> 💡 **性价比之选**：u2a（AMD）4核8G 5M 更便宜，**1,204 元/年**，性能相当。

### 方案 C：专业版（500+ 租户）

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| ECS 云服务器 | **计算型 c9i 8核16G 5M带宽 20G ESSD** | **4,188 元/年** | 九代Intel，6.4折 |
| 数据盘 | ESSD PL1 500G | ~1,500 元/年 | 高性能存储 |
| 云数据库 RDS | MySQL 8.0 高可用 4核8G 200G | ~5,000 元/年 | 主从、自动备份 |
| Redis | 云Redis 2G 高可用 | ~1,200 元/年 | |
| OSS 存储 | 标准存储 500GB | ~50 元/月 | |
| CDN | 全站加速 500GB/月 | ~600 元/年 | |
| **年度总费用** | | **约 13,088 元/年** | |

> 💡 如需更高性能，可选 **通用算力型 u1 8核16G 约 4,225 元/年**（5.1折），性价比更高。

---

## 8.3 腾讯云对比方案

### 方案 A：入门版（≤50 租户）

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| 轻量应用服务器 | **4核8G 10M带宽 120G SSD 1500G流量/月** | **630 元/年** | 新用户特价 |
| MySQL | 自建 | 0 元 | |
| SSL 证书 | 免费证书 | 0 元 | |
| COS 存储 | 标准存储 50GB | ~6 元/月 | |
| **年度总费用** | | **约 702 元/年** | |

> ⚠️ 轻量应用服务器有**月流量限制**（1500GB/月），超出另付费。对 SaaS 系统需注意。

### 方案 B：标准版（≤200 租户）

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| CVM 云服务器 | **标准型 S5 4核8G 5M带宽** | **约 2,190 元/年** | 新人4折 |
| 数据盘 | 高性能云硬盘 200G | ~360 元/年 | |
| MySQL | 自建 | 0 元 | 或云数据库 MySQL 基础版 ~300元/年 |
| SSL | 免费证书 | 0 元 | |
| COS 存储 | 100GB | ~15 元/月 | |
| **年度总费用** | | **约 2,730 元/年** | 自建DB |

### 方案 C：专业版（500+ 租户）

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| CVM 云服务器 | **SA5 8核16G 10M** | **约 5,000-6,000 元/年** | 新代次AMD |
| 云数据库 MySQL | 高可用 4核8G 200G | ~5,500 元/年 | 主备双节点 |
| Redis | 标准架构 2G | ~1,000 元/年 | |
| COS + CDN | 500GB 存储 + 500GB CDN | ~1,200 元/年 | |
| **年度总费用** | | **约 13,700 元/年** | |

---

## 8.4 华为云对比方案

### 方案 A：入门版（≤50 租户）

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| HECS 云服务器 | **2核4G 5M带宽** | **约 208 元/年** | 新用户专享 |
| 数据盘 | 高IO 100G | ~200 元/年 | |
| MySQL | 自建 | 0 元 | |
| SSL 证书 | 免费证书 | 0 元 | |
| OBS 存储 | 40GB | ~8 元/月 | |
| **年度总费用** | | **约 504 元/年** | |

### 方案 B：标准版（≤200 租户）

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| Flexus X 实例 | **4核8G** | **约 288-358 元/年** | 秒杀活动价 |
| 数据盘 | 超高IO 200G | ~600 元/年 | |
| 或 增强型 C7 | **4核8G** | **约 978 元/年** | 常规活动价 |
| MySQL | 自建 | 0 元 | |
| SSL | 免费证书 | 0 元 | |
| OBS 存储 | 100GB | ~15 元/月 | |
| **年度总费用** | | **约 1,068-1,758 元/年** | |

### 方案 C：专业版（500+ 租户）

| 资源 | 规格 | 活动价（年付） | 说明 |
|------|------|-------------|------|
| 增强型 C7 | **8核16G** | **约 1,876 元/年** | 活动价 |
| 云数据库 MySQL | 主从 4核8G 200G | ~4,500 元/年 | |
| Redis | 2G 主从 | ~900 元/年 | |
| OBS + CDN | 500GB + 500GB | ~1,000 元/年 | |
| **年度总费用** | | **约 8,276 元/年** | |

---

## 8.5 三大云厂商全方位对比

### 价格对比总表（年付）

| 方案 | 阿里云 | 腾讯云 | 华为云 | 最便宜 |
|------|--------|--------|--------|--------|
| **入门版**（2核4G自建DB） | **199 元** | 630 元 | 208 元 | ⭐ 阿里云 |
| **标准版**（4核8G自建DB） | **2,019 元** | 2,730 元 | 1,068-1,758 元 | ⭐ 华为云(秒杀) |
| **专业版**（8核16G+云DB） | **13,088 元** | 13,700 元 | 8,276 元 | ⭐ 华为云 |

### 综合评分

| 维度 | 阿里云 | 腾讯云 | 华为云 |
|------|--------|--------|--------|
| **价格** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **稳定性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **生态丰富度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **技术文档** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **OSS/COS/OBS** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **数据库(RDS)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **CDN** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **企微适配** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **续费涨幅** | 较低（99/199同价续费） | 中等 | 中等 |

### 选购建议

| 场景 | 推荐 | 理由 |
|------|------|------|
| **初创团队/个人** | **阿里云 u1 199元/年** | 最低成本起步，续费同价，生态最全 |
| **中小企业标准版** | **阿里云 u1 4核8G** 或 **华为云 Flexus X** | 阿里云稳定性最佳；华为云秒杀价极有竞争力 |
| **高并发专业版** | **华为云 C7 + 云DB** 或 **阿里云 c9i** | 华为云总价最低；阿里云性能最强 |
| **重度企微集成** | **腾讯云** | 腾讯生态，企微 API 延迟更低 |
| **预算极度敏感** | **华为云 HECS/Flexus** | 秒杀活动价全网最低 |

---

# 第九部分：SaaS 流畅运行保障措施

## 9.1 数据库性能（最关键）

| 措施 | 操作 | 影响 |
|------|------|------|
| **tenant_id 索引** | 所有 118 张表 `CREATE INDEX idx_tenant ON 表名(tenant_id)` | 查询性能提升 10-100 倍 |
| **联合索引** | 高频查询 `(tenant_id, status)`、`(tenant_id, created_at)` | 列表页秒开 |
| **连接池** | `DB_CONNECTION_LIMIT=50`（200租户+调100） | 防连接耗尽 |
| **innodb_buffer_pool_size** | 物理内存的 60-70% | 热数据内存命中 |
| **慢查询** | `slow_query_log=ON, long_query_time=1` | 定位性能瓶颈 |
| **碎片整理** | 月度 `OPTIMIZE TABLE` | 维持表性能 |

## 9.2 缓存层

| 层级 | 说明 |
|------|------|
| **Redis** | JWT 验证缓存、系统配置缓存、热数据缓存 |
| **CacheService** | 内存 LRU 缓存（无 Redis 时自动使用） |
| **Nginx** | 静态资源 30d 长缓存 + gzip 压缩 |
| **CDN** | 500+ 租户建议开启全站加速 |

## 9.3 前端性能（已优化）

| 措施 | 说明 |
|------|------|
| 代码分割 | vue-vendor / element-plus / echarts / utils 独立 chunk |
| 路由懒加载 | 所有页面按需加载 |
| 构建优化 | max-old-space-size=4096，手动 chunk 拆分 |
| gzip | Nginx 开启 gzip_comp_level 6 |

## 9.4 安全加固清单

| 项目 | 状态 | 说明 |
|------|------|------|
| Helmet 安全头 | ✅ | 防 XSS/CSRF/Clickjacking |
| CORS 白名单 | ✅ | 精确到每个子域名 |
| Rate Limit | ✅ | 3000次/15min 全局 |
| 登录限流 | ✅ | 50次/15min |
| JWT 双 Token | ✅ | 7d Access + 30d Refresh |
| bcrypt 12 轮 | ✅ | 密码哈希 |
| SQL 注入防护 | ✅ | TypeORM 参数化查询 |
| 文件上传限制 | ✅ | 10MB + 类型白名单 |
| 写入守护 | ✅ | 授权过期阻止数据修改 |
| 操作日志 | ✅ | 全操作审计记录 |
| 租户资源限制 | ✅ | 用户数/存储限额检查 |

## 9.5 运维监控建议

| 项目 | 工具 | 说明 |
|------|------|------|
| 进程管理 | PM2 | 自动重启、日志管理 |
| 日志轮转 | PM2 max_size 50M | 防磁盘满 |
| 服务器监控 | 宝塔面板 / 云监控 | CPU/内存/磁盘告警 |
| 数据库备份 | mysqldump + cron | 每日凌晨自动备份 |
| SSL 续签 | certbot auto-renew | 自动续签 |
| 健康检查 | Nginx upstream check | 后端存活检测 |

---

# 附录：快速部署检查清单

```
□ 服务器购买完成（推荐阿里云 u1 4核8G 或华为云 Flexus X 4核8G）
□ 域名解析完成（5 个子域名 A 记录指向服务器 IP）
□ SSL 证书申请完成（5 个域名各 1 张）
□ Nginx 安装 + 5 个站点配置
□ Node.js 22+ 安装
□ PM2 安装
□ MySQL 8.0 安装 + 创建数据库 + 导入初始 SQL
□ .env 配置文件填写完成（数据库/JWT/CORS/域名）
□ 后端 npm install + npm run build + pm2 start
□ 5 个前端 npm install + npm run build
□ Nginx 静态文件目录配置正确
□ WebSocket 代理配置正确（Upgrade 头）
□ OSS 存储配置（可选）
□ Redis 安装配置（200+ 租户推荐）
□ 短信/支付等第三方服务配置（按需）
□ tenant_id 全表建索引
□ 定时备份 cron 配置
□ PM2 开机自启配置
□ 测试所有功能正常
```

---

> **文档维护说明**：本文档基于 v1.8.0 版本源码实际分析生成，价格信息参考 2026 年 4 月各云厂商活动页面，实际价格以购买时官网为准。
