# 生产环境Mock数据修复计划

## 修复原则
1. **只修改数据获取方式**，不改变任何业务逻辑
2. **添加环境判断**：`import.meta.env.PROD` 区分生产/开发环境
3. **不触碰**：权限、角色、统计公式、流程控制、UI组件
4. **确保代码质量**：无语法错误、无重复声明、无未闭合标签

## 需要修复的文件

### 高优先级（直接影响数据显示）

#### 1. src/stores/order.ts
**问题：**
- 初始化时从localStorage读取Mock订单数据
- 生产环境应该只从API获取

**修复方案：**
```typescript
// 在initializeOrders()方法开头添加环境判断
const initializeOrders = () => {
  // 【生产环境修复】生产环境不使用localStorage
  if (import.meta.env.PROD) {
    console.log('[Order Store] 生产环境：跳过localStorage，等待API数据')
    return
  }
  
  // 开发环境：保留现有逻辑
  // ... 现有代码
}
```

#### 2. src/stores/department.ts
**问题：**
- `syncAllDepartmentMemberCounts()` 从localStorage读取用户数据
- `enrichDepartmentsWithManagerNames()` 从localStorage读取用户数据

**修复方案：**
- 已在前面修复，添加了环境判断

#### 3. src/stores/logisticsStatus.ts
**问题：**
- 创建物流记录时写入localStorage的dataList

**修复方案：**
```typescript
// 添加环境判断
if (!import.meta.env.PROD) {
  // 开发环境：保存到localStorage
  localStorage.setItem('dataList', JSON.stringify(dataList))
}
```

### 中优先级（配置和设置）

#### 4. src/stores/config.ts
**状态：** 配置数据使用localStorage是合理的（用户偏好设置）
**操作：** 不需要修改

#### 5. src/stores/notification.ts
**状态：** 通知消息使用localStorage是合理的（本地缓存）
**操作：** 不需要修改

#### 6. src/stores/improvementGoals.ts
**状态：** 改善目标使用localStorage是合理的（本地数据）
**操作：** 不需要修改

### 低优先级（不影响核心功能）

#### 7. src/stores/orderFieldConfig.ts
**状态：** 已有环境判断，开发环境用localStorage，生产环境用API
**操作：** 不需要修改

#### 8. src/stores/user.ts
**状态：** 用户认证数据必须使用localStorage（token存储）
**操作：** 不需要修改

## 修复步骤

### 步骤1：修复order store
- 在`initializeOrders()`开头添加生产环境判断
- 生产环境直接返回，不读取localStorage

### 步骤2：修复logisticsStatus store
- 在写入dataList时添加环境判断
- 生产环境不写入localStorage

### 步骤3：验证department store
- 确认之前的修复已生效
- 检查是否还有遗漏

### 步骤4：全面测试
- 构建生产版本
- 检查控制台是否还有Mock数据相关日志
- 确认所有数据都从API获取

## 不需要修改的模块

### 客户管理
- src/stores/customer.ts - 已使用持久化store，自动处理

### 商品管理
- 没有独立的product store，数据通过API直接获取

### 业绩统计
- src/stores/performance.ts - 需要检查

### 服务管理
- 没有独立的service store，数据通过API直接获取

### 系统管理
- 角色权限、消息管理等都通过API，不使用localStorage存储业务数据

## 验证清单

修复完成后，在生产环境下验证：

- [ ] 订单列表数据从API获取
- [ ] 部门管理数据从API获取
- [ ] 用户管理数据从API获取
- [ ] 物流数据从API获取
- [ ] 控制台无"crm_mock_"相关日志
- [ ] 控制台无"localStorage"读取Mock数据的日志
- [ ] 所有功能正常工作
- [ ] 无JavaScript错误
