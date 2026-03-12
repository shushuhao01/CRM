# 租户客户列表UI完善 - 字段映射修复

## 修复时间
2026-03-03

## 问题描述

用户反馈Admin后台的租户客户列表存在以下问题：
1. 字段映射不一致（前端使用snake_case和camelCase混用）
2. 授权状态显示不正确
3. 操作列按钮需要显示文字+图标
4. 启用状态只用开关按钮，不要文字
5. 错误创建了 `/tenants` 路由对应的文件（实际应该是 `/tenant-customers`）

## 修复内容

### 1. 删除错误的文件

删除了不在路由中的 `admin/src/views/tenants/` 目录下的所有文件：
- `admin/src/views/tenants/List.vue`
- `admin/src/views/tenants/Detail.vue`
- `admin/src/views/tenants/Packages.vue`

这些文件是误创建的，实际使用的是 `admin/src/views/tenant-customers/` 目录。

### 2. 统一字段命名规范

#### 后端修改 (`backend/src/controllers/admin/TenantController.ts`)

在 `getTenantList` 方法中，将返回数据统一转换为 camelCase 格式：

```typescript
// 转换为camelCase格式返回给前端
return {
  id: tenant.id,
  name: tenant.name,
  code: tenant.code,
  packageId: tenant.packageId,
  packageName: null, // TODO: 从packages表查询
  contact: tenant.contact,
  phone: tenant.phone,
  email: tenant.email,
  maxUsers: tenant.maxUsers,
  maxStorageGb: tenant.maxStorageGb,
  userCount,
  usedStorageMb: tenant.usedStorageMb,
  expireDate: tenant.expireDate ? tenant.expireDate.toISOString().split('T')[0] : null,
  licenseKey: tenant.licenseKey,
  licenseStatus: tenant.licenseStatus,
  activatedAt: tenant.activatedAt,
  features: tenant.features,
  databaseName: tenant.databaseName,
  remark: tenant.remark,
  status: tenant.status,
  createdAt: tenant.createdAt,
  updatedAt: tenant.updatedAt,
  isExpired: tenant.isExpired(),
  isAvailable: tenant.isAvailable()
};
```

#### 前端修改 (`admin/src/views/tenant-customers/List.vue`)

1. **fetchData 方法** - 添加字段转换逻辑，兼容后端可能返回的两种格式：

```typescript
tableData.value = (res.data.list || []).map((item: any) => ({
  id: item.id,
  name: item.name,
  code: item.code,
  contact: item.contact,
  phone: item.phone,
  email: item.email,
  licenseKey: item.licenseKey || item.license_key,
  licenseStatus: item.licenseStatus || item.license_status,
  status: item.status,
  packageId: item.packageId || item.package_id,
  packageName: item.packageName || item.package_name,
  userCount: item.userCount ?? item.user_count ?? 0,
  maxUsers: item.maxUsers ?? item.max_users ?? 0,
  maxStorageGb: item.maxStorageGb ?? item.max_storage_gb ?? 0,
  expireDate: item.expireDate || item.expire_date,
  remark: item.remark,
  showFullKey: false,
  statusLoading: false,
  licenseLoading: false
}))
```

2. **模板字段更新** - 所有字段统一使用 camelCase：
   - `row.license_key` → `row.licenseKey`
   - `row.license_status` → `row.licenseStatus`
   - `row.package_name` → `row.packageName`
   - `row.user_count` → `row.userCount`
   - `row.max_users` → `row.maxUsers`
   - `row.expire_date` → `row.expireDate`

3. **授权码掩码优化** - 支持新的授权码格式：

```typescript
const maskKey = (key: string) => {
  if (!key) return ''
  // LIC-XXXXXXXXXXXXXXXXXXXX 格式
  if (key.startsWith('LIC-')) {
    return `${key.substring(0, 8)}****${key.substring(key.length - 4)}`
  }
  // 旧格式 XXXX-XXXX-XXXX-XXXX
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 8) + '****'
}
```

### 3. UI优化确认

已实现的UI功能：

✅ **启用状态列** - 使用开关按钮，无文字，带悬浮提示
```vue
<el-tooltip :content="row.status === 'active' ? '点击禁用' : '点击启用'" placement="top">
  <el-switch
    :model-value="row.status === 'active'"
    @change="handleToggleStatus(row)"
    :loading="row.statusLoading"
  />
</el-tooltip>
```

✅ **授权状态列** - 使用Tag显示状态
```vue
<el-tag :type="getLicenseStatusType(row.licenseStatus)" size="small">
  {{ getLicenseStatusText(row.licenseStatus) }}
</el-tag>
```

✅ **操作列** - 显示文字+图标按钮
```vue
<el-button link type="primary" size="small" @click="...">
  <el-icon><View /></el-icon>详情
</el-button>
<el-button link type="warning" size="small" @click="...">
  <el-icon><Edit /></el-icon>编辑
</el-button>
<el-button link :type="..." size="small" @click="..." :loading="...">
  <el-icon><component :is="..." /></el-icon>
  {{ row.licenseStatus === 'active' ? '暂停' : '恢复' }}
</el-button>
<el-button link type="success" size="small" @click="...">
  <el-icon><Clock /></el-icon>续期
</el-button>
<el-button link type="info" size="small" @click="...">
  <el-icon><RefreshRight /></el-icon>重生成
</el-button>
<el-button link type="danger" size="small" @click="...">
  <el-icon><Delete /></el-icon>删除
</el-button>
```

## 字段映射对照表

| 前端显示 | 后端字段（数据库） | 前端变量（camelCase） | 说明 |
|---------|------------------|---------------------|------|
| 客户名称 | name | name | 租户名称 |
| 租户编码 | code | code | 唯一标识 |
| 联系人 | contact | contact | 联系人姓名 |
| 联系电话 | phone | phone | 联系电话 |
| 授权码 | license_key | licenseKey | 授权密钥 |
| 授权状态 | license_status | licenseStatus | pending/active/suspended/expired |
| 启用状态 | status | status | active/inactive |
| 套餐 | package_name | packageName | 套餐名称 |
| 用户数 | user_count | userCount | 当前用户数 |
| 最大用户数 | max_users | maxUsers | 用户上限 |
| 到期时间 | expire_date | expireDate | 过期日期 |

## 状态说明

### 启用状态 (status)
- `active` - 启用（账号可用）
- `inactive` - 禁用（账号不可用）

### 授权状态 (licenseStatus)
- `pending` - 待激活
- `active` - 已激活
- `suspended` - 已暂停
- `expired` - 已过期

## 测试建议

1. 重启Admin前端服务
2. 访问 `/tenant-customers/list` 页面
3. 检查所有字段是否正确显示
4. 测试所有操作按钮功能：
   - 启用/禁用开关
   - 暂停/恢复授权
   - 续期
   - 重新生成授权码
   - 删除

## 相关文件

- `admin/src/views/tenant-customers/List.vue` - 租户客户列表页面
- `backend/src/controllers/admin/TenantController.ts` - 租户控制器
- `backend/src/entities/Tenant.ts` - 租户实体
- `admin/src/router/index.ts` - 路由配置

## 后续优化

1. 从 packages 表查询套餐名称（目前返回 null）
2. 添加批量操作功能
3. 添加导出功能
4. 优化搜索和筛选功能
