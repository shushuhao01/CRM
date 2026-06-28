-- 确保绩效管理操作日志表存在
CREATE TABLE IF NOT EXISTS `performance_operation_logs` (
  `id` VARCHAR(50) NOT NULL COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型',
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

-- 确保代收管理操作日志表存在
CREATE TABLE IF NOT EXISTS `cod_operation_logs` (
  `id` VARCHAR(50) NOT NULL COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型',
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

-- 确保增值管理操作日志表存在
CREATE TABLE IF NOT EXISTS `value_added_operation_logs` (
  `id` VARCHAR(50) NOT NULL COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '增值订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型',
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

-- 确保通用操作日志表存在（用于订单审核/发货/物流/部门/用户/角色等模块审计）
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
