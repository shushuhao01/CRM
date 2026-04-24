-- 公告表新增 source 和 target_tenants 字段
-- 用于区分系统公告（管理后台发布）和公司公告（租户内部发布）
-- 执行日期：2026-03-25

-- 新增 source 字段：system=系统公告, company=公司公告
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS `source` VARCHAR(20) DEFAULT 'company' COMMENT '公告来源: system=系统公告, company=公司公告'
AFTER `tenant_id`;

-- 新增 target_tenants 字段：系统公告指定的目标租户列表（JSON数组，null=全部租户）
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS `target_tenants` JSON DEFAULT NULL COMMENT '目标租户列表（系统公告用，null=全部租户）'
AFTER `target_departments`;

-- 为 source 字段添加索引
CREATE INDEX IF NOT EXISTS `idx_announcements_source` ON announcements(`source`);

-- 将现有公告全部标记为公司公告
UPDATE announcements SET `source` = 'company' WHERE `source` IS NULL OR `source` = '';

