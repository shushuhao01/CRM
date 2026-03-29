# SaaS多租户 - 快速实施指南

## 🎯 一句话总结
使用**共享数据库+租户ID隔离**方案,所有业务表添加`tenant_id`字段,通过代码强制过滤实现数据隔离。

## ✅ 为什么选这个方案?
- ✅ 成本最低(一个数据库支持数千租户)
- ✅ 维护最简单(一次升级所有租户受益)
- ✅ 行业标准(Salesforce、Shopify都用这个)
- ✅ 扩展性好(适合租户数量增长)

## ⚠️ 你担心的问题
### 问题1: 数据会冲突吗?
**答**: 不会!所有查询都强制添加`tenant_id`过滤

### 问题2: 租户管理员设置会影响其他人吗?
**答**: 不会!配置表也有`tenant_id`,完全隔离

### 问题3: 权限会冲突吗?
**答**: 不会!角色和权限也有`tenant_id`

## 🔧 快速实施(3步)

### 第1步: 数据库改造
```sql
-- 1. 所有业务表添加 tenant_id
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE orders ADD COLUMN tenant_id VARCHAR(36) AFTER id;
-- ... 其他所有业务表

-- 2. 添加索引
ALTER TABLE users ADD INDEX idx_tenant_id (tenant_id);
ALTER TABLE customers ADD INDEX idx_tenant_id (tenant_id);
-- ... 其他所有业务表

-- 3. 修改唯一索引(添加tenant_id)
ALTER TABLE users DROP INDEX uk_username;
ALTER TABLE users ADD UNIQUE KEY uk_tenant_username (tenant_id, username);
```

### 第2步: 后端改造
```typescript
// 1. 创建租户中间件
export const tenantAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!)
  req.tenantId = decoded.tenantId  // 从Token提取租户ID
  next()
}

// 2. 所有查询添加tenant_id过滤
// ❌ 错误
const customers = await Customer.find()

// ✅ 正确
const customers = await Customer.find({ 
  where: { tenant_id: req.tenantId } 
})
```

### 第3步: 前端改造
```typescript
// 1. 登录时保存租户信息
const login = async (licenseKey, username, password) => {
  const res = await api.post('/tenant-license/login', {
    licenseKey, username, password
  })
  localStorage.setItem('tenantId', res.data.tenantId)
  localStorage.setItem('token', res.data.token)
}

// 2. Token中已包含tenantId,后端自动提取
// 前端无需额外处理
```

## 📋 需要改造的表

### 需要添加 tenant_id 的表
```
✅ users              - 用户表
✅ customers          - 客户表
✅ orders             - 订单表
✅ products           - 商品表
✅ roles              - 角色表
✅ permissions        - 权限表
✅ settings           - 配置表
✅ ... 所有业务表
```

### 不需要添加 tenant_id 的表
```
❌ system_config      - 系统配置
❌ system_license     - 系统授权
❌ admin_users        - Admin管理员
❌ tenants            - 租户表本身
❌ tenant_packages    - 套餐表
❌ versions           - 版本表
```

## 🚀 实施时间
- 数据库改造: 1周
- 后端改造: 1-2周
- 前端改造: 1周
- 测试上线: 1周
- **总计: 4-5周**

## 📚 详细文档
- `docs/SaaS多租户架构方案.md` - 完整方案(包含3种方案对比)
- `docs/Admin后台开发计划-完整版.md` - 开发计划

## 🎯 下一步
1. 阅读完整方案文档
2. 开始数据库改造
3. 逐步实施后端和前端改造

---

**推荐方案**: 共享数据库+租户ID隔离 ⭐  
**实施难度**: ⭐⭐⭐☆☆ (中等)  
**维护难度**: ⭐⭐⭐⭐⭐ (简单)
