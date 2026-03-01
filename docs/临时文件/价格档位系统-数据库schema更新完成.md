# 价格档位系统 - 数据库Schema更新完成

## 执行时间
2026-03-01

## 完成内容

### 1. 更新 database-schema.sql

#### 问题
- `outsource_companies` 表定义重复（2处）
- `value_added_price_config` 表定义重复（2处）
- 第一个 `outsource_companies` 表缺少 `is_default` 和 `sort_order` 字段
- 第一个 `outsource_companies` 表仍包含已删除的 `default_unit_price` 字段
- `value_added_price_config` 表使用旧的费用配置结构，未更新为新的档位系统结构
- 存在已废弃的默认费用配置INSERT语句

#### 修复内容

1. **删除重复的表定义**
   - 删除了第二个 `outsource_companies` 表定义（约577-605行）
   - 删除了第二个 `value_added_price_config` 表定义（约607-630行）
   - 删除了第二个 `value_added_orders` 表定义（约632-673行）

2. **更新 outsource_companies 表**
   ```sql
   -- 删除字段：default_unit_price
   -- 添加字段：is_default, sort_order
   -- 添加索引：idx_sort_order
   ```

3. **更新 value_added_price_config 表为价格档位系统**
   ```sql
   -- 新字段结构：
   - tier_name VARCHAR(100) -- 档位名称
   - tier_order INT -- 档位顺序
   - pricing_type VARCHAR(20) -- 计价方式: fixed/percentage
   - unit_price DECIMAL(10,2) -- 固定单价
   - percentage_rate DECIMAL(5,2) -- 比例
   - base_amount_field VARCHAR(50) -- 基数字段
   - is_active TINYINT -- 启用状态
   - priority INT -- 优先级
   - condition_rules TEXT -- 条件规则JSON
   
   -- 删除旧字段：
   - config_name
   - company_name
   - conditions
   - status
   ```

4. **删除废弃的INSERT语句**
   - 删除了默认费用配置的INSERT语句（default-config-001）

### 2. 更新 production-create-price-tier-system.sql

#### 修复内容
- 更新表名：`value_added_company_price_tiers` → `value_added_price_config`
- 更新字段名以匹配实际实现：
  - `percentage` → `percentage_rate`
  - `status` → `is_active`
  - `created_by_id` → `created_by`
- 更新字符集：`utf8mb4_unicode_ci` → `utf8mb4_0900_ai_ci`
- 删除外键约束（与实际实现保持一致）
- 更新数据迁移逻辑以匹配本地开发环境的实现
- 添加phpMyAdmin执行说明

### 3. 清理后端API代码

#### 删除的端点
```typescript
// 已删除的旧费用配置端点：
GET  /api/value-added/price-configs
POST /api/value-added/price-configs
PUT  /api/value-added/price-configs/:id
```

#### 更新的代码
1. **syncOrdersToValueAdded 函数**
   - 移除对 `defaultConfig.status` 的查询
   - 改为从公司的第一个启用档位获取默认价格
   - 移除对 `company.defaultUnitPrice` 的引用

2. **批量分配公司端点**
   - 移除对 `priceConfig.status` 的查询
   - 改为查询 `isActive = 1` 的价格档位
   - 移除对 `company.defaultUnitPrice` 的引用

3. **更新订单公司端点**
   - 移除对 `priceConfig.status` 的查询
   - 改为查询 `isActive = 1` 的价格档位
   - 移除对 `company.defaultUnitPrice` 的引用

4. **辅助函数**
   - 重命名 `calculateOrderPrice` → `_calculateOrderPrice`（标记为预留函数）

### 4. 诊断结果

所有文件通过TypeScript诊断检查：
- ✅ backend/src/routes/valueAdded.ts
- ✅ src/views/Finance/ValueAddedManage.vue
- ✅ src/views/Finance/components/CompanyPriceTiersDialog.vue
- ✅ src/views/Finance/components/PriceTierDialog.vue

## 数据库表结构对比

### 旧结构（已废弃）
```sql
CREATE TABLE value_added_price_config (
  id VARCHAR(50),
  config_name VARCHAR(100),      -- 配置名称
  company_id VARCHAR(50) NULL,   -- 可为空
  company_name VARCHAR(200),     -- 冗余字段
  unit_price DECIMAL(10,2),      -- 仅支持固定单价
  start_date DATE,
  end_date DATE,
  conditions JSON,               -- 复杂条件
  status VARCHAR(20),            -- active/inactive
  ...
);
```

### 新结构（价格档位系统）
```sql
CREATE TABLE value_added_price_config (
  id VARCHAR(50),
  company_id VARCHAR(50) NOT NULL, -- 必填
  tier_name VARCHAR(100),          -- 档位名称
  tier_order INT,                  -- 档位顺序
  pricing_type VARCHAR(20),        -- fixed/percentage
  unit_price DECIMAL(10,2),        -- 固定单价
  percentage_rate DECIMAL(5,2),    -- 比例
  base_amount_field VARCHAR(50),   -- 基数字段
  start_date DATE,
  end_date DATE,
  is_active TINYINT,               -- 1/0
  priority INT,                    -- 优先级
  condition_rules TEXT,            -- JSON规则
  ...
);
```

## 功能对比

### 旧系统
- ❌ 每个公司只能有一个单价
- ❌ 只支持固定单价
- ❌ 无法按时间段设置不同价格
- ❌ 无优先级机制

### 新系统
- ✅ 每个公司支持多个价格档位
- ✅ 支持固定单价和按比例计价
- ✅ 支持时间段生效
- ✅ 支持优先级排序
- ✅ 支持档位顺序管理
- ✅ 预留条件规则扩展

## 下一步工作

### 已完成
- [x] 更新 database-schema.sql
- [x] 更新生产环境迁移SQL
- [x] 清理后端旧API代码
- [x] 修复所有TypeScript错误
- [x] 前端组件已创建并集成

### 待测试
- [ ] 在浏览器中测试价格档位UI功能
- [ ] 测试档位CRUD操作
- [ ] 测试档位排序和优先级
- [ ] 测试时间段生效逻辑
- [ ] 测试按比例计价功能

### 待实现
- [ ] 实现订单同步时的自动价格计算逻辑
- [ ] 实现更改公司时的价格重新计算
- [ ] 创建价格档位匹配算法的单元测试
- [ ] 在生产环境执行迁移SQL

## 文件清单

### 已修改
- `backend/database-schema.sql` - 数据库主schema文件
- `backend/database-migrations/production-create-price-tier-system.sql` - 生产环境迁移
- `backend/src/routes/valueAdded.ts` - 后端API路由

### 已创建（之前）
- `src/views/Finance/components/CompanyPriceTiersDialog.vue` - 档位列表管理
- `src/views/Finance/components/PriceTierDialog.vue` - 档位添加/编辑表单
- `backend/database-migrations/create-price-tier-system.sql` - 本地开发迁移
- `backend/execute-price-tier-migration.js` - 迁移执行脚本

### 文档
- `docs/临时文件/外包公司价格档位系统设计.md` - 系统设计文档
- `docs/临时文件/价格档位系统实施完成.md` - 实施完成说明
- `docs/临时文件/价格档位系统-数据库schema更新完成.md` - 本文档

## 注意事项

1. **数据库迁移顺序**
   - 本地开发环境已执行迁移
   - 生产环境需要在测试通过后执行

2. **向后兼容性**
   - 旧的 `default_unit_price` 字段已在迁移中删除
   - 数据已迁移到新的档位表
   - 旧的API端点已删除

3. **测试重点**
   - 档位的时间段匹配逻辑
   - 多档位的优先级排序
   - 按比例计价的计算准确性
   - 待分配订单的价格为0

## 总结

价格档位系统的数据库schema更新已全部完成，所有代码通过诊断检查。系统已从简单的单一单价模式升级为支持多档位、多计价方式的灵活价格配置系统。下一步需要在浏览器中测试UI功能，确保所有CRUD操作正常工作。
