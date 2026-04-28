-- =============================================
-- CRM 权限系统完整迁移脚本（生产环境）
-- 包含：权限树数据 + 角色权限配置
-- 兼容：phpMyAdmin / MySQL 命令行
-- 直接复制粘贴执行即可
-- =============================================

-- =============================================
-- 第一部分：清空并插入256条权限树数据
-- =============================================

DELETE FROM `permissions`;
ALTER TABLE `permissions` AUTO_INCREMENT = 1;

-- 1. 数据看板
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(1, NULL, '数据看板', 'dashboard', '数据看板模块', 'dashboard', 'module', '/dashboard', 'Odometer', 1, 'active', NULL),
(2, NULL, '查看看板', 'dashboard.view', NULL, 'dashboard', 'action', NULL, NULL, 1, 'active', 1),
(3, NULL, '导出数据', 'dashboard.export', NULL, 'dashboard', 'action', NULL, NULL, 2, 'active', 1);

-- 2. 客户管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(4, NULL, '客户管理', 'customer', '客户管理模块', 'customer', 'module', '/customer', 'User', 2, 'active', NULL),
(5, NULL, '客户列表', 'customer.list', NULL, 'customer', 'menu', '/customer/list', 'List', 1, 'active', 4),
(6, NULL, '查看列表', 'customer.list.view', NULL, 'customer', 'action', NULL, NULL, 1, 'active', 5),
(7, NULL, '导出客户', 'customer.list.export', NULL, 'customer', 'action', NULL, NULL, 2, 'active', 5),
(8, NULL, '导入客户', 'customer.list.import', NULL, 'customer', 'action', NULL, NULL, 3, 'active', 5),
(9, NULL, '编辑客户', 'customer.list.edit', NULL, 'customer', 'action', NULL, NULL, 4, 'active', 5),
(10, NULL, '删除客户', 'customer.list.delete', NULL, 'customer', 'action', NULL, NULL, 5, 'active', 5),
(11, NULL, '分配客户', 'customer.list.assign', NULL, 'customer', 'action', NULL, NULL, 6, 'active', 5),
(12, NULL, '新增客户', 'customer.add', NULL, 'customer', 'menu', '/customer/add', 'Plus', 2, 'active', 4),
(13, NULL, '创建客户', 'customer.add.create', NULL, 'customer', 'action', NULL, NULL, 1, 'active', 12),
(14, NULL, '客户分组', 'customer.groups', NULL, 'customer', 'menu', '/customer/groups', 'Collection', 3, 'active', 4),
(15, NULL, '查看分组', 'customer.groups.view', NULL, 'customer', 'action', NULL, NULL, 1, 'active', 14),
(16, NULL, '新增分组', 'customer.groups.create', NULL, 'customer', 'action', NULL, NULL, 2, 'active', 14),
(17, NULL, '编辑分组', 'customer.groups.edit', NULL, 'customer', 'action', NULL, NULL, 3, 'active', 14),
(18, NULL, '删除分组', 'customer.groups.delete', NULL, 'customer', 'action', NULL, NULL, 4, 'active', 14),
(19, NULL, '客户标签', 'customer.tags', NULL, 'customer', 'menu', '/customer/tags', 'PriceTag', 4, 'active', 4),
(20, NULL, '查看标签', 'customer.tags.view', NULL, 'customer', 'action', NULL, NULL, 1, 'active', 19),
(21, NULL, '新增标签', 'customer.tags.create', NULL, 'customer', 'action', NULL, NULL, 2, 'active', 19),
(22, NULL, '编辑标签', 'customer.tags.edit', NULL, 'customer', 'action', NULL, NULL, 3, 'active', 19),
(23, NULL, '删除标签', 'customer.tags.delete', NULL, 'customer', 'action', NULL, NULL, 4, 'active', 19);

-- 3. 订单管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(24, NULL, '订单管理', 'order', '订单管理模块', 'order', 'module', '/order', 'ShoppingCart', 3, 'active', NULL),
(25, NULL, '订单列表', 'order.list', NULL, 'order', 'menu', '/order/list', 'List', 1, 'active', 24),
(26, NULL, '查看订单', 'order.list.view', NULL, 'order', 'action', NULL, NULL, 1, 'active', 25),
(27, NULL, '导出订单', 'order.list.export', NULL, 'order', 'action', NULL, NULL, 2, 'active', 25),
(28, NULL, '编辑订单', 'order.list.edit', NULL, 'order', 'action', NULL, NULL, 3, 'active', 25),
(29, NULL, '删除订单', 'order.list.delete', NULL, 'order', 'action', NULL, NULL, 4, 'active', 25),
(30, NULL, '取消订单', 'order.list.cancel', NULL, 'order', 'action', NULL, NULL, 5, 'active', 25),
(31, NULL, '新增订单', 'order.add', NULL, 'order', 'menu', '/order/add', 'Plus', 2, 'active', 24),
(32, NULL, '创建订单', 'order.add.create', NULL, 'order', 'action', NULL, NULL, 1, 'active', 31),
(33, NULL, '订单审核', 'order.audit', NULL, 'order', 'menu', '/order/audit', 'CircleCheck', 3, 'active', 24),
(34, NULL, '查看审核', 'order.audit.view', NULL, 'order', 'action', NULL, NULL, 1, 'active', 33),
(35, NULL, '通过审核', 'order.audit.approve', NULL, 'order', 'action', NULL, NULL, 2, 'active', 33),
(36, NULL, '拒绝审核', 'order.audit.reject', NULL, 'order', 'action', NULL, NULL, 3, 'active', 33),
(37, NULL, '批量审核', 'order.audit.batch', NULL, 'order', 'action', NULL, NULL, 4, 'active', 33),
(38, NULL, '取消代收申请', 'order.cod_application', NULL, 'order', 'menu', '/order/my-cod-application', 'DocumentRemove', 4, 'active', 24),
(39, NULL, '查看申请', 'order.cod_application.view', NULL, 'order', 'action', NULL, NULL, 1, 'active', 38),
(40, NULL, '创建申请', 'order.cod_application.create', NULL, 'order', 'action', NULL, NULL, 2, 'active', 38),
(41, NULL, '撤销申请', 'order.cod_application.cancel', NULL, 'order', 'action', NULL, NULL, 3, 'active', 38),
(42, NULL, '取消代收审核', 'order.cod_review', NULL, 'order', 'menu', '/order/cod-application-review', 'CircleCheck', 5, 'active', 24),
(43, NULL, '查看审核', 'order.cod_review.view', NULL, 'order', 'action', NULL, NULL, 1, 'active', 42),
(44, NULL, '通过审核', 'order.cod_review.approve', NULL, 'order', 'action', NULL, NULL, 2, 'active', 42),
(45, NULL, '拒绝审核', 'order.cod_review.reject', NULL, 'order', 'action', NULL, NULL, 3, 'active', 42),
(46, NULL, '批量审核', 'order.cod_review.batch', NULL, 'order', 'action', NULL, NULL, 4, 'active', 42);

-- 4. 服务管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(47, NULL, '服务管理', 'communication', '服务管理模块', 'communication', 'module', '/service-management', 'Headset', 4, 'active', NULL),
(48, NULL, '通话管理', 'communication.call', NULL, 'communication', 'menu', '/service-management/call', 'Phone', 1, 'active', 47),
(49, NULL, '查看通话记录', 'communication.call.view', NULL, 'communication', 'action', NULL, NULL, 1, 'active', 48),
(50, NULL, '发起通话', 'communication.call.make', NULL, 'communication', 'action', NULL, NULL, 2, 'active', 48),
(51, NULL, '录音管理', 'communication.call.record', NULL, 'communication', 'action', NULL, NULL, 3, 'active', 48),
(52, NULL, '短信管理', 'communication.sms', NULL, 'communication', 'menu', '/service-management/sms', 'Message', 2, 'active', 47),
(53, NULL, '查看短信记录', 'communication.sms.view', NULL, 'communication', 'action', NULL, NULL, 1, 'active', 52),
(54, NULL, '发送短信', 'communication.sms.send', NULL, 'communication', 'action', NULL, NULL, 2, 'active', 52),
(55, NULL, '模板管理', 'communication.sms.template', NULL, 'communication', 'action', NULL, NULL, 3, 'active', 52);

-- 5. 业绩统计
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(56, NULL, '业绩统计', 'performance', '业绩统计模块', 'performance', 'module', '/performance', 'TrendCharts', 5, 'active', NULL),
(57, NULL, '个人业绩', 'performance.personal', NULL, 'performance', 'menu', '/performance/personal', 'User', 1, 'active', 56),
(58, NULL, '查看个人业绩', 'performance.personal.view', NULL, 'performance', 'action', NULL, NULL, 1, 'active', 57),
(59, NULL, '导出个人数据', 'performance.personal.export', NULL, 'performance', 'action', NULL, NULL, 2, 'active', 57),
(60, NULL, '团队业绩', 'performance.team', NULL, 'performance', 'menu', '/performance/team', 'UserFilled', 2, 'active', 56),
(61, NULL, '查看团队业绩', 'performance.team.view', NULL, 'performance', 'action', NULL, NULL, 1, 'active', 60),
(62, NULL, '导出团队数据', 'performance.team.export', NULL, 'performance', 'action', NULL, NULL, 2, 'active', 60),
(63, NULL, '业绩分析', 'performance.analysis', NULL, 'performance', 'menu', '/performance/analysis', 'DataAnalysis', 3, 'active', 56),
(64, NULL, '查看分析', 'performance.analysis.view', NULL, 'performance', 'action', NULL, NULL, 1, 'active', 63),
(65, NULL, '导出分析', 'performance.analysis.export', NULL, 'performance', 'action', NULL, NULL, 2, 'active', 63),
(66, NULL, '业绩分享', 'performance.share', NULL, 'performance', 'menu', '/performance/share', 'Share', 4, 'active', 56),
(67, NULL, '查看分享', 'performance.share.view', NULL, 'performance', 'action', NULL, NULL, 1, 'active', 66),
(68, NULL, '创建分享', 'performance.share.create', NULL, 'performance', 'action', NULL, NULL, 2, 'active', 66),
(69, NULL, '管理分享', 'performance.share.manage', NULL, 'performance', 'action', NULL, NULL, 3, 'active', 66);

-- 6. 物流管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(70, NULL, '物流管理', 'logistics', '物流管理模块', 'logistics', 'module', '/logistics', 'Van', 6, 'active', NULL),
(71, NULL, '发货列表', 'logistics.shipping', NULL, 'logistics', 'menu', '/logistics/shipping', 'Box', 1, 'active', 70),
(72, NULL, '查看发货', 'logistics.shipping.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 71),
(73, NULL, '创建发货', 'logistics.shipping.create', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 71),
(74, NULL, '编辑发货', 'logistics.shipping.edit', NULL, 'logistics', 'action', NULL, NULL, 3, 'active', 71),
(75, NULL, '导出发货', 'logistics.shipping.export', NULL, 'logistics', 'action', NULL, NULL, 4, 'active', 71),
(76, NULL, '物流列表', 'logistics.list', NULL, 'logistics', 'menu', '/logistics/list', 'List', 2, 'active', 70),
(77, NULL, '查看物流', 'logistics.list.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 76),
(78, NULL, '导出物流', 'logistics.list.export', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 76),
(79, NULL, '物流跟踪', 'logistics.track', NULL, 'logistics', 'menu', '/logistics/track', 'Position', 3, 'active', 70),
(80, NULL, '查看跟踪', 'logistics.track.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 79),
(81, NULL, '更新跟踪', 'logistics.track.update', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 79),
(82, NULL, '状态更新', 'logistics.status', NULL, 'logistics', 'menu', '/logistics/status-update', 'Refresh', 4, 'active', 70),
(83, NULL, '查看状态', 'logistics.status.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 82),
(84, NULL, '更新状态', 'logistics.status.update', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 82),
(85, NULL, '批量更新', 'logistics.status.batch', NULL, 'logistics', 'action', NULL, NULL, 3, 'active', 82),
(86, NULL, '物流公司', 'logistics.companies', NULL, 'logistics', 'menu', '/logistics/companies', 'OfficeBuilding', 5, 'active', 70),
(87, NULL, '查看公司', 'logistics.companies.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 86),
(88, NULL, '新增公司', 'logistics.companies.create', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 86),
(89, NULL, '编辑公司', 'logistics.companies.edit', NULL, 'logistics', 'action', NULL, NULL, 3, 'active', 86);

-- 7. 售后管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(90, NULL, '售后管理', 'aftersale', '售后管理模块', 'aftersale', 'module', '/service', 'Tools', 7, 'active', NULL),
(91, NULL, '售后订单', 'aftersale.list', NULL, 'aftersale', 'menu', '/service/list', 'List', 1, 'active', 90),
(92, NULL, '查看售后', 'aftersale.list.view', NULL, 'aftersale', 'action', NULL, NULL, 1, 'active', 91),
(93, NULL, '导出售后', 'aftersale.list.export', NULL, 'aftersale', 'action', NULL, NULL, 2, 'active', 91),
(94, NULL, '编辑售后', 'aftersale.list.edit', NULL, 'aftersale', 'action', NULL, NULL, 3, 'active', 91),
(95, NULL, '删除售后', 'aftersale.list.delete', NULL, 'aftersale', 'action', NULL, NULL, 4, 'active', 91),
(96, NULL, '新建售后', 'aftersale.add', NULL, 'aftersale', 'menu', '/service/add', 'Plus', 2, 'active', 90),
(97, NULL, '创建售后', 'aftersale.add.create', NULL, 'aftersale', 'action', NULL, NULL, 1, 'active', 96),
(98, NULL, '售后数据', 'aftersale.data', NULL, 'aftersale', 'menu', '/service/data', 'DataAnalysis', 3, 'active', 90),
(99, NULL, '查看数据', 'aftersale.data.view', NULL, 'aftersale', 'action', NULL, NULL, 1, 'active', 98),
(100, NULL, '导出数据', 'aftersale.data.export', NULL, 'aftersale', 'action', NULL, NULL, 2, 'active', 98);

-- 8. 资料管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(101, NULL, '资料管理', 'data', '资料管理模块', 'data', 'module', '/data', 'Files', 8, 'active', NULL),
(102, NULL, '资料列表', 'data.list', NULL, 'data', 'menu', '/data/list', 'List', 1, 'active', 101),
(103, NULL, '查看列表', 'data.list.view', NULL, 'data', 'action', NULL, NULL, 1, 'active', 102),
(104, NULL, '导出资料', 'data.list.export', NULL, 'data', 'action', NULL, NULL, 2, 'active', 102),
(105, NULL, '导入资料', 'data.list.import', NULL, 'data', 'action', NULL, NULL, 3, 'active', 102),
(106, NULL, '分配资料', 'data.list.assign', NULL, 'data', 'action', NULL, NULL, 4, 'active', 102),
(107, NULL, '客户查询', 'data.search', NULL, 'data', 'menu', '/data/search', 'Search', 2, 'active', 101),
(108, NULL, '基础查询', 'data.search.basic', NULL, 'data', 'action', NULL, NULL, 1, 'active', 107),
(109, NULL, '高级查询', 'data.search.advanced', NULL, 'data', 'action', NULL, NULL, 2, 'active', 107),
(110, NULL, '导出结果', 'data.search.export', NULL, 'data', 'action', NULL, NULL, 3, 'active', 107),
(111, NULL, '回收站', 'data.recycle', NULL, 'data', 'menu', '/data/recycle', 'Delete', 3, 'active', 101),
(112, NULL, '查看回收站', 'data.recycle.view', NULL, 'data', 'action', NULL, NULL, 1, 'active', 111),
(113, NULL, '恢复数据', 'data.recycle.restore', NULL, 'data', 'action', NULL, NULL, 2, 'active', 111),
(114, NULL, '彻底删除', 'data.recycle.delete', NULL, 'data', 'action', NULL, NULL, 3, 'active', 111);

-- 9. 商品管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(115, NULL, '商品管理', 'product', '商品管理模块', 'product', 'module', '/product', 'Box', 9, 'active', NULL),
(116, NULL, '商品列表', 'product.list', NULL, 'product', 'menu', '/product/list', 'List', 1, 'active', 115),
(117, NULL, '查看商品', 'product.list.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 116),
(118, NULL, '导出商品', 'product.list.export', NULL, 'product', 'action', NULL, NULL, 2, 'active', 116),
(119, NULL, '导入商品', 'product.list.import', NULL, 'product', 'action', NULL, NULL, 3, 'active', 116),
(120, NULL, '编辑商品', 'product.list.edit', NULL, 'product', 'action', NULL, NULL, 4, 'active', 116),
(121, NULL, '删除商品', 'product.list.delete', NULL, 'product', 'action', NULL, NULL, 5, 'active', 116),
(122, NULL, '新增商品', 'product.add', NULL, 'product', 'menu', '/product/add', 'Plus', 2, 'active', 115),
(123, NULL, '创建商品', 'product.add.create', NULL, 'product', 'action', NULL, NULL, 1, 'active', 122),
(124, NULL, '库存管理', 'product.inventory', NULL, 'product', 'menu', '/product/inventory', 'Box', 3, 'active', 115),
(125, NULL, '查看库存', 'product.inventory.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 124),
(126, NULL, '库存调整', 'product.inventory.adjust', NULL, 'product', 'action', NULL, NULL, 2, 'active', 124),
(127, NULL, '导出库存', 'product.inventory.export', NULL, 'product', 'action', NULL, NULL, 3, 'active', 124),
(128, NULL, '导入库存', 'product.inventory.import', NULL, 'product', 'action', NULL, NULL, 4, 'active', 124),
(129, NULL, '商品分类', 'product.category', NULL, 'product', 'menu', '/product/category', 'Collection', 4, 'active', 115),
(130, NULL, '查看分类', 'product.category.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 129),
(131, NULL, '新增分类', 'product.category.create', NULL, 'product', 'action', NULL, NULL, 2, 'active', 129),
(132, NULL, '编辑分类', 'product.category.edit', NULL, 'product', 'action', NULL, NULL, 3, 'active', 129),
(133, NULL, '删除分类', 'product.category.delete', NULL, 'product', 'action', NULL, NULL, 4, 'active', 129),
(134, NULL, '商品分析', 'product.analytics', NULL, 'product', 'menu', '/product/analytics', 'DataAnalysis', 5, 'active', 115),
(135, NULL, '查看分析', 'product.analytics.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 134),
(136, NULL, '导出分析', 'product.analytics.export', NULL, 'product', 'action', NULL, NULL, 2, 'active', 134),
(137, NULL, '卡密库存', 'product.virtual_keys', NULL, 'product', 'menu', '/product/virtual/card-keys', 'Key', 6, 'active', 115),
(138, NULL, '查看卡密', 'product.virtual_keys.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 137),
(139, NULL, '新增卡密', 'product.virtual_keys.create', NULL, 'product', 'action', NULL, NULL, 2, 'active', 137),
(140, NULL, '编辑卡密', 'product.virtual_keys.edit', NULL, 'product', 'action', NULL, NULL, 3, 'active', 137),
(141, NULL, '删除卡密', 'product.virtual_keys.delete', NULL, 'product', 'action', NULL, NULL, 4, 'active', 137),
(142, NULL, '导入卡密', 'product.virtual_keys.import', NULL, 'product', 'action', NULL, NULL, 5, 'active', 137),
(143, NULL, '导出卡密', 'product.virtual_keys.export', NULL, 'product', 'action', NULL, NULL, 6, 'active', 137),
(144, NULL, '资源库存', 'product.virtual_resources', NULL, 'product', 'menu', '/product/virtual/resources', 'FolderOpened', 7, 'active', 115),
(145, NULL, '查看资源', 'product.virtual_resources.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 144),
(146, NULL, '新增资源', 'product.virtual_resources.create', NULL, 'product', 'action', NULL, NULL, 2, 'active', 144),
(147, NULL, '编辑资源', 'product.virtual_resources.edit', NULL, 'product', 'action', NULL, NULL, 3, 'active', 144),
(148, NULL, '删除资源', 'product.virtual_resources.delete', NULL, 'product', 'action', NULL, NULL, 4, 'active', 144),
(149, NULL, '导入资源', 'product.virtual_resources.import', NULL, 'product', 'action', NULL, NULL, 5, 'active', 144),
(150, NULL, '导出资源', 'product.virtual_resources.export', NULL, 'product', 'action', NULL, NULL, 6, 'active', 144);

-- 10. 财务管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(151, NULL, '财务管理', 'finance', '财务管理模块', 'finance', 'module', '/finance', 'Money', 10, 'active', NULL),
(152, NULL, '绩效数据', 'finance.performance_data', NULL, 'finance', 'menu', '/finance/performance-data', 'DataLine', 1, 'active', 151),
(153, NULL, '查看绩效数据', 'finance.performance_data.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 152),
(154, NULL, '绩效管理', 'finance.performance_manage', NULL, 'finance', 'menu', '/finance/performance-manage', 'Setting', 2, 'active', 151),
(155, NULL, '查看绩效管理', 'finance.performance_manage.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 154),
(156, NULL, '编辑绩效', 'finance.performance_manage.edit', NULL, 'finance', 'action', NULL, NULL, 2, 'active', 154),
(157, NULL, '配置管理', 'finance.performance_manage.config', NULL, 'finance', 'action', NULL, NULL, 3, 'active', 154),
(158, NULL, '代收管理', 'finance.cod_collection', NULL, 'finance', 'menu', '/finance/cod-collection', 'Wallet', 3, 'active', 151),
(159, NULL, '查看代收', 'finance.cod_collection.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 158),
(160, NULL, '导出代收', 'finance.cod_collection.export', NULL, 'finance', 'action', NULL, NULL, 2, 'active', 158),
(161, NULL, '编辑代收', 'finance.cod_collection.edit', NULL, 'finance', 'action', NULL, NULL, 3, 'active', 158),
(162, NULL, '返款操作', 'finance.cod_collection.refund', NULL, 'finance', 'action', NULL, NULL, 4, 'active', 158),
(163, NULL, '增值管理', 'finance.value_added', NULL, 'finance', 'menu', '/finance/value-added-manage', 'Coin', 4, 'active', 151),
(164, NULL, '查看增值列表', 'finance.value_added.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 163),
(165, NULL, '新增增值', 'finance.value_added.create', NULL, 'finance', 'action', NULL, NULL, 2, 'active', 163),
(166, NULL, '编辑增值', 'finance.value_added.edit', NULL, 'finance', 'action', NULL, NULL, 3, 'active', 163),
(167, NULL, '删除增值', 'finance.value_added.delete', NULL, 'finance', 'action', NULL, NULL, 4, 'active', 163),
(168, NULL, '批量操作', 'finance.value_added.batch', NULL, 'finance', 'action', NULL, NULL, 5, 'active', 163),
(169, NULL, '导出数据', 'finance.value_added.export', NULL, 'finance', 'action', NULL, NULL, 6, 'active', 163),
(170, NULL, '外包公司管理', 'finance.value_added.company', NULL, 'finance', 'action', NULL, NULL, 7, 'active', 163),
(171, NULL, '价格档位管理', 'finance.value_added.price_tier', NULL, 'finance', 'action', NULL, NULL, 8, 'active', 163),
(172, NULL, '状态配置管理', 'finance.value_added.status_config', NULL, 'finance', 'action', NULL, NULL, 9, 'active', 163),
(173, NULL, '结算报表', 'finance.settlement_report', NULL, 'finance', 'menu', '/finance/settlement-report', 'Document', 5, 'active', 151),
(174, NULL, '查看报表', 'finance.settlement_report.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 173),
(175, NULL, '导出报表', 'finance.settlement_report.export', NULL, 'finance', 'action', NULL, NULL, 2, 'active', 173),
(176, NULL, '查看图表', 'finance.settlement_report.charts', NULL, 'finance', 'action', NULL, NULL, 3, 'active', 173),
(177, NULL, '查看排名', 'finance.settlement_report.ranking', NULL, 'finance', 'action', NULL, NULL, 4, 'active', 173);

-- 11. 企微管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(178, NULL, '企微管理', 'wecom', '企微管理模块', 'wecom', 'module', '/wecom', 'ChatDotRound', 10, 'active', NULL),
(179, NULL, '通讯录', 'wecom.address_book', NULL, 'wecom', 'menu', '/wecom/address-book', 'Notebook', 1, 'active', 178),
(180, NULL, '查看通讯录', 'wecom.address_book.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 179),
(181, NULL, '同步通讯录', 'wecom.address_book.sync', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 179),
(182, NULL, '企微客户', 'wecom.customer', NULL, 'wecom', 'menu', '/wecom/customer', 'User', 2, 'active', 178),
(183, NULL, '查看企微客户', 'wecom.customer.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 182),
(184, NULL, '导出企微客户', 'wecom.customer.export', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 182),
(185, NULL, '同步企微客户', 'wecom.customer.sync', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 182),
(186, NULL, '客户群', 'wecom.customer_group', NULL, 'wecom', 'menu', '/wecom/customer-group', 'UserFilled', 3, 'active', 178),
(187, NULL, '查看客户群', 'wecom.customer_group.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 186),
(188, NULL, '导出客户群', 'wecom.customer_group.export', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 186),
(189, NULL, '同步客户群', 'wecom.customer_group.sync', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 186),
(190, NULL, '获客助手', 'wecom.acquisition', NULL, 'wecom', 'menu', '/wecom/acquisition', 'Promotion', 4, 'active', 178),
(191, NULL, '查看获客助手', 'wecom.acquisition.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 190),
(192, NULL, '创建获客链接', 'wecom.acquisition.create', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 190),
(193, NULL, '编辑获客链接', 'wecom.acquisition.edit', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 190),
(194, NULL, '删除获客链接', 'wecom.acquisition.delete', NULL, 'wecom', 'action', NULL, NULL, 4, 'active', 190),
(195, NULL, '活码管理', 'wecom.contact_way', NULL, 'wecom', 'menu', '/wecom/contact-way', 'Connection', 5, 'active', 178),
(196, NULL, '查看活码', 'wecom.contact_way.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 195),
(197, NULL, '创建活码', 'wecom.contact_way.create', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 195),
(198, NULL, '编辑活码', 'wecom.contact_way.edit', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 195),
(199, NULL, '删除活码', 'wecom.contact_way.delete', NULL, 'wecom', 'action', NULL, NULL, 4, 'active', 195),
(200, NULL, '会话存档', 'wecom.chat_archive', NULL, 'wecom', 'menu', '/wecom/chat-archive', 'ChatLineSquare', 6, 'active', 178),
(201, NULL, '查看会话存档', 'wecom.chat_archive.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 200),
(202, NULL, '查看全部存档', 'wecom.chat_archive.view_all', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 200),
(203, NULL, '导出会话记录', 'wecom.chat_archive.export', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 200),
(204, NULL, '微信客服', 'wecom.service', NULL, 'wecom', 'menu', '/wecom/service', 'Service', 7, 'active', 178),
(205, NULL, '查看微信客服', 'wecom.service.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 204),
(206, NULL, '配置微信客服', 'wecom.service.config', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 204),
(207, NULL, 'AI助手', 'wecom.ai_assistant', NULL, 'wecom', 'menu', '/wecom/ai-assistant', 'MagicStick', 8, 'active', 178),
(208, NULL, '查看AI助手', 'wecom.ai_assistant.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 207),
(209, NULL, '配置AI助手', 'wecom.ai_assistant.config', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 207),
(210, NULL, '侧边栏', 'wecom.sidebar', NULL, 'wecom', 'menu', '/wecom/sidebar', 'Operation', 9, 'active', 178),
(211, NULL, '查看侧边栏', 'wecom.sidebar.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 210),
(212, NULL, '配置侧边栏', 'wecom.sidebar.config', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 210),
(213, NULL, '对外收款', 'wecom.payment', NULL, 'wecom', 'menu', '/wecom/payment', 'Wallet', 10, 'active', 178),
(214, NULL, '查看收款记录', 'wecom.payment.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 213),
(215, NULL, '创建收款', 'wecom.payment.create', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 213),
(216, NULL, '导出收款记录', 'wecom.payment.export', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 213),
(217, NULL, '企微授权', 'wecom.config', NULL, 'wecom', 'menu', '/wecom/config', 'Setting', 11, 'active', 178),
(218, NULL, '查看授权配置', 'wecom.config.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 217),
(219, NULL, '编辑授权配置', 'wecom.config.edit', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 217);

-- 12. 系统管理
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
(220, NULL, '系统管理', 'system', '系统管理模块', 'system', 'module', '/system', 'Setting', 11, 'active', NULL),
(221, NULL, '部门管理', 'system.departments', NULL, 'system', 'menu', '/system/departments', 'OfficeBuilding', 1, 'active', 220),
(222, NULL, '查看部门', 'system.departments.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 221),
(223, NULL, '创建部门', 'system.departments.create', NULL, 'system', 'action', NULL, NULL, 2, 'active', 221),
(224, NULL, '编辑部门', 'system.departments.edit', NULL, 'system', 'action', NULL, NULL, 3, 'active', 221),
(225, NULL, '删除部门', 'system.departments.delete', NULL, 'system', 'action', NULL, NULL, 4, 'active', 221),
(226, NULL, '管理成员', 'system.departments.members', NULL, 'system', 'action', NULL, NULL, 5, 'active', 221),
(227, NULL, '用户管理', 'system.users', NULL, 'system', 'menu', '/system/users', 'User', 2, 'active', 220),
(228, NULL, '查看用户', 'system.users.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 227),
(229, NULL, '创建用户', 'system.users.create', NULL, 'system', 'action', NULL, NULL, 2, 'active', 227),
(230, NULL, '编辑用户', 'system.users.edit', NULL, 'system', 'action', NULL, NULL, 3, 'active', 227),
(231, NULL, '删除用户', 'system.users.delete', NULL, 'system', 'action', NULL, NULL, 4, 'active', 227),
(232, NULL, '重置密码', 'system.users.reset_password', NULL, 'system', 'action', NULL, NULL, 5, 'active', 227),
(233, NULL, '导出用户', 'system.users.export', NULL, 'system', 'action', NULL, NULL, 6, 'active', 227),
(234, NULL, '导入用户', 'system.users.import', NULL, 'system', 'action', NULL, NULL, 7, 'active', 227),
(235, NULL, '角色权限', 'system.roles', NULL, 'system', 'menu', '/system/roles', 'Key', 3, 'active', 220),
(236, NULL, '查看角色', 'system.roles.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 235),
(237, NULL, '创建角色', 'system.roles.create', NULL, 'system', 'action', NULL, NULL, 2, 'active', 235),
(238, NULL, '编辑角色', 'system.roles.edit', NULL, 'system', 'action', NULL, NULL, 3, 'active', 235),
(239, NULL, '删除角色', 'system.roles.delete', NULL, 'system', 'action', NULL, NULL, 4, 'active', 235),
(240, NULL, '分配权限', 'system.roles.assign_permissions', NULL, 'system', 'action', NULL, NULL, 5, 'active', 235),
(241, NULL, '权限管理', 'system.permissions', NULL, 'system', 'menu', '/system/permissions', 'Lock', 4, 'active', 220),
(242, NULL, '查看权限', 'system.permissions.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 241),
(243, NULL, '编辑权限', 'system.permissions.edit', NULL, 'system', 'action', NULL, NULL, 2, 'active', 241),
(244, NULL, '超管面板', 'system.super_admin_panel', NULL, 'system', 'menu', '/system/super-admin-panel', 'Monitor', 5, 'active', 220),
(245, NULL, '查看面板', 'system.super_admin_panel.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 244),
(246, NULL, '管理系统', 'system.super_admin_panel.manage', NULL, 'system', 'action', NULL, NULL, 2, 'active', 244),
(247, NULL, '客服管理', 'system.customer_service_permissions', NULL, 'system', 'menu', '/system/customer-service-permissions', 'Service', 6, 'active', 220),
(248, NULL, '查看客服', 'system.customer_service_permissions.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 247),
(249, NULL, '管理客服', 'system.customer_service_permissions.manage', NULL, 'system', 'action', NULL, NULL, 2, 'active', 247),
(250, NULL, '消息管理', 'system.message_management', NULL, 'system', 'menu', '/system/message-management', 'Bell', 7, 'active', 220),
(251, NULL, '查看消息', 'system.message_management.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 250),
(252, NULL, '发送消息', 'system.message_management.send', NULL, 'system', 'action', NULL, NULL, 2, 'active', 250),
(253, NULL, '管理消息', 'system.message_management.manage', NULL, 'system', 'action', NULL, NULL, 3, 'active', 250),
(254, NULL, '系统设置', 'system.settings', NULL, 'system', 'menu', '/system/settings', 'Tools', 8, 'active', 220),
(255, NULL, '查看设置', 'system.settings.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 254),
(256, NULL, '修改设置', 'system.settings.edit', NULL, 'system', 'action', NULL, NULL, 2, 'active', 254);

ALTER TABLE `permissions` AUTO_INCREMENT = 300;

-- =============================================
-- 第二部分：更新各角色的权限配置
-- 说明：super_admin和admin使用通配符"*"，无需更新
-- =============================================

-- 部门经理（70个权限，data_scope=department）
UPDATE `roles` SET `permissions` = JSON_ARRAY(
  'dashboard', 'dashboard.view', 'dashboard.export',
  'customer', 'customer.list', 'customer.list.view', 'customer.list.edit', 'customer.list.export', 'customer.list.import',
  'customer.add', 'customer.add.create',
  'order', 'order.list', 'order.list.view', 'order.list.edit',
  'order.add', 'order.add.create',
  'order.cod_application', 'order.cod_application.view', 'order.cod_application.create',
  'communication', 'communication.call', 'communication.call.view', 'communication.call.make', 'communication.call.record',
  'performance', 'performance.personal', 'performance.personal.view',
  'performance.team', 'performance.team.view',
  'performance.analysis', 'performance.analysis.view',
  'performance.share', 'performance.share.view',
  'logistics', 'logistics.list', 'logistics.list.view',
  'logistics.track', 'logistics.track.view',
  'aftersale', 'aftersale.list', 'aftersale.list.view',
  'aftersale.add', 'aftersale.add.create',
  'aftersale.data', 'aftersale.data.view',
  'data', 'data.search', 'data.search.basic', 'data.search.advanced',
  'finance', 'finance.performance_data', 'finance.performance_data.view',
  'wecom', 'wecom.customer', 'wecom.customer.view',
  'wecom.customer_group', 'wecom.customer_group.view',
  'wecom.chat_archive', 'wecom.chat_archive.view',
  'wecom.acquisition', 'wecom.acquisition.view', 'wecom.acquisition.create', 'wecom.acquisition.edit', 'wecom.acquisition.delete',
  'wecom.contact_way', 'wecom.contact_way.view', 'wecom.contact_way.create', 'wecom.contact_way.edit', 'wecom.contact_way.delete'
) WHERE `id` = 'department_manager';

-- 销售员（48个权限，data_scope=self）
UPDATE `roles` SET `permissions` = JSON_ARRAY(
  'dashboard', 'dashboard.view',
  'customer', 'customer.list', 'customer.list.view',
  'customer.add', 'customer.add.create',
  'order', 'order.list', 'order.list.view', 'order.list.edit',
  'order.add', 'order.add.create',
  'order.cod_application', 'order.cod_application.view', 'order.cod_application.create',
  'communication', 'communication.call', 'communication.call.view', 'communication.call.make',
  'performance', 'performance.personal', 'performance.personal.view',
  'performance.team', 'performance.team.view',
  'logistics', 'logistics.list', 'logistics.list.view',
  'logistics.track', 'logistics.track.view',
  'aftersale', 'aftersale.list', 'aftersale.list.view',
  'aftersale.add', 'aftersale.add.create',
  'data', 'data.search', 'data.search.basic',
  'finance', 'finance.performance_data', 'finance.performance_data.view',
  'wecom', 'wecom.customer', 'wecom.customer.view',
  'wecom.customer_group', 'wecom.customer_group.view',
  'wecom.chat_archive', 'wecom.chat_archive.view'
) WHERE `id` = 'sales_staff';

-- 客服（36个权限，data_scope=self）
UPDATE `roles` SET `permissions` = JSON_ARRAY(
  'dashboard', 'dashboard.view',
  'order', 'order.audit', 'order.audit.view', 'order.audit.approve', 'order.audit.reject',
  'logistics', 'logistics.list', 'logistics.list.view',
  'logistics.shipping', 'logistics.shipping.view', 'logistics.shipping.create',
  'logistics.track', 'logistics.track.view', 'logistics.track.update',
  'logistics.status', 'logistics.status.view', 'logistics.status.update',
  'aftersale', 'aftersale.list', 'aftersale.list.view', 'aftersale.list.edit', 'aftersale.list.delete', 'aftersale.list.export',
  'aftersale.add', 'aftersale.add.create',
  'aftersale.data', 'aftersale.data.view', 'aftersale.data.export',
  'data', 'data.list', 'data.list.view',
  'data.search', 'data.search.basic', 'data.search.advanced'
) WHERE `id` = 'customer_service';

-- =============================================
-- 第三部分：验证
-- =============================================

SELECT '权限表总数' AS item, COUNT(*) AS value FROM `permissions`
UNION ALL
SELECT 'module类型', COUNT(*) FROM `permissions` WHERE `type` = 'module'
UNION ALL
SELECT 'menu类型', COUNT(*) FROM `permissions` WHERE `type` = 'menu'
UNION ALL
SELECT 'action类型', COUNT(*) FROM `permissions` WHERE `type` = 'action';

SELECT `id`, `name`, `data_scope`, LENGTH(`permissions`) AS perm_len FROM `roles` ORDER BY `id`;
