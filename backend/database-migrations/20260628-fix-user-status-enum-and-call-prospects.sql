-- 修复 users.status 枚举值（旧版数据库可能只有 active/inactive，缺少 locked/resigned）
-- AutoMigrationService 不修改已有列，需要通过 SQL 迁移手动修复
ALTER TABLE `users` MODIFY COLUMN `status` ENUM('active', 'inactive', 'resigned', 'locked') NOT NULL DEFAULT 'active';

-- 确保 call_prospects 表存在（通话管理-呼出列表功能依赖此表）
-- AutoMigrationService 应该自动建表，但升级过程中可能因连接时序问题而失败
CREATE TABLE IF NOT EXISTS `call_prospects` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NULL,
  `name` VARCHAR(100) NOT NULL COMMENT '姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `gender` VARCHAR(10) NULL COMMENT '性别',
  `company` VARCHAR(200) NULL COMMENT '公司',
  `remark` TEXT NULL COMMENT '备注',
  `source` VARCHAR(50) NULL COMMENT '来源：manual/excel/other',
  `tags` JSON NULL COMMENT '标签',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/called/converted/invalid',
  `call_count` INT NOT NULL DEFAULT 0 COMMENT '外呼次数',
  `last_call_time` DATETIME NULL COMMENT '最后外呼时间',
  `last_call_status` VARCHAR(20) NULL COMMENT '最后外呼结果',
  `assigned_to` VARCHAR(36) NULL COMMENT '分配给（销售员ID）',
  `assigned_name` VARCHAR(100) NULL COMMENT '分配给（姓名）',
  `converted_customer_id` VARCHAR(36) NULL COMMENT '转入后的客户ID',
  `converted_at` DATETIME NULL COMMENT '转入时间',
  `import_batch_id` VARCHAR(36) NULL COMMENT '导入批次号',
  `created_by` VARCHAR(36) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(100) NULL COMMENT '创建人姓名',
  `deleted_at` DATETIME NULL COMMENT '删除时间（软删除）',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_prospect_tenant_phone` (`tenant_id`, `phone`),
  KEY `idx_prospect_tenant_status` (`tenant_id`, `status`),
  KEY `idx_prospect_tenant_assigned` (`tenant_id`, `assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外呼列表-潜客数据';
