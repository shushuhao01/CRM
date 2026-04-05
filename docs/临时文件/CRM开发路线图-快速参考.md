# CRM开发路线图 - 快速参考

## 🎯 核心建议

**先开发租户版本(SaaS),再适配私有部署!** ⭐

## 💡 为什么?

1. **租户版本 = 私有部署 + 租户隔离**
2. **开发完租户版本,私有部署只需设置环境变量**
3. **避免重复工作**

---

## 📅 开发顺序(5周MVP)

### Week 1: 数据库改造 ⭐
```sql
-- 所有业务表添加tenant_id
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(36) NULL;
-- ... 其他表
```

### Week 2: 后端租户隔离 ⭐
```typescript
// 租户认证中间件
export const tenantAuth = async (req, res, next) => {
  req.tenantId = decoded.tenantId
  next()
}

// 智能Repository(自动添加tenant_id过滤)
export class BaseRepository<T> {
  async find(options) {
    where.tenant_id = req.tenantId
  }
}
```

### Week 3: 前端租户支持 ⭐
```vue
<!-- 登录页面添加授权码输入 -->
<el-form-item label="授权码">
  <el-input v-model="form.licenseKey" />
</el-form-item>
```

### Week 4: Admin后台核心 🟡
- 文件上传
- 权限控制
- 数据导出

### Week 5: 私有部署适配 ⭐
```typescript
// 添加模式判断
if (deployConfig.isSaaS()) {
  // 租户模式
} else {
  // 私有部署模式
}
```

---

## 📋 任务清单

### 租户版本(必须)
- [ ] 数据库添加tenant_id
- [ ] 后端租户认证
- [ ] 后端数据隔离
- [ ] 前端租户登录
- [ ] 数据隔离测试

### 私有部署(必须)
- [ ] 添加DEPLOY_MODE配置
- [ ] 实现模式判断
- [ ] 实现授权验证
- [ ] 测试两种模式

### Admin后台(应该)
- [ ] 文件上传
- [ ] 权限控制
- [ ] 数据导出
- [ ] 接口管理

---

## 🎯 时间估算

- **最小可用版本(MVP)**: 5周
- **完整功能版本**: 9周

---

## 📚 详细文档

`docs/CRM开发路线图-完整版.md` - 详细的开发计划

---

**推荐策略**: 先租户版本,后私有部署 ⭐  
**预计时间**: 5周MVP
