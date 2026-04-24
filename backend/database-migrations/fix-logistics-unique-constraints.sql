-- ========================================
-- 物流公司管理模块 - 唯一约束修复 & 数据补全
-- 适用于：生产环境（phpMyAdmin 执行）
-- 数据库：abc789
-- 日期：2026-03-24
-- ========================================
--
-- 修复内容：
-- 1. logistics_companies 表：删除 code 全局唯一约束，改为 (tenant_id, code) 复合唯一
-- 2. logistics_api_configs 表：删除 company_code 全局唯一约束，改为 (tenant_id, company_code) 复合唯一
-- 3. 修复德邦快递代码 DB -> DBL
-- 4. 补全 logistics_api_configs 默认记录（9家快递公司）
--
-- ⚠️ 执行说明：
-- 在 phpMyAdmin 中选择数据库 abc789，进入 SQL 标签页，粘贴以下全部内容后点击"执行"
-- 如果某条 ALTER TABLE DROP INDEX 报错"索引不存在"，忽略该错误继续执行后续语句即可
-- ========================================

SET NAMES utf8mb4;

-- ========================================
-- 第一步：修复 logistics_companies 表索引
-- ========================================

-- 尝试删除可能存在的全局唯一约束（根据环境不同可能叫 code 或 UQ_xxx）
-- 如果报错 "Can't DROP 'xxx'; check that column/key exists" 可忽略
ALTER TABLE `logistics_companies` DROP INDEX `code`;

-- 创建租户级复合唯一索引（不同租户可使用相同快递公司代码）
-- 如果已存在会报 Duplicate key name 错误，可忽略
CREATE UNIQUE INDEX `idx_logistics_companies_tenant_code` ON `logistics_companies` (`tenant_id`, `code`);

-- 确保 tenant_id 索引存在
-- 如果已存在会报错，可忽略
CREATE INDEX `idx_tenant_id` ON `logistics_companies` (`tenant_id`);

-- ========================================
-- 第二步：修复 logistics_api_configs 表索引
-- ========================================

-- 尝试删除可能存在的全局唯一约束
ALTER TABLE `logistics_api_configs` DROP INDEX `uk_company_code`;

-- 创建租户级复合唯一索引
CREATE UNIQUE INDEX `idx_logistics_api_configs_tenant_code` ON `logistics_api_configs` (`tenant_id`, `company_code`);

-- 确保 tenant_id 索引存在
CREATE INDEX `idx_tenant_id` ON `logistics_api_configs` (`tenant_id`);

-- ========================================
-- 第三步：修复德邦快递代码 DB -> DBL
-- ========================================

UPDATE `logistics_companies` SET `code` = 'DBL' WHERE `id` = 'lc-009' AND `code` = 'DB';

-- ========================================
-- 第四步：补全物流公司默认数据
-- ========================================

-- 确保9家物流公司数据完整
INSERT INTO `logistics_companies` (`id`, `code`, `name`, `short_name`, `logo`, `website`, `tracking_url`, `contact_phone`, `status`, `sort_order`, `remark`) VALUES
('lc-001', 'SF', '顺丰速运', '顺丰', 'https://www.sf-express.com/favicon.ico', 'https://www.sf-express.com', 'https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/{trackingNo}', '95338', 'active', 1, '顺丰速运官方合作'),
('lc-002', 'ZTO', '中通快递', '中通', NULL, 'https://www.zto.com', 'https://www.zto.com/service/bill-query?billNo={trackingNo}', '95311', 'active', 2, '中通快递官方合作'),
('lc-003', 'YTO', '圆通速递', '圆通', 'https://www.yto.net.cn/favicon.ico', 'https://www.yto.net.cn', 'https://www.yto.net.cn/query/{trackingNo}', '95554', 'active', 3, '圆通速递官方合作'),
('lc-004', 'STO', '申通快递', '申通', 'https://www.sto.cn/favicon.ico', 'https://www.sto.cn', 'https://www.sto.cn/query/{trackingNo}', '95543', 'active', 4, '申通快递官方合作'),
('lc-005', 'YD', '韵达速递', '韵达', NULL, 'https://www.yunda.com', 'https://www.yunda.com/query/{trackingNo}', '95546', 'active', 5, '韵达速递官方合作'),
('lc-006', 'JTSD', '极兔速递', '极兔', NULL, 'https://www.jtexpress.cn', 'https://www.jtexpress.cn/track/{trackingNo}', '95353', 'active', 6, '极兔速递官方合作'),
('lc-007', 'EMS', '邮政EMS', 'EMS', NULL, 'https://www.ems.com.cn', 'https://www.ems.com.cn/queryList?mailNo={trackingNo}', '11183', 'active', 7, '中国邮政EMS'),
('lc-008', 'JD', '京东物流', '京东', NULL, 'https://www.jdl.com', 'https://www.jd.com/orderDetail?orderId={trackingNo}', '950616', 'inactive', 8, '京东物流（需开通合作）'),
('lc-009', 'DBL', '德邦快递', '德邦', NULL, 'https://www.deppon.com', 'https://www.deppon.com/tracking/{trackingNo}', '95353', 'inactive', 9, '德邦快递（需开通合作）')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `short_name` = VALUES(`short_name`),
  `code` = VALUES(`code`),
  `website` = VALUES(`website`),
  `tracking_url` = VALUES(`tracking_url`),
  `contact_phone` = VALUES(`contact_phone`),
  `updated_at` = CURRENT_TIMESTAMP;

-- ========================================
-- 第五步：补全物流API配置默认数据
-- ========================================

-- 确保9家快递公司API配置记录完整（管理员填入密钥即可使用）
INSERT INTO `logistics_api_configs` (`id`, `company_code`, `company_name`, `api_environment`, `enabled`) VALUES
('lac-001', 'SF', '顺丰速运', 'production', 1),
('lac-002', 'ZTO', '中通快递', 'production', 1),
('lac-003', 'YTO', '圆通速递', 'production', 1),
('lac-004', 'STO', '申通快递', 'production', 1),
('lac-005', 'YD', '韵达速递', 'production', 1),
('lac-006', 'JTSD', '极兔速递', 'production', 1),
('lac-007', 'EMS', '邮政EMS', 'production', 1),
('lac-008', 'JD', '京东物流', 'production', 1),
('lac-009', 'DBL', '德邦快递', 'production', 1)
ON DUPLICATE KEY UPDATE
  `company_name` = VALUES(`company_name`),
  `enabled` = 1,
  `updated_at` = CURRENT_TIMESTAMP;
