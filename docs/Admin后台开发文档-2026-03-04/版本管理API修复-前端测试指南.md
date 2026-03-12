# 版本管理API修复 - 前端测试指南

## 测试环境

- 后端服务: http://localhost:3000
- Admin前端: http://localhost:5174
- 测试账号: admin / admin123

## 测试步骤

### 1. 启动服务

```bash
# 后端已启动（terminalId: 1）
# 如需重启：
cd backend
npm run dev

# 启动Admin前端
cd admin
npm run dev
```

### 2. 登录Admin后台

1. 打开浏览器访问: http://localhost:5174
2. 使用账号登录: admin / admin123

### 3. 测试更新日志列表（修复404问题）

**问题**: 之前访问更新日志页面报404错误

**测试步骤**:
1. 点击左侧菜单 "版本发布" -> "更新日志"
2. 页面应正常加载,显示更新日志列表
3. 如果有数据,应显示版本号、类型、内容等信息
4. 如果没有数据,应显示"暂无更新日志"

**预期结果**: ✅ 页面正常加载,不再报404错误

### 4. 测试版本创建（修复字段映射问题）

**问题**: 之前创建版本时字段不匹配导致失败

**测试步骤**:
1. 点击左侧菜单 "版本发布" -> "上传新版本"
2. 填写表单:
   - 版本号: 1.0.1
   - 版本名称: 测试版本
   - 版本类型: 正式版
   - 平台: Windows
   - 更新说明: 这是一个测试版本
   - 强制更新: 关闭
3. 点击"保存草稿"按钮
4. 应提示"草稿已保存"并跳转到版本列表

**预期结果**: ✅ 版本创建成功,字段正确映射

### 5. 测试版本列表显示

**测试步骤**:
1. 点击左侧菜单 "版本发布" -> "版本列表"
2. 应显示刚创建的版本
3. 检查字段显示:
   - 版本号: 1.0.1
   - 版本名称: 测试版本
   - 版本类型: 正式版
   - 平台: Windows
   - 状态: 草稿

**预期结果**: ✅ 版本列表正常显示,字段映射正确

### 6. 测试更新日志创建

**测试步骤**:
1. 在更新日志页面点击"添加日志"
2. 填写表单:
   - 关联版本: 选择刚创建的版本
   - 变更类型: 新功能
   - 变更内容: 测试更新日志
3. 点击"确定"
4. 应提示"保存成功"并刷新列表

**预期结果**: ✅ 更新日志创建成功

### 7. 测试更新日志筛选

**测试步骤**:
1. 在更新日志页面顶部选择版本筛选
2. 选择刚创建的版本
3. 列表应只显示该版本的更新日志

**预期结果**: ✅ 筛选功能正常工作

## 字段映射验证

### 版本字段映射

| 前端字段 | 后端字段 | 说明 |
|---------|---------|------|
| version_number | version | 版本号 |
| version_name | changelog | 版本名称 |
| version_type | releaseType | 版本类型（stable/beta/alpha → major/minor/patch/beta） |
| release_notes | changelog | 更新说明 |
| is_force_update | isForceUpdate | 强制更新（boolean → 0/1） |
| is_published | isPublished | 是否发布（boolean → 0/1） |
| download_url | downloadUrl | 下载地址 |
| file_size | fileSize | 文件大小 |

### 更新日志字段映射

| 前端字段 | 后端字段 | 说明 |
|---------|---------|------|
| version_id | versionId | 版本ID |
| change_type | type | 变更类型 |
| content | content | 变更内容 |

## API端点验证

### 版本管理API

- ✅ GET /api/v1/admin/versions - 获取版本列表
- ✅ GET /api/v1/admin/versions/:id - 获取版本详情
- ✅ POST /api/v1/admin/versions - 创建版本
- ✅ PUT /api/v1/admin/versions/:id - 更新版本
- ✅ DELETE /api/v1/admin/versions/:id - 删除版本
- ✅ POST /api/v1/admin/versions/:id/publish - 发布版本
- ✅ POST /api/v1/admin/versions/:id/deprecate - 废弃版本

### 更新日志API（新增）

- ✅ GET /api/v1/admin/changelogs - 获取更新日志列表
- ✅ GET /api/v1/admin/changelogs/:id - 获取更新日志详情
- ✅ POST /api/v1/admin/changelogs - 创建更新日志
- ✅ POST /api/v1/admin/changelogs/batch - 批量创建更新日志
- ✅ PUT /api/v1/admin/changelogs/:id - 更新更新日志
- ✅ DELETE /api/v1/admin/changelogs/:id - 删除更新日志

## 常见问题

### Q1: 更新日志页面还是404?

**检查**:
1. 后端服务是否正常运行
2. 浏览器控制台查看具体错误信息
3. 检查路由是否正确注册: `backend/src/routes/admin/index.ts`

### Q2: 创建版本时提示字段错误?

**检查**:
1. 查看浏览器控制台Network标签,查看请求参数
2. 查看后端日志,确认收到的字段
3. 确认字段映射是否正确

### Q3: 版本列表显示不正确?

**检查**:
1. 查看浏览器控制台,确认返回的数据结构
2. 检查前端字段映射是否正确
3. 查看后端VersionController的getVersions方法

## 测试完成标准

- [x] 后端API测试全部通过（test-versions-changelogs-api.js）
- [ ] 更新日志页面正常加载
- [ ] 版本创建功能正常
- [ ] 版本列表显示正确
- [ ] 更新日志创建功能正常
- [ ] 更新日志筛选功能正常

## 下一步

如果所有测试通过,可以:
1. 删除测试版本和更新日志
2. 标记任务为完成
3. 继续Admin后台其他功能开发

如果测试失败,请:
1. 记录具体错误信息
2. 查看浏览器控制台和后端日志
3. 根据错误信息进行调试
