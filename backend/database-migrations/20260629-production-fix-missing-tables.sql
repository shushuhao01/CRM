-- ============================================================
-- 生产环境修复脚本 - 创建缺失的表
-- 修复问题：
--   1. 财务管理(绩效/代收/增值)页面 "操作日志加载失败"
--   2. 通话管理页面 "Table 'abc789.call_prospects' doesn't exist"
--   3. 系统设置移动应用 "Table 'abc789.mobile_app_packages' doesn't exist"
-- 执行方式：直接在生产数据库执行（使用 CREATE TABLE IF NOT EXISTS，幂等安全）
-- ============================================================

-- =============================================
-- 1. 绩效管理操作日志表
-- =============================================
CREATE TABLE IF NOT EXISTS `performance_operation_logs` (
  `id` VARCHAR(50) NOT NULL COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型：status_change/coefficient_change/remark_change',
  `operation_content` VARCHAR(500) NOT NULL COMMENT '操作内容描述',
  `old_value` VARCHAR(255) NULL COMMENT '变更前的值',
  `new_value` VARCHAR(255) NULL COMMENT '变更后的值',
  `operator_id` VARCHAR(50) NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(100) NULL COMMENT '操作人姓名',
  `remark` TEXT NULL COMMENT '附加备注',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_perf_oplog_order` (`order_id`),
  KEY `idx_perf_oplog_tenant` (`tenant_id`),
  KEY `idx_perf_oplog_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绩效管理操作日志表';

-- =============================================
-- 2. 代收管理操作日志表
-- =============================================
CREATE TABLE IF NOT EXISTS `cod_operation_logs` (
  `id` VARCHAR(50) NOT NULL COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型：cod_amount_change/cod_returned/cod_cancelled',
  `operation_content` VARCHAR(500) NOT NULL COMMENT '操作内容描述',
  `old_value` VARCHAR(255) NULL COMMENT '变更前的值',
  `new_value` VARCHAR(255) NULL COMMENT '变更后的值',
  `operator_id` VARCHAR(50) NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(100) NULL COMMENT '操作人姓名',
  `remark` TEXT NULL COMMENT '附加备注',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_cod_oplog_order` (`order_id`),
  KEY `idx_cod_oplog_tenant` (`tenant_id`),
  KEY `idx_cod_oplog_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代收管理操作日志表';

-- =============================================
-- 3. 增值管理操作日志表
-- =============================================
CREATE TABLE IF NOT EXISTS `value_added_operation_logs` (
  `id` VARCHAR(50) NOT NULL COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '增值订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型：status_change/settlement_change/company_change/unit_price_change',
  `operation_content` VARCHAR(500) NOT NULL COMMENT '操作内容描述',
  `old_value` VARCHAR(255) NULL COMMENT '变更前的值',
  `new_value` VARCHAR(255) NULL COMMENT '变更后的值',
  `operator_id` VARCHAR(50) NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(100) NULL COMMENT '操作人姓名',
  `remark` TEXT NULL COMMENT '附加备注',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_va_oplog_order` (`order_id`),
  KEY `idx_va_oplog_tenant` (`tenant_id`),
  KEY `idx_va_oplog_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理操作日志表';

-- =============================================
-- 4. 通话管理-外呼潜客表
-- =============================================
CREATE TABLE IF NOT EXISTS `call_prospects` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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

-- =============================================
-- 5. 移动应用安装包管理表
-- =============================================
CREATE TABLE IF NOT EXISTS `mobile_app_packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `platform` VARCHAR(20) NOT NULL COMMENT '平台: android/ios',
  `app_name` VARCHAR(100) DEFAULT '' COMMENT '应用名称',
  `version` VARCHAR(50) DEFAULT '' COMMENT '版本号',
  `package_url` VARCHAR(500) DEFAULT '' COMMENT '上传的安装包路径',
  `external_url` VARCHAR(500) DEFAULT '' COMMENT '外部下载地址',
  `file_size` BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
  `file_hash` VARCHAR(64) DEFAULT '' COMMENT '文件SHA256哈希',
  `download_count` INT DEFAULT 0 COMMENT '下载次数',
  `is_enabled` TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
  `description` TEXT COMMENT '版本说明',
  `uploaded_by` VARCHAR(100) DEFAULT '' COMMENT '上传者',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY `idx_platform` (`platform`),
  KEY `idx_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='移动应用安装包管理';

-- =============================================
-- 6. 通用操作日志表（其他模块审计依赖）
-- =============================================
CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` VARCHAR(50) NOT NULL COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL,
  `user_id` VARCHAR(50) NULL,
  `user_name` VARCHAR(50) NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `resource_type` VARCHAR(50) NULL,
  `resource_id` VARCHAR(50) NULL,
  `description` TEXT NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_oplog_module_resource` (`module`, `resource_type`, `resource_id`),
  KEY `idx_oplog_resource_id` (`resource_id`),
  KEY `idx_oplog_tenant` (`tenant_id`),
  KEY `idx_oplog_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- =============================================
-- 7. 迁移历史表（AutoMigrationService 依赖）
-- =============================================
CREATE TABLE IF NOT EXISTS `migration_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(255) NOT NULL,
  `checksum` VARCHAR(64) NULL,
  `execution_time` INT NULL COMMENT '执行耗时(ms)',
  `success` TINYINT(1) NOT NULL DEFAULT 1,
  `error_message` TEXT NULL,
  `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_migration_filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库迁移执行记录';

-- =============================================
-- 8. 修复 users.status 枚举（确保支持 resigned/locked）
-- =============================================
ALTER TABLE `users` MODIFY COLUMN `status` ENUM('active', 'inactive', 'resigned', 'locked') NOT NULL DEFAULT 'active';

-- =============================================
-- 完成：记录本次迁移到 migration_history
-- =============================================
INSERT INTO `migration_history` (`filename`, `checksum`, `execution_time`, `success`)
VALUES ('20260629-production-fix-missing-tables.sql', 'manual-execution', 0, 1)
ON DUPLICATE KEY UPDATE `success` = 1, `error_message` = NULL;

-- ============================================================
-- 执行完毕！验证命令：
-- SHOW TABLES LIKE '%operation_logs%';
-- SHOW TABLES LIKE 'call_prospects';
-- SHOW TABLES LIKE 'mobile_app_packages';
-- SELECT COUNT(*) FROM information_schema.tables 
--   WHERE table_schema = DATABASE() 
--   AND table_name IN ('performance_operation_logs','cod_operation_logs','value_added_operation_logs','call_prospects','operation_logs','mobile_app_packages');
-- 预期结果：6
-- ============================================================
