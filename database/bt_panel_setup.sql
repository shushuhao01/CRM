-- =============================================
-- CRM系统数据库初始化脚本 - 宝塔面板专用
-- 适用于：MySQL 8.0+ / 宝塔面板 7.x+
-- 创建时间：2024-01-15
-- =============================================

-- 1. 创建数据库（在宝塔面板中手动创建，这里仅作参考）
-- CREATE DATABASE crm_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE crm_system;

-- 设置字符集和时区
SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- =============================================
-- 核心数据表创建
-- =============================================

-- 1. 部门表
CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '部门ID',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  description TEXT COMMENT '部门描述',
  parent_id INT NULL COMMENT '上级部门ID',
  manager_id INT NULL COMMENT '部门经理ID',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_parent (parent_id),
  INDEX idx_manager (manager_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- 2. 用户表
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  email VARCHAR(100) UNIQUE COMMENT '邮箱',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  real_name VARCHAR(50) COMMENT '真实姓名',
  phone VARCHAR(20) COMMENT '手机号',
  role ENUM('admin', 'manager', 'sales', 'service') DEFAULT 'sales' COMMENT '角色',
  department_id INT COMMENT '部门ID',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' COMMENT '状态',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  login_count INT DEFAULT 0 COMMENT '登录次数',
  avatar_url VARCHAR(500) COMMENT '头像URL',
  settings JSON COMMENT '用户设置',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_department (department_id),
  INDEX idx_role (role),
  INDEX idx_status (status),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 3. 产品分类表
CREATE TABLE product_categories (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '分类ID',
  name VARCHAR(100) NOT NULL COMMENT '分类名称',
  parent_id INT NULL COMMENT '上级分类ID',
  description TEXT COMMENT '分类描述',
  sort_order INT DEFAULT 0 COMMENT '排序',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_parent (parent_id),
  INDEX idx_status (status),
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品分类表';

-- 4. 产品表
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '产品ID',
  product_code VARCHAR(50) UNIQUE NOT NULL COMMENT '产品编码',
  name VARCHAR(200) NOT NULL COMMENT '产品名称',
  category_id INT COMMENT '分类ID',
  description TEXT COMMENT '产品描述',
  price DECIMAL(10,2) NOT NULL COMMENT '销售价格',
  cost_price DECIMAL(10,2) COMMENT '成本价格',
  stock_quantity INT DEFAULT 0 COMMENT '库存数量',
  min_stock INT DEFAULT 0 COMMENT '最小库存',
  unit VARCHAR(20) DEFAULT '件' COMMENT '单位',
  specifications JSON COMMENT '规格参数',
  images JSON COMMENT '产品图片',
  status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active' COMMENT '状态',
  created_by INT NOT NULL COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_code (product_code),
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品表';

-- 5. 客户表
CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '客户ID',
  customer_code VARCHAR(50) UNIQUE NOT NULL COMMENT '客户编码',
  name VARCHAR(100) NOT NULL COMMENT '客户姓名',
  phone VARCHAR(20) COMMENT '手机号',
  email VARCHAR(100) COMMENT '邮箱',
  address TEXT COMMENT '地址',
  company VARCHAR(200) COMMENT '公司名称',
  industry VARCHAR(100) COMMENT '行业',
  source VARCHAR(50) COMMENT '客户来源',
  level ENUM('normal', 'silver', 'gold') DEFAULT 'normal' COMMENT '客户等级',
  status ENUM('active', 'inactive', 'blacklist') DEFAULT 'active' COMMENT '状态',
  tags JSON COMMENT '标签',
  remark TEXT COMMENT '备注',
  order_count INT DEFAULT 0 COMMENT '订单数量',
  total_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '总消费金额',
  last_order_time TIMESTAMP NULL COMMENT '最后下单时间',
  assigned_to INT COMMENT '负责人',
  created_by INT NOT NULL COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_code (customer_code),
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_assigned (assigned_to),
  INDEX idx_created_by (created_by),
  INDEX idx_level (level),
  INDEX idx_status (status),
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户表';

-- 6. 订单表
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
  order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '订单号',
  customer_id INT NOT NULL COMMENT '客户ID',
  total_amount DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
  discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
  final_amount DECIMAL(10,2) NOT NULL COMMENT '实付金额',
  status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending' COMMENT '订单状态',
  payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid' COMMENT '支付状态',
  payment_method VARCHAR(50) COMMENT '支付方式',
  shipping_address TEXT COMMENT '收货地址',
  shipping_phone VARCHAR(20) COMMENT '收货电话',
  shipping_name VARCHAR(50) COMMENT '收货人',
  remark TEXT COMMENT '订单备注',
  created_by INT NOT NULL COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_order_number (order_number),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 7. 订单商品表
CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '订单商品ID',
  order_id INT NOT NULL COMMENT '订单ID',
  product_id INT NOT NULL COMMENT '产品ID',
  product_name VARCHAR(200) NOT NULL COMMENT '产品名称',
  product_code VARCHAR(50) NOT NULL COMMENT '产品编码',
  price DECIMAL(10,2) NOT NULL COMMENT '单价',
  quantity INT NOT NULL COMMENT '数量',
  total_price DECIMAL(10,2) NOT NULL COMMENT '小计',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_order (order_id),
  INDEX idx_product (product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单商品表';

-- 8. 订单状态历史表
CREATE TABLE order_status_history (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '历史ID',
  order_id INT NOT NULL COMMENT '订单ID',
  old_status VARCHAR(50) COMMENT '原状态',
  new_status VARCHAR(50) NOT NULL COMMENT '新状态',
  remark TEXT COMMENT '备注',
  created_by INT NOT NULL COMMENT '操作人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_order (order_id),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单状态历史表';

-- 9. 物流跟踪表
CREATE TABLE logistics_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '跟踪ID',
  order_id INT NOT NULL COMMENT '订单ID',
  tracking_number VARCHAR(100) COMMENT '物流单号',
  logistics_company VARCHAR(100) COMMENT '物流公司',
  status VARCHAR(50) COMMENT '物流状态',
  location VARCHAR(200) COMMENT '当前位置',
  description TEXT COMMENT '状态描述',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_order (order_id),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流跟踪表';

-- 10. 操作日志表
CREATE TABLE operation_logs (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
  user_id INT COMMENT '操作用户ID',
  action VARCHAR(100) NOT NULL COMMENT '操作类型',
  resource_type VARCHAR(50) COMMENT '资源类型',
  resource_id INT COMMENT '资源ID',
  description TEXT COMMENT '操作描述',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 11. 系统配置表
CREATE TABLE system_configs (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
  description TEXT COMMENT '配置描述',
  is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_key (config_key),
  INDEX idx_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- =============================================
-- 初始化数据
-- =============================================

-- 插入默认部门
INSERT INTO departments (name, description) VALUES 
('总经理办公室', '公司最高管理层'),
('销售部', '负责产品销售和客户维护'),
('客服部', '负责客户服务和售后支持'),
('技术部', '负责产品研发和技术支持');

-- 插入默认管理员用户（密码：admin123，请及时修改）
INSERT INTO users (username, email, password_hash, real_name, role, department_id) VALUES 
('admin', 'admin@company.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQ', '系统管理员', 'admin', 1);

-- 插入默认产品分类
INSERT INTO product_categories (name, description) VALUES 
('默认分类', '系统默认产品分类'),
('电子产品', '各类电子设备和配件'),
('办公用品', '办公室日常用品'),
('服装鞋帽', '各类服装和鞋帽产品');

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, config_type, description, is_public) VALUES 
('system_name', 'CRM客户管理系统', 'string', '系统名称', TRUE),
('company_name', '您的公司名称', 'string', '公司名称', TRUE),
('max_upload_size', '10485760', 'number', '最大上传文件大小(字节)', FALSE),
('session_timeout', '7200', 'number', '会话超时时间(秒)', FALSE),
('password_min_length', '6', 'number', '密码最小长度', FALSE),
('enable_email_notification', 'true', 'boolean', '启用邮件通知', FALSE),
('enable_sms_notification', 'false', 'boolean', '启用短信通知', FALSE);

-- =============================================
-- 创建视图（可选）
-- =============================================

-- 客户统计视图
CREATE VIEW customer_stats AS
SELECT 
  c.id,
  c.customer_code,
  c.name,
  c.level,
  c.status,
  c.order_count,
  c.total_amount,
  c.last_order_time,
  u.real_name as assigned_name,
  d.name as department_name
FROM customers c
LEFT JOIN users u ON c.assigned_to = u.id
LEFT JOIN departments d ON u.department_id = d.id;

-- 订单统计视图
CREATE VIEW order_stats AS
SELECT 
  o.id,
  o.order_number,
  o.total_amount,
  o.status,
  o.created_at,
  c.name as customer_name,
  c.customer_code,
  u.real_name as created_by_name
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN users u ON o.created_by = u.id;

-- =============================================
-- 性能优化建议
-- =============================================

-- 1. 定期优化表
-- OPTIMIZE TABLE customers, orders, products;

-- 2. 分析表统计信息
-- ANALYZE TABLE customers, orders, products;

-- 3. 检查索引使用情况
-- SHOW INDEX FROM customers;
-- EXPLAIN SELECT * FROM customers WHERE phone = '13800138000';

-- =============================================
-- 宝塔面板配置建议
-- =============================================

/*
1. 数据库配置：
   - 字符集：utf8mb4
   - 排序规则：utf8mb4_unicode_ci
   - 时区：Asia/Shanghai

2. 性能配置：
   - innodb_buffer_pool_size = 128M (根据服务器内存调整)
   - max_connections = 200
   - query_cache_size = 32M

3. 安全配置：
   - 创建专用数据库用户，不要使用root
   - 设置强密码
   - 限制远程访问IP

4. 备份配置：
   - 启用自动备份
   - 备份频率：每日
   - 保留天数：30天
*/