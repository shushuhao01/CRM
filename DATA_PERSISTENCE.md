# 数据持久化说明文档

## 当前状态

✅ **已完成的功能**
- 商品数据的本地存储持久化（localStorage）
- 刷新浏览器后数据不会丢失
- 跨浏览器会话的数据保持
- 完整的CRUD操作支持
- 数据自动保存和恢复

## 本地存储机制

### 技术实现
- 使用 `createPersistentStore` 创建持久化store
- 自动监听数据变化并保存到localStorage
- 页面加载时自动恢复数据
- 支持数据版本控制和过期时间

### 存储位置
- 浏览器localStorage
- 存储键名：`crm_store_product`
- 数据格式：JSON

### 功能特性
- **自动保存**：数据变化时自动保存
- **自动恢复**：页面刷新时自动恢复
- **数据验证**：恢复时验证数据类型
- **错误处理**：存储失败时的降级处理
- **日志记录**：详细的操作日志

## 服务器部署准备

### API接口已准备
商品store中已经准备好了服务器API集成代码（当前被注释）：

```typescript
// 创建商品
const addProduct = async (product) => {
  // TODO: 当服务器部署后，取消注释以下代码
  /*
  try {
    const serverProduct = await productApi.create(product)
    // 使用服务器返回的数据
  } catch (error) {
    // 服务器失败时回退到本地存储
  }
  */
  
  // 当前使用本地存储
}
```

### 部署后的切换步骤

1. **配置服务器API地址**
   ```bash
   # 在 .env.production 中设置
   VITE_API_BASE_URL=https://your-server.com/api
   ```

2. **启用服务器API**
   - 在 `src/stores/product.ts` 中取消注释服务器API代码
   - 注释掉本地存储代码

3. **数据迁移**
   - 可以从localStorage导出现有数据
   - 通过API批量导入到服务器数据库

### 混合模式支持
系统支持混合模式运行：
- 优先使用服务器API
- 服务器失败时自动回退到本地存储
- 确保用户体验的连续性

## 数据安全

### 本地存储限制
- 数据存储在用户浏览器中
- 清除浏览器数据会丢失信息
- 不同设备间数据不同步

### 服务器存储优势
- 数据存储在服务器数据库
- 支持多设备同步
- 数据备份和恢复
- 用户权限控制

## 使用建议

### 当前阶段（本地存储）
- 定期导出重要数据
- 避免清除浏览器数据
- 建议在固定设备上使用

### 服务器部署后
- 数据将自动同步到服务器
- 支持多设备访问
- 数据安全性大幅提升

## 技术细节

### 存储配置
```typescript
const config: StorageConfig = {
  key: 'crm_store_product',
  version: '1.0.0',
  ttl: undefined // 永不过期
}
```

### 数据结构
```typescript
interface Product {
  id: string | number
  code: string
  name: string
  // ... 其他字段
  createTime: string
  updateTime?: string
  deleted?: boolean
}
```

### 监听机制
- 使用Vue的watch监听数据变化
- 深度监听确保嵌套数据变化也被捕获
- 防抖处理避免频繁保存

## 故障排除

### 常见问题
1. **数据没有保存**
   - 检查浏览器是否支持localStorage
   - 查看控制台是否有错误信息
   - 确认存储空间是否充足

2. **数据恢复失败**
   - 检查数据格式是否正确
   - 查看版本兼容性
   - 清除损坏的数据重新开始

3. **性能问题**
   - 检查数据量是否过大
   - 考虑清理历史数据
   - 优化数据结构

### 调试方法
```javascript
// 查看存储的数据
console.log(localStorage.getItem('crm_store_product'))

// 清除数据重新开始
localStorage.removeItem('crm_store_product')

// 查看存储统计
console.log(persistentStorage.getStats())
```

## 更新日志

### v1.0.0 (当前版本)
- ✅ 实现本地存储持久化
- ✅ 完整的CRUD操作支持
- ✅ 自动保存和恢复
- ✅ 错误处理和日志记录
- ✅ 服务器API集成准备

### 计划中的功能
- 🔄 服务器数据库集成
- 🔄 数据同步机制
- 🔄 离线模式支持
- 🔄 数据导入导出工具