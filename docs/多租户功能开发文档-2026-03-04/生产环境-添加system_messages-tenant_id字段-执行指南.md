# 生产环境 - 添加system_messages表tenant_id字段 - 执行指南

## 执行信息

- **执行时间**: 2026-03-03
- **目标数据库**: abc789_cn (生产环境)
- **执行方式**: 宝塔面板 SQL窗口
- **预计耗时**: < 1分钟
- **影响范围**: system_messages表
- **是否需要停机**: 否

## 背景说明

为支持多租户SaaS模式，需要在system_messages表添加tenant_id字段，实现租户数据隔离。

### 字段说明

- **字段名**: tenant_id
- **类型**: VARCHAR(36)
- **允许NULL**: 是（兼容私有部署模式）
- **默认值**: NULL
- **索引**: 是（idx_tenant_id）
- **位置**: target_user_id字段之后

## 执行步骤

### 步骤1: 登录宝塔面板

1. 打开浏览器访问宝塔面板
2. 登录管理员账号
3. 进入"数据库"菜单

### 步骤2: 打开SQL窗口

1. 找到数据库 `abc789_cn`
2. 点击"管理"按钮
3. 选择"SQL窗口"标签

### 步骤3: 检查字段是否已存在

复制并执行以下SQL：

```sql
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'abc789_cn'
  AND TABLE_NAME = 'system_messages'
  AND COLUMN_NAME = 'tenant_id';
```

**判断**:
- 如果有结果：字段已存在，无需执行后续步骤 ✅
- 如果无结果：继续执行步骤4 ⬇️

### 步骤4: 添加tenant_id字段

复制并执行以下SQL：

```sql
ALTER TABLE system_messages 
ADD COLUMN tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER target_user_id;
```

**预期结果**:
```
Query OK, 0 rows affected (0.XX sec)
Records: 0  Duplicates: 0  Warnings: 0
```

### 步骤5: 添加索引

复制并执行以下SQL：

```sql
ALTER TABLE system_messages 
ADD INDEX idx_tenant_id (tenant_id);
```

**预期结果**:
```
Query OK, 0 rows affected (0.XX sec)
Records: 0  Duplicates: 0  Warnings: 0
```

### 步骤6: 验证字段添加成功

复制并执行以下SQL：

```sql
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'abc789_cn'
  AND TABLE_NAME = 'system_messages'
  AND COLUMN_NAME = 'tenant_id';
```

**预期结果**:
```
COLUMN_NAME: tenant_id
COLUMN_TYPE: varchar(36)
IS_NULLABLE: YES
COLUMN_DEFAULT: NULL
COLUMN_COMMENT: 租户ID
COLUMN_KEY: MUL
```

### 步骤7: 查看完整表结构

复制并执行以下SQL：

```sql
SHOW CREATE TABLE system_messages\G
```

**检查要点**:
- tenant_id字段在target_user_id之后 ✅
- 有idx_tenant_id索引 ✅

### 步骤8: 统计现有数据

复制并执行以下SQL：

```sql
SELECT 
    COUNT(*) as total_messages,
    COUNT(tenant_id) as messages_with_tenant,
    COUNT(*) - COUNT(tenant_id) as messages_without_tenant
FROM system_messages;
```

**预期结果**:
```
total_messages: X (总消息数)
messages_with_tenant: 0 (新字段，现有数据都是NULL)
messages_without_tenant: X (等于total_messages)
```

## 完整SQL脚本

如果你想一次性执行所有步骤，可以使用以下完整脚本：

```sql
-- ============================================================================
-- 生产环境 - 为system_messages表添加tenant_id字段
-- ============================================================================

USE abc789_cn;

-- 步骤1: 检查字段是否已存在
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'abc789_cn'
  AND TABLE_NAME = 'system_messages'
  AND COLUMN_NAME = 'tenant_id';

-- 如果上面查询有结果，说明字段已存在，无需执行后续步骤

-- 步骤2: 添加tenant_id字段
ALTER TABLE system_messages 
ADD COLUMN tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER target_user_id;

-- 步骤3: 添加索引
ALTER TABLE system_messages 
ADD INDEX idx_tenant_id (tenant_id);

-- 步骤4: 验证字段添加成功
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'abc789_cn'
  AND TABLE_NAME = 'system_messages'
  AND COLUMN_NAME = 'tenant_id';

-- 步骤5: 查看表结构
SHOW CREATE TABLE system_messages;

-- 步骤6: 统计现有数据
SELECT 
    COUNT(*) as total_messages,
    COUNT(tenant_id) as messages_with_tenant,
    COUNT(*) - COUNT(tenant_id) as messages_without_tenant
FROM system_messages;
```

## 验证清单

执行完成后，请确认以下各项：

- [ ] tenant_id字段已添加
- [ ] 字段类型为VARCHAR(36)
- [ ] 字段允许NULL
- [ ] 字段位置在target_user_id之后
- [ ] idx_tenant_id索引已创建
- [ ] 现有数据的tenant_id都是NULL
- [ ] 表结构正常，无错误

## 回滚方案

如果需要回滚（不推荐），执行以下SQL：

```sql
-- 删除索引
ALTER TABLE system_messages DROP INDEX idx_tenant_id;

-- 删除字段
ALTER TABLE system_messages DROP COLUMN tenant_id;
```

## 注意事项

### 1. 数据兼容性

- ✅ 现有数据不受影响，tenant_id自动设置为NULL
- ✅ 私有部署模式下，tenant_id保持NULL
- ✅ SaaS模式下，新数据会自动设置tenant_id
- ✅ 完全向后兼容，不影响现有功能

### 2. 性能影响

- ✅ 添加字段操作很快（< 1秒）
- ✅ 添加索引操作很快（< 1秒）
- ✅ 不需要锁表，不影响线上服务
- ✅ 查询性能不受影响（有索引）

### 3. 应用程序

- ✅ 后端代码已更新SystemMessage实体
- ✅ BaseRepository自动处理tenant_id
- ✅ 不需要修改现有业务代码
- ✅ 重启后端服务后生效

## 执行后操作

### 1. 重启后端服务

```bash
# 在服务器上执行
pm2 restart crm-backend
```

### 2. 验证功能

1. 登录系统
2. 创建一条系统消息
3. 检查数据库，确认tenant_id字段正常

### 3. 监控日志

```bash
# 查看后端日志
pm2 logs crm-backend --lines 100
```

## 常见问题

### Q1: 执行ALTER TABLE时报错"Duplicate column name"

**原因**: 字段已存在

**解决**: 先执行步骤3的检查SQL，确认字段是否已存在

### Q2: 添加索引时报错"Duplicate key name"

**原因**: 索引已存在

**解决**: 可以忽略，或先删除索引再添加

### Q3: 现有数据的tenant_id都是NULL，是否正常？

**答案**: 完全正常！

- 私有部署模式下，tenant_id应该保持NULL
- 只有SaaS模式下，新创建的数据才会有tenant_id
- 现有数据不需要迁移

### Q4: 是否需要为现有数据设置tenant_id？

**答案**: 不需要！

- 私有部署模式：tenant_id保持NULL
- SaaS模式：只有新数据需要tenant_id
- 现有数据保持NULL不影响功能

## 相关文件

### SQL脚本

- `backend/database-migrations/production-add-system-messages-tenant-id.sql`

### 实体文件

- `backend/src/entities/SystemMessage.ts`

### Schema文件

- `database/schema.sql` (已更新)

## 执行记录

请在执行后填写：

- **执行人**: ___________
- **执行时间**: ___________
- **执行结果**: [ ] 成功 [ ] 失败
- **验证结果**: [ ] 通过 [ ] 未通过
- **备注**: ___________

---

## 总结

这是一个安全的数据库变更：

✅ 不影响现有数据
✅ 不影响现有功能
✅ 完全向后兼容
✅ 执行速度快
✅ 不需要停机
✅ 可以随时回滚

执行完成后，系统将支持多租户数据隔离功能！
