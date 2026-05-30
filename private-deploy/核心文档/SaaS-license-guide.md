# SaaS 平台许可证（私钥工具）使用指南

> ⚠️ **机密文档**：此文档仅供平台运营方使用，绝不可随私有部署版本交付给客户！

## 一、概述

CRM 系统支持两种部署模式：
- **私有部署（private）**：单租户，客户独立运营
- **SaaS 部署（saas）**：多租户，平台统一运营

为防止私有部署客户擅自切换为 SaaS 模式运营（侵犯平台方权益），系统内置了 **RSA 签名验证机制**：

1. SaaS 模式启动时必须提供 `SAAS_LICENSE_TOKEN`（RS256 签名的 JWT）
2. Token 由平台运营方使用**私钥**签发（私钥绝不随代码交付）
3. 后端用硬编码的**公钥**验证 Token 签名 —— 客户无私钥，无法伪造
4. **验证失败时自动降级为私有部署模式**（系统可正常运行，但多租户功能不可用）
5. 运行时每小时重新验证一次，防止中途篡改

## 二、安全架构

```
┌─────────────────────────────────────────────────────────┐
│  平台运营方（你）                                         │
│  持有：RSA 私钥 + generate-saas-license.js 脚本          │
│  作用：签发 SAAS_LICENSE_TOKEN                           │
└────────────────────────┬────────────────────────────────┘
                         │ 签发 Token
                         ▼
┌─────────────────────────────────────────────────────────┐
│  SaaS 服务器                                             │
│  .env 配置：DEPLOY_MODE=saas                             │
│             SAAS_LICENSE_TOKEN=eyJhbGci...               │
│  后端启动时用公钥验证 Token → 通过 → SaaS 模式激活        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  私有部署客户                                             │
│  .env 配置：DEPLOY_MODE=private                          │
│  无需 Token，系统直接以私有模式运行                        │
│  即使修改为 DEPLOY_MODE=saas，因无 Token → 自动降级       │
└─────────────────────────────────────────────────────────┘
```

### 降级后的限制

当 `DEPLOY_MODE=saas` 但无有效 Token 时，系统自动降级为私有模式：
- ❌ 租户注册/创建接口返回 403
- ❌ 套餐管理、支付接口返回 403
- ❌ 会员中心、订阅接口返回 403
- ❌ 管理后台租户管理接口返回 403
- ❌ CRM 登录 JWT 不含 tenantId，无法使用多租户功能
- ✅ CRM 以私有部署模式正常运行（单租户）

## 三、许可证生成工具

### 工具位置

```
backend/scripts/generate-saas-license.js
```

**⚠️ 此脚本包含 RSA 私钥，绝不可交付给客户！**

### 前置要求

```bash
cd /www/wwwroot/CRM/backend
# 确保已安装依赖（脚本需要 jsonwebtoken 包）
npm install
```

### 常用命令

#### 1. 生成许可证（推荐）

```bash
# 绑定域名 + 1年有效期
node scripts/generate-saas-license.js --domain crm.yunkes.com --expires 365

# 绑定多个域名
node scripts/generate-saas-license.js --domain crm.yunkes.com,admin.yunkes.com --expires 365

# 不限域名（开发测试用）
node scripts/generate-saas-license.js --expires 365

# 限制最大租户数
node scripts/generate-saas-license.js --domain crm.yunkes.com --max-tenants 100 --expires 365
```

输出示例：
```
🔐 CRM SaaS 平台许可证生成工具
==================================================

📋 许可证参数：
   绑定域名: crm.yunkes.com
   最大租户数: 无限制
   有效期: 365 天

✅ 许可证已生成！
   许可证ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   签发时间: 2026-04-26T04:00:00.000Z
   过期时间: 2027-04-26

==================================================
📝 请将以下内容添加到 .env 文件中：
==================================================

SAAS_LICENSE_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNhYXMtZ3VhcmQtdjEifQ...

==================================================
```

#### 2. 验证已有 Token

```bash
# 直接验证 Token 字符串
node scripts/generate-saas-license.js --verify eyJhbGciOiJSUzI1NiI...

# 从 .env 文件自动读取并验证
node scripts/generate-saas-license.js --verify-env
```

#### 3. 重新生成 RSA 密钥对（仅私钥泄露时使用）

```bash
node scripts/generate-saas-license.js --generate-keys
```

**⚠️ 生成新密钥对后：**
- 将新公钥更新到 `backend/src/services/SaaSGuardService.ts`
- 将新私钥更新到 `generate-saas-license.js` 脚本中
- 所有已签发的旧 Token 将失效，需重新签发

#### 4. 查看帮助

```bash
node scripts/generate-saas-license.js --help
```

## 四、部署配置步骤

### 4.1 SaaS 服务器配置

1. **生成许可证**（在你的本地机器或安全环境中执行）：
   ```bash
   cd backend
   node scripts/generate-saas-license.js --domain crm.yunkes.com --expires 365
   ```

2. **配置 .env 文件**（在 SaaS 服务器上）：
   ```env
   # 部署模式
   DEPLOY_MODE=saas

   # SaaS 许可证（从第1步生成的输出中复制）
   SAAS_LICENSE_TOKEN=eyJhbGciOiJSUzI1NiI...（完整Token）
   ```

3. **重启服务**：
   ```bash
   pm2 restart crm-backend
   ```

4. **验证激活状态**：
   ```bash
   # 查看启动日志，确认 SaaS 验证通过
   pm2 logs crm-backend --lines 30 | grep -i "SaaSGuard\|部署模式"
   ```

   正常输出应包含：
   ```
   [SaaSGuard] ✅ SaaS 平台许可验证通过！
   [SaaSGuard]   许可证ID: xxx
   [SaaSGuard]   绑定域名: crm.yunkes.com
   [SaaSGuard]   剩余有效期: 365 天
   ✅ 部署模式确认: saas
   ```

### 4.2 私有部署客户配置

私有部署客户的 `.env` 只需配置：
```env
DEPLOY_MODE=private
# 无需 SAAS_LICENSE_TOKEN
```

即使客户擅自修改为 `DEPLOY_MODE=saas`，因无有效 Token，系统会：
1. 启动日志输出 `⚠️ SaaS 许可验证未通过，已降级为私有部署模式`
2. 所有多租户 API 返回 403
3. CRM 以私有模式正常运行

## 五、许可证续期

### 查看当前许可证状态

```bash
cd backend
node scripts/generate-saas-license.js --verify-env
```

### 续期操作

许可证到期前30天，系统会在日志中输出警告：
```
[SaaSGuard] ⚠️ SaaS 许可证将在 XX 天后过期，请尽快续期！
```

续期步骤：
1. 重新生成许可证：
   ```bash
   node scripts/generate-saas-license.js --domain crm.yunkes.com --expires 365
   ```
2. 更新 `.env` 中的 `SAAS_LICENSE_TOKEN`
3. 重启服务：`pm2 restart crm-backend`

## 六、核心文件清单

| 文件 | 作用 | 机密等级 |
|------|------|---------|
| `backend/scripts/generate-saas-license.js` | 许可证生成工具（含RSA私钥） | 🔴 最高机密 |
| `backend/src/services/SaaSGuardService.ts` | SaaS守卫服务（含RSA公钥） | 🟢 可交付 |
| `backend/src/middleware/saasGuard.ts` | SaaS路由守卫中间件 | 🟢 可交付 |
| `backend/src/config/deploy.ts` | 部署模式配置 | 🟢 可交付 |

### 交付私有版本时的检查清单

- [ ] **确认 `scripts/generate-saas-license.js` 已从交付包中移除**
- [ ] 确认 `.env` 中不包含任何 `SAAS_LICENSE_TOKEN` 值
- [ ] 确认 `DEPLOY_MODE=private`
- [ ] 测试：修改为 `DEPLOY_MODE=saas` 后系统应降级运行

## 七、安全守护代码架构

### 守护链路（4层防护）

```
1. 启动验证
   app.ts → SaaSGuardService.initialize()
   → 无Token或签名无效 → deployConfig.setEffectiveMode('private')

2. JWT 签发保护
   UserController.login → 非SaaS模式 JWT 不含 tenantId
   → 客户端无法获取租户令牌

3. 认证层保护
   auth.ts → authenticateToken → 非SaaS模式不注入租户上下文
   → 即使旧JWT含tenantId，请求也不会带入租户上下文

4. 路由层保护
   public/index.ts → requireSaaSMode → 注册/套餐/支付等返回403
   admin/index.ts → requireSaaSMode → 租户管理/套餐管理等返回403
   → SaaS专属功能完全封锁
```

### 运行时持续验证

- 每小时重新验证一次 Token 签名
- Token 被移除或过期 → 实时降级为私有模式
- 降级后所有 SaaS 功能立即不可用

## 八、故障排查

### 问题：SaaS 模式未激活

```bash
# 查看日志
pm2 logs crm-backend --lines 50 | grep "SaaSGuard"
```

常见原因：
1. `SAAS_LICENSE_TOKEN` 未配置或为空
2. Token 已过期 → 重新生成
3. Token 被篡改 → 重新生成
4. 更新了 RSA 密钥对但未重新签发 Token

### 问题：Token 验证失败

```bash
# 验证 Token 有效性
cd backend
node scripts/generate-saas-license.js --verify-env
```

### 问题：PM2 环境变量缓存

PM2 可能缓存旧的环境变量，更新 `.env` 后需要：
```bash
# 方法1：删除旧进程重新启动
pm2 delete crm-backend
pm2 start ecosystem.config.js

# 方法2：使用 --update-env 标志
pm2 restart crm-backend --update-env
```
