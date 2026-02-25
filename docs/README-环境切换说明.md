# 环境切换说明

## 概述

本系统支持开发环境和生产环境的自动切换，通过环境变量控制数据存储方式。

## 环境类型

### 开发环境（Development）
- **数据存储**：localStorage（前端模拟）
- **API 调用**：Mock 数据
- **适用场景**：本地开发、功能测试、演示
- **优点**：无需后端服务，快速启动

### 生产环境（Production）
- **数据存储**：MySQL 数据库
- **API 调用**：真实后端 API
- **适用场景**：正式部署、生产使用
- **优点**：数据持久化，多用户协作

---

## 环境配置

### 开发环境配置

编辑 `.env.development` 文件：

```env
# 开发环境配置

# API 基础地址（开发环境使用 Mock）
VITE_API_BASE_URL=/api

# 是否使用真实 API（false = 使用 localStorage）
VITE_USE_REAL_API=false

# 开发服务器端口
VITE_PORT=5173

# 是否开启 Mock 数据
VITE_USE_MOCK=true
```

### 生产环境配置

编辑 `.env.production` 文件：

```env
# 生产环境配置

# API 基础地址（生产环境使用真实后端）
VITE_API_BASE_URL=https://your-domain.com/api

# 是否使用真实 API（true = 使用 MySQL）
VITE_USE_REAL_API=true

# 是否开启 Mock 数据
VITE_USE_MOCK=false
```

---

## 自动切换机制

系统通过 `src/utils/env.ts` 自动检测环境并切换存储方式：

```typescript
// 检测是否使用真实 API
export const isProduction = import.meta.env.VITE_USE_REAL_API === 'true'

// 根据环境选择存储方式
if (isProduction) {
  // 生产环境：使用后端 API
  const response = await axios.post('/api/customers', data)
  return response.data
} else {
  // 开发环境：使用 localStorage
  const customers = JSON.parse(localStorage.getItem('crm_mock_customers') || '[]')
  customers.push(data)
  localStorage.setItem('crm_mock_customers', JSON.stringify(customers))
  return data
}
```

---

## 数据存储键名

### localStorage 键名规范

开发环境使用以下 localStorage 键名：

```javascript
// 用户相关
crm_mock_users              // 用户列表
crm_current_user            // 当前登录用户
crm_user_token              // 用户 Token

// 业务数据
crm_mock_customers          // 客户数据
crm_mock_orders             // 订单数据
crm_mock_logistics          // 物流数据
crm_mock_service            // 售后数据
crm_mock_data               // 资料数据

// 系统数据
crm_mock_departments        // 部门数据
crm_mock_roles              // 角色数据
crm_mock_permissions        // 权限数据

// 配置数据
crm_performance_shares      // 业绩分享配置
crm_order_field_config      // 订单字段配置
crm_logistics_status        // 物流状态配置
crm_service_types           // 服务类型配置

// 统计数据
crm_performance_personal    // 个人业绩
crm_performance_team        // 团队业绩
crm_dashboard_stats         // 看板统计
```

### 数据库表名

生产环境使用以下数据库表：

```sql
-- 用户相关
users                       -- 用户表
roles                       -- 角色表
permissions                 -- 权限表
user_roles                  -- 用户角色关联表
role_permissions            -- 角色权限关联表

-- 业务数据
customers                   -- 客户表
orders                      -- 订单表
logistics                   -- 物流表
service_records             -- 售后记录表
data_records                -- 资料表

-- 系统数据
departments                 -- 部门表
system_settings             -- 系统设置表
operation_logs              -- 操作日志表

-- 配置数据
performance_share_config    -- 业绩分享配置表
order_field_config          -- 订单字段配置表
logistics_status_config     -- 物流状态配置表
service_type_config         -- 服务类型配置表
```

---

## 环境切换步骤

### 从开发环境切换到生产环境

#### 步骤 1：修改环境变量

编辑 `.env.production`：
```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_USE_REAL_API=true
```

#### 步骤 2：配置后端数据库

编辑 `backend/.env`：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=crm_user
DB_PASSWORD=your_password
DB_NAME=crm_db
```

#### 步骤 3：导入数据库结构

```bash
mysql -u crm_user -p crm_db < database/schema.sql
```

#### 步骤 4：启动后端服务

```bash
cd backend
npm install
npm run build
pm2 start ecosystem.config.js
```

#### 步骤 5：构建前端

```bash
npm run build
```

#### 步骤 6：部署到服务器

将 `dist` 目录部署到 Nginx 服务器。

### 从生产环境切换到开发环境

#### 步骤 1：修改环境变量

编辑 `.env.development`：
```env
VITE_API_BASE_URL=/api
VITE_USE_REAL_API=false
```

#### 步骤 2：启动开发服务器

```bash
npm run dev
```

系统会自动使用 localStorage 存储数据。

---

## 数据迁移

### 从 localStorage 迁移到数据库

系统提供数据迁移功能（系统管理 → 数据迁移）：

1. 登录系统（开发环境）
2. 进入"系统管理 → 数据迁移"
3. 点击"导出数据"
4. 下载 JSON 文件
5. 切换到生产环境
6. 进入"系统管理 → 数据迁移"
7. 点击"导入数据"
8. 上传 JSON 文件

### 从数据库迁移到 localStorage

1. 登录系统（生产环境）
2. 进入"系统管理 → 数据备份"
3. 点击"导出数据"
4. 下载 JSON 文件
5. 切换到开发环境
6. 打开浏览器控制台
7. 运行导入脚本：
```javascript
// 导入数据到 localStorage
const data = {/* 从 JSON 文件复制数据 */}
Object.keys(data).forEach(key => {
  localStorage.setItem(key, JSON.stringify(data[key]))
})
location.reload()
```

---

## 环境检测

### 前端检测

```typescript
import { isProduction } from '@/utils/env'

if (isProduction) {
  console.log('当前环境：生产环境')
  console.log('数据存储：MySQL 数据库')
} else {
  console.log('当前环境：开发环境')
  console.log('数据存储：localStorage')
}
```

### 运行时检测

在浏览器控制台运行：
```javascript
console.log('环境变量:', import.meta.env)
console.log('是否生产环境:', import.meta.env.VITE_USE_REAL_API === 'true')
```

---

## 注意事项

### 1. 数据一致性

- **开发环境**：数据存储在浏览器 localStorage，清除浏览器数据会丢失
- **生产环境**：数据存储在数据库，持久化保存

### 2. 预设账号

预设账号（`src/config/presetAccounts.ts`）在两种环境下都可用：
- 开发环境：自动初始化到 localStorage
- 生产环境：需要手动导入到数据库

### 3. 权限配置

权限配置（`src/config/defaultRolePermissions.ts`）在两种环境下保持一致。

### 4. 环境隔离

- 开发环境和生产环境的数据完全隔离
- 切换环境不会影响另一个环境的数据
- 建议使用不同的域名或端口

### 5. 性能差异

- **开发环境**：localStorage 读写速度快，但数据量有限（5-10MB）
- **生产环境**：数据库读写速度取决于服务器性能，支持大数据量

---

## 常见问题

### Q: 如何判断当前是什么环境？
A: 查看浏览器控制台，或者在页面右下角查看环境标识。

### Q: 切换环境后数据丢失了？
A: 这是正常的，两个环境的数据是隔离的。如需迁移数据，请使用数据迁移功能。

### Q: 开发环境的数据能同步到生产环境吗？
A: 可以，使用"数据迁移"功能导出开发环境数据，然后导入到生产环境。

### Q: 生产环境能切换回 localStorage 吗？
A: 可以，但不推荐。生产环境应该使用数据库存储。

### Q: 如何清空开发环境的数据？
A: 打开浏览器控制台，运行：
```javascript
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('crm_')) {
    localStorage.removeItem(key)
  }
})
location.reload()
```

### Q: 环境变量修改后不生效？
A: 需要重启开发服务器或重新构建：
```bash
# 开发环境
npm run dev

# 生产环境
npm run build
```

---

## 最佳实践

### 1. 开发流程

```
本地开发（localStorage）
    ↓
功能测试（localStorage）
    ↓
数据迁移（导出 JSON）
    ↓
生产部署（MySQL）
    ↓
数据导入（导入 JSON）
    ↓
生产测试（MySQL）
```

### 2. 环境管理

- 开发环境：用于功能开发和测试
- 测试环境：用于集成测试和演示
- 生产环境：用于正式使用

### 3. 数据备份

- 开发环境：定期导出 localStorage 数据
- 生产环境：每天自动备份数据库

### 4. 版本控制

- `.env.development` 和 `.env.production` 加入版本控制
- 敏感信息（密码、密钥）使用环境变量，不要写在代码中

---

## 技术支持

如遇到环境切换问题，请提供：

1. 当前环境（开发/生产）
2. 环境变量配置
3. 错误信息
4. 操作步骤

联系方式：
- GitHub Issues
- 技术支持邮箱
