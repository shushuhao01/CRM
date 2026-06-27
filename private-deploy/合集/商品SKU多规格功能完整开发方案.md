# 商品SKU多规格功能完整开发方案

> 版本：v2.0（已确认版）  
> 日期：2026-06-27  
> 范围：商品管理、订单管理、物流管理、库存管理、企微侧边栏全链路SKU支持  
> 状态：待确认后开发  

---

## 一、现状分析

### 1.1 当前商品模型

系统当前采用 **SPU单规格模型**：一个商品 = 一条 `products` 记录 = 一个价格 + 一个库存。

| 现有字段 | 说明 | 用途 |
|----------|------|------|
| `code` | 商品编码 | 唯一标识，格式 `P{timestamp}` |
| `price` | 销售价格 | 单一价格 |
| `costPrice` | 成本价格 | 单一成本 |
| `stock` | 库存数量 | 单一库存 |
| `specification` | 规格描述 | 纯文本，如"500ml/红色" |
| `specifications` | JSON规格参数 | 实体有字段但CRUD未读写 |

### 1.2 SKU相关现有代码

| 位置 | 现状 | 问题 |
|------|------|------|
| `Product` 实体 | 无 `sku` 字段，无SKU子表 | 无多规格能力 |
| `OrderItem.productSku` | 有字段但仅企微侧边栏写入 | CRM主流程不写 |
| `OrderProductsCard.vue` | 显示 `row.sku \|\| row.id` | fallback到产品ID，无意义 |
| `Audit.vue` tooltip | 显示 `product.sku` | 数据中无sku字段，通常不显示 |
| 订单 `products` JSON | 无sku字段 | `{id, name, price, quantity}` |
| `order_items` 关系表 | CRM主流程不写入 | 仅企微侧边栏使用 |

### 1.3 数据流分析

```
当前流程（无SKU）：
商品表(products) → 前端选品(按product.id) → 订单JSON(products) → 展示(name×quantity)

目标流程（有SKU）：
商品表(products) + SKU表(product_skus) → 前端选品(先选商品再选SKU) 
  → 订单JSON(products含sku_id/sku详情) + order_items表(含productSku)【双写】
  → 展示(商品名+SKU规格名+数量+价格)
```

### 1.4 已确认的决策事项

| 序号 | 决策项 | 确认结果 |
|------|--------|----------|
| 1 | SKU适用范围 | **仅实物商品支持SKU**，虚拟商品不启用（避免复杂度过高） |
| 2 | 规格维度上限 | 默认3个维度，支持用户按需自行增加（不设硬上限） |
| 3 | `order_items` 双写 | **启用**，CRM主流程创建/编辑订单时同步写入 `order_items` 表，统一数据模型 |
| 4 | 商品列表分页 | **改造为后端分页**，告别前端全量加载。SKU相关弹窗列表默认10条/页，支持翻页 |
| 5 | 库存调整API | **对接后端正式API** `POST /products/stock/adjust`，废弃前端 `updateProduct` + localStorage 方式 |
| 6 | 企微侧边栏 | **同步改造**企微侧边栏快捷下单，支持有SKU商品的SKU选择 |

---

## 二、数据库设计

### 2.1 新增表：`product_skus`（商品SKU表）

```sql
CREATE TABLE `product_skus` (
  `id` VARCHAR(50) NOT NULL COMMENT 'SKU ID，格式：sku_{timestamp}_{random6}',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '所属商品ID',
  `sku_code` VARCHAR(50) NOT NULL COMMENT 'SKU编码，自动生成',
  `sku_name` VARCHAR(200) NOT NULL COMMENT 'SKU名称，由规格值自动拼接，如"红色/XL"',
  `sku_image` VARCHAR(500) DEFAULT NULL COMMENT 'SKU图片URL（白底图）',
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '销售价格',
  `cost_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '成本价格',
  `stock` INT NOT NULL DEFAULT 0 COMMENT '库存数量',
  `sales_count` INT NOT NULL DEFAULT 0 COMMENT '销量',
  `weight` DECIMAL(10,2) DEFAULT 0.00 COMMENT '重量(kg)，可覆盖商品重量',
  `barcode` VARCHAR(50) DEFAULT NULL COMMENT '条形码',
  `spec_values` JSON NOT NULL COMMENT '规格值JSON，如{"颜色":"红色","尺码":"XL"}',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT 'active-启用 / inactive-禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_sku_tenant_code` (`tenant_id`, `sku_code`),
  KEY `IDX_sku_product` (`product_id`),
  KEY `IDX_sku_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品SKU表';
```

### 2.2 新增表：`product_spec_groups`（商品规格组表）

```sql
CREATE TABLE `product_spec_groups` (
  `id` VARCHAR(50) NOT NULL COMMENT '规格组ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '所属商品ID',
  `spec_name` VARCHAR(50) NOT NULL COMMENT '规格名称，如"颜色"、"尺码"',
  `spec_values` JSON NOT NULL COMMENT '规格值列表，如["红色","蓝色","绿色"]',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_spec_product` (`product_id`),
  KEY `IDX_spec_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格组表';
```

### 2.3 修改表：`products`（商品主表）

新增字段：

```sql
ALTER TABLE `products`
  ADD COLUMN `sku_type` VARCHAR(10) DEFAULT 'none' COMMENT 'SKU类型: none-无SKU, single-单SKU, multi-多SKU' AFTER `specifications`,
  ADD COLUMN `min_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'SKU最低价（有SKU时自动计算）' AFTER `sku_type`,
  ADD COLUMN `max_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'SKU最高价（有SKU时自动计算）' AFTER `min_price`,
  ADD COLUMN `total_stock` INT DEFAULT NULL COMMENT 'SKU总库存（有SKU时自动计算）' AFTER `max_price`;
```

### 2.4 修改表：`order_items`

新增字段（兼容已有 `productSku` 字段）：

```sql
ALTER TABLE `order_items`
  ADD COLUMN `sku_id` VARCHAR(50) DEFAULT NULL COMMENT 'SKU ID' AFTER `product_sku`,
  ADD COLUMN `sku_name` VARCHAR(200) DEFAULT NULL COMMENT 'SKU规格名称快照' AFTER `sku_id`,
  ADD COLUMN `sku_image` VARCHAR(500) DEFAULT NULL COMMENT 'SKU图片快照' AFTER `sku_name`,
  ADD COLUMN `spec_values` JSON DEFAULT NULL COMMENT 'SKU规格值快照' AFTER `sku_image`;
```

### 2.5 数据库迁移文件

文件名：`backend/database-migrations/20260627-add-product-sku-tables.sql`

```sql
-- ==============================================
-- 迁移：商品SKU多规格功能
-- 适用：MySQL 5.7+ / MySQL 8.0+
-- 日期：2026-06-27
-- 说明：新增SKU表、规格组表，扩展商品表和订单项表
-- 注意：字段/表已存在会报 Duplicate column/Table exists，可忽略
-- ==============================================

-- 1. 新增商品规格组表
CREATE TABLE IF NOT EXISTS `product_spec_groups` (
  `id` VARCHAR(50) NOT NULL COMMENT '规格组ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '所属商品ID',
  `spec_name` VARCHAR(50) NOT NULL COMMENT '规格名称',
  `spec_values` JSON NOT NULL COMMENT '规格值列表',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_spec_product` (`product_id`),
  KEY `IDX_spec_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格组表';

-- 2. 新增商品SKU表
CREATE TABLE IF NOT EXISTS `product_skus` (
  `id` VARCHAR(50) NOT NULL COMMENT 'SKU ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '所属商品ID',
  `sku_code` VARCHAR(50) NOT NULL COMMENT 'SKU编码',
  `sku_name` VARCHAR(200) NOT NULL COMMENT 'SKU名称',
  `sku_image` VARCHAR(500) DEFAULT NULL COMMENT 'SKU图片URL',
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '销售价格',
  `cost_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '成本价格',
  `stock` INT NOT NULL DEFAULT 0 COMMENT '库存数量',
  `sales_count` INT NOT NULL DEFAULT 0 COMMENT '销量',
  `weight` DECIMAL(10,2) DEFAULT 0.00 COMMENT '重量(kg)',
  `barcode` VARCHAR(50) DEFAULT NULL COMMENT '条形码',
  `spec_values` JSON NOT NULL COMMENT '规格值JSON',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_sku_tenant_code` (`tenant_id`, `sku_code`),
  KEY `IDX_sku_product` (`product_id`),
  KEY `IDX_sku_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品SKU表';

-- 3. 扩展商品主表
ALTER TABLE `products`
  ADD COLUMN `sku_type` VARCHAR(10) DEFAULT 'none' COMMENT 'SKU类型: none/single/multi' AFTER `specifications`;

ALTER TABLE `products`
  ADD COLUMN `min_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'SKU最低价' AFTER `sku_type`;

ALTER TABLE `products`
  ADD COLUMN `max_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'SKU最高价' AFTER `min_price`;

ALTER TABLE `products`
  ADD COLUMN `total_stock` INT DEFAULT NULL COMMENT 'SKU总库存' AFTER `max_price`;

-- 4. 扩展订单项表
ALTER TABLE `order_items`
  ADD COLUMN `sku_id` VARCHAR(50) DEFAULT NULL COMMENT 'SKU ID' AFTER `product_sku`;

ALTER TABLE `order_items`
  ADD COLUMN `sku_name` VARCHAR(200) DEFAULT NULL COMMENT 'SKU规格名称快照' AFTER `sku_id`;

ALTER TABLE `order_items`
  ADD COLUMN `sku_image` VARCHAR(500) DEFAULT NULL COMMENT 'SKU图片快照' AFTER `sku_name`;

ALTER TABLE `order_items`
  ADD COLUMN `spec_values` JSON DEFAULT NULL COMMENT 'SKU规格值快照' AFTER `sku_image`;

-- 5. 新增库存调整记录表
CREATE TABLE IF NOT EXISTS `stock_adjustments` (
  `id` VARCHAR(50) NOT NULL COMMENT '调整记录ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '商品ID',
  `sku_id` VARCHAR(50) DEFAULT NULL COMMENT 'SKU ID',
  `sku_name` VARCHAR(200) DEFAULT NULL COMMENT 'SKU名称',
  `adjust_type` VARCHAR(20) NOT NULL COMMENT 'increase/decrease/set',
  `quantity` INT NOT NULL COMMENT '调整数量',
  `before_stock` INT NOT NULL COMMENT '调整前库存',
  `after_stock` INT NOT NULL COMMENT '调整后库存',
  `reason` VARCHAR(50) DEFAULT NULL COMMENT '调整原因',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `operator_id` VARCHAR(50) DEFAULT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_adj_product` (`product_id`),
  KEY `IDX_adj_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存调整记录表';
```

### 2.6 历史数据兼容

所有现有商品的 `sku_type` 默认为 `none`，`min_price`/`max_price`/`total_stock` 为 `NULL`。

读取逻辑兼容规则：
- 当 `sku_type = 'none'` 时，使用 `products.price` 和 `products.stock`（与当前行为完全一致）
- 当 `sku_type = 'single'` 或 `'multi'` 时，使用 `min_price`/`max_price` 显示价格区间，`total_stock` 显示总库存

---

## 三、后端实体设计

### 3.1 新增实体：`ProductSku.ts`

路径：`backend/src/entities/ProductSku.ts`

```typescript
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, 
         ManyToOne, JoinColumn } from 'typeorm'
import { Product } from './Product'

@Entity('product_skus')
export class ProductSku {
  @PrimaryColumn({ type: 'varchar', length: 50, comment: 'SKU ID' })
  id: string

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null

  @Column({ name: 'product_id', type: 'varchar', length: 50, comment: '所属商品ID' })
  productId: string

  @Column({ name: 'sku_code', type: 'varchar', length: 50, comment: 'SKU编码' })
  skuCode: string

  @Column({ name: 'sku_name', type: 'varchar', length: 200, comment: 'SKU名称' })
  skuName: string

  @Column({ name: 'sku_image', type: 'varchar', length: 500, nullable: true, comment: 'SKU图片' })
  skuImage: string | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '销售价格' })
  price: number

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '成本价格' })
  costPrice: number

  @Column({ type: 'int', default: 0, comment: '库存数量' })
  stock: number

  @Column({ name: 'sales_count', type: 'int', default: 0, comment: '销量' })
  salesCount: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '重量(kg)' })
  weight: number

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '条形码' })
  barcode: string | null

  @Column({ name: 'spec_values', type: 'json', comment: '规格值JSON' })
  specValues: Record<string, string>

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number

  @Column({ type: 'varchar', length: 20, default: 'active', comment: '状态' })
  status: 'active' | 'inactive'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product?: Product
}
```

### 3.2 新增实体：`ProductSpecGroup.ts`

路径：`backend/src/entities/ProductSpecGroup.ts`

```typescript
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn,
         ManyToOne, JoinColumn } from 'typeorm'
import { Product } from './Product'

@Entity('product_spec_groups')
export class ProductSpecGroup {
  @PrimaryColumn({ type: 'varchar', length: 50, comment: '规格组ID' })
  id: string

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null

  @Column({ name: 'product_id', type: 'varchar', length: 50, comment: '所属商品ID' })
  productId: string

  @Column({ name: 'spec_name', type: 'varchar', length: 50, comment: '规格名称' })
  specName: string

  @Column({ name: 'spec_values', type: 'json', comment: '规格值列表' })
  specValues: string[]

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product?: Product
}
```

### 3.3 修改实体：`Product.ts`

在 `specifications` 字段后新增：

```typescript
  @Column({ name: 'sku_type', type: 'varchar', length: 10, default: 'none', 
            comment: 'SKU类型: none-无SKU, single-单SKU, multi-多SKU' })
  skuType: 'none' | 'single' | 'multi'

  @Column({ name: 'min_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minPrice: number | null

  @Column({ name: 'max_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxPrice: number | null

  @Column({ name: 'total_stock', type: 'int', nullable: true })
  totalStock: number | null

  @OneToMany(() => ProductSku, sku => sku.product)
  skus?: ProductSku[]

  @OneToMany(() => ProductSpecGroup, specGroup => specGroup.product)
  specGroups?: ProductSpecGroup[]
```

### 3.4 修改实体：`OrderItem.ts`

新增SKU快照字段：

```typescript
  @Column({ name: 'sku_id', type: 'varchar', length: 50, nullable: true, comment: 'SKU ID' })
  skuId: string | null

  @Column({ name: 'sku_name', type: 'varchar', length: 200, nullable: true, comment: 'SKU名称快照' })
  skuName: string | null

  @Column({ name: 'sku_image', type: 'varchar', length: 500, nullable: true, comment: 'SKU图片快照' })
  skuImage: string | null

  @Column({ name: 'spec_values', type: 'json', nullable: true, comment: 'SKU规格值快照' })
  specValues: Record<string, string> | null
```

---

## 四、后端API设计

### 4.1 SKU CRUD API

在 `backend/src/routes/products.ts` 中新增路由组：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/products/:productId/skus` | 获取商品SKU列表（支持分页 `?page=1&pageSize=10`） |
| `POST` | `/api/v1/products/:productId/skus` | 批量保存SKU（含规格组） |
| `PUT` | `/api/v1/products/:productId/skus/:skuId` | 更新单个SKU |
| `DELETE` | `/api/v1/products/:productId/skus/:skuId` | 删除单个SKU |
| `PUT` | `/api/v1/products/:productId/skus/:skuId/status` | 更新SKU状态（上架/下架） |
| `PUT` | `/api/v1/products/:productId/skus/batch-status` | 批量更新SKU状态 |
| `GET` | `/api/v1/products/:productId/spec-groups` | 获取商品规格组 |
| `POST` | `/api/v1/products/stock/batch-adjust` | 批量库存调整（统一调整模式） |

### 4.2 批量保存SKU接口（核心）

**`POST /api/v1/products/:productId/skus`**

Request Body：

```json
{
  "skuType": "multi",
  "specGroups": [
    { "specName": "颜色", "specValues": ["红色", "蓝色", "绿色"] },
    { "specName": "尺码", "specValues": ["S", "M", "L", "XL"] }
  ],
  "skus": [
    {
      "id": null,
      "specValues": { "颜色": "红色", "尺码": "S" },
      "price": 99.00,
      "costPrice": 50.00,
      "stock": 100,
      "weight": 0.5,
      "skuImage": "https://...",
      "barcode": "",
      "status": "active"
    },
    {
      "id": null,
      "specValues": { "颜色": "红色", "尺码": "M" },
      "price": 109.00,
      "costPrice": 55.00,
      "stock": 80,
      "weight": 0.5,
      "skuImage": null,
      "barcode": "",
      "status": "active"
    }
  ]
}
```

后端处理逻辑：

1. 事务开启
2. 删除该商品旧的 `product_spec_groups` 和 `product_skus`
3. 批量插入新的规格组和SKU
4. 自动生成 `sku_code`（格式：`{productCode}-{序号}`，如 `P12345678-01`）
5. 自动拼接 `sku_name`（格式：规格值用"/"连接，如"红色/XL"）
6. 计算并更新 `products` 表的 `sku_type`、`min_price`、`max_price`、`total_stock`
7. 同步更新 `products.price` = `min_price`，`products.stock` = `total_stock`（保持向下兼容）
8. 事务提交

### 4.3 商品详情API扩展

**`GET /api/v1/products/:id`**

Response 新增字段：

```json
{
  "id": "prod_xxx",
  "name": "...",
  "skuType": "multi",
  "minPrice": 99.00,
  "maxPrice": 168.00,
  "totalStock": 580,
  "specGroups": [
    { "id": "sg_xxx", "specName": "颜色", "specValues": ["红色", "蓝色"], "sortOrder": 0 },
    { "id": "sg_xxx", "specName": "尺码", "specValues": ["S", "M", "L"], "sortOrder": 1 }
  ],
  "skus": [
    { "id": "sku_xxx", "skuCode": "P123-01", "skuName": "红色/S", "skuImage": "...",
      "price": 99.00, "costPrice": 50.00, "stock": 100, "salesCount": 20,
      "specValues": {"颜色":"红色","尺码":"S"}, "status": "active" },
    ...
  ],
  ...其他原有字段
}
```

### 4.4 商品列表API扩展

**`GET /api/v1/products`**

列表中每个商品增加字段：

```json
{
  "skuType": "none|single|multi",
  "minPrice": 99.00,
  "maxPrice": 168.00,
  "totalStock": 580,
  "skuCount": 12
}
```

### 4.5 SKU分页查询

**`GET /api/v1/products/:productId/skus`**

Query 参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 10 | 每页条数 |
| `status` | string | - | 可选筛选，`active`/`inactive` |

Response：

```json
{
  "list": [
    { "id": "sku_xxx", "skuCode": "P123-01", "skuName": "红色/S", ... }
  ],
  "total": 24,
  "page": 1,
  "pageSize": 10
}
```

### 4.6 库存调整API改造

**`POST /api/v1/products/stock/adjust`**（正式化）

```json
{
  "productId": "prod_xxx",
  "skuId": "sku_xxx",       // 可选，有值则调整指定SKU库存
  "type": "increase",
  "quantity": 10,
  "reason": "采购入库",
  "remark": "补充库存"
}
```

后端逻辑：
- 有 `skuId`：更新 `product_skus.stock`，然后重新计算 `products.total_stock` 和 `products.stock`
- 无 `skuId`：行为不变，直接更新 `products.stock`
- 每次调整写入 `stock_adjustments` 表（记录调整前后库存、操作人等）

**`POST /api/v1/products/stock/batch-adjust`**（新增，统一调整模式）

```json
{
  "productId": "prod_xxx",
  "skuIds": ["sku_001", "sku_002", "sku_003"],
  "type": "increase",
  "quantity": 10,
  "reason": "采购入库",
  "remark": "统一补货"
}
```

后端逻辑：对每个SKU执行相同的调整操作，事务内批量处理，每个SKU生成独立的 `stock_adjustments` 记录。

**`GET /api/v1/products/stock/adjustments`**（改造，返回真实记录）

Query 参数：`productId`（必填）、`skuId`（可选）、`page`、`pageSize`

Response：返回 `stock_adjustments` 表的分页数据，替代当前的空列表。

### 4.7 订单创建API扩展

**`POST /api/v1/orders`**

订单 `products` JSON 中的每个商品项增加 SKU 信息：

```json
{
  "products": [
    {
      "id": "prod_xxx",
      "name": "测试商品",
      "code": "P12345678",
      "price": 99.00,
      "quantity": 2,
      "total": 198.00,
      "skuId": "sku_xxx",
      "skuCode": "P12345678-01",
      "skuName": "红色/S",
      "skuImage": "https://...",
      "specValues": {"颜色":"红色","尺码":"S"}
    },
    {
      "id": "prod_xxx",
      "name": "测试商品",
      "code": "P12345678",
      "price": 168.00,
      "quantity": 1,
      "total": 168.00,
      "skuId": "sku_yyy",
      "skuCode": "P12345678-05",
      "skuName": "蓝色/XL",
      "skuImage": null,
      "specValues": {"颜色":"蓝色","尺码":"XL"}
    }
  ]
}
```

后端库存扣减逻辑变更：
- 有 `skuId` 的商品项：扣减 `product_skus.stock`，然后同步 `products.total_stock` 和 `products.stock`
- 无 `skuId` 的商品项：行为不变，直接扣减 `products.stock`

同时写入 `order_items` 表（CRM主流程启用双写，统一数据模型，企微侧边栏同步适配）。

### 4.8 导出API扩展

`GET /api/v1/products/export` 增加 SKU 信息导出。

订单导出在前端 `utils/export.ts` 中修改商品字段格式化逻辑。

---

## 五、前端改造方案

### 5.1 需求1 — 新增商品表单「价格库存」区域增加SKU设置

**文件：** `src/views/Product/Edit.vue`

#### 5.1.1 表单数据模型扩展

在 `productForm` 中新增：

```typescript
const productForm = reactive({
  ...现有字段,
  // SKU 相关
  skuType: 'none' as 'none' | 'single' | 'multi',
  specGroups: [] as Array<{
    id: string
    specName: string
    specValues: string[]
    sortOrder: number
  }>,
  skus: [] as Array<{
    id: string | null
    specValues: Record<string, string>
    skuImage: string | null
    price: number
    costPrice: number
    stock: number
    weight: number
    barcode: string
    status: 'active' | 'inactive'
  }>
})
```

#### 5.1.2 UI结构变更

在「价格库存」区域（仅 `productType === 'physical'` 实物商品时显示SKU TAB）：

```
┌──────────────────────────────────────────────────────┐
│ 价格库存                                              │
│                                                      │
│  [el-tabs] ┌──────┐ ┌──────┐                        │
│            │ 无SKU │ │ 设SKU │  ← 互斥二选一TAB      │
│            └──────┘ └──────┘                        │
│                                                      │
│  ──── 当 skuType = 'none' ────                      │
│  保持当前的价格库存表单不变：                          │
│  销售价格 | 成本价格 | 市场价格                       │
│  当前库存 | 最低库存 | 最高库存                       │
│  利润率提示                                          │
│                                                      │
│  ──── 当 skuType = 'single' 或 'multi' ────          │
│                                                      │
│  ▶ 规格设置                                          │
│  ┌──────────────────────────────────────────┐        │
│  │ 规格名 [颜色  ] 规格值 [红色][蓝色][+添加] │        │
│  │ 规格名 [尺码  ] 规格值 [S][M][L][XL][+]   │        │
│  │               [+ 添加规格]                │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  ▶ SKU明细表格                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ SKU图片 | 颜色 | 尺码 | 价格 | 成本 | 库存 | 重量│  │
│  │ [上传]  | 红色 | S   | 99   | 50  | 100 | 0.5 │  │
│  │ [上传]  | 红色 | M   | 109  | 55  | 80  | 0.5 │  │
│  │ ...     | ...  | ... | ...  | ... | ... | ... │  │
│  └────────────────────────────────────────────────┘  │
│  [批量设价格] [批量设库存]                             │
│  汇总：共 N 个SKU | 价格区间 ¥99-168 | 总库存 580     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 5.1.3 交互逻辑

1. **切换TAB**：从「无SKU」切换到「设SKU」时，保留当前价格作为默认SKU价格。从「设SKU」切换到「无SKU」时，弹确认提示"切换后将清除已设置的SKU数据"。

2. **添加规格**：默认支持3个规格维度（参考淘宝），允许用户按需自行增加（不设硬上限），每个规格最多20个值。

3. **自动生成SKU矩阵**：当规格组值变化时，自动计算笛卡尔积生成SKU行。已有的SKU行保留其价格/库存数据，新增行继承默认值。

4. **SKU图片上传**：每个SKU可单独上传一张白底图。上传逻辑复用现有的 `uploadService`。

5. **批量操作**：
   - 批量设价格：弹窗输入价格，应用到所有选中SKU
   - 批量设库存：弹窗输入库存，应用到所有选中SKU

6. **保存流程**：
   - `skuType = 'none'`：按原有逻辑保存，调用 `productApi.create/update`
   - `skuType = 'single'` 或 `'multi'`：先保存商品基础信息，再调用 `POST /products/:id/skus` 批量保存SKU

7. **编辑模式加载**：加载商品详情时，如果 `skuType !== 'none'`，同时加载规格组和SKU数据填充表单。

8. **编辑模式删除SKU**：在SKU明细表格中，每行支持「删除」操作，可删除指定SKU。删除后自动重新计算汇总数据（minPrice/maxPrice/totalStock）。删除后至少保留1个SKU，否则提示切换回「无SKU」模式。

#### 5.1.4 校验规则

- `skuType = 'single'` 时至少1个规格组，1个SKU
- `skuType = 'multi'` 时至少1个规格组，2个及以上SKU
- 每个启用状态的SKU的价格必须 > 0
- 每个启用状态的SKU的库存必须 >= 0

---

### 5.2 需求2 — 商品详情页价格库存区域

**文件：** `src/views/Product/Detail.vue`

#### 变更逻辑

在「价格库存」卡片区域：

```
当 skuType = 'none'：
  保持当前样式不变（销售价、成本价、市场价、当前库存、预警值）

当 skuType = 'single' 或 'multi'：
  ┌─────────────────────────────────────────────────────┐
  │  价格区间：¥99.00 - ¥168.00                          │
  │  总库存：580 件 | 总销量：120                         │
  │  成本区间：¥50.00 - ¥80.00                           │
  │                                                     │
  │  SKU明细表格                                         │
  │  ┌──────────────────────────────────────────────────┐│
  │  │ 图片 | SKU名称   | 价格   | 成本   | 库存 | 销量 ││
  │  │ [img]| 红色/S    | ¥99    | ¥50   | 100 | 20   ││
  │  │ [img]| 红色/M    | ¥109   | ¥55   | 80  | 15   ││
  │  │ ...  | ...       | ...    | ...   | ... | ...  ││
  │  └──────────────────────────────────────────────────┘│
  └─────────────────────────────────────────────────────┘
```

#### 数据加载

详情页目前从 `productStore.getProductById()` 读取数据。需要在 Store 的 `Product` 接口中增加 SKU 相关字段。当 `skuType !== 'none'` 时，额外调用 `GET /api/v1/products/:id/skus` 获取SKU列表。

---

### 5.3 需求3 — 商品列表价格和库存列

**文件：** `src/views/Product/List.vue`

#### 价格列变更

```
// 价格列插槽
当 row.skuType === 'none' 或无SKU：
  ¥{{ row.price }}   ← 当前样式不变

当 row.skuType === 'single' 或 'multi'：
  ¥{{ row.minPrice }} - ¥{{ row.maxPrice }}
  如果 minPrice === maxPrice 则只显示 ¥{{ row.minPrice }}
```

#### 库存列变更

```
当 row.skuType === 'none'：
  {{ row.stock }}    ← 当前样式不变

当 row.skuType === 'single' 或 'multi'：
  {{ row.totalStock }}  ← 总库存（已由后端计算存储到 total_stock 或 stock 字段）
```

---

### 5.4 需求4（新增）— 商品上下架与SKU级别控制

**文件：** `src/views/Product/List.vue`

#### 5.4.1 无SKU商品

保持当前上架/下架行为不变。

#### 5.4.2 有SKU商品 — 单个操作

点击行操作「下架」按钮时，弹出选择对话框：

```
┌──────────────────────────────────────────────────────────┐
│ 下架商品                                           [×]   │
│                                                          │
│  商品：测试商品                                           │
│  当前状态：上架中 | SKU数量：6个                           │
│                                                          │
│  请选择下架方式：                                         │
│                                                          │
│  ○ 整个商品下架                                          │
│    ⓘ 该商品及其所有SKU将从新增订单中隐藏                   │
│                                                          │
│  ○ 指定SKU下架                                           │
│    ┌──────────────────────────────────────────────────┐  │
│    │ ☑ | SKU名称   | 价格    | 库存  | 当前状态        │  │
│    │ □ | 红色/S     | ¥99    | 100  | 上架 ✓         │  │
│    │ ☑ | 红色/M     | ¥109   | 80   | 上架 → 下架    │  │
│    │ □ | 蓝色/S     | ¥99    | 60   | 上架 ✓         │  │
│    │ ☑ | 蓝色/XL    | ¥168   | 45   | 上架 → 下架    │  │
│    └──────────────────────────────────────────────────┘  │
│    已选择下架 2 个SKU                                    │
│                                                          │
│                          [取消]  [确定下架]               │
└──────────────────────────────────────────────────────────┘
```

上架操作同理，支持选择「整个商品上架」或「指定已下架的SKU上架」。

#### 5.4.3 有SKU商品 — 批量操作

批量上架/下架时，如果选中的商品中包含有SKU的商品：

- 弹出提示对话框，告知有N个商品包含SKU
- 提供两个选项：
  - **整体操作**：所有选中商品及其全部SKU统一上/下架
  - **逐个处理**：仅对无SKU商品执行操作，有SKU商品跳过并提示用户单独处理

#### 5.4.4 下架/删除生效规则

- **整个商品下架**：`products.status` 设为 `inactive`，新增订单选品时不显示该商品
- **指定SKU下架**：`product_skus.status` 设为 `inactive`，新增订单选品时该商品仍然可见，但SKU选择对话框中已下架的SKU不可选，标记为灰色「已下架」
- **删除SKU**：编辑商品时可删除SKU，被删除的SKU在新增订单中不可见。已产生的历史订单不受影响（订单中保存的是SKU快照）

#### 5.4.5 后端API

| 方法 | 路径 | 说明 |
|------|------|------|
| `PUT` | `/api/v1/products/:productId/skus/:skuId/status` | 更新单个SKU状态（active/inactive） |
| `PUT` | `/api/v1/products/:productId/skus/batch-status` | 批量更新SKU状态 |

Request Body（批量）：

```json
{
  "skuIds": ["sku_001", "sku_002"],
  "status": "inactive"
}
```

后端处理：更新 SKU 状态后，重新计算 `products` 表的 `min_price`/`max_price`/`total_stock`（仅统计 `active` 状态的 SKU）。

---

### 5.5 需求5（新增）— 商品列表库存列点击弹窗SKU明细

**文件：** `src/views/Product/List.vue`

#### 5.5.1 交互规则

- **无SKU商品**：点击库存数字无反应（保持当前行为）
- **有SKU商品**：库存数字显示为可点击样式（蓝色+下划线+鼠标手型），点击弹出SKU库存明细对话框

#### 5.5.2 SKU库存明细对话框

```
┌──────────────────────────────────────────────────────────────┐
│ SKU库存明细                                            [×]   │
│                                                              │
│  ┌────────┐                                                  │
│  │ 商品图片│  商品名称                                        │
│  │        │  编码：P12345678 | 类型：实物商品                  │
│  └────────┘  总库存：580件 | 总销量：120                      │
│              价格区间：¥99.00 - ¥168.00                       │
│                                                              │
│  SKU列表                                         共6条 10条/页│
│  ┌────────────────────────────────────────────────────────┐  │
│  │     | SKU图片 | SKU名称  | 规格        | 价格   | 成本  │  │
│  │     |         |          |             |        |       │  │
│  │  1  | [img]   | 红色/S   | 颜色:红色   | ¥99    | ¥50  │  │
│  │     |         |          | 尺码:S      |        |       │  │
│  │     |         |          |             |        |       │  │
│  │     | 库存    | 销量     | 状态        |                │  │
│  │     | 100     | 20       | 上架 ✓      |                │  │
│  │─────|─────────|──────────|─────────────|────────|───────│  │
│  │  2  | [img]   | 红色/M   | 颜色:红色   | ¥109   | ¥55  │  │
│  │     |         |          | 尺码:M      |        |       │  │
│  │     | 80      | 15       | 上架 ✓      |                │  │
│  │─────|─────────|──────────|─────────────|────────|───────│  │
│  │  3  |         | 蓝色/XL  | 颜色:蓝色   | ¥168   | ¥80  │  │
│  │     |         |          | 尺码:XL     |        |       │  │
│  │     | 45      | 8        | 上架 ✓      |                │  │
│  │─────|─────────|──────────|─────────────|────────|───────│  │
│  │ ... |         |          |             |        |       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  < 1 / 1 >                                    10条/页 ▼      │
│                                                              │
│                              [关闭]                          │
└──────────────────────────────────────────────────────────────┘
```

#### 5.5.3 UI风格要求

- 字体统一使用系统全局字体（`font-family` 继承全局样式，`14px` 正文，`13px` 辅助信息）
- 颜色与系统一致：主色 `#409EFF`、文字 `#303133`、辅助文字 `#909399`、边框 `#EBEEF5`
- 对话框宽度 `720px`，圆角 `8px`，内间距 `24px`
- SKU表格使用 `el-table`，行高适中（`padding: 12px 0`），隔行变色
- 状态标签用 `el-tag`：上架=`success`，下架=`info`
- 默认每页显示10条SKU，底部分页器使用 `el-pagination`（`small` 模式）
- 无数据时显示 `el-empty` 空状态组件

#### 5.5.4 数据加载

点击弹窗时调用 `GET /api/v1/products/:productId/skus?page=1&pageSize=10` 分页加载SKU列表。

---

### 5.6 需求6 — 库存管理页面的库存调整

**文件：** `src/views/Product/Stock.vue` 和 `src/views/Product/List.vue`

#### 无SKU商品

保持当前库存调整对话框不变。**提交走后端正式API `POST /products/stock/adjust`**，废弃前端 `updateProduct` + localStorage 方式。

#### 有SKU商品的库存调整对话框

```
┌──────────────────────────────────────────────────────┐
│ 库存调整                                     [×]     │
│                                                      │
│ 商品信息  [图片] 商品名称                              │
│          编码：P12345678                              │
│          SKU数量：12个 | 总库存：580件                 │
│                                                      │
│ 调整模式  ○ 统一调整（所有SKU统一操作）                │
│          ○ 逐个调整（每个SKU单独设置）  ← 默认         │
│                                                      │
│ ──── 统一调整模式 ────                               │
│ 调整类型  (○增加  ○减少  ○设置为)                     │
│ 调整数量  [    0    ]                                │
│ 调整原因  [请选择调整原因 ▼]                          │
│ 备  注   [                    ]                      │
│ ⓘ 所有启用状态的SKU将统一执行此操作                    │
│                                                      │
│ ──── 逐个调整模式 ────                               │
│ ┌──────────────────────────────────────────────────┐ │
│ │ SKU名称  | 当前库存 | 调整类型 | 调整量 | 调整后  │ │
│ │ 红色/S   | 100     | 增加 ▼  | [10]  | 110    │ │
│ │ 红色/M   | 80      | 减少 ▼  | [5]   | 75     │ │
│ │ 蓝色/S   | 60      | 设为 ▼  | [100] | 100    │ │
│ │ ...                                             │ │
│ └──────────────────────────────────────────────────┘ │
│ 调整原因  [请选择调整原因 ▼]                          │
│ 备  注   [                    ]                      │
│ 调整后总库存：595件（当前：580件）                     │
│                                                      │
│                    [取消]  [确定调整]                  │
└──────────────────────────────────────────────────────┘
```

#### 提交逻辑

所有库存调整统一走后端正式API `POST /api/v1/products/stock/adjust`，废弃前端 `updateProduct` + localStorage 方式：

- **无SKU商品**：调用 `POST /products/stock/adjust`（不含 `skuId`）
- **统一调整**：调用 `POST /products/stock/batch-adjust`（新增批量接口，含 `skuIds` 数组）
- **逐个调整**：对每个有变更的SKU调用 `POST /products/stock/adjust`（含 `skuId`）
- 后端在同一事务中更新 SKU 库存并重新计算 `products.total_stock` / `products.stock`
- 后端新增 `stock_adjustments` 表记录调整历史，替代 localStorage
- 提交完成后刷新商品数据

---

### 5.7 需求7 — 订单详情页商品清单区域

**文件：** `src/views/Order/Detail/OrderProductsCard.vue`

#### 变更逻辑

```
当前显示：
  商品名称 | 单价 | 数量 | 小计
  SKU: {{ row.sku || row.id }}  ← 需要修复

修复后显示：

无SKU商品：
  [实物] 商品名称                    ¥99.00    2    ¥198.00
  编码：P12345678

有SKU商品：
  [实物] 商品名称                    ¥99.00    1    ¥99.00
  SKU：红色/S
  [SKU缩略图]

  [实物] 商品名称                    ¥168.00   1    ¥168.00
  SKU：蓝色/XL
  [SKU缩略图]
```

#### 数据来源

订单 `products` JSON 中现在每项包含 `skuId`、`skuName`、`skuCode`、`skuImage`、`specValues`。

```
// 判断逻辑
if (row.skuId && row.skuName) {
  显示 SKU 名称和图片
} else if (row.code) {
  显示商品编码
} else {
  不显示 SKU 行
}
```

#### 同一商品多SKU的展示

一个订单中同一商品可能选择了多个SKU，在 products JSON 中表现为多条记录（同 `id`/`productId`，不同 `skuId`）。每条记录独立显示为一行。

---

### 5.8 需求8 — 新增/编辑订单的产品选择区域

**文件：** `src/views/Order/Add.vue`、`src/views/Order/Edit.vue`

#### 5.8.1 商品卡片展示变更

```
当前：
  商品名称
  ¥99.00         库存: 100

有SKU商品变更为：
  商品名称
  ¥99.00 - ¥168.00   库存: 580
```

#### 5.8.2 选品交互变更

**无SKU商品：** 点击商品卡片 → 直接添加到已选列表（行为不变）

**有SKU商品：** 点击商品卡片 → 弹出SKU选择对话框

#### 5.8.3 SKU选择对话框

```
┌──────────────────────────────────────────────────────────┐
│ 选择商品规格                                       [×]   │
│                                                          │
│  ┌─────────┐                                             │
│  │ 商品图片 │  商品名称                                    │
│  │         │  编码：P12345678                              │
│  └─────────┘                                             │
│                                                          │
│  SKU列表                                     共12条 10条/页│
│  ┌────────────────────────────────────────────────────┐   │
│  │ □ | 图片 | SKU名称  | 规格      | 价格   | 库存 | 数量│   │
│  │ ☑ | [img]| 红色/S   | 颜色:红色  | ¥99   | 100 | [-][2][+] │
│  │ ☑ | [img]| 红色/M   | 颜色:红色  | ¥109  | 80  | [-][1][+] │
│  │ □ |      | 蓝色/S   | 颜色:蓝色  | ¥99   | 60  |     │   │
│  │ ☑ | [img]| 蓝色/XL  | 颜色:蓝色  | ¥168  | 45  | [-][1][+] │
│  │ ...                                                │   │
│  └────────────────────────────────────────────────────┘   │
│  < 1 / 2 >                                  10条/页 ▼    │
│                                                          │
│  已选：3个SKU（跨页选择已记忆）                            │
│  小计：¥99×2 + ¥109×1 + ¥168×1 = ¥475.00                │
│                                                          │
│                         [取消]  [确定]                    │
└──────────────────────────────────────────────────────────┘
```

**分页规则**：默认每页10条SKU，底部分页器翻页加载。跨页选择状态需记忆（切换页码不丢失已选SKU和数量）。

**已下架SKU过滤**：仅显示 `status = 'active'` 的SKU，已下架的不可选。

#### 5.8.4 确定后的已选商品展示

点击「确定」后，在已选商品表格中：

```
┌───────────────────────────────────────────────────────────┐
│ 商品名称          | 单价    | 数量 | 小计    | 操作       │
│ 测试商品          |         |      |         |           │
│   └ SKU: 红色/S   | ¥99.00  | 2    | ¥198.00 | [编辑][删] │
│   └ SKU: 红色/M   | ¥109.00 | 1    | ¥109.00 | [编辑][删] │
│   └ SKU: 蓝色/XL  | ¥168.00 | 1    | ¥168.00 | [编辑][删] │
│ 奥利奥饼           | ¥401.00 | 1    | ¥401.00 | [删]      │
└───────────────────────────────────────────────────────────┘
```

每个SKU作为独立行存在于 `orderForm.products` 中。

#### 5.8.5 编辑按钮

仅有SKU的商品行显示「编辑」按钮。点击后重新打开SKU选择对话框，回填已选的SKU和数量，支持增减数量或取消选择某个SKU。

#### 5.8.6 保存数据结构

```typescript
// orderForm.products 中的每一项
{
  id: 'prod_xxx',           // 商品ID（多个SKU行共享同一商品ID）
  name: '测试商品',
  code: 'P12345678',
  price: 99.00,             // 该SKU的价格
  originalPrice: 99.00,
  quantity: 2,
  total: 198.00,
  productType: 'physical',
  image: '...',
  // SKU 新增字段
  skuId: 'sku_xxx',
  skuCode: 'P12345678-01',
  skuName: '红色/S',
  skuImage: '...',
  specValues: { "颜色": "红色", "尺码": "S" }
}
```

---

### 5.9 需求9 — 订单确认页面显示SKU信息

**文件：** `src/views/Order/Detail.vue`（保存后跳转到订单详情）

订单保存成功后，前端跳转到 `/order/detail/:id`。详情页的「商品清单」区域已在需求7中改造。此处无需额外修改，需求7已覆盖。

同时检查保存成功后的提示弹窗（如果有的话），确保也显示SKU信息。

---

### 5.10 需求10 — 商品列表悬浮提示器显示SKU + 导出SKU

**文件：** `src/views/Product/List.vue`、`src/utils/export.ts`

#### 5.10.1 商品列表悬浮提示

在商品名称列或商品字段列添加 `el-tooltip`：

```
当 row.skuType !== 'none' 且 row.skus?.length > 0：
  鼠标悬浮弹出提示：
  ┌─────────────────────────────────┐
  │ SKU信息                         │
  │ ─────────────────────           │
  │ 红色/S  库存:100  ¥99.00        │
  │ 红色/M  库存:80   ¥109.00       │
  │ 蓝色/S  库存:60   ¥99.00        │
  │ 蓝色/XL 库存:45   ¥168.00       │
  │ ─────────────────────           │
  │ 共4个SKU | 总库存:285            │
  └─────────────────────────────────┘
```

#### 5.10.2 数据支撑

商品列表API需要在每个商品项中返回精简的SKU列表（`skuName`、`stock`、`price`）。

考虑到列表性能，可选方案：
- **方案A**：列表API直接返回SKU简要信息（推荐，减少额外请求）
- **方案B**：悬浮时懒加载调用 `GET /products/:id/skus`（延迟感明显）

推荐方案A，在 `getProducts` 接口的返回中增加 `skuSummary` 字段。

#### 5.10.3 批量导出订单增加SKU

在 `src/utils/export.ts` 的 `exportOrdersToExcel` 中，修改商品字段格式化：

```typescript
// 当前
products: order.products.map(p => `${p.name} x${p.quantity}`).join(', ')

// 改为
products: order.products.map(p => {
  let text = p.name
  if (p.skuName) text += `[${p.skuName}]`
  text += ` x${p.quantity}`
  if (p.price) text += ` ¥${p.price}`
  return text
}).join(', ')
```

---

### 5.11 需求11 — 订单审核页面产品字段列SKU悬浮提示

**文件：** `src/views/Order/Audit.vue`

#### 变更区域

1. **产品列单元格**：在产品标签旁显示SKU标识
2. **Tooltip提示内容**：

```
当前：
  1. 商品名
     SKU: {{ product.sku }}  ← 通常不显示
     数量: 2
     单价: ¥99.00

改为：
  1. 商品名
     SKU: 红色/S              ← 来自 product.skuName
     数量: 2
     单价: ¥99.00

  2. 商品名
     SKU: 蓝色/XL
     数量: 1
     单价: ¥168.00
```

修改 Tooltip 模板中的 SKU 显示逻辑：

```html
<!-- 修改前 -->
<span v-if="product.sku">SKU: {{ product.sku }}</span>

<!-- 修改后 -->
<span v-if="product.skuName">SKU: {{ product.skuName }}</span>
<span v-else-if="product.skuCode">SKU: {{ product.skuCode }}</span>
```

---

### 5.12 需求12 — 物流管理发货列表SKU支持

**文件：** `src/views/Logistics/Shipping.vue`、`src/views/Logistics/components/ShippingDialog.vue`、`src/views/Logistics/components/OrderDetailDialog.vue`、`src/utils/export.ts`

#### 5.12.1 发货列表商品字段悬浮提示

修改 `#column-productsText` 插槽：

```html
<template #column-productsText="{ row }">
  <el-tooltip placement="top" :disabled="!hasSkuProducts(row)">
    <template #content>
      <div v-for="(p, i) in row.products" :key="i" class="sku-tooltip-item">
        <div>{{ p.name }}</div>
        <div v-if="p.skuName">SKU: {{ p.skuName }} | 数量: {{ p.quantity }} | ¥{{ p.price }}</div>
        <div v-else>数量: {{ p.quantity }} | ¥{{ p.price }}</div>
      </div>
    </template>
    <!-- 单元格内容保持原样但增加SKU标识 -->
    <div v-if="Array.isArray(row.products) && row.products.length > 0">
      <div v-for="(p, i) in row.products" :key="i" style="...">
        <el-tag ...>{{ p.productType === 'virtual' ? '虚拟' : '实物' }}</el-tag>
        <span>{{ p.name }}{{ p.skuName ? `(${p.skuName})` : '' }} x{{ p.quantity }}</span>
      </div>
    </div>
  </el-tooltip>
</template>
```

#### 5.12.2 发货详情对话框（OrderDetailDialog.vue）

在商品信息区域，增加SKU展示：

```
商品信息：
  测试商品 [红色/S] × 2
  测试商品 [蓝色/XL] × 1
  奥利奥饼 × 1
```

#### 5.12.3 单条发货对话框（ShippingDialog.vue）

商品摘要区域增加SKU：

```typescript
// 修改 getProductsText()
const getProductsText = () => {
  if (!props.order?.products || !Array.isArray(props.order.products)) return ''
  return props.order.products.map(p => {
    let text = p.name
    if (p.skuName) text += `(${p.skuName})`
    text += ` × ${p.quantity}`
    return text
  }).join('，')
}
```

#### 5.12.4 批量导出增加SKU

同需求10.3，在 `exportOrdersToExcel` 中统一修改商品字段格式化。

---

### 5.13 需求13 — 订单审核弹窗补全商品字段

**文件：** `src/views/Order/Audit.vue`

#### 变更区域

在「订单详情审核弹窗」（`orderDetailDialogVisible`）的订单基本信息区域中：

```
当前显示字段：
  订单号、订单金额、定金金额、尾付金额、支付方式、客户姓名、
  联系电话、收货地址、销售人员、产品数量（仅显示N件）、创建时间、订单备注

缺失：商品明细字段

补全后增加：
  商品信息：
    1. 测试商品 [红色/S] × 2  ¥99.00
    2. 测试商品 [蓝色/XL] × 1  ¥168.00
    3. 奥利奥饼 × 1  ¥401.00
```

实现方式：

```html
<!-- 在审核弹窗的 el-descriptions 中增加商品信息字段 -->
<el-descriptions-item label="商品信息" :span="2">
  <div v-for="(p, i) in currentAuditOrder.products" :key="i" class="audit-product-item">
    <span>{{ i + 1 }}. {{ p.name }}</span>
    <el-tag v-if="p.skuName" size="small" type="info" style="margin: 0 4px;">
      {{ p.skuName }}
    </el-tag>
    <span>× {{ p.quantity }}</span>
    <span style="margin-left: 8px;">¥{{ (p.price || 0).toFixed(2) }}</span>
  </div>
</el-descriptions-item>
```

---

### 5.14 需求14（新增）— 企微侧边栏快捷下单SKU支持

**文件：** `src/views/WecomSidebar/SidebarQuickOrder.vue`、`backend/src/routes/wecom/sidebar.ts`

#### 5.14.1 现状

企微侧边栏快捷下单页面通过 `SidebarQuickOrder.vue` 实现，搜索商品后直接选择添加，不支持SKU选择。后端 `sidebar.ts` 中创建订单时使用 `p.sku || ''` 映射 `productSku` 字段。

#### 5.14.2 前端改造

1. **商品展示**：有SKU商品在搜索结果中显示价格区间和「多规格」标识
2. **选品交互**：
   - 无SKU商品：点击直接添加（行为不变）
   - 有SKU商品：点击弹出精简版SKU选择面板（适配侧边栏窄宽度）
3. **精简SKU选择面板**（侧边栏适配）：

```
┌──────────────────────────────┐
│ 选择规格                [×]  │
│                              │
│ 商品名称                     │
│ ¥99 - ¥168                   │
│                              │
│ ┌──────────────────────────┐ │
│ │ 红色/S   ¥99   库存:100  │ │
│ │         [-] [1] [+]      │ │
│ │ 红色/M   ¥109  库存:80   │ │
│ │         [-] [1] [+]      │ │
│ │ 蓝色/XL  ¥168  库存:45   │ │
│ │         [-] [0] [+]      │ │
│ └──────────────────────────┘ │
│                              │
│ 小计：¥208.00                │
│          [取消] [确定]       │
└──────────────────────────────┘
```

4. **已选商品列表**：显示SKU名称和价格

#### 5.14.3 后端改造

`backend/src/routes/wecom/sidebar.ts`：

1. 创建订单时，从提交数据中读取 `skuId`/`skuName`/`skuCode`/`specValues`
2. 写入 `order_items` 表时，填充完整的 SKU 快照字段
3. 有 `skuId` 时扣减 `product_skus.stock`，同步 `products.total_stock`/`products.stock`

---

### 5.15 需求15（新增）— 商品列表后端分页改造

**文件：** `src/views/Product/List.vue`、`src/stores/product.ts`、`src/api/product.ts`、`backend/src/controllers/ProductController.ts`

#### 5.15.1 现状

当前商品列表采用前端全量加载 + 本地筛选/分页：`productStore.loadProducts({ pageSize: 9999 })` 拉取全部商品，然后前端 `getFilteredProducts` 做本地筛选和分页。

#### 5.15.2 改造方案

**后端**：`GET /api/v1/products` 已支持 `page`/`pageSize`/`keyword`/`categoryId`/`status`/`productType` 等筛选参数，返回结构已包含 `list`/`total`/`page`/`pageSize`。主要改造点：

1. 确保分页参数生效（当前 `pageSize` 默认 9999，改为默认 20）
2. 返回每条商品的 `skuType`/`minPrice`/`maxPrice`/`totalStock`/`skuCount`
3. 返回 `skuSummary` 精简数组（用于悬浮提示），仅包含前10条SKU的 `{skuName, price, stock, status}`

**前端**：

1. `productStore.loadProducts()` 改为真正的服务端分页请求（传递 `page`/`pageSize`/筛选条件）
2. 搜索、筛选、翻页均触发后端请求，不再本地过滤
3. `List.vue` 翻页组件绑定后端分页数据（`total`/`currentPage`/`pageSize`）
4. 默认每页 20 条

#### 5.15.3 影响范围

以下依赖 `productStore.products` 全量数据的地方需同步处理：

| 引用位置 | 处理方式 |
|----------|----------|
| `Order/Add.vue` 选品列表 | 改为独立的后端搜索接口（已有 `GET /products?forOrder=true`），前端保留搜索 |
| `Order/Edit.vue` 选品列表 | 同上 |
| `Product/Stock.vue` 库存列表 | 改为后端分页 |
| `Product/Analytics.vue` | 依赖统计API，不受影响 |
| `WecomSidebar/SidebarQuickOrder.vue` | 已有独立搜索API |

---

### 5.16 需求16（新增）— 库存调整历史记录持久化

**文件：** `src/views/Product/Stock.vue`、`backend/src/routes/products.ts`、`backend/src/controllers/ProductController.ts`

#### 5.16.1 现状

前端库存调整历史存储在 `localStorage`（key: `stock_history_{productId}`），后端 `getStockAdjustments` 返回空列表。

#### 5.16.2 改造方案

新增 `stock_adjustments` 表：

```sql
CREATE TABLE IF NOT EXISTS `stock_adjustments` (
  `id` VARCHAR(50) NOT NULL COMMENT '调整记录ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '商品ID',
  `sku_id` VARCHAR(50) DEFAULT NULL COMMENT 'SKU ID（无SKU则为NULL）',
  `sku_name` VARCHAR(200) DEFAULT NULL COMMENT 'SKU名称',
  `adjust_type` VARCHAR(20) NOT NULL COMMENT 'increase/decrease/set',
  `quantity` INT NOT NULL COMMENT '调整数量',
  `before_stock` INT NOT NULL COMMENT '调整前库存',
  `after_stock` INT NOT NULL COMMENT '调整后库存',
  `reason` VARCHAR(50) DEFAULT NULL COMMENT '调整原因',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `operator_id` VARCHAR(50) DEFAULT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_adj_product` (`product_id`),
  KEY `IDX_adj_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存调整记录表';
```

后端 `POST /products/stock/adjust` 每次调整时写入记录。`GET /products/stock/adjustments?productId=xxx` 返回调整历史列表。

前端 `Stock.vue` 的「变动记录」弹窗改为从后端API加载，废弃 localStorage。

---

## 六、前端Store和API层扩展

### 6.1 `src/api/product.ts` — 新增SKU API

```typescript
// SKU CRUD
getSkus(productId: string, params?: { page?: number; pageSize?: number }) {
  return apiService.get(`/products/${productId}/skus`, { params })
},
saveSkus(productId: string, data: { skuType: string, specGroups: any[], skus: any[] }) {
  return apiService.post(`/products/${productId}/skus`, data)
},
updateSku(productId: string, skuId: string, data: any) {
  return apiService.put(`/products/${productId}/skus/${skuId}`, data)
},
deleteSku(productId: string, skuId: string) {
  return apiService.delete(`/products/${productId}/skus/${skuId}`)
},
getSpecGroups(productId: string) {
  return apiService.get(`/products/${productId}/spec-groups`)
},

// SKU状态管理
updateSkuStatus(productId: string, skuId: string, status: 'active' | 'inactive') {
  return apiService.put(`/products/${productId}/skus/${skuId}/status`, { status })
},
batchUpdateSkuStatus(productId: string, skuIds: string[], status: 'active' | 'inactive') {
  return apiService.put(`/products/${productId}/skus/batch-status`, { skuIds, status })
},

// 库存调整（正式API）
adjustStock(data: { productId: string; skuId?: string; type: string; quantity: number; reason?: string; remark?: string }) {
  return apiService.post('/products/stock/adjust', data)
},
batchAdjustStock(data: { productId: string; skuIds: string[]; type: string; quantity: number; reason?: string; remark?: string }) {
  return apiService.post('/products/stock/batch-adjust', data)
},
getStockAdjustments(productId: string, params?: { page?: number; pageSize?: number }) {
  return apiService.get('/products/stock/adjustments', { params: { productId, ...params } })
}
```

### 6.2 `src/stores/product.ts` — Product接口扩展

```typescript
export interface Product {
  ...现有字段,
  // SKU 相关
  skuType?: 'none' | 'single' | 'multi'
  minPrice?: number | null
  maxPrice?: number | null
  totalStock?: number | null
  skuCount?: number
  skus?: ProductSku[]
  specGroups?: ProductSpecGroup[]
  skuSummary?: Array<{ skuName: string; stock: number; price: number }>
}

export interface ProductSku {
  id: string
  skuCode: string
  skuName: string
  skuImage: string | null
  price: number
  costPrice: number
  stock: number
  salesCount: number
  weight: number
  barcode: string | null
  specValues: Record<string, string>
  sortOrder: number
  status: 'active' | 'inactive'
}

export interface ProductSpecGroup {
  id: string
  specName: string
  specValues: string[]
  sortOrder: number
}
```

### 6.3 `src/stores/order.ts` — OrderProduct接口扩展

```typescript
export interface OrderProduct {
  id: string
  name: string
  code?: string
  price: number
  originalPrice?: number
  quantity: number
  total: number
  productType?: string
  image?: string
  // SKU 新增
  skuId?: string
  skuCode?: string
  skuName?: string
  skuImage?: string
  specValues?: Record<string, string>
}
```

---

## 七、改造文件清单与优先级

### 第一阶段：数据层（最高优先级）

| 序号 | 文件 | 改造内容 |
|------|------|----------|
| 1 | `backend/database-migrations/20260627-add-product-sku-tables.sql` | 新增迁移文件（含SKU表、规格组表、库存调整记录表） |
| 2 | `backend/src/entities/ProductSku.ts` | **新增** SKU实体 |
| 3 | `backend/src/entities/ProductSpecGroup.ts` | **新增** 规格组实体 |
| 4 | `backend/src/entities/StockAdjustment.ts` | **新增** 库存调整记录实体 |
| 5 | `backend/src/entities/Product.ts` | 增加 skuType/minPrice/maxPrice/totalStock 字段和关联 |
| 6 | `backend/src/entities/OrderItem.ts` | 增加 skuId/skuName/skuImage/specValues 字段 |
| 7 | `backend/src/config/database.ts` | 注册新实体到 TypeORM |
| 8 | `backend/src/utils/tenantRepo.ts` | 将新表加入 TENANT_ENTITIES |

### 第二阶段：后端API

| 序号 | 文件 | 改造内容 |
|------|------|----------|
| 9 | `backend/src/routes/products.ts` | 新增SKU CRUD路由 + SKU状态管理路由 + 库存批量调整路由 + 扩展商品列表/详情返回SKU + 后端分页改造默认pageSize |
| 10 | `backend/src/controllers/ProductController.ts` | 扩展 getProducts（后端分页+SKU摘要）/getProductDetail/createProduct/updateProduct/adjustStock（正式化+记录持久化） |
| 11 | `backend/src/routes/orders/orderCrud.ts` | 创建/更新订单时双写 order_items 表（含SKU快照）+ SKU级别库存扣减 |
| 12 | `backend/src/routes/wecom/sidebar.ts` | 企微侧边栏支持SKU选品、SKU库存扣减 |

### 第三阶段：前端商品管理

| 序号 | 文件 | 改造内容 |
|------|------|----------|
| 13 | `src/api/product.ts` | 新增SKU CRUD/状态/库存调整等API方法 |
| 14 | `src/stores/product.ts` | 扩展 Product/ProductSku/ProductSpecGroup 接口 + 后端分页数据管理 |
| 15 | `src/views/Product/Edit.vue` | 价格库存区域增加SKU TAB表单 + 编辑时删除SKU |
| 16 | `src/views/Product/Detail.vue` | 详情页SKU展示 |
| 17 | `src/views/Product/List.vue` | 列表价格/库存列改造 + 库存点击弹窗SKU明细 + 悬浮提示 + 上下架SKU选择对话框 + 后端分页改造 |
| 18 | `src/views/Product/Stock.vue` | 库存调整对话框支持SKU + 对接后端正式API + 调整历史从后端加载 |

### 第四阶段：前端订单管理

| 序号 | 文件 | 改造内容 |
|------|------|----------|
| 19 | `src/stores/order.ts` | 扩展 OrderProduct 接口 |
| 20 | `src/views/Order/Add.vue` | 选品流程+SKU选择对话框（分页10条/页） |
| 21 | `src/views/Order/Edit.vue` | 同 Add.vue |
| 22 | `src/views/Order/Detail/OrderProductsCard.vue` | 商品清单SKU展示修复 |
| 23 | `src/views/Order/Audit.vue` | 审核页tooltip SKU + 弹窗补全商品字段含SKU |

### 第五阶段：前端物流、导出和企微

| 序号 | 文件 | 改造内容 |
|------|------|----------|
| 24 | `src/views/Logistics/Shipping.vue` | 发货列表商品列SKU悬浮提示 |
| 25 | `src/views/Logistics/components/ShippingDialog.vue` | 发货对话框SKU展示 |
| 26 | `src/views/Logistics/components/OrderDetailDialog.vue` | 发货详情SKU展示 |
| 27 | `src/utils/export.ts` | 导出增加SKU信息 |
| 28 | `src/views/WecomSidebar/SidebarQuickOrder.vue` | 企微侧边栏SKU选品支持 |

---

## 八、核心流程图

### 8.1 商品创建/编辑流程（含SKU）

```
用户打开新增/编辑商品
  ↓
选择商品类型（实物/虚拟）
  ↓ 实物商品
填写基本信息
  ↓
价格库存区域 → 选择TAB → [无SKU] → 当前表单不变 → 保存
                        ↓ [设SKU]
                    添加规格组（颜色、尺码等，默认3个维度，可自行增加）
                        ↓
                    添加规格值（红色、蓝色...）
                        ↓
                    自动生成SKU矩阵
                        ↓
                    填写每个SKU的价格/库存/图片
                        ↓
                    编辑模式可删除指定SKU
                        ↓
                    保存商品基础信息
                        ↓
                    调用 POST /products/:id/skus 保存SKU
                        ↓
                    后端自动计算 minPrice/maxPrice/totalStock
                        ↓
                    返回成功
```

### 8.2 下单选品流程（含SKU）

```
用户在新增订单页面
  ↓
浏览商品列表（有SKU商品显示价格区间+总库存）
  ↓
点击无SKU商品 → 直接添加到已选列表
点击有SKU商品 → 弹出SKU选择对话框
  ↓
  选择SKU + 设置数量 → 确定
  ↓
已选列表中显示每个SKU为独立行
  ↓
点击有SKU商品的「编辑」→ 重新打开SKU对话框修改
  ↓
保存订单 → products JSON 中每项含 skuId/skuName/specValues
  ↓
后端创建订单 → 写入 order_items 表（含SKU快照）
             → 扣减 product_skus.stock
             → 同步 products.total_stock / products.stock
```

### 8.3 商品上下架流程（含SKU）

```
用户在商品列表点击下架/批量下架
  ↓
判断商品是否有SKU
  ↓
[无SKU] → 直接下架 → products.status = 'inactive' → 完成
[有SKU] → 弹出选择对话框
  ↓
[整个商品下架] → products.status = 'inactive' → 完成
[指定SKU下架] → 勾选要下架的SKU
  ↓
调用 PUT /products/:id/skus/batch-status { skuIds, status: 'inactive' }
  ↓
后端更新 product_skus.status → 重新计算 min_price/max_price/total_stock（仅active的SKU）
  ↓
新增订单选品时：
  - 整个商品下架 → 商品不可见
  - 指定SKU下架 → 商品仍可见，SKU选择对话框中已下架SKU灰色不可选
```

### 8.4 库存调整流程（含SKU）

```
打开库存调整对话框
  ↓
判断商品SKU类型
  ↓
[无SKU] → 调用 POST /products/stock/adjust（不含skuId）→ 后端写入stock_adjustments记录
[有SKU] → 选择调整模式
  ↓
[统一调整] → 调用 POST /products/stock/batch-adjust → 所有启用SKU统一增/减/设
[逐个调整] → 逐个调用 POST /products/stock/adjust (含 skuId)
  ↓
后端更新 product_skus.stock → 写入 stock_adjustments 记录
  ↓
后端重新计算 products.total_stock / products.stock
  ↓
返回成功 → 刷新页面数据
```

---

## 九、兼容性与风险评估

### 9.1 向下兼容保证

| 场景 | 处理方式 |
|------|----------|
| 已有商品数据 | `sku_type` 默认 `none`，价格/库存字段不受影响 |
| 已有订单数据 | `products` JSON 中无SKU字段，前端判断 `skuId` 是否存在来决定显示 |
| `products.price` | 有SKU时同步为 `min_price`，保持读取兼容 |
| `products.stock` | 有SKU时同步为 `total_stock`，保持读取兼容 |
| 企微侧边栏 | `OrderItem.productSku` 保留，新增 `skuId` 独立字段，侧边栏同步支持SKU选品 |
| 虚拟商品 | **不启用SKU**，虚拟商品保持当前逻辑不受影响 |
| 库存调整 | 废弃 localStorage 方式，统一走后端 `POST /products/stock/adjust` |
| 商品列表分页 | 改为后端分页，前端搜索/筛选/翻页均请求后端 |

### 9.2 风险点

| 风险 | 等级 | 应对措施 |
|------|------|----------|
| SKU笛卡尔积过大 | 中 | 默认3个规格维度（可自行增加），每维度最多20个值，前端提示总SKU数超过100时预警 |
| 订单JSON体积增大 | 低 | 每个SKU项仅增加5个字段（约100字节），不影响 |
| 商品列表查询变慢 | 低 | 改为后端分页，SKU汇总信息预存在 `products` 表，列表查询无需JOIN |
| 库存扣减并发 | 中 | 使用数据库乐观锁或 `UPDATE WHERE stock >= quantity` |
| 数据迁移失败 | 低 | ALTER TABLE 加 DEFAULT 值，CREATE TABLE IF NOT EXISTS，失败自动忽略重复列 |
| 前端分页切换 | 中 | 现有依赖全量数据的组件需逐个排查适配（详见需求15影响范围） |
| SKU跨页选择丢失 | 中 | 订单SKU选择对话框翻页时使用前端状态记忆已选项 |

### 9.3 性能优化策略

1. **商品列表**：改为后端分页（默认20条/页），SKU汇总数据预存在 `products` 表中
2. **SKU悬浮提示**：列表API返回 `skuSummary` 精简数组（前10条），避免懒加载延迟
3. **SKU选品对话框**：按需加载单个商品的SKU列表，支持分页（10条/页）
4. **SKU明细弹窗**：库存列点击弹窗分页加载SKU（10条/页）
5. **库存同步**：每次SKU库存变更后，在同一事务中更新 `products.total_stock` 和 `products.stock`
6. **库存调整记录**：持久化到 `stock_adjustments` 表，替代 localStorage，支持分页查询

---

## 十、开发排期建议

| 阶段 | 内容 | 预估工时 | 依赖 |
|------|------|----------|------|
| 第一阶段 | 数据库迁移 + 后端实体（含 stock_adjustments 表） | 1天 | 无 |
| 第二阶段 | 后端SKU CRUD API + 商品API扩展 + 后端分页改造 + 库存API正式化 | 3天 | 第一阶段 |
| 第三阶段 | 前端商品管理（新增/编辑含删除SKU/详情/列表含上下架对话框/库存点击弹窗/后端分页） | 4天 | 第二阶段 |
| 第四阶段 | 前端订单管理（选品含分页SKU对话框/详情/审核） | 2天 | 第三阶段 |
| 第五阶段 | 前端物流/库存（对接正式API+历史记录）/导出/企微侧边栏 | 2天 | 第四阶段 |
| 测试验证 | 全链路测试 + 回归测试 + 兼容性测试 | 2天 | 第五阶段 |
| **合计** | | **14天** | |

---

## 十一、测试验证要点

### 11.1 商品管理

- [ ] 新增无SKU实物商品 → 保存 → 详情/列表展示正常
- [ ] 新增无SKU虚拟商品 → 保存 → 详情/列表展示正常（无SKU TAB）
- [ ] 新增单SKU实物商品（1个规格1个值） → 保存 → 详情/列表展示正常
- [ ] 新增多SKU实物商品（2个规格多个值） → SKU矩阵正确生成 → 保存 → 详情/列表展示正常
- [ ] 编辑无SKU商品切换为有SKU → 保存 → 验证
- [ ] 编辑有SKU商品切换为无SKU → 确认提示 → 保存 → 旧SKU数据清除
- [ ] 编辑商品时删除指定SKU → 保存 → 汇总数据重算正确
- [ ] SKU图片上传 → 保存 → 详情页可见
- [ ] 商品列表有SKU商品显示价格区间和总库存
- [ ] 商品列表悬浮提示显示SKU信息
- [ ] 商品列表点击库存列 → 弹出SKU库存明细对话框 → 分页正确
- [ ] 商品列表后端分页 → 翻页/搜索/筛选均正确
- [ ] 添加4个以上规格维度 → 生成矩阵正确

### 11.2 上下架管理

- [ ] 无SKU商品下架 → 保持当前行为
- [ ] 有SKU商品下架 → 弹窗选择整体或指定SKU → 操作生效
- [ ] 指定SKU下架 → 新增订单SKU选择对话框中该SKU灰色不可选
- [ ] 整个商品下架 → 新增订单不可见
- [ ] 批量下架含有SKU商品 → 弹窗提示 → 整体操作/逐个处理均可
- [ ] 有SKU商品上架 → 弹窗选择整体或指定SKU → 操作生效

### 11.3 库存管理

- [ ] 无SKU商品库存调整 → 走后端API → stock_adjustments有记录
- [ ] 有SKU商品统一调整 → 所有SKU库存同步变更 → 后端记录
- [ ] 有SKU商品逐个调整 → 各SKU独立变更 → 后端记录
- [ ] 调整后 products.total_stock 和 products.stock 同步更新
- [ ] 库存变动历史 → 从后端加载展示（非localStorage）

### 11.4 订单管理

- [ ] 新增订单选择无SKU商品 → 行为不变
- [ ] 新增订单选择有SKU商品 → SKU选择对话框弹出（分页10条/页） → 选中多个SKU → 确定 → 已选列表正确
- [ ] SKU选择对话框跨页选择 → 翻页后已选状态记忆
- [ ] 编辑有SKU商品的SKU选择 → 修改数量/增减SKU → 确定 → 更新
- [ ] 保存订单 → 库存扣减正确（按SKU扣减） → order_items表双写正确
- [ ] 订单详情页商品清单 → SKU名称/图片正确显示
- [ ] 订单审核页tooltip → SKU信息正确显示
- [ ] 订单审核弹窗 → 商品明细含SKU信息
- [ ] 批量导出订单 → Excel中商品字段含SKU

### 11.5 物流管理

- [ ] 发货列表商品列悬浮提示 → SKU信息正确
- [ ] 发货对话框商品摘要 → 含SKU
- [ ] 发货详情对话框 → 含SKU
- [ ] 批量导出 → 含SKU

### 11.6 企微侧边栏

- [ ] 搜索有SKU商品 → 显示价格区间和多规格标识
- [ ] 点击有SKU商品 → 弹出SKU选择面板
- [ ] 选择SKU并下单 → 订单包含SKU快照 → 库存按SKU扣减
- [ ] 无SKU商品 → 行为不变

### 11.7 兼容性

- [ ] 已有无SKU商品 → 所有页面正常显示无异常
- [ ] 已有订单 → 详情/审核/物流正常显示无异常
- [ ] 虚拟商品 → 无SKU TAB，保持原有逻辑不受影响
- [ ] 企微侧边栏 → 新旧流程均正常
- [ ] 商品列表分页 → 旧数据在后端分页下正常展示

---

## 十二、附录

### A. 规格值组合（笛卡尔积）算法

```typescript
function generateSkuMatrix(specGroups: Array<{ specName: string; specValues: string[] }>): Record<string, string>[] {
  if (specGroups.length === 0) return []
  
  return specGroups.reduce<Record<string, string>[]>((result, group) => {
    if (result.length === 0) {
      return group.specValues.map(val => ({ [group.specName]: val }))
    }
    const newResult: Record<string, string>[] = []
    for (const existing of result) {
      for (const val of group.specValues) {
        newResult.push({ ...existing, [group.specName]: val })
      }
    }
    return newResult
  }, [])
}
```

### B. SKU编码生成规则

```
格式：{商品编码}-{两位序号}
示例：P12345678-01, P12345678-02, ..., P12345678-99
超过99个：P12345678-100, P12345678-101
```

### C. SKU名称生成规则

```
格式：规格值按规格组排序用"/"连接
示例：
  规格组1=颜色(红色), 规格组2=尺码(XL) → "红色/XL"
  规格组1=颜色(蓝色) → "蓝色"
  规格组1=款式(经典款), 规格组2=颜色(黑色), 规格组3=尺码(M) → "经典款/黑色/M"
```

### D. 订单products JSON格式对比

无SKU（当前）：
```json
[
  {"id":"prod_1","name":"商品A","code":"P001","price":99,"quantity":2,"total":198}
]
```

有SKU（改造后）：
```json
[
  {"id":"prod_1","name":"商品A","code":"P001","price":99,"quantity":2,"total":198,
   "skuId":"sku_01","skuCode":"P001-01","skuName":"红色/S","skuImage":"...","specValues":{"颜色":"红色","尺码":"S"}},
  {"id":"prod_1","name":"商品A","code":"P001","price":168,"quantity":1,"total":168,
   "skuId":"sku_05","skuCode":"P001-05","skuName":"蓝色/XL","skuImage":"...","specValues":{"颜色":"蓝色","尺码":"XL"}}
]
```

---

## 十三、已确认事项归档

| 序号 | 原待确认项 | 确认结果 | 影响 |
|------|-----------|---------|------|
| 1 | SKU功能是否仅限实物商品？ | **是，仅实物商品支持SKU** | 虚拟商品不启用SKU，保持当前逻辑 |
| 2 | SKU规格维度上限是否3个够用？ | **默认3个，支持自行增加** | 前端不设硬上限，默认显示3个规格组输入框，用户可按「+添加规格」持续增加 |
| 3 | `order_items` 表是否启用双写？ | **是，启用双写** | CRM主流程创建/编辑订单时同步写入 `order_items` 表，统一数据模型。企微侧边栏同步改造支持SKU选品 |
| 4 | 商品列表是否需要后端分页？ | **是，改造为后端分页** | 废弃前端全量加载模式，默认每页20条。SKU弹窗/对话框默认每页10条，均支持翻页加载 |
| 5 | 库存调整是否对接后端正式API？ | **是，统一走后端API** | 废弃前端 `updateProduct` + localStorage 方式，新增 `stock_adjustments` 表持久化调整记录 |

## 十四、v2.0 新增需求汇总

| 序号 | 需求 | 对应章节 | 要点 |
|------|------|---------|------|
| 1 | 编辑商品时可删除指定SKU | 5.1.3 第8点 | 编辑模式SKU表格每行支持删除操作，至少保留1个SKU |
| 2 | 上下架支持SKU级别控制 | 5.4 | 有SKU商品弹窗选择整体下架或指定SKU下架，下架的SKU在新增订单中不可选 |
| 3 | 批量上下架含SKU商品处理 | 5.4.3 | 提供「整体操作」和「逐个处理」两种模式 |
| 4 | 商品列表库存列点击弹窗SKU明细 | 5.5 | 有SKU商品点击库存数字弹出SKU明细对话框，字体统一系统风格，分页10条/页 |
| 5 | 企微侧边栏支持SKU选品 | 5.14 | 适配侧边栏窄宽度的精简SKU选择面板 |
| 6 | 商品列表后端分页改造 | 5.15 | 废弃前端全量加载，改为后端分页（20条/页） |
| 7 | 库存调整历史持久化 | 5.16 | 新增 `stock_adjustments` 表，废弃 localStorage |
| 8 | SKU对话框分页支持 | 5.5 / 5.8.3 | 所有SKU列表对话框默认10条/页，支持翻页，跨页选择记忆 |
| 9 | ~~虚拟商品支持SKU~~ | ~~已撤销~~ | 仅实物商品支持SKU，虚拟商品保持现有逻辑不变 |
