ALTER TABLE `licenses` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL COMMENT '软删除时间（回收站）';
ALTER TABLE `licenses` ADD COLUMN `deleted_by` VARCHAR(36) NULL DEFAULT NULL COMMENT '删除操作人';
ALTER TABLE `licenses` ADD INDEX `idx_licenses_deleted_at` (`deleted_at`);
ALTER TABLE `tenants` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL COMMENT '软删除时间（回收站）';
ALTER TABLE `tenants` ADD COLUMN `deleted_by` VARCHAR(36) NULL DEFAULT NULL COMMENT '删除操作人';
ALTER TABLE `tenants` ADD INDEX `idx_tenants_deleted_at` (`deleted_at`);

