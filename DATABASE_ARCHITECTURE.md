# CRM系统数据库架构设计

## 数据库选择建议

### 推荐：MySQL 8.0+
- 阿里云服务器 + 宝塔面板完美支持
- 成熟稳定，性能优秀
- 支持JSON字段，适合灵活数据存储
- 丰富的生态和工具支持

## 核心数据表设计

### 1. 用户认证表 (users)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(50),
  phone VARCHAR(20),
  role ENUM('admin', 'manager', 'sales', 'service') DEFAULT 'sales',
  department_id INT,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_department (department_id)
);
```

### 2. 部门表 (departments)
```sql
CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id INT NULL,
  manager_id INT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent (parent_id),
  INDEX idx_manager (manager_id)
);
```

### 3. 客户表 (customers)
```sql
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  company VARCHAR(200),
  industry VARCHAR(100),
  source VARCHAR(50),
  level ENUM('normal', 'silver', 'gold') DEFAULT 'normal',
  status ENUM('active', 'inactive', 'blacklist') DEFAULT 'active',
  tags JSON,
  remark TEXT,
  order_count INT DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  last_order_time TIMESTAMP NULL,
  assigned_to INT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (customer_code),
  INDEX idx_phone (phone),
  INDEX idx_assigned (assigned_to),
  INDEX idx_created_by (created_by),
  INDEX idx_level (level),
  INDEX idx_status (status)
);
```

### 4. 产品表 (products)
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category_id INT,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  stock_quantity INT DEFAULT 0,
  min_stock INT DEFAULT 0,
  unit VARCHAR(20) DEFAULT '件',
  specifications JSON,
  images JSON,
  status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (product_code),
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by)
);
```

### 5. 产品分类表 (product_categories)
```sql
CREATE TABLE product_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  parent_id INT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parent (parent_id),
  INDEX idx_sort (sort_order)
);
```

### 6. 订单表 (orders)
```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20),
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  collect_amount DECIMAL(10,2) DEFAULT 0.00,
  deposit_amount DECIMAL(10,2) DEFAULT 0.00,
  deposit_screenshots JSON,
  receiver_name VARCHAR(100) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  receiver_address TEXT NOT NULL,
  remark TEXT,
  status ENUM('pending_transfer', 'pending_audit', 'audit_rejected', 'pending_shipment', 
              'shipped', 'logistics_returned', 'logistics_cancelled', 'delivered', 
              'package_exception', 'rejected', 'rejected_returned', 'after_sales_created',
              'pending_cancel', 'cancel_failed', 'cancelled', 'draft') DEFAULT 'pending_transfer',
  audit_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  mark_type ENUM('normal', 'reserved', 'return') DEFAULT 'normal',
  sales_person_id INT,
  auditor_id INT,
  audit_time TIMESTAMP NULL,
  audit_remark TEXT,
  express_company VARCHAR(100),
  tracking_number VARCHAR(100),
  logistics_status ENUM('pending', 'picked_up', 'in_transit', 'out_for_delivery', 
                       'delivered', 'exception', 'rejected', 'returned'),
  shipping_time TIMESTAMP NULL,
  delivery_time TIMESTAMP NULL,
  cancel_reason TEXT,
  cancel_time TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_number (order_number),
  INDEX idx_customer (customer_id),
  INDEX idx_sales_person (sales_person_id),
  INDEX idx_status (status),
  INDEX idx_audit_status (audit_status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
);
```

### 7. 订单商品表 (order_items)
```sql
CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_code VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_product (product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### 8. 订单状态历史表 (order_status_history)
```sql
CREATE TABLE order_status_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  operator_id INT NOT NULL,
  operator_name VARCHAR(100) NOT NULL,
  description TEXT,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_operator (operator_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### 9. 物流跟踪表 (logistics_tracking)
```sql
CREATE TABLE logistics_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  tracking_number VARCHAR(100),
  location VARCHAR(200),
  description TEXT NOT NULL,
  logistics_status VARCHAR(50) NOT NULL,
  tracked_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order (order_id),
  INDEX idx_tracking (tracking_number),
  INDEX idx_tracked_at (tracked_at),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### 10. 操作日志表 (operation_logs)
```sql
CREATE TABLE operation_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50),
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at)
);
```

### 11. 系统配置表 (system_configs)
```sql
CREATE TABLE system_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSON,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (config_key)
);
```

## 数据关系设计

### 外键约束
```sql
-- 用户部门关系
ALTER TABLE users ADD FOREIGN KEY (department_id) REFERENCES departments(id);

-- 部门层级关系
ALTER TABLE departments ADD FOREIGN KEY (parent_id) REFERENCES departments(id);
ALTER TABLE departments ADD FOREIGN KEY (manager_id) REFERENCES users(id);

-- 客户分配关系
ALTER TABLE customers ADD FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE customers ADD FOREIGN KEY (created_by) REFERENCES users(id);

-- 产品分类关系
ALTER TABLE products ADD FOREIGN KEY (category_id) REFERENCES product_categories(id);
ALTER TABLE products ADD FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE product_categories ADD FOREIGN KEY (parent_id) REFERENCES product_categories(id);

-- 订单关系
ALTER TABLE orders ADD FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE orders ADD FOREIGN KEY (sales_person_id) REFERENCES users(id);
ALTER TABLE orders ADD FOREIGN KEY (auditor_id) REFERENCES users(id);
ALTER TABLE orders ADD FOREIGN KEY (created_by) REFERENCES users(id);
```

## 数据安全设计

### 1. 数据隔离
- 所有数据都关联到具体用户
- 基于角色的数据访问控制
- 部门级别的数据隔离

### 2. 数据备份
- 定时数据库备份
- 增量备份策略
- 异地备份存储

### 3. 数据加密
- 敏感字段加密存储
- 传输层SSL加密
- API接口JWT认证

## 性能优化

### 1. 索引策略
- 主键索引
- 外键索引
- 查询频繁字段索引
- 复合索引优化

### 2. 分表策略
- 订单表按年份分表
- 日志表按月份分表
- 历史数据归档

### 3. 缓存策略
- Redis缓存热点数据
- 查询结果缓存
- 会话缓存

## 部署建议

### 1. 阿里云RDS MySQL
- 高可用架构
- 自动备份
- 监控告警
- 弹性扩容

### 2. 宝塔面板管理
- 数据库管理
- 备份管理
- 性能监控
- 安全防护

### 3. 数据迁移
- 从localStorage导出现有数据
- 数据清洗和格式化
- 批量导入数据库
- 数据一致性验证