# 登录Token问题诊断

## 问题现象
登录成功后立即显示"登录已过期，请重新登录"，用户被退出。

## 问题分析流程

### 1. Token 存储检查
**位置：** `src/stores/user.ts` 第 624-630 行

```typescript
localStorage.setItem('auth_token', token.value)
localStorage.setItem('user', JSON.stringify(completeUserInfo))
localStorage.setItem('user_info', JSON.stringify(completeUserInfo))
localStorage.setItem('userPermissions', JSON.stringify(userPermissions))
localStorage.setItem('token_expiry', expiryTime.toString())
```

**检查点：**
- ✅ Token 被保存到 localStorage
- ✅ 设置了 token_expiry（7天）

### 2. Token 读取检查
**位置：** `src/services/apiService.ts` 第 164 行

```typescript
private getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}
```

**检查点：**
- ✅ 从 localStorage 读取 auth_token
- ✅ 添加到请求头 Authorization: Bearer ${token}

### 3. Token 获取检查
**位置：** `src/stores/user.ts` 第 509-518 行

```typescript
const tokensData = response.data?.tokens || response.tokens
const accessToken = tokensData?.accessToken || tokensData?.access_token || response.token

if (!accessToken) {
  console.error('[Auth] 登录响应中未找到Token:', response)
  throw new Error('登录响应格式错误：未找到Token')
}

token.value = accessToken
```

**潜在问题：**
- ❓ 后端返回的 Token 结构可能不匹配
- ❓ accessToken 可能为 undefined

### 4. 401 错误触发检查
**位置：** `src/services/apiService.ts` 第 123 行

```typescript
case 401:
  this.handleUnauthorized(true)  // 清除Token并显示提示
  break
```

**问题根源：**
- ❌ 登录后的首个 API 请求返回 401
- ❌ 触发 handleUnauthorized，清除所有认证信息
- ❌ 显示"登录已过期"提示

## 根本原因

**Token 获取逻辑有问题！**

后端返回格式：
```json
{
  "success": true,
  "data": {
    "user": {...},
    "tokens": {
      "accessToken": "xxx",
      "refreshToken": "yyy"
    }
  }
}
```

但前端可能从错误的路径获取 Token，导致 `token.value` 为 undefined 或空字符串。

## 解决方案

### 方案1：增强 Token 获取逻辑（已实施）
在 `user.ts` 中添加了更健壮的 Token 获取逻辑，但可能还不够。

### 方案2：添加调试日志
在关键位置添加 console.log，确认 Token 的值。

### 方案3：延迟首次 API 请求
登录成功后，等待 Token 完全保存到 localStorage 再发起其他请求。

## 下一步行动

1. 在浏览器控制台检查 localStorage 中的 auth_token 值
2. 检查登录响应的完整结构
3. 确认 Token 是否被正确提取和保存
4. 如果 Token 为空，修复提取逻辑
5. 如果 Token 正确但后端返回 401，检查后端 JWT 验证逻辑
