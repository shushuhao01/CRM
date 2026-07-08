-- ============================================================
-- 通话管理/呼出配置 相关表结构保障（生产环境升级修复）
--
-- 背景：call_lines / user_line_assignments / global_call_config /
--       call_recordings / work_phones 没有 TypeORM 实体，自动迁移的
--       "建表补字段"覆盖不到它们；旧库升级后表缺失或缺列会导致
--       "号码分配-分配线路失败"、"保存网络电话配置失败"等 500 错误。
--
-- 本文件幂等安全：
--   1. CREATE TABLE IF NOT EXISTS 建缺失表（完整最新结构）
--   2. 存储过程按 information_schema 判断逐列补齐旧表缺失字段
-- 文件名以 20260708-0- 开头，保证排序在其他 20260708-* 迁移之前执行，
-- 使后续的 ALTER ... AFTER caller_number 等语句有依赖列可用。
-- ============================================================

-- =============================================
-- 1. 外呼线路表
-- =============================================
CREATE TABLE IF NOT EXISTS `call_lines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '线路ID',
  `name` VARCHAR(100) NOT NULL COMMENT '线路名称',
  `provider` VARCHAR(50) NOT NULL COMMENT '服务商：system/aliyun/tencent/huawei/custom',
  `type` VARCHAR(20) DEFAULT 'voip' COMMENT '线路类型：voip/pstn/sip',
  `caller_number` VARCHAR(30) COMMENT '主叫显示号码/外显号码',
  `line_number` VARCHAR(30) COMMENT '线路号码',
  `config` JSON COMMENT '线路配置（加密存储AccessKey等）',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active/inactive/error',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用(管理员控制)',
  `max_concurrent` INT DEFAULT 10 COMMENT '最大并发数',
  `current_concurrent` INT DEFAULT 0 COMMENT '当前并发数',
  `daily_limit` INT DEFAULT 1000 COMMENT '每日限额',
  `daily_used` INT DEFAULT 0 COMMENT '今日已用',
  `total_calls` INT DEFAULT 0 COMMENT '总通话次数',
  `total_duration` INT DEFAULT 0 COMMENT '总通话时长(秒)',
  `success_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '接通率(%)',
  `last_used_at` DATETIME COMMENT '最后使用时间',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `description` TEXT COMMENT '线路描述',
  `remark` TEXT COMMENT '备注',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_provider` (`provider`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_call_lines_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外呼线路表';

-- =============================================
-- 2. 用户线路分配表（号码分配）
-- =============================================
CREATE TABLE IF NOT EXISTS `user_line_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `line_id` INT NOT NULL COMMENT '线路ID',
  `caller_number` VARCHAR(30) COMMENT '分配的外显号码(可为空则使用线路默认)',
  `agent_phone` VARCHAR(30) NULL COMMENT '员工工作号码(双呼先呼叫此号码,为空则使用用户资料手机号)',
  `ccc_user_id` VARCHAR(64) NULL COMMENT '云联络中心坐席账号ID(软电话/硬话机模式使用)',
  `agent_extension` VARCHAR(20) NULL COMMENT '云联络中心坐席分机号(软电话分机号)',
  `sip_extension` VARCHAR(20) NULL COMMENT '云联络中心SIP话机分机号',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否为该用户默认线路',
  `daily_limit` INT DEFAULT 0 COMMENT '个人每日限额(0=使用线路限额)',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `assigned_by` VARCHAR(50) COMMENT '分配人ID',
  `assigned_at` DATETIME COMMENT '分配时间',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_line` (`user_id`, `line_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_line_id` (`line_id`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_user_line_assignments_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户线路分配表';

-- =============================================
-- 3. 全局外呼配置表
-- =============================================
CREATE TABLE IF NOT EXISTS `global_call_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(50) NOT NULL COMMENT '配置键',
  `config_value` TEXT COMMENT '配置值',
  `config_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型: string/json/number/boolean',
  `description` VARCHAR(255) COMMENT '配置说明',
  `updated_by` VARCHAR(50) COMMENT '最后更新人',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_config_key_tenant` (`config_key`, `tenant_id`),
  INDEX `idx_global_call_config_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局外呼配置表';

-- =============================================
-- 4. 通话录音表
-- =============================================
CREATE TABLE IF NOT EXISTS `call_recordings` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '录音ID',
  `call_id` VARCHAR(50) NOT NULL COMMENT '通话记录ID',
  `customer_id` VARCHAR(50) COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) COMMENT '客户电话',
  `file_name` VARCHAR(200) NOT NULL COMMENT '文件名',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
  `file_url` VARCHAR(500) COMMENT '访问URL',
  `file_size` BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
  `duration` INT DEFAULT 0 COMMENT '录音时长(秒)',
  `format` VARCHAR(20) DEFAULT 'mp3' COMMENT '文件格式',
  `sample_rate` INT DEFAULT 16000 COMMENT '采样率',
  `channels` INT DEFAULT 1 COMMENT '声道数',
  `quality_score` DECIMAL(3,1) COMMENT '质量评分(1-5)',
  `transcription` TEXT COMMENT '语音转文字内容',
  `transcription_status` VARCHAR(20) DEFAULT 'none' COMMENT '转写状态',
  `storage_type` VARCHAR(20) DEFAULT 'local' COMMENT '存储类型：local/oss/cos',
  `expire_at` DATETIME COMMENT '过期时间',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否已删除',
  `deleted_at` DATETIME COMMENT '删除时间',
  `user_id` VARCHAR(50) COMMENT '操作用户ID',
  `user_name` VARCHAR(50) COMMENT '操作用户姓名',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_call` (`call_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_call_recordings_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通话录音表';

-- =============================================
-- 5. 旧表补列（表已存在但缺新字段的场景）
--    MySQL 不支持 ADD COLUMN IF NOT EXISTS，用存储过程安全补齐
-- =============================================
DROP PROCEDURE IF EXISTS _ensure_call_config_columns;
DELIMITER $$
CREATE PROCEDURE _ensure_call_config_columns()
BEGIN
  -- ---------- user_line_assignments ----------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='caller_number') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `caller_number` VARCHAR(30) NULL COMMENT '分配的外显号码(可为空则使用线路默认)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='agent_phone') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `agent_phone` VARCHAR(30) NULL COMMENT '员工工作号码(双呼先呼叫此号码,为空则使用用户资料手机号)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='ccc_user_id') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `ccc_user_id` VARCHAR(64) NULL COMMENT '云联络中心坐席账号ID(软电话/硬话机模式使用)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='agent_extension') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `agent_extension` VARCHAR(20) NULL COMMENT '云联络中心坐席分机号(软电话分机号)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='sip_extension') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `sip_extension` VARCHAR(20) NULL COMMENT '云联络中心SIP话机分机号';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='is_default') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否为该用户默认线路';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='daily_limit') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `daily_limit` INT DEFAULT 0 COMMENT '个人每日限额(0=使用线路限额)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='is_active') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='assigned_by') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `assigned_by` VARCHAR(50) NULL COMMENT '分配人ID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='assigned_at') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `assigned_at` DATETIME NULL COMMENT '分配时间';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='tenant_id') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='user_line_assignments' AND column_name='updated_at') THEN
    ALTER TABLE `user_line_assignments` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
  END IF;

  -- ---------- call_lines ----------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='type') THEN
    ALTER TABLE `call_lines` ADD COLUMN `type` VARCHAR(20) DEFAULT 'voip' COMMENT '线路类型：voip/pstn/sip';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='caller_number') THEN
    ALTER TABLE `call_lines` ADD COLUMN `caller_number` VARCHAR(30) NULL COMMENT '主叫显示号码/外显号码';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='line_number') THEN
    ALTER TABLE `call_lines` ADD COLUMN `line_number` VARCHAR(30) NULL COMMENT '线路号码';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='config') THEN
    ALTER TABLE `call_lines` ADD COLUMN `config` JSON NULL COMMENT '线路配置（加密存储AccessKey等）';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='is_enabled') THEN
    ALTER TABLE `call_lines` ADD COLUMN `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用(管理员控制)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='description') THEN
    ALTER TABLE `call_lines` ADD COLUMN `description` TEXT NULL COMMENT '线路描述';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='created_by') THEN
    ALTER TABLE `call_lines` ADD COLUMN `created_by` VARCHAR(50) NULL COMMENT '创建人ID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='sort_order') THEN
    ALTER TABLE `call_lines` ADD COLUMN `sort_order` INT DEFAULT 0 COMMENT '排序';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_lines' AND column_name='tenant_id') THEN
    ALTER TABLE `call_lines` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID';
  END IF;

  -- ---------- global_call_config ----------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='global_call_config' AND column_name='config_type') THEN
    ALTER TABLE `global_call_config` ADD COLUMN `config_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型: string/json/number/boolean';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='global_call_config' AND column_name='description') THEN
    ALTER TABLE `global_call_config` ADD COLUMN `description` VARCHAR(255) NULL COMMENT '配置说明';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='global_call_config' AND column_name='updated_by') THEN
    ALTER TABLE `global_call_config` ADD COLUMN `updated_by` VARCHAR(50) NULL COMMENT '最后更新人';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='global_call_config' AND column_name='tenant_id') THEN
    ALTER TABLE `global_call_config` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID';
  END IF;

  -- ---------- call_recordings ----------
  -- 旧库结构为 call_record_id/storage_url，代码使用 call_id/file_url 等新列，逐列补齐
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='call_id') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `call_id` VARCHAR(50) NULL COMMENT '通话记录ID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='customer_id') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `customer_id` VARCHAR(50) NULL COMMENT '客户ID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='customer_name') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `customer_name` VARCHAR(100) NULL COMMENT '客户姓名';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='customer_phone') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `customer_phone` VARCHAR(20) NULL COMMENT '客户电话';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='file_url') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `file_url` VARCHAR(500) NULL COMMENT '访问URL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='sample_rate') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `sample_rate` INT DEFAULT 16000 COMMENT '采样率';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='channels') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `channels` INT DEFAULT 1 COMMENT '声道数';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='storage_type') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `storage_type` VARCHAR(20) DEFAULT 'local' COMMENT '存储类型：local/oss/cos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='expire_at') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `expire_at` DATETIME NULL COMMENT '过期时间';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='is_deleted') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否已删除';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='deleted_at') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `deleted_at` DATETIME NULL COMMENT '删除时间';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='user_id') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `user_id` VARCHAR(50) NULL COMMENT '操作用户ID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='user_name') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `user_name` VARCHAR(50) NULL COMMENT '操作用户姓名';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='tenant_id') THEN
    ALTER TABLE `call_recordings` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID';
  END IF;
  -- 兼容旧数据：call_id 为空时从旧列 call_record_id 回填
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='call_recordings' AND column_name='call_record_id') THEN
    UPDATE `call_recordings` SET `call_id` = `call_record_id` WHERE (`call_id` IS NULL OR `call_id` = '') AND `call_record_id` IS NOT NULL;
  END IF;

  -- ---------- work_phones ----------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='work_phones') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='work_phones' AND column_name='tenant_id') THEN
      ALTER TABLE `work_phones` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID';
    END IF;
  END IF;
END$$
DELIMITER ;
CALL _ensure_call_config_columns();
DROP PROCEDURE IF EXISTS _ensure_call_config_columns;
