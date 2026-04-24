-- =============================================
-- 增值管理和结算报表权限配置
-- 创建时间：2026-03-01
-- 说明：为增值管理和结算报表功能添加权限控制
-- =============================================

-- 1. 插入增值管理权限
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `path`, `sort`, `status`, `parentId`) VALUES
-- 一级菜单：财务管理（如果不存在）
('财务管理', 'finance', '财务管理模块', 'finance', 'menu', '/finance', 70, 'active', NULL),

-- 二级菜单：增值管理
('增值管理', 'finance.value_added', '增值管理菜单', 'finance', 'menu', '/finance/value-added-manage', 71, 'active', (SELECT id FROM permissions WHERE code = 'finance' LIMIT 1)),

-- 增值管理按钮权限
('查看增值订单', 'finance.value_added.view', '查看增值订单列表', 'finance', 'button', NULL, 711, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),
('创建增值订单', 'finance.value_added.create', '创建新的增值订单', 'finance', 'button', NULL, 712, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),
('编辑增值订单', 'finance.value_added.edit', '编辑增值订单信息', 'finance', 'button', NULL, 713, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),
('删除增值订单', 'finance.value_added.delete', '删除增值订单', 'finance', 'button', NULL, 714, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),
('批量操作订单', 'finance.value_added.batch', '批量处理增值订单', 'finance', 'button', NULL, 715, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),
('导出订单数据', 'finance.value_added.export', '导出增值订单数据', 'finance', 'button', NULL, 716, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),
('管理外包公司', 'finance.value_added.company', '管理外包公司信息', 'finance', 'button', NULL, 717, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),
('配置价格档位', 'finance.value_added.price_tier', '配置外包公司价格档位', 'finance', 'button', NULL, 718, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),
('配置状态选项', 'finance.value_added.status_config', '配置有效状态和结算状态选项', 'finance', 'button', NULL, 719, 'active', (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1)),

-- 二级菜单：结算报表
('结算报表', 'finance.settlement_report', '结算报表菜单', 'finance', 'menu', '/finance/settlement-report', 72, 'active', (SELECT id FROM permissions WHERE code = 'finance' LIMIT 1)),

-- 结算报表按钮权限
('查看结算报表', 'finance.settlement_report.view', '查看结算报表数据', 'finance', 'button', NULL, 721, 'active', (SELECT id FROM permissions WHERE code = 'finance.settlement_report' LIMIT 1)),
('导出报表数据', 'finance.settlement_report.export', '导出结算报表数据', 'finance', 'button', NULL, 722, 'active', (SELECT id FROM permissions WHERE code = 'finance.settlement_report' LIMIT 1)),
('查看统计图表', 'finance.settlement_report.charts', '查看结算统计图表', 'finance', 'button', NULL, 723, 'active', (SELECT id FROM permissions WHERE code = 'finance.settlement_report' LIMIT 1)),
('查看公司排名', 'finance.settlement_report.ranking', '查看公司结算排名', 'finance', 'button', NULL, 724, 'active', (SELECT id FROM permissions WHERE code = 'finance.settlement_report' LIMIT 1));

-- 2. 为超级管理员和管理员角色分配权限
-- 注意：这里假设 super_admin 和 admin 角色的 permissions 字段是 JSON 数组格式
-- 如果角色表使用的是关联表方式，需要调整为 INSERT INTO role_permissions

-- 查询需要添加的权限ID
SET @finance_id = (SELECT id FROM permissions WHERE code = 'finance' LIMIT 1);
SET @value_added_id = (SELECT id FROM permissions WHERE code = 'finance.value_added' LIMIT 1);
SET @settlement_report_id = (SELECT id FROM permissions WHERE code = 'finance.settlement_report' LIMIT 1);

-- 为超级管理员添加权限（如果使用关联表）
INSERT IGNORE INTO `role_permissions` (`roleId`, `permissionId`)
SELECT 'super_admin', id FROM permissions WHERE code LIKE 'finance.value_added%' OR code LIKE 'finance.settlement_report%';

-- 为管理员添加权限（如果使用关联表）
INSERT IGNORE INTO `role_permissions` (`roleId`, `permissionId`)
SELECT 'admin', id FROM permissions WHERE code LIKE 'finance.value_added%' OR code LIKE 'finance.settlement_report%';

-- 3. 创建权限树形结构闭包表记录（如果使用 closure-table）
-- 财务管理 -> 增值管理
INSERT IGNORE INTO `permissions_closure` (`id_ancestor`, `id_descendant`)
SELECT @finance_id, id FROM permissions WHERE code LIKE 'finance.value_added%';

-- 增值管理 -> 增值管理按钮权限
INSERT IGNORE INTO `permissions_closure` (`id_ancestor`, `id_descendant`)
SELECT @value_added_id, id FROM permissions WHERE code LIKE 'finance.value_added.%';

-- 财务管理 -> 结算报表
INSERT IGNORE INTO `permissions_closure` (`id_ancestor`, `id_descendant`)
SELECT @finance_id, id FROM permissions WHERE code LIKE 'finance.settlement_report%';

-- 结算报表 -> 结算报表按钮权限
INSERT IGNORE INTO `permissions_closure` (`id_ancestor`, `id_descendant`)
SELECT @settlement_report_id, id FROM permissions WHERE code LIKE 'finance.settlement_report.%';

-- 4. 验证权限是否插入成功
SELECT 
  id,
  name,
  code,
  module,
  type,
  path,
  sort,
  status
FROM permissions 
WHERE code LIKE 'finance.value_added%' OR code LIKE 'finance.settlement_report%'
ORDER BY sort;

-- =============================================
-- 执行说明：
-- 1. 本SQL适用于MySQL数据库
-- 2. 执行前请备份数据库
-- 3. 如果财务管理一级菜单已存在，第一条INSERT会失败，这是正常的
-- 4. 权限ID会自动生成，不需要手动指定
-- 5. 执行后需要清除用户权限缓存或重新登录
-- =============================================
