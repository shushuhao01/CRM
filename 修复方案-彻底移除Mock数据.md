# 修复方案 - 彻底移除Mock数据依赖

## 问题分析

生产环境下，系统仍在尝试从localStorage读取Mock数据（`crm_mock_users`、`userDatabase`等），导致：
1. 控制台出现"未找到crm_mock_users数据"警告
2. 部门管理和用户管理无法正确显示数据
3. 系统没有真正使用后端API

## 需要修复的文件

### 1. src/stores/department.ts
**问题：**
- `getDepartmentMembers()` 从localStorage读取用户数据
- `updateDepartment()` 从localStorage读取负责人信息

**修复方案：**
- 改为调用真实的API接口获取部门成员
- 改为从API响应中获取负责人信息

### 2. src/services/userDataService.ts
**问题：**
- 会尝试从localStorage读取用户数据作为降级方案

**修复方案：**
- 在生产环境下完全禁用localStorage模式
- 只使用API模式

### 3. src/stores/user.ts
**问题：**
- `loadUsers()` 方法可能使用userDataService

**修复方案：**
- 确保直接调用API，不使用userDataService

### 4. src/api/request.ts
**问题：**
- Mock路由可能在生产环境被触发

**修复方案：**
- 确保生产环境下Mock路由完全禁用

## 修复步骤

### 步骤1：修复department store
```typescript
// 修改 getDepartmentMembers 方法
const getDepartmentMembers = async (departmentId: string): Promise<DepartmentMember[]> => {
  try {
    // 直接调用API获取部门成员
    const { getDepartmentMembers: getDepartmentMembersAPI } = await import('@/api/department')
    const response = await getDepartmentMembersAPI(departmentId)
    return response.data || []
  } catch (error) {
    console.error('[部门Store] 获取部门成员失败:', error)
    return []
  }
}
```

### 步骤2：修复userDataService
```typescript
// 在生产环境下强制使用API
private detectEnvironment(): UserDataServiceConfig {
  const isProduction = import.meta.env.PROD
  const apiBaseURL = import.meta.env.VITE_API_BASE_URL || ''
  
  // 生产环境必须使用API
  const useAPI = isProduction || (apiBaseURL && apiBaseURL !== '')
  
  return {
    useAPI,
    apiBaseURL,
    localStorageKey: 'crm_mock_users'
  }
}
```

### 步骤3：添加环境检查
在所有可能使用localStorage的地方添加环境检查：
```typescript
if (import.meta.env.PROD) {
  // 生产环境：只使用API
  return await fetchFromAPI()
} else {
  // 开发环境：可以使用localStorage
  return await fetchFromLocalStorage()
}
```

## 验证方法

修复后，在生产环境下：
1. 打开浏览器控制台
2. 不应该看到任何"crm_mock_users"相关的日志
3. 所有数据请求都应该是API调用
4. Network标签应该显示真实的API请求

## 注意事项

1. **不要删除Mock数据代码**：开发环境还需要使用
2. **添加环境判断**：使用 `import.meta.env.PROD` 区分环境
3. **保持API兼容**：确保API接口返回的数据格式正确
4. **错误处理**：API失败时给出明确提示，不要静默降级到localStorage
