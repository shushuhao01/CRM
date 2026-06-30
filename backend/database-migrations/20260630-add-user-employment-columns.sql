-- ============================================================
-- 生产环境修复脚本 - 添加 users 表缺失的列
-- 修复问题：用户管理页面报错 "系统数据结构需要升级"
-- 原因：users 表缺少 employment_status 和 resigned_at 列
-- 执行方式：在宝塔 phpMyAdmin 中直接执行（幂等安全）
-- ============================================================

DELIMITER $$
CREATE PROCEDURE _add_user_employment_cols()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='employment_status') THEN
    ALTER TABLE `users` ADD COLUMN `employment_status` ENUM('active','resigned') DEFAULT 'active' COMMENT '在职状态';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='resigned_at') THEN
    ALTER TABLE `users` ADD COLUMN `resigned_at` DATETIME NULL COMMENT '离职时间';
  END IF;
END$$
DELIMITER ;
CALL _add_user_employment_cols();
DROP PROCEDURE IF EXISTS _add_user_employment_cols;

-- 将现有活跃用户的 employment_status 设为 active（如果之前为NULL）
UPDATE `users` SET `employment_status` = 'active' WHERE `employment_status` IS NULL AND `status` = 'active';
UPDATE `users` SET `employment_status` = 'resigned' WHERE `employment_status` IS NULL AND `status` = 'resigned';

-- ============================================================
-- 验证：
-- SHOW COLUMNS FROM `users` LIKE 'employment_status';
-- SHOW COLUMNS FROM `users` LIKE 'resigned_at';
-- SELECT employment_status, COUNT(*) FROM users GROUP BY employment_status;
-- ============================================================
