-- 添加会话存档RSA公钥字段到服务商配置表
-- SaaS模式：统一公钥供所有租户复制到企微后台
ALTER TABLE wecom_suite_configs ADD COLUMN chat_archive_rsa_public_key TEXT NULL COMMENT '会话存档RSA公钥(租户复制到企微后台加密密钥处)' AFTER permissions;
