CREATE TABLE IF NOT EXISTS `tenant_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(255) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `operator` VARCHAR(100) NOT NULL,
  `operator_id` VARCHAR(255) NOT NULL,
  `details` TEXT,
  `ip_address` VARCHAR(45),
  `user_agent` VARCHAR(500),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_tenant_created` (`tenant_id`, `created_at`),
  INDEX `idx_action` (`action`),
  INDEX `idx_operator_id` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `tenants` ADD INDEX `idx_status_license` (`status`, `license_status`);
ALTER TABLE `tenants` ADD INDEX `idx_expire_date` (`expire_date`);
ALTER TABLE `tenants` ADD INDEX `idx_created_at` (`created_at`);
ALTER TABLE `users` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);
ALTER TABLE `customers` ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`);
ALTER TABLE `orders` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);
ALTER TABLE `orders` ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`);
ALTER TABLE `products` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);

ANALYZE TABLE `tenants`;
ANALYZE TABLE `users`;
ANALYZE TABLE `customers`;
ANALYZE TABLE `orders`;
ANALYZE TABLE `products`;
ANALYZE TABLE `tenant_settings`;
ANALYZE TABLE `tenant_logs`;
