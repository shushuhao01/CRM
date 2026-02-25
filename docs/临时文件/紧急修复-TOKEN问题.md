# 紧急修复 - TOKEN未找到问题

## 问题原因

你的系统正在使用**Mock API模式**（模拟API），但是localStorage中**没有用户数据**，导致登录时找不到用户，无法生成TOKEN。

## TOKEN是什么？

**TOKEN（令牌）** = 你的"数字身份证"
- 登录成功后，系统给你一个加密字符串
- 之后每次操作都带上这个TOKEN证明身份
- 就像进入小区需要门禁卡一样

## 立即解决方案

### 方案1：使用预设账号登录（推荐）

系统内置了预设账号，直接使用：

**超级管理员账号：**
- 用户名：`admin`
- 密码：`admin123`

**部门管理员账号：**
- 用户名：`manager`  
- 密码：`manager123`

**销售员账号：**
- 用户名：`sales001`
- 密码：`sales123`

### 方案2：切换到真实后端API

如果你的后端服务器已经启动，在浏览器控制台执行：

```javascript
// 禁用Mock API
localStorage.removeItem('erp_mock_enabled')
// 刷新页面
location.reload()
```

### 方案3：手动初始化用户数据

在浏览器控制台执行以下代码：

```javascript
// 初始化用户数据
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    realName: '系统管理员',
    email: 'admin@example.com',
    phone: '13800138000',
    role: 'super_admin',
    roleId: 'super_admin',
    status: 'active',
    departmentId: 1,
    departmentName: '管理部'
  }
];

localStorage.setItem('crm_mock_users', JSON.stringify(users));
console.log('用户数据已初始化，请刷新页面重新登录');
location.reload();
```

## 检查当前状态

在浏览器控制台执行：

```javascript
// 检查是否启用Mock API
console.log('Mock API状态:', localStorage.getItem('erp_mock_enabled'));

// 检查是否有用户数据
console.log('用户数据:', localStorage.getItem('crm_mock_users'));

// 检查当前TOKEN
console.log('当前TOKEN:', localStorage.getItem('auth_token'));
```

## 为什么会出现这个问题？

1. **Mock API模式被启用**：系统在使用前端模拟的API，不连接真实后端
2. **localStorage被清空**：浏览器缓存被清除，用户数据丢失
3. **预设账号未加载**：系统没有正确加载内置的预设账号

## 长期解决方案

### 1. 确保预设账号始终可用

我需要修改代码，确保即使localStorage为空，预设账号也能正常工作。

### 2. 添加自动初始化

系统启动时自动检查并初始化必要的数据。

### 3. 改进错误提示

当找不到TOKEN时，给出明确的解决建议。

## 下一步操作

1. **立即尝试方案1**：使用 `admin` / `admin123` 登录
2. **如果还是失败**：执行方案3初始化数据
3. **提供截图**：
   - 浏览器控制台的完整日志
   - Network标签中的登录请求
   - localStorage的内容（F12 → Application → Local Storage）

## 我现在要做的修复

我会立即修改代码，确保：
1. 预设账号始终可用，不依赖localStorage
2. 登录失败时给出明确的错误提示和解决方案
3. 自动初始化必要的数据
