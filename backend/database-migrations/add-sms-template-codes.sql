-- 添加短信模板CODE字段到system_config表
-- 用于存储多个短信模板的CODE配置

-- 说明：
-- 短信配置存储在 system_config 表的 config_value 字段中（JSON格式）
-- 本迁移脚本用于确保表结构正确，并添加示例配置

-- 检查 system_config 表是否存在
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` varchar(36) NOT NULL COMMENT '主键ID',
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值(JSON格式)',
  `config_type` varchar(50) DEFAULT 'string' COMMENT '配置类型',
  `description` varchar(500) DEFAULT NULL COMMENT '配置说明',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 插入或更新短信配置示例（包含多个模板CODE）
INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `description`)
VALUES (
  UUID(),
  'sms_config',
  '{
    "enabled": false,
    "accessKeyId": "",
    "accessKeySecret": "",
    "signName": "",
    "templateCode": "",
    "templates": {
      "VERIFY_CODE": "",
      "REGISTER_SUCCESS": "",
      "PAYMENT_SUCCESS": "",
      "RENEW_SUCCESS": "",
      "PACKAGE_CHANGE": "",
      "QUOTA_CHANGE": "",
      "ACCOUNT_SUSPEND": "",
      "ACCOUNT_RESUME": "",
      "ACCOUNT_CANCEL": "",
      "REFUND_SUCCESS": "",
      "EXPIRE_REMIND": "",
      "EXPIRED_NOTICE": ""
    }
  }',
  'json',
  '阿里云短信服务配置'
)
ON DUPLICATE KEY UPDATE
  `config_value` = JSON_SET(
    COALESCE(`config_value`, '{}'),
    '$.templates', JSON_OBJECT(
      'VERIFY_CODE', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.VERIFY_CODE')), ''),
      'REGISTER_SUCCESS', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.REGISTER_SUCCESS')), ''),
      'PAYMENT_SUCCESS', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.PAYMENT_SUCCESS')), ''),
      'RENEW_SUCCESS', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.RENEW_SUCCESS')), ''),
      'PACKAGE_CHANGE', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.PACKAGE_CHANGE')), ''),
      'QUOTA_CHANGE', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.QUOTA_CHANGE')), ''),
      'ACCOUNT_SUSPEND', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.ACCOUNT_SUSPEND')), ''),
      'ACCOUNT_RESUME', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.ACCOUNT_RESUME')), ''),
      'ACCOUNT_CANCEL', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.ACCOUNT_CANCEL')), ''),
      'REFUND_SUCCESS', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.REFUND_SUCCESS')), ''),
      'EXPIRE_REMIND', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.EXPIRE_REMIND')), ''),
      'EXPIRED_NOTICE', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`config_value`, '$.templates.EXPIRED_NOTICE')), '')
    )
  ),
  `updated_at` = CURRENT_TIMESTAMP;
