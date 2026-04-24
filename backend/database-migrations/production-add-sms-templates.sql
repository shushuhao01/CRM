-- =====================================================
-- 生产环境：添加短信模板CODE配置
-- 执行环境：宝塔 phpMyAdmin
-- 执行方式：复制下方SQL，在phpMyAdmin中执行
-- =====================================================

-- 步骤1：检查并创建 system_config 表（如果不存在）
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

-- 步骤2：插入或更新短信配置（包含多个模板CODE字段）
INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `description`)
VALUES (
  REPLACE(UUID(), '-', ''),
  'sms_config',
  '{"enabled":false,"accessKeyId":"","accessKeySecret":"","signName":"","templateCode":"","templates":{"VERIFY_CODE":"","REGISTER_SUCCESS":"","PAYMENT_SUCCESS":"","RENEW_SUCCESS":"","PACKAGE_CHANGE":"","QUOTA_CHANGE":"","ACCOUNT_SUSPEND":"","ACCOUNT_RESUME":"","ACCOUNT_CANCEL":"","REFUND_SUCCESS":"","EXPIRE_REMIND":"","EXPIRED_NOTICE":""}}',
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

-- 步骤3：验证配置是否插入成功
SELECT 
  config_key,
  JSON_PRETTY(config_value) as config_value,
  description,
  created_at,
  updated_at
FROM system_config 
WHERE config_key = 'sms_config';

-- =====================================================
-- 执行完成后的说明：
-- 1. 如果看到查询结果显示 sms_config 配置，说明执行成功
-- 2. config_value 中应该包含 templates 对象，包含12个模板CODE字段
-- 3. 现在可以在Admin后台的"系统设置"->"基础设置"->"短信配置"中填写模板CODE
-- =====================================================
