-- 私有客户表添加租户编码字段（幂等：已存在则跳过）
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'private_customers' AND COLUMN_NAME = 'tenant_code');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `private_customers` ADD COLUMN `tenant_code` VARCHAR(50) DEFAULT NULL COMMENT ''租户编码（私有部署登录时使用）'' AFTER `company_size`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 从 tenants 表回填已有数据的 tenant_code（通过联系电话关联）
UPDATE `private_customers` pc
INNER JOIN `tenants` t ON t.phone = pc.contact_phone
SET pc.tenant_code = t.code
WHERE pc.tenant_code IS NULL AND t.code IS NOT NULL AND pc.contact_phone IS NOT NULL;
