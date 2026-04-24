-- 创建私有客户表
-- 执行时间: 2026-03-04
-- 说明: 用于管理私有部署客户的基本信息

-- 创建私有客户表
CREATE TABLE IF NOT EXISTS private_customers (
  id VARCHAR(36) PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL COMMENT '客户名称',
  contact_person VARCHAR(100) COMMENT '联系人',
  contact_phone VARCHAR(50) COMMENT '联系电话',
  contact_email VARCHAR(100) COMMENT '联系邮箱',
  company_address VARCHAR(500) COMMENT '公司地址',
  industry VARCHAR(100) COMMENT '所属行业',
  company_size VARCHAR(50) COMMENT '公司规模: 10人以下, 10-50人, 50-200人, 200人以上',
  deployment_type VARCHAR(50) DEFAULT 'on-premise' COMMENT '部署类型: on-premise-本地部署, cloud-云部署',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-正常, inactive-停用',
  notes TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_name (customer_name),
  INDEX idx_status (status),
  INDEX idx_industry (industry),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私有部署客户表';

-- 修改licenses表，添加客户类型和关联字段
-- 注意：如果字段已存在会报错，但不影响后续执行
ALTER TABLE licenses ADD COLUMN customer_type VARCHAR(20) DEFAULT 'private' 
  COMMENT '客户类型: private-私有客户, saas-SaaS租户';

ALTER TABLE licenses ADD COLUMN private_customer_id VARCHAR(36) 
  COMMENT '关联的私有客户ID';

ALTER TABLE licenses ADD COLUMN tenant_id VARCHAR(36) 
  COMMENT '关联的租户ID（如果是SaaS租户）';

-- 添加索引（如果索引已存在会报错，但不影响）
ALTER TABLE licenses ADD INDEX idx_customer_type (customer_type);
ALTER TABLE licenses ADD INDEX idx_private_customer_id (private_customer_id);
ALTER TABLE licenses ADD INDEX idx_tenant_id (tenant_id);

-- 添加外键约束（可选，根据实际情况决定是否启用）
-- ALTER TABLE licenses ADD CONSTRAINT fk_private_customer 
--   FOREIGN KEY (private_customer_id) REFERENCES private_customers(id) ON DELETE SET NULL;

-- 迁移现有数据：将现有的licenses记录关联到新创建的private_customers
-- 注意：这个脚本需要根据实际数据情况调整

-- 示例：为每个现有的license创建对应的private_customer记录
-- INSERT INTO private_customers (id, customer_name, contact_person, contact_phone, contact_email, notes, created_at)
-- SELECT 
--   UUID() as id,
--   customer_name,
--   customer_contact as contact_person,
--   customer_phone as contact_phone,
--   customer_email as contact_email,
--   notes,
--   created_at
-- FROM licenses
-- WHERE customer_type = 'private' OR customer_type IS NULL
-- GROUP BY customer_name, customer_contact, customer_phone, customer_email;

-- 更新licenses表，关联到private_customers
-- UPDATE licenses l
-- INNER JOIN private_customers pc ON l.customer_name = pc.customer_name
-- SET l.private_customer_id = pc.id, l.customer_type = 'private'
-- WHERE l.customer_type = 'private' OR l.customer_type IS NULL;

COMMIT;
