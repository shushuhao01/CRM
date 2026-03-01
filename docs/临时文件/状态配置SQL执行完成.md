# 状态配置SQL执行完成说明

## 执行时间
2026-03-01

## 执行环境
- 本地开发环境：crm_local ✅ 已完成

## 执行内容

### 1. 本地数据库（crm_local）
已成功执行状态配置修复SQL，包括：

1. 删除了value为中文的旧配置
2. 插入了正确的英文value配置
3. 设置了正确的排序顺序

### 2. 执行结果验证

#### 有效状态配置
| type | value | label | sort_order |
|------|-------|-------|------------|
| validStatus | pending | 待处理 | 1 |
| validStatus | valid | 有效 | 2 |
| validStatus | invalid | 无效 | 3 |
| validStatus | supplemented | 已补单 | 4 |

#### 结算状态配置
| type | value | label | sort_order |
|------|-------|-------|------------|
| settlementStatus | unsettled | 未结算 | 1 |
| settlementStatus | settled | 已结算 | 2 |

## 生产环境执行指南

### 方式1：使用phpMyAdmin（推荐）

1. 登录宝塔面板
2. 进入phpMyAdmin
3. 选择数据库 `crm_production`
4. 点击"SQL"标签
5. 复制以下SQL并执行：

```sql
-- 1. 删除有效状态中value为中文的配置
DELETE FROM value_added_status_configs 
WHERE type = 'validStatus' 
AND value IN ('待处理', '有效', '无效', '已补单');

-- 2. 删除结算状态中value为中文的配置  
DELETE FROM value_added_status_configs 
WHERE type = 'settlementStatus' 
AND value IN ('待处理', '已结算', '未结算');

-- 3. 插入正确的状态配置（使用英文值和排序）
INSERT INTO value_added_status_configs (id, type, value, label, sort_order, created_at) VALUES
('vs-pending-001', 'validStatus', 'pending', '待处理', 1, NOW()),
('vs-valid-001', 'validStatus', 'valid', '有效', 2, NOW()),
('vs-invalid-001', 'validStatus', 'invalid', '无效', 3, NOW()),
('vs-supplemented-001', 'validStatus', 'supplemented', '已补单', 4, NOW()),
('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', 1, NOW()),
('ss-settled-001', 'settlementStatus', 'settled', '已结算', 2, NOW())
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  sort_order = VALUES(sort_order);

-- 4. 验证结果
SELECT '=== 有效状态配置 ===' as info;
SELECT type, value, label, sort_order FROM value_added_status_configs WHERE type = 'validStatus' ORDER BY sort_order;

SELECT '=== 结算状态配置 ===' as info;
SELECT type, value, label, sort_order FROM value_added_status_configs WHERE type = 'settlementStatus' ORDER BY sort_order;
```

### 方式2：使用SQL文件

执行文件：`backend/database-migrations/fix-status-configs-safe.sql`

## 相关文件

### SQL文件
- `backend/database-migrations/fix-status-configs-safe.sql` - 安全执行版本（推荐）
- `backend/database-migrations/production-fix-status-configs.sql` - 完整版本（包含ALTER TABLE）
- `backend/database-migrations/fix-status-config-values.sql` - 简化版本

### 执行脚本
- `backend/execute-status-config-fix.js` - Node.js执行脚本（已用于本地）

### Schema文件
- `backend/database-schema.sql` - 已更新，包含正确的状态配置

## 注意事项

1. **生产环境执行前备份**：虽然这个SQL很安全，但建议先备份数据库
2. **不影响现有数据**：只修改配置表，不影响订单数据
3. **ON DUPLICATE KEY UPDATE**：如果配置已存在，只更新label和sort_order
4. **sort_order字段**：如果生产环境表中没有此字段，需要先执行ALTER TABLE添加

## 验证方法

执行SQL后，在前端页面检查：
1. 增值管理页面的"有效状态"下拉框应显示：待处理、有效、无效、已补单
2. "结算状态"下拉框应显示：未结算、已结算
3. 顺序应该正确
4. 选择后能正常保存和显示

## 相关功能

此SQL修复是为了支持以下业务规则：
1. 结算状态"已结算"只能在有效状态为"有效"时选择
2. 未结算时实际结算金额显示0，已结算时显示单价
3. 单价映射：待分配=0，分配公司=公司默认单价

详见：`docs/临时文件/增值管理结算业务规则实现.md`
