-- ==========================================
-- 云客 CRM 演示环境种子数据
-- ==========================================
-- 使用方式:
--   1. 先在管理后台创建演示租户，获取 tenant_id
--   2. 全局替换 __TENANT_ID__ 为实际的租户ID
--   3. 执行: mysql -u root -p crm_db < demo-seed-data.sql
--   4. 每日重置: 先执行下方 DELETE 语句清除旧数据，再执行 INSERT
--
-- 密码说明:
--   所有演示账号密码统一为 demo123
--   bcrypt hash (rounds=12): $2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy
--   ✅ 已替换完成，所有演示账号密码均为 demo123
--
-- 演示数据每日重置脚本（crontab）:
--   0 3 * * * mysql -u root -p'密码' crm_db < /path/to/demo-seed-data.sql

-- ==========================================
-- 第0步：清除旧演示数据（重置时使用）
-- ==========================================
SET @tid = 'bf5385e4-e7fb-4ff3-8ac1-1f5e1330662c';

DELETE FROM `orders` WHERE `tenant_id` = @tid;
DELETE FROM `customers` WHERE `tenant_id` = @tid;
DELETE FROM `products` WHERE `tenant_id` = @tid;
DELETE FROM `users` WHERE `tenant_id` = @tid;
DELETE FROM `departments` WHERE `tenant_id` = @tid;
DELETE FROM `roles` WHERE `id` IN ('demo_super_admin','demo_admin','demo_dept_mgr','demo_sales','demo_cs') AND `tenant_id` = @tid;

-- ==========================================
-- 第1步：部门
-- ==========================================
INSERT INTO `departments` (`id`, `tenant_id`, `name`, `description`, `parent_id`, `level`, `sort_order`, `member_count`) VALUES
('demo_dept_mgmt', @tid, '管理层',   '公司管理层',           NULL, 1, 1, 2),
('demo_dept_sales', @tid, '销售部',   '负责产品销售和客户维护', NULL, 1, 2, 4),
('demo_dept_cs',    @tid, '客服部',   '负责客户服务和售后支持', NULL, 1, 3, 2);

-- ==========================================
-- 第2步：角色（演示租户专用，复制系统模板）
-- ==========================================
-- 注意：如果你的系统角色是全局共享的（无 tenant_id），可跳过此步，直接引用系统默认角色ID
-- 下面使用系统默认角色ID: super_admin, admin, department_manager, sales_staff, customer_service

-- ==========================================
-- 第3步：用户（5个角色 × 2个账号 = 10个用户）
-- ==========================================
-- ✅ 密码已替换为 bcrypt hash of 'demo123'

INSERT INTO `users` (`id`, `tenant_id`, `username`, `password`, `name`, `real_name`, `phone`, `role`, `role_id`, `department_id`, `department_name`, `position`, `status`, `need_change_password`, `password_last_changed`, `created_at`) VALUES
-- 超级管理员 ×2
('demo_u01', @tid, 'demo',       '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '张总',   '张总',   '13800000001', 'super_admin',       'super_admin',       'demo_dept_mgmt',  '管理层', '总经理',   'active', 0, NOW(), NOW()),
('demo_u02', @tid, 'demo_admin2','$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '李副总', '李副总', '13800000002', 'super_admin',       'super_admin',       'demo_dept_mgmt',  '管理层', '副总经理', 'active', 0, NOW(), NOW()),
-- 管理员 ×2
('demo_u03', @tid, 'admin1',     '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '王经理', '王经理', '13800000003', 'admin',             'admin',             'demo_dept_sales', '销售部', '销售总监', 'active', 0, NOW(), NOW()),
('demo_u04', @tid, 'admin2',     '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '赵经理', '赵经理', '13800000004', 'admin',             'admin',             'demo_dept_cs',    '客服部', '客服主管', 'active', 0, NOW(), NOW()),
-- 部门经理 ×2
('demo_u05', @tid, 'manager1',   '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '刘组长', '刘组长', '13800000005', 'department_manager', 'department_manager', 'demo_dept_sales', '销售部', '销售组长', 'active', 0, NOW(), NOW()),
('demo_u06', @tid, 'manager2',   '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '陈组长', '陈组长', '13800000006', 'department_manager', 'department_manager', 'demo_dept_sales', '销售部', '销售组长', 'active', 0, NOW(), NOW()),
-- 销售员 ×2
('demo_u07', @tid, 'sales1',     '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '孙小美', '孙小美', '13800000007', 'sales_staff',       'sales_staff',       'demo_dept_sales', '销售部', '销售专员', 'active', 0, NOW(), NOW()),
('demo_u08', @tid, 'sales2',     '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '周小明', '周小明', '13800000008', 'sales_staff',       'sales_staff',       'demo_dept_sales', '销售部', '销售专员', 'active', 0, NOW(), NOW()),
-- 客服 ×2
('demo_u09', @tid, 'service1',   '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '吴客服', '吴客服', '13800000009', 'customer_service',  'customer_service',  'demo_dept_cs',    '客服部', '客服专员', 'active', 0, NOW(), NOW()),
('demo_u10', @tid, 'service2',   '$2a$12$ZODzalB68J.TAUd6//2pS.F4MeErf.V5l6hr.9EiTilcFuSsWk5hy', '郑客服', '郑客服', '13800000010', 'customer_service',  'customer_service',  'demo_dept_cs',    '客服部', '客服专员', 'active', 0, NOW(), NOW());

-- ==========================================
-- 第4步：商品（6个实物 + 4个虚拟）
-- ==========================================
INSERT INTO `products` (`id`, `tenant_id`, `code`, `name`, `category_name`, `description`, `price`, `cost_price`, `stock`, `unit`, `status`, `product_type`, `virtual_delivery_type`, `card_key_template`, `resource_link_template`, `created_by`, `created_at`) VALUES
-- 实物商品（大健康类）
('demo_p01', @tid, 'HBL-001', '康宝莱蛋白混合饮料（香草味）',       '营养奶昔',   '富含优质蛋白质，低热量代餐，适合体重管理', 298.00, 150.00, 500, '罐', 'active', 'physical', NULL, NULL, NULL, 'demo_u01', NOW()),
('demo_p02', @tid, 'HBL-002', '康宝莱蛋白混合饮料（巧克力味）',     '营养奶昔',   '巧克力风味，富含膳食纤维和多种维生素',       298.00, 150.00, 300, '罐', 'active', 'physical', NULL, NULL, NULL, 'demo_u01', NOW()),
('demo_p03', @tid, 'HBL-003', '康宝莱多种维生素矿物质片',           '维生素补充', '全面补充每日所需维生素和矿物质',             168.00,  80.00, 800, '瓶', 'active', 'physical', NULL, NULL, NULL, 'demo_u01', NOW()),
('demo_p04', @tid, 'HBL-004', '胶原蛋白肽果味饮品',                 '美容保健',   '深海鱼胶原蛋白，搭配维C促进吸收',           388.00, 180.00, 200, '盒', 'active', 'physical', NULL, NULL, NULL, 'demo_u01', NOW()),
('demo_p05', @tid, 'HBL-005', '益生菌固体饮料',                     '肠道健康',   '100亿活性益生菌，改善肠道菌群平衡',          258.00, 120.00, 400, '盒', 'active', 'physical', NULL, NULL, NULL, 'demo_u01', NOW()),
('demo_p06', @tid, 'HBL-006', '左旋肉碱运动营养饮',                 '运动营养',   '运动前饮用，促进脂肪代谢',                   188.00,  90.00, 600, '盒', 'active', 'physical', NULL, NULL, NULL, 'demo_u01', NOW()),
-- 虚拟商品
('demo_p07', @tid, 'VIP-001', '健康管理VIP年卡',                    '会员服务',   '12个月一对一营养师指导+定制食谱+社群答疑',   1980.00, 500.00, 9999, '张', 'active', 'virtual', 'card_key',      '激活码格式: VIP-XXXX-XXXX', NULL, 'demo_u01', NOW()),
('demo_p08', @tid, 'VIP-002', '21天燃脂训练营（线上课程）',          '线上课程',   '21天系统训练计划+视频课程+社群打卡',          599.00, 100.00, 9999, '份', 'active', 'virtual', 'resource_link', NULL, '网盘链接+提取码，购买后自动发放', 'demo_u01', NOW()),
('demo_p09', @tid, 'VIP-003', '体质检测报告+定制方案',              '健康服务',   '专业体质检测+个性化营养方案定制',             299.00,  50.00, 9999, '份', 'active', 'virtual', 'card_key',      '报告查看码: RPT-XXXX', NULL, 'demo_u01', NOW()),
('demo_p10', @tid, 'VIP-004', '营养师1对1咨询（单次）',             '咨询服务',   '30分钟一对一视频/电话营养咨询',               99.00,  20.00, 9999, '次', 'active', 'virtual', 'none',          NULL, NULL, 'demo_u01', NOW());

-- ==========================================
-- 第5步：客户（每个销售/经理账号 10-20 条）
-- ==========================================
-- 分配给 demo_u05 刘组长 (15条)
INSERT INTO `customers` (`id`, `tenant_id`, `customer_code`, `name`, `phone`, `gender`, `age`, `province`, `city`, `source`, `level`, `status`, `follow_status`, `tags`, `remark`, `sales_person_id`, `sales_person_name`, `created_by`, `created_by_name`, `order_count`, `total_amount`, `created_at`) VALUES
('demo_c001', @tid, 'C20260001', '林美华', '13911001001', 'female', 35, '广东省', '广州市', '朋友介绍', 'vip',      'active', 'following', '["减脂","老客户"]',     '体重管理3个月，效果不错', 'demo_u05', '刘组长', 'demo_u05', '刘组长', 3, 894.00, DATE_SUB(NOW(), INTERVAL 60 DAY)),
('demo_c002', @tid, 'C20260002', '张伟强', '13911001002', 'male',   42, '广东省', '深圳市', '线上推广', 'important','active', 'following', '["增肌","企业客户"]',   '健身爱好者，长期复购',     'demo_u05', '刘组长', 'demo_u05', '刘组长', 2, 596.00, DATE_SUB(NOW(), INTERVAL 55 DAY)),
('demo_c003', @tid, 'C20260003', '王丽娟', '13911001003', 'female', 28, '浙江省', '杭州市', '抖音',     'normal',   'active', 'following', '["美容","减脂"]',       '关注胶原蛋白产品',         'demo_u05', '刘组长', 'demo_u05', '刘组长', 1, 388.00, DATE_SUB(NOW(), INTERVAL 50 DAY)),
('demo_c004', @tid, 'C20260004', '陈建国', '13911001004', 'male',   55, '北京市', '北京市', '朋友介绍', 'important','active', 'contacted', '["三高","中老年"]',     '关注血压和血糖管理',       'demo_u05', '刘组长', 'demo_u05', '刘组长', 2, 516.00, DATE_SUB(NOW(), INTERVAL 45 DAY)),
('demo_c005', @tid, 'C20260005', '李小芳', '13911001005', 'female', 31, '上海市', '上海市', '小红书',   'normal',   'active', 'following', '["减脂","年轻白领"]',   '产后恢复需求',             'demo_u05', '刘组长', 'demo_u05', '刘组长', 1, 298.00, DATE_SUB(NOW(), INTERVAL 40 DAY)),
('demo_c006', @tid, 'C20260006', '黄志明', '13911001006', 'male',   38, '福建省', '厦门市', '线上推广', 'normal',   'active', 'new',       '["运动","跑步"]',       '马拉松爱好者',             'demo_u05', '刘组长', 'demo_u05', '刘组长', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 35 DAY)),
('demo_c007', @tid, 'C20260007', '刘雅琴', '13911001007', 'female', 45, '江苏省', '南京市', '朋友介绍', 'vip',      'active', 'following', '["老客户","团购"]',     '帮朋友一起买，潜在团长',   'demo_u05', '刘组长', 'demo_u05', '刘组长', 4, 1192.00,DATE_SUB(NOW(), INTERVAL 90 DAY)),
('demo_c008', @tid, 'C20260008', '吴超杰', '13911001008', 'male',   25, '广东省', '广州市', '抖音',     'normal',   'active', 'new',       '["健身","增肌"]',       '刚开始健身',               'demo_u05', '刘组长', 'demo_u05', '刘组长', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 10 DAY)),
('demo_c009', @tid, 'C20260009', '赵雪梅', '13911001009', 'female', 33, '四川省', '成都市', '微信',     'normal',   'active', 'contacted', '["肠胃","调理"]',       '经常肠胃不适',             'demo_u05', '刘组长', 'demo_u05', '刘组长', 1, 258.00, DATE_SUB(NOW(), INTERVAL 30 DAY)),
('demo_c010', @tid, 'C20260010', '孙海涛', '13911001010', 'male',   50, '山东省', '青岛市', '线下活动', 'important','active', 'following', '["企业","团购"]',       '公司福利采购对接人',       'demo_u05', '刘组长', 'demo_u05', '刘组长', 2, 2960.00,DATE_SUB(NOW(), INTERVAL 80 DAY)),
('demo_c011', @tid, 'C20260011', '周丽萍', '13911001011', 'female', 29, '湖南省', '长沙市', '小红书',   'normal',   'active', 'new',       '["美容"]',              NULL,                         'demo_u05', '刘组长', 'demo_u05', '刘组长', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 5 DAY)),
('demo_c012', @tid, 'C20260012', '郑文博', '13911001012', 'male',   36, '河南省', '郑州市', '百度',     'normal',   'active', 'contacted', '["减脂"]',              '搜索过来的',               'demo_u05', '刘组长', 'demo_u05', '刘组长', 1, 298.00, DATE_SUB(NOW(), INTERVAL 25 DAY)),
('demo_c013', @tid, 'C20260013', '钱秀英', '13911001013', 'female', 48, '浙江省', '温州市', '朋友介绍', 'vip',      'active', 'following', '["老客户","减脂"]',     '长期客户，每月复购',       'demo_u05', '刘组长', 'demo_u05', '刘组长', 5, 1490.00,DATE_SUB(NOW(), INTERVAL 120 DAY)),
('demo_c014', @tid, 'C20260014', '马小龙', '13911001014', 'male',   22, '陕西省', '西安市', '抖音',     'normal',   'active', 'new',       '["学生","减脂"]',       '大学生，预算有限',         'demo_u05', '刘组长', 'demo_u05', '刘组长', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 3 DAY)),
('demo_c015', @tid, 'C20260015', '何桂兰', '13911001015', 'female', 52, '广西壮族自治区','南宁市','微信','normal','active','contacted','["中老年","保健"]',  '关注维生素产品',           'demo_u05', '刘组长', 'demo_u05', '刘组长', 1, 168.00, DATE_SUB(NOW(), INTERVAL 20 DAY)),

-- 分配给 demo_u06 陈组长 (12条)
('demo_c016', @tid, 'C20260016', '谢明月', '13922001001', 'female', 30, '广东省', '东莞市', '微信',     'normal',   'active', 'following', '["减脂","年轻"]',       '通过朋友圈看到',           'demo_u06', '陈组长', 'demo_u06', '陈组长', 2, 596.00, DATE_SUB(NOW(), INTERVAL 50 DAY)),
('demo_c017', @tid, 'C20260017', '罗大伟', '13922001002', 'male',   40, '湖北省', '武汉市', '百度',     'important','active', 'following', '["增肌","运动"]',       '健身房老板',               'demo_u06', '陈组长', 'demo_u06', '陈组长', 3, 864.00, DATE_SUB(NOW(), INTERVAL 70 DAY)),
('demo_c018', @tid, 'C20260018', '许小红', '13922001003', 'female', 26, '江西省', '南昌市', '抖音',     'normal',   'active', 'new',       '["美容","年轻"]',       NULL,                         'demo_u06', '陈组长', 'demo_u06', '陈组长', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 8 DAY)),
('demo_c019', @tid, 'C20260019', '徐国强', '13922001004', 'male',   58, '安徽省', '合肥市', '线下活动', 'vip',      'active', 'following', '["中老年","三高"]',     '退休干部，注重养生',       'demo_u06', '陈组长', 'demo_u06', '陈组长', 3, 804.00, DATE_SUB(NOW(), INTERVAL 100 DAY)),
('demo_c020', @tid, 'C20260020', '方婷婷', '13922001005', 'female', 34, '广东省', '佛山市', '小红书',   'normal',   'active', 'contacted', '["产后","减脂"]',       '产后6个月',                'demo_u06', '陈组长', 'demo_u06', '陈组长', 1, 298.00, DATE_SUB(NOW(), INTERVAL 15 DAY)),
('demo_c021', @tid, 'C20260021', '邓先锋', '13922001006', 'male',   32, '重庆市', '重庆市', '线上推广', 'normal',   'active', 'new',       '["运动"]',              NULL,                         'demo_u06', '陈组长', 'demo_u06', '陈组长', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 2 DAY)),
('demo_c022', @tid, 'C20260022', '韩淑珍', '13922001007', 'female', 43, '辽宁省', '大连市', '朋友介绍', 'important','active', 'following', '["老客户","团购"]',     '社区团购团长',             'demo_u06', '陈组长', 'demo_u06', '陈组长', 4, 3184.00,DATE_SUB(NOW(), INTERVAL 85 DAY)),
('demo_c023', @tid, 'C20260023', '曹文轩', '13922001008', 'male',   29, '天津市', '天津市', '抖音',     'normal',   'active', 'contacted', '["减脂","健身"]',       '在减脂期',                 'demo_u06', '陈组长', 'demo_u06', '陈组长', 1, 188.00, DATE_SUB(NOW(), INTERVAL 18 DAY)),
('demo_c024', @tid, 'C20260024', '彭慧芳', '13922001009', 'female', 37, '河北省', '石家庄市','微信',    'normal',   'active', 'following', '["肠胃","调理"]',       '益生菌复购客户',           'demo_u06', '陈组长', 'demo_u06', '陈组长', 2, 516.00, DATE_SUB(NOW(), INTERVAL 40 DAY)),
('demo_c025', @tid, 'C20260025', '宋志强', '13922001010', 'male',   46, '云南省', '昆明市', '朋友介绍', 'vip',      'active', 'following', '["企业","福利"]',       '酒店采购经理',             'demo_u06', '陈组长', 'demo_u06', '陈组长', 2, 3960.00,DATE_SUB(NOW(), INTERVAL 65 DAY)),
('demo_c026', @tid, 'C20260026', '唐丽君', '13922001011', 'female', 39, '贵州省', '贵阳市', '线上推广', 'normal',   'active', 'new',       '["美容","抗衰"]',       NULL,                         'demo_u06', '陈组长', 'demo_u06', '陈组长', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 4 DAY)),
('demo_c027', @tid, 'C20260027', '蒋小燕', '13922001012', 'female', 27, '广东省', '珠海市', '微信',     'normal',   'active', 'contacted', '["年轻","美容"]',       '皮肤管理师',               'demo_u06', '陈组长', 'demo_u06', '陈组长', 1, 388.00, DATE_SUB(NOW(), INTERVAL 22 DAY)),

-- 分配给 demo_u07 孙小美 (15条)
('demo_c028', @tid, 'C20260028', '沈丽丽', '13933001001', 'female', 33, '浙江省', '宁波市', '小红书',   'normal',   'active', 'following', '["减脂"]',              '目标减10斤',               'demo_u07', '孙小美', 'demo_u07', '孙小美', 2, 596.00, DATE_SUB(NOW(), INTERVAL 45 DAY)),
('demo_c029', @tid, 'C20260029', '杨建华', '13933001002', 'male',   41, '山西省', '太原市', '百度',     'important','active', 'following', '["增肌","中年"]',       '每周健身4次',              'demo_u07', '孙小美', 'demo_u07', '孙小美', 2, 486.00, DATE_SUB(NOW(), INTERVAL 55 DAY)),
('demo_c030', @tid, 'C20260030', '朱小倩', '13933001003', 'female', 24, '福建省', '福州市', '抖音',     'normal',   'active', 'new',       '["年轻","减脂"]',       '大学刚毕业',               'demo_u07', '孙小美', 'demo_u07', '孙小美', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 6 DAY)),
('demo_c031', @tid, 'C20260031', '高志远', '13933001004', 'male',   53, '吉林省', '长春市', '线下活动', 'normal',   'active', 'contacted', '["中老年","保健"]',     '在药店看到宣传',           'demo_u07', '孙小美', 'demo_u07', '孙小美', 1, 168.00, DATE_SUB(NOW(), INTERVAL 28 DAY)),
('demo_c032', @tid, 'C20260032', '梁秋月', '13933001005', 'female', 36, '广东省', '惠州市', '微信',     'vip',      'active', 'following', '["老客户","减脂"]',     '持续复购中',               'demo_u07', '孙小美', 'demo_u07', '孙小美', 4, 1192.00,DATE_SUB(NOW(), INTERVAL 95 DAY)),
('demo_c033', @tid, 'C20260033', '谭俊杰', '13933001006', 'male',   30, '湖南省', '衡阳市', '线上推广', 'normal',   'active', 'following', '["运动","跑步"]',       '准备参加半马',             'demo_u07', '孙小美', 'demo_u07', '孙小美', 1, 188.00, DATE_SUB(NOW(), INTERVAL 20 DAY)),
('demo_c034', @tid, 'C20260034', '邱玉兰', '13933001007', 'female', 47, '江苏省', '苏州市', '朋友介绍', 'important','active', 'following', '["中年","调理"]',       '更年期调理需求',           'demo_u07', '孙小美', 'demo_u07', '孙小美', 2, 556.00, DATE_SUB(NOW(), INTERVAL 60 DAY)),
('demo_c035', @tid, 'C20260035', '余小龙', '13933001008', 'male',   27, '广东省', '中山市', '抖音',     'normal',   'active', 'new',       '["健身","年轻"]',       NULL,                         'demo_u07', '孙小美', 'demo_u07', '孙小美', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 7 DAY)),
('demo_c036', @tid, 'C20260036', '蔡晓芬', '13933001009', 'female', 32, '海南省', '海口市', '微信',     'normal',   'active', 'contacted', '["美容","胶原蛋白"]',   '对胶原蛋白感兴趣',         'demo_u07', '孙小美', 'demo_u07', '孙小美', 1, 388.00, DATE_SUB(NOW(), INTERVAL 16 DAY)),
('demo_c037', @tid, 'C20260037', '潘大勇', '13933001010', 'male',   44, '黑龙江省','哈尔滨市','朋友介绍','vip',    'active', 'following', '["企业","长期"]',       '连锁药店老板',             'demo_u07', '孙小美', 'demo_u07', '孙小美', 3, 2564.00,DATE_SUB(NOW(), INTERVAL 75 DAY)),
('demo_c038', @tid, 'C20260038', '冯秀兰', '13933001011', 'female', 56, '甘肃省', '兰州市', '线下活动', 'normal',   'active', 'contacted', '["中老年"]',            '女儿推荐来的',             'demo_u07', '孙小美', 'demo_u07', '孙小美', 1, 168.00, DATE_SUB(NOW(), INTERVAL 12 DAY)),
('demo_c039', @tid, 'C20260039', '丁一鸣', '13933001012', 'male',   35, '内蒙古自治区','呼和浩特市','百度','normal','active','new',     '["运动","减脂"]',       NULL,                         'demo_u07', '孙小美', 'demo_u07', '孙小美', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 4 DAY)),
('demo_c040', @tid, 'C20260040', '叶婉君', '13933001013', 'female', 29, '广东省', '汕头市', '小红书',   'normal',   'active', 'following', '["减脂","美容"]',       '体重管理+美容双需求',      'demo_u07', '孙小美', 'demo_u07', '孙小美', 2, 686.00, DATE_SUB(NOW(), INTERVAL 35 DAY)),
('demo_c041', @tid, 'C20260041', '石磊',   '13933001014', 'male',   39, '新疆维吾尔自治区','乌鲁木齐市','微信','normal','active','contacted','["保健"]',        '边疆地区物流稍慢',         'demo_u07', '孙小美', 'demo_u07', '孙小美', 1, 258.00, DATE_SUB(NOW(), INTERVAL 25 DAY)),
('demo_c042', @tid, 'C20260042', '龚秀梅', '13933001015', 'female', 41, '江西省', '赣州市', '线上推广', 'normal',   'active', 'new',       '["中年","肠胃"]',       NULL,                         'demo_u07', '孙小美', 'demo_u07', '孙小美', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 2 DAY)),

-- 分配给 demo_u08 周小明 (13条)
('demo_c043', @tid, 'C20260043', '程家豪', '13944001001', 'male',   28, '广东省', '广州市', '抖音',     'normal',   'active', 'following', '["年轻","增肌"]',       '刚办健身卡',               'demo_u08', '周小明', 'demo_u08', '周小明', 2, 486.00, DATE_SUB(NOW(), INTERVAL 40 DAY)),
('demo_c044', @tid, 'C20260044', '于芳芳', '13944001002', 'female', 37, '山东省', '济南市', '微信',     'important','active', 'following', '["减脂","老客户"]',     '连续购买6个月',            'demo_u08', '周小明', 'demo_u08', '周小明', 5, 1490.00,DATE_SUB(NOW(), INTERVAL 95 DAY)),
('demo_c045', @tid, 'C20260045', '贾小明', '13944001003', 'male',   45, '河南省', '洛阳市', '朋友介绍', 'normal',   'active', 'contacted', '["中年","三高"]',       '有高血压',                 'demo_u08', '周小明', 'demo_u08', '周小明', 1, 168.00, DATE_SUB(NOW(), INTERVAL 22 DAY)),
('demo_c046', @tid, 'C20260046', '任丽丽', '13944001004', 'female', 26, '北京市', '北京市', '小红书',   'normal',   'active', 'new',       '["年轻","美容"]',       '看了测评来的',             'demo_u08', '周小明', 'demo_u08', '周小明', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 5 DAY)),
('demo_c047', @tid, 'C20260047', '吕文斌', '13944001005', 'male',   33, '浙江省', '金华市', '百度',     'normal',   'active', 'following', '["运动","减脂"]',       '想减啤酒肚',               'demo_u08', '周小明', 'demo_u08', '周小明', 1, 298.00, DATE_SUB(NOW(), INTERVAL 30 DAY)),
('demo_c048', @tid, 'C20260048', '范小燕', '13944001006', 'female', 50, '湖北省', '宜昌市', '线下活动', 'vip',      'active', 'following', '["中老年","长期"]',     '阿姨带动一群人买',         'demo_u08', '周小明', 'demo_u08', '周小明', 4, 1752.00,DATE_SUB(NOW(), INTERVAL 110 DAY)),
('demo_c049', @tid, 'C20260049', '段鹏飞', '13944001007', 'male',   31, '广东省', '深圳市', '线上推广', 'normal',   'active', 'contacted', '["健身"]',              'IT 程序员想改善亚健康',    'demo_u08', '周小明', 'demo_u08', '周小明', 1, 258.00, DATE_SUB(NOW(), INTERVAL 14 DAY)),
('demo_c050', @tid, 'C20260050', '苏雅晴', '13944001008', 'female', 23, '福建省', '泉州市', '抖音',     'normal',   'active', 'new',       '["年轻"]',              NULL,                         'demo_u08', '周小明', 'demo_u08', '周小明', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 3 DAY)),
('demo_c051', @tid, 'C20260051', '魏学强', '13944001009', 'male',   48, '陕西省', '咸阳市', '朋友介绍', 'important','active', 'following', '["中年","保健"]',       '关注维生素和益生菌',       'demo_u08', '周小明', 'demo_u08', '周小明', 2, 426.00, DATE_SUB(NOW(), INTERVAL 50 DAY)),
('demo_c052', @tid, 'C20260052', '薛红梅', '13944001010', 'female', 34, '四川省', '绵阳市', '微信',     'normal',   'active', 'following', '["减脂","产后"]',       '二胎产后',                 'demo_u08', '周小明', 'demo_u08', '周小明', 2, 596.00, DATE_SUB(NOW(), INTERVAL 38 DAY)),
('demo_c053', @tid, 'C20260053', '闫大山', '13944001011', 'male',   60, '山西省', '运城市', '线下活动', 'normal',   'active', 'contacted', '["中老年"]',            '退休教师',                 'demo_u08', '周小明', 'demo_u08', '周小明', 1, 168.00, DATE_SUB(NOW(), INTERVAL 18 DAY)),
('demo_c054', @tid, 'C20260054', '严小芬', '13944001012', 'female', 38, '江苏省', '无锡市', '朋友介绍', 'vip',      'active', 'following', '["老客户","团购"]',     '每次买很多送朋友',         'demo_u08', '周小明', 'demo_u08', '周小明', 3, 2244.00,DATE_SUB(NOW(), INTERVAL 88 DAY)),
('demo_c055', @tid, 'C20260055', '姜志豪', '13944001013', 'male',   26, '辽宁省', '沈阳市', '抖音',     'normal',   'active', 'new',       '["年轻","运动"]',       NULL,                         'demo_u08', '周小明', 'demo_u08', '周小明', 0, 0.00,   DATE_SUB(NOW(), INTERVAL 1 DAY));

-- ==========================================
-- 第6步：订单（混合实物+虚拟，每个销售10-15条）
-- ==========================================
-- 订单状态: pending/confirmed/shipped/delivered/signed/completed/cancelled/refunded
-- order_product_type: physical/virtual

INSERT INTO `orders` (`id`, `tenant_id`, `order_number`, `customer_id`, `customer_name`, `customer_phone`, `products`, `total_amount`, `discount_amount`, `final_amount`, `deposit_amount`, `status`, `payment_status`, `payment_method`, `shipping_address`, `shipping_phone`, `shipping_name`, `express_company`, `tracking_number`, `mark_type`, `order_product_type`, `remark`, `created_by`, `created_by_name`, `created_by_department_id`, `created_by_department_name`, `created_at`, `shipped_at`, `delivered_at`) VALUES
-- === 刘组长 demo_u05 的订单 (12条) ===
('demo_o001', @tid, 'ORD20260501001', 'demo_c001', '林美华', '13911001001', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":1,"price":298}]', 298.00, 0, 298.00, 0, 'delivered', 'paid', '微信', '广州市天河区天河路385号', '13911001001', '林美华', '顺丰速运', 'SF1234500001', 'normal', 'physical', NULL, 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 55 DAY), DATE_SUB(NOW(), INTERVAL 53 DAY), DATE_SUB(NOW(), INTERVAL 50 DAY)),
('demo_o002', @tid, 'ORD20260501002', 'demo_c001', '林美华', '13911001001', '[{"productId":"demo_p02","productName":"康宝莱蛋白混合饮料（巧克力味）","quantity":2,"price":298}]', 596.00, 0, 596.00, 0, 'shipped', 'paid', '支付宝', '广州市天河区天河路385号', '13911001001', '林美华', '中通快递', 'ZT9876500001', 'normal', 'physical', '第二次购买', 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), NULL),
('demo_o003', @tid, 'ORD20260501003', 'demo_c002', '张伟强', '13911001002', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":1,"price":298},{"productId":"demo_p06","productName":"左旋肉碱运动营养饮","quantity":1,"price":188}]', 486.00, 0, 486.00, 100.00, 'delivered', 'paid', '银行转账', '深圳市南山区科技园中路1号', '13911001002', '张伟强', '顺丰速运', 'SF1234500002', 'normal', 'physical', NULL, 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 43 DAY), DATE_SUB(NOW(), INTERVAL 40 DAY)),
('demo_o004', @tid, 'ORD20260501004', 'demo_c003', '王丽娟', '13911001003', '[{"productId":"demo_p04","productName":"胶原蛋白肽果味饮品","quantity":1,"price":388}]', 388.00, 0, 388.00, 0, 'completed', 'paid', '微信', '杭州市西湖区文三路100号', '13911001003', '王丽娟', '圆通速递', 'YT2468000001', 'normal', 'physical', NULL, 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 42 DAY), DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 37 DAY)),
('demo_o005', @tid, 'ORD20260501005', 'demo_c004', '陈建国', '13911001004', '[{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":2,"price":168}]', 336.00, 0, 336.00, 0, 'delivered', 'paid', '支付宝', '北京市朝阳区建国路88号', '13911001004', '陈建国', '京东快递', 'JD3579100001', 'normal', 'physical', NULL, 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 38 DAY), DATE_SUB(NOW(), INTERVAL 36 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY)),
('demo_o006', @tid, 'ORD20260501006', 'demo_c007', '刘雅琴', '13911001007', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":4,"price":298}]', 1192.00, 100.00, 1092.00, 200.00, 'delivered', 'paid', '微信', '南京市鼓楼区中山路200号', '13911001007', '刘雅琴', '顺丰速运', 'SF1234500003', 'normal', 'physical', '团购优惠', 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY)),
('demo_o007', @tid, 'ORD20260501007', 'demo_c009', '赵雪梅', '13911001009', '[{"productId":"demo_p05","productName":"益生菌固体饮料","quantity":1,"price":258}]', 258.00, 0, 258.00, 0, 'shipped', 'paid', '微信', '成都市武侯区人民南路三段22号', '13911001009', '赵雪梅', '韵达快递', 'YD1357900001', 'normal', 'physical', NULL, 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), NULL),
('demo_o008', @tid, 'ORD20260501008', 'demo_c010', '孙海涛', '13911001010', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":10,"price":298}]', 2980.00, 200.00, 2780.00, 500.00, 'completed', 'paid', '银行转账', '青岛市市南区香港中路61号', '13911001010', '孙海涛', '顺丰速运', 'SF1234500004', 'normal', 'physical', '企业福利采购', 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 70 DAY), DATE_SUB(NOW(), INTERVAL 68 DAY), DATE_SUB(NOW(), INTERVAL 65 DAY)),
-- 虚拟商品订单
('demo_o009', @tid, 'ORD20260501009', 'demo_c001', '林美华', '13911001001', '[{"productId":"demo_p07","productName":"健康管理VIP年卡","quantity":1,"price":1980}]', 1980.00, 0, 1980.00, 0, 'signed', 'paid', '微信', NULL, NULL, NULL, NULL, NULL, 'normal', 'virtual', 'VIP会员开通', 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 20 DAY), NULL, NULL),
('demo_o010', @tid, 'ORD20260501010', 'demo_c005', '李小芳', '13911001005', '[{"productId":"demo_p08","productName":"21天燃脂训练营（线上课程）","quantity":1,"price":599}]', 599.00, 100.00, 499.00, 0, 'signed', 'paid', '支付宝', NULL, NULL, NULL, NULL, NULL, 'normal', 'virtual', '新客优惠', 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 15 DAY), NULL, NULL),
('demo_o011', @tid, 'ORD20260501011', 'demo_c012', '郑文博', '13911001012', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":1,"price":298}]', 298.00, 0, 298.00, 0, 'pending', 'unpaid', NULL, '郑州市金水区花园路100号', '13911001012', '郑文博', NULL, NULL, 'normal', 'physical', '待付款', 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL),
('demo_o012', @tid, 'ORD20260501012', 'demo_c013', '钱秀英', '13911001013', '[{"productId":"demo_p10","productName":"营养师1对1咨询（单次）","quantity":2,"price":99}]', 198.00, 0, 198.00, 0, 'signed', 'paid', '微信', NULL, NULL, NULL, NULL, NULL, 'normal', 'virtual', '咨询服务', 'demo_u05', '刘组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 10 DAY), NULL, NULL),

-- === 陈组长 demo_u06 的订单 (10条) ===
('demo_o013', @tid, 'ORD20260502001', 'demo_c016', '谢明月', '13922001001', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":2,"price":298}]', 596.00, 0, 596.00, 0, 'delivered', 'paid', '微信', '东莞市南城区鸿福路200号', '13922001001', '谢明月', '顺丰速运', 'SF2345600001', 'normal', 'physical', NULL, 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 42 DAY), DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 37 DAY)),
('demo_o014', @tid, 'ORD20260502002', 'demo_c017', '罗大伟', '13922001002', '[{"productId":"demo_p06","productName":"左旋肉碱运动营养饮","quantity":3,"price":188}]', 564.00, 0, 564.00, 0, 'delivered', 'paid', '支付宝', '武汉市武昌区中南路99号', '13922001002', '罗大伟', '中通快递', 'ZT8765400001', 'normal', 'physical', '健身房批量', 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 58 DAY), DATE_SUB(NOW(), INTERVAL 55 DAY)),
('demo_o015', @tid, 'ORD20260502003', 'demo_c019', '徐国强', '13922001004', '[{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":3,"price":168}]', 504.00, 0, 504.00, 0, 'completed', 'paid', '银行转账', '合肥市蜀山区长江西路200号', '13922001004', '徐国强', '圆通速递', 'YT3579100001', 'normal', 'physical', NULL, 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 80 DAY), DATE_SUB(NOW(), INTERVAL 78 DAY), DATE_SUB(NOW(), INTERVAL 75 DAY)),
('demo_o016', @tid, 'ORD20260502004', 'demo_c022', '韩淑珍', '13922001007', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":6,"price":298},{"productId":"demo_p05","productName":"益生菌固体饮料","quantity":4,"price":258}]', 2820.00, 200.00, 2620.00, 500.00, 'delivered', 'paid', '微信', '大连市中山区中山路200号', '13922001007', '韩淑珍', '顺丰速运', 'SF2345600002', 'normal', 'physical', '社区团购', 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 48 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY)),
('demo_o017', @tid, 'ORD20260502005', 'demo_c020', '方婷婷', '13922001005', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":1,"price":298}]', 298.00, 0, 298.00, 0, 'shipped', 'paid', '微信', '佛山市禅城区季华路100号', '13922001005', '方婷婷', '韵达快递', 'YD2468000001', 'normal', 'physical', NULL, 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), NULL),
('demo_o018', @tid, 'ORD20260502006', 'demo_c023', '曹文轩', '13922001008', '[{"productId":"demo_p06","productName":"左旋肉碱运动营养饮","quantity":1,"price":188}]', 188.00, 0, 188.00, 0, 'confirmed', 'paid', '支付宝', '天津市和平区南京路100号', '13922001008', '曹文轩', NULL, NULL, 'normal', 'physical', NULL, 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 3 DAY), NULL, NULL),
('demo_o019', @tid, 'ORD20260502007', 'demo_c025', '宋志强', '13922001010', '[{"productId":"demo_p07","productName":"健康管理VIP年卡","quantity":2,"price":1980}]', 3960.00, 0, 3960.00, 0, 'signed', 'paid', '银行转账', NULL, NULL, NULL, NULL, NULL, 'normal', 'virtual', '酒店VIP客户福利', 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 55 DAY), NULL, NULL),
('demo_o020', @tid, 'ORD20260502008', 'demo_c024', '彭慧芳', '13922001009', '[{"productId":"demo_p05","productName":"益生菌固体饮料","quantity":2,"price":258}]', 516.00, 0, 516.00, 0, 'delivered', 'paid', '微信', '石家庄市裕华区槐安东路200号', '13922001009', '彭慧芳', '中通快递', 'ZT8765400002', 'normal', 'physical', '复购', 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 23 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY)),
('demo_o021', @tid, 'ORD20260502009', 'demo_c027', '蒋小燕', '13922001012', '[{"productId":"demo_p04","productName":"胶原蛋白肽果味饮品","quantity":1,"price":388}]', 388.00, 0, 388.00, 0, 'shipped', 'paid', '微信', '珠海市香洲区吉大路50号', '13922001012', '蒋小燕', '顺丰速运', 'SF2345600003', 'normal', 'physical', NULL, 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), NULL),
('demo_o022', @tid, 'ORD20260502010', 'demo_c017', '罗大伟', '13922001002', '[{"productId":"demo_p09","productName":"体质检测报告+定制方案","quantity":1,"price":299}]', 299.00, 0, 299.00, 0, 'signed', 'paid', '微信', NULL, NULL, NULL, NULL, NULL, 'normal', 'virtual', '体质检测', 'demo_u06', '陈组长', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 35 DAY), NULL, NULL),

-- === 孙小美 demo_u07 的订单 (13条) ===
('demo_o023', @tid, 'ORD20260503001', 'demo_c028', '沈丽丽', '13933001001', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":2,"price":298}]', 596.00, 0, 596.00, 0, 'delivered', 'paid', '微信', '宁波市海曙区中山西路100号', '13933001001', '沈丽丽', '中通快递', 'ZT3456700001', 'normal', 'physical', NULL, 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 38 DAY), DATE_SUB(NOW(), INTERVAL 36 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY)),
('demo_o024', @tid, 'ORD20260503002', 'demo_c029', '杨建华', '13933001002', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":1,"price":298},{"productId":"demo_p06","productName":"左旋肉碱运动营养饮","quantity":1,"price":188}]', 486.00, 0, 486.00, 0, 'delivered', 'paid', '支付宝', '太原市小店区长风街100号', '13933001002', '杨建华', '顺丰速运', 'SF3456700001', 'normal', 'physical', NULL, 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 48 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY)),
('demo_o025', @tid, 'ORD20260503003', 'demo_c032', '梁秋月', '13933001005', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":2,"price":298}]', 596.00, 0, 596.00, 0, 'completed', 'paid', '微信', '惠州市惠城区麦地南路50号', '13933001005', '梁秋月', '圆通速递', 'YT4567800001', 'normal', 'physical', '月度复购', 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 62 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_SUB(NOW(), INTERVAL 57 DAY)),
('demo_o026', @tid, 'ORD20260503004', 'demo_c032', '梁秋月', '13933001005', '[{"productId":"demo_p02","productName":"康宝莱蛋白混合饮料（巧克力味）","quantity":2,"price":298}]', 596.00, 0, 596.00, 0, 'delivered', 'paid', '微信', '惠州市惠城区麦地南路50号', '13933001005', '梁秋月', '圆通速递', 'YT4567800002', 'normal', 'physical', '换口味', 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY)),
('demo_o027', @tid, 'ORD20260503005', 'demo_c033', '谭俊杰', '13933001006', '[{"productId":"demo_p06","productName":"左旋肉碱运动营养饮","quantity":1,"price":188}]', 188.00, 0, 188.00, 0, 'shipped', 'paid', '支付宝', '衡阳市石鼓区解放路50号', '13933001006', '谭俊杰', '韵达快递', 'YD3456700001', 'normal', 'physical', NULL, 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), NULL),
('demo_o028', @tid, 'ORD20260503006', 'demo_c034', '邱玉兰', '13933001007', '[{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":1,"price":168},{"productId":"demo_p04","productName":"胶原蛋白肽果味饮品","quantity":1,"price":388}]', 556.00, 0, 556.00, 0, 'delivered', 'paid', '微信', '苏州市姑苏区人民路100号', '13933001007', '邱玉兰', '顺丰速运', 'SF3456700002', 'normal', 'physical', '维生素+胶原蛋白套餐', 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 48 DAY), DATE_SUB(NOW(), INTERVAL 46 DAY), DATE_SUB(NOW(), INTERVAL 43 DAY)),
('demo_o029', @tid, 'ORD20260503007', 'demo_c036', '蔡晓芬', '13933001009', '[{"productId":"demo_p04","productName":"胶原蛋白肽果味饮品","quantity":1,"price":388}]', 388.00, 0, 388.00, 0, 'confirmed', 'paid', '微信', '海口市龙华区国贸路100号', '13933001009', '蔡晓芬', NULL, NULL, 'normal', 'physical', NULL, 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),
('demo_o030', @tid, 'ORD20260503008', 'demo_c037', '潘大勇', '13933001010', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":8,"price":298}]', 2384.00, 200.00, 2184.00, 400.00, 'completed', 'paid', '银行转账', '哈尔滨市南岗区红旗大街200号', '13933001010', '潘大勇', '顺丰速运', 'SF3456700003', 'normal', 'physical', '药店铺货', 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 65 DAY), DATE_SUB(NOW(), INTERVAL 63 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY)),
('demo_o031', @tid, 'ORD20260503009', 'demo_c040', '叶婉君', '13933001013', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":1,"price":298},{"productId":"demo_p04","productName":"胶原蛋白肽果味饮品","quantity":1,"price":388}]', 686.00, 0, 686.00, 0, 'delivered', 'paid', '微信', '汕头市金平区长平路100号', '13933001013', '叶婉君', '中通快递', 'ZT3456700002', 'normal', 'physical', NULL, 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 15 DAY)),
('demo_o032', @tid, 'ORD20260503010', 'demo_c041', '石磊', '13933001014', '[{"productId":"demo_p05","productName":"益生菌固体饮料","quantity":1,"price":258}]', 258.00, 0, 258.00, 0, 'shipped', 'paid', '支付宝', '乌鲁木齐市天山区光明路50号', '13933001014', '石磊', '邮政EMS', 'EM1234500001', 'normal', 'physical', '边疆地区用EMS', 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), NULL),
-- 虚拟
('demo_o033', @tid, 'ORD20260503011', 'demo_c032', '梁秋月', '13933001005', '[{"productId":"demo_p07","productName":"健康管理VIP年卡","quantity":1,"price":1980}]', 1980.00, 200.00, 1780.00, 0, 'signed', 'paid', '微信', NULL, NULL, NULL, NULL, NULL, 'normal', 'virtual', '老客户VIP升级', 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 25 DAY), NULL, NULL),
('demo_o034', @tid, 'ORD20260503012', 'demo_c031', '高志远', '13933001004', '[{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":1,"price":168}]', 168.00, 0, 168.00, 0, 'delivered', 'paid', '微信', '长春市南关区大经路100号', '13933001004', '高志远', '顺丰速运', 'SF3456700004', 'normal', 'physical', NULL, 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 22 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 17 DAY)),
('demo_o035', @tid, 'ORD20260503013', 'demo_c038', '冯秀兰', '13933001011', '[{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":1,"price":168}]', 168.00, 0, 168.00, 0, 'delivered', 'paid', '微信', '兰州市城关区张掖路100号', '13933001011', '冯秀兰', '圆通速递', 'YT4567800003', 'normal', 'physical', NULL, 'demo_u07', '孙小美', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),

-- === 周小明 demo_u08 的订单 (12条) ===
('demo_o036', @tid, 'ORD20260504001', 'demo_c043', '程家豪', '13944001001', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":1,"price":298},{"productId":"demo_p06","productName":"左旋肉碱运动营养饮","quantity":1,"price":188}]', 486.00, 0, 486.00, 0, 'delivered', 'paid', '微信', '广州市番禺区市桥平康路100号', '13944001001', '程家豪', '顺丰速运', 'SF4567800001', 'normal', 'physical', NULL, 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY)),
('demo_o037', @tid, 'ORD20260504002', 'demo_c044', '于芳芳', '13944001002', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":3,"price":298}]', 894.00, 0, 894.00, 0, 'completed', 'paid', '微信', '济南市历下区泉城路100号', '13944001002', '于芳芳', '中通快递', 'ZT4567800001', 'normal', 'physical', '月度批量', 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 80 DAY), DATE_SUB(NOW(), INTERVAL 78 DAY), DATE_SUB(NOW(), INTERVAL 75 DAY)),
('demo_o038', @tid, 'ORD20260504003', 'demo_c044', '于芳芳', '13944001002', '[{"productId":"demo_p02","productName":"康宝莱蛋白混合饮料（巧克力味）","quantity":2,"price":298}]', 596.00, 0, 596.00, 0, 'delivered', 'paid', '微信', '济南市历下区泉城路100号', '13944001002', '于芳芳', '中通快递', 'ZT4567800002', 'normal', 'physical', '换口味', 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 48 DAY), DATE_SUB(NOW(), INTERVAL 45 DAY)),
('demo_o039', @tid, 'ORD20260504004', 'demo_c045', '贾小明', '13944001003', '[{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":1,"price":168}]', 168.00, 0, 168.00, 0, 'shipped', 'paid', '支付宝', '洛阳市涧西区南昌路50号', '13944001003', '贾小明', '韵达快递', 'YD4567800001', 'normal', 'physical', NULL, 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), NULL),
('demo_o040', @tid, 'ORD20260504005', 'demo_c047', '吕文斌', '13944001005', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":1,"price":298}]', 298.00, 0, 298.00, 0, 'delivered', 'paid', '微信', '金华市婺城区八一南街100号', '13944001005', '吕文斌', '圆通速递', 'YT5678900001', 'normal', 'physical', NULL, 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 23 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY)),
('demo_o041', @tid, 'ORD20260504006', 'demo_c048', '范小燕', '13944001006', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":4,"price":298},{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":2,"price":168}]', 1528.00, 100.00, 1428.00, 300.00, 'completed', 'paid', '银行转账', '宜昌市西陵区沿江大道100号', '13944001006', '范小燕', '顺丰速运', 'SF4567800002', 'normal', 'physical', '阿姨团购', 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 70 DAY), DATE_SUB(NOW(), INTERVAL 68 DAY), DATE_SUB(NOW(), INTERVAL 65 DAY)),
('demo_o042', @tid, 'ORD20260504007', 'demo_c049', '段鹏飞', '13944001007', '[{"productId":"demo_p05","productName":"益生菌固体饮料","quantity":1,"price":258}]', 258.00, 0, 258.00, 0, 'confirmed', 'paid', '支付宝', '深圳市南山区科技园路200号', '13944001007', '段鹏飞', NULL, NULL, 'normal', 'physical', NULL, 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),
('demo_o043', @tid, 'ORD20260504008', 'demo_c051', '魏学强', '13944001009', '[{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":1,"price":168},{"productId":"demo_p05","productName":"益生菌固体饮料","quantity":1,"price":258}]', 426.00, 0, 426.00, 0, 'delivered', 'paid', '微信', '咸阳市秦都区世纪大道100号', '13944001009', '魏学强', '中通快递', 'ZT4567800003', 'normal', 'physical', NULL, 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 38 DAY), DATE_SUB(NOW(), INTERVAL 35 DAY)),
('demo_o044', @tid, 'ORD20260504009', 'demo_c052', '薛红梅', '13944001010', '[{"productId":"demo_p01","productName":"康宝莱蛋白混合饮料（香草味）","quantity":2,"price":298}]', 596.00, 0, 596.00, 0, 'shipped', 'paid', '微信', '绵阳市涪城区临园路100号', '13944001010', '薛红梅', '韵达快递', 'YD4567800002', 'normal', 'physical', '复购', 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), NULL),
-- 虚拟
('demo_o045', @tid, 'ORD20260504010', 'demo_c054', '严小芬', '13944001012', '[{"productId":"demo_p07","productName":"健康管理VIP年卡","quantity":1,"price":1980},{"productId":"demo_p08","productName":"21天燃脂训练营（线上课程）","quantity":1,"price":599}]', 2579.00, 200.00, 2379.00, 0, 'signed', 'paid', '微信', NULL, NULL, NULL, NULL, NULL, 'normal', 'virtual', 'VIP+课程套餐', 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 30 DAY), NULL, NULL),
('demo_o046', @tid, 'ORD20260504011', 'demo_c053', '闫大山', '13944001011', '[{"productId":"demo_p03","productName":"康宝莱多种维生素矿物质片","quantity":1,"price":168}]', 168.00, 0, 168.00, 0, 'delivered', 'paid', '微信', '运城市盐湖区河东大道100号', '13944001011', '闫大山', '邮政EMS', 'EM2345600001', 'normal', 'physical', NULL, 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY)),
('demo_o047', @tid, 'ORD20260504012', 'demo_c044', '于芳芳', '13944001002', '[{"productId":"demo_p09","productName":"体质检测报告+定制方案","quantity":1,"price":299}]', 299.00, 0, 299.00, 0, 'signed', 'paid', '支付宝', NULL, NULL, NULL, NULL, NULL, 'normal', 'virtual', '定制方案', 'demo_u08', '周小明', 'demo_dept_sales', '销售部', DATE_SUB(NOW(), INTERVAL 18 DAY), NULL, NULL);


-- ==========================================
-- 完成！数据统计
-- ==========================================
-- 部门: 3个（管理层、销售部、客服部）
-- 用户: 10个（超管×2 + 管理员×2 + 部门经理×2 + 销售×2 + 客服×2）
-- 商品: 10个（实物×6 + 虚拟×4）
-- 客户: 55个（刘组长15 + 陈组长12 + 孙小美15 + 周小明13）
-- 订单: 47个（刘组长12 + 陈组长10 + 孙小美13 + 周小明12）
--   实物订单: 38个  虚拟订单: 9个
--   状态分布: completed/delivered 约60%, shipped 约20%, confirmed/pending 约10%, signed(虚拟) 约10%
--
-- 演示登录账号:
--   demo / demo123      — 超级管理员（推荐演示账号）
--   admin1 / demo123    — 管理员
--   manager1 / demo123  — 部门经理
--   sales1 / demo123    — 销售员
--   service1 / demo123  — 客服

-- ==========================================
-- 【热修复】已有演示环境：跳过强制修改密码
-- ==========================================
-- 如果演示环境已在运行，直接执行以下语句修复当前数据：
-- UPDATE `users` SET `need_change_password` = 0, `password_last_changed` = NOW()
-- WHERE `tenant_id` = 'bf5385e4-e7fb-4ff3-8ac1-1f5e1330662c';

-- ==========================================
-- 数据重置工作流
-- ==========================================
-- 推荐流程：
--   1. 先在演示系统中手动添加/调整想要的数据
--   2. 确认数据满意后，导出该租户数据作为新的种子基线：
--      mysqldump -u root -p crm_db \
--        --where="tenant_id='bf5385e4-e7fb-4ff3-8ac1-1f5e1330662c'" \
--        --no-create-info --complete-insert --skip-triggers \
--        departments users products customers orders > demo-seed-data-live.sql
--   3. 用导出的 demo-seed-data-live.sql 替换本文件的 INSERT 部分
--   4. 定时重置（crontab）：先 DELETE 再执行新的 INSERT
--      0 3 * * * mysql -u root -p'密码' crm_db < /path/to/demo-seed-data.sql
