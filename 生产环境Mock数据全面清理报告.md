# 生产环境Mock数据全面清理报告

## 📋 检查范围

根据侧边栏菜单结构，全面检查以下模块：

### 1. 客户管理
- ✅ 客户列表 (`src/views/Customer/List.vue`)
- ✅ 标签管理 (`src/views/Customer/Tags.vue`)
- ✅ 分组管理 (`src/views/Customer/Groups.vue`)
- ✅ 客户详情 (`src/views/Customer/Detail.vue`)
- ✅ 新增客户 (`src/views/Customer/Add.vue`)

### 2. 订单管理
- ✅ 订单列表 (`src/views/Order/List.vue`)
- ✅ 新建订单 (`src/views/Order/Add.vue`)
- ✅ 订单审核 (通过API: `src/api/order.ts`)

### 3. 服务管理
- ✅ 服务列表 (`src/views/Service/Data.vue`)
- ✅ 新增服务 (`src/views/Service/Add.vue`)
- ✅ 服务详情 (`src/views/Service/Detail.vue`)
- ✅ 服务编辑 (`src/views/Service/Edit.vue`)

### 4. 业绩统计
- ⚠️ 个人业绩 (`src/views/Performance/Personal.vue`)
- ⚠️ 团队业绩 (`src/views/Performance/Team.vue`)
- ⚠️ 业绩分析 (`src/views/Performance/Analysis.vue`)
- ⚠️ 业绩分享 (`src/views/Performance/Share.vue`)

### 5. 物流管理
- ✅ 发货列表 (`src/views/Logistics/List.vue`)
- ✅ 物流跟踪 (`src/views/Logistics/Track.vue`)
- ✅ 状态更新 (`src/views/Logistics/StatusUpdate.vue`)
- ✅ 物流公司 (`src/views/Logistics/Companies.vue`)

### 6. 售后管理
- 📝 售后订单 (文件不存在，需确认)
- 📝 新增售后 (文件不存在，需确认)
- 📝 售后数据 (文件不存在，需确认)

### 7. 资料管理
- ⚠️ 资料列表 (`src/views/Data/List.vue`)
- ⚠️ 客户查询 (`src/views/Data/Search.vue` / `src/views/Data/SearchNew.vue`)
- 📝 回收站 (需确认文件位置)

### 8. 商品管理
- ⚠️ 商品列表 (`src/views/Product/List.vue`)
- 📝 新增商品 (需确认文件位置)
- ⚠️ 库存管理 (`src/views/Product/Stock.vue`)
- ⚠️ 商品分类 (通过API: `src/api/product.ts`)
- ⚠️ 商品分析 (`src/views/Product/Analytics.vue`)

### 9. 系统管理
- ⚠️ 角色权限 (`src/views/System/Role.vue`)
- ⚠️ 超管面板 (需确认)
- ⚠️ 客服管理 (`src/views/System/User.vue`)
- 📝 消息管理 (需确认文件位置)
- ✅ 系统设置 (`src/views/System/Settings.vue`)

## 🔍 发现的问题

### 问题1: API层仍在使用Mock API判断
**影响模块**: 客户管理、商品分类
**文件**: 
- `src/api/customer.ts` - 使用 `shouldUseMockApi()` 判断
- `src/api/product.ts` - 使用 `shouldUseMockApi()` 判断

**问题代码示例**:
```typescript
// src/api/customer.ts
getList: async (params?: CustomerSearchParams) => {
  if (shouldUseMockApi()) {  // ❌ 生产环境可能误判
    const data = await mockApi.getCustomerList(params)
    return { data, code: 200, message: 'success', success: true }
  }
  return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.LIST, params)
}
```

### 问题2: 业绩统计API使用localStorage降级
**影响模块**: 个人业绩、团队业绩、业绩分析
**文件**: `src/api/performance.ts`

**问题代码**:
```typescript
export const getPersonalPerformance = async (params) => {
  if (isProduction()) {
    try {
      const response = await request.get('/api/performance/personal', { params })
      return response.data || response
    } catch (error) {
      // ❌ 生产环境降级到localStorage
      console.error('[Performance API] 后端API调用失败，降级到localStorage:', error)
    }
  }
  // ❌ 开发环境直接读localStorage
  const ordersData = localStorage.getItem('crm_store_order')
  ...
}
```

### 问题3: 资料管理API使用localStorage降级
**影响模块**: 客户查询
**文件**: `src/api/data.ts`

**问题代码**:
```typescript
export const searchCustomer = async (params) => {
  if (isProduction()) {
    try {
      const response = await api.get('/api/data/search-customer', params)
      return response.data || response
    } catch (error) {
      // ❌ 生产环境降级到localStorage
      console.error('[Data API] 后端API调用失败，降级到localStorage:', error)
    }
  }
  // ❌ 开发环境直接读localStorage
  const customerStore = localStorage.getItem('customer-store')
  ...
}
```

### 问题4: 视图层直接读取localStorage
**影响模块**: 系统管理
**文件**: 
- `src/views/Dashboard.vue` - 读取 `crm_mock_users`、`crm_mock_departments`
- `src/views/System/Role.vue` - 读取 `crm_mock_users`
- `src/views/System/User.vue` - 读取 `crm_mock_users`

### 问题5: Store层在生产环境读取localStorage
**影响模块**: 部门管理
**文件**: `src/stores/department.ts`

**已修复但需验证**:
```typescript
// 开发环境下，如果需要从localStorage获取
try {
  const usersStr = localStorage.getItem('crm_mock_users')  // ⚠️ 仍有读取
  if (!usersStr) return depts
  ...
}
```

### 问题6: 服务层降级逻辑
**影响模块**: 用户管理、认证
**文件**:
- `src/services/authApiService.ts` - 读取 `crm_mock_users`
- `src/services/userApiService.ts` - 降级到localStorage
- `src/services/profileApiService.ts` - 补充数据从localStorage

## 🎯 修复策略

### 策略1: 移除API层的Mock判断（生产环境）
在生产环境下，API层应该**完全不使用** `shouldUseMockApi()` 判断，直接调用真实API。

### 策略2: 移除降级逻辑（生产环境）
生产环境下，API调用失败应该**直接抛出错误**，不应该降级到localStorage。

### 策略3: 视图层通过API获取数据
所有视图层应该通过API Service获取数据，不直接读取localStorage。

### 策略4: Store层环境隔离
Store层应该严格区分开发/生产环境，生产环境不读写localStorage业务数据。

## ✅ 修复优先级

### P0 - 立即修复（核心业务）
1. `src/api/customer.ts` - 客户管理API
2. `src/api/order.ts` - 订单管理API（已修复）
3. `src/api/performance.ts` - 业绩统计API
4. `src/api/data.ts` - 资料管理API

### P1 - 高优先级（系统管理）
5. `src/views/Dashboard.vue` - 仪表盘
6. `src/views/System/Role.vue` - 角色权限
7. `src/views/System/User.vue` - 用户管理
8. `src/services/authApiService.ts` - 认证服务
9. `src/services/userApiService.ts` - 用户服务

### P2 - 中优先级（辅助功能）
10. `src/api/product.ts` - 商品分类API
11. `src/services/profileApiService.ts` - 个人资料服务
12. `src/stores/department.ts` - 部门Store（已部分修复）

## 📊 修复进度

- ✅ 已修复: 订单Store、物流Store、部门Store（部分）
- ⚠️ 需修复: 12个文件
- 📝 待确认: 售后管理模块文件位置

## 🚀 下一步行动

1. 修复P0优先级的4个API文件
2. 修复P1优先级的5个视图和服务文件
3. 修复P2优先级的3个文件
4. 全面测试生产环境数据流
5. 清理所有Mock相关的localStorage键
