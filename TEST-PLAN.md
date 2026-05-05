# CRM 1.8.0 测试覆盖计划

> 创建时间: 2026-05-05
> 目标: 分阶段补全测试覆盖，优先保障核心业务和高风险模块

---

## 一、现状总览

| 子项目 | 源文件 | 已有测试 | 覆盖 |
|--------|--------|---------|------|
| backend (routes/services/utils/middleware) | ~412 ts | 7 | ~1.7% |
| frontend (src) | ~534 ts/vue | 3 | ~0.6% |
| admin 管理后台 | 多 | 0 | 0% |
| miniprogram 小程序 | ~10 | 0 | 0% |

**已有测试 (10个):**
- backend: CacheService, WecomTokenService, tenantHelpers, tenantContext, auth.middleware, adminAccountHelper, dateFormat
- frontend: customerCode, dataMask, wecomUtils

---

## 二、分阶段目标

| 阶段 | 目标覆盖率 | 周期 | 焦点 |
|------|-----------|------|------|
| P0 紧急 | 10-15% | 1-2周 | 认证鉴权、支付、订单核心流程 |
| P1 重要 | 25-35% | 3-4周 | 客户管理、工具函数、中间件 |
| P2 常规 | 50%+ | 长期 | UI组件、管理后台、小程序 |

---

## 三、P0 紧急阶段 — 核心安全与资金链路

### 3.1 后端认证与鉴权 (middleware)

| 文件 | 测试文件 | 关键用例 |
|------|---------|---------|
| `middleware/auth.ts` | ✅ 已有 auth.middleware.test.ts | 补充: token过期、角色校验 |
| `middleware/adminAuth.ts` | 🔴 新建 adminAuth.test.ts | 管理员token验证、权限拒绝 |
| `middleware/tenantAuth.ts` | 🔴 新建 tenantAuth.test.ts | 租户隔离、跨租户拒绝 |
| `middleware/memberAuth.ts` | 🔴 新建 memberAuth.test.ts | 成员认证、过期处理 |
| `middleware/saasGuard.ts` | 🔴 新建 saasGuard.test.ts | 许可证过期、功能限制 |
| `middleware/checkLicenseWrite.ts` | 🔴 新建 checkLicenseWrite.test.ts | 写操作许可校验 |
| `middleware/apiRateLimit.ts` | 🔴 新建 apiRateLimit.test.ts | 限流触发、放行 |

**关键测试场景:**
```
- 无token → 401
- 无效token → 401
- 过期token → 401 (非直接放行)
- 有效token但无权限 → 403
- 租户A的token访问租户B数据 → 403
- 管理员token能否绕过租户限制
- SaaS许可证过期后写操作是否拒绝
```

### 3.2 用户认证路由 (routes/auth.ts)

| 测试文件 | 关键用例 |
|---------|---------|
| 🔴 auth.route.test.ts | 登录成功/失败、token刷新、密码错误锁定、注销 |

### 3.3 支付模块 (services + routes)

| 文件 | 测试文件 | 关键用例 |
|------|---------|---------|
| `services/PaymentService.ts` | 🔴 PaymentService.test.ts | 支付创建、状态流转、退款计算 |
| `services/WechatPayService.ts` | 🔴 WechatPayService.test.ts | 签名验证、回调解密、金额校验 |
| `services/AlipayService.ts` | 🔴 AlipayService.test.ts | 签名生成、回调验签 |
| `routes/admin/payment.ts` | 🔴 payment.route.test.ts | 配置保存、密钥掩码、退款审核 |

**关键测试场景:**
```
- 支付金额 = 0 或负数 → 拒绝
- 订单金额与支付金额不匹配 → 拒绝
- 微信回调签名篡改 → 拒绝
- 重复支付回调 → 幂等处理
- 退款金额 > 已付金额 → 拒绝
- 部分退款后再次退款的剩余金额计算
```

### 3.4 订单模块 (routes/orders)

| 文件 | 测试文件 | 关键用例 |
|------|---------|---------|
| `routes/orders/orderCrud.ts` | 🔴 orderCrud.test.ts | 创建、查询、更新、删除 |
| `routes/orders/orderAudit.ts` | 🔴 orderAudit.test.ts | 审核流程、状态流转 |
| `routes/orders/orderShipping.ts` | 🔴 orderShipping.test.ts | 发货、物流状态同步 |
| `routes/orders/orderHelpers.ts` | 🔴 orderHelpers.test.ts | 订单号生成、金额计算 |

**关键测试场景:**
```
- 订单状态机: 待付款→已付款→已发货→已签收→已完成
- 非法状态流转（如已取消→已发货）→ 拒绝
- 并发创建订单的编号唯一性
- 订单金额的精度（分→元转换无精度丢失）
```

### 3.5 后端工具函数 (utils)

| 文件 | 测试文件 | 关键用例 |
|------|---------|---------|
| `utils/paymentCrypto.ts` | 🔴 paymentCrypto.test.ts | 加密/解密对称性、密钥轮换 |
| `utils/encoding.ts` | 🔴 encoding.test.ts | 编解码正确性 |
| `utils/tenantRepo.ts` | 🔴 tenantRepo.test.ts | 租户仓库隔离查询 |
| `utils/customerLog.ts` | 🔴 customerLog.test.ts | 日志格式、敏感信息脱敏 |

---

## 四、P1 重要阶段 — 核心业务与工具

### 4.1 客户管理 (routes/customers)

| 文件 | 测试文件 | 关键用例 |
|------|---------|---------|
| `customers/core.ts` | 🔴 customerCore.test.ts | CRUD、搜索、分页、排序 |
| `customers/tags.ts` | 🔴 customerTags.test.ts | 标签增删、批量操作 |
| `customers/groups.ts` | 🔴 customerGroups.test.ts | 分组管理、客户归属 |
| `customers/related.ts` | 🔴 customerRelated.test.ts | 关联数据查询 |
| `customers/logs.ts` | 🔴 customerLogs.test.ts | 操作日志记录 |

### 4.2 关键服务层

| 文件 | 测试文件 | 关键用例 |
|------|---------|---------|
| `services/LicenseService.ts` | 🔴 LicenseService.test.ts | 许可证验证、过期检测、功能开关 |
| `services/TenantService.ts` | 🔴 TenantService.test.ts | 租户创建、隔离、配额 |
| `services/MemberService.ts` | 🔴 MemberService.test.ts | 成员CRUD、角色分配 |
| `services/SchedulerService.ts` | 🔴 SchedulerService.test.ts | 定时任务调度、冲突检测 |
| `services/StatisticsService.ts` | 🔴 StatisticsService.test.ts | 统计汇总准确性 |
| `services/VerificationCodeService.ts` | 🔴 VerificationCodeService.test.ts | 验证码生成、过期、限频 |

### 4.3 前端工具函数

| 文件 | 测试文件 | 关键用例 |
|------|---------|---------|
| `utils/permission.ts` | 🔴 permission.test.ts | 权限判断逻辑 |
| `utils/validation.ts` | 🔴 validation.test.ts | 表单验证规则 |
| `utils/dateFormat.ts` | 🔴 dateFormat.test.ts | 日期格式化、时区处理 |
| `utils/phone.ts` | 🔴 phone.test.ts | 手机号验证、脱敏 |
| `utils/sanitize.ts` | 🔴 sanitize.test.ts | XSS防护 |
| `utils/sensitive.ts` | 🔴 sensitive.test.ts | 敏感词过滤 |
| `utils/orderStatusConfig.ts` | 🔴 orderStatusConfig.test.ts | 状态配置映射 |
| `utils/roleUtils.ts` | 🔴 roleUtils.test.ts | 角色判断逻辑 |
| `utils/customerLevel.ts` | 🔴 customerLevel.test.ts | 客户等级计算 |

### 4.4 剩余中间件

| 文件 | 测试文件 |
|------|---------|
| `middleware/errorHandler.ts` | 🔴 errorHandler.test.ts |
| `middleware/operationLogger.ts` | 🔴 operationLogger.test.ts |
| `middleware/validation.ts` | 🔴 validation.middleware.test.ts |

---

## 五、P2 常规阶段 — 全面覆盖

### 5.1 剩余后端路由
- `routes/logistics/*` — 物流追踪
- `routes/calls/*` — 通话记录
- `routes/finance.ts` — 财务统计
- `routes/performance.ts` — 绩效
- `routes/miniprogram/index.ts` — 小程序API
- `routes/wecom/*` — 企微集成
- `routes/mobile/*` — 移动端API
- 其余admin路由

### 5.2 剩余后端服务
- `services/Wecom*` — 企微相关服务 (8个)
- `services/Logistics*` — 物流服务
- `services/Sms*` — 短信服务
- `services/Notification*` — 通知服务
- 其余服务

### 5.3 前端组件测试 (Vue Test Utils)
- 核心页面: 客户列表、订单列表、客户详情
- 通用组件: 表格、搜索、弹窗、表单
- Store (Pinia): 用户状态、权限状态

### 5.4 管理后台 (admin)
- 企微配置页面
- 租户管理页面
- 支付配置页面

### 5.5 小程序 (miniprogram)
- 表单提交逻辑
- 手机号获取逻辑
- 参数签名验证

---

## 六、测试技术规范

### 6.1 后端测试约定 (Jest)

```
backend/src/__tests__/
├── middleware/          # 中间件测试
│   ├── adminAuth.test.ts
│   ├── tenantAuth.test.ts
│   └── ...
├── routes/             # 路由/API测试
│   ├── auth.route.test.ts
│   ├── payment.route.test.ts
│   └── orders/
│       ├── orderCrud.test.ts
│       └── ...
├── services/           # 服务层测试
│   ├── PaymentService.test.ts
│   ├── LicenseService.test.ts
│   └── ...
├── utils/              # 工具函数测试 (已有部分)
│   ├── tenantHelpers.test.ts ✅
│   ├── paymentCrypto.test.ts
│   └── ...
└── ...
```

**命名规则:** `[模块名].test.ts`
**测试结构:**
```typescript
describe('ModuleName', () => {
  describe('methodName', () => {
    it('should do X when Y', () => { ... })
    it('should reject when Z', () => { ... })
  })
})
```

### 6.2 前端测试约定 (Vitest)

```
src/__tests__/
├── utils/              # 工具函数测试
│   ├── permission.test.ts
│   ├── validation.test.ts
│   └── ...
├── components/         # 组件测试 (P2)
│   └── ...
└── stores/             # Pinia Store测试 (P2)
    └── ...
```

### 6.3 Mock 策略

| 依赖 | Mock 方式 |
|------|----------|
| 数据库 (TypeORM) | jest.mock Repository, mock findOne/save/query |
| 外部API (微信/支付宝) | jest.mock fetch/axios, 固定返回值 |
| Redis/Cache | 使用 CacheService mock 或内存 Map |
| 文件系统 | jest.mock fs |
| 日期时间 | jest.useFakeTimers() |

### 6.4 运行命令

```bash
# 后端
cd backend
npm test                    # 运行全部测试
npm run test:watch          # watch模式
npx jest --coverage         # 带覆盖率报告

# 前端
npm test                    # vitest run
npm run test:watch          # vitest watch
npm run test:coverage       # vitest --coverage
```

---

## 七、P0 具体实施顺序

按风险和依赖排序，建议执行顺序:

```
Week 1:
  1. middleware/adminAuth.test.ts      — 管理员鉴权 (被所有admin路由依赖)
  2. middleware/tenantAuth.test.ts      — 租户隔离 (数据安全核心)
  3. middleware/saasGuard.test.ts       — SaaS许可守卫
  4. utils/paymentCrypto.test.ts        — 支付加密 (被支付服务依赖)
  5. routes/auth.route.test.ts          — 登录注册

Week 2:
  6. services/PaymentService.test.ts    — 支付业务逻辑
  7. services/WechatPayService.test.ts  — 微信支付签名/回调
  8. routes/orders/orderCrud.test.ts    — 订单CRUD
  9. routes/orders/orderAudit.test.ts   — 订单审核
 10. routes/orders/orderHelpers.test.ts — 订单工具函数
```

---

## 八、覆盖率目标里程碑

| 日期 | 后端目标 | 前端目标 | 整体目标 |
|------|---------|---------|---------|
| P0完成 | 15% | 5% | ~10% |
| P1完成 | 35% | 20% | ~28% |
| P2进行中 | 50%+ | 40%+ | ~45% |
| 长期目标 | 70%+ | 50%+ | ~60% |

**关键指标:** 核心模块(认证/支付/订单)单独覆盖率 ≥ 80%

---

## 九、CI 集成建议

后续可配置到 CI 流水线:

```yaml
# 示例: 测试不通过阻断部署
test:
  script:
    - cd backend && npm test
    - npm run test:coverage
  rules:
    - coverage < 10%  → 构建失败 (P0完成后启用)
    - coverage < 25%  → 构建警告 (P1完成后启用)
```
