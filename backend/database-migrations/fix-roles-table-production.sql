-- ========================================
-- 修复生产环境roles表结构
-- 添加缺失的字段
-- 执行时间: 2026-03-05
-- ========================================

-- 添加缺失字段到roles表
ALTER TABLE `roles`
  ADD COLUMN `code` varchar(50) NOT NULL DEFAULT '' COMMENT '角色代码' AFTER `name`,
  ADD COLUMN `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '状态: active-启用, inactive-禁用' AFTER `description`,
  ADD COLUMN `level` int(11) NOT NULL DEFAULT 0 COMMENT '角色级别' AFTER `status`,
  ADD COLUMN `color` varchar(20) DEFAULT NULL COMMENT '角色颜色' AFTER `level`,
  ADD COLUMN `permissions` json DEFAULT NULL COMMENT '权限列表(JSON)' AFTER `color`,
  ADD COLUMN `roleType` varchar(20) DEFAULT NULL COMMENT '角色类型: system-系统角色, custom-自定义角色' AFTER `permissions`,
  ADD COLUMN `data_scope` varchar(20) DEFAULT NULL COMMENT '数据范围: all-全部, department-本部门, self-仅本人' AFTER `roleType`;

-- 为code字段添加唯一索引
ALTER TABLE `roles`
  ADD UNIQUE KEY `uk_code` (`code`);

-- 为status字段添加索引
ALTER TABLE `roles`
  ADD KEY `idx_status` (`status`);

-- 更新现有数据的code字段(使用name作为code)
UPDATE `roles` SET `code` = `name` WHERE `code` = '';

-- 更新现有数据的roleType字段
UPDATE `roles` SET `roleType` = IF(`is_system` = 1, 'system', 'custom');

-- 更新现有数据的data_scope字段(默认为all)
UPDATE `roles` SET `data_scope` = 'all';

-- 查看更新后的表结构
SHOW COLUMNS FROM `roles`;

-- 查看更新后的数据
SELECT id, name, code, status, level, roleType, data_scope FROM `roles`;
