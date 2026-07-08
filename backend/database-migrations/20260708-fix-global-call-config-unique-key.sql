-- 修复 global_call_config 唯一键：旧库为 config_key 单列唯一，
-- SaaS多租户下每个租户需要各自一份配置，必须改为 (config_key, tenant_id) 联合唯一
DELIMITER $$
CREATE PROCEDURE _fix_gcc_unique_key()
BEGIN
  -- 删除旧的单列唯一索引（不同版本可能叫 config_key 或 idx_config_key）
  IF EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='global_call_config' AND index_name='config_key') THEN
    ALTER TABLE `global_call_config` DROP INDEX `config_key`;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='global_call_config' AND index_name='idx_config_key') THEN
    ALTER TABLE `global_call_config` DROP INDEX `idx_config_key`;
  END IF;
  -- 创建联合唯一索引
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='global_call_config' AND index_name='idx_config_key_tenant') THEN
    ALTER TABLE `global_call_config` ADD UNIQUE INDEX `idx_config_key_tenant` (`config_key`, `tenant_id`);
  END IF;
END$$
DELIMITER ;
CALL _fix_gcc_unique_key();
DROP PROCEDURE IF EXISTS _fix_gcc_unique_key;
