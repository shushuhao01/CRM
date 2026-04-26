-- ============================================================
-- 修复生产环境缺失模块 - 数据看板 & 企微管理
-- 日期: 2026-04-26
-- 问题: modules 表缺少「数据看板」和「企微管理」
--       module_status 表缺少「wecom」条目
--       导致管理后台模块列表只显示10个，租户看不到企微管理菜单
-- 用法: 在宝塔面板 phpMyAdmin 中直接执行
-- ============================================================

-- ==================== 1. modules 表：添加缺失的2个模块 ====================

-- 添加「数据看板」模块
INSERT INTO `modules` (`id`, `name`, `code`, `description`, `icon`, `version`, `status`, `is_system`, `sort_order`)
VALUES (UUID(), '数据看板', 'dashboard_management', '系统数据总览、趋势分析', 'Odometer', '1.0.0', 'enabled', 1, 0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 添加「企微管理」模块
INSERT INTO `modules` (`id`, `name`, `code`, `description`, `icon`, `version`, `status`, `is_system`, `sort_order`)
VALUES (UUID(), '企微管理', 'wecom_management', '企业微信集成管理，包括企微应用配置、客户同步、会话存档等功能', 'ChatLineSquare', '1.0.0', 'enabled', 0, 11)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ==================== 2. module_status 表：添加企微管理启停状态 ====================

INSERT INTO `module_status` (`module_key`, `module_name`, `description`, `icon`, `is_enabled`, `sort_order`)
VALUES ('wecom', '企微管理', '企业微信集成管理，客户同步、会话存档', 'ChatLineSquare', 1, 12)
ON DUPLICATE KEY UPDATE `module_name` = VALUES(`module_name`), `updated_at` = CURRENT_TIMESTAMP;

-- ==================== 3. 更新租户 features：确保包含 wecom 模块 ====================
-- 将所有已有 features 的租户补充 wecom 模块授权
-- （只对 features 字段不包含 wecom 的租户进行更新）

UPDATE `tenants`
SET `features` = JSON_ARRAY_APPEND(
  CASE
    WHEN `features` IS NULL OR `features` = '' OR `features` = '[]' THEN '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]'
    ELSE `features`
  END,
  '$', 'wecom'
)
WHERE `features` IS NOT NULL
  AND `features` != ''
  AND `features` != '[]'
  AND JSON_CONTAINS(`features`, '"wecom"') = 0;

-- 对于 features 为空的租户，设置完整的默认模块列表
UPDATE `tenants`
SET `features` = '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]'
WHERE `features` IS NULL OR `features` = '' OR `features` = '[]';

-- ============================================================
-- 执行完毕后重启后端: pm2 restart crm-backend
-- ============================================================
